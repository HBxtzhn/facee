import { describe, it, expect } from '@jest/globals';
import markdownit, { isExternalHref, parseQuestionHref } from './markdown';

/**
 * 回归：markdown-it 默认拒绝 file: 协议，会把本地图片当纯文本渲染，
 * 导致题库规范 §21（本地图片）在真机上完全失效。这里锁住修复。
 */
describe('markdown 解析器（本地图片）', () => {
  const tokens = (src: string) => markdownit.parse(src, {});

  it('file:// 本地图片被解析成 image token', () => {
    const src = '![JVM 内存结构](file:///data/user/0/com.facee.app/files/bank/assets/memory-layout.png)';
    const parsed = tokens(src);
    const types = parsed.flatMap((token) => [token.type, ...(token.children ?? []).map((c) => c.type)]);

    expect(types).toContain('image');
  });

  it('图片 token 的 src 就是解析后的绝对路径', () => {
    const src = '![图](file:///data/x/assets/heap.png)';
    const inline = tokens(src).find((token) => token.type === 'inline');
    const image: any = (inline?.children ?? []).find((child) => child.type === 'image');

    expect(image?.attrs?.find(([k]: [string, string]) => k === 'src')?.[1]).toBe(
      'file:///data/x/assets/heap.png',
    );
  });

  it('普通 https 图片仍然正常', () => {
    const src = '![远程](https://example.com/a.png)';
    const inline = tokens(src).find((token) => token.type === 'inline');
    expect((inline?.children ?? []).some((child) => child.type === 'image')).toBe(true);
  });

  it('javascript: 链接仍然被拒绝（安全默认不回退）', () => {
    const src = '[点我](javascript:alert(1))';
    const inline = tokens(src).find((token) => token.type === 'inline');
    expect((inline?.children ?? []).some((child) => child.type === 'link_open')).toBe(false);
  });
});

describe('题目内链 scheme', () => {
  it('同时支持 app:// 与题库规范 v1 的 facee://', () => {
    expect(parseQuestionHref('app://question/redis-cache-01')).toBe('redis-cache-01');
    expect(parseQuestionHref('facee://question/mysql-index-01')).toBe('mysql-index-01');
  });

  it('不是题目内链时返回 null', () => {
    expect(parseQuestionHref('https://example.com')).toBeNull();
    expect(parseQuestionHref('app://question/')).toBeNull();
    expect(parseQuestionHref('../other/question.md')).toBeNull();
  });
});

describe('外链判定（§11）', () => {
  it('只把 http/https/mailto 交给系统浏览器', () => {
    expect(isExternalHref('https://docs.oracle.com/x')).toBe(true);
    expect(isExternalHref('http://example.com')).toBe(true);
    expect(isExternalHref('mailto:a@b.com')).toBe(true);
    expect(isExternalHref('file:///data/x.png')).toBe(false);
    expect(isExternalHref('javascript:alert(1)')).toBe(false);
    expect(isExternalHref('facee://question/x')).toBe(false);
  });
});
