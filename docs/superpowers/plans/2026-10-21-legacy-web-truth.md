# Legacy Web Financial Truth Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans natively task-by-task, with an independent browser-fixture worker and fresh final reviewer. Track each checkbox incrementally.

**Goal:** Prevent legacy editing from rewriting intent and Cockpit from inventing payoff results.
**Architecture:** Existing validated Portfolio editor gains an explicit percent policy; legacy facade delegates to it. A pure Cockpit view consumes existing projection facts, while unsupported drills/routes remain explicitly unmodeled. No financial algorithm/store/schema change.
**Tech Stack:** Existing React/Next/TypeScript/Zustand/Lucide, shared input-draft, Cua and project browser gates. No dependencies.
**Spec:** `docs/superpowers/specs/2026-10-21-legacy-web-truth-design.md`

## Global Constraints
- Preserve original layout/assets, all8 original engine modules and all existing numerical/timing/pixel gates.
- Keep canonical decimal and legacy percentage semantics distinct; never reinterpret oldraw2.
- No automatic migration/new source record, production promotion, merge or cloud/data/access mutation.
- Educational tool. Not financial advice.

## Review Focus
- Invalid drafts/Enter+blur/Escape/unmount cannot mutate data or invoke duplicate/stale callbacks.
- Equivalent/high-precision/oversized no-ops preserve exact raw bytes across all legacy routes.
- Canonical APR2 remains200%; legacyraw2 remains2%; newlegacy200 storesraw200.
- Failed, nonfinite, tiny-nonzero, cleared and unmodeled states cannot claim payoff/savings.
- Large labels/values, precise editor focus and theme/mobile fit remain readable.

## Task 1: Shared Validated Legacy Editor
**Files:** `apps/web/src/components/EditableNumber.tsx`, `PortfolioEditableNumber.tsx`, selected-debt APR readout in `apps/web/src/app/page.tsx`; two obsolete editor-shape assertions and TSX loader in `apps/web/scripts/engine-regression-tests.cjs`.
**Interface:** `percentPolicy?: 'decimal'|'legacy'` defaultdecimal in the validated editor; old public facade selectslegacy without imposing a100% cap. Reuse existing `formatFinancialInput`/`resolveFinancialDraft` unchanged.
- [x] Preserve actual IAB invalid/high-APR RED and expected write/focus regressions before code.
- [x] Replace old editor source-shape tests with real SSR labels/nonfinite/mixed-unit outcomes; observe RED.
- [x] Add explicit policy and thin legacy facade; leave all original engine/input-draft algorithms unchanged.
- [x] Pass component tests, existing pure suites and real browser draft behavior; editor slice committed as7ad6c29.

## Task 2: Projection-Aware Cockpit
**Files:** `apps/web/src/app/cockpit-model.ts`, `cockpit/page.tsx`, new `apps/web/scripts/cockpit-projection-tests.cjs`, focused existing Cockpit contract.
**Interface:** `buildCockpitProjectionView(input)` consumes actual baseline/Velocity facts, selected debt/LOC balances and drill/routing flags. Produces state, ETA, signed-interest-difference label and disclosure; never computes a new loan schedule.
- [x] Literal real-behavior tests: healthy14months, failed0, nonfinite/fractional months, nonzero0, exactcleared, negative difference, missing baseline, drill/routing flags and frozen inputs; observe RED.
- [x] Render the adapter, precise scoped daily burn and truthful balance scale. Keep artwork/controls; mark600 drill/alternate routing unmodeled without saved writes.
- [x] Independent F1/F2 reproductions: use existing equal-budget/debt-plus-LOC runSimulation, not minimum-only store baseline; exactzero authority despite missing LOC setup/zero cash flow. Five REDs then31 pure/actual-engine contracts GREEN.
- [x] Verify actual failed and healthy/drill/cleared transitions and280/375/1440 fit; Cockpit slice committed as935768d.

## Task 3: Standing Browser And Shipping Evidence
**Files:** new `apps/web/scripts/smoke-legacy-web-truth.cjs`; corrected partial-fixture priming in `smoke-dashboard-interest.cjs`; web test/dashboard commands; existing CI dashboard upload/assertion; mission state/journal/generated report/evidence.
**Interface:** Worker owns only new browser script. Four workflows at280/375/1440 (12) cover editor/legacy-rate/Cockpit-failure/Cockpit-drill behavior; all prior126 workflows remain.
- [x] Adjudicate original Dashboard priming failure: preserve all34 original assertion sites, add exact no-op byte assertion, use real +1/restore only for house scenarios with later edits. Retain initial failure/oversized setup diagnostic. Same product/build; successful local stages span two serial segments, not a clean first sweep.
- [x] Worker captures old-build RED before parent rebuild, including exact input bytes and canonical sentinel; no user ports or hidden Cua state.
- [x] New12/711GREEN plus original126 workflows, 15 successful stages in two serial segments; web348/new31 view/core31/ref23247, media14527 and native types/contracts. Initial fixture priming/oversize setup failures retained; no waiver of old assertions or timing/pixel limits.
- [x] Fresh independent review clears F1/F2 and harness adjudication at14 final source pins. Actual IAB first-build truth captures retained with superseded comparison labeled; fresh final hosted IAB remains required. No full routing/lender/device/art approval.
- [x] New browser fixture isolated in66b63a8. Its677lines exceed the soft400line budget as one cohesive test-only workflow harness; product slices are319 and261 changed lines. No new framework or dependency and no unrelated refactor.
- [x] Fold verified17457cc/receipt6323921807 into substantive mission changes; render, do not hand-edit HTML. Local preflight preserves332 other structured sources,9 current financial modules and30 model/poster/video payloads.
- [ ] Push focused commits to draftPR256; require BOTH full exact-head CI events and fresh READY/hosted138/all20 served hashes/actual IAB before receipt. No metadata-only push loop.
