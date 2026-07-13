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

  const storage: SnapshotStorageEntry[] = [{
    key: 'interestshield-mobile-assumptions-v1',
    value: encodeMobileAssumptions(input.assumptions),
  }];
  const plan = buildSnapshotSyncPlan({
    displayName: input.displayName,
    idempotencyKey: await getOrCreateMobileSyncIdempotencyKey(),
    ownerId,
    storage,
  });

  const { error: profileError } = await client
    .from(plan.profile.table)
    .upsert(plan.profile.row, { onConflict: plan.profile.onConflict });
  if (profileError) throw syncError('profile upsert', profileError);

  const { data: snapshot, error: snapshotError } = await client
    .from(plan.snapshot.table)
    .upsert(plan.snapshot.row, { onConflict: plan.snapshot.onConflict })
    .select('id')
    .single();
  if (snapshotError || !snapshot?.id) throw syncError('snapshot upsert', snapshotError);

  const { error: auditError } = await client.from('audit_events').insert({
    owner_id: ownerId,
    event_type: 'mobile-snapshot-synced',
    event_json: {
      contract_version: plan.version,
      idempotency_key: plan.snapshot.row.idempotency_key,
      snapshot_id: snapshot.id,
    },
  });
  if (auditError) throw syncError('audit append', auditError);

  return { ownerId, snapshotId: snapshot.id };
}
