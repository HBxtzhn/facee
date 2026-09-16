#!/usr/bin/env node
// 题库生成器 —— 把 seed 内容展开成规范 v1 的目录树 + 确定性 ZIP，并自校验。
//
// 用法：
//   node generate.mjs --profile sample --out ../FaceBank --zip dist/sample-bank.zip
//   node generate.mjs --profile stress --count 2000 --zip dist/stress-bank.zip
//   node generate.mjs --profile malicious --out dist/fixtures
//   node generate.mjs --profile sample --version 1.1.0 --out ../FaceBank --zip dist/sample-bank-1.1.0.zip
//   node generate.mjs --verify <file.zip>        # 校验任意 ZIP（含从 GitHub 下载回来的）

import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { bank, categories, tags, questions } from './seed/questions.mjs';
import { makeMemoryLayoutPng, makeTallTimelinePng } from './lib/png.mjs';
import { writeZip } from './lib/zip.mjs';
import { validateTree, validateZip, formatReport, parseFollowups } from './validate.mjs';
import { buildFixtures } from './fixtures.mjs';

const args = process.argv.slice(2);
const opt = (name, def = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : (args[i + 1]?.startsWith('--') ? true : args[i + 1]);
};
const has = (name) => args.includes(`--${name}`);

// ── 构建目录树 ──────────────────────────────────────────────────────────────
function buildTree({ version = bank.version, count = null, drop = [] } = {}) {
  const files = new Map();
  const assets = {
    'jvm-memory-01': [{ name: 'memory-layout.png', data: makeMemoryLayoutPng() }],
    'jvm-gc-02': [{ name: 'gc-timeline.png', data: makeTallTimelinePng() }],
  };

  const dropped = new Set(drop);
  const list = (count ? makeStressQuestions(count) : questions).filter((q) => !dropped.has(q.id));

  const catalogQuestions = list.map((q) => {
    const dir = `questions/${q.id}`;
    const qMd = `# ${q.title}\n\n${q.question}\n`;
    files.set(`${dir}/question.md`, Buffer.from(qMd, 'utf8'));
    if (q.answer) files.set(`${dir}/answer.md`, Buffer.from(q.answer + '\n', 'utf8'));
    if (q.followups?.length) {
      const fu = q.followups
        .map((f, i) => `## 追问 ${i + 1}：${f.q}\n\n${f.a}`)
        .join('\n\n');
      files.set(`${dir}/followups.md`, Buffer.from(fu + '\n', 'utf8'));
    }
    for (const a of assets[q.id] || []) files.set(`${dir}/assets/${a.name}`, a.data);

    const entry = {
      id: q.id,
      title: q.title,
      difficulty: q.difficulty,
      categoryId: q.categoryId,
      tags: q.tags,
      order: q.order,
    };
    // hasAnswer / followupCount 按文件事实推导（规范 §3.2）
    entry.hasAnswer = Boolean(q.answer);
    const n = q.followups?.length || 0;
    if (n > 0) entry.followupCount = n;
    return entry;
  });

  const catalog = {
    schemaVersion: 1,
    bank: { ...bank, version, updatedAt: bank.updatedAt },
    categories,
    tags,
    questions: catalogQuestions,
  };
  // catalog.json 放最前，便于人读与 diff
  const out = new Map([['catalog.json', Buffer.from(JSON.stringify(catalog, null, 2) + '\n', 'utf8')]]);
  for (const [k, v] of files) out.set(k, v);
  out.set('README.md', Buffer.from(readme(), 'utf8'));
  return out;
}

function readme() {
  return `# FaceE 题库（示例）

本仓库是 **纯题库数据**，遵循 FaceE 题库规范 v1：\`catalog.json\` 位于仓库根，
题目位于 \`questions/<id>/\`。因此 GitHub 的归档 ZIP 可以**直接安装**：

\`\`\`text
https://github.com/HBxtzhn/facee-bank/archive/refs/heads/main.zip
\`\`\`

（归档 ZIP 会多一层 \`facee-bank-main/\` 目录，App 会自动识别题库根。）

## 结构

\`\`\`text
catalog.json
questions/
  <id>/
    question.md
    answer.md        可选
    followups.md     可选（面试官追问）
    assets/          可选
\`\`\`

规范细节见 App 仓库的 \`docs/题库规范-v1.md\`。生成器见 \`packages/bank-spec\`。
`;
}

/** 压测题库：确定性模板生成 N 道题 */
function makeStressQuestions(count) {
  const diff = ['easy', 'medium', 'hard'];
  const out = [];
  for (let i = 0; i < count; i++) {
    const cat = categories[i % categories.length];
    const tag = tags[(i * 7) % tags.length];
    const id = `${cat.id}-stress-${String(i + 1).padStart(4, '0')}`;
    const body = [];
    body.push(`第 ${i + 1} 题的题干占位内容，用于压测列表渲染、搜索与按需读取。`);
    body.push('');
    body.push('```java');
    body.push(`public class Stress${i + 1} { public static void main(String[] a) { System.out.println(${i}); } }`);
    body.push('```');
    body.push('');
    body.push('| 项 | 值 |');
    body.push('|---|---|');
    body.push(`| 序号 | ${i + 1} |`);
    body.push(`| 分类 | ${cat.name} |`);
    body.push('');
    body.push(`关键词：压测 关键词${i % 37} 检索 命中${i % 11}`);
    out.push({
      id,
      title: `[压测] ${cat.name} 第 ${i + 1} 题：关于 ${tag.name} 的常见问题`,
      difficulty: diff[i % 3],
      categoryId: cat.id,
      tags: [tag.id],
      order: (i % 50) * 10,
      question: body.join('\n'),
      answer: `参考答案（压测）：本题用于验证按需读取与 LRU 缓存，内容长度约 ${200 + (i % 5) * 40} 字。`,
    });
  }
  return out;
}

// ── 输出 ────────────────────────────────────────────────────────────────────
// 只清理「生成器拥有」的路径，绝不碰 .git 等外来文件（曾经把仓库根 .git 删没，教训）
const OWNED_PATHS = ['catalog.json', 'questions', 'README.md'];

function writeTree(tree, dir) {
  mkdirSync(dir, { recursive: true });
  for (const name of OWNED_PATHS) rmSync(join(dir, name), { recursive: true, force: true });
  for (const [rel, data] of tree) {
    const p = join(dir, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, data);
  }
  return dir;
}

function treeToZip(tree) {
  return writeZip([...tree].map(([name, data]) => ({ name, data })));
}

// ── 主流程 ──────────────────────────────────────────────────────────────────
function main() {
  if (has('verify')) {
    const file = opt('verify');
    if (!existsSync(file)) throw new Error(`not found: ${file}`);
    const buf = readFileSync(file);
    const r = validateZip(buf);
    console.log(`# ${file}  (${buf.length} bytes, zip64=${r.cd?.zip64 ?? 'n/a'}, entries=${r.cd?.total ?? 'n/a'})`);
    console.log(formatReport(r, { verbose: has('verbose') }));
    process.exit(r.errors.length ? 1 : 0);
  }

  const profile = opt('profile', 'sample');
  const version = opt('version', bank.version);

  if (profile === 'malicious') {
    const dir = resolve(opt('out', 'dist/fixtures'));
    const fixtures = buildFixtures();
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const rows = [];
    for (const [name, buf] of fixtures) {
      writeFileSync(join(dir, name), buf);
      const r = validateZip(buf);
      const codes = [...new Set(r.errors.map((e) => e.code))];
      rows.push({ name, rejected: r.errors.length > 0, codes, warnings: r.warnings.length });
    }
    console.log(`# fixtures → ${dir}`);
    const failed = rows.filter((r) => !r.rejected);
    for (const r of rows) {
      console.log(`  ${r.rejected ? '✅ rejected' : '❌ ACCEPTED(BUG)'}  ${r.name.padEnd(28)} ${r.codes.join(',') || ''}`);
    }
    console.log(`\n${rows.length - failed.length}/${rows.length} fixtures correctly rejected`);
    process.exit(failed.length ? 1 : 0);
  }

  const count = profile === 'stress' ? Number(opt('count', 2000)) : null;
  const drop = String(opt('drop', '')).split(',').map((s) => s.trim()).filter(Boolean);
  const tree = buildTree({ version, count, drop });

  // 先自校验，再落盘（生成器不产出不合格题库）
  const report = validateTree(tree);
  console.log(`# profile=${profile}${count ? ` count=${count}` : ''} version=${version}`);
  console.log(formatReport(report, { verbose: has('verbose') }));
  if (report.errors.length) process.exit(1);

  const outDir = opt('out');
  if (outDir) console.log(`\n# tree → ${resolve(writeTree(tree, resolve(outDir)))}`);

  const zipPath = opt('zip');
  if (zipPath) {
    const buf = treeToZip(tree);
    const full = resolve(zipPath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, buf);
    // 回读校验：证明「写出 → 解析 → 校验」闭环
    const back = validateZip(buf);
    console.log(`\n# zip → ${full}  (${buf.length} bytes, ${back.cd.total} entries)`);
    console.log(formatReport(back));
    if (back.errors.length) process.exit(1);
    console.log(`\n# 闭环校验通过：ZIP 可被独立解析并通过规范校验`);
  }
}

main();
