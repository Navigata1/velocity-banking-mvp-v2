# Legacy Web Financial Truth

## Intent And Approval

Continue the approved truth-first restoration without another visual redesign or
financial-engine rewrite. The user explicitly authorizes autonomous recommended
implementation/testing/pushes and no repeated stage approvals. This design records
those decisions; full scenario/lender/device/photoreal scope remains unchanged.

Actual isolated IAB RED at baseline17457cc: invalidincomeabc saves0, APR200 becomes
100%, failed Cockpit projection displays0months and its600 emergency toggle makes
that2months without changing the expense ledger. These are rendering/input defects,
not evidence that the existing solver should be recomputed or replaced.

## Editor Boundary

Reuse PortfolioEditableNumber's real validated draft/session implementation.
Add an explicit percentPolicy decimal|legacy, defaultdecimal. Legacy facade
EditableNumber selectslegacy; canonical Portfolio behavior staysdecimal. Public
labels, formats, suffixes, min/max, sizes and callbacks remain available.

The shared existing input-draft policy supplies exact finite decimal handling,
legacy6.5->6.5%, oldraw2->2%, new200->raw200 and semantic-equivalent no-op
preservation. Do not guess that oldraw2 meant200%. Invalid/empty/negative/ambiguous
drafts show feedback and never call onChange. Escape/unmount/stale edits cannot
commit; successful Enter commits at mostonce and returns keyboard focus. Explicit
bounds reject instead of clamp; no invented universal100% APR ceiling. Preserve
existing oversized values and precision on no-op, unrelated edit and navigation.

## Cockpit Boundary

Add a pure presentation adapter for actual baseline/Velocity projection facts.
Unavailable, nonfinite, nonzerozero-month and cleared states remain distinct;
never display a failed0months as success. Signed baseline-minus-Velocity interest
difference is visible only when both compatible projections are available. No
positive-only clipped savings claim and no fakezero on failure.

Independent review found that the old store baseline excludes the LOC and spends
only the target minimum. Cockpit must instead call the existing runSimulation
equal-budget, selected-debt-plus-LOC comparison once for both facts. This is an
entry-point correction, not a new solver. The fictional default is14months for
Velocity versus7 for direct repayment and-$294.47 interest difference, not the
old apparent+$2056.87. State the shared budget/scope and meaning of a negative
difference. Exactlyzero target and LOC balances establish cleared independently
of future LOC setup or zero cash flow; nonzero dust must never inherit that state.

Emergency remains an educational600 drill, not a computed expense scenario. While
active, suppress revised ETA/delta, disclose that the expense is not modeled and
preserve saved inputs. Alternate routing toggles similarly mark their projections
unmodeled; do not present unchanged numbers as a newly calculated routing outcome.
Actual dated expense/routing/lender modeling remains a later engine contract, not
something completed by this presentation fix.

Keep the cockpit artwork/gauges. Replace invented progress from an unknown50000
starting balance with a plainly labeled fixed balance scale and actual balance.
Daily burn uses the existing precise selected-debt-plus-LOC Dashboard estimate,
with its scope/assumptions; do not sum synthetic domain defaults. Controls/values
must fit280/375/1440 and remain keyboard-accessible. No new persisted fields.

## Proof And Non-Goals

Two separately reviewable source commits: editor safety, then Cockpit truth.
Real component SSR replaces obsolete editor-source-shape assertions; standing
browser tests exercise writes, focus and navigation. Preserve348 original test
intent/count, all126 existing workflows, native82, media14527, SQL63 twice/event,
20minute caps and every original timing/pixel oracle. New cases add coverage,
not waived old numerical checks. Fresh independent review and final exact-head
CI/READY/hosted/actualIAB proof precede the draft receipt.

No algorithm, schema, asset, dependency, backend, account, DNS, access or production
mutation. No report-file browser workaround or DesktopHTML republishing. Entire
R2/R3 and production objective remain open; this fixes false input/output claims.
