# Targeted Reference Oracle Review

Repository: `C:/Users/IslandDevCrew/Documents/Interest Shield`.
HEAD remains `1aec5bf7be3d0f3c26079141245e4c7291fd8778`.
This is a new, expressly authorized review of the changed reference oracle and
the later disclosed capture-only helper edit. It does not rewrite the previous
failed freeze, rerun the full reference, or approve the entire release.

## Findings

No P1/P2 finding identified in this targeted oracle/framing-source review.
The fixture-specific Velocity cutoff at8 is justified by the recorded settlement
trace. It is not a general dust-size waiver or evidence that all microscopic
residuals are real lender debt.

## Independent Exact Adjudication

Read `reference-followup-decision.md` and compared current reference source
against `reference-followup-before.cjs`. The archive SHA-256 is exactly the
original reference pin, `15a3917980416c658fec2ff8bfc8d86a818860a001687e51359da83751fdadfd`.
The reviewed current source is
`d6655109cfb91f96f832cc720f7d0a71b38e57857e7bc556b81a6c77d6e6e9ec`.

The independent test-only probe reconstructed the unchanged seeded fixture:
85 draws through the zero lane,154 through source4/split, state1900885999.
The resulting canonical book exactly matches the decision's JSON. Product
simulation supplies the posted observations; arithmetic expectations are computed
independently by decoding each Number's IEEE754 high/low Uint32 fields into
BigInt units at2^-54. No production sum, tolerance, or clearance predicate is used
to derive the three exact numerators.

| Quantity For rate-4-0 | Independently Verified Exact Result |
| --- | --- |
| Entered461 + all posted interest - all payments through month7 | `447 * 2^-54` |
| Month6 recorded balance + month7 interest - month7 payment | `727 * 2^-54` |
| Recorded month7 balance | `512 * 2^-54 = 2^-45` |
| Month8 local removal without recorded interest/payment/draw | `512 * 2^-54` |

All four are positive. Actual month8 records balance0, payment0, interest0,
draw0; there is no recorded settlement to explain the positive prior balance's
removal. The447/727/512 differences also expose ordinary rounding in the trace:
they do not establish a unique exact lender balance. But neither local nor
entered-posting accounting supports claiming exact-zero repayment here.
Therefore retaining H0..7 and failing closed from H8 is the honest interpretation
of this trace under the stated exact-clearance contract. Available cash or another
liability's rounding is not a recorded payment to this loan.

## Oracle Scope And Coverage

The archived/current diff is retained in `oracle-review-code-diff.patch`.

- The new exact proof is invoked only for source4/split/Velocity at month8.
- Literal `unavailableFromMonth:8` is supplied only for source4/split in the
  existing Velocity branch. Other strategies and sources receive no cutoff.
- Existing `near`, `available`, `unavailable`, `matchesObserved`, direct ledger,
  APR/minimum helpers, RNG and primary probe function remain byte-for-byte
  unchanged. No tolerance, primary counter, seed, generator or horizon change
  appears in the diff.
- The default expected-snapshot path is unchanged when no cutoff is supplied.
  This was additionally checked against the archive for42 expected snapshots
  (14 months times3 policies) for this fixture.
- Six H7/H8 boundary checks were added inside an existing comparison probe, not
  as new primary probes. They do not inflate the primary23247 count.
- Two narrow negative controls pass: the permanent proof rejects a version with
  a recorded month8 settlement, and its grid helper rejects an off-grid2^-55
  input. The fixed proof is sensitive to the actual settlement facts, not just
  an unavailable status copied from the product.

The independent bounded run queried only this one fixture at
H0/1/2/3/4/5/6/7/8/12/24/60/120/600. Direct-policy expected rows were calculated
with the unchanged independent direct ledger, not read from product snapshots.

| Month | Velocity | Snowball | Avalanche |
| --- | --- | --- | --- |
| H7 | modeled, coverage7, loan balance2^-45 | modeled, coverage7 | modeled, coverage7 |
| H8 | unavailable/cent-tolerance, coverage7, money/delta null | modeled, coverage8 | modeled, coverage8 |

Later queried Velocity horizons remain unavailable; neither direct column is
suppressed. Both direct columns retain finite signed differences to Snowball.
H8 cash/net is419.14191593871135 for Snowball and451.16995312899695 for Avalanche.

## Disclosed Capture-Only Extension

The latest inspected helper is
`apps/web/scripts/smoke-portfolio-common-month.cjs`, SHA-256
`a936228c293cbee4fa56d1a67cb323122f85d1a8b99afaa53ce70b289c9b41b2`.

Its final pre-screenshot evaluation adds `element.scrollIntoView({block:'start'})`
and requires `parent.scrollTop>0` before using an overflow ancestor for the existing
80px offset; otherwise it offsets the window. The intermediate getByText scroll
is absent. This addresses the identified source-level framing mechanism.

Removing exactly those two insertions in memory recreates the original helper
hash `8dd2a4063061f203454e1a001c382c7540d5e48110a5b399190d1f60af8d97a5`.
This exact reverse-hash check proves no other fixture, assertion, geometry check,
negative control, restoration, primary count or capture naming changed. It is
not a new browser run or a claim that the resulting screenshots are now correct.

## Declined To Judge

- Full reference23247 GREEN is parent-reported context, not a newly executed
  result of this review. No full reference or heavy suite was run here.
- The upcoming21-per-platform screenshots and actual layout/visibility,
  native/browser interaction, builds, full gates and hosted checks belong to
  the parent's fresh executions. Source framing analysis cannot replace them.
- Exact lender repayment/cent posting, all other numerical provenance cases,
  whole R2, physical devices and production readiness remain outside this scope.

## Verdict

The previously declined reference-oracle change is now independently reconciled
for the specific rate4/split fixture. Its cutoff8 is supported, H7 and direct
coverage are retained, and no P1/P2 is identified in the reviewed changes.
This closes that narrow review gap, not the whole release. The old failed freeze
is preserved as a failure; current pin verification belongs to this new target.

## Commands And Artifacts

- Read-only archive diff: `git diff --no-index -- <archive> <current>` exited1,
  the normal result for differing files; full patch is saved.
- Initial independent arithmetic probe reached and verified447/727/512, then
  exited1 on a cross-VM array-prototype assertion in the review harness. This
  was a test-bridge setup issue, not a product/oracle RED, and is retained in
  `oracle-review-exact-probe.json` and the command journal.
- The bridge-corrected probe exited0 in about0.5seconds. Full fixture, exact
  units, negative controls and42 default-equivalence/snapshot checks are saved
  in `oracle-review-exact-probe-verified.json`. Its inspectable test-only source
  is `oracle-review-probe-source.txt`; no executable source was edited.
- Framing reverse-hash check exited0. One earlier shell-quoting attempt exited1
  before Node execution; it supplied no product evidence.
- New-target reconciliation exited0 with239 files, only the explicitly disclosed
  capture helper changing after the oracle review's initial pin. The final
  complete inventory/hash check is saved in `oracle-review-final-race-check.json`.

No source, existing test, prior review/followup file, docs, Git state, dependencies,
canonical test-results, browser/server, user port or external process was changed
by this reviewer. All writes are this directory's `oracle-review-*` artifacts.

## Pin History And Current Target

`oracle-review-reconciliation.json` records that238/239 files matched the previous
final-followup pin, with only the expressly authorized reference-test change.
The archived-before source matches that prior reference pin exactly.

The capture-helper change was disclosed while this new review was running.
`oracle-review-final-reconciliation.json` records that extension explicitly:

- Reference: `15a391...` to `d6655109...` versus the earlier failed freeze.
- Capture helper: `8dd2a406...` to `a936228c...`, separately disclosed and inspected.
- Other237 executable pins and HEAD match that prior snapshot, including core
  `66b2344c29159d6c3bdc2ca99bcd0476420710f7ce89e9cfd7f98a27e09cbfc5`.

`oracle-review-final-pins.json` is the explicitly new239-file target including
both authorized changes, not a replacement of the earlier freeze. Checksummed
review inputs include the adjudication, exact archive, previous failed receipt,
drift record and final-followup report. All remain unchanged; the old receipt
still records exit1. Docs/ops/generated outputs remain outside executable pins.
