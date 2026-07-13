-- InterestShield first-lane persistence contract.
--
-- Apply only to a dedicated InterestShield project or isolated database branch.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  onboarding_status text not null default 'local-demo-import'
    check (onboarding_status in ('local-demo-import', 'active', 'deletion-requested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_version integer not null default 1,
  source text not null default 'local-demo-handoff'
    check (source in ('local-demo-handoff', 'manual-entry', 'import')),
  assumptions_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_id uuid not null,
  engine_version text not null,
  route text not null check (route in ('dashboard', 'simulator', 'cockpit', 'portfolio', 'learn', 'vault')),
  result_summary_json jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (snapshot_id, owner_id)
    references public.financial_snapshots(id, owner_id) on delete cascade
);

create table public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  completed_lessons_json jsonb not null default '[]'::jsonb,
  quiz_answers_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create table public.export_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_id uuid,
  export_kind text not null check (export_kind in ('local-demo-snapshot', 'portfolio-backup', 'report')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (snapshot_id, owner_id)
    references public.financial_snapshots(id, owner_id) on delete set null (snapshot_id)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  event_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index financial_snapshots_owner_id_idx on public.financial_snapshots(owner_id);
create index simulation_runs_owner_id_idx on public.simulation_runs(owner_id);
create index simulation_runs_snapshot_id_idx on public.simulation_runs(snapshot_id);
create index learning_progress_owner_id_idx on public.learning_progress(owner_id);
create index export_records_owner_id_idx on public.export_records(owner_id);
create index export_records_snapshot_id_idx on public.export_records(snapshot_id);
create index audit_events_owner_id_idx on public.audit_events(owner_id);

alter table public.profiles enable row level security;
alter table public.financial_snapshots enable row level security;
alter table public.simulation_runs enable row level security;
alter table public.learning_progress enable row level security;
alter table public.export_records enable row level security;
alter table public.audit_events enable row level security;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role, public;

revoke all on table
  public.profiles,
  public.financial_snapshots,
  public.simulation_runs,
  public.learning_progress,
  public.export_records,
  public.audit_events
from anon, public;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.financial_snapshots to authenticated;
grant select, insert, delete on public.simulation_runs to authenticated;
grant select, insert, update, delete on public.learning_progress to authenticated;
grant select, insert, delete on public.export_records to authenticated;
grant select, insert on public.audit_events to authenticated;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using ((select auth.uid()) = id);

create policy "financial_snapshots_select_own"
  on public.financial_snapshots for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "financial_snapshots_insert_own"
  on public.financial_snapshots for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "financial_snapshots_update_own"
  on public.financial_snapshots for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "financial_snapshots_delete_own"
  on public.financial_snapshots for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "simulation_runs_select_own"
  on public.simulation_runs for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "simulation_runs_insert_own"
  on public.simulation_runs for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "simulation_runs_delete_own"
  on public.simulation_runs for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "learning_progress_select_own"
  on public.learning_progress for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "learning_progress_insert_own"
  on public.learning_progress for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "learning_progress_update_own"
  on public.learning_progress for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "learning_progress_delete_own"
  on public.learning_progress for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "export_records_select_own"
  on public.export_records for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "export_records_insert_own"
  on public.export_records for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "export_records_delete_own"
  on public.export_records for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "audit_events_select_own"
  on public.audit_events for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "audit_events_insert_own"
  on public.audit_events for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);
