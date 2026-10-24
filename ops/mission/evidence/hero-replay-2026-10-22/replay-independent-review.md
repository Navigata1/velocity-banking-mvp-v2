# Independent Replay Review: FINAL CLOSED

FINAL CLOSED applies only to the two P2 missing-regression-guard findings below. The bounded CPU test patch now guards both, with actual-source GREEN, three observed in-memory mutant REDs, and permanent negative controls. It is not browser, photorealism, production, shipping, or mission-completion approval.

## Final Closure Evidence

- Added `apps/web/scripts/hero-lifecycle-tests.cjs` and exactly one integration require at the end of `apps/web/scripts/hero-resource-tests.cjs`. No production abstraction, runtime edit, dependency, or package-script change was made by this follow-up. The existing `npm test` entrypoint already invokes the resource tests, so these guards are included in that path.
- The new CPU tests execute the actual component and real turntable/geometry-bound helpers. Browser hooks/loader callbacks, RAF, canvas, environment generation, and renderer boundaries are simulated. No synthetic screenshot harness is used by the tracked tests.
- P2 finite endpoint/stop: CLOSED. Both the initial run and replay are checked at the original pose, halfway at four seconds, active just before eight seconds, one complete revolution at exactly eight seconds, zero pending RAF, and no later renders. The 62.5ms steps represent 1/16 second exactly and remain below the runtime's 100ms cap. Shortened and infinite-RAF variants fail the normal behavior assertions.
- P2 restart cancellation: CLOSED. Repeated mid-turn Replay presses must leave exactly one pending callback; a final active replay is unmounted and must leave zero pending callbacks. Missing cancellation fails with two callbacks instead of one. Renderer/scene/object/canvas identity, one load, `[false, true]` readiness, and exact-once resource release are also checked.
- Additional guards: reduced motion schedules zero RAF immediately on load and on each replay; before-load Replay does not refetch; late successful/failed load callbacks after unmount do not signal readiness/error or schedule RAF; network, failed-texture/blob cleanup, context-loss notification/cleanup, and constructor/environment failures are exercised.
- Runtime/dependency pins: Node `v22.22.2`, TypeScript `5.9.3`, Three `0.185.1`. Baseline remains `462a218342dfa95343bde6882546e99e882e5c99` for the original review comparison. No dependencies were installed.

### Exact Commands And Results

All commands use workspace cwd `C:/Users/IslandDevCrew/Documents/Interest Shield`, except targeted lint, whose cwd is `C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web`.

| Command | Result |
| --- | --- |
| `node .superpowers/sdd/2026-10-22-hero-replay/review-regression-red.cjs no-cancel` | Expected RED, exit 1: `rapid replay must leave exactly one RAF`, actual 2 versus expected 1 |
| `node .superpowers/sdd/2026-10-22-hero-replay/review-regression-red.cjs short` | Expected RED, exit 1: `four seconds must be the halfway pose` |
| `node .superpowers/sdd/2026-10-22-hero-replay/review-regression-red.cjs infinite` | Expected RED, exit 1: `eight-second turn must stop RAF`, actual 1 versus expected 0 |
| `node apps/web/scripts/hero-lifecycle-tests.cjs` | GREEN, exit 0; all eight lifecycle PASS markers below |
| `node apps/web/scripts/hero-resource-tests.cjs` | GREEN, exit 0; existing cleanup checks plus all eight lifecycle PASS markers through the integration require |
| `node node_modules/eslint/bin/eslint.js scripts/hero-lifecycle-tests.cjs scripts/hero-resource-tests.cjs` | GREEN, exit 0, no diagnostics; apps/web cwd |
| `git diff --no-ext-diff --check -- apps/web/scripts/hero-resource-tests.cjs apps/web/scripts/hero-lifecycle-tests.cjs` | Exit 0 |

The three external RED records are `review-red-no-cancel.json`, `review-red-short.json`, and `review-red-infinite.json`, generated at `2026-10-22T00:38:35.010Z`, `2026-10-22T00:38:35.886Z`, and `2026-10-22T00:38:36.820Z`. Each records the final test SHA256 and unchanged runtime SHA256. Mutations exist only in memory. The permanent negative controls rerun the same behavior contract against these three variants, require `ERR_ASSERTION` with the intended failure message, and assert that each mutation actually applied.

### Stable CI Markers

Exactly eight lines beginning `PASS hero lifecycle`: five behavior summaries and three negative controls, each emitted once per resource-test invocation. The existing `npm test` invocation of resource tests inherits these exact lines:

```text
PASS hero lifecycle finite endpoint: initial and replay reach 360 degrees at 8 seconds
PASS hero lifecycle RAF stop: zero pending and no renders after both turns
PASS hero lifecycle replay cancellation: rapid replay leaves exactly one pending RAF
PASS hero lifecycle retention and cleanup: one renderer/model/canvas, stable ready, resources released once
PASS hero lifecycle edge paths: reduced motion, loading replay, late load, errors, context loss
PASS hero lifecycle negative control rejected: missing restart cancellation
PASS hero lifecycle negative control rejected: shortened 1.6-second turn
PASS hero lifecycle negative control rejected: infinite RAF
```

### Final Four-File SHA256 Pins

| File | SHA256 |
| --- | --- |
| `apps/web/scripts/hero-resource-tests.cjs` | `b5fdcd0607cc004e00ac651f376491f736b9f42d1612a2085e7c8e0139928e69` |
| `apps/web/scripts/smoke-heroes.cjs` | `09134334a2f0b7a1abb97a07ffdd0c915078423fdc2e77f92dc7595619bbd0c5` |
| `apps/web/src/components/hero/HeroModelStage.tsx` | `9f3321a5d84e4da9427cf93911f2208f9885a8267d094014eda7a695e1d7707a` |
| `apps/web/scripts/hero-lifecycle-tests.cjs` | `7760968ac84d0c173ccd7788098651592ceba4090e3e66afa178dadd798f2cfe` |

Original missing-guard evidence `review-lifecycle.json` is retained unchanged: SHA256 `bac6ed39ec005e975f00544ea6603f3178a9dc0d1d9e60c6f2d0aaf72bdb2b8f`. That original helper/angle-pixel fixture was CPU simulation, not an all-20 browser/GPU run. No such browser claim is made here.

Parent owns the new full web-tests/lint reruns and 28 serial gates. The initial full web-tests run preceded this patch and is not evidence for these added guards. This follow-up ran only the focused commands above; no browser, GPU, server, build, network, material survey, full-suite command, commit, index change, or other-agent interaction was performed.

## Original Findings (Now Closed)

No concrete runtime lifecycle regression was established in the current patch. Two P2 regression-coverage gaps were established with CPU-only, in-memory mutation probes. These are missing guards, not claims that the current implementation has the mutated defects.

### P2: Replay proof ends before the full-turn endpoint

- Location: `apps/web/scripts/smoke-heroes.cjs:124-133`, especially line 133.
- The new replay proof takes its second frame after only the existing 15 x 100ms sample, then compares that frame with the initial run's equivalent early frame. It never advances replay to eight seconds, verifies a complete revolution, checks the terminal orientation, or observes that rendering stops. Equal early samples cannot establish the finite eight-second contract; changing both runs identically also preserves their equality.
- Evidence: `review-lifecycle.json`, results `mutant-stop-at-1.6-seconds` and `mutant-never-stop`. Both pass the actual replay helper under the CPU fixture with unchanged pixel thresholds. After ten additional simulated seconds, the truncated variant remains at angle `0.10345127194667714` instead of `5.733185307179586`; the nonterminating variant still has one pending RAF even though its clamped angle looks settled. The current source reaches `5.733185307179586` and has zero pending RAFs in that probe.
- Recommendation: preserve the existing primer, cadence, deadlines, and pixel thresholds, and add focused endpoint/settling and scheduler assertions. Check the full turn rather than inferring it from the first 1.5 seconds. An explicit loop-termination assertion is necessary because a clamped final pose can look still while RAF continues indefinitely.

### P2: Replay screenshots do not guard cancellation of the previous RAF chain

- Location: `apps/web/scripts/smoke-heroes.cjs:118-125`; the implementation behavior to guard is `apps/web/src/components/hero/HeroModelStage.tsx:76`.
- The new test presses Replay once and observes canvas identity, ready, poster opacity, and early pixels. It never counts pending callbacks or exercises a rapid sequence of Replay presses. Dropping `cancelAnimationFrame(frame)` creates an extra RAF chain without necessarily changing these sampled poses: callbacks share `previous`, so a second callback with the same timestamp adds zero elapsed time but still renders and reschedules.
- Evidence: `review-lifecycle.json`, result `mutant-no-restart-cancellation`. Removing only the restart cancellation in memory still passes the actual replay helper under the CPU fixture, but leaves two pending callbacks versus the current implementation's one. The negative-control no-op Replay is rejected, confirming that the harness does not simply accept every mutation.
- Recommendation: add a focused lifecycle test that starts a turn, rapidly replays it several times, asserts exactly one scheduled RAF, then unmounts and asserts zero pending callbacks plus one disposal of owned resources. Keep the browser canvas/pixel proof as an integration check, not a replacement for scheduling assertions.

## Original Review Scope And Evidence

- Baseline and HEAD verified during the original review: `462a218342dfa95343bde6882546e99e882e5c99`.
- Reviewed only the uncommitted changes to `apps/web/src/components/hero/HeroModelStage.tsx` and `apps/web/scripts/smoke-heroes.cjs`. Read root `AGENTS.md`, requesting-code-review skill and reviewer template, Mission Control separation guidance, and verification guidance. Read adjacent caller/helper code only to resolve lifecycle and test semantics, not to expand the review target.
- Source SHA256 at the probe and final recheck: stage `9f3321a5d84e4da9427cf93911f2208f9885a8267d094014eda7a695e1d7707a`; smoke `09134334a2f0b7a1abb97a07ffdd0c915078423fdc2e77f92dc7595619bbd0c5`.
- Read `.superpowers/sdd/2026-10-22-hero-replay/replay-red-confirmed.log`: baseline failure is the disconnected Car canvas assertion at smoke line 120. Did not rerun that browser RED or claim a fresh browser GREEN.
- Ran `node .superpowers/sdd/2026-10-22-hero-replay/review-lifecycle.cjs`: exit 0, evidence generated at `2026-10-22T00:34:06.937Z`. The probe transpiles the actual stage in memory, uses real Three scene/resource objects with a fake renderer, and simulates hook commits, loader callbacks, and RAF. It extracts the actual replay smoke functions without executing the smoke entrypoint. Synthetic angle-to-pixel fixtures feed the unchanged spatial comparison thresholds; screenshot capture and PNG transport are simulated. Mutation acceptance is evidence about the helper's logical coverage, not a browser/GPU mutation run.
- Ran scoped `git diff --check` against the baseline: exit 0.
- The original review made no tracked edits, commits, index/branch changes, browser/GPU sessions, server access, builds, full suites, network, or dependency operations. It did not interact with ports 53143/53144 or other agents. Only review-owned ignored files were created in that initial pass; the subsequently authorized test-only changes are documented above.

## Current Behavior Supported By Inspection And CPU Probes

- Replay is removed from the resource-owning effect's dependencies. The caller's error and ready callbacks are stable. Current replay retains one renderer, one decoded object, one canvas, one model load, and the ready event sequence `[false, true]` without another false transition.
- Restart cancels the outstanding frame, resets `elapsed` and `previous`, applies `heroAngleAt(0)`, renders, and schedules only when reduced motion is not requested. Three rapid restarts leave one pending RAF in the probe. Current replay eventually reaches the original endpoint and stops scheduling.
- Pending-load replay does not create another loader/renderer. A scene resolving after unmount is disposed without readiness or RAF. Shared geometry/material/texture/image resources are released once in the successful replay/unmount probe.
- Reduced-motion replay resets the same pose without scheduling RAF. Its renderer, load count, and ready sequence are retained in the probe.
- Context-loss notification followed by caller-style unmount cancels RAF and removes the listener before forced context loss. Renderer/environment construction failures and failed embedded-texture callbacks retain their cleanup/error behavior in the simulated paths. Model replacement still disposes the old renderer and starts a new load.
- Parent offscreen/hidden/mode/failure conditional unmounts are unchanged. Cleanup still owns observer, model, environment, renderer, context listener, canvas, and RAF. The restart ref is cleared on cleanup; disposed and absent-object guards remain in place.
- No assets, math helpers, camera constants, camera-fit calculations, lighting, material setup, original sample cadence, original deadlines, or pixel thresholds are changed by the reviewed diff.

## Residual Gaps

- Browser GREEN/all-20 progress, actual GPU output, CSS poster continuity, and real loader/network behavior were not independently executed here. Those remain on the parent's serial browser/gate path.
- Poster opacity and ready are sampled after the primer (and after 1200ms in reduced motion); these assertions alone do not detect a transient false-ready/poster flash that resolves before sampling. Current source does not reset readiness on replay, but this is not continuously monitored by the new smoke assertions.
- Canvas connectivity does not independently prove renderer/decoded-object identity. Current retention is supported by effect inspection and CPU creation counts; no browser constructor/decoder instrumentation was added.
- Reduced-motion browser replay covers only desktop Car and does not collect a separate GLB request count. Other models, mobile reduced motion, and live preference changes are not newly covered.
- Late-load, failure, context-loss, hidden/offscreen, and rapid-replay scenarios were inspected or simulated, not exercised through a real browser's event ordering. The CPU hook model is intentionally narrower than React/browser integration, including Strict Mode and passive-effect scheduling.

## Declined To Judge

- Material appearance, visual quality, and artistic acceptance: explicitly assigned to Popper and excluded by the user.
- Financial behavior and unrelated routes/modules: outside the two-file review target.
- Changes to assets, financial math, or camera framing: invariance checked from the diff; no separate content/design audit performed.
- Deployment, production readiness, release approval, or mission completion: parent-owned and explicitly excluded from this review.

## Scoped Assessment

FINAL CLOSED: both P2 missing regression guards are resolved by the bounded tracked CPU tests and resource-test integration, supported by the exact RED/GREEN evidence and four-file pins above. No P0/P1 issue or concrete current runtime lifecycle regression was established in this bounded review. Residual browser/event-ordering gaps remain explicitly listed; this is not mission completion, shipping, production, or art approval.
