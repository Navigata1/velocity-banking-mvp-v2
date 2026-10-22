import type { MobileDashboardInput } from '@interestshield/financial-engine';
import { decodePortfolioBook, type PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
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
import { loadMobilePortfolioForOwner, saveMobilePortfolioForOwner } from '../mobile-portfolio-storage';
import { captureMobileSnapshotAssumptions, decodeMobileSnapshotAssumptions,
  readMobileSnapshotPortfolioState, serializeMobileRecoveryPortfolio } from './portfolio-snapshot';
export { serializeMobileRecoveryPortfolio } from './portfolio-snapshot';

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
  assumptions: MobileDashboardInput | null;
  portfolio: PortfolioBook | null;
  portfolioDocumentVersion?: 3;
  clientRevision: number;
  snapshotId: string;
  snapshotIdempotencyKey: string;
  updatedAt: string;
}

export interface MobileSnapshotRecoveryOptions {
  guestAssumptions: MobileDashboardInput | null;
  guestPortfolio: PortfolioBook | null;
  guestPortfolioDocumentVersion?: 3;
  rejectedCount: number;
  selectedSnapshotId: null;
  snapshots: MobileSnapshotRecoveryPreview[];
  streamRevisions: Record<string, number>;
}

export type MobileSnapshotRecoverySource =
  | { assumptions: MobileDashboardInput | null; portfolio?: PortfolioBook | null; portfolioDocumentVersion?: 3; kind: 'device' }
  | { assumptions: MobileDashboardInput | null; portfolio?: PortfolioBook | null; portfolioDocumentVersion?: 3; kind: 'guest' }
  | { kind: 'remote'; snapshot: MobileSnapshotRecoveryPreview };

export type MobileSnapshotRecoveryConfirmation =
  | { clientRevision: number; snapshotId: string }
  | {
    kind: 'device' | 'guest';
    ownerId: string;
    reviewedAssumptions: string;
    reviewedPortfolio?: string;
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

export function serializeMobileRecoveryAssumptions(input: MobileDashboardInput | null): string {
  if (input === null) return 'null';
  input = captureMobileSnapshotAssumptions(input);
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
  replacePortfolio?: (
    book: PortfolioBook,
    ownerLock?: MobileSnapshotOwnerLock,
    expectedRevision?: number,
    documentVersion?: 3
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
  try {
    const entries = row.assumptions_json.storage.filter(candidate => isRecord(candidate) && candidate.key === MOBILE_STORAGE_KEY);
    if (entries.length > 1) return null;
    const entry = entries[0];
    const assumptions = entry && typeof entry.value === 'string' ? decodeMobileSnapshotAssumptions(entry.value, expectedOwnerId) : null;
    if (entry && !assumptions) return null;
    const { book: portfolio, documentVersion } = readMobileSnapshotPortfolioState(row.assumptions_json.storage);
    if (!assumptions && !portfolio) return null;
    return { assumptions, portfolio, ...(documentVersion === undefined ? {} : { portfolioDocumentVersion: documentVersion }),
      clientRevision: row.client_revision, snapshotId: row.id,
      snapshotIdempotencyKey: row.idempotency_key, updatedAt: row.updated_at };
  } catch { return null; }
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
  const [rows, guest, guestPortfolio] = await Promise.all([
    queryOwnedRows(client, ownerId, currentStreamKey),
    loadMobileAssumptionsForOwner(null),
    loadMobilePortfolioForOwner(null),
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
    guestPortfolio: guestPortfolio.book,
    ...(guestPortfolio.documentVersion === undefined ? {} : { guestPortfolioDocumentVersion: guestPortfolio.documentVersion }),
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
    && JSON.stringify(left.assumptions) === JSON.stringify(right.assumptions)
    && serializeMobileRecoveryPortfolio(left.portfolio, left.portfolioDocumentVersion)
      === serializeMobileRecoveryPortfolio(right.portfolio, right.portfolioDocumentVersion);
}

function captureRecoverySource(source: MobileSnapshotRecoverySource): MobileSnapshotRecoverySource {
  const scenario = (value: MobileDashboardInput | null) => value === null ? null
    : captureMobileSnapshotAssumptions(value);
  const book = (value: PortfolioBook | null | undefined) => value == null ? null : decodePortfolioBook(value);
  return source.kind === 'remote' ? { kind: 'remote', snapshot: { ...source.snapshot,
    assumptions: scenario(source.snapshot.assumptions), portfolio: book(source.snapshot.portfolio) } }
    : { kind: source.kind, assumptions: scenario(source.assumptions), portfolio: book(source.portfolio),
      ...(source.portfolioDocumentVersion === undefined ? {} : { portfolioDocumentVersion: source.portfolioDocumentVersion }) };
}

export async function applyMobileSnapshotRecovery(
  client: SupabaseClient,
  input: {
    confirmation: MobileSnapshotRecoveryConfirmation;
    expectedOwnerId: string;
    reviewedLocalAssumptions: string;
    reviewedLocalPortfolio?: string;
    source: MobileSnapshotRecoverySource;
  },
  dependencies: MobileSnapshotRecoveryDependencies
): Promise<MobileSnapshotRecoveryResult> {
  input = { ...input, confirmation: { ...input.confirmation }, source: captureRecoverySource(input.source) };
  const ownerId = await verifyActiveOwner(client, input.expectedOwnerId);
  const options = await loadMobileSnapshotRecoveryOptions(client, ownerId);
  let assumptions: MobileDashboardInput | null;
  let sourcePortfolio: PortfolioBook | null;
  let sourcePortfolioDocumentVersion: 3 | undefined;

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
    sourcePortfolio = current.portfolio;
    sourcePortfolioDocumentVersion = current.portfolioDocumentVersion;
  } else if (input.source.kind === 'guest') {
    if (
      !('kind' in input.confirmation)
      || input.confirmation.kind !== 'guest'
      || requireOwnerId(input.confirmation.ownerId) !== ownerId
    ) throw new Error('Guest adoption requires confirmation for the active owner.');
    if (!options.guestAssumptions && !options.guestPortfolio) {
      throw new Error('No saved guest scenario or Portfolio is available to adopt.');
    }
    const reviewedAssumptions = serializeMobileRecoveryAssumptions(input.source.assumptions);
    if (
      input.confirmation.reviewedAssumptions !== reviewedAssumptions
      || serializeMobileRecoveryAssumptions(options.guestAssumptions) !== reviewedAssumptions
      || serializeMobileRecoveryPortfolio(options.guestPortfolio, options.guestPortfolioDocumentVersion)
        !== serializeMobileRecoveryPortfolio(input.source.portfolio ?? null, input.source.portfolioDocumentVersion)
      || options.guestPortfolio !== null && input.confirmation.reviewedPortfolio
        !== serializeMobileRecoveryPortfolio(options.guestPortfolio, options.guestPortfolioDocumentVersion)
    ) throw new Error('Guest assumptions changed. Review again before adopting them.');
    assumptions = options.guestAssumptions;
    sourcePortfolio = options.guestPortfolio;
    sourcePortfolioDocumentVersion = options.guestPortfolioDocumentVersion;
  } else {
    if (
      !('kind' in input.confirmation)
      || input.confirmation.kind !== 'device'
      || requireOwnerId(input.confirmation.ownerId) !== ownerId
      || input.confirmation.reviewedAssumptions
        !== serializeMobileRecoveryAssumptions(input.source.assumptions)
      || input.source.portfolio != null && input.confirmation.reviewedPortfolio
        !== serializeMobileRecoveryPortfolio(input.source.portfolio, input.source.portfolioDocumentVersion)
    ) throw new Error('Keeping this device requires confirmation of the reviewed assumptions.');
    assumptions = input.source.assumptions;
    sourcePortfolio = input.source.portfolio ?? null;
    sourcePortfolioDocumentVersion = input.source.portfolioDocumentVersion;
  }

  const getSnapshotIdempotencyKey = dependencies.getSnapshotIdempotencyKey
    ?? getOrCreateMobileSyncIdempotencyKey;
  const snapshotIdempotencyKey = await getSnapshotIdempotencyKey();
  const serverRevision = options.streamRevisions[snapshotIdempotencyKey] ?? 0;
  const outbox = dependencies.outbox ?? mobileSnapshotOutbox;

  const discarded = await withMobileSnapshotOwnerLock(ownerId, async (ownerLock) => {
    await verifyActiveOwner(client, ownerId);
    const [local, localPortfolio] = await Promise.all([
      loadMobileAssumptionsForOwner(ownerId, undefined, ownerLock), loadMobilePortfolioForOwner(ownerId, ownerLock),
    ]);
    if (localPortfolio.backend === 'unavailable') throw new Error('Portfolio storage is unavailable. Recovery was not staged.');
    const currentLocalAssumptions = serializeMobileRecoveryAssumptions(local.input);
    const currentLocalPortfolio = serializeMobileRecoveryPortfolio(localPortfolio.book, localPortfolio.documentVersion);
    if (currentLocalAssumptions !== input.reviewedLocalAssumptions) {
      throw new Error('Local assumptions changed after review. Review recovery again.');
    }
    if (
      input.source.kind === 'device'
      && input.source.assumptions !== null
      && serializeMobileRecoveryAssumptions(input.source.assumptions) !== currentLocalAssumptions
    ) throw new Error('This device changed after review. Review recovery again.');
    if (input.reviewedLocalPortfolio !== undefined ? input.reviewedLocalPortfolio !== currentLocalPortfolio
      : localPortfolio.book !== null || sourcePortfolio !== null) {
      throw new Error('Local Portfolio changed after review or was not reviewed. Review recovery again.');
    }
    const targetAssumptions = assumptions ?? local.input;
    const targetPortfolio = sourcePortfolio ?? localPortfolio.book;
    // Active3 cannot downgrade, even when an older source supplies the replacement book.
    const targetPortfolioDocumentVersion = sourcePortfolioDocumentVersion ?? localPortfolio.documentVersion;

    const staged = await outbox.stageRecovery({
      assumptions: targetAssumptions,
      portfolio: targetPortfolio,
      ...(targetPortfolioDocumentVersion === undefined ? {} : { portfolioDocumentVersion: targetPortfolioDocumentVersion }),
      expectedLocalAssumptions: currentLocalAssumptions,
      expectedLocalPortfolio: currentLocalPortfolio,
      expectedOwnerId: ownerId,
      serverRevision,
      snapshotIdempotencyKey,
      sourceKind: input.source.kind,
    }, ownerLock);
    try {
      if (assumptions !== null && await dependencies.replaceAssumptions(targetAssumptions, ownerLock, local.revision) === 'unavailable') {
        throw new Error('Recovery requires durable scenario storage.');
      }
      if (targetPortfolio !== null && serializeMobileRecoveryPortfolio(targetPortfolio, targetPortfolioDocumentVersion) !== currentLocalPortfolio) {
        if (dependencies.replacePortfolio) {
          if (await dependencies.replacePortfolio(targetPortfolio, ownerLock, localPortfolio.revision, targetPortfolioDocumentVersion) === 'unavailable') {
            throw new Error('Recovery requires durable Portfolio storage.');
          }
        }
        else await saveMobilePortfolioForOwner(ownerId, targetPortfolio, { ownerLock, expectedRevision: localPortfolio.revision,
          ...(targetPortfolioDocumentVersion === undefined ? {} : { documentVersion: targetPortfolioDocumentVersion }) });
      }
      await verifyActiveOwner(client, ownerId);
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
    replacePortfolio?: MobileSnapshotRecoveryDependencies['replacePortfolio'];
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
    const localPortfolio = pending.expectedLocalPortfolio === undefined ? null : await loadMobilePortfolioForOwner(ownerId, ownerLock);
    if (localPortfolio) {
      if (localPortfolio.backend === 'unavailable') throw new Error('Pending recovery requires durable Portfolio storage.');
      const currentBook = serializeMobileRecoveryPortfolio(localPortfolio.book, localPortfolio.documentVersion);
      const targetBook = serializeMobileRecoveryPortfolio(pending.portfolio ?? null, pending.portfolioDocumentVersion);
      if (currentBook !== pending.expectedLocalPortfolio && currentBook !== targetBook) {
        throw new Error('Local Portfolio changed after recovery was confirmed. Review is required.');
      }
    }
    let backend: MobileAssumptionStorageBackend = local.backend;
    if (current === target) {
      // A half-applied pair must not rewrite the store that already reached its target.
    } else if (dependencies.replaceAssumptions) {
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
    if (localPortfolio && pending.portfolio !== null && pending.portfolio !== undefined
      && serializeMobileRecoveryPortfolio(localPortfolio.book, localPortfolio.documentVersion)
        !== serializeMobileRecoveryPortfolio(pending.portfolio, pending.portfolioDocumentVersion)) {
      if (dependencies.replacePortfolio) {
        const bookBackend = await dependencies.replacePortfolio(pending.portfolio, ownerLock, localPortfolio.revision, pending.portfolioDocumentVersion);
        if (bookBackend === 'unavailable') throw new Error('Pending recovery requires durable Portfolio storage.');
      } else await saveMobilePortfolioForOwner(ownerId, pending.portfolio, { ownerLock, expectedRevision: localPortfolio.revision,
        ...(pending.portfolioDocumentVersion === undefined ? {} : { documentVersion: pending.portfolioDocumentVersion }) });
    }
    await outbox.commitRecovery(ownerId, pending.recoveryId, ownerLock);
    return true;
  });
}
