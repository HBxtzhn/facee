import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bookmark, ChevronRight } from 'lucide-react-native';
import { questionBankRepository, type Question } from '../question-bank';
import { useFavoritesStore } from '../store/favoritesStore';
import type { MainTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import { EmptyState } from '../components/ui';
import { colors, difficultyStyles, radii, spacing, typography } from '../theme';

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
        <View style={styles.headerTop}>
          <Text style={styles.eyebrow}>稍后复习 · 收藏夹</Text>
          {items.length > 0 ? (
            <View style={styles.countBadge}>
              <Bookmark size={12} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.countBadgeText}>{items.length} 题</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title}>我的收藏</Text>
        <Text style={styles.subtitle}>集中巩固重点与错题，支持全离线翻阅。</Text>
      </View>

      {!loaded ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>正在读取收藏</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const diff = difficultyStyles[item.difficulty as 1 | 2 | 3] ?? difficultyStyles[1];
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}，${DIFFICULTY_LABEL[item.difficulty] ?? '未知难度'}`}
                onPress={() => nav.navigate('Detail', { id: item.id, meta: item })}
                style={({ pressed }) => [styles.rowCard, pressed && styles.cardPressed]}
              >
                <View style={styles.cardMain}>
                  <View style={styles.metaRow}>
                    <View style={[styles.diffTag, { backgroundColor: diff.background }]}>
                      <Text style={[styles.diffTagText, { color: diff.text }]}>{diff.label}</Text>
                    </View>
                    <Text style={styles.tagText}>{item.tags?.[0]?.name ?? '通用'}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textSubtle} strokeWidth={1.8} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="还没有收藏题目"
              description="刷题过程中遇到好题或难题，点击右上角“收藏”即可随时在此复习。"
              actionLabel="去题库逛逛"
              onAction={() => nav.navigate('HomeTab')}
              icon={Bookmark}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { ...typography.caption, color: colors.textSecondary, fontWeight: '700', letterSpacing: 0.5, fontSize: 11 },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  countBadgeText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  title: { ...typography.display, color: colors.text, marginTop: 4, fontSize: 26 },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 4, fontSize: 13 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1, paddingTop: spacing.sm },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardPressed: { opacity: 0.72, backgroundColor: colors.surfaceSubtle },
  cardMain: { flex: 1, marginRight: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  diffTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.xs,
  },
  diffTagText: { fontSize: 11, fontWeight: '600' },
  tagText: { ...typography.caption, color: colors.textSubtle, fontSize: 11 },
  cardTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 14, lineHeight: 20 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...typography.body, color: colors.textMuted },
});

