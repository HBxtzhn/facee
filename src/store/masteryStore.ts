import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * 题目级学习状态（掌握度）：本题库里每道题的「会 / 模糊 / 不会」。
 *
 * 口径（评审定稿，实现必须与之一致）：
 *   1. 任何时候可评、可改、可清除——打标不依赖答案是否可见；
 *   2. 无答案题（hasAnswer=false）同样可以打标，闭环对它不能静默失效；
 *   3. **按题库 catalog.id 命名空间隔离**：同一 questionId 在不同题库互不影响，
 *      换题库不串味，旧库记录保留（换回旧库时恢复）；派生列表（如错题本）按
 *      当前题库过滤孤儿数据；
 *   4. 错题本 = unknown + fuzzy 的派生结果，不做第二个独立数据源。
 *
 * 持久化模板沿用 userStore（串行 queuePersist + 容错解析），不学 favoritesStore
 * 的裸 JSON.parse——那是全仓最弱的持久化样例。
 */

/** 三态掌握度。`unknown` 是「不会」，与「未打标」（无记录）严格区分。 */
export type Mastery = 'unknown' | 'fuzzy' | 'known';

/** 单个题库内的掌握度表：questionId -> Mastery */
export type BankMarks = Record<string, Mastery>;

interface MasteryData {
  /** 题库 catalog.id -> 该库的掌握度表 */
  marks: Record<string, BankMarks>;
}

interface MasteryActions {
  /** 打标；传 null 表示清除该题的记录（不是标成 unknown） */
  setMark: (bankId: string, questionId: string, mastery: Mastery | null) => void;
  /** 非响应式读取（与 favoritesStore.has 同类），渲染中请订阅 marks */
  getMark: (bankId: string, questionId: string) => Mastery | null;
  load: () => Promise<void>;
}

type MasteryState = MasteryData & MasteryActions;

const STORAGE_KEY = 'facee-mastery-state.v1';

const INITIAL_DATA: Readonly<MasteryData> = { marks: {} };

let pendingPersist = Promise.resolve();

export const useMasteryStore = create<MasteryState>((set, get) => ({
  ...INITIAL_DATA,

  setMark: (bankId, questionId, mastery) => {
    const bankMarks = { ...get().marks[bankId] };
    if (mastery === null) delete bankMarks[questionId];
    else bankMarks[questionId] = mastery;

    const marks = { ...get().marks };
    if (Object.keys(bankMarks).length > 0) marks[bankId] = bankMarks;
    else delete marks[bankId];

    set({ marks });
    queuePersist(get());
  },

  getMark: (bankId, questionId) => get().marks[bankId]?.[questionId] ?? null,

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

function parsePersistedData(raw: string): MasteryData | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || !isRecord(value.marks)) return null;

  const marks: Record<string, BankMarks> = {};
  for (const [bankId, bankValue] of Object.entries(value.marks)) {
    if (typeof bankId !== 'string' || bankId.length === 0 || !isRecord(bankValue)) continue;
    const bankMarks: BankMarks = {};
    for (const [questionId, mastery] of Object.entries(bankValue)) {
      if (questionId.length === 0 || !isMastery(mastery)) continue;
      bankMarks[questionId] = mastery;
    }
    if (Object.keys(bankMarks).length > 0) marks[bankId] = bankMarks;
  }
  return { marks };
}

function isMastery(value: unknown): value is Mastery {
  return value === 'unknown' || value === 'fuzzy' || value === 'known';
}

function queuePersist(state: MasteryState): void {
  const serialized = JSON.stringify(toPersistedData(state));
  pendingPersist = pendingPersist
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(STORAGE_KEY, serialized))
    .catch(() => undefined);
}

function toPersistedData(state: MasteryState): MasteryData {
  return { marks: state.marks };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
