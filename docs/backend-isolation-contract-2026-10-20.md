# Fresh database isolation gate

## Scope

R4-T1 / R4-G6: replay the existing persistence schema and exercise its real
Postgres permissions. This does not connect the app to a cloud backend, add auth
to the demo, select a hosted project, or establish production readiness.

The local Docker engine is unavailable. GitHub-hosted Linux provides a disposable
database on each push/PR under the existing CI workflow. The workflow has read-only
repository permissions, no project token/password or remote database URL, and no
link, push, deployment or cloud migration command.

## Gate

- Supabase CLI is pinned to 2.109.1 in both setup and `test:supabase`.
- Official setup-cli v3.0.1 is pinned to commit
  `45a513f8c64c0bc8e0e3dfe572b5c95be85f6359`.
- `supabase db start` starts the actual Supabase Postgres 17 image and applies
  migrations. Auth tables/roles are not mocked or manually substituted.
- `supabase db reset --local --no-seed` proves a clean replay of all migrations.
- `npm --prefix apps/web run test:supabase` runs schema/client/outbox/account
  contracts, then the unchanged63-assertion suite and the222-assertion six-table
  owner matrix against the local database. The expanded285 plan awaits real CI.
- Public-schema function lint fails on warnings; security advisors fail on errors.
  Any advisor warnings remain visible and require review, not silent suppression.
- A second pgTAP run checks fixture rollback/repeatability without another reset.
- Bash pipefail preserves failures through `tee`. Logs upload even on failure.
- Cleanup always targets only local project `Interest_Shield`, with `--no-backup`;
  it is never a command to run against a user's persistent database or `--all`.
- The job is bounded to 20 minutes; cleanup has its own two-minute timeout.

## Verification And Limits

Three new static wiring contracts failed before implementation: the database job,
CLI pin/local target, and bounded cleanup/evidence wiring were absent. All three
pass after implementation. These tests inspect configuration; they do not execute
SQL and are not owner-isolation evidence by themselves.

The expanded gate must report `Files=2, Tests=285` and `Result: PASS` twice on the
exact pushed source, with migration replay and lint/advisors successful. Both
named files must appear. Save raw logs, source guards and the hosted run URL.
The original one-file63 results below remain historical evidence, not proof of
the new matrix. A failed run cannot pass because client/static checks succeeded.
See `docs/owner-permission-matrix-contract-2026-10-23.md` for scope and limits.

Hosted-project binding, API/JWT sign-in, cross-device recovery, backup/restore,
deletion, project settings and final environment separation remain separate gates.
All six owner tables, their existing RPC and the four migration bytes are unchanged
in this wiring checkpoint. Financial-engine, user scenario and visual code are also
unchanged.

## Initial Hosted Result

The database jobs passed on source `37d188020ac2f350141e52f19d91ff20b81799ba`
in both push run `39493769671` and PR run `39493779589`. Each passed all 63 SQL
assertions twice, clean replay, lint, security advisors, project cleanup and proof
upload. Logs/job receipts live in
`ops/mission/evidence/backend-isolation-2026-10-20/`.

The tested local image is Supabase Postgres `17.6.1.143`; the pinned CLI advertises
2.121.0 as newer. This is reproducible functional isolation proof, not approval
of a final managed-provider version or its patch/backup state. Future pushes must
continue to pass the same standing gate.

## Sources Checked 2026-10-20

- [Official CI database test guide](https://supabase.com/docs/guides/deployment/ci/testing)
- [Official setup action at the pinned revision](https://github.com/supabase/setup-cli/tree/45a513f8c64c0bc8e0e3dfe572b5c95be85f6359)
- [Testing and linting](https://supabase.com/docs/guides/local-development/cli/testing-and-linting)
- [Current changelog](https://supabase.com/changelog.md)

CLI command/flag spelling was checked using the pinned CLI's own `--help`.
