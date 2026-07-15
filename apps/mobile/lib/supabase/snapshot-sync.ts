import {
  buildSnapshotSyncPlan,
  type SnapshotStorageEntry,
  type SnapshotSyncPlan,
} from '@interestshield/persistence-contract';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MobileDashboardInput } from '@interestshield/financial-engine';
import { encodeMobileAssumptions } from '../mobile-assumption-storage';
import { getOrCreateMobileSyncIdempotencyKey } from './sync-identity';

export interface MobileSnapshotSyncInput {
  assumptions: MobileDashboardInput;
  displayName?: string;
  expectedOwnerId: string;
  operationIdempotencyKey: string;
}

export interface MobileSnapshotSyncResult {
  ownerId: string;
  snapshotId: string;
}

export interface PreparedMobileSnapshotSync {
  assumptionsJson: SnapshotSyncPlan['snapshot']['row']['assumptions_json'];
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
  const storage: SnapshotStorageEntry[] = [{
    key: 'interestshield-mobile-assumptions-v1',
    value: encodeMobileAssumptions(input.assumptions, undefined, input.expectedOwnerId),
  }];
  const plan = buildSnapshotSyncPlan({
    displayName: input.displayName,
    idempotencyKey: await getOrCreateMobileSyncIdempotencyKey(),
    ownerId: input.expectedOwnerId,
    storage,
  });

  return {
    assumptionsJson: plan.snapshot.row.assumptions_json,
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
    p_display_name: input.displayName,
    p_expected_owner_id: input.expectedOwnerId,
    p_operation_idempotency_key: input.operationIdempotencyKey,
    p_snapshot_idempotency_key: input.snapshotIdempotencyKey,
    p_snapshot_version: input.snapshotVersion,
  });
  if (error || typeof snapshotId !== 'string') {
    throw syncError('transactional snapshot sync', error);
  }

  return { ownerId, snapshotId };
}

export async function syncMobileSnapshot(
  client: SupabaseClient,
  input: MobileSnapshotSyncInput
): Promise<MobileSnapshotSyncResult> {
  return syncPreparedMobileSnapshot(client, await prepareMobileSnapshotSync(input));
}
