# InterestShield Supabase Recovery and Retention

## Scope

This runbook covers the owner-scoped InterestShield Postgres contract. It does not claim that a managed cloud backup exists. The production gate remains blocked until a dedicated InterestShield Supabase project is approved, configured, and its provider backup is restored in a separate staging project.

## Local Recovery Drill

Run from the repository root with the local Supabase database healthy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/supabase-backup-restore-drill.ps1
```

The drill:

1. Seeds one synthetic owner across `auth.users` and all six application tables.
2. Creates separate custom-format identity and public-schema archives.
3. Removes the synthetic source owner to prove the result is not read from the source.
4. Restores into the isolated `interestshield_restore_drill` database.
5. Verifies one recovered row per owned table, the snapshot payload, six tables with RLS, and twenty policies.
6. Deletes the synthetic source identity, temporary database, and container archives in `finally` cleanup.

The isolated target uses a signature-compatible `auth.uid()` stub because managed Supabase auth functions live outside the narrow application archive. A production restore must use Supabase's supported full backup workflow and retain managed schema ownership.

## Production Recovery Gate

Before real-user launch:

1. Enable the provider backup tier selected for the dedicated project and record its recovery-point and recovery-time objectives.
2. Restore the newest provider backup into a separate staging project, never over production first.
3. Apply pending migrations, then run schema lint, security advisors, the 21-test owner-isolation suite, and application smoke.
4. Compare row counts by owner and table, RLS/policy counts, migration versions, and a sample of encrypted or redacted snapshot checksums.
5. Promote only after the incident commander and data owner sign off. Preserve the failed environment read-only until evidence is complete.

## Retention Policy

This is a product policy, not legal advice. Confirm applicable legal and contractual requirements before production.

| Data | Active-account default | Deletion target |
| --- | --- | --- |
| Profile | Account lifetime | Cascade within 24 hours of verified deletion request |
| Financial snapshots | Latest 50 and no more than 24 months | Cascade with profile |
| Simulation runs | 12 months | Cascade with profile or snapshot |
| Learning progress | Account lifetime | Cascade with profile |
| Export metadata | 90 days; exported files remain user-controlled | Cascade with profile |
| Audit events | 24 months, without raw financial payloads | Cascade with profile; retain only a non-identifying operational incident record when required |
| Provider backups | Provider window, target maximum 35 days | Age out within the provider window; document exceptions |

Retention jobs must be owner-scoped, idempotent, dry-run capable, and emit counts rather than financial values. No retention deletion job is enabled until a production restore drill passes.

## Incident Procedure

1. **Contain:** disable affected writes, rotate exposed credentials, preserve logs, and do not destroy the suspect environment.
2. **Classify:** record incident id, UTC timeline, affected project/environment, owner count, data classes, and current evidence confidence.
3. **Recover:** choose the last known-good recovery point, restore to staging, apply migrations, and run all recovery gates above.
4. **Validate:** prove ownership isolation, deletion cascades, snapshot checksums, application calculations, and route smoke.
5. **Communicate:** use plain language, state confirmed facts and uncertainty, and avoid exposing financial values in tickets or chat.
6. **Close:** document root cause, corrective actions, backup age, recovery duration, residual risk, and the next drill date.

Incident logs belong in the approved operational system, not `audit_events`; application audit rows are owner-scoped and deleted with the owner.
