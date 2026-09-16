import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bookmark, BookOpen, ChevronRight } from 'lucide-react-native';
import { questionBankRepository, type Question } from '../question-bank';
import { useFavoritesStore } from '../store/favoritesStore';
import type { MainTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import { EmptyState } from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Favorites'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const DIFFICULTY_LABEL: Record<number, string> = { 1: '简单', 2: '中等', 3: '困难' };

export function FavoritesScreen() {
  const loadFavorites = useFavoritesStore((state) => state.load);
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<Question[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoaded(false);
    await loadFavorites();
    const [all, ids] = await Promise.all([
      questionBankRepository.listQuestions(),
      Promise.resolve(useFavoritesStore.getState().ids),
    ]);
    const byId = new Map(all.map((question) => [question.id, question]));
    setItems(ids.map((id) => byId.get(id)).filter((question): question is Question => Boolean(question)));
    setLoaded(true);
  }, [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load().then(() => { if (!active) setItems([]); });
      return () => { active = false; };
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>稍后复习</Text>
        <Text style={styles.title}>我的收藏</Text>
        <Text style={styles.subtitle}>{items.length > 0 ? `已保存 ${items.length} 道题` : '把重点题目留在这里集中复习'}</Text>
      </View>

      {!loaded ? (
        <View style={styles.loadingState}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>正在读取收藏</Text></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}，${DIFFICULTY_LABEL[item.difficulty] ?? '未知难度'}`} onPress={() => nav.navigate('Detail', { id: item.id, meta: item })} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowIcon}><BookOpen size={21} color={colors.primary} strokeWidth={1.8} /></View>
              <View style={styles.rowBody}><Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.rowMeta}>{DIFFICULTY_LABEL[item.difficulty] ?? '未知难度'} · 点击继续复习</Text></View>
              <ChevronRight size={20} color={colors.textSubtle} strokeWidth={1.8} />
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState title="还没有收藏题目" description="阅读题目时点击“收藏”，重点内容就会出现在这里。" actionLabel="去题库选题" onAction={() => nav.navigate('HomeTab')} icon={Bookmark} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  eyebrow: { ...typography.caption, color: colors.primary, fontWeight: '700', letterSpacing: 0.8 },
  title: { ...typography.display, color: colors.text, marginTop: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  row: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowTitle: { ...typography.bodyStrong, color: colors.text },
  rowMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...typography.body, color: colors.textMuted },
  pressed: { opacity: 0.72 },
});
