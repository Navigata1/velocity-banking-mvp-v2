# Personal SOURCE / MATERIAL / PUBLICATION Refutation Review

Status: HISTORICAL REVIEW ONLY. No clearance for the incoming revised candidate.
No confirmed scoped important defects remain on the exact old model, builder and
config below. Three targeted CPU / in-memory probes passed on that artifact.
This is not geometry, photorealism, full-rebuild, package, hosted, CI or production approval.

Parent revision notice: actual 1080p visual review requests a left/rear shoulder
strap instead of the front U, a slight grounded key tilt, and more brushed silver
with config steel roughness 0.42. Parent will change GLB/source/config hashes and
send the final candidate for bounded re-review. No image/albedo, dependency, global
camera, studio timing or provenance-scheme changes are intended. Those are parent
instructions, not verified properties of a new candidate. Preserve the original
0.5 MiB / 10 MiB limits and require all 14 parent cases on the revised artifact.
No new-candidate probes or primary reads were performed for this status update.
All evidence and present-tense descriptions below refer only to the old hash set.

Baseline HEAD: `3e931369fea268efe4c0180de8aaafd38675a5ed`.
All writes from this review are ignored `review-pipeline-*` scratch artifacts here.
No primary edits, builder/writer execution, filesystem locks, dependency changes,
network, browser, server, GPU, render, cloud, commit or push were performed.

## Exact Historical Hashes

SHA-256 values:

| Input | SHA-256 |
| --- | --- |
| Previously reviewed `apps/web/public/heroes/personal.glb` | `ae5bf9e062b060f4e1e0a7d150d606089550ec52e6006e1315447a1c509cb748` |
| `apps/media/scripts/build-refined-personal.mjs`, LF-normalized (also raw bytes at review time) | `2da81a4d80955b8b7b5b41f68ae90fc9cad8a9486c94e8f8518b3bafcd8e1345` |
| `apps/media/sources/personal/materials.json`, `JSON.stringify(parsed)` | `9d289cf590dbab6fd0eb95b0ac2056b9883d22282e693a346708c450142c0fe8` |
| Same config, raw file bytes | `ce714028bd00db59acf975b25aad32cc18e5e11d545d26a89cd71269631b9eb1` |
| Retained `apps/media/sources/student-loan/leather.png` | `7b4897dbee5f4ad7e0982e3cb81a10fb3bcb445db9a084b073215738e01a74e1` |

Both Personal manifest records are identical and match model bytes/hash, LF source
hash and canonical config hash. CRLF normalization preserves the source hash.
Retained PNG is 4,507,113 bytes and unchanged from HEAD, as is its Student Loan config.
The explicit relative source path, exact image SHA, generated-source credit and
original output `exec-7595a962-77c7-42c1-9773-0aca4bc2df46.png` agree with that config.
This traces retained project metadata; it does not independently authenticate the
historical generation service. Builder source-image guard rejects a corrupted PNG.

## Material Evidence

- Exactly nine embedded WebP images, all referenced in correct material slots on
  rendered scene geometry. Each encoded image SHA is in `review-pipeline-materials.log`.
- Leather base color is 512 square; other eight maps are 256 square. Three normals
  are genuinely lossless VP8L. Leather normal pixels exactly match an independent
  retained-PNG height-gradient / resize / renormalization oracle without encoding.
  Leather color mean absolute byte error against its lossy derivative oracle: 2.2663.
- Decoded normal lengths: leather 0.99558-1.00450; brass 1.00002-1.00376;
  steel 1.00002-1.00376. Positive Z, spatial detail, normal scales 0.65/0.14/0.14.
- Local shipped GLTFLoader assigns base-color textures sRGB, normals and metallic /
  roughness maps data-space. No color/data texture aliasing or emissive/unlit shortcut.
  glTF omitted metallic and roughness factors correctly default to 1, not zero.
- Effective roughness G ranges: leather 0.46667-0.50588, brass 0.33725-0.36078,
  steel 0.24706-0.27059. Effective metallic B: leather exactly 0, brass 0.98824-1,
  steel 0.98431-1. Minor lossy B variation is bounded and does not make leather metallic.
  Config, manifest provenance and embedded copyright explicitly call these authored
  approximate PBR / height-derived normals, not measured scans or exact reconstruction.

## Budget / Protection Evidence

- 512,876 model bytes, 11,412 below the unchanged 524,288-byte model limit.
- 10,296,682 live public bytes, 189,078 below the unchanged 10,485,760-byte total limit.
- 15,696 unique and **28,760 instantiated** triangles. The 470 stitch instances each
  use 20 triangles (9,400 rendered stitch triangles). Both 65,000 limits are checked.
- All actual mesh-referenced POSITION accessors: normalized signed 16-bit (26 unique).
  All actual TEXCOORD_0 accessors: normalized unsigned 16-bit (14 unique), decoded
  range [0,1], with UVs present on textured primitives. Unused FLOAT accessors do not
  describe the actual rendered attributes. No topology/contact review duplicated.
- All other nine records and model bytes, and all ten poster bytes including original
  Personal, match HEAD. Other imported records also match. Tracked changes remain only
  the two already-modified manifests and Personal GLB; protected finance/native/UI/
  studio/camera/dependency paths have no tracked diff. This review added no primary files.

## Publication / Future Rebuild Boundary

The extracted publication callback uses a fresh public sum minus current target size
plus candidate size, not the stale preflight total. One byte over 10 MiB rejects before
write/rename; exactly 10 MiB permits publication even with an over-limit stale total.
Measurement/stat failures reject before publication. Removing the guard or replacing
its live value with the stale total is caught by the probe's negative controls.
Preflight exact/one-over fixtures cover model, unique triangles, instantiated triangles
and aggregate caps. No cap was changed to obtain these passes.

AST inspection confirms the callback is passed to the existing `saveRefinedHero` lock
and awaited inside it before both manifest updates. Exclusive `wx` lock helper and
full builder are byte-identical to HEAD. In-memory extraction of the actual legacy
Personal skip branch preserves the protected imported record; removing it reaches
the positive-control legacy-build marker. No actual full rebuild or writer was run.
Real regeneration, protected full rebuild, package proof, complete web/media, hosted
and exact-head CI remain parent responsibilities, as requested.

## Reproduce

From repository root, using installed dependencies only:

```powershell
node .superpowers/sdd/2026-10-21-personal/review-pipeline-materials.mjs
node .superpowers/sdd/2026-10-21-personal/review-pipeline-budget.mjs
node .superpowers/sdd/2026-10-21-personal/review-pipeline-boundary.mjs
```

All three completed with exit 0 and `status: PASS`; corresponding logs are adjacent.
The scratch boundary harness initially had overlapping AST replacements in a negative
control; fixed only that scratch harness and reran successfully, not a product defect.
The old review's final live hash recheck matched every historical hash above. Parent's
announced revision supersedes that evidence for current-candidate decisions. Await
the final GLB/source/config hashes before bounded re-review; no current clearance.
