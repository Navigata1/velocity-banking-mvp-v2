# Independent Medical Geometry Re-review

## Verdict

All three prior P2 geometry findings are cleared on actual published GLB
`b6df483391ee3d552f8a128ab8327484d833754f6a907e7fa0899eca5dd6c615`.
No additional material geometry finding identified in this CPU-only pass.
This supersedes the previous508208-byte review, not the historical evidence.
No primary code/test/docs/assets were edited by this verifier.

## Current Verification

- Standing medical-refinement.test.mjs:14/14 PASS, independently rerun.
- Original unchanged review-geometry-refutations.mjs:4/4 PASS. The same four
  assertions previously failed on8de456c7 and6de73f30.
- Current corner/hash/budget checks:2/2 PASS.
- Coupling/bore/contact/crossing/rim mutation checks:4 substantive cases PASS,
  plus evidence-log persistence case PASS. They execute standing helpers
  extracted from the current test AST, without changing the test source.
- Standing public budget command PASS:25files,9.88MiB.

## Three Findings Rechecked Against Actual Geometry

### Earbow contact and annular coupling faces

Both rubber/steel pairs now have real finite triangle intersections, not
open-mesh inside/outside parity. Actual left witness:
(-1.0606286437,0.5177411590,0.5778227566); right witness:
(-0.1654019333,0.5315956987,0.5797713619).

All six rubber end couplings contain16 actual triangles each, joined to their
outer skin edges. Radial bores remain open: branch inner radius approximately
0.017995..0.017997, main0.015736..0.015741 authored units. Outward culling rays
hit the annular surface, while bore-axis rays hit no coupling face. Remaining
16 boundary edges per rubber mesh correspond to two8-edge inner bore rings,
not the former open outer skin ends. No proper self-crossing or normal/winding
mismatch was detected at the new geometry.

Mutation: remove only the16 decoded annular triangles at either branch's steel
end, leaving all other decoded surfaces unchanged. The original0.0109111224 /
0.0110557073 authored gaps return, and the current standing contactFaces helper
rejects each. Unmodified actual meshes pass that same helper. Odd-parity
containment acceptance is no longer present in the standing contact helper.

### Main tubing / chestpiece clearance

No forbidden actual triangle intersection or contained tube vertex detected.
All-feature surface clearances, authored units followed by normalized stage:

- Body:0.0449590042 /0.0512608098.
- Rim:0.0359601191 /0.0410005706.
- Diaphragm:0.0669281621 /0.0763093367.

The main tube still contacts the intended connector/collar and Y. Mutation:
CPU-reconstruct the former crossing route as uncompressed TubeGeometry, without
publishing or editing anything. The current standing firstCrossing helper
rejects that former route against all three actual decoded chestpiece surfaces.

### Badge rim topology and outwardness

Actual rim now has zero inconsistent directed edges, is closed, and has positive
signed volume. Multiple aperture rays in both X directions hit the inner wall
first with and without back-face culling. The old exposed ray
(0,0.64,0.449)->(+1,0,0) now hits inner x0.2502885815 with front culling enabled.
No normal/winding mismatch or proper self-crossing detected.

Mutations applied only to decoded scratch triangles: reverse the500 inner wall/
bevel faces while leaving caps and outer walls alone; separately delete one face.
The standing rim verifier rejects both. This is stronger than reversing the
entire mesh, since normals can otherwise agree with locally wrong winding.

## Whole-Artifact Checks And Metrics

- Source LF hash and material-config hash match both coherent records; bytes,
  unique triangles and mesh counts match actual decode.
- 509120 bytes,15168 bytes below the unchanged524288 cap.
- Public10364342 bytes,121418 bytes below unchanged10485760 cap.
- 26104 unique /43412 instantiated triangles,50 unique meshes /113 mesh nodes.
  Mesh reuse is not hardware draw instancing. Both triangle totals below65000.
- 27256 summed unique-mesh vertices;684651 decoded accessor bytes. Nine embedded
  256px PBR maps, unchanged authored approximation limits; approximately3MiB
  RGBA8 full-mip texture memory, excluding browser/decoder copies.
- Every actual UV is in[0,1]; finite normal/UV data; no zero-area UV mapping on
  nondegenerate faces. No material/PBR range regression found.
- All8 curved wraps and8 faceplates remain closed, outward, with clear apertures,
  no inconsistent edges, and no detected proper self-crossing. Full contact
  graph includes every hardware item in the case component.
- Exactly two expected contact components:100 case/hardware/badge nodes and
  13 complete connected stethoscope nodes. Former earbow islands are gone.
- Bounds approximately3.1999975 x2.2609521 x2.6918676. Foot minY-0.000000697;
  chestpiece minY0.000002352. Normalized maximum dimension and ground retained.
- CPU web-camera projections at5degree yaw intervals for aspects0.6/1/16:9
  remain unclipped; max|NDC x|0.64393 /|NDC y|0.63587. Existing shared camera
  fitting is unchanged. Main tube minY0.0222893 is still above the stage floor,
  retained as a visual/stiffness limit, not a new correctness finding.

## Reproduction And Limitations

```text
node --test apps/media/scripts/medical-refinement.test.mjs
node --test .superpowers/sdd/2026-10-21-medical/review-geometry-refutations.mjs
node .superpowers/sdd/2026-10-21-medical/review-geometry-supplement.mjs
node --test .superpowers/sdd/2026-10-21-medical/review-geometry-final-checks.mjs
node --test .superpowers/sdd/2026-10-21-medical/review-geometry-coupling-mutations.mjs
node apps/web/scripts/public-asset-budget.cjs
```

Current probe/focused/supplement/coupling-mutation logs record this exact hash;
before-fixes logs preserve6de73f30 and initial logs preserve8de456c7. All scripts
and records are ignored review-geometry-*.mjs/md/log scratch only.

No browser/server/GPU/render/dependency/cloud/commit/push, poster-publication
review, source-model rebuild, or primary edits were performed. Physical contact
checks are triangle-level; this is not CAD/device certification. Self-crossing
scan excludes shared-vertex neighbors and does not certify every coplanar overlap.
No measured-material realism, frame-time/device proof or final all-collection art
approval is claimed. Parent still owns fresh final HyperFrames/Chrome evidence.
