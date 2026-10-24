# Car Paint Fidelity Repair Review

Date: 2026-10-21. Independent bounded Mission Control Tier 2 review.

## Findings

**None in the reviewed repair.** No actionable correctness, scope, or regression defect found. The actual shipped paint normal is now the original hash-pinned PNG, with its material bindings, sampler, UV transforms, and strength preserved. This clears the **paint-normal portion** of prior F1, not every Car data-map issue or collection art approval.

Prior F2 side UVs and F3 unused image/stale iridescence declaration remain queued and unchanged. Prior F1's Mechanical normal-map damage is also unchanged, outside this paint-only repair. These are not new regressions or claims of completion.

## Reviewed Snapshot

- Branch: `codex/restoration/asset-heroes`.
- Base and current HEAD: `4320a0c24b6419910c812a644983406792a57571`; reviewed changes are uncommitted working-tree changes, not a newly verified commit.
- Requested scope: importer, new fidelity test, actual public `car.glb`, and both manifests. Read the prior `material-audit.md` and existing asset contracts without running generators.
- During review the parent also added a documentation-only PNG exception to `docs/ASSET-CREDITS.md`; inspected that diff. Other parent documentation remains parent-owned.

| Reviewed File | SHA-256 of Actual Bytes |
| --- | --- |
| `apps/web/public/heroes/car.glb` | `8b47003fb31a8d1e41f271a05bf64bf6f68b84625d18992f1201a7f66e65ce54` |
| `apps/media/scripts/import-refined-car.mjs` | `db3ba6e68ad96013064c4220e1343ac52c296d5ab8adb40066939bca5b3ab376` |
| `apps/media/scripts/car-paint-fidelity.test.mjs` | `428d4e6764e91ad2828215b530a489133495aa6c3faa99030edfaa4aa8faa588` |
| `apps/media/hero-imported.json` | `cef8333bb413375b106963b2d34997db3828d3ee358efa762d4ee2ba884c1f0a` |
| `apps/media/hero-models.json` | `6990e105f0578743990b3a41217f4bfe11314592c6405df66556cee1e1615e28` |

## Recipe and Material Evidence

- Importer lines 22-25 select `Paint 1 Carmine`'s actual normal texture, reject a missing or unexpected image hash before publication, and copy its bytes before transforms. Line 40 restores that texture's image and `image/png` MIME after the existing transform chain. Source revision, full source GLB SHA, geometry recipe, normalization, exclusion rules, and publication helper are unchanged. I did not execute/import the generator.
- Final JSON `materials[9]` (`Paint 2 Carmine`) and `[10]` (`Paint 1 Carmine`) both retain `normalTexture.index=6`. `textures[6]` now correctly uses core `source=6`, not `EXT_texture_webp`; its sampler remains index 1. Other images still use WebP, so retaining required `EXT_texture_webp` is correct. The installed extension writer dispatches by actual MIME.
- Embedded `images[6]` is a 46,314-byte, 128x128 RGB PNG with SHA-256 `3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e`. Its independently decoded raw RGB SHA is `f084dbffd99641c57a397c5de7b5defec889114310ed07861711b043bf787477`, matching the supplied prior source pins. Exact encoded and decoded equality is stronger than an approximate angular-error threshold. No remote source was fetched again.
- Both paint strengths remain float32 `0.30000001192092896`; magnification/minification remain `9728`/`9986`, wrap S/T `10497`/`10497`, and scale `[30,30]`. Paint 2's authored rotation `0.585398` remains intact; Paint 1 retains its absent/default rotation. All material JSON, including clearcoat, roughness, AO strength/UV selection, remains exactly equal to base.
- Installed Three GLTFLoader continues to assign this slot as a normal data map without an sRGB override. PNG does not require a new loader path or renderer setting. No rendered appearance or decode-time performance conclusion is claimed.

## Final Artifact and Scope Evidence

Read both GLBs directly, parsed their JSON/BIN chunks, and independently decoded them with existing NodeIO/ALL_EXTENSIONS and an initialized MeshoptDecoder. Compared against `git show 4320a0c:apps/web/public/heroes/car.glb` in memory.

- All **508 decoded accessors / 2,623,619 attribute-and-index bytes** are exactly equal, including component types, normalization, and values. All **410 compressed geometry bufferView payloads** are also byte-identical. Counts remain 95 meshes, 106 nodes, 22 materials, and 134,971 triangles.
- Scene, node, mesh, accessor, material, sampler, asset/copyright, and extension declarations are exactly equal. This preserves actual live primitive-material assignments, tangents, UVs, transforms, and source attribution, not merely aggregate geometry counts.
- All **12 other embedded image payloads** are byte-identical. Thirteen images and twelve texture objects remain; unused `images[12]` retains SHA `91528e0787ccc359eb09779d727bfa40545837d9c7a52a2bf0a2aba971f5847b`. No F3 cleanup was smuggled into this repair.
- After accounting for image 6's MIME/texture-source switch, its bufferView size, buffer length, and consequent byte offsets, **all remaining GLB JSON is exactly equal**. No unexplained serialized change remains.
- Both manifests' Car records match each other and the final artifact's hash/bytes; only the expected Car size/hash, PNG-exception description, source-paint pin, and version 2 changed. Every non-Car record is exactly equal to base.
- Independently byte-compared **all nine other public GLBs and all ten posters** against base. All 19 match. The complete tracked diff contains no UI, mathematical engine, lighting, timing, dependency, or other product-source changes.
- Adapted CC-BY-4.0 attribution, Eric Chadwick/DGG credit, source revision and source hash remain unchanged. Unity Fan/CC0 remains the ancestor attribution established by the prior pinned-primary-README audit, not a CC0-only claim for the adapted asset. This review does not supply new legal clearance.

| Measured Budget | Actual | Limit | Remaining |
| --- | ---: | ---: | ---: |
| Car GLB | 2,049,728 bytes | 2,359,296 | 309,568 |
| Entire public tree | 9,944,342 bytes | 10,485,760 | 541,418 |
| Public file count | 25 | 28 | 3 |

Actual final GLB growth is **36,180 bytes**, not the 36,214-byte raw image-payload delta; container/JSON changes account for the difference. Every other public file also fits its existing per-file cap. No budget was raised.

## Test Evidence

Commands below ran from `apps/media` unless otherwise stated; no npm invocation or full suite:

- `node --test scripts/car-paint-fidelity.test.mjs`: **1/1 passed**.
- `node --test --test-name-pattern '^refined car carries' scripts/photoreal-assets.test.mjs`: **1/1 selected test passed**, including existing logo exclusions, self-containment, attribution, manifest hash, and Car budget.
- `node --check apps/media/scripts/import-refined-car.mjs` from repository root: passed.
- `git diff --check 4320a0c`: passed at review time.
- Pure in-memory asset comparisons/assertions above: passed, including all protected payloads, geometry, full JSON boundary, manifest records, and current public budgets.
- Executed the **actual new test body** in child Node processes with only its asset-read binding substituted in memory: candidate green; **six expected reds** for the base lossy artifact, a divergent second-paint normal pointer, reduced flake strength, changed mag filter, changed min filter, and changed tiling. No test, fixture, source, or asset was written for these controls.

The test is meaningfully artifact-based: it decodes the shipped GLB, requires both paint resources and shared texture identity, checks encoded and raw source hashes, MIME/dimensions, strength, filtering, tiling, and the existing cap. It is automatically discovered by the unchanged `scripts/*.test.mjs` contract command. It is not a complete future geometry/scope/collection-budget guard; those boundaries were independently compared here.

## Boundaries

Only this report was authored. No source edits, generator/rebuild, browser, render, server, dependency/npm activity, cloud operation, commit, or push. Parent owns serial heavy gates, prepared/vendor refresh proof, visual comparison, exact-final-head CI, and any release decision. This bounded result does not establish that inherited noisy-flake art, washed-out surfaces, framing, F2/F3, or all-normal fidelity have been solved.
