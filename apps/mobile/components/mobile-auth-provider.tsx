import type { Session, SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { registerMobileAuthLifecycle } from '@/lib/supabase/auth-lifecycle';
import { registerMobileAuthDeepLinks } from '@/lib/supabase/auth-deep-link';
import { createMobileSupabaseClient } from '@/lib/supabase/client';
import { registerMobileSnapshotOutboxReplay } from '@/lib/supabase/snapshot-outbox-replay';
import { resumePendingMobileSnapshotRecovery } from '@/lib/supabase/snapshot-recovery';

type MobileAuthStatus = 'initializing' | 'unconfigured' | 'signed-out' | 'signed-in' | 'error';

interface MobileAuthContextValue {
  authError: string | null;
  authReady: boolean;
  client: SupabaseClient | null;
  consumeSyncNotice: (noticeId: number) => void;
  ownerId: string | null;
  session: Session | null;
  status: MobileAuthStatus;
  syncNotice: MobileSyncNotice | null;
  recoveryBusy: boolean;
  isRecoveryBusy: () => boolean;
  retryPendingRecovery: () => Promise<boolean>;
  runRecovery: <T>(ownerId: string, action: () => Promise<T>) => Promise<T>;
}

interface MobileSyncNotice {
  id: number;
  kind: 'synced' | 'waiting';
  message: string;
  ownerId: string;
}

const MobileAuthContext = createContext<MobileAuthContextValue | null>(null);

export function MobileAuthProvider({ children }: PropsWithChildren) {
  const client = useMemo(() => createMobileSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<MobileAuthStatus>(client ? 'initializing' : 'unconfigured');
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<MobileSyncNotice | null>(null);
  const [recoveryReadyOwner, setRecoveryReadyOwner] = useState<string | null>(null);
  const [recoveryBusyOwner, setRecoveryBusyOwner] = useState<string | null>(null);
  const recoveryWorkOwner = useRef<string | null>(null);
  const recoveryAttempt = useRef<{ ownerId: string; promise: Promise<boolean> } | null>(null);
  const activeOwnerId = useRef<string | null>(null);
  const nextSyncNoticeId = useRef(0);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; recoveryWorkOwner.current = null; };
  }, []);

  const consumeSyncNotice = useCallback((noticeId: number) => {
    setSyncNotice((current) => current?.id === noticeId ? null : current);
  }, []);

  useEffect(() => {
    if (!client) return;
    let active = true;
    let authVersion = 0;
    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      const nextOwnerId = nextSession?.user.id ?? null;
      if (activeOwnerId.current !== nextOwnerId) {
        activeOwnerId.current = nextOwnerId;
        setRecoveryReadyOwner(null);
        setSyncNotice(null);
        recoveryWorkOwner.current = null;
        setRecoveryBusyOwner(null);
      }
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

  const ownerId = session?.user.id ?? null;
  const isRecoveryBusy = useCallback(() => recoveryWorkOwner.current !== null
    && recoveryWorkOwner.current === activeOwnerId.current, []);
  const retryPendingRecovery = useCallback((): Promise<boolean> => {
    const expectedOwner = activeOwnerId.current;
    if (!mounted.current || !client || !expectedOwner) return Promise.reject(new Error('No active account is available for recovery.'));
    if (recoveryAttempt.current?.ownerId === expectedOwner) return recoveryAttempt.current.promise;
    if (recoveryWorkOwner.current === expectedOwner) return Promise.reject(new Error('Recovery is already applying.'));
    setRecoveryReadyOwner(null);
    const promise = resumePendingMobileSnapshotRecovery(expectedOwner).then(resumed => {
      if (mounted.current && activeOwnerId.current === expectedOwner) { setRecoveryReadyOwner(expectedOwner); setAuthError(null); }
      return resumed;
    }).catch((error: unknown) => {
      if (mounted.current && activeOwnerId.current === expectedOwner) {
        setAuthError(error instanceof Error ? error.message : 'Pending account recovery could not finish.');
      }
      throw error;
    });
    const attempt = { ownerId: expectedOwner, promise };
    recoveryAttempt.current = attempt;
    void promise.finally(() => { if (recoveryAttempt.current === attempt) recoveryAttempt.current = null; }).catch(() => undefined);
    return promise;
  }, [client]);
  const runRecovery = useCallback(async <T,>(expectedOwner: string, action: () => Promise<T>): Promise<T> => {
    if (!mounted.current || activeOwnerId.current !== expectedOwner || recoveryWorkOwner.current !== null) throw new Error('Account changed or recovery is already applying.');
    recoveryWorkOwner.current = expectedOwner;
    setRecoveryBusyOwner(expectedOwner);
    try { return await action(); }
    catch (error) {
      if (mounted.current && activeOwnerId.current === expectedOwner && error && typeof error === 'object' && 'pendingRecovery' in error && error.pendingRecovery === true) {
        setRecoveryReadyOwner(null);
        setAuthError('Confirmed recovery is pending. Retry recovery before editing or syncing.');
      }
      throw error;
    } finally {
      if (mounted.current && recoveryWorkOwner.current === expectedOwner) {
        recoveryWorkOwner.current = null;
        setRecoveryBusyOwner(null);
      }
    }
  }, []);
  useEffect(() => {
    if (!client || !ownerId) return;
    void retryPendingRecovery().catch(() => undefined);
  }, [client, ownerId, retryPendingRecovery]);

  useEffect(() => {
    if (!client || !ownerId || recoveryReadyOwner !== ownerId) return;
    return registerMobileSnapshotOutboxReplay(client, ownerId, {
      onError: (error) => {
        setSyncNotice({
          id: ++nextSyncNoticeId.current,
          kind: 'waiting',
          message: `Queued account sync is still waiting. ${error.message}`,
          ownerId,
        });
      },
      onSuccess: (result) => {
        setSyncNotice({
          id: ++nextSyncNoticeId.current,
          kind: 'synced',
          message: result.sent === 1
            ? 'Queued snapshot synced to your private account.'
            : `${result.sent} queued snapshots synced to your private account.`,
          ownerId,
        });
      },
    });
  }, [client, ownerId, recoveryReadyOwner]);

  const value = useMemo<MobileAuthContextValue>(() => ({
    authError,
    authReady: status !== 'initializing' && (!ownerId || recoveryReadyOwner === ownerId),
    client,
    consumeSyncNotice,
    ownerId,
    session,
    status,
    syncNotice,
    recoveryBusy: recoveryBusyOwner === ownerId && ownerId !== null,
    isRecoveryBusy, retryPendingRecovery, runRecovery,
  }), [authError, client, consumeSyncNotice, ownerId, recoveryReadyOwner, session, status, syncNotice,
    recoveryBusyOwner, isRecoveryBusy, retryPendingRecovery, runRecovery]);

  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuth(): MobileAuthContextValue {
  const context = useContext(MobileAuthContext);
  if (!context) throw new Error('useMobileAuth must be used within MobileAuthProvider');
  return context;
}
