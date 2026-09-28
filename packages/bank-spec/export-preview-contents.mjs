// 从种子题库生成 Web 预览数据：src/question-bank/__fixtures__/preview-bank.json
//
// Web 端没有 documentDirectory 与 zip 原生模块，真机的安装/读取路径不可用，
// 因此 Web 预览直接内置这份示例题库（与真机安装 facee-bank 后的内容一致）。
// 种子更新后重跑本脚本同步：
//   node packages/bank-spec/export-preview-contents.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bank, categories, tags, questions } from './seed/questions.mjs';

// catalog 结构与 generate.mjs 的产物一致（规范 v1）
const catalog = {
  schemaVersion: 1,
  bank,
  categories,
  tags,
  questions: questions.map((q) => ({
    id: q.id,
    title: q.title,
    difficulty: q.difficulty,
    categoryId: q.categoryId,
    tags: q.tags,
    order: q.order,
    hasAnswer: Boolean(q.answer),
    ...(q.followups?.length ? { followupCount: q.followups.length } : {}),
  })),
};

// Markdown 与 generate.mjs 写入 question.md / answer.md / followups.md 的内容逐字一致
const contents = questions.map((q) => ({
  id: q.id,
  questionMd: `# ${q.title}\n\n${q.question}\n`,
  answerMd: q.answer ? `${q.answer}\n` : null,
  ...(q.followups?.length
    ? {
        followupsMd:
          q.followups.map((f, i) => `## 追问 ${i + 1}：${f.q}\n\n${f.a}`).join('\n\n') + '\n',
      }
    : {}),
}));

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'question-bank',
  '__fixtures__',
  'preview-bank.json',
);
writeFileSync(outPath, `${JSON.stringify({ catalog, contents }, null, 2)}\n`, 'utf8');
console.log(
  `preview-bank.json written: ${catalog.questions.length} questions, ${contents.length} contents`,
);
