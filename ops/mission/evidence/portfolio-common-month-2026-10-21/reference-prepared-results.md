# Prepared-Model Reference Receipt

Date:2026-10-21. Independent test-worker scope only, not production approval.
Earlier `reference-*-run.log`, `reference-parent-red.log`, `reference-results.md`
and `reference-findings.md` remain historical RED receipts, not current results.

## Preserved Before Editing

Copied the exact original test source to `reference-before-prepare.cjs` before
modifying the product test script. Both originals had SHA256:

`c7cc3a4473358f7d1c4c7c8c61bc112ae7f15b00f9fe8b4db0d93c0eca339521`

Preserved raw-log SHA256 values, verified unchanged after the GREEN run:

| File | SHA256 |
| --- | --- |
| reference-final-run.log | 7c6a5f4fd510e9d60ccefa5fa46c97004ade5808faeb412fcb937fbe2fe4f77d |
| reference-full-run.log | fb1c7ae15e6b166326c4617d4285dab55918af842302140eee6db643dc5efb68 |
| reference-parent-red.log | 7c6a5f4fd510e9d60ccefa5fa46c97004ade5808faeb412fcb937fbe2fe4f77d |

## Narrow Test Change

For each of the same32 zero-APR input variants, capture one actual
`preparePortfolioComparison(value)` and call `prepared.atMonth(H)` at every
H0..600. Every original financial expectation, tolerance, source, PRNG draw and
counted original probe is retained. The only removed source lines are the old
single-function import and the zero-loop convenience-call line, replaced with
the prepared import/query. No original assertion was removed or modified.

Add128 full-output convenience parity probes: months0/1/36/600 for all32 books.
These compare actual `comparePortfolioAtMonth` output against the captured
prepared model, including all policy snapshots and payoff metadata, and check
that the original book is unchanged. Existing independent zero-APR expectations
still validate every horizon; parity is not their arithmetic oracle.

Only the owned test script and new `reference-*` scratch evidence were changed
by this worker. No math implementation, original engine, numeric-range, UI,
manifest, CI time cap, dependencies, browser, server, Git, remote or cloud edits.

## Actual Full Command And Timing

Working directory: `C:/Users/IslandDevCrew/Documents/Interest Shield`.

```powershell
$timer = [System.Diagnostics.Stopwatch]::StartNew()
node apps/web/scripts/portfolio-common-month-reference-tests.cjs 2>&1 | Tee-Object -FilePath '.superpowers/sdd/2026-10-21-common-month/reference-prepared-run.log'
$code = $LASTEXITCODE
$timer.Stop()
"Terminal exit code: $code; wall milliseconds: $($timer.ElapsedMilliseconds)" | Tee-Object -FilePath '.superpowers/sdd/2026-10-21-common-month/reference-prepared-runtime.log'
exit $code
```

GREEN: terminal exit0,23247 passed,0 failed. Measured wall time25529ms
(25.529seconds). Internal script elapsed25267.6822ms; zero-APR sweep/parity
elapsed22843.08ms. This individual command is below the unchanged20-minute
CI cap; it does not establish the runtime or success of the whole standing CI.

The previous receipts did not record a precise wall time, so no measured
before/after speedup ratio is claimed. Previously the zero sweep made19232
convenience calls. Now it makes32 explicit preparations,19232 horizon probes
and128 extra convenience parity calls. Under the parent's three-trace-per-
preparation API contract, this implies160 preparations/480 engine runs instead
of19232 preparations/57696 engine runs in that lane. These engine-run numbers
are contract-derived, not a new instrumented counter.

## Exact Counts

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

The prior23119 probes are all retained and now GREEN;128 new parity probes
bring the total to23247. No expected value or tolerance was changed to resolve
the five prior REDs; the parent's signed-sum math fixes did so.

Seed20261021,253 draws, final state3883181796, exactly as before.
All original count fields were programmatically compared to the preserved
receipt and are identical:

- Zero sources8; books32; comparisons19232; snapshots57696.
- Hand sources5; comparisons8; snapshots24.
- Rate sources12; books24; engine paths72; accounted rows1845.
- Independent direct-reference paths48; rows1212.
- Rate comparisons240; snapshots720.
- Prefix sources1; mutations72; snapshots504.
- Generic boundary snapshots23; adapter boundary comparisons7/snapshots21.

Only new counters: zero preparations32, parity comparisons128, parity
snapshots384. Timing fields are new diagnostic measurements.

## Exact Loaded Source Identities

The current test and all six loaded modules were independently hash-verified
against the final raw receipt after completion:

| Source | SHA256 |
| --- | --- |
| portfolio-common-month-reference-tests.cjs | 15a3917980416c658fec2ff8bfc8d86a818860a001687e51359da83751fdadfd |
| portfolio-common-month.ts | 315db477f57ba6730958507fcfc46ae4eb73fc5bfcfff4818689aa231f394145 |
| common-month.ts | 79eb3e58bb3989d395e83942682936fb49760a4be43a6f851c356c02a30a5894 |
| portfolio.ts | b87133452f55d4c575c1392a71909f61ea1223d5991012ce4b6112ad4b7c5781 |
| numeric-range.ts | fe7e9f46a18e8b97eecf4feab02d77b425ca0cc812bb4528b18074110f6ec21f |
| index.ts | 23f7fa329e1c731323be4afdb4cc0a63d335eaca00eac2d6bec37e82f7abd477 |
| portfolio-book.ts | 2fdc859e8fbf2b4c3927565c4cdd9b4e2c51c7a87009cd44b4734e746d1f57b5 |

The original allocation engine, numeric-range, index and codec hashes also
match the original RED receipt. `reference-prepared-verification.log` records
the successful preservation/count/source verification, terminal exit0.

Additional commands: `node --check
apps/web/scripts/portfolio-common-month-reference-tests.cjs` from the root,
and `npx --no-install eslint scripts/portfolio-common-month-reference-tests.cjs`
from `apps/web`; both terminal exit0 with no errors or warnings.

No new counterexample was found. The original five cancellation boundaries,
all required-prefix mutations and all overflow/LOC/dust cases remain asserted.
Standing CI wiring and project approval remain with the parent.
