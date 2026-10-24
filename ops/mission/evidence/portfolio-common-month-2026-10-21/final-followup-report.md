# Final Bounded F4 Verification

Repository: `C:/Users/IslandDevCrew/Documents/Interest Shield`.
HEAD: `1aec5bf7be3d0f3c26079141245e4c7291fd8778`, unchanged. The reviewed feature
is still the working diff plus new files, not a committed SHA range.

## Findings And Resolution

No P1/P2 finding identified in the tested module/focused-test scope. F4 is independently verified
resolved on its exact saved reproducer and original three controls. F1-F3 remain
resolved on the unchanged exact probes; this is not an exhaustive new whole-slice audit.
The complete239-file freeze check failed because the separate reference-test
executable changed concurrently. That changed oracle is not approved by this review.

At `packages/financial-engine/src/common-month.ts:110`, cumulative interest is now
checked independently with unchanged `hasFiniteNonNegativeSum(interestTerms)`.
Raw interest terms remain in signed conservation at line115, preserving the F3 fix.

Fresh F4 observations:

- Exact previous input, initial cash MAX, budget0, interest MAX then1: H1 is
  modeled; H2 is unavailable/numeric-range-exceeded, coverage1, all money null.
- MAX/2 then1: both required rows remain modeled, H2 net-1.
- MAX then0: both required rows remain modeled, H2 net0.
- MAX then1: the positive-range guard rejects H2 while raw signed conservation
  independently remains exactly0. Rejection is correctly a range limit, not an
  invented accounting discrepancy.

Fresh original probe observations:

- F1: exact entered unpaid dust retains H0/H1 and cuts H2/H52 at coverage1.
- F2: valid H1 followed by null returns invalid-trace at H2 without throwing.
- F3: exact conserving large-interest trace remains modeled at H2 with net-1.

## Ambiguities And Declined Judgments

- Rate4/split5 cutoff versus repayment-provenance adjudication is expressly
  reserved to the separate independent review. This follow-up neither resolves
  nor refutes that expected-lane question, and does not treat unknown provenance
  as proven repayment or as proof of a genuine unpaid cent.
- Generic structural traces and bounded floating conservation do not certify
  lender payment provenance, exact cent posting, or arbitrary precision. The
  adapter's conservative rejection of observed unpaid removal is unchanged here.
- Full reference/standing gates, browser/native interaction and visual QA, owner
  reset, CI/READY, physical devices, whole R2 and production were not rerun or
  certified. Parent handles those gates; no external process or user port was used.
- Parent's preceding RED/GREEN logs and documentation correction are context,
  not substituted for this turn's execution. Docs/ops remain outside race checks.
- The concurrently changed reference-test file has only been inspected with
  targeted source search to identify the drift. Its new exact-unit assertions,
  literal cutoff and rate-lane expected outcomes were not adjudicated or executed.

## Verdict

F1-F4 are closed on their exact reviewed cases. No P1/P2 identified within this
bounded fix verification. Separate provenance adjudication remains open; this
is not whole-release approval and does not certify that every reference lane is correct.
The final full-snapshot pin check is not clean: one unexecuted reference-test file
changed. The modules, focused tests and original probes used here retained their pins.

## Commands And Evidence

All four existing Node test commands ran serially with a 90-second per-command
timeout, and all exited0. Full stdout/stderr, arguments, timing and exits are in
`final-followup-commands.jsonl`.

| Command | Exit | Fresh Result |
| --- | --- | --- |
| `node .superpowers/sdd/2026-10-21-common-month/review-probes.cjs red-dust` | 0 | Exact F1 passes |
| same immutable probe `red-null` | 0 | Exact F2 passes |
| same immutable probe `red-interest` | 0 | Exact F3 passes |
| `node apps/web/scripts/portfolio-common-month-tests.cjs` | 0 | 31 focused contracts, including range controls and strict typed subpath check |
| bounded inline F4 saved input plus original three saved controls | 0 | All expected outcomes verified |
| final239-file inventory/HEAD/hash check | 1 | Reference-test executable changed; other238 pins unchanged |

`final-followup-range-verification.json` contains complete F4 inputs, H1/H2
outputs, independent range-guard results and signed conservation residuals.
The original `review-probes.cjs` was not edited. Its old exploratory
`rawNetOverstatement` field coerces an unavailable null after F1's fix; this field
is not used as a financial delta or correctness oracle.

The 12000 summation checks passed in the preceding follow-up; they were not
rerun or relabeled fresh in this narrower turn. No heavy suite, browser/server,
network/cloud operation, product/test edit, or canonical test-results write occurred.

## Scope Pins

`final-followup-reconciliation.json` compares the prior freeze and original239
executable pins; `final-followup-pins.json` retains the full current239 hashes.
At the initial pin, exactly237 pins were unchanged since the preceding follow-up,
with no additions or deletions. The two expected changes were:

| File | Prior SHA-256 | Current SHA-256 | Inspected Change |
| --- | --- | --- | --- |
| `packages/financial-engine/src/common-month.ts` | `6ebec7e2d08cf4e78037aad48ace1b7eb791992258f9e7de459173b98833e49c` | `66b2344c29159d6c3bdc2ca99bcd0476420710f7ce89e9cfd7f98a27e09cbfc5` | Add positive interest-sum range condition; raw conservation remains |
| `apps/web/scripts/portfolio-common-month-tests.cjs` | `c9c7489cf38fab0882d73cd71c01eec63ed2b7a1a4d0e8f6966471b6f8199e5c` | `4f8b2115992c1f8134d4dae0b682be473ecb163fc35171eebc365149bcb8d2c7` | One regression case with three range controls; 30 to31 |

The adapter, old engine, numeric-range, codecs, UI/integrations, browser helpers,
package exports/scripts and pinned locks remain unchanged since the preceding
freeze. Prior review executable/artifact hashes remain intact.

Concurrent drift detected after initial pin:

- File: `apps/web/scripts/portfolio-common-month-reference-tests.cjs`.
- Initial/previous hash: `15a3917980416c658fec2ff8bfc8d86a818860a001687e51359da83751fdadfd`.
- Observed current hash: `d6655109cfb91f96f832cc720f7d0a71b38e57857e7bc556b81a6c77d6e6e9ec`.
- Observed modified time: 2026-10-21T12:49:43.820Z, after the initial pin at
  12:49:42.404Z. The changed file was not loaded by the focused suite or exact probes.
- Targeted source search shows rate-lane provenance assertions and expected-cutoff
  changes. Authorship and correctness are not inferred from the concurrent edit.

Thus236 files remain unchanged versus the preceding follow-up; the third changed
file is this reference test, in addition to the two expected files above. Versus
the original review, four files now differ. `final-followup-reference-drift.json`
records the observed extra hash; the initial snapshot was not silently repinned.

The failed full inventory/HEAD/hash check is preserved in
`final-followup-race-check.json`; the only changed pin is the unexecuted reference
file. Only `final-followup-*` files were written by this reviewer in
this turn. No prior review/followup file, Git state, source, test, documentation,
dependency, browser, server, process56038, or user port53143/53144 was modified.
