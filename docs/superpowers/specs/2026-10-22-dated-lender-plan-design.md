# Dated Lender Plan

## Intent And Scope

Deliver an actual supported numerical case through canonical Portfolio,
Dashboard and Simulator on web and Expo. Preserve the calm asset-centered UI,
all old saved bytes and no-profile educational ledgers. The preceding turn made
progress:93dcf67 is sealed at PR256 receipt6344946083. Do not rerun its helpers.
This is R3 implementation, not another readiness label or a substitute for art,
backend, security, physical-device or release approval. R3 remains open until
the complete required lender/calendar coverage is verified.

The first declared protocol is `fixed-loc-daily-v1`: fixed APR, simple daily LOC
accrual with a365 denominator and actual Gregorian dates; monthly statement
interest rounded half-up once to cents; fixed inclusive statement minimum;
financed annual and percentage draw fees; minimum draw; dated draw expiry and
maturity. Other debt interest/minimums retain explicitly educational monthly
rules, now rounded to cents under this new protocol only. Variable rate paths,
percent/interest-only LOC minimums, daily compounding, payment holds/reversals,
fee waivers and charges outside the protocol stay unsupported. Implement those
later; do not close the full R3 gate from this first case.

## Explicit Input Contract

Optional `PortfolioBook.datedPlan` requires explicit document4. Its fields are:

```ts
interface DatedPortfolioPlan {
  contract: 'fixed-loc-daily-v1';
  startDate: string; // ISO YYYY-MM-01, following a month-end statement
  openingCash: number;
  cashReserve: number; // protected checking inventory, not available to spend
  accountOpenedOn: string; // ISO date; account age never resets at import
  drawEndsOn: string; // actual declared exclusive last draw boundary
  maturesOn: string; // actual declared full-settlement boundary
  annualFeeFirstDueOn: string; // yearly anniversary, Feb29 clamps to Feb28
  openingMinimumPayment: number; // actual declared outstanding prior-statement due
  minimumDueDay: number; //1..31; clamps to actual month-end
  debtPaymentDay: number; //1..31; same monthly due day for other educational debts
  cashEvents: Array<{
    id: string;
    day: number; //1..31; clamps to month-end
    kind: 'income' | 'expense';
    amount: number;
    source?: 'checking' | 'loc'; // required for expenses; forbidden for income
  }>;
}
```

Array order is explicit same-day posting order, including after date clamping.
All entries repeat monthly; total income/expense entries must exactly match
the book's monthly income/living expenses. Debt payments are additional to living
expenses, not counted twice. A changed book may be stored for editing while its
dated schedule mismatch produces review, never an automatic date/amount guess.
Use strict own enumerable data properties, no unknown fields, accessors, symbols,
custom prototypes or sparse arrays. Preserve clone independence and reject
unsupported semantics rather than stripping them.

Require the explicit draw expiry to match accountOpenedOn + drawPeriodMonths and
maturity to match expiry + repaymentPeriodMonths under the declared clamped
anniversary rule; mismatches stay review. Never replace the entered dates.
Dates must be real Gregorian days in1900..9999; start must not precede account
opening or follow maturity. Fees cannot precede account opening. Every input
money amount must be exact cents; monetary inputs are bounded to1billionUSD,
with safe integer-cent outputs checked. APRs/fee percentages use exact decimal
rationals internally (up to8decimal places), not binary floating arithmetic.
Aggregate outputs are bounded to1trillionUSD, below unsafe dollar/cent
round-tripping magnitudes. There are at most256 monthly cash entries.
BigInt is internal only and must never leak into JSON or persisted documents.
Native Hermes export and actual web execution remain mandatory.
Web's TypeScript target must be ES2020 for BigInt literals; its ES2017 diagnostic
is retained before the minimum target correction. No package/lock upgrade.

## Daily Posting And Funding

1. On the first day, post each other debt's educational monthly interest using
   its opening balance/current promo APR and half-up cent rounding.
2. Post the annual fee on its dated anniversary before that day's cash entries.
   It consumes credit capacity even if the previous LOC balance was zero.
3. Process that day's cashEvents in original array order. Income enters checking;
   Velocity immediately sweeps its cash above reserve into the LOC after EACH
   income, before the next same-day entry, but retains a separate checking
   earmark for declared checking/either expenses and debt minimums before the
   next positive income. The earmark is spendable on those obligations; the
   protected cashReserve is not. Direct policies also retain that earmark before
   discretionary extras. Estimate next-month debt minimums from current balances
   and the declared educational interest rules. Retain a conservative fixed LOC
   minimum when a new statement and its due date fall before next income and
   that statement may carry a balance. This is a declared policy, not optimality.
   With no next positive income, use one complete upcoming monthly cycle.
   checking expenses consume only cash above reserve; LOC expenses are draws
   including their separately recorded financed fee. No same-day netting and no
   retroactive funding. A negative balance is never clamped into invented cash.
   Each draw fee rounds half-up independently to cents before checking the
   combined principal-plus-fee capacity. A1USD draw at0.5% costs0.01USD.
   Preserve the existing fractional fee-rate contract: transactionFeePercent
   stores0.01 for1%,0.005 for0.5%,and1 for100%. The editor converts displayed
   percentages; the ledger multiplies drawn cents by the stored fraction once,
   without another division by100. Existing document3 rates are not migrated.
4. At maturity, require full checking-funded settlement above reserve of
   once-rounded interest accrued THROUGH THE PREVIOUS day plus principal.
   Pay the unposted interest directly from checking, not by inventing an
   over-limit LOC capitalization; record separate interest/principal cash legs.
   Today's closing LOC is zero and incurs no new interest. The day's annual fee,
   if scheduled, was charged before cash entries and is included. This maturity
   priority precedes other debt payments. Otherwise collect the outstanding
   previous-statement LOC minimum on its due day, then
   scheduled other-debt minimums on debtPaymentDay. Any actual LOC repayment
   since statement close credits its outstanding minimum; prior-cycle excess
   cannot count twice. Clip obligations to the actual remaining liability.
   LOC minimums cannot be financed by borrowing from that same LOC.
5. Velocity may make one first-day principal chunk after obligations if its LOC
   is recovered. Choose its ordinary velocity-ranked target, bounded by the
   entered chunk and remaining debt. Skip an optional chunk that cannot meet
   draw/fee/capacity/expiry constraints; record why. Never silently raise a draw
   or count it as income. Mandatory entered LOC-funded payments that fail those
   constraints stop the accepted ledger.
6. At month end allocate ordinary extra payments according to strategy and the
   existing extra cap: zero means automatic; positive caps discretionary extra.
   Reserve pending LOC minimums before discretionary other-debt payments.
   Velocity zero-extra primarily recovers the LOC, with scheduled debt payments
   and chunks separate; positive manual extra targets the ranked debt. Direct
   strategies include the LOC in their ranked targets. Explicit debt payment
   sources remain honored. Unused final payments remain checking cash.
   `either` spends available checking above reserve first and borrows only the
   remainder; validate the whole operation including its draw fee/minimum before
   posting any part. Split allocations use exact rational weights: floor both
   shares, award a leftover cent to the larger fractional remainder (primary on
   ties), then redistribute capacity-clipped overflow to the other active slot.
   Allocations must sum to no more than the available/capped cent budget.
7. Velocity sweeps cash above reserve and the current checking earmark to the
   posted LOC after daily operations. A failed chosen-policy cash requirement is
   not a claim that no possible financial plan exists. Exact complete repayment
   can release that target's future checking earmark for other ranked targets.
8. Accrue simple interest on that day's closing posted LOC. At month end post
   the once-rounded accrued interest, check credit capacity, allow remaining
   eligible cash to settle it AFTER establishing the next statement's fixed
   minimum and explicit due date. Those after-statement payments credit that
   new bill once. They are after the daily interest cut-off; record the actual
   interestBalance separately from the after-payment closing LOC. Further
   discretionary payments at this stage must be checking-funded; no new credit
   advances or cash entries after the cut-off. Do not accrue same-day interest again
   on the newly posted interest. Maturity requires full settlement including
   already accrued interest, without spending the checking reserve.

Repayments and draws conserve cash minus liabilities. Only external income,
external expenses, fees and posted interest change the posted position. Unposted
interest is tracked separately; monthly accepted positions include its rounded
posting. Check capacity after every fee/draw/interest event and reserves after
every cash outflow. Failure retains diagnostic dated accepted-prefix events,
but excludes the incomplete month from accepted monthly comparison rows and
withholds payoff claims. No epsilon clearance. Exact zero is required.

An account is assumed closed at whole-plan payoff (or its settled maturity);
future annual/early-closure fees are not invented. This declared closure policy
does not certify any actual agreement. Post-payoff comparison uses the same
ordered calendar, funds expenses from checking after closure, and must not spend
a protected reserve or invent returns. If a pre-income expense fails, that
future comparison is unavailable even when the month's net flow is positive.
Dates/ETA/payoff-order displays use the plan's actual dates, not the device clock.
Payoff observations and comparisons are fully accepted calendar-month closing
positions, not a claim about the earliest possible intramonth payoff day.

## Normal Integration And Versioning

- A new shared dated driver is called by normal `simulatePortfolio`, not only a
  standalone demonstration. Index-based legacy entry points without dated
  context keep review for supplied unsupported terms. Original no-profile
  arithmetic remains exact; do not add runtime imports into standalone index.ts.
- Return a computed `lender-dated` basis only after structural, numerical and
  policy validation. User provenance is not verification. No serialized
  modeled/support flags are accepted. A complete seven-field profile alone
  remains review. Failed dated policies do not get a payoff/savings claim.
- Keep fees distinct from interest in results, ledger and common-month
  conservation. Initial cash belongs in every policy's starting inventory.
  Common-month wealth includes all listed debt, LOC, cash and modeled fees.
- Active physical4 outranks3/2/1, rejects corrupt present4 without fallback, and
  copies on write while retaining old channels. Once adopted,4 stays sticky
  even after removal of dated context. Reject1/2/3 downgrades with new context.
  Web/native snapshots, imports, outboxes, recovery, owner/CAS and failed writes
  must preserve4 exactly. Never rewrite already queued bodies or old archives.
  Old-client rollout/rollback remains a release gate, not solved by a new key.
- Compact optional schedule editor plus an actual dated ledger; no redesign.
  Forecast basis must use the calculated result, not a second raw-term-only
  assessment. Show fees and a real unavailable state, not0% progress for review.
- Legacy-channel inputs with unsupported dated extensions fail closed without
  replacing those bytes. Do not reinterpret separate legacy scenario data.

## Numerical Oracles And Gates

January2026 synthetic fixture:LOC900, financed annual fee25 before day1,
deposit500 then draw200 with1% financed fee, decimalAPR.365, no later events:
closing dailyLOC627, unrounded monthly interest19.437, posted interest19.44,
endingLOC646.44. Daily rounding would give19.53 and is outside this protocol.
With limit1000, expense200 before deposit500 fails at1100 (or1127 with fees),
even on the same day; reverse order may be valid. Test exact draw expiry,
minimum draw, fee-only capacity breach, opening statement due, paid minimum
crediting, reserve protection, maturity, year/leap transitions, final cents,
same-budget conservation, unsupported contexts and version/owner failures.

Use independent rational/reference cases plus actual normal entry-point tests,
web/native storage and browser save/reload/edit/import/recovery/compare flows.
Preserve the three full educational ledger hashes and23,247 reference checks.
All standing gates, both complete exact-head CI events/all3jobs/steps/cleanup/
sixactualstdoutguards, known automaticREADY and hosted/IAB proof precede push
receipt/seal. No weakened caps/assertions, dependency/lock/cloud/data/DNS mutation,
paidGPU, merge or production promotion. Earlier API/timing failures stay open.

## Source Context

CFPB distinguishes draw/repayment phases, fees, draw minimums and rate variation;
it does not validate this protocol or velocity banking:
https://www.consumerfinance.gov/ask-cfpb/what-is-a-home-equity-line-of-credit-heloc-en-107/
Federal Reserve G-14B is an illustrative agreement with phase-dependent payment
and fee rules, not a universal formula:
https://www.federalreserve.gov/frrs/regulations/g-14b-home-equity-sample-reg-z.htm
Hermes documents BigInt support, but this app's real exports/runtime still need
verification: https://github.com/facebook/hermes/blob/static_h/doc/Features.md
