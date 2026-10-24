# Car Normal Data Fidelity And Reference Cleanup

## Verdict

Five additional full-resolution normal maps now match the pinned source RGB
exactly. Original paint PNG bytes and pixels remain exact. This is source-data
fidelity and safer publication, not final photoreal or production approval.
Tireside is deliberately unchanged and remains a measured fidelity gap.

## Evidence And Boundary

The source remains Khronos CarConcept revision
`15cd02d304e54cb42a4db4eefe719f76190f4b68`, GLB SHA-256
`c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b`.
Independent source inspection found seven normal images and eleven material
aliases, with no non-normal or extension-slot sharing. Eight aliases use the
five newly restored images. Panel Sides keeps its authored zero normal strength.

| Restored Map | Source Resolution | Encoding |
| --- | --- | --- |
| Mechanical | 512 x 512 | Lossless WebP |
| Shared Interior / Floormat / Panel Sides | 64 x 32 | Lossless WebP |
| Interior 2 | 32 x 32 | Lossless WebP |
| Disc | 128 x 128 | Lossless WebP |
| Tiretread | 512 x 128 | Lossless WebP |

Original images are captured before the existing color-compression step. The
five replacements are encoded losslessly and decoded again before publication;
any RGB mismatch aborts. No resize, renormalization or normal-strength change is
shipped. The original nearest-filtered 30 x 30 paint design, second-paint rotation,
tread offset, all UV selections/samplers and material factors stay intact.

The final orphan image (40,620-byte WebP, SHA-256 `91528e...`) and optional
iridescence declaration are removed. A first strict guard correctly refused
publication: fresh generation retains two unattached iridescence properties,
although decoding the old shipped GLB has zero. The corrected boundary verifies
that every such property has no parent, the declaration is optional, and the
exact expected image has no consumer except Root/these detached properties.
All preconditions precede disposal. Unknown images, live properties or required
extensions are rejected. No broad late prune or shipped-geometry roundtrip is used.
The three required extensions, including implicit mesh quantization, are kept.

Car publication now recomputes public bytes inside the existing manifest lock,
subtracting the current Car and adding the actual candidate before any file write.
Exactly-at-cap replacement is allowed; concurrent growth is rejected. Existing
per-file atomic replacement is retained, not a crash-atomic three-file transaction.
The manifest additionally records the normalized importer recipe hash separately
from the upstream source hash.

## Measured Limits

Actual Car: **2,232,520 bytes**, 134,971 triangles, 95 reusable meshes and twelve
live embedded images. Actual public total: **10,143,326 bytes**. The original
2.25 MiB Car and 10 MiB public caps remain unchanged. Geometry, scene identity,
copyright, the seven other live image payloads (including paint and Tireside),
other nine models and all ten default posters must remain unchanged.

Restoring all remaining normals losslessly was attempted, not silently omitted.
Best measured PNG/WebP payload estimates still exceeded the Car cap by about
92 KB. A full-resolution Tireside near-lossless candidate met the prospective
0.25-degree RMS / 1-degree maximum vector-error limit but still exceeded the cap
with the other maps lossless. Lower-quality and normal-repair experiments failed
either that limit or the size target. Version-0 higher-effort Meshopt saved zero
bytes. None of those experiments is shipped; no limit was relaxed. Tireside
stays byte-identical to the previous verified head, not relabeled as repaired.

[Sharp encoding options](https://sharp.pixelplumbing.com/api-output/#webp) and
[WebP's encoding API](https://developers.google.com/speed/webp/docs/api) distinguish
lossless encoding from near-lossless preprocessing. The acceptance proof here is
decoded-pixel identity, not merely an encoder option or subjective appearance.

## Verification And Remaining Work

Initial actual-asset tests observed twelve failures out of fourteen, including
five RGB mismatches, an orphan image and the missing locked budget guard. A
separate recipe-pin test reproduced its absent manifest field. Final contracts
inspect actual compressed files, all aliases, sampling, required declarations,
the original 410 compressed payloads and callback execution at/growing past cap.
Negative controls reject one-channel corruption, same-count orphan rewiring,
dangling references, required-extension removal, unsafe cleanup and stale/removed
publication guards. Independent final review found no actionable issues after
comparing all 508 decoded accessors, compressed metadata, complete scene/material
state and live images; all 22 selected cases passed without exclusions.

All 28 local stages passed, initially with 179 media tests. After the additional
recipe test and manifest regeneration, all 180 media tests and 27 fresh stills
passed. Repeated Car and full-study generation preserved all public and manifest
bytes. Fresh Car export and all-ten video checks passed. Both complete exact-head
CI events, exact READY preview, hosted workflows/served hashes and actual browser
verification remain required for the pushed checkpoint. Nine unchanged
videos are rechecked, not claimed newly rendered. Existing finite eight-second
360 plus one-second rest and original studio/camera/layout/math are unchanged.

Inspected fresh front, mid-turn and rest frames retain the silhouette, framing
and readable source credit. The inherited previous front view looks broadly
similar at this scale. Strong metallic highlights and dark lower surfaces persist
in the unchanged studio; this repair is not evidence of a dramatic realism gain.

Tireside data fidelity, full collection art review, inherited hardware/D3D X4122,
canonical scenario/lender/calendar work, backend recovery/association and final
accessibility/device/native/release gates remain open. Strict software validation
is not hardware clearance. Adapted model/textures remain Eric Chadwick / DGG,
CC-BY-4.0; documented CC0 ancestry does not relicense the derivative. No merge,
production promotion, new dependency, paid GPU or backend/data/access mutation.
