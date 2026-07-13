param(
  [string]$Container = 'supabase_db_Interest_Shield'
)

$ErrorActionPreference = 'Stop'
$sourceDatabase = 'postgres'
$restoreDatabase = 'interestshield_restore_drill'
$ownerId = '10000000-0000-4000-8000-000000000001'
$snapshotId = '20000000-0000-4000-8000-000000000001'
$authArchive = '/tmp/interestshield-auth-users.dump'
$publicArchive = '/tmp/interestshield-public.dump'

function Invoke-Docker {
  param([string[]]$Arguments)
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: docker $($Arguments -join ' ')"
  }
}

function Invoke-Psql {
  param([string]$Database, [string]$Sql)
  Invoke-Docker -Arguments @('exec', $Container, 'psql', '-U', 'postgres', '-d', $Database, '-v', 'ON_ERROR_STOP=1', '-c', $Sql)
}

$containerName = (& docker inspect --format '{{.Name}}' $Container 2>$null).TrimStart('/')
if ($LASTEXITCODE -ne 0 -or $containerName -ne $Container) {
  throw "Expected local Supabase database container '$Container' is not running."
}

$seedSql = @"
insert into auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values (
  '$ownerId', 'authenticated', 'authenticated', 'restore-drill@interestshield.invalid',
  '', '{}'::jsonb, '{}'::jsonb, now(), now(), false, false
);
insert into public.profiles (id, display_name, onboarding_status)
values ('$ownerId', 'Restore Drill', 'active');
insert into public.financial_snapshots (
  id, owner_id, idempotency_key, snapshot_version, source, assumptions_json
) values (
  '$snapshotId', '$ownerId', 'restore-drill-install-0001', 1, 'local-demo-handoff',
  jsonb_build_object('drill', 'backup-restore', 'balance', 12345)
);
insert into public.simulation_runs (
  id, owner_id, snapshot_id, engine_version, route, result_summary_json
) values (
  '30000000-0000-4000-8000-000000000001', '$ownerId', '$snapshotId',
  'restore-drill-v1', 'simulator', jsonb_build_object('months', 42)
);
insert into public.learning_progress (
  id, owner_id, completed_lessons_json, quiz_answers_json
) values (
  '40000000-0000-4000-8000-000000000001', '$ownerId', jsonb_build_array('money-loop'), '{}'::jsonb
);
insert into public.export_records (
  id, owner_id, snapshot_id, export_kind, metadata_json
) values (
  '50000000-0000-4000-8000-000000000001', '$ownerId', '$snapshotId',
  'report', jsonb_build_object('drill', true)
);
insert into public.audit_events (id, owner_id, event_type, event_json)
values (
  '60000000-0000-4000-8000-000000000001', '$ownerId',
  'backup-restore-drill-seeded', jsonb_build_object('drill', true)
);
"@

try {
  Invoke-Psql $sourceDatabase "delete from auth.users where id = '$ownerId';"
  Invoke-Psql $sourceDatabase $seedSql

  $sourcePolicies = (& docker exec $Container psql -U postgres -d $sourceDatabase -Atc "select count(*) from pg_policies where schemaname='public';").Trim()
  if ($LASTEXITCODE -ne 0 -or $sourcePolicies -ne '20') {
    throw "Expected 20 source RLS policies, found '$sourcePolicies'."
  }

  Invoke-Docker -Arguments @('exec', $Container, 'pg_dump', '-U', 'postgres', '-d', $sourceDatabase, '-Fc', '-t', 'auth.users', '-f', $authArchive)
  Invoke-Docker -Arguments @('exec', $Container, 'pg_dump', '-U', 'postgres', '-d', $sourceDatabase, '-Fc', '-n', 'public', '-f', $publicArchive)

  Invoke-Psql $sourceDatabase "delete from auth.users where id = '$ownerId';"
  Invoke-Psql $sourceDatabase "drop database if exists $restoreDatabase with (force);"
  Invoke-Psql $sourceDatabase "create database $restoreDatabase;"
  Invoke-Psql $restoreDatabase "create schema auth; create function auth.uid() returns uuid language sql stable as 'select null::uuid'; drop schema public cascade;"

  Invoke-Docker -Arguments @('exec', $Container, 'pg_restore', '-U', 'postgres', '-d', $restoreDatabase, '--exit-on-error', '--no-owner', '--no-privileges', $authArchive)
  Invoke-Docker -Arguments @('exec', $Container, 'pg_restore', '-U', 'postgres', '-d', $restoreDatabase, '--exit-on-error', '--no-owner', '--no-privileges', $publicArchive)

  $verificationSql = @"
select jsonb_build_object(
  'auth_users', (select count(*) from auth.users where id = '$ownerId'),
  'profiles', (select count(*) from public.profiles where id = '$ownerId'),
  'snapshots', (select count(*) from public.financial_snapshots where owner_id = '$ownerId'),
  'runs', (select count(*) from public.simulation_runs where owner_id = '$ownerId'),
  'learning', (select count(*) from public.learning_progress where owner_id = '$ownerId'),
  'exports', (select count(*) from public.export_records where owner_id = '$ownerId'),
  'audit', (select count(*) from public.audit_events where owner_id = '$ownerId'),
  'tables', (select count(*) from pg_tables where schemaname = 'public' and tablename in ('profiles','financial_snapshots','simulation_runs','learning_progress','export_records','audit_events')),
  'rls_tables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relrowsecurity and c.relname in ('profiles','financial_snapshots','simulation_runs','learning_progress','export_records','audit_events')),
  'policies', (select count(*) from pg_policies where schemaname = 'public'),
  'payload', (select assumptions_json->>'drill' from public.financial_snapshots where id = '$snapshotId')
)::text;
"@
  $result = (& docker exec $Container psql -U postgres -d $restoreDatabase -Atc $verificationSql).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Restore verification query failed.' }
  $verification = $result | ConvertFrom-Json

  foreach ($property in 'auth_users','profiles','snapshots','runs','learning','exports','audit') {
    if ($verification.$property -ne 1) { throw "Restore verification failed for $property." }
  }
  if ($verification.tables -ne 6 -or $verification.rls_tables -ne 6 -or $verification.policies -ne 20) {
    throw 'Restore verification failed for schema, RLS, or policy counts.'
  }
  if ($verification.payload -ne 'backup-restore') { throw 'Restored snapshot payload does not match.' }

  Write-Output "PASS InterestShield Supabase backup/restore drill"
  Write-Output $result
}
finally {
  & docker exec $Container psql -U postgres -d $sourceDatabase -v ON_ERROR_STOP=1 -c "delete from auth.users where id = '$ownerId';" *> $null
  & docker exec $Container psql -U postgres -d $sourceDatabase -v ON_ERROR_STOP=1 -c "drop database if exists $restoreDatabase with (force);" *> $null
  & docker exec $Container rm -f $authArchive $publicArchive *> $null
}
