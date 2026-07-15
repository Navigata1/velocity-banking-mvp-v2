import {
  asSnapshotRevisionConflict,
  buildSnapshotSyncPlan,
  isSafeSnapshotRevision,
  type SnapshotStorageEntry,
  type SnapshotSyncPlan,
} from '@interestshield/persistence-contract';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MobileDashboardInput } from '@interestshield/financial-engine';
import { encodeMobileAssumptions } from '../mobile-assumption-storage';
import { getOrCreateMobileSyncIdempotencyKey } from './sync-identity';

export interface MobileSnapshotSyncInput {
  assumptions: MobileDashboardInput;
  clientRevision: number;
  displayName?: string;
  expectedOwnerId: string;
  operationIdempotencyKey: string;
  snapshotIdempotencyKey?: string;
}

export interface MobileSnapshotSyncResult {
  clientRevision: number;
  ownerId: string;
  snapshotId: string;
}

export interface PreparedMobileSnapshotSync {
  assumptionsJson: SnapshotSyncPlan['snapshot']['row']['assumptions_json'];
  clientRevision: number;
  displayName: string | null;
  expectedOwnerId: string;
  operationIdempotencyKey: string;
  snapshotIdempotencyKey: string;
  snapshotVersion: SnapshotSyncPlan['version'];
}

function syncError(stage: string, error: { message?: string } | null): Error {
  const detail = error?.message ? ` ${error.message}` : '';
  return new Error(`Mobile snapshot sync failed during ${stage}.${detail}`);
}

export async function prepareMobileSnapshotSync(
  input: MobileSnapshotSyncInput
): Promise<PreparedMobileSnapshotSync> {
  if (!isSafeSnapshotRevision(input.clientRevision)) {
    throw new Error('Mobile snapshot sync requires a positive safe client revision.');
  }
  const storage: SnapshotStorageEntry[] = [{
    key: 'interestshield-mobile-assumptions-v1',
    value: encodeMobileAssumptions(input.assumptions, undefined, input.expectedOwnerId),
  }];
  const plan = buildSnapshotSyncPlan({
    displayName: input.displayName,
    idempotencyKey: input.snapshotIdempotencyKey ?? await getOrCreateMobileSyncIdempotencyKey(),
    ownerId: input.expectedOwnerId,
    storage,
  });

  return {
    assumptionsJson: plan.snapshot.row.assumptions_json,
    clientRevision: input.clientRevision,
    displayName: plan.profile.row.display_name,
    expectedOwnerId: input.expectedOwnerId,
    operationIdempotencyKey: input.operationIdempotencyKey,
    snapshotIdempotencyKey: plan.snapshot.row.idempotency_key,
    snapshotVersion: plan.version,
  };
}

export async function syncPreparedMobileSnapshot(
  client: SupabaseClient,
  input: PreparedMobileSnapshotSync
): Promise<MobileSnapshotSyncResult> {
  const { data: claimsData, error: claimsError } = await client.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;
  if (claimsError || typeof ownerId !== 'string') throw syncError('identity verification', claimsError);
  if (ownerId !== input.expectedOwnerId) {
    throw new Error('Mobile snapshot sync stopped because the account changed before sync. Try again.');
  }

  const { data: snapshotId, error } = await client.rpc('sync_interestshield_snapshot', {
    p_assumptions_json: input.assumptionsJson,
    p_client_revision: input.clientRevision,
    p_display_name: input.displayName,
    p_expected_owner_id: input.expectedOwnerId,
    p_operation_idempotency_key: input.operationIdempotencyKey,
    p_snapshot_idempotency_key: input.snapshotIdempotencyKey,
    p_snapshot_version: input.snapshotVersion,
  });
  if (error) {
    const conflict = asSnapshotRevisionConflict(error);
    if (conflict) throw conflict;
    throw syncError('transactional snapshot sync', error);
  }
  if (
    !snapshotId
    || typeof snapshotId !== 'object'
    || !('snapshot_id' in snapshotId)
    || typeof snapshotId.snapshot_id !== 'string'
    || !('client_revision' in snapshotId)
    || snapshotId.client_revision !== input.clientRevision
  ) throw syncError('transactional snapshot receipt', null);

  return {
    clientRevision: input.clientRevision,
    ownerId,
    snapshotId: snapshotId.snapshot_id,
  };
}

export async function syncMobileSnapshot(
  client: SupabaseClient,
  input: MobileSnapshotSyncInput
): Promise<MobileSnapshotSyncResult> {
  return syncPreparedMobileSnapshot(client, await prepareMobileSnapshotSync(input));
}
