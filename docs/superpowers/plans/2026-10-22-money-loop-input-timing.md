# Money Loop Input Timing Observation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate trusted input delivery, automation observation, DOM settlement and PNG capture costs without changing the application or its quality requirements.

**Architecture:** Run the existing six-workflow `runSelectionSmoke` through a diagnostic browser wrapper. Host-side wrappers time the existing calls; passive DOM event and mutation observations are retrieved only after each timed workflow. Collect one quiescent normal run and one predetermined 2x main-thread-throttle run, retaining every failure without retries.

**Tech Stack:** Node22, existing Playwright/Chrome, existing Three stage timing and PNG proof helpers.

**Spec:** `docs/canvas-isolation-snapshot-contract-2026-10-22.md`; mission R0; failed8df checkpoint `.superpowers/sdd/2026-10-22-canvas-isolation-snapshot/failed-checkpoint.json` and PRcomment6355703127.

## Global Constraints

- Application baseline8dfba166b3326a2fd3787c9f0f16708a2190f858; no app, formula, artwork, dependency, workflow or renderer edits during collection.
- Keep450ms motion,700ms candidate capture/restore/decode and300ms confirmation, all pixel thresholds and all six workflows unchanged.
- No force clicks, synthetic click dispatch, skipped actionability, changed clock origins, fake time, added retries or late-capture relabeling.
- Private artifacts only under `.superpowers/sdd/2026-10-22-money-loop-input-timing/`; original failed/sealed roots immutable except their progress notes.
- Use task-owned loopback preview53145/PID25560; leave user ports53143/53144 untouched.
- Serialize browser/GPU collection and exclude simultaneous npm decompression, builds and render jobs; never call a CPU-throttle fixture GitHub-host emulation.
- Goal ACTIVE, PR256 draft; no merge, deployment promotion, paid GPU or cloud/data/access/DNS action.

## Review Focus

- Observation overhead can itself change timing; label it and keep layout reads and artifact I/O outside the original budgets.
- Browser event timestamps and Node clocks have different origins; retain raw values/timeOrigin/clock samples and state precision limits.
- A failure must still flush observations before context teardown without masking the original error.
- The normal and throttled collections must use identical app/helper hashes and predetermined order, not favorable sample selection.
- Click/DOM timing correlation is not proof of remote CI causality, physical-device performance or a safe application fix.

---

### Task 1: Collect And Validate Bounded Input Traces

**Files:**
- Create private `diagnose.cjs`, `analyze.cjs`, `diagnostic-contract.test.cjs` and UUID output folders in the study root.
- Read only `apps/web/scripts/smoke-three-selection.cjs`, `test-three-stage.cjs`, `three-stage-timing.cjs`, `browser-harness.cjs` and the MoneyLoop source/CSS.

**Interfaces:**
- Consume unchanged `runSelectionSmoke({browser, origin, output})`.
- Produce a manifest `{id, baseline, variant, pins, workflows, observations, resources, limitations}` with raw epoch/performance timestamps and original six-workflow verdicts.

- [x] Step1: Write CPU contract controls for unchanged argument/deadline forwarding, exact error preservation, observation flushing and resource closure. Observe their intended RED before implementing the wrapper.
- [x] Step2: Implement host timing wrappers around the actual locator click/state calls without adding pre-query RPCs inside the timed path. Install passive pointer/click records and a narrowly filtered DOM mutation observer before page load. Do not change app handlers or geometry.
- [x] Step3: Retrieve diagnostic arrays only during context cleanup after the original timing result. Bound each original command and ensure contexts/browser close even on failure. Snapshot exact runner/source/helper inputs and actual browser identity. Later private failure-path fixes were separately tested/reviewed; the historical browser collection did not execute that later code.
- [x] Step4: Run the fixed normal collection, then the fixed2x-throttle collection using an isolated CDP session. Retain both outcomes; do not rerun to get a pass.
- [x] Step5: Analyze click-call duration, state-read duration, approximate trusted-event latency, DOM-settlement time and capture phases. Keep old PR17ms failure and successful push as distinct observed samples. Rehash inputs and outputs.
- [x] Step6: Independent review checks at least timestamp-origin mistakes, dropped failed traces, added timing overhead and accidental gate changes. Bounded closure accepted in review-rf-d06d39b2; no application fix or remote cause established. Full summary: `ops/mission/evidence/input-timing-observation-2026-10-22/summary.json`.

No application change or GitHub push is authorized by a favorable diagnostic sample alone. Keep the original CI failure failed.
