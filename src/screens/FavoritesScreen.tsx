import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bookmark, ChevronRight } from 'lucide-react-native';
import { questionBankRepository, type Question } from '../question-bank';
import { useFavoritesStore } from '../store/favoritesStore';
import type { MainTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import { DifficultyBadge, EmptyState, TabHeader } from '../components/ui';
import { SkeletonBlock } from '../components/skeleton';
import { cardChrome, colors, pressedScale, radii, spacing, typography } from '../theme';

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
        <TabHeader
          eyebrow="稍后复习 · 收藏夹"
          title="我的收藏"
          subtitle="集中巩固重点与错题，支持全离线翻阅。"
          action={items.length > 0 ? (
            <View style={styles.headerMetaPill}>
              <Bookmark size={12} color={colors.textSecondary} strokeWidth={2.2} />
              <Text style={styles.headerMetaPillText}>{items.length} 题</Text>
            </View>
          ) : null}
        />
      </View>

      {!loaded ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((row) => (
            <SkeletonBlock
              key={row}
              width="100%"
              height={88}
              radius={radii.md}
              style={{ marginBottom: spacing.md }}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}，${DIFFICULTY_LABEL[item.difficulty] ?? '未知难度'}`}
                onPress={() => nav.navigate('Detail', { id: item.id, meta: item })}
                style={({ pressed }) => [styles.rowCard, pressed && styles.cardPressed]}
              >
                <View style={styles.cardMain}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <DifficultyBadge difficulty={item.difficulty as 1 | 2 | 3} />
                    <Text style={styles.tagText}>{item.tags?.[0]?.name ?? '通用'}</Text>
                  </View>
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceWarm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerMetaPillText: { ...typography.caption, color: colors.textMuted, fontWeight: '600', fontSize: 11 },
  skeletonList: { paddingHorizontal: spacing.lg, flexGrow: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1, paddingTop: spacing.sm },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    ...cardChrome,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardPressed: { ...pressedScale },
  cardMain: { flex: 1, marginRight: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  tagText: { ...typography.caption, color: colors.textSubtle, fontSize: 11 },
  cardTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 14, lineHeight: 20 },
});

