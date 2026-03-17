'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { getJsonState, upsertJsonState } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { usePreferencesStore } from '@/stores/preferences-store';

type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  setStatus: (status: SyncStatus) => void;
  setError: (message: string | null) => void;
  setLastSyncedAt: (timestamp: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'local',
  lastSyncedAt: null,
  error: null,
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}));

function getPortfolioPayload() {
  const state = usePortfolioStore.getState();
  return {
    monthlyIncome: state.monthlyIncome,
    monthlyExpenses: state.monthlyExpenses,
    extraMonthlyPayment: state.extraMonthlyPayment,
    strategy: state.strategy,
    focusMode: state.focusMode,
    splitRatioPrimary: state.splitRatioPrimary,
    debts: state.debts,
  };
}

function getPreferencesPayload() {
  const state = usePreferencesStore.getState();
  return {
    teacherMode: state.teacherMode,
    skipIntroOnStartup: state.skipIntroOnStartup,
    landingPreference: state.landingPreference,
    previewPersistHours: state.previewPersistHours,
    showPreAppPreview: state.showPreAppPreview,
    lastPreviewRefresh: state.lastPreviewRefresh,
  };
}

async function restoreCloudState(profileId: string, accessToken: string) {
  const portfolio = await getJsonState<ReturnType<typeof getPortfolioPayload>>('portfolio_state', profileId, accessToken);
  const preferences = await getJsonState<ReturnType<typeof getPreferencesPayload>>('preferences_state', profileId, accessToken);

  if (portfolio.data && portfolio.data[0]?.data_json) {
    const cloudPortfolio = portfolio.data[0].data_json;
    const portfolioStore = usePortfolioStore.getState();
    portfolioStore.importState(JSON.stringify({ data: cloudPortfolio }));
  }

  if (preferences.data && preferences.data[0]?.data_json) {
    const cloudPreferences = preferences.data[0].data_json;
    usePreferencesStore.setState({
      teacherMode: cloudPreferences.teacherMode ?? usePreferencesStore.getState().teacherMode,
      skipIntroOnStartup: cloudPreferences.skipIntroOnStartup ?? usePreferencesStore.getState().skipIntroOnStartup,
      landingPreference: cloudPreferences.landingPreference ?? usePreferencesStore.getState().landingPreference,
      previewPersistHours: cloudPreferences.previewPersistHours ?? usePreferencesStore.getState().previewPersistHours,
      showPreAppPreview: cloudPreferences.showPreAppPreview ?? usePreferencesStore.getState().showPreAppPreview,
      lastPreviewRefresh: cloudPreferences.lastPreviewRefresh ?? usePreferencesStore.getState().lastPreviewRefresh,
    });
  }

  return {
    error: portfolio.error ?? preferences.error,
  };
}

async function pushCloudState(profileId: string, accessToken: string) {
  const syncStore = useSyncStore.getState();
  syncStore.setStatus('syncing');
  syncStore.setError(null);

  const portfolioPayload = getPortfolioPayload();
  const preferencesPayload = getPreferencesPayload();

  const [portfolioResult, preferencesResult] = await Promise.all([
    upsertJsonState('portfolio_state', profileId, portfolioPayload, accessToken),
    upsertJsonState('preferences_state', profileId, preferencesPayload, accessToken),
  ]);

  const error = portfolioResult.error ?? preferencesResult.error;
  if (error) {
    syncStore.setStatus('error');
    syncStore.setError(error);
    return;
  }

  syncStore.setStatus('synced');
  syncStore.setLastSyncedAt(new Date().toISOString());
}

export function useAutoSync() {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

  const debounceRef = useRef<number | null>(null);
  const restoringRef = useRef(false);
  const activeProfileRef = useRef<string | null>(null);

  useEffect(() => {
    const syncStore = useSyncStore.getState();

    if (!session?.access_token || !profile?.id) {
      syncStore.setStatus('local');
      return;
    }

    if (activeProfileRef.current !== profile.id) {
      activeProfileRef.current = profile.id;
      restoringRef.current = true;
      void restoreCloudState(profile.id, session.access_token)
        .then((result) => {
          if (result.error) {
            syncStore.setStatus('error');
            syncStore.setError(result.error);
          } else {
            syncStore.setStatus('synced');
          }
        })
        .finally(() => {
          restoringRef.current = false;
        });
    }

    const queueSync = () => {
      if (restoringRef.current) return;
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        void pushCloudState(profile.id, session.access_token);
      }, 2000);
    };

    const unsubscribePortfolio = usePortfolioStore.subscribe(() => queueSync());
    const unsubscribePreferences = usePreferencesStore.subscribe(() => queueSync());

    return () => {
      unsubscribePortfolio();
      unsubscribePreferences();
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [profile?.id, session?.access_token]);
}

