import { describe, it, expect } from '@jest/globals';
import {
  buildCorpus,
  buildSnippet,
  decodeCorpus,
  encodeCorpusLine,
  normalizeSearchText,
  searchCorpus,
} from './search';

describe('正文索引规范化（§6.2）', () => {
  it('去掉 Markdown 标记，保留可搜索的文字', () => {
    const md = [
      '# Spring 事务传播机制有哪些？',
      '',
      '**REQUIRED**：当前存在事务则加入，否则新建。',
      '',
      '- 列表项一',
      '- 列表项二',
      '',
      '> 引用内容',
      '',
      '见 [官方文档](https://example.com) 与 ![图](./assets/a.png)',
    ].join('\n');

    const text = normalizeSearchText(md);

    expect(text).toContain('spring 事务传播机制有哪些？');
    expect(text).toContain('required');
    expect(text).toContain('列表项一');
    expect(text).toContain('引用内容');
    expect(text).toContain('官方文档'); // 链接保留文字
    expect(text).not.toContain('example.com'); // 但不要 URL 本身
    expect(text).not.toContain('assets/a.png');
    expect(text).not.toContain('#'); // 井号消失
    expect(text).not.toContain('**'); // 加粗符号消失
    expect(text).not.toContain('\n'); // 压成一行
  });

  it('代码块整体丢弃（符号多、命中噪声大）', () => {
    const text = normalizeSearchText('前文\n```java\nSystem.out.println("x");\n```\n后文');
    expect(text).toContain('前文');
    expect(text).toContain('后文');
    expect(text).not.toContain('println');
  });

  it('转小写以便大小写不敏感匹配', () => {
    expect(normalizeSearchText('HashMap 与 REDIS')).toBe('hashmap 与 redis');
  });
});

describe('语料编解码', () => {
  it('一行一题，id 与正文用制表符分隔', () => {
    const line = encodeCorpusLine('q-01', '# 标题\n\n正文内容');
    expect(line.split('\t')[0]).toBe('q-01');
    expect(line.split('\t')[1]).toBe('标题 正文内容');
  });

  it('损坏行跳过，不影响其他题', () => {
    const corpus = ['q-01\t有效内容', '这一行没有制表符', '\t只有正文没有id', 'q-02\t第二条'].join('\n');
    expect(decodeCorpus(corpus).map((entry) => entry.id)).toEqual(['q-01', 'q-02']);
  });

  it('超长正文按上限截断，避免语料膨胀', () => {
    const line = encodeCorpusLine('q-01', 'x'.repeat(50), 10);
    expect(line.split('\t')[1]).toHaveLength(10);
  });
});

describe('正文搜索', () => {
  const corpus = buildCorpus([
    { id: 'a', markdown: 'Redis 为什么这么快？纯内存操作，单线程，IO 多路复用。' },
    { id: 'b', markdown: 'MySQL 用 B+ 树做索引，因为磁盘 IO 是瓶颈。' },
    { id: 'c', markdown: 'Redis 持久化：RDB 与 AOF，IO 开销不同。' },
    { id: 'd', markdown: '垃圾回收器：G1 可以设定停顿目标。' },
  ]);

  it('命中正文（而不仅是标题）', () => {
    expect(searchCorpus(corpus, '磁盘').map((r) => r.id)).toEqual(['b']);
    expect(searchCorpus(corpus, '多路复用').map((r) => r.id)).toEqual(['a']);
  });

  it('多题命中按命中次数降序，其次按 id', () => {
    const results = searchCorpus(corpus, 'io');
    expect(results.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(results[0].hits).toBeGreaterThanOrEqual(results[1].hits);
  });

  it('多关键词是 AND 语义', () => {
    expect(searchCorpus(corpus, 'redis aof').map((r) => r.id)).toEqual(['c']);
    expect(searchCorpus(corpus, 'redis 不存在的词')).toEqual([]);
  });

  it('大小写不敏感、可搜中文子串', () => {
    expect(searchCorpus(corpus, 'REDIS').map((r) => r.id)).toEqual(['a', 'c']);
    expect(searchCorpus(corpus, '停顿').map((r) => r.id)).toEqual(['d']);
  });

  it('空查询返回空结果，不做全量返回', () => {
    expect(searchCorpus(corpus, '   ')).toEqual([]);
    expect(searchCorpus(corpus, '')).toEqual([]);
  });

  it('结果数量可限制（流式展示只需要前 N 条）', () => {
    expect(searchCorpus(corpus, 'io', 1)).toHaveLength(1);
  });

  it('命中片段用于预览高亮', () => {
    const snippet = buildSnippet(corpus, 'b', 'B+ 树');
    expect(snippet).toContain('b+ 树');
    expect(buildSnippet(corpus, 'b', '不存在的词')).toBeNull();
    expect(buildSnippet(corpus, 'nope', '树')).toBeNull();
  });
});

describe('规模基线（2000 题合成语料）', () => {
  it('构建 + 搜索在可接受时间内完成', () => {
    const questions = Array.from({ length: 2000 }, (_, index) => ({
      id: `q-${String(index).padStart(4, '0')}`,
      markdown: `# 第 ${index} 题\n\n正文内容：这是第 ${index} 道题的说明，包含关键词${index % 37} 与检索词。\n\n\`\`\`java\nclass A${index} {}\n\`\`\`\n`,
    }));

    const startedAt = Date.now();
    const corpus = buildCorpus(questions);
    const buildMs = Date.now() - startedAt;

    const searchStartedAt = Date.now();
    const results = searchCorpus(corpus, '检索词', 50);
    const searchMs = Date.now() - searchStartedAt;

    expect(corpus.length).toBeGreaterThan(1000);
    expect(results).toHaveLength(50);
    // 宽松上限：本地跑通常在几十毫秒内，留足 CI 波动余量
    expect(buildMs).toBeLessThan(3000);
    expect(searchMs).toBeLessThan(1500);
  });
});
