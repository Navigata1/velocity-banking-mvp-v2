# Replay Clock Boundary Review

## Findings

No new blocking P0/P1/P2 findings in the actual three-file repair against
`6ce6e5ede081903d771f5d9745826bcd42f88e96`.

**Existing P2 residual, not introduced by this repair:**
`C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/smoke-heroes.cjs:94`
still computes a running browser clock's `Date.now() + 100` in one RPC and pauses
at that absolute value in another. Its original callers remain at lines 188 and
214. A sufficiently delayed pause RPC can still encounter a past target. This
is an important remaining CI reliability risk, but not a blocker to closing the
specifically bounded *new Replay-boundary repair*. A general claim that all
clock setup races are fixed, or that fresh CI must now pass, is unsupported.

## Actual Change and Ownership

- `C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/smoke-heroes.cjs:113`:
  removes only the initial `pauseAtVisibleHero(page)` inside `verifyReplay`.
- The domain path at current lines 188-207 and vault path at lines 214-229 no
  longer resume after their original two captures. Both therefore enter Replay
  using the same paused sampling session established before model inspection.
- `C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/smoke-heroes.cjs:136`:
  the original helper `finally` still disposes the canvas handle and resumes.
- `C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/hero-resource-tests.cjs:50`:
  adds exactly one require of the new protocol test.
- `C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/hero-replay-clock-tests.cjs:7`:
  resolves the web root from its actual scripts directory. Line 46 supplies
  standard `URL` to the isolated helper VM, needed by the real GLB request counter.

The independently generated in-memory three-deletion candidate has exactly the
same SHA-256 as the actual smoke file. Thus no additional sampler, deadline,
pixel threshold, resource cap, or proof assertion changes are hidden in that
file. The 16 ms primer, 15 x 100 ms samples, canvas identity, poster visibility,
no-additional-fetch, initial-pose reset, non-no-op, renewed movement, and matched
cadence assertions are retained. There is no added sleep, retry, larger clock
margin, assertion suppression, or new runtime branch.

The reviewer changed only this ignored note and `review-clock-probe.cjs/json`.
No tracked edits, browser/GPU/server use, full suites, build, network, commits,
dependencies, agent dispatch, hosted-session interaction, or user-port access.

## Observation Versus Explanation

Observed in the provided completed job logs:

- `C:/Users/IslandDevCrew/Documents/Interest Shield/.superpowers/sdd/2026-10-22-hero-replay/failed-ci-39702904111-119576091635.log:232`:
  house initial presentation and motion samples completed. Lines 234-240 report
  `Cannot fast-forward to the past` through `pauseAtVisibleHero` -> `verifyReplay`
  -> domain caller. The earlier car Replay passed at line 230.
- `C:/Users/IslandDevCrew/Documents/Interest Shield/.superpowers/sdd/2026-10-22-hero-replay/failed-ci-39702908995-119576107739.log:243`:
  car initial presentation and motion samples completed. Lines 245-251 identify
  the same extra Replay pause, not the original setup pause, as the failure site.
- The untouched ignored protocol test independently exited 1 with the exact
  past-target error before review of the applied patch.

Explanation supported by those stacks and local Playwright implementation:
resuming creates an unnecessary real-time interval, and the extra helper samples
an absolute future target before a separate pause RPC consumes it. Local
`apps/web/node_modules/playwright-core/lib/coreBundle.js:11866` shows the pause
transport steps; its injected controller at line 11434 rejects backwards
fast-forward. The logs do not measure the individual RPC latency, so attributing
the elapsed >100 ms to a particular transport/GPU scheduling step remains an
inference, not a directly timed observation.

Removing the entire extra resume/re-pause boundary eliminates that specific
past-target operation, rather than making it less likely by increasing a margin.
Keeping the caller paused also prevents wall-clock CPU/pixel-analysis latency
from selecting an arbitrary pre-Replay turn phase. With no navigation or model
replacement between original capture and Replay, the extra visibility/pause
setup is not needed to restore a lost state.

## Protocol Test Quality and Fresh CPU Evidence

Read the complete new file, lines 1-70, at its actual destination. It extracts
and executes real smoke helper bodies using TypeScript AST plus a VM; it does
not require the browser script or launch its top-level runner.

- Lines 28-41 model a paused caller and a 250 ms pause-delivery delay. This is a
  deterministic adverse fixture, not a measured CI timing distribution.
- Lines 35-39 and 52-53 check paused click/primer/sampling, exact timing calls,
  two captures/writes, disposal, and eventual resume.
- Lines 61 and 16-25 statically reject direct `page.clock.resume()` calls in
  `run`. This catches both actual removed call sites. It is not dynamic execution
  of the domain/vault callers and is not interprocedural alias analysis; a future
  redesign must revisit that guard rather than treat it as comprehensive proof.
- Lines 64-68 supply negative controls for the redundant helper pause and a
  direct caller resume. These are meaningful for the reported regression.
- Lines 44-48 explicitly isolate clock ownership with numeric phase fixtures.
  Screenshots return fixture counters and the pixel operations are doubles.
  They do not prove real browser pose reset, timing, PNG contents, or rendering.

Fresh commands run by this reviewer:

1. `node apps/web/scripts/hero-replay-clock-tests.cjs`: exit 0, all three PASS
   markers observed, including negative controls.
2. `node .superpowers/sdd/2026-10-22-hero-replay/review-clock-probe.cjs`: exit 0.
   Uses the actual new protocol test against source variants in memory, without
   replacing any tracked source. Six expected outcomes are recorded in
   `review-clock-probe.json`: baseline RED with exact past-target error;
   three-deletion candidate GREEN; actual patch GREEN; restoring only the helper
   re-pause RED with exact past-target error; restoring only the domain resume
   RED; restoring only the vault resume RED. Both latter failures are the caller
   ownership assertion. Candidate and actual smoke SHA-256 are identical.
3. `git diff --check`: exit 0.
4. `git diff --exit-code 6ce6e5ede081903d771f5d9745826bcd42f88e96 -- apps/web/src/components/hero/HeroModelStage.tsx`:
   exit 0; runtime unchanged.

The additional probe initially encountered an overlapping parent patch and then
an omitted timer global in its outer VM. Those were reviewer-harness setup
errors, not application/test findings. The final probe uses the immutable base
via `git show`, supplies the required VM globals, and completed all six cases.

## Final SHA-256 Pins

Measured twice after the actual patch, with matching results:

| File relative to workspace | SHA-256 |
| --- | --- |
| `apps/web/scripts/smoke-heroes.cjs` | `b07901d78c6f6ee9726d16645df78700b7363dc4313315524cecf254601783a6` |
| `apps/web/scripts/hero-resource-tests.cjs` | `b0bf799ede1d74fbccaacadec5723b113583d5c428cb16fbab4b24f098e0e459` |
| `apps/web/scripts/hero-replay-clock-tests.cjs` | `9881504b4114d958c26d7d4bd44c0b24b5389804367e8f317a1d188da3be68b5` |

Unchanged runtime sentinel:
`apps/web/src/components/hero/HeroModelStage.tsx` =
`9f3321a5d84e4da9427cf93911f2208f9885a8267d094014eda7a695e1d7707a`.

## Declined to Judge

- General initial clock-setup hardening: existing risk stated above; outside the
  three-deletion Replay-boundary scope and not silently declared fixed.
- Real browser/20-hero/fallback/full-web/lint/build/new full CI/hosted success:
  parent-owned fresh verification; reviewer did not run or certify these.
- Old-head hosted results and synthetic phase fixtures: not accepted as fresh
  browser proof. Both identified old-head hero CI jobs failed; no verified receipt
  or merge/production readiness is conferred by this review.
- Material, geometry, financial behavior, and production approval: not reviewed
  or authorized. Runtime sentinel and bounded diff were checked only for scope.

## Verdict

**FINAL CLOSED: bounded independent review of the new Replay-boundary repair at
the three SHA-256 pins above only.** No blocking findings for that repair. The
change causally removes the extra absolute-time re-pause race without weakening
the existing browser proof. The protocol regression is demonstrated RED/GREEN
with negative controls, but browser/CI success and general setup-clock safety
remain explicitly unverified by this review. Any file-content change invalidates
the corresponding pin and requires fresh review.
