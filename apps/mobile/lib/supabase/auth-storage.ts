import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1800;
const STRICT_CHUNK_LIMIT = 2048;
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
  return !!value && ownerLockTokens.has(value) && value.ownerId === ownerId;
}

export function withMobileSnapshotOwnerLock<T>(
  ownerId: string,
  action: (lock: MobileSnapshotOwnerLock) => Promise<T>
): Promise<T> {
  const lock = Object.freeze({ ownerId });
  const run = async () => {
    ownerLockTokens.add(lock);
    try { return await action(lock); }
    finally { ownerLockTokens.delete(lock); }
  };
  if (Platform.OS !== 'web') {
    const previous = nativeOwnerLockQueues.get(ownerId) ?? Promise.resolve();
    const operation = previous.catch(() => undefined).then(run);
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
    run
  );
}

function manifestKey(key: string): string {
  return `${key}${MANIFEST_SUFFIX}`;
}

function chunkKey(key: string, generation: string, index: number): string {
  return `${key}.${generation}.${index}`;
}

function readManifest(raw: string | null, strict = false): ChunkManifest | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<ChunkManifest>;
    if (value.version !== 1 || typeof value.generation !== 'string'
      || !Number.isInteger(value.count) || (value.count ?? 0) < 1) throw new Error('Invalid manifest.');
    if (strict && (!Number.isSafeInteger(value.count) || (value.count ?? 0) > STRICT_CHUNK_LIMIT
      || !/^[A-Za-z0-9._-]{1,128}$/.test(value.generation)
      || Object.keys(value).some(key => !['version','generation','count'].includes(key)))) throw new Error('Invalid strict manifest.');
    return value as ChunkManifest;
  } catch {
    if (strict) throw new Error('Encrypted storage manifest is corrupt or exceeds its chunk limit.');
    return null;
  }
}

// SecureStore limits bytes, not UTF-16 code units. Keep Unicode code points together.
function secureChunks(value: string): string[] {
  const chunks: string[] = [];
  let characters: string[] = [];
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    const width = point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (bytes + width > CHUNK_SIZE) {
      chunks.push(characters.join(''));
      characters = [];
      bytes = 0;
    }
    characters.push(character);
    bytes += width;
  }
  if (characters.length || !chunks.length) chunks.push(characters.join(''));
  return chunks;
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
  createGeneration: () => string = Crypto.randomUUID,
  { strictRead = false }: { strictRead?: boolean } = {}
): AsyncAuthStorage {
  return {
    async getItem(key) {
      const manifest = readManifest(await store.getItemAsync(manifestKey(key)), strictRead);
      if (!manifest) return null;
      const chunks = await Promise.all(
        Array.from({ length: manifest.count }, (_, index) =>
          store.getItemAsync(chunkKey(key, manifest.generation, index))
        )
      );
      if (!chunks.every((chunk): chunk is string => typeof chunk === 'string')) {
        if (strictRead) throw new Error('Encrypted storage generation is incomplete.');
        return null;
      }
      return chunks.join('');
    },
    async removeItem(key) {
      const manifest = readManifest(await store.getItemAsync(manifestKey(key)), strictRead);
      await store.deleteItemAsync(manifestKey(key));
      await deleteGeneration(store, key, manifest);
    },
    async setItem(key, value) {
      const previous = readManifest(await store.getItemAsync(manifestKey(key)), strictRead);
      const generation = createGeneration();
      if (strictRead) {
        readManifest(JSON.stringify({ version: 1, generation, count: 1 }), true);
        if (generation === previous?.generation) throw new Error('Encrypted storage generation must be new.');
      }
      const chunks = secureChunks(value);
      if (strictRead && chunks.length > STRICT_CHUNK_LIMIT) throw new Error('Encrypted storage value is too large for the chunk limit.');
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
