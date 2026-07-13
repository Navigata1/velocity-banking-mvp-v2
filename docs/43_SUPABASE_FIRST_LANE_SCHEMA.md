# Supabase First-Lane Schema Handoff

Last updated: 2026-07-12

## Scope

InterestShield uses Supabase Postgres, Auth, and RLS as the first persistence lane for private financial assumptions, simulation runs, learning progress, exports, and audit events. Cloudflare remains a later edge and report-delivery lane after this system of record is stable.

Canonical migration: `supabase/migrations/202607020001_first_lane_owner_scoped_schema.sql`

Local configuration: `supabase/config.toml` targets PostgreSQL 17 and opts into the current non-auto-exposed Data API behavior.

## Ownership Contract

- `profiles.id` is the only public-schema identity root and references `auth.users(id)` with `on delete cascade`.
- Every private child row references `profiles(id)`, so application data cannot exist without an owned profile.
- Simulation runs use `(snapshot_id, owner_id)` to prevent one user from attaching a run to another user's snapshot.
- Export records use the same owner-consistent composite foreign key and retain `owner_id` when a snapshot is removed.
- Every exposed table has RLS enabled and indexed ownership columns.

## Data API Contract

- `anon` and `PUBLIC` receive no privileges on the six private tables.
- `authenticated` receives only the operations supported by an owner policy.
- Update policies include both `USING` and `WITH CHECK` ownership predicates.
- Audit events are client append-only: authenticated users may select and insert their own rows, but cannot update or delete them.
- Public-schema default table, sequence, and function privileges are revoked so future objects require an explicit decision.
- Browser and native clients must never receive a secret or `service_role` key.

These choices follow the current [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Data API security guidance](https://supabase.com/docs/guides/api/securing-your-api): grants determine which objects a role can reach, while RLS determines which rows it can access.

## Verification

Run the source contract:

```powershell
npm --prefix apps/web run test:supabase
```

Run the migration against local Supabase Postgres 17:

```powershell
npx supabase db start
npx supabase db reset --local
npx supabase db lint --local --schema public --level warning --fail-on error
npx supabase db advisors --local --type security --level warn --fail-on error
```

Verified locally on 2026-07-12:

- Migration applied successfully to PostgreSQL 17.6.
- Six of six private tables reported RLS enabled.
- `anon` reported no `SELECT` privilege on all six tables.
- `authenticated` reported `SELECT` privilege on all six tables, subject to RLS.
- Supabase schema lint reported no errors.
- Supabase security advisors reported no issues.
- Catalog inspection confirmed owner-consistent snapshot foreign keys for simulation runs and exports.

## Promotion Gate

The connected Supabase organization currently has no project named InterestShield. Do not apply this migration to another app's database. Create a dedicated InterestShield project or isolated preview branch, rerun the adversarial owner-A/owner-B tests, inspect advisors, and only then wire authenticated clients.
