# Bounded Reference Followup Receipt

Decision: correct fail-closed coverage for unresolved unpaid removal. The tested
trace does not prove exact repayment of rate-4-0. Full canonical fixture, all
row7/8 cash/payment/interest/draw values, exact residual provenance and rationale
are in `reference-followup-decision.md`; raw independent dyadic arithmetic is in
`reference-followup-provenance.log`.

## Independent Proof And Narrow Correction

Entered461 plus every posted interest minus every payment through month7 gives
exact numerator447 on the2^-54 grid. The last local transition gives727 units;
the stored month7 residual is512 units (2^-45). Month8 deletes that observed
positive balance without any debt payment, interest or LOC draw. Ordinary cash
and LOC posting residuals cannot prove an unrecorded settlement to that debt.

This does not impose an exact-posting requirement on every paid row or use
positive cumulative ledger error alone as a blanket dust guard. The evidence is
the positive local AND entered-posting residual, positive observed inventory,
and its later zero-settlement disappearance. Existing funded-payment rounding
rules, numerical tolerances and all other paths remain unchanged.

Only source4/split/Velocity expected coverage changes to cutoff8. Its original
five H12/24/60/120/600 failures now correctly expect unavailable/cent-tolerance,
coverage7 and null delta. Explicit actual H7/H8 checks inside the existing H12
probe retain the earlier positive inventory and prove the cutoff while leaving
Snowball/Avalanche usable. Two nested queries/six extra snapshot checks were
added within existing probes, not new probe rows.

## Actual Single Full Run

Root working directory:

```powershell
$timer = [System.Diagnostics.Stopwatch]::StartNew()
node apps/web/scripts/portfolio-common-month-reference-tests.cjs 2>&1 | Tee-Object -FilePath '.superpowers/sdd/2026-10-21-common-month/reference-followup-full.log'
$code = $LASTEXITCODE
$timer.Stop()
"Terminal exit code: $code; wall milliseconds: $($timer.ElapsedMilliseconds)" | Tee-Object -FilePath '.superpowers/sdd/2026-10-21-common-month/reference-followup-runtime.log'
exit $code
```

GREEN: terminal exit0;23247 passed,0 failed. Wall84822ms (84.822seconds).
Internal84523.2911ms; zero lane81946.9049ms. This was the one updated full
reference run; no other heavy/reference/browser run was launched by this worker.

| Probe Group | Passed | Failed |
| --- | ---: | ---: |
| zero-apr | 19232 | 0 |
| zero-convenience-parity | 128 | 0 |
| hand-calculated | 8 | 0 |
| engine-row-accounting | 1845 | 0 |
| direct-reference-length | 48 | 0 |
| direct-reference-row | 1212 | 0 |
| rate-snapshots | 240 | 0 |
| required-prefix | 504 | 0 |
| boundaries | 23 | 0 |
| adapter-overflow | 7 | 0 |

Seed20261021,253 draws, final state3883181796, all unchanged. Every original
primary count field exactly matches the prior GREEN prepared receipt:

- Zero sources8; variants32; comparisons19232; snapshots57696; preparations32.
- Parity comparisons128; snapshots384.
- Hand sources5; comparisons8; snapshots24.
- Rate sources12; books24; engine paths72; accounted rows1845.
- Independent direct-reference paths48; rows1212.
- Rate comparisons240; snapshots720 (the parent RED710 was early assertion exit).
- Prefix sources1; mutations72; snapshots504.
- Generic boundary snapshots23; adapter boundary comparisons7/snapshots21.

## Source Identity And Preservation

| Source Used By Full Run | SHA256 |
| --- | --- |
| portfolio-common-month-reference-tests.cjs | d6655109cfb91f96f832cc720f7d0a71b38e57857e7bc556b81a6c77d6e6e9ec |
| portfolio-common-month.ts | ae7a34c664c1e7624cee077fdfda87f7dddec66c4f888519a5fbb4801c86ed09 |
| common-month.ts | 66b2344c29159d6c3bdc2ca99bcd0476420710f7ce89e9cfd7f98a27e09cbfc5 |
| portfolio.ts | b87133452f55d4c575c1392a71909f61ea1223d5991012ce4b6112ad4b7c5781 |
| numeric-range.ts | fe7e9f46a18e8b97eecf4feab02d77b425ca0cc812bb4528b18074110f6ec21f |
| index.ts | 23f7fa329e1c731323be4afdb4cc0a63d335eaca00eac2d6bec37e82f7abd477 |
| portfolio-book.ts | 2fdc859e8fbf2b4c3927565c4cdd9b4e2c51c7a87009cd44b4734e746d1f57b5 |

All seven hashes were checked against current files after completion. The
original engine/numeric-range/index/codec hashes also match the earlier receipt.

Pin distinction: the narrow dyadic probe and parent RED loaded common-month
`6ebec7e2d08cf4e78037aad48ace1b7eb791992258f9e7de459173b98833e49c`.
The subsequent actual full run loaded the66b2344c source above, which matched
the file at final verification. Do not conflate those two source identities.
The canonical adapter and original allocation engine pins are identical across
the narrow and full runs; raw row7/8 provenance comes from that unchanged engine.
This worker did not change either product module.

Archived before edits: `reference-followup-before.cjs`, SHA256
`15a3917980416c658fec2ff8bfc8d86a818860a001687e51359da83751fdadfd`.
Preserved parent RED: `reference-review-fixes.log`, SHA256
`2deebd5ce3a9401f23a69cf72cadec1a5ae39cfe4c2e1d675c5b35d81cce4d7a`.

The AST-based preservation check compared exact function bodies for directRows,
near, accountRow, rowInterest, minimum, aprAt, matchesObserved and integer, plus
the complete zero-generator/prepared/all-horizon loop: all text-identical to the
archive. Receipt verification also checked every original primary count, PRNG
state, current loaded-source hash and preserved parent RED hash. Terminal exit0;
output is `reference-followup-verification.log`.

`node --check apps/web/scripts/portfolio-common-month-reference-tests.cjs` from
the root and `npx --no-install eslint scripts/portfolio-common-month-reference-tests.cjs`
from apps/web both exited0, no errors or warnings.

Only the owned reference test and `reference-followup-*` scratch artifacts were
written by this worker. No production math/UI/engine, dependency, Git, browser,
server, remote, CI or cloud changes. Parent owns the product and all full gates;
this is not production approval.
