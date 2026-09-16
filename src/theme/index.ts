import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  background: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F1EE',
  surfaceWarm: '#F5F5F2',
  text: '#171717',
  textMuted: '#62625E',
  textSubtle: '#8A8A84',
  primary: '#171717',
  primaryPressed: '#3D3D39',
  primarySoft: '#E9E9E4',
  accent: '#4A4A46',
  border: '#E3E3DE',
  borderStrong: '#CFCFC8',
  borderWarm: '#D8D8D2',
  success: '#444440',
  warning: '#666660',
  danger: '#8A3D3D',
  white: '#FFFFFF',
  overlay: 'rgba(23, 23, 23, 0.08)',
} as const;

export const difficultyStyles = {
  1: { label: '简单', text: '#4A4A46', background: '#F1F1EE' },
  2: { label: '中等', text: '#4A4A46', background: '#E7E7E2' },
  3: { label: '困难', text: '#4A4A46', background: '#DCDCD6' },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 2,
  md: 4,
  lg: 8,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
  } satisfies TextStyle,
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.2,
  } satisfies TextStyle,
  heading: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '400',
  } satisfies TextStyle,
  bodyStrong: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  } satisfies TextStyle,
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    lineHeight: 18,
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
