# Medical Refinement Contract

## Verdict

Original textured medical still-life candidate, not final photorealism approval.
The case/stethoscope identity and existing viewer are preserved. The matching
generated poster now uses an original emerald shield, not the earlier red-cross
emblem. This conservative production-clearance choice is not a legal verdict or
endorsement. Primary reference: https://www.icrc.org/en/law-and-policy/use-emblems

## Actual Artifact

- 509,120-byte self-contained Meshopt/WebP GLB; nine embedded256px color, normal
  and roughness maps for enamel, steel and rubber. Normals are packed losslessly.
- 26,104 unique triangles/50 meshes;43,412 instantiated triangles/113 mesh nodes.
  Reused geometry is not hardware draw instancing. Both totals remain below65,000.
- Hollow fitted case/frame, separate lid/gasket/feet, open arch handle, curved
  guards, slotted fasteners, working-form latches and rear hinges; emerald badge.
- Connected rubber branches, chrome earbows/tips and annular coupling faces;
  rerouted foreground loop joins the shaped chestpiece only at its connector.
- Maximum3.2 stage units, grounded atY=0. Shared camera/studio and finite eight-
  second revolution/one-second rest are unchanged. No balances are baked in.

Builder: `apps/media/scripts/build-refined-medical.mjs`; configuration and poster
lineage: `apps/media/sources/medical/`. Model/source/material hashes are in both
protected manifests. No new dependency, downloaded mesh or paid GPU was used.
Maps are authored visual approximations, not photographed scans or measured PBR.
Coherent8px control fields supply economical micro-normal detail. Original16bit
position/UV quantization is retained; actual decoded UVs remain within[0,1].

The unchanged0.5MiB model cap leaves15,168 bytes. Actual public collection size is
10,364,342 bytes:121,418 below the unchanged10MiB cap. Several oversized curved-
guard attempts were rejected before publication; neither cap was enlarged.

## Observed Failures And Independent Review

Initial geometry tests failed against the old untextured study. A genuine gap
between the chestpiece body and rim, a PBR roughness factor above1, and blocky
corner guards were corrected after observed failures and visual inspection.

Independent review then identified three real P2 defects missed by early tests:
the loop crossed the chestpiece away from the connector; unequal-radius open
tube skins did not touch, while an odd-parity helper falsely accepted them; and
the badge hole had inward-facing walls despite stored normals agreeing locally.
Three new tests first failed on the published intermediate artifact. Exact-skin
annular end faces, a clear loop route and opposite-oriented hole contour fix the
geometry. The contact helper now checks real surface/edge distances/intersections,
not inside/outside parity on open surfaces. Directed-edge/volume and back-face-
culled aperture rays reject missing-face and inner-wall reversal mutations.

All14 standing geometry cases pass. Independent CPU re-review clears the three
findings on the actual distributed hash and rejects the old routes/coupling/rim
mutations. Two contact components remain intentionally: case/hardware and complete
stethoscope. This is not CAD/device certification, globally watertight geometry,
exhaustive coplanar-overlap proof or final collection art approval.

## Poster And Publication Integrity

The original generated edit input is retained as `original-poster.webp`. The
unchanged new1536x1024 PNG, exact prompt, hashes and limitations are retained in
`poster.json`. Its1200x800 transparent runtime WebP is130,728 bytes. Alpha/detail
and green-shield/no-old-red checks inspect actual pixels, not metadata alone.
The other nine poster sources/outputs remain unchanged.

Pure preparation and both selected/full builders use the same recipe. Publication
snapshots caller bytes/records, verifies IDs/hashes, validates all positive safe-
integer revisions (missing legacy revision=1), and checks the actual aggregate
public size under the existing shared model/poster lock. Per-file replacement and
JSON replacement are atomic individually, not a whole-set crash transaction.

Independent review found a hash-then-reopen package race and mixed-type revision
bypass. Both were reproduced RED. Packaging now holds the same lock, captures the
three manifests once, validates each source/poster/GLB/MP4 Buffer and writes that
same Buffer. Seven poster/pipeline tests pass, including actual package-body
filesystem-adapter mutation checks and real on-disk budget rejection. Independent
re-review clears both P2s and validates stale-writer/caller-mutation interleavings.
Source containment is lexical/URL, not realpath/symlink confinement. Failed package
runs may leave earlier individual files; arbitrary noncooperating writers and
process-crash durability are not certified.

## Verification And Remaining Gates

Byte-identical selected regeneration, full protected model/poster rebuilds and a
real40-payload package preserve the other nine records/bytes. Financial/native/
persistence/UI/studio/camera/timing/dependency source paths are unchanged from
verified `ecc682a177bad936a2275269e73de76d58f9c2ac`.

Actual Chrome1440/375 captures inspect four poses; a new1920x1080/30fps nine-second
Medical HyperFrames video passes movement/closure/rest pixel checks. Nine unchanged
videos are rechecked, not claimed new renders.96 media contracts and27 fresh
composition stills pass. Full web, exact-head CI/SQL/native and hosted proof remain
mandatory per push. See `ops/mission/evidence/medical-2026-10-21/`.

Personal, Recreation and Custom still need refinement. All seven textured models
remain candidates. Small hardware, tube stiffness and broad white shell shading
remain economical/illustrative, not exact poster reconstruction. Final art review,
shared scenarios/common-date wealth, lender/calendar rules, backend/provider
alignment, security, physical devices and release approval remain open.
