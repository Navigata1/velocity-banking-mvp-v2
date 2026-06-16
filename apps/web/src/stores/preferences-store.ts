'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LandingPreference = 'dashboard' | 'portfolio' | 'learn' | 'vault';

const landingPreferences = ['dashboard', 'portfolio', 'learn', 'vault'] as const satisfies readonly LandingPreference[];

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function safePositiveNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function safeTimestamp(value: unknown, fallback: number | null): number | null {
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function selectLandingPreference(value: unknown, fallback: LandingPreference): LandingPreference {
  return typeof value === 'string' && (landingPreferences as readonly string[]).includes(value)
    ? value as LandingPreference
    : fallback;
}

/**
 * Preferences are intentionally lightweight and safe to persist locally.
 * OAuth / server-backed identity can layer on later without changing UI flows.
 */
export interface PreferencesState {
  // Mascot / Chat
  teacherMode: boolean;
  setTeacherMode: (enabled: boolean) => void;

  // Onboarding / UX
  skipIntroOnStartup: boolean;
  setSkipIntroOnStartup: (skip: boolean) => void;

  landingPreference: LandingPreference;
  setLandingPreference: (pref: LandingPreference) => void;

  // Pre-App Preview
  previewPersistHours: number;
  setPreviewPersistHours: (hours: number) => void;
  showPreAppPreview: boolean;
  setShowPreAppPreview: (show: boolean) => void;
  lastPreviewRefresh: number | null;
  setLastPreviewRefresh: (ts: number | null) => void;
}

export function sanitizePersistedPreferencesState(
  persistedState: unknown,
  currentState: PreferencesState
): Pick<
  PreferencesState,
  | 'teacherMode'
  | 'skipIntroOnStartup'
  | 'landingPreference'
  | 'previewPersistHours'
  | 'showPreAppPreview'
  | 'lastPreviewRefresh'
> {
  const persisted = isObject(persistedState) ? persistedState as Partial<PreferencesState> : {};

  return {
    teacherMode: booleanValue(persisted.teacherMode, currentState.teacherMode),
    skipIntroOnStartup: booleanValue(persisted.skipIntroOnStartup, currentState.skipIntroOnStartup),
    landingPreference: selectLandingPreference(persisted.landingPreference, currentState.landingPreference),
    previewPersistHours: safePositiveNumber(persisted.previewPersistHours, currentState.previewPersistHours),
    showPreAppPreview: booleanValue(persisted.showPreAppPreview, currentState.showPreAppPreview),
    lastPreviewRefresh: safeTimestamp(persisted.lastPreviewRefresh, currentState.lastPreviewRefresh),
  };
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      teacherMode: true, // default ON: aligns with the teacher-guided tone
      setTeacherMode: (enabled) => set({ teacherMode: enabled }),

      skipIntroOnStartup: false,
      setSkipIntroOnStartup: (skip) => set({ skipIntroOnStartup: skip }),

      landingPreference: 'dashboard',
      setLandingPreference: (pref) => set({ landingPreference: pref }),

      previewPersistHours: 48,
      setPreviewPersistHours: (hours) => set({ previewPersistHours: hours }),
      showPreAppPreview: true,
      setShowPreAppPreview: (show) => set({ showPreAppPreview: show }),
      lastPreviewRefresh: null,
      setLastPreviewRefresh: (ts) => set({ lastPreviewRefresh: ts }),
    }),
    {
      name: 'interestshield-preferences-v1',
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedPreferencesState(persistedState, currentState),
      }),
    }
  )
);
