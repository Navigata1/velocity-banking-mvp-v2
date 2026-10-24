# Portfolio Common-Month Comparison

## Intent And Scope

Truth-first, hope-forward comparison of the same entered Portfolio book under
Velocity, Snowball and Avalanche at one explicit month. Earlier payoff and more
cash at different payoff dates do not establish greater net wealth. The user has
explicitly requested autonomous recommended decisions without repeated approval
queries. This shared API/UI slice follows the architectural design/test/review
workflow under that authorization; it is not the whole R2 or production release.

Retain the original calm asset-centered app. Do not change allocations, interest
methods, APR meaning, saved schemas, accounts, recovery, lender calendars, assets,
animation, dependencies, cloud configuration or production deployment.

## Chosen Approach

Add a pure common-month trace reducer and a strict canonical Portfolio adapter.
The adapter captures one decoded PortfolioBook, invokes the unchanged full-book
engine once per strategy, and changes only strategy. Each run has the same debt
IDs/balances, separate LOC, income, household expenses, manual cap, chunk, focus
and split ratio. APR is explicitly decimal. The existing 600-month engine cap
remains unchanged. No store setter/recompute/history mutation produces columns.
`preparePortfolioComparison` keeps the three traces privately in one captured
book's view-model; `atMonth` returns fresh snapshots without rerunning allocation.
No module-global or cross-owner cache is introduced. The convenience
`comparePortfolioAtMonth` still captures and queries one book in a single call.

Alternatives considered: payoff-summary-only comparison lacks same-month cash
and liabilities; rewriting allocation math would conflate a new comparison view
with existing policy changes. Full accepted rows provide the required inventory
without either change. Generic trace semantics also support later Simulator/Vault
adapters; their single-target scope is not relabeled whole-household coverage.

## Calculation Contract

- Horizon is a finite safe whole month in [0,600], inclusive. Invalid horizons
  return unavailable outputs, not truncated/coerced dates or NaN/Infinity.
- Month0 is the actual finite starting inventory: all listed debts plus the
  separately entered LOC and initial cash. It is observed, not a payoff promise.
- At accepted month H, net modeled wealth is cash minus listed debts minus LOC.
  Interest and budget are diagnostics, not additional assets. Signed differences
  compare each column with the currently selected strategy at that same H.
- After actual exact-zero clearance at P<H, retain payoff cash and add (H-P)
  times the same monthly household budget. No additional scheduled-payment bonus,
  new borrowing, investment return, reserve sweep or double-counted payoff month.
- Zero-cleared inventory with nonnegative budget continues from month0. A deficit
  after clearance is unavailable; no unsupported future deficit loan is invented.
- Actual accepted contiguous rows establish coverage. A failed attempted month
  counter, a payoff flag or cashAtPayoff alone never establishes month-H coverage.
- A valid accepted prefix before a later failure remains usable, with separate
  payoff failure metadata. Beyond that prefix, unpaid balances cannot be frozen,
  zero-filled or extrapolated. A failed column does not erase usable other columns.
- All IDs and LOC/cash/interest values must be complete, finite and nonnegative;
  malformed required-prefix traces, overflow and conservation violations fail closed. Missing LOC
  is not zero. Nonzero per-liability cent tolerance is retained at observed/valid
  rows, never extrapolated as exact-zero clearance. A small LOC in an actually
  balanced accepted row remains usable. The Portfolio adapter detects legacy
  loan-balance tolerance removal without payment/interest. Unresolved removal
  stops later coverage, while earlier supported rows remain usable. A size-only
  floating-resolution bound does not prove a residual fictitious. No whole-book
  blanket dust rejection.
- Cash/liability conservation must agree with starting net liabilities, H*budget
  and cumulative interest within bounded floating-intermediate precision. This is
  not arbitrary-precision lender posting or a new cent-forgiveness policy.
- Signed partial sums retain representable small residuals before large cash and
  debt terms cancel, including the row-conservation check and cross-policy delta.
  Raw cumulative interest terms remain available to conservation; a separate
  nonnegative range check rejects totals beyond the supported finite range.
  The mechanism extends the repo's existing residual-preserving range arithmetic;
  [Python's official summation documentation](https://docs.python.org/3/library/math.html#math.fsum)
  describes the general multiple-partial-sums approach and floating-point limits.
  This is not a claim of Python implementation parity or exact lender posting.
- Invalid canonical books are rejected at the boundary; existing records are
  untouched. Unavailable money is null, never a fabricated currency zero.

## API And Ownership

`common-month.ts` owns structural trace/snapshot types and a pure reducer.
`portfolio-common-month.ts` decodes the canonical book, builds three projections,
and returns snapshots plus signed deltas relative to the captured selection.
Expose the adapter through an explicit financial-engine package subpath, matching
existing Portfolio/Book exports. No runtime cycle through the main engine entry.

Web Portfolio and native Portfolio render the same result with view-local horizon
state. Native workspace already keys by storageScope: account/guest changes reset
the horizon and never retain another owner's financial result. Absence remains
absence, not an invented cleared book. No persistence or cross-store migration.

## Presentation

An unframed comparison section contains a numeric Comparison month input, three
strategy rows, and cash/listed debts/LOC/net/difference fields. Inputs support0
through600 without silently changing an invalid draft into another date. Mobile
stacks metrics; desktop permits scanning side-by-side. Existing payoff summaries
retain their own-date meaning. No universal winner, guaranteed savings or total
household wealth claim. Coverage and failure labels remain distinct from payoff.

Amounts use cents at ordinary magnitudes and explicit scientific notation for
extreme/very small nonzero values; no ellipsis, false zero or viewport-scaled text.
Financial scope/rounding disclosures remain, without tool-use instructions.

## Verification

Start with real failing API/arithmetic examples, then independent hand-computable
and seeded invariants. Cover full book/LOC, exact-zero continuation, capped cash,
adverse signed outcomes, partial failures/attempted month, promo capitalization,
decimal APR2=200%, dust, invalid IDs/horizon/numbers, overflow and immutability.
Verify typed web/native export resolution. Browser tests exercise real horizon
edits, strategy changes, snapshot labels/money, no persistence/history mutation,
mobile bounds, invalid draft, scope reset and unchanged separate scenarios.

Run standing web/native contracts, regressions/reference/lint/build/export,
media145/27 stills and unchanged hero/video/budget checks appropriate to changed
boundaries. Obtain independent adversarial calculation and UI reviews. Push on
the existing restoration branch/draftPR256 only after local gates; require both
complete exact-head CI events and authenticated READY/hosted proof afterward.
Fold prior verified1aec5bf receipt and publishing fixes into that substantive
checkpoint. Final art, shared ownership, lender/calendar, managed backend/security,
physical-device and production release gates remain open.
