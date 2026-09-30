import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TEST_QUESTION_BANK } from './fixture';
import type { LocalBankSource } from './local-banks';

jest.mock('./client', () => ({
  questionBankRepository: {
    getCatalog: jest.fn(),
    getQuestion: jest.fn(),
    getContent: jest.fn(),
    listQuestions: jest.fn(),
    searchBody: jest.fn(),
    install: jest.fn(),
    installFromUrl: jest.fn(),
    clear: jest.fn(),
    listBanks: jest.fn(),
    switchBank: jest.fn(),
    deleteBank: jest.fn(),
    exportPackage: jest.fn(),
    copyBankAssets: jest.fn(),
  },
}));

// saveLocalBankSource 落盘走真文件系统，测试里只验证编排顺序
jest.mock('./local-banks', () => ({
  ...(jest.requireActual('./local-banks') as Record<string, unknown>),
  saveLocalBankSource: jest.fn(),
}));

import { questionBankRepository } from './client';
import { saveLocalBankSource } from './local-banks';
import { useQuestionBankStore } from './store';

const exportPackageMock =
  questionBankRepository.exportPackage as jest.MockedFunction<typeof questionBankRepository.exportPackage>;
const installMock = questionBankRepository.install as jest.MockedFunction<typeof questionBankRepository.install>;
const getCatalogMock = questionBankRepository.getCatalog as jest.MockedFunction<
  typeof questionBankRepository.getCatalog
>;
const copyBankAssetsMock = questionBankRepository.copyBankAssets as jest.MockedFunction<
  typeof questionBankRepository.copyBankAssets
>;
const saveLocalBankSourceMock = saveLocalBankSource as jest.MockedFunction<typeof saveLocalBankSource>;

describe('question-bank store copyBank（复制为本地题库）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQuestionBankStore.setState({
      catalog: null,
      status: 'idle',
      installing: false,
      installProgress: null,
      installError: null,
      banks: [],
      banksLoading: false,
    });
  });

  it('导出 → 落盘 → 安装激活 → 拷资产 → 刷新，返回 local- 副本 id', async () => {
    exportPackageMock.mockResolvedValue(TEST_QUESTION_BANK);
    installMock.mockResolvedValue({ questionCount: 6, tagCount: 4 });
    getCatalogMock.mockResolvedValue(TEST_QUESTION_BANK.catalog);
    copyBankAssetsMock.mockResolvedValue(undefined);
    saveLocalBankSourceMock.mockResolvedValue(undefined);

    const bankId = await useQuestionBankStore.getState().copyBank('facee-fixture');

    expect(bankId).toMatch(/^local-[a-z0-9]+$/);
    expect(exportPackageMock).toHaveBeenCalledWith('facee-fixture');
    expect(saveLocalBankSourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bankId,
        package: expect.objectContaining({ catalog: expect.objectContaining({ id: bankId }) }),
      }),
    );
    expect(installMock).toHaveBeenCalledTimes(1);
    // 资产复制在 install 之后（目标命名空间登记依赖 install 完成注册表）
    expect(copyBankAssetsMock).toHaveBeenCalledWith('facee-fixture', bankId);
    expect(useQuestionBankStore.getState().status).toBe('ready');
  });

  it('副本标题追加（副本）且内容原样保留', async () => {
    exportPackageMock.mockResolvedValue(TEST_QUESTION_BANK);
    installMock.mockResolvedValue({ questionCount: 6, tagCount: 4 });
    getCatalogMock.mockResolvedValue(TEST_QUESTION_BANK.catalog);

    await useQuestionBankStore.getState().copyBank('facee-fixture');

    const source = saveLocalBankSourceMock.mock.calls[0][0] as LocalBankSource;
    expect(source.package.catalog.title).toBe('FaceE 示例题库（副本）');
    // 内容原样保留（followupsMd 规范化为 null，与 QuestionContent 类型一致）
    expect(source.package.contents).toEqual(
      TEST_QUESTION_BANK.contents.map((content) => ({ ...content, followupsMd: content.followupsMd ?? null })),
    );
  });

  it('题库不存在（导出为 null）向上抛错且不落盘', async () => {
    exportPackageMock.mockResolvedValue(null);

    await expect(useQuestionBankStore.getState().copyBank('local-none')).rejects.toThrow('没有找到题库');
    expect(saveLocalBankSourceMock).not.toHaveBeenCalled();
    expect(installMock).not.toHaveBeenCalled();
  });
});
