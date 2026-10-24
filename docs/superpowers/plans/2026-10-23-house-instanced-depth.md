# House Instanced Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Determine whether the instanced House gains useful bounded depth from self-shadowing.

**Architecture:** A private owner composes the exact current emitted instancing
module and the exact prior1024/2048 shadow module. An otherwise unchanged matched
scene compares instanced-only with the combined path. Nothing is adopted by
writing this plan or passing its CPU tests.

**Tech Stack:** Existing Three.js, Node test runner, existing pinned native/browser job harness.

**Spec:** `docs/superpowers/specs/2026-10-23-house-instanced-depth-design.md`

## Global Constraints

- Baseline is verified4896106/receipt6367684288.
- Keep495source/13runtime/20assets unchanged; private workspace only.
- Desktop725x420/DPR1/2048 and phone351x270/DPR1/1024; existing render settings fixed.
- Instances before shadows, reverse cleanup, no borrowed-resource disposal.
- No broader art, engine, dependency, cloud or production changes.

## Review Focus

- External instance/shadow ownership must reject without taking over cleanup.
- Invalid shadow setup after instance allocation must restore the original root.
- Shadow-disposal failure must still release batches and restore original flags.
- Real InstancedMesh geometry must fit the whole-yaw shadow frustum at both sizes.
- Scene-node caster counts must not be presented as actual submitted draw calls.

### Task1: Combined Ownership Contract

**Files:** Private `.superpowers/sdd/2026-10-23-house-instanced-depth/`:
`combined-depth.test.mjs`, `combined-depth.mjs`, `run-cpu.cjs`, controls/review records.

**Interfaces:** `configureInstancedHouseDepth(options)` consumes the existing
THREE/renderer/key/scene/bounds/model/shadowMapSize bindings and returns one
idempotent cleanup with separately named instance/shadow configuration evidence.

- [x] Pin the verified head,495sources/13runtime/20assets and exact two helper copies.
- [x] Write real Three CPU tests for both map sizes and the five review risks.
- [x] Run an instancing-only scaffold to observe intended behavior REDs.
- [x] Implement the minimal private owner and run all tests GREEN.
- [x] Run targeted ownership/rollback/cleanup/bounds removed-code controls.
- [x] Obtain one independent bounded CPU/contract review before GPU work.

### Task2: Matched Render Decision

**Files:** Same private workspace: scene/template, fixture preparation/verification,
owned native capture runner and collection outputs. Reuse established harnesses
without invoking writers in sealed studies.

- [x] Prepare four exact fixtures from current helpers/assets; prove only the
  declared shadow setup and size differ, not camera/light/material settings.
- [x] Preflight one collection:44images/11seeks each fixture, existing seven
  primary poses, repeat/rest equality, framing, resources and raw failures.
- [x] Run native/GPU work serialized; require all owned jobs/contexts closed.
- [x] Read actual draw/triangle/texture counters, not caster-node arithmetic.
- [x] View all28required originals and independently review bounded art evidence.
- [x] Record ACCEPT or REJECT against467draw/90960triangle screening budgets and
  visible benefit. Do not rerun an unchanged failed collection for a better result.

### Task3: Adoption Decision

- [x] Keep the product unchanged and preserve the bounded accepted private study.
- [x] Record live-shadow adoption HOLD. No shadow integration plan or product
  wiring is authorized by this private acceptance; future adoption requires a
  separate plan and lifecycle/media/full29/CI/hosted/browser evidence.
- [ ] Fold mission/report updates into substantive accepted work, never a
  metadata-only push. Keep PR256draft and productionfalse.

## Result

Collection93eea29f passed: four closed contexts,87owned processes0active,
44PNGs/14primary pairs. Both parent and independent reviewerfca75291 viewed
all28primary originals. Candidate378calls/90432triangles/10textures fits the
screen, but adds167calls versus211shipping and nearly doubles triangles.
Useful modest eave/sill/planting depth is not a sufficient default-cost case
without physical evidence. Private candidate ACCEPT_BOUNDED; adoptionHOLD.
Plain interiors/angular foliage/all-ten finalphoto remain open. HDEP-001
cleanup observability advances as a separate product hardening slice.
