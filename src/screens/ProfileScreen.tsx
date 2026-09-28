import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Database,
  Download,
  Eye,
  Plus,
  Trophy,
} from 'lucide-react-native';
import { useQuestionBankStore } from '../question-bank/store';
import { useUserStore } from '../store/userStore';
import { AppButton, ProgressBar, TabHeader } from '../components/ui';
import { AppUpdateCard } from '../components/app-update-card';
import { cardChrome, colors, radii, spacing, typography } from '../theme';

export function ProfileScreen() {
  const user = useUserStore();
  const catalog = useQuestionBankStore((state) => state.catalog);
  const status = useQuestionBankStore((state) => state.status);
  const installing = useQuestionBankStore((state) => state.installing);
  const installProgress = useQuestionBankStore((state) => state.installProgress);
  const installError = useQuestionBankStore((state) => state.installError);
  const sourceUrl = useQuestionBankStore((state) => state.sourceUrl);
  const setSourceUrl = useQuestionBankStore((state) => state.setSourceUrl);
  const clearInstallError = useQuestionBankStore((state) => state.clearInstallError);
  const initializeQuestionBank = useQuestionBankStore((state) => state.initialize);
  const reinstallQuestionBank = useQuestionBankStore((state) => state.installConfigured);

  const [urlDialogVisible, setUrlDialogVisible] = useState(false);
  const [draftUrl, setDraftUrl] = useState('');

  useEffect(() => {
    void user.load();
    if (status === 'idle') void initializeQuestionBank();
  }, [initializeQuestionBank, status, user.load]);

  const totalBankCount = catalog?.questions.length ?? 0;
  const progressRatio = totalBankCount > 0 ? Math.min(1, user.totalCount / totalBankCount) : 0;
  const progressPercent = Math.round(progressRatio * 100);

  const openUrlDialog = () => {
    setDraftUrl(sourceUrl);
    clearInstallError();
    setUrlDialogVisible(true);
  };

  const closeUrlDialog = () => {
    if (!installing) setUrlDialogVisible(false);
  };

  const confirmInstall = async () => {
    const url = draftUrl.trim();
    if (!url || installing) return;
    setSourceUrl(url);
    const ok = await reinstallQuestionBank();
    if (ok) setUrlDialogVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 顶部个人进度 Hero 卡片 */}
        <View style={styles.header}>
          <TabHeader
            eyebrow="学习数据 · 个人中心"
            title="我的进度"
            subtitle="累计刷题与偏好设置，全部保存在本机。"
          />
        </View>

        {/* 学习仪表盘：进度环感与成就数字 */}
        <View style={styles.statsCard}>
          <View style={styles.statsMainRow}>
            <View style={styles.statIconBox}>
              <Trophy size={24} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.statTextGroup}>
              <Text style={styles.statLabel}>累计刷题总数</Text>
              <View style={styles.statNumberRow}>
                <Text style={styles.statNumber}>{user.totalCount}</Text>
                <Text style={styles.statUnit}>道</Text>
                {totalBankCount > 0 ? (
                  <Text style={styles.statRatio}>/ 题库共 {totalBankCount} 题</Text>
                ) : null}
              </View>
            </View>
          </View>

          {totalBankCount > 0 ? (
            <View style={styles.progressBarSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressMetaText}>题库掌握度</Text>
                <Text style={styles.progressPercentText}>{progressPercent}%</Text>
              </View>
              <ProgressBar value={progressRatio} accessibilityLabel="刷题覆盖进度" />
            </View>
          ) : null}
          <Text style={styles.statFooterNote}>只统计累计刷过题数，不按天计，温故而知新。</Text>
        </View>

        {/* 偏好设置 */}
        <Text style={styles.sectionHeader}>刷题偏好设置</Text>
        <View style={styles.cardContainer}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Eye size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>进入题目时默认展开答案</Text>
              <Text style={styles.settingSubtitle}>
                {user.answerExpandedByDefault ? '已开启：直接查看思路与解答' : '已关闭：先自主思考，按需查看'}
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
        </View>

        {/* 本地题库管理 */}
        <Text style={styles.sectionHeader}>本地题库信息</Text>
        <View style={styles.cardContainer}>
          {catalog ? (
            <>
              <View style={styles.libraryRow}>
                <View style={styles.libraryIconBox}>
                  <Database size={18} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.libraryDetails}>
                  <Text style={styles.libraryTitle}>{catalog.title}</Text>
                  <Text style={styles.libraryMeta}>
                    {catalog.questions.length} 道精选真题 · {catalog.tags.length} 个分类标签
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={openUrlDialog}
                style={styles.bankActionRow}
                accessibilityRole="button"
                accessibilityLabel="更换题库"
              >
                <Download size={14} color={colors.textSecondary} strokeWidth={2} />
                <Text style={styles.bankActionText}>更换题库</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={openUrlDialog}
              style={styles.bankActionRow}
              accessibilityRole="button"
              accessibilityLabel="增加题库"
            >
              <Plus size={16} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.bankActionTextStrong}>增加题库</Text>
            </Pressable>
          )}
        </View>

        {/* 应用更新 */}
        <Text style={styles.sectionHeader}>版本与更新</Text>
        <AppUpdateCard />
      </ScrollView>

      {/* 增加题库 / 更换题库弹窗：填入 ZIP 地址后下载并启用 */}
      <Modal
        visible={urlDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={closeUrlDialog}
      >
        <View style={styles.modalScrim}>
          <Pressable
            style={styles.modalScrimTouchable}
            onPress={closeUrlDialog}
            accessibilityLabel="关闭弹窗"
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{catalog ? '更换题库' : '增加题库'}</Text>
            <Text style={styles.modalHint}>
              粘贴题库 ZIP 下载地址（如 GitHub Release 链接），下载校验完成后自动启用，之后可完全离线使用。
            </Text>
            <TextInput
              value={draftUrl}
              onChangeText={setDraftUrl}
              placeholder="https://github.com/.../releases/download/.../bank.zip"
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!installing}
              accessibilityLabel="题库 ZIP 地址"
              style={styles.modalInput}
            />
            {installing && installProgress ? (
              <View style={styles.installProgress}>
                <View style={styles.syncRow}>
                  <Text style={styles.syncLabel}>{installProgress.label}</Text>
                  <Text style={styles.syncCount}>
                    {installProgress.completed}/{installProgress.total}
                  </Text>
                </View>
                <ProgressBar
                  value={installProgress.total ? installProgress.completed / installProgress.total : 0}
                  accessibilityLabel="题库下载进度"
                />
              </View>
            ) : null}
            {installError ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorTitle}>下载失败</Text>
                <Text style={styles.errorText}>{installError}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <AppButton
                label="取消"
                variant="ghost"
                onPress={closeUrlDialog}
                disabled={installing}
                style={styles.modalButton}
              />
              <AppButton
                label={installing ? '正在下载' : '确认下载'}
                icon={Download}
                onPress={() => void confirmInstall()}
                loading={installing}
                disabled={!draftUrl.trim()}
                accessibilityHint={catalog ? '下载并替换当前题库' : '下载并安装题库'}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  header: { paddingTop: spacing.md, paddingBottom: spacing.md },
  statsCard: {
    ...cardChrome,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  statsMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextGroup: { flex: 1 },
  statLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  statNumberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  statNumber: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.text },
  statUnit: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  statRatio: { ...typography.caption, color: colors.textSubtle, marginLeft: spacing.xs },
  progressBarSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressMetaText: { ...typography.caption, color: colors.textMuted },
  progressPercentText: { ...typography.caption, color: colors.text, fontWeight: '700' },
  statFooterNote: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: spacing.md,
    fontSize: 11,
  },
  sectionHeader: {
    ...typography.heading,
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  cardContainer: {
    ...cardChrome,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingIconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingCopy: { flex: 1 },
  settingTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 14 },
  settingSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2, fontSize: 12 },
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  libraryIconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryDetails: { flex: 1 },
  libraryTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 14 },
  libraryMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2, fontSize: 12 },
  bankActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bankActionText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  bankActionTextStrong: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  installProgress: { marginTop: spacing.md },
  syncRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  syncLabel: { ...typography.caption, color: colors.text },
  syncCount: { ...typography.caption, color: colors.textMuted },
  errorBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.borderWarm,
  },
  errorTitle: { ...typography.label, color: colors.danger, fontSize: 12 },
  errorText: { ...typography.caption, color: colors.danger, marginTop: 2, fontSize: 11 },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 16, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalScrimTouchable: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { ...typography.title, color: colors.text, fontSize: 18 },
  modalHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 16 },
  modalInput: {
    ...typography.body,
    color: colors.text,
    minHeight: 44,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButton: { minWidth: 108 },
});
