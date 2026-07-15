'use client';

import { useEffect, useMemo, useState } from 'react';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  collectBrowserSnapshotStorage,
  getOrCreateBrowserSyncIdempotencyKey,
} from '@/lib/supabase/account-sync-source';
import { syncLocalSnapshot } from '@/lib/supabase/snapshot-sync';

type WorkState = 'idle' | 'signing-in' | 'signing-out' | 'syncing';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The account request could not be completed.';
}

export default function SupabaseAccountPanel() {
  const { theme } = useThemeStore();
  const classes = themeClasses[theme];
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState('');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [work, setWork] = useState<WorkState>('idle');

  useEffect(() => {
    if (!client) return;
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (active) setSessionEmail(data.session?.user.email ?? null);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setSessionEmail(session?.user.email ?? null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const requestMagicLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!client) return;
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setStatus('Enter a valid email address.');
      return;
    }
    if (!navigator.onLine) {
      setStatus('You are offline. Reconnect before requesting a sign-in link.');
      return;
    }

    setWork('signing-in');
    setStatus(null);
    const { error } = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: `${window.location.origin}/settings` },
    });
    setWork('idle');
    setStatus(error ? `Sign-in link failed: ${error.message}` : 'Check your email for the secure sign-in link.');
  };

  const syncSnapshot = async () => {
    if (!client) return;
    if (!navigator.onLine) {
      setStatus('You are offline. Local data is unchanged; reconnect and try sync again.');
      return;
    }
    const storage = collectBrowserSnapshotStorage(window.localStorage);
    if (storage.length === 0) {
      setStatus('No local InterestShield data is ready to sync yet.');
      return;
    }

    setWork('syncing');
    setStatus(null);
    try {
      await syncLocalSnapshot(client, {
        idempotencyKey: getOrCreateBrowserSyncIdempotencyKey(window.localStorage),
        storage,
      });
      setStatus(`Synced ${storage.length} local data sections to your private snapshot.`);
    } catch (error) {
      setStatus(`Sync failed: ${errorMessage(error)} Local data is unchanged.`);
    } finally {
      setWork('idle');
    }
  };

  const signOut = async () => {
    if (!client) return;
    setWork('signing-out');
    const { error } = await client.auth.signOut();
    setWork('idle');
    setStatus(error ? `Sign-out failed: ${error.message}` : 'Signed out. Local browser data remains on this device.');
  };

  if (!client) {
    return (
      <div data-testid="settings-supabase-account-unconfigured" className={`${classes.bgTertiary} rounded-xl p-4 space-y-2`}>
        <p className={`text-sm font-medium ${classes.text}`}>Private account sync is not configured</p>
        <p className={`text-xs ${classes.textSecondary}`}>
          This build stays local-only until a dedicated InterestShield Supabase URL and publishable key are configured.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="settings-supabase-account" className={`${classes.bgTertiary} rounded-xl p-4 space-y-4`}>
      {sessionEmail ? (
        <>
          <div>
            <p className={`text-xs ${classes.textMuted}`}>Verified account session</p>
            <p className={`text-sm font-medium ${classes.text}`}>{sessionEmail}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={syncSnapshot}
              disabled={work !== 'idle'}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {work === 'syncing' ? 'Syncing...' : 'Sync local snapshot'}
            </button>
            <button
              type="button"
              onClick={signOut}
              disabled={work !== 'idle'}
              className={`px-4 py-2 rounded-lg border ${classes.border} text-sm ${classes.textSecondary} disabled:opacity-50`}
            >
              {work === 'signing-out' ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className={`text-xs ${classes.textSecondary}`}>
            Sign in by email to create a private owner-scoped snapshot. Nothing leaves this browser until you press sync.
          </p>
          <label htmlFor="supabase-account-email" className={`block text-xs font-medium ${classes.text}`}>
            Email address
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="supabase-account-email"
              type="email"
              aria-label="Supabase account email address"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`min-w-0 flex-1 rounded-lg border ${classes.border} ${classes.bgSecondary} px-3 py-2 text-sm ${classes.text}`}
            />
            <button
              type="button"
              onClick={requestMagicLink}
              disabled={work !== 'idle'}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {work === 'signing-in' ? 'Sending...' : 'Email sign-in link'}
            </button>
          </div>
        </div>
      )}
      {status ? <p className={`text-xs ${classes.textSecondary}`} role="status">{status}</p> : null}
      <p className={`text-xs ${classes.textMuted}`}>Educational tool. Not financial advice.</p>
    </div>
  );
}
