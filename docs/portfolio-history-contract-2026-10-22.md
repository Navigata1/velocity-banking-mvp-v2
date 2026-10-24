# Portfolio History And Payoff Authority

Portfolio's entry effect calculates a baseline only when persistence is ready
and the existing store has no `lastResult`. It reads the latest store inside
the effect, so repeated initialization cannot overwrite a just-created result.
All existing synchronous edit/import actions continue to recompute normally.

This preserves an already-captured in-memory edit comparison across Portfolio,
the explicit Portfolio Simulator, and its Dashboard. It does not persist an
audit history, invent a prior projection on a fresh session, or change payoff
formulas. Reloading starts a fresh comparison baseline from saved inputs.
Unavailable/error storage still pauses projections and uses existing recovery.

The existing accepted-payoff adapter now lives in the shared web engine layer;
the Simulator's old exports remain compatible. Its algorithm is unchanged.
Canonical store summaries use the selected policy's accepted payoff state in
addition to raw engine success. This can withhold success but cannot override
a failed numerical projection. The raw numerical result remains unchanged.
Payoff Order requires both authorities before showing any paid-off dates.

## Regression Evidence

The actual exact785 browser showed `Updated`, `+$50`, and cash flow125->175
after a fictional income150->200 edit with expense25. Navigating Portfolio ->
Simulator -> Portfolio replaced that comparison with `Stable`/`No material
change`, while cash flow175 remained correct. Raw UI text/AX/JPEG are retained.
The effect contract independently failed because a current result was
recomputed. The corrected18-case CLI matrix reproduces this failure at280,
375 and1440, with all18 contexts closed and the other15 cases passing.
The first CLI attempt used a full navigation that reset its baseline; that
test-setup failure is preserved but is not counted as valid bug evidence.

The expanded existing matrix checks income and expense comparison values,
exact comparison text across return navigation, saved inputs and legacy bytes,
and baseline initialization after a full reload. All original workflow,
geometry, contrast, negative-control, asset and storage checks remain required.

Independent review reproduced two further contradictions: a10.005 zero-APR
debt with a10 budget left .005 unpaid but still received successful history
wording and a Month1 Payoff Order date. New regressions failed before the
authority change; the built18-case negative run independently retained both
incorrect claims at all three widths. The strengthened test also requires
genuine settlement to restore a dated order, then withdraws success when the
budget returns to the residual case. Initial tiny balances and earlier
tolerance erasure are covered by canonical store tests across all3 policies.

Local verification passed27 serialized standing stages plus3 actual audits,
351 regressions,21 model and6 wiring contracts,23247 reference probes and all
156 browser workflow-layout cases. Media includes222 checks and27 fresh stills;
Expo-web accessibility has82 workflow checks plus1 focus-navigation assertion,
not physical-device proof. Web/Worker runtime audits are zero; native critical
is zero with36 noncritical findings still open. New remote verification remains
required before publishing a shipping receipt.

## Remaining Scope

The correction aligns displayed history/order availability with the current
accepted whole-plan model. It does not change or certify lender settlement
rules, rounding/posting calendars, fees, credit availability, or all-history
semantics. No schema/source-family migration, persistent history, numerical
package/formula/material/asset/dependency/workflow change, merge or release
approval. The canonical store's derived summary availability is intentionally
changed; actions and durable input fields are not.
Full local, hosted and exact-head remote verification are required before
publishing this checkpoint's receipt.
