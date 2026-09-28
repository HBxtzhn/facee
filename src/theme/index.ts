import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  // 基础底色：柔和温润的米白纸感，降低长时间刷题疲劳
  background: '#F9F9F6',
  surface: '#FFFFFF',
  surfaceSubtle: '#F4F4F0',
  surfaceMuted: '#EFEFEA',
  surfaceWarm: '#F7F6F1',

  // 字体颜色：避免 #000000 刺眼对比，采用阅读级碳墨黑与多级柔和灰
  text: '#1C1E21',
  textSecondary: '#4A5056',
  textMuted: '#6C737C',
  textSubtle: '#9AA1A9',

  // 主题色与强调色：洗练的深石墨黑与雅致灰
  primary: '#1F2428',
  primaryPressed: '#343A40',
  primarySoft: '#EAEAE4',
  primaryMuted: '#F1F1EB',
  accent: '#2D3748',

  // 边框与分割线：更精细轻盈的线条
  border: '#E8E8E2',
  borderStrong: '#D6D6CC',
  borderWarm: '#DEDECF',

  // 语义色：更现代克制的警示、成功与标签色彩
  success: '#2E7D32',
  successSoft: '#EDF7ED',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#C53030',
  dangerSoft: '#FEE2E2',

  // 辅助
  white: '#FFFFFF',
  overlay: 'rgba(15, 20, 25, 0.4)',
} as const;

export const difficultyStyles = {
  1: { label: '简单', text: '#2E7D32', background: '#EDF7ED', border: '#C8E6C9' },
  2: { label: '中等', text: '#B45309', background: '#FEF3C7', border: '#FDE68A' },
  3: { label: '困难', text: '#B91C1C', background: '#FEE2E2', border: '#FECACA' },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  } satisfies TextStyle,
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.2,
  } satisfies TextStyle,
  heading: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  } satisfies TextStyle,
  bodyStrong: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
  } satisfies TextStyle,
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  } satisfies TextStyle,
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  } satisfies TextStyle,
} as const;

export const card: ViewStyle = {
  backgroundColor: 'transparent',
};

export const navigationTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};
