import { describe, it, expect } from '@jest/globals';
import { isSupportedImportFileName, splitTextIntoChunks, CHUNK_SIZE, MAX_CHUNKS } from './import-text';

describe('isSupportedImportFileName', () => {
  it('接受 md/markdown/txt（大小写不敏感），拒绝其它', () => {
    expect(isSupportedImportFileName('笔记.md')).toBe(true);
    expect(isSupportedImportFileName('README.MD')).toBe(true);
    expect(isSupportedImportFileName('notes.markdown')).toBe(true);
    expect(isSupportedImportFileName('resume.txt')).toBe(true);
    expect(isSupportedImportFileName('简历.pdf')).toBe(false);
    expect(isSupportedImportFileName('表格.docx')).toBe(false);
    expect(isSupportedImportFileName('没有扩展名')).toBe(false);
  });
});

describe('splitTextIntoChunks', () => {
  it('短文本只有一块', () => {
    const { chunks, truncated } = splitTextIntoChunks('第一段。\n\n第二段。');
    expect(chunks).toHaveLength(1);
    expect(truncated).toBe(false);
    expect(chunks[0]).toContain('第二段。');
  });

  it('长文本切成多块，且内容不丢失', () => {
    const paragraphs = Array.from({ length: 300 }, (_, index) => `第 ${index} 段：${'内容'.repeat(40)}`);
    const text = paragraphs.join('\n\n');
    const { chunks, truncated } = splitTextIntoChunks(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(truncated).toBe(false);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(CHUNK_SIZE + 2);
    }
    // 内容无损：所有段落都在某个块里
    for (const paragraph of paragraphs) {
      expect(chunks.some((chunk) => chunk.includes(paragraph))).toBe(true);
    }
  });

  it('尽量在 Markdown 标题行处开新块', () => {
    const sections = Array.from({ length: 12 }, (_, index) => `## 第 ${index} 章\n\n${'正文'.repeat(300)}`);
    const { chunks } = splitTextIntoChunks(sections.join('\n'));
    expect(chunks.length).toBeGreaterThan(1);
    // 多数块以标题开头
    const headingStarts = chunks.filter((chunk) => chunk.startsWith('## 第')).length;
    expect(headingStarts).toBeGreaterThan(chunks.length / 2);
  });

  it('超长单行被硬切，块仍不超限', () => {
    const longLine = '长'.repeat(CHUNK_SIZE * 3);
    const { chunks } = splitTextIntoChunks(longLine);
    expect(chunks.length).toBe(3);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(CHUNK_SIZE);
  });

  it('超过 MAX_CHUNKS 截断并标记', () => {
    const sections = Array.from({ length: 200 }, (_, index) => `## 第 ${index} 章\n\n${'正文'.repeat(500)}`);
    const { chunks, truncated } = splitTextIntoChunks(sections.join('\n'));
    expect(truncated).toBe(true);
    expect(chunks).toHaveLength(MAX_CHUNKS);
  });

  it('空文本返回空块列表', () => {
    const { chunks, truncated } = splitTextIntoChunks('   \n  ');
    expect(chunks).toHaveLength(0);
    expect(truncated).toBe(false);
  });
});
