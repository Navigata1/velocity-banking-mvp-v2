import * as Crypto from 'expo-crypto';
import { createMobileAuthStorage, type AsyncAuthStorage } from './auth-storage';

const INSTALL_SYNC_KEY = 'interestshield.mobile.sync-install.v1';
const defaultSyncStorage = createMobileAuthStorage();
const pendingIdentityByStorage = new WeakMap<AsyncAuthStorage, Promise<string>>();

export function createMobileSyncOperationIdempotencyKey(
  createId: () => string = Crypto.randomUUID
): string {
  return `mobile-operation:${createId()}`;
}

export async function getOrCreateMobileSyncIdempotencyKey(
  storage: AsyncAuthStorage = defaultSyncStorage,
  createId: () => string = Crypto.randomUUID
): Promise<string> {
  const pending = pendingIdentityByStorage.get(storage);
  if (pending) return pending;

  const initialization = (async () => {
    const existing = await storage.getItem(INSTALL_SYNC_KEY);
    if (existing) return existing;
    const created = `mobile-install:${createId()}`;
    await storage.setItem(INSTALL_SYNC_KEY, created);
    return created;
  })();
  pendingIdentityByStorage.set(storage, initialization);

  try {
    return await initialization;
  } finally {
    if (pendingIdentityByStorage.get(storage) === initialization) {
      pendingIdentityByStorage.delete(storage);
    }
  }
}
