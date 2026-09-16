import { asRemoteQuestionBankRepository } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  InstallationProgressListener,
  InstallResult,
  QuestionBankRepository,
} from './types';

export type QuestionBankInstallMode = 'unconfigured' | 'remote';
export const QUESTION_BANK_SOURCE_URL_KEY = 'facee-question-bank-source-url-v1';

/** Expo inlines EXPO_PUBLIC_* values at bundle time. Empty values are ignored. */
export function getConfiguredQuestionBankUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_QUESTION_BANK_URL?.trim();
  return configured ? configured : null;
}

/** User-entered URL overrides the build-time default and survives restarts. */
export async function getSavedQuestionBankUrl(): Promise<string | null> {
  try {
    const value = (await AsyncStorage.getItem(QUESTION_BANK_SOURCE_URL_KEY))?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export async function saveQuestionBankUrl(value: string): Promise<string | null> {
  const normalized = value.trim();
  if (normalized) await AsyncStorage.setItem(QUESTION_BANK_SOURCE_URL_KEY, normalized);
  else await AsyncStorage.removeItem(QUESTION_BANK_SOURCE_URL_KEY);
  return normalized || null;
}

export function getQuestionBankInstallMode(
  repository: QuestionBankRepository,
  url = getConfiguredQuestionBankUrl(),
): QuestionBankInstallMode {
  return url && asRemoteQuestionBankRepository(repository)
    ? 'remote'
    : 'unconfigured';
}

export function installConfiguredQuestionBank(
  repository: QuestionBankRepository,
  onProgress?: InstallationProgressListener,
  url = getConfiguredQuestionBankUrl(),
): Promise<InstallResult> {
  const remote = asRemoteQuestionBankRepository(repository);
  if (!url) {
    return Promise.reject(new Error('未配置线上题库地址（EXPO_PUBLIC_QUESTION_BANK_URL）'));
  }
  if (!remote) {
    return Promise.reject(new Error('当前平台暂不支持安装线上 ZIP 题库'));
  }
  return remote.installFromUrl(url, onProgress);
}
