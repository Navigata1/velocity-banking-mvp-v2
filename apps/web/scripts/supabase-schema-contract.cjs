/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'supabase',
  'migrations',
  '202607020001_first_lane_owner_scoped_schema.sql'
);
const sql = fs.readFileSync(migrationPath, 'utf8').replace(/\s+/g, ' ').toLowerCase();
const idempotencyMigrationPath = path.resolve(
  path.dirname(migrationPath),
  '20260713024039_snapshot_sync_idempotency.sql'
);
const idempotencySql = fs.readFileSync(idempotencyMigrationPath, 'utf8').replace(/\s+/g, ' ').toLowerCase();
const atomicSyncMigrationPath = path.resolve(
  path.dirname(migrationPath),
  '20260715001056_atomic_snapshot_sync.sql'
);
const atomicSyncSql = fs.readFileSync(atomicSyncMigrationPath, 'utf8').replace(/\s+/g, ' ').toLowerCase();

const tables = [
  'profiles',
  'financial_snapshots',
  'simulation_runs',
  'learning_progress',
  'export_records',
  'audit_events',
];
const ownerTables = tables.filter((table) => table !== 'profiles');

for (const table of tables) {
  assert.ok(sql.includes(`create table public.${table}`), `missing ${table} table`);
  assert.ok(
    sql.includes(`alter table public.${table} enable row level security`),
    `${table} must enable RLS`
  );
}

for (const table of ownerTables) {
  const tableStart = sql.indexOf(`create table public.${table}`);
  const tableEnd = sql.indexOf('create table public.', tableStart + 1);
  const definition = sql.slice(tableStart, tableEnd === -1 ? sql.length : tableEnd);
  assert.match(
    definition,
    /owner_id uuid not null references public\.profiles\(id\) on delete cascade/,
    `${table} owner must flow through profiles`
  );
}

assert.match(sql, /unique \(id, owner_id\)/, 'snapshots need an owner-addressable unique key');
assert.match(
  sql,
  /foreign key \(snapshot_id, owner_id\) references public\.financial_snapshots\(id, owner_id\) on delete cascade/,
  'simulation runs must reference a snapshot owned by the same user'
);
assert.match(
  sql,
  /foreign key \(snapshot_id, owner_id\) references public\.financial_snapshots\(id, owner_id\) on delete set null \(snapshot_id\)/,
  'exports must retain their owner when a snapshot is removed'
);

assert.match(sql, /from anon, public/, 'private tables must revoke anon and PUBLIC privileges');
assert.doesNotMatch(sql, /grant [^;]+ to anon/, 'private tables must not grant anon access');
assert.match(
  sql,
  /grant select, insert on public\.audit_events to authenticated/,
  'client audit events must be append-only'
);
assert.doesNotMatch(sql, /audit_events_delete_own/, 'clients must not delete audit history');
assert.doesNotMatch(sql, /security definer|auth\.role\(|user_metadata/, 'migration contains an unsafe authorization primitive');
assert.match(idempotencySql, /add column idempotency_key text/, 'snapshot sync needs a stable idempotency key');
assert.match(
  idempotencySql,
  /unique \(owner_id, idempotency_key\)/,
  'snapshot idempotency must be scoped to the authenticated owner'
);
assert.match(
  idempotencySql,
  /source = 'local-demo-handoff'.*idempotency_key is not null/,
  'local demo handoffs must always carry an idempotency key'
);
assert.match(atomicSyncSql, /alter table public\.audit_events add column idempotency_key text/);
assert.match(atomicSyncSql, /unique index audit_events_owner_event_idempotency_key_unique/);
assert.match(atomicSyncSql, /create function public\.sync_interestshield_snapshot\(/);
assert.match(atomicSyncSql, /security definer/);
assert.match(atomicSyncSql, /set search_path = ''/);
assert.match(atomicSyncSql, /auth\.uid\(\)/, 'atomic sync must derive its owner from the authenticated JWT');
assert.match(
  atomicSyncSql,
  /p_expected_owner_id <> v_owner_id/,
  'atomic sync must reject account changes inside the server transaction'
);
assert.match(atomicSyncSql, /insert into public\.profiles/);
assert.match(atomicSyncSql, /insert into public\.financial_snapshots/);
assert.match(atomicSyncSql, /insert into public\.audit_events/);
assert.match(
  atomicSyncSql,
  /revoke insert, update, delete on table public\.profiles, public\.financial_snapshots from authenticated/,
  'authenticated clients must not bypass the atomic profile and snapshot contract'
);
assert.match(
  atomicSyncSql,
  /revoke insert on table public\.audit_events from authenticated/,
  'authenticated clients must not forge atomic sync receipts'
);
assert.match(
  atomicSyncSql,
  /pg_advisory_xact_lock/,
  'atomic sync must serialize retries for each owner-operation pair'
);
assert.match(
  atomicSyncSql,
  /request_fingerprint/,
  'atomic sync receipts must bind an operation key to one immutable request'
);
assert.match(
  atomicSyncSql,
  /already used with a different request/,
  'operation-key collisions must fail before snapshot mutation'
);
assert.match(
  atomicSyncSql,
  /jsonb_typeof\(p_assumptions_json\) is distinct from 'object'/,
  'atomic sync JSON validation must reject SQL null and missing fields'
);
assert.match(
  atomicSyncSql,
  /coalesce\(excluded\.display_name, public\.profiles\.display_name\)/,
  'sync without a display name must preserve the existing profile name'
);
assert.match(atomicSyncSql, /revoke all on function public\.sync_interestshield_snapshot[^;]+from public, anon, authenticated/);
assert.match(atomicSyncSql, /grant execute on function public\.sync_interestshield_snapshot[^;]+to authenticated/);

for (const table of ['profiles', 'financial_snapshots', 'learning_progress']) {
  const policy = `${table}_update_own`;
  const start = sql.indexOf(`create policy "${policy}"`);
  const end = sql.indexOf('create policy', start + 1);
  const definition = sql.slice(start, end === -1 ? sql.length : end);
  assert.ok(start >= 0, `missing ${policy}`);
  assert.match(definition, /using \(\(select auth\.uid\(\)\) = (id|owner_id)\)/, `${policy} needs USING`);
  assert.match(definition, /with check \(\(select auth\.uid\(\)\) = (id|owner_id)\)/, `${policy} needs WITH CHECK`);
}

console.log(`Supabase schema contract passed ${tables.length} owner-scoped tables.`);
