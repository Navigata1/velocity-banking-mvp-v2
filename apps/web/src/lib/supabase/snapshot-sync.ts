import {
  asSnapshotRevisionConflict,
  buildSnapshotSyncPlan,
  type SnapshotStorageEntry,
} from '@interestshield/persistence-contract';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  webSnapshotOutbox,
  type PreparedWebSnapshotSync,
  type WebSnapshotOutbox,
  type WebSnapshotOperationInput,
} from './snapshot-outbox';

export interface WebSnapshotSyncInput {
  idempotencyKey: string;
  displayName?: string;
  storage: SnapshotStorageEntry[];
}

export interface WebSnapshotSyncResult {
  clientRevision: number;
  ownerId: string;
  snapshotId: string;
}

interface WebSnapshotSyncDependencies {
  outbox?: WebSnapshotOutbox;
}

function syncError(stage: string, error: { message?: string } | null): Error {
  const detail = error?.message ? ` ${error.message}` : '';
  return new Error(`Snapshot sync failed during ${stage}.${detail}`);
}

function operationMatchesIntent(
  operation: PreparedWebSnapshotSync,
  intent: WebSnapshotOperationInput
): boolean {
  const operationStorage = operation.assumptionsJson.storage;
  const intentStorage = intent.assumptionsJson.storage;
  return operation.displayName === intent.displayName
    && operation.expectedOwnerId === intent.expectedOwnerId
    && operation.snapshotIdempotencyKey === intent.snapshotIdempotencyKey
    && operation.snapshotVersion === intent.snapshotVersion
    && operationStorage.length === intentStorage.length
    && operationStorage.every((entry, index) => (
      entry.key === intentStorage[index]?.key && entry.value === intentStorage[index]?.value
    ));
}

export async function syncLocalSnapshot(
  client: SupabaseClient,
  input: WebSnapshotSyncInput,
  dependencies: WebSnapshotSyncDependencies = {}
): Promise<WebSnapshotSyncResult> {
  const { data: claimsData, error: claimsError } = await client.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;
  if (claimsError || typeof ownerId !== 'string') throw syncError('identity verification', claimsError);

  const outbox = dependencies.outbox ?? webSnapshotOutbox;
  const plan = buildSnapshotSyncPlan({ ...input, ownerId });
  const intent: WebSnapshotOperationInput = {
    assumptionsJson: plan.snapshot.row.assumptions_json,
    displayName: plan.profile.row.display_name,
    expectedOwnerId: ownerId,
    snapshotIdempotencyKey: plan.snapshot.row.idempotency_key,
    snapshotVersion: plan.version,
  };
  let operation = await outbox.prepare(intent);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data: receipt, error } = await client.rpc('sync_interestshield_snapshot', {
      p_assumptions_json: operation.assumptionsJson,
      p_client_revision: operation.clientRevision,
      p_display_name: operation.displayName,
      p_expected_owner_id: operation.expectedOwnerId,
      p_operation_idempotency_key: operation.operationIdempotencyKey,
      p_snapshot_idempotency_key: operation.snapshotIdempotencyKey,
      p_snapshot_version: operation.snapshotVersion,
    });
    if (error) {
      const conflict = asSnapshotRevisionConflict(error);
      if (conflict) {
        await outbox.markConflict(operation, conflict);
        throw conflict;
      }
      throw syncError('transactional snapshot sync', error);
    }
    if (
      !receipt
      || typeof receipt !== 'object'
      || !('snapshot_id' in receipt)
      || typeof receipt.snapshot_id !== 'string'
      || !('client_revision' in receipt)
      || receipt.client_revision !== operation.clientRevision
    ) throw syncError('transactional snapshot receipt', null);

    await outbox.acknowledge(operation);
    if (operationMatchesIntent(operation, intent)) {
      return {
        clientRevision: operation.clientRevision,
        ownerId,
        snapshotId: receipt.snapshot_id,
      };
    }
    operation = await outbox.prepare(intent);
  }

  throw new Error('Snapshot sync paused because too many browser tabs are changing this snapshot. Try again.');
}
