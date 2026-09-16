export type AnswerSection = { title: string; body: string };

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
