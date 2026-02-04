'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'original' | 'black' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'original',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'interestshield-theme',
    }
  )
);

export const themeClasses: Record<Theme, {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  text: string;
  textSecondary: string;
  border: string;
  glass: string;
  glassButton: string;
  glassHero: string;
  nav: string;
}> = {
  original: {
    bg: 'bg-slate-900',
    bgSecondary: 'bg-slate-800',
    bgTertiary: 'bg-slate-700',
    text: 'text-white',
    textSecondary: 'text-gray-400',
    border: 'border-slate-700',
    glass: 'bg-slate-800/60 backdrop-blur-xl border border-slate-600/40 shadow-lg shadow-emerald-500/5',
    glassButton: 'bg-gradient-to-br from-slate-700/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-500/30 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:border-emerald-500/30 transition-all duration-300',
    glassHero: 'bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40 backdrop-blur-xl border border-slate-600/30 shadow-2xl shadow-emerald-500/10',
    nav: 'bg-gray-900/95 backdrop-blur border-gray-800',
  },
  black: {
    bg: 'bg-black',
    bgSecondary: 'bg-zinc-900',
    bgTertiary: 'bg-zinc-800',
    text: 'text-white',
    textSecondary: 'text-zinc-400',
    border: 'border-zinc-800',
    glass: 'bg-zinc-900/70 backdrop-blur-xl border border-zinc-700/50 shadow-lg shadow-emerald-500/5',
    glassButton: 'bg-gradient-to-br from-zinc-800/90 via-zinc-900/70 to-black/90 backdrop-blur-xl border border-zinc-600/40 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 hover:border-emerald-500/40 transition-all duration-300',
    glassHero: 'bg-gradient-to-br from-zinc-900/50 via-black/70 to-zinc-900/50 backdrop-blur-xl border border-zinc-700/40 shadow-2xl shadow-emerald-500/15',
    nav: 'bg-black/95 backdrop-blur border-zinc-800',
  },
  light: {
    bg: 'bg-gray-50',
    bgSecondary: 'bg-white',
    bgTertiary: 'bg-gray-100',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-gray-200',
    glass: 'bg-white/70 backdrop-blur-xl border border-gray-200/60 shadow-lg shadow-gray-300/30',
    glassButton: 'bg-gradient-to-br from-white/90 via-gray-50/70 to-gray-100/90 backdrop-blur-xl border border-gray-300/50 shadow-lg shadow-gray-400/20 hover:shadow-emerald-500/20 hover:border-emerald-400/40 transition-all duration-300',
    glassHero: 'bg-gradient-to-br from-white/60 via-gray-50/80 to-white/60 backdrop-blur-xl border border-gray-200/50 shadow-2xl shadow-gray-400/20',
    nav: 'bg-white/95 backdrop-blur border-gray-200',
  },
};
