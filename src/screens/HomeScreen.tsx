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
  Code2,
  Database,
  Layers3,
  Network,
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
import { EmptyState, SectionHeading } from '../components/ui';
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
          <View>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>FACEE · 离线题库</Text>
              <Text style={styles.heroTitle}>今天想练什么？</Text>
              <Text style={styles.heroCopy}>
                {hasCategories
                  ? '按分类进入题库，搜索重点问题，并在答案中继续追问。'
                  : '按领域进入题库，搜索重点问题，并在答案中继续追问。'}
              </Text>
            </View>

            {lastViewedId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`继续上次阅读，题目 ${lastViewedId}`}
                onPress={() => nav.push('Detail', { id: lastViewedId })}
                style={({ pressed }) => [styles.resumeCard, pressed && styles.pressed]}
              >
                <View style={styles.resumeIcon}>
                  <ArrowRight size={20} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.resumeCopy}>
                  <Text style={styles.resumeLabel}>继续上次</Text>
                  <Text style={styles.resumeTitle} numberOfLines={1}>
                    返回题目 {lastViewedId}
                  </Text>
                </View>
                <ArrowRight size={20} color={colors.textMuted} strokeWidth={1.8} />
              </Pressable>
            ) : null}

            <SectionHeading
              title={hasCategories ? '选择学习分类' : '选择学习领域'}
              subtitle={
                hasCategories
                  ? `${categories.length} 个分类 · 内容来自本机题库`
                  : `${roots.length} 个领域 · 内容来自本机题库`
              }
            />
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
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardIcon}>
                <Icon size={24} color={colors.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardCount}>{count} 道题</Text>
                <ArrowRight size={16} color={colors.textMuted} strokeWidth={1.8} />
              </View>
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
  hero: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  eyebrow: { ...typography.caption, color: colors.primary, fontWeight: '700', letterSpacing: 0.8 },
  heroTitle: { ...typography.display, color: colors.text, marginTop: spacing.sm },
  heroCopy: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm, maxWidth: 520 },
  resumeCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resumeIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  resumeCopy: { flex: 1 },
  resumeLabel: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  resumeTitle: { ...typography.bodyStrong, color: colors.text },
  card: { flex: 1, minHeight: 76, flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.md },
  cardIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.text, flex: 1 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardCount: { ...typography.caption, color: colors.textMuted },
  pressed: { opacity: 0.72 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl },
  loadingTitle: { ...typography.heading, color: colors.text, marginTop: spacing.lg },
  loadingCopy: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
});
