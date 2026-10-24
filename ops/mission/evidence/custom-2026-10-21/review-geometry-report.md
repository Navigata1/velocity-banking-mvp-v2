# Independent Custom Geometry Review

Date: 2026-10-21. MissionControl Tier2 independent verifier, CPU-only.

## Verdict

**Not accepted under the requested assembled true-bore / physical-clearance contract.** Two reproducible P2 geometry defects remain in the pinned candidate. No P1 found. The authored 14 tests pass unchanged; their aperture scope and clearance allowance explain why these defects remain green. This is not a claim that the static hero cannot render or that a physical device has been tested.

## Validated Artifact Findings

### G1 [P2] Surrounding skins fill the nominal hinge bores

Source: `apps/media/scripts/build-refined-custom.mjs:59-62`, especially the unrelieved cup at line 60; the case profile is at line 46. Oracle scope: `apps/media/scripts/custom-refinement.test.mjs:157-159`.

The hollow barrels are genuine hollow solids individually, but their bores are not empty in the assembled model even with the pin excluded. At author points `[-.15,.4,-.96]` and `[.15,.4,-.96]`, corresponding to the lid-parented barrels 1 and 3, both the case and lid contain the axis point. The lid also contains all five sampled barrel centers. This is occupied volume, not merely an AABB overlap or incidental skin contact.

Independent off-axis confirmation at `y=.4013,z=-.9593`: X rays from `[-1,y,z]` enter/exit case at distances `[.7770551962,1.2229261117]` and lid at `[.6889606201,1.3110335438]`. Thus solid intervals in author X are approximately `[-.222945,.222926]` and `[-.311039,.311034]`, respectively. The barrel axes at X `-.15,0,.15` lie strictly inside both. A second offset `y=.3989,z=-.9581` confirms the same occupancy. Oblique point-containment rays agree. The pin is not included in these probes.

Impact: the assembled hinge has no unobstructed bore through those spans; surrounding metal intrudes into the nominal rotating clearance. This violates the requested true-void geometry contract independently of the oversized pin in G2. It is not an objection to intentional exterior bracket/skin overlap. Parent should move/reshape the skins or create a genuine relieved hinge channel, then test the full assembly minus pin, including brackets, rather than only `ts` for each barrel.

Evidence: `review-geometry-final.log`, `PIN_AXIS_OCCUPANCY` and `BORE_OCCUPANCY_CROSSCHECK`.

### G2 [P2] Pin radius exceeds every barrel bore

Source: `apps/media/scripts/build-refined-custom.mjs:61-63`. Oracle: `apps/media/scripts/custom-refinement.test.mjs:159`.

The authored bore radius is `.024`, while the pin radius is `.0245`. The decoded artifact retains the interference. At 64 nonaligned radial rays per barrel, bore-minus-pin radial clearance ranges:

| Barrel | Minimum | Maximum |
| --- | ---: | ---: |
| 0 | -0.000505117 | -0.000499365 |
| 1 | -0.000543576 | -0.000468789 |
| 2 | -0.000505117 | -0.000499365 |
| 3 | -0.000543576 | -0.000468789 |
| 4 | -0.000505117 | -0.000499365 |

Every one of the 320 samples is negative, including the lid-parented rotating barrels. Example barrel 1 at angle `.1345976103`: bore `.0239564819`, pin `.0245000582`. The defect is explicit in source and survives quantization, not an exact-vertex ray alias. The assertion accepts it because it subtracts `.001` from the shaft radius. Parent should provide positive retained clearance accounting for polygon orientation/quantization and tighten that assertion. P2 is relative to the expressly requested physical-clearance contract; no manufacturing tolerance or device certification is inferred.

Evidence: `review-geometry-final.log`, `BORE_CLEARANCE`.

## P3 Observations And Oracle Weaknesses

- **Present shading observation, not inward geometry:** `build-refined-custom.mjs:57` produces 288 lens face-corner normal samples opposing their adjacent geometric face, worst dot `-.12812456`, after normalized-accessor decoding and inverse-transpose transformation. All triangle-center averaged normals remain outward, minimum dot `.32002798`; winding, closure and signed volume pass. The test's sum-of-three-normals check can hide this small outer-wall smoothing issue. Splitting the acute profile corner normals is a reasonable P3 follow-up, but no new rendered-lighting defect is asserted without GPU evidence. See `GLASS_NORMAL_DIAGNOSTIC`.
- **Contact tolerance false acceptance:** `custom-refinement.test.mjs:43-44` derives tolerance from whole diagonal dimensions. Two closed boxes separated vertically by `.01` are accepted. More concretely, the actual dial translated upward `.02` is still accepted by `contact(shiftedDial,case)` although independent surface distance is `.0137218086`. This is an in-memory helper mutation, not the present artifact and not a claim the entire 14-test suite would accept that mutation. The actual dial is seated. Use a small local/quantization-based gap bound rather than a wide whole-body diagonal. See `ORACLE_CONTACT_GAP` and `ORACLE_ACTUAL_FLOATING_DIAL`.
- **Endpoint-band false acceptance:** `custom-refinement.test.mjs:54` uses the terminal quarter of the rail, not its actual endpoint cap. A length-2 rail with supports at X `+/-.7`, each width `.02`, passes while each support ends `.29` before the corresponding rail tip. This does not invalidate clipping's existing rejection of a middle support; it identifies a coarser acceptance band. The actual four links have endpoints inside their intended supports, independently checked after accounting for mesh quantization transforms. See `ORACLE_ENDPOINT_COARSENESS` and `LINK_ENDPOINTS_CORRECTED`.
- Barrel-only apertures and the `-.001` pin allowance are the oracle weaknesses directly masking G1/G2, not merely hypothetical future coverage concerns.

## Checks That Did Not Produce Additional Blockers

- Read the complete pinned builder and all 186 lines of the Custom test file, plus `worker-handoff.md`. Inspected original Desktop `custom.png`, baseline JPG and existing refined pose PNG locally; no image generation, browser or render used. Approximate recreation is not exact poster/art certification.
- Decoded the actual compressed GLB. Reconstructed world transforms from parent/local TRS independently of `getWorldMatrix`; maximum matrix difference `0`. Applied per-node inverse-transpose normal matrices, including quantization scales. Manual normalized integer accessor decoding agreed with SDK decoding for 45,813 element comparisons, maximum difference `0`. Actual GPU-instancing node count is `0`; repeated tick meshes are node reuse, not GPU draw instancing. The authored synthetic GPU and nonuniform-normal controls also passed in the focused 14-test run.
- Counts independently agree: 13,200 unique / 21,160 rendered triangles, 17 meshes, 12 maps, 237,124 bytes. Actual stage minY `.0000012017`, maxY `3.2000012771`.
- Directed welded-edge closure and each connected component's signed volume checked for all rendered component nodes at author weld precision `1e-7`; no open edges, mixed winding, degenerate triangles or nonpositive components. Tested nonadjacent surface crossings on all 17 unique meshes; none found within the limitations below. Individual smooth normal exception is reported separately above.
- Decoded UVs are normalized uint16 with range `[0,1]`; no nondegenerate textured triangle has a collapsed UV determinant. Original side-face collapse is absent. The smallest per-mesh UV determinant in the retained summaries is about `.0001300`, far above the `1e-12` collapse threshold. No glass UV is required because glass has no texture.
- Case has a retained center floor around Y `.120006` and a raised rim; lid has a real floor `.015008`, outer back `.059992` and lower-facing cup rim around `-.04494`. Twelve nonaligned rim sections and closed volume confirm cup concavity rather than stacked open skins.
- Eight rose lobes confirmed using 256 nonaligned section rays. All 60 ticks independently intersect the dial at seated Y `.261999-.276001`, centers radius `.777`. Axle intersects dial and pivot; both needles intersect axle/pivot within the clipped hub region, not just along their long faces.
- Lens samples cover 6,240 needle/pivot vertices and triangle centers; minimum actual sampled lower-lens separation `.0129888783`. Conservative full-AABB Y separation is `.00400618` above pivot and `.02900515` above north needle. Rose/needle minimum distances `.01300455` / `.01300822`. No needle/needle crossing outside radius `.133`; their shared root wall is inside the common hub and not classified as a collision defect.
- Case/lid surface crossings (122 triangle pairs) all stay within radial distance `.0565` of hinge axis `[x,.4,-.96]` and within the intended overall hinge X envelope. No away-from-hinge crossing was found. These crossings are not separately promoted to P2; G1 concerns occupied bore volume specifically.
- Four actual bracket endpoint cap centers are inside intended skin/barrel supports. Lug genuinely intersects case and bail. The bail's assembled central aperture remains empty for 109 grid rays including the lug; intentional lug/bail surface overlap is attachment, not an unattached ring or a new physical-threading certification.

## Identity And Reproduction

HEAD before/after: `8e2f25ef6b81ffc65b9f96644170834c511078d3`.

| File | Bytes | Raw SHA-256 before and after |
| --- | ---: | --- |
| `apps/web/public/heroes/custom.glb` | 237124 | `45129c97f6177442f9381fa56683c3c7c117b1e928235f66295f665113948c7b` |
| `apps/media/scripts/build-refined-custom.mjs` | 13356 | `9fff1a7c8ab02f7e1aab67438731a7d22469ff2b266f4f08c6852fc9d3593e17` |
| `apps/media/scripts/custom-refinement.test.mjs` | 30949 | `435156a825ef814c2114e75a48c8cc139678d5d65db6ec06e097cde49e74dcc5` |
| `apps/media/sources/custom/materials.json` | 1248 | `26ab2c71429e558b26a4108802e785088ce7e1cc231ea89db6e0ad4ed5531532` |

Node `v22.22.2`. Commands from repo root, no child process spawned by these scripts:

```powershell
git rev-parse HEAD
git status --short
Get-FileHash apps/web/public/heroes/custom.glb,apps/media/scripts/build-refined-custom.mjs,apps/media/scripts/custom-refinement.test.mjs,apps/media/sources/custom/materials.json -Algorithm SHA256
node .superpowers/sdd/2026-10-21-custom/review-geometry-probe.mjs
node .superpowers/sdd/2026-10-21-custom/review-geometry-supplement.mjs
node .superpowers/sdd/2026-10-21-custom/review-geometry-controls.mjs
node --experimental-test-isolation=none --test apps/media/scripts/custom-refinement.test.mjs
```

Raw logs retained alongside this report:

- `review-geometry-final.log`: final independent geometry, all-unique self-intersection sweep, assembly occupancy and adversarial helper mutations; exit 0. Probe exit 0 means diagnostics completed, not geometry acceptance.
- `review-geometry-controls.log`: independent intersection positive/negative controls, decoder comparison, seating, coverage and void probes; exit 0.
- `review-geometry-authored-tests.log`: fresh focused run, 14 pass / 0 fail / 0 skip, duration 6598.3875ms, exit 0. No duplicated full media runner.
- `review-geometry-diagnostic-initial.log`: first supplemental diagnostic retained unedited. Its `LINK_ENDPOINTS` used pre-quantization local endpoints incorrectly; final `LINK_ENDPOINTS_CORRECTED` derives actual endpoint caps. Its `NEEDLES_OUTSIDE_HUB` accidentally failed to filter coplanar overlaps; final corrected result is zero. Its UV range was raw integer `[0,65535]`, corrected decoded range is `[0,1]`. None is promoted as an artifact defect. Empty diagnostic bounds serialize infinities as JSON null; those are not GLB NaNs.
- `review-geometry-pins-final.log`: final HEAD, primary pins, manifest hashes, dirty-tree snapshot and retained historical log tails.

Existing initial 14-RED `worker-final-red.tap.log`, first-contract UV failure `first-contracts.log`, and seam diagnostic `diagnose-first.log/.mjs` were read/preserved, never rewritten. Historical parent `media-contracts.log` reports 143/143 green; it was not rerun by this verifier. Circular section probes intentionally use nonaligned rays and do not reintroduce the known exact-vertex seam rejection.

## Limits And Scope

Finite CPU evidence, not exhaustive geometric or continuous-motion proof. Self checks exclude triangle pairs sharing welded vertices; adjacent folds or sub-tolerance features can escape. Triangle crossing probes and finite void rays are not exact robust predicates or a Boolean solid solver. Point occupancy was crosschecked with offset axial intervals, but no arbitrary-motion hinge sweep, CSG reconstruction or manufacture/contact mechanics was attempted. Coverage samples do not prove all possible lens interpolation or refractive behavior. No GPU, draw-call, shader-lighting or browser certification.

Only scratch files named `review-geometry-*` were written, only via `apply_patch`. No product edits, asset writes, installs, network, browser, GPU, server, renders, child spawns, commits or pushes. External documentation edits appeared during review; they were left untouched. Financial/native/UI/studio/camera/timing behavior was not re-audited or modified. No legal, CAD, navigation, final-art, device or transport certification. Parent owns fixes, rebuild, re-pinning, QA and transport.
