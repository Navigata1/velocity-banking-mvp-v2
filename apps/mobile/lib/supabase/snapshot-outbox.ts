import {
  asSnapshotRevisionConflict,
  isSafeSnapshotRevision,
  SnapshotRevisionConflictError,
  type SnapshotRevisionConflictKind,
} from '@interestshield/persistence-contract';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createMobileAuthStorage, type AsyncAuthStorage } from './auth-storage';
import {
  prepareMobileSnapshotSync,
  syncPreparedMobileSnapshot,
  type MobileSnapshotSyncInput,
  type MobileSnapshotSyncResult,
  type PreparedMobileSnapshotSync,
} from './snapshot-sync';
import {
  createMobileSyncOperationIdempotencyKey,
  getOrCreateMobileSyncIdempotencyKey,
} from './sync-identity';

const OUTBOX_PREFIX = 'interestshield.mobile.snapshot-outbox.v1.owner.';
const OUTBOX_VERSION = 2 as const;
const MAX_OUTBOX_ITEMS = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

interface StoredRevisionConflict {
  details?: string;
  kind: SnapshotRevisionConflictKind;
  message: string;
}

interface MobileSnapshotStreamState {
  conflict: StoredRevisionConflict | null;
  lastAcknowledgedRevision: number;
  lastAllocatedRevision: number;
}

export interface MobileSnapshotOutboxItem extends PreparedMobileSnapshotSync {
  enqueuedAt: string;
  version: typeof OUTBOX_VERSION;
}

interface MobileSnapshotOutboxEnvelope {
  items: MobileSnapshotOutboxItem[];
  streams: Record<string, MobileSnapshotStreamState>;
  version: typeof OUTBOX_VERSION;
}

export interface MobileSnapshotOutboxFlushResult {
  remaining: number;
  sent: number;
}

type MobileSnapshotEnqueueInput = Omit<
  MobileSnapshotSyncInput,
  'clientRevision' | 'operationIdempotencyKey' | 'snapshotIdempotencyKey'
>;

interface MobileSnapshotOutboxDependencies {
  createOperationIdempotencyKey?: () => string;
  getSnapshotIdempotencyKey?: () => Promise<string>;
  now?: () => string;
  prepareSnapshot?: (input: MobileSnapshotSyncInput) => Promise<PreparedMobileSnapshotSync>;
  sendSnapshot?: (
    client: SupabaseClient,
    input: PreparedMobileSnapshotSync
  ) => Promise<MobileSnapshotSyncResult>;
  storage?: AsyncAuthStorage;
}

export interface MobileSnapshotOutbox {
  enqueue(input: MobileSnapshotEnqueueInput): Promise<MobileSnapshotOutboxItem>;
  flush(client: SupabaseClient, ownerId: string): Promise<MobileSnapshotOutboxFlushResult>;
  read(ownerId: string): Promise<MobileSnapshotOutboxItem[]>;
  readConflict(ownerId: string, snapshotIdempotencyKey: string): Promise<SnapshotRevisionConflictError | null>;
}

function requireOwnerId(ownerId: string): string {
  if (!UUID_PATTERN.test(ownerId)) throw new Error('Snapshot outbox owner id must be a UUID.');
  return ownerId.toLowerCase();
}

function requireIdempotencyKey(value: string, label: string): string {
  if (!IDEMPOTENCY_KEY_PATTERN.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

export function mobileSnapshotOutboxStorageKey(ownerId: string): string {
  return `${OUTBOX_PREFIX}${requireOwnerId(ownerId)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readConflict(value: unknown): StoredRevisionConflict | null {
  if (value === null) return null;
  if (
    !isRecord(value)
    || (value.kind !== 'stale' && value.kind !== 'gap')
    || typeof value.message !== 'string'
    || ('details' in value && value.details !== undefined && typeof value.details !== 'string')
  ) throw new Error('Snapshot outbox contains a malformed revision conflict.');
  return value as unknown as StoredRevisionConflict;
}

function readStream(value: unknown): MobileSnapshotStreamState {
  if (
    !isRecord(value)
    || !Number.isSafeInteger(value.lastAcknowledgedRevision)
    || !Number.isSafeInteger(value.lastAllocatedRevision)
    || (value.lastAcknowledgedRevision as number) < 0
    || (value.lastAllocatedRevision as number) < (value.lastAcknowledgedRevision as number)
  ) throw new Error('Snapshot outbox contains malformed revision state.');
  return {
    conflict: readConflict(value.conflict),
    lastAcknowledgedRevision: value.lastAcknowledgedRevision as number,
    lastAllocatedRevision: value.lastAllocatedRevision as number,
  };
}

function readItem(value: unknown, ownerId: string): MobileSnapshotOutboxItem {
  if (!isRecord(value) || value.version !== OUTBOX_VERSION) {
    throw new Error('Snapshot outbox contains an unsupported item.');
  }
  if (value.expectedOwnerId !== ownerId) {
    throw new Error('Snapshot outbox item owner does not match its storage owner.');
  }
  if (
    typeof value.enqueuedAt !== 'string'
    || !Number.isFinite(new Date(value.enqueuedAt).getTime())
    || !isSafeSnapshotRevision(value.clientRevision)
    || typeof value.operationIdempotencyKey !== 'string'
    || !IDEMPOTENCY_KEY_PATTERN.test(value.operationIdempotencyKey)
    || typeof value.snapshotIdempotencyKey !== 'string'
    || !IDEMPOTENCY_KEY_PATTERN.test(value.snapshotIdempotencyKey)
    || value.snapshotVersion !== 1
    || (value.displayName !== null && typeof value.displayName !== 'string')
    || !isRecord(value.assumptionsJson)
    || value.assumptionsJson.contract_version !== 1
    || !Array.isArray(value.assumptionsJson.storage)
    || value.assumptionsJson.storage.length === 0
  ) throw new Error('Snapshot outbox contains a malformed item.');
  return value as unknown as MobileSnapshotOutboxItem;
}

function emptyEnvelope(): MobileSnapshotOutboxEnvelope {
  return { items: [], streams: {}, version: OUTBOX_VERSION };
}

function parseEnvelope(raw: string | null, ownerId: string): MobileSnapshotOutboxEnvelope {
  if (!raw) return emptyEnvelope();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('Snapshot outbox storage is not valid JSON.');
  }
  if (!isRecord(value) || value.version !== OUTBOX_VERSION) {
    throw new Error('Snapshot outbox revision state is unsupported and cannot be migrated safely.');
  }
  if (!Array.isArray(value.items) || !isRecord(value.streams)) {
    throw new Error('Snapshot outbox storage has an unsupported contract.');
  }
  if (value.items.length > MAX_OUTBOX_ITEMS) {
    throw new Error('Snapshot outbox exceeds its safety limit.');
  }
  const streams = Object.fromEntries(Object.entries(value.streams).map(([key, stream]) => [
    requireIdempotencyKey(key, 'Snapshot outbox stream key'),
    readStream(stream),
  ]));
  const items = value.items.map((item) => readItem(item, ownerId));
  const expectedRevision = new Map<string, number>();
  for (const item of items) {
    const stream = streams[item.snapshotIdempotencyKey];
    if (!stream) throw new Error('Snapshot outbox item has no revision stream.');
    const expected = expectedRevision.get(item.snapshotIdempotencyKey)
      ?? stream.lastAcknowledgedRevision + 1;
    if (item.clientRevision !== expected || item.clientRevision > stream.lastAllocatedRevision) {
      throw new Error('Snapshot outbox item revisions are not contiguous.');
    }
    expectedRevision.set(item.snapshotIdempotencyKey, expected + 1);
  }
  return { items, streams, version: OUTBOX_VERSION };
}

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function conflictError(conflict: StoredRevisionConflict): SnapshotRevisionConflictError {
  return new SnapshotRevisionConflictError(conflict.kind, conflict.message, conflict.details);
}

export function createMobileSnapshotOutbox(
  dependencies: MobileSnapshotOutboxDependencies = {}
): MobileSnapshotOutbox {
  const storage = dependencies.storage ?? createMobileAuthStorage();
  const prepareSnapshot = dependencies.prepareSnapshot ?? prepareMobileSnapshotSync;
  const sendSnapshot = dependencies.sendSnapshot ?? syncPreparedMobileSnapshot;
  const createOperationIdempotencyKey = dependencies.createOperationIdempotencyKey
    ?? createMobileSyncOperationIdempotencyKey;
  const getSnapshotIdempotencyKey = dependencies.getSnapshotIdempotencyKey
    ?? (() => getOrCreateMobileSyncIdempotencyKey());
  const now = dependencies.now ?? (() => new Date().toISOString());
  const ownerLocks = new Map<string, Promise<void>>();
  const ownerFlushes = new Map<string, Promise<MobileSnapshotOutboxFlushResult>>();

  const withOwnerLock = <T>(ownerId: string, action: () => Promise<T>): Promise<T> => {
    const previous = ownerLocks.get(ownerId) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(action);
    const settled = result.then(() => undefined, () => undefined);
    ownerLocks.set(ownerId, settled);
    return result.finally(() => {
      if (ownerLocks.get(ownerId) === settled) ownerLocks.delete(ownerId);
    });
  };

  const readUnlocked = async (ownerId: string): Promise<MobileSnapshotOutboxEnvelope> => {
    const raw = await storage.getItem(mobileSnapshotOutboxStorageKey(ownerId));
    return parseEnvelope(raw, ownerId);
  };

  const writeUnlocked = async (ownerId: string, envelope: MobileSnapshotOutboxEnvelope): Promise<void> => {
    await storage.setItem(mobileSnapshotOutboxStorageKey(ownerId), JSON.stringify(envelope));
  };

  const read = (ownerId: string): Promise<MobileSnapshotOutboxItem[]> => {
    const checkedOwnerId = requireOwnerId(ownerId);
    return withOwnerLock(checkedOwnerId, async () => copy((await readUnlocked(checkedOwnerId)).items));
  };

  const readStoredConflict = (
    ownerIdInput: string,
    snapshotIdempotencyKeyInput: string
  ): Promise<SnapshotRevisionConflictError | null> => {
    const ownerId = requireOwnerId(ownerIdInput);
    const snapshotIdempotencyKey = requireIdempotencyKey(
      snapshotIdempotencyKeyInput,
      'Snapshot outbox stream key'
    );
    return withOwnerLock(ownerId, async () => {
      const conflict = (await readUnlocked(ownerId)).streams[snapshotIdempotencyKey]?.conflict;
      return conflict ? conflictError(conflict) : null;
    });
  };

  const enqueue = async (input: MobileSnapshotEnqueueInput): Promise<MobileSnapshotOutboxItem> => {
    const ownerId = requireOwnerId(input.expectedOwnerId);
    const snapshotIdempotencyKey = requireIdempotencyKey(
      await getSnapshotIdempotencyKey(),
      'Snapshot outbox stream key'
    );
    const operationIdempotencyKey = createOperationIdempotencyKey();
    const enqueuedAt = now();
    return withOwnerLock(ownerId, async () => {
      const envelope = await readUnlocked(ownerId);
      const stream = envelope.streams[snapshotIdempotencyKey] ?? {
        conflict: null,
        lastAcknowledgedRevision: 0,
        lastAllocatedRevision: 0,
      };
      if (stream.conflict) throw conflictError(stream.conflict);
      const clientRevision = stream.lastAllocatedRevision + 1;
      if (!isSafeSnapshotRevision(clientRevision)) {
        throw new Error('Snapshot outbox revision limit has been reached.');
      }
      const prepared = await prepareSnapshot({
        ...input,
        clientRevision,
        expectedOwnerId: ownerId,
        operationIdempotencyKey,
        snapshotIdempotencyKey,
      });
      const item: MobileSnapshotOutboxItem = {
        ...prepared,
        enqueuedAt,
        version: OUTBOX_VERSION,
      };
      readItem(item, ownerId);
      if (item.snapshotIdempotencyKey !== snapshotIdempotencyKey) {
        throw new Error('Snapshot outbox preparation changed its revision stream.');
      }
      if (envelope.items.some((queued) => queued.operationIdempotencyKey === operationIdempotencyKey)) {
        throw new Error('Snapshot outbox generated a duplicate operation id. Try sync again.');
      }
      if (envelope.items.length >= MAX_OUTBOX_ITEMS) {
        throw new Error('Snapshot outbox is full. Reconnect and sync queued changes before adding more.');
      }
      envelope.items.push(item);
      envelope.streams[snapshotIdempotencyKey] = {
        ...stream,
        lastAllocatedRevision: clientRevision,
      };
      await writeUnlocked(ownerId, envelope);
      return copy(item);
    });
  };

  const flush = (
    client: SupabaseClient,
    ownerIdInput: string
  ): Promise<MobileSnapshotOutboxFlushResult> => {
    const ownerId = requireOwnerId(ownerIdInput);
    const existing = ownerFlushes.get(ownerId);
    if (existing) return existing;

    const run = (async () => {
      let sent = 0;
      while (true) {
        const head = await withOwnerLock(ownerId, async () => {
          const envelope = await readUnlocked(ownerId);
          const item = envelope.items[0];
          if (!item) return null;
          const conflict = envelope.streams[item.snapshotIdempotencyKey]?.conflict;
          if (conflict) throw conflictError(conflict);
          return copy(item);
        });
        if (!head) return { remaining: 0, sent };

        try {
          await sendSnapshot(client, head);
        } catch (error) {
          const conflict = asSnapshotRevisionConflict(error);
          if (conflict) {
            await withOwnerLock(ownerId, async () => {
              const envelope = await readUnlocked(ownerId);
              if (envelope.items[0]?.operationIdempotencyKey !== head.operationIdempotencyKey) return;
              const stream = envelope.streams[head.snapshotIdempotencyKey];
              stream.conflict = {
                details: conflict.details,
                kind: conflict.kind,
                message: conflict.message,
              };
              await writeUnlocked(ownerId, envelope);
            });
            throw conflict;
          }
          throw error;
        }

        await withOwnerLock(ownerId, async () => {
          const envelope = await readUnlocked(ownerId);
          if (envelope.items[0]?.operationIdempotencyKey !== head.operationIdempotencyKey) {
            throw new Error('Snapshot outbox changed before its acknowledged head could be removed.');
          }
          const stream = envelope.streams[head.snapshotIdempotencyKey];
          if (stream.lastAcknowledgedRevision + 1 !== head.clientRevision) {
            throw new Error('Snapshot outbox acknowledgment would create a revision gap.');
          }
          stream.lastAcknowledgedRevision = head.clientRevision;
          envelope.items.shift();
          await writeUnlocked(ownerId, envelope);
        });
        sent += 1;
      }
    })();

    ownerFlushes.set(ownerId, run);
    void run.finally(() => {
      if (ownerFlushes.get(ownerId) === run) ownerFlushes.delete(ownerId);
    }).catch(() => undefined);
    return run;
  };

  return { enqueue, flush, read, readConflict: readStoredConflict };
}

export const mobileSnapshotOutbox = createMobileSnapshotOutbox();
