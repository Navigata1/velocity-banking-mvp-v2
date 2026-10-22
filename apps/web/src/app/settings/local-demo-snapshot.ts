import { LOCAL_DEMO_STORAGE_KEYS, type StorageLike } from './local-data-reset';
import { CANONICAL_PORTFOLIO_KEY, LEGACY_PORTFOLIO_KEY, TERMS_PORTFOLIO_KEY, DATED_PORTFOLIO_KEY, readPortfolioSnapshotDocument } from '@/stores/portfolio-persistence';
import { decodePortfolioDocument, encodePortfolioDocument } from '@interestshield/financial-engine/portfolio-book';
import { assertLegacyScenarioDocument } from '@/stores/legacy-scenario-storage';
import { BACKEND_HANDOFF_TARGETS } from './backend-readiness';
import {
  buildBackendMigrationContract,
  validateBackendMigrationContract,
  type BackendMigrationContract,
} from './backend-migration-contract';

export const LOCAL_DEMO_SNAPSHOT_VERSION = 1;

type LocalDemoStorageKey = typeof LOCAL_DEMO_STORAGE_KEYS[number];

interface LocalDemoSnapshotEntry {
  key: LocalDemoStorageKey;
  value: string;
}

interface LocalDemoSnapshotPayload {
  backendMigrationContract?: Partial<BackendMigrationContract>;
  backendTargets?: readonly string[];
  exportedAt?: string;
  mode?: string;
  storage?: LocalDemoSnapshotEntry[];
  version?: number;
}

function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function isKnownStorageKey(value: unknown): value is LocalDemoStorageKey {
  return typeof value === 'string' && (LOCAL_DEMO_STORAGE_KEYS as readonly string[]).includes(value);
}

function readSnapshotEntries(storage: StorageLike): LocalDemoSnapshotEntry[] {
  return LOCAL_DEMO_STORAGE_KEYS.flatMap((key) => {
    const value = key === LEGACY_PORTFOLIO_KEY ? readPortfolioSnapshotDocument(storage) : storage.getItem(key);
    if (key === 'velocity-bank-storage' && value !== null) assertLegacyScenarioDocument(value);
    return value == null ? [] : [{ key, value }];
  });
}

function parsePayload(json: string): LocalDemoSnapshotPayload {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Snapshot JSON must be an object.');
  }

  return parsed as LocalDemoSnapshotPayload;
}

export function exportLocalDemoSnapshot(storage: StorageLike | null = browserStorage()):
  | { ok: true; count: number; json: string }
  | { ok: false; error: string } {
  if (!storage) return { ok: false, error: 'Browser storage is unavailable.' };

  try {
    const payload = {
      version: LOCAL_DEMO_SNAPSHOT_VERSION,
      exportedAt: new Date().toISOString(),
      mode: 'local-demo',
      backendTargets: BACKEND_HANDOFF_TARGETS,
      backendMigrationContract: buildBackendMigrationContract(),
      storage: readSnapshotEntries(storage),
    };

    return {
      ok: true,
      count: payload.storage.length,
      json: JSON.stringify(payload, null, 2),
    };
  } catch (error) {
    return { ok: false, error: error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message : 'Snapshot data could not be read.' };
  }
}

export function importLocalDemoSnapshot(
  json: string,
  storage: StorageLike | null = browserStorage()
): { ok: true; imported: number } | { ok: false; error: string } {
  if (!storage) return { ok: false, error: 'Browser storage is unavailable.' };

  try {
    const payload = parsePayload(json);
    if (payload.version !== LOCAL_DEMO_SNAPSHOT_VERSION) {
      return { ok: false, error: 'Unsupported snapshot version.' };
    }

    if (!Array.isArray(payload.storage)) {
      return { ok: false, error: 'Snapshot storage entries are missing.' };
    }

    if (payload.backendMigrationContract) {
      const contract = validateBackendMigrationContract(payload.backendMigrationContract);
      if (!contract.ok) return contract;
    }

    const entries = payload.storage.map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new Error('Snapshot storage entry is invalid.');
      }

      if (!isKnownStorageKey(entry.key)) {
        throw new Error('Snapshot contains an unknown storage key.');
      }

      if (typeof entry.value !== 'string') {
        throw new Error('Snapshot storage value is invalid.');
      }
      if (entry.key === 'velocity-bank-storage') assertLegacyScenarioDocument(entry.value);

      if (entry.key !== LEGACY_PORTFOLIO_KEY) return entry;
      const book = decodePortfolioDocument(entry.value);
      const version = JSON.parse(entry.value).version;
      return { ...entry, value: encodePortfolioDocument(book, version === 3 || version === 4 ? version : undefined) };
    });
    if (new Set(entries.map(entry => entry.key)).size !== entries.length) throw new Error('Snapshot contains duplicate storage keys.');
    const portfolio = entries.find(entry => entry.key === LEGACY_PORTFOLIO_KEY);
    let portfolioKey = CANONICAL_PORTFOLIO_KEY;
    if (portfolio) {
      const dated = storage.getItem(DATED_PORTFOLIO_KEY);
      const active = dated === null ? storage.getItem(TERMS_PORTFOLIO_KEY) : null;
      if (dated !== null || active !== null) readPortfolioSnapshotDocument(storage);
      else {
        // Historical explicit restore may retain malformed old archives, but cannot hide new semantic data.
        const raw = storage.getItem(CANONICAL_PORTFOLIO_KEY) ?? storage.getItem(LEGACY_PORTFOLIO_KEY);
        let previous: unknown;
        try { previous = raw === null ? null : JSON.parse(raw); } catch { previous = null; }
        if (previous && typeof previous === 'object') {
          const document = previous as { data?: unknown; state?: unknown };
          if ([document.data, document.state, document].some(data => data && typeof data === 'object' && ('datedPlan' in data
            || 'loc' in data && data.loc && typeof data.loc === 'object' && 'lenderTerms' in data.loc))) {
            throw new Error('Unsupported dated or lender data in an older Portfolio channel needs review before restore.');
          }
        }
      }
      const version = JSON.parse(portfolio.value).version;
      if (dated !== null || version === 4) {
        portfolioKey = DATED_PORTFOLIO_KEY;
        portfolio.value = encodePortfolioDocument(decodePortfolioDocument(portfolio.value), 4);
      } else if (active !== null || version === 3) {
        portfolioKey = TERMS_PORTFOLIO_KEY;
        portfolio.value = encodePortfolioDocument(decodePortfolioDocument(portfolio.value), 3);
      }
    }
    const bookOnly = entries.length === 1 && portfolio !== undefined;
    const replacedKeys = LOCAL_DEMO_STORAGE_KEYS.filter(key => key !== LEGACY_PORTFOLIO_KEY
      && (!bookOnly || key !== 'velocity-bank-storage'));
    if (replacedKeys.includes('velocity-bank-storage')) {
      const scenario = storage.getItem('velocity-bank-storage');
      if (scenario !== null) assertLegacyScenarioDocument(scenario);
    }
    const physicalKeys = [...replacedKeys, ...(portfolio ? [portfolioKey] : [])];
    const before = physicalKeys.map(key => ({ key, value: storage.getItem(key) }));
    try {
      if (portfolio) storage.setItem(portfolioKey, portfolio.value);
      for (const key of replacedKeys) storage.removeItem(key);
      for (const entry of entries) if (entry.key !== LEGACY_PORTFOLIO_KEY) storage.setItem(entry.key, entry.value);
    } catch (error) {
      let incomplete = false;
      for (const entry of before) {
        try { if (entry.value === null) storage.removeItem(entry.key); else storage.setItem(entry.key, entry.value); }
        catch { incomplete = true; }
      }
      if (incomplete) throw new Error('Snapshot import was interrupted and rollback could not finish. Keep the original backup; browser storage needs repair.');
      throw error;
    }

    return { ok: true, imported: entries.length };
  } catch (error) {
    return {
      ok: false,
      error: error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Failed to import snapshot JSON.',
    };
  }
}
