import {
  isSafeSnapshotRevision,
  SnapshotRevisionConflictError,
  type SnapshotRevisionConflictKind,
  type SnapshotSyncPlan,
} from '@interestshield/persistence-contract';

const DATABASE_NAME = 'interestshield-private-sync';
const DATABASE_VERSION = 1;
const OBJECT_STORE = 'snapshot-streams';
const STATE_VERSION = 1 as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

interface StoredWebConflict {
  details?: string;
  kind: SnapshotRevisionConflictKind;
  message: string;
}

export interface PreparedWebSnapshotSync {
  assumptionsJson: SnapshotSyncPlan['snapshot']['row']['assumptions_json'];
  clientRevision: number;
  displayName: string | null;
  expectedOwnerId: string;
  operationIdempotencyKey: string;
  snapshotIdempotencyKey: string;
  snapshotVersion: SnapshotSyncPlan['version'];
}

export type WebSnapshotOperationInput = Omit<
  PreparedWebSnapshotSync,
  'clientRevision' | 'operationIdempotencyKey'
>;

interface WebSnapshotStreamState {
  conflict: StoredWebConflict | null;
  lastAcknowledgedRevision: number;
  pending: PreparedWebSnapshotSync | null;
  version: typeof STATE_VERSION;
}

export interface WebSnapshotTransactionalStore {
  transact(key: string, update: (current: unknown) => unknown): Promise<unknown>;
}

export interface WebSnapshotOutbox {
  acknowledge(operation: PreparedWebSnapshotSync): Promise<void>;
  markConflict(operation: PreparedWebSnapshotSync, conflict: SnapshotRevisionConflictError): Promise<void>;
  prepare(input: WebSnapshotOperationInput): Promise<PreparedWebSnapshotSync>;
  read(ownerId: string, snapshotIdempotencyKey: string): Promise<WebSnapshotStreamState>;
}

interface WebSnapshotOutboxDependencies {
  createOperationIdempotencyKey?: () => string;
  store?: WebSnapshotTransactionalStore;
}

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requireOwnerId(ownerId: string): string {
  if (!UUID_PATTERN.test(ownerId)) throw new Error('Browser snapshot outbox owner id must be a UUID.');
  return ownerId.toLowerCase();
}

function requireIdempotencyKey(value: string, label: string): string {
  if (!IDEMPOTENCY_KEY_PATTERN.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readConflict(value: unknown): StoredWebConflict | null {
  if (value === null) return null;
  if (
    !isRecord(value)
    || (value.kind !== 'stale' && value.kind !== 'gap')
    || typeof value.message !== 'string'
    || ('details' in value && value.details !== undefined && typeof value.details !== 'string')
  ) throw new Error('Browser snapshot outbox contains a malformed conflict.');
  return value as unknown as StoredWebConflict;
}

function readPending(value: unknown, ownerId: string, snapshotIdempotencyKey: string): PreparedWebSnapshotSync {
  if (
    !isRecord(value)
    || value.expectedOwnerId !== ownerId
    || value.snapshotIdempotencyKey !== snapshotIdempotencyKey
    || !isSafeSnapshotRevision(value.clientRevision)
    || typeof value.operationIdempotencyKey !== 'string'
    || !IDEMPOTENCY_KEY_PATTERN.test(value.operationIdempotencyKey)
    || value.snapshotVersion !== 1
    || (value.displayName !== null && typeof value.displayName !== 'string')
    || !isRecord(value.assumptionsJson)
    || value.assumptionsJson.contract_version !== 1
    || !Array.isArray(value.assumptionsJson.storage)
    || value.assumptionsJson.storage.length === 0
  ) throw new Error('Browser snapshot outbox contains malformed pending work.');
  return value as unknown as PreparedWebSnapshotSync;
}

function emptyState(): WebSnapshotStreamState {
  return { conflict: null, lastAcknowledgedRevision: 0, pending: null, version: STATE_VERSION };
}

function readState(value: unknown, ownerId: string, snapshotIdempotencyKey: string): WebSnapshotStreamState {
  if (value === null || value === undefined) return emptyState();
  if (
    !isRecord(value)
    || value.version !== STATE_VERSION
    || !Number.isSafeInteger(value.lastAcknowledgedRevision)
    || (value.lastAcknowledgedRevision as number) < 0
  ) throw new Error('Browser snapshot outbox contains unsupported revision state.');
  const pending = value.pending === null
    ? null
    : readPending(value.pending, ownerId, snapshotIdempotencyKey);
  if (pending && pending.clientRevision !== (value.lastAcknowledgedRevision as number) + 1) {
    throw new Error('Browser snapshot outbox pending revision is not contiguous.');
  }
  return {
    conflict: readConflict(value.conflict),
    lastAcknowledgedRevision: value.lastAcknowledgedRevision as number,
    pending,
    version: STATE_VERSION,
  };
}

export function webSnapshotSyncStorageKey(ownerId: string, snapshotIdempotencyKey: string): string {
  return `${requireOwnerId(ownerId)}:${requireIdempotencyKey(snapshotIdempotencyKey, 'Browser snapshot stream key')}`;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Browser snapshot sync requires IndexedDB.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(OBJECT_STORE)) {
        request.result.createObjectStore(OBJECT_STORE, { keyPath: 'key' });
      }
    };
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'));
    request.onsuccess = () => resolve(request.result);
  });
}

export function createIndexedDbWebSnapshotStore(): WebSnapshotTransactionalStore {
  return {
    async transact(key, update) {
      const database = await openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(OBJECT_STORE, 'readwrite');
        const store = transaction.objectStore(OBJECT_STORE);
        const request = store.get(key);
        let next: unknown;
        let updateError: unknown;
        request.onerror = () => transaction.abort();
        request.onsuccess = () => {
          try {
            const record = request.result as { value?: unknown } | undefined;
            next = update(record?.value ?? null);
            store.put({ key, value: next });
          } catch (error) {
            updateError = error;
            transaction.abort();
          }
        };
        transaction.onabort = () => {
          database.close();
          reject(updateError ?? transaction.error ?? request.error ?? new Error('IndexedDB transaction aborted.'));
        };
        transaction.onerror = () => undefined;
        transaction.oncomplete = () => {
          database.close();
          resolve(copy(next));
        };
      });
    },
  };
}

export function createWebSnapshotOutbox(
  dependencies: WebSnapshotOutboxDependencies = {}
): WebSnapshotOutbox {
  const store = dependencies.store ?? createIndexedDbWebSnapshotStore();
  const createOperationIdempotencyKey = dependencies.createOperationIdempotencyKey
    ?? (() => `browser-operation:${crypto.randomUUID()}`);

  const prepare = async (input: WebSnapshotOperationInput): Promise<PreparedWebSnapshotSync> => {
    const ownerId = requireOwnerId(input.expectedOwnerId);
    const snapshotIdempotencyKey = requireIdempotencyKey(
      input.snapshotIdempotencyKey,
      'Browser snapshot stream key'
    );
    const key = webSnapshotSyncStorageKey(ownerId, snapshotIdempotencyKey);
    const updated = await store.transact(key, (current) => {
      const state = readState(current, ownerId, snapshotIdempotencyKey);
      if (state.conflict) {
        throw new SnapshotRevisionConflictError(
          state.conflict.kind,
          state.conflict.message,
          state.conflict.details
        );
      }
      if (state.pending) return state;
      const clientRevision = state.lastAcknowledgedRevision + 1;
      if (!isSafeSnapshotRevision(clientRevision)) {
        throw new Error('Browser snapshot revision limit has been reached.');
      }
      state.pending = {
        ...copy(input),
        clientRevision,
        expectedOwnerId: ownerId,
        operationIdempotencyKey: requireIdempotencyKey(
          createOperationIdempotencyKey(),
          'Browser snapshot operation key'
        ),
        snapshotIdempotencyKey,
      };
      return state;
    });
    const state = readState(updated, ownerId, snapshotIdempotencyKey);
    if (!state.pending) throw new Error('Browser snapshot outbox failed to persist pending work.');
    return copy(state.pending);
  };

  const acknowledge = async (operation: PreparedWebSnapshotSync): Promise<void> => {
    const ownerId = requireOwnerId(operation.expectedOwnerId);
    const key = webSnapshotSyncStorageKey(ownerId, operation.snapshotIdempotencyKey);
    await store.transact(key, (current) => {
      const state = readState(current, ownerId, operation.snapshotIdempotencyKey);
      if (state.lastAcknowledgedRevision >= operation.clientRevision) return state;
      if (
        !state.pending
        || state.pending.operationIdempotencyKey !== operation.operationIdempotencyKey
        || state.pending.clientRevision !== operation.clientRevision
      ) throw new Error('Browser snapshot outbox changed before acknowledgment.');
      state.lastAcknowledgedRevision = operation.clientRevision;
      state.pending = null;
      return state;
    });
  };

  const markConflict = async (
    operation: PreparedWebSnapshotSync,
    conflict: SnapshotRevisionConflictError
  ): Promise<void> => {
    const ownerId = requireOwnerId(operation.expectedOwnerId);
    const key = webSnapshotSyncStorageKey(ownerId, operation.snapshotIdempotencyKey);
    await store.transact(key, (current) => {
      const state = readState(current, ownerId, operation.snapshotIdempotencyKey);
      if (state.pending?.operationIdempotencyKey === operation.operationIdempotencyKey) {
        state.conflict = {
          details: conflict.details,
          kind: conflict.kind,
          message: conflict.message,
        };
      }
      return state;
    });
  };

  const read = async (ownerIdInput: string, snapshotIdempotencyKey: string): Promise<WebSnapshotStreamState> => {
    const ownerId = requireOwnerId(ownerIdInput);
    const key = webSnapshotSyncStorageKey(ownerId, snapshotIdempotencyKey);
    const result = await store.transact(key, (current) => readState(current, ownerId, snapshotIdempotencyKey));
    return readState(result, ownerId, snapshotIdempotencyKey);
  };

  return { acknowledge, markConflict, prepare, read };
}

export const webSnapshotOutbox = createWebSnapshotOutbox();
