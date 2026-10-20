# Money Loop Budget Boundaries

## Scope

This correction covers the shared Money Loop and web/Expo single-target Velocity
entry points. It does not complete mortgage/Portfolio preflight, scenario ownership,
dated lender terms, intra-month limits, fees or draw-period rules.

The existing Velocity allocation policy remains. No saved household defaults or
scenarios are reset, and no new loan, banking integration or backend is introduced.

## Affordability

Let `I` be routed income, `G` routed spending including the scheduled target payment
`P`, and `H = G - P` the other spending. The available target/LOC budget is `I - H`,
not simply the residual after reserving the full scheduled payment.

The required current payment is the smaller of the scheduled payment and the
remaining loan balance plus this month's modeled interest. A final $101 balance
including interest is affordable on a $200 budget even if the old schedule says
$425. The unused scheduled amount is released into the existing routed ledger.

The payoff entry point rejects `G < P`: an omitted target outflow cannot create
money. This also closes a historical non-finite-input fixture that previously paid
off a loan with zero modeled income. Valid non-finite debt sanitization is tested
separately under a real, funded routing ledger.

Budget comparisons allow only `1e-8` of binary floating-point tolerance, consistent
with the direct-repayment allocator. An exactly affordable $120.70 final payment
passes; $120.69 still fails. This is not lender-specific statement rounding.

## Recovery And Chunks

A zero residual after scheduled payments can still produce a valid payoff: normal
loan payments reduce the target, then released payments recover the LOC. This
does not authorize a new chunk while recovery cash is unavailable.

Chunk cadence uses the smaller of the declared recovery ceiling and actual routed
surplus. The old `999` chunk-age sentinel cannot bypass zero recovery, and a larger
hint cannot manufacture cash. For example, a $100 chunk with $50 actual monthly
surplus requires two months under this heuristic, not one.

Valid calendar totals override monthly summary totals for eligibility as well as
interest. An optimistic summary cannot authorize a chunk when the actual calendar
has zero recovery surplus. Invalid calendars retain the existing labeled estimate
fallback, using the same validator as LOC accrual.

The returned `cashFlowPaydown` and corresponding event now report actual routed
deposits minus actual routed expenses. They do not count LOC interest twice or
apply a second phantom payment. Excess deposits remain explicit cash reserves.

The multi-debt and Portfolio planners currently allocate much of their surplus
directly to target payments. Their existing allocation policy is not silently
changed here. Four fixtures that expected an unbacked chunk with zero recovery
now assert no draw, unchanged LOC principal and the full scheduled payment outflow.
Cross-route policy alignment remains R2 work.

## Controls And Coaching

Inactive weekly/biweekly mortgage buttons are removed from Simulator and Vault.
The monthly estimate is visible, annual-extra results are explicitly a monthly
approximation, and Guardian no longer advertises unsupported frequency comparisons
or calls the corrected Simulator reference minimum-only repayment. Legacy saved
`paymentFrequency` and `chunkFrequency` values are preserved for compatibility.

Web and native coaching pauses new chunks under the scheduled-payment policy.
This informational guidance is not itself an invalid-payoff guardrail; a valid
final-payment/LOC recovery path remains visible in native Vault.

## Evidence

Failing reproductions preceded each correction. Independent review caught the
exact-affordability floating-point and calendar-summary cases; both were reproduced,
fixed and cleared on re-review. Native
contracts compare final-payment and zero-residual outcomes against the web engine.
The reference lane contains 25 closed-form zero-recovery conservation cases in
addition to the existing two anonymized fixtures and 78 direct-comparison cases.

The browser gate covers the boundary outcomes, visible signed strategy results,
paused-chunk coaching and persisted weekly/biweekly values surviving an unrelated
mortgage edit and route navigation at desktop and 375px.

Educational estimate. Actual lender terms and dated transactions still require
verification. Not financial advice.
