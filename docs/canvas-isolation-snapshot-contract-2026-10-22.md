# Isolated Canvas Snapshot Contract

## Scope

One test-helper change, not an application, asset or financial-engine rewrite.
Hide overlapping overlays and read the post-mutation canvas/viewport/scroll in
one strict locator evaluation. Validate the same finite, positive, fully visible
fractional CSS box. Preserve supplied clip and box identity without replacing
them with another snapshot. PNG capture remains lossless at CSS scale.

Install the restoration stash before the first style mutation and perform
isolation inside `try/finally`. Partial isolation failures now restore saved
properties and priorities when cleanup succeeds. Locator acquisition uses the
remaining absolute budget. No deadline, retry or pixel assertion is relaxed.

## Reason

Parent `8633824` has mixed first-attempt CI: push39878666772 failed only the
primary Money Loop screenshot check; PR39878674423 fully passed. Both SQL and
hero jobs passed, verifying the preceding cold media preparation correction.
The failed screenshot began with33ms remaining in the700ms candidate budget;
the separate clip roundtrip took7.259ms in that sample. Combining calls removes
that boundary, but does not prove enough margin or diagnose browser scheduling.

The parent's7653-artifact FAILED checkpoint and PRcomment6354821267 remain
immutable. Last fully verified release checkpoint remains da04699/6351915021
until a new exact head satisfies all required gates. No unchanged CI rerun.

## Bounded Evidence

- Real-callback RED: one-roundtrip and partial-setter cleanup assertions fail on
  the parent; seven other overlay groups pass. Candidate standing helper suites
  pass10/5/9 groups plus the existing timing/revision/PNG/lifecycle checks.
- Independent CPU review:15 probes,33 invalid snapshots, five killed mutants,
  exact input pins; no actionable regression within that scope.
- Eight desktop/mobile fractional, bordered, scaled and rotated WebGL2 fixture
  pairs collected in both orders: exact coordinates and equal observed decoded
  pixel sets. Forty negative fixture cases retain rejection and style recovery.
- 128 direct-resolver and128 combined-capture actual boundary cases have zero
  old/new acceptance mismatches. These are finite fixtures, not universal parity.
-450ms motion,700ms candidate restore/decode and300ms confirmation requirements
  remain unchanged. One-ms-late controlled cases still fail. Removing a browser
  roundtrip is not a universal performance or CI reliability guarantee.

The second crossover collection and direct boundary collection could overlap;
no serialized timing conclusion is drawn from those collections. Full standing
gates run separately and serially on frozen source. Source and private evidence
are recorded by the current mission preflight and eventual exact-head receipt.

## Remaining Limits

Cleanup RPC/setter failures, concurrent captures, page death, stage replacement
and movement between snapshot and screenshot are not newly guaranteed. The
helper's completedAt is screenshot completion, not cleanup completion; selection
callers still check after restoration and decode. No math, source asset, material,
camera, turntable, dependency, workflow or cloud configuration changes here.
Final all-ten photoreal artwork, lender reconciliation, managed backend/recovery,
physical-native/accessibility and production approval remain open.
