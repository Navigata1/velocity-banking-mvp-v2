# Independent Rate4/Split Coverage Adjudication

Decision: the new fail-closed result is a legitimate coverage correction, not a
proved repayment artifact and not a product regression established by this case.
No production guard or production sum helper was used as the arithmetic oracle.
The earlier reference expected coverage was too permissive for this one trace.

## Exact Fixture

Seed20261021, the unchanged original generator: zero lane consumes85 draws;
through this fixture154 draws, unsigned state1900885999. Canonical book:

```json
{
  "debts": [
    {"id":"rate-4-0","name":"rate-4-0","category":"custom","kind":"amortized","balance":461,"apr":0.03,"minPaymentRule":{"type":"fixed","amount":36.83},"paymentSource":"checking"},
    {"id":"rate-4-1","name":"rate-4-1","category":"custom","kind":"amortized","balance":2055,"apr":0.04,"minPaymentRule":{"type":"percent","percent":0.08,"floor":121.65},"paymentSource":"checking"},
    {"id":"rate-4-2","name":"rate-4-2","category":"custom","kind":"amortized","balance":1545,"apr":0.19,"minPaymentRule":{"type":"fixed","amount":117.35},"paymentSource":"checking","promo":{"introApr":0,"monthsRemaining":2,"postIntroApr":0.36}}
  ],
  "loc":{"limit":50000,"balance":577,"apr":0.29},
  "monthlyIncome":1610,"monthlyExpenses":956,
  "focusMode":"split","extraMonthlyPayment":0,"chunkAmount":20,
  "splitRatioPrimary":0.9,"strategy":"snowball"
}
```

The failing column is Velocity in split mode (a direct ranked policy here).
Monthly household budget654; all observed LOC draws are0. Snowball and Avalanche
remain usable. Selecting Snowball as reference does not repair Velocity coverage.

## Actual Transition And Exact Provenance

| Velocity Field | Month6 End | Month7 | Month8 |
| --- | ---: | ---: | ---: |
| rate-4-0 balance | 197.41594076071374 | 2.842170943040401e-14 | 0 |
| rate-4-0 interest | 0.7042958246688792 | 0.49353985190178434 | 0 |
| rate-4-0 payment | 85.00668493150683 | 197.90948061261548 | 0 |
| rate-4-1 balance | 103.23630320540065 | 0 | 0 |
| rate-4-1 payment | 555.2401643835617 | 103.58042421608532 | 0 |
| rate-4-2 balance/payment | 0 | 0 | 0 |
| LOC balance | 577 | 238.24305551363227 | 0 |
| LOC interest | 13.753150684931507 | 13.753150684931507 | 5.678670090324933 |
| LOC payment | 13.753150684931507 | 352.5100951712992 | 243.9217256039572 |
| LOC draw | 0 | 0 | 0 |
| Cash balance | 1.8118839761882555e-13 | 1.8118839761882555e-13 | 410.07827439604296 |

The test-only oracle decomposes actual finite IEEE754 Numbers into signed
integer mantissas and powers of2 using DataView/BigInt; all residual summation is
exact. Product normalization, summation, coverage and dust guards are not called
to derive these expectations. Separately, the permanent proof scales this
fixture's terms onto the exact2^-54 grid, rejects off-grid inputs and sums BigInt.

For rate-4-0:

- At month7, `month6Balance + month7Interest - month7Payment` is exactly
  `727 * 2^-54`, positive, not exact-zero clearance.
- The recorded month7 balance is `512 * 2^-54 = 2^-45`.
- Independently starting at entered principal461 and summing every posted
  interest minus every payment through month7 leaves exactly `447 * 2^-54`
  (approximately2.481348460037225e-14), also positive. This checks provenance
  through all prior postings, not merely the last rounded balance.
- Month8 records0 interest,0 payment and0 draw for this debt, yet its positive
  stored balance disappears. Its exact local unpaid-removal residual is
  `512 * 2^-54`. No recorded settlement discharges it.

Month8 exact cash rollforward residual is `3 * 2^-48`, and LOC rollforward
residual is `-11 * 2^-50`. These ordinary floating posting discrepancies do not
prove a payment to rate-4-0. Cash availability or another liability's rounding
cannot authorize an unrecorded reserve sweep or transfer. This is not a claim
of cents-level lender harm or a demand for arbitrary-precision product posting.

The residual may have numerical uncertainty, but size alone does not prove it
fictitious. Both its local and entered-posting provenance remain positive, and
the later disappearance has no settlement. Therefore retain H0..7; from H8
onward Velocity is unavailable/cent-tolerance with coverage7 and null delta.
H12/24/60/120/600 must not be labeled post-payoff cash for that column.

## Bounded Test Correction

Archive `reference-followup-before.cjs` preserves the exact original source
SHA256 `15a3917980416c658fec2ff8bfc8d86a818860a001687e51359da83751fdadfd`.
Parent RED log `reference-review-fixes.log` is preserved, SHA256
`2deebd5ce3a9401f23a69cf72cadec1a5ae39cfe4c2e1d675c5b35d81cce4d7a`.

Only expected coverage for source4/split/Velocity gets literal cutoff8, backed
by exact numerator assertions447/727/512 inside the existing month8 accounting
probe. No general residual-size rule, initial-dust guard or copied product
clearance predicate was added. All other expected coverage is unchanged.

The existing H12 comparison probe additionally checks actual H7/H8 outputs for
all three policies: retained positive month7 balance, exact coverage7, cutoff at
month8 with null Velocity money/delta, and independently usable direct columns.
These are two nested boundary queries/six snapshot checks, not new probe rows.
All original primary counters,23247 probes, seed/draws, horizons, tolerances,
57696 zero-APR snapshots and the complete independent direct ledger are retained.

The narrow probe command (run twice, about1-2seconds each, no full suite) was:

```powershell
node .superpowers/sdd/2026-10-21-common-month/reference-followup-probe.cjs
```

Both terminal exit0; raw evidence is `reference-followup-probe.log` and the
expanded cumulative proof is `reference-followup-provenance.log`. Actual product
results are observed after independent arithmetic, not used as their own oracle.

One updated full reference run is authorized and captured separately in
`reference-followup-full.log` / `reference-followup-runtime.log`; its completed
result and final source hashes will be recorded in `reference-followup-results.md`.
This worker made no math implementation, UI, engine, manifest, dependency, CI,
browser, server, Git, remote or cloud changes. No production approval is implied.
