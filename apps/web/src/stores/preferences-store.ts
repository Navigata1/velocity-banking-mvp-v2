'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LandingPreference = 'dashboard' | 'portfolio' | 'learn' | 'vault';

/**
 * Preferences are intentionally lightweight and safe to persist locally.
 * OAuth / server-backed identity can layer on later without changing UI flows.
 */
interface PreferencesState {
  // Mascot / Chat
  teacherMode: boolean;
  setTeacherMode: (enabled: boolean) => void;

  // Onboarding / UX
  skipIntroOnStartup: boolean;
  setSkipIntroOnStartup: (skip: boolean) => void;

  landingPreference: LandingPreference;
  setLandingPreference: (pref: LandingPreference) => void;
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
    }),
    { name: 'interestshield-preferences-v1' }
  )
);
