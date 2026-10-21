import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { createMobilePortfolioSession, type MobilePortfolioSession } from '@/lib/mobile-portfolio-session';

export function usePersistedMobilePortfolio(ownerId: string | null = null, authReady = true) {
  const activeSession = useRef<MobilePortfolioSession | null>(null);
  const session = useMemo(() => {
    const next = createMobilePortfolioSession(ownerId, { isCurrent: () => activeSession.current === next });
    return next;
  }, [ownerId, authReady]);
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useLayoutEffect(() => {
    if (!authReady) return;
    activeSession.current = session;
    void session.hydrate();
    return () => {
      if (activeSession.current === session) activeSession.current = null;
      session.deactivate();
    };
  }, [session, authReady]);
  return { ...state, storageScope: session.storageScope, create: session.create, update: session.update,
    replace: session.replace, flush: session.flush, reload: session.hydrate };
}
