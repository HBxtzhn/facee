import { create } from 'zustand';
import { Platform } from 'react-native';
import { questionBankRepository } from './client';
import {
  getConfiguredQuestionBankUrl,
  getSavedQuestionBankUrl,
  installConfiguredQuestionBank,
  saveQuestionBankUrl,
} from './installer';
import {
  createLocalBankPackage,
  deleteLocalBankSource,
  saveLocalBankSource,
  type LocalBankSource,
} from './local-banks';
import type {
  InstallationProgress,
  InstalledBankSummary,
  QuestionBankCatalog,
} from './types';

export type QuestionBankStatus = 'idle' | 'loading' | 'empty' | 'ready';

interface QuestionBankState {
  catalog: QuestionBankCatalog | null;
  status: QuestionBankStatus;
  installing: boolean;
  installProgress: InstallationProgress | null;
  installError: string | null;
  sourceUrl: string;
  /** 本机全部题库（本地 + 线上），Profile 题库管理弹窗使用 */
  banks: InstalledBankSummary[];
  banksLoading: boolean;
  setSourceUrl(value: string): void;
  clearInstallError(): void;
  initialize(): Promise<void>;
  installConfigured(): Promise<boolean>;
  refreshBanks(): Promise<void>;
  /** 新建空本地题库（源文件 + 安装激活），返回 bankId */
  createLocalBank(title: string): Promise<string>;
  /** 保存本地题库源并重建安装；若编辑的不是当前题库，保存后保持原题库激活 */
  saveLocalBank(source: LocalBankSource): Promise<void>;
  deleteLocalBank(bankId: string): Promise<void>;
  switchBank(catalogId: string): Promise<void>;
}

/** Owns the application-level question-bank lifecycle for every screen. */
export const useQuestionBankStore = create<QuestionBankState>((set, get) => ({
  catalog: null,
  status: 'idle',
  installing: false,
  installProgress: null,
  installError: null,
  sourceUrl: getConfiguredQuestionBankUrl() ?? '',
  banks: [],
  banksLoading: false,
  setSourceUrl: (sourceUrl) => set({ sourceUrl }),
  clearInstallError: () => set({ installError: null }),

  initialize: async () => {
    set({ status: 'loading' });
    try {
      const [catalog, savedUrl] = await Promise.all([
        questionBankRepository.getCatalog(),
        getSavedQuestionBankUrl(),
      ]);
      set({
        catalog,
        sourceUrl: savedUrl ?? getConfiguredQuestionBankUrl() ?? '',
        status: catalog ? 'ready' : 'empty',
      });
      await get().refreshBanks();
    } catch (error) {
      set({
        catalog: null,
        status: 'empty',
        installError: error instanceof Error ? error.message : String(error),
      });
    }
  },

  installConfigured: async () => {
    const sourceUrl = get().sourceUrl.trim();
    await saveQuestionBankUrl(sourceUrl);
    set({
      installing: true,
      installError: null,
      installProgress: { completed: 0, total: 1, label: '正在准备完整题库下载' },
    });
    try {
      await installConfiguredQuestionBank(questionBankRepository, (installProgress) => {
        set({ installProgress });
      }, sourceUrl);
      const catalog = await questionBankRepository.getCatalog();
      if (!catalog) throw new Error('题库安装完成，但无法读取本地目录');
      set({ catalog, status: 'ready', installing: false });
      await get().refreshBanks();
      return true;
    } catch (error) {
      set({
        installError: error instanceof Error ? error.message : String(error),
        installing: false,
      });
      return false;
    }
  },

  refreshBanks: async () => {
    set({ banksLoading: true });
    try {
      const banks = await questionBankRepository.listBanks();
      set({ banks, banksLoading: false });
    } catch {
      set({ banks: [], banksLoading: false });
    }
  },

  createLocalBank: async (title) => {
    assertNativeBankOperations();
    const bank = createLocalBankPackage(title);
    const source: LocalBankSource = { bankId: bank.catalog.id, updatedAt: '', package: bank };
    await saveLocalBankSource(source);
    await runInstall(set, () => questionBankRepository.install(bank));
    await get().refreshBanks();
    return bank.catalog.id;
  },

  saveLocalBank: async (source) => {
    assertNativeBankOperations();
    // 保存前记住当前题库：编辑非激活的题库不应该把它顶成当前使用
    const activeIdBefore = get().catalog?.id ?? null;
    await saveLocalBankSource(source);
    await runInstall(set, () => questionBankRepository.install(source.package));
    if (activeIdBefore && activeIdBefore !== source.bankId) {
      await questionBankRepository.switchBank(activeIdBefore);
    }
    await get().refreshBanks();
  },

  deleteLocalBank: async (bankId) => {
    assertNativeBankOperations();
    await deleteLocalBankSource(bankId);
    await questionBankRepository.deleteBank(bankId);
    await reloadCatalog(set);
    await get().refreshBanks();
  },

  switchBank: async (catalogId) => {
    assertNativeBankOperations();
    await questionBankRepository.switchBank(catalogId);
    await reloadCatalog(set);
    await get().refreshBanks();
  },
}));

type SetQuestionBankState = (partial: Partial<QuestionBankState>) => void;

/** 重建安装题库并刷新 catalog；失败时写 installError 并向上抛出 */
async function runInstall(
  set: SetQuestionBankState,
  perform: () => Promise<unknown>,
): Promise<void> {
  set({ installing: true, installError: null });
  try {
    await perform();
    const catalog = await questionBankRepository.getCatalog();
    if (!catalog) throw new Error('题库保存完成，但无法读取本地目录');
    set({ catalog, status: 'ready', installing: false });
  } catch (error) {
    set({
      installError: error instanceof Error ? error.message : String(error),
      installing: false,
    });
    throw error;
  }
}

async function reloadCatalog(set: SetQuestionBankState): Promise<void> {
  const catalog = await questionBankRepository.getCatalog();
  set({ catalog, status: catalog ? 'ready' : 'empty' });
}

/** 本地题库操作依赖 documentDirectory，Web 预览一律拒绝 */
function assertNativeBankOperations(): void {
  if (Platform.OS === 'web') {
    throw new Error('Web 预览不支持本地题库，请在移动端使用');
  }
}
