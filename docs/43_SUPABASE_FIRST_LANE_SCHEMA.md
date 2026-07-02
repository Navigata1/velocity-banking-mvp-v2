# Supabase First-Lane Schema Handoff

Last updated: 2026-07-02

## Scope

This is a contract-only Supabase/Postgres handoff for the first production persistence lane. It is not an applied migration and does not wire auth, client keys, API routes, or live database writes into the demo.

Use this after the current local-demo mode is ready to move user-owned financial data out of browser storage.

## Source Decisions

- Supabase Postgres + Auth + RLS is the first persistence lane for user-owned assumptions, plans, simulation runs, learning progress, exports, and account data.
- Cloudflare Workers/D1/Durable Objects remains a secondary edge/API lane after this owner-scoped data contract is stable.
- Public browser clients must never receive a `service_role` key.
- Do not expose tables to `anon`. The first authenticated application path should use explicit grants plus RLS.
- New Supabase projects in 2026 may require explicit Data API grants for public tables; do not rely on implicit public-schema exposure.
- Supabase guidance: create public profile tables for API-safe user data, reference `auth.users(id)` with `on delete cascade`, enable RLS on exposed public tables, and use explicit privileges.

## First Migration Draft

Review this SQL with Supabase advisors before applying it. The SQL uses `gen_random_uuid()`; confirm the target project has `pgcrypto` available before running.

```sql
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
  owner_id uuid not null references auth.users(id) on delete cascade,
  snapshot_version integer not null default 1,
  source text not null default 'local-demo-handoff'
    check (source in ('local-demo-handoff', 'manual-entry', 'import')),
  assumptions_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  snapshot_id uuid not null references public.financial_snapshots(id) on delete cascade,
  engine_version text not null,
  route text not null check (route in ('dashboard', 'simulator', 'cockpit', 'portfolio', 'learn', 'vault')),
  result_summary_json jsonb not null,
  created_at timestamptz not null default now()
);

create table public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  completed_lessons_json jsonb not null default '[]'::jsonb,
  quiz_answers_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create table public.export_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  snapshot_id uuid references public.financial_snapshots(id) on delete set null,
  export_kind text not null check (export_kind in ('local-demo-snapshot', 'portfolio-backup', 'report')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
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

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.financial_snapshots to authenticated;
grant select, insert, delete on public.simulation_runs to authenticated;
grant select, insert, update, delete on public.learning_progress to authenticated;
grant select, insert, delete on public.export_records to authenticated;
grant select, insert, delete on public.audit_events to authenticated;

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

create policy "audit_events_delete_own"
  on public.audit_events for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
```

## Before Applying

1. Create a Supabase project dedicated to InterestShield.
2. Run this SQL in a local Supabase branch or disposable project first.
3. Run Supabase advisors and fix RLS, grants, or index warnings.
4. Confirm no `anon` role grants are needed for these private tables.
5. Confirm account deletion cascades through profiles, snapshots, runs, progress, exports, and audit events.
6. Only then add client/server code that imports the existing local-demo handoff snapshot into authenticated owner-owned rows.
