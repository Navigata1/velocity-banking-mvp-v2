# Visible-Time Hero Clock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Keep implementation and independent verification separate.

**Goal:** Complete one finite eight-second visible-time hero turn even when animation callbacks arrive slowly, without changing its visual design or financial behavior.

**Architecture:** Keep the clock inside the existing HeroModelStage effect. Accumulate full nonnegative intervals between visible RAF callbacks, using an explicit undefined timestamp sentinel. Reset the timestamp at visibility boundaries and Replay; remove the owned document listener on teardown. AssetHero continues to unmount hidden/offscreen stages.

**Tech Stack:** Existing React, TypeScript, Three.js and Node assertion lifecycle harness. No new dependencies, renderer, asset or media composition.

**Spec:** This bounded design and `.superpowers/sdd/2026-10-23-hero-low-cadence/next-action.md`; mission R1-T15. Prior accepted checkpoint f708bda/receipt6370542236 is sealed, not a waiver for this change.

## Global Constraints

- Keep HERO_TURN_SECONDS at 8 and retain heroAngleAt easing, full revolution, camera and rest pose.
- Keep reduced motion, one pending RAF, Replay without model refetch, resource ownership and idempotent cleanup.
- Preserve AssetHero's document-hidden/offscreen unmount policy; child pause tests are not whole-app object-resume proof.
- Do not edit any GLB, poster, material, environment, calculation, dependency, lockfile, workflow, deadline or pixel threshold.
- PR256 stays draft and productionReady=false; no production promotion, paid GPU work or cloud-data mutation.

## Review Focus

- Slow or irregular visible callbacks must not lose elapsed time or leave RAF running after the endpoint.
- Timestamp zero is a valid first RAF, not an unset sentinel.
- Hidden gaps with or without delivered callbacks must not advance the child turn; first resumed callback establishes a fresh timestamp.
- Replay while paused must reset pose and timing without creating another renderer or loader.
- Teardown, late load, context loss and reduced motion must preserve existing cleanup and parent lifetime policy.

## Task 1: Pin Behavior Before Changing Production Code

**Files:** Modify `apps/web/scripts/hero-lifecycle-tests.cjs`; read the sealed baseline component, parent and turntable.

- [x] Verify the already retained actual-component seven-case RED and private prototype independently of product edits.
- [x] Extend only the harness document/RAF delivery boundaries to model visibility listeners, gaps and timestamp zero.
- [x] Add permanent behavior contracts for normal, slow, irregular and single-gap cadence; zero origin; hidden delivery/no-delivery; Replay pause; reduced motion and listener teardown.
- [x] Execute against unchanged f708 production source; retain the intended assertion failures and passing baseline cases.

## Task 2: Minimal Clock Correction

**Files:** Modify `apps/web/src/components/hero/HeroModelStage.tsx` only for the clock and its listener cleanup.

- [x] Use `previous: number | undefined`, full `Math.max(delta, 0)` visible accumulation, and visibility-boundary/Replay resets.
- [x] Remove the owned visibility listener before resource teardown.
- [x] Run the complete standing lifecycle script and focused new contracts; reject selected mutations for the old cap, missing reset, truthy timestamp, missing cleanup and Replay timing.
- [x] Independently review exact source/test pins and actual-component probes while the parent prepares integration and shipping evidence in a disjoint private folder.

## Task 3: Integration and Shipping Gates

- [ ] Check actual parent hidden/offscreen unmount and subsequent new-stage behavior; do not claim same-object pause/resume from child tests.
- [ ] Run relevant web/media CPU tests, lint/types, fresh standing local gates and current browser timing evidence without competing GPU jobs.
- [ ] Update mission state67, journal and generated HTML with the completed f708 checkpoint and honest new candidate status. State updates ride with substantive code, not a metadata-only push.
- [ ] Push only the reviewed tested candidate, then require its own complete exact-head CI, actual READY provider binding, hosted checks, manual proof and guarded receipt. Preserve all failed runs; no unchanged favorable retries.

## Verification Limits

CPU simulation establishes clock arithmetic and lifecycle contracts, not real frame rate, temporal smoothness, energy or memory performance. The initial time origin is the first visible RAF after start/resume, not a click-to-rest wall-clock guarantee. The old 100ms clamp is causal in the retained controlled reproduction only; historical instrumented Chrome delay remains unexplained. This slice does not supply final all-ten photoreal approval.
