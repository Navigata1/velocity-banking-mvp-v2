'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LandingPage = 'dashboard' | 'portfolio';

export interface LocalUser {
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface AppState {
  introSeen: boolean;
  introModalOpen: boolean;
  skipIntroOnStartup: boolean;
  setupComplete: boolean;
  landingPage: LandingPage;
  user: LocalUser | null;

  setIntroSeen: (seen: boolean) => void;
  openIntro: () => void;
  closeIntro: () => void;
  setSkipIntroOnStartup: (skip: boolean) => void;
  setSetupComplete: (complete: boolean) => void;
  setLandingPage: (page: LandingPage) => void;
  signInLocal: (email: string, name?: string) => void;
  signOut: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      introSeen: false,
      introModalOpen: false,
      skipIntroOnStartup: false,
      setupComplete: false,
      landingPage: 'dashboard',
      user: null,

      setIntroSeen: (seen) => set({ introSeen: seen }),
      openIntro: () => set({ introModalOpen: true }),
      closeIntro: () => set({ introModalOpen: false }),
      setSkipIntroOnStartup: (skip) => set({ skipIntroOnStartup: skip }),
      setSetupComplete: (complete) => set({ setupComplete: complete }),
      setLandingPage: (page) => set({ landingPage: page }),
      signInLocal: (email, name) => set({ user: { email, name } }),
      signOut: () => set({ user: null }),
    }),
    {
      name: 'interestshield-app-v1',
      version: 1,
    }
  )
);
