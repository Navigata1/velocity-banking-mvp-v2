import * as Crypto from 'expo-crypto';
import { createMobileAuthStorage, type AsyncAuthStorage } from './auth-storage';

const INSTALL_SYNC_KEY = 'interestshield.mobile.sync-install.v1';

export async function getOrCreateMobileSyncIdempotencyKey(
  storage: AsyncAuthStorage = createMobileAuthStorage(),
  createId: () => string = Crypto.randomUUID
): Promise<string> {
  const existing = await storage.getItem(INSTALL_SYNC_KEY);
  if (existing) return existing;
  const created = `mobile-install:${createId()}`;
  await storage.setItem(INSTALL_SYNC_KEY, created);
  return created;
}
