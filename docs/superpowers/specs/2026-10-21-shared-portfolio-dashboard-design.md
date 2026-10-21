# Shared Portfolio Dashboard Design

## Intent And Authority

Advance R2 scenario ownership toward one authoritative financial book per active
scenario, consistent budgets/liability scope, and the original calm asset-centered
experience. The user explicitly authorizes autonomous recommended decisions and
execution without repeated approval questions. Native execution with independent
review follows Mission Control Tier2. No merge or production promotion.

This architectural subproject is the first usable shared-source vertical slice,
not completion of R2. Dashboard will consume the existing canonical Portfolio
book directly. No additional financial store, mirrored copy or automatic migration
is introduced. Simulator, Cockpit, Vault and Expo adoption remain subsequent
explicit tasks with equal-budget/full-liability and preservation gates.

## Decision

Use the existing `PortfolioBook` v2 decimal-APR model and Portfolio store. Open it
at `/?scenario=portfolio` from Portfolio. The query selects a view, contains no
financial values, and writes no selection record. `/` remains the existing target
demo. Switching back never copies financial fields between those records.

Alternatives considered: bidirectional store mirroring retains conflicting
financial authority and difficult loop/conflict behavior; automatically combining
legacy records cannot distinguish hypothetical defaults from actual household
liabilities. A complete all-route rewrite in one patch would obscure scope and
migration regressions. Direct canonical consumption supports staged real adoption.

## Financial Contract

- Four vitals: household cash flow, current estimated daily burn, whole-book
  debt-free ETA and the first actual modeled target or a review state.
- Liabilities are all listed debts plus the LOC. Debt selection never changes
  that cohort, budget, strategy or projection.
- Invoke the existing funded `simulatePortfolio(portfolioBookInputs(book))`;
  do not alter interest, allocation, posting or numeric tolerances.
- Current daily burn uses each current effective promo/base APR and LOC APR,
  explicitly in decimal units. Expired promos use post-intro APR.
- Invalid projections suppress ETA and positive targets. Nonzero cent-tolerance
  balances are not described as lender-confirmed payoff. Exact-zero inventory is
  distinct. Nonfinite daily burn is unavailable, not a displayed Infinity/zero.
- Preserve raw numeric precision and metadata. Display amounts are independently
  rounded; tiny nonzero daily burn is labeled below one cent.
- Unavailable or unreadable persistence pauses the shared view and controls. Never
  substitute the target-demo household for an unreadable Portfolio.

## UI And Data Flow

Keep the existing Dashboard route and legacy presentation. A small source-view
switch under a Suspense boundary reads the scenario query and lazily loads the
Portfolio-backed presentation. Root navigation and existing hero runtime remain.

The Portfolio view retains a recognizable selected-asset stage, four compact
vitals and unframed input bands. Use existing `AssetHero`, theme classes and
canonical `PortfolioEditableNumber` controls. Debt selection is local view state;
unknown/removed identities never select a fabricated debt. Empty inventory has a
clear empty state. No decorative landing page or global visual overhaul.

Household income/expenses, LOC fields and applicable chunk amount dispatch to the
same Portfolio store methods as Portfolio. Selected-debt inspection links back to
the existing full editor. Strategy changes use the same store settings. Both
directions of editing must survive navigation/reload with no legacy writes.

The canonical book may be an existing saved record or the existing educational
demo. Entering the view does not create a saved record or add demo liabilities to
an existing book. Existing errors and failed-write latch stay authoritative.

## Verification And Boundaries

Shared pure overview contracts cover full liability sums, decimal APR 200%, promo
boundaries, actual target identities, funded failures, exact-zero versus nonzero
tolerance, unsupported ranges and frozen input preservation. Literal synthetic
fixture: income2000, expenses1500; loans1200@12%/120 and600@24%/60;
LOC300@10%; Avalanche/single/uncapped extra/chunk100. Total2100, cashflow500,
daily burn318/365, first targetLoan B, payoff5 months.

Rendered workflows at280/375/1440 verify explicit entry/back navigation, whole-book
vitals unchanged by selection, actual hero/debt identity, income edits visible in
Portfolio and reverse expense edits visible in Dashboard. Exact legacy bytes,
unrelated canonical fields, valid no-ops, malformed saved records and storage
failure states are protected. Preserve all existing web/native/media/SQL gates.

Use primary in-app browser interaction and existing standing Playwright tests;
do not bypass the historical local-file report navigation restriction. No new
dependencies, assets, cloud/schema/DNS/access/data mutation or paid GPU work.
Full shared ownership, lender/calendar, backend/security, final art and physical
device readiness remain open until their broader gates have current evidence.
