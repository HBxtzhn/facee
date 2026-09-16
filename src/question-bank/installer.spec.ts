import {
  getQuestionBankInstallMode,
  installConfiguredQuestionBank,
} from './installer';
import type {
  QuestionBankRepository,
  RemoteQuestionBankRepository,
} from './types';

const repository: QuestionBankRepository = {
  getCatalog: async () => null,
  getQuestion: async () => null,
  getContent: async () => null,
  listQuestions: async () => [],
  searchBody: async () => [],
  install: async () => ({ questionCount: 0, tagCount: 0 }),
  clear: async () => undefined,
};

describe('configured question-bank installer', () => {
  const originalUrl = process.env.EXPO_PUBLIC_QUESTION_BANK_URL;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.EXPO_PUBLIC_QUESTION_BANK_URL;
    } else {
      process.env.EXPO_PUBLIC_QUESTION_BANK_URL = originalUrl;
    }
  });

  it('does not fall back to bundled fixture data when the URL is absent', async () => {
    delete process.env.EXPO_PUBLIC_QUESTION_BANK_URL;

    expect(getQuestionBankInstallMode(repository)).toBe('unconfigured');
    await expect(installConfiguredQuestionBank(repository)).rejects.toThrow(
      '未配置线上题库地址',
    );
  });

  it('uses the configured full-package URL for a remote repository', async () => {
    process.env.EXPO_PUBLIC_QUESTION_BANK_URL = 'https://example.com/question-bank.zip';
    const installFromUrl = jest.fn(async () => ({ questionCount: 2, tagCount: 1 }));
    const remoteRepository: RemoteQuestionBankRepository = {
      ...repository,
      installFromUrl,
    };

    await expect(installConfiguredQuestionBank(remoteRepository)).resolves.toEqual({
      questionCount: 2,
      tagCount: 1,
    });
    expect(installFromUrl).toHaveBeenCalledWith(
      'https://example.com/question-bank.zip',
      undefined,
    );
  });
});
