'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'original' | 'dark' | 'light';
export type AccentColor = 'emerald' | 'blue' | 'violet' | 'amber';

interface ThemeState {
  theme: Theme;
  accent: AccentColor;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: AccentColor) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'original',
      accent: 'emerald',
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
    }),
    {
      name: 'interestshield-theme',
    }
  )
);

const variableThemeClasses = {
  bg: 'bg-[var(--color-bg)]',
  bgSecondary: 'bg-[var(--color-surface)]',
  bgTertiary: 'bg-[var(--color-surface-muted)]',
  text: 'text-[var(--color-text)]',
  textSecondary: 'text-[var(--color-text-secondary)]',
  textMuted: 'text-[var(--color-text-muted)]',
  border: 'border-[color:var(--color-border)]',
  glass: 'bg-[var(--surface-glass)] backdrop-blur-xl border border-[color:var(--color-border-soft)] shadow-[0_12px_28px_var(--shadow-glass)]',
  glassButton:
    'bg-[var(--surface-glass-strong)] backdrop-blur-xl border border-[color:var(--color-border-soft)] shadow-[0_10px_24px_var(--shadow-glass)] hover:border-[color:var(--color-accent-soft)] hover:shadow-[0_14px_30px_var(--shadow-glass)] transition-all duration-200',
  glassHero:
    'bg-[var(--surface-hero)] backdrop-blur-xl border border-[color:var(--color-border-soft)] shadow-[0_16px_36px_var(--shadow-glass)]',
  nav: 'bg-[var(--surface-nav)] backdrop-blur-xl border-[color:var(--color-border-soft)]',
  dropdown: 'bg-[var(--surface-dropdown)] backdrop-blur-xl border border-[color:var(--color-border-soft)]',
  accent: 'text-[var(--color-accent)]',
};

export const themeClasses: Record<Theme, {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  glass: string;
  glassButton: string;
  glassHero: string;
  nav: string;
  dropdown: string;
  accent?: string;
}> = {
  original: variableThemeClasses,
  dark: variableThemeClasses,
  light: variableThemeClasses,
};
