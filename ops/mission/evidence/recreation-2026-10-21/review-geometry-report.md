# Independent Recreation Geometry Refutation

## Verdict
No remaining P1/P2 found in the bounded CPU geometry scope on the final pinned candidate. The initially confirmed P2 (boom, mainsail foot, jib and jib sheet crossing cabin geometry) is independently cleared after the parent's rig-height/routing fix. This is not visual/art approval, manufacturing certification, or an assertion that the standing suite alone proves geometry quality.

## Final Inputs
Baseline HEAD: a162c10c4ad9590ffcd12dbbffe189d6371d5e52. Final bytes and hashes were reread after all probes.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| apps/web/public/heroes/recreation.glb | 521060 | d21f57de6792d5af53d575e2c6d2c9aa27bd8d1b944a00544a9cb3229fa97a0d |
| apps/media/scripts/build-refined-recreation.mjs | 20252 | 7f9d61b7c2a490450857fcf6562ae51d5ee966e427c9489d888fca72204c82b0 |
| apps/media/scripts/recreation-refinement.test.mjs | 34461 | 34e4fe99b5d9f612e5a7f53c1798e1f16150b9a2d8c85cfb55062142fce900d8 |
| apps/media/sources/recreation/materials.json | not a geometry input | 6b5776151c1b052c82e4a408b81be0e72a3047ec1392b0492a3b9f38a0bcac04 |

Original audited GLB: 501456 bytes, 84e463c9f477aa7c1dae9be705198d3df198327f9dd98b5af5abba60e8483176. Original builder: 20204 bytes, 59b21beb85fa14bb504caf04650fa25526512e2da291faa82525d2950c53e0c4. Original test: fc7be50cd2cb293efbbd73761ee5e95cc03347997da688c172df379d9388a7c2.

Material-only intermediate: GLB 520948 bytes, 6aab14611026767374e76e4bbc36200d2197c1a2d6545f0ebeb97ccc122b7173; builder 20252 bytes, 5a36c2b119a4df1b3fa6d3d3a12e2499383f6ef284210268e445e9aea4c0003f. Decoded geometry comparison with original was EXACT across all 109 scene nodes, hierarchy, local/world transforms, normalized positions/normals/UVs, indices, modes and GPU-instance attributes: aggregate 97a042a9c8a8299484fe5d7e5072896e702aaea8ea377548dc55699756c1fed4. Reversing only the four material statements reproduced the original builder's exact hash. See review-geometry-stream-compare.log.

Final scope comparison: seven intended rig nodes changed (boom, both sails, both seam meshes, both sheets). Another change is automatic yacht-root X recentering by 0.0008027387776212147; this propagates into every descendant world matrix. The remaining 101 nodes' local matrices, hierarchy and decoded primitive streams are exact matches. Final canonical geometry aggregate: 8cad41aaeb9f53366c652cece30b46dca0fec446bab227ab1859a4e439f0dcf3. See review-geometry-stream-verified-final.log. No assumption of unchanged geometry after the rig fix was made.

## Cleared P2: Roof Penetration
Builder lines 60, 70, 90-95 were the relevant placements. On the original/intermediate geometry, bounded triangle intersections established unintended crossings, distinct from the intended mast/roof root:

- At X=0, Z=0 the roof occupied Y=1.0995011..1.1444989 while the boom occupied Y=1.0879962..1.1320038. The boom centerline exited the aft roof boundary at X=0.5781356, so 0.8981356 of its 1.57 span ran inside roof volume, not merely a loose AABB overlap.
- Mainsail/roof intersections were recorded. Its foot left the roof at X=0.5797903, Y=1.13.
- Jib/roof intersection witness: (-0.7326561, 1.1413294, -0.0087737). Jib sheet crossed roof near (-0.5946684, 1.1144945, -0.3300048), and the starboard cabin wall near (-0.6018101, 1.1120094, -0.3362089).

On final d21f57, clipping each decoded triangle to the roof's XZ bounding envelope establishes conservative positive vertical separation, stronger than just no detected edge crossings:

| Part | Guaranteed vertical gap over roof envelope |
| --- | ---: |
| Boom | 0.1034973 |
| Mainsail | 0.1455011 |
| Jib | 0.0607970 |
| Jib sheet | 0.1383164 |
| Main sheet | Entirely outside roof XZ envelope |

Actual finite crossings still establish boom/mast, main/mast, main/boom, jib/forestay, each sheet/sail-or-boom and each sheet/its winch-drum contact. Lowering the actual decoded boom by 0.16 in memory restores roof crossings; restoring its transform returns to clearance. Evidence: review-geometry-clearance-final.log, review-geometry-focused-material-snapshot.log, review-geometry-detail-oldpin.log. Product assets were never modified by these probes.

## Topology, Apertures And Attachments
- All 25112 expanded scene triangles were independently decoded with normalized accessors and local/world transforms. No actual GPU instances occur in this candidate; fixtures exercise GPU TRS expansion and inverse-transpose normals.
- Every intended closed mesh component has closed directed two-manifold edges, positive signed volume, no degenerate triangles, and no face-winding/stored-normal disagreement. Seam, sheet and lifeline tubes have deliberately uncapped ends; no closed-solid assertion was applied to them.
- Hull: V=2706, E=8112, F=5408, Euler characteristic 2; inward cavity/outward exterior normals checked with bounded sections. Deck: V=708, E=2124, F=1416, Euler 0 (one actual through-aperture). Each cabin side: V=600, E=1806, F=1204, Euler -2 (two through-apertures). Nine cockpit rays reach the recessed floor through no deck infill; all four window centers pass through wall apertures and strike the fitted panes.
- Both sails: V=462, E=1380, F=920, Euler 2, one closed outward component each. Vertical sections at both skins' face centers give two skins with 0.005 separation within 0.0001, and no sampled failed section. Edge strips participate in the directed closure.
- Strict noncoplanar self-crossing sweep over hull, deck, both cabin walls, keel, rudder and both sails: 33249 AABB-qualified nonadjacent triangle-pair candidates, no strict interior crossings found. Shared-vertex pairs, tangent joins and coplanar coincidence are excluded, not falsely labeled defects.
- All four actual cockpit walls individually contact both deck and floor. Seat supports contact floor/seats. Each of eight wheel spokes independently contacts rim and shaft; shaft contacts pedestal; pedestal contacts floor. Lack of direct rim/shaft contact is expected, since spokes connect them.
- Four standing stays have reconstructed opposite cap centers at their actual mast and deck/chainplate ends. Each actual stay has finite surface crossings with mast, deck and chainplate; no endpoint conclusion relies on an unbounded ray or midpoint alone.
- Keel and rudder have finite hull-root crossings and closed outward geometry. Keel bulb contacts keel. Mast/roof root, hull/deck rim and these structural joins were treated as intentional.

Evidence: review-geometry-all-final.log, review-geometry-topology-final.log, review-geometry-detail-final.log.

## Thread-Scale Refutation
All 250 decoded thread ring centers (25 per path) and all 20 terminal cross-section centers were measured against the actual closed sail triangles. Values below are nearest-surface distances in yacht author units, not world stage units. Full per-ring coordinates, radii and distances are retained in review-geometry-focused-final.log.

| Path | All ring-center distance range | First end center | Last end center |
| --- | ---: | ---: | ---: |
| Main 1 | 0.0011382-0.0020258 | 0.0011630 | 0.0011382 |
| Main 2 | 0.0009556-0.0024357 | 0.0014427 | 0.0013706 |
| Main 3 | 0.0010527-0.0021109 | 0.0014777 | 0.0013990 |
| Main 4 | 0.0011115-0.0021025 | 0.0020682 | 0.0019957 |
| Main 5 | 0.0011543-0.0024586 | 0.0016293 | 0.0016227 |
| Jib 1 | 0.0010881-0.0018012 | 0.0010881 | 0.0011193 |
| Jib 2 | 0.0009351-0.0020596 | 0.0012415 | 0.0013209 |
| Jib 3 | 0.0010505-0.0018500 | 0.0012495 | 0.0013628 |
| Jib 4 | 0.0010597-0.0018395 | 0.0017214 | 0.0017763 |
| Jib 5 | 0.0011040-0.0020767 | 0.0014626 | 0.0014772 |

Decoded radii range 0.0027941..0.0028218. Every ring center is on the exterior side and closer to its surface than its own ring radius. Centers being exterior is expected for raised thread; some ring vertices inside the cloth are expected contact, not a burial finding. In addition, 97 actual section planes per path (all rings plus quarter/mid/three-quarter interval planes) reconstruct the decoded thread polygons: all 970 sections include both interior-side and exterior-side surface samples. No sampled detached or fully buried section. All ten paths have actual bounded sail/thread triangle crossings. Terminal sections are included; the mesh tubes themselves do not contain endcap faces, so no closed/thread-volume assertion is made.

This is finite geometric sampling, not a proof of continuous attachment at every real number along the strand. Nearest-triangle signed distances target closed oriented sail shells, never parity against open cloth/tube skins.

## Nonblocking Findings And Helper Limits
P3: Standing seam tolerance is too broad to certify thread contact (test lines 216-221). Mutating either actual seam node by +0.006 Z is still accepted by the current standing seam test. On the final meshes minimum sampled vertex gaps become 0.0037447 (main) / 0.0037186 (jib), and maxima 0.0111176 / 0.0107723. These are deliberate detached mutations, not defects of the unmodified seams. A radius-scale section/contact verifier would catch this. The whole-object 0.8% verifier alone must not be used as evidence of thread attachment.

The stronger detached-mutation control also finds zero actual bounded triangle crossings and positive minimum ring-center-distance-minus-radius of 0.0033698 (main) / 0.0032563 (jib). The mutation is therefore not inferred from vertex distance alone. See review-geometry-controls-confirmed-final.log (exit 0, all ten helper controls pass).

P3: Small hardware support gaps remain, below this review's P2 threshold. Builder line 63 creates two straight 0.95-long grab rails with no standoffs: decoded lowest Y=1.1579970 vs roof top 1.1444989, a 0.0134982 air gap (1.5 rail radii). Nearby geometry union probes found no alternate rail support. Builder line 100 starts both winch bases at Y=0.87 vs deck top 0.8609824, a 0.0090176 gap. Add/seat the supports as a later local polish task. These observations do not invalidate the confirmed sheet-to-drum or standing-stay anchor contacts.

Helper validity: actual helper source was parsed and evaluated with independent fixtures. True finite edge crossings pass; coplanar separated triangles with overlapping AABBs, nested solids, nested open skins and unbounded ray-extension contacts reject; a missing triangle and wholly reversed closed winding reject; normalized accessors, inverse-transpose normals and GPU scale/rotation/translation fixtures pass. Aggregate positive volume can still hide an oppositely oriented disconnected closed component. Independent per-component volume checks found no such actual candidate defect. Proper-crossing alone also cannot rule out total containment; the final roof-envelope clearance probe removes that ambiguity for the audited parts.

## Verification And Raw Failures
Fresh current standing geometry subset: 10/10 PASS, exit 0; not a rerun or claim of the entire 13/127 suite. Material, PBR, publication/transport and other app regression gates remain with the parent/other reviewer.

Reproduce from repository root, no rendering or network:

```powershell
node .superpowers/sdd/2026-10-21-recreation/review-geometry-probe.mjs
node .superpowers/sdd/2026-10-21-recreation/review-geometry-detail.mjs
node .superpowers/sdd/2026-10-21-recreation/review-geometry-topology.mjs
node .superpowers/sdd/2026-10-21-recreation/review-geometry-focused.mjs
node .superpowers/sdd/2026-10-21-recreation/review-geometry-controls.mjs
node .superpowers/sdd/2026-10-21-recreation/review-geometry-clearance-final.mjs
node .superpowers/sdd/2026-10-21-recreation/review-geometry-stream-compare.mjs --final-fix --summary
node --test --test-name-pattern="Recreation (hull|timber|cabin|two ivory|boom|physical|closed teal|mast|wheel|verifiers)" apps/media/scripts/recreation-refinement.test.mjs
```

Raw diagnostic failures are retained, not silently replaced:
- review-geometry-controls.log contains the genuine before-fix roof-clearance assertion RED, caught so unrelated controls continue. Final controls log passes actual decoded centerline clearance.
- review-geometry-focused-before-fix.log: source/test changed while original GLB was still live; hash guard stopped before geometry evaluation. review-geometry-focused-before-fix-second.log: GLB also changed; again stopped. Neither is a candidate geometry failure.
- review-geometry-stream-compare-mirror-drift-failed.log and review-geometry-stream-final-mirror-drift-failed.log: parent refreshed mutable vendor mirrors during comparison. Hash guards rejected them. Material comparison was completed against another exact-hash original, and final comparison uses the saved, hash-checked prior decoded-stream manifest, not a mutable mirror.
- review-geometry-stream-final.log: overstrong exact-world-matrix assertion failed after the intentional root recenter propagated to descendants. review-geometry-stream-author-frame-final.log diagnoses the cause; review-geometry-stream-verified-final.log enforces the correct seven-part plus root-recentering scope.
- A single exact-axis hull ray at X=0.3, Z=0 misses one shared-edge hit due to numerical edge incidence. Eight bounded 0.00001 perturbations recover both skins; directed topology closes. Retained in topology/focused logs; not labeled a hull hole.

Only review-geometry-* scratch files were authored, through apply_patch. No primary edits, commit/push, agents, browser/GPU/server/render, network/install/cloud operation. No CAD/manufacturing or continuous collision certification; no photorealism, global water or art judgment.
