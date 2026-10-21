# Portfolio Funded-Book Contract

## Verdict

Portfolio now funds payments from entered household income minus expenses and
includes the separately entered LOC under every strategy/focus. This closes the
reproduced invented-extra-income and omitted-liability defects. It is not a lender
quote, common-date wealth comparison or production-release approval.

The existing module moved into `packages/financial-engine/src/portfolio.ts`, exposed
as `@interestshield/financial-engine/portfolio`. The web module is a re-export.
The main engine entry and current media scenario outputs remain unchanged. Native
can resolve this portable subpath; its existing aggregate Portfolio screen has not
yet adopted this full multi-debt book. Cross-screen scenario ownership remains open.

The native input precision prerequisite is now corrected: drafts preserve cents,
APR precision, no-op imports and unrelated saved values, with explicit rejection
of ambiguous or lossy new edits. See the native input contract. This is not native
aggregate adoption or cross-store scenario consolidation; those remain open.

## Funding And Allocations

- Available budget is income minus household expenses, with no second source of
  cash implicitly created by `extraMonthlyPayment`.
- The persisted field remains intact. A positive value is a funded extra-principal
  cap; zero selects automatic surplus allocation. This intentionally corrects the
  old interpretation that added it to an already fully allocated surplus. Saved
  household values are not migrated, reset or silently overwritten.
- Direct policies reserve clipped scheduled loan payments and modeled LOC interest
  before extras. A positive extra cap covers all extra principal, including LOC.
  Unallocated budget is held as cash. Automatic extras can roll down the ranked
  book as selected balances clear.
- Snowball ranks current outstanding balances, including LOC. Avalanche ranks
  current effective APR, including promo rates and LOC. Ties retain stable input
  ordering. This is an estimate, not a universal lowest-interest guarantee.
- Split mode initially allocates 70:30, or the saved ratio, across the first two
  ranked target slots. A LOC can occupy either slot. Finished target capacity
  rolls down that same ranked book without creating a second budget.
- Single-focus Velocity with usable borrowing setup reserves scheduled payments
  plus any funded manual target extra, then routes residual cash through the
  shared Money Loop to LOC recovery. Its automatic policy does not spend that
  residual a second time as extra loan payments. Chunk transfers are internal
  liability transfers, not additional household income.
- Ranking Velocity, including split mode, does not draw LOC chunks. It still
  includes existing LOC interest and repayment in the direct book. A LOC-only
  repayment plan needs no new borrowing capacity. Borrowing setup/capacity checks
  still apply to single Velocity plans that can make new loan-targeted draws.
- Fully cleared valid inputs are already paid off, even with zero cash flow. Bad
  non-finite inputs are not relabeled as a successful cleared plan.

Initial minimum-payment-below-interest compatibility validation is retained.
After a promo rate changes, direct rows retain any unpaid interest in the balance
instead of dropping liability. Modeled Velocity rejects an uncovered payment
before passing it to the shared month helper, which is not a negative-amortization
loan engine.

## Liabilities, Cash And Presentation

Each new monthly row exposes LOC balance, interest, payment/draw and retained cash.
The book identity is:

`ending debts + ending LOC - ending cash = starting net debt + modeled interest - available monthly budget`

The chart and total-debt summary include LOC, even after ordinary loan targets
clear. LOC controls/interest remain visible across strategies. A failed projection
does not show a payoff date or cash claim. A cleared book is labeled paid off.

Cash is measured at the plan's own payoff month, not at a shared comparison date.
Different allocations can produce different dates without producing new wealth.
The UI does not assert that the separately saved Simulator scenario matches the
Portfolio scenario. Safe consolidation of those stores is separate work.

Chrome also reproduced an existing imported-balance display defect: a100m loan
was shown as10m by the editor's default maximum. Both Portfolio balance editors
now retain the existing imported range; a no-op edit preserves the100m balance.
Review additionally reproduced the same defect in LOC values. The browser now
preserves a200m limit and100m LOC balance through no-op edits. Plan monetary
controls retain their imported upper bounds. This is not blanket validation of
every monetary input/range, precision or extreme magnitude.

## Verification And Limits

New red/green cases cover funding, manual cap/cash, all strategy/focus LOC coverage,
interest reserves, clipped final/cent-short inputs, mixed-book conservation,
Velocity routing, portable delegation, promo liability, presentation and cleared
boundaries. Independent review reproduced and cleared a LOC cap bypass and a
second-ranked LOC missing from split slots. Its separate oracle and seeded probes
are recorded in mission evidence, not counted as lender references.

The committed reference lane adds480 zero-APR policy executions with independently
closed-form payoff/cash expectations, retaining the prior mortgage and Simulator
references. A fixed20261020 LCG seed adds360 repeatable mixed-debt paths, including
240 direct-policy row-by-row oracle matches. Historical transient reviewer counts
were not reproduced exactly and are not counted as repeatable evidence.
The standing browser gate exercises24 cases at1440px/375px, including
actual policy switching, manual-cap edits, no-op imported-balance edit, saved
Portfolio preservation and unchanged separate scenario timing. Presentation review
also reproduced lost LOC targets, unsupported zero-interest claims on rejected
plans and paid-off comparison copy; corrected and cleared on re-review. Chunk
controls are only shown for the single Velocity policy that can draw chunks.
Manual hosted QA additionally caught a current-focus label derived from eventual
payoff order. Both debt layouts and the payoff list now use the engine's current
allocation flags. The dedicated fixture has Auto finish first while Mortgage is
the actual current target. No calculation or saved-data change was needed.

Direct LOC interest is starting balance times APR times30/365; loan interest is
APR/12. Single Money Loop Velocity keeps its income-start/expense-spread average
balance estimate and interest capitalization. A separate verified lender minimum
is not enforced in that path. Fees, dated statement/payment calendars, draw expiry,
intra-month credit capacity and lender cent/posting rules remain release gates.
Intermediate precision and existing payoff tolerance are educational estimates.

The borrowed-liability identity does not establish bank availability, practical
suitability, a safe borrowing recommendation or a promised result. Final-device,
dedicated backend/recovery, remaining hero art and production release work remain.
