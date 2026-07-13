# Cloudflare Edge Lane Contract

Last updated: 2026-07-12

## Decision

Supabase Postgres + Auth + RLS remains the first persistence lane and system of record for profiles, financial snapshots, simulations, learning progress, export metadata, and owner-scoped audit events.

Cloudflare is a secondary report-object lane only:

- Worker: authenticated report upload, download, and deletion boundary.
- Private R2: user-requested HTML or JSON report objects.
- Supabase: verified identity and authoritative export_records metadata.
- No D1 financial mirror.
- No Durable Object financial history.
- No browser access to R2 bindings.

This avoids two databases disagreeing about balances, deletion, retention, and owner access. D1 and Hyperdrive should not be added without measured requirements that this lane cannot meet.

## Implemented API

The dry-run-verified Worker lives at apps/report-worker.

    POST /v1/reports
    GET /v1/reports/:reportId.html
    GET /v1/reports/:reportId.json
    DELETE /v1/reports/:reportId.html
    DELETE /v1/reports/:reportId.json
    Authorization: Bearer <Supabase access token>

The Worker verifies the token through Supabase Auth, derives the trusted owner id, and builds the R2 key as ownerId/reportId.format. Callers cannot submit an owner id.

Uploads are capped at 512 KiB, accept only UUID report ids and HTML/JSON formats, and roll back the R2 object if Supabase export_records metadata cannot be written. Downloads are attachment-only with nosniff, no-store, no-referrer, and sandbox headers. Deletes remove the owner-namespaced object and its RLS-protected metadata record.

The Worker does not accept a financial snapshot import and does not expose a list endpoint. Report content may contain financial values, so upload must remain an explicit user command.

## Configuration

wrangler.jsonc intentionally contains values that fail closed:

- SUPABASE_URL points to configure-before-deploy.
- SUPABASE_PUBLISHABLE_KEY is configure-before-deploy.
- ALLOWED_ORIGIN is localhost-only.
- Named private R2 production and preview buckets do not yet exist.

Before deployment:

1. Create dedicated private interestshield-reports and interestshield-reports-preview R2 buckets.
2. Replace placeholder Supabase URL and publishable key with the dedicated project values. Never use a service-role or secret key.
3. Set the exact production/preview browser origin; do not use wildcard CORS.
4. Configure an R2 lifecycle that matches the 90-day export metadata target or the final approved retention policy.
5. Run npm run check, npm test, npm audit --omit=dev, and npm run build:dry-run from apps/report-worker.
6. Deploy only after the dedicated Supabase project and R2 resources receive explicit cost approval.

## Release Gates

- Worker tests prove placeholder refusal, origin rejection, owner namespacing, metadata rollback, cross-owner 404, attachment hardening, and coordinated deletion.
- Wrangler-generated runtime and binding types compile without hand-written Env declarations.
- The dependency audit reports zero vulnerabilities.
- Wrangler deployment dry-run reports one R2 binding and no D1 binding.
- A deployed smoke test creates owner A and owner B sessions, proves each owner can access only its own object, deletes both objects, and confirms Supabase metadata cleanup.
- Account deletion invokes report deletion before the Supabase profile cascade, then confirms no owner prefix remains in R2.

No live Cloudflare resource or deployment is claimed by this repository state.
