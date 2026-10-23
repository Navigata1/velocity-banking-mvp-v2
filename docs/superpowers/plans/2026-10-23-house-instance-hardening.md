# House Instance Hardening Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. This is the
> single focused fix pass required by independent review628d5c0b, not new art work.

**Goal:** Close F1 active-state regression gaps, F2 already-instanced geometry,
F3 failed publication rollback, and representable Float32/bounds validation.

**Architecture:** Preserve the measured exact-identity Three instancing approach.
Validate all owned buffers/bounds before publication; visibility/attachment and
rollback share one ownership transaction. Never dispose borrowed resources.

**Tech Stack:** Existing Three0.185.1 and Node tests. No dependency/asset change.

**Spec:** `docs/superpowers/specs/2026-10-23-house-instance-budget.md`, plus
the confirmed findings in private review628d5c0b/report.md.

## Constraints

- Preceding private instance study/fixtures/captures/receipts are frozen; only its
  progress ledger may be appended. No writers rerun there.
- Source486/runtime13/20assets at6ff remain exact; no product integration until
  targeted independent fix verification. RSC remainsFAILED, shadowsHELD.
- Narrow private write scope: `.superpowers/sdd/2026-10-23-house-instance-hardening/`:
  `baseline.cjs`, `instances.mjs`, `instances.test.mjs`, `run-unit.cjs`,
  `run-controls.cjs`, `progress.md`, UUID CPU evidence/review output.

## Review Focus

- Live state must be checked before cleanup hides an exclusion/key violation.
- All borrowed maps/geometries/materials retain identity and disposal counts0.
- Failed attachment and multi-batch disposal restore every visibility/owner.
- InstancedBufferGeometry and unrepresentable matrices do not publish batches.
- Batch bounds/culling are nonvacuously asserted, not inferred from final cleanup.

## Task1: Failing Contract Then Minimal Fix

- [ ] Pin source and exact old helper/tests/capture/review; copy old helper and
  tests unchanged before editing NEW copies only.
- [ ] Strengthen active exclusion/key checks, real texture spies, bounds/frustum,
  already-instanced geometry, multi-batch construction/attachment/disposal and
  finite Float32 regressions; observe desired RED on old helper.
- [ ] Reject existing instancing; validate stored matrix/bounds before publication;
  transactionally rollback partial attachment, attempt every owned disposal and
  restore visibility/ownership while preserving the original setup error.
- [ ] GREEN expanded tests and targeted negative controls for every review finding.
- [ ] Targeted independent verification of F1-F3/storage delta, not a new broad
  study or repeated investigation. Preserve original passing graphics separately.

## Task2: Resume Conditional Adoption

- [ ] If accepted, resume exact conditional source scope in
  `2026-10-23-house-instance-budget.md`, port the FIXED helper/tests, and collect
  fresh source-bound integration/graphics/standing29/CI/READY/hosted/manual proof.
  Old captures prove old code only; never relabel them as runs of the fixed port.
