// 题库规范 v1 校验器 —— docs/题库规范-v1.md §9 校验清单的可执行实现。
//
// 输入是一棵「相对路径 → 内容」的树（来自解压目录或 ZIP），因此同一份逻辑既能校验
// 生成出来的目录，也能校验从 GitHub 下载回来的 ZIP —— 这正是 App 侧 core 要做的事。
//
// E_* 阻断安装；W_* 计入安装报告。

import { readCentralDirectory, inflateEntry } from './lib/zip.mjs';
import {
  SCHEMA_VERSION, ID_RE, BANK_ID_RE, DIFFICULTIES, LIMITS,
  ALLOWED_COMPRESSION, isIgnoredPath,
} from './lib/spec.mjs';

// ── 工具 ────────────────────────────────────────────────────────────────────
const stripFences = (md) => md.replace(/```[\s\S]*?```/g, '');

/** 解析 followups.md（规范 §6.2） */
export function parseFollowups(md) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let cur = null;
  let fence = null;
  for (const line of lines) {
    const fenceMatch = /^\s*(```+|~~~+)/.exec(line);
    if (fenceMatch) {
      fence = fence ? null : fenceMatch[1][0];
      if (cur) cur.body.push(line);
      continue;
    }
    if (!fence) {
      const h1 = /^#\s+(.*)$/.exec(line);
      const h2 = /^##\s+(.*)$/.exec(line);
      if (h2) {
        blocks.push({ heading: h2[1].trim(), body: [] });
        cur = blocks[blocks.length - 1];
        continue;
      }
      if (h1) { cur = null; continue; }
    }
    if (cur) cur.body.push(line);
  }
  return blocks
    .map((b) => {
      const q = b.heading.replace(/^追问\s*\d+\s*[：:.、]?\s*/, '').trim() || b.heading;
      const a = b.body.join('\n').trim();
      return { q, a, empty: a.length === 0 };
    })
    .filter((b) => !b.empty); // 分组标题（后面没内容）不算条目
}

/** 从 markdown 提取本地图片引用 */
export function extractLocalImages(md) {
  const out = [];
  const re = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(md))) {
    const p = m[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(p)) continue; // 外链
    out.push(p.replace(/^\.\//, ''));
  }
  return out;
}

/** 从 markdown 提取题目引用（显式内链 / 相对路径） */
export function extractQuestionRefs(md) {
  const refs = [];
  const inner = /\]\(\s*facee:\/\/question\/([^)\s]+)\s*\)/g;
  let m;
  while ((m = inner.exec(md))) refs.push({ id: m[1], kind: 'scheme' });
  const rel = /\]\(\s*\.\.\/([a-z0-9][a-z0-9._-]*)\/question\.md\s*\)/g;
  while ((m = rel.exec(md))) refs.push({ id: m[1], kind: 'relative' });
  return refs;
}

/** 纯文本「相关题目：<标题>」形式（规范 §8.2） */
export function extractPlainRefs(md) {
  const out = [];
  for (const raw of stripFences(md).split(/\r?\n/)) {
    const line = raw.replace(/^\s*[-*+]\s+/, '').trim();
    const m = /^(相关题目|相关阅读|延伸阅读|延伸|参考)\s*[：:]\s*(.+)$/.exec(line);
    // 已经是 Markdown 链接/图片的，不算「纯文本引用」
    if (m && !/^[!\[]/.test(m[2].trim())) out.push(m[2].trim());
  }
  return out;
}

// ── G1/G2：条目名与结构校验（在解压前对中央目录执行） ────────────────────────
export function checkEntries(cd) {
  const errors = [];
  const warnings = [];
  const push = (code, detail) => errors.push({ code, detail });

  if (!cd.ok) { push('E_ZIP_CORRUPT', cd.reason || 'unreadable'); return { errors, warnings, entries: [] }; }

  if (cd.total > LIMITS.maxEntries) push('E_ZIP_TOO_MANY_ENTRIES', `${cd.total} > ${LIMITS.maxEntries}`);

  const seen = new Map();
  let totalBytes = 0;

  for (const e of cd.entries) {
    if (e.isEncrypted) push('E_ZIP_ENCRYPTED', e.name);
    if (!ALLOWED_COMPRESSION.has(e.method)) push('E_ZIP_ILLEGAL_COMPRESSION', `${e.name} method=${e.method}`);
    if (e.isSymlink) push('E_ZIP_PATH_ILLEGAL', `symlink entry: ${e.name}`);
    if (e.name.length > LIMITS.maxPathLen) push('E_ZIP_PATH_ILLEGAL', `path too long: ${e.name}`);
    if (e.uncompressedSize > LIMITS.maxEntryBytes) push('E_ZIP_TOO_LARGE', `${e.name} ${e.uncompressedSize}B`);
    totalBytes += e.uncompressedSize;
    // EFS(bit11) 未设置时，仅当名字确实含非 ASCII 字节才告警
    // （实测：GitHub codeload 归档 ZIP 全部不设 EFS，若一律告警会刷屏且无信息量）
    if (!e.isUtf8 && /[^\x00-\x7f]/.test(Buffer.from(e.name, 'utf8').toString('latin1'))) {
      warnings.push({ code: 'W_ZIP_ENCODING', detail: `${e.name} (non-ASCII name without EFS flag)` });
    }

    const n = e.name;
    if (n.includes('\\')) push('E_ZIP_PATH_ILLEGAL', `backslash: ${n}`);
    if (/^[a-zA-Z]:/.test(n)) push('E_ZIP_PATH_ABSOLUTE', n);
    if (n.startsWith('/')) push('E_ZIP_PATH_ABSOLUTE', n);
    if (/[\u0000-\u001f]/.test(n)) push('E_ZIP_PATH_ILLEGAL', `control char: ${JSON.stringify(n)}`);
    const segs = n.split('/').filter((s) => s.length > 0);
    if (segs.includes('..')) push('E_ZIP_PATH_TRAVERSAL', n);
    if (segs.includes('.')) push('E_ZIP_PATH_ILLEGAL', `dot segment: ${n}`);
    if (segs.length === 0) push('E_ZIP_PATH_ILLEGAL', `empty path: ${JSON.stringify(n)}`);

    const key = n.toLowerCase();
    if (seen.has(key)) push('E_ZIP_DUPLICATE_ENTRY', `${seen.get(key)} vs ${n}`);
    else seen.set(key, n);
  }

  if (totalBytes > LIMITS.maxTotalBytes) push('E_ZIP_TOO_LARGE', `total ${totalBytes}B`);
  return { errors, warnings, entries: cd.entries };
}

/** 从 ZIP 字节构造树（可忽略条目；用于校验下载回来的包） */
export function treeFromZip(buf, { ignore = isIgnoredPath } = {}) {
  const cd = readCentralDirectory(buf);
  const guard = checkEntries(cd);
  const tree = new Map();
  if (!guard.errors.length) {
    for (const e of cd.entries) {
      if (e.isDir) continue;
      if (ignore(e.name)) continue;
      tree.set(e.name, inflateEntry(buf, e));
    }
  }
  return { cd, guard, tree };
}

/** 定位题库根：catalog.json 在根，或位于唯一顶层目录下 */
export function detectRoot(paths) {
  const candidates = new Set();
  for (const p of paths) {
    const segs = p.split('/').filter(Boolean);
    if (segs.length === 1 && segs[0] === 'catalog.json') candidates.add('');
    else if (segs.length === 2 && segs[1] === 'catalog.json') candidates.add(segs[0]);
  }
  const list = [...candidates];
  if (list.length === 1) return { root: list[0], candidates: list, ok: true };
  return { root: null, candidates: list, ok: false };
}

// ── 数据校验（规范 §9 后半段） ──────────────────────────────────────────────
export function validateTree(tree) {
  const errors = [];
  const warnings = [];
  const push = (code, detail) => errors.push({ code, detail });
  const warn = (code, detail) => warnings.push({ code, detail });

  const paths = [...tree.keys()];
  const { root, candidates, ok } = detectRoot(paths);
  if (!ok) {
    push('E_CATALOG_ROOT', candidates.length === 0
      ? 'no catalog.json at root or in a single top-level directory'
      : `multiple root candidates: ${candidates.join(', ')}`);
    return { errors, warnings, stats: null };
  }
  const prefix = root ? `${root}/` : '';
  const rel = (p) => p.slice(prefix.length);

  // 只保留题库根下的文件
  const files = new Map();
  for (const [p, v] of tree) if (p.startsWith(prefix)) files.set(rel(p), v);

  const catalogBuf = files.get('catalog.json');
  let catalog;
  try {
    catalog = JSON.parse(catalogBuf.toString('utf8'));
    if (catalog === null || typeof catalog !== 'object' || Array.isArray(catalog)) throw new Error('not an object');
  } catch (e) {
    push('E_CATALOG_UNPARSABLE', e.message);
    return { errors, warnings, stats: null };
  }

  const schemaErr = (detail) => push('E_CATALOG_SCHEMA', detail);

  // schemaVersion
  if (catalog.schemaVersion !== SCHEMA_VERSION) {
    schemaErr(`schemaVersion must be ${SCHEMA_VERSION}, got ${JSON.stringify(catalog.schemaVersion)}`);
  }

  // bank
  const bank = catalog.bank;
  if (!bank || typeof bank !== 'object') schemaErr('missing bank');
  else {
    if (!BANK_ID_RE.test(bank.id || '')) schemaErr(`bank.id illegal: ${JSON.stringify(bank.id)}`);
    if (typeof bank.name !== 'string' || !bank.name || bank.name.length > LIMITS.maxBankNameLen) schemaErr('bank.name invalid');
    if (typeof bank.version !== 'string' || !bank.version) schemaErr('bank.version invalid');
    if (typeof bank.updatedAt !== 'string' || Number.isNaN(Date.parse(bank.updatedAt))) schemaErr('bank.updatedAt invalid');
  }

  // categories
  const catIds = new Set();
  const categories = Array.isArray(catalog.categories) ? catalog.categories : null;
  if (!categories || categories.length === 0) schemaErr('categories must be a non-empty array');
  else {
    for (const c of categories) {
      if (!c || typeof c !== 'object') { schemaErr('category entry invalid'); continue; }
      if (!ID_RE.test(c.id || '')) schemaErr(`category.id illegal: ${JSON.stringify(c.id)}`);
      if (catIds.has(c.id)) schemaErr(`duplicate category id: ${c.id}`);
      catIds.add(c.id);
      if (typeof c.name !== 'string' || !c.name || c.name.length > LIMITS.maxCategoryNameLen) schemaErr(`category.name invalid: ${c.id}`);
      if (c.order !== undefined && typeof c.order !== 'number') schemaErr(`category.order invalid: ${c.id}`);
    }
  }

  // tags + 父子关系
  const tagById = new Map();
  const tags = Array.isArray(catalog.tags) ? catalog.tags : null;
  if (!tags) schemaErr('tags must be an array');
  else {
    for (const t of tags) {
      if (!t || typeof t !== 'object') { schemaErr('tag entry invalid'); continue; }
      if (!ID_RE.test(t.id || '')) schemaErr(`tag.id illegal: ${JSON.stringify(t.id)}`);
      if (tagById.has(t.id)) schemaErr(`duplicate tag id: ${t.id}`);
      if (typeof t.name !== 'string' || !t.name || t.name.length > LIMITS.maxTagNameLen) schemaErr(`tag.name invalid: ${t.id}`);
      if (!(t.parentId === null || typeof t.parentId === 'string')) schemaErr(`tag.parentId invalid: ${t.id}`);
      tagById.set(t.id, t);
    }
    for (const t of tagById.values()) {
      if (t.parentId !== null && !tagById.has(t.parentId)) push('E_TAG_PARENT_UNKNOWN', `${t.id} -> ${t.parentId}`);
    }
    // 环检测
    for (const id of tagById.keys()) {
      const seenIds = new Set();
      let cur = id;
      while (cur) {
        if (seenIds.has(cur)) { push('E_TAG_PARENT_CYCLE', `${id}`); break; }
        seenIds.add(cur);
        cur = tagById.get(cur)?.parentId ?? null;
      }
    }
  }

  // questions
  const questions = Array.isArray(catalog.questions) ? catalog.questions : null;
  if (!questions || questions.length === 0) schemaErr('questions must be a non-empty array');
  const qIds = new Set();
  const titleToId = new Map();
  const usedAssets = new Set();
  let followupTotal = 0;
  let answerCount = 0;

  if (questions) {
    for (const q of questions) {
      if (!q || typeof q !== 'object') { schemaErr('question entry invalid'); continue; }
      const where = q.id ?? '(no id)';
      if (typeof q.id !== 'string' || !ID_RE.test(q.id)) push('E_ID_ILLEGAL', String(where));
      if (qIds.has(q.id)) push('E_ID_DUPLICATE', String(q.id));
      qIds.add(q.id);
      if (typeof q.title !== 'string' || !q.title || q.title.length > LIMITS.maxTitleLen) schemaErr(`question.title invalid: ${where}`);
      else titleToId.set(q.title.trim(), q.id);
      if (!DIFFICULTIES.includes(q.difficulty)) push('E_DIFFICULTY_INVALID', `${where}: ${JSON.stringify(q.difficulty)}`);
      if (!catIds.has(q.categoryId)) push('E_CATEGORY_UNKNOWN', `${where}: ${JSON.stringify(q.categoryId)}`);
      if (!Array.isArray(q.tags)) schemaErr(`question.tags must be an array: ${where}`);
      else {
        if (new Set(q.tags).size !== q.tags.length) warn('W_TAG_DUPLICATE', `${where} has duplicate tags`);
        for (const tg of q.tags) if (!tagById.has(tg)) push('E_TAG_UNKNOWN', `${where} -> ${tg}`);
      }
      if (q.order !== undefined && typeof q.order !== 'number') schemaErr(`question.order invalid: ${where}`);

      // 目录名 == id：声明了 id 就必须有 questions/<id>/question.md
      const dir = `questions/${q.id}`;
      const qFile = `${dir}/question.md`;
      if (!files.has(qFile)) { push('E_QUESTION_FILE_MISSING', q.id); continue; }

      const qMd = files.get(qFile).toString('utf8');
      const h1 = /^#\s+(.*)$/m.exec(qMd);
      if (!h1) warn('W_TITLE_MISMATCH', `${q.id}: question.md has no level-1 heading`);
      else if (h1[1].trim() !== q.title.trim()) warn('W_TITLE_MISMATCH', `${q.id}: "${h1[1].trim()}" != "${q.title.trim()}"`);

      const hasAnswerFile = files.has(`${dir}/answer.md`);
      if (q.hasAnswer !== undefined && Boolean(q.hasAnswer) !== hasAnswerFile) {
        push('E_HASANSWER_MISMATCH', `${q.id}: declared ${q.hasAnswer}, file ${hasAnswerFile}`);
      }
      if (hasAnswerFile) answerCount++;

      const hasFollowupFile = files.has(`${dir}/followups.md`);
      let followups = [];
      if (hasFollowupFile) {
        followups = parseFollowups(files.get(`${dir}/followups.md`).toString('utf8'));
        if (followups.length === 0) warn('W_FOLLOWUP_EMPTY', q.id);
      }
      if (q.followupCount !== undefined && q.followupCount !== followups.length) {
        schemaErr(`followupCount mismatch: ${q.id} declared ${q.followupCount}, parsed ${followups.length}`);
      }
      followupTotal += followups.length;

      // 资源引用
      const allMd = [qMd, hasAnswerFile ? files.get(`${dir}/answer.md`).toString('utf8') : '',
        hasFollowupFile ? files.get(`${dir}/followups.md`).toString('utf8') : ''].join('\n');
      for (const img of extractLocalImages(allMd)) {
        const assetPath = `${dir}/${img}`;
        usedAssets.add(assetPath);
        if (!files.has(assetPath)) push('E_ASSET_MISSING', `${q.id}: ${img}`);
      }
      // 题目引用
      for (const r of extractQuestionRefs(allMd)) {
        if (!questions.some((x) => x && x.id === r.id)) warn('W_REF_DANGLING', `${q.id} -> ${r.id}`);
      }
      // 纯文本标题引用
      for (const t of extractPlainRefs(allMd)) {
        if (!titleToId.has(t)) warn('W_TITLE_REF_UNRESOLVED', `${q.id}: "${t}"`);
      }
    }
  }

  // 未被任何题目声明的 questions/<dir>/ 目录（例如目录名与 id 不一致留下的孤儿）
  for (const p of files.keys()) {
    const m = /^questions\/([^/]+)\//.exec(p);
    if (m && !qIds.has(m[1])) push('E_ID_DIR_MISMATCH', `orphan dir questions/${m[1]} (no catalog entry with that id)`);
  }

  // 未使用的 assets 目录文件（提示性）
  for (const p of files.keys()) {
    if (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.gif') || p.endsWith('.webp')) {
      if (!usedAssets.has(p)) warn('W_ASSET_UNUSED', p);
    }
  }

  // 排序稳定性预警：order 相同不算错误（规范 §7 明确允许）
  const withOrder = (questions || []).filter((q) => q && typeof q.order === 'number');
  const dupOrder = new Map();
  for (const q of withOrder) dupOrder.set(q.order, (dupOrder.get(q.order) || 0) + 1);
  for (const [o, n] of dupOrder) if (n > 1) warn('W_ORDER_DUPLICATE', `order=${o} used by ${n} questions (sorted by id)`);

  if (!files.has('README.md')) warn('W_NO_README', 'README.md not found');

  return {
    errors, warnings,
    stats: {
      root,
      bank: catalog.bank,
      categories: catIds.size,
      tags: tagById.size,
      questions: qIds.size,
      answers: answerCount,
      followups: followupTotal,
      assets: usedAssets.size,
      files: files.size,
    },
  };
}

/** 一站式：ZIP 字节 → 校验报告 */
export function validateZip(buf) {
  const { cd, guard, tree } = treeFromZip(buf);
  if (guard.errors.length) return { errors: guard.errors, warnings: guard.warnings, stats: null, cd };
  const r = validateTree(tree);
  return { ...r, warnings: [...guard.warnings, ...r.warnings], cd };
}

export function formatReport(r, { verbose = false } = {}) {
  const lines = [];
  const ok = r.errors.length === 0;
  lines.push(`${ok ? '✅ PASS' : '❌ FAIL'}  errors=${r.errors.length} warnings=${r.warnings.length}`);
  for (const e of r.errors) lines.push(`  E ${e.code}  ${e.detail}`);
  if (verbose) for (const w of r.warnings) lines.push(`  W ${w.code}  ${w.detail}`);
  else if (r.warnings.length) {
    const byCode = new Map();
    for (const w of r.warnings) byCode.set(w.code, (byCode.get(w.code) || 0) + 1);
    for (const [c, n] of byCode) lines.push(`  W ${c} ×${n}`);
  }
  if (r.stats) {
    const s = r.stats;
    lines.push(`  bank=${s.bank?.name} v${s.bank?.version} root="${s.root}" categories=${s.categories} tags=${s.tags} questions=${s.questions} answers=${s.answers} followups=${s.followups} assets=${s.assets} files=${s.files}`);
  }
  return lines.join('\n');
}
