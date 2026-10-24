# Shared Portfolio Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native implementation task-by-task, with a fresh independent reviewer before the final gate. Steps use checkbox syntax.

**Goal:** Make Dashboard and Portfolio read and edit the same canonical book through an explicit shared-source view, without rewriting legacy records.

**Architecture:** Existing Portfolio store remains authoritative. A pure shared overview captures its full-book model. Dashboard chooses the canonical view only for `scenario=portfolio`; no financial copy or new persisted source flag is introduced.

**Tech Stack:** Existing TypeScript, Next/React/Zustand, financial-engine package, Lucide, AssetHero and project browser tests. No added dependencies.

**Spec:** `docs/superpowers/specs/2026-10-21-shared-portfolio-dashboard-design.md`

## Global Constraints

- No merge or production promotion.
- No additional financial store, mirrored copy or automatic migration.
- Do not alter interest, allocation, posting or numeric tolerances.
- Preserve all existing web/native/media/SQL gates.
- No new dependencies, assets, cloud/schema/DNS/access/data mutation or paid GPU work.
- Educational tool. Not financial advice.

## Review Focus

- Canonical APR2 must remain200%, including LOC/promotional rates, never legacy2%.
- A different selected debt cannot change the financial cohort or hide another liability.
- Nonzero per-liability tolerance must not announce confirmed payoff.
- Unreadable/failed persistence must not fall back to another household or accept edits.
- Navigation, no-ops and editing must not rewrite unrelated canonical or legacy fields.

## Task 1: Shared Overview Contract

**Files:** Create `packages/financial-engine/src/portfolio-overview.ts` and `apps/web/scripts/portfolio-overview-tests.cjs`; extend only the typed package export and web test command.

**Interfaces:** Consume `PortfolioBook`, `portfolioBookInputs`, `simulatePortfolio` and decimal daily interest. Produce `buildPortfolioOverview(book: PortfolioBook): PortfolioOverview` with canonical book, result, cash flow, total liabilities, nullable daily burn/payoff month, state `projected|review|cleared|tolerance`, and actual next target IDs/labels.

- [x] Write literal tests for the spec fixture: total2100, flow500, burn318/365, Loan B target,5month payoff; assert frozen source unchanged.
- [x] Add APR2/LOC2, promo intro/expiry, invalid minimums/horizon, exact-zero/tolerance and nonfinite-range cases. Run and preserve expected RED.
- [x] Implement the overview using the existing engine and strict codec; no new payoff algorithm.
- [x] Run new and all existing pure regressions/references. Verify all previous numerical module sources unchanged.
- [x] Commit the cohesive model/test slice without pushing partial UI claims.

## Task 2: Canonical Dashboard View

**Files:** Create `apps/web/src/app/PortfolioDashboard.tsx`; minimally extend `apps/web/src/app/page.tsx` source selection and Portfolio page navigation.

**Interfaces:** Consume `buildPortfolioOverview`, existing Portfolio store/persistence, `AssetHero` and canonical editors. Produce a Dashboard presentation selected by `/?scenario=portfolio`, using the same store actions and no persisted selection.

- [x] Establish a rendered RED for the absent shared view using distinct legacy/canonical synthetic records.
- [x] Add the query-selected lazy presentation under Suspense; default `/` remains legacy. Use existing theme/asset layout conventions and the four vitals.
- [x] Add debt inspection selection, scope/status, same-store household/LOC controls, strategy modes and return links. Missing identities/empty books remain explicit; financial totals do not depend on selection.
- [x] Respect persistence readiness before offering projections/editing; retain the existing error/reload behavior.
- [x] Test actual entry/edit/return and reverse edits; verify exact legacy bytes, canonical metadata/no-ops and failed persistence.
- [x] Commit the coherent presentation/navigation slice.

## Task 3: Standing Browser And Release Proof

**Files:** Add `apps/web/scripts/smoke-shared-portfolio-dashboard.cjs` to an existing standing web gate; keep prior workflows intact. Update focused contract docs, mission state/journal and generated report with this source slice.

**Interfaces:** Use existing built-server/browser harness, fresh synthetic contexts and separate `shared-portfolio-dashboard/verification.json`. Existing gate receipts remain separate.

- [x] Add shared-source/edit and adverse persistence/empty/precision workflows at280/375/1440. Verify full values, no overlay/console failures, fit, source-byte preservation and actual model/hero identity.
- [x] Perform primary actual IAB interaction and save valid viewport screenshots; no hidden-state UI manipulation or report-file workaround.
- [x] Run web regressions/references/lint/build, media freshness, original web gates, native types/contracts and new workflow. Keep numerical, asset, timing and pixel assertions intact. Prior native exports are explicitly inherited froma792504 until new exact-head CI.
- [x] Fresh independent review checks the final source pins and attempts to refute cohort/unit/preservation/error behavior.
- [x] Fold a792504/receipt6322747051 into mission state; leave overallR2 and later route/native adoption open. Render the HTML; do not hand-edit it.
- [ ] Push the focused verified commits to draftPR256; require both complete exact-head CI events, source-bound logs and scope-accurate proof before posting the receipt. No metadata-only push loop.
