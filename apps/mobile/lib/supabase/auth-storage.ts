import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1800;
const MANIFEST_SUFFIX = '.manifest';
const SNAPSHOT_OWNER_LOCK_PREFIX = 'interestshield.mobile.snapshot-owner.';
const ownerLockTokens = new WeakSet<object>();
const nativeOwnerLockQueues = new Map<string, Promise<void>>();

interface SecureStorePort {
  deleteItemAsync(key: string): Promise<void>;
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
}

interface ChunkManifest {
  count: number;
  generation: string;
  version: 1;
}

export interface AsyncAuthStorage {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}

export interface MobileSnapshotOwnerLock {
  readonly ownerId: string;
}

export function isMobileSnapshotOwnerLock(
  value: MobileSnapshotOwnerLock | undefined,
  ownerId: string
): value is MobileSnapshotOwnerLock {
  return !!value && value.ownerId === ownerId && ownerLockTokens.has(value);
}

export function withMobileSnapshotOwnerLock<T>(
  ownerId: string,
  action: (lock: MobileSnapshotOwnerLock) => Promise<T>
): Promise<T> {
  const lock = { ownerId };
  ownerLockTokens.add(lock);
  if (Platform.OS !== 'web') {
    const previous = nativeOwnerLockQueues.get(ownerId) ?? Promise.resolve();
    const operation = previous.catch(() => undefined).then(() => action(lock));
    const tail = operation.then(() => undefined, () => undefined);
    nativeOwnerLockQueues.set(ownerId, tail);
    void tail.then(() => {
      if (nativeOwnerLockQueues.get(ownerId) === tail) nativeOwnerLockQueues.delete(ownerId);
    });
    return operation;
  }
  const locks = globalThis.navigator?.locks;
  if (!locks) {
    return Promise.reject(new Error(
      'Private account sync requires browser cross-tab locking, which is unavailable here.'
    ));
  }
  return locks.request(
    `${SNAPSHOT_OWNER_LOCK_PREFIX}${ownerId}`,
    { mode: 'exclusive' },
    () => action(lock)
  );
}

function manifestKey(key: string): string {
  return `${key}${MANIFEST_SUFFIX}`;
}

function chunkKey(key: string, generation: string, index: number): string {
  return `${key}.${generation}.${index}`;
}

function readManifest(raw: string | null): ChunkManifest | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ChunkManifest>;
    if (value.version !== 1 || typeof value.generation !== 'string') return null;
    if (!Number.isInteger(value.count) || (value.count ?? 0) < 1) return null;
    return value as ChunkManifest;
  } catch {
    return null;
  }
}

async function deleteGeneration(store: SecureStorePort, key: string, manifest: ChunkManifest | null) {
  if (!manifest) return;
  await Promise.allSettled(
    Array.from({ length: manifest.count }, (_, index) =>
      store.deleteItemAsync(chunkKey(key, manifest.generation, index))
    )
  );
}

export function createChunkedSecureAuthStorage(
  store: SecureStorePort = SecureStore,
  createGeneration: () => string = Crypto.randomUUID
): AsyncAuthStorage {
  return {
    async getItem(key) {
      const manifest = readManifest(await store.getItemAsync(manifestKey(key)));
      if (!manifest) return null;
      const chunks = await Promise.all(
        Array.from({ length: manifest.count }, (_, index) =>
          store.getItemAsync(chunkKey(key, manifest.generation, index))
        )
      );
      return chunks.every((chunk): chunk is string => chunk !== null) ? chunks.join('') : null;
    },
    async removeItem(key) {
      const manifest = readManifest(await store.getItemAsync(manifestKey(key)));
      await store.deleteItemAsync(manifestKey(key));
      await deleteGeneration(store, key, manifest);
    },
    async setItem(key, value) {
      const previous = readManifest(await store.getItemAsync(manifestKey(key)));
      const generation = createGeneration();
      const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [''];
      const next: ChunkManifest = { count: chunks.length, generation, version: 1 };
      try {
        for (const [index, chunk] of chunks.entries()) {
          await store.setItemAsync(chunkKey(key, generation, index), chunk);
        }
        await store.setItemAsync(manifestKey(key), JSON.stringify(next));
      } catch (error) {
        await deleteGeneration(store, key, next);
        throw error;
      }
      await deleteGeneration(store, key, previous);
    },
  };
}

export function createWebAuthStorage(storage: Storage): AsyncAuthStorage {
  return {
    getItem: async (key) => storage.getItem(key),
    removeItem: async (key) => storage.removeItem(key),
    setItem: async (key, value) => storage.setItem(key, value),
  };
}

export function createMemoryAuthStorage(): AsyncAuthStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    removeItem: async (key) => { values.delete(key); },
    setItem: async (key, value) => { values.set(key, value); },
  };
}

export function createMobileAuthStorage(): AsyncAuthStorage {
  if (Platform.OS === 'web') {
    return typeof globalThis.localStorage !== 'undefined'
      ? createWebAuthStorage(globalThis.localStorage)
      : createMemoryAuthStorage();
  }
  return createChunkedSecureAuthStorage();
}
