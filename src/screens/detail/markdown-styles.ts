import { StyleSheet, type TextStyle } from 'react-native';
import { colors, fontFamily, radii, spacing, typography } from '../../theme';

/** 代码块外观：fence 与 code_block 共用一份，避免两处漂移 */
const codeBlockStyle: TextStyle = {
  fontFamily: fontFamily.mono,
  color: colors.text,
  backgroundColor: colors.surfaceMuted,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  padding: spacing.md,
  borderRadius: radii.sm,
  fontSize: 13,
  lineHeight: 21,
  marginBottom: spacing.md,
};

/** 题干 / 答案正文共用的 Markdown 样式（表格、行内代码、代码块等） */
export const markdownStyles = {
  body: { ...typography.body, color: colors.text, lineHeight: 26 },
  paragraph: { marginTop: 0, marginBottom: spacing.md },
  heading1: { fontSize: 22, lineHeight: 30, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  heading2: { ...typography.title, fontSize: 18, lineHeight: 26, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  heading3: { ...typography.heading, fontSize: 16, lineHeight: 24, color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  bullet_list: { marginBottom: spacing.md },
  ordered_list: { marginBottom: spacing.md },
  blockquote: {
    backgroundColor: colors.surfaceSubtle,
    borderLeftColor: colors.borderStrong,
    borderLeftWidth: 3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  code_inline: {
    fontFamily: fontFamily.mono,
    color: colors.code,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 13,
  },
  code_block: codeBlockStyle,
  fence: codeBlockStyle,
  // 表格：去掉库默认的纯黑边框，表头浅底 + 横向 hairline 分隔
  table: {
    borderWidth: 0,
    borderRadius: radii.sm,
    overflow: 'hidden' as const,
    alignSelf: 'stretch' as const,
    marginBottom: spacing.md,
  },
  thead: { backgroundColor: colors.surfaceMuted },
  tbody: {},
  th: { flex: 1, paddingVertical: 10, paddingHorizontal: spacing.md },
  tr: {
    flexDirection: 'row' as const,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  td: { flex: 1, paddingVertical: 10, paddingHorizontal: spacing.md },
  tableHeaderText: { fontWeight: '600' as const, fontSize: 13, color: colors.text },
  image: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
  },
};

/** 题干下方折叠的「来源与说明」小字样式 */
export const sourceMetaMarkdownStyles = {
  body: { ...typography.caption, color: colors.textSubtle, lineHeight: 18 },
  paragraph: { margin: 0 },
  blockquote: {
    borderLeftWidth: 0,
    padding: 0,
    backgroundColor: 'transparent',
  },
};
