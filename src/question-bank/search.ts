/**
 * 正文全文搜索（§6.2「搜索范围至少包括题目标题，可进一步支持标签、题目正文」）。
 *
 * 设计（与 docs/FaceE-实现方案.md §9.2 一致，但按实际规模做了收敛）：
 *
 *   安装期：把每道题的 question.md + answer.md 规范化为「一行一题」的语料文件
 *           `index/body.txt`（`<id>\t<正文>`），并写 `index/body.idx.json` 偏移表。
 *           规范化会去掉 Markdown 标记与代码块——搜的是内容，不是符号。
 *
 *   查询期：懒加载语料（一次读一个文件），在内存里做子串匹配。
 *
 * 为什么不在查询期遍历 2000 个 question.md：那是 2000 次随机文件读，
 * 而语料是 1 次顺序读；这正是 PRD §28「不一次性加载所有 Markdown 正文」的落地方式。
 *
 * 内存取舍：语料按当前题库规模（220–2000 题，正文规范化后约 0.5–4MB）整体读入，
 * 只在用户真正搜索时加载并常驻。若要进一步压到常量内存，可换成 FileHandle 分块扫描
 * （见方案 §9.2），接口不变。
 */

/** 去掉 Markdown 标记，压缩空白，转小写——只保留可被搜索的正文文字。 */
export function normalizeSearchText(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/\r\n/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ') // 代码块整体丢弃（符号多、命中噪声大）
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/^\s{0,3}#{1,6}\s+/gm, ' ') // 标题井号
    .replace(/^\s{0,3}>\s?/gm, ' ') // 引用
    .replace(/^\s{0,3}[-*+]\s+/gm, ' ') // 列表符号
    .replace(/^\s{0,3}\d+[.)]\s+/gm, ' ') // 有序列表
    .replace(/^\s*\|.*\|\s*$/gm, (row) => row.replace(/\|/g, ' ')) // 表格竖线
    .replace(/^\s*[-*_]{3,}\s*$/gm, ' ') // 分割线
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

/** 语料里的一行：`<id>\t<规范化正文>` */
export function encodeCorpusLine(id: string, markdown: string, maxLength = 20000): string {
  const text = normalizeSearchText(markdown);
  return `${id}\t${text.slice(0, maxLength)}`;
}

export interface CorpusEntry {
  id: string;
  text: string;
}

/** 解析语料文件；损坏行（无 id）直接跳过，不影响其它题可搜。 */
export function decodeCorpus(contents: string): CorpusEntry[] {
  const entries: CorpusEntry[] = [];
  for (const line of contents.split('\n')) {
    if (!line) continue;
    const tab = line.indexOf('\t');
    if (tab <= 0) continue;
    entries.push({ id: line.slice(0, tab), text: line.slice(tab + 1) });
  }
  return entries;
}

export function buildCorpus(entries: { id: string; markdown: string }[]): string {
  return entries.map((entry) => encodeCorpusLine(entry.id, entry.markdown)).join('\n');
}

/**
 * 在语料里搜索关键词，返回命中的题目 id 与命中次数（按命中次数降序，其次按 id）。
 * 多关键词以空格分隔，采用「全部命中」语义（AND）。
 */
export function searchCorpus(
  contents: string,
  query: string,
  limit = 200,
): { id: string; hits: number }[] {
  const terms = query
    .toLocaleLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
  if (terms.length === 0) return [];

  const scored: { id: string; hits: number }[] = [];
  for (const entry of decodeCorpus(contents)) {
    let total = 0;
    let matchedAll = true;
    for (const term of terms) {
      const hits = countOccurrences(entry.text, term);
      if (hits === 0) {
        matchedAll = false;
        break;
      }
      total += hits;
    }
    if (matchedAll) scored.push({ id: entry.id, hits: total });
  }

  return scored
    .sort((left, right) => right.hits - left.hits || left.id.localeCompare(right.id))
    .slice(0, limit);
}

/** 生成命中片段：命中位置前后各取一段，供 UI 高亮/预览。 */
export function buildSnippet(contents: string, id: string, query: string, radius = 28): string | null {
  const term = query.toLocaleLowerCase().split(/\s+/).find((value) => value.trim().length > 0);
  if (!term) return null;
  const entry = decodeCorpus(contents).find((candidate) => candidate.id === id);
  if (!entry) return null;
  const at = entry.text.indexOf(term);
  if (at < 0) return null;
  const start = Math.max(0, at - radius);
  const end = Math.min(entry.text.length, at + term.length + radius);
  return `${start > 0 ? '…' : ''}${entry.text.slice(start, end)}${end < entry.text.length ? '…' : ''}`;
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
    if (count >= 50) break; // 单题命中数封顶即可，避免超长正文拖慢排序
  }
  return count;
}
