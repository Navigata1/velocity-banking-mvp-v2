# House Depth Study Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Determine whether existing-key self-shadows visibly improve the House without changing its authored asset or the original dashboard.

**Architecture:** A private Three helper configures only eligible cast/receive flags and the existing key's shadow camera. Two isolated HyperFrames fixtures share exact current runtime/model copies. Product wiring is conditional on measured and independently inspected benefit.

**Tech Stack:** Existing Three0.185.1, local HyperFrames0.7.56, Node tests, installed browser/FFmpeg. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-23-house-shadow-study.md`

## Global Constraints

- Preserve source486/tenGLBs/tenposters, materials/maps, main camera, lights/targets, room and exposure1.15.
- Preserve finite8second turn plus1second rest; no wall-clock-driven video state.
- Private lab `.superpowers/sdd/2026-10-23-house-self-shadow/`; sealed metric-truth root is read-only except its progress.md.
- No concurrent GPU/build/browser gate work. Use minimal environments and owned jobs; preserve user53143/53144 and owned53145.
- No install/paidGPU/cloud/security/data mutation, production promotion or metadata-only push.

## Review Focus

- Glazing must not cast opaque panes; foliage cutouts must preserve their actual alpha semantics.
- The whole yaw envelope must fit the light frustum without changing lighting or primary camera.
- Missing/unknown assets and malformed bounds must fail before partial mutation.
- Repeated setup/seeks and disposal must not accumulate flags, maps or stale resources.
- A statistically different frame is not automatically a better-looking frame.

### Task 1: Pin The Baseline And Build A CPU-Tested Private Helper

**Files:** Create lab `baseline.cjs`, `self-shadow.mjs`, `self-shadow.test.mjs`, `progress.md`; read current HeroModelStage, studio-environment, turntable, hero bounds and House builder. No product edit.

**Interfaces:** `configureHouseSelfShadow({THREE,renderer,key,scene,bounds,model})` returns an owned cleanup function. The actual namespace injection keeps Node/browser helper bytes identical without a private module loader. Only exact House path applies; other paths remain unchanged. Bounds use the existing rotation-envelope shape. Diagnostic map2048/padding2.5%/zero bias/half-texel normal bias are declared starting values, not optimized results.

- [x] Record exact6ff/current5351checkpoint/source486 and current runtime/model pins, without modifying older receipts. Baseline records20protected GLB/poster files and actual installed Three0.185.1/HyperFrames0.7.56/GSAP3.15.0.
- [x] Write genuine desired-behavior CPU tests with real Three mesh/material/light/camera objects; RED2pass14fail, not missing-module/setup failures.
- [x] Implement fail-before-mutation validation, opacity/cutout eligibility, rotation-envelope shadow-camera fit and cleanup; GREEN16groups. Current test target override retains all assertions, enabling three actual AST-deletion controls (renderer flag, mesh flags, ownership guard); all are rejected. First private control collector wrongly expected an unbraced loop and stopped after one mutant; partial artifacts retained, fresh corrected three-control collection passes. No GPU/art acceptance follows.
- [x] Independently review the private helper and fixture boundary before rendering. Helper accepted8b671c48; initial fixture review0e0b7f96 foundP2 asynchronous readiness gap. Original ba629fixtures retained unrendered. Recognized plural timeline-building gate plus first-render event and fail-closed diagnostic guard pass7CPUgroups/37reviewer staged-log cases; supplement1a9ff27a clears corrected6ebebb0e boundary. No visual approval follows.

### Task 2: Capture And Decide

**Files:** Create lab `index.template.html`, `study-scene.mjs`, `prepare-fixtures.mjs`, `capture-fixtures.cjs`, `probe-fixtures.cjs`, `inspect-snapshots.cjs` and generated UUID evidence. Reuse established local wrappers, not new CLI scaffolding/installers.

**Interfaces:** Fixtures `house-a` baseline and `house-b` self-shadow; explicit9second sized root, synchronous paused timeline and readiness-gated seek rendering. Prepare once with exact source/helper/vendor hashes; execution validates them before/after each boundary.

- [x] Build two independently loaded fixtures with identical current House, studio, refinement, geometry-bound and turntable modules; pin actual executed private copies. Corrected6ebebb0e manifestSHAa8c247a6e4df9931875081d8d6e92b07a993c3608ff5644809e9fa0bfef230b9;2x16copies,source486 unchanged.
- [x] Run one serialized A/B lint/strict/snapshot collection at0,2,3,4,5,6,8.5seconds,1920x1080/DPR1. Failed8f7638df launcher stopped beforebrowser onGitENOENT;scoped minimalPATHrepair+preflight precedes fullactualaf5f24fb PASS. Rawfailure retained,not retroactively passed.
- [x] Verify actual pixels, full-yaw containment, repeated-seek invariants, one model fetch/scene, shadow-frustum coverage and closed owned resources. Actual2x11seeks/oneGLBfetch/page/identicalrepeat0+rest8/8.5 pixels; all14images framed,486sourcepins unchanged; nativejob113processes/0active. Draws467to890/triangles45480to90432/textures8to10;baseline4ReadPixelswarnings,candidatenone. Not hardware speed or physical GPU-memory proof.
- [x] Inspect all fourteen full-size frames and obtain independent visual judgment. Parent and independent3ace3a77 accept ONLY nextprivate375/runtime/video evaluation:useful butmodest gain,angularplants/plaininteriors/hardshadows remain. All14hashes verified; no adoption/photo/release approval.

### Task 3: Conditional Product Adoption

**Files:** Only after acceptance, scope permanent shared helper/web/media callsites/contracts and a new isolated shipping workspace. Exact files and test changes must be written into this plan before implementation.

**Interfaces:** Shared load-only policy, unknown/other-nine no-op, preserved replay/readiness/reduced-motion/fallback behavior. No shadow-resource ownership leaks.

**Pre-adoption private evaluation files:** Create lab `prepare-runtime.cjs`, `build-runtime.cjs`, `capture-runtime.cjs`, `runtime-contracts.test.cjs` and UUID copies. Two `.superpowers/house-shadow-web-{a,b}-UUID` projects copy exact tracked web source and borrow existing node_modules. B-only copies reviewed helper bytes as `src/components/hero/house-self-shadow-study.js` and manually edits its private `HeroModelStage.tsx`: import, owned cleanup variable, configure after actual bounds, cleanup before model disposal. A remains exact. No product source edit yet. Freeze every executed copy before serial fresh builds and1440/375seven-pose captures; compare real served HTML/static hashes to those builds. The one complete9s30fps candidate HyperFrames video remains private. Record any failure and cost before deciding whether to propose permanent adoption.

Use `run-runtime-capture.cjs` as the owned Windows-job supervisor. Runtime captures include the seven declared poses plus a separate1.5second reference for the unchanged standing Replay helper, which tests reset/motion/cadence without another model fetch. This extra control is not a replacement for any of the seven A/B poses. Capturing software frames is not an FPS/device benchmark.

The first private app capture failed on unclassified baseline RSC aborts after valid A1440poses/Replay. Two bounded diagnostics reproduced prefetch-shaped HTTP200 aborts beforemodel load; HTTP2 did not eliminate them. No benign classification/cause or app/network workaround was accepted. A revised collector may finish all four independent art cases before enforcing the SAME failed network verdict at the end. `runtime-network-verdict.cjs` retains all raw failures, and aggregate must throw/exitnonzero if any remain; visual success must never convert the network result to passed. Preserve immediate pose/readiness/page/static/model/cleanup assertions. This permits evidence gathering, not whole-runtime/network or production approval. Original failed runs remain failed; no prefix is inherited.

- [x] Complete actual375px/runtime/video evaluation: four art/lifecycle subcases and270frame video formal checks pass; OVERALLruntime/network remainsFAILED. Independent9e00c057 holds permanent fixed2k policy due modest gain/submission cost and unknown physical performance. No product/artifact adoption. Next separate phone-budget study is specified in2026-10-23-house-shadow-budget.md.
- [ ] If adopted, run all current source-bound29local gates and a fresh full CI pair/READY/hosted/manual sequence, then one focused source/docs/mission push and a verified receipt. No stale prefix inheritance or gate weakening.

The last conditional step was NOT performed because fixed2k was not adopted.
The study's private evidence and failed network results remain intact; its
evaluation completion is not R1/art/network/production completion.
