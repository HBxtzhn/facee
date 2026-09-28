import { partitionSourceMeta, splitAnswerSections } from './detail-content';

describe('partitionSourceMeta', () => {
  it('extracts source meta block at beginning if present', () => {
    const raw = `> 来源: JavaGuide (Apache-2.0) ，已做规范化。\n\n包装类型的缓存机制了解么？`;
    const res = partitionSourceMeta(raw);
    expect(res.sourceMeta).toContain('来源: JavaGuide');
    expect(res.body).toBe('包装类型的缓存机制了解么？');
  });

  it('keeps normal blockquote if not source metadata', () => {
    const raw = `> 注意：这是一个关键提示\n\n正文内容`;
    const res = partitionSourceMeta(raw);
    expect(res.sourceMeta).toBeNull();
    expect(res.body).toBe(raw);
  });
});

describe('splitAnswerSections', () => {
  it('keeps the primary answer separate from interviewer follow-ups', () => {
    const result = splitAnswerSections([
      '### 回答重点',
      '',
      '先说明核心结论。',
      '',
      '### 面试官追问',
      '',
      '**追问1：为什么这样设计？**',
      '',
      '因为需要隔离变化。',
      '',
      '**追问2：有什么代价？**',
      '',
      '会增加少量延迟。',
    ].join('\n'));

    expect(result.main).toContain('先说明核心结论');
    expect(result.main).not.toContain('追问1');
    expect(result.followUps).toEqual([
      { title: '追问1：为什么这样设计？', body: '因为需要隔离变化。' },
      { title: '追问2：有什么代价？', body: '会增加少量延迟。' },
    ]);
  });

  it('leaves answers without a follow-up marker unchanged', () => {
    const result = splitAnswerSections('### 回答重点\n\n只有主答案。');
    expect(result).toEqual({ main: '### 回答重点\n\n只有主答案。', followUps: [] });
  });
});
