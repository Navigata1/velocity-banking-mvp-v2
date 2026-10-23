# House Opaque Instancing Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; one independent
> whole-study review, with source changes conditional on acceptance.

**Goal:** Reduce measured House runtime draws while preserving original pixels
and all source assets, before considering live shadows.

**Architecture:** Exact-identity repeated opaque meshes become owned native
Three InstancedMesh batches. Original nodes remain in place, reversibly hidden.
No geometry/material ownership transfer. Other heroes remain exact no-ops.

**Tech Stack:** Existing Three0.185.1, Node tests, installed Chrome/Playwright,
existing GSAP/HyperFrames-contract fixture and owned Windows job harness.

**Spec:** `docs/superpowers/specs/2026-10-23-house-instance-budget.md`

## Global Constraints

- Source486/20assets at verified6ff stay unchanged through private evaluation.
- No GLB/name/provenance/finance/dependency or original visual-identity changes.
- Unknown RSC product network gate remainsFAILED; no exemptions/workarounds.
- No production deployment, merge, paid GPU or metadata-only push.

## Review Focus

- Root-relative matrices must preserve nested transforms and root rotation.
- Hidden ancestors, negative/singular/sheared transforms and custom hooks skip.
- Transparent surfaces and shared materials must remain visually unchanged.
- Disposal failure must not leak ownership or dispose borrowed resources.
- Actual draw reduction cannot be substituted for physical cost/photo approval.

## Task1: Private Helper And CPU Contract

**Files:** New `.superpowers/sdd/2026-10-23-house-instance-budget/`:
`baseline.cjs`, `instances.mjs`, `instances.test.mjs`, `run-unit.cjs`,
`run-controls.cjs`, `progress.md`.

**Interface:** `configureHouseInstances({THREE,scene,model})` returns cleanup
with immutable diagnostic counts. Read-only preceding studies; no old writers.

- [ ] Pin current486/runtime/20assets and read-only inventory/phone receipts.
- [ ] Add no-op subject; observe desired grouping/matrix/cleanup tests RED.
- [ ] Implement exact-identity opaque groups, atomic setup and owned cleanup.
- [ ] GREEN CPU groups plus targeted omitted-group/matrix/disposal controls.

## Task2: Exact Private Graphics Evaluation

**Files:** Same new lab only: `prepare-fixtures.cjs`, `instances-scene.mjs`
(generated), `index.template.html`, `capture.cjs`, `run-capture.cjs`, `verify.cjs`,
UUID manifests/captures/proofs. Exact module copies, not edits to prior fixtures.

- [ ] Generate matched A/B no-shadow fixtures at351x270 and725x420/DPR1.
- [ ] Collect7poses and repeat/rest seeks per fixture; prove source/model parity,
  visible framing, material/camera/light data, one fetch and owned cleanup.
- [ ] Record actual renderer call/triangle counters and image deltas; inspect
  originals at both sizes. No baseline-network approval inferred from fixtures.

Predeclared comparison limits: unchanged seven-pose silhouette bounds (at most
one pixel per edge), unchanged actual renderer triangle/texture counts and lower
calls. Mean absolute RGB channel delta<=0.1 on the0..255 scale and changed pixels
(RGB absolute-difference sum>3)<=0.5% of canvas area. Shader/instance Float32 paths
can differ numerically; these bounds are not a quality score. A failure is kept,
not repaired by widening thresholds after seeing it.
- [ ] Independent whole-study CPU/graphics/cost review; record bounded verdict.

## Task3: Conditional Permanent Scope

- [ ] If accepted, record exact typed shared-helper, web/media callsites and
  test/ship files in this plan before any source edit. Keep focused slices.
- [ ] Fresh source-bound standing29/CI pair/READY/hosted/manual proof before
  verified push. Keep photo, shadow policy, hardware and production gates open.

### Exact Conditional Files And Order

This is scope preparation, not approval to adopt before the pending independent
whole-study review. No source file below has been edited at this point.

1. `apps/web/src/components/hero/house-instances.ts`: typed port of the private
   helper, retaining caller-injected actual Three namespace (type-only imports),
   named geometry/material references and exact eligibility/ownership semantics.
2. `apps/web/scripts/house-instance-tests.cjs`: execute the actual transpiled
   helper with real Three objects, grouped/unsupported transforms, borrowed
   resources and cleanup error cases; targeted actual code-deletion controls.
3. `apps/web/src/components/hero/HeroModelStage.tsx`: configure once after
   refinement/bounds and before first render; cleanup before model disposal,
   preserving remaining teardown in `finally`. Replay never reconfigures.
4. `apps/web/scripts/hero-lifecycle-tests.cjs`: add actual helper import and House
   grouped fixture/Replay/context/late-load/teardown behavior and removed-load/
   removed-cleanup controls; preserve every original Car/Card contract.
5. `apps/web/package.json`: include focused helper tests in standing `npm test`.
6. `apps/media/scripts/prepare-hyperframes-assets.mjs`: transpile the typed source
   to `house-instances.js` using the existing ESM preparation pattern, before cp.
7. `apps/media/hero-turntables/index.html`: import/setup once after measured
   bounds, before initial render; owned instance cleanup on pagehide. No shadow,
   camera, lighting, material, duration, readiness or variable-schema changes.
8. `apps/media/scripts/house-instance-wiring.test.mjs`: actual AST/binding/order
   and negative controls for source emission, load setup and pagehide cleanup.
9. Generated ONLY by existing preparation command:
   `apps/media/hyperframes/vendor/house-instances.js` and
   `apps/media/hero-turntables/vendor/house-instances.js`.

No existing GLB/poster/video, financial engine, other heroes, runtime dependency,
lockfile, workflow, Supabase or provider configuration is an allowed edit. Keep
the frozen private study intact; new source-bound adoption/shipping evidence gets
its own private workspace and verified source set. First commit helper/tests,
second integration/contracts, each focused under400changed lines where feasible;
one verified push only after all new source-bound gates. Working report/docs ride
with substantive accepted work, not a standalone status push.

Private adoption evidence includes `prepare-graphics.cjs`, `verify-graphics.cjs`,
`capture-graphics.cjs`, `run-graphics.cjs`, the fixed29 local manifest/owned-job
controllers, candidate/source-review pinning and generated mission refreshers.
Also prepare `prepare-video.cjs`, `verify-video.cjs`, `canonical-video-worker.cjs`,
`run-canonical-video.cjs` and `capture-diagnostics.cjs` for ONE serialized private
House1080p/9s/30fps/270frame export using an exact copied current canonical
composition/vendor tree and explicit House variables. This does not replace or
rewrite any shipped/stored video and is not an all-ten regeneration claim.
Do not start that GPU/browser job while local29's browser/GPU work is active.
