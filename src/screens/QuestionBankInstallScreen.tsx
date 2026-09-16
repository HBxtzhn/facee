import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { BookOpenCheck, Download, RotateCcw } from 'lucide-react-native';
import { AppButton, ProgressBar, Surface } from '../components/ui';
import {
  getQuestionBankInstallMode,
  questionBankRepository,
} from '../question-bank';
import { useQuestionBankStore } from '../question-bank/store';
import { colors, radii, spacing, typography } from '../theme';

/** First-run gate. The app has no bundled catalog until the user installs it. */
export function QuestionBankInstallScreen() {
  const installing = useQuestionBankStore((state) => state.installing);
  const progress = useQuestionBankStore((state) => state.installProgress);
  const error = useQuestionBankStore((state) => state.installError);
  const sourceUrl = useQuestionBankStore((state) => state.sourceUrl);
  const setSourceUrl = useQuestionBankStore((state) => state.setSourceUrl);
  const install = useQuestionBankStore((state) => state.installConfigured);
  const installMode = getQuestionBankInstallMode(questionBankRepository, sourceUrl);
  const isRemote = installMode === 'remote';

  const percentage = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <View style={styles.screen}>
      <View style={styles.brandMark}>
        <BookOpenCheck size={34} color={colors.primary} strokeWidth={1.8} />
      </View>
      <Text style={styles.brand}>FaceE</Text>
      <Text style={styles.eyebrow}>离线面试训练</Text>

      <Surface style={styles.card}>
        <View style={styles.iconWrap}>
          <Download size={24} color={colors.primary} strokeWidth={1.8} />
        </View>
        <Text style={styles.title}>{isRemote ? '下载完整本地题库' : '尚未配置线上题库'}</Text>
        <Text style={styles.description}>
          {isRemote
            ? '将从已配置的题库地址下载完整 ZIP 包。校验和解压完成后才会切换本地题库，之后浏览、搜索和收藏都不需要网络。'
            : '软件不内置题目。请粘贴线上仓库发布的完整 ZIP 包地址，下载并安装后即可离线浏览和连续刷题。'}
        </Text>

        <View style={styles.urlField}>
          <Text style={styles.urlLabel}>题库 ZIP 地址</Text>
          <TextInput
            value={sourceUrl}
            onChangeText={setSourceUrl}
            placeholder="https://github.com/.../releases/download/.../question-bank.zip"
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel="题库 ZIP 地址"
            style={styles.urlInput}
          />
        </View>

        {installing && progress ? (
          <View style={styles.progressBlock}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>{progress.label}</Text>
              <Text style={styles.progressValue}>{percentage}%</Text>
            </View>
            <ProgressBar value={progress.total ? progress.completed / progress.total : 0} accessibilityLabel="题库安装进度" />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorTitle}>安装失败</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <AppButton
          label={installing ? '正在下载题库' : error ? '重试下载' : isRemote ? '下载完整题库' : '等待配置题库地址'}
          icon={error ? RotateCcw : Download}
          onPress={() => void install()}
          loading={installing}
          accessibilityHint={isRemote ? '下载并校验完整题库后保存到本机' : '需要先配置线上题库地址'}
          disabled={!isRemote}
          style={styles.button}
        />
      </Surface>
      <Text style={styles.privacy}>不会自动连接服务器，也不会上传你的学习记录。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  brandMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  brand: { ...typography.display, color: colors.text, marginTop: spacing.lg },
  eyebrow: { ...typography.caption, color: colors.primary, marginTop: spacing.xs },
  card: {
    width: '100%',
    maxWidth: 480,
    paddingVertical: spacing.xl,
    marginTop: spacing.xxl,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.title, color: colors.text, marginTop: spacing.lg },
  description: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  urlField: { marginTop: spacing.lg },
  urlLabel: { ...typography.label, color: colors.text },
  urlInput: {
    ...typography.caption,
    color: colors.text,
    minHeight: 48,
    marginTop: spacing.xs,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
    backgroundColor: 'transparent',
  },
  progressBlock: { marginTop: spacing.lg },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { ...typography.caption, color: colors.text },
  progressValue: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  errorBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: { ...typography.label, color: colors.danger },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  button: { marginTop: spacing.xl },
  privacy: {
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
