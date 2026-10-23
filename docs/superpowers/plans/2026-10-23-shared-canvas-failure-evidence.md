# Shared Canvas Failure Evidence Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline with focused
> independent review. This is QA observability, not a claimed canvas/root fix.

**Goal:** Preserve useful browser state before a missing-canvas failure's context
is closed, then permit ONE fully fresh current-source local verification.

**Architecture:** A read-only DOM/performance snapshot is invoked only inside
the existing workflow catch. Existing errors, assertions, screenshot, caps,
timeouts, browser flags and successful-path actions stay unchanged.

**Tech Stack:** Existing Node, TypeScript parser and Playwright boundary tests.

**Spec:** Existing House-instance scope plus this additive failure-evidence
contract. Original491-source run97fa04cc stays FAILED after12passes at stage13.
Diagnostic05bcd9e4 passes six cases but is instrumented/noncausal: no root cause,
reliability or historical-failure closure is claimed. Raw RSC failures and extra
early/late storage errors are retained and not classified benign by this work.

## Scope

Four source files: modify `apps/web/scripts/smoke-shared-portfolio-dashboard.cjs`
and `apps/web/package.json`; add `apps/web/scripts/shared-dashboard-canvas-diagnostics.cjs`
and `apps/web/scripts/shared-dashboard-canvas-diagnostics-tests.cjs`.
All app-renderer, finance, assets, dependencies, locks, workflows and backend
bytes remain unchanged from the accepted491-source candidate. The original
6ff-relative allowed set becomes13files:6existing changes+7new,493source inputs.

New private lab `.superpowers/sdd/2026-10-23-shared-canvas-failure-evidence/`
owns baseline/pins/tests/reviews/new493-source full-gate evidence and shipping.
Prior adoption root/candidate/failed run/diagnostic producers are now frozen;
only its progress ledger may be appended. No old writers or proof relabeling.

## Snapshot Contract

Return observed visibility/readyState/viewport, current asset ID and rectangle,
derived viewport intersection (NOT private React observer state), inspect/replay/
unavailable controls, stage/readiness/native-canvas descriptors, and bounded
same-origin Next static resource/script timing with explicit total/truncation.
Strip URL queries/fragments; never read financial inputs, storage or React state.
Do not allocate a canvas, navigate, focus, scroll, write page state or suppress
the original exception. Snapshot failure returns an explicit capture error.
Review01294883 found an unbounded diagnostic await. Revised contract adds a
2000ms Node-only failure-path watchdog, cleared on settlement; no browser/page
timer, successful-path action or existing workflow timeout changes. The race
does NOT hard-cancel browser evaluation; existing context cleanup follows.
Pending evaluation/late rejection and timer cleanup require focused tests.

## Steps And Gates

- [x] Pin original6ff486/current491/accepted10-file scope, failed-run13thstage,
  six-case noncausal diagnostic,20assets/runtime and planned four-file delta.
- [x] Genuine desiredRED for actual snapshot and catch wiring; implement minimal
  read-only helper/10focused unit cases including pending/closed page, privacy,
  bounded resources and absence of successful-path calls.
- [ ] GREEN and meaningful negative controls; independent delta review including
  ONE fresh full-run ruling. No successful-path/browser-feature/time-budget change.
- [ ] Fresh493-source complete29-gate run from scratch, no12stage inheritance.
  This is not an unchanged favorable retry: it verifies newly added QA code.
  If it passes, record original intermittent failure still unresolved. If it
  fails, preserve the richer evidence and diagnose; no third unchanged full run.
- [ ] Source-bound unchanged-renderer graphics and any inherited evidence are
  labeled by exact inputs. Exact-head CI, READY preview, hosted/manual proof
  remain required before a new verified push/receipt. Production remainsOPEN.

## Review Focus

- Only the catch path may execute the snapshot; no activation/timing workaround.
- Capture failures never replace the original failing workflow/exception.
- Diagnostics must distinguish observations from inferred React/private state.
- Resource sampling is explicit and does not filter original raw error checks.
- A new full pass cannot be described as causal resolution of the old failure.
