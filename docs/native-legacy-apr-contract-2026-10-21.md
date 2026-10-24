# Native Single-Scenario APR Compatibility

## Verdict

The single-scenario Expo editor now uses the same legacy APR interpretation as
its dashboard, simulator and explicit Portfolio copy. This is a bounded input
fix, not a new payoff algorithm, data migration or production approval.

## Reproduced Failure

The old editor used canonical decimal formatting against mixed-unit legacy
records. Stored `6.5` meant 6.5% to the engine but displayed 650%. Entering 200%
stored `2`, which the legacy engine interpreted as 2% while the field displayed
200%. Actual IAB testing of the original export reduced the default daily burn
from $4/day to $2/day after that entry. Those are synthetic demonstration inputs,
not a lender statement or personal financial advice.

## Unit Boundary

- `legacy-percent` is selected only by the single-scenario percentage control.
- Legacy values at or below 1 are fractions; values above 1 are percentages.
- Changed entries up to 100% are stored as fractions; entries above 100% are
  stored as percentages. An entered 200% therefore stores `200` in that record.
- Exact and equivalent no-ops preserve the original IEEE value and complete
  storage envelope. An old raw `2` stays 2%; its historical intent is unknowable.
- Explicit Portfolio v2 documents keep `aprUnit: "decimal"`. Their raw `2`
  still means 200%. Copy normalizes the legacy rate once, without source writes.
- Invalid, overflowing, underflowing or unsupported-precision drafts retain the
  prior value. Bounds compare modeled percentages, not mixed raw scalar order.
- Ordinary money, canonical percent and whole-number policies are unchanged.

No payoff allocation, accrual, normalization, storage schema, owner isolation,
asset, dependency or backend change is included.

## Verification

Fifteen focused contracts include actual consumer wiring, mixed units, no-ops,
ambiguous historical records, bounds and dashboard/Portfolio interest parity.
The original nineteen draft contracts remain. Six new rendered workflows add
preservation and 200%-entry/copy cases at 280, 375 and 1440 pixels to the original
seventy native browser executions. They check exact envelope/revision/write
counts, invalid and abandoned drafts, reload/navigation, canonical copy and
source preservation, with isolated synthetic storage only.

Parent IAB testing of the rebuilt export shows 200% and $102/day for the default
synthetic balances, plus visible exported Portfolio APR `2` and editor 200%.
Both demonstration APRs were restored through the UI; no console warnings or
errors were captured. The first full-page screenshot was blank and is retained
only as a diagnostic; valid viewport captures provide the visual evidence.

See `ops/mission/evidence/native-legacy-apr-2026-10-21/local-preflight.json` for
source pins, local gate results and limitations. Both complete exact-head CI
events must pass after pushing. Physical-device keyboards, signed-in cloud
flows, lender posting/calendar fidelity and production release remain open.
