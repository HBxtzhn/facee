import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCatalog, validateCatalogSchema } from './schema';
import {
  isIgnoredRepositoryPath,
  resolveQuestionBankZipRoot,
  validateQuestionBankZipEntries,
  type ZipEntryLike,
} from './file-repository';

/**
 * 真实产物验证：__fixtures__/published-catalog.json 是从
 * https://github.com/HBxtzhn/facee-bank/archive/refs/heads/main.zip
 * 里原样取出的 catalog.json（题库规范 v1），不是手写样本。
 *
 * 这一组用例锁住两件事：
 *   1. 面向 git 仓库的题库（规范 v1）能被 App 接受；
 *   2. GitHub 归档 ZIP 的形态（多一层目录 + 仓库元数据 + 目录条目）能装。
 */
const publishedCatalog = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__', 'published-catalog.json'), 'utf8'),
) as Record<string, unknown>;

describe('题库规范 v1（真实发布产物）', () => {
  it('能从 v1 规范解析出权威形态的 catalog', () => {
    const catalog = parseCatalog(publishedCatalog);

    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.id).toBe('facee-sample-bank');
    expect(catalog.title).toBe('FaceE 示例题库');
    expect(catalog.version).toBe('1.0.0');
    expect(catalog.updatedAt).toBe('2026-09-15T00:00:00Z');
    expect(catalog.questions).toHaveLength(29);
    expect(catalog.categories).toHaveLength(9);
    expect(catalog.tags).toHaveLength(18);
  });

  it('难度名映射为 1/2/3，order 映射为 sort', () => {
    const catalog = parseCatalog(publishedCatalog);
    const byId = new Map(catalog.questions.map((question) => [question.id, question]));

    expect(byId.get('java-basic-01')?.difficulty).toBe(1); // easy
    expect(byId.get('jvm-memory-01')?.difficulty).toBe(2); // medium
    expect(byId.get('mysql-index-01')?.difficulty).toBe(3); // hard
    expect(byId.get('java-basic-01')?.sort).toBe(10);
    expect(byId.get('java-basic-04')?.sort).toBe(40);
  });

  it('标签引用 id 会被补齐 name，且可被标签树筛选使用', () => {
    const catalog = parseCatalog(publishedCatalog);
    const byId = new Map(catalog.questions.map((question) => [question.id, question]));

    expect(byId.get('mysql-index-01')?.tags.map((tag) => tag.id)).toEqual([
      'database',
      'mysql',
      'index',
    ]);
    expect(byId.get('mysql-index-01')?.tags.map((tag) => tag.name)).toEqual([
      '数据库',
      'MySQL',
      '索引',
    ]);
    // 四层深度标签（backend > java > spring > transaction）也要能解析
    expect(catalog.tags.find((tag) => tag.id === 'transaction')?.parentId).toBe('spring');
    expect(catalog.tags.find((tag) => tag.id === 'spring')?.parentId).toBe('java');
    expect(catalog.tags.find((tag) => tag.id === 'java')?.parentId).toBe('backend');
  });

  it('分类与追问元数据保留下来', () => {
    const catalog = parseCatalog(publishedCatalog);
    const byId = new Map(catalog.questions.map((question) => [question.id, question]));

    expect(catalog.categories?.map((category) => category.id)).toContain('jvm');
    expect(byId.get('jvm-gc-02')?.categoryId).toBe('jvm');
    expect(byId.get('jvm-gc-02')?.followupCount).toBe(3);
    expect(byId.get('spring-tx-01')?.followupCount).toBe(3);
    expect(byId.get('java-basic-01')?.followupCount).toBeUndefined();
  });

  it('无答案题（hasAnswer=false）被保留', () => {
    const catalog = parseCatalog(publishedCatalog);
    const withoutAnswer = catalog.questions.filter((question) => !question.hasAnswer);

    expect(withoutAnswer.map((question) => question.id)).toEqual(['java-basic-04']);
  });

  it('v1 规范里 hasAnswer 缺省时不报错（按 false 处理）', () => {
    const v1: Record<string, unknown> = {
      schemaVersion: 1,
      bank: { id: 'b', name: 'B', version: '1.0.0', updatedAt: '2026-01-01T00:00:00Z' },
      tags: [{ id: 't', name: 'T', parentId: null, order: 10 }],
      questions: [
        { id: 'q-01', title: 'Q', difficulty: 'easy', tags: ['t'], order: 10 },
      ],
    };

    expect(validateCatalogSchema(v1).valid).toBe(true);
    expect(parseCatalog(v1).questions[0].hasAnswer).toBe(false);
  });

  it('v1 规范引用不存在的分类或标签时仍然报错', () => {
    const base = {
      schemaVersion: 1,
      bank: { id: 'b', name: 'B', version: '1.0.0', updatedAt: '2026-01-01T00:00:00Z' },
      categories: [{ id: 'c1', name: 'C', order: 10 }],
      tags: [{ id: 't', name: 'T', parentId: null, order: 10 }],
    };

    const badCategory = validateCatalogSchema({
      ...base,
      questions: [{ id: 'q-01', title: 'Q', difficulty: 'easy', categoryId: 'nope', tags: ['t'], order: 1 }],
    });
    expect(badCategory.valid).toBe(false);
    expect(badCategory.issues.join(' ')).toContain('unknown category');

    const badTag = validateCatalogSchema({
      ...base,
      questions: [{ id: 'q-01', title: 'Q', difficulty: 'easy', categoryId: 'c1', tags: ['ghost'], order: 1 }],
    });
    expect(badTag.valid).toBe(false);
    expect(badTag.issues.join(' ')).toContain('unknown tag');

    const badDifficulty = validateCatalogSchema({
      ...base,
      questions: [{ id: 'q-01', title: 'Q', difficulty: 'hardest', categoryId: 'c1', tags: ['t'], order: 1 }],
    });
    expect(badDifficulty.valid).toBe(false);
    expect(badDifficulty.issues.join(' ')).toContain('difficulty');
  });

  it('旧格式（difficulty 数字、sort、无 bank 字段）继续可用', () => {
    const legacy = {
      schemaVersion: 1,
      id: 'legacy',
      title: '旧格式题库',
      tags: [{ id: 'java', name: 'Java', parentId: null, sort: 10 }],
      questions: [
        {
          id: 'q-01',
          title: '题目',
          difficulty: 2,
          hasAnswer: true,
          sort: 10,
          tags: [{ id: 'java', name: 'Java' }],
        },
      ],
    };

    const catalog = parseCatalog(legacy);
    expect(catalog.id).toBe('legacy');
    expect(catalog.categories).toBeUndefined();
    expect(catalog.questions[0].difficulty).toBe(2);
  });
});

describe('GitHub 归档 ZIP 形态兼容', () => {
  const archiveEntries: ZipEntryLike[] = [
    { path: 'facee-bank-main/', isDirectory: true },
    { path: 'facee-bank-main/.gitattributes', isDirectory: false },
    { path: 'facee-bank-main/README.md', isDirectory: false },
    { path: 'facee-bank-main/.github/', isDirectory: true },
    { path: 'facee-bank-main/.github/workflows/ci.yml', isDirectory: false },
    { path: 'facee-bank-main/catalog.json', isDirectory: false },
    { path: 'facee-bank-main/questions/', isDirectory: true },
    { path: 'facee-bank-main/questions/java-basic-01/', isDirectory: true },
    { path: 'facee-bank-main/questions/java-basic-01/question.md', isDirectory: false },
    { path: 'facee-bank-main/questions/java-basic-01/answer.md', isDirectory: false },
    { path: 'facee-bank-main/questions/jvm-gc-02/', isDirectory: true },
    { path: 'facee-bank-main/questions/jvm-gc-02/question.md', isDirectory: false },
    { path: 'facee-bank-main/questions/jvm-gc-02/answer.md', isDirectory: false },
    { path: 'facee-bank-main/questions/jvm-gc-02/followups.md', isDirectory: false },
    { path: 'facee-bank-main/questions/jvm-gc-02/assets/', isDirectory: true },
    { path: 'facee-bank-main/questions/jvm-gc-02/assets/gc-timeline.png', isDirectory: false },
  ];

  it('识别出包裹目录', () => {
    expect(resolveQuestionBankZipRoot(archiveEntries)).toBe('facee-bank-main/');
  });

  it('catalog.json 在包根时前缀为空', () => {
    expect(resolveQuestionBankZipRoot([
      { path: 'catalog.json', isDirectory: false },
      { path: 'questions/java-basic-01/question.md', isDirectory: false },
    ])).toBe('');
  });

  it('找不到 catalog.json 时报错', () => {
    expect(() => resolveQuestionBankZipRoot([
      { path: 'facee-bank-main/README.md', isDirectory: false },
    ])).toThrow(/catalog/);
  });

  it('多个候选根时报错，不猜', () => {
    expect(() => resolveQuestionBankZipRoot([
      { path: 'a/catalog.json', isDirectory: false },
      { path: 'b/catalog.json', isDirectory: false },
    ])).toThrow(/多个 catalog/);
  });

  it('仓库元数据文件与追问文件不再导致拒装', () => {
    const paths = validateQuestionBankZipEntries(archiveEntries, 'facee-bank-main/');

    expect(paths).toContain('catalog.json');
    expect(paths).toContain('questions/jvm-gc-02/followups.md');
    expect(paths).toContain('questions/jvm-gc-02/assets/gc-timeline.png');
    // 仓库元数据被忽略，且不会出现在白名单里
    expect(paths.some((path) => path.includes('README'))).toBe(false);
    expect(paths.some((path) => path.startsWith('.github'))).toBe(false);
    expect(paths.some((path) => path.startsWith('facee-bank-main/'))).toBe(false);
  });

  it('题库根之外的非元数据文件仍然拒绝', () => {
    expect(() => validateQuestionBankZipEntries([
      { path: 'facee-bank-main/catalog.json', isDirectory: false },
      { path: 'facee-bank-main/secret/payload.sh', isDirectory: false },
    ], 'facee-bank-main/')).toThrow(/Unexpected ZIP entry path/);
  });

  it('路径穿越与加密条目仍然拒绝', () => {
    expect(() => validateQuestionBankZipEntries([
      { path: '../../evil.txt', isDirectory: false },
      { path: 'catalog.json', isDirectory: false },
    ])).toThrow(/Unsafe ZIP entry path/);

    expect(() => validateQuestionBankZipEntries([
      { path: 'catalog.json', isDirectory: false, isEncrypted: true },
    ])).toThrow(/Encrypted/);
  });

  it('仓库元数据识别规则', () => {
    expect(isIgnoredRepositoryPath('.gitattributes')).toBe(true);
    expect(isIgnoredRepositoryPath('README.md')).toBe(true);
    expect(isIgnoredRepositoryPath('.github/workflows/ci.yml')).toBe(true);
    expect(isIgnoredRepositoryPath('questions/q-01/question.md')).toBe(false);
    expect(isIgnoredRepositoryPath('notes.md')).toBe(false);
  });
});
