/**
 * 题干与标题的重复判定。
 *
 * 题库里的题干往往只是标题的「礼貌化扩写」——「== 和 equals 的区别是什么？」
 * 配上「请说明 Java 中 == 与 equals() 的区别，并解释为什么…」——逐字重复
 * 的判定（trim 后相等）覆盖不了这类情况。这里把两侧归一化后计算标题的
 * 字符 bigram 在题干中的覆盖率：标题被题干复述（覆盖率高）即视为重复，
 * 详情页隐藏题干卡片，避免同屏把同一句话读两遍。
 *
 * 取向是「标题视角」的覆盖率：题干比标题多出的内容（hashCode 补充、
 * 场景要求等）不参与判定——这类扩写正是要隐藏的重复形态；而题干与
 * 标题主题无关时覆盖率自然很低，不会误伤。
 */

/** 覆盖率阈值：标题 bigram 有六成出现在题干中即判为复述 */
const REDUNDANT_COVERAGE_THRESHOLD = 0.6;

export function isQuestionBodyRedundantWithTitle(title: string, questionBody: string): boolean {
  // 题干带图片（架构图/示意图）时不判重复：图片是标题恢复不出来的内容
  if (/!\[[^\]]*\]\([^)]+\)/.test(questionBody)) return false;
  const normalizedTitle = normalizeForCompare(title);
  const normalizedBody = normalizeForCompare(questionBody);
  if (!normalizedTitle || !normalizedBody) return false;
  if (normalizedTitle === normalizedBody) return true;
  if (normalizedBody.includes(normalizedTitle)) return true;
  return bigramCoverage(normalizedTitle, normalizedBody) >= REDUNDANT_COVERAGE_THRESHOLD;
}

/**
 * 归一化：小写、全角转半角、只保留字母数字与 CJK（标点/空白/markdown
 * 符号全部剔除），让「？/?」「，/，」「**加粗**」等差异不影响比较。
 */
function normalizeForCompare(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
}

function bigramCoverage(needle: string, haystack: string): number {
  if (needle.length < 2) return haystack.includes(needle) ? 1 : 0;
  const grams: string[] = [];
  for (let index = 0; index < needle.length - 1; index += 1) {
    grams.push(needle.slice(index, index + 2));
  }
  const matched = grams.filter((gram) => haystack.includes(gram)).length;
  return matched / grams.length;
}
