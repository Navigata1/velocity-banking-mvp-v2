# Final P3-Corrected Geometry Re-Review

## Verdict And Pins
No remaining P1/P2 or unresolved prior P3 found in the bounded production-geometry scope. Prior hardware support gaps are corrected; the new seated-thread helper rejects both previously missed mutations. This verdict applies ONLY to these reread input hashes:

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| apps/web/public/heroes/recreation.glb | 521544 | c7ce5658eefd0e928ea857e70ca35803e2812308032a071cdcb82412434f41a7 |
| apps/media/scripts/build-refined-recreation.mjs | 20361 | 2edfb8fae498e2877a49ce16de7530c645fcdb5dbc1cbdffdd1884ac95f7473e |
| apps/media/scripts/recreation-refinement.test.mjs | 37501 | d7185ec2ed9bb6955a27db98047fa5d91159d491cf5461dae1b0dc4aab5dd794 |
| apps/media/sources/recreation/materials.json | unchanged recipe, not a geometry input | 6b5776151c1b052c82e4a408b81be0e72a3047ec1392b0492a3b9f38a0bcac04 |

Baseline remains a162c10c4ad9590ffcd12dbbffe189d6371d5e52. This report supersedes review-geometry-report.md for the current artifact; the earlier report and diagnostic logs remain historical evidence, not current outstanding findings.

## Exact Scope Comparison
Compared against the saved, hash-checked decoded d21f57 stream manifest, not a mutable mirror:
- 109 -> 113 scene nodes. Exactly four additions: R-Grab-Support--1--0.48, R-Grab-Support--1-0.33, R-Grab-Support-1--0.48, R-Grab-Support-1-0.33.
- Exactly two existing nodes differ: R-Winch-Base--1 and R-Winch-Base-1, only local/world matrices. Their decoded primitive streams are unchanged.
- All other 107 existing nodes match exactly, including hierarchy, local/world matrices, modes, normalized positions/normals/UVs, indices and instance attributes. This includes root/stage, roof, hull, cockpit, cabin, sails, seams, standing rigging, sheets and helm. No extra recentering occurred in this revision.
- Reversing only the two hardware construction statements recovers the prior builder's exact SHA 7f9d61b7c2a490450857fcf6562ae51d5ee966e427c9489d888fca72204c82b0. Thus no other builder statement changed.
- Prior geometry aggregate: 8cad41aaeb9f53366c652cece30b46dca0fec446bab227ab1859a4e439f0dcf3. Current: 8f18d90f3b8c57d2f2df859fb23abaa08f6bc6fa4c90506eb605b5ac87d09548.

Evidence: review-geometry-p3-compare.log. No separate material/PBR/publication review was performed.

## Actual Hardware Contact
Builder lines 63 and 100, plus tests lines 261-266:
- Each of four new standoffs is independently closed, directed consistently and outward-positive. Each has bounded actual surface intersections with both roof and its rail, eight checked joins. Roof crossings occur at Y=1.1444988564; rail crossings include Y=1.1607589648..1.1617050386. Their lower endpoints at Y=1.14 penetrate the roof intentionally, and their upper endpoints at Y=1.167 meet the rail body.
- Both winch bases have actual finite deck intersections at Y=0.8609823597. Both also meet the drums at the shared Y=0.9 cap. The intended deck seating is not inferred from AABB overlap or an unbounded ray.
- Moving each actual standoff up 0.05 in memory removes its roof intersections; transforms are restored. No candidate bytes are written. Original floating rails themselves are still elevated, appropriately connected through their two standoffs rather than incorrectly required to touch the roof directly.

Evidence: review-geometry-p3-controls-complete.log.

## Thread Helper Refutation
Actual new functions at test lines 52-60 were parsed from the current test source and evaluated directly with the current decoded meshes. The helper uses normalized UVs carried by faces(), geometric connectivity, radius-scale checks, and parity only after solid(surface) validation.

Independent oracle: signed solid angle over closed, outward sail triangles, not the helper's three rays or nearest-normal classification. All 250 ring polygons were reconstructed; each has five unique vertices, with five connected paths and 25 rings per path on each sail. Oracle checks covered 250 ring centers plus 1250 polygon vertices, 1500 total points:
- Zero three-ray/solid-angle classification mismatches.
- Zero buried unmodified centers, zero center-distance/radius violations, and zero ring polygons lacking both inside and outside vertices.
- +0.006 Z mutation: both seam sets reject with the radius-distance assertion; 125/125 centers per sail are outside and there are zero actual sail/thread triangle crossings.
- -0.0035 Z mutation: both seam sets reject with the exterior-center assertion; the independent oracle classifies 125/125 centers per sail inside. Some tube faces still intersect the sail, demonstrating why contact-only checks cannot reject this burial condition.
- Removing a sail triangle rejects directed closure before any parity-based acceptance.
- Rigid rotation/translation with uniform scales 0.1, 0.7195303017 (actual stage scale), 1 and 4: seated threads accept on both sails, with no false rejection in these controls.
- Applying rotation plus anisotropic scale [1.25, 0.75, 1.5] to the actual common yacht ancestor also accepts through the production sail-local faces() frames; common ancestor transforms correctly cancel.

Bounded exploratory limitation: feeding already-flattened anisotropically scaled coordinates directly into seatedThreads rejects both otherwise seated seam sets because it uses the minimum polygon radius rather than a direction-specific ellipse radius. This is a conservative false rejection outside the current production invocation; invertible affine transformation preserves the physical joins, while the production local-frame test above passes. Do not advertise this helper as a general world-space anisotropic-contact oracle. Likewise, fixed weld/ray tolerances are not certified for arbitrarily microscopic scales. No present artifact defect or P1/P2 is implied.

The prior aggregate-solid-validation limitation remains general: positive total volume alone does not establish every disconnected component's orientation. Current sail targets each have one independently validated closed outward component, so that ambiguity does not affect these classifications.

Evidence: review-geometry-p3-controls-complete.log. Twenty trials were logged, including two explicitly exploratory anisotropic cases; zero unexpected production/control results.

## Previous Geometry Rechecked
Fresh runs on c7ce5658, not an inference solely from matching streams:
- All 25304 expanded triangles checked. Intended closed components retain directed two-manifold edges, positive per-component volume, no degenerate triangles and no stored-normal/winding disagreement. Intended open seam/sheet/lifeline tube ends remain explicitly excluded from closed-solid claims.
- Hull cavity, deck/cockpit aperture, all four glazed cabin holes, keel/rudder roots and bulb contact remain intact. Each of four cockpit walls contacts both deck and floor; helm spokes, shaft, pedestal, seat supports retain real contact.
- Both sail skins and edge strips remain closed; both sails pass all sampled two-skin sections. All 970 densely sampled actual thread sections still straddle cloth without sampled detached or fully buried sections, including terminal sections.
- Strict self-intersection sweep over hull/deck/cabin/keel/rudder/sails finds no noncoplanar strict interior crossings among 33249 qualified nonadjacent triangle pairs. Shared-vertex and coplanar/tangent cases are not claimed exhaustively certified.
- Conservative roof-envelope vertical gaps remain: boom 0.1034973, main 0.1455011, jib 0.0607970, jib sheet 0.1383164; main sheet is outside roof XZ envelope. Lowering the actual boom 0.16 still detects roof penetration.
- Four standing stays contact mast, deck and chainplates at their respective ends. Main/jib still contact mast/boom/forestay as intended, and both routed sheets contact their actual winch drums. Designed structural joins are not collision findings.

Evidence: review-geometry-p3-clearance.log, review-geometry-p3-detail.log, review-geometry-p3-topology.log, review-geometry-p3-all.log.

## Verification, Repro And Limits
Fresh geometry-focused standing subset: 12/12 PASS, exit 0. This is not a claim that this reviewer reran all 15 focused tests or the wider app suite.

```powershell
node .superpowers/sdd/2026-10-21-recreation/review-geometry-p3-compare.mjs
node .superpowers/sdd/2026-10-21-recreation/review-geometry-p3-controls.mjs
node .superpowers/sdd/2026-10-21-recreation/review-geometry-clearance-final.mjs
node .superpowers/sdd/2026-10-21-recreation/review-geometry-detail.mjs
node .superpowers/sdd/2026-10-21-recreation/review-geometry-topology.mjs
node .superpowers/sdd/2026-10-21-recreation/review-geometry-probe.mjs
node --test --test-name-pattern="Recreation (hull|timber|cabin|two ivory|boom|physical|closed teal|mast|wheel|grab|winch|verifiers)" apps/media/scripts/recreation-refinement.test.mjs
```

Raw failed diagnostic retained: review-geometry-p3-controls.log ended with this review harness's TypeError because transformed synthetic triangles omitted cached AABBs before calling the independent intersection routine. That run is partial, not a product/test failure. Added the missing synthetic AABBs only in scratch, then reran to completion in review-geometry-p3-controls-complete.log (exit 0). No failure was silently overwritten. Earlier pre-fix RED and input-drift logs retain their historical scope as documented in review-geometry-report.md.

No primary edits, commits/pushes, agents, browser/GPU/server/render, network/install/cloud operations. All authored files remain review-geometry-* scratch via apply_patch. Finite CPU probes do not certify every continuous seam point, all coplanar coincidence, CAD manufacturability, global water, visual/art quality, materials/PBR, transport or unrelated regressions.
