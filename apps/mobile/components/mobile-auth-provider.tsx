import type { Session, SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { registerMobileAuthLifecycle } from '@/lib/supabase/auth-lifecycle';
import { registerMobileAuthDeepLinks } from '@/lib/supabase/auth-deep-link';
import { createMobileSupabaseClient } from '@/lib/supabase/client';

type MobileAuthStatus = 'initializing' | 'unconfigured' | 'signed-out' | 'signed-in' | 'error';

interface MobileAuthContextValue {
  authError: string | null;
  authReady: boolean;
  client: SupabaseClient | null;
  ownerId: string | null;
  session: Session | null;
  status: MobileAuthStatus;
}

const MobileAuthContext = createContext<MobileAuthContextValue | null>(null);

export function MobileAuthProvider({ children }: PropsWithChildren) {
  const client = useMemo(() => createMobileSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<MobileAuthStatus>(client ? 'initializing' : 'unconfigured');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let active = true;
    let authVersion = 0;
    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      setAuthError(null);
      setStatus(nextSession ? 'signed-in' : 'signed-out');
    };
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      authVersion += 1;
      applySession(nextSession);
    });
    const bootstrapVersion = authVersion;
    client.auth.getSession()
      .then(({ data: sessionData, error }) => {
        if (!active || authVersion !== bootstrapVersion) return;
        if (error) throw error;
        applySession(sessionData.session);
      })
      .catch((error: unknown) => {
        if (!active || authVersion !== bootstrapVersion) return;
        setSession(null);
        setAuthError(error instanceof Error ? error.message : 'Stored sign-in could not be restored.');
        setStatus('error');
      });

    const unregisterLifecycle = registerMobileAuthLifecycle(client);
    const unregisterDeepLinks = registerMobileAuthDeepLinks(
      client,
      Linking.createURL('/settings'),
      (error) => {
        if (!active) return;
        setAuthError(error.message);
        setStatus('error');
      }
    );
    return () => {
      active = false;
      unregisterDeepLinks();
      unregisterLifecycle();
      data.subscription.unsubscribe();
    };
  }, [client]);

  const value = useMemo<MobileAuthContextValue>(() => ({
    authError,
    authReady: status !== 'initializing',
    client,
    ownerId: session?.user.id ?? null,
    session,
    status,
  }), [authError, client, session, status]);

  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuth(): MobileAuthContextValue {
  const context = useContext(MobileAuthContext);
  if (!context) throw new Error('useMobileAuth must be used within MobileAuthProvider');
  return context;
}
