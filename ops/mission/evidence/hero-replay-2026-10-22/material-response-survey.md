# Car / Credit Card Material Response Survey

CPU-only independent sidecar. Snapshot: **2026-10-22T00:31:28.598Z**.
Workspace: `C:/Users/IslandDevCrew/Documents/Interest Shield`.
Pinned head: `462a218342dfa95343bde6882546e99e882e5c99`.

## Decision Summary

- **Car:** The visible flake pattern has a concrete authored source: a byte-preserved, nearest-filtered 128px normal tiled 30 x 30, with about 6.08 degrees mean local normal tilt at the delivered strength. Fully metallic red paint, an extremely smooth separate clearcoat and the current bright studio plausibly amplify it. This is not evidence that the repaired paint PNG is still lossy or corrupt.
- **Card:** The delivered surface detail is genuinely very weak: brushed normal tilt averages 0.041 degrees, albedo has only three RGB levels, and roughness varies little. Broad gray faces are compatible with those maps, planar geometry, partial metalness, broad reflections and strong anisotropy. Missing textures, reversed roughness channels and a gamma mistake are **not demonstrated** by this inspection.
- **Next evidence, not approval:** Consider one Car normal-strength A/B and one Card silver-anisotropy A/B, described below. Neither experiment was run. Neither requires changing asset bytes, geometry, source texture payloads, posters, shared production lighting or replay code.
- These are material-response findings, **not an art-approval, photorealism, hardware-compatibility or production verdict**. The parent chooses whether and when to render an experiment.

## Boundary And Method

Read repository `AGENTS.md` and the web-3D asset pipeline skill plus relevant asset/Three.js/loading references. Used existing `@gltf-transform/core` NodeIO `binaryToJSON` and `readBinary`, registered extensions and MeshoptDecoder; sharp decoded embedded images. No hand-written GLB parser. No downloaded source, network, new dependency, browser, GPU, server, build, render, test suite, commit, other agent or history fork.

Authored files are confined to this ignored directory: this report, `material-inspect.mjs`, and generated `material-survey.json`. Nothing in tracked application code or assets was changed by this sidecar. The parent subsequently began modifying `HeroModelStage.tsx` and `smoke-heroes.cjs`; those changes are not ours. Replay implementation was not reviewed or duplicated. In HeroModelStage, only the renderer/environment/light setup was examined; its entire raw byte stream was hashed for snapshot identity, not semantically inspected.

The JSON is the detailed evidence ledger: raw material JSON, samplers, image byte/RGB hashes, channel statistics, primitive attribute availability, source-file hashes, twenty public GLB/poster comparisons against `git show 462a218:<path>`, vendor-copy hashes, public budget and baseline-image identity. Existing contract text is historical context, not a newly executed verification claim.

Reproduce the CPU ledger from the workspace root, without running builders:

```powershell
node .superpowers/sdd/2026-10-22-hero-replay/material-inspect.mjs
```

This prints JSON to stdout and writes no files itself. Its only child processes are read-only `git rev-parse` and `git show`. The saved JSON is a dated snapshot; rerunning prints a new timestamp and may observe parent source edits.

## Frozen Assets And Budgets

All **20/20** public GLBs/default posters equal the bytes at `462a218`, not just their manifest labels. Both Car and Card GLBs also match their `hero-imported.json` hashes and the copies in both `hero-turntables/vendor/` and `hyperframes/vendor/`.

| Asset | Bytes | Cap | Room | Meshes / unique-mesh triangles |
| --- | ---: | ---: | ---: | --- |
| Car GLB | 2,232,520 | 2,359,296 (2.25 MiB) | 126,776 | 95 / 134,971 |
| Credit Card GLB | 523,764 | 524,288 (0.5 MiB) | **524** | 11 / 18,008 |
| Entire `apps/web/public/` | 10,143,326 | 10,485,760 (10 MiB) | 342,434 | Actual recursive file-size sum |

Aggregate room does not relax Card's per-model limit. No tangent buffers, extra images, geometry, higher resolutions or replacement GLBs fit by assumption. Even scalar reserialization must be measured before any future publication; preserving the original file bytes is simpler for diagnostic renders.

## Actual Baseline Images

Viewed the full existing 1920 x 1080 PNGs, not screenshots of posters. Car at 0 and 4 shows dense red sparkle, bright fender/edge hotspots and very dark lower panels. Card at 0 shows a broad nearly uniform gray silver card/coin with bright narrow edges; at 4, emerald has a broad dark-to-green response and the rear silver remains broadly gray. Grooves and back panels are visible, so these are not merely featureless flat planes. "Blown" here describes appearance; no radiometric clipping measurement was performed.

| File under `apps/media/hyperframes/output/heroes/` | Bytes | SHA-256 |
| --- | ---: | --- |
| `car-0.png` | 669,872 | `f4c60aae817ea33f2a09bd1fafc2ac73828c73537b4b65806713e13b8ce926fe` |
| `car-4.png` | 672,178 | `0b7a1d08026586f7f7ce5fc0556fb10a1c9654049fb9e46569acc3c1513e474c` |
| `creditCard-0.png` | 166,250 | `64887f213c677530648b8952269c91ba1b4467bc276cce1e15c9ce7e600d184c` |
| `creditCard-4.png` | 107,710 | `5e1d14a8d071d3cfc913deec878e4f9d549589d47e158f5f0344ec8a1b249583` |

Their mtimes are 2026-10-21T23:57:02.891Z through 23:57:06.398Z. Mtime, matching current vendor inputs and current consumer code are not a signed render chain of custody. The PNGs do not establish their GPU/driver or rendering backend. They were not regenerated here, and two stills cannot demonstrate temporal shimmer or all-angle quality.

## Shared Studio And Consumer State

`apps/web/src/components/hero/studio-environment.ts:4` creates a reflection-only scene with background `#15191c`. It is **not an HDR photograph or measured light rig**. A 64 x 64 scalar diffusion field uses `round(255 * (sin(pi*(x+.5)/64) * sin(pi*(y+.5)/64))^.6)`, opaque alpha and linear filtering. Double-sided MeshBasicMaterial planes look at `(0,1,0)`:

| Width x height | Position | Linear RGB intensity per channel |
| --- | --- | ---: |
| 5 x 7 | (-4, 1, 5) | 2.4 |
| 2 x 5 | (5, 2, 2) | 1.7 |
| 4 x 2 | (0, -2, 4) | 1.0 |
| 6 x 1.5 | (0, 5, 0) | 4.0 |
| 1.5 x 4 | (-2, 2, -5) | 2.5 |

PMREM is `fromScene(studio, 0.025, 0.1, 30)`. These cards produce environment reflections; they are not actual RectAreaLights casting soft shadows on the model.

Web setup (`HeroModelStage.tsx:22-39`, reviewed setup only) and video setup (`apps/media/hero-turntables/index.html:35-48`) agree on:

- ACESFilmic tone mapping, exposure **1.15**.
- Hemisphere sky `0xffffff`, ground `0x414d52`, intensity **2.5**.
- White directional key intensity **4**, position `(-3,6,5)`.
- Cool directional rim `0xb8d9e6`, intensity **3**, position `(4,3,-4)`.
- The shared generated environment. No explicit environment-intensity/material envMapIntensity override was found in the inspected consumer source; local Three.js Scene defaults environmentIntensity to 1.

Web caps DPR at 1.5 and uses low-power preference; video uses DPR 1 and a 1920 x 920 viewport within the 1080p frame. These differing sampling contexts preclude equating fullsize PNG detail with dashboard detail. No shadow enable/cast/receive configuration was found in these consumers. Source-level absence does not substitute for a live renderer inspection.

`prepare-hyperframes-assets.mjs:40` transpiles the shared environment to both vendor trees. Existing vendor JS was read and has the same five-card values and PMREM settings. Its loader bytes match the installed Three.js loader. Nothing was prepared or rebuilt here.

## Car: Delivered Paint, Not Constructor Guesswork

Both active paints are double-sided and have **metallicFactor 1** (omitted glTF field, confirmed local loader default). Neither has a base-color image, metallic/roughness image, paint emission, or clearcoat normal image. Paint AO strength is **0**, so the shared occlusion image does not darken these paint materials.

| Parameter | Paint 1 Carmine | Paint 2 Carmine |
| --- | --- | --- |
| Linear baseColorFactor RGB | (0.666, 0, 0) | (0.03775528281927109, same, same) |
| Base roughness | 0.25 | 0.30 |
| Clearcoat factor | 1.0 | 0.25 |
| Authored clearcoat roughness | **0** | **0** |
| Normal scale | 0.30000001192092896 | 0.30000001192092896 |
| Normal tile scale | (30,30) | (30,30) |
| Normal rotation | 0 | 0.585398 radians |
| Unique-mesh primitive bindings | 7 | 9 |

They share image/texture index 6: **128 x 128 PNG, 46,314 bytes**. Sampler: mag 9728 = NEAREST; min 9986 = NEAREST_MIPMAP_LINEAR; wrapping 10497 = REPEAT on both axes. The minifier blends mip levels but uses nearest selection within them; it is not trilinear spatial filtering. Paint primitives have stored NORMAL, TANGENT and both UV sets.

Decoded source PNG RGB ranges: R **60-198**, G **57-197**, B **220-254**. Decode `(rgb/255)*2-1`, multiply XY by material normal scale, renormalize: local texel tilt has mean **6.07799 degrees**, RMS **6.56143**, p95 **10.25016**, maximum **15.87866**. These are texel-weighted local directions, not angular error against a different source and not a measurement of pixels on screen. One unit of source UV spans 3,840 normal texels at tile 30; actual screen frequency depends on UV footprint and pose.

**Likely mechanism, supported but not rendered in isolation:** An intentionally strong, densely repeated flake field gives many different reflection directions. Fully metallic saturated red plus bright directionals/reflection cards makes that field conspicuous. MSAA on the canvas does not itself prove normal-map/specular antialiasing. Specular/texture aliasing or temporal sparkle remains a hypothesis until a controlled render/motion inspection.

**Separate broad-highlight mechanism:** Local Three.js `normal_fragment_begin`, `normal_fragment_maps`, and `clearcoat_normal_fragment_begin` show that clearcoat without its own normal map uses the **non-perturbed mesh normal**, not this flake normal. In `lights_physical_fragment`, clearcoat roughness is clamped to at least **0.0525**, then geometry roughness is added. Thus authored zero is not literally a zero-width shader lobe. Reducing flake strength need not remove smooth clearcoat hotspots. Calling every hotspot flake corruption would conflate the two layers.

### Car Source And Provenance

Importer pins Khronos CarConcept revision `15cd02d304e54cb42a4db4eefe719f76190f4b68` and source GLB SHA-256 `c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b`. Current embedded paint PNG SHA-256 is exactly `3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e`; decoded RGB is exactly `f084dbffd99641c57a397c5de7b5defec889114310ed07861711b043bf787477`. Both match the importer/test's recorded source pins. This session did **not** obtain or freshly compare the complete upstream GLB.

`import-refined-car.mjs` simplifies at ratio .55/error .0003/locked borders, applies 1024px quality-90 WebP conversion and Meshopt, then restores the original paint PNG bytes and five other normal images as pixel-checked lossless WebP. Tireside retains the prior conversion. The historical lossy-paint defect is documented, but it is **not the current PNG payload**. Do not repeat lossy color compression, silently change its sampler/tiling, or label Tireside repaired.

The adapted Car/model textures are Eric Chadwick / Darmstadt Graphics Group, **CC-BY-4.0**. Unity Fan CC0 base-geometry ancestry does not make the derivative CC0-only. The importer removes particular logo-bearing parts and a pinned texture; its removal notes are not blanket trademark clearance. The stills retain tire lettering. Credit and provenance must remain. The generated poster is a separate reference/fallback, not the model's reconstruction target or measured material reference.

## Card: What The Actual Maps Can Convey

`build-refined-credit-card.mjs:15-19` constructs metal materials, but `:120` replaces their constructor roughness with **factor 1 multiplied by the roughness map**. Tuning the initial `.25/.27/.24` constructor numbers alone will not change delivered mapped roughness.

| Material | Delivered linear RGB factor | Metal factor | Roughness input | Anisotropy | Clearcoat |
| --- | --- | ---: | --- | ---: | --- |
| CC-Brushed-Silver | (.74540421,.76815115,.78353779) | .84 | G map x 1 | .65 | none |
| CC-Emerald-Metal | (.01032982,.12213877,.07818742) | .90 | same G map x 1 | .50 | .65 / roughness .22 |
| CC-Turned-Silver | (.69387176,.73791041,.74540421) | .84 | radial G map x 1 | .25 | none |
| CC-Polished-Edge | (.71569350,.75294222,.77582222) | 1 default | .17 | 0 | none |

All have zero default emission. Polymer and signature-panel materials are dielectric with roughness .7 and .61. No Card occlusion texture is bound; the R in its packed maps is **not being used as an AO map**. A packed-map name is not a consumer binding.

Six embedded maps are 256 x 256 WebP, totaling **24,292 bytes**. Silver and emerald share all three brushed maps with REPEAT and KHR_texture_transform **(1,8)**; turned coin maps have no texture transform. Card sampler filters are omitted; the installed loader defaults them to linear magnification and linear-mipmap-linear minification with mip generation. Normal scale is **.08** for brushed/turned surfaces.

| Map | Payload bytes | Actual decoded RGB observations |
| --- | ---: | --- |
| CC-Brushed-Color | 112 | Equal RGB **248-250**, mean 248.999, stddev .200 |
| CC-Brushed-Normal | 736 | R **127-128**, G **125-130**, B **255 constant** |
| CC-Brushed-Roughness-Metal | 510 | G **62-67**, mean 65.12793; B **252-255**, mean 254.17160 |
| CC-Turned-Color | 5,912 | Equal RGB **248-250**, mean 249.03682 |
| CC-Turned-Normal | 16,646 | R/G **124-131**, B **255 constant** |
| CC-Turned-Roughness-Metal | 376 | G **57-61**, mean 58.98294; B **252-255**, mean 254.94209 |

Delivered effective roughness: brushing **.24314-.26275**, mean **.25540**; turning **.22353-.23922**, mean **.23131**. These are not chalk-level roughness values. Effective metalness means are **.83727** silver, **.89708** emerald, **.83981** turned, after B-channel multiplication. The small B deviations from 255 are real lossy packed-image differences, not evidence of a large missing-metal response.

At scale .08, brushed texel tilt mean/RMS/p95/max is **.04097/.04638/.09166/.09166 degrees**; turned is **.07737/.08890/.15463/.17794 degrees**. This is intrinsically subtle even before mip filtering. The raw normal images are losslessly encoded by the builder; weakness originates in the authored height/derivative amplitude and further normalScale, not demonstrated normal compression damage. The recipe uses height differences multiplied by .08 before 8-bit encoding, then the material multiplies decoded normal XY by .08 again. That attenuation may be intentional; it is not automatically a bug.

**Likely mechanism:** A near-constant neutral color map, tiny normal perturbations and narrow roughness range provide little inspectable grain on broad planar faces. A metalness below 1 also leaves roughly 16% silver / 10% emerald diffuse weighting before lighting and texture effects; the strong hemisphere can lift that component. Large soft environment cards and a broad anisotropic specular lobe can produce a nearly uniform region without any texture-load failure. Raising fill or making albedo whiter is not supported as a remedy for gray metal here.

### Anisotropy: Useful Hypothesis, Not A Diagnosed Driver Bug

No Card primitive contains TANGENT. The local Three.js shader supports this: it calls derivative `getTangentFrame` using **vNormalMapUv**, which includes (1,8) tiling. There is no anisotropy direction texture or explicit rotation in the GLB. The turned height field is radial, but its anisotropic BRDF direction is not an authored radial direction map.

At the brushed mean roughness .25540, local shader `alphaT = mix(roughness^2,1,anisotropy^2)` gives **.46017** at anisotropy .65, versus orthogonal alphaB **.06523**. This is strong directional broadening despite the modest scalar roughness.

The fallback applies a common normalization to T/B, not independent normalization. On the builder's ideal planar face chart (`u=x/1.82+.5`, `v=y/2.87+.5`, then tiling 1,8), the analytic T/B length ratio is **.19712**. Shader anisotropy axes are derived from that frame. This is a source-based reason to be cautious about assuming a unit, orthogonal frame; it is **not** a measured GPU frame, proof of incorrect output, or a claim that tangent absence alone breaks Three.js. Quantization, bevels, geometry derivatives and the compiled shader were not measured per fragment. Do not add a MikkTSpace tangent buffer blindly, especially with only 524 bytes of Card room and prior documented rejection of a larger tangent candidate.

### Card Source And Provenance

The geometry, grooves, chip, backs, coin reeds and material fields are original InterestShield procedural sources. The source explicitly discloses **approximate PBR maps, not measured reflectance, a scan, financial credential or exact poster reconstruction**. `materials.json` records grain seed **17389**, resolution **256**, brushedAnisotropy **.65**, tiling **[1,8]**, normalScale **.08**, coinReeds **96**. The recipe authors albedo around `round(249+h*4)`, normal derivatives at `.08`, and roughness around `65+h*16` or radial `58+h*16`; ORM is quality-92 lossy WebP, color/normal are lossless. Final simplification ratio is .7/error .00003, position and UV quantization 16 bits.

Its raw config-file SHA differs from manifest materialSourceSha256 **by design**: the manifest hashes `JSON.stringify(parsedConfig)`, not raw bytes. Actual serialized-config hash matches `bcd64f53d1bc34b15cb745b2faaa283c90a3060ccbdb25f9b93afe0b0fea2752`.

## Two Proposed Paired-Render Experiments

**For the parent later; none executed or implemented here.** Use the same backend, source hashes, poses (at least 0 and 4), camera, background, output size, DPR, environment, lights, exposure and texture-load completion for A/B. Save fullsize frames and identical crop coordinates, not differently scaled thumbnails. Baseline A must be newly captured in that run; the existing PNGs are context, not a cross-backend control. Keep all ten source GLBs, geometry and posters frozen. Temporary loaded-material overrides have **zero shipped-byte cost** and need no reserialization.

1. **Car: isolate flake strength.** A = shipped normalScale .30000001192092896 on both Paint 1/2 Carmine. B = **.15 on both**, keeping the exact same PNG, filters, transforms, clearcoat, roughness and colors. Underlying texel XY perturbation is halved; no texture gets blurred/reencoded. Expected diagnostic: sparkle contrast should decrease if the flake field is a main contributor. Smooth bright clearcoat hotspots may persist because that normal is separate. Reject a shipping conclusion if B merely loses material identity or appears smoother at one pose; if sparkle is unchanged, do not keep reducing strength blindly. This intentionally departs from the source-strength invariant only in an isolated render, not in the importer or its tests.

2. **Card: isolate excessive silver lobe breadth.** A = shipped **CC-Brushed-Silver anisotropy .65**. B = **.30 on that material only**; emerald .50, turned .25 and every map/normalScale/roughness/metalness/edge remain unchanged. This keeps the silver/emerald/coin identity and directional brushing, while reducing computed alphaT from **.46017 to .14936** at the same average roughness. Expected diagnostic: a more localized specular response or clearer dark/bright transition would support broad anisotropy as a contributor. If faces stay flat gray, that weakens this explanation; it does not prove missing textures, justify whiter albedo, or establish the fallback frame is defective. This single-material experiment does not resolve the coin's response or constitute final Card approval.

Neither pair establishes the optimal material. Do not combine normal, anisotropy, metalness, clearcoat, exposure and lighting edits in one candidate. A future environment experiment would need separate authorization and controlled comparison; this report does not propose a third experiment or a shared studio replacement.

## Unsafe To Change Blindly

- Do not weaken normal-fidelity tests, change the source pins, lossy-compress normal data, or confuse exact source fidelity with photoreal approval. Preserve Car's alternate-paint rotation, maps, attribution and excluded-source policy.
- Do not edit Card's constructor roughness expecting the mapped output to change; inspect the delivered map factor. Do not read packed R as active AO or treat a metallic factor below 1 as missing metalness.
- Do not invent surface grain with higher-resolution images, larger tangents, new geometry, regenerated posters, altered caps or hidden dependency additions. Source detail is approximate, not a license to relabel it measured or scanned.
- Do not apply Card relief fixes or Car specular fixes globally to all ten heroes. Existing fidelity contracts explicitly leave collection-wide art approval open and record that no uniform lighting replacement was approved.
- Do not touch replay/lifecycle, camera/framing, financial code, other agents, servers or publication state to investigate this material question.

## Hardware / Software And Explicit Limits

The existing Car fidelity contracts separately record successful software validation and an inherited **hardware/D3D X4122 precision warning**, also reproduced by the unchanged older Car. Those are historical written records, not gates rerun by this sidecar. **Hardware compatibility remains open; software success is not hardware clearance. No causal link between X4122 and the current Car sparkle or Card grayness is asserted.**

CPU inspection cannot establish loaded GPU texture color spaces, generated mip contents, anisotropic filtering level, exact radiance, BRDF correctness, runtime extension support, compiled shader precision, normal variance on screen, clipping, perceived realism or temporal stability. The local loader source assigns base-color textures sRGB, leaves normal/roughness/metalness as data, multiplies roughness by G and metalness by B, and supports anisotropy/clearcoat. That source evidence makes some theories less compelling; it is not observation of actual GPU state. No complete upstream asset comparison, live rendering, all-angle review, accessibility or performance check occurred.

## Exact Identity Ledger

All hashes below are **SHA-256 of actual file bytes**, not Git object IDs. Paths are workspace-relative. Full hashes for every decoded image, reviewed source excerpt, dependency source and all twenty frozen public assets are in `material-survey.json`.

| Reviewed source / asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `apps/web/public/heroes/car.glb` | 2232520 | `5d7fb0b2aa1457ce7e0013d3b7e04ba6568c3dd21941dc5df05a3bf969489225` |
| `apps/web/public/heroes/creditCard.glb` | 523764 | `b3f08cc7e2e081deee13f86f88bdc02a7ff7b46ac97beb3155d4f5c4b4188025` |
| `apps/web/public/heroes/car.webp` | 166578 | `20aa6f0add0b03228e07967794c65a65d3f2fde3b73279f168d3c1ae5d2bbe97` |
| `apps/web/public/heroes/creditCard.webp` | 112828 | `29caa22a9f3f653fac14fc0383183532b90a8f8e30b9a61b64b615ef80d33198` |
| `apps/web/src/components/hero/studio-environment.ts` | 1804 | `ab47fbfd534664f7945cb37fbe142e02fa207b693e57c19be3057b8f3626dc5b` |
| `apps/web/src/components/hero/HeroModelStage.tsx` (setup-only review, whole-file snapshot before parent edits) | 6247 | `c987ae95b11793b7cf85b92bb9683150d366e69d7f1238169b55420aaf9859d9` |
| `apps/media/hero-turntables/index.html` | 4770 | `5abefd51a7e806b967cfe7d2b15d28628698bf5088e873e7f9b6778287af1594` |
| `apps/media/scripts/prepare-hyperframes-assets.mjs` | 3051 | `b3d61bf64503b48ea4a31ed793c4d8c1138aa56828db47489901f77ae10089c5` |
| `apps/media/scripts/render-hero-turntables.mjs` | 1161 | `48a2ccaa9324982f747770118acbec2ec326f1eb5233fc80194b78b5fdff3265` |
| `apps/media/scripts/import-refined-car.mjs` | 8432 | `373efa27d4ed24c5542eb968842455bd5203e898267f7822537527c4acc6fd94` |
| `apps/media/scripts/build-refined-credit-card.mjs` | 12452 | `db342fc5cfb51b6ba12da512ac6a3b738bab2b4e5fcdc0bbcf1a6b5bc8b264b5` |
| `apps/media/sources/credit-card/materials.json` (raw bytes) | 1230 | `abad9b117771644aa3e96c4ec386634b6af5c41c83b712edd8b112864cce1d41` |
| `apps/media/hero-imported.json` | 9728 | `b133ef153c5fb6f301e4bfb5bb24f58d739423f98d26193e4c50286ee1ef06be` |
| `apps/media/hero-models.json` (byte identity recorded; no additional semantic review) | 9728 | `eef27aed1e234caae5868aea4d293e55bf54a8321762c1be052b4a994e5e7802` |
| `apps/media/hero-provenance.json` | 4889 | `993095bdaf63641b46eb7c81cb37af6239c93f511678fae86025f584ced9ff03` |
| `apps/media/hero-turntables/vendor/studio-environment.js` | 1754 | `26d9938a6562a426f9856528f6061c5b9200627038327756a7f02290bbb69c65` |

Car importer and Card builder raw-byte hashes also equal the manifests' LF-normalized recipe/source hashes in this checkout. The upstream full-source hash is a recorded pin, not a freshly acquired file hash. The two current poster files were hashed/freeze-compared, not used as material truth.

| Embedded map | SHA-256 |
| --- | --- |
| Car paint PNG | `3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e` |
| CC-Brushed-Color | `f836c79d591cb2fd32218463f1941d331fa7a6d3ff056698170c6eec54c7fc3e` |
| CC-Brushed-Normal | `2d591a32fc13da0b6761ffdf7a894738bac7128a3195b0f542a844acf62479a5` |
| CC-Brushed-Roughness-Metal | `66b9c8b1c758167bc834a607bb4605dc75edab989cc37b0c5cefdf78baabbc3c` |
| CC-Turned-Color | `eeecb06735ab2012c07ed4952bd094a4f579adef361c4e18fcdb4f77343b0ba6` |
| CC-Turned-Normal | `216a8946ae7ae542fae20cfd0bf6d9444876e15348261c85ac134506bb39ff31` |
| CC-Turned-Roughness-Metal | `915840a454a828f322d9727826a373c17f3b43b231038d62e8ec104f9a2edd01` |

CPU helper SHA-256: `10da011feb64cf1139e91db1e2912902388ebe79df27e56c10b663c98a6bba88`.
Saved JSON SHA-256: `7cb568aaf14b662c2342516a81de5cec15e42c13629e793ab911b6704a7ad58b`.
These identify the evidence artifacts, not a passing render/test gate.

Final read-only hash audit: every ledger source/asset/image/vendor file still matched
the snapshot except the parent's actively edited `HeroModelStage.tsx`. All twenty
public GLB/poster hashes remained unchanged. This sidecar did not inspect that
new replay implementation. The three authored evidence files are ignored by
`.superpowers/sdd/.gitignore`; tracked status contains only the parent's two files.
