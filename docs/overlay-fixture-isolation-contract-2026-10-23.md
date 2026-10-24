# CPU Diagnostic Image Isolation

This change affects only `apps/web/scripts/canvas-overlay-tests.cjs`. It does
not change the app, browser capture transport, real debug writer, math, assets,
dependencies, workflows or backend.

Both d842 first-attempt CI events failed CPU test20. Intentional nonmaterial
confirmation fixtures reached the real diagnostic PNG writer, which raised
ENOENT because clean checkouts lacked `test-results/three-stage`. Existing local
output masked the dependency. The original failures remain failures.

A fresh unchanged source copy reproduced 25 tests / 24 pass / 1 failure. Adding
two permanent regressions without the fix produced 27 / 24 / 3. Only then was
the VM fixture's filesystem boundary isolated: diagnostic writes must target
the exact evidence directory and candidate/confirmation filenames, carry Buffer
bytes, and retain independent in-memory copies. No output directory is created.

The fixed clean copy passes 27 / 27 / 0 with no output directory before or after.
Independent verification reproduced that result, passed six separate sink probes
and rejected four introduced mutants. All 25 existing test bodies are unchanged.
Its optional broad lab snapshot failed on concurrent auxiliary-file changes;
that failure is retained, while all495/13 runtime/20 asset pins stayed exact.

Actual PNG decoding, material/stability rejection, error causes, style restoration,
no-retry behavior and 700ms/300ms timing assertions remain. CPU fixtures use
synthetic valid PNGs and simulated DOM/clocks, not rendered performance evidence.
The real browser still writes its original debug files on failure.

Full web CPU tests, media contracts, lint and types are required locally. Both
complete new exact-head CI events, every job/step, six source guards and a known
automatic READY preview remain required. This fixture-only slice adds no new
local29, House export or hosted/manual visual run. It grants no production,
photoreal, lender, backend recovery or physical-device approval.
