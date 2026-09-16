// 收藏 list store (AsyncStorage 持久化)
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'facee-favorites';

interface FavoritesState {
  ids: string[];
  load: () => Promise<void>;
  toggle: (id: string) => Promise<void>;
  has: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: [],
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      set({ ids: raw ? JSON.parse(raw) : [] });
    } catch {
      /* ignore */
    }
  },
  toggle: async (id: string) => {
    const cur = get().ids;
    const next = cur.includes(id)
      ? cur.filter((x) => x !== id)
      : [...cur, id];
    set({ ids: next });
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  },
  has: (id: string) => get().ids.includes(id),
}));