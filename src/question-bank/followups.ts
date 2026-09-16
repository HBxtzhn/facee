/**
 * 面试官追问（题库规范 v1 的 `followups.md`）。
 *
 * 格式（与 docs/题库规范-v1.md §6 一致，也与题库侧校验器同一套语义）：
 *
 *   ## 追问 1：为什么这样设计？
 *
 *   追问答案（完整 Markdown，可含代码块/表格/图片）
 *
 *   ## 追问 2：如果数据量增加怎么办？
 *
 *   追问答案
 *
 * 规则：
 *   - 顶层 H2 切分；**代码块内的 `## ` 不切分**（否则答案里的示例代码会把追问切碎）
 *   - `追问 N：` / `追问N.` 前缀可选，去掉后即为追问句
 *   - H2 之后到下一个 H2 之间为追问答案
 *   - 没有正文的 H2（例如 `## 面试官追问` 这类分组标题）不算一条追问
 *   - H1 作为整体标题忽略
 */

export interface Followup {
  /** 追问句（已去掉「追问 N：」前缀） */
  question: string;
  /** 追问答案（Markdown） */
  answer: string;
}

export function parseFollowups(markdown: string): Followup[] {
  if (!markdown) return [];

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: { heading: string; body: string[] }[] = [];
  let current: { heading: string; body: string[] } | null = null;
  let fence: string | null = null;

  for (const line of lines) {
    const fenceMatch = /^\s*(```+|~~~+)/.exec(line);
    if (fenceMatch) {
      fence = fence ? null : fenceMatch[1][0];
      if (current) current.body.push(line);
      continue;
    }

    if (!fence) {
      if (/^##\s+/.test(line)) {
        current = { heading: line.replace(/^##\s+/, '').trim(), body: [] };
        blocks.push(current);
        continue;
      }
      if (/^#\s+/.test(line)) {
        current = null;
        continue;
      }
    }

    if (current) current.body.push(line);
  }

  return blocks
    .map((block) => ({
      question: stripFollowupPrefix(block.heading),
      answer: block.body.join('\n').trim(),
    }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0);
}

function stripFollowupPrefix(heading: string): string {
  const stripped = heading.replace(/^追问\s*\d+\s*[：:.、]?\s*/, '').trim();
  return stripped.length > 0 ? stripped : heading;
}
