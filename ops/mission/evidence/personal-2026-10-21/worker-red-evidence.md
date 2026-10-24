# Personal Bounded TDD Worker: Observed RED

Captured 2026-10-21 06:35 UTC. Scope: test authoring and worker evidence only.

## Changed Paths

- `apps/media/scripts/personal-refinement.test.mjs` (292 lines, 10 contracts).
- `.superpowers/sdd/2026-10-21-personal/worker-first-red.log` (first assertion RED, notified immediately).
- `.superpowers/sdd/2026-10-21-personal/worker-red.log` (first complete 10-case RED).
- `.superpowers/sdd/2026-10-21-personal/worker-final-red.log` (final suite including scene reachability, GPU-instance counting and executable locked-callback fixture).
- `.superpowers/sdd/2026-10-21-personal/worker-contracts-red.log` (complete standing media contracts output).
- `.superpowers/sdd/2026-10-21-personal/worker-red-evidence.md` (this handoff).

No worker edits to builders, GLBs, manifests, source/config, shared helpers, other tests, dependencies, UI, cloud, mission state or Git history. Parent-authored `apps/media/sources/personal/materials.json` is unrelated concurrent work and was not edited. Evidence directory is Git-ignored by existing policy; files exist locally.

## Commands And Results

Working directory: `C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media`.

- `node --check scripts/personal-refinement.test.mjs`: exit 0.
- First `node --test scripts/personal-refinement.test.mjs`: exit 1; 1 test / 0 pass / 1 fail. Real decoded old GLB; provenance failed with `ERR_ASSERTION`, not an import or syntax error.
- Final `node --test scripts/personal-refinement.test.mjs`: exit 1; 10 tests / 0 pass / 10 fail / 0 skipped; 369.6096 ms. Every failure is `ERR_ASSERTION`: missing protected refinement, missing nine-map set, seven missing rendered `P-Body` geometry assertions, old 580536-byte artifact above the 524288-byte Personal cap.
- `npm run test:contracts`: exit 1; 106 tests / 96 pass / 10 fail / 0 skipped; 8119.8265 ms. All existing 96 cases pass. Only the 10 new Personal cases fail.
- `git diff --check`: exit 0, no tracked whitespace errors.

Old shipping GLB SHA-256, confirmed after both runs: `664ace31388fcd98cee407d7399977b3fd8a0c6eefcab37a408cde6d121023bc`.
Final test source SHA-256: `86bb51f101e70ca2f557c14f0fd51983b7ad5b17c08b92104e82f6cf779a2d2a`.

## Exact Contracts

1. Personal replaces the study with protected original provenance and explicitly reused leather
2. Personal embeds varied WebP leather, brass and steel maps with bounded non-emissive PBR
3. Personal has a closed-volume open-top shell and a contacting thick curved flap, rejecting infill and winding damage
4. Personal handle has an actual open leather arch and two contacting brass ring and leather tab chains
5. Personal front straps have real punched holes, open closed-volume buckles and attached brass tongues
6. Personal shoulder strap is one continuous leather ribbon connected through both ring and tab assemblies
7. Personal merged stitches and piping are actual exposed geometry following the leather surfaces
8. Personal key has a closed outward toothed silhouette and real bow aperture in the foreground
9. Personal paper pair is actually inserted in the shell mouth with a static contacting illustrative chart
10. Personal preserves finite outward normalized geometry, both triangle budgets, 16-bit precision and live locked 10MiB publication

## Method And Limits

Each contract uses the real shipping GLB through NodeIO + ALL_EXTENSIONS + MeshoptDecoder; Three.js matrices, triangles and rays inspect actual decoded surfaces. Named parts must be reachable from scenes. Material checks decode embedded WebP pixels with sharp and require the maps on rendered geometry. Provenance/config hashes and builder publication inspection are separate safeguards, never substitutes for geometry/contact checks.

Contact uses finite closest-surface distances, bounded edge intersections and bounded edge-to-edge distances copied from corrected Medical. It never uses inside/outside ray parity, particularly on open skins. Independent fixtures ran before old-model failures and accepted crossing slabs in both directions; rejected separated coplanar triangles with overlapping AABBs, concentric open cylinders in both directions and distant slabs; accepted a real open arch and torus aperture; rejected solid replacements, deleted box triangles and reversed box winding. An executable locked-callback fixture also exercised the exact-cap/over-cap boundaries and rejected deleted guards and stale totals disguised by unused fresh measurements.

Additional bounded in-memory GLB mutations are authored for shell/handle/straps/buckles/key infill and shoulder detachment; actual decoded flap/key deletion/winding checks are present. Those downstream asset checks cannot execute beyond missing named geometry until the parent supplies the refinement. No model writes occur during these mutations.

Coordinates are relative to decoded part/body frames: Y up, front +Z, L/R increasing X. Samples/tolerances scale to geometry bounds; there are no exact authored placements or brittle whole-scene node counts. Shoulder continuity uses welded-position connectivity; the key bow must be off-center with a varying toothed shaft profile. Publication follows the existing `saveRefinedHero` third-argument callback and live `liveCollection` convention, instrumented without real filesystem writes. Both unique and instantiated triangle budgets include EXT_mesh_gpu_instancing multiplicity.

No browser/server/GPU/render/network/paid job or commit/push was performed by this worker. GREEN and final art approval remain parent work. Chart checks establish actual static, contacting geometry and reject financial-record metadata on the chart; they are not an OCR or semantic visual review of an arbitrary chart image.
