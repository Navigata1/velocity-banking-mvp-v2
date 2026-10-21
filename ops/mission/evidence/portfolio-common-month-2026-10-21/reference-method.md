# Independent Common-Month Reference Lane

## Command And Scope

From `C:/Users/IslandDevCrew/Documents/Interest Shield`:

```powershell
node apps/web/scripts/portfolio-common-month-reference-tests.cjs
```

Node used: v22.22.2. TypeScript is the existing project dependency; no packages
were added. The script uses the established Node CommonJS/TypeScript VM loader.
It runs the actual shared adapter, reducer and unchanged Portfolio engine, not
test replacements. Every completed run exits nonzero on any failed assertion.

Only the new test script and `reference-*` evidence are owned by this worker.
The parent owns fixes, wiring into standing gates, web/native integration and
all publishing/release decisions. This lane does not approve production.

## Deterministic Sources

- Seed20261021, unsigned32-bit LCG: `state = imul(state,1664525)+1013904223`.
- Inclusive integer samples: `min + floor(state/2^32 * (max-min+1))`.
- Zero APR:8 generated source books, expanded to32 policy-input variants by
  two focus modes and automatic versus positive manual cap. Each comparison
  itself exercises all3 policies. Sources contain3 to5 nonzero debt IDs, an
  additional zero ID, varied existing LOC, income/expenses, chunk amounts,
  positive caps1/7/31/10000 and binary split ratios0/.25/.5/.75/1.
- All601 horizons0 through600 are observed for each of those32 variants:
  19232 adapter calls,57696 strategy snapshots. Zero-APR conservation uses
  strict equality: `wealth = H * Q - initialListedDebts - initialLOC`, including
  retained cash and post-payoff continuation. Binary source arithmetic avoids
  rounding a balance merely to make that strict property pass.
- Nonzero rates:12 additional generated sources,24 focus-mode books,72 raw
  policy paths. Includes decimal APR, promo transitions, fixed/percent minimums,
  nonbinary split ratios0/.1/.33/.7/.9/1, manual/automatic extra and LOC draws.
- Across both seeded lanes:253 PRNG draws, final state3883181796.

## Independent Expectations

1. Five literal, hand-calculated source cases produce8 comparisons/24 strategy
   snapshots: signed adverse Velocity result, usable prefix before failed promo
   month, direct30/365 LOC versus Velocity ADB, explicit decimal loan APR2 and
   LOC APR2 including continuation to month600.
2. Each accepted engine row has independent loan interest and LOC interest
   calculations, per-ID balance changes, LOC draws/repayments, cash movement and
   whole-book conservation checked. There are1845 accepted rows in the recorded
   sources. Velocity allocation ranking is not independently reimplemented here.
3. A separate direct-policy ledger computes48 Snowball/Avalanche paths and1212
   row positions without importing the product allocation, normalization,
   codec or reducer as an oracle. Raw engine positions are compared against it.
4. At10 horizons per nonzero focus-mode book,240 actual adapter comparisons
   (720 strategy snapshots) must agree with independently accounted positions,
   cumulative interest, exact-zero continuation and signed selected-policy deltas.
5. A six-row hand ledger supplies a required-prefix matrix:12 corruptions at
   each of6 rows, each requested at7 horizons0..6. All504 probes check that a
   malformed required row is rejected while an unrequested future bad row
   cannot erase an earlier observation. Missing LOC and missing zero/nonzero
   IDs are separate corruptions.
6. Generic boundaries cover payoff counters versus accepted rows, subcent
   terminal balances, no duplicate scheduled-payment bonus, future overflow,
   true aggregate overflow and four exact-integer cancellation examples plus a
   valid accepted-row cancellation example. BigInt is used only for these
   integer reference answers, not for product posting or repayment allocation.
7. Seven additional actual adapter comparisons cover cleared-book budget
   overflow and finite individual inputs whose exact aggregate exceeds the
   supported numeric range. Unavailable money must remain null, never zero.

## Receipts

`reference-initial-red.log` is a compact transcription of the first completed
run:19757 passed,4 genuine failed assertions, exit1.

`reference-full-run.log` is the raw expanded run before the final seven adapter
overflow comparisons:23107 passed,5 genuine failed assertions, exit1. Every
non-cancellation probe passed. Source hashes are printed in its final JSON row.

`reference-final-run.log` is the raw finalized command output. It also records
the test-file SHA256, loaded product-source SHA256 values, source/row/snapshot
counts, PRNG state and exact terminal pass/fail counts. Read that completed
receipt for the final outcome; never infer a green result from this method note.

`reference-findings.md` contains concrete actual inputs for the parent. The
genuine REDs remain asserted; this worker did not mutate implementation or
weaken the existing core contracts to change their outcome.
