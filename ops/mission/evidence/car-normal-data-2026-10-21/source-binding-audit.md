# Independent Car Source-Binding Audit

## Findings First

1. **Six of the seven surviving normal-image groups are not source-RGB faithful.** Mechanical, shared Interior/Floormat/Panel Sides, Interior 2, Disc, Tireside and Tiretread all retain their original dimensions but have different decoded RGB hashes after the existing lossy WebP conversion. This is a data-fidelity finding, not a visual-error score or codec recommendation. No codec was encoded or measured by this sidecar.
2. **The prior paint invariant is intact.** Both Carmine paints share the original 46,314-byte PNG, SHA-256 `3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e`, and its 128 x 128 x 3 raw RGB SHA-256 remains `f084dbffd99641c57a397c5de7b5defec889114310ed07861711b043bf787477`. Preserve this PNG byte pin in addition to any all-normal RGB invariant.
3. **None of the seven normal images or texture aliases is also bound to any non-normal slot.** This holds independently for the original source and both inspected optimized files, including all material extensions and duplicate texture aliases of a shared source image. Graph slots are exactly `['normalTexture']` for every group. There are 11 surviving normal-bound material definitions and seven unique normal images. Panel Sides remains a real binding even though its normal strength is zero.
4. **Exactly one orphan image survives in before/current:** image 12, SHA-256 `91528e0787ccc359eb09779d727bfa40545837d9c7a52a2bf0a2aba971f5847b`, **40,620 bytes**. It has no raw texture source reference, no graph parent except Root, no texture slots, and no extras. This is not one of the seven normal groups.
5. **`KHR_materials_iridescence` is stale and OPTIONAL in before/current.** Its graph has zero properties; the binary JSON has zero extension-object occurrences and only the one name in `extensionsUsed`. It is absent from `extensionsRequired`. Do not generalize that result to all zero-property extensions: the shipped required `EXT_meshopt_compression`, `EXT_texture_webp`, and `KHR_mesh_quantization` also have zero graph properties and must stay.
6. **The existing test is paint-only, not an all-normal or cleanup contract.** It pins the original paint image and RGB, sharing, approximate strength, mag/min filters, tiling and budget. It does not pin the other six normal RGBs, all aliases, wrap modes, texCoord, complete transforms, orphan count, or extension declarations. In particular, Paint 2 Carmine has authored rotation `0.585398`, and Panel Sides has strength `0`; both currently match source and need preservation.

## Checkpoint And Independence

Inspected on 2026-10-21, with final data reads around `2026-10-21T22:08:28Z`, on branch `codex/restoration/asset-heroes`, HEAD `35745b7f1e0b8b18a6279f7c54b47d4f0f9ea50e`. The worktree started clean. This report describes that checkpoint, not a later parent-generated candidate.

| Input | Bytes | Independently recomputed SHA-256 |
| --- | ---: | --- |
| `.superpowers/sdd/2026-10-21-car-data-fidelity/original-source.glb` | 11778688 | `c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b` |
| `.superpowers/sdd/2026-10-21-car-data-fidelity/before-car.glb` | 2049728 | `8b47003fb31a8d1e41f271a05bf64bf6f68b84625d18992f1201a7f66e65ce54` |
| `apps/web/public/heroes/car.glb` | 2049728 | `8b47003fb31a8d1e41f271a05bf64bf6f68b84625d18992f1201a7f66e65ce54` |

The two optimized files were also compared with `assert.deepEqual` on their complete Buffers: byte-identical. The source SHA exactly matches the requested pin. All image/RGB pins below were recomputed from those files, without reading the parent's normal or codec measurement files.

Inspected code snapshots:

- [Importer](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/import-refined-car.mjs:22>), file SHA-256 `db3ba6e68ad96013064c4220e1343ac52c296d5ab8adb40066939bca5b3ab376`.
- [Current fidelity test](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/car-paint-fidelity.test.mjs:11>), file SHA-256 `428d4e6764e91ad2828215b530a489133495aa6c3faa99030edfaa4aa8faa588`.

The importer verifies the source GLB hash, saves the original paint PNG, runs its existing prune/dedup/weld/simplify/textureCompress/meshopt pipeline, restores only that paint PNG, normalizes the stage, and writes through the existing budget/publication boundary. The six other normals still take the global quality-90 WebP path. The initial broad prune is not proof of cleanliness after all later transforms.

## Literal Independent Source Pins

Indices below are **binary JSON indices**, not glTF-Transform graph indices. Every source image in this table is `image/png`; RGB is the unresized output of `sharp(imageBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true })`, with three channels. No gamma, normal reconstruction, resize, transform, or encoder was applied by this audit.

| Group | Source image / texture indices | Source dimensions | Source PNG bytes | Source PNG SHA-256 | Source raw RGB SHA-256 |
| --- | --- | --- | ---: | --- | --- |
| Mechanical | image 0 / texture 0 | 512 x 512 x 3 | 358161 | `400d7424a415923bedec4f8ea60e32e55bd88a38dc16d6f9898d8b3bbf400a18` | `94f38d35a8cec24cc624a636bc5ffa95b1d8831e77ae007c3e86648f68684816` |
| Shared interior | image 4 / textures 4, 5 | 64 x 32 x 3 | 3528 | `c3b849657bb6b35957436ad08a3697961ea347d1a577f4660c900d12c9132442` | `0d1c358c3355bba2e4d4fe981644ce6bde6cf69495b62cb10867831b53e58cd3` |
| Interior 2 | image 5 / texture 6 | 32 x 32 x 3 | 198 | `48d4d9e0fee0b489c3de6869aeadb7c031014bba1c101c313358c2dc89a33f23` | `35bc19e9728db6b7aac623cafc9fe5e3350e08fbe0acd25014d627ad4b79df48` |
| Carmine paint | image 7 / texture 8 | 128 x 128 x 3 | 46314 | `3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e` | `f084dbffd99641c57a397c5de7b5defec889114310ed07861711b043bf787477` |
| Disc | image 9 / texture 10 | 128 x 128 x 3 | 8500 | `b4318c4125420cc54d3bc712a4546337ab285bec787d9222ab1fbee81d6dc36f` | `166b768e816839ef1c75381037d222c0aa5dd23145a726306a78b37f4acd89c7` |
| Tireside | image 11 / texture 12 | 1024 x 1024 x 3 | 475684 | `54297a9940353fdab05356ebd1649d967d0cf316968b15f496903ec00731b2c1` | `674e6d0beee9142156c5cd99c026d7c3cda2fa0168ba6b8a323de8bad9a58a5c` |
| Tiretread | image 12 / texture 13 | 512 x 128 x 3 | 53752 | `10a31cec483d1c8dd9f68798f282e5b348200754e94ce940a6c3caf5f82a539b` | `ff08861bab392eb1e495e36827ebd7097cee3ee9d8bb1831bfe21fdf62f9e0e4` |

## Before/Current Normal Pins

These pins apply to both byte-identical optimized files. All retain the corresponding source dimensions above. Texture source resolution must include `textures[i].extensions.EXT_texture_webp.source`; checking only core `textures[i].source` misses six normal groups. The paint uses core `source` and PNG.

| Group | Current image / texture | MIME | Encoded bytes | Current image SHA-256 | Current raw RGB SHA-256 |
| --- | --- | --- | ---: | --- | --- |
| Mechanical | 0 / 0 | image/webp | 37712 | `25a90bd7ada0e2878a2fd6f107d114bb491a34c73f9fbc660d611fba35004637` | `18abfeeb63db8a48b378407bed70b782b93a5c380e7be38538f5035c5b38d6bb` |
| Shared interior | 3 / 3 | image/webp | 706 | `0601c4c0b1e2604c137c2ab431c7038558f6ebda70f317d868e3f3ac1b18c734` | `520029409ca306c527f52b8dcdc5d4fe97230f0923e369d6813a23f52d449842` |
| Interior 2 | 4 / 4 | image/webp | 148 | `6afe309a61138a5d4d5180f275d039268ca6bf6d8a15149aed18d11a0a70e2f5` | `a1b03cbafaf53e616b0452ff4d7e5b85cf45d596061e20becb449d0c6ddcaf8a` |
| Carmine paint | 6 / 6 | image/png | 46314 | `3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e` | `f084dbffd99641c57a397c5de7b5defec889114310ed07861711b043bf787477` |
| Disc | 8 / 8 | image/webp | 1678 | `63fea217bb1d36dd04b3b7bbc526f655e2bc087ed66f757fd17a909253d6ca19` | `9505af88c394f18ea9e2bb7cd381595bc6b0ca3616b16f2907c7568da67daa2e` |
| Tireside | 10 / 10 | image/webp | 67900 | `0767b8325770466dbb585e817c0bb853e8e7f5c864f4083b9f052274d9a4a3ae` | `10410848d4fc7c06890f595cf25b767acf5222d8e8a0effe9b76894179bfa816` |
| Tiretread | 11 / 11 | image/webp | 6514 | `0dad4bb303b015b4d1524f65ac3add88786775571e3fdb36d2d28b85e1c781d7` | `90c0521862bfff6148e321da83e3a79d4831267717a670c810b172d076210d75` |

## Exact Surviving Material Aliases And Sampling

Every row below is bound through core `normalTexture`, with source and before/current settings independently compared for equality in the structured graph. All use `texCoord = 0`, with no `KHR_texture_transform.texCoord` override. All offsets default to `[0,0]` except Tiretread; all rotations default to `0` except Paint 2 Carmine. Omitted transforms mean identity, not absence of UV use.

Sampler A: `magFilter=9729` (LINEAR), `minFilter=9987` (LINEAR_MIPMAP_LINEAR), `wrapS=wrapT=10497` (REPEAT).

Sampler B: `magFilter=9728` (NEAREST), `minFilter=9986` (NEAREST_MIPMAP_LINEAR), `wrapS=wrapT=10497` (REPEAT).

Source wrap fields are omitted and default to REPEAT; before/current writes them explicitly. Preserve semantic defaults rather than treating that spelling difference as drift.

| Group / exact material alias | Source material | Current material | normalScale | Sampler | Transform scale | Transform offset | Rotation, radians |
| --- | ---: | ---: | ---: | --- | --- | --- | ---: |
| Mechanical | 0 | 0 | 1 | A | [1,1] | [0,0] | 0 |
| Interior 1 | 3 | 3 | 1 | A | [200,400] | [0,0] | 0 |
| Floormat | 4 | 4 | 1 | A | [2,3] | [0,0] | 0 |
| Interior 3 Carmine | 6 | 6 | 1 | A | [200,400] | [0,0] | 0 |
| Panel Sides | 28 | 21 | 0 | A | [1,1] | [0,0] | 0 |
| Interior 2 | 7 | 7 | 1 | A | [100,100] | [0,0] | 0 |
| Paint 2 Carmine | 10 | 9 | 0.30000001192092896 | B | [30,30] | [0,0] | 0.585398 |
| Paint 1 Carmine | 11 | 10 | 0.30000001192092896 | B | [30,30] | [0,0] | 0 |
| Disc | 17 | 16 | 1 | A | [20,10] | [0,0] | 0 |
| Tireside | 18 | 17 | 1 | A | [1,1] | [0,0] | 0 |
| Tiretread | 19 | 18 | 1 | A | [1,4] | [0,1.5] | 0 |

Source-only normal aliases no longer present in before/current are `Interior 3 Pearl` (material 26) and `Interior 3 Graphite` (27), both sharing source image 4 / texture 4, sampler A, strength 1, scale [200,400]; and `Paint 1 Pearl` (22), sharing source image 7 / texture 8, sampler B, strength 0.05, scale [30,30]. They all use UV0, zero offset and rotation. Floormat's separate source texture 5 is another alias of image 4, not an eighth normal group; current shares texture 3 across all four surviving interior aliases.

### Cross-Slot Proof

- Recursively enumerated every JSON object with an `index` field, including extension subtrees: 51 texture-info references in source, 33 in each optimized file. Resolved all texture source alternatives, then reverse-mapped all texture indices using each normal image.
- For every normal-image byte hash, searched all image definitions for duplicate payloads. Each has exactly one image definition in each file; source interior is referenced by two texture definitions. No duplicate image hides a non-normal alias.
- All reverse-mapped references for those images end at `/materials/<i>/normalTexture`, never base color, metallic/roughness, occlusion, emissive, clearcoat-normal, or another extension property.
- Independently read each GLB with `NodeIO`, registered `ALL_EXTENSIONS` and `MeshoptDecoder`, and checked `listTextureSlots()` plus parent edges. Every normal group's only non-Root parents are the material aliases above (plus the listed source-only aliases). No extension property consumes one of these images.

This permits a normal-only replacement boundary for the seven groups at this checkpoint. A future unexpected alias or extension slot must fail the boundary, not silently inherit this conclusion.

## Orphan And Extension Proof

Source has 14 images / 15 JSON textures / 29 materials / 14 graph textures. Before/current has 13 images / 12 JSON textures / 22 materials / 13 graph textures. A graph Texture represents an image resource; its count is not the serialized texture count.

For the one optimized orphan:

- JSON path `/images/12`: `image/webp`, `bufferView=12`.
- Buffer view 12: `{ "buffer": 0, "byteOffset": 432704, "byteLength": 40620 }`; image interval `[432704,473324)` within BIN.
- Encoded SHA-256: `91528e0787ccc359eb09779d727bfa40545837d9c7a52a2bf0a2aba971f5847b`; exactly one matching image/graph resource.
- Decoded 512 x 512 x 3 RGB SHA-256: `c92706c69ac4c8ea8f2b4aef414419a8dd715decf3030ffeea461f99fea4a8f1`.
- Zero texture references through core source or any texture extension source. The only `bufferView=12` reference is `/images/12/bufferView`. No other plain or compressed buffer range overlaps its bytes.
- Graph parents exactly `[Root]`, `listTextureSlots=[]`, extras `{}`. Its bytes can be removed after these conditions are rechecked against the actual input.

The original source's non-normal iridescence thickness map is image 13, texture 14, PNG bytes 240363, source SHA-256 `6c1ad93ac6bcb36becffda8c449d9aa2b024597bd2e2f3ac3a8a4a4c9a4cd787`. Its live source binding is `/materials/22/extensions/KHR_materials_iridescence/iridescenceThicknessTexture`, scale [2,2]. Source also has an iridescence property on material 25. These source facts do not license removing iridescence before the actual variant/material removals: source has two live properties, optimized files have zero. This audit did not encode that PNG to prove a codec-byte lineage to the orphan.

| Optimized graph extension | Required? | Graph properties | Binary JSON evidence |
| --- | --- | ---: | --- |
| EXT_meshopt_compression | yes | 0 | 410 compressed buffer views and fallback buffer declaration |
| EXT_texture_webp | yes | 0 | 11 live texture source objects |
| KHR_materials_clearcoat | no | 2 | live material extension objects |
| KHR_materials_emissive_strength | no | 4 | live material extension objects |
| KHR_materials_iridescence | no | 0 | name only in extensionsUsed; no extension object anywhere |
| KHR_materials_transmission | no | 1 | live material extension object |
| KHR_mesh_quantization | yes | 0 | implicit accessor storage semantics; no dedicated property type |
| KHR_texture_transform | no | 9 | live texture-info transforms |

Binary JSON literal occurrences of `KHR_materials_iridescence`: source 3 (declaration plus two properties), before/current 1 (declaration only). Raw `extensionsRequired` is exactly `["EXT_meshopt_compression","EXT_texture_webp","KHR_mesh_quantization"]`. A zero-property sweep, even one described as extension cleanup, would destroy required functionality.

## Minimal Fail-Closed Cleanup Boundary

### Existing Installed APIs

All inspected glTF-Transform packages are locally installed version **4.5.1**, resolved through `apps/media/package.json`, not a global install.

- [listTextureSlots](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/node_modules/@gltf-transform/functions/src/list-texture-slots.ts:14>) lists graph parent-edge names excluding Root. [listTextureInfo](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/node_modules/@gltf-transform/functions/src/list-texture-info.ts:20>) supplies each alias's UV/sampler information. Combine them with exact material aliases and raw JSON checks rather than assuming one texture index per image.
- [prune](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/node_modules/@gltf-transform/functions/src/prune.ts:103>) is broad by default. Its texture branch tree-shakes resources and, by default, can also replace solid textures with material factors. Its accessor branch can remove/shift UV attributes. The documented source explicitly says it does not identify unused ExtensionProperty instances.
- A constrained alternative is `prune({ propertyTypes: [PropertyType.TEXTURE], keepSolidTextures: true, keepExtras: true })`, with an exact prevalidated removal set and post-diff assertion. It cannot by itself remove the stale extension declaration. Do not add an unqualified late `prune()` for this task.
- The narrower API is `texture.dispose()` after checking the exact orphan hash/size and that it has no parents except Root. [Extension.dispose](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/node_modules/@gltf-transform/core/src/extension.ts:83>) disables a declaration and disposes its properties; it is safe here only for the explicitly named, independently proven empty, optional `KHR_materials_iridescence` instance.
- [Writer declaration logic](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/node_modules/@gltf-transform/core/src/io/writer.ts:886>) serializes enabled extensions even when they have no graph properties. That is why an empty instance persists until explicitly disabled. It also filters unregistered extensions, so omitting registration is not a safe cleanup mechanism.
- `KHR_mesh_quantization` intentionally defines no ExtensionProperty types. `EXT_texture_webp` rewrites source locations during I/O, not through per-material extension properties. `EXT_meshopt_compression` decodes on read and its [write path calls encodeGltfBuffer](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/node_modules/@gltf-transform/extensions/src/ext-meshopt-compression/meshopt-compression.ts:412>). A NodeIO read/write roundtrip is **not** a byte-preserving patch of shipped compressed geometry, even with no explicit mesh transform.

### Recommended Limits

1. **In the existing source-import generation pass only**, perform the narrow cleanup after the operations that can orphan resources and before its existing final serialization. Require the actual orphan set to be exactly the expected resource; verify hash, size, MIME, empty extras, and no non-Root parents; then dispose only it. Use the pin appropriate to that pipeline boundary, not an assumption that source PNG and encoded WebP hashes are interchangeable. Require exactly the explicitly allowlisted iridescence extension, `isRequired() === false`, and zero graph properties before disabling it; verify no iridescence extension object remains in final serialized JSON. For a shipped-binary patch, require zero raw objects as an input precondition too. The original source legitimately has two live objects and must not be cleaned using that optimized-file conclusion. If any precondition changes, stop. Do not sweep all empty extensions, remove required declarations, prune zero-strength bound normals, or add another geometry/texture optimization pass.
2. **For patching an already-shipped GLB, do not serialize its decoded graph through NodeIO.** Use a bounded structured JSON/BIN patch or repack that copies every retained image and compressed geometry payload verbatim. The current target orphan is the last image, so deleting `/images/12` does not change any live image source index. Removing buffer view 12 does require remapping all later `bufferView` references, including accessor/sparse references if present. If compacting BIN, update offsets only for spans in the changed physical buffer, including `EXT_meshopt_compression.byteOffset`; preserve its mode/filter/count/stride. Buffer 1 is the virtual meshopt fallback, not the embedded physical buffer: its logical offsets/size must not be shifted as though it were BIN. Recheck range non-overlap, four-byte alignment, chunk/header lengths and every reference. Abort unknown reference/extension/layout cases instead of guessing.
3. **Preserve all required extensions exactly** and all other optional extensions except the one allowlisted empty iridescence declaration. If any texture becomes PNG in the parent's fidelity work, change only that texture's image-source/MIME representation as required; non-normal WebP bindings still require `EXT_texture_webp`. Never remove it merely because all normals are now lossless.
4. **Postconditions should be exact, not visual tolerance checks:** seven groups, eleven surviving aliases; the seven source dimensions/RGB pins above; the original paint PNG pin; exact strength/sampler/UV transforms including rotation, offset and zero strength; no cross-slot alias; zero orphan images; no stale iridescence; unchanged retained non-normal payloads/materials/scenes/geometry/credits; unchanged existing size caps. A changed expected set must fail rather than be auto-approved.

For the cleanup-only delta at this checkpoint, the expected result is 12 images / 12 JSON textures / 12 graph textures, still 22 materials, with iridescence absent and all other extension semantics intact. Normal replacement encoding and final candidate budget/manifest outcomes belong to the parent and were not evaluated here.

Geometry-copy baseline for before/current: **508 accessors**, **410 meshopt payloads**, **1,381,186 compressed bytes**. SHA-256 of their payload bytes concatenated in buffer-view order, without padding: `5980ce54ffa3e5d3f0783b45ed2006942e7714d6a83a17a43b67781304eadc8f`. Preserve each individual payload and its metadata, not only this aggregate digest. Before/current BIN length is 1855144; buffer 1 virtual fallback byteLength is 2964768. First compressed span begins at physical offset 473328, after the orphan and padding. All these are baseline facts, not a final-candidate review.

## Methods, Verification And Constraints

- Used local PowerShell reads and inline Node ESM scripts only. Read GLB 2 headers, JSON/BIN chunk lengths/types and embedded buffer-view ranges; all three declared total lengths match actual file lengths. None has an external image/buffer URI.
- Used `createRequire(process.cwd() + '/package.json')` with working directory `apps/media` for the installed packages: Node `v22.22.2`, sharp `0.35.5`, libvips `8.18.7`, libwebp `1.6.0`, meshoptimizer `0.25.0`, glTF-Transform `4.5.1`.
- Independently SHA-256 hashed embedded image payloads and decoded RGB. Performed read-only structured graph validation with `ALL_EXTENSIONS` and `MeshoptDecoder`, plus raw JSON reverse-reference/extension scans; no encoder was registered or called.
- Inline assertions passed for the source hash, complete before/current byte identity, 11 aliases / 7 groups, all surviving source-equivalent strength/UV/sampler settings, normal-only graph slots, exact unique orphan with empty extras, optional iridescence with zero properties, and original paint PNG/RGB invariants.
- Inspected the importer and existing test but did **not** execute the importer, any generator, repository test runner, browser, build, install, heavy check, CI, network/cloud operation, commit, push, or mission-state update. Did not inspect or alter parent codec measurements, services, unrelated agent `01a15930`, or user ports `53143` / `53144`.
- Only authorized write: this Markdown report. No source, asset, test, manifest, dependency, or configuration changes were made by this sidecar.

**No photoreal, production, hardware, visual/art, codec-selection, or final-asset approval is given. A separate fresh review of the actual implemented candidate remains required.**
