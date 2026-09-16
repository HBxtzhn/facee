import { describe, it, expect, beforeEach } from '@jest/globals';
import { useFavoritesStore } from './favoritesStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('favoritesStore', () => {
  beforeEach(() => {
    (AsyncStorage as any).clear();
    useFavoritesStore.setState({ ids: [] });
  });

  it('load 空持久化返回空数组', async () => {
    await useFavoritesStore.getState().load();
    expect(useFavoritesStore.getState().ids).toEqual([]);
  });

  it('toggle 加入新收藏并持久化', async () => {
    await useFavoritesStore.getState().toggle('q1');
    expect(useFavoritesStore.getState().ids).toEqual(['q1']);
    expect(useFavoritesStore.getState().has('q1')).toBe(true);

    const raw = await AsyncStorage.getItem('facee-favorites');
    expect(JSON.parse(raw ?? '[]')).toContain('q1');
  });

  it('toggle 已有则移除', async () => {
    await useFavoritesStore.getState().toggle('q1');
    await useFavoritesStore.getState().toggle('q2');
    expect(useFavoritesStore.getState().ids).toEqual(['q1', 'q2']);

    await useFavoritesStore.getState().toggle('q1');
    expect(useFavoritesStore.getState().ids).toEqual(['q2']);
    expect(useFavoritesStore.getState().has('q1')).toBe(false);
  });

  it('load 从持久化恢复', async () => {
    await AsyncStorage.setItem(
      'facee-favorites',
      JSON.stringify(['qx', 'qy']),
    );
    await useFavoritesStore.getState().load();
    expect(useFavoritesStore.getState().ids).toEqual(['qx', 'qy']);
  });
});