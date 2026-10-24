# Vault Refinement Contract

This R1-T2 slice preserves the steel-and-brass circular Vault identity, the existing
layout, and the eight-second full turn plus one-second rest. It does not close the
House/Land task or approve the complete collection as photorealistic.

## Asset And Ownership

`apps/media/scripts/build-refined-vault.mjs` authors the geometry and six embedded
512px PBR maps. The annular front frame has an actual opening, a lined chamber,
a beveled door on a right-side pivot, physical hinge links and locking hardware.
No paid GPU service, third-party texture/model, or financial value is embedded.
The GLB is 719,996 bytes with 31,976 unique-mesh triangles and 45 reusable meshes.
It remains below its 0.85 MiB cap and the existing 10 MiB collection budget.

The builder (canonical LF text) and distributed bytes are SHA-256 recorded in
`hero-imported.json`.
The study generator preserves refined IDs. Importers publish their model and records
under the same lock as a full study rebuild's snapshot/publication. Each JSON file
is replaced through a same-directory temporary file. The model and two manifests
are not one crash-atomic transaction; an interrupted
pair must be regenerated and revalidated before shipping. A stale lock fails
closed after ten seconds. Verify its recorded owner is stopped before removing it.

## Render Contract

Web and HyperFrames both consume `createHeroEnvironment` from the same source.
Its reflection cards and diffusion texture are local, temporary PMREM inputs and
are disposed on success/failure; the returned environment is owned by the viewer.
An environment setup failure retains the poster and releases the runtime stage.
All ten models must be re-rendered and browser-tested after a shared lighting edit.

## Reproductions And Gates

Tests first rejected the old untextured study and the old single-record manifest
replacement. Independent review then found hinge links stopped short of the curved
door and concurrent imports could lose records or read torn JSON. Real geometry
contact and eight-child-process filesystem reproductions failed before correction.
A real study rebuild/import overlap then reproduced stale inventory restoration;
the shared publication lock corrects that too, including protection of model bytes.

Run the full web suite, 41 media contracts, web build/lint, all ten browser model
views at desktop/375px, loading/failure/reduced-motion checks, the HyperFrames
turntable render/pixel verifier and the existing media suite. Require both hosted
CI jobs and Vercel on the final pushed SHA. Visual inspection remains necessary:
texture count alone is not proof of photorealism. Eight models still need their
own detail/texture passes, and both refined candidates need collection review.

Windows review also reproduced transient EPERM during competing exclusive opens.
Bounded Windows-only EPERM/EACCES retries retain `wx` creation, never steal a lock
and pass deterministic failure injection plus 20 repeated eight-process trials.
