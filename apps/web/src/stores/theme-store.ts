'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'original' | 'dark' | 'light';

export interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const themes = ['original', 'dark', 'light'] as const satisfies readonly Theme[];

function selectTheme(value: unknown, fallback: Theme): Theme {
  return typeof value === 'string' && (themes as readonly string[]).includes(value) ? value as Theme : fallback;
}

export function sanitizePersistedThemeState(
  persistedState: unknown,
  currentState: ThemeState
): Pick<ThemeState, 'theme'> {
  const persisted = persistedState && typeof persistedState === 'object' && !Array.isArray(persistedState)
    ? persistedState as Partial<ThemeState>
    : {};

  return {
    theme: selectTheme(persisted.theme, currentState.theme),
  };
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'original',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'interestshield-theme',
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedThemeState(persistedState, currentState),
      }),
    }
  )
);

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
  original: {
    bg: 'bg-[#090d12]',
    bgSecondary: 'bg-[#10161d]',
    bgTertiary: 'bg-[#17202a]',
    text: 'text-white',
    textSecondary: 'text-gray-400',
    textMuted: 'text-gray-500',
    border: 'border-white/10',
    glass: 'bg-white/[0.035] border border-white/10 shadow-lg shadow-black/15',
    glassButton: 'bg-gradient-to-br from-slate-700/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-500/30 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:border-emerald-500/30 transition-all duration-300',
    glassHero: 'bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40 backdrop-blur-xl border border-slate-600/30 shadow-2xl shadow-emerald-500/10',
    nav: 'bg-[#080c10]/98 backdrop-blur border-white/10',
    dropdown: 'bg-slate-800/95 backdrop-blur-xl border border-slate-600/50',
  },
  dark: {
    bg: 'bg-black',
    bgSecondary: 'bg-zinc-900',
    bgTertiary: 'bg-zinc-800',
    text: 'text-white',
    textSecondary: 'text-zinc-400',
    textMuted: 'text-zinc-500',
    border: 'border-zinc-800',
    glass: 'bg-zinc-900/70 backdrop-blur-xl border border-zinc-700/50 shadow-lg shadow-emerald-500/5',
    glassButton: 'bg-gradient-to-br from-zinc-800/90 via-zinc-900/70 to-black/90 backdrop-blur-xl border border-zinc-600/40 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 hover:border-emerald-500/40 transition-all duration-300',
    glassHero: 'bg-gradient-to-br from-zinc-900/50 via-black/70 to-zinc-900/50 backdrop-blur-xl border border-zinc-700/40 shadow-2xl shadow-emerald-500/15',
    nav: 'bg-black/95 backdrop-blur border-zinc-800',
    dropdown: 'bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60',
  },
  light: {
    bg: 'bg-gray-100',
    bgSecondary: 'bg-white',
    bgTertiary: 'bg-gray-50',
    text: 'text-slate-800',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-500',
    border: 'border-gray-300',
    glass: 'bg-white/85 backdrop-blur-xl border border-gray-300/70 shadow-lg shadow-gray-400/20',
    glassButton: 'bg-gradient-to-br from-white/95 via-gray-100/85 to-gray-200/95 backdrop-blur-xl border border-gray-300/60 shadow-lg shadow-gray-400/30 hover:shadow-emerald-500/30 hover:border-emerald-500/50 transition-all duration-300',
    glassHero: 'bg-gradient-to-br from-white/80 via-gray-100/90 to-white/80 backdrop-blur-xl border border-gray-300/60 shadow-2xl shadow-gray-400/30',
    nav: 'bg-white/98 backdrop-blur border-gray-300',
    dropdown: 'bg-white/95 backdrop-blur-xl border border-gray-300/70 shadow-xl',
    accent: 'text-emerald-600',
  },
};
