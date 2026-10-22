import { decodePortfolioDocument, encodePortfolioDocument, type PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { MobileAssumptionStorageBackend } from './mobile-assumption-storage';
import { createChunkedSecureAuthStorage, createWebAuthStorage, isMobileSnapshotOwnerLock,
  withMobileSnapshotOwnerLock, type AsyncAuthStorage, type MobileSnapshotOwnerLock } from './supabase/auth-storage';

export const MOBILE_PORTFOLIO_STORAGE_KEY = 'interestshield.mobile.portfolio.v1';
export const MOBILE_PORTFOLIO_V3_STORAGE_KEY = 'interestshield.mobile.portfolio.v3';
const OWNER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encrypted = createChunkedSecureAuthStorage(SecureStore, undefined, { strictRead: true });
type OwnerId = string | null;
type DurableBackend = Exclude<MobileAssumptionStorageBackend, 'unavailable'>;
export interface MobilePortfolioStorageResult {
  backend: MobileAssumptionStorageBackend;
  book: PortfolioBook | null;
  revision: number;
  documentVersion?: 3;
}
export interface MobilePortfolioSaveOptions {
  expectedRevision: number;
  ownerLock?: MobileSnapshotOwnerLock;
  documentVersion?: 3;
}

function normalizedOwner(ownerId: OwnerId): OwnerId {
  if (ownerId === null) return null;
  if (typeof ownerId !== 'string' || !OWNER_ID_PATTERN.test(ownerId)) throw new Error('Mobile Portfolio owner must be a UUID.');
  return ownerId.toLowerCase();
}

export function mobilePortfolioStorageKey(ownerId: OwnerId): string {
  const owner = normalizedOwner(ownerId);
  return owner === null ? MOBILE_PORTFOLIO_STORAGE_KEY : `${MOBILE_PORTFOLIO_STORAGE_KEY}.owner.${owner}`;
}

function activePortfolioStorageKey(owner: OwnerId): string {
  return owner === null ? MOBILE_PORTFOLIO_V3_STORAGE_KEY : `${MOBILE_PORTFOLIO_V3_STORAGE_KEY}.owner.${owner}`;
}

function withBookLock<T>(owner: OwnerId, lock: MobileSnapshotOwnerLock | undefined, action: () => Promise<T>): Promise<T> {
  const id = owner ?? 'guest';
  if (lock) {
    if (!isMobileSnapshotOwnerLock(lock, id)) return Promise.reject(new Error('Portfolio lock does not match the active owner.'));
    return action();
  }
  return withMobileSnapshotOwnerLock(id, action);
}

async function storagePort(): Promise<{ backend: DurableBackend; storage: AsyncAuthStorage } | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage ? { backend: 'local-storage', storage: createWebAuthStorage(globalThis.localStorage) } : null;
    } catch { return null; }
  }
  try {
    return await SecureStore.isAvailableAsync() ? { backend: 'secure-store', storage: encrypted } : null;
  } catch { return null; }
}

function storedBook(raw: string | null, owner: OwnerId, documentVersion?: 3): { book: PortfolioBook | null; revision: number } {
  if (raw === null) return { book: null, revision: 0 };
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)
      || Object.keys(payload).some(key => !['version','ownerId','revision','savedAt','document'].includes(key))
      || payload.version !== 1 || !Number.isSafeInteger(payload.revision) || (payload.revision as number) < 0
      || typeof payload.savedAt !== 'string' || !Number.isFinite(Date.parse(payload.savedAt))
      || typeof payload.document !== 'string'
      || payload.ownerId !== null && typeof payload.ownerId !== 'string'
      || normalizedOwner(payload.ownerId as OwnerId) !== owner) throw new Error('Invalid saved Portfolio.');
    const innerVersion = JSON.parse(payload.document).version;
    if (documentVersion === 3 ? innerVersion !== 3 : innerVersion !== 1 && innerVersion !== 2) throw new Error('Invalid Portfolio document version for this storage channel.');
    return { book: decodePortfolioDocument(payload.document), revision: payload.revision as number };
  } catch {
    throw new Error('Saved Portfolio is unreadable or belongs to another owner. Existing data was not replaced.');
  }
}

async function currentPortfolio(storage: AsyncAuthStorage, owner: OwnerId) {
  const key = activePortfolioStorageKey(owner), raw = await storage.getItem(key);
  // A present active channel is authoritative, even if its contents cannot decode.
  if (raw !== null) return { ...storedBook(raw, owner, 3), active: true, key };
  const legacyKey = mobilePortfolioStorageKey(owner);
  return { ...storedBook(await storage.getItem(legacyKey), owner), active: false, key: legacyKey };
}

export async function loadMobilePortfolioForOwner(ownerId: OwnerId, ownerLock?: MobileSnapshotOwnerLock): Promise<MobilePortfolioStorageResult> {
  const owner = normalizedOwner(ownerId);
  return withBookLock(owner, ownerLock, async () => {
    const port = await storagePort();
    if (!port) return { backend: 'unavailable', book: null, revision: 0 };
    const { book, revision, active } = await currentPortfolio(port.storage, owner);
    return { backend: port.backend, book, revision, ...(active ? { documentVersion: 3 as const } : {}) };
  });
}

export async function saveMobilePortfolioForOwner(ownerId: OwnerId, book: PortfolioBook, options: MobilePortfolioSaveOptions): Promise<{ backend: DurableBackend; revision: number; documentVersion?: 3 }> {
  const owner = normalizedOwner(ownerId);
  const expectedRevision = options?.expectedRevision;
  const ownerLock = options?.ownerLock;
  const documentVersion = options?.documentVersion;
  if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error('Portfolio save requires a safe expected revision.');
  if (documentVersion !== undefined && documentVersion !== 3) throw new Error('Portfolio save document version is unsupported.');
  // Freeze the candidate before awaiting an owner queue; callers may keep editing.
  const capturedDocument = encodePortfolioDocument(book, documentVersion);
  const suppliedVersion = (JSON.parse(capturedDocument) as { version: 2 | 3 }).version;
  return withBookLock(owner, ownerLock, async () => {
    const port = await storagePort();
    if (!port) throw new Error('Portfolio persistence is unavailable.');
    const current = await currentPortfolio(port.storage, owner);
    if (current.revision !== expectedRevision) throw new Error('Saved Portfolio changed in another tab. Reload before saving again.');
    const revision = current.revision + 1;
    if (!Number.isSafeInteger(revision)) throw new Error('Portfolio revision limit reached.');
    const active = current.active || suppliedVersion === 3;
    const key = active ? activePortfolioStorageKey(owner) : current.key;
    const document = active && suppliedVersion !== 3
      ? encodePortfolioDocument(decodePortfolioDocument(capturedDocument), 3) : capturedDocument;
    const payload = JSON.stringify({ version: 1, ownerId: owner, revision, savedAt: new Date().toISOString(), document });
    await port.storage.setItem(key, payload);
    return { backend: port.backend, revision, ...(active ? { documentVersion: 3 as const } : {}) };
  });
}
