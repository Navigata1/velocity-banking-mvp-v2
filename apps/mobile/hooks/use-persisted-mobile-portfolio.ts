import { decodePortfolioBook, encodePortfolioDocument } from '@interestshield/financial-engine/portfolio-book';
import type { DatedPortfolioPlan } from '@interestshield/financial-engine/dated-plan';
import { useCallback, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
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
  const setDatedPlan = useCallback(async (plan: DatedPortfolioPlan | null) => {
    const current = session.getSnapshot();
    if (activeSession.current !== session || !current.isHydrated || current.status !== 'saved'
      || current.book === null || current.backend === 'unavailable') {
      throw new Error('Wait for the active Portfolio to finish saving before changing its dated plan.');
    }
    const candidate = { ...current.book };
    if (plan === null) delete candidate.datedPlan;
    else candidate.datedPlan = plan;
    // Validate and detach before replacement can enter an asynchronous owner queue.
    const book = decodePortfolioBook(candidate);
    const documentVersion = plan !== null || current.documentVersion === 4 ? 4 : current.documentVersion;
    if (encodePortfolioDocument(book, documentVersion) === encodePortfolioDocument(current.book, current.documentVersion)) return current.backend;
    return session.replace(book, undefined, current.revision, documentVersion);
  }, [session]);
  return { ...state, storageScope: session.storageScope, create: session.create, update: session.update,
    replace: session.replace, flush: session.flush, reload: session.hydrate, setDatedPlan };
}
