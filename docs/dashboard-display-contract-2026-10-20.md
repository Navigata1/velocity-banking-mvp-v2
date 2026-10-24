# Dashboard Estimate And Editor Contract

This bounded R2 slice improves the existing web dashboard, not the financial
engine or scenario ownership. It preserves four vitals and the calm asset-centered
layout. Shared calculations, native snapshots, scenarios/stores, asset bytes,
dependencies, backend/schema, DNS and production configuration are unchanged.

## Daily Interest

Daily interest remains the unrounded selected target plus current LOC estimate.
Other debts are not silently included. The House example was displayed as $51/day
while its components read $51/day plus $1/day. Independent whole-dollar rounding,
not an incorrect underlying sum, caused that contradiction.

The interest vital now says `Est. $51.50/day`, with separate debt $50.75/day and
LOC $0.75/day components. Other currency formatting is unchanged. Positive amounts
below one cent say `<$0.01`, not zero; an actual zero says `$0.00`. Components are
described independently, not as a false exact displayed addition. Desktop
assumptions disclose independent rounding; mobile retains the component caption
for assistive technology and shows the estimate prefix visibly.

Cent precision alone does not guarantee displayed components add exactly to the
displayed total. For example, $1.236 and $0.236 become $1.24 and $0.24, while their
true $1.472 sum becomes $1.47. No hidden rounding residual is assigned to a debt.
Numeric fields, tone thresholds and payoff calculations remain unrounded.

An unsupported numeric overflow now renders `Review inputs` rather than zero or
infinity. Both product overflow and sum overflow of finite components are tested.
This does not introduce a new numeric import schema or lender posting policy.

## Imported Currency Values

Visual QA also found the dashboard editor's default 10-million maximum clipping
larger imported values. A real no-op mortgage edit changed an isolated fixture
from 100 million to 10 million. The seven dashboard currency fields now use the
existing Portfolio pattern: maximum is the larger of the default and the current
value. This preserves current imported values through display and no-op edits
without globally relaxing the shared editor or changing stored data on migration.

Income, expenses, chunk, target balance, target minimum, LOC balance and LOC limit
are covered by actual browser no-op edits. A partial persisted fixture gains
existing default fields on its first edit, so preservation compares normalized
snapshots and separately checks every explicitly seeded value. That harness
normalization issue was not a new product data-loss bug.

## Required Evidence

Run full web regressions and references, production build/types/lint, seven routes,
the dedicated `npm --prefix apps/web run smoke:dashboard:built` gate and standing
comparison/hero/media/mobile gates. The dashboard browser gate covers six cases
at 1440px and 375px: exact daily text, actual amount bounds, no overflow/overlay/
errors, desktop disclosure, income edit/restore and navigation, seven oversized
currency no-ops and preserved legacy timing/unrelated fields. CI retains failure
artifacts. These cases are not complete accessibility or native-device approval.

Before a checkpoint is called verified, require both exact-head full CI pipelines,
isolated SQL, exact Vercel and hosted routes/dashboard/comparison proof. Keep the
draft and no-production-promotion policy. Other dashboard helper scope, native
aggregate Portfolio, safe scenario consolidation, common-date wealth, actual
lender/calendar/posting/rounding/capacity, backend/provider/recovery, remaining
asset refinements and final-device/release gates remain open.
