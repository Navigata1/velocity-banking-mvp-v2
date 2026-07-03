# Cloudflare Edge Lane Contract

Last updated: 2026-07-02

## Scope

This is a contract-only Cloudflare Workers, D1, and Durable Objects handoff for a secondary edge/API lane. It is not an applied migration and does not wire Workers, D1 bindings, Durable Objects, API routes, secrets, or live database writes into the demo.

Use this only after the Supabase/Postgres first-lane owner-scoped contract is reviewed, or when InterestShield needs edge APIs that can enforce the same owner rules before any financial data leaves browser-local demo storage.

## Source Decisions

- Supabase Postgres + Auth + RLS remains the first persistence lane for user-owned financial records.
- Cloudflare Workers can become the server boundary for exports, report jobs, calculation sessions, and eventually D1 writes.
- D1 records must keep `owner_id`, `snapshot_version`, and audited timestamps at the same conceptual boundary as the Supabase contract.
- Durable Objects are for interactive session coordination, not the source of record for long-lived financial history.
- Browser clients must never write directly to D1. All writes go through an authenticated Worker that verifies the owner.
- Local demo data migrates through the existing Settings handoff snapshot only; do not copy arbitrary browser storage keys into edge storage.

## Candidate Worker API

The first Cloudflare prototype should be a server-owned snapshot import API, not a general database client.

```txt
POST /api/snapshots/import
Authorization: Bearer <verified application token>
Idempotency-Key: <stable import id>
Content-Type: application/json
```

Required checks:

- Verify the token and derive the trusted `owner_id` on the server.
- Validate the local-demo handoff snapshot version and known InterestShield storage keys.
- Reject payloads that already claim live backend ownership.
- Write financial snapshots and simulation runs with `owner_id` indexes.
- Record an audit event with the contract version and import idempotency key.
- Return an import summary; do not return raw financial payloads that are not needed by the client.

## D1 Table Shape

Cloudflare D1 should mirror the contract language, even if the SQL differs from Postgres.

```sql
create table financial_snapshots (
  id text primary key,
  owner_id text not null,
  snapshot_version integer not null,
  assumptions_json text not null,
  created_at text not null,
  updated_at text not null
);

create index financial_snapshots_owner_id_idx on financial_snapshots(owner_id);

create table simulation_runs (
  id text primary key,
  owner_id text not null,
  snapshot_id text not null,
  engine_version text not null,
  result_summary_json text not null,
  created_at text not null
);

create index simulation_runs_owner_id_idx on simulation_runs(owner_id);
create index simulation_runs_snapshot_id_idx on simulation_runs(snapshot_id);
```

Production D1 access must be owner-filtered in every Worker query because D1 does not provide Supabase-style RLS. The Worker is the access-control boundary.

## Durable Object Boundary

Durable Objects may coordinate temporary simulator sessions, export job state, or collaborative review sessions later. They should not be used as the durable source of record for user-owned financial history until a deletion path, export path, and owner verification model are tested.

## Release Gates

- A dedicated Cloudflare account/project exists for InterestShield.
- Worker token verification is implemented and tested before any D1 write.
- D1 schema includes owner indexes for snapshots, runs, exports, and audit events.
- Snapshot imports are idempotent and validate the provider-neutral migration contract.
- Account deletion removes owner-scoped D1 records and clears related Durable Object session state.
- Vercel and Cloudflare deployment boundaries are documented before using both in production.
