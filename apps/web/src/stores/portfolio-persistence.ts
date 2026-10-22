import { decodePortfolioDocument, encodePortfolioDocument, type PortfolioBook } from '@interestshield/financial-engine/portfolio-book';

export const LEGACY_PORTFOLIO_KEY = 'interestshield-portfolio-v1';
export const CANONICAL_PORTFOLIO_KEY = 'interestshield-portfolio-v2';
export const TERMS_PORTFOLIO_KEY = 'interestshield-portfolio-v3';
export const DATED_PORTFOLIO_KEY = 'interestshield-portfolio-v4';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PortfolioPersistenceStatus {
  readonly status: 'ready' | 'unavailable' | 'error';
  readonly error: string | null;
}

export interface PortfolioPersistence {
  getItem(logicalKey: string): { state: PortfolioBook; version: 2 } | null;
  setItem(logicalKey: string, value: { state: PortfolioBook; version: number }, documentVersion?: 3 | 4): void;
  getDocumentVersion(): 2 | 3 | 4 | null;
  canWrite(): boolean;
  removeItem(logicalKey: string): void;
  getStatus(): PortfolioPersistenceStatus;
  subscribe(listener: () => void): () => void;
}

const unavailableMessage = 'Portfolio storage is unavailable in this environment.';

function errorDetail(cause: unknown): string {
  try {
    if (typeof cause === 'string' && cause.trim()) return cause;
    if (cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string' && cause.message.trim()) {
      return cause.message;
    }
  } catch { /* An unreadable error must not escape a synchronous storage event. */ }
  return 'The storage operation could not complete.';
}

function decodeStoredDocument(raw: string, version: 1 | 2 | 3 | 4): PortfolioBook {
  const document: unknown = JSON.parse(raw);
  if (!document || typeof document !== 'object' || Array.isArray(document)
    || !('version' in document) || document.version !== version) {
    throw new Error(`Saved Portfolio at this physical key requires version ${version}.`);
  }
  return decodePortfolioDocument(raw);
}

function readStoredPortfolio(port: Pick<StorageLike, 'getItem'>): { state: PortfolioBook; documentVersion: 1 | 2 | 3 | 4; raw: string } | null {
  const dated = port.getItem(DATED_PORTFOLIO_KEY);
  if (dated !== null) return { state: decodeStoredDocument(dated, 4), documentVersion: 4, raw: dated };
  const terms = port.getItem(TERMS_PORTFOLIO_KEY);
  if (terms !== null) return { state: decodeStoredDocument(terms, 3), documentVersion: 3, raw: terms };
  const primary = port.getItem(CANONICAL_PORTFOLIO_KEY);
  if (primary !== null) return { state: decodeStoredDocument(primary, 2), documentVersion: 2, raw: primary };
  const legacy = port.getItem(LEGACY_PORTFOLIO_KEY);
  return legacy === null ? null : { state: decodeStoredDocument(legacy, 1), documentVersion: 1, raw: legacy };
}

export function readPortfolioSnapshotDocument(storage: Pick<StorageLike, 'getItem'>): string | null {
  const stored = readStoredPortfolio(storage);
  return stored ? encodePortfolioDocument(stored.state, stored.documentVersion === 1 ? 2 : stored.documentVersion) : null;
}

export function createPortfolioPersistence(storage: StorageLike | null): PortfolioPersistence {
  let snapshot: PortfolioPersistenceStatus = Object.freeze({
    status: storage === null ? 'unavailable' : 'ready',
    error: storage === null ? unavailableMessage : null,
  });
  const listeners = new Set<() => void>();
  // Recreate the adapter after an explicit repair/reset; automatic writes cannot clear this latch.
  let writesBlocked = false;
  let observed: Pick<NonNullable<ReturnType<typeof readStoredPortfolio>>, 'raw' | 'documentVersion'> | null | undefined;
  const remember = (stored: ReturnType<typeof readStoredPortfolio>) => {
    observed = stored === null ? null : { raw: stored.raw, documentVersion: stored.documentVersion };
  };
  function checkObserved(stored: ReturnType<typeof readStoredPortfolio>) {
    if (observed === undefined) { remember(stored); return; }
    if (observed === null ? stored === null : stored !== null && observed.raw === stored.raw && observed.documentVersion === stored.documentVersion) return;
    throw new Error('Saved Portfolio changed in another tab. Reload the saved Portfolio before editing or importing.');
  }

  function publish(status: PortfolioPersistenceStatus['status'], error: string | null) {
    if (snapshot.status === status && snapshot.error === error) return;
    snapshot = Object.freeze({ status, error });
    for (const listener of [...listeners]) {
      try { listener(); }
      catch { /* One subscriber cannot turn a durable operation into an event-handler exception. */ }
    }
  }
  function fail(message: string, blockWrites = false) {
    if (blockWrites) writesBlocked = true;
    publish('error', message);
  }
  function supported(logicalKey: string): boolean {
    if (logicalKey === LEGACY_PORTFOLIO_KEY) return true;
    fail('Unsupported Portfolio logical key.');
    return false;
  }
  function available(): boolean {
    if (storage !== null) return true;
    publish('unavailable', unavailableMessage);
    return false;
  }

  return {
    canWrite: () => storage !== null && !writesBlocked,
    getItem(logicalKey) {
      if (!supported(logicalKey) || !available() || !storage || writesBlocked) return null;
      try {
        const stored = readStoredPortfolio(storage);
        remember(stored);
        // A successful read of older bytes is not proof that a failed write was saved.
        return stored ? { state: stored.state, version: 2 } : null;
      } catch (cause) {
        fail(`Saved Portfolio could not be read: ${errorDetail(cause)}`, true);
        return null;
      }
    },
    getDocumentVersion() {
      if (!available() || !storage || writesBlocked) return null;
      try {
        const stored = readStoredPortfolio(storage);
        checkObserved(stored);
        return stored ? (stored.documentVersion === 1 ? 2 : stored.documentVersion) : null;
      } catch (cause) {
        fail(`Saved Portfolio could not be read: ${errorDetail(cause)}`, true);
        return null;
      }
    },
    setItem(logicalKey, value, documentVersion) {
      if (!supported(logicalKey) || !available() || !storage || writesBlocked) return;
      let document: string;
      try {
        if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 2
          || Object.keys(value).some(key => key !== 'state' && key !== 'version')) {
          throw new Error('Portfolio writes require a version 2 state wrapper.');
        }
        if (documentVersion !== undefined && documentVersion !== 3 && documentVersion !== 4) {
          throw new Error('Explicit Portfolio document version must be 3 or 4.');
        }
        document = encodePortfolioDocument(value.state, documentVersion);
      } catch (cause) {
        fail(`Portfolio was not saved: ${errorDetail(cause)}`);
        return;
      }
      let stored: ReturnType<typeof readStoredPortfolio>;
      try {
        stored = readStoredPortfolio(storage);
        checkObserved(stored);
      } catch (cause) {
        fail(`Saved Portfolio could not be read before saving: ${errorDetail(cause)}`, true);
        return;
      }
      try {
        const targetVersion = stored?.documentVersion === 4 || documentVersion === 4 || value.state.datedPlan !== undefined ? 4
          : stored?.documentVersion === 3 || documentVersion === 3 || value.state.loc.lenderTerms !== undefined ? 3 : 2;
        document = encodePortfolioDocument(value.state, targetVersion);
        if (stored?.documentVersion !== targetVersion || encodePortfolioDocument(stored.state, targetVersion) !== document) {
          storage.setItem(targetVersion === 4 ? DATED_PORTFOLIO_KEY : targetVersion === 3 ? TERMS_PORTFOLIO_KEY : CANONICAL_PORTFOLIO_KEY, document);
          observed = { raw: document, documentVersion: targetVersion };
        }
        publish('ready', null);
      } catch (cause) {
        fail(`Portfolio was not saved: ${errorDetail(cause)}`);
      }
    },
    removeItem(logicalKey) {
      if (!supported(logicalKey) || !available() || !storage) return;
      try {
        storage.removeItem(storage.getItem(DATED_PORTFOLIO_KEY) !== null ? DATED_PORTFOLIO_KEY
          : storage.getItem(TERMS_PORTFOLIO_KEY) !== null ? TERMS_PORTFOLIO_KEY : CANONICAL_PORTFOLIO_KEY);
        if (!writesBlocked) observed = undefined;
        if (!writesBlocked) publish('ready', null);
      } catch (cause) {
        fail(`Portfolio canonical data was not removed: ${errorDetail(cause)}`);
      }
    },
    getStatus: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
