# Personal Final Candidate: Independent CPU Refutation

## Verdict

CLEAR WITHIN THE STATED CPU GEOMETRY SCOPE. No confirmed important P1/P2 finding
remains on the exact e079fc7b candidate. Both earlier P2s are cleared by fresh
decoded geometry evidence and rejecting regressions, not by the standing GREEN
alone. This does not confer final art, photorealism, runtime, device or release
approval. All measurements below refer only to these hashes.

## Pinned Inputs

- GLB,519844 bytes:
  e079fc7b95c562fa6180434491cf3511d54fbf79cb155bf1d89c822bafe77b79
- build-refined-personal.mjs,25939 bytes:
  588e52c8a9547e98df1a643bb465ec4a884ff85df84b9cefd5fef35efc73864c
- personal-refinement.test.mjs,32880 bytes:
  720a941cf3245f5514f8c5e8c912a24e40873e2142e95c25dbd2a3b119513110
- personal-seating.test.mjs,6153 bytes:
  5a0b4ac3409f2bc38a4c71a562ca0d9d64b67dace1366b0eb2eb33f960236870
- personal-geometry-test-helpers.mjs,3178 bytes:
  77635f6f372d6f4d5fbea41383e82f85703d85505cd1c0a64deb21917c6be2eb

Paths: apps/web/public/heroes/personal.glb; the four JS inputs are under
apps/media/scripts/. Five hashes were rechecked at the end of the authoritative
probe and mutation run, unchanged. No GLB copies were written.

## Four Bounded Probes

1. Numeric validity, clipping topology, normals and UVs. Actual22016 unique /
   33844 rendered triangles,29 meshes,9 maps.276364 decoded accessor scalar values
   checked finite. No decoded UV-range violations, collapsed real textured UV
   triangles at the documented area threshold, or raw/world face-normal
   disagreement. World normals use inverse-transpose then per-vertex normalization.
   All10 leather skins have0 unmatched EXACT-position directed edges and positive
   signed volumes, including both3680-triangle clipped punched straps; no relaxed
   rounded-key welding was needed for this proof. Key, four rings and two buckles
   also pass. The .05 horizontal clip /1e-7 attribute merge and useful cap UV
   density survive the actual export; source review found no important new defect.

2. Surface crossings and apertures. No detected proper nonadjacent self-crossings
   in shell, flap, handle, shoulder, either punched strap or analytic-neck key.
   Both paper/flap crossing counts are0 (previously86/88); both paper/shell counts
   are0. No shoulder/shell, shoulder/flap or shoulder/key crossing detected.
   Both handle rivets and both shoulder rivets have actual triangle intersections
   with their intended tabs. Seven apertures pass16 backface-culled inner-wall
   rays each; reversed-winding controls fail16/16 for each aperture.

3. Every actual stitch instance.459 EXT_mesh_gpu_instancing instances fully
   expanded with T/R/S:90 body,159 flap,50 handle,80 left strap,80 right strap.
   All459 centers meet thread-scale surface-distance bounds; maximum nearest-skin
   center distance0.00082887420 in decoded body-local units. Five independent
   mixed-sign/non-axis rays find0 centers buried in the independently validated
   closed skins.918 actual end-cap samples checked; maximum end distance
   0.00147929806, maximum distance/radius0.72523902, no endpoint beyond thread
   radius. Surface distance/contact never uses parity on open skins. No single
   nearest-face signed-normal shortcut is used to infer inside/outside.

4. Actual-geometry mutations against the NEW tests. Baseline all four new seating
   tests pass with fresh documents, then each of the following produces a genuine
   ERR_ASSERTION from the unchanged new test callback:
   - Move a real paper through the actual flap: independent88 crossing pairs;
     paper-clearance test rejects the first real intersection.
   - Move all50 actual handle-instance translations0.011 backward in the body
     frame: thread249 rejected at distance0.01018726056 (old-style burial).
   - Restore one actual right-strap stitch to the old floating witness location:
     thread447 rejected at distance0.00927468231.
   - Delete one real clipped strap triangle:3 unmatched directed edges; the test
     rejects the open skin BEFORE using any burial parity classification.

The original unmodified focused command also freshly passes18/18,0 skipped:

    node --test apps/media/scripts/personal-refinement.test.mjs apps/media/scripts/personal-seating.test.mjs

## Reproduction And Evidence

From repository root, against the exact identified files:

    node .superpowers/sdd/2026-10-21-personal/review-geometry-final-probes.mjs
    node .superpowers/sdd/2026-10-21-personal/review-geometry-final-mutations.mjs

Authoritative logs: review-geometry-final-authoritative.log (all independent
probes plus all four rejecting mutations, exit0) and review-geometry-final-standing.log
(unmodified18 cases, exit0). The AST harness only strips test-module imports and
injects a controlled decoded personal() fixture; helper/check bodies are unchanged.
Mutations and fixtures live only in memory; no builder is executed or GLB written.

Earlier final-probe diagnostic logs record a verifier ray-grazing issue, not a
candidate finding: torus equator rays can run exactly along tessellation edges.
Final rays are phased away from tessellation vertices and offset within the
ring depth; key rays use the actual tilted key plane. Reversed controls remain
16/16 rejecting, so the final result is not obtained by suppressing backface tests.

## Limits And Scope

Independent decoder, exact directed edges, bounded noncoplanar intersections,
surface distances, aperture rays, every-instance/end-cap checks and actual
counterexamples. Not an exhaustive proof of coplanar overlap or every possible
subpixel self-contact, CAD/global-watertight certification, physical strap
manufacturability, photorealism, visual quality, camera/studio/runtime behavior,
devices, provenance/publication/packaging/CI/hosted state or release readiness.
World extent3.19998241 and minY=-0.00001248 are consistent with the expected3.2
stage and quantization-scale grounding tolerance. No new dimensional-fit finding.

Read-only primary repo. Writes ONLY review-geometry-final-* ignored scratch
scripts/reports/logs through apply_patch. No source/model/manifest/dependency edits,
other-agent actions, browser/server/GPU/render/network/cloud/install/commit/push.
Any later geometry/source/test change requires a new exact-hash assessment.
