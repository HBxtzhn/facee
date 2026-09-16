import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FolderTree,
  GripVertical,
  HelpCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import type { Question } from '../question-bank';
import { parseFollowups } from '../question-bank/followups';
import { questionBankRepository, resolveQuestionAssetMarkdown } from '../question-bank';
import markdownit, { isExternalHref, parseQuestionHref } from '../lib/markdown';
import { findCategoryName } from '../question-bank/catalog';
import { useQuestionBankStore } from '../question-bank/store';
import {
  FullscreenImageModal,
  ImageViewerProvider,
  useImageViewer,
} from '../components/image-viewer';
import type { HomeStackParamList } from '../navigation/AppNavigator';
import { useUserStore } from '../store/userStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { AppButton, EmptyState, Surface } from '../components/ui';
import { colors, difficultyStyles, radii, spacing, typography } from '../theme';
import { splitAnswerSections, type AnswerSection } from './detail-content';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Detail'>;
type DetailRoute = RouteProp<HomeStackParamList, 'Detail'>;
const DIFFICULTY = difficultyStyles;
const DOCK_WIDTH = 272;
const DOCK_HEIGHT = 64;
const DOCK_OFFSET_KEY = 'facee.practice-dock-offset.v1';

export function DetailScreen() {
  const route = useRoute<DetailRoute>();
  const nav = useNavigation<Nav>();
  const id = route.params.id;
  const queue = route.params.queue;
  const queueIndex = route.params.queueIndex ?? queue?.indexOf(id) ?? -1;
  const practiceMode = route.params.mode === 'practice' || (queue?.length ?? 0) > 1;
  const recordView = useUserStore((state) => state.recordView);
  const answerExpandedByDefault = useUserStore((state) => state.answerExpandedByDefault);
  const loadFavorites = useFavoritesStore((state) => state.load);
  const toggleFavoriteStore = useFavoritesStore((state) => state.toggle);
  const [meta, setMeta] = useState<Question | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  // 面试官追问来自 followups.md（题库规范 §9）；答案内嵌的「面试官追问」分节仍兼容。
  const [followupsMd, setFollowupsMd] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt?: string } | null>(null);
  const openImageViewer = useCallback((src: string, alt?: string) => setPreviewImage({ src, alt }), []);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!practiceMode) return undefined;
      const parent = nav.getParent();
      const tabNavigator = parent?.getParent?.() ?? parent;
      tabNavigator?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => tabNavigator?.setOptions({ tabBarStyle: undefined });
    }, [nav, practiceMode]),
  );

  useEffect(() => {
    void loadFavorites().then(() => setFavorited(useFavoritesStore.getState().has(id)));
  }, [id, loadFavorites]);

  const loadQuestion = useCallback(async () => {
    setLoadingQuestion(true);
    setError(null);
    // 设置项决定新题的默认展开态；用户在单题上的手动切换不会被写回设置。
    setShowAnswer(answerExpandedByDefault);
    try {
      const questionMeta = route.params.meta ?? await questionBankRepository.getQuestion(id);
      if (!questionMeta) throw new Error('没有找到这道题目的元数据');
      const content = await questionBankRepository.getContent(id);
      if (!content) throw new Error('这道题目的本地内容不完整，请重新安装题库');
      setMeta(questionMeta);
      setQuestion(resolveQuestionAssetMarkdown(content.questionMd, content.assetBaseUri));
      setAnswer(content.answerMd === null ? null : resolveQuestionAssetMarkdown(content.answerMd, content.assetBaseUri));
      setFollowupsMd(content.followupsMd ? resolveQuestionAssetMarkdown(content.followupsMd, content.assetBaseUri) : null);
      recordView(id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoadingQuestion(false);
    }
  }, [id, recordView, route.params.meta, answerExpandedByDefault]);

  useEffect(() => {
    void loadQuestion();
  }, [loadQuestion]);

  async function toggleFavorite() {
    await toggleFavoriteStore(id);
    setFavorited(useFavoritesStore.getState().has(id));
  }

  function moveInQueue(offset: number) {
    if (!queue || queueIndex < 0) return;
    const nextIndex = queueIndex + offset;
    const nextId = queue[nextIndex];
    if (!nextId) return;
    nav.replace('Detail', { id: nextId, queue, queueIndex: nextIndex, mode: 'practice' });
  }

  const difficulty = meta ? DIFFICULTY[meta.difficulty] : null;
  const questionBody = stripLeadingHeading(question, meta?.title);
  const answerSections = useMemo(() => splitAnswerSections(stripLeadingHeading(answer ?? '', '参考答案')), [answer]);
  // 所属分类（§7.1）：题库规范 v1 提供 categories 时才有值。
  const catalog = useQuestionBankStore((state) => state.catalog);
  const categoryName = meta ? findCategoryName(catalog, meta.categoryId) : null;
  const followUpItems = useMemo(() => {
    const fromFile = parseFollowups(followupsMd ?? '').map((item) => ({ title: item.question, body: item.answer }));
    return [...answerSections.followUps, ...fromFile];
  }, [followupsMd, answerSections.followUps]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((event: any) => {
    if (!practiceMode) return;
    const { pageX, pageY } = event.nativeEvent;
    touchStart.current = { x: pageX, y: pageY };
  }, [practiceMode]);

  const handleTouchEnd = useCallback((event: any) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!practiceMode || !start) return;
    const { pageX, pageY } = event.nativeEvent;
    const dx = pageX - start.x;
    const dy = pageY - start.y;
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    moveInQueue(dx < 0 ? 1 : -1);
  }, [practiceMode, queue, queueIndex]);

  if (loadingQuestion) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingTitle}>正在打开题目</Text>
        <Text style={styles.loadingCopy}>正在读取本地内容</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorState}>
        <EmptyState title="题目加载失败" description={error} actionLabel="重新加载" onAction={() => void loadQuestion()} icon={RotateCcw} />
      </View>
    );
  }

  return (
    <ImageViewerProvider value={openImageViewer}>
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, practiceMode && styles.practiceContent]}
        contentInsetAdjustmentBehavior="automatic"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {difficulty ? <View style={[styles.difficultyBadge, { backgroundColor: difficulty.background }]}><Text style={[styles.difficultyText, { color: difficulty.text }]}>{difficulty.label}</Text></View> : null}
            {categoryName ? <View style={styles.categoryBadge}><FolderTree size={13} color={colors.textMuted} strokeWidth={2} /><Text style={styles.categoryText}>{categoryName}</Text></View> : null}
            <Text style={styles.questionId}>{id}</Text>
          </View>
          <Text style={styles.title}>{meta?.title ?? id}</Text>
          <View style={styles.metaRow}>
            <View style={styles.tags}>{meta?.tags.map((tag) => <View key={tag.id} style={styles.tag}><Text style={styles.tagText}>{tag.name}</Text></View>)}</View>
            <Pressable accessibilityRole="button" accessibilityLabel={favorited ? '取消收藏这道题' : '收藏这道题'} accessibilityState={{ selected: favorited }} onPress={() => void toggleFavorite()} style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}>
              <Bookmark size={19} color={favorited ? colors.accent : colors.textMuted} fill={favorited ? colors.surfaceWarm : 'none'} strokeWidth={2} />
              <Text style={[styles.favoriteText, favorited && styles.favoriteTextActive]}>{favorited ? '已收藏' : '收藏'}</Text>
            </Pressable>
          </View>
        </View>

        <Surface style={styles.questionCard}>
          <View style={styles.cardHeading}><View style={styles.cardHeadingIcon}><Eye size={18} color={colors.primary} strokeWidth={1.8} /></View><Text style={styles.cardHeadingText}>题目</Text></View>
          <Markdown markdownit={markdownit} style={markdownStyles} rules={{ link: renderLink(nav), image: renderImage }}>{questionBody}</Markdown>
        </Surface>

        {!practiceMode && meta?.hasAnswer && answer !== null && !showAnswer ? <AppButton label="查看参考答案" icon={Eye} onPress={() => setShowAnswer(true)} accessibilityHint="显示已经安装在本机的参考答案" style={styles.answerButton} /> : null}

        {showAnswer && answer !== null ? (
          <Surface style={styles.answerBox}>
            <View style={styles.answerHeading}><View style={styles.answerIcon}><Sparkles size={20} color={colors.primary} strokeWidth={1.8} /></View><Text style={styles.answerTitle}>参考答案</Text></View>
            <Markdown markdownit={markdownit} style={markdownStyles} rules={{ link: renderLink(nav), image: renderImage }}>{answerSections.main}</Markdown>
            {followUpItems.length > 0 ? (
              <View style={styles.followUpSection}>
                <View style={styles.followUpHeadingRow}>
                  <View style={styles.followUpHeadingIcon}><HelpCircle size={18} color={colors.accent} strokeWidth={1.9} /></View>
                  <Text style={styles.followUpHeading}>面试官追问</Text>
                  <Text style={styles.followUpCount}>{followUpItems.length} 条</Text>
                </View>
                {followUpItems.map((followUp, index) => <FollowUpItem key={`${followUp.title}-${index}`} section={followUp} />)}
              </View>
            ) : null}
          </Surface>
        ) : null}

        {!practiceMode && queue && queue.length > 1 && queueIndex >= 0 ? (
          <View style={styles.queueNavigation}>
            <Text style={styles.queueProgress}>连续刷题 · {queueIndex + 1} / {queue.length}</Text>
            <View style={styles.queueButtons}>
              <AppButton label="上一题" variant="secondary" disabled={queueIndex === 0} onPress={() => moveInQueue(-1)} style={styles.queueButton} />
              <AppButton label={queueIndex === queue.length - 1 ? '已到末题' : '下一题'} icon={queueIndex === queue.length - 1 ? undefined : ChevronRight} disabled={queueIndex === queue.length - 1} onPress={() => moveInQueue(1)} style={styles.queueButton} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {practiceMode ? (
        <PracticeDock
          progress={queue && queue.length > 1 && queueIndex >= 0 ? `连续刷题 · ${queueIndex + 1} / ${queue.length}` : undefined}
          answerVisible={showAnswer}
          answerAvailable={answer !== null && meta?.hasAnswer === true}
          previousDisabled={queueIndex <= 0}
          nextDisabled={!queue || queueIndex < 0 || queueIndex >= queue.length - 1}
          onPrevious={() => moveInQueue(-1)}
          onNext={() => moveInQueue(1)}
          onToggleAnswer={() => setShowAnswer((visible) => !visible)}
          onBack={() => (nav.canGoBack() ? nav.goBack() : nav.popToTop())}
        />
      ) : null}

      <FullscreenImageModal preview={previewImage} onClose={() => setPreviewImage(null)} />
    </View>
    </ImageViewerProvider>
  );
}

function FollowUpItem({ section }: { section: AnswerSection }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.followUpItem}>
      <Pressable accessibilityRole="button" accessibilityLabel={section.title} accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={({ pressed }) => [styles.followUpToggle, pressed && styles.pressed]}>
        <Text style={styles.followUpTitle}>{section.title}</Text>
        <ChevronDown size={18} color={colors.textMuted} style={expanded ? styles.chevronExpanded : undefined} />
      </Pressable>
      {expanded ? <Markdown markdownit={markdownit} style={markdownStyles} rules={{ image: renderImage }}>{section.body}</Markdown> : null}
    </View>
  );
}

function PracticeDock({
  progress,
  answerVisible,
  answerAvailable,
  previousDisabled,
  nextDisabled,
  onPrevious,
  onNext,
  onToggleAnswer,
  onBack,
}: {
  progress?: string;
  answerVisible: boolean;
  answerAvailable: boolean;
  previousDisabled: boolean;
  nextDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggleAnswer: () => void;
  onBack: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const dockPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragEnabledRef = useRef(false);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const insetsBottom = insets.bottom;

  const bounds = useMemo(() => {
    const baseX = width - 16 - DOCK_WIDTH;
    const baseY = height - insetsBottom - 16 - DOCK_HEIGHT;
    return { minX: 8 - baseX, maxX: width - DOCK_WIDTH - 8 - baseX, minY: 8 - baseY, maxY: height - DOCK_HEIGHT - 8 - baseY };
  }, [height, insetsBottom, width]);

  const clamp = useCallback((value: { x: number; y: number }) => ({
    x: Math.min(bounds.maxX, Math.max(bounds.minX, value.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, value.y)),
  }), [bounds]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(DOCK_OFFSET_KEY).then((raw) => {
      if (!active || !raw) return;
      try {
        const saved = clamp(JSON.parse(raw));
        offsetRef.current = saved;
        dockPosition.setValue(saved);
      } catch {
        // Ignore malformed preferences and use the default bottom position.
      }
    });
    return () => { active = false; };
  }, [clamp, dockPosition]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => dragEnabledRef.current,
    onMoveShouldSetPanResponder: () => dragEnabledRef.current,
    onPanResponderGrant: () => { dragStartRef.current = offsetRef.current; },
    onPanResponderMove: (_event, gesture) => { dockPosition.setValue(clamp({ x: dragStartRef.current.x + gesture.dx, y: dragStartRef.current.y + gesture.dy })); },
    onPanResponderRelease: (_event, gesture) => {
      const next = clamp({ x: dragStartRef.current.x + gesture.dx, y: dragStartRef.current.y + gesture.dy });
      offsetRef.current = next;
      dockPosition.setValue(next);
      void AsyncStorage.setItem(DOCK_OFFSET_KEY, JSON.stringify(next));
      dragEnabledRef.current = false;
    },
    onPanResponderTerminate: () => { dragEnabledRef.current = false; dockPosition.setValue(offsetRef.current); },
  }), [clamp, dockPosition]);

  function beginLongPress() {
    dragTimerRef.current = setTimeout(() => { dragEnabledRef.current = true; }, 320);
  }

  function endLongPress() {
    if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    dragTimerRef.current = null;
    if (!dragEnabledRef.current) return;
    dragEnabledRef.current = false;
  }

  return (
    <Animated.View style={[styles.practiceDock, { bottom: insetsBottom + 16 }, dockPosition.getTranslateTransform()]}>
      {progress ? <Text style={styles.practiceProgress}>{progress}</Text> : null}
      <View {...panResponder.panHandlers} onTouchStart={beginLongPress} onTouchEnd={endLongPress} onTouchCancel={endLongPress} accessible accessibilityRole="adjustable" accessibilityLabel="操作栏位置" accessibilityHint="长按后拖动，自定义操作栏位置" style={styles.dragHandle}>
        <GripVertical size={18} color={colors.textSubtle} />
      </View>
      <DockButton icon={ChevronLeft} label="返回" onPress={onBack} />
      <DockButton icon={ChevronLeft} label="上一题" disabled={previousDisabled} onPress={onPrevious} />
      <DockButton icon={answerVisible ? EyeOff : Eye} label={answerVisible ? '收起答案' : '查看答案'} disabled={!answerAvailable} onPress={onToggleAnswer} emphasized />
      <DockButton icon={ChevronRight} label="下一题" disabled={nextDisabled} onPress={onNext} />
    </Animated.View>
  );
}

function DockButton({ icon: Icon, label, onPress, disabled, emphasized }: { icon: React.ComponentType<any>; label: string; onPress: () => void; disabled?: boolean; emphasized?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.dockButton, emphasized && styles.dockButtonEmphasized, disabled && styles.dockButtonDisabled, pressed && styles.pressed]}>
      <Icon size={21} color={disabled ? colors.textSubtle : emphasized ? colors.text : colors.textMuted} strokeWidth={2} />
    </Pressable>
  );
}

/**
 * 图片渲染。
 *
 * 为什么不用库的默认规则（两层原因，两个都会导致「图显示不出来」）：
 *   1. markdown-it 默认拒绝 file: 协议，`![图](file:///...)` 根本不会被解析成图片（见 lib/markdown.ts）；
 *   2. 库默认只白名单 data:image/* 的 src，且默认 handler 为 null ⇒ file:// 直接 return null。
 * 另外它依赖 2019 年的 react-native-fit-image，在新架构下不可靠。
 * 这里直接用原生 Image，并按真实宽高比限高，长图也不会被压扁。
 */
function MarkdownImage({ src, alt, style }: { src: string; alt?: string; style?: any }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const openViewer = useImageViewer();
  const MAX_HEIGHT = 360;

  useEffect(() => {
    let alive = true;
    if (!src) return undefined;
    Image.getSize(
      src,
      (width, height) => {
        if (alive && width > 0 && height > 0) setRatio(width / height);
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [src]);

  const box = ratio
    ? { width: '100%' as const, aspectRatio: ratio, maxHeight: MAX_HEIGHT }
    : { width: '100%' as const, height: MAX_HEIGHT };

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={alt ? `${alt}，点击全屏查看` : '点击全屏查看图片'}
      onPress={() => openViewer(src, alt || undefined)}
    >
      <Image
        source={{ uri: src }}
        style={[style, box]}
        resizeMode="contain"
        accessible={false}
      />
    </Pressable>
  );
}

function renderImage(node: any, _children: any, _parent: any, styles: any) {
  const src: string = node.attributes?.src ?? '';
  const alt: string = node.attributes?.alt ?? '';
  if (!src) return null;
  return <MarkdownImage key={node.key} src={src} alt={alt} style={styles.image} />;
}

function renderLink(nav: Nav) {
  return (node: any, _children: any, _style: any, passProps: any) => {
    const href: string = node.attributes?.href ?? '';
    const label = (node.children ?? []).map((child: any) => child.content ?? '').join('');
    const questionId = parseQuestionHref(href);
    if (questionId) return <Text key={node.key} accessibilityRole="link" style={styles.link} onPress={() => nav.push('Detail', { id: questionId })} {...passProps}>{label}</Text>;
    // 只有外链交给系统浏览器；file: 等本地引用不当链接处理（避免拉起无关应用）
    if (!isExternalHref(href)) return <Text key={node.key} style={styles.link} {...passProps}>{label}</Text>;
    return <Text key={node.key} accessibilityRole="link" style={styles.link} onPress={() => void Linking.openURL(href)} {...passProps}>{label}</Text>;
  };
}

function stripLeadingHeading(markdown: string, expectedTitle?: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const match = normalized.match(/^#\s+(.+)\n+/);
  if (!match || (expectedTitle && match[1].trim() !== expectedTitle.trim())) return normalized;
  return normalized.slice(match[0].length).trimStart();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 48 },
  practiceContent: { paddingBottom: 136 },
  header: { paddingBottom: spacing.xl },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  difficultyBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.sm },
  difficultyText: { ...typography.caption, fontWeight: '700' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.xs, paddingVertical: 3 },
  categoryText: { ...typography.caption, color: colors.textMuted },
  questionId: { ...typography.caption, color: colors.textMuted },
  title: { ...typography.title, color: colors.text, marginTop: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.md },
  tags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.borderStrong },
  tagText: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  favoriteButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  favoriteText: { ...typography.label, color: colors.textMuted },
  favoriteTextActive: { color: colors.accent },
  questionCard: { paddingVertical: spacing.lg },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  cardHeadingIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  cardHeadingText: { ...typography.heading, color: colors.text },
  answerButton: { marginTop: spacing.lg },
  answerBox: { marginTop: spacing.lg, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderStrong },
  answerHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg, marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  answerIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  answerTitle: { ...typography.heading, color: colors.text },
  followUpSection: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  followUpHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  followUpHeadingIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  followUpHeading: { ...typography.heading, color: colors.text, flex: 1 },
  followUpCount: { ...typography.caption, color: colors.textMuted },
  followUpItem: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.primarySoft },
  followUpToggle: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  followUpTitle: { ...typography.bodyStrong, color: colors.text, flex: 1 },
  chevronExpanded: { transform: [{ rotate: '180deg' }] },
  queueNavigation: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  queueProgress: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
  queueButtons: { flexDirection: 'row', gap: spacing.sm },
  queueButton: { flex: 1 },
  practiceDock: { position: 'absolute', right: 16, height: DOCK_HEIGHT, width: DOCK_WIDTH, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.pill, shadowColor: colors.text, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  practiceProgress: { position: 'absolute', right: 12, bottom: DOCK_HEIGHT + 4, ...typography.caption, color: colors.textMuted },
  dragHandle: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  dockButton: { width: 48, height: 48, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  dockButtonEmphasized: { backgroundColor: colors.primarySoft },
  dockButtonDisabled: { opacity: 0.42 },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl },
  loadingTitle: { ...typography.heading, color: colors.text, marginTop: spacing.lg },
  loadingCopy: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  errorState: { flex: 1, justifyContent: 'center', backgroundColor: colors.background },
  pressed: { opacity: 0.72 },
});

const markdownStyles = {
  body: { ...typography.body, color: colors.text },
  paragraph: { marginTop: 0, marginBottom: spacing.md },
  heading1: { fontSize: 24, lineHeight: 31, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  heading2: { ...typography.title, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  heading3: { ...typography.heading, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  bullet_list: { marginBottom: spacing.md },
  ordered_list: { marginBottom: spacing.md },
  blockquote: { backgroundColor: colors.surfaceMuted, borderLeftColor: colors.primary, borderLeftWidth: 3, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  code_inline: { fontFamily: 'monospace', color: colors.text, backgroundColor: colors.surfaceMuted, borderRadius: radii.sm, paddingHorizontal: spacing.xs },
  code_block: { fontFamily: 'monospace', color: colors.text, backgroundColor: colors.surfaceMuted, padding: spacing.md, borderRadius: radii.md },
  fence: { fontFamily: 'monospace', color: colors.text, backgroundColor: colors.surfaceMuted, padding: spacing.md, borderRadius: radii.md },
  image: { backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
};
