/**
 * Общие цвета, шрифты и отступы приложения (роль 7 — дизайн).
 * Светлая / тёмная тема по макету: тёплый off-white, акцент синий.
 *
 * Остальные экраны берут значения через useTheme() / Colors.
 * Новые ключи (border, accent, accentText, danger, Radius) — опциональны:
 * старый код без них продолжит работать.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A1A',
    background: '#FAFAF7',
    backgroundElement: '#F0EFEA',
    backgroundSelected: '#E4E2DB',
    textSecondary: '#6B6B66',
    border: '#E7E5DE',
    accent: '#3D5AFE',
    accentText: '#FFFFFF',
    danger: '#C93C37',
  },
  dark: {
    text: '#F2F2EE',
    background: '#0E0E0C',
    backgroundElement: '#1B1B19',
    backgroundSelected: '#272724',
    textSecondary: '#A3A39C',
    border: '#2A2A27',
    accent: '#7C93FF',
    accentText: '#0E0E0C',
    danger: '#FF7A74',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
