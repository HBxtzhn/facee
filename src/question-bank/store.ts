import { create } from 'zustand';
import { questionBankRepository } from './client';
import {
  getConfiguredQuestionBankUrl,
  getSavedQuestionBankUrl,
  installConfiguredQuestionBank,
  saveQuestionBankUrl,
} from './installer';
import type { InstallationProgress, QuestionBankCatalog } from './types';

export type QuestionBankStatus = 'idle' | 'loading' | 'empty' | 'ready';

interface QuestionBankState {
  catalog: QuestionBankCatalog | null;
  status: QuestionBankStatus;
  installing: boolean;
  installProgress: InstallationProgress | null;
  installError: string | null;
  sourceUrl: string;
  setSourceUrl(value: string): void;
  initialize(): Promise<void>;
  installConfigured(): Promise<boolean>;
}

/** Owns the application-level question-bank lifecycle for every screen. */
export const useQuestionBankStore = create<QuestionBankState>((set, get) => ({
  catalog: null,
  status: 'idle',
  installing: false,
  installProgress: null,
  installError: null,
  sourceUrl: getConfiguredQuestionBankUrl() ?? '',
  setSourceUrl: (sourceUrl) => set({ sourceUrl }),

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
      return true;
    } catch (error) {
      set({
        installError: error instanceof Error ? error.message : String(error),
        installing: false,
      });
      return false;
    }
  },
}));
