import type { SupabaseClient } from '@supabase/supabase-js';
import { createMobileAuthStorage, type AsyncAuthStorage } from './auth-storage';
import {
  prepareMobileSnapshotSync,
  syncPreparedMobileSnapshot,
  type MobileSnapshotSyncInput,
  type MobileSnapshotSyncResult,
  type PreparedMobileSnapshotSync,
} from './snapshot-sync';
import { createMobileSyncOperationIdempotencyKey } from './sync-identity';

const OUTBOX_PREFIX = 'interestshield.mobile.snapshot-outbox.v1.owner.';
const OUTBOX_VERSION = 1 as const;
const MAX_OUTBOX_ITEMS = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

export interface MobileSnapshotOutboxItem extends PreparedMobileSnapshotSync {
  enqueuedAt: string;
  version: typeof OUTBOX_VERSION;
}

interface MobileSnapshotOutboxEnvelope {
  items: MobileSnapshotOutboxItem[];
  version: typeof OUTBOX_VERSION;
}

export interface MobileSnapshotOutboxFlushResult {
  remaining: number;
  sent: number;
}

type MobileSnapshotEnqueueInput = Omit<MobileSnapshotSyncInput, 'operationIdempotencyKey'>;

interface MobileSnapshotOutboxDependencies {
  createOperationIdempotencyKey?: () => string;
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
}

function requireOwnerId(ownerId: string): string {
  if (!UUID_PATTERN.test(ownerId)) throw new Error('Snapshot outbox owner id must be a UUID.');
  return ownerId.toLowerCase();
}

export function mobileSnapshotOutboxStorageKey(ownerId: string): string {
  return `${OUTBOX_PREFIX}${requireOwnerId(ownerId)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
  ) {
    throw new Error('Snapshot outbox contains a malformed item.');
  }
  return value as unknown as MobileSnapshotOutboxItem;
}

function parseEnvelope(raw: string | null, ownerId: string): MobileSnapshotOutboxItem[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('Snapshot outbox storage is not valid JSON.');
  }
  if (!isRecord(value) || value.version !== OUTBOX_VERSION || !Array.isArray(value.items)) {
    throw new Error('Snapshot outbox storage has an unsupported contract.');
  }
  if (value.items.length > MAX_OUTBOX_ITEMS) {
    throw new Error('Snapshot outbox exceeds its safety limit.');
  }
  return value.items.map((item) => readItem(item, ownerId));
}

function copyItems(items: MobileSnapshotOutboxItem[]): MobileSnapshotOutboxItem[] {
  return JSON.parse(JSON.stringify(items)) as MobileSnapshotOutboxItem[];
}

export function createMobileSnapshotOutbox(
  dependencies: MobileSnapshotOutboxDependencies = {}
): MobileSnapshotOutbox {
  const storage = dependencies.storage ?? createMobileAuthStorage();
  const prepareSnapshot = dependencies.prepareSnapshot ?? prepareMobileSnapshotSync;
  const sendSnapshot = dependencies.sendSnapshot ?? syncPreparedMobileSnapshot;
  const createOperationIdempotencyKey = dependencies.createOperationIdempotencyKey
    ?? createMobileSyncOperationIdempotencyKey;
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

  const readUnlocked = async (ownerId: string): Promise<MobileSnapshotOutboxItem[]> => {
    const raw = await storage.getItem(mobileSnapshotOutboxStorageKey(ownerId));
    return parseEnvelope(raw, ownerId);
  };

  const writeUnlocked = async (ownerId: string, items: MobileSnapshotOutboxItem[]): Promise<void> => {
    const key = mobileSnapshotOutboxStorageKey(ownerId);
    if (items.length === 0) {
      await storage.removeItem(key);
      return;
    }
    const envelope: MobileSnapshotOutboxEnvelope = { items, version: OUTBOX_VERSION };
    await storage.setItem(key, JSON.stringify(envelope));
  };

  const read = (ownerId: string): Promise<MobileSnapshotOutboxItem[]> => {
    const checkedOwnerId = requireOwnerId(ownerId);
    return withOwnerLock(checkedOwnerId, async () => copyItems(await readUnlocked(checkedOwnerId)));
  };

  const enqueue = (input: MobileSnapshotEnqueueInput): Promise<MobileSnapshotOutboxItem> => {
    const ownerId = requireOwnerId(input.expectedOwnerId);
    const operationIdempotencyKey = createOperationIdempotencyKey();
    const enqueuedAt = now();
    return withOwnerLock(ownerId, async () => {
      const prepared = await prepareSnapshot({
        ...input,
        expectedOwnerId: ownerId,
        operationIdempotencyKey,
      });
      const item: MobileSnapshotOutboxItem = {
        ...prepared,
        enqueuedAt,
        version: OUTBOX_VERSION,
      };
      readItem(item, ownerId);
      const items = await readUnlocked(ownerId);
      if (items.some((queued) => queued.operationIdempotencyKey === item.operationIdempotencyKey)) {
        throw new Error('Snapshot outbox generated a duplicate operation id. Try sync again.');
      }
      if (items.length >= MAX_OUTBOX_ITEMS) {
        throw new Error('Snapshot outbox is full. Reconnect and sync queued changes before adding more.');
      }
      await writeUnlocked(ownerId, [...items, item]);
      return copyItems([item])[0];
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
          const items = await readUnlocked(ownerId);
          return items[0] ? copyItems([items[0]])[0] : null;
        });
        if (!head) return { remaining: 0, sent };

        await sendSnapshot(client, head);
        await withOwnerLock(ownerId, async () => {
          const items = await readUnlocked(ownerId);
          if (items[0]?.operationIdempotencyKey !== head.operationIdempotencyKey) {
            throw new Error('Snapshot outbox changed before its acknowledged head could be removed.');
          }
          await writeUnlocked(ownerId, items.slice(1));
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

  return { enqueue, flush, read };
}

export const mobileSnapshotOutbox = createMobileSnapshotOutbox();
