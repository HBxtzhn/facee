import { splitAnswerSections } from './detail-content';

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
