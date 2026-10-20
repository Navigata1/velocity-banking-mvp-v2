# Simulator Comparison Contract

## Scope

This is the first R2-T2 slice, not completion of cross-route financial coherence.
The web Simulator and Expo Simulator compare one active amortized debt plus the
existing LOC balance. All plans receive the same monthly income minus household
expenses. Other debts are explicitly excluded. No saved scenarios or defaults
are migrated, and the existing Velocity chunk/recovery policy is unchanged.

Previously, the baseline used target-only minimum payments, Snowball/Avalanche
used target-only accelerated payments, and Velocity included the outstanding LOC.
That was not a fair comparison of starting liabilities or available resources.

## Direct Repayment

The shared engine now owns a two-liability direct repayment projection:

- Traditional uses the full available budget, active debt first.
- Snowball reserves obligations then prioritizes the smaller principal balance.
- Avalanche reserves obligations then prioritizes the higher normalized APR.
- The active loan payment and estimated LOC interest are reserved first.
- Unused allocation transfers to the other debt in the same month.
- Final payments are capped at the remaining balance plus interest.
- Monthly payments cannot exceed the budget. Unused money is retained as cash.

The old `simulateBaseline` target-only minimum-payment helper remains unchanged
for its existing callers. `runSimulation.baseline` now means this full-budget,
two-liability direct reference. Its signed `interestSaved` and `monthsSaved` fields
retain their legacy names but may be negative. Invalid paths do not claim savings.

## Explicit Educational Assumptions

Direct loan interest is balance times APR / 12; direct LOC interest is beginning
balance times APR times 30 / 365, with payments at month end. Velocity retains its
existing average-daily-balance estimate: income at the start, expenses spread
across 30 days. Rates stay constant; fees and draw-period expiry are not modeled.

LOC interest-only is a model assumption, not a verified contractual minimum.
Actual HELOC payment rules vary, including principal-plus-interest or interest-only
draw-period payments. [CFPB HELOC brochure](https://files.consumerfinance.gov/f/documents/cfpb_heloc-brochure.pdf)
and [home equity plan disclosure requirements](https://www.consumerfinance.gov/rules-policy/regulations/1026/40/).
These sources explain why actual lender terms are still a release gate; they do
not validate this educational model as a lender quote.

Cash-at-payoff values use each plan's own payoff month, not a common date. Neither
those cash amounts nor the interest deltas establish which strategy is universally
best. The current low-chunk Velocity policy can retain cash while the active loan
continues to accrue interest. Do not silently sweep that cash into debt or change
the policy just to manufacture an advantage.

## Verification

Five new regressions failed before implementation: disappearing LOC liability,
missing canonical allocation/accounting, missing priority behavior, affordability,
and positive-only delta clamping. All 275 web regressions now pass. The independent
reference lane adds 78 closed-form cases to the two existing anonymized fixtures.
Native contracts assert shared web/Expo parity, cash labels and adverse deltas.

Independent review reported no blocking financial defects across 1,000 deterministic
input probes. Its empty-chart Month 1 / Month 0 finding is fixed. Real Chrome
checks cover three scenarios at 1440px and 375px, signed slower/higher-interest
outcomes, visible balance bars, review states, no page overflow and no page errors.
The screenshot harness waits for reveal opacity; the initial visually blank captures
were rejected and replaced, not accepted as evidence. CI uploads the resulting proof.

## Still Open

Mortgage/Vault-web, Portfolio, dashboard payoff helper comparisons and shared
scenario ownership have not yet adopted this contract. Shared/single-target
zero-residual and final-payment cases are corrected in the subsequent budget
contract, but other routes still need the same preflight. Inactive mortgage timing
choices are removed and saved legacy fields preserved; there is no new dated
weekly/biweekly engine. Lender-term enforcement, normal dated transactions and
intra-month capacity remain open. No production release is authorized.

Educational tool. Not financial advice.
