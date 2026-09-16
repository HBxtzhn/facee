// 恶意 ZIP / 非法题库 fixtures —— 每个文件对应一个 E_* 码，用作安全验收的固定样本。
// 这里刻意使用「先构造合法包，再精确改字节」的方式，保证攻击形态真实可控。

import { writeZip } from './lib/zip.mjs';

const enc = (s) => Buffer.from(s, 'utf8');

function minimalCatalog(overrides = {}) {
  return {
    schemaVersion: 1,
    bank: {
      id: 'fixture-bank', name: 'Fixture', version: '1.0.0',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    categories: [{ id: 'c1', name: '分类一', order: 10 }],
    tags: [{ id: 't1', name: '标签一', parentId: null, order: 10 }],
    questions: [
      { id: 'q-01', title: '题目一', difficulty: 'easy', categoryId: 'c1', tags: ['t1'], order: 10, hasAnswer: true },
    ],
    ...overrides,
  };
}

/** 构造一棵最小合法题库树 */
function tree({ catalog = minimalCatalog(), files = {} } = {}) {
  const t = new Map();
  t.set('catalog.json', enc(JSON.stringify(catalog, null, 2)));
  t.set('questions/q-01/question.md', enc('# 题目一\n\n这是题干。\n'));
  t.set('questions/q-01/answer.md', enc('这是答案。\n'));
  for (const [k, v] of Object.entries(files)) t.set(k, typeof v === 'string' ? enc(v) : v);
  return t;
}

const toZip = (t, opts) => writeZip([...t].map(([name, data]) => ({ name, data })), opts);

/** 在 ZIP 字节中把某段文本整体替换（等长替换，不破坏偏移） */
function patch(buf, from, to) {
  if (from.length !== to.length) throw new Error('patch requires equal length');
  let count = 0;
  let idx = buf.indexOf(from);
  while (idx !== -1) {
    to.copy(buf, idx);
    count++;
    idx = buf.indexOf(from, idx + to.length);
  }
  if (count === 0) throw new Error(`patch target not found: ${from}`);
  return buf;
}

export function buildFixtures() {
  const out = new Map();
  const add = (name, buf) => out.set(name, buf);

  // ── 路径类 ────────────────────────────────────────────────────────────────
  add('path-traversal.zip', toZip(new Map([['../../evil.txt', enc('x')], ['catalog.json', enc('{}')]])));
  add('path-absolute.zip', toZip(new Map([['/etc/passwd', enc('x')], ['catalog.json', enc('{}')]])));
  add('path-backslash.zip', toZip(new Map([['..\\..\\evil.txt', enc('x')], ['catalog.json', enc('{}')]])));
  add('path-drive.zip', toZip(new Map([['C:/evil.txt', enc('x')], ['catalog.json', enc('{}')]])));

  // 重复条目：等长改名后制造同名条目
  {
    const buf = toZip(new Map([['a.txt', enc('1')], ['b.txt', enc('2')], ['catalog.json', enc('{}')]]));
    add('duplicate-entry.zip', patch(buf, enc('b.txt'), enc('a.txt')));
  }

  // ── 结构类 ────────────────────────────────────────────────────────────────
  {
    const buf = toZip(tree());
    // 设置加密位（通用位 bit0）：中央目录 46+nameLen 处找到 flags 偏移 = p+8
    const cdIdx = buf.indexOf(enc('PK\x01\x02'));
    buf.writeUInt16LE(buf.readUInt16LE(cdIdx + 8) | 1, cdIdx + 8);
    const lfIdx = buf.indexOf(enc('PK\x03\x04'));
    buf.writeUInt16LE(buf.readUInt16LE(lfIdx + 6) | 1, lfIdx + 6);
    add('encrypted.zip', buf);
  }
  add('not-a-zip.zip', Buffer.from('this is definitely not a zip file, no signatures here'));
  {
    const buf = toZip(tree());
    add('truncated.zip', buf.subarray(0, Math.floor(buf.length * 0.6)));
  }
  add('no-catalog.zip', toZip(new Map([['questions/q-01/question.md', enc('# 题目一\n')]])));
  {
    const t = tree(); t.delete('catalog.json');
    t.set('a/catalog.json', enc(JSON.stringify(minimalCatalog(), null, 2)));
    t.set('b/catalog.json', enc(JSON.stringify(minimalCatalog(), null, 2)));
    add('two-root-candidates.zip', toZip(t));
  }

  // ── catalog / 数据类 ──────────────────────────────────────────────────────
  add('bad-catalog-json.zip', toZip(new Map([['catalog.json', enc('{ not valid json')]])));
  add('bad-schema-version.zip', toZip(tree({ catalog: minimalCatalog({ schemaVersion: 2 }) })));

  add('illegal-id.zip', toZip(tree({
    catalog: minimalCatalog({ questions: [{ id: 'Bad ID!', title: '题目一', difficulty: 'easy', categoryId: 'c1', tags: ['t1'] }] }),
  })));
  add('duplicate-id.zip', toZip(tree({
    catalog: minimalCatalog({
      questions: [
        { id: 'q-01', title: '题目一', difficulty: 'easy', categoryId: 'c1', tags: ['t1'] },
        { id: 'q-01', title: '题目一（重复）', difficulty: 'easy', categoryId: 'c1', tags: ['t1'] },
      ],
    }),
  })));
  add('dir-name-mismatch.zip', toZip(tree({
    catalog: minimalCatalog({ questions: [{ id: 'q-99', title: '题目一', difficulty: 'easy', categoryId: 'c1', tags: ['t1'] }] }),
  })));
  add('missing-question.zip', toZip(tree({
    catalog: minimalCatalog({
      questions: [
        { id: 'q-01', title: '题目一', difficulty: 'easy', categoryId: 'c1', tags: ['t1'] },
        { id: 'q-02', title: '题目二', difficulty: 'easy', categoryId: 'c1', tags: ['t1'] },
      ],
    }),
  })));
  add('missing-asset.zip', toZip(tree({
    files: { 'questions/q-01/question.md': '# 题目一\n\n![图](./assets/nope.png)\n' },
  })));
  add('unknown-tag.zip', toZip(tree({
    catalog: minimalCatalog({ questions: [{ id: 'q-01', title: '题目一', difficulty: 'easy', categoryId: 'c1', tags: ['ghost'] }] }),
  })));
  add('tag-cycle.zip', toZip(tree({
    catalog: minimalCatalog({
      tags: [
        { id: 't1', name: 'A', parentId: 't2' },
        { id: 't2', name: 'B', parentId: 't1' },
      ],
      questions: [{ id: 'q-01', title: '题目一', difficulty: 'easy', categoryId: 'c1', tags: ['t1'] }],
    }),
  })));
  add('tag-parent-missing.zip', toZip(tree({
    catalog: minimalCatalog({
      tags: [{ id: 't1', name: 'A', parentId: 'nope' }],
      questions: [{ id: 'q-01', title: '题目一', difficulty: 'easy', categoryId: 'c1', tags: ['t1'] }],
    }),
  })));
  add('bad-difficulty.zip', toZip(tree({
    catalog: minimalCatalog({ questions: [{ id: 'q-01', title: '题目一', difficulty: 'hardest', categoryId: 'c1', tags: ['t1'] }] }),
  })));
  add('unknown-category.zip', toZip(tree({
    catalog: minimalCatalog({ questions: [{ id: 'q-01', title: '题目一', difficulty: 'easy', categoryId: 'nope', tags: ['t1'] }] }),
  })));
  add('hasanswer-mismatch.zip', toZip(tree({
    catalog: minimalCatalog({ questions: [{ id: 'q-01', title: '题目一', difficulty: 'easy', categoryId: 'c1', tags: ['t1'], hasAnswer: true }] }),
    files: { 'questions/q-01/answer.md': null }, // 占位，下面删除
  })));
  {
    const t = tree({
      catalog: minimalCatalog({ questions: [{ id: 'q-01', title: '题目一', difficulty: 'easy', categoryId: 'c1', tags: ['t1'], hasAnswer: true }] }),
    });
    t.delete('questions/q-01/answer.md');
    add('hasanswer-mismatch.zip', toZip(t));
  }
  add('followup-count-mismatch.zip', toZip(tree({
    catalog: minimalCatalog({ questions: [{ id: 'q-01', title: '题目一', difficulty: 'easy', categoryId: 'c1', tags: ['t1'], followupCount: 3 }] }),
    files: { 'questions/q-01/followups.md': '## 追问 1：为什么？\n\n因为。\n' },
  })));

  return out;
}
