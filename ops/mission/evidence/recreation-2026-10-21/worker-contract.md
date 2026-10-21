# Recreation Test Contract

Early RED observed on decoded old GLB: 2 tests, 0 pass, 2 ERR_ASSERTION failures.
Raw stdout/stderr/status: worker-early-red.*. No product changes by worker.

Stable names from dispatch; geometry read in each part's local frame, Y up.
Hull/deck horizontal length axis inferred from X/Z span. Cabin windows tested
through thinnest local horizontal axis (side panel); panes may be descendants.
Cockpit walls may be R-Cockpit-Walls or R-Cockpit-Wall-* (prefix match).
R-Rigging is a group containing individual mesh rods/stays (GPU instances are
expanded and checked individually); at least three standing stays must
physically meet mast and deck/hull at opposite ends.
Seam mesh samples must follow actual billowed sail surfaces, not planar chords.
Closed-volume/directed edges apply to hull, sails and fins; holes remain actual
voids, not alpha/paint. Cavity/opening tests include inserted solid mutations.
Normals transformed by inverse-transpose; GPU T/R/S expanded before geometry
and rendered budget checks. Contact uses bounded triangles/edges, never parity.

Planned material sets Canvas/Timber/Paint/Steel; color/normal/roughness slots
used on the corresponding actual geometry. 512px Canvas/Timber color, 256px
others; >=9 meaningful used embedded WebPs (no exact map count).
Original oak and cloth path/hash/originalOutput provenance retained.
Budget test reuses existing locked saveRefinedHero callback AST execution
pattern: liveCollection/sizeOf/target/output, exact-cap and over-cap boundaries,
guard removal and unused-fresh/stale-total negatives. No cap exemptions.

## Observed RED and Handoff

New test file: 12 tests, 271 lines. Early run: 2/2 genuine assertion failures.
Complete focused run: 1 verifier-fixture pass, 11 old-study ERR_ASSERTION fails.
Full media contracts: 126 total, 115 pass, 11 fail; all 114 existing tests pass.
No missing-module/import/file error was used as RED. The old GLB decoded in all
11 model tests. Geometry failures name absent rendered R-* contracts; provenance
and texture failures are actual decoded old-study assertions; budget failure is
the old artifact exceeding 524288 bytes. The builder is NOT implemented by this
worker, and no candidate geometry/material/transport success is claimed.

Commands (workspace root):

    node .superpowers/sdd/2026-10-21-recreation/worker-run.mjs --label=final-red
    node .superpowers/sdd/2026-10-21-recreation/worker-run.mjs --full --label=full-final-red

Runner executes node --test scripts/recreation-refinement.test.mjs or
node --test scripts/*.test.mjs with cwd apps/media. Raw stdout/stderr and exact
exit status (1, null signal, null spawn error) are in worker-<label>.*.

Passing negative fixtures include AABB-only overlap; coplanar disjoint triangles;
nested open cylinders and closed solids; unbounded-ray contact; open/inverted
solid; solid-filled window; flat thick sail; out-of-range/collapsed UVs; orphan
scene node; removed cap guard; unused fresh measurement with stale guarded total.
Positive fixtures verify crossed surfaces, window aperture, closed positive
volume, truly billowed thin skin, normalized POSITION/UV, GPU T/R/S and explicit
inverse-transpose normal expectation. Candidate contracts additionally mutate
actual hull/cockpit/windows, move seams and detach fins once implemented.

Ownership: only apps/media/scripts/recreation-refinement.test.mjs and worker-*
scratch in this directory. No product edits, shared helper changes, dependency
changes, browser/GPU/server/render/network/cloud actions, commits or pushes.
