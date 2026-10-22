# Projected LOC Capacity

The Velocity projection must not report a successful payoff after a modeled
month closes above the user's entered LOC limit. This is a conservative planning
guard, not verification of a lender agreement. Interest posting, over-limit
handling and borrowing availability depend on the actual agreement.

## Accepted Projection

- Initial over-limit, unavailable setup and no-capacity checks remain distinct.
- Equality with the entered limit is permitted; a closing balance above it is not.
- A breach returns `loc-projection-overlimit` and no accepted payoff date or savings.
- The attempted month is not an accepted chart, comparison or payoff-order row.
- All debt rows in that month are atomic, including siblings processed first.
- `locLimitBreach` preserves the finite attempted month, balance and entered limit
  separately from accepted trace rows. Balances are not clamped or forgiven.
- Interest totals on failed results represent accepted prefixes only, not a
  forecast of total future cost. UI payoff totals remain unavailable.
- Failed legacy multi-debt `freedomDate` is `null`; savings and saved months are zero.
- Healthy plans retain their existing monthly arithmetic and APR interpretation.
- Persisted inputs, schema and scenario ownership do not change.

## Coverage And Limits

The shared payoff engine, canonical Portfolio engine, legacy multi-debt adapter,
web Dashboard/Simulator/Vault and shared native presenters carry the same reason.
Browser regressions exercise valid-plan restoration, renewed failure, reload and
preservation of the other scenario's saved bytes.

The legacy Simulator uses one comparison column on narrow screens and wraps its
domain choices below 400 pixels. These layout changes keep review labels readable;
they do not change strategy ranking or card calculations.

This does not enforce intraday credit capacity, draw periods, fees, lender minimums,
calendar posting or agreement-specific rounding. Those R3 production gates remain
open. Nor does it establish that Velocity is better than direct repayment.

The media scenario file is regenerated solely because it pins the shared engine
source digest. Its financial illustration inputs and outputs remain unchanged.
