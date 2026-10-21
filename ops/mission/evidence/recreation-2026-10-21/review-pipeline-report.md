# Recreation: Independent Source, Material, Publication and Budget Review

## Verdict

Bounded technical clearance for the exact current candidate below. No new P1/P2
source/material/budget defect was confirmed. Sixteen independent CPU/in-memory
probe groups pass, exit 0. Two P3 publication/evidence follow-ups remain below.
This is not geometry/contact clearance, visual approval or production certification.

## Pinned Inputs

Baseline HEAD: `a162c10c4ad9590ffcd12dbbffe189d6371d5e52`.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| `apps/web/public/heroes/recreation.glb` | 521060 | `d21f57de6792d5af53d575e2c6d2c9aa27bd8d1b944a00544a9cb3229fa97a0d` |
| `apps/media/scripts/build-refined-recreation.mjs` | 20252 | `7f9d61b7c2a490450857fcf6562ae51d5ee966e427c9489d888fca72204c82b0` |
| `apps/media/scripts/recreation-refinement.test.mjs` | 34461 | `34e4fe99b5d9f612e5a7f53c1798e1f16150b9a2d8c85cfb55062142fce900d8` |
| `apps/media/sources/recreation/materials.json` (raw) | 1653 | `6b5776151c1b052c82e4a408b81be0e72a3047ec1392b0492a3b9f38a0bcac04` |

Both manifests have identical Recreation records, actual GLB hash/size, actual
LF-normalized builder hash and canonical JSON recipe hash
`9626f5b8ba0714edc5ce55b3ef852fe27747cb653e88001b7cff53f8e6ffa59c`.
All four pins were re-read unchanged at the end of the successful run.

## Follow-ups

- **P3: Publication prose is stale.** `docs/ASSET-CREDITS.md:133` still calls
  Recreation and Custom the two remaining studies; there is no Recreation
  retained oak/cloth source section. `apps/media/hero-turntables/ASSET-COLLECTION.md:11`
  and `:39` still describe eight candidates/two studies. The real package script
  copies these documents, so shipping without updating them carries misleading
  status/source explanation. No third-party license violation is asserted.
- **P3: Parent evidence harness omits Personal.**
  `.superpowers/sdd/2026-10-21-recreation/rebuild-proof.mjs:8` repeats `recreation`
  and omits `personal`. Correct its ID list before claiming that harness verifies
  all ten rebuild/package outputs. This review independently checks all ten
  distinct IDs, including Personal, against baseline; it does not run the real package.

## Source and Material Refutation

- Retained House oak SHA `78f9cbed87ec67f0522f1aa5047e0959dac32e0074e6ba60f262820a4d397b7a`
  and Student Loan cloth SHA `bc2451f333299567d32abe18c229cdb5c768c1762318932e2f1e42fbba6364d2`
  match actual unchanged originals and their originating material manifests/output
  identities. The actual builder guard rejects one-bit corruption of either source.
- Current recipe reproduces the current GLB AND full manifest record exactly in
  memory. Real source reads are allowed; publication saver is intercepted and
  write/rename functions throw if reached. No filesystem writer runs.
- Exact earlier builder hashes were reconstructed and checked before in-memory
  evaluation. They reproduce the exact `84e463c9...` and `6aab1461...` GLBs.
  The material-only change preserves every decoded accessor, primitive index,
  normal, UV, mesh association, node TRS and instance stream, digest
  `836aeba002de9e0a460663f2916d49f0dce0a401e9ea7889743a8d8fad4dc589`.
  Only Timber color payload and Timber/Glass color-alpha factors changed then.
  The later roof-clear candidate retains ALL 12 map payloads and material factors
  byte-for-byte/value-for-value from the exact `6aab1461...` candidate.
- All 12 embedded WebP images are actually assigned to rendered material slots,
  not orphan textures. No external image/buffer URIs or emissive material exist.
  Current maps equal the actual extracted map generator's encoded bytes.
- Independently reconstructed color, finite-difference normal and packed material
  fields agree with the recipe. Color uses sRGB decoding and material factors
  linear-sRGB, checked against the installed loader and independent transfer math.
  Normal/roughness/metalness data are not sRGB decoded. G is roughness, B metalness;
  roughness factor is 1, steel metalness factor 1, dielectrics 0. R is not attached
  as an occlusion map. Correct repeat wrapping, UV channel, tile and normal scales
  are present. Glass is BLEND alpha 0.62, tinted `#314a50`; not measured refraction.
- Timber is `#9b6337` with clamped `.38 + .66*h` color detail. Canvas keeps its
  prior ivory factor and `.76 + .24*h` detail. Color/roughness encoding is LOSSY.

| Surface | Color size | Other sizes | Normal max codec error | Roughness G max codec error |
| --- | ---: | ---: | ---: | ---: |
| Canvas | 512 | 256 | 0 | 10/255 |
| Timber | 512 | 256 | 0 | 5/255 |
| Paint | 256 | 256 | 0 | 2/255 |
| Steel | 256 | 256 | 0 | 3/255 |

Each normal RIFF has VP8L; decoded RGB is EXACTLY the independently recomputed,
filtered and re-normalized 256px field. Length extrema across all four normal
maps are approximately 0.9952 to 1.0046 after 8-bit quantization. This is zero
codec error, NOT zero downsampling/height-estimation loss. Every map has measured
spatial detail; full byte hashes, ranges and codec errors are in the evidence JSON.
Nonmetal blue-channel codec noise is multiplied by material factor zero. Steel
blue is 252..255 with factor 1, appropriately near-metal rather than bit-perfect 1.

## Publication, Precision and Budget

- Actual decoded counts: 19296 unique / 25112 rendered triangles, 47 meshes.
  POSITION uses normalized signed 16-bit accessors; UV uses normalized unsigned
  16-bit accessors. Actual meshopt options remain 16/16. No cap/precision relaxation.
- Actual extracted preflight accepts exactly 524288 bytes, 65000 unique, 65000
  rendered, 10485760 aggregate; each one-over condition independently rejects.
- Actual locked publication callback remeasures the real target public URL and
  subtracts the current target size before adding the replacement output size.
  Exactly-at-cap, below-cap, replacement credit and stale outer-total tests pass.
  Removed guard and unused-fresh-measurement/stale-guard mutations are rejected.
- Injected size/stat/write/rename errors propagate with no subsequent operations.
  Actual unchanged manifest helper, with exclusively in-memory IO, obtains the
  exclusive lock and reads both manifests BEFORE callback; success updates both;
  callback abort updates neither and releases the lock.
- Unchanged actual legacy build function executes protected skip branches for
  all nine imported assets in memory, without invoking their constructors or
  writing their models. All other nine distributed GLBs, all ten posters and
  their other manifest/provenance records match baseline, using ten distinct IDs.
  Shared pipeline/helper/package APIs, app loader/credit paths and media/web
  dependency files match baseline; retained source images are also baseline-identical.
- Recursive actual public bytes: **9931410 / 10485760**, headroom **554350**.
  Model bytes: **521060 / 524288**, headroom **3228**. No symlinks occur in this
  public traversal. All limits are unchanged.

## Limits and Reproduction

The shared helper is unchanged and does not promise multi-file rollback after
successful GLB rename followed by a manifest persistence failure. A write/rename
failure can leave temporary files. The lock is cooperative; unrelated filesystem
writers are not serialized. These pre-existing transaction boundaries are not
cleared as atomic by these callback tests. The real parent writer/rebuild/package
runs remain separate gates. Existing third-party car source/license links and
app credit path remain present and unchanged; URLs were not fetched.

No network, browser/GPU, server, render, install, cloud, actual asset writer,
commit/push, agent delegation, primary edit, topology/contact re-review, original
generation attestation, exact reconstruction or certification was performed.
Source hashes demonstrate consistency with retained bytes, not authorship proof.

Run from repo root:
`node .superpowers/sdd/2026-10-21-recreation/review-pipeline-probes.mjs`

Evidence: `review-pipeline-probes.log` (exit 0, 16 groups),
`review-pipeline-evidence.json` (pins, map measurements, all 19 preserved files,
materials and helper event traces). Only `review-pipeline-*` scratch files written,
all through apply_patch. The input pins intentionally fail on a different candidate.
