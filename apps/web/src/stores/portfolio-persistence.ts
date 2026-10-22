import { decodePortfolioDocument, encodePortfolioDocument, type PortfolioBook } from '@interestshield/financial-engine/portfolio-book';

export const LEGACY_PORTFOLIO_KEY = 'interestshield-portfolio-v1';
export const CANONICAL_PORTFOLIO_KEY = 'interestshield-portfolio-v2';
export const TERMS_PORTFOLIO_KEY = 'interestshield-portfolio-v3';

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
  setItem(logicalKey: string, value: { state: PortfolioBook; version: number }, documentVersion?: 3): void;
  getDocumentVersion(): 2 | 3 | null;
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

function decodeStoredDocument(raw: string, version: 1 | 2 | 3): PortfolioBook {
  const document: unknown = JSON.parse(raw);
  if (!document || typeof document !== 'object' || Array.isArray(document)
    || !('version' in document) || document.version !== version) {
    throw new Error(`Saved Portfolio at this physical key requires version ${version}.`);
  }
  return decodePortfolioDocument(raw);
}

function readStoredPortfolio(port: Pick<StorageLike, 'getItem'>): { state: PortfolioBook; documentVersion: 1 | 2 | 3 } | null {
  const terms = port.getItem(TERMS_PORTFOLIO_KEY);
  if (terms !== null) return { state: decodeStoredDocument(terms, 3), documentVersion: 3 };
  const primary = port.getItem(CANONICAL_PORTFOLIO_KEY);
  if (primary !== null) return { state: decodeStoredDocument(primary, 2), documentVersion: 2 };
  const legacy = port.getItem(LEGACY_PORTFOLIO_KEY);
  return legacy === null ? null : { state: decodeStoredDocument(legacy, 1), documentVersion: 1 };
}

export function readPortfolioSnapshotDocument(storage: Pick<StorageLike, 'getItem'>): string | null {
  const stored = readStoredPortfolio(storage);
  return stored ? encodePortfolioDocument(stored.state, stored.documentVersion === 3 ? 3 : 2) : null;
}

export function createPortfolioPersistence(storage: StorageLike | null): PortfolioPersistence {
  let snapshot: PortfolioPersistenceStatus = Object.freeze({
    status: storage === null ? 'unavailable' : 'ready',
    error: storage === null ? unavailableMessage : null,
  });
  const listeners = new Set<() => void>();
  // Recreate the adapter after an explicit repair/reset; automatic writes cannot clear this latch.
  let writesBlocked = false;

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
        return stored ? (stored.documentVersion === 3 ? 3 : 2) : null;
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
        if (documentVersion !== undefined && documentVersion !== 3) {
          throw new Error('Explicit Portfolio document version must be 3.');
        }
        document = encodePortfolioDocument(value.state);
      } catch (cause) {
        fail(`Portfolio was not saved: ${errorDetail(cause)}`);
        return;
      }
      let stored: ReturnType<typeof readStoredPortfolio>;
      try {
        stored = readStoredPortfolio(storage);
      } catch (cause) {
        fail(`Saved Portfolio could not be read before saving: ${errorDetail(cause)}`, true);
        return;
      }
      try {
        const targetVersion = stored?.documentVersion === 3 || documentVersion === 3 || value.state.loc.lenderTerms !== undefined ? 3 : 2;
        if (targetVersion === 3) document = encodePortfolioDocument(value.state, 3);
        if (stored?.documentVersion !== targetVersion || encodePortfolioDocument(stored.state, targetVersion) !== document) {
          storage.setItem(targetVersion === 3 ? TERMS_PORTFOLIO_KEY : CANONICAL_PORTFOLIO_KEY, document);
        }
        publish('ready', null);
      } catch (cause) {
        fail(`Portfolio was not saved: ${errorDetail(cause)}`);
      }
    },
    removeItem(logicalKey) {
      if (!supported(logicalKey) || !available() || !storage) return;
      try {
        storage.removeItem(storage.getItem(TERMS_PORTFOLIO_KEY) !== null ? TERMS_PORTFOLIO_KEY : CANONICAL_PORTFOLIO_KEY);
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
