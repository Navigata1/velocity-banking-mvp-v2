# Portfolio Common-Month Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Show cash-inclusive, full-inventory strategy comparisons at one month on web and Expo without changing existing allocations or saved data.

**Architecture:** A pure trace reducer validates complete coverage and derives cash minus liabilities. A canonical-book adapter runs the existing three policies from one captured book. Thin view-local web/native sections consume identical results.

**Tech Stack:** Existing TypeScript shared engine, React/Next, Expo/React Native and Node/Chrome test tooling. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-21-portfolio-common-month-design.md`

## Global Constraints

- Horizon is a finite safe whole month in [0,600], inclusive.
- APR is explicitly decimal; the existing 600-month engine cap remains unchanged.
- No allocation, interest, persisted-schema, recovery, asset, cloud or production changes.
- Preserve exact original fields; use same book/resources for all three columns.
- Unavailable money is null; nonzero dust cannot become exact-zero continuation.
- Same branch/draftPR256; no merge, force push or production promotion.

## Review Focus

- A failed attempted month must not masquerade as an accepted row.
- Earlier payoff must continue the same budget, not freeze cash or add minimums twice.
- Native owner switches and absent books must not retain another scope's results.
- Large cancelling values or tiny liabilities must not fabricate zero or hide LOC.
- Invalid horizon drafts must not persist, mutate policy/history, or silently coerce.

## Tasks

### 1. Shared Calculation Contract

- [x] Add `apps/web/scripts/portfolio-common-month-tests.cjs` with independent
  assertions before implementation. Use existing in-memory TypeScript loader.
- [x] Observe genuine missing-API assertions RED, retaining logs separately from
  setup/import errors. Add cases for inventory180, budget100, cap20 and month3
  cash120/net120; observed0 net-180; initial100 cash10/LOC90 adverse rates; and
  valid prefix before failed month2. Include invalid/overflow/dust counterexamples.
- [x] Implement `packages/financial-engine/src/common-month.ts` pure reducer and
  `portfolio-common-month.ts` canonical three-policy adapter; add typed package
  subpath. Preserve original engine outputs byte-for-byte in fixture snapshots.
- [x] Run GREEN, typed export resolution, existing book/APR/native-model/reference
  tests and independent seeded conservation checks. Review this numerical boundary.

### 2. Web And Native Comparison Views

- [x] Add `apps/web/src/app/portfolio/PortfolioCommonMonth.tsx` and integrate into
  `PortfolioPlanSection.tsx` with memoized immutable book fields/view-local H.
- [x] Add `apps/mobile/components/portfolio/portfolio-common-month.tsx`, integrate
  in existing scope-keyed native Portfolio workspace. No new persistence path.
- [x] Add failing real-browser/native contracts before implementation. Assert
  month0/1/3/600, invalid drafts, cash/liability/net/delta, adverse/unavailable and
  scope preservation, mobile text bounds and no saved/history/source changes.
- [x] Implement calm unframed rows and accessible numeric controls. Test actual
  interactions on desktop/phone and Expo web; independently review the view contract.

### 3. Gate And Publish This Substantive Checkpoint

- [x] Revalidate prior1aec5bf full CI/READY/322-file baseline; treat checks as
  baseline evidence, not newly executed application tests.
- [x] Wire new tests into standing commands. Run full affected web/native/media
  gates and render/inspect actual outputs; no pixel/timing/assertion waivers.
- [x] Fold prior receipt and bounded publishing-helper fixes into tracked mission
  evidence/state/journal. Update R2 truthfully; entire R2 remains open.
- [ ] Commit focused source/test/view slices, then state/evidence. Push same branch.
- [ ] Wait both COMPLETE exact-head CI events; authenticate READY identity; run
  fresh invocation-bound hosted workflow/asset checks and actual browser edits.
- [ ] Publish checked Desktop report/evidence with staged recoverable operations;
  independently read back hashes, close owned helpers, leave goal active.
