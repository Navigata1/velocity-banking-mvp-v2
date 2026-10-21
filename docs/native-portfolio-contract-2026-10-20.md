# Native Portfolio And Portable Book Contract

## Scope

The Expo Portfolio now uses the same funded multi-debt simulation and payoff-path
model as the web Portfolio. This is a bounded implementation checkpoint, not
production approval, lender-accurate posting, or consolidation of all scenario owners.

The old selected-debt scenario and Portfolio remain separate. A missing book has
explicit Create blank and Copy current scenario actions; neither happens silently.
The editor covers all liabilities, the existing LOC, household budget, allocation
caps, strategy/focus/split/chunk, minimum rules, promotions and optional metadata.
Failed projections do not claim zero interest or a successful payoff. Nonzero
cent-tolerance residuals remain visible and are not described as paid balances.

## Numeric And Document Rules

- Canonical portable documents are version 2 with `aprUnit: decimal`. APR 2 means
  200%, including inside both funded Velocity passes. Legacy v1 rates convert once
  under their original mixed-unit convention; old ambiguous intent is not guessed.
- The strict shared codec rejects unknown versions/units, malformed IDs, duplicate
  IDs, unknown fields, numeric strings and nonfinite/overflowing aggregates. It
  retains supported precise/sub-cent inputs and optional metadata.
- The engine accepts explicit APR units and rejects invalid numeric range before
  publishing nonfinite rows or payoff claims. The legacy default remains supported.
- Web and Expo share the lossless draft parser. Focus/blur, equivalent decimal
  edits and canceled drafts preserve exact stored values. Malformed, ambiguous,
  lossy or changed out-of-bound inputs get feedback without an implicit clamp.
- JavaScript Number is not arbitrary-precision lender posting. Monthly allocation,
  365-day estimates, capitalization and cent tolerance remain disclosed model rules.

## Persistence And Recovery

Native guest/account books use a separate owner-scoped versioned envelope, exact
CAS revisions and an authentic live owner-lock lease. Native encrypted generations
are byte-bounded and published without destroying the previous complete generation.
Missing/corrupt chunks are errors, not empty defaults. A committed session lease
prevents abandoned render/unmounted callbacks from authorizing stale writes.

Portable JSON import freezes source, destination, owner and revision for explicit
review. Identical imports are no-ops. Native private snapshots include scenario and
book under the existing logical allowlist, never physical owner/encryption keys.
Missing source records preserve their destinations; explicit empty books replace.
The durable recovery journal records both before/target fingerprints. Interrupted
recovery accepts each store only at its before or target value, skips already-applied
stores, and commits/sends only after durable replacement of the pair. Legacy queued
request bodies and idempotency keys remain immutable.

Startup recovery failures keep editing/replay gated until explicit retry succeeds.
Queued old assumption writes/reset cannot borrow the revision of a restored value.
Review confirmation checks current committed readiness/status and both fingerprints
before and after asynchronous network work. A retained old-owner review cannot apply.

Web reads the original physical `interestshield-portfolio-v1` without rewriting it
and publishes strict canonical data at `interestshield-portfolio-v2`. An unreadable
primary latches writes off; failed storage does not masquerade as durable memory.
Imports become active only after durable publication. Settings/cloud export maps
canonical bytes through the existing logical key. A book-only Settings import keeps
the saved scenario; mixed full-snapshot semantics remain unchanged. Explicit reset
clears both physical book keys. Web snapshot rollback handles caught write failures,
but is not a crash-atomic multi-store transaction.

## Evidence And Limits

See `ops/mission/evidence/native-portfolio-2026-10-20/` and the source-hashed receipt.
The standing gates include 348 main web regressions, separate 15 APR, 17 codec/range,
22 adapter, three real-Zustand and browser-harness contracts; native 19 draft,
9 encrypted-chunk, 14 owner/CAS, 13 session, 8 model, 7 actual-hook, 16 transfer,
18 paired-snapshot, 16 assumptions/auth and 11 actual-review UI contracts, alongside
the pre-existing identity/outbox/recovery coverage.

Actual exported Chrome fixtures cover create/edit, explicit copy, imported no-ops,
real Web Locks stale-tab rejection and JSON transfer: 12 book cases, two precision
fixtures and 35 existing route/viewport executions. Web has 24 funded cases, six
portability/error cases and precise editors at 280/375/1264/1440. Capture checks reject
blank/transparent inputs, clipped drafts and split currency lines. Retained RED
captures are rejected evidence, not successful visual proof.

The first remote checkpoint stopped at the essential Portfolio section's ancestor
opacity check on both CI events. Its SQL jobs passed, but that head was not verified.
Core Plan/Debts forms no longer depend on scroll-triggered reveal. A live1264px
capture also exposed clipped labels/field scrollbars; LOC uses two columns when
space allows, compact numeric type and a no-horizontal-scroll display assertion.
The new viewport also retains every existing precision/no-op/invalid/reload check.
External scripts in the isolated precision fixture receive recorded empty204
responses, not abort-generated console errors; real console errors still fail.

Fresh Expo web and Android/iOS Hermes exports are bundle proof, not signed-in device,
screen-reader, locale-complete keyboard, cloud backup or cross-device approval.
Main CI must execute the full new lanes on both exact-head events with unchanged
20-minute caps. Hosted preview checks and real isolated SQL must pass separately.

No model, camera, studio, rotation timing, public asset budget, dependency, schema,
cloud binding, DNS or credentials changed in this slice. Remotion's source digest
was regenerated; its scenario inputs/results are unchanged. Five assets are textured
candidates and five remain studies; all-ten art approval is still open. Dashboard
helper scope, shared ownership, common-date wealth, actual lender/calendar/posting,
backend/provider/backup, dependency remediation and final devices/release remain open.

Educational tool. Not financial advice.
