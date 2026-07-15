import {
  buildSnapshotSyncPlan,
  type SnapshotStorageEntry,
} from '@interestshield/persistence-contract';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface WebSnapshotSyncInput {
  idempotencyKey: string;
  operationIdempotencyKey: string;
  displayName?: string;
  storage: SnapshotStorageEntry[];
}

export interface WebSnapshotSyncResult {
  ownerId: string;
  snapshotId: string;
}

function syncError(stage: string, error: { message?: string } | null): Error {
  const detail = error?.message ? ` ${error.message}` : '';
  return new Error(`Snapshot sync failed during ${stage}.${detail}`);
}

export async function syncLocalSnapshot(
  client: SupabaseClient,
  input: WebSnapshotSyncInput
): Promise<WebSnapshotSyncResult> {
  const { data: claimsData, error: claimsError } = await client.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;
  if (claimsError || typeof ownerId !== 'string') throw syncError('identity verification', claimsError);

  const plan = buildSnapshotSyncPlan({ ...input, ownerId });
  const { data: snapshotId, error } = await client.rpc('sync_interestshield_snapshot', {
    p_assumptions_json: plan.snapshot.row.assumptions_json,
    p_display_name: plan.profile.row.display_name,
    p_expected_owner_id: ownerId,
    p_operation_idempotency_key: input.operationIdempotencyKey,
    p_snapshot_idempotency_key: plan.snapshot.row.idempotency_key,
    p_snapshot_version: plan.version,
  });
  if (error || typeof snapshotId !== 'string') {
    throw syncError('transactional snapshot sync', error);
  }

  return { ownerId, snapshotId };
}
