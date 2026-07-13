import {
  buildSnapshotSyncPlan,
  type SnapshotStorageEntry,
} from '@interestshield/persistence-contract';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface WebSnapshotSyncInput {
  idempotencyKey: string;
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
    event_type: 'local-demo-snapshot-synced',
    event_json: {
      contract_version: plan.version,
      idempotency_key: input.idempotencyKey,
      snapshot_id: snapshot.id,
    },
  });
  if (auditError) throw syncError('audit append', auditError);

  return { ownerId, snapshotId: snapshot.id };
}
