# Declared Dated LOC Planning

## Scope

`fixed-loc-daily-v1` is the first supported declared lender/calendar protocol,
not approval of an actual lender agreement or completion of the R3 production
gate. The existing no-profile monthly educational path remains separate.

- Fixed APR, actual Gregorian days, simple daily interest with a fixed365 divisor.
- Statement interest rounds half-up once at month end. Each financed draw fee
  rounds separately; financed fees consume the entered credit limit.
- The existing fee field is a fractional rate: `0.01` means1%, `0.0125`
  means1.25%, and `1` means100%. The ledger does not divide by100 again.
  Old profile bytes keep their existing meaning; no rate migration is needed.
- Explicit account age, exclusive draw expiry, maturity, annual-fee anniversary,
  opening statement minimum and due day. Entered dates must match declared terms.
- Other debts retain labeled educational monthly interest/minimum rules.
- Opening checking cash and a protected reserve are real inventory. Scheduled
  checking commitments before the next income are earmarked separately.
- Ordered monthly cash entries repeat with month-end day clamping. Later income
  cannot fund an earlier event. Income sweeps immediately in Velocity mode.
- A LOC payment credits its current statement minimum once. Holding that bill
  protects it from other-debt spending, not from repayment of that same LOC.
- Maturity settles prior-day accrued interest from cash before principal. It does
  not fabricate an over-limit interest capitalization before paying the account.
- Only fully accepted months enter payoff/comparison totals. Incomplete daily
  prefixes remain diagnostic, with the real stopping date and reason.

Variable rates, percentage/interest-only LOC minimums, holds/reversals, daily
compounding, waivers and undeclared fee semantics remain unsupported and in
review. Document-sourced means the user's provenance assertion, not verification.

## Visible Results

Portfolio, its explicit Dashboard and its Simulator carry the same saved context
and computed basis. Dated results display plan ISO dates rather than dates
calculated from the device clock. Fees remain separate from interest. Review
states withhold payoff dates and zero-cost/progress claims.

The web and Expo editors require explicit entries and retain invalid drafts.
Their ledgers distinguish cash changes, LOC changes, daily interest balances,
statement bills and fees. The common-month view includes opening cash, fees and
the actual horizon date. After whole-book payoff, the LOC is assumed closed;
future expenses must be cash-funded in order without spending the reserve.
An unfunded earlier expense makes that horizon unavailable.

## Persistence And Rollout

Document4 explicitly carries optional `datedPlan`; it cannot be downgraded into
documents1/2/3. Physical web/native channels4 retain the older byte archives.
Removing a dated context or lender profile does not downgrade an active4 record.
Present corrupt4 data blocks editing rather than silently loading an old book.
Existing snapshot/outbox bodies remain opaque and immutable while queued.

Web writes check the exact last-observed physical source and pause on unexpected
external changes. This is optimistic synchronous stale-source protection, not
an atomic cross-thread localStorage transaction. Explicit reload/rehydration
adopts the new source; there is no automatic financial-book merge. Native
storage retains owner/revision/lease guards. While recovery is busy, ordinary
replacement is blocked; only a genuine active-owner recovery lease may proceed.

Old-client rollout/rollback, actual signed-in cloud recovery, physical
SecureStore/device behavior and release policy remain open gates. Supporting
document4 in this code does not make a deployed older client understand it.

## Verification

Standing web tests include schema/codec, rational daily ledger, normal multi-debt
dispatch, exact comparison, independent-finding regressions and real UI modules.
Standing native tests include dated persistence, provider, draft, model, ledger,
route and actual-module workflow contracts. Browser gates exercise synthetic
records at280/375/1440, including same-day order and unavailable results.

The independent numerical review closed four actual findings: next-cycle bills,
decimal aggregate outputs, wealth deltas and self-crediting LOC repayments.
Those initial approvals are superseded for the fee boundary: actual-editor
integration exposed and corrected a second division by100. Independent fee-unit
re-review passes30groups/78 rounding cases on corrected pins; full gates and
exact-head remote proof are still required for shipping.
Persistence review closed stale same-schema overwrites, alternate-wrapper data
loss and unleased recovery-busy replacement. Earlier RED evidence is retained.
These are bounded code reviews, not production, art, security or device approval.

No asset geometry, materials, posters, dependency/lock, SQL, workflow, timeout,
cloud project, access or DNS changes belong to this slice. The generated media
scenario index changes only its source digest; educational scenario values stay
unchanged. Full standing gates and exact-head remote proof are required before
the checkpoint can be described as shipped.

Educational tool. Not financial advice.
