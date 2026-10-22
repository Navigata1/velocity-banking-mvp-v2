# Canonical Portfolio Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the existing Simulator consume the canonical Portfolio book through an explicit source view without changing the legacy demo or calculation engine.

**Architecture:** A Suspense/query boundary lazily selects the canonical view. The canonical view reads the existing Portfolio store and uses a pure presentation adapter over the already-tested comparison API; no data mirroring or new persistence is introduced. Independent review follows Mission Control Tier2 while the parent implements locally.

**Tech Stack:** Existing Next/React/Zustand/TypeScript, shared financial engine, current numeric editors, Playwright/browser harness. No dependency or lock changes.

**Spec:** `docs/superpowers/specs/2026-10-22-portfolio-simulator-design.md`.

## Global Constraints

- Original single-target Simulator and canonical Portfolio records remain separate; no implicit migration/adoption/copy.
- All listed debts plus the LOC and the same household budget apply to every compared strategy.
- Do not modify any engine formula, tolerance, rounding, APR conversion, allocation or ledger.
- Preserve original calm asset-centered identity and all existing artwork.
- Keep PR256 draft and original three CI identities,59declared steps and20-minute caps.
- No dependencies/locks, paidGPU, cloud/backend/schema/data/access/DNS/settings mutation, merge, production deployment or Desktop HTML serving/republishing.

## Review Focus

1. Failed/partial payoff rows: suppress dates/interest/cash rather than show fabricated zero or accepted-prefix data as a complete result (Task1).
2. Own-payoff versus common-month cash: each policy summary must use its own accepted payoff row, and the same-month view remains separate (Task1).
3. Exact-zero versus nonzero residual: never label unpaid cents already paid off (Tasks1/3).
4. Hydration/storage/write errors: never substitute demo values or rewrite either physical record on entry/no-op (Tasks2/3).
5. Query switching,200% APR/promo data and large values: preserve raw precision/metadata and readable280px output across navigation (Tasks1/3).

### Task 1: Pure Simulator Presentation Model

**Files:** Create `apps/web/src/app/simulator/portfolio-simulator-model.ts`; test `apps/web/scripts/portfolio-simulator-tests.cjs`.

**Interfaces:** Consumes `PortfolioBook` and `preparePortfolioComparison(book)`. Produces `buildPortfolioSimulatorModel(book): PortfolioSimulatorModel` with nullable `cashFlow`/`totalDebt` and three ordered `plans`; each has `strategy`, `state` (`projected|cleared|review|residual`), nullable `payoffMonths`, `totalInterest`, `endingCash` and optional `reason`. No new engine API.

- [x] Write tests for the literal zero-APR fixture (all2months/0interest/0cash), full liability/LOC scope, selected-reference independence, exact-zero and tiny-positive residuals, failed/partial plans and blocked Velocity with available direct policies.
- [x] Add decimalAPR2/active-expired promo/frozen-input/invalid-book/overflow cases. Compare mixed-rate summaries to independently invoked `simulatePortfolio(portfolioBookInputs(book))` for each policy, not another call to this presentation model.
- [x] Run `node apps/web/scripts/portfolio-simulator-tests.cjs`; retain a meaningful RED before implementing the model.
- [x] Build initial statistics from the accepted month-zero comparison. For each possible payoff, request that policy's accepted own-payoff snapshot; with unavailable or nonzero remaining liabilities, return review/residual with null outcomes. Cleared requires actual zero debt and LOC at month0. Never mutate input.
- [x] Re-run the model tests GREEN and existing common-month31/reference23247/overview21 contracts. Add the test command to the existing web test chain, retaining every command and dependency field.
- [x] Commit the focused model/contracts when reviewed; do not push an incomplete feature.

### Task 2: Explicit Canonical View And Entry Links

**Files:** Create `apps/web/src/app/simulator/PortfolioSimulator.tsx`; modify `apps/web/src/app/simulator/page.tsx`, `apps/web/src/app/PortfolioDashboard.tsx`, `apps/web/src/app/portfolio/page.tsx`; optionally create `apps/web/src/data/portfolio-hero.ts` and move the unchanged category mapping there for both asset consumers.

**Interfaces:** Canonical view uses the SAME `usePortfolioStore`/`portfolioPersistence` APIs and existing `PortfolioCommonMonth({book,classes})`, `AssetHero` and canonical numeric editors. Source boundary selects canonical only for exact `scenario=portfolio`; legacy implementation remains unchanged below the boundary.

- [x] Write source wiring/route boundary checks and run RED: canonical view must not import the legacy financial store, normalize APRs or define a new store; actual explicit entry/query/default selection and preservation are also exercised by Task3.
- [x] Implement the source boundary under Suspense with lazy canonical import, mirroring the existing Dashboard pattern. Preserve legacy controls and default rendering.
- [x] Implement mounted/storage-ready gating with the established reload/discard-unsaved pattern. Memoize only the nine canonical book fields; do not persist or recompute store state on read-only entry.
- [x] Add current-book scope, income/expense/extra cap/LOC/applicable chunk inputs using canonical actions; include the existing asset stage with local inspection selection that never alters liabilities. Link debt/focus editing to Portfolio.
- [x] Show compact policy summaries from Task1 with own-payoff scope; use `formatCommonMonthAmount`, no fake zero/unavailable success. Render the existing same-month panel from the same memoized book.
- [x] Add explicit canonical Dashboard/Portfolio/Simulator links and a single-target demo exit. Keep existing Portfolio copy accurate about the default Simulator's separate source.
- [x] Run model/source contracts, web lint/build, existing sharedDashboard/common-month/legacy comparisons. Review diff for unrelated redesign and accidental persistence writes.
- [x] Commit the focused usable view; keep each commit within400changedlines.

### Task 3: Rendered Coherence And Shipping Evidence

**Files:** Create `apps/web/scripts/smoke-portfolio-simulator.cjs`; modify only scripts in `apps/web/package.json` to run it after the existing comparison smoke. Add `docs/portfolio-simulator-contract-2026-10-22.md` and `ops/mission/evidence/portfolio-simulator-2026-10-22/`; update state/journal and generate the HTML with the existing renderer.

**Interfaces:** Existing `browser-harness.cjs` and a dedicated `PORTFOLIO_SIMULATOR_ORIGIN` run against local built app or exact automatic preview. Output `apps/web/test-results/portfolio-simulator/verification.json` with origin,18receipts, preserved-storage/geometry/oracle diagnostics and resource cleanup.

- [x] Add six workflows at280/375/1440: shared edits/navigation; exact query/default legacy isolation; adverse independently available strategies; cleared versus tiny residual; decimalAPR/promo precision; malformed/denied/failed-write storage.
- [x] Retain a rendered RED for the missing canonical route before adoption. Require exact legacy record bytes and unrelated canonical metadata after reads/no-ops/edits as applicable. Exercise both navigation directions and reload persistence, not only initial selectors.
- [x] Verify all displayed amounts/statuses against literal or independent canonical results. Capture original-node opacity/clip/empty-value negative controls, actual accessible text,4.5contrast/readability/no page overflow and financial-control interaction.
- [x] Run the focused18 GREEN and full original138 web workflows/financial references, all hero/fallback/pixel/video/material gates, media222/27stills, native/Worker/report/CI contracts serially. No weakening original assertions/caps or claiming existing media exports are freshly rendered here.
- [x] Obtain independent source/behavior review, preserve every observed failure, fold verified46receipt6332579568 and rejected visual studies into state33 with this substantive feature, and render/test the mission report. R1/R2 broader tasks stay open.
- [ ] Commit focused code/evidence/state, push to existing branch/PR256, observe BOTH complete exact-head CI events and all literal source guards. Use only the automatic known-project READY preview.
- [ ] Fresh hosted old138 plus new18 workflows,20served model/poster hashes, actual in-app browser canonical edit/navigation and source/preservation proof. Bind screenshots to this invocation. Post/read back a precise receipt only after all gates pass. No merge/promotion or status-only push loop.
