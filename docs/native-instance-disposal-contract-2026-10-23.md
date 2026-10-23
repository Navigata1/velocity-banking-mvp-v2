# Loaded Native Instance Ownership

## Bounded Change

`HeroModelStage.disposeModel` now discovers loaded `THREE.InstancedMesh` identities
and disposes each once after its existing deduplicated shared-resource cleanup.
Runtime-created House batches keep their separate owner and release-before-model
order. The actual component change is three added lines; rendering, material
refinement, framing, animation timing and financial calculations are unchanged.

The implementation was prepared privately, then reviewed and tested independently
by the parent before integration. Removing the new disposal call is rejected by
the lifecycle contract. Existing tests are retained.

## Standing Regression Coverage

- Native instances and regular meshes share geometry, materials, textures and a
  decoded image without double-disposing shared resources.
- Actual component VM paths cover normal teardown, late load, texture failure,
  invalid native bounds, material rejection, House setup rollback, context loss
  followed by teardown and an existing runtime-batch disposal failure.
- Repeated Replay retains native nodes/matrices and the runtime batch, uses one
  load/renderer and does not dispose active resources.
- A removed native disposal call must fail the actual lifecycle assertions.

Run `node apps/web/scripts/hero-resource-tests.cjs` or the standing web `npm test`.
The focused suite registers 23 tests and also executes the preserved immediate
resource/studio/material/lifecycle contracts. Summary lines are not extra tests.

## Limits

Browser, loader and renderer boundaries are simulated in these CPU lifecycle
tests. They do not prove physical VRAM reclamation, a permanent memory leak,
actual device context-loss recovery, or support for an unshipped model.
Arbitrarily throwing resource-disposal callbacks can still interrupt subsequent
cleanup under the existing fail-fast policy; this patch does not generalize it.

## House Art Decision

The separately retained detailed native-leaf prototype was **not adopted**.
One matched canonical INLINE HyperFrames observation produced fourteen original
1920x920 captures at seven poses per arm. Parent and independent reviewer agreed
that the subtle planting difference did not justify 389,264 additional bytes
(about 34%) or 76,336 rather than 45,216 referenced triangles (about 69% more).
Both unchanged byte ceilings failed. All current public assets remain unchanged.
This was exact-seek observation, not an encoded video or a real-time FPS test.

Final photographic quality, interior/glass response, all-angle motion, physical
device performance, instance-aware asset gates and same-generation model/video
provenance remain open. Do not repeat this unchanged rejected foliage direction
or relabel it as photographic approval.
