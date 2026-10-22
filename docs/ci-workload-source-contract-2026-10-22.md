# CI Workload And Source Identity

## Status

This is a CI/test-only correction. Application behavior, financial calculations,
all authored assets/materials, dependency versions and locks remain unchanged.
Production readiness is false until all release gates pass. The preceding04753ee
checkpoint is NOT fully verified: both attempt1 events39714399076/39714404043
were cancelled. Their complete logs are retained, not rerun or relabelled.

Both mandatory runtime audits passed. Push recovered from the real retiring
Quick400 and then a timeout, accepting a complete zero report only on attempt3;
PR accepted a complete report on attempt1. The final local three-timeout failure
remains failed. SQL passed both; one hero job passed and one was cancelled.
Primary jobs ended at1217/1219s in Portfolio/media, hero at1208s. Only operation-
cancelled errors are explicit; timeout causation remains an inference from caps
and timing. No agent cancellation was requested.

Serialized automatic-preview testing passed138workflows/711legacy assertions,
20served asset hashes and fresh Car/House/Card/Vault browser observations. The
earlier hosted300s last-suite timeout remains failed/archived. It overlapped
local rendering; causality is unknown. The serialized pass used identical limits
and assertions after rendering stopped. No third unchanged retry was performed.

## Existing Three Jobs

Public job names stay stable for compatibility; no provider protection setting is
read as proven or modified by this patch. Each still has its original20minute cap.

| Existing Job | Work And Acceptance |
| --- | --- |
| Asset hero quality gates | Independent web build and all original hero/pixel/Replay/fallback checks. |
| Isolated SQL and owner isolation | Original disposable SQL tests, lint, advisors, repeat, stop and evidence upload; then the intact media/report/Worker/native dependency block. |
| Web and mobile quality gates | Requires both jobs, explicitly rejects non-success prerequisite results, then executes original web contracts, mandatory audit, build and browser suites. |

The primary job uses `!cancelled()` and a first result guard before checkout.
For non-cancelled dependency failures it must fail rather than implicitly skip.
It may itself skip when the workflow is cancelled; the full-CI verifier still
rejects cancelled, skipped, incomplete or unsuccessful events/jobs/required steps.
Local guard fixtures do NOT prove GitHub scheduling or universal branch protection.
GitHub describes these [dependency semantics](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds)
and [cancellable status expressions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#status-check-functions).

Database stop retains `always()` and its two-minute step cap. SQL evidence upload
stays before the new tail. Tail steps retain their original IDs, directories,
commands, environments, browser pin, artifacts and assertions. No schema, cloud
project, secret, permission, deployment or account access changes are introduced.

Workflow wall time can grow because primary waits for prerequisites. A longer
observation window is not a job-cap increase or an execution-time guarantee.

## Installation And Audit Scope

All six installs explicitly retain full-tree `audit=true`. Command-local fetch
options are60s timeout, one general retry,1s minimum/3s maximum retry delay.
Media retains `--ignore-scripts`; no omit/dev narrowing, npmrc/global configuration,
version, lockfile or lifecycle choice changes. These are individual-request
options, NOT an end-to-end install stopwatch or proof of the old delay's cause.

Installed npm10.9.7 CPU probes show install audit can delay reify, can fall back
from Bulk to Quick, and remains advisory during `ci`. It includes dev advisories,
unlike the separate runtime audit. Disabling implicit audits was rejected because
that would lose visibility. npm10.9.9 hosted internals/effective settings were not
inspected. The online fail-closed runtime wrapper and explicit Worker/native audit
commands remain unchanged. Passing runtime checks do not clear broader toolchain
findings or turn an unavailable full-tree advisory report into a clean report.

## Actual Source Binding

Each job checks out `${{ github.event.pull_request.head.sha || github.sha }}`,
then verifies a nonempty40hex SHA against actual `git rev-parse HEAD` before setup.
This deliberately tests the head itself; merge-integration compatibility remains
a separate release consideration. Ordinary `pull_request` and read-only token
permissions are retained, never `pull_request_target` or new secrets. GitHub
documents the [default merge checkout and head alternative](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request).

Historical qualification: authenticated Git commit-tree reads confirm04753ee's
PR checkouta5dca08 and dd32e875's PR checkoute437cef had IDENTICAL trees to their
respective event heads, despite different commit SHAs. Thus those two known cases
show no content drift. dd32's prior complete-event evidence remains valid for its
identical source tree, not a claim that its PR checked out the literal branch SHA.
No equivalent claim is made about every older checkpoint without verification.

## Proof Requirements

The55original named step meanings are pinned in the canonical baseline fixture;
only intentional placement/cache/ref/install-option differences are normalized.
Three source guards plus one prerequisite guard are added, not substituted for
old checks. Tests exercise49 prerequisite pairs, missing-check mutants, wrong or
missing source identities, cancelled/skipped full events, scope/config precedence
and original mobile persistence/input negative controls. Independent final-source
review and fresh local gates precede the next focused push. New both-complete
exact-head CI/READY/hosted/manual evidence is required before a verified checkpoint.
