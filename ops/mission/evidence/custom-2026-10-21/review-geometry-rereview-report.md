# Final Exact-Pin Geometry Re-review

2026-10-21. MissionControl Tier2 independent geometry verification, CPU-only.

## Verdict

**G1, G2 and all three original P3 items are resolved on the supplied final pins. No new actionable P1/P2/P3 finding was validated in this bounded re-review.** This accepts the requested static geometry review scope, not downstream art, browser, GPU, package or transport gates. The initial `review-geometry-report.md` and its logs remain historical, unchanged, and apply only to candidate `45129c...`.

## Final Identity

HEAD before/after: `8e2f25ef6b81ffc65b9f96644170834c511078d3`.

| File | Bytes | SHA-256 verified before/after |
| --- | ---: | --- |
| `apps/web/public/heroes/custom.glb` | 237844 | `2753182d024be862fc7ab5e5b18100cc6a7bbcc736213471b4a6e2083517aa7b` |
| `apps/media/scripts/build-refined-custom.mjs` | 13785 | `2e21fb5c03e55d4649184d7362fe3df73efee9ac2b76395fd9796c3a948c5040` |
| `apps/media/scripts/custom-refinement.test.mjs` | 34076 | `26c50474ca83b358d7bd18481b73a3f2f703ed921e6cdd29d45e07b4d27c460c` |
| `apps/media/sources/custom/materials.json` | 1248 | `26ab2c71429e558b26a4108802e785088ce7e1cc231ea89db6e0ad4ed5531532` |

Independent decoded counts: **13200 unique / 21240 rendered triangles; 17 meshes; 12 maps; 0 GPU-instancing nodes**. Repeated bracket/tick mesh nodes are not GPU draw instancing. The extra central case bracket adds 80 rendered triangles without increasing unique triangle count. Stage minY `.00000111796`, maxY `3.20000118813`.

## Findings Closed

### G1: Assembled Shaft Channel

Builder lines 61-67 now place the actual common axis at `[0,.5,-1.06]`, move the cup center to local Z `1.06`, use external anchors, and supply the third central case bracket.

- Independently reconstructed lid origin and decoded pin center coincide with that common axis to floating-point precision.
- **453** independent axial rays through the full assembly minus pin pass without hits: dense disk plus four nonaligned radial circles, reaching radius `.0234` around the shaft. This includes all skins, brackets, barrels and other rendered mesh nodes, not barrel-only apertures.
- Pin vs case, lid and all five brackets: **zero triangle crossing pairs and zero contained pin-triangle-center samples**. Three-direction point occupancy also places all five shaft-axis centers outside case/lid solids.
- No case/lid surface crossings remain, even before an intended-join exclusion.
- All five actual terminal bracket caps meet the proper skin/barrel supports. Independently measured cap centers agree with source endpoints within `2e-5` author units. Case caps are seated in their intended supports; lid-to-barrel cap surfaces genuinely intersect each barrel (11 cap crossing pairs each), even though those two cap centers sit just outside the barrel material. This is real terminal-cap contact, not quarter-span contact.

Evidence: `review-geometry-rereview-final.log`: `HINGE_FRAME`, `ASSEMBLED_CHANNEL`, `SHAFT_SKIN_BRACKET`, `AXIS_OCCUPANCY`, `EXACT_ENDPOINT_CAPS`.

### G2: Positive Pin/Bore Clearance

Builder line 65 now uses pin radius `.021` vs barrel bore `.024`. Independent 64 nonaligned radial rays per barrel, 320 total, find:

| Barrel | Minimum clearance | Maximum clearance |
| --- | ---: | ---: |
| 0 | .002993059 | .003004232 |
| 1 | .002959730 | .003030572 |
| 2 | .002993059 | .003004232 |
| 3 | .002959730 | .003030572 |
| 4 | .002993059 | .003004232 |

All are positive and exceed the new `.0015` requirement. Existing hollow-barrel closure/positive volume and pin traversal also pass. This is decoded artifact evidence, not just comparison of source radii.

### Original P3 Items

- **Whole-bounds contact tolerance:** helper line 43 uses local minimum dimensions and a `.00025` ceiling. Independent replay rejects the exact original wide-box gap fixture, thin-wide boxes with a `.01` gap, and the actual dial lifted `.02`. Actual surface-contact positive controls still pass. No present artifact detachment found.
- **Quarter-endpoint acceptance:** helper lines 53-58 now selects actual opposing cap faces, not terminal quarters. The original `.29` inset support fixture rejects. An open-support fixture cannot exploit the buried-cap parity fallback: it rejects, while closed-support buried-endpoint and actual contact controls pass. Solid validation precedes fallback parity. Actual five-link cap checks independently pass as described above.
- **Lens corner normals:** builder lines 25-34 and 59 split the profile corner normals. Independent inverse-transpose-normal checking over every rendered face corner finds **0 opposing samples**; glass minimum face/corner dot is **.9990426169**, formerly `-.12812456`. The new individual-corner assertion passes without the old three-normal averaging escape.

## Lens Seam Diagnostic

The retained parent `diagnose-lens.log` is consistent with the independent result: **12** raw exact vertical-ray misses on shared projected triangle seams, all resolving to two hits after X/Z perturbations of `1e-7` / `2e-7`. These are numerical ray-alias diagnostics, not holes or a clearance defect.

The new authored projected-section helper was crosschecked against an independent plane-intersection plus signed-edge-containment implementation. Diagonal seam, slab edge, slab corner, just-outside and outside controls agree. For **6240** needle/pivot vertex/triangle-center samples, both implementations return two distinct lens levels, with minimum lower-lens separation **.0129888783**, exceeding `.002` throughout. Conservative whole-box Y separation is `.0040061824` above pivot and `.0290051458` above north needle. No exact-seam false alarm is reintroduced; no model change was made by the verifier.

## Other Geometry And Scope

- Read the entire final builder and Custom test file plus retained RED and seam evidence. Source/local parent-chain reconstruction agrees with SDK world matrices exactly (`matrixError:0`). All **46857** independently decoded accessor element comparisons agree with normalized SDK values (`decodeError:0`), including quantized positions/normals/UVs.
- All rendered node components have closed directed welded edges, positive per-connected-component volume, no degenerate triangles, no collapsed textured UV triangles and no inward corner normals at the stated thresholds. All 17 unique meshes have zero detected nonadjacent self-intersection pairs. No needle/needle crossing outside the common radius `.133` hub; lens/needle/pivot and rose/needle crossing checks remain clear. Intentional root/lug/bail contact is not promoted to a collision bug.
- The actual cup retains distinct floor/back around `.015008/.059992`, and the case retains its central floor around `.120006`; no open stacked skins introduced. The focused tests retain dial seating, 60 radial seated ticks, raised eight-lobe rose, axle/root contacts, bail aperture, map integrity, size caps and locked-publication controls.
- Exact prior-source reconstruction was performed **in memory only**, replacing only the final `turned()` function and glass-through-hinge block with their prior definitions. Result hashes to the original reviewed builder `9fff1a7c8ab02f7e1aab67438731a7d22469ff2b266f4f08c6852fc9d3593e17`. Thus the builder delta is limited to split lens normals, cup/hinge placement, smaller pin and bracket anchors/count. The material/map generator and everything from `const lug` onward, including staging/publication, are text-identical to the original reviewed builder. Config hash is unchanged. No before/after texture-byte equality claim is needed for this source-scope result.
- Tracked diff paths inspected are the Custom GLB, two manifests and asset documentation. Builder/test/config remain the expected new Custom files. No financial/native/UI/studio/camera/timing application-code diff appeared in the inspected working-tree scope. This is a scope check, not a new behavior audit of those systems.

## Reproduction And Evidence

Commands from repository root (Node v22.22.2):

```powershell
node .superpowers/sdd/2026-10-21-custom/review-geometry-rereview-core.mjs
node .superpowers/sdd/2026-10-21-custom/review-geometry-rereview.mjs
node --experimental-test-isolation=none --test apps/media/scripts/custom-refinement.test.mjs
git rev-parse HEAD
git diff --name-only
Get-FileHash apps/web/public/heroes/custom.glb,apps/media/scripts/build-refined-custom.mjs,apps/media/scripts/custom-refinement.test.mjs,apps/media/sources/custom/materials.json -Algorithm SHA256
```

- `review-geometry-rereview-final.log`: complete final independent run including imported core diagnostics, exact pins, helper counterexamples, projection controls and source-scope hash reconstruction; exit 0.
- `review-geometry-rereview-tests.log`: fresh focused run, **16 pass / 0 fail / 0 skip**, exit 0, duration **15675.1767ms**. No full-media runner or child-process test isolation.
- `review-geometry-rereview-pins.log`: final identity and dirty-tree scope snapshot.
- `review-geometry-rereview-diagnostic.log`: first re-review diagnostic retained. It incorrectly required every cap center to be inside a support, rejecting real peripheral cap/barrel contact on a lid link. Final probe uses actual terminal-cap intersections or validated closed-volume center seating; the unchanged artifact has 11 real terminal-cap/barrel crossing pairs at each lid root. This was a verifier-condition error, not an artifact defect, and no primary edit occurred between runs.

Parent historical `assembled-hinge-red.log` contains two genuine failing new hinge cases; `p3-oracles-normals-red.log` contains the three genuine failing regression controls. Both were read and left unchanged. No initial report/log was overwritten.

## Finite-Proof Limits

The result is bounded static CPU evidence on these exact pins. Grid/radial rays do not prove all void points; crossing predicates are floating-point rather than exact CSG predicates. Self checks omit pairs sharing welded vertices and can miss adjacent folds or sub-tolerance features. Closed directed edges/positive volume alone do not establish a universal valid-solid or nonoverlapping-union theorem for arbitrary future helper fixtures. Cap-axis inference is appropriate for the present rods/boxes, not an arbitrary-shape endpoint specification. Multi-ray parity and projected-edge tolerances are finite numerical oracles, not CAD certification. No continuous hinge motion or all-rotation collision sweep was performed.

Only new own `review-geometry-*` scratch files were written via `apply_patch`; old reports and logs were preserved. No primary edits, asset writes, installs, network, browser, GPU, server, render, child spawn, commit or push. No legal, CAD, navigation, final-art, device or transport certification. Parent owns refreshed video/full-media/all-model/browser/protected-package verification and transport after this geometry freeze.
