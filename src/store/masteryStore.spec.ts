import { describe, it, expect, beforeEach } from '@jest/globals';
import { useMasteryStore, type Mastery } from './masteryStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'facee-mastery-state.v1';

const INITIAL = { marks: {} };

async function flushPersist(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('useMasteryStore - 打标与清除', () => {
  beforeEach(async () => {
    await flushPersist();
    await AsyncStorage.clear();
    useMasteryStore.setState({ ...INITIAL });
  });

  it('打标后可读，覆盖旧值，清除（null）后回到未打标', () => {
    const store = useMasteryStore.getState();
    store.setMark('bank-a', 'q1', 'unknown');
    expect(useMasteryStore.getState().getMark('bank-a', 'q1')).toBe('unknown');

    useMasteryStore.getState().setMark('bank-a', 'q1', 'known');
    expect(useMasteryStore.getState().getMark('bank-a', 'q1')).toBe('known');

    useMasteryStore.getState().setMark('bank-a', 'q1', null);
    expect(useMasteryStore.getState().getMark('bank-a', 'q1')).toBeNull();
  });

  it('「不会」与「未打标」严格区分', () => {
    useMasteryStore.getState().setMark('bank-a', 'q1', 'unknown');
    expect(useMasteryStore.getState().getMark('bank-a', 'q1')).toBe('unknown');
    // 未打标的题返回 null，而不是 unknown
    expect(useMasteryStore.getState().getMark('bank-a', 'q2')).toBeNull();
  });

  it('同一 questionId 在不同题库（命名空间）互不影响', () => {
    useMasteryStore.getState().setMark('bank-a', 'q1', 'known');
    useMasteryStore.getState().setMark('bank-b', 'q1', 'unknown');

    expect(useMasteryStore.getState().getMark('bank-a', 'q1')).toBe('known');
    expect(useMasteryStore.getState().getMark('bank-b', 'q1')).toBe('unknown');
  });

  it('清空一个题库的全部标记后，空的命名空间被回收', () => {
    useMasteryStore.getState().setMark('bank-a', 'q1', 'known');
    useMasteryStore.getState().setMark('bank-a', 'q2', 'fuzzy');
    useMasteryStore.getState().setMark('bank-b', 'q1', 'known');

    useMasteryStore.getState().setMark('bank-a', 'q1', null);
    useMasteryStore.getState().setMark('bank-a', 'q2', null);

    const marks = useMasteryStore.getState().marks;
    expect(marks['bank-a']).toBeUndefined();
    expect(marks['bank-b']).toBeDefined();
  });

  it('状态变更异步落盘，可从 AsyncStorage 恢复', async () => {
    useMasteryStore.getState().setMark('bank-a', 'q1', 'fuzzy');
    await flushPersist();

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();

    useMasteryStore.setState({ ...INITIAL });
    await useMasteryStore.getState().load();
    expect(useMasteryStore.getState().getMark('bank-a', 'q1')).toBe('fuzzy');
  });

  it('持久化数据损坏或含非法值时按条目丢弃，不整体崩溃', async () => {
    const broken = JSON.stringify({
      marks: {
        'bank-a': { q1: 'known', q2: 'hacked', q3: '' },
        '': { q9: 'known' },
        'bank-b': 'not-a-record',
      },
    });
    await AsyncStorage.setItem(STORAGE_KEY, broken);

    await useMasteryStore.getState().load();
    const state = useMasteryStore.getState();
    expect(state.getMark('bank-a', 'q1')).toBe('known');
    expect(state.getMark('bank-a', 'q2')).toBeNull();
    expect(state.getMark('bank-a', 'q3')).toBeNull();
    expect(state.getMark('bank-b', 'q9')).toBeNull();
  });

  it('持久化内容不是合法 JSON 时保持内存默认值', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{not-json');
    await useMasteryStore.getState().load();
    expect(useMasteryStore.getState().marks).toEqual({});
  });

  it('Mastery 三态取值 closed set', () => {
    const all: Mastery[] = ['unknown', 'fuzzy', 'known'];
    expect(all).toHaveLength(3);
  });
});
