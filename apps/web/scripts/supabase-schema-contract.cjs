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
