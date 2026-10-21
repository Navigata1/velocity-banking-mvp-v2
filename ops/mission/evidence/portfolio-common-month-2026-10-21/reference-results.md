# Reference Worker Terminal Receipt

Date:2026-10-21. Runtime:Node v22.22.2. No production approval.

## Final Command

Working directory: `C:/Users/IslandDevCrew/Documents/Interest Shield`.

```powershell
node apps/web/scripts/portfolio-common-month-reference-tests.cjs 2>&1 | Tee-Object -FilePath '.superpowers/sdd/2026-10-21-common-month/reference-final-run.log'
exit $LASTEXITCODE
```

Actual terminal exit:1. Total23119 probes:23114 passed,5 failed.

| Probe Group | Passed | Failed |
| --- | ---: | ---: |
| zero-apr | 19232 | 0 |
| hand-calculated | 8 | 0 |
| engine-row-accounting | 1845 | 0 |
| direct-reference-length | 48 | 0 |
| direct-reference-row | 1212 | 0 |
| rate-snapshots | 240 | 0 |
| required-prefix | 504 | 0 |
| boundaries | 18 | 5 |
| adapter-overflow | 7 | 0 |

The probe count is not the count of individual numeric assertions. One
comparison probe validates three strategy snapshots and multiple fields.

## Reproducibility

- Seed20261021,253 draws, final unsigned state3883181796.
- Zero sources8; zero input variants32; comparisons19232; strategy snapshots57696.
- Hand sources5; comparisons8; strategy snapshots24.
- Rate sources12; input books24; engine paths72; accepted/accounted rows1845.
- Independent direct-reference paths48; reference rows1212.
- Rate comparisons240; strategy snapshots720.
- Prefix source1; corruptions72; requested snapshots504.
- Generic boundary snapshots23; adapter boundary comparisons7/snapshots21.
- Test SHA256: `c7cc3a4473358f7d1c4c7c8c61bc112ae7f15b00f9fe8b4db0d93c0eca339521`.
- The raw final log contains SHA256 identities for all six loaded product
  modules. They matched the independently read on-disk source hashes during
  verification. The unchanged allocation engine hash is
  `b87133452f55d4c575c1392a71909f61ea1223d5991012ce4b6112ad4b7c5781`.

## Genuine Reds Retained

All5 failures concern representable residuals lost by aggregation before
cancellation, not a new allocation policy. The simplest actual input has
month0 cash`1e16`, listed balances`{large:1e16,small:1}` and LOC0. Actual wealth0
must be-1. A valid month1 trace paying only the large debt is also wrongly
rejected as `inconsistent-trace`. Exact JSON and the other three variants are
in `reference-findings.md`; all corresponding assertions remain in the script.

The parent owns core fixes. No source implementation, existing tests, UI,
manifest, schema, persistence, assets, CI, Git, cloud, browsers or servers were
changed by this worker. Existing tests were not weakened. Standing project
gates and web/native wiring remain with the parent.

## Additional Commands

```powershell
node --check apps/web/scripts/portfolio-common-month-reference-tests.cjs
```

Final terminal exit0, no output.

From `C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web`:

```powershell
npx --no-install eslint scripts/portfolio-common-month-reference-tests.cjs
```

Final terminal exit0, no errors or warnings. An earlier lint-only loader
variable-name violation was fixed by renaming the local test-module variable;
the mathematical test assertions were unchanged.
