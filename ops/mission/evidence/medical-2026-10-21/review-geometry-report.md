# Independent Medical Geometry Review

## Superseded By Successful Re-review

The current published509120-byte artifact
`b6df483391ee3d552f8a128ab8327484d833754f6a907e7fa0899eca5dd6c615`
clears all three prior P2s.14standing cases,4unchanged original refutations,
2corner/resource checks and all coupling/crossing/rim mutation checks now PASS.
See `review-geometry-rereview.md` for the authoritative current verdict and
`review-geometry-coupling-mutations.log` for actual clearance/mutation evidence.
The remaining contents of this file are historical review findings, preserved
to document the observed failures rather than current blocking issues.

## Status

Read-only verifier under MissionControlTier2. No production/test/docs edits,
browser/server/GPU/render/dependency/cloud/commit/push or other-chat messages.
Only ignored review-geometry-*.mjs/md/log files were authored.

Final reviewed published candidate:
`6de73f305032c28a4a481a2e06f8851f0aea750557a395e6b052dadead1aa561`,
508208 bytes. Re-read actual builder/config/GLB/manifests after parent's explicit
new-publication notice. All11 existing geometry cases PASS; both additional
positive corner/topology/resource checks PASS; all4 independent refutation
assertions FAIL, preserving three P2 findings. Do not approve final correctness.

No temporary source/artifact mismatch is reported as a defect. Oversize builds
were rejected without publication, then the current smaller candidate was
actually published with coherent source/config/artifact hashes. Caps unchanged.

## Final Findings And Evidence

### P2: Main tube still cuts through the far side of the chestpiece

Current builder line111, chestpiece lines121-126. Lower tessellation does not
resolve the collision. Decoded actual geometry has108 tube/body,118 tube/rim and
68 tube/diaphragm proper intersecting triangle pairs, all away from the intended
connector x=0.57..0.75. Actual tube/rim crossing witness:
(0.9072645945,0.0943042282,1.2598730991). Sixteen tube vertices are inside the
body,12 inside the rim,5 inside the diaphragm. Sampled body penetration lower
bound0.0237908967 authored units, approximately0.0285235 stage units; witness
(0.9660309433,0.0335015257,1.1715788842). Test214-227 covers only intended contact,
loop silhouette and annular rim, not forbidden cross-part intersections.

### P2: Both steel earbows remain disconnected from their rubber branches

Current builder lines113-117, open TubeGeometry helper line25. Exact decoded
all-feature surface clearances remain0.0109111224 /0.0110557073 authored units.
Current scale1.1989243467 makes them0.0130816103 /0.0132549566 stage units.
Neither pair has crossing/contact; each constituent open mesh has16 boundary
edges. Full graph produces separate bow/tip islands. Existing contactFaces
line51 still accepts odd ray parity for open meshes, falsely treating an
unclosed tube as a solid. End-center coincidence does not close the annular
surface gap between radii0.04 and0.022.

### P2: Badge rim inner wall still has reversed winding and normals

Current builder line107. Inner and outer shield contours have the same clockwise
orientation. Actual rim has100 inconsistent directed edges, while average
normals agree with the incorrect winding. Current test245 cannot establish
outwardness. Ray(0,0.64,0.449) toward(+1,0,0) hits inner rim at x0.2598245797 and
outer at x0.2910288232 without culling, but hits nothing with front-face culling.
This is above the green plate front and the material is single-sided. The
installed ExtrudeGeometry only reverses hole direction inside its outer-reversal
branch, which this clockwise outer shield does not enter.

## Final Positive Checks, Metrics And Limits

- All8 wraps and8 faceplates:500 triangles each, closed, zero nonmanifold or
  inconsistently oriented edges, positive signed volume, zero normal/winding
  mismatch, zero detected proper nonadjacent self-crossings. All wrap aperture
  rays have two wall hits and correctly front-facing inner walls. No reflection
  workaround was used. Full contact graph connects every case hardware item,
  including all corner rivets, to the case.
- GLB508208/524288 bytes,16080 bytes headroom.26008 unique triangles versus43316
  scene-instantiated triangles.50 unique meshes versus113 mesh nodes. Standard
  mesh reuse is not hardware GPU instancing; renderer draw cost is not50 meshes.
  Both triangle totals are below65000.
- Actual public total10363430/10485760 bytes,122330 bytes headroom; standing
  public budget command passes25files/9.88MiB. No cap changes.
- 27162 summed unique-mesh vertices;683173 decoded accessor bytes. Nine embedded
  256px WebP maps; approximate RGBA8 full-mip GPU texture budget3MiB, excluding
  browser/decoder copies. No GPU time or browser memory measurement.
- All actual UV coordinates are now in[0,1], no zero UV-area nondegenerate
  triangles, and all normal/UV data finite. Five non-emissive materials retain
  dielectric enamel/rubber/green and metallic steel. Roughness factors0.6/1;
  effective polished roughness approximately0.226..0.254, enamel0.267..0.294,
  diaphragm0.376..0.424 and rubber0.725..0.753. Existing roughness fix retained.
- Grain now smoothly interpolates8px control cells, not flat normal maps; decoded
  enamel normal R/G125..130, steel R126..129/G120..135, rubber R126..130/G125..130.
  This is weak procedural microdetail, not measured real material realism.
  Explicit authored-PBR/no-scan/no-exact-poster disclaimers remain in source/asset.
- Stage bounds approximately3.2000050 x2.3774662 x2.7104768; foot ground error
  -0.000000733, chestpiece minY0.000002473. Main tubing minY0.0212210 remains
  elevated, a visual/stiffness limit rather than a separate blocking finding.
- Existing cavity/arch/loop/annulus checks pass; independent9-location case
  rays preserve0.7599776 authored-unit internal depth. No additional proper
  nonadjacent crossing found within an individual mesh. Algorithm excludes
  shared-vertex neighbors and does not certify absence of coplanar overlaps.
- Full actual-surface/closed-solid contact graph has four components: complete
  case/hardware/badge, main rubber/chestpiece assembly, left bow/tip, right
  bow/tip. The latter two islands are the earbow finding, not extra defects.
- CPU web-camera projection at FOV32 and5degree yaw intervals, aspects0.6/1/16:9,
  predicts no clipping: max |NDC x|0.65924 /|NDC y|0.64527. Actual Chrome/
  HyperFrames pixels, visual quality and devices remain parent-owned and are
  not certified. No poster-publication review, source rebuild, production edits
  or changed gates were performed by this verifier.

## Final Reproduction

```text
node --test apps/media/scripts/medical-refinement.test.mjs
node --test .superpowers/sdd/2026-10-21-medical/review-geometry-final-checks.mjs
node --test .superpowers/sdd/2026-10-21-medical/review-geometry-refutations.mjs
node .superpowers/sdd/2026-10-21-medical/review-geometry-focused.mjs
node .superpowers/sdd/2026-10-21-medical/review-geometry-supplement.mjs
node apps/web/scripts/public-asset-budget.cjs
```

Expected on final reviewed hash:11/11 existing PASS;2/2 scratch positives PASS;
4/4 scratch refutations FAIL; budget PASS. Probe/focused/supplement logs are
current, with original-snapshot copies separately preserved. Repro coordinates
are authored-frame; multiply distances by1.1989243467 for current stage units.

## Historical Initial Snapshot Findings

The remainder records the earlier476872-byte artifact
`8de456c77af3ebacd549ea5d49d20e222d6b42fd7483ee774f10936590be8318`.
Its numerical metrics and intermediate line references below are historical;
use the final reviewed snapshot above for current conclusions.

All coordinates below are in the unrotated authored object frame unless noted.
Intermediate builder line references after first corner edit, before UV helper edit.

### P2: Main tube passes through chestpiece away from its connector

Builder line 104 routes the broad outer loop through the chestpiece at lines
114-119. This is not a mere AABB collision or intended insertion at the port.
Actual bounded edge/triangle intersections occur for x>0.8, well away from the
connector's x=0.57..0.75. There are 150 tube/body,160 tube/rim and94 tube/diaphragm
intersecting triangle pairs there. Example actual tube/rim crossing:
(0.9016052645,0.0949096429,1.2617184745).

Twenty unique tube vertices are inside the closed body,15 inside the rim and6
inside the diaphragm. Deepest sampled interior tube vertex in the body is
(0.9703237887,0.0335065756,1.1662987303), depth0.0237591478 to the nearest body
surface. This is a penetration lower bound, not the continuous maximum; at the
current1.2099665513 stage scale it is0.028747789.

Existing test lines214-227 require connection and an annular rim but never
prohibit tubing/chestpiece crossings. The single tube alone has no detected
proper nonadjacent self-crossing; the failure is cross-part assembly geometry.

### P2: Both open-ended earbow joints are surface-disconnected

Builder lines106-110 end the radius0.04 rubber branch and start radius0.022 steel
earbow at the same center. Both TubeGeometry surfaces are uncapped. Their actual
triangles do not meet: left minimum surface distance0.0109111224, right
0.0110557073 authored units, or0.0132020931 /0.0133770360 stage units.
Distances enumerate both vertex/triangle directions and finite segment/segment
features with AABB distance lower-bound pruning. No proper crossing was found.
Each open mesh has16 boundary edges.

Left closest witness pair:
(-1.0444728680,0.5510321683,0.5805860873) and
(-1.0509442438,0.5446010304,0.5746015779).
Right closest witness pair:
(-0.1757163093,0.5509246938,0.5807598277) and
(-0.1692026263,0.5444426168,0.5746130175).

Existing contactFaces line51 accepts odd ray parity as containment without
requiring a closed target mesh. This falsely accepts these open mesh joints;
test line203 consequently remains green. Ray from(-1.05,0.52,0.59) along
(-0.14,0.17,-0.01) passes through the annular opening without meeting either
surface. Do not interpret imaginary filled volumes as actual closed geometry.

### P2: Badge rim inner wall winding/normals are reversed

Builder line100 pushes shield(0.94,T.Path) into outer shield(1.055) with the same
clockwise direction. Installed ExtrudeGeometry.js lines145-165 only reverses
clockwise holes if the outer path itself needs reversal. Here it does not.
The actual rim has100 inconsistent directed edges at inner wall/cap boundaries.
Normals agree with the wrong winding, so existing test line245 cannot catch it.

Concrete ray: origin(0,0.64,0.449), direction(+1,0,0). This height is above the
green plate front, not an entirely buried sidewall. Unculled first intersection
is x0.2598245797 (face956), outer intersection x0.2910288232 (face456), but
front-face-culling returns no hit at all. The inner wall points away from the
aperture. Material is single-sided. Multiple y and both X directions reproduce.

## Reproduction

From repository root:

```text
node --test apps/media/scripts/medical-refinement.test.mjs
node --test .superpowers/sdd/2026-10-21-medical/review-geometry-refutations.mjs
node .superpowers/sdd/2026-10-21-medical/review-geometry-focused.mjs
```

First was10/10 green before parent corner changes. Refutations are4/4 RED:
one chestpiece collision case, left/right joint separation, one badge culling
case. Scratch scripts decode actual Meshopt GLB through existing dependencies;
they never rebuild or write production assets.

Probe/focused logs contain complete triangle, part, contact, texture and metrics
data. review-geometry-initial.log and review-geometry-focused-initial.log preserve
the original snapshot; non-initial logs can be refreshed for the next artifact.

## Initial Metrics And Bounded Checks

- 476872 bytes; local0.5MiB headroom47416 bytes.
- 27280 unique mesh triangles,44052 instantiated triangles;51 unique meshes,
  121 mesh nodes. Reused geometry is not GPU draw instancing. Both triangle
  counts remain below65000; manifests report the unique count, not scene cost.
- 23997 summed unique-mesh vertices;576010 decoded accessor bytes. No GPU cost
  or frame-time measurement is claimed.
- Nine embedded256x256 WebP maps; estimated RGBA8 full mip-chain texture memory
  3MiB, excluding decoder/browser copies. Five materials, finite normals/UVs,
  nonzero UV triangle area, no emissive pigment. Roughness factors0.6 or1 and
  normal scales0.09/0.14/0.15; existing roughness bound fix is retained.
- Texture RGB maps have subtle grayscale variation; approximate normals are
  weak microdetail. PBR and no-scan/no-exact-poster limitations are disclosed in
  materials.json and copyright; no measured photorealism is certified.
- Actual stage bounds approximately3.1999851 x2.3993629 x2.7093568. Four feet
  minY=-0.000000739; chestpiece minY=0.000002496. Main tube minY=0.021410231:
  most tubing does not touch the ground, a visual/stiffness limitation rather
  than an additional asserted blocking defect.
- Actual public total10332094 bytes, cap10485760, headroom153666 bytes.
- Case rays across9 XY sample locations encounter four z-wall hits with a
  0.7599776 authored-unit cavity. Outward front/back and inward cavity walls
  have the correct facing. Existing hollow case/handle/annular rim cases pass.
- A full contact graph requiring real surface intersection or containment in a
  closed consistently oriented mesh confirms all initial case hardware reaches
  the case. It produces four components: complete case/hardware/badge, stethoscope
  rubber/main/chestpiece, left steel bow/tip, right steel bow/tip. The two extra
  disconnected components independently confirm the earbow finding. New curved
  corners still need rechecking.
- CPU projection using the existing web FOV32/sphere fitting, camera direction,
  rest angle and5-degree yaw steps stays inside the frustum for aspects0.6/1/16:9.
  Largest |NDC x|0.65331 and |NDC y|0.64739; no clipping predicted. These are
  analytic geometry checks, not actual viewport/pixel or HyperFrames evidence.
- Decoded normal lengths range0.99419..1.00520 before renderer renormalization,
  consistent with the current quantized normal representation. Out-of-unit UVs
  are present with REPEAT wrapping in the initial artifact; that is permitted,
  not an intrinsic PBR defect. Parent compression edit is in progress.
- No proper nonadjacent triangle crossing detected within any individual mesh.
  Sweep excludes shared-vertex neighbors and does not prove absence of coplanar
  overlaps or all possible near-degenerate contacts. Expected buried open tube
  ends and lathe pole degenerates are not independently reported as defects.

## Limits

Not a poster-publication review. No visual screenshot/render/device/material
realism certification. Parent owns actual Chrome/HyperFrames art/framing checks.
That pending review was completed above after successful publication.
