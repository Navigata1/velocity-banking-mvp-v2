import {
  INTERESTSHIELD_STORAGE_KEYS,
  type SnapshotStorageEntry,
} from '@interestshield/persistence-contract';

const INSTALL_SYNC_KEY = 'interestshield.web.sync-install.v1';

export interface BrowserSyncStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function getOrCreateBrowserSyncIdempotencyKey(
  storage: BrowserSyncStorage,
  createId: () => string = crypto.randomUUID
): string {
  const existing = storage.getItem(INSTALL_SYNC_KEY);
  if (existing) return existing;
  const created = `web-install:${createId()}`;
  storage.setItem(INSTALL_SYNC_KEY, created);
  return created;
}

export function collectBrowserSnapshotStorage(storage: BrowserSyncStorage): SnapshotStorageEntry[] {
  return INTERESTSHIELD_STORAGE_KEYS.flatMap((key) => {
    if (key === 'interestshield-mobile-assumptions-v1') return [];
    const value = storage.getItem(key);
    return value === null ? [] : [{ key, value }];
  });
}
