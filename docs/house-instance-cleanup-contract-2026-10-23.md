# House Instance Cleanup Error Contract

## Scope

HDEP-001 identifies a small failure-observability defect in House instance
cleanup. Resource restoration is attempted, but truthiness/nullish tracking
can swallow a falsy thrown value or replace it with a later error.

This fix covers `configureHouseInstances` in the typed web helper and its two
generated HyperFrames/turntable ESM copies. It does not integrate self-shadows.
Frozen private shadow and combined-owner helpers remain unfixed and unadopted;
their broader HDEP-001 finding must not be called closed.

## Required Behavior

- Attempt every visibility restoration, owned-batch removal and owned-batch
  disposal even when an earlier operation throws.
- Preserve the first thrown value verbatim, including `0`, `false`, an empty
  string, `null` and `undefined`. Failure presence and failure payload are
  separate facts.
- Release root ownership, prevent a second disposal, and allow a fresh owner
  after cleanup. Never dispose borrowed geometry, materials or textures.
- During failed setup, retain the original setup throw even if rollback also
  throws. Keep the existing fresh/static House-only eligibility contract.

The implementation uses an explicit failure flag, not a truthy sentinel.
Cleanup closes once and rethrows the first recorded payload after all attempts.
This preserves error reporting; it cannot guarantee a hostile callback has
allowed every requested state mutation or native resource operation to succeed.

## Regression Evidence

Five payloads cross two failing operations (removal and disposal) with a later
error, plus five setup/rollback cases. Real Three event callbacks exercise the
actual helper. The tests separately check cleanup attempts, restored hierarchy,
visibility, borrowed-resource ownership, error presence/identity, idempotence
and a new owner. Expectations do not derive from helper internals.

Against unchanged489 source, the standing suite reports23pass/10intended
AssertionError failures; the prior18 tests and five setup cases already pass.
The focused fix reports33pass/0fail. A separately constructed fixture reports
15pass/0fail after its earlier5pass/10fail reproduction.

Six AST-targeted controls remove truth-independent throwing, first-error
tracking, cleanup continuation, owner release or setup precedence. Each must
fail its specifically selected real behavior assertion, not import or startup.

## Release Limits

No model/poster, material, light, camera, timeline, calculation, dependency,
backend or dashboard design changes are included. This CPU contract is not
rendering, physical performance, all-ten photoreal or production approval.
Independent review, complete candidate gates and exact-head hosted verification
remain separate requirements before calling the new checkpoint verified.
