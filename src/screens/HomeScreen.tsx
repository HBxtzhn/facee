import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronRight,
  Code2,
  Database,
  Layers3,
  Network,
  Play,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import type { HomeStackParamList } from '../navigation/AppNavigator';
import {
  buildCategorySummaries,
  collectTagSubtreeIds,
  questionBankRepository,
  type QuestionBankCatalog,
  type QuestionTag,
} from '../question-bank';
import { useUserStore } from '../store/userStore';
import { EmptyState } from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

interface TagItem extends QuestionTag {
  questionCount: number;
}

interface CategoryItem {
  id: string;
  name: string;
  questionCount: number;
  kind: 'category';
}

interface DomainItem extends TagItem {
  kind: 'tag';
}

type HomeEntry = CategoryItem | DomainItem;

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  java: Code2,
  database: Database,
  middleware: Layers3,
  architecture: Network,
  ai: Sparkles,
  projects: BriefcaseBusiness,
};

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const lastViewedId = useUserStore((state) => state.lastViewedQuestionId);
  const totalCount = useUserStore((state) => state.totalCount);
  const [roots, setRoots] = useState<TagItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const catalog = await questionBankRepository.getCatalog();
      if (!catalog) throw new Error('本机还没有安装题库');
      setCategories(buildCategorySummaries(catalog).map((item) => ({ ...item, kind: 'category' as const })));
      setRoots(buildRootTags(catalog));
    } catch (loadError) {
      setRoots([]);
      setCategories([]);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load(true);
    }, [load]),
  );

  // 有分类就用分类（§5.1）；旧格式题库没有分类，回退到标签领域，行为不回归。
  const hasCategories = categories.length > 0;
  const entries: HomeEntry[] = hasCategories
    ? categories
    : roots.map((tag) => ({ ...tag, kind: 'tag' as const }));

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingTitle}>正在读取本地题库</Text>
        <Text style={styles.loadingCopy}>题目内容保存在你的设备上</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        numColumns={1}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            {/* 顶栏品牌与状态轻指示 */}
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <Sparkles size={13} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.brandBadgeText}>FACEE</Text>
              </View>
              {totalCount > 0 ? (
                <View style={styles.historyPill}>
                  <Text style={styles.historyPillText}>已刷 {totalCount} 题</Text>
                </View>
              ) : null}
            </View>

            {/* 更加克制柔和的欢迎标题 */}
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>今天想练什么？</Text>
              <Text style={styles.heroCopy}>
                精选题库沉浸练习，随时查看思路并继续追问。
              </Text>
            </View>

            {/* 强化但不过度臃肿的“继续上次”快捷卡片 */}
            {lastViewedId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`继续上次练习，题目 ${lastViewedId}`}
                onPress={() => nav.push('Detail', { id: lastViewedId })}
                style={({ pressed }) => [styles.resumeCard, pressed && styles.pressed]}
              >
                <View style={styles.resumeIconWrap}>
                  <Play size={16} color={colors.primary} fill={colors.primary} />
                </View>
                <View style={styles.resumeCopy}>
                  <Text style={styles.resumeLabel}>继续上次练习</Text>
                  <Text style={styles.resumeTitle} numberOfLines={1}>
                    {lastViewedId}
                  </Text>
                </View>
                <View style={styles.resumeAction}>
                  <Text style={styles.resumeActionText}>进入</Text>
                  <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />
                </View>
              </Pressable>
            ) : null}

            {/* 分类标题与数量摘要 */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {hasCategories ? '知识体系分类' : '知识领域'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {hasCategories ? `共 ${categories.length} 个大类` : `共 ${roots.length} 个领域`}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const Icon = CATEGORY_ICONS[item.id] ?? Layers3;
          const count = item.questionCount;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}，${count} 道题`}
              onPress={() =>
                item.kind === 'category'
                  ? nav.push('List', { categoryId: item.id, categoryName: item.name })
                  : nav.push('List', { tagId: item.id, tagName: item.name })
              }
              style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}
            >
              <View style={styles.categoryIconBox}>
                <Icon size={20} color={colors.primary} strokeWidth={1.9} />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{item.name}</Text>
                <Text style={styles.categoryCount}>{count} 道核心题</Text>
              </View>
              <ChevronRight size={18} color={colors.textSubtle} strokeWidth={1.8} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title={error ? '无法读取本地题库' : '题库里还没有分类'}
            description={error ?? '重新安装一个有效的题库包后即可开始学习。'}
            actionLabel="重新读取"
            onAction={() => void load()}
          />
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

export function buildRootTags(catalog: QuestionBankCatalog): TagItem[] {
  return catalog.tags
    .filter((tag) => tag.parentId === null)
    .sort((left, right) => left.sort - right.sort || left.id.localeCompare(right.id))
    .map((tag) => {
      const ids = collectTagSubtreeIds(catalog.tags, tag.id);
      return {
        ...tag,
        questionCount: catalog.questions.filter((question) =>
          question.tags.some((questionTag) => ids.has(questionTag.id)),
        ).length,
      };
    });
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  headerWrapper: { paddingTop: spacing.md, paddingBottom: spacing.md },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  brandBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  historyPill: {
    backgroundColor: colors.surfaceWarm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyPillText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 11,
  },
  heroSection: {
    marginBottom: spacing.lg,
  },
  heroTitle: {
    ...typography.display,
    color: colors.text,
    fontSize: 26,
    lineHeight: 34,
  },
  heroCopy: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  resumeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  resumeCopy: { flex: 1 },
  resumeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
  },
  resumeTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    marginTop: 2,
    fontSize: 14,
  },
  resumeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  resumeActionText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    fontSize: 16,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 15,
  },
  categoryCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  pressed: { opacity: 0.72 },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingTitle: { ...typography.heading, color: colors.text, marginTop: spacing.lg },
  loadingCopy: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
});

