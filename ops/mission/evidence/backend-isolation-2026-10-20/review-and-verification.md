# Isolated Database Verification

## Source Checkpoint

`37d188020ac2f350141e52f19d91ff20b81799ba` adds the standing CI database job.
The six-table schema, four migrations, SQL suite, financial engine, scenarios,
web UI and media assets are unchanged in that checkpoint.

## Red / Green

Before implementation, all three new `supabase-ci-contract.cjs` tests failed:

1. `CI needs a backend-isolation job, not just client mocks`.
2. Pinned setup/CLI and explicit local test command were absent.
3. Always-cleanup and failure-evidence wiring were absent.

After implementation, 3/3 pass. Workflow YAML parses, whitespace checks pass,
and ESLint passes. Existing schema/client/outbox/account and mobile contracts
pass. The full web suite passes 289 regression cases, two reference scenarios,
78 closed-form comparison cases and 25 zero-recovery conservation cases.

These are preflight checks, not actual SQL or end-to-end cloud evidence.

## Independent Review

Reviewer Zeno, `01a15b08-8fce-7c53-a6ca-7887bd020beb`, reviewed only the CI job,
CLI command pin and three wiring tests. No actionable findings. The reviewer
independently checked pinned CLI command support, the setup-action revision,
YAML parsing, Bash failure propagation, target-specific cleanup and absence of
production credentials/remote commands. No checkout mutation.

Excluded: actual PostgreSQL results (hosted execution required), pre-existing
application/engine/UI behavior, and hosted-project configuration. Reviewer closed
after delivering the review.

## Hosted Proof

Both database jobs passed on the source checkpoint:

- Push: https://github.com/Navigata1/velocity-banking-mvp-v2/actions/runs/39493769671/job/118873389468
- PR: https://github.com/Navigata1/velocity-banking-mvp-v2/actions/runs/39493779589/job/118873424261

Each job replayed all four migrations, passed the 63-assertion SQL suite twice,
passed lint/security advisors, and successfully stopped the disposable project and
uploaded proof. The downloaded push logs report `Files=1, Tests=63` and
`Result: PASS` twice, `No schema errors found`, and `No issues found`.

Push artifact ID: `12296946865`, digest
`sha256:d10e9cac1c41cec41004dd3915d573695925c43f97728e33e251d617c038c20e`.
The seven original logs are under `push/`; job receipts preserve source SHA and
step results. CLI 2.109.1 used actual Supabase Postgres image `17.6.1.143`, digest
`sha256:80d7b27c3e8d77cfa7226eee9508671796da214781ff15a35b3670d7ad5ee453`.
The ECR pull retried before the CLI's GHCR fallback succeeded; this was not a
database test failure. The CLI advertises a newer 2.121.0 release. This repeatable
functional baseline is not final managed-provider patch/version alignment.

GitHub also reports the existing upload-artifact Node 20 runtime deprecation and
upcoming ubuntu-latest image migration. These notices remain visible, not
suppressed. The full web/mobile jobs were still running when these SQL receipts
were captured; the following evidence/report-only push needs its own exact-head
checks before a final CI receipt.

## Preview

GitHub deployment `7210520482` is a successful Preview for the exact source SHA:
https://velocity-banking-mvp-v2-5aq34dhay-islanddevcrew.vercel.app

Seven routes pass HTTP smoke. Chrome rendered smoke passes all seven at 1440px
and 375px, with no overflow/page errors. In-app browser Settings visibly confirms
local demo mode and unconfigured private account sync. No production promotion,
cloud link, credential, DNS, managed database or user-data mutation.
