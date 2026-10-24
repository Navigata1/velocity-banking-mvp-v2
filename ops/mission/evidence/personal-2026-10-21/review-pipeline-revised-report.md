# Personal Bounded Re-Review: a4960547

Status: HISTORICAL BOUNDED REVIEW ONLY. No current or upcoming-candidate clearance.
No confirmed SOURCE / MATERIAL / PUBLICATION defects were found on the exact A496
hash triplet below. All three targeted probes passed on that artifact only.
Parent reports independent confirmed P2 geometry defects also present in A496:
papers cut the flap, and stitches are buried/floating, including at the handle.
Those findings are outside this review's scope and remain open; the bounded material
result does not refute them or establish overall acceptance.
Parent is adding standing RED tests, front-lip pocket/flap clearance and stitches
projected onto actual support surfaces while retaining GPU instancing. GLB/source/
test/helper files will change; texture maps and config are intended to remain at
A496 values. These are parent-reported intentions, not new-candidate verification.
Await the final hashes and changed helper files before another bounded re-review.
No primary reads, probes or geometry checks were performed for this status update.
The previous `review-pipeline-report.md` and original logs remain historical evidence,
not current clearance. No primary files were edited or builders/writers executed.

## Exact Reviewed Inputs

| Input | SHA-256 |
| --- | --- |
| Distributed Personal GLB, 513,944 bytes | `a49605478a5466ed5f16464ed878e2f990244f5510f4088c6db60a2faf7b7b06` |
| Personal builder, LF-normalized (also raw bytes) | `161159e34ef9cc5bd0b1bf67a7912147ff567c6f4593d94f98e760cfb2edf414` |
| Personal config, canonical `JSON.stringify(parsed)` | `3377df695d1a66ace34911e0e5bc2e5bf5fd0b6a6b2479ed1f5c05208df47523` |
| Personal config, raw bytes | `c2bb19587d1b4628d819d674657d8689a38d10b052fbda637dcf4c025c08b247` |
| Retained original Student Loan leather PNG | `7b4897dbee5f4ad7e0982e3cb81a10fb3bcb445db9a084b073215738e01a74e1` |

Both Personal protected records agree with the actual GLB, source LF and config hashes.
Final live hash recheck also matches this exact triplet and retained source image.

## Bounded Delta And PBR

In memory only, reversing the approved steel color/roughness, shoulder-curve and
key tilt/grounding statements reconstructs the exact old builder SHA `2da81a4d...`.
Reverting only config steel roughness 0.42 to 0.26 reconstructs the old canonical
config SHA. Therefore no additional source/config changes are hidden in this revision.
This is a source-scope check, not a duplicate mesh topology/contact review.

All nine maps remain embedded and used on rendered geometry in the correct slots.
Eight encoded image hashes are identical to historical evidence. Only
`P-Steel-Roughness` changed: 964 bytes, SHA
`04609788f6a265ee5afa915c5d7f2e3a1fd0a2b2831cca98efbdb17ccfd548aa`.
Its decoded effective roughness G range is 0.40784-0.43137, mean 0.418912;
effective metallic B is 0.98824-1 with metallic factor 1. The silver linear factor
matches sRGB `#e0e1e2`; roughness factor remains 1, avoiding accidental double scaling.

Retained albedo identity, original output credit, authored-approximation caveat and
provenance scheme pass again. Leather color remains 512 square; other maps 256 square;
all three normal images remain lossless VP8L, including the exact retained-albedo
normal oracle match. Local GLTFLoader color/data-space assignment remains correct.
No measured-normal, scan or exact-reconstruction claim is introduced.

## Budgets And Publication

- Model: 513,944 / 524,288 bytes; 10,344 bytes headroom.
- Public: 10,297,750 / 10,485,760 bytes; 188,010 bytes headroom.
- Unique / instantiated triangles: 15,696 / 28,760, both below 65,000.
  Actual 470 stitch instances contribute 9,400 rendered triangles.
- Actual mesh-referenced positions remain normalized signed 16-bit; UVs remain
  normalized unsigned 16-bit, decoded [0,1], present on textured primitives.
- Other nine model records/bytes, all ten posters and other imported records match
  baseline HEAD `3e931369fea268efe4c0180de8aaafd38675a5ed`. Protected tracked
  finance/native/UI/studio/camera/dependency paths have no diff at probe time.

The actual revised publication callback passes exact-cap / one-byte-over fixtures,
including unequal old/candidate sizes (512,876 -> 513,944; growth 1,068 bytes).
It uses the fresh live total minus existing target plus output, inside the existing
lock, and rejects before publication on overflow or measurement/stat failure.
Stale-total substitution and removed-guard mutations are caught. Original model,
triangle and 10 MiB aggregate caps are unchanged. The protected imported Personal
skip boundary still avoids legacy replacement in an in-memory adapter.

## Reproduce And Limits

```powershell
node .superpowers/sdd/2026-10-21-personal/review-pipeline-revised-materials.mjs
node .superpowers/sdd/2026-10-21-personal/review-pipeline-budget.mjs
node .superpowers/sdd/2026-10-21-personal/review-pipeline-boundary.mjs --candidate-bytes=513944
```

Evidence: `review-pipeline-revised-materials.log`, `review-pipeline-revised-budget.log`,
`review-pipeline-revised-boundary.log`, and `review-pipeline-revised-final-hashes.log`.
All writes stayed in ignored `review-pipeline-*` scratch. No network/browser/server/
GPU/render/cloud/dependency/commit/push activity. No geometry/contact duplication.
Parent reports current 14 tests and Chrome 1440/375 passing; those were not rerun or
independently claimed here. Parent actual regeneration/protected full rebuild,
packaging, full web/media gates, hosted and exact-head CI proof remain outside this
historical bounded result and ongoing. Parent's subsequently confirmed geometry P2s
and announced fix supersede this artifact for current acceptance. No final clearance;
input changes require another bounded re-review.
