import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createLocalBankPackage,
  hashName,
  isLocalBankId,
  listLocalBankSources,
  loadLocalBankSource,
  newLocalBankId,
  questionIdFromTitle,
  removeQuestion,
  saveLocalBankSource,
  tagIdFromName,
  upsertQuestion,
  type LocalBankSource,
} from './local-banks';
import { validateDecodedPackage } from './file-repository';

/** 与 file-repository.spec 的 MemoryFileSystem 同款最小桩（只实现用到的部分） */
class MemoryFileSystem {
  readonly documentDirectory = 'file:///documents/';
  private readonly entries = new Map<string, { isDirectory: boolean; value?: string }>();

  async getInfoAsync(uri: string) {
    const entry = this.entries.get(uri);
    return { exists: Boolean(entry), isDirectory: entry?.isDirectory ?? false };
  }

  async makeDirectoryAsync(uri: string) {
    this.entries.set(uri, { isDirectory: true });
  }

  async writeAsStringAsync(uri: string, value: string) {
    this.entries.set(uri, { isDirectory: false, value });
  }

  async readAsStringAsync(uri: string) {
    const entry = this.entries.get(uri);
    if (!entry || entry.isDirectory) throw new Error(`Missing file: ${uri}`);
    return entry.value ?? '';
  }

  async readDirectoryAsync(uri: string) {
    const prefix = uri.endsWith('/') ? uri : `${uri}/`;
    const children = new Set<string>();
    for (const key of this.entries.keys()) {
      if (!key.startsWith(prefix)) continue;
      const segment = key.slice(prefix.length).split('/')[0];
      if (segment) children.add(segment);
    }
    return [...children];
  }

  async deleteAsync(uri: string) {
    for (const key of [...this.entries.keys()]) {
      if (key === uri || key.startsWith(uri.endsWith('/') ? uri : `${uri}/`)) this.entries.delete(key);
    }
  }
}

const DRAFT = {
  title: 'HashMap 的底层实现？',
  difficulty: 2 as const,
  tags: ['Java', '集合'],
  questionMd: '请说明 HashMap 的底层数据结构。',
  answerMd: '数组 + 链表 + 红黑树。',
};

describe('local-banks 包构造', () => {
  it('空本地题库包通过 validateDecodedPackage 校验', () => {
    const bank = createLocalBankPackage('我的面经题库');
    expect(() => validateDecodedPackage(bank)).not.toThrow();
    expect(bank.catalog.id).toMatch(/^local-[a-z0-9]+$/);
    expect(bank.catalog.categories?.[0]?.id).toBe('local');
  });

  it('newLocalBankId 符合规范且不重复', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newLocalBankId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(isLocalBankId(id)).toBe(true);
  });
});

describe('local-banks 题目模型（纯函数）', () => {
  it('新增题目：写齐元数据与内容，标签 upsert，空答案 → hasAnswer:false', () => {
    let bank = createLocalBankPackage('测试库');
    bank = upsertQuestion(bank, DRAFT);
    expect(bank.catalog.questions).toHaveLength(1);

    const question = bank.catalog.questions[0];
    expect(question.title).toBe(DRAFT.title);
    expect(question.difficulty).toBe(2);
    expect(question.categoryId).toBe('local');
    expect(question.hasAnswer).toBe(true);
    expect(question.tags.map((tag) => tag.name)).toEqual(['Java', '集合']);
    expect(question.tags.map((tag) => tag.id)).toEqual([tagIdFromName('Java'), tagIdFromName('集合')]);

    expect(bank.catalog.tags.map((tag) => tag.name).sort()).toEqual(['Java', '集合'].sort());
    expect(bank.contents).toHaveLength(1);
    expect(bank.contents[0].answerMd).toBe(DRAFT.answerMd);
  });

  it('同名标签在不同题目间复用同一 id', () => {
    let bank = createLocalBankPackage('测试库');
    bank = upsertQuestion(bank, DRAFT);
    bank = upsertQuestion(bank, { ...DRAFT, title: '第二道题', tags: ['Java'] });
    expect(bank.catalog.tags).toHaveLength(2);
    expect(bank.catalog.questions[1].tags[0].id).toBe(bank.catalog.questions[0].tags[0].id);
  });

  it('空答案（纯空白）→ hasAnswer:false 且 answerMd 为 null', () => {
    let bank = createLocalBankPackage('测试库');
    bank = upsertQuestion(bank, { ...DRAFT, answerMd: '   ' });
    expect(bank.catalog.questions[0].hasAnswer).toBe(false);
    expect(bank.contents[0].answerMd).toBeNull();
  });

  it('编辑既有题目：id 与 sort 保持，内容替换', () => {
    let bank = createLocalBankPackage('测试库');
    bank = upsertQuestion(bank, DRAFT);
    const id = bank.catalog.questions[0].id;
    const sort = bank.catalog.questions[0].sort;

    bank = upsertQuestion(bank, { ...DRAFT, id, title: '改名后的题' });
    expect(bank.catalog.questions).toHaveLength(1);
    expect(bank.catalog.questions[0].id).toBe(id);
    expect(bank.catalog.questions[0].sort).toBe(sort);
    expect(bank.catalog.questions[0].title).toBe('改名后的题');
    expect(bank.contents[0].questionMd).toBe(DRAFT.questionMd);
  });

  it('编辑不存在的题目 id 会报错', () => {
    const bank = createLocalBankPackage('测试库');
    expect(() => upsertQuestion(bank, { ...DRAFT, id: 'q-nope' })).toThrow('不存在');
  });

  it('删除题目同时移除元数据与内容', () => {
    let bank = createLocalBankPackage('测试库');
    bank = upsertQuestion(bank, DRAFT);
    const id = bank.catalog.questions[0].id;
    bank = removeQuestion(bank, id);
    expect(bank.catalog.questions).toHaveLength(0);
    expect(bank.contents).toHaveLength(0);
  });

  it('questionIdFromTitle 确定性生成，冲突时追加序号', () => {
    expect(questionIdFromTitle('同一题', new Set())).toBe(questionIdFromTitle('同一题', new Set()));
    const base = questionIdFromTitle('同一题', new Set());
    expect(questionIdFromTitle('同一题', new Set([base]))).toBe(`${base}-1`);
    expect(questionIdFromTitle('同一题', new Set([base, `${base}-1`]))).toBe(`${base}-2`);
  });

  it('hashName 对不同名称给出不同 id（抽样）', () => {
    expect(tagIdFromName('Java')).not.toBe(tagIdFromName('数据库'));
    expect(hashName('abc')).toBe(hashName('abc'));
  });
});

describe('local-banks 源文件 CRUD', () => {
  let fs: MemoryFileSystem;

  beforeEach(() => {
    fs = new MemoryFileSystem();
  });

  it('保存后可加载、列出、删除', async () => {
    const bank = createLocalBankPackage('我的错题集');
    const source: LocalBankSource = { bankId: bank.catalog.id, updatedAt: '', package: bank };

    await saveLocalBankSource(source, fs as never);

    const loaded = await loadLocalBankSource(bank.catalog.id, fs as never);
    expect(loaded?.package.catalog.title).toBe('我的错题集');
    expect(loaded?.updatedAt).not.toBe('');

    const summaries = await listLocalBankSources(fs as never);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].bankId).toBe(bank.catalog.id);
    expect(summaries[0].title).toBe('我的错题集');

    await fs.deleteAsync(`file:///documents/facee-question-bank/local-sources/${bank.catalog.id}.json`);
    expect(await loadLocalBankSource(bank.catalog.id, fs as never)).toBeNull();
    expect(await listLocalBankSources(fs as never)).toHaveLength(0);
  });

  it('加载不存在的源返回 null，损坏的 JSON 不抛错', async () => {
    expect(await loadLocalBankSource('local-nothing', fs as never)).toBeNull();

    await fs.makeDirectoryAsync('file:///documents/facee-question-bank/local-sources/');
    await fs.writeAsStringAsync('file:///documents/facee-question-bank/local-sources/local-bad.json', '{oops');
    expect(await loadLocalBankSource('local-bad', fs as never)).toBeNull();
    expect(await listLocalBankSources(fs as never)).toHaveLength(0);
  });

  it('保存时 bankId 与 catalog.id 不一致会拒绝', async () => {
    const bank = createLocalBankPackage('我的题库');
    const source: LocalBankSource = { bankId: 'local-other', updatedAt: '', package: bank };
    await expect(saveLocalBankSource(source, fs as never)).rejects.toThrow('不一致');
  });
});
