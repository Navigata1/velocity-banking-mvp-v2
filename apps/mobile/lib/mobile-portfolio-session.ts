import { decodePortfolioBook, encodePortfolioDocument, type PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import { loadMobilePortfolioForOwner, mobilePortfolioStorageKey, saveMobilePortfolioForOwner } from './mobile-portfolio-storage';
import type { MobileAssumptionStorageBackend } from './mobile-assumption-storage';
import { isMobileSnapshotOwnerLock, type MobileSnapshotOwnerLock } from './supabase/auth-storage';

type Status = 'loading' | 'empty' | 'saved' | 'saving' | 'replacing' | 'error' | 'unavailable';
type DurableBackend = Exclude<MobileAssumptionStorageBackend, 'unavailable'>;
export interface MobilePortfolioSessionState {
  readonly book: PortfolioBook | null;
  readonly backend: MobileAssumptionStorageBackend;
  readonly revision: number;
  readonly status: Status;
  readonly isHydrated: boolean;
  readonly error: string | null;
  readonly documentVersion?: 3 | 4;
}
interface Dependencies {
  load: typeof loadMobilePortfolioForOwner;
  save: typeof saveMobilePortfolioForOwner;
  isCurrent: () => boolean;
}
export interface MobilePortfolioSession {
  readonly storageScope: string;
  getSnapshot: () => MobilePortfolioSessionState;
  subscribe: (listener: () => void) => () => void;
  hydrate: () => Promise<void>;
  deactivate: () => void;
  create: (book: PortfolioBook) => Promise<DurableBackend>;
  update: (change: (book: PortfolioBook) => PortfolioBook) => Promise<DurableBackend>;
  replace: (book: PortfolioBook, ownerLock?: MobileSnapshotOwnerLock, expectedRevision?: number, documentVersion?: 3 | 4) => Promise<DurableBackend>;
  flush: () => Promise<void>;
}
function initialState(): MobilePortfolioSessionState {
  return Object.freeze({ book: null, backend: 'unavailable', revision: 0, status: 'loading', isHydrated: false, error: null });
}
function frozenBook(value: PortfolioBook): PortfolioBook {
  const book = decodePortfolioBook(value);
  if (book.datedPlan) {
    for (const event of book.datedPlan.cashEvents) Object.freeze(event);
    Object.freeze(book.datedPlan.cashEvents);
    Object.freeze(book.datedPlan);
  }
  if (book.loc.lenderTerms) {
    if (book.loc.lenderTerms.minimumPayment) Object.freeze(book.loc.lenderTerms.minimumPayment);
    if (book.loc.lenderTerms.sources) Object.freeze(book.loc.lenderTerms.sources);
    Object.freeze(book.loc.lenderTerms);
  }
  Object.freeze(book.loc);
  for (const debt of book.debts) {
    Object.freeze(debt.minPaymentRule);
    if (debt.promo) Object.freeze(debt.promo);
    Object.freeze(debt);
  }
  Object.freeze(book.debts);
  return Object.freeze(book);
}
function message(error: unknown): string {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message : 'Portfolio persistence could not finish.';
}

export function createMobilePortfolioSession(ownerId: string | null, overrides: Partial<Dependencies> = {}): MobilePortfolioSession {
  const storageScope = mobilePortfolioStorageKey(ownerId);
  const owner = ownerId?.toLowerCase() ?? null;
  const { load, save, isCurrent } = { load: loadMobilePortfolioForOwner, save: saveMobilePortfolioForOwner, isCurrent: () => true, ...overrides };
  let state = initialState(), active = false, epoch = 0, revision = 0, pending = 0;
  let queue: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const current = () => active && isCurrent();
  const publish = (patch: Partial<MobilePortfolioSessionState>) => {
    if (!current()) return;
    const next = { ...state, ...patch };
    if (next.documentVersion === undefined) delete next.documentVersion;
    state = Object.freeze(next);
    for (const listener of listeners) listener();
  };
  const assertCurrent = () => { if (!current()) throw new Error('Portfolio session changed or is inactive.'); };
  const assertEditable = () => {
    assertCurrent();
    if (!state.isHydrated || ['error','unavailable','replacing'].includes(state.status)) throw new Error(state.error ?? 'Portfolio is still loading or replacing saved data.');
  };
  const assertOperation = (version: number) => {
    assertCurrent();
    if (epoch !== version) throw new Error('Portfolio operation was cancelled by a newer load or restore.');
  };
  const fail = (error: unknown, version: number) => {
    if (!current() || epoch !== version) return;
    epoch++;
    pending = 0;
    publish({ status: 'error', error: message(error) });
  };
  function enqueue(book: PortfolioBook): Promise<DurableBackend> {
    const candidate = frozenBook(book), version = epoch;
    pending++;
    const operation = queue.then(async () => {
      assertOperation(version);
      const result = await save(owner, candidate, { expectedRevision: revision });
      revision = Math.max(revision, result.revision);
      assertOperation(version);
      pending--;
      publish({ revision, documentVersion: result.documentVersion, backend: result.backend, status: pending ? 'saving' : 'saved', error: null });
      return result.backend;
    }).catch(error => { fail(error, version); throw error; });
    queue = operation.then(() => undefined, () => undefined);
    publish({ book: candidate, status: 'saving', error: null });
    return operation;
  }
  return {
    storageScope,
    getSnapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async hydrate() {
      if (!isCurrent()) return;
      active = true;
      const version = ++epoch;
      pending = 0;
      publish({ ...initialState(), documentVersion: undefined });
      try {
        await queue;
        assertOperation(version);
        const result = await load(owner);
        if (!current() || epoch !== version) return;
        if (result.backend === 'unavailable') { publish({ status: 'unavailable', error: 'Portfolio persistence is unavailable.' }); return; }
        if (!Number.isSafeInteger(result.revision) || result.revision < 0) throw new Error('Portfolio revision is invalid.');
        revision = result.revision;
        publish({ book: result.book === null ? null : frozenBook(result.book), revision, documentVersion: result.documentVersion, backend: result.backend,
          status: result.book === null ? 'empty' : 'saved', isHydrated: true, error: null });
      } catch (error) {
        if (current() && epoch === version) publish({ status: 'error', isHydrated: false, error: message(error) });
      }
    },
    deactivate() { active = false; epoch++; pending = 0; state = initialState(); listeners.clear(); },
    async create(book) {
      assertEditable();
      if (state.book !== null) throw new Error('A Portfolio already exists for this scope.');
      return enqueue(book);
    },
    async update(change) {
      assertEditable();
      if (state.book === null) throw new Error('Create a Portfolio before editing it.');
      const candidate = decodePortfolioBook(change(decodePortfolioBook(state.book)));
      if (encodePortfolioDocument(candidate) === encodePortfolioDocument(state.book)) {
        const version = epoch;
        await queue;
        assertOperation(version); assertEditable();
        return state.backend as DurableBackend;
      }
      return enqueue(candidate);
    },
    async replace(book, ownerLock, expectedRevision, documentVersion) {
      assertCurrent();
      if (!state.isHydrated) throw new Error('Portfolio is still loading.');
      if (ownerLock && !isMobileSnapshotOwnerLock(ownerLock, owner ?? 'guest')) throw new Error('Portfolio replacement lock is invalid.');
      if (documentVersion !== undefined && documentVersion !== 3 && documentVersion !== 4) throw new Error('Portfolio replacement document version is unsupported.');
      const candidate = frozenBook(book);
      // Reject invalid format requests before cancelling any valid queued work.
      encodePortfolioDocument(candidate, documentVersion);
      const before = queue, version = ++epoch;
      pending = 1;
      publish({ status: 'replacing', error: null });
      const operation = (ownerLock ? Promise.resolve() : before).then(async () => {
        assertOperation(version);
        const result = await save(owner, candidate, { expectedRevision: expectedRevision ?? revision, ownerLock,
          ...(documentVersion === undefined ? {} : { documentVersion }) });
        revision = Math.max(revision, result.revision);
        assertOperation(version); pending = 0;
        publish({ book: candidate, revision, documentVersion: result.documentVersion, backend: result.backend, status: 'saved', error: null });
        return result.backend;
      }).catch(error => { fail(error, version); throw error; });
      // A leased restore cannot await an old save that is waiting for that same lock.
      queue = Promise.allSettled([before, operation]).then(() => undefined);
      return operation;
    },
    async flush() { const version = epoch; await queue; assertOperation(version); assertEditable(); },
  };
}
