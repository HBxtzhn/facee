import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * 本机用户数据：刷题总数 + 少量偏好。
 *
 * 口径（与产品确认一致）：**只统计累计刷题总数，不按天统计**。
 * 总数按题目 ID 去重 —— 同一道题重复打开只计一次，因此 totalCount 表示
 * 「刷过多少道题」，而不是「打开过多少次」。
 */

interface UserData {
  totalCount: number;
  /** 已计过数的题目 ID，用于去重（题库规模约 2000，体积可忽略） */
  viewedQuestionIds: string[];
  hasPromptedRule: boolean;
  lastViewedQuestionId: string | null;
  /** 设置项：进入题目时是否默认展开参考答案 */
  answerExpandedByDefault: boolean;
}

interface UserActions {
  recordView: (questionId: string) => void;
  setPrompted: () => void;
  setAnswerExpandedByDefault: (value: boolean) => void;
  load: () => Promise<void>;
}

type UserState = UserData & UserActions;

const STORAGE_KEY = 'facee-user-state';

const INITIAL_DATA: Readonly<UserData> = {
  totalCount: 0,
  viewedQuestionIds: [],
  hasPromptedRule: false,
  lastViewedQuestionId: null,
  answerExpandedByDefault: false,
};

let pendingPersist = Promise.resolve();

export const useUserStore = create<UserState>((set, get) => ({
  ...INITIAL_DATA,

  recordView: (questionId) => {
    const state = get();
    const alreadyCounted = state.viewedQuestionIds.includes(questionId);
    const viewedQuestionIds = alreadyCounted
      ? state.viewedQuestionIds
      : [...state.viewedQuestionIds, questionId];

    set({
      viewedQuestionIds,
      totalCount: alreadyCounted ? state.totalCount : state.totalCount + 1,
      lastViewedQuestionId: questionId,
    });
    queuePersist(get());
  },

  setPrompted: () => {
    set({ hasPromptedRule: true });
    queuePersist(get());
  },

  setAnswerExpandedByDefault: (value) => {
    set({ answerExpandedByDefault: value });
    queuePersist(get());
  },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const persisted = parsePersistedData(raw);
      if (!persisted) return;

      set(persisted);
    } catch {
      // Storage is a cache: keep the usable in-memory defaults on read failure.
    }
  },
}));

function parsePersistedData(raw: string): UserData | null {
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value)) return null;

  const viewedQuestionIds = asStringArray(value.viewedQuestionIds);
  // 历史数据没有 id 列表（旧版按天去重），保留其 totalCount 以免进度倒退。
  const totalCount = Math.max(asNonNegativeInteger(value.totalCount), viewedQuestionIds.length);

  return {
    totalCount,
    viewedQuestionIds,
    hasPromptedRule: typeof value.hasPromptedRule === 'boolean' ? value.hasPromptedRule : false,
    lastViewedQuestionId: asNullableString(value.lastViewedQuestionId),
    answerExpandedByDefault:
      typeof value.answerExpandedByDefault === 'boolean' ? value.answerExpandedByDefault : false,
  };
}

function queuePersist(state: UserState): void {
  const serialized = JSON.stringify(toPersistedData(state));
  pendingPersist = pendingPersist
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(STORAGE_KEY, serialized))
    .catch(() => undefined);
}

function toPersistedData(state: UserState): UserData {
  return {
    totalCount: state.totalCount,
    viewedQuestionIds: state.viewedQuestionIds,
    hasPromptedRule: state.hasPromptedRule,
    lastViewedQuestionId: state.lastViewedQuestionId,
    answerExpandedByDefault: state.answerExpandedByDefault,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))];
}
