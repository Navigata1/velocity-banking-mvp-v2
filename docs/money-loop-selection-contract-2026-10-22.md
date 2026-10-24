# Money Loop selection settlement

## Scope

This bounded correction concerns the existing five-item Money Loop, not the ten
domain hero assets or their photoreal approval. It does not resolve or establish
the cause of the earlier CI screenshot deadline failure.

## Reproduction

On the dfdfe24 production build, select Next from Income, then Previous before
the 450 ms selection transition finishes. Income incorrectly reports settled
because its earlier completion is stored by artifact ID alone. A real IAB
observation reproduced the premature label, and the desktop/full and
mobile/efficient automated workflows both failed the same assertion. Settled
return and current-item no-op positive controls passed on both layouts.

Private evidence: `.superpowers/sdd/2026-10-22-selection-settlement/`.
`browser-red.log` and `browser-red/verification.json` preserve those six cases.
`manual-rapid-red.json` and its genuine JPEG document the IAB observation.
This is evidence of premature DOM settlement, not direct GPU paint timing.

## Contract

- A selection is identified by artifact ID plus a transient integer revision.
- A real change advances the revision and keeps its original start timestamp.
- Selecting the current item is an exact state and DOM-token no-op.
- Functional owner updates retain both changes in a batched away-and-back.
- Scene transition setup and completion notification use the same identity.
- The committed active identity rejects stale completion callbacks.
- First-frame readiness cannot settle a selection changed before that frame.
- A genuinely new return instance restarts its corresponding DOM token.
- Empty scenes retain their defensive no-active-artifact path.

The revision is ephemeral. It is not persisted, migrated or sent to a backend.

## Standing verification

`npm --prefix apps/web test` includes seven source-backed selection test groups
in the existing PNG, lifecycle and timing helper gate. The tests evaluate actual
owner handlers, completion callbacks, JSX settlement/key expressions and the
first-frame callback, plus the real pure selection functions.

`npm --prefix apps/web run test:3d:built` retains the original eighteen normal
actions, negative controls, reduced-motion check and pixel proof, then runs six
additional actual browser workflows: rapid return, settled return and current
no-op at desktop/full and mobile/efficient modes. The standalone entry point is
`node apps/web/scripts/smoke-three-selection.cjs`.

Those workflows preserve exact raw bytes of all three saved source families and
the visible financial vitals. They require nonblank genuine WebGL2, an early
transitioning state, completion and decoded on-screen PNG within 700 ms, a stable
second capture within 300 ms, preserved explicit-control focus and balanced
context cleanup. The 450 ms Three motion and 650 ms DOM motion are unchanged.

Capable-device hints are test fixtures. Software-WebGL browser proof does not
constitute physical-device, all-GPU, photoreal, lifecycle-clock or production
approval. Original on-screen screenshot functions, thresholds, motion curves,
all asset payloads and every financial calculation remain unchanged.

## Release policy

Candidate source must pass local gates, both complete exact-head CI events and
the known automatic preview's hosted verification before being described as a
verified preview. PR #256 remains draft; no merge or production promotion is
authorized by this correction. The mission state is a labeled pre-push snapshot;
the immutable PR receipt carries final remote proof until the next substantive
change folds it into the report.
