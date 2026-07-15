import {
  buildSnapshotSyncPlan,
  type SnapshotStorageEntry,
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

function syncError(stage: string, error: { message?: string } | null): Error {
  const detail = error?.message ? ` ${error.message}` : '';
  return new Error(`Mobile snapshot sync failed during ${stage}.${detail}`);
}

export async function syncMobileSnapshot(
  client: SupabaseClient,
  input: MobileSnapshotSyncInput
): Promise<MobileSnapshotSyncResult> {
  const { data: claimsData, error: claimsError } = await client.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;
  if (claimsError || typeof ownerId !== 'string') throw syncError('identity verification', claimsError);
  if (ownerId !== input.expectedOwnerId) {
    throw new Error('Mobile snapshot sync stopped because the account changed before sync. Try again.');
  }

  const storage: SnapshotStorageEntry[] = [{
    key: 'interestshield-mobile-assumptions-v1',
    value: encodeMobileAssumptions(input.assumptions, undefined, ownerId),
  }];
  const plan = buildSnapshotSyncPlan({
    displayName: input.displayName,
    idempotencyKey: await getOrCreateMobileSyncIdempotencyKey(),
    ownerId,
    storage,
  });

  const { data: snapshotId, error } = await client.rpc('sync_interestshield_snapshot', {
    p_assumptions_json: plan.snapshot.row.assumptions_json,
    p_display_name: plan.profile.row.display_name,
    p_expected_owner_id: input.expectedOwnerId,
    p_operation_idempotency_key: input.operationIdempotencyKey,
    p_snapshot_idempotency_key: plan.snapshot.row.idempotency_key,
    p_snapshot_version: plan.version,
  });
  if (error || typeof snapshotId !== 'string') {
    throw syncError('transactional snapshot sync', error);
  }

  return { ownerId, snapshotId };
}
