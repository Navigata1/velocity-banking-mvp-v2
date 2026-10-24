# Final Independent Pipeline / PBR / Publication Review

Baseline: `8e2f25ef6b81ffc65b9f96644170834c511078d3`. Final probe: 2026-10-21T09:51:06.911Z to 2026-10-21T09:51:09.288Z.
Scope: source, record/hash consistency, procedural maps/PBR, publication ordering,
protected rebuild harness. Geometry clearance and mesh-normal fidelity remain
assigned to the independent geometry reviewer.

## Verdict

**PASS within this review scope. Prior pipeline P2 is resolved. No new P1/P2 found.**
The fixed harness control passes and both prescribed source/video mutations now
fail through the correct preservation ERR_ASSERTION, not TypeError/missing mocks.
The exact final GLB regenerates byte-identically in memory without publication.
This is NOT approval of real rebuild/package/render/CI/hosted/production gates.

The original `review-pipeline-report.md` is preserved unchanged at SHA-256
`8838dbb7b37651eedef2dda8944120c9d5cfb080e48a239285d7eb18ceafec54`.
Its P2 remains an archived finding against the pre-fix harness, not an open finding
against the final harness. Old logs, original REDs, and the pre-fix harness remain.

## Final Pins

All seven file hashes below were identical before and after the fresh probe.
Builder/test raw bytes also match their LF-normalized hashes.

| Item | Bytes | SHA-256 |
| --- | ---: | --- |
| build-refined-custom.mjs | 13785 | `2e21fb5c03e55d4649184d7362fe3df73efee9ac2b76395fd9796c3a948c5040` |
| custom-refinement.test.mjs | 34076 | `26c50474ca83b358d7bd18481b73a3f2f703ed921e6cdd29d45e07b4d27c460c` |
| materials.json | 1248 | `26ab2c71429e558b26a4108802e785088ce7e1cc231ea89db6e0ad4ed5531532` |
| custom.glb | 237844 | `2753182d024be862fc7ab5e5b18100cc6a7bbcc736213471b4a6e2083517aa7b` |
| apps/media/hero-imported.json | 9214 | `085c4285d13b6aa5ca3cd47d4322c205f3f0dea8f13f2e46e163aba7998be48b` |
| apps/media/hero-models.json | 9214 | `af64fc97ab22d6ce15895bf9b6ac48e9f1b40ed3fc6547ec971efcfaae130a64` |
| .superpowers/sdd/2026-10-21-custom/rebuild-proof.mjs | 6996 | `ba1eed0b98e71f65fd9c9324a5f6dd1f8a5a4680b1392dbe821e4d5950441aaf` |

Canonical config hash: `16311e6307a5e2e3edef5bc424f95bf8e3762570c1cc5e254e4f111dea7d0dd0`.
Both Custom records deep-equal each other, match the actual bytes/source/canonical
recipe hashes, and deep-equal the record produced by the evaluated final builder.
Whole-manifest byte hashes differ only because their record order differs.

Actual delivery: **237844 bytes, 13200 unique / 21240 rendered triangles,
17 meshes, 12 maps**. Public tree: **9908162 bytes**, leaving **577598 bytes**
below 10485760. Actual guard accepts all caps exactly and rejects each +1:
524288 model bytes, 65000 unique, 65000 rendered, 10485760 public bytes.
Source meshopt options remain position16/UV16. All referenced POSITION accessors
are normalized signed16; all referenced UVs normalized unsigned16. Fallback/
unused float accessors are not confused with referenced mesh precision.

## Harness P2 Closure

Final harness SHA-256:
`ba1eed0b98e71f65fd9c9324a5f6dd1f8a5a4680b1392dbe821e4d5950441aaf`.
Pre-fix backup SHA-256:
`797c46d8227158188982049b69f1fbe381d776dc87f20fb02d1bbe57d5cc78f1`.

The parent owns the production harness and CJS contract; neither was edited here.
The reviewer updated ONLY its own VM adapter to implement git ls-files using the
actual supplied stdin.files list filtered by the harness's selected paths.
All actual filesystem access is read-only; command execution/writes remain mocks.

Observed cases from the actual evaluated fixed harness:
- control: harnessPassed=true; 306 tracked source files selected, 309 RAW source
  fingerprints captured including new builder/test/config; all 40 virtual package
  payloads checked; ten IDs distinct including Personal and Recreation.
- retained-source-mutation: harnessPassed=false, code ERR_ASSERTION, message
  `identical Custom model regeneration retained source apps/media/sources/house/oak-albedo-v1.png`.
- personal-video-and-manifest-mutation: harnessPassed=false, code ERR_ASSERTION,
  message `identical Custom model regeneration video records`.

Each negative is injected after the initial snapshots, at the first mocked
builder call. It aborts before packaging or proof-receipt emission; zero package
payloads are falsely claimed for those aborted cases. The booleans are computed
from actual VM success/failure, not hard-coded rejection results. The emitted
JSON satisfies the unchanged parent CJS result assertions. The actual CJS
subprocess command remains the parent's responsibility.

Source inspection confirms all ten current video records are captured before
writers, validated against their current MP4 bytes, and other nine records checked
against the Desktop baseline. verifyRetained runs after EACH selected builder,
full model builder, poster builder, and package. It checks RAW fingerprints,
entire video JSON, and each of ten MP4 hashes. The receipt contains
sourceFingerprints and videoSnapshots; package comparisons use pre-writer records.

The original parent `harness-preservation-red.log` retains both incorrect-accept
cases under the old harness, with ERR_ASSERTION from the parent CJS contract.
It is not a missing-API/TypeError RED and was not overwritten.

The first refresh attempt observed Custom MP4 bytes updated while the video
record still described the earlier render. The harness correctly rejected its
initial-byte prerequisite. After the parent's all-ten verification refresh, the
control passed without weakening or mocking away that real hash check.
The transient diagnostic is retained separately.

## Independent Final Artifact / PBR Checks

The original final builder was evaluated using the installed actual
Three/Sharp/glTF Transform/Meshopt libraries; saveRefinedHero was intercepted.
The entire generated GLB Buffer byte-equals the final file, as does its generated
record. No actual asset or manifest writer was called.

All twelve embedded 256x256 WebP texture hashes equal the archived 237124-byte
candidate. Recipe RAW/canonical hashes and all material fields/extensions are
unchanged. Independently reconstructed scalar height fields, wrapped central
differences, normalized tangent-space directions, rounding, and codec settings
reproduce every encoded map byte-for-byte:
- four lossless VP8L normal maps; decoded bytes equal independent packed normals;
- eight lossy VP8 neutral-gray color/packed metallic-roughness maps;
- config images[] accurately declares no external source images; no scans.

Normal map decoded lengths range 0.9958854..1.0041284 due to 8-bit quantization,
not exactly unit length. Actual normal scales remain .18/.16/.11/.06.
No downsampling step exists in this recipe. No claim of measured relief or
zero filtering/quantization loss is accepted.

Actual rendered use: SteelLinear triplet8656 triangles, Radial10832, Dial768,
shared Enamel triplet12 green +12 red. Untextured glass960. No orphan map, external
image/buffer URI, or emissive factor/map. All 12240 unique nondegenerate textured
triangles have finite, noncollapsed UV0 within0..1, repeat wrapping and [1,1]
texture-transform scale. All five textured materials are OPAQUE/single-sided;
glass is BLEND alpha .12/roughness .07/metalness0, not refractive transmission.

Base color is sRGB-sampled gray multiplied by linear material factors in the
installed loader. Normal and metallic-roughness slots are data, not sRGB.
Packed G supplies roughness; B supplies metalness; R is not assigned to occlusion.
All textured roughness factors remain1; metallic factors .84/.94/.86/0.
Lossy packed fields are approximate, not exact constants:
Steel B248..255, Radial252..255, Dial250..255, Enamel0..6.
Enamel remains nonmetallic because its factor is0. Clearcoat .82/roughness .12
is retained. Steel anisotropy .38 remains optional and derives its direction
from actual UVs through Three's derivative tangent frame; no fabricated emission.
GPU appearance and mesh/lens normals are not independently rendered/reviewed here.

## Actual Locked Callback

Fresh probes run the actual callback captured from the final evaluated builder
under the actual saveRefinedHero/withHeroManifestLock source with filesystem mocks.
Lock ownership is asserted at every manifest read, public size/stat, asset
write/rename, and manifest write/rename.

Exactly10MiB permits asset temp-write/rename then both manifest writes/renames.
Cap+1, despite stale preflight0, stops after fresh size/stat with no write.
Removed-guard/stale-total negative controls allow the bad write and are detected.
Import/inventory read, collection read, target stat, asset write/rename, and
manifest write errors propagate in the expected order and release the mock lock.
Manifest failure occurs AFTER asset rename, confirming the existing limitation.

Publication remains cooperative/per-file atomic, NOT a multi-file crash
transaction/rollback or OS-contention proof. Lexical URL-prefix checks are NOT
realpath/symlink confinement; unrelated noncooperating writers are out of scope.

## Preservation And Evidence

Fresh baseline-tree comparison checked1299 tracked files (306 CRLF-only checkout
differences). Only Custom GLB/manifests and planned credits/collection/design docs
differ. Exact JSON baseline comparisons confirm nine other model/import records
and all ten poster records unchanged; Git blob comparisons confirm nine GLBs and
ten WebPs unchanged. Protected financial/native/persistence/UI/studio/camera/
timing/dependency/SQL/CI/publication/build/package APIs have no baseline diff.
git diff --check passes. Final builder edits stay asset-local and follow the
existing refinement patterns; no new dependency or broad refactor.

A separate read-only video probe verified the Desktop file manifest pins
baseline8e2f25ef6b81ffc65b9f96644170834c511078d3 and its verification.json hash.
All nine retained video records AND current/Desktop MP4 bytes match that pinned
manifest. All ten current MP4s match their current record hashes/lengths.
Current video JSON SHA-256:
`3ef72fee64543bf9c83fec35efe19743ebde25993f85a34cf10111cd05a49698`.
Final Custom MP4: 3958880 bytes,
`7f608566467db9840c79d86bf9570a727c18e9b88681a96aee000f50cf2d9bb2`.

Retained parent evidence, not rerun full suites here: final focused16/16 GREEN;
assembled hinge2/2 RED and oracle/normal3/3 RED logs retained. The older full-media
143/143 log predates those extra tests and is NOT represented as a fresh final
145-test full run. Initial14 assertion REDs, authoring diagnostics, original UV
builder copy and failed GLB remain archived. Parent all-ten video verification
log was read, but pixel/render assertions were not independently executed here.

## Reviewer Artifacts

- review-pipeline-refresh-scratch.mjs and review-pipeline-refresh-raw-scratch.log:
  final exact pins, maps, slot usage, caps, in-memory reproduction, lock/error probes.
- review-pipeline-harness-scratch.mjs and review-pipeline-harness-refresh-raw-scratch.log:
  updated adapter plus actual fixed-harness control and two proper rejections.
- review-pipeline-harness-refresh-command-scratch.txt: baseline JSON/files stdin command.
- review-pipeline-video-baseline-scratch.mjs and review-pipeline-video-baseline-raw-scratch.log:
  current all-ten and pinned Desktop nine-video proof.
- review-pipeline-harness-transient-video-scratch.log: temporary input incoherence.
- Original report/logs and rebuild-proof-pre-fix.mjs are preserved unchanged.

Reproduce the pipeline refresh read-only from repo root:
```powershell
git ls-tree -r 8e2f25ef6b81ffc65b9f96644170834c511078d3 | node --experimental-vm-modules .superpowers/sdd/2026-10-21-custom/review-pipeline-refresh-scratch.mjs
```

No primary edits, network/install, browser/GPU/server/render, actual filesystem
publication writer, or Node child-process spawn. All reviewer disk writes used
apply_patch only under review-pipeline-* paths. No duplicate full-media suite.
Actual protected rebuilds/package/render/pixel/native/SQL/hosted/CI and transport
gates remain parent-owned; geometry signoff remains with the geometry reviewer.

