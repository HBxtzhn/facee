export type AnswerSection = { title: string; body: string };

/** 去掉题面/答案开头的 `# 标题` 行（与题目大标题重复时），避免正文重复渲染标题 */
export function stripLeadingHeading(markdown: string, expectedTitle?: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const match = normalized.match(/^#\s+(.+)\n+/);
  if (!match || (expectedTitle && match[1].trim() !== expectedTitle.trim())) return normalized;
  return normalized.slice(match[0].length).trimStart();
}

// 分离正文中的元信息引用块（例如：来源: JavaGuide...）以防干扰沉浸式做题
export function partitionSourceMeta(markdown: string): { body: string; sourceMeta: string | null } {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n');

  // 匹配开头的 > 引用块（如 > 来源：JavaGuide...）
  if (lines.length > 0 && lines[0].trim().startsWith('>')) {
    let endIdx = 0;
    while (endIdx < lines.length && (lines[endIdx].trim().startsWith('>') || lines[endIdx].trim() === '')) {
      endIdx++;
    }
    const metaBlock = lines.slice(0, endIdx).join('\n').trim();
    // 判断是否包含典型的来源/规范元数据
    if (/来源|版权|license|Apache|JavaGuide/i.test(metaBlock)) {
      const restBody = lines.slice(endIdx).join('\n').trim();
      return { body: restBody, sourceMeta: metaBlock };
    }
  }

  return { body: normalized, sourceMeta: null };
}

/** Separates the answer from the optional interviewer follow-up section. */
export function splitAnswerSections(markdown: string): { main: string; followUps: AnswerSection[] } {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n');
  const markerIndex = lines.findIndex((line) => /^#{1,6}\s*面试官追问\s*$/.test(line.trim()));
  if (markerIndex < 0) return { main: normalized, followUps: [] };

  const main = lines.slice(0, markerIndex).join('\n').trim();
  const followUpLines = lines.slice(markerIndex + 1);
  const followUps: AnswerSection[] = [];
  let currentTitle = '追问';
  let currentBody: string[] = [];

  const pushCurrent = () => {
    const body = currentBody.join('\n').trim();
    if (body) followUps.push({ title: currentTitle, body });
  };

  for (const line of followUpLines) {
    const trimmed = line.trim();
    const boldTitle = trimmed.match(/^\*\*(追问\s*\d+\s*[:：].+?)\*\*\s*$/);
    const headingTitle = trimmed.match(/^#{1,6}\s+(.+)$/);
    const sectionTitle = boldTitle?.[1] ?? headingTitle?.[1];
    if (sectionTitle) {
      pushCurrent();
      currentTitle = sectionTitle.replace(/\*\*/g, '').trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  pushCurrent();
  return { main, followUps };
}
