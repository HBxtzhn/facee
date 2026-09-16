import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Database, Download, Eye, RotateCcw, Send, Trophy } from 'lucide-react-native';
import {
  getQuestionBankInstallMode,
  questionBankRepository,
} from '../question-bank';
import { useQuestionBankStore } from '../question-bank/store';
import { useUserStore } from '../store/userStore';
import { AppButton, ProgressBar, Surface } from '../components/ui';
import { AppUpdateCard } from '../components/app-update-card';
import { colors, radii, spacing, typography } from '../theme';

export function ProfileScreen() {
  const user = useUserStore();
  const catalog = useQuestionBankStore((state) => state.catalog);
  const status = useQuestionBankStore((state) => state.status);
  const installing = useQuestionBankStore((state) => state.installing);
  const installProgress = useQuestionBankStore((state) => state.installProgress);
  const installError = useQuestionBankStore((state) => state.installError);
  const sourceUrl = useQuestionBankStore((state) => state.sourceUrl);
  const setSourceUrl = useQuestionBankStore((state) => state.setSourceUrl);
  const initializeQuestionBank = useQuestionBankStore((state) => state.initialize);
  const reinstallQuestionBank = useQuestionBankStore((state) => state.installConfigured);
  const installMode = getQuestionBankInstallMode(questionBankRepository, sourceUrl);
  const isRemote = installMode === 'remote';

  useEffect(() => {
    void user.load();
    if (status === 'idle') void initializeQuestionBank();
  }, [initializeQuestionBank, status, user.load]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>学习数据</Text>
          <Text style={styles.title}>我的进度</Text>
          <Text style={styles.subtitle}>累计刷过多少道题，只记总数，不按天统计。</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon={Trophy} label="累计刷题" value={String(user.totalCount)} suffix="道" />
        </View>

        <Text style={styles.sectionTitle}>本地题库</Text>
        <Surface style={styles.libraryCard}>
          <View style={styles.libraryHeading}>
            <View style={styles.libraryIcon}><Database size={22} color={colors.primary} strokeWidth={1.8} /></View>
            <View style={styles.libraryCopy}>
              <Text style={styles.libraryLabel}>已安装内容</Text>
              <Text style={styles.libraryValue}>{catalog?.title ?? '题库'}</Text>
            </View>
          </View>
          {catalog ? <Text style={styles.libraryMeta}>{catalog.questions.length} 道题 · {catalog.tags.length} 个标签 · 可完全离线阅读</Text> : null}
          <Text style={styles.sourceLabel}>题库来源地址</Text>
          <TextInput
            value={sourceUrl}
            onChangeText={setSourceUrl}
            placeholder="粘贴 GitHub Release ZIP 地址"
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel="题库来源地址"
            style={styles.sourceInput}
          />
          {installing && installProgress ? (
            <View style={styles.installProgress}>
              <View style={styles.syncRow}><Text style={styles.syncLabel}>{installProgress.label}</Text><Text style={styles.syncCount}>{installProgress.completed}/{installProgress.total}</Text></View>
              <ProgressBar value={installProgress.total ? installProgress.completed / installProgress.total : 0} accessibilityLabel="完整题库下载进度" />
            </View>
          ) : null}
          {installError ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Text style={styles.errorTitle}>重新安装失败</Text>
              <Text style={styles.errorText}>{installError}</Text>
            </View>
          ) : null}
          <AppButton
            label={installing ? '正在重新下载题库' : isRemote ? '重新下载完整题库' : '未配置线上题库地址'}
            icon={installError ? RotateCcw : Download}
            onPress={() => void reinstallQuestionBank()}
            loading={installing}
            accessibilityHint={isRemote ? '以已配置的完整题库替换本机内容' : '需要先配置线上题库地址'}
            disabled={!isRemote}
            style={styles.reinstallButton}
          />
        </Surface>

        <Text style={styles.sectionTitle}>设置</Text>
        <Surface style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}><Eye size={21} color={colors.primary} strokeWidth={1.8} /></View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>进入题目时默认展开答案</Text>
              <Text style={styles.settingHint}>
                {user.answerExpandedByDefault ? '已开启：直接显示参考答案' : '已关闭：先读题目，需要时再展开'}
              </Text>
            </View>
            <Switch
              value={user.answerExpandedByDefault}
              onValueChange={user.setAnswerExpandedByDefault}
              trackColor={{ false: colors.borderStrong, true: colors.primarySoft }}
              thumbColor={user.answerExpandedByDefault ? colors.primary : colors.surface}
              accessibilityLabel="进入题目时默认展开答案"
            />
          </View>
        </Surface>

        <Text style={styles.sectionTitle}>应用更新</Text>
        <AppUpdateCard />

        <Text style={styles.sectionTitle}>数据说明</Text>
        <Surface style={styles.contributionCard}>
          <View style={styles.contributionIcon}><Send size={21} color={colors.textMuted} strokeWidth={1.8} /></View>
          <View style={styles.contributionCopy}><Text style={styles.contributionTitle}>学习记录只保存在本机</Text><Text style={styles.contributionText}>收藏和刷题进度使用本地存储，不会随题库内容上传。</Text></View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon: Icon, label, value, suffix }: { icon: typeof Trophy; label: string; value: string; suffix: string }) {
  return <Surface style={styles.statCard}><Icon size={20} color={colors.primary} strokeWidth={1.8} /><Text style={styles.statLabel}>{label}</Text><View style={styles.statValueRow}><Text style={styles.statValue}>{value}</Text><Text style={styles.statSuffix}>{suffix}</Text></View></Surface>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  eyebrow: { ...typography.caption, color: colors.primary, fontWeight: '700', letterSpacing: 0.8 },
  title: { ...typography.display, color: colors.text, marginTop: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  statCard: { flex: 1, minHeight: 126, padding: spacing.md },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  statValue: { fontSize: 24, lineHeight: 32, fontWeight: '700', color: colors.text },
  statSuffix: { ...typography.caption, color: colors.textMuted },
  settingCard: { padding: spacing.lg },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  settingCopy: { flex: 1 },
  settingLabel: { ...typography.bodyStrong, color: colors.text },
  settingHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  sectionTitle: { ...typography.heading, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  libraryCard: { padding: spacing.lg },
  libraryHeading: { flexDirection: 'row', alignItems: 'center' },
  libraryIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  libraryCopy: { flex: 1, marginLeft: spacing.md },
  libraryLabel: { ...typography.caption, color: colors.textMuted },
  libraryValue: { ...typography.bodyStrong, color: colors.text },
  libraryMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg },
  sourceLabel: { ...typography.label, color: colors.text, marginTop: spacing.lg },
  sourceInput: { ...typography.caption, color: colors.text, minHeight: 48, marginTop: spacing.xs, paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: colors.borderStrong, backgroundColor: 'transparent' },
  installProgress: { marginTop: spacing.lg },
  syncRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  syncLabel: { ...typography.caption, color: colors.text },
  syncCount: { ...typography.caption, color: colors.textMuted },
  errorBox: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radii.md, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  errorTitle: { ...typography.label, color: colors.danger },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  reinstallButton: { marginTop: spacing.lg },
  contributionCard: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  contributionIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  contributionCopy: { flex: 1 },
  contributionTitle: { ...typography.bodyStrong, color: colors.text },
  contributionText: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
