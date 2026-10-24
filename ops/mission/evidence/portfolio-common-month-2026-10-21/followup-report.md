# Bounded Adversarial Follow-Up

Repository: `C:/Users/IslandDevCrew/Documents/Interest Shield`.
HEAD remains `1aec5bf7be3d0f3c26079141245e4c7291fd8778`; feature remains an
uncommitted working diff plus new files. No product, test, executable, prior review
artifact, or browser/server changes were made by this follow-up. All new writes
are `followup-*` artifacts in this directory. No subagents.

## New Finding

### F4 [P2] Restore the nonnegative range check for cumulative interest

Location: `packages/financial-engine/src/common-month.ts:109-110`.

Replacing `sum([interest,row.interest])` with `sumCommonMonthTerms(interestTerms)`
fixes F3's cancellation, but drops the old `hasFiniteNonNegativeSum` overflow guard.
The signed helper rounds the final expansion back to Number; its result alone
cannot establish that an all-nonnegative total fits the supported finite range.

Exact reproducer, generic reducer only:

```js
{
  horizonMonths: 2,
  monthlyBudget: 0,
  initial: { balances: {}, locBalance: 0, cashBalance: Number.MAX_VALUE },
  projection: {
    payoffPossible: false,
    payoffMonth: 2,
    rows: [
      { month: 1, balances: {}, locBalance: 0, cashBalance: 0,
        interest: Number.MAX_VALUE },
      { month: 2, balances: {}, locBalance: 1, cashBalance: 0,
        interest: 1 }
    ]
  }
}
```

Actual: H2 is `modeled`, coverage2, net-1, interestThroughMonth=Number.MAX_VALUE.
Expected under the existing strict positive-range contract: H1 remains usable,
H2 is `unavailable/numeric-range-exceeded`, coverage1. The cumulative positive
interest is MAX+1: the residual is real, although rounded summation returns MAX.

Independent refutation controls:

- MAX/2 followed by1: within range and correctly modeled; a rounded diagnostic is
  acceptable here. The F3 fix must retain this behavior.
- MAX followed by0: exactly at the supported bound and correctly modeled.
- MAX followed by1: unchanged `hasFiniteNonNegativeSum([MAX,1])` returns false,
  but the new cumulative path still accepts the snapshot.
- Raw signed conservation is exactly0 in all three controls. Therefore the error
  is the lost nonnegative aggregate-range guard, not inconsistent inventory.

Recommendation to parent, not implemented: keep raw interest terms for signed
conservation and independently apply the existing nonnegative range guard before
accepting the cumulative diagnostic. Do not restore rounded conservation or
widen tolerances. The existing numeric-range module is unchanged and already
provides the needed distinction; no arbitrary-precision production math is asked for.

Evidence: `followup-range-probe.json` and `followup-refutation.json`. The expected-
behavior assertion failed with exit1; the three-case confirmation/control probe
exited0. This is an extreme generic reducer boundary regression, not a demonstrated
canonical Portfolio policy trace, ordinary financial loss, or UI crash. No P1 found.

## Original Findings Reconciled

- F1 resolved on the original ordinary exact-dust input. H0/H1 remain available;
  H2 and H52 are now `cent-tolerance`, coverage1, with null money/deltas. The
  focused suite additionally checks the 1e10 residual and H600 for all policies.
- F2 resolved on the original valid-prefix/null-row input. H1 still works; H2
  returns `invalid-trace`, coverage1, without throwing. Focused cases also cover
  undefined and sparse required rows.
- F3 resolved on the original conserving high-magnitude input. H2 is modeled
  with net-1; rounded interestThroughMonth=1e16 no longer controls conservation.

The exact old `review-probes.cjs` was executed without modification. Its
`rawNetOverstatement` logging expression subtracts from null after F1 becomes
unavailable; that legacy exploratory field is not a valid financial delta and
is not used here. The assertions and status/null outputs establish the result.

## Residual Provenance And Scope Limits

- The adapter now rejects any observed positive <=0.01 loan balance that later
  vanishes with zero payment and zero interest. This includes a residual whose
  origin might be floating arithmetic rather than entered debt. Such provenance
  is unproved, so conservative unavailability is honest; it is not proof of a
  real unpaid cent, a repaired engine payoff, or exact actual clearance.
- Earlier supported rows remain usable. No blanket initial/tiny-LOC rejection
  was added. The focused suite's balanced tiny LOC and actually repaid generic
  tiny-debt controls pass.
- The generic reducer consumes structural inventories/interest, not payment
  provenance. Conservation within a floating tolerance is not independent proof
  that every microscopic balance was repaid. No stronger generic provenance,
  lender cent-posting, or arbitrary-precision guarantee is certified here.
- Current spec/contract text still mentions a per-loan resolution bound at the
  time read. Executable source no longer uses one. Docs are parent-owned and
  explicitly excluded from source race checks; this is not a new executable finding.

## Declined To Judge

- Parent's live full reference run, full gates and actual-browser QA: not run,
  interrupted, or borrowed as evidence. Process56038 and user ports53143/53144
  were not queried, used, or changed.
- Web/native strategy-switch and owner-reset interaction, visual/screen-reader
  behavior, physical devices, CI/READY, whole R2 and production: outside this
  follow-up's authorized execution. Prior limitations remain.
- Canonical/UI reach or practical financial harm from F4: not reproduced. Its
  confirmed scope is the generic finite-range validation contract only.

## Verdict

The original three P2 findings are independently verified fixed. One new P2,
F4, remains in the replacement cumulative-interest validation. This is not a
clean no-P1/P2 review and is not whole-release approval.

## Fresh Commands And Exits

The five requested commands ran serially with 90-second per-command bounds.
`followup-commands.jsonl` contains their exact arguments, timings, exits and full
stdout/stderr, plus bounded inline range/refutation probe records.

| Command | Exit | Observed Result |
| --- | --- | --- |
| `node .superpowers/sdd/2026-10-21-common-month/review-probes.cjs red-dust` | 0 | Original F1 assertion passes |
| same immutable probe `red-null` | 0 | Original F2 assertion passes |
| same immutable probe `red-interest` | 0 | Original F3 assertion passes |
| `node apps/web/scripts/portfolio-common-month-tests.cjs` | 0 | 30 contracts pass, including the three new regressions and strict typed subpath check |
| immutable probe `sum` | 0 | 12000 exact-integer cancellation checks, zero failures, final seed2596821967 |
| bounded inline cumulative MAX+1 expected-behavior assertion | 1 | New F4 reproduced; complete input and outputs saved |
| bounded inline MAX/2+1, MAX+0, MAX+1 refutation controls | 0 | Confirms dropped range guard and preserves valid controls |

Other reads: review report/runner/probes, current two modules and focused tests,
current spec/contract, numeric-range source, targeted rg, read-only git status and
HEAD/inventory. All completed with exit0; the lightweight memory keyword search
returned exit1/no hits and supplied no review facts. No heavy/full suite, browser,
network, dependency operation, generated canonical test output, or Git mutation.

## Pin Reconciliation

`followup-reconciliation.json` compares all previous239 pins; `followup-pins.json`
records the fresh239. Exactly236 are unchanged. No pinned file was added or removed.

| Changed File | Old SHA-256 | Current SHA-256 | Explanation |
| --- | --- | --- | --- |
| `packages/financial-engine/src/common-month.ts` | `0ecc1cb9eabf231a0e51d2ac97728520b657c0fad18367fc6663a4c86b7968a0` | `6ebec7e2d08cf4e78037aad48ace1b7eb791992258f9e7de459173b98833e49c` | Null/object row guard and raw-interest accumulation/conservation |
| `packages/financial-engine/src/portfolio-common-month.ts` | `01bc269b3633da9a174660fc843c87b58cbd635d828de3aa8fd976d8ba0a1f38` | `ae7a34c664c1e7624cee077fdfda87f7dddec66c4f888519a5fbb4801c86ed09` | Remove size-only residual exemption; reject observed unpaid removal |
| `apps/web/scripts/portfolio-common-month-tests.cjs` | `ae517b08d913b7e7db4bfe7446cbb7d57332d86a2489d6b20c17bba35f992b92` | `c9c7489cf38fab0882d73cd71c01eec63ed2b7a1a4d0e8f6966471b6f8199e5c` | Three focused regression cases, 27 to30 |

The only product-module changes are the two disclosed new modules; the third
executable-pin change is the disclosed test addition. Original engine, codecs,
numeric-range, UIs/integrations, browser/reference helpers, manifests and pinned
lockfiles are unchanged from the prior review. Prior review artifacts retain
their recorded hashes. Documentation/ops/generated outputs are excluded as agreed.

`followup-race-check.json` records the after-probe executable check. The final check
rechecks inventory/HEAD and all239 hashes; no source changed during this review.
