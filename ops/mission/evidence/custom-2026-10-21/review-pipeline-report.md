# Independent Source / PBR / Publication Review

Mission Control Tier 2 verifier. Baseline and HEAD: `8e2f25ef6b81ffc65b9f96644170834c511078d3`.
Candidate probe window: 2026-10-21T09:35:24.225Z to 2026-10-21T09:35:26.807Z. No product edits.

## Findings First

**[P2] Protected rebuild harness misses retained-source and nine-other-video preservation.**
Location: `.superpowers/sdd/2026-10-21-custom/rebuild-proof.mjs:11-12,20,23,27-30`;
reviewed SHA-256 `797c46d8227158188982049b69f1fbe381d776dc87f20fb02d1bbe57d5cc78f1`.
The pre-build snapshot covers manifests and GLB/WebP only. The source-path Git
check runs only before any command. Video records are first read AFTER packaging.
Consequently an intervening retained-source change is not tested after rebuilding,
and changing an unrelated MP4 together with its verification hash becomes the new
expected value. This does not prove the explicitly required preservation.

Reproduced by executing the unchanged harness validation in a VM with command
execution and all writes replaced by in-memory mocks. Control passes. Mutating
`apps/media/sources/house/oak-albedo-v1.png` after the initial Git checks still
passes. Mutating `personal.mp4` and its matching verification hash before
packaging also still passes, including all 40 payload/hash checks. These are
virtual mutations, NOT allegations that those real files changed. The mock
packager retains the unchanged packager's source/hash and manifest-byte checks;
no real builder, package command, writer, or child process was invoked.

Parent action: snapshot all retained source/build/config bytes and the original
nine MP4 bytes AND their records before running commands; assert them after each
rebuild and packaging. Capture all ten current video records before packaging
(Custom may already have been intentionally rendered). Preserve explicit ten
distinct IDs including Personal and Recreation, actual 40 payloads, and manifest
snapshots. Require the two adverse fixtures to fail before accepting that proof.
This is a proof-gate defect, not a demonstrated Custom product regression.

No P1 or P2 defect found in the pinned Custom builder, procedural maps, or locked
publication callback. Source/PBR/publication pass; overall preservation proof
remains conditional on closing the P2 harness finding.

## Exact Pins

Every value below was equal before AND after the independent probe. Builder and
test raw hashes also equal their LF-normalized hashes in this working tree.

| Item | Bytes | SHA-256 |
| --- | ---: | --- |
| Custom GLB | 237124 | `45129c97f6177442f9381fa56683c3c7c117b1e928235f66295f665113948c7b` |
| Builder | 13356 | `9fff1a7c8ab02f7e1aab67438731a7d22469ff2b266f4f08c6852fc9d3593e17` |
| Custom test | 30949 | `435156a825ef814c2114e75a48c8cc139678d5d65db6ec06e097cde49e74dcc5` |
| Config raw | 1248 | `26ab2c71429e558b26a4108802e785088ce7e1cc231ea89db6e0ad4ed5531532` |
| Config canonical JSON | n/a | `16311e6307a5e2e3edef5bc424f95bf8e3762570c1cc5e254e4f111dea7d0dd0` |
| Imported manifest | 9214 | `217d3c84edb12b6568302412b44648eb87bd2ee558db9caa72f1f29c02af36cf` |
| Model manifest | 9214 | `d3e297e3bd06c65f33ae6472ceddb95780103d370c9a7a89c077dbfb0d7ef6d6` |

The Custom records in both manifests deep-equal each other and match the actual
model, normalized source, and canonical config hashes. Record ordering explains
different whole-manifest hashes.

## Fresh Independent Checks

- Executed the original builder in a VM with real installed Three/Sharp/Meshopt/
  glTF Transform libraries, intercepting saveRefinedHero instead of publishing.
  In-memory output byte-equals the entire pinned GLB; generated record deep-equals
  the published record. Zero actual filesystem writer invocations.
- Independently reconstructed all 256 x 256 RGB fields from the four height
  algorithms using scalar math, wrapped central differences, normalized directions,
  and byte rounding. All 12 encoded textures byte-equal independent re-encoding
  with the declared Sharp codec settings. Actual RIFF chunks: four VP8L normals,
  eight lossy VP8 color/metallic-roughness images. All are embedded, actually used,
  with no image or buffer URI dependencies.
- Lossless decoded normal bytes exactly match quantized expected directions.
  Across sets, decoded vector lengths range 0.9958854 to 1.0041284, reflecting
  8-bit quantization, not mathematically exact unit vectors. NormalScale values
  are Steel .18 / Radial .16 / Dial .11 / Enamel .06. No downsampling step exists
  in this 256px recipe. No claim of physically measured relief or exact filtering.
- Base-color textures decode as neutral equal-RGB gray. glTF factors are linear;
  the installed GLTFLoader assigns base-color sampling sRGB and normal/metallic-
  roughness sampling as data without an sRGB override. Roughness uses G, metalness
  uses B; the packed R field is NOT assigned to occlusion. There is no AO claim.
- Actual decoded packed channel ranges (R / G / B):
  Steel 250..255 / 68..79 / 248..255;
  Radial 252..255 / 65..71 / 252..255;
  Dial 250..255 / 118..133 / 250..255;
  Enamel 250..255 / 41..57 / 0..6.
  Thus lossy packed metal fields are not exact 0/255 channels. Effective metalness
  multiplies B by .84 / .94 / .86 / 0 respectively; enamel remains nonmetallic.
- Actual rendered slot use: Steel triplet on 8576 triangles, Radial on 10832,
  Dial on 768, shared Enamel triplet on both 12-triangle needle halves.
  Untextured glass accounts for 960. No orphan textures or emissive maps/factors.
  Textured roughness factors are 1; enamel clearcoat .82/roughness .12 is retained.
  Five textured materials are OPAQUE; glass is BLEND alpha .12, metalness 0,
  roughness .07, no transmission/refraction claim. All are single-sided.
- SteelLinear KHR_materials_anisotropy strength .38 is optional, not required.
  With no authored tangents, the installed Three shader derives its tangent frame
  from actual noncollapsed UVs, including normal-map UVs; no anisotropy map or
  emission substitutes for directionality. GPU appearance remains unreviewed here.
- TEXCOORD_0 is finite and in 0..1, with matching accessor counts. All 12240 unique
  nondegenerate textured triangles have noncollapsed UV determinants. Texture
  slots use UV0, repeat wraps, and [1,1] KHR_texture_transform scale.
  Referenced POSITION accessors are normalized 16-bit signed values; referenced
  UVs are normalized 16-bit unsigned values. Unused/fallback float accessors are
  not misreported as actual mesh precision. Original meshopt source options
  explicitly remain quantizePosition:16 and quantizeTexcoord:16.
- Actual counts: 13200 unique / 21160 rendered triangles, 17 meshes. The extracted
  unchanged preflight guard accepts every limit exactly and rejects each +1:
  model 524288 bytes, unique/rendered 65000 each, public 10485760 bytes.
  Current public tree: 9907442 bytes, 578318 bytes headroom.

## Locked Publication

Fresh probes execute the ACTUAL callback captured from the original evaluated
builder, under the ACTUAL saveRefinedHero/withHeroManifestLock source evaluated
with mocked filesystem operations. The mock asserts lock ownership at every
manifest read, collection read, asset write/rename, and manifest write/rename.

At exact 10MiB: acquire wx lock -> owner -> read/parse both manifests ->
fresh public size -> target stat -> asset temp write/rename -> two atomic manifest
writes/renames/cleanup -> close/unlink lock. At cap+1, despite a stale preflight
total of zero, execution stops after fresh size/stat; no asset or manifest write.

Removed-guard and stale-total mutants permit an over-cap write in the negative
controls, so these are observable regressions, not accepted alternatives.
Read-import/read-inventory/size/stat/asset-write/asset-rename failures propagate,
release the lock, and prevent subsequent publication stages. A manifest-write
failure occurs AFTER asset rename and therefore demonstrates the existing
nontransactional boundary. No real lock file, asset, or manifest writer ran.
These probes prove callback/lock ordering, not OS contention or crash durability.

## Scope, History, Style

The baseline tree comparison checked 1299 tracked files; 306 differed only by
checkout CRLF normalization. Only Custom GLB/manifests and the parent's planned
credits/collection/design docs differ among tracked files. Separate exact JSON
comparison confirms all nine other model/import records and all ten poster
records unchanged; Git blob comparison confirms nine other GLBs and ten WebPs.

Financial/native/persistence/UI/studio/camera/timing/dependency/SQL/CI and shared
publication/builder/package APIs have no diff against baseline. The new builder
follows the existing asset-local Recreation pattern: procedural helpers, explicit
recipe, local texture assignment, shared lock/publication helper, same optimizer/
cap boundaries. No broad refactor or dependency addition. git diff --check passes.

Retained logs show 14 genuine ERR_ASSERTION REDs (no ENOENT/module-load failure),
full initial 129 pass / 14 fail, and current full-media 143 pass / 0 fail.
Those full test runs are parent/worker evidence read and hashed here, NOT rerun
by this reviewer. Authoring diagnostics, initial UV source copy, and early failed
254928-byte GLB are retained and hashed in the raw probe output. The first failed
side-UV implementation is present in first-builder.mjs; diagnose-first.log records
collapsed UVs and the nonaligned dial-ray diagnostic.

The parent added the planned Custom credits/collection/design/contract updates
during review. Their accurate approximate-PBR/art-gate wording is consistent with
the candidate. No present product bug is filed merely because those docs were
pending at the start, and no speculative P3 is promoted to P2.

## Evidence And Reproduction

All reviewer files are under the permitted review-pipeline scratch prefix:
- review-pipeline-probe-scratch.mjs
- review-pipeline-final-raw-scratch.log (authoritative final successful probes)
- review-pipeline-harness-scratch.mjs
- review-pipeline-harness-raw-scratch.log (two reproducible P2 negative controls)
- review-pipeline-scope-raw-scratch.log (HEAD, protected diff, manifest diff, whitespace)
- Earlier successful review-pipeline-raw-scratch.log and
  review-pipeline-actual-callback-raw-scratch.log are intermediate, not final proofs.

Run read-only probe from repo root:
```powershell
git ls-tree -r 8e2f25ef6b81ffc65b9f96644170834c511078d3 | node --experimental-vm-modules .superpowers/sdd/2026-10-21-custom/review-pipeline-probe-scratch.mjs
```
The harness probe takes baseline models/imports/posters JSON on stdin; its exact
invocation is preserved in review-pipeline-harness-command-scratch.txt.
The VM harness emits the original PASS messages even for adverse fixtures;
read the scenario JSON, not those mocked-command PASS labels as real rebuild proof.

## Limitations / Handoff

No network, installation, commit/push, browser, GPU, server, render, asset writer,
or spawned subprocess was used by these Node probes. Shell Git commands were
read-only. All reviewer disk writes used apply_patch on permitted scratch/report
paths. No duplicate full-media suite. Geometry/manifold/contact fidelity review
belongs to the separate geometry verifier.

Parent must execute actual protected rebuilds, real 40-payload package,
source/nine-video preservation checks after fixing the P2, actual renders/pixels,
web/native/SQL/hosted/CI/transport and final collection art gates. This report
does not approve those unexecuted gates or production promotion.

Publication is cooperative and per-file atomic, NOT a multi-file crash transaction
or rollback guarantee. Lexical URL-prefix checks are NOT realpath/symlink
confinement and do not protect against unrelated noncooperating filesystem writers.

