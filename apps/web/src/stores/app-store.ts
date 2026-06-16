'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LandingPage = 'dashboard' | 'portfolio';

const landingPages = ['dashboard', 'portfolio'] as const satisfies readonly LandingPage[];

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function selectLandingPage(value: unknown, fallback: LandingPage): LandingPage {
  return typeof value === 'string' && (landingPages as readonly string[]).includes(value)
    ? value as LandingPage
    : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export interface LocalUser {
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface AppState {
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

  previewDismissed: boolean;
  setPreviewDismissed: (dismissed: boolean) => void;
}

export function sanitizePersistedAppState(
  persistedState: unknown,
  currentState: AppState
): Pick<
  AppState,
  | 'introSeen'
  | 'introModalOpen'
  | 'skipIntroOnStartup'
  | 'setupComplete'
  | 'landingPage'
  | 'user'
  | 'previewDismissed'
> {
  const persisted = isObject(persistedState) ? persistedState as Partial<AppState> : {};
  const persistedUser = isObject(persisted.user) ? persisted.user as Partial<LocalUser> : null;
  const email = persistedUser ? optionalString(persistedUser.email) : undefined;

  return {
    introSeen: true,
    introModalOpen: false,
    skipIntroOnStartup: true,
    setupComplete: booleanValue(persisted.setupComplete, currentState.setupComplete),
    landingPage: selectLandingPage(persisted.landingPage, currentState.landingPage),
    user: email
      ? {
          email,
          name: optionalString(persistedUser?.name),
          avatarUrl: optionalString(persistedUser?.avatarUrl),
        }
      : null,
    previewDismissed: true,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      introSeen: true,
      introModalOpen: false,
      skipIntroOnStartup: true,
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

      previewDismissed: true,
      setPreviewDismissed: (dismissed) => set({ previewDismissed: dismissed }),
    }),
    {
      name: 'interestshield-app-v1',
      version: 2,
      migrate: (persistedState) => {
        const persisted = persistedState as Partial<AppState> | undefined;

        return {
          ...persisted,
          introSeen: true,
          introModalOpen: false,
          skipIntroOnStartup: true,
          previewDismissed: true,
        };
      },
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedAppState(persistedState, currentState),
      }),
    }
  )
);
