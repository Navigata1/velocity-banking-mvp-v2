# R1 Material and Provenance Audit

Date: 2026-10-21. Independent, bounded Mission Control Tier 2 inspection.

Reviewed branch: `codex/restoration/asset-heroes`; exact HEAD: `4320a0c24b6419910c812a644983406792a57571`; draft PR #256. HEAD and clean working tree were verified before inspection and again before writing this report.

## Verdict

Do not approve the collection as photoreal from this audit. All ten shipped GLBs decode, their recorded hashes match, and their normal/UV/material slots are present. There are two concrete material-data findings: lossy damage to Car's normal maps, and collapsed UV charts on particular House/Card/Student Loan side surfaces. Car also contains a genuinely unused image and a stale extension declaration.

The apparent Car license conflict is **not a proven false attribution**: the pinned Khronos README explicitly identifies Unity Fan's public-domain starting model, while its legal records attribute the adapted model and textures to Eric Chadwick/DGG under CC-BY-4.0. The shipped artifact retains the latter notice. Improve clarity if touching provenance, but do not relabel this derivative CC0-only.

The reported white washout, general House flatness, and small framing remain rendering/art-direction questions. This inspection establishes material inputs and actual shared renderer configuration, not their on-screen contribution. The parent owns the diagnostic lighting/frame probe and subsequent product choices.

## Scope and Method

- Read-only repository, assets, manifests, generators, installed Three.js loader/shaders, and prepared HyperFrames copies. The sole authored file is this report.
- Used existing Node packages: `@gltf-transform/core`/extensions 4.5.1, `meshoptimizer` 0.25.0, `sharp` 0.35.5, Three.js 0.185.1, and TypeScript for in-memory transpilation comparison. No generator was executed or imported.
- Awaited `MeshoptDecoder.ready`; decoded every actual public GLB with `NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder}).readBinary(bytes)`.
- Parsed each GLB JSON chunk and embedded image bufferViews. Inspected every material's factors, extensions, texture indices, UV selections/transforms, samplers, and all 90 embedded images' dimensions, channels, profiles, decoded channel ranges and normal-vector statistics. Checked every decoded primitive's finite attributes and texture-slot UV presence.
- For geometric UV checks, required nonzero world-space triangle area above `1e-12` and UV determinant magnitude below `1e-12`; counted unique mesh primitives separately from scene-node uses. World areas include node matrices; they are not pixel visibility or screen coverage.
- Compared source and shipped Car normal pixels at identical dimensions. For angular error, decoded RGB as `2*c/255-1`, multiplied XY by the material's 0.3 normal scale, normalized, and compared corresponding vectors. This is a data comparison, not a render.
- Read pinned primary Khronos files and the hash-pinned original GLB through Node HTTP GETs into memory only. No remote model was saved.
- No browser, screenshots, media generation, rendering, builds, install, server, ports, cloud/data mutation, dependency changes, commits or pushes. No diagnostic lighting/frame probe duplicated. User-reported screenshot symptoms were not independently viewed here.

## Findings

### F1 [P2] Car's lossy normal conversion measurably changes the paint signal

Location: [Car importer, line 33][car-import-33]. The unconditional `textureCompress` uses lossy WebP at quality 90 for color **and data textures**. The actual artifact corroborates this; it is not merely a suspicious recipe.

Artifact: [car.glb][car-glb], SHA-256 `15a8e84b4efa1ef896dbd244a87f065bc5da8e45ca912c3599b78f8ac56d6d11`.

- JSON `materials[10]` (`Paint 1 Carmine`) and `[9]` (`Paint 2 Carmine`) use `normalTexture.index=6`, resolving to `images[6]`, a 128x128 RGB WebP. Its SHA-256 is `0564da46fe7c025a6d2f5f0494c3a10a5c41fa859f0971dbdbca8f63acfcec5d`.
- The pinned source paint normal is `images[7]`, a 128x128 PNG, SHA-256 `3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e`.
- Pixel channel RMSE is R=26.048, G=14.820, B=14.628 on a 0-255 scale. Source decoded vector lengths range 0.9876-1.0055; shipped lengths range 0.6292-1.1739. Length error alone is not the visual argument because the shader normalizes.
- More directly, after the actual 0.3 normal scale and normalization, corresponding paint normals differ by mean **3.787 degrees**, median 3.291, p95 **8.598**, maximum 16.264. The source and shipped maps have identical dimensions, so this is not a resizing comparison.
- The importer preserves the source nearest magnification (`9728`), nearest-mipmap/linear minification (`9986`), repeating sampler, 30x30 paint tiling, and zero-clearcoat-roughness material. The pinned README lines 268-282 explains this deliberate flake/noise design. Thus noisy paint has both an inherited artistic component and proven import damage; neither establishes that lighting is innocent.
- Another concrete change: Mechanical normal `images[0]` has 13 negative-Z decoded pixels after conversion versus zero in the source. Several other source normals already have non-unit pixels, so do not attribute all imperfect normals to this importer.

Bounded proposed fix: preserve the paint normal pixel data first, using a source-preserving PNG or lossless data-map conversion; keep the other nine artifacts, geometry, posters, layout and timing unchanged. Add a pixel/angle regression against the pinned source. Any reduction of flake strength, nearest filtering, tiling, clearcoat or exposure is a separate artistic/rendering decision for the parent.

Budget: the paint PNG is 46,314 bytes versus 10,100 shipped bytes, an image-payload increase of **36,214 bytes**, before small container/JSON changes. This fits current Car and collection slack. Replacing **all seven** Car normals with their original PNGs would instead add 821,379 payload bytes and exceed both current slack limits; do not prescribe an unmeasured bulk replacement. No re-encoding or candidate artifact was produced here.

### F2 [P3] Side-surface UV charts collapse despite valid texture slots

This is not a missing-UV-attribute or whole-model flipped-normal problem. Some nonzero-area side faces have only a one-dimensional UV chart, preventing a full tangent frame and stretching albedo/roughness detail there.

| Actual artifact | Unique affected triangles | Affected scene-node uses | Localized evidence |
| --- | ---: | ---: | --- |
| [house.glb][house-glb] | 236 | 244 | Limestone extruded wall/reveal sides; 14.176% of the instantiated normal-mapped surface area, not screen pixels |
| [creditCard.glb][cc-glb] | 1,784 | 2,704 | Card/groove/chip/coin extrusion sides; 1.440% of instantiated normal-mapped area; not the large card fronts |
| [studentLoan.glb][sl-glb] | 1,040 | 1,040 | Four bow loop/tail side/cap surfaces; about 4.6-5.5% of each affected ribbon's area; broad ribbon faces retain two-dimensional UVs |

Exact examples in zero-based GLB indices:

- House `meshes[2].primitives[0]`, node `House-Facade-Left`, triangle 16: UVs `[-1.54838717,0.12903225]`, `[-0.35483873,0.12903225]`, `[-1.54838717,0.12903225]`; world area 0.02800575. Cause: [House builder, line 46][house-46] projects **all** extruded vertices onto XY, including extrusion-depth faces. Shared mesh reuse explains 236 unique versus 244 node-use triangles.
- Card `meshes[0].primitives[0]`, node `CC-Emerald-Card-Body`, triangle 72: two identical UVs `[0.06591897,0.00314336]`; world area 0.01877135. Cause: [Card builder, line 36][cc-36] likewise projects all extrusion faces onto XY. Eight chip contacts and two coin engravings reuse meshes, explaining differing totals.
- Student Loan `meshes[67].primitives[0]`, node `SL-Bow-Left-Loop`, triangle 1: UVs `[0.03125,0]`, `[0,0]`, `[0,0]`; world area 0.0000163643. Cause: [Student Loan builder, line 109][sl-109] assigns front/back depth copies identical UVs, then connects them into side faces.

These three assets have no `TANGENT` attribute. That absence is supported, not itself defective: installed Three computes a derivative frame ([normal fragment, line 30][three-frame], [frame helper, line 20][three-frame-helper]). Rank-deficient UVs cannot supply a full frame; the exact pixel result still depends on geometry normals and rasterization. Do not claim every collapsed triangle is black or entirely normal-map-free.

Bounded proposed fix: assign noncollapsed side/reveal charts in the three named geometry helpers, retaining face UV scale/orientation and material identity. Validate nonzero-area charts at the final compressed artifact, not only pre-export geometry. Fix House first if material work is selected; Card's 7,304-byte local slack makes any vertex splitting a measured decision. Student ribbon edge repair is lower priority. These localized defects do not explain an entire white Card or Medical case.

### F3 [P3] Car ships an unused image and stale material-extension metadata

Artifact JSON `images[12]` references `bufferViews[12]`: a 512x512 RGB WebP, **40,620 bytes**, SHA-256 `91528e0787ccc359eb09779d727bfa40545837d9c7a52a2bf0a2aba971f5847b`. None of the 12 glTF texture objects references image 12. All other images in the collection are referenced.

Car therefore contains **13 images but only 12 glTF texture objects**, not 13 active material textures. `extensionsUsed` also lists `KHR_materials_iridescence` although no surviving material has that extension. The pinned source has iridescence-bearing variants; the importer removes variants before its transform chain ([line 30][car-import-30]). The exact lifecycle retaining the dead image was not experimentally reproduced.

Bounded proposed fix: prune disconnected images and clean stale optional extension declarations at the final document stage, then verify the final binary's reference graph and unchanged live image hashes/materials. Recovering approximately 40.6 KB would help a normal-map repair; it will not change lighting or visual realism. Do not call the unreferenced grayscale image a remaining logo without separate evidence.

## Provenance: Car Question Resolved, Not Waived

The questioned append exists at [importer line 41][car-import-41] and in the shipped GLB's `asset.copyright`, including `Original base model: Unity Fan, CC0.` Its preceding notice still identifies the adapted asset as CC BY 4.0 and Eric Chadwick/Darmstadt Graphics Group GmbH. The imported manifest ([line 12][imported-12]) and displayed credit ([hero registry line 15][registry-15]; [turntable line 52][hf-52]) consistently identify the adapted asset as CC-BY-4.0.

Verified against revision `15cd02d304e54cb42a4db4eefe719f76190f4b68`, not a floating main-branch assumption:

| Primary pinned artifact | Relevant evidence | Bytes / SHA-256 |
| --- | --- | --- |
| [Khronos Car README][khronos-readme] | Line 38 describes Unity Fan's public-domain starting model; lines 298-300 credit DGG/Eric Chadwick for the adapted model and textures | 20,382 / `af5f76ead54a5039288924f37081d6e1fcd5ccc5b2628faedb926325a73099cd` |
| [Khronos LICENSE.md][khronos-license] | Lines 5-11 list model licensing and separate logo terms; lines 13-19 cover metadata and exclude logos/trademarks | 943 / `e11477f29eab33d1a5c9fc8534f931556faeb2e11a7fee9e4723d917fcfaee50` |
| [Khronos metadata.json][khronos-metadata] | First legal record is CC-BY-4.0, Eric Chadwick, DGG, model and textures; subsequent records cover two Khronos logos | 1,334 / `89555a6cb9dc0a4f300abe3cc6476c2d8d77c6f3f2cbde9bf790c1bd320027ed` |
| [Original CarConcept.glb][khronos-glb] | Actual fetched SHA matches the importer's pinned source SHA; embedded notice names Eric Chadwick/DGG and CC BY 4.0 | 11,778,688 / `c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b` |

Conclusion: the two attributions describe different stages of the asset's lineage. The append is potentially confusing, but the specific suspicion of an invented Unity Fan/CC0 origin is not substantiated. Optional clarification should explicitly distinguish CC0 **starting geometry** from the **adapted CC-BY-4.0 model/textures** and pin the source-page URL. Do not remove the adapted attribution or convert the manifest to CC0.

The actual output contains neither of the two blocked original/previously converted logo-image hashes nor nodes named `License Plate`/`InteriorSteeringEmblem`. Hardware/Mirror/Brake/Rim1/Rim2 have no active emissive factor. This corroborates the stated removals, but hash/name absence alone is not an exhaustive visual trademark or legal clearance.

## Actual Material Inventory

All ten GLBs use required `EXT_meshopt_compression`, `EXT_texture_webp`, and `KHR_mesh_quantization`. Personal additionally requires `EXT_mesh_gpu_instancing`. No external image/buffer URIs. All 90 embedded images decode as WebP: 89 RGB and Land leaf opacity RGBA. None carries an ICC/EXIF/orientation override. A decoder reporting `space=srgb` for an RGB file does **not** make a glTF normal or MR texture sRGB at runtime.

`C/N/MR` below means base color / tangent normal / packed metallic-roughness. MR uses **G=roughness**, **B=metallic**, multiplied by scalar factors; its R is unused unless separately assigned to occlusion. The nine original models do not bind an occlusion texture. Names such as `ORM` are not evidence that AO is applied. Effective roughness values below are decoded G means times the material factor, not rendering measurements. Factors are linear, not displayed sRGB swatches.

| Model | Material / image / active texture objects | Map sets, factors and material extensions actually inspected |
| --- | --- | --- |
| Car | 22 / 13 / 12 | Mechanical N/MR + shared AO; interior/tire/disc N; Disc/Tireside C; Dashboard emissive. Paint 1: C=(0.666,0,0), metallic=1, roughness=.25, N=.3, clearcoat=1/roughness=0. Paint 2: C=(.0378,.0378,.0378), roughness=.3, clearcoat=.25/0. Paint AO strength=0 intentionally. Glass transmission=1, metallic=0, roughness=0. Lamps/dashboard emissive strengths 2/10/3; listed iridescence has no active material. |
| Vault | 6 / 6 / 6 | Brushed/turned C/N/MR at 512. Steel/brass metal factors .96/.92; mean effective roughness .381 brushed/.276 turned; N=.16. Polished edges roughness=.16. No clearcoat, anisotropy or AO slot. |
| House | 14 / 6 / 6 | Limestone/oak C at 1024, N/MR at 256; both metallic=0, N=.24. Mean roughness .862/.609. Limestone C factor=white; oak factor=(.376,.266,.178) further tints generated oak. Roof/trim metallic=.7, roughness=.43/.33. Glazing BLEND alpha=.23, metallic=.08. Plaster/lamp emissive strengths .13/1.1. Other garden/roof surfaces are factor-only, not missing texture loads. |
| Land | 12 / 8 / 8 | Meadow C=448; soil/bark C/N/shared MR=128; leaf C+alpha=256x384, MASK cutoff=.5/double-sided; water N=128. Shared terrain MR mean roughness=.895 with metallic factors=0. N=.22; water N=.18, metallic=.28/roughness=.17/BLEND alpha=.84. No material extension beyond core PBR. |
| Credit Card | 6 / 6 / 6 | Brushed/turned C/N/MR=256. Silver factor=(.745,.768,.784), metallic=.84; emerald=(.0103,.1221,.0782), metallic=.9; roughness means .255 brushed/.231 turned. N=.08. Brushed maps tile 1x8. Anisotropy .65 silver/.5 emerald/.25 coin; emerald clearcoat .65/.22. Polymer/signature/polished edge factor-only. |
| Student Loan | 6 / 9 / 9 | Leather/cloth/paper C+MR=512, N=256; metallic=0. N=.16/.22/.12; mean roughness .646/.839/.903. Satin shares cloth but roughness factor=.5 -> .419. Leather clearcoat .12/.5; cloth/satin sheen with roughness .7/.38. Gold factor metallic=.5/roughness=.43. Leather tiles 2x2, cloth/satin 4x4. |
| Medical | 5 / 9 / 9 | Enamel/rubber/steel C/N/MR=256, tiled 2x2. Pearl C factor=(.807,.839,.807), metallic=0, effective roughness=.280, N=.09, clearcoat=.45/.19. Badge uses same enamel maps with green factor and clearcoat roughness=.18. Rubber roughness=.740, N=.15. Steel metallic=1, N=.14; polished roughness factor=.6 -> effective .240; diaphragm factor=1 -> .399. |
| Personal | 7 / 9 / 9 | Leather C=512, all N/MR and metal C=256. Leather metallic=0, roughness=.486, N=.65, tiles 2x2; cognac clearcoat=.24/.35. Brass/steel metallic=1, effective roughness=.351/.419, N=.14. Thread/paper/ink factor-only. GPU instancing is real and retained. |
| Recreation | 8 / 12 / 12 | Canvas/timber C=512; other maps=256. Paint metallic=0, roughness=.260, N=.06, clearcoat=.55/.24; white C factor=(.839,.839,.799), teal=(.0086,.0723,.0802). Timber roughness=.580/N=.18/tile2; steel metallic=1, roughness=.269/N=.1; canvas roughness=.839/N=.2/tile6. Glass BLEND alpha=.62/roughness=.14. |
| Custom | 6 / 12 / 12 | Linear steel/radial/dial/enamel C/N/MR=256. Metal factors .84/.94/.86; effective roughness .290/.269/.491; N=.18/.16/.11. Linear steel anisotropy=.38. Enamel metallic=0, roughness=.190, N=.06, clearcoat=.82/.12. Lens BLEND alpha=.12, metallic=0/roughness=.07. No measured titanium/alloy claim follows from these numerical materials. |

Every actual texture-slot UV selection exists on its primitive; Car's AO UV1 selections are available. Every decoded POSITION/NORMAL/UV/tangent/color element tested is finite. All primitive normals exist; none is zero; maximum decoded normal-length deviation across the collection is about .00601, consistent with quantization, not proof of bad lighting. All supplied tangent handedness values are valid. All 57 Car normal-mapped primitives have tangents; the other models use supported derivative tangent frames, subject to F2.

Normal-map channel checks: all nine original models have positive Z everywhere and small, deliberate XY variation. Examples: Card brushed N has R=127-128/G=125-130/B=255 with mean raw tilt .512 degrees **before** its .08 scale; Medical enamel N has R/G=125-130/B=255, mean .365 degrees before .09. House limestone N has R=122-134/G=124-132/B=254, mean 1.672 degrees before .24. These are very subtle maps, not failed decodes. Lossy MR images have small channel bleed, but nonmetal material factors are zero, so stray B values there do not turn them metallic.

Additional normal screening found some face/vertex-normal opposition in Car, tiny Vault/Diploma slivers, and a few curved ribbon/leather vertices. A blanket reversed-normal conclusion is unwarranted: some are tiny post-quantization triangles or smoothing across tight curvature; Car also retains source tangent/normal data. No whole-asset normal inversion was established. This report does not claim an exhaustive topology, self-intersection, tangent-quality or glTF Validator pass.

## Shared Lighting and Color Handling: Evidence, Not a Rendering Diagnosis

Actual web code: [HeroModelStage lines 23-38][web-stage-23]. Actual HyperFrames turntable: [lines 39-51][hf-39]. Both use ACES Filmic, exposure **1.15**, Hemisphere white/`0x414d52` intensity **2.5**, white directional key **4** at (-3,6,5), and blue-tinted rim **3** at (4,3,-4), plus the same PMREM environment. Neither stage enables a shadow map/contact-shadow pass. The web caps DPR at 1.5; the video uses DPR 1.

[Shared environment lines 6-36][studio-6] uses background `#15191c`, a 64x64 linear numerical diffusion DataTexture, five reflection cards with intensities **2.4,1.7,1,4,2.5**, and `PMREMGenerator.fromScene(studio, .025, .1, 30)`. These supply reflections in addition to direct/hemi lighting. Do not sum their intensities into an exposure proof; they have different physical/rendering roles.

The sharing is verified on disk, not merely inferred from imports:

- Both prepared `studio-environment.js` copies exactly equal a fresh **in-memory** transpilation of the shared TypeScript; SHA-256 `26d9938a6562a426f9856528f6061c5b9200627038327756a7f02290bbb69c65`.
- Both prepared `hero-turntable.js` copies also match; SHA-256 `26b89cf4fb42a8e4c16bc1f890bd1c16f50c1a48467988a2d57a98600d9af76e`.
- All ten GLBs under both `hyperframes/vendor/heroes/` and `hero-turntables/vendor/heroes/` byte-match their actual public models. Prepared Three module/core and GLTFLoader files also match installed web Three.
- Web/HyperFrames use the same [sphere-fit helper, lines 5-7][turntable-5]: FOV=32, aspect-limited half-FOV, radius/sin(half-FOV), 1.08 margin. This is framing evidence only; the parent owns undersizing diagnosis. `@gltf-transform/core` bounds are not an instancing-aware framing oracle for Personal.

No proven color-space defect: installed [GLTFLoader line 3582][loader-3582] explicitly marks base color sRGB, line 3674 does the same for emissive, and lines 3591-3592/3639 leave MR/normals as data textures. [Texture line 48][texture-48] defaults to `NoColorSpace`; [WebGLRenderer line 304][renderer-304] defaults output to sRGB. Authored hex colors were converted by Three to linear factors before export, and the loader sets those factors as linear. There is no evidence supporting a global gamma toggle or manual re-tagging of every map as sRGB.

## Artistic Gaps Versus Proven Defects

| User-reported symptom / gap | Supported interpretation | Not established by this audit |
| --- | --- | --- |
| Washed/flat white Card | High silver reflectance, low roughness, exceptionally subtle N; broad fronts have working UVs/materials | Which light/exposure/card reflection causes the white appearance; that a missing map or sRGB bug is responsible |
| Washed/flat Medical case | Pearl enamel is intentionally near-white dielectric with .45 clearcoat, .280 roughness and subtle N; black rubber/green badge remain separate correctly bound materials | A geometry/material loader defect causing whole-case whitening |
| Flat House | F2 affects extruded sides; main stone has generated albedo, high .862 roughness and independently authored subtle N; no bound AO and no stage contact shadows | That UV repair alone will recover whole-building shape/readability |
| Harsh/noisy Car paint | F1 is real; nearest sampled high-frequency flakes and sharp clearcoat are also inherited intentional design | Whether changing light balance, filtering, clearcoat or flake scale is the appropriate final aesthetic |
| Small models | Shared sphere-fit configuration exists and copies match | A layout/framing fix or approved new frame; parent probe required |
| Limited photoreal depth | Independent procedural micro-normal/roughness fields, factor-only secondary surfaces, simple alpha glass, no bound AO on original nine | That more triangles, more maps, transmission, AO or higher resolutions are automatically required or sufficient |

Optional metadata clarification: [Custom alt text, line 23][registry-23] says precision titanium, while actual material names are steel and provenance explicitly describes approximate PBR, not certified alloy/navigation equipment. Prefer a neutral brushed-metal description if the parent selects a copy change. This is unsupported descriptive specificity, not a renderer/material failure or a reason to alter the preserved poster.

## Exact Artifact Pins and Budget

Every model byte count and SHA below matches `hero-imported.json`; all nine original recipes' normalized-LF SHA pins match, and all eight separate material-source JSON pins match. All ten actual `public/heroes/<id>.webp` poster hashes/bytes match `hero-provenance.json`. Source-lineage consistency is not independent certification of generated-image ownership or measured material realism.

| Actual public GLB | Bytes | SHA-256 | Builder cap (bytes, floored) | Local byte headroom |
| --- | ---: | --- | ---: | ---: |
| [car.glb][car-glb] | 2,013,548 | `15a8e84b4efa1ef896dbd244a87f065bc5da8e45ca912c3599b78f8ac56d6d11` | 2,359,296 | 345,748 |
| [vault.glb][vault-glb] | 719,996 | `6846a098bbdd974f89101de68548e90bced312991745eae88549a3a6f9129594` | 891,289 | 171,293 |
| [house.glb][house-glb] | 1,144,500 | `fd4b44c07ba6a36e1711923874b158d02dcf75eda289836dea6dbd890360a639` | 1,310,720 | 166,220 |
| [land.glb][land-glb] | 709,260 | `4b09041fd2f952a7cddef196d9a2078360194913e1ff175ef96b89c5ff7aa3de` | 734,003 | 24,743 |
| [creditCard.glb][cc-glb] | 516,984 | `223aebb70009929f4b69829e59e8e8487d4783e90b192e076a10c570a0983a17` | 524,288 | 7,304 |
| [studentLoan.glb][sl-glb] | 715,276 | `284d956676b8b7656edb4a927de084ee4508549692e8dc859225e32a5ca18222` | 786,432 | 71,156 |
| [medical.glb][medical-glb] | 509,120 | `b6df483391ee3d552f8a128ab8327484d833754f6a907e7fa0899eca5dd6c615` | 524,288 | 15,168 |
| [personal.glb][personal-glb] | 519,844 | `e079fc7b95c562fa6180434491cf3511d54fbf79cb155bf1d89c822bafe77b79` | 524,288 | 4,444 |
| [recreation.glb][rec-glb] | 521,544 | `c7ce5658eefd0e928ea857e70ca35803e2812308032a071cdcb82412434f41a7` | 524,288 | 2,744 |
| [custom.glb][custom-glb] | 237,844 | `2753182d024be862fc7ab5e5b18100cc6a7bbcc736213471b4a6e2083517aa7b` | 524,288 | 286,444 |

Measured public tree: **25 files / 9,908,162 bytes**, of which ten GLBs use 7,607,916 bytes. Standing [public budget, lines 11-14][budget-11]: 10,485,760 bytes / 28 files; default per-file 1,310,720, Car override 2,359,296. Thus global headroom is **577,598 bytes (0.551 MiB) and three file slots**, not permission to consume them. Builder-local limits are often stricter than the generic public-file limit. Headrooms are concurrent constraints, not additive allowances. Texture GPU/mipmap memory and runtime frame cost were not measured.

## Bounded Next Decisions

1. Parent completes its existing lighting/frame probe without changing original posters, layout or engine. This audit offers input facts, not a substitute renderer verdict.
2. If asset correction is selected, isolate Car paint normal preservation and final dead-image cleanup first. Keep source/license pins, live image identities, logo exclusions, other nine artifacts and all posters protected; add data-level negative controls. Regenerate only through the existing protected publication path. Measure final bytes rather than assuming the image-payload delta is a final GLB size.
3. If UV correction is selected, use small per-model repairs: House reveals first, then tightly budgeted Card extrusion sides, with Student ribbon edges optional. Preserve front-face mappings/recognizable identity. Require final-artifact area/chart assertions and fresh visual evidence after parent choices.
4. Do not perform broad material darkening, map sRGB overrides, AO/transmission additions, triangle inflation, dependency changes or wholesale regeneration on the strength of this inspection. These would be new artistic/rendering decisions, not demonstrated fixes for F1/F2.
5. A **fresh independent final review** must inspect the parent's chosen exact-head product/assets, new evidence and protected-byte comparisons. This audit is not that review, final all-angle art approval, CI approval, merge approval or production promotion. No numerical financial-engine behavior was assessed or changed.

## Evidence References

Local link line numbers refer to reviewed HEAD. Binary findings use exact SHA plus zero-based JSON/mesh/triangle pointers because a GLB has no source line numbers.

[car-import-30]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/import-refined-car.mjs:30>
[car-import-33]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/import-refined-car.mjs:33>
[car-import-41]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/import-refined-car.mjs:41>
[house-46]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/build-refined-house.mjs:46>
[cc-36]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/build-refined-credit-card.mjs:36>
[sl-109]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/build-refined-student-loan.mjs:109>
[imported-12]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/hero-imported.json:12>
[registry-15]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/data/hero-assets.ts:15>
[registry-23]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/data/hero-assets.ts:23>
[web-stage-23]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/components/hero/HeroModelStage.tsx:23>
[hf-39]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/hero-turntables/index.html:39>
[hf-52]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/hero-turntables/index.html:52>
[studio-6]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/components/hero/studio-environment.ts:6>
[turntable-5]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/components/hero/turntable.ts:5>
[loader-3582]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/node_modules/three/examples/jsm/loaders/GLTFLoader.js:3582>
[texture-48]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/node_modules/three/src/textures/Texture.js:48>
[renderer-304]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/node_modules/three/src/renderers/WebGLRenderer.js:304>
[three-frame]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/node_modules/three/src/renderers/shaders/ShaderChunk/normal_fragment_begin.glsl.js:30>
[three-frame-helper]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/node_modules/three/src/renderers/shaders/ShaderChunk/normalmap_pars_fragment.glsl.js:20>
[budget-11]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/public-asset-budget.cjs:11>
[car-glb]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/public/heroes/car.glb>
[vault-glb]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/public/heroes/vault.glb>
[house-glb]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/public/heroes/house.glb>
[land-glb]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/public/heroes/land.glb>
[cc-glb]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/public/heroes/creditCard.glb>
[sl-glb]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/public/heroes/studentLoan.glb>
[medical-glb]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/public/heroes/medical.glb>
[personal-glb]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/public/heroes/personal.glb>
[rec-glb]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/public/heroes/recreation.glb>
[custom-glb]: <C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/public/heroes/custom.glb>
[khronos-readme]: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/15cd02d304e54cb42a4db4eefe719f76190f4b68/Models/CarConcept/README.md
[khronos-license]: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/15cd02d304e54cb42a4db4eefe719f76190f4b68/Models/CarConcept/LICENSE.md
[khronos-metadata]: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/15cd02d304e54cb42a4db4eefe719f76190f4b68/Models/CarConcept/metadata.json
[khronos-glb]: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/15cd02d304e54cb42a4db4eefe719f76190f4b68/Models/CarConcept/glTF-Binary/CarConcept.glb
