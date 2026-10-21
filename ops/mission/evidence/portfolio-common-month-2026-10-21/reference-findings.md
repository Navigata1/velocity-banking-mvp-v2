# Independent Reference Findings

Scope: test worker only. No implementation, UI, manifest, persistence, Git,
cloud, browser or server changes. This is not production approval.

## Confirmed Counterexample: Representable Residual Lost In Large Cancellation

The following actual `snapshotAtMonth` input was probed with the existing
Node TypeScript VM loader on 2026-10-21:

```json
{
  "horizonMonths": 0,
  "monthlyBudget": 0,
  "initial": {
    "balances": { "large": 10000000000000000, "small": 1 },
    "locBalance": 0,
    "cashBalance": 10000000000000000
  },
  "projection": { "rows": [], "payoffPossible": false, "payoffMonth": 0 }
}
```

Observed: `status: initial`, both original IDs retained, `debtBalance: 1e16`,
`netModeledWealth: 0`. Expected net wealth: `-1`. All individual inputs and the
expected residual are exactly representable Numbers; the independent test uses
BigInt only to establish the signed integer result. This is not a request for
arbitrary-precision lender posting or an allocation-engine rewrite.

The first complete run also confirmed order-independent loss for
`{small: 1, large: 1e16}`, loss when the small liability is separate LOC1, and
wealth2 instead of3 for cash`1e16+8`, debts`{large:1e16,small:3}`, LOC2.

## Confirmed Counterexample: Valid Required Row Rejected After Cancellation

```json
{
  "horizonMonths": 1,
  "monthlyBudget": 10000000000000000,
  "initial": {
    "balances": { "large": 10000000000000000, "small": 1 },
    "locBalance": 0,
    "cashBalance": 0
  },
  "projection": {
    "payoffPossible": false,
    "payoffMonth": 1,
    "rows": [{
      "month": 1,
      "balances": { "large": 0, "small": 1 },
      "locBalance": 0,
      "cashBalance": 0,
      "interest": 0
    }]
  }
}
```

Observed independently in an actual reducer invocation: `unavailable`,
`reason: inconsistent-trace`, `coveredThroughMonth: 0`. Expected: usable month1,
wealth`-1`. Paying exactly the large liability leaves the explicitly listed1
untouched; no allocation, borrowing or extrapolation assumption is required.

The test retains genuine failing assertions on the actual reducer. The parent
owns any core fix. Final command: `node
apps/web/scripts/portfolio-common-month-reference-tests.cjs`, exit1,23114 passed
and5 failed probes. The only failures are the four initial-inventory examples
and the accepted-row example above. All zero-APR, hand-calculated, independent
row-accounting/direct-reference, required-prefix and adapter-overflow probes
passed. See `reference-final-run.log` and `reference-results.md` for counts and
exact loaded-source identities. No implementation was modified by this worker.
