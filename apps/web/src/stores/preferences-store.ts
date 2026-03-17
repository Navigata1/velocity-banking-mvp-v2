'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LandingPreference = 'dashboard' | 'portfolio' | 'learn' | 'vault';
export type HeroAnimationMode = 'hover' | 'showroom360' | 'cinematicTilt' | 'lightSweep' | 'focusPulse';
export type HeroQuality = 'low' | 'medium' | 'high';

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

  // Pre-App Preview
  previewPersistHours: number;
  setPreviewPersistHours: (hours: number) => void;
  showPreAppPreview: boolean;
  setShowPreAppPreview: (show: boolean) => void;
  lastPreviewRefresh: number | null;
  setLastPreviewRefresh: (ts: number | null) => void;

  // Hero showroom
  heroAnimationMode: HeroAnimationMode;
  setHeroAnimationMode: (mode: HeroAnimationMode) => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
  heroQuality: HeroQuality;
  setHeroQuality: (quality: HeroQuality) => void;
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

      heroAnimationMode: 'hover',
      setHeroAnimationMode: (heroAnimationMode) => set({ heroAnimationMode }),
      reducedMotion: false,
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      heroQuality: 'high',
      setHeroQuality: (heroQuality) => set({ heroQuality }),
    }),
    { name: 'interestshield-preferences-v1' }
  )
);
