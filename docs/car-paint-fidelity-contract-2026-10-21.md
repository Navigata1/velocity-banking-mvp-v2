# Car Paint Data Fidelity

This is a bounded import repair, not collection-wide photoreal approval.

Follow-up: `car-normal-fidelity-contract-2026-10-21.md` records five additional
pixel-exact normal maps, guarded orphan cleanup and locked aggregate publication.
The original paint invariant below remains unchanged; Tireside is still open.

## Proven Defect

The previous Car importer converted every texture to lossy quality-90 WebP.
The 128 x 128 paint normal is tiled tangent-space data, not a color photograph.
Its converted pixels differ from the pinned source even before rendering.
After the actual 0.3 normal scale, an independent comparison measured mean
direction error 3.787 degrees and p95 8.598 degrees. The source intentionally
contains a nearest-filtered, 30 x 30 tiled flake pattern; noise is not all damage.

## Repair And Regression

The importer verifies the original paint normal hash before transforming anything,
then restores its original PNG bytes after optimization. Both Carmine materials
retain that same texture, source scale, filters and tiling. Geometry, other image
recipes, materials, lighting, framing and finite eight-second turn are unchanged.

- Source revision: `15cd02d304e54cb42a4db4eefe719f76190f4b68`.
- Source GLB SHA-256: `c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b`.
- Paint PNG SHA-256: `3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e`.
- Decoded RGB SHA-256: `f084dbffd99641c57a397c5de7b5defec889114310ed07861711b043bf787477`.

Run `node --test apps/media/scripts/car-paint-fidelity.test.mjs`. The actual old
asset failed the source-image assertion (`0564da46...` instead of `3c4b65d9...`).
The repaired asset passes byte and decoded-pixel identity. This stronger claim is
source fidelity, not a subjective realism score. The existing 2.25 MiB Car and
10 MiB public-asset limits are not raised. Other nine models and original posters
must remain byte-identical in this slice. Financial source, dependencies and
backend configuration are outside its scope.

## Art And Material Work Still Open

Controlled same-pose inspection covered all ten actual models under current,
lower-fill, room-reflection, self-shadow and combined studio settings. No uniform
collection-wide lighting replacement was approved. The original poster-first
experience remains intact. Further polish needs all-angle visual review.

The independent audit also found collapsed side-surface UV charts in House,
Credit Card and Student Loan, plus one unreferenced Car image and a stale optional
extension declaration. Those are separate repairs, not silently bundled here.
At that initial checkpoint, the remaining Car normal maps still used the lossy
conversion. The follow-up above restores five more exactly; Tireside remains open
because measured full-restoration candidates exceed the unchanged budget.

Car remains an adapted CC-BY-4.0 model and textures by Eric Chadwick / DGG.
The pinned source documents Unity Fan's public-domain starting geometry; that
ancestry does not make the adapted asset CC0-only. Existing credits stay intact.

## Additional Renderer Diagnostic

An extra strict HyperFrames turntable check reports a hardware/D3D shader compiler
`X4122` precision warning. The unchanged old Car reproduces the identical warning;
the repaired Car passes the same strict check in supported software mode without
warnings. No console filter, threshold change or product graphics edit was used.
The hardware warning remains compatibility work, not a newly green hardware gate.
Local verification has 28 successful stages across two serial segments plus that
retained failed diagnostic, not a single all-green 28-stage sweep.
