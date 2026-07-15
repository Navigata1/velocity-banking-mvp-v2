export const SNAPSHOT_SYNC_CONTRACT_VERSION = 1 as const;
export const SNAPSHOT_REVISION_MAX = Number.MAX_SAFE_INTEGER;
export const SNAPSHOT_REVISION_CONFLICT_CODES = {
  gap: 'IS002',
  stale: 'IS001',
} as const;

export type SnapshotRevisionConflictKind = keyof typeof SNAPSHOT_REVISION_CONFLICT_CODES;

export class SnapshotRevisionConflictError extends Error {
  readonly code: string;
  readonly details?: string;
  readonly kind: SnapshotRevisionConflictKind;

  constructor(kind: SnapshotRevisionConflictKind, message?: string, details?: string) {
    super(message ?? `Snapshot sync stopped because its ${kind} revision needs recovery.`);
    this.name = 'SnapshotRevisionConflictError';
    this.code = SNAPSHOT_REVISION_CONFLICT_CODES[kind];
    this.details = details;
    this.kind = kind;
  }
}

export function asSnapshotRevisionConflict(error: unknown): SnapshotRevisionConflictError | null {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  const code = typeof error.code === 'string' ? error.code : '';
  const kind = (Object.entries(SNAPSHOT_REVISION_CONFLICT_CODES) as Array<[
    SnapshotRevisionConflictKind,
    string,
  ]>).find(([, candidate]) => candidate === code)?.[0];
  if (!kind) return null;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : undefined;
  const details = 'details' in error && typeof error.details === 'string' ? error.details : undefined;
  return new SnapshotRevisionConflictError(kind, message, details);
}

export function isSafeSnapshotRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

export const INTERESTSHIELD_STORAGE_KEYS = [
  'velocity-bank-storage',
  'interestshield-portfolio-v1',
  'interestshield-learn-progress',
  'interestshield-preferences-v1',
  'interestshield-theme',
  'interestshield-app-v1',
  'interestshield-mobile-assumptions-v1',
] as const;

export type InterestShieldStorageKey = typeof INTERESTSHIELD_STORAGE_KEYS[number];

export interface SnapshotStorageEntry {
  key: InterestShieldStorageKey;
  value: string;
}

export interface SnapshotSyncInput {
  ownerId: string;
  idempotencyKey: string;
  displayName?: string;
  syncedAt?: string;
  storage: SnapshotStorageEntry[];
}

export interface SnapshotSyncPlan {
  version: typeof SNAPSHOT_SYNC_CONTRACT_VERSION;
  profile: {
    table: 'profiles';
    onConflict: 'id';
    row: {
      id: string;
      display_name: string | null;
      onboarding_status: 'active';
      updated_at: string;
    };
  };
  snapshot: {
    table: 'financial_snapshots';
    onConflict: 'owner_id,idempotency_key';
    row: {
      owner_id: string;
      idempotency_key: string;
      snapshot_version: typeof SNAPSHOT_SYNC_CONTRACT_VERSION;
      source: 'local-demo-handoff';
      assumptions_json: {
        contract_version: typeof SNAPSHOT_SYNC_CONTRACT_VERSION;
        storage: SnapshotStorageEntry[];
      };
      updated_at: string;
    };
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

function normalizeTimestamp(value: string | undefined): string {
  if (value === undefined) return new Date().toISOString();
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) throw new Error('Snapshot sync timestamp is invalid.');
  return timestamp.toISOString();
}

function normalizeStorage(entries: SnapshotStorageEntry[]): SnapshotStorageEntry[] {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Snapshot sync requires at least one storage entry.');
  }

  const knownKeys = new Set<string>(INTERESTSHIELD_STORAGE_KEYS);
  const seenKeys = new Set<string>();
  const normalized = entries.map((entry) => {
    if (!entry || typeof entry !== 'object' || !knownKeys.has(entry.key)) {
      throw new Error('Snapshot sync contains an unknown storage key.');
    }
    if (seenKeys.has(entry.key)) throw new Error('Snapshot sync contains a duplicate storage key.');
    if (typeof entry.value !== 'string') throw new Error('Snapshot sync storage value must be a string.');
    seenKeys.add(entry.key);
    return { key: entry.key, value: entry.value };
  });

  return normalized.sort((left, right) => left.key.localeCompare(right.key));
}

export function buildSnapshotSyncPlan(input: SnapshotSyncInput): SnapshotSyncPlan {
  if (!input || typeof input !== 'object') throw new Error('Snapshot sync input is missing.');
  if (!UUID_PATTERN.test(input.ownerId)) throw new Error('Snapshot sync owner id must be a UUID.');
  if (!IDEMPOTENCY_KEY_PATTERN.test(input.idempotencyKey)) {
    throw new Error('Snapshot sync idempotency key must be 16-128 URL-safe characters.');
  }

  const updatedAt = normalizeTimestamp(input.syncedAt);
  const storage = normalizeStorage(input.storage);
  const displayName = typeof input.displayName === 'string' && input.displayName.trim()
    ? input.displayName.trim().slice(0, 120)
    : null;

  return {
    version: SNAPSHOT_SYNC_CONTRACT_VERSION,
    profile: {
      table: 'profiles',
      onConflict: 'id',
      row: {
        id: input.ownerId,
        display_name: displayName,
        onboarding_status: 'active',
        updated_at: updatedAt,
      },
    },
    snapshot: {
      table: 'financial_snapshots',
      onConflict: 'owner_id,idempotency_key',
      row: {
        owner_id: input.ownerId,
        idempotency_key: input.idempotencyKey,
        snapshot_version: SNAPSHOT_SYNC_CONTRACT_VERSION,
        source: 'local-demo-handoff',
        assumptions_json: {
          contract_version: SNAPSHOT_SYNC_CONTRACT_VERSION,
          storage,
        },
        updated_at: updatedAt,
      },
    },
  };
}
