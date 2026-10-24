# Independent Car Code And Asset Review

## Verdict

FINAL CLOSED: no actionable code or artifact defect found in the reviewed code/data-fidelity boundary. The four final raw source pins and BOTH canonical-LF recipe stamps are independently verified. Final focused tests pass **22/22 with no exclusions**, including all 15 Car tests and the existing paint test. This is not full-gate, art, hardware, production or release approval.

Reviewed on 2026-10-21 in `C:/Users/IslandDevCrew/Documents/Interest Shield`, branch `codex/restoration/asset-heroes`, HEAD `35745b7f1e0b8b18a6279f7c54b47d4f0f9ea50e`. The reviewer did not generate, encode, rebuild, render, browse, access the network/cloud, run full gates, commit, push, or edit mission state. The only reviewer-created/edited file is this report. Unrelated agent `01a15930` and ports `53143` / `53144` were not touched.

Provisional history retained: the parent added a fifteenth Car test and `recipeSha256` during review. Missing manifest recipe stamps at that intermediate checkpoint were explicitly expected pending parent regeneration, NOT a shipped-asset finding. The reviewer withheld raw source-pin and final provenance approval then. After the parent's explicit final-regeneration signal, the reviewer reread the final sources/manifests, verified both stamps and all four raw hashes, and reran the focused tests without exclusions. That closes the formerly pending step without rewriting its expected RED history.

## Artifact Pins And Budgets

| Artifact | Bytes | Raw SHA-256 |
| --- | ---: | --- |
| `apps/web/public/heroes/car.glb` | 2,232,520 | `5d7fb0b2aa1457ce7e0013d3b7e04ba6568c3dd21941dc5df05a3bf969489225` |
| `.superpowers/sdd/2026-10-21-car-data-fidelity/before-car.glb` | 2,049,728 | `8b47003fb31a8d1e41f271a05bf64bf6f68b84625d18992f1201a7f66e65ce54` |
| `.superpowers/sdd/2026-10-21-car-data-fidelity/original-source.glb` | 11,778,688 | `c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b` |

Actual recursive `apps/web/public` measurement: **10,143,326 bytes**, cap **10,485,760**, headroom **342,434**. Car cap **2,359,296 bytes** (2.25 MiB), headroom **126,776**. Neither original cap was increased. Car remains 95 meshes / 134,971 triangles / 106 nodes / 1 scene / 22 materials / 2 samplers. Final image count is 12, texture count 12; before had 13 images and 12 live texture bindings.

Final raw source pins, independently read after the recipe-stamp closure signal:

| Source Path | Raw Bytes | Final Raw SHA-256 |
| --- | ---: | --- |
| `apps/media/scripts/import-refined-car.mjs` | 8,432 | `373efa27d4ed24c5542eb968842455bd5203e898267f7822537527c4acc6fd94` |
| `apps/media/scripts/car-normal-data.test.mjs` | 10,396 | `6c1763ca166a060d147a56a41dbf0553cf5d0e8221872cbf55a52850fc4eb9c9` |
| `apps/media/hero-imported.json` | 9,728 | `b133ef153c5fb6f301e4bfb5bb24f58d739423f98d26193e4c50286ee1ef06be` |
| `apps/media/hero-models.json` | 9,728 | `eef27aed1e234caae5868aea4d293e55bf54a8321762c1be052b4a994e5e7802` |

The recipe stamp is a separate canonical-LF hash, not a substitute for these four raw-file hashes. Its expression reads the importer as UTF-8 and replaces CRLF with LF. It is evaluated in the record after `io.writeBinary(document)`, not injected into the GLB. BOTH final Car records independently equal canonical-LF SHA `373efa27d4ed24c5542eb968842455bd5203e898267f7822537527c4acc6fd94`; raw importer bytes happen to give the same hash in this checkout. Both records also retain upstream SHA `c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b`, agree completely with each other, and bind the actual Car bytes/length. Each manifest has exactly one Car and all nine other records unchanged from HEAD.

## Independent Data Comparison

Pure Node + glTF-Transform Meshopt DECODE + Sharp DECODE comparisons, with no importer execution:

- All **508 decoded accessors** compare exactly by typed-array constructor, values, type, component type, count, normalization, name, and extras. This includes positions, normals, tangents, indices and UVs.
- All **410 compressed geometry payloads** compare individually byte-for-byte, with compression metadata unchanged except relocation offsets. The existing concatenated-payload pin also passes: `5980ce54ffa3e5d3f0783b45ed2006942e7714d6a83a17a43b67781304eadc8f`.
- The **entire JSON object** matches before after ONLY explicit layout normalization: remove the last unused image/view, decrement geometry accessor view references by one, allow image lengths/offsets and compressed payload relocation offsets, update the embedded buffer length, and remove optional `KHR_materials_iridescence` from `extensionsUsed`. Image payload checks independently constrain the allowed length changes.
- Therefore scene membership, hierarchy, transforms, node/mesh/material names, primitive bindings, material factors, texture bindings, sampler/filter/wrap settings, texture transforms, extras, asset generator, copyright, and other metadata are unchanged. Original required extensions remain exactly `EXT_meshopt_compression`, `EXT_texture_webp`, `KHR_mesh_quantization`; implicit quantization requirements were NOT stripped. All GLB magic/version/chunk/file-length and embedded-buffer-length checks pass.
- Source aliases are verified on the pinned upstream GLB as well as the final asset. The shared interior map remains shared by all four named materials; Panel Sides retains authored normal strength zero. Both paints keep their original strength, nearest-filter settings, 30-by-30 tiling and rotation behavior.

Exactly five normal images have different encoded bytes from before and exact full-resolution original-source RGB:

| Material Binding(s) | RGB Dimensions | Final Encoded Bytes | Original And Final RGB SHA-256 |
| --- | --- | ---: | --- |
| Mechanical | 512 x 512 x 3 | 223,440 | `94f38d35a8cec24cc624a636bc5ffa95b1d8831e77ae007c3e86648f68684816` |
| Interior 1 / Floormat / Interior 3 Carmine / Panel Sides | 64 x 32 x 3 | 3,142 | `0d1c358c3355bba2e4d4fe981644ce6bde6cf69495b62cb10867831b53e58cd3` |
| Interior 2 | 32 x 32 x 3 | 92 | `35bc19e9728db6b7aac623cafc9fe5e3350e08fbe0acd25014d627ad4b79df48` |
| Disc | 128 x 128 x 3 | 6,438 | `166b768e816839ef1c75381037d222c0aa5dd23145a726306a78b37f4acd89c7` |
| Tiretread | 512 x 128 x 3 | 37,136 | `ff08861bab392eb1e495e36827ebd7097cee3ee9d8bb1831bfe21fdf62f9e0e4` |

All seven OTHER live images, including paint, compare byte-exactly to before by actual material-slot binding, not just image ordering:

| Binding | Bytes | Raw Image SHA-256 |
| --- | ---: | --- |
| Mechanical metallic/roughness | 19,868 | `364431d50e44134095a94521ed3efd5307cc33c4f580c2ca228aafbab9944276` |
| Shared occlusion | 226,832 | `2fe98b8633bd936842557049d328bbbf5ddeab5db7abfa22671b3977d73acc7c` |
| Dashboard emissive | 15,458 | `ab479f164bd9db1d7ce0df34900c8b923d7b03daf07d62684ed85e09f3232b46` |
| Both Carmine paint normals, original PNG | 46,314 | `3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e` |
| Disc base color | 1,070 | `ddf18f5c64bbf8947731b16fe718b87850dd0cfc272005e7a0161b1fc65bb8ff` |
| Tireside base color | 8,462 | `91911a4ccb88ac1cfdfe62ab07b77b8434f30b50ba03f32097a080d4a9eac81d` |
| Tireside normal, deliberately NOT repaired | 67,900 | `0767b8325770466dbb585e817c0bb853e8e7f5c864f4083b9f052274d9a4a3ae` |

Paint RGB remains `f084dbffd99641c57a397c5de7b5defec889114310ed07861711b043bf787477` at 128 x 128 x 3. Tireside source-normal fidelity remains OPEN. No near-lossless or vector-normal-repair experiment appears in the reviewed production importer or artifact. Measurement/encoding experiments were not executed by this reviewer.

## Guard Refutation

Importer source capture (`import-refined-car.mjs:37`): AST-extracted actual declarations/guards executed against the pinned original decoded document. Eight selected materials resolve to exactly five normal textures. Additional base-color consumption is rejected. Renaming a target out of the set and collapsing distinct normal bindings are rejected. Capture occurs before texture compression; original pixel buffers are copied before mutation.

Cleanup (`import-refined-car.mjs:53`): decoded before artifact independently has an optional iridescence declaration with **zero** properties. Upstream iridescence properties belong to Paint 1 Pearl / Paint 2 Graphite, not the retained Carmine materials. Parent `prewrite-graph-red.log` reports the original strict empty-property guard rejecting TWO unattached properties before serialization; that generator-stage observation is parent evidence, not a reviewer regeneration.

The reviewer reconstructed this distinction in memory using the exact old 40,620-byte orphan `91528e0787ccc359eb09779d727bfa40545837d9c7a52a2bf0a2aba971f5847b` and two real unattached `Iridescence` properties referring to it. Actual AST-extracted cleanup accepts that positive fixture. It rejects each of these independent controls before ANY disposal: required extension; live material-attached iridescence property; material use of the target orphan; same-length one-byte-wrong target; wrong MIME; nonempty extras; second orphan; wrong size. Wrapped disposal methods observed zero calls and graph snapshots stayed unchanged on every refusal. Thus tests do not depend solely on a serialized graph that has already lost detached properties.

Publication (`import-refined-car.mjs:87`): actual callback AND actual recursive `sizeOf` were AST-extracted and run with nested in-memory filesystem responses and no disk writes. Replacement measurement is `current recursive public total - actual current Car size + output length`. Exactly-at-10-MiB replacement succeeds; one-byte-over after collection growth fails before asset write/rename. Behavioral oracles kill removed-guard, stale-total, `>=` boundary, missing-subtraction, and missing-output-addition mutants. This is executable behavior, not a source-string presence check.

The actual unchanged `saveRefinedHero` function was separately executed with a mocked lock/filesystem: manifest reads and callback execute while locked; successful asset publication precedes manifest writes; aggregate rejection writes neither asset nor manifests. The real helper's exclusive `wx` lock and publication-before-manifest ordering were read and are unchanged from HEAD. This is not a new real-process contention test or a whole-collection crash-atomicity claim.

## Untouched Boundaries

Direct `git show HEAD:<path>` buffer comparisons prove the other nine GLBs and ALL ten hero WebP posters unchanged, including `car.webp`. Final closure strengthened this to all **24 non-Car public files**: raw bytes equal HEAD across the actual **25-file** public directory. Non-Car records in both manifests are structurally identical to HEAD. At the provisional checkpoint `git diff --name-only HEAD` showed only the expected importer, two manifests and Car GLB; the only nonignored untracked source was the new Car test. No math, UI, studio/environment, camera, lighting, dependency manifest/lockfile, or CI source change was present. `refined-hero-record.mjs` is unchanged.

Concurrent parent documentation work became visible during final closure: modified `docs/car-paint-fidelity-contract-2026-10-21.md` and new `docs/car-normal-fidelity-contract-2026-10-21.md`. Those are parent-owned contract documentation, not reviewer edits or changes to the four pinned sources/Car. Their contents explicitly retain Tireside/art/hardware/release limits. Final protected-path diff checks still show no math/UI/dependency/studio/CI/lock-helper changes. HEAD and branch remain the stated checkpoint. The reviewer did not reset or modify this concurrent work.

Other-model raw SHA-256 pins checked against HEAD:

| Model | Raw SHA-256 |
| --- | --- |
| creditCard | `b3f08cc7e2e081deee13f86f88bdc02a7ff7b46ac97beb3155d4f5c4b4188025` |
| custom | `2753182d024be862fc7ab5e5b18100cc6a7bbcc736213471b4a6e2083517aa7b` |
| house | `ec008a1681930595a11579c6b19a1c02377d3211aea8a36b03e2aff9bd244f33` |
| land | `4b09041fd2f952a7cddef196d9a2078360194913e1ff175ef96b89c5ff7aa3de` |
| medical | `b6df483391ee3d552f8a128ab8327484d833754f6a907e7fa0899eca5dd6c615` |
| personal | `e079fc7b95c562fa6180434491cf3511d54fbf79cb155bf1d89c822bafe77b79` |
| recreation | `c7ce5658eefd0e928ea857e70ca35803e2812308032a071cdcb82412434f41a7` |
| studentLoan | `56dfe51ad199bdafcc0cc5ced65321a16a4e087693f645d6d12c6bc14fb98d12` |
| vault | `6846a098bbdd974f89101de68548e90bced312991745eae88549a3a6f9129594` |

## Commands And Results

Commands ran from the workspace root unless noted. No result below is a full-media/build/browser/CI approval.

1. `git status --short`, `git branch --show-current`, `git log -5 --oneline`, `git diff -- <importer and manifests>`, `git diff --name-only HEAD -- apps/web/src apps/mobile packages package.json package-lock.json apps/media/package.json apps/web/package.json apps/web/public`: expected branch/HEAD/boundary; last command returns only Car GLB.
2. In `apps/media`, `node --test scripts/car-normal-data.test.mjs scripts/car-paint-fidelity.test.mjs`: **15/15 PASS** before the recipe test was added (14 original new cases plus existing paint case).
3. Pure Node stdin scripts, invoked as PowerShell here-strings piped into `node --input-type=module`: source/asset SHA and GLB layout inspection; all-accessor/all-payload/full-normalized-JSON/image comparisons; reconstructed prewrite cleanup controls; source capture/cross-slot controls; recursive publication/lock callback controls and five mutants; 19 other-asset raw comparisons and public aggregate measurement. Final versions of all these checks PASS. Two preliminary reviewer comparison scripts failed because the harness incorrectly assumed compressed views start at index zero and that accessor view indices need no orphan-removal remapping; both assumptions were corrected. Those were reviewer-harness failures, not artifact defects.
4. After recipe test addition, the attempted exclusion command `node --test --test-name-pattern='^(?!Car provenance)' scripts/car-normal-data.test.mjs scripts/car-paint-fidelity.test.mjs scripts/photoreal-assets.test.mjs scripts/media-workspace-contract.test.mjs` actually ran provenance too: **21 PASS / 1 expected pending-recipe RED**, exit 1. Missing recipe stamp is the intentionally pending parent step, not a new defect.
5. Correct explicit exclusion: `node --test --test-skip-pattern='Car provenance binds' scripts/car-normal-data.test.mjs scripts/car-paint-fidelity.test.mjs scripts/photoreal-assets.test.mjs scripts/media-workspace-contract.test.mjs`: **21/21 selected cases PASS**, exit 0. Node's output omits the excluded test from its count; this is not a claim that all 22 pass.
6. Parent historical `normal-data-red.log` was read: **12 RED / 2 PASS**. Reviewer did not regenerate that historical failure. Parent's full serial gates, final 180-media/27-still rerun, regeneration, full-study preservation, browser, hardware, hosted, CI and shipping are outside this lane and are not independently asserted here.
7. FINAL, after stamps were generated: in `apps/media`, `node --test scripts/car-normal-data.test.mjs scripts/car-paint-fidelity.test.mjs scripts/photoreal-assets.test.mjs scripts/media-workspace-contract.test.mjs`: **22/22 PASS, exit 0, zero skipped, no name/skip exclusions**. This includes all 15 Car cases plus paint, three photographic-asset contracts and three workspace contracts.
8. FINAL pure Node stdin pin/scope script: read all FOUR files as raw buffers; independently hash importer text after CRLF-to-LF normalization; check BOTH manifest recipe stamps and source/asset pins; check single Car record and nine unchanged other records per manifest; recursively measure all 25 public files; compare all 24 non-Car public files directly to HEAD. **PASS**, Car **2,232,520 bytes / `5d7fb0b2aa1457ce7e0013d3b7e04ba6568c3dd21941dc5df05a3bf969489225`**, public **10,143,326 bytes**. Protected-path git diff empty; branch/HEAD unchanged.
9. FINAL pure Node + Meshopt/Sharp DECODE stdin script: freshly compare **508/508 accessors**, **410/410 compressed payloads**, full JSON after only the documented layout changes, five original-source RGB images/all aliases, seven other image byte payloads, paint PNG/RGB, and required extension declarations. **PASS**, no generation or encoding.
10. Final-closure harness history is also retained: a preliminary script incorrectly counted every public WebP as a hero poster, observing 11 rather than 10 because a non-hero public WebP also exists. Corrected to the `public/heroes` boundary; all 24 other public files still compare exactly. A subsequent fixed-exact-scope assertion correctly noticed the parent's concurrent contract-doc edit; the reviewer inspected it and recorded the additional documentation instead of treating it as an asset/code defect or undoing it. The final pin/public/protected-boundary script passes. Neither preliminary failure was silently relabeled as a product failure or a passing command.

## Final Closure

All requested independent code/asset closure checks above are complete for the exact five pinned files. The four source pins are final, both recipe stamps match, the asset remains byte-identical to the independently audited candidate, all focused tests pass without exclusions, and other public assets/non-Car records/protected code remain unchanged. The provisional expected recipe RED and reviewer-harness failures remain documented above.

The parent reports all 28 serial gates passed and owns the final 180-media/27-still run and fresh video proof. Those are separate parent-lane results, not new independent full-gate evidence from this reviewer. This FINAL CLOSED verdict is limited to the requested code/data/asset contract; changes to any of the five pinned files require revalidation.

Tireside normal fidelity, full collection art/photoreal approval, production/release approval, physical-device/hardware validation, inherited D3D warning resolution, and final CI/hosted evidence remain OPEN. No source-code/data-fidelity result here grants those approvals.
