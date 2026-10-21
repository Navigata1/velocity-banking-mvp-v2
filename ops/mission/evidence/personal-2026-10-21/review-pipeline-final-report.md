# Personal Final SOURCE / MATERIAL / PUBLICATION Review

Verdict: no confirmed scoped important defects. Bounded clearance for the exact
FINAL artifact/source/config below, independently checked live. Three targeted
CPU / in-memory probes passed with exit 0. Earlier ae5 and A496 reports remain
history only and are not used as current-artifact clearance.

## Exact Final Inputs

| Input | SHA-256 |
| --- | --- |
| Personal GLB, 519,844 bytes | `e079fc7b95c562fa6180434491cf3511d54fbf79cb155bf1d89c822bafe77b79` |
| Personal builder, LF-normalized and raw | `588e52c8a9547e98df1a643bb465ec4a884ff85df84b9cefd5fef35efc73864c` |
| Personal config, raw | `c2bb19587d1b4628d819d674657d8689a38d10b052fbda637dcf4c025c08b247` |
| Personal config, canonical `JSON.stringify(parsed)` | `3377df695d1a66ace34911e0e5bc2e5bf5fd0b6a6b2479ed1f5c05208df47523` |
| Retained Student Loan leather PNG | `7b4897dbee5f4ad7e0982e3cb81a10fb3bcb445db9a084b073215738e01a74e1` |

Both protected Personal records match actual model bytes/hash, source LF and config
hashes. LF/CRLF source normalization and corrupted-source-image rejection pass.
Final recheck matched the hash set above, both records and all inspected helper/tests.

## Materials / Source

Exactly nine WebP maps are embedded and used in correct slots on rendered geometry.
All nine encoded map hashes and all material factors are byte/value-identical to
A496; current usage and decoding were checked anew, not inferred from history.
Leather base color is 512 square; the other eight maps are 256 square. All three
normal maps are lossless VP8L; the leather normal exactly matches the retained-PNG
height-gradient/resize/renormalization oracle. Normal encoding, color-space mapping,
dielectric leather, metal factors, roughness G / metallic B use and non-emissive PBR pass.
Silver remains the correct linear factor for sRGB `#e0e1e2`, effective roughness
0.40784-0.43137 (mean 0.418912), metallic 0.98824-1 and normal scale 0.14.

Retained original image SHA/path/output credit agree with Student Loan metadata;
that PNG and config are unchanged from baseline HEAD. Generated-source attribution
is traced within retained project records, not externally authenticated. Manifest,
config and embedded copyright still describe authored approximate PBR, not measured
scans/normals or exact poster reconstruction. No source-albedo substitution occurred.

New strap clipping carries interpolated UVs and normals; drape normal transport uses
the inverse transpose for `(x,y,z) -> (x,y,z+drape(x,y))`. Reviewed source matches
that formula. Actual decoded normal lengths are 0.99419-1.00495; actual mesh-referenced
positions are signed normalized 16-bit (27 accessors), UVs unsigned normalized 16-bit
(15 accessors), in [0,1]. All 20,644 nondegenerate textured triangles have nonzero
UV area; minimum UV double-area 1.44359e-8. These checks address material transport,
not duplicate topology/contact verification.

## Actual Budgets / Protected Baseline

- 29 meshes; 22,016 unique / **33,844 instantiated** triangles, both below 65,000.
- Final stitch batch is **459** instances x 20 triangles = 9,180 rendered triangles.
  The old 470-instance assumption was not reused.
- Model: 519,844 / 524,288 bytes; **4,444 bytes headroom**, unchanged 0.5 MiB cap.
- Live public: 10,303,650 / 10,485,760 bytes; **182,110 bytes headroom**.
- Other nine model bytes/records, other imported records and all ten poster bytes,
  including original Personal, match HEAD `3e931369fea268efe4c0180de8aaafd38675a5ed`.
  Only the two existing manifests and Personal GLB have tracked diffs at probe time;
  protected finance/native/UI/studio/camera/dependency paths have no tracked changes.
  Original leather files, publication helper and full builder are byte-identical to HEAD.

Actual revised-source publication callback passes exact-cap / one-byte-over fixtures,
including unequal old/new sizes (512,876 -> 519,844; growth 6,968). It guards the fresh
live public total minus current target plus candidate, not the stale preflight total.
Overflow or measurement/stat failure rejects before write/rename; removed-guard and
stale-total mutations are detected. Existing exclusive lock encloses the callback,
which is awaited before both manifest updates. All original caps remain unchanged.
Protected Personal legacy-build skip passes an in-memory boundary probe; no actual
builder, asset writer, manifest writer, filesystem lock or full rebuild was executed.

## Helper / Seating Tests Inspected

| File | Raw / LF SHA-256 |
| --- | --- |
| `personal-geometry-test-helpers.mjs` | `77635f6f372d6f4d5fbea41383e82f85703d85505cd1c0a64deb21917c6be2eb` |
| `personal-seating.test.mjs` | `5a0b4ac3409f2bc38a4c71a562ca0d9d64b67dace1366b0eb2eb33f960236870` |
| `personal-refinement.test.mjs` | `720a941cf3245f5514f8c5e8c912a24e40873e2142e95c25dbd2a3b119513110` |
| `refined-hero-record.mjs` | `a46755f486b3c7b0ae027fa8dc68a7b0b84387fab2cbe394fd7ec55571ab9e7b` |

Shared geometry helper reads normalized accessor elements, applies node/frame and
instance TRS, and has no writer. Inspected all four new seating tests, including
actual-instance grouping, closed-skin burial prerequisites and negative fixtures.
No confirmed defect in their source/material-facing use was found. Parent's
`final-personal-contracts.log` records 18 passes / 0 failures; inspected, not independently
rerun here. Its SHA is in `review-pipeline-final-boundary.log`. Geometry review retains
ownership of papers/stitches/rivets/key topology/contact acceptance.

## Reproduce / Scope

```powershell
node .superpowers/sdd/2026-10-21-personal/review-pipeline-final-materials.mjs
node .superpowers/sdd/2026-10-21-personal/review-pipeline-final-budget.mjs
node .superpowers/sdd/2026-10-21-personal/review-pipeline-final-boundary.mjs
```

Corresponding `review-pipeline-final-*.log` files and `review-pipeline-final-hashes.log`
hold exact evidence. Only ignored `review-pipeline-final-*` scratch files were written.
No primary edits, dependencies, install, network, browser, server, GPU, render, cloud,
commit or push. Parent actual regeneration/protected full rebuild, package, full
web/media/hosted/CI and overall visual/production approval remain separate. This
clearance is limited to the reviewed source/material/publication/precision/baseline
scope and exact hashes above; any input change requires bounded re-review.
