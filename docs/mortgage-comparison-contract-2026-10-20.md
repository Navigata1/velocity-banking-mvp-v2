# Vault Mortgage Comparison Contract

## Verdict

Vault now compares four explicit allocation policies using the same starting
mortgage, existing LOC and available household budget. This corrects R2-T2's
missing liability and unfunded-payment defects; it does not complete the full
scenario/lender/calendar/native/production mission.

No saved household values, defaults, timing fields, mortgage-history calculations,
asset files or deployed production settings are migrated or overwritten.

## Shared Inputs And Policies

`compareMortgageRepayment` lives in `packages/financial-engine/src/index.ts`.
The web adapter retains purchase/current normalization and date formatting.
Normal Vault calls supply actual household income and expenses. Numeric legacy
callers still mean a net-budget routing estimate, not a dated transaction ledger.

Every plan starts with the same mortgage and LOC principal, zero cash reserves,
and income minus household expenses. Other debts are excluded. The optional
`debtExtraPaymentCap` extends canonical direct repayment; its omitted default
preserves the Simulator's full-budget behavior.

| Plan | Allocation |
| --- | --- |
| Scheduled Mortgage + LOC | Reserve the scheduled mortgage and modeled LOC interest; reduce the LOC with remaining budget, then retain unused cash. No automatic extra mortgage sweep. |
| Annual Extra (Estimate) | Add at most one twelfth of a mortgage payment monthly, funded after scheduled obligations; remaining budget reduces the LOC, then becomes cash. Not actual biweekly dates. |
| Extra Payment | Preserve the existing half-budget/200-floor/1000-cap heuristic, clipped to budget remaining after obligations. Remaining allocation follows the same LOC/cash rule. |
| Velocity | Preserve the existing canonical Money Loop and chunk policy. Supply gross income and household expenses plus scheduled mortgage outflow, not net income with omitted household spending. |

The direct first-month extra cap reserves the actual clipped mortgage payment and
the modeled beginning-balance LOC interest. The cap stays fixed as a policy; it
does not silently grow later. Final payments are clipped to debt plus interest.
Unaffordable plans produce review states, not payoff or savings claims.

This is not identical to Simulator's Traditional policy, which intentionally uses
the whole available budget debt-first. The names and allocation differences are
explicit. Equal available resources do not mean every policy spends them alike.

The inherited mortgage setup rule still rejects all mortgage plans when the
entered scheduled payment does not exceed first-month mortgage interest. A zero
payment is not replaced with a derived payment. This is not verification of
contractual lender terms. Already-cleared liabilities need neither future
borrowing setup nor an invented payoff date.

## Cash And Outcomes

Each plan exposes cash at its own payoff month. Signed interest/time differences
remain negative when Velocity is more expensive or slower. An unusable reference
suppresses comparison deltas without hiding an otherwise usable independent path.
Bars use the longest actual modeled horizon, not a clipped baseline-only scale.

Cash endpoints at different dates are not a common-date net-wealth comparison.
The zero-APR example illustrates why: different debt/cash allocations can change
payoff dates without changing the household's eventual resources. No claim that
Velocity creates money or is universally preferable is supported.

The separate freed-payment illustration uses exact month differences, not
separately rounded payoff years. It assumes contributions at each month start and
a constant illustrative return. The assumed contribution is capped by available
monthly budget; it is not a claim of incremental savings. A slower/same payoff creates no earlier-payment
investment period. The illustration excludes cash reserves, taxes and fees and
is not a net-wealth comparison or a promised portfolio outcome.

Unsuccessful horizons are excluded from both timeline scales. Fractional month
horizons and non-finite growth are rejected. Sub-dollar differences retain cents;
large illustrations use readable compact/scientific labels instead of clipping.

## Timing And Lender Limits

Direct repayment uses month-end payments, mortgage APR/12 and LOC APR*30/365.
Velocity keeps the existing average-balance approximation: income at the start,
expenses distributed across 30 days, with LOC interest posted to its balance.
A separate verified LOC lender minimum is not enforced in that path.

Rates are constant; fees, draw expiry, normal dated calendars and intra-month
credit availability remain open release gates. [CFPB's HELOC booklet](https://files.consumerfinance.gov/f/documents/cfpb_heloc-brochure.pdf)
and [home-equity disclosure requirements](https://www.consumerfinance.gov/rules-policy/regulations/1026/40/)
describe why actual rates, payment rules, fees and draw/repayment terms must be
verified. They do not validate this educational model as a lender quote.
Intermediates remain high-precision estimates; actual lender cent-rounding and
posting policy are not implemented by this comparison correction.

## Verification

- Nine new core/adapter regressions were observed failing before implementation.
- Presentation, exact-month illustration, paid-off-date and standing-CI checks
  were also observed red before their corresponding corrections.
- Current suite: 310 web/shared regressions; two anonymized references, 78 existing
  closed-form comparisons, 25 zero-recovery cases and 100 new independently
  closed-form capped-mortgage cases.
- Chrome: 20 Vault cases at 1440px/375px, with disclosures exercised, saved timing
  preserved, screenshots, no page/card overflow and no page errors. The existing
  16 Simulator/saved-data cases and seven-route smoke also pass locally.
- Independent review found a contribution above the funded budget, failed-horizon
  scale contamination, fractional-month readiness and lost small currency amounts.
  Each was reproduced before correction and cleared on re-review. A real narrow
  Chrome screenshot also reproduced a 247px amount inside a 195px box; the final
  element-bound check passes after content-aware formatting.
- Fresh production build/types/lint, native contracts and Android/iOS Hermes
  exports pass. Exports are not final-device QA.
- Media financial source hashes are refreshed; scenario outputs remain unchanged.
  Existing full media checks pass with 27 stills; three pre-existing HyperFrames
  transition information notices remain disclosed.

Core financial review is independent of the implementer. Final review/evidence and
exact-source hosted results belong with this checkpoint's mission receipts, not
with historical July completion counts. No draft merge or production promotion.
