import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1800;
const MANIFEST_SUFFIX = '.manifest';

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
