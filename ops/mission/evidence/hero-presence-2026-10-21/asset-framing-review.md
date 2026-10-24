# Independent Asset Framing Review

2026-10-21. MissionControlTier2 TDD/verification sidecar. Writes are confined to this review and `apps/media/scripts/hero-framing-assets.test.mjs`. No product code, gate, manifest, mission state, asset, Git, network, dependency installation, build, browser, GPU, or server operations. Supplied baseline `c9d3acc` was not Git-verified here.

## Current Verdict

**FINAL CLOSED: math/measurement review only. No actionable defect found at the final raw-byte pins below.** Fresh independent clean rerun after the morph Array.isArray/direct-finite fixes: 30/30 GREEN, including 90 actual-asset/aspect combinations and 540 continuous-yaw worst-plane projections. All 21 deliberate in-memory mutants were independently rerun against the final sources and failed behavior assertions. Initial geometry RED is retained below. Presentation, consumer/HF/prepare integration and video-gate review belong to the separate integration reviewer; parent owns the serial gates. No visual, photoreal, broad-gate, CI, or shipping approval is given.

## Final Closure

FINAL CLOSED applies exclusively to `hero-geometry-bounds.ts`, `turntable.ts`, the owned asset framing test, and the reviewed parent math test at the four final pins in Literal Byte Snapshot. No product files were edited by this sidecar. The asset test remains 113 lines with the real HF content aspect `1920/920`; no further test changes were needed at this resume checkpoint.

Reviewed the final `.some(values => !Array.isArray(values) || values.length > 0)` guard and direct X/Y/Z Number.isFinite checks. The guard rejects unsupported nonempty morph arrays and fails closed for malformed non-array values; direct finite checks retain transformed-coordinate rejection without a per-vertex temporary array. This sidecar does not claim a fresh whole-project TypeScript build or integration typecheck.

Latest actual clean command and raw summary, after all final-source mutation checks:

```text
node --test apps/media/scripts/hero-framing.test.mjs apps/media/scripts/hero-framing-assets.test.mjs
1..30
# tests 30
# suites 0
# pass 30
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 10126.0125
exit_code: 0
ALL 14 RAW PINS STABLE BEFORE/AFTER
```

All 21 mutations listed below were rerun on the frozen sources with the same Pass / Fail / Skip counts. The morph mutation targeted the updated Array.isArray expression, and the nonfinite mutation targeted the direct three-coordinate guard. Every mutant child exited 1 with named behavioral assertions and empty stderr. Current actual-personal omission again failed `transformed minimum Y` (266.2625 ms); current actual-car half-distance again failed `full-yaw plane at aspect 0.2: -0.7816065417297515` (779.0175 ms). Raw SHA-256/byte-size snapshots of all four reviewed files and ten unchanged assets matched before mutations, after mutations, and after the clean run. Earlier GREEN timings and mutation excerpts below remain historical evidence, not substitutes for this latest run.

## Preserved RED Evidence

Command, from repository root:

```text
node --test apps/media/scripts/hero-framing-assets.test.mjs
```

Observed exit code 1, wall time 1.286 seconds, TAP duration 1074.5824 ms. All 18 test failures were the intended API assertion, not setup exceptions. Each actual-GLB test independently passed its SHA-256 pin, decoded the GLB through existing NodeIO/ALL_EXTENSIONS/MeshoptDecoder, and constructed a texture-free Three graph before reaching the assertion. The helper was confirmed absent before the test was written; absent source loads empty exports instead of raising ENOENT.

Representative verbatim failure and complete observed summary:

```text
required API: measureHeroRotationBounds(root)
+ actual - expected
+ 'undefined'
- 'function'
code: 'ERR_ASSERTION'
expected: 'function'
actual: 'undefined'
operator: 'strictEqual'
1..18
# tests 18
# suites 0
# pass 0
# fail 18
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1074.5824
```

Failing cases: unreferenced far vertex/stale geometry box; ancestor/node TRS with uncached matrices; every instance TRS under rotated nonuniform parent; empty, NaN, Infinity, skin, morph; and the actual pinned `car`, `house`, `land`, `creditCard`, `studentLoan`, `medical`, `personal`, `recreation`, `custom`, `vault` GLBs. The first run therefore established missing-API RED for all behavior tests, not yet a refutation of defective implemented geometry math.

## Independent Oracle And Refutations

- Synthetic expectations are hand-derived world `(rho,Y)` pairs. Including the unindexed `(1000,1000,1000)` vertex, trusting its bounding box, ignoring source TRS, ignoring world ancestors, measuring around a fitted center, or dropping instance TRS/nonuniform ancestry changes measured supports and must fail.
- Unsupported static inputs must throw: empty geometry, referenced NaN/Infinity positions, SkinnedMesh, and position morph targets. These exercise real Three objects, not mocked behavior.
- All ten GLB SHA-256 pins are literal copies of the survey's observed pins and were verified live by the RED run. No assets or metadata were rewritten. Expectations use decoded referenced POSITION elements, NodeIO world matrices, and each EXT_mesh_gpu_instancing TRS. Three separately composes local node matrices in a real graph passed to the actual helper. Instance matrices round through Float32, matching Three storage. No images/material textures are loaded.
- Compare minimum/maximum Y and 64 radial/height support directions against independent decoded data. This checks radius/height correlation, not only independent maximum radius and height. It intentionally does not constrain duplicate-index multiplicity or profile order.
- All ten assets exercise real `heroFrameDistance(bounds,aspect)` at nine aspects: 0.2, 0.25, 9/16, 1, 1.3, 725.333333/420, 16/9, 1920/920, 3. A real Three PerspectiveCamera uses literal FOV 32, direction (3.3,1.35,4.8), and near/far 0.1/50. Its six extracted frustum planes yield the exact minimum signed distance for each vertex's complete yaw circle; each worst-plane witness is independently projected through Three. This is CPU-only continuous-yaw containment, not finite-yaw screenshots or product support equations copied into expectations.
- The new 1920/920 aspect represents the parent's planned 920px art content viewport within the unchanged 1920x1080 composition: top-origin y=50..970, WebGL `setViewport(0,110,1920,920)`. The test checks that content aspect only; it does not certify actual viewport placement, credit/progress clearance, or composition pixels.

## Independent GREEN And Code Review

After parent implementation and adding the content aspect, independently executed:

```text
node --test apps/media/scripts/hero-framing.test.mjs apps/media/scripts/hero-framing-assets.test.mjs
1..30
# tests 30
# suites 0
# pass 30
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 10407.6866
exit_code: 0
```

Actual installed Three package version read: 0.185.1. Test file remains 113 lines. Reviewed the complete current 46-line measurement helper and 52-line math module, not just test results. The helper updates ancestors and descendants, deduplicates referenced indices per shared BufferGeometry, retains full double-precision radial/height pairs, applies `mesh.matrixWorld * instanceMatrix` for every instance, and rejects static-incompatible/nonfinite/empty geometry. Indices, not bounding boxes or metadata, choose the measured vertices. Math retains per-pair radius/height correlation, includes perspective depth in horizontal and vertical constraints, applies the 1.08 distance multiplier, and enforces positive near/far feasibility. The source has one extraction traversal and no animation loop. Runtime integration and call frequency are not certified by this review.

Final focused rerun after the parent concurrently added `fit(ring(10,10),1.3)` far-plane rejection: 30 tests, 30 pass, 0 fail/cancelled/skipped/todo, TAP duration 8434.5974 ms, exit 0. Before/after byte-pin assertions passed for both product modules and both test files. An attempted preflight correctly stopped before running tests when it detected the changed parent test pin; no changes were reverted. Mutation runs above used the earlier math test SHA-256 `87e6d3476bab095c84e0ea974456cc3bb480dae538ecbd837ec164f2521262f0` (4306 bytes); the final snapshot below records the new parent test, which passed the final rerun. Product and sidecar test pins did not change.

## Executed Mutation Refutations

Mutations were applied only to strings read into the TS/VM loader, never to product files. Each mutation required exactly one source match. Real original test bodies and real Three geometry were run in isolated Node subprocesses through an in-memory test-module copy. The ten GLB cases were intentionally skipped only for the eleven synthetic measurement mutation runs; separate real-asset runs follow. Math mutants ran the parent's unmodified twelve math test bodies. Every child exited 1 with named behavioral ERR_ASSERTION failures, no setup exceptions or stderr. Skips described here are mutation-run selection, not the clean suite (which skipped zero).

| Mutant | Observed Pass / Fail / Skip | Refutation |
|---|---|---|
| measure/no-world-update: updateWorldMatrix(false,false) | 6 / 2 / 10 | ancestor/node and instance minimum Y |
| measure/no-child-update: updateWorldMatrix(true,false) | 6 / 2 / 10 | ancestor/node and instance minimum Y |
| measure/local-not-world: matrix instead of matrixWorld | 6 / 2 / 10 | ancestor/node and instance minimum Y |
| measure/ignore-indices: null index, include every position | 7 / 1 / 10 | unreferenced far vertex maximum Y |
| measure/one-instance: force instance count 1 | 7 / 1 / 10 | second-instance minimum Y |
| measure/omit-instance-TRS: multiply identity | 7 / 1 / 10 | instance minimum Y |
| measure/reverse-instance-order: premultiply instance | 7 / 1 / 10 | instance maximum Y |
| measure/allow-skin: disable SkinnedMesh rejection | 7 / 1 / 10 | missing expected skin exception |
| measure/allow-morph: disable morph rejection | 7 / 1 / 10 | missing expected morph exception |
| measure/allow-empty: remove empty-count rejection | 7 / 1 / 10 | missing expected empty exception |
| measure/allow-nonfinite: disable transformed point guard | 6 / 2 / 10 | missing expected NaN and Infinity exceptions |
| math/aspect-floor: floor aspect to 0.25 | 10 / 2 / 0 | narrow side clipping and missing far rejection |
| math/drop-perspective-depth: horizontal 1/tan instead of hypot | 7 / 5 / 0 | four literal fits and clipping verifier |
| math/drop-vertical-depth: omit upper vertical radial term | 11 / 1 / 0 | tall-video literal distance |
| math/cylinder-inflation: replace each radius by global maximum | 11 / 1 / 0 | thin top/bottom correlation fixture |
| math/no-margin: remove 1.08 multiplier | 5 / 7 / 0 | six literal fits and correlated-profile fixture |
| math/no-near-guard: replace guarded near requirement by zero | 11 / 1 / 0 | tiny-geometry near/far projection |
| math/no-far-guard: disable far comparison | 11 / 1 / 0 | missing expected far RangeError |
| math/allow-invalid-aspect: disable aspect validation | 11 / 1 / 0 | missing expected invalid-aspect RangeError |
| actual-personal/omit-instance-TRS: multiply identity | 0 / 1 / 17 | decoded actual personal minimum Y |
| actual-car/half-distance: return distance * 0.5 | 0 / 1 / 17 | decoded actual car full-yaw plane |

Verbatim excerpts from the two actual-asset mutation outputs:

```text
actual-personal/omit-instance-TRS
exit: 1
failed: personal: pinned referenced GLB geometry measures and fits every yaw
error: 'transformed minimum Y'
code: 'ERR_ASSERTION'
# tests 18
# pass 0
# fail 1
# skipped 17
# duration_ms 148.7966

actual-car/half-distance
exit: 1
failed: car: pinned referenced GLB geometry measures and fits every yaw
error: 'full-yaw plane at aspect 0.2: -0.7816065417297515'
code: 'ERR_ASSERTION'
# tests 18
# pass 0
# fail 1
# skipped 17
# duration_ms 590.7653
```

## Literal Byte Snapshot

FINAL CLOSED raw SHA-256 pins after the final morph Array.isArray/direct-finite fixes, final-source mutation checks, and latest independent 30/30 clean run. No line-ending normalization. The first four rows are the final owned/reviewed source and test files. These close only math/measurement at these exact bytes, not integration. All ten asset rows still exactly match the survey pins and were read only.

| File | Bytes | SHA-256 |
|---|---|---|
| apps/web/src/components/hero/hero-geometry-bounds.ts | 2628 | `a1f04843f1a1feca67f563b01ec474ec44806a4abd23334aca68ed13363fab56` |
| apps/web/src/components/hero/turntable.ts | 2758 | `e3a488ca249bf4fae70220b98c790362283dfcc298369f54bbc03a53f40c23b0` |
| apps/media/scripts/hero-framing-assets.test.mjs | 9086 | `31d86c21d1ef7c443a1f158b67c621ead7a6ce060b2eecdc271fff1ecf5a4b18` |
| apps/media/scripts/hero-framing.test.mjs | 4430 | `5528b42e797ac14313a1bbf24ef149f5bebfbd85923917b543de0b7db7b31ae2` |
| apps/web/public/heroes/car.glb | 2232520 | `5d7fb0b2aa1457ce7e0013d3b7e04ba6568c3dd21941dc5df05a3bf969489225` |
| apps/web/public/heroes/house.glb | 1145320 | `ec008a1681930595a11579c6b19a1c02377d3211aea8a36b03e2aff9bd244f33` |
| apps/web/public/heroes/land.glb | 709260 | `4b09041fd2f952a7cddef196d9a2078360194913e1ff175ef96b89c5ff7aa3de` |
| apps/web/public/heroes/creditCard.glb | 523764 | `b3f08cc7e2e081deee13f86f88bdc02a7ff7b46ac97beb3155d4f5c4b4188025` |
| apps/web/public/heroes/studentLoan.glb | 723868 | `56dfe51ad199bdafcc0cc5ced65321a16a4e087693f645d6d12c6bc14fb98d12` |
| apps/web/public/heroes/medical.glb | 509120 | `b6df483391ee3d552f8a128ab8327484d833754f6a907e7fa0899eca5dd6c615` |
| apps/web/public/heroes/personal.glb | 519844 | `e079fc7b95c562fa6180434491cf3511d54fbf79cb155bf1d89c822bafe77b79` |
| apps/web/public/heroes/recreation.glb | 521544 | `c7ce5658eefd0e928ea857e70ca35803e2812308032a071cdcb82412434f41a7` |
| apps/web/public/heroes/custom.glb | 237844 | `2753182d024be862fc7ab5e5b18100cc6a7bbcc736213471b4a6e2083517aa7b` |
| apps/web/public/heroes/vault.glb | 719996 | `6846a098bbdd974f89101de68548e90bced312991745eae88549a3a6f9129594` |

## Limits

No per-animation-frame integration/performance assertion, app consumer lifecycle, live canvas/layout, material appearance, triangle rasterization, actual loader/image integration, animation/deformation, broad regression suite, full gates, CI, or shipping was tested. The 64-direction profile comparison is a bounded diagnostic, not proof of equality of every interior pair; six-plane continuous-yaw containment is exact for the independently decoded static vertex set at the nine selected aspects. Parent owns lifecycle wiring, complete gates/renders/CI, and shipping.
