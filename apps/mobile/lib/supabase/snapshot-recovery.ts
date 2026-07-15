import type { MobileDashboardInput } from '@interestshield/financial-engine';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  decodeMobileAssumptions,
  loadMobileAssumptionsForOwner,
  saveMobileAssumptionsForOwner,
  type MobileAssumptionStorageBackend,
} from '../mobile-assumption-storage';
import {
  withMobileSnapshotOwnerLock,
  type MobileSnapshotOwnerLock,
} from './auth-storage';
import {
  mobileSnapshotOutbox,
  type MobileSnapshotOutbox,
} from './snapshot-outbox';
import { getOrCreateMobileSyncIdempotencyKey } from './sync-identity';

const MOBILE_STORAGE_KEY = 'interestshield-mobile-assumptions-v1';
const MAX_RECOVERY_CANDIDATES = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface SnapshotStorageEntry {
  key: string;
  value: string;
}

interface SnapshotRow {
  assumptions_json: {
    contract_version: number;
    storage: SnapshotStorageEntry[];
  };
  client_revision: number;
  id: string;
  idempotency_key: string;
  owner_id: string;
  snapshot_version: number;
  updated_at: string;
}

export interface MobileSnapshotRecoveryPreview {
  assumptions: MobileDashboardInput;
  clientRevision: number;
  snapshotId: string;
  snapshotIdempotencyKey: string;
  updatedAt: string;
}

export interface MobileSnapshotRecoveryOptions {
  guestAssumptions: MobileDashboardInput | null;
  rejectedCount: number;
  selectedSnapshotId: null;
  snapshots: MobileSnapshotRecoveryPreview[];
  streamRevisions: Record<string, number>;
}

export type MobileSnapshotRecoverySource =
  | { assumptions: MobileDashboardInput; kind: 'device' }
  | { assumptions: MobileDashboardInput; kind: 'guest' }
  | { kind: 'remote'; snapshot: MobileSnapshotRecoveryPreview };

export type MobileSnapshotRecoveryConfirmation =
  | { clientRevision: number; snapshotId: string }
  | {
    kind: 'device' | 'guest';
    ownerId: string;
    reviewedAssumptions: string;
  };

export interface MobileSnapshotRecoveryResult {
  discarded: number;
  synced: boolean;
}

export class MobileSnapshotRecoveryPendingError extends Error {
  readonly pendingRecovery = true;

  constructor(error: unknown) {
    const detail = error && typeof error === 'object' && 'message' in error
      && typeof error.message === 'string'
      ? ` ${error.message}`
      : '';
    super(`Confirmed recovery is pending and will not be cancelled automatically.${detail}`);
    this.name = 'MobileSnapshotRecoveryPendingError';
  }
}

export function serializeMobileRecoveryAssumptions(input: MobileDashboardInput): string {
  return JSON.stringify({
    activeDebt: {
      apr: input.activeDebt.apr,
      balance: input.activeDebt.balance,
      monthlyPayment: input.activeDebt.monthlyPayment,
      termMonths: input.activeDebt.termMonths,
    },
    activeDebtName: input.activeDebtName,
    chunkAmount: input.chunkAmount,
    loc: { apr: input.loc.apr, balance: input.loc.balance, limit: input.loc.limit },
    monthlyExpenses: input.monthlyExpenses,
    monthlyIncome: input.monthlyIncome,
  });
}

interface RecoveryOutbox extends Pick<
  MobileSnapshotOutbox,
  'commitRecovery' | 'flush' | 'readRecovery' | 'stageRecovery'
> {}

interface MobileSnapshotRecoveryDependencies {
  getSnapshotIdempotencyKey?: () => Promise<string>;
  outbox?: RecoveryOutbox;
  replaceAssumptions: (
    input: MobileDashboardInput,
    ownerLock?: MobileSnapshotOwnerLock,
    expectedRevision?: number
  ) => Promise<MobileAssumptionStorageBackend>;
}

function requireOwnerId(ownerId: string): string {
  if (!UUID_PATTERN.test(ownerId)) throw new Error('Snapshot recovery owner id must be a UUID.');
  return ownerId.toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function verifyActiveOwner(client: SupabaseClient, expectedOwnerIdInput: string): Promise<string> {
  const expectedOwnerId = requireOwnerId(expectedOwnerIdInput);
  const { data, error } = await client.auth.getClaims();
  const activeOwnerId = data?.claims?.sub;
  if (error || typeof activeOwnerId !== 'string') {
    throw new Error('Snapshot recovery could not verify the active account.');
  }
  if (activeOwnerId.toLowerCase() !== expectedOwnerId) {
    throw new Error('Snapshot recovery stopped because the account changed. Review recovery again.');
  }
  return expectedOwnerId;
}

function readRow(value: unknown, expectedOwnerId: string): SnapshotRow {
  if (!isRecord(value)) throw new Error('Snapshot recovery received a malformed row.');
  if (value.owner_id !== expectedOwnerId) {
    throw new Error('Snapshot recovery received data for a different owner.');
  }
  if (
    typeof value.id !== 'string'
    || typeof value.idempotency_key !== 'string'
    || !Number.isSafeInteger(value.client_revision)
    || (value.client_revision as number) < 0
    || value.snapshot_version !== 1
    || typeof value.updated_at !== 'string'
    || !isRecord(value.assumptions_json)
    || value.assumptions_json.contract_version !== 1
    || !Array.isArray(value.assumptions_json.storage)
  ) throw new Error('Snapshot recovery received a malformed row.');
  return value as unknown as SnapshotRow;
}

function decodePreview(row: SnapshotRow, expectedOwnerId: string): MobileSnapshotRecoveryPreview | null {
  if (row.snapshot_version !== 1) return null;
  const entries = row.assumptions_json.storage.filter(
    (candidate) => isRecord(candidate)
      && candidate.key === MOBILE_STORAGE_KEY
      && typeof candidate.value === 'string'
  );
  if (entries.length !== 1) return null;
  const [entry] = entries;
  const assumptions = decodeMobileAssumptions(entry.value, expectedOwnerId);
  if (!assumptions) return null;
  return {
    assumptions,
    clientRevision: row.client_revision,
    snapshotId: row.id,
    snapshotIdempotencyKey: row.idempotency_key,
    updatedAt: row.updated_at,
  };
}

async function queryOwnedRows(
  client: SupabaseClient,
  ownerId: string,
  currentStreamKey: string
): Promise<SnapshotRow[]> {
  const columns = 'id, owner_id, idempotency_key, client_revision, snapshot_version, assumptions_json, updated_at';
  const [candidateResult, currentResult] = await Promise.all([
    client
      .from('financial_snapshots')
      .select(columns)
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
      .limit(MAX_RECOVERY_CANDIDATES),
    client
      .from('financial_snapshots')
      .select(columns)
      .eq('owner_id', ownerId)
      .eq('idempotency_key', currentStreamKey)
      .limit(1),
  ]);
  if (candidateResult.error || currentResult.error) {
    const detail = candidateResult.error?.message ?? currentResult.error?.message ?? '';
    throw new Error(`Snapshot recovery could not load private snapshots. ${detail}`.trim());
  }
  if (!Array.isArray(candidateResult.data) || !Array.isArray(currentResult.data)) {
    throw new Error('Snapshot recovery received an invalid snapshot response.');
  }
  const rows = [...candidateResult.data, ...currentResult.data];
  const parsed = rows.map((row) => readRow(row, ownerId));
  return [...new Map(parsed.map((row) => [row.id, row])).values()];
}

export async function loadMobileSnapshotRecoveryOptions(
  client: SupabaseClient,
  expectedOwnerIdInput: string
): Promise<MobileSnapshotRecoveryOptions> {
  const ownerId = await verifyActiveOwner(client, expectedOwnerIdInput);
  const currentStreamKey = await getOrCreateMobileSyncIdempotencyKey();
  const [rows, guest] = await Promise.all([
    queryOwnedRows(client, ownerId, currentStreamKey),
    loadMobileAssumptionsForOwner(null),
  ]);
  const snapshots: MobileSnapshotRecoveryPreview[] = [];
  const streamRevisions: Record<string, number> = {};
  let rejectedCount = 0;
  for (const row of rows) {
    streamRevisions[row.idempotency_key] = Math.max(
      streamRevisions[row.idempotency_key] ?? 0,
      row.client_revision
    );
    const preview = decodePreview(row, ownerId);
    if (preview) snapshots.push(preview);
    else rejectedCount += 1;
  }
  await verifyActiveOwner(client, ownerId);
  return {
    guestAssumptions: guest.restored ? guest.input : null,
    rejectedCount,
    selectedSnapshotId: null,
    snapshots,
    streamRevisions,
  };
}

function samePreview(
  left: MobileSnapshotRecoveryPreview,
  right: MobileSnapshotRecoveryPreview
): boolean {
  return left.snapshotId === right.snapshotId
    && left.clientRevision === right.clientRevision
    && left.snapshotIdempotencyKey === right.snapshotIdempotencyKey
    && left.updatedAt === right.updatedAt
    && JSON.stringify(left.assumptions) === JSON.stringify(right.assumptions);
}

export async function applyMobileSnapshotRecovery(
  client: SupabaseClient,
  input: {
    confirmation: MobileSnapshotRecoveryConfirmation;
    expectedOwnerId: string;
    reviewedLocalAssumptions: string;
    source: MobileSnapshotRecoverySource;
  },
  dependencies: MobileSnapshotRecoveryDependencies
): Promise<MobileSnapshotRecoveryResult> {
  const ownerId = await verifyActiveOwner(client, input.expectedOwnerId);
  const options = await loadMobileSnapshotRecoveryOptions(client, ownerId);
  let assumptions: MobileDashboardInput;

  if (input.source.kind === 'remote') {
    if ('kind' in input.confirmation) {
      throw new Error('Remote snapshot recovery requires confirmation of the selected revision.');
    }
    const confirmation = input.confirmation;
    const current = options.snapshots.find(
      (snapshot) => snapshot.snapshotId === confirmation.snapshotId
    );
    if (
      !current
      || confirmation.clientRevision !== current.clientRevision
      || !samePreview(current, input.source.snapshot)
    ) {
      throw new Error('The selected snapshot changed. Review again before applying it.');
    }
    assumptions = current.assumptions;
  } else if (input.source.kind === 'guest') {
    if (
      !('kind' in input.confirmation)
      || input.confirmation.kind !== 'guest'
      || requireOwnerId(input.confirmation.ownerId) !== ownerId
    ) throw new Error('Guest adoption requires confirmation for the active owner.');
    if (!options.guestAssumptions) {
      throw new Error('No saved guest assumptions are available to adopt.');
    }
    const reviewedAssumptions = serializeMobileRecoveryAssumptions(input.source.assumptions);
    if (
      input.confirmation.reviewedAssumptions !== reviewedAssumptions
      || serializeMobileRecoveryAssumptions(options.guestAssumptions) !== reviewedAssumptions
    ) throw new Error('Guest assumptions changed. Review again before adopting them.');
    assumptions = options.guestAssumptions;
  } else {
    if (
      !('kind' in input.confirmation)
      || input.confirmation.kind !== 'device'
      || requireOwnerId(input.confirmation.ownerId) !== ownerId
      || input.confirmation.reviewedAssumptions
        !== serializeMobileRecoveryAssumptions(input.source.assumptions)
    ) throw new Error('Keeping this device requires confirmation of the reviewed assumptions.');
    assumptions = input.source.assumptions;
  }

  const getSnapshotIdempotencyKey = dependencies.getSnapshotIdempotencyKey
    ?? getOrCreateMobileSyncIdempotencyKey;
  const snapshotIdempotencyKey = await getSnapshotIdempotencyKey();
  const serverRevision = options.streamRevisions[snapshotIdempotencyKey] ?? 0;
  const outbox = dependencies.outbox ?? mobileSnapshotOutbox;

  const discarded = await withMobileSnapshotOwnerLock(ownerId, async (ownerLock) => {
    await verifyActiveOwner(client, ownerId);
    const local = await loadMobileAssumptionsForOwner(ownerId, undefined, ownerLock);
    const currentLocalAssumptions = serializeMobileRecoveryAssumptions(local.input);
    if (currentLocalAssumptions !== input.reviewedLocalAssumptions) {
      throw new Error('Local assumptions changed after review. Review recovery again.');
    }
    if (
      input.source.kind === 'device'
      && serializeMobileRecoveryAssumptions(input.source.assumptions) !== currentLocalAssumptions
    ) throw new Error('This device changed after review. Review recovery again.');

    const staged = await outbox.stageRecovery({
      assumptions,
      expectedLocalAssumptions: currentLocalAssumptions,
      expectedOwnerId: ownerId,
      serverRevision,
      snapshotIdempotencyKey,
      sourceKind: input.source.kind,
    }, ownerLock);
    try {
      await dependencies.replaceAssumptions(assumptions, ownerLock, local.revision);
      return (await outbox.commitRecovery(ownerId, staged.recoveryId, ownerLock)).discarded;
    } catch (error) {
      throw new MobileSnapshotRecoveryPendingError(error);
    }
  });
  const flushResult = await outbox.flush(client, ownerId);
  return { discarded, synced: flushResult.remaining === 0 };
}

export async function resumePendingMobileSnapshotRecovery(
  expectedOwnerIdInput: string,
  dependencies: {
    outbox?: Pick<MobileSnapshotOutbox, 'commitRecovery' | 'readRecovery'>;
    replaceAssumptions?: (
      input: MobileDashboardInput,
      ownerLock?: MobileSnapshotOwnerLock,
      expectedRevision?: number
    ) => Promise<MobileAssumptionStorageBackend>;
    saveAssumptions?: typeof saveMobileAssumptionsForOwner;
  } = {}
): Promise<boolean> {
  const ownerId = requireOwnerId(expectedOwnerIdInput);
  const outbox = dependencies.outbox ?? mobileSnapshotOutbox;
  return withMobileSnapshotOwnerLock(ownerId, async (ownerLock) => {
    const pending = await outbox.readRecovery(ownerId, ownerLock);
    if (!pending) return false;
    const local = await loadMobileAssumptionsForOwner(ownerId, undefined, ownerLock);
    const current = serializeMobileRecoveryAssumptions(local.input);
    const target = serializeMobileRecoveryAssumptions(pending.assumptions);
    if (current !== pending.expectedLocalAssumptions && current !== target) {
      throw new Error('Local assumptions changed after recovery was confirmed. Review is required.');
    }
    let backend: MobileAssumptionStorageBackend;
    if (dependencies.replaceAssumptions) {
      backend = await dependencies.replaceAssumptions(
        pending.assumptions,
        ownerLock,
        local.revision
      );
    } else {
      const result = await (dependencies.saveAssumptions ?? saveMobileAssumptionsForOwner)(
        ownerId,
        pending.assumptions,
        { expectedRevision: local.revision, ownerLock }
      );
      backend = result.backend;
    }
    if (backend === 'unavailable') {
      throw new Error('Pending snapshot recovery requires durable local storage.');
    }
    await outbox.commitRecovery(ownerId, pending.recoveryId, ownerLock);
    return true;
  });
}
