import { describe, it, expect } from '@jest/globals';
import { parseFollowups } from './followups';

describe('面试官追问解析（题库规范 §6）', () => {
  it('按顶层 H2 切分，前缀被去掉', () => {
    const md = [
      '## 追问 1：为什么这样设计？',
      '',
      '因为它更简单。',
      '',
      '## 追问 2：如果数据量增加怎么办？',
      '',
      '分片 + 冷热分离。',
    ].join('\n');

    const items = parseFollowups(md);

    expect(items).toHaveLength(2);
    expect(items[0].question).toBe('为什么这样设计？');
    expect(items[0].answer).toBe('因为它更简单。');
    expect(items[1].question).toBe('如果数据量增加怎么办？');
  });

  it('代码块里的 ## 不会误切分', () => {
    const md = [
      '## 追问 1：代码里怎么用？',
      '',
      '```java',
      '// ## 这不是标题',
      'public class A {}',
      '```',
      '',
      '## 追问 2：还有别的吗？',
      '',
      '没有。',
    ].join('\n');

    const items = parseFollowups(md);

    expect(items).toHaveLength(2);
    expect(items[0].answer).toContain('public class A {}');
    expect(items[0].answer).toContain('## 这不是标题');
  });

  it('没有正文的分组标题不算追问', () => {
    const md = ['## 面试官追问', '', '## 追问 1：真的吗？', '', '真的。'].join('\n');

    const items = parseFollowups(md);

    expect(items).toHaveLength(1);
    expect(items[0].question).toBe('真的吗？');
  });

  it('支持多种前缀写法与无前缀写法', () => {
    const md = [
      '## 追问1. 冒号换点号',
      '',
      'A',
      '',
      '## 追问 2 没有标点',
      '',
      'B',
      '',
      '## 直接写问题？',
      '',
      'C',
    ].join('\n');

    const items = parseFollowups(md);

    expect(items.map((i) => i.question)).toEqual(['冒号换点号', '没有标点', '直接写问题？']);
  });

  it('H1 与 H3 不会被当成追问', () => {
    const md = ['# 面试官追问', '', '## 追问 1：标题层级', '', '### 小标题', '', '正文'].join('\n');

    const items = parseFollowups(md);

    expect(items).toHaveLength(1);
    expect(items[0].answer).toContain('### 小标题');
  });

  it('空内容返回空数组', () => {
    expect(parseFollowups('')).toEqual([]);
    expect(parseFollowups('没有标题的正文')).toEqual([]);
  });

  it('与题库侧校验器语义一致：三级前缀 + 表格答案', () => {
    const md = [
      '## 追问 1：A？',
      '',
      '| 项 | 值 |',
      '|---|---|',
      '| x | 1 |',
      '',
      '## 追问 2：B？',
      '',
      '答案 B',
      '',
      '## 追问 3：C？',
      '',
      '答案 C',
    ].join('\n');

    const items = parseFollowups(md);

    expect(items).toHaveLength(3);
    expect(items[0].answer).toContain('| 项 | 值 |');
  });
});
