import { describe, expect, it } from '@jest/globals';
import {
  FileSystemQuestionBankRepository,
  normalizeAssetRelativePath,
  normalizeQuestionBankZipPath,
  resolveAssetUri,
  resolveQuestionAssetMarkdown,
  validateQuestionBankZipEntries,
  validateQuestionBankZipPath,
} from './file-repository';
import { TEST_QUESTION_BANK } from './fixture';
import type { ZipEntryLike } from './file-repository';

class MemoryFileSystem {
  readonly documentDirectory = 'file:///documents/';
  readonly cacheDirectory = 'file:///cache/';
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

  async deleteAsync(uri: string) {
    for (const key of this.entries.keys()) {
      if (key === uri || key.startsWith(uri.endsWith('/') ? uri : `${uri}/`)) this.entries.delete(key);
    }
  }

  async moveAsync({ from, to }: { from: string; to: string }) {
    if (this.entries.has(to)) throw new Error(`Destination exists: ${to}`);
    const moved = [...this.entries.entries()].filter(([key]) => key === from || key.startsWith(from.endsWith('/') ? from : `${from}/`));
    if (moved.length === 0) throw new Error(`Missing source: ${from}`);
    for (const [key, value] of moved) {
      this.entries.delete(key);
      this.entries.set(`${to}${key.slice(from.length)}`, value);
    }
  }

  async downloadAsync(_url: string, fileUri: string) {
    await this.writeAsStringAsync(fileUri, 'zip');
    return { uri: fileUri, status: 200 };
  }
}

function zipEntriesForFixture(): ZipEntryLike[] {
  return [
    { path: 'catalog.json', isDirectory: false },
    { path: 'questions', isDirectory: true },
    ...TEST_QUESTION_BANK.contents.flatMap((content) => [
      { path: `questions/${content.id}`, isDirectory: true },
      { path: `questions/${content.id}/question.md`, isDirectory: false },
      ...(content.answerMd === null ? [] : [{ path: `questions/${content.id}/answer.md`, isDirectory: false }]),
    ]),
  ];
}

function createZipArchive(
  fileSystem: MemoryFileSystem,
  options: { failAfterFirstFile?: boolean; missingReferencedAsset?: boolean } = {},
) {
  const entries = zipEntriesForFixture();
  return {
    listContents: async () => entries,
    unzip: async (_source: string, target: string) => {
      await fileSystem.writeAsStringAsync(`${target}catalog.json`, JSON.stringify(TEST_QUESTION_BANK.catalog));
      await fileSystem.writeAsStringAsync(
        `${target}questions/${TEST_QUESTION_BANK.contents[0].id}/question.md`,
        TEST_QUESTION_BANK.contents[0].questionMd,
      );
      if (options.failAfterFirstFile) throw new Error('Injected extraction failure');
      for (const content of TEST_QUESTION_BANK.contents) {
        const questionMd =
          options.missingReferencedAsset && content.id === TEST_QUESTION_BANK.contents[0].id
            ? `${content.questionMd}\n![missing](./assets/missing.png)`
            : content.questionMd;
        await fileSystem.writeAsStringAsync(
          `${target}questions/${content.id}/question.md`,
          questionMd,
        );
        if (content.answerMd !== null) {
          await fileSystem.writeAsStringAsync(
            `${target}questions/${content.id}/answer.md`,
            content.answerMd,
          );
        }
      }
      return target;
    },
  };
}

describe('question-bank ZIP path validation', () => {
  it('accepts the fixed catalog, Markdown, and nested asset layout', () => {
    const entries = [
      { path: 'catalog.json', isDirectory: false },
      { path: 'questions', isDirectory: true },
      { path: 'questions/java-1', isDirectory: true },
      { path: 'questions/java-1/question.md', isDirectory: false },
      { path: 'questions/java-1/answer.md', isDirectory: false },
      { path: 'questions/java-1/assets', isDirectory: true },
      { path: 'questions/java-1/assets/diagrams/hash-map.png', isDirectory: false },
    ];

    expect(validateQuestionBankZipEntries(entries)).toEqual(entries.map((entry) => entry.path));
  });

  it('rejects traversal, absolute paths, duplicate files, and encrypted entries', () => {
    expect(() => normalizeQuestionBankZipPath('../catalog.json')).toThrow('Unsafe');
    expect(() => normalizeQuestionBankZipPath('questions/q/assets/%2e%2e/secret.txt')).toThrow('Unsafe');
    expect(normalizeQuestionBankZipPath('questions/q/assets/diagram%20one.png')).toBe('questions/q/assets/diagram one.png');
    expect(() => validateQuestionBankZipPath('/catalog.json')).toThrow('Unsafe');
    expect(() => validateQuestionBankZipEntries([
      { path: 'catalog.json', isDirectory: false },
      { path: 'catalog.json', isDirectory: false },
    ])).toThrow('Duplicate');
    expect(() => validateQuestionBankZipEntries([
      { path: 'catalog.json', isDirectory: false, isEncrypted: true },
    ])).toThrow('Encrypted');
  });

  it('requires a root catalog file', () => {
    expect(() => validateQuestionBankZipEntries([
      { path: 'questions/q/question.md', isDirectory: false },
    ])).toThrow('catalog.json');
    expect(() => validateQuestionBankZipPath('catalog.json', true)).toThrow('must be a file');
  });
});

describe('question-bank asset links', () => {
  it('normalizes safe asset paths and resolves them under the extracted directory', () => {
    expect(normalizeAssetRelativePath('./assets/diagrams/hash-map.png')).toBe('diagrams/hash-map.png');
    expect(resolveAssetUri('file:///documents/facee/assets/', './assets/diagrams/hash-map.png'))
      .toBe('file:///documents/facee/assets/diagrams/hash-map.png');
    expect(resolveAssetUri('file:///documents/facee/assets/', './assets/diagram%20one.png'))
      .toBe('file:///documents/facee/assets/diagram%20one.png');
    expect(() => normalizeAssetRelativePath('./assets/../secret.png')).toThrow('Unsafe');
  });

  it('rewrites relative Markdown asset links without touching external links', () => {
    const markdown = [
      '![HashMap](./assets/hash-map.png)',
      '[docs](https://example.com/docs)',
    ].join('\n');
    const resolved = resolveQuestionAssetMarkdown(markdown, 'file:///documents/facee/assets/');

    expect(resolved).toContain('![HashMap](file:///documents/facee/assets/hash-map.png)');
    expect(resolved).toContain('[docs](https://example.com/docs)');
  });
});

describe('FileSystemQuestionBankRepository installation safety', () => {
  it('does not let a progress listener interrupt activation', async () => {
    const repository = new FileSystemQuestionBankRepository({
      fileSystem: new MemoryFileSystem() as never,
    });

    await expect(
      repository.install(TEST_QUESTION_BANK, () => {
        throw new Error('presentation failure');
      }),
    ).resolves.toEqual({ questionCount: 6, tagCount: 4 });
    expect((await repository.getCatalog())?.title).toBe(TEST_QUESTION_BANK.catalog.title);
  });

  it('keeps the bank empty when first extraction fails', async () => {
    const fileSystem = new MemoryFileSystem();
    const repository = new FileSystemQuestionBankRepository({
      fileSystem: fileSystem as never,
      zipArchive: createZipArchive(fileSystem, { failAfterFirstFile: true }),
    });

    await expect(repository.installFromUrl('https://example.test/bank.zip')).rejects.toThrow(
      'Injected extraction failure',
    );
    expect(await repository.getCatalog()).toBeNull();
  });

  it('rejects a bank whose Markdown references a missing local asset', async () => {
    const fileSystem = new MemoryFileSystem();
    const repository = new FileSystemQuestionBankRepository({
      fileSystem: fileSystem as never,
      zipArchive: createZipArchive(fileSystem, { missingReferencedAsset: true }),
    });

    await expect(repository.installFromUrl('https://example.test/bank.zip')).rejects.toThrow(
      'Missing referenced asset',
    );
    expect(await repository.getCatalog()).toBeNull();
  });

  it('keeps the previous active bank when replacement extraction fails', async () => {
    const fileSystem = new MemoryFileSystem();
    const repository = new FileSystemQuestionBankRepository({
      fileSystem: fileSystem as never,
      zipArchive: createZipArchive(fileSystem),
    });

    await repository.install(TEST_QUESTION_BANK);
    const originalQuestion = await repository.getContent('fixture-java-001');

    const failingRepository = new FileSystemQuestionBankRepository({
      fileSystem: fileSystem as never,
      zipArchive: createZipArchive(fileSystem, { failAfterFirstFile: true }),
    });
    await expect(failingRepository.installFromUrl('https://example.test/replacement.zip')).rejects.toThrow(
      'Injected extraction failure',
    );

    expect((await repository.getCatalog())?.title).toBe(TEST_QUESTION_BANK.catalog.title);
    expect((await repository.getContent('fixture-java-001'))?.questionMd).toBe(originalQuestion?.questionMd);
  });
});
