'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SupabaseProfile,
  SupabaseSession,
  SupabaseUser,
  createProfile,
  fetchUser,
  getGoogleOAuthUrl,
  getProfileByUserId,
  hasSupabaseConfig,
  signInWithEmail,
  signOutSession,
  signUpWithEmail,
} from '@/lib/supabase';

type AuthStatus = 'anonymous' | 'loading' | 'authenticated';

interface AuthStoreState {
  session: SupabaseSession | null;
  user: SupabaseUser | null;
  profile: SupabaseProfile | null;
  status: AuthStatus;
  error: string | null;
  authModalOpen: boolean;

  setAuthModalOpen: (open: boolean) => void;
  restoreSession: () => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<{ ok: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

async function ensureProfile(user: SupabaseUser, accessToken: string): Promise<SupabaseProfile | null> {
  const existing = await getProfileByUserId(user.id, accessToken);
  if (existing.data && existing.data.length > 0) {
    return existing.data[0];
  }

  const created = await createProfile(user.id, accessToken, user.user_metadata?.name as string | undefined);
  if (created.data && created.data.length > 0) {
    return created.data[0];
  }

  return null;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      profile: null,
      status: 'anonymous',
      error: null,
      authModalOpen: false,

      setAuthModalOpen: (open) => set({ authModalOpen: open }),

      restoreSession: async () => {
        const state = get();
        if (!state.session?.access_token) {
          set({ status: 'anonymous', user: null, profile: null });
          return;
        }

        set({ status: 'loading', error: null });
        const userResult = await fetchUser(state.session.access_token);
        if (userResult.error || !userResult.data) {
          set({ session: null, user: null, profile: null, status: 'anonymous', error: userResult.error ?? 'Session expired.' });
          return;
        }

        const profile = await ensureProfile(userResult.data, state.session.access_token);
        set({ user: userResult.data, profile, status: 'authenticated', error: null });
      },

      signUp: async (email, password, name) => {
        if (!hasSupabaseConfig()) {
          const message = 'Supabase keys are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.';
          set({ error: message });
          return { ok: false, error: message };
        }

        set({ status: 'loading', error: null });
        const result = await signUpWithEmail(email, password, name);
        if (result.error || !result.data) {
          const message = result.error ?? 'Unable to create account.';
          set({ status: 'anonymous', error: message });
          return { ok: false, error: message };
        }

        const payload = result.data;
        if (payload.session && payload.user) {
          const profile = await ensureProfile(payload.user, payload.session.access_token);
          set({
            session: payload.session,
            user: payload.user,
            profile,
            status: 'authenticated',
            error: null,
            authModalOpen: false,
          });
        } else {
          set({ status: 'anonymous', error: null, authModalOpen: false });
        }

        return { ok: true };
      },

      signIn: async (email, password) => {
        if (!hasSupabaseConfig()) {
          const message = 'Supabase keys are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.';
          set({ error: message });
          return { ok: false, error: message };
        }

        set({ status: 'loading', error: null });
        const result = await signInWithEmail(email, password);
        if (result.error || !result.data) {
          const message = result.error ?? 'Sign-in failed.';
          set({ status: 'anonymous', error: message });
          return { ok: false, error: message };
        }

        const session = result.data;
        const userResult = await fetchUser(session.access_token);
        if (userResult.error || !userResult.data) {
          const message = userResult.error ?? 'Unable to fetch profile.';
          set({ status: 'anonymous', error: message });
          return { ok: false, error: message };
        }

        const profile = await ensureProfile(userResult.data, session.access_token);
        set({
          session,
          user: userResult.data,
          profile,
          status: 'authenticated',
          error: null,
          authModalOpen: false,
        });

        return { ok: true };
      },

      signInWithGoogle: async () => {
        const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/settings` : '';
        const oauthUrl = getGoogleOAuthUrl(redirectTo);

        if (!oauthUrl) {
          const message = 'Supabase keys are missing. Google sign-in is unavailable.';
          set({ error: message });
          return { ok: false, error: message };
        }

        window.location.href = oauthUrl;
        return { ok: true };
      },

      signOut: async () => {
        const accessToken = get().session?.access_token;
        if (accessToken) {
          await signOutSession(accessToken);
        }
        set({ session: null, user: null, profile: null, status: 'anonymous', error: null });
      },
    }),
    {
      name: 'interestshield-auth-v1',
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        profile: state.profile,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.session?.access_token) {
          state.status = 'authenticated';
        }
      },
    },
  ),
);

