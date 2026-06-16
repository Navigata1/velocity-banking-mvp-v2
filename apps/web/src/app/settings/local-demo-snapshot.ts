import { LOCAL_DEMO_STORAGE_KEYS, type StorageLike } from './local-data-reset';

export const LOCAL_DEMO_SNAPSHOT_VERSION = 1;
export const BACKEND_HANDOFF_TARGETS = [
  'supabase-postgres-auth-rls',
  'cloudflare-workers-d1-durable-objects',
] as const;

type LocalDemoStorageKey = typeof LOCAL_DEMO_STORAGE_KEYS[number];

interface LocalDemoSnapshotEntry {
  key: LocalDemoStorageKey;
  value: string;
}

interface LocalDemoSnapshotPayload {
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
    const value = storage.getItem(key);
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

  const payload = {
    version: LOCAL_DEMO_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    mode: 'local-demo',
    backendTargets: BACKEND_HANDOFF_TARGETS,
    storage: readSnapshotEntries(storage),
  };

  return {
    ok: true,
    count: payload.storage.length,
    json: JSON.stringify(payload, null, 2),
  };
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

      return entry;
    });

    for (const key of LOCAL_DEMO_STORAGE_KEYS) {
      storage.removeItem(key);
    }

    for (const entry of entries) {
      storage.setItem(entry.key, entry.value);
    }

    return { ok: true, imported: entries.length };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to import snapshot JSON.',
    };
  }
}
