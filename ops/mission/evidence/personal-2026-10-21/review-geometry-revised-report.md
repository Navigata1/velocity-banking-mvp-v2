# Personal Revised Candidate: Independent Geometry Re-review

## Verdict

Both previous P2 findings are independently reconfirmed on a4960547, not merely
carried forward from ae5bf9e0. Geometry NOT cleared. No additional important
finding arose in the four bounded probes. No primary files or GLBs were written.
Only review-geometry-* ignored scratch files were edited through apply_patch.
No browser/server/GPU/render/network/cloud/dependency/agent/Git mutation.

## Exact Inputs

- GLB: apps/web/public/heroes/personal.glb, 513944 bytes
  a49605478a5466ed5f16464ed878e2f990244f5510f4088c6db60a2faf7b7b06
- Builder: apps/media/scripts/build-refined-personal.mjs, 21602 bytes
  161159e34ef9cc5bd0b1bf67a7912147ff567c6f4593d94f98e760cfb2edf414
- Tests: apps/media/scripts/personal-refinement.test.mjs, 34945 bytes
  1aa90da5d38464c70710ed26719b2e25fb8c8b603700725e8e241f6a3497bd0a
- Config canonical JSON SHA256 (matches supplied hash):
  3377df695d1a66ace34911e0e5bc2e5bf5fd0b6a6b2479ed1f5c05208df47523
- Config raw file SHA256 (different serialization, not a discrepancy):
  c2bb19587d1b4628d819d674657d8689a38d10b052fbda637dcf4c025c08b247

Each geometry run checked GLB/builder/tests hashes again on completion. All
coordinates below are decoded P-Body-local units, not meters or authored units.
The original ae5 report/logs remain separate historical evidence, unchanged.

## Confirmed Findings

### P2: Inserted papers cut through the curved flap

Builder lines53-55 and95-97. Actual current decoded triangles again produce86
front-paper/flap and88 rear-paper/flap proper crossing pairs. The crossing locus
spans each sheet's full width and lies above the shell mouth (topY=0.639729):

- Front: X[-0.12981209,0.87153392], Y[0.72014870,0.76513970],
  Z[-0.19541736,-0.18259623].
- Rear: X[-0.20397803,0.85298466], Y[0.70241344,0.75699148],
  Z[-0.21913292,-0.20495891].

Front triangle5/flap416 cross along (0.87153392,0.75675049,-0.18494318) to
(0.87153392,0.75468044,-0.19168425), length0.00705174414. This is an obstructed
sheet emergence, not intentional rear flap attachment. Both no-crossing checks
are observed RED on current geometry. A translated real-paper negative control
has0 crossings; the folded-duplicate shoulder mutation has1133 proper crossings.

Contract9 still checks sheet bounds/center against inner shell skins, never the
flap; contract3 checks closure and body contact, not paper clearance. Both pass.
Provide a real unobstructed exit behind/through a reshaped flap profile.

### P2: Actual stitch runs remain buried or detached

Builder lines59-66 and75-79. All470 EXT_mesh_gpu_instancing instances expanded
with actual translation/rotation/scale. All50 handle stitches260-309 remain
entirely buried:600/600 unique vertices inside,0 proper thread/handle crossings,
minimum vertex/skin distance0.00503373980. Centers sit0.01020184988 inside the
skin. All120 flap-edge stitch centers remain inside the flap as well.

Instance458 center(0.62768210,0.28362681,0.44781458) is0.02637769555 from any
leather skin. Minimum actual vertex gap0.02422752623. A stronger whole-triangle
separation proof now bounds all its triangles inside a radius0.00702226993 ball
about that center: skin-distance minus ball-radius gives a guaranteed positive
clearance of at least0.01935542562 for EVERY point on the thread. It is genuinely
floating, not just an unsampled edge/triangle interior that might make contact.

Contract7 uses approximately48 vertices, about0.0497 bag-scale proximity and30%
aggregate front visibility. Moving all50 handle instances another-0.02 in local
TRANSLATION Z still passes this unchanged test. Independent buried-handle and
detached-instance458 checks remain observed RED. Seat threads on actual decoded
skin sections and test every intended run with thread-scale tolerances.

## Revised Route And Key

No detected proper nonadjacent shoulder self-crossing or shoulder collision with
shell/flap/key. Same support-chain contracts pass on the current route. Tilted
key and six ring/buckle apertures each pass16 radial culling checks; reversing
their winding fails16/16 each. Key retains four tiny bevel crossing segments
(0.000208-0.000258), not escalated to an important defect at this scale.

Independent numerical check:15696 unique/28760 instantiated triangles,28 meshes,
9 maps,470 thread instances. No nonfinite attributes, out-of-range decoded UVs,
collapsed real textured UV triangles, degenerate triangles at the probe threshold,
or normal/winding disagreement. Actual world extent3.19998241, minY=-0.00001248
(quantization-scale grounding deviation). No extra dimensional-fit finding.

## Reproduction And Evidence

From repository root, against the identified hashes:

    node .superpowers/sdd/2026-10-21-personal/review-geometry-probes.mjs
    node .superpowers/sdd/2026-10-21-personal/review-geometry-contract-controls.mjs
    node --test apps/media/scripts/personal-refinement.test.mjs

- review-geometry-revised-final.log: exit1, four geometry RED checks/two P2s;
  all counterexample controls completed, input hashes unchanged.
- review-geometry-revised-controls.log: exit0, fresh-fixture14/14 baseline,
  deeper-burial and detached-rivet escaped mutations, reversed-key rejection.
- review-geometry-revised-standing.log: original unmodified test command exits0,
  14/14 pass,0 skipped. This does not clear the independently demonstrated P2s.
- review-geometry-revised-first.log: same candidate before the additional
  whole-triangle clearance proof; not a different candidate.

Limits unchanged: bounded CPU geometry review only, not final visual/photoreal,
CAD/global-watertight, exhaustive coplanar, physical-device, runtime, publication,
or deployment approval. No final geometry clearance on a4960547. Any fixes need
new exact GLB/builder/test hashes and targeted re-review.
