# Native Coaching Follows Projection Availability

## Boundary

An unavailable Velocity projection must not produce an affirmative new-chunk
suggestion. The existing simulation is authoritative: this correction changes
coaching, not payoff allocations, interest accrual or saved input interpretation.

The old native dashboard could show `Review inputs` for Debt-Free ETA while Next
Move and Coach Note said `Send $1,000 to principal`. A synthetic default scenario
with debt APR 200% reproduces this in actual IAB UI and shared functions. The
simulation reports `payment-below-interest`; the coaching builder ignored it.
Cockpit and Vault also reported readiness because they consume that warning.

The shared dashboard builder now checks the existing Velocity result before
ordinary pause/chunk guidance. A failed projection yields `Review payoff inputs`
and a reason plus an instruction to review assumptions before modeling a chunk.
The same snapshot reaches Simulator's Current Plan, Cockpit, Learn and Vault.

Existing nonpositive cash-flow, missing LOC terms, over-limit, no-capacity and
above-80% utilization priorities remain ahead of this fallback. Exactly 80% is
not above 80%. A valid clipped final payment or zero-surplus scheduled-payment
plan still gets `Pause new chunks`, without an invalid-payoff warning. Failed
minimum funding intentionally gets review instead of that ordinary pause text.

## Evidence

Sixteen real-function contracts cover failed interest/minimum/horizon paths,
safety priorities, healthy defaults, valid final/zero-surplus paths, downstream
coaching and exact source-input preservation. Seven genuine failing assertions
and nine positives precede the fix. The original nineteen draft contracts and
fifteen APR compatibility contracts remain unchanged.

Six new rendered workflows cover failed projection with navigation/reload and
recovery, plus valid final-payment guidance, at 280, 375 and 1440 pixels. They
are additional to the original seventy-six native cases, not replacements.
The baseline export has three expected failed-projection cases and three healthy
positives. Parent IAB baseline screenshot confirms the contradictory instruction;
an initial uppercase-heading lookup failure is only a capture diagnostic.

Only `buildMobileDashboardSnapshot` changes among 111 index declarations. The
other 110 retain their source, including numerical calculations and allocation.
Remotion's generated source digest/version refresh with the changed source;
every fixture input/result remains equal. Assets, dependencies, schemas, codecs
and backend configuration are unchanged. The current checkpoint's compact
preflight and final exact-head CI receipt supply the final gate results.

This is not lender/calendar/posting fidelity, physical-device or locale-complete
keyboard approval. Shared scenario ownership, final photoreal art, backend,
security and production release gates remain separate and open.
