-- One authenticated RPC keeps snapshot state and its audit receipt in one transaction.
alter table public.audit_events
  add column idempotency_key text;

alter table public.audit_events
  add constraint audit_events_idempotency_key_format_check
  check (
    idempotency_key is null
    or idempotency_key ~ '^[A-Za-z0-9._:-]{16,128}$'
  );

create unique index audit_events_owner_event_idempotency_key_unique
  on public.audit_events (owner_id, event_type, idempotency_key)
  where idempotency_key is not null;

create function public.sync_interestshield_snapshot(
  p_snapshot_idempotency_key text,
  p_operation_idempotency_key text,
  p_snapshot_version integer,
  p_assumptions_json jsonb,
  p_expected_owner_id uuid,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_snapshot_id uuid;
  v_storage jsonb;
  v_display_name text;
  v_request_fingerprint text;
  v_existing_receipt jsonb;
begin
  if v_owner_id is null then
    raise exception 'Snapshot sync requires an authenticated owner.' using errcode = '28000';
  end if;
  if p_expected_owner_id is null or p_expected_owner_id <> v_owner_id then
    raise exception 'Snapshot sync stopped because the authenticated owner changed.' using errcode = '42501';
  end if;
  if p_snapshot_idempotency_key is null or p_snapshot_idempotency_key !~ '^[A-Za-z0-9._:-]{16,128}$' then
    raise exception 'Snapshot sync identity key is invalid.' using errcode = '22023';
  end if;
  if p_operation_idempotency_key is null or p_operation_idempotency_key !~ '^[A-Za-z0-9._:-]{16,128}$' then
    raise exception 'Snapshot sync operation key is invalid.' using errcode = '22023';
  end if;
  if p_snapshot_version is distinct from 1 then
    raise exception 'Snapshot sync contract version is unsupported.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_assumptions_json) is distinct from 'object'
    or p_assumptions_json ->> 'contract_version' is distinct from p_snapshot_version::text
    or jsonb_typeof(p_assumptions_json -> 'storage') is distinct from 'array'
    or jsonb_array_length(p_assumptions_json -> 'storage') = 0 then
    raise exception 'Snapshot sync assumptions envelope is invalid.' using errcode = '22023';
  end if;

  v_storage := p_assumptions_json -> 'storage';
  if exists (
    select 1
    from jsonb_array_elements(v_storage) as entry
    where jsonb_typeof(entry) is distinct from 'object'
      or entry ->> 'key' is null
      or entry ->> 'key' not in (
        'velocity-bank-storage',
        'interestshield-portfolio-v1',
        'interestshield-learn-progress',
        'interestshield-preferences-v1',
        'interestshield-theme',
        'interestshield-app-v1',
        'interestshield-mobile-assumptions-v1'
      )
      or jsonb_typeof(entry -> 'value') is distinct from 'string'
  ) or (
    select count(*) <> count(distinct entry ->> 'key')
    from jsonb_array_elements(v_storage) as entry
  ) then
    raise exception 'Snapshot sync storage entries are invalid.' using errcode = '22023';
  end if;

  v_display_name := nullif(left(btrim(coalesce(p_display_name, '')), 120), '');
  v_request_fingerprint := encode(
    extensions.digest(
      jsonb_build_object(
        'assumptions_json', p_assumptions_json,
        'display_name', v_display_name,
        'snapshot_idempotency_key', p_snapshot_idempotency_key,
        'snapshot_version', p_snapshot_version
      )::text,
      'sha256'
    ),
    'hex'
  );

  -- Serialize retries so only one transaction can claim an owner-operation pair.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner_id::text || ':' || p_operation_idempotency_key, 0)
  );

  select event_json
    into v_existing_receipt
    from public.audit_events
   where owner_id = v_owner_id
     and event_type = 'snapshot-synced'
     and idempotency_key = p_operation_idempotency_key;

  if v_existing_receipt is not null then
    if v_existing_receipt ->> 'request_fingerprint' is distinct from v_request_fingerprint then
      raise exception 'Snapshot sync operation key was already used with a different request.'
        using errcode = '22023';
    end if;

    return (v_existing_receipt ->> 'snapshot_id')::uuid;
  end if;

  insert into public.profiles (id, display_name, onboarding_status, updated_at)
  values (
    v_owner_id,
    v_display_name,
    'active',
    now()
  )
  on conflict (id) do update
    set display_name = coalesce(excluded.display_name, public.profiles.display_name),
        onboarding_status = excluded.onboarding_status,
        updated_at = excluded.updated_at;

  insert into public.financial_snapshots (
    owner_id,
    idempotency_key,
    snapshot_version,
    source,
    assumptions_json,
    updated_at
  )
  values (
    v_owner_id,
    p_snapshot_idempotency_key,
    p_snapshot_version,
    'local-demo-handoff',
    p_assumptions_json,
    now()
  )
  on conflict (owner_id, idempotency_key) do update
    set snapshot_version = excluded.snapshot_version,
        assumptions_json = excluded.assumptions_json,
        updated_at = excluded.updated_at
  returning id into v_snapshot_id;

  insert into public.audit_events (
    owner_id,
    event_type,
    idempotency_key,
    event_json
  )
  values (
    v_owner_id,
    'snapshot-synced',
    p_operation_idempotency_key,
    jsonb_build_object(
      'contract_version', p_snapshot_version,
      'operation_idempotency_key', p_operation_idempotency_key,
      'request_fingerprint', v_request_fingerprint,
      'snapshot_idempotency_key', p_snapshot_idempotency_key,
      'snapshot_id', v_snapshot_id
    )
  );

  return v_snapshot_id;
end;
$$;

revoke insert, update, delete on table public.profiles, public.financial_snapshots
  from authenticated;
revoke insert on table public.audit_events
  from authenticated;

revoke all on function public.sync_interestshield_snapshot(text, text, integer, jsonb, uuid, text)
  from public, anon, authenticated;
grant execute on function public.sync_interestshield_snapshot(text, text, integer, jsonb, uuid, text)
  to authenticated;
