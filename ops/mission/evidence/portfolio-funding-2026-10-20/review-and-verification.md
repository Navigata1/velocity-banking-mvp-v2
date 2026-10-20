# Portfolio Funding Verification

## Checkpoint Scope

Base ec11223357ee980aa33ea453ec1b4ca609cbf2f1 passed complete push/PR runs
39502097560/39502102981, real SQL, Vercel and hosted checks. Final baseline
receipt: PR256 issuecomment-6302535434. This checkpoint needs new exact-head proof.

The Portfolio implementation moved from the web adapter to a portable package
subpath. No dependency versions, saved household/default values, timing fields,
asset bytes, backend/schema/data, credentials, DNS or production settings changed.
The main financial entry/media source digest and scenario outputs are unchanged.
The native aggregate Portfolio has not yet adopted this full multi-debt engine.

## Observed Red And Corrections

- Budget100/extra200/loan1000/payment100 previously produced payments300 and a
  four-month payoff. Extras now come from the existing budget, never new income.
- Direct/ranking policies omitted existing LOC debt and interest. All strategy/
  focus variants now retain it, reserve modeled obligations and expose cash.
- A manual50 cap was initially bypassed by a900 LOC payment. Independent review
  reproduced it; direct cap now covers all extra principal, including LOC.
- Review also reproduced split allocations800/400/0 instead of800/100/300 when
  LOC belongs in slot2. Tagged loan/LOC target capacities now share one allocation,
  preserve the saved split ratio and roll finished capacity down the ranked book.
- Single Money Loop Velocity reserves scheduled/manual payments, routes gross
  household income/expenses and uses only the residual to recover LOC. Other loan
  payments use the same precomputed monthly minimums, independent of input order.
- Clipped120.70 final obligations pass;120.69 fails. Cleared valid zero-cash-flow
  books show paid off; LOC-only repayment does not request new borrowing setup.
- Direct post-promo unpaid interest remains a liability. Modeled Velocity rejects
  uncovered post-promo payments rather than passing unsupported negative
  amortization through its helper.
- Chart/total/run summaries now include LOC. Presentation review found lost LOC
  targets, invalid zero-interest claims and paid-state comparison copy; each was
  observed red, corrected and cleared on final re-review.
- Chrome reproduced imported100m loan shownas10m. Both loan editors preserve the
  imported range/no-op edit. Review found the same defect in LOC controls; fresh
  Chrome now preserves100m balance and200m limit. Plan monetary upper bounds are
  retained. This is not blanket proof of every numeric range/precision.
- Inactive chunk controls are absent outside single Velocity. Separate saved
  scenario income/expenses and weekly timing survive real Portfolio interactions.

Red-excerpt files contain selected observed failures, not full test transcripts.
Passing output and unrelated legacy-copy expectation failures were omitted.
Legacy comparison fixtures now improve real income rather than inventing bonus
cash; copy contracts target actual corrected behavior. Invalid-payoff guards and
all prior core/reference tests remain enforced.

## Independent Review

Reviewer Leibniz,01a15b53-964b-7c11-8f22-89faaadeaf6c, performed read-only math
and presentation reviews. The cap/split and four presentation findings above were
reproduced and cleared. Final review reported no consequential scoped findings,
328 regressions passing, package resolution correct and unchanged allocation logic
after target metadata. Reviewer closed; no file or Git mutations.

Historical transient probe totals reported by the reviewer could not be reproduced
exactly in a seeded replay. Those totals are discarded as repeatable proof and are
not combined with the committed reference lane. The main agent added a reproducible
seed20261020 LCG suite:360 mixed-debt paths,240 direct-policy row-by-row oracle
matches, input immutability, interest reconciliation and cash/liability conservation.
This code is committed in financial-reference-tests.cjs and does not call the
production allocation helper to derive its expected rows.

Reviewer excluded browser/build/native execution, actual lender minimums, normal
dated calendars, capacity enforcement, lender cent rounding and production approval.
Main-agent rendered proof and builds are separate evidence, not reviewer execution.

## Fresh Gates

- 328 web/shared regressions and existing ancillary contracts.
- 2 anonymized reference fixtures,78 prior comparison,25 zero-recovery,100 capped-
  mortgage and480 Portfolio closed-form policy cases;360 seeded paths/240 oracle
  matches as above. These are educational references, not bank quotes.
- 22 actual Portfolio Chrome executions1440px/375px; observed values/actions/inputs
  retained in JSON. Policies/caps, failed/cleared/final/large states, saved data and
  no-op loan/LOC edits pass with no page errors or page/stat overflow.
- Screenshot opacity is checked before capture. Earlier dark full-page fade-in
  captures were rejected; retained viewport images show the actual readable state.
- Existing16 Simulator and20 Vault cases plus seven rendered routes pass locally.
- Next production build/types/ESLint; mobile types/contracts and fresh Android/iOS
  Hermes exports pass. Exports are not native-device QA.
- 41 media contracts and scenario freshness pass locally. Assets/video/lighting
  unchanged; full media/native/SQL standing gates must also pass on the pushed SHA.

Remaining: dashboard helpers, native aggregate Portfolio adoption, safe scenario
ownership, common-date wealth, actual lender/calendar/posting/rounding/capacity,
backend/account/provider/recovery, eight hero refinements and final-device/release
gates. No draft merge or production promotion is authorized by this checkpoint.
