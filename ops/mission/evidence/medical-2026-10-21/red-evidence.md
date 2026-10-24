# Medical Refinement RED Evidence

## First Two Tests Before Builder Implementation

- Branch: `codex/restoration/asset-heroes`; starting HEAD: `ecc682a`.
- Command: `node --test apps/media/scripts/medical-refinement.test.mjs`.
- Observed result: **2 tests, 0 pass, 2 fail**, exit 1, no skips or cancellations.
- Provenance assertion: actual `record?.quality` was `undefined`; expected `refined-textured`. Medical was absent from the protected imported manifest.
- PBR assertion: decoded GLB had **0** textures; expected **9**. Both failures were `ERR_ASSERTION`, not module/import/decode errors.
- Existing shipping study: **365016 bytes**; inventory declares **7772 triangles** and SHA-256 `2c0dd40ddac70000739d5e4b6956f1686e7b6f4e72886d3fd44c011aaa6a1a70`.
- `build-refined-medical.mjs` was absent at this checkpoint. RED was announced immediately in commentary. The desktop message tool refused to message the native ancestor; no native collaboration tool is exposed in this lane. This file is the durable parent handoff.

## Assumptions For The Builder

- Source hashes use LF-normalized builder text and `JSON.stringify` of parsed `sources/medical/materials.json`, matching existing refinement contracts.
- Geometry is evaluated from decoded POSITION/index data, in group or world coordinates, not declared accessor bounds or node names alone.
- Case lies in XY, front is +Z; body is a closed hollow shell assembled from frame/front/back, with a separate lid, gasket, feet and attached hardware.
- Handle tube and case shell contain actual measurable voids; mutation guards add real solid triangles to prove the void checks detect infill.
- Stethoscope assembly uses the delegated stable M-* names. Contact checks must be symmetric and accept crossing faces while rejecting overlapping-AABB-but-disjoint surfaces.
- Asset generation, poster edits, production changes, manifest edits, browser/server/dependency/GPU work and commits belong to the parent and are not performed by this lane.

## Extended RED Before Builder Implementation

- Command: `node --test apps/media/scripts/medical-refinement.test.mjs`.
- Observed result: **10 tests, 0 pass, 10 fail**, exit 1; all failures are assertions, with no skipped/cancelled tests or import/decode errors.
- Cases 1-2 retain the independently observed provenance and texture RED assertions above.
- Case 3: `M-Case-Body missing` (hollow shell, lid/gasket, real solid-infill mutation).
- Case 4: `M-Handle missing` (measured arched aperture, grip/base contacts, real solid-infill mutation).
- Case 5: `M-Case-Body missing` (four grounded supporting feet, front latches and rear hinges).
- Case 6: `M-Badge missing` (actual emerald shield plate, tapered profile, contacting steel rim).
- Cases 7-8: `M-Stethoscope missing` (connected named Y/branches/earbows/tips, main-tube lateral/depth detachment mutations, projected foreground loop, volumetric body/diaphragm and open annular rim).
- Case 9: actual decoded **5396 unique mesh triangles**, versus inventory declaration **7772**. The unique mesh count intentionally does not multiply reused mesh instances. Finite attributes, normalization and winding checks ran before this assertion.
- Case 10: locked `saveRefinedHero` third-argument callback absent because the builder does not exist yet.

## Verifier Self-Checks Actually Reached

- Contact: crossing long slabs accepted in both directions; disjoint coplanar triangles with overlapping AABBs rejected in both directions; separated slabs rejected. These execute before case 9's artifact assertions, so the old-artifact triangle-count failure proves they completed.
- Publication: a hand-authored callback accepts an exact 10485760-byte public total and rejects 10485761 bytes before write/rename. Callback extraction uses the parsed third argument; only the filesystem boundary is substituted, so the real callback dataflow is exercised without publishing assets.
- Publication mutations: deleting rejection is detected; replacing the guarded live total with stale `collection` while retaining an unused fresh `sizeOf` call is detected. These execute before case 10 inspects the absent actual builder.
- Artifact mutations are present but remain unexecuted beyond missing-node assertions until the parent supplies the refined artifact. No GREEN claim is made.

## Standing Media Contracts

- Command: `npm --prefix apps/media run test:contracts`.
- Observed result: **89 tests, 75 pass, 14 fail**, exit 1; no skipped/cancelled tests.
- Ten failures are the Medical refinement RED cases above.
- Four other failures are the separate parent-owned poster cases: `Medical poster retains traceable original-badge edit sources and current delivery hashes`; `Medical fallback preserves transparent detailed case/stethoscope and uses an emerald badge`; `Medical poster preparation is reproducible and rejects corrupted source lineage before encoding`; `Legacy poster preparation and collection packaging retain the edited Medical source`.
- No existing non-Medical contract failed. The suite used temporary test fixtures; no browser, server, dependency installation or GPU job was run.

## Final Handoff Checks

- Final rerun of the standing media contracts reproduced **75 pass / 14 fail / 89 total** after the last test edits.
- `node --check apps/media/scripts/medical-refinement.test.mjs` passed; the test file contains **272 lines / 10 cases**, below the requested approximate 350-line ceiling.
- Actual shipping GLB SHA-256 was re-read with `Get-FileHash` and still equals `2c0dd40ddac70000739d5e4b6956f1686e7b6f4e72886d3fd44c011aaa6a1a70`.
- Only the delegated test and this evidence note were written by this lane. The parent's separate poster test was left untouched. `git diff --name-only` showed no tracked-file changes.
- `.superpowers/sdd/2026-10-21-medical/red-evidence.md` is ignored by the repository, as confirmed by `git check-ignore`; it exists locally for handoff and is not automatically included in normal staging.
