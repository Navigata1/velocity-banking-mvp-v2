# Personal Independent Refutation Review

## Verdict

Two confirmed P2 geometry findings on the pinned candidate below. No P1 found
within this bounded CPU review. Not cleared. Parent subsequently announced a new
shoulder route and key tilt; these findings and measurements do NOT certify that
incoming variant. Supply its GLB, builder and test hashes for re-review.

Read-only primary repository. Only review-geometry-* scratch scripts/reports/logs
were written using apply_patch. No GLB copies or writes, primary edits, manifests,
dependencies, other agents, browsers, servers, GPU/render, network/cloud or Git
mutation. Evidence retains decoded coordinates and exact hashes, not a GLB copy.

## Pinned Inputs

- Distributed GLB: apps/web/public/heroes/personal.glb, 512876 bytes.
  SHA256 ae5bf9e062b060f4e1e0a7d150d606089550ec52e6006e1315447a1c509cb748
- Builder: apps/media/scripts/build-refined-personal.mjs, 21515 bytes.
  SHA256 2da81a4d80955b8b7b5b41f68ae90fc9cad8a9486c94e8f8518b3bafcd8e1345
- Contracts: apps/media/scripts/personal-refinement.test.mjs, 34945 bytes.
  SHA256 1aa90da5d38464c70710ed26719b2e25fb8c8b603700725e8e241f6a3497bd0a

All three hashes matched at the end of the final geometry probe. This is a
historical snapshot statement, not a claim they remain current after parent edits.
Coordinates below are in the decoded P-Body frame, not meters or authored units.

## Findings

### P2: Both inserted papers cut through the flap

Builder snapshot lines 53-55 and 95-97 place full-height sheets through the flap's
rear/top curved skin. Independently decoded, properly bounded, noncoplanar triangle
intersections find 86 front-paper/flap and 88 rear-paper/flap crossing pairs.
These are not contact with the shell floor or a deliberate flange attachment.

Front crossing locus spans X [-0.12981209,0.87153392], Y [0.72014870,0.76513970],
Z [-0.19541736,-0.18259623]. Rear locus spans X [-0.20397803,0.85298466],
Y [0.70241344,0.75699148], Z [-0.21913292,-0.20495891]. Shell top is Y=0.63972900;
the paper cuts through the flap above the mouth, across the papers' full width.
One front witness is paper triangle5/flap416, segment
(0.87153392,0.75675049,-0.18494318) to
(0.87153392,0.75468044,-0.19168425), length0.00705174414.

Missed by contract9: it checks sheet bounds and center Z against inner shell skins
at a lower Y, but never tests paper against flap. Contract3 checks flap closure
and body contact, not unobstructed sheet emergence. All14 pass on this bad input.
Independent no-paper/flap-crossing assertions produce observed RED on both sheets.
Moving actual decoded paper triangles +2 in Z produces zero crossings, a negative
control. A crossing folded duplicate of the actual shoulder ribbon produces1048
proper crossings, a positive mutation control for the intersection detector.

Fix direction: provide real clearance behind the flap or reshape its rear/top
profile around the papers; do not accept arbitrary interpenetration as contact.

### P2: Stitch runs are buried in leather or detached above it

Builder snapshot lines59-66 and75-79 offset threads from centerline/profile
approximations rather than the actual thick/tessellated leather skins.
All470 GPU instance T/R/S transforms were expanded, not counted at one origin.

All50 handle stitches (instances260-309) are entirely inside the handle: all600
unique thread vertices classify inside on majority-of-three non-axis rays, no
proper thread/handle crossings, minimum vertex-to-handle distance0.00503373980.
Their centers are0.01020184988 from the skin. Thread Z bounds are
[-0.24827269,-0.24458280], whereas the handle's front face is Z=-0.23642066.
All120 flap-edge stitch centers also classify inside the flap, center/nearest-skin
distances0.00270424 to0.01618136. This is burial inside leather, not only occlusion
by another object in front.

Conversely instance458 has center(0.62768210,0.28362681,0.44781458), nearest-leather
center distance0.02637769555; every decoded thread vertex is at least0.02422752623
from all leather skins. Its nearest support is P-Flap. The group contains62 stitch
centers outside leather and more than0.01 from any leather surface.

Missed by contract7: approximately48 vertex samples, global proximity tolerance
about0.0497 in this frame, and30% aggregate front visibility let whole authored
runs disappear or float. All14 pass. An actual instance-accessor mutation moving
the50 handle stitch TRANSLATION Z values another-0.02 still passes that unchanged
contract. Independent buried-handle and detached-instance458 checks produce RED.
Place threads from actual surface sections/normals and check each intended run
with thread-scale clearances, not a bag-scale allowance.

## Four Bounded Probes And Controls

1. Decoded attributes, counts, real transforms/bounds and aperture facing:
   15696 unique /28760 instantiated triangles,28 meshes,9 maps,470 thread instances.
   Zero nonfinite attributes, degenerate triangles at the stated threshold,
   collapsed textured UV triangles, out-of-range decoded UVs or winding/normal
   mismatches. World bounds [-1.59998772,0.00000980,-1.12248607] to
   [1.59999432,2.22298814,1.12250043].16 radial rays per aperture pass culling on
   four rings, two buckles and key; reversed controls fail16/16 each. True >1 UV
   float-accessor mutation detected. No unique/GPU-cost confusion.
2. Proper nonadjacent self/cross-part intersections: no detected proper self-crossing
   in shell, flap, shoulder, handle, left punched strap or left buckle. No shoulder
   collision with shell/flap/key; no paper/shell crossing. Flap/body overlap is
   localized at the rear attachment. Key has four tiny bevel crossing segments
   of length0.000259-0.000269; recorded, not promoted to an important defect.
3. Small hardware/support: shoulder rivets, keepers and tongues have actual support
   crossings. Handle rivets have a tiny0.00139001 tab gap, recorded but not elevated
   to P2 at this scale. A detached-rivet mutation is independently separated; the
   standing handle-chain contract still passes because it never checks rivets.
4. Every stitch center against decoded skins; full handle-thread and instance458
   vertex witnesses as above. The six-direction visibility estimate is diagnostic
   only; findings rely on actual interior/surface-distance/crossing evidence.

## Reproduction

Run from repository root, ONLY against the pinned inputs or a deliberately
identified replacement. Scripts read live paths; they do not contain a GLB copy.

    node .superpowers/sdd/2026-10-21-personal/review-geometry-probes.mjs
    node .superpowers/sdd/2026-10-21-personal/review-geometry-contract-controls.mjs
    node --test apps/media/scripts/personal-refinement.test.mjs

Final probe exit1 is expected: four observed geometry RED checks representing two
P2 findings. Contract-controls exits0: baseline14/14, two escaped mutations, and
actual key reversed-winding rejection all observed. Original unmodified test run
also exits0,14/14. No network or filesystem write is performed by either script.
Logs: review-geometry-apertures-final.log (authoritative final geometry run),
review-geometry-contract-controls.log and review-geometry-standing-contracts.log.
The earlier probes.log predates added aperture/RED checks. Initial harness log
records a corrected fixture-isolation mistake, not a candidate failure.

Limits: no visual/render approval; no photorealism, CAD, global watertightness,
exhaustive coplanar overlap, physical-device, runtime or publication certification.
No final clearance until the parent's new exact hashes are supplied and reviewed.
