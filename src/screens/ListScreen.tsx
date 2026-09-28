import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookOpen, CheckCircle2, ChevronRight, FileText, Search, X } from 'lucide-react-native';
import type { Question } from '../question-bank';
import { questionBankRepository } from '../question-bank';
import type { HomeStackParamList } from '../navigation/AppNavigator';
import { EmptyState } from '../components/ui';
import { colors, difficultyStyles, radii, spacing, typography } from '../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'List'>;
type ListRoute = RouteProp<HomeStackParamList, 'List'>;
const DIFFICULTY = difficultyStyles;

export function ListScreen() {
  const route = useRoute<ListRoute>();
  const nav = useNavigation<Nav>();
  const tagId = route.params.tagId;
  const categoryId = route.params.categoryId;
  const tagName = route.params.categoryName ?? route.params.tagName ?? '题目';
  const [keyword, setKeyword] = useState('');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | undefined>();
  const [items, setItems] = useState<Question[]>([]);
  // §6.2 正文命中：标题/标签即时匹配之外，再用安装期语料搜正文。
  // 注意：正文命中的题**不在** titleMatches 里，元数据必须单独取，不能拿 items 反查。
  const [bodyOnlyItems, setBodyOnlyItems] = useState<
    { question: Question; snippet: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const titleMatches = await questionBankRepository.listQuestions({
        tagId,
        categoryId,
        difficulty,
        query: keyword,
      });
      setItems(titleMatches);

      const trimmed = keyword.trim();
      if (!trimmed) {
        setBodyOnlyItems([]);
        return;
      }
      // 正文命中：只保留「标题没命中」的题，避免同一题出现两次
      const titleIds = new Set(titleMatches.map((question) => question.id));
      const hits = await questionBankRepository.searchBody(trimmed);
      const resolved = await Promise.all(
        hits
          .filter((hit) => !titleIds.has(hit.id))
          .map(async (hit) => {
            const question = await questionBankRepository.getQuestion(hit.id);
            return question ? { question, snippet: hit.snippet } : null;
          }),
      );
      setBodyOnlyItems(
        resolved.filter((entry): entry is { question: Question; snippet: string | null } => entry !== null),
      );
    } catch (loadError) {
      setItems([]);
      setBodyOnlyItems([]);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [categoryId, difficulty, keyword, tagId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 160);
    return () => clearTimeout(timer);
  }, [load]);

  const hasFilters = Boolean(keyword || difficulty !== undefined);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={20} color={colors.textMuted} strokeWidth={1.8} />
          <TextInput
            style={styles.input}
            placeholder={`搜索${tagName}题目`}
            placeholderTextColor={colors.textSubtle}
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
            autoCapitalize="none"
            accessibilityLabel="搜索题目"
          />
          {keyword ? (
            <Pressable accessibilityRole="button" accessibilityLabel="清除搜索关键词" hitSlop={8} onPress={() => setKeyword('')} style={styles.clearButton}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterHeader}>
          <Text style={styles.filterLabel}>难度</Text>
          <Text style={styles.resultCount}>{loading ? '正在查找' : `${items.length} 道题`}</Text>
        </View>
        <View style={styles.diffRow} accessibilityRole="radiogroup">
          {[1, 2, 3].map((level) => {
            const selected = difficulty === level;
            const config = DIFFICULTY[level as keyof typeof DIFFICULTY];
            return (
              <Pressable
                key={level}
                accessibilityRole="radio"
                accessibilityLabel={`${config.label}难度`}
                accessibilityState={{ selected }}
                onPress={() => setDifficulty(selected ? undefined : (level as 1 | 2 | 3))}
                style={({ pressed }) => [styles.chip, selected && { borderBottomColor: colors.primary, borderBottomWidth: 2 }, pressed && styles.pressed]}
              >
                <Text style={[styles.chipText, selected && { color: config.text }]}>{config.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>正在查找题目</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          ListFooterComponent={
            bodyOnlyItems.length > 0 ? (
              <View style={styles.bodySection}>
                <Text style={styles.bodySectionTitle}>正文命中 {bodyOnlyItems.length} 题</Text>
                {bodyOnlyItems.map(({ question, snippet }) => (
                  <Pressable
                    key={question.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${question.title}，正文命中`}
                    onPress={() => nav.push('Detail', { id: question.id, meta: question })}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <View style={styles.rowIcon}><FileText size={21} color={colors.textMuted} strokeWidth={1.8} /></View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={2}>{question.title}</Text>
                      {snippet ? <Text style={styles.snippet} numberOfLines={2}>…{snippet}…</Text> : null}
                      <View style={styles.badges}>
                        <View style={styles.bodyBadge}><Text style={styles.bodyBadgeText}>正文命中</Text></View>
                      </View>
                    </View>
                    <ChevronRight size={20} color={colors.textSubtle} strokeWidth={1.8} />
                  </Pressable>
                ))}
              </View>
            ) : null
          }
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const config = DIFFICULTY[item.difficulty];
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}，${config.label}${item.hasAnswer ? '，有参考答案' : ''}`}
                onPress={() => nav.push('Detail', {
                  id: item.id,
                  meta: item,
                  queue: items.map((question) => question.id),
                  queueIndex: items.findIndex((question) => question.id === item.id),
                  mode: 'practice',
                })}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.rowIcon}><BookOpen size={21} color={colors.primary} strokeWidth={1.8} /></View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.badges}>
                    <View style={[styles.badge, { backgroundColor: config.background }]}><Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text></View>
                    {item.hasAnswer ? <View style={styles.answerBadge}><CheckCircle2 size={14} color={colors.primary} strokeWidth={2} /><Text style={styles.answerBadgeText}>有答案</Text></View> : null}
                  </View>
                </View>
                <ChevronRight size={20} color={colors.textSubtle} strokeWidth={1.8} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title={error ? '题目加载失败' : '没有找到匹配题目'}
              description={error ?? (hasFilters ? '换一个关键词，或清除难度筛选后再试。' : '这个分类暂时还没有题目。')}
              actionLabel={error ? '重新加载' : hasFilters ? '清除筛选' : undefined}
              onAction={error ? () => void load() : hasFilters ? () => { setKeyword(''); setDifficulty(undefined); } : undefined}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  toolbar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.background },
  searchBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { ...typography.body, color: colors.text, flex: 1, paddingVertical: spacing.sm, fontSize: 14 },
  clearButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  bodySection: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  bodySectionTitle: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm },
  snippet: { ...typography.caption, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  bodyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle },
  bodyBadgeText: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  filterLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  resultCount: { ...typography.caption, color: colors.textSubtle },
  diffRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1, paddingTop: spacing.xs },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 15, lineHeight: 21 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.sm },
  badgeText: { ...typography.caption, fontWeight: '700', fontSize: 11 },
  answerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  answerBadgeText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', fontSize: 11 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...typography.body, color: colors.textMuted },
  pressed: { opacity: 0.72 },
});
