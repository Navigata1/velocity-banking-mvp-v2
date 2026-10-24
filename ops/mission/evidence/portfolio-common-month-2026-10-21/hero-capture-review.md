# Independent Hero Capture Review

Latest bounded handoff target: smoke-script SHA-256 `1D629EA05D5AA64EDFDB259B290C4D96D8F7F0FA95720F05168DC3E5730F14B5`, including both `verifyDeadlineControls` and `pauseAtVisibleHero`. Intermediate `4537D882...` is NOT the current target. Deadline P2 remains independently closed; the warm probe demonstrates ancestor-opacity blanking and the new boundary addresses that reproduced mechanism. SW `11701` is parent-owned and running, not the failed intermediate SW `81742`. Earlier reviews, failed runs and intermediate pins remain as history. See **Visible-Page Final Handoff** at the end. No full-gate or release approval.

## Scope And Declined Judgments

- Read-only sidecar against HEAD `789ae25cc3feaefba942d26e1c1fbde02b747aaf`, then the expressly disclosed working-tree change to `smoke-heroes.cjs`. Initial status was clean; subsequent status showed only that script modified. The original clean snapshot is not silently repinned as the changed script.
- No browser, server, GPU reproduction, application test command, build, workflow, push, publication, or other-thread message was performed here. The sole write is this report. A bounded in-memory mock of two source functions was run without a browser or server.
- Push CI `39612733144` remains FAILED. PR CI `39612743542` was initially reported running; latest parent evidence says all PR steps succeeded, with hero 6m22 and full CI 16m25. No remote status was queried here. Software gate `81742` is parent-owned and live; latest parent progress is 7/10 desktop domains at 4m30 including startup, not a completed gate.
- Exact failing rAF timestamps, GPU backend causation, full-turn smoothness/frame rate, all-phase containment, whole-release readiness, and the previous portfolio/math inventory are not adjudicated by these two images or this narrow review. No production or device certification.

## Current Recommendation: Keep runFor(1500)

Keep the actual patch's `runFor(1500)`. There is no demonstrated breach of the unchanged 20-minute workflow cap that justifies a cadence change now. Parent's reported progress does not establish that 60 Hz-cost sampling needs replacing. The following is an assessment of the requested hypothetical alternative, not a recommendation to edit the active gate or expand this review.

**A fixed 16 ms primer followed by exactly fifteen `fastForward(100)` calls is defensible for this two-snapshot visibility/movement contract, with explicit 10 Hz coverage limits.** It is not equivalent to a 60 Hz animation/smoothness test. The original test did not measure 60 Hz smoothness either.

- Install the clock before navigation; finish loading using bounded 16 ms ticks; finish poster-opacity waiting; run the 16 ms primer; then capture A while paused. Deliver exactly fifteen 100 ms jumps, awaiting each call, and capture B while still paused. Resume only after B. Never add ticks in response to pixels, failed assertions, or a missing movement result.
- Local Playwright `1.61.1` implementation fires due timers at most once per `fastForward`; a due rAF callback receives the jumped timestamp and schedules the next callback for a subsequent frame. Each of these fifteen calls therefore exercises the actual application's callback/render path, not an angle setter or a substituted image. This depends on an active, loaded, non-reduced, visible stage.
- In the unchanged app, consecutive 100 ms callback timestamps advance `elapsed` by `min(delta, 0.1)`. The primer seeds the truthy `previous` timestamp. With the installed clock's 16 ms frame alignment and existing loader, A is approximately 0..16 ms into the turn and B approximately 1.500..1.516 s. These are source-derived bounds, not observed phase telemetry. Without the primer, the first jump can merely initialize `previous`, leaving about 1.4 s of movement instead.
- Do not replace the fifteen calls with one 1500 ms `fastForward`: that can deliver only one callback and at most 0.1 s of advancement. Conversely, `runFor(1500)` delivers the intervening frames; its one call is not one large-delta frame.
- A fresh context must contain this clock. Do not install it in the Money Loop Three timing suite or the separate reduced-motion context. Keep the workflow's 20-minute cap and all existing per-operation limits. Reduced GPU work is not a basis to increase any deadline.
- Preserve a real-clock loading/selection-control lane and clearly label the controlled snapshots as clock-driven phase evidence. Do not rename them a real-time 1.5-second performance measurement or an eight-second end-to-end turn proof. At 8 animation seconds the model returns to its initial orientation, so start/end alone cannot prove movement.

## Validated Findings

### Initial P2: Late Success Bypasses Both New Polling Deadlines (Now Closed)

In [smoke-heroes.cjs:39](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/smoke-heroes.cjs:39>), `loadControlledStage` checks `Date.now() < deadline` only when readiness is false. A final `runFor(16)` or visibility query can cross the deadline, then return true and leave the loop without a final time check. [captureStage:47](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/smoke-heroes.cjs:47>) has the same problem when an opacity evaluation first returns zero after its deadline.

Independent bounded reproduction used the exact two unmodified function declarations, selected using the TypeScript AST and evaluated in a VM with mocked page operations and a Node-side clock. No GPU or real wait was involved. Exit `0`; observations:

```text
loadControlledStage accepted ready=true at wall 120010ms, deadline 120000ms
captureStage accepted opacity=0 first observed at wall 120010ms and proceeded to capture
```

For loading, the mock's first visibility result was false at 119999 ms; `runFor(16)` completed at 120010 ms and the next visibility result was true. For opacity, its first evaluation returned zero at 120010 ms. Both returned success. This is a test-boundary bug, not evidence of a currently slow production load or the original CI failure's cause. Require the wall deadline after awaited readiness/opacity observations as well as before waits. A claimed hard cap also needs remaining-time bounding of in-flight operations; a loop guard alone cannot interrupt a stuck awaited call. Keep timeout failures candid; do not recover by replaying the asset or changing the capture phase.

### P2 In The Failed HEAD: Uncontrolled Phase Can Misclassify A Valid Thin View

The supplied failure stack is `visibleBounds` line 20, called at `run` line `88:52`, the second-image `visibleBounds(lastImage)` call in the original script. Both screenshots had already been saved. Independently viewed PNG A shows a broad intact card and coin; PNG B shows a thin, nearly edge-on card and coin, contained within the frame, not an empty image.

Original captures were taken after readiness/poster-opacity waits, followed by a 1500 ms wall wait and another capture. No animation-phase synchronization exists in that version. The app accumulates capped rAF deltas, not raw wall time: [HeroModelStage.tsx:57](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/components/hero/HeroModelStage.tsx:57>). Screenshot latency, poster fade, callback cadence, and the 0.1 s cap make these wall-time endpoints arbitrary animation phases. [turntable.ts:11](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/components/hero/turntable.ts:11>) makes one finite smoothstep revolution in eight accumulated animation seconds.

The demonstrated defect is applying a broad-view occupancy expectation to an uncontrolled thin view. Keep the literal 2% check; control when it is sampled. Do not exempt credit cards, reduce the floor, add geometry, or discard a failed image. The PNGs plus source establish the sampling hazard, not the exact phase or a driver-specific failure. No runtime P1/P2 defect is established by this evidence.

## Assessment Of The Initial Disclosed Patch

- The current `runFor(1500)` patch changes only the hero smoke script. The loading loop stops on `data-ready=true` and visibility; the opacity loop stops on computed opacity. Neither reads screenshot quality to choose its stopping point. There are exactly two quality captures, one fixed phase advance, no exception-swallowing or recapture loop, and the same assertions. This is not retry-until-pass.
- Pausing before opt-in prevents an already-running turn from racing the pause. Loading ticks permit actual load timers to run, rather than assuming a fully paused app can load. While paused, wall-time poster polling and screenshot latency do not freely advance the hero's rAF animation. The parent probe supports that approach, subject to the late-success finding above.
- `pauseAt(await page.evaluate(() => Date.now()+100))` introduces a separate dispatch-race risk: if virtual time advances past that absolute target before `pauseAt` executes, the installed controller rejects a jump to the past. Source confirms that rejection path. It has not been reproduced in the actual browser here, so it is an explicit risk, not an additional validated P2. Do not fix it by retrying capture until it passes; establish a deterministic pause boundary in the parent probe.
- The synthetic controls reject blank, 1%-occupancy, and edge-touching inputs and accept an interior rectangle. They exercise the real `visibleBounds` function, but are RGB-array unit controls, not DOM/render mutations; their allocated alpha bytes remain zero. Do not describe them as actual visible-browser counterexamples. The real-frame/self motion control tests comparator rejection of identical descriptors, not end-to-end rejection of a disabled scheduler.
- Original 2% occupancy and edge margins, domain first-frame `colorCount > 12`, spatial descriptor limits, page overflow `<=1`, slow-network poster continuity, selected-mode behavior, domain selection, and reduced-motion stillness remain in the diff. Existing coverage limits also remain: color count is asserted for the first domain frame only; the Vault branch has no separate `>12` assertion. No claim that those were already two-frame/all-asset color assertions.
- Runtime/asset geometry, original Inspect/Studio/Replay controls, finite eight-second model, delta cap, and the independent Three `700` ms settle / `300` ms confirmation budgets are unchanged. No clock fix should modify those contracts to obtain a pass.

## Acceptance And Negative Controls For Parent Verification

1. Keep the failed HEAD log/PNGs and its FAILED CI status. Store new evidence separately; controlled-clock success cannot retrospectively convert that wall-time run to green.
2. Complete the parent-owned software gate and both normal widths/all domains plus Vault. Require both chosen captures to pass the unchanged 2% and edge containment predicates, existing color and material-spatial assertions, and existing errors/overflow checks. Do not alter cadence per asset in response to its image.
3. For a fifteen-jump variant, record the fixed primer and fifteen awaited jump deliveries, selected hero/current canvas identity, document visibility, and no extra ticks during captures. Confirm a valid current-stage rendered result after the scheduled callbacks. A stopped turn or missing callback must fail, not cause another tick series or a replay. A wall deadline must still fail even if readiness becomes true just after it.
4. Retain the actual failed thin PNG as a visibility-negative input: the same predicate should still reject its low occupancy. Retain blank, undersized, and clipped negatives, plus an interior positive. A clock change must not neutralize those failures or replace real GLB pixels with fixtures.
5. A constant-angle/frozen-animation mutation should fail the real A/B motion assertion, not merely pass the descriptor/self unit control. Missing GLB, stale canvas, hidden stage, and poster still covering the canvas must not become normal-path successes. Keep existing network/decode fallback checks and original controls; don't force opacity or pose from the harness.
6. Reduced-motion stays a separate, free-running context: no artwork transition and unchanged still-frame fingerprints over its real wait. It must not pass merely because the normal-motion test clock was paused.
7. Keep `test-three-stage.cjs` and its timing helpers untouched and unclocked: 700 ms candidate settlement, 300 ms stability confirmation, real decoded changed pixels and containment. Keep the 20-minute workflow cap. Completion of this sidecar is not completion of those gates.

## Evidence And Pins

SHA-256 below is for bytes actually read, not remote artifact authenticity. Final reconciliation exited 0: all 11 reviewed source pins matched, including the disclosed working smoke version. HEAD remained `789ae25cc3feaefba942d26e1c1fbde02b747aaf`; status showed only the smoke script modified, and the scoped diff was 37 insertions / 5 deletions in that script. Runtime, geometry, pixel helpers, Three limits and timing helpers were unchanged. This is not a 239-file portfolio inventory verification.

| Input | SHA-256 |
| --- | --- |
| Original HEAD smoke script | `307EE07B810EE242F970729839CBAB22F622A95A7DA355954EBA682EA586776F` |
| Reviewed working smoke script, `runFor(1500)` version | `A1552EC29EC5693BE3285CD4161DDE70E27F910CE9A7C89048BF32CD8E397219` |
| HeroModelStage.tsx | `B613999F1B117B52D3D92A9361B5B39B41AF52352D7CE6ED5FE03BB203FE8DAA` |
| turntable.ts | `EA4CA3AFA595B848A7735AD96082478FE195173271BAA99951D5574C20A2954A` |
| AssetHero.tsx | `E8CCA04AF1E34E358A9A0D2365380FC9DC57236B3249A60086494232CD9F121E` |
| png-pixel-proof.cjs | `E0FFD1C18CBF8E93CB62EE23F89CFF915AEC0CE0E7231F75691DEE17F39F8D60` |
| hero-contract-tests.cjs | `364CD5F7ACDDE18EE9B716B5E323FDE532526E46DE3139041A6A512EDED47D1C` |
| browser-harness.cjs | `CA4832F7702C73D17AD07A8EE864EA7E009A217B18F3F9912D8A37D8F7082D80` |
| test-three-stage.cjs | `F5BB82A7CA80E8088FF7D6FF422BAE8826CCDCF39ECDB9862E75375C12EFEF15` |
| three-stage-timing.cjs | `2000DD8F29C728D54CE76E004064AFADD4B5F63346F9B27F58971EDF394D3329` |
| hero-fallback-smoke.cjs | `48510A3448BCCC618D07B386F464411115C8B9213B96201DD346F1C4020F6716` |
| hero-resource-tests.cjs | `EA6A1AB17B9B67F9011BE20F4C0C352CBF78EE65CD9FC3AC1D548B650C457F69` |
| failed-789ae25-push.log | `13D1932477AF6D60F5F2C8342947A0DD2AA10E645FED297671109DD03C441980` |
| failed 1440-creditCard-3d-start.png | `931D595C40379B198CFC24FD62B0E286EFEA5F10D38EE8B73C57EE613BC092DD` |
| failed 1440-creditCard-3d.png | `D713086331715E64275C19B48C3AA06CABA8A712CD435045C57C102ACB91CB18` |
| hero-clock-probe-ticks.log | `A3471E64824A1D48754B3A9AC917D75B241A6E0ED2D5C89B8465D79FBCDCB839` |
| probe rest.png | `A8607E5E2966282563BC378524AB380A82725947F8DED0346CE25BD201D62261` |
| probe 1500.png | `D4C0A6FB03EEC166F89B58D2D3A3D48F09D5B82BD35F1F691677281FECA4334E` |
| probe 3000.png | `02B0AF153260A6D26DE3F86D7F96591760FFFD515A414FD6690B8C4568F01E1A` |

Parent's terminal probe log reports 725x420 frames: rest 36083 foreground pixels (11.8499%), 1500 ms 41702 (13.6952%), 3000 ms 10857 (3.5655%). These figures were read from its log, not independently recomputed or a substitute for the full gate. Probe exit 0 was parent-reported; the log itself contains no exit marker. The initial live software-gate log read showed visibility controls and slow-network controls passing, not a terminal result.

Read-only command ledger: `Get-Content` source/evidence reads and bounded ranges, relevant `rg` queries, `Get-FileHash -Algorithm SHA256`, `git rev-parse HEAD`, `git --no-optional-locks status --short`, and scoped `git diff HEAD` all exited 0 except two path-discovery queries: an absent root-level Playwright types path (exit 1, app-local types were read successfully) and an absent unbundled `lib/server/screenshotter.js` (exit 1). Installed Playwright types and bundled controller source were read, not launched. The AST/VM deadline mock exited 0 with the two observations above. The original failure log records application exit 1; no failed or running application process was restarted here.

## Initial Verdict (Superseded For Deadline Finding)

Keep `runFor(1500)` and the 20-minute workflow cap. The phase-control direction is honest and narrow, but the disclosed patch still has one current independently reproduced P2: late-success deadline bypass in both polling helpers. The failed HEAD's sampling issue remains recorded separately, not converted to a historical green. The fifteen-jump alternative is conditional analysis only, not a requested optimization or a claim of 60 Hz quality. Parent owns fixes, the running GPU gate, and subsequent CI decisions. No release approval.

## Deadline Followup

### Scope And Explicit Non-Judgments

This followup covers the deadline wrapper, opaque unit fixtures, and pre-assert Vault PNG writes only. No browser, GPU, server, full gate, CI operation, or product edit was performed. Only this assigned Markdown file was updated. The failed push remains failed; the initial failed freeze and open-P2 evidence above are retained, not silently replaced.

Software gate `81742` is now parent-reported terminal exit 1. Its pinned log independently shows all nine 1440px domain passes followed by `insufficient visible geometry` at the first Vault bounds check, `run:139:16` in that earlier script. The old Vault path did not save these two canvas PNGs. There is no failure image here from which to determine the root cause. Direct probe `57850` is parent-reported exit 0; its separate 592x300 log reports rest 14.714%, 1500 ms 12.321%, and 3000 ms 13.023%. That different successful lane does not explain or clear the failed full-run lane. Navigation, on-screen state, frame readiness, and GPU explanations remain unadjudicated. No new speculation or repro was added here.

The reported Boyle/helper 146 and projection 3 results were not rerun or independently certified in this deadline review. No full 293-file inventory, portfolio/math re-review, smoothness certification, or release decision is claimed.

### Independent Verification

- Ran `node .superpowers/sdd/2026-10-21-common-month/hero-deadline-contract.cjs --inflight`: exit 0, **5 passed / 0 failed**. The ignored contract extracts the current `beforeDeadline`, `loadControlledStage`, and `captureStage` declarations through TypeScript AST, not replacement implementations. Its pending-query check uses a 25 ms VM-only timeout; the real script's `stageTimeout` remains 120000.
- Read the genuine parent RED log: **2 failed / 2 positive passed**, with both late successes incorrectly accepted. Its corresponding GREEN log records 5/5. The RED log was not overwritten or reinterpreted as a current failure; the original independent late-success reproduction above remains the earlier independent evidence.
- Independently extracted five current functions into an in-memory AST/VM check. Exit 0, **7 checks passed / 0 failed**: expired entry does not dispatch; success exactly at the deadline rejects; an in-budget original rejection is preserved; a pending 16 ms loading tick rejects on the Node deadline; a pending opacity query rejects before screenshot; a normal 25 ms fade completes with one screenshot and unchanged clip/120000 timeout; and the actual visibility-control function passes its existing blank/undersized/clipped/interior checks. No file, GPU, or server was created by these checks.
- `beforeDeadline` now checks positive remaining wall time before dispatch, races each awaited operation against a Node timer, checks wall time again after resolution, and clears the deadline timer in `finally`. Both readiness observations/loading ticks and opacity observations/fade waits use the same per-phase deadline. Late true/zero results cannot leave the loop successfully. This closes the reported P2, including pending asynchronous operations, rather than just adding a final loop assertion.

### Bounded Patch Risk

No new validated P1/P2 was found in this followup. Error propagation remains fail-closed: timeout rejection leaves the capture path and reaches the existing browser/server cleanup; there is no replay, recapture, result-dependent phase selection, swallowed error, or changed visibility/motion threshold. A promise race does not itself cancel an underlying browser RPC, and Node timers cannot preempt synchronous event-loop blockage; this is not a hard real-time/process-termination guarantee. Those limitations do not restore the reproduced late-success bug.

The fixture alpha bytes are now explicitly 255, addressing the earlier transparent-array caveat. They remain unit counterexamples, not actual browser controls. The Vault start/end bytes are written before decoding/bounds assertions, so a later failed assertion retains diagnostic inputs. Writing these files while the page clock is paused does not intentionally advance turn time or alter the subsequent predicate; it adds diagnostic I/O, not a guard waiver. The original dimensions/screenshot timeout, `runFor(1500)` cadence, two-image bounds/spatial checks, existing color checks, reduced-motion context, and Three 700/300 limits remain unchanged. The 20-minute workflow cap is not increased.

### Followup Pins And Commands

HEAD remained `789ae25cc3feaefba942d26e1c1fbde02b747aaf`; tracked status showed only `apps/web/scripts/smoke-heroes.cjs` modified. Scoped diff versus HEAD: 54 insertions / 7 deletions. All 11 reviewed source hashes matched expected followup values, exit 0: the new smoke hash below plus the same ten non-smoke source pins listed above. This agrees with the disclosed tracked boundary; it is not a rebuilt 293-file manifest.

| Followup Input | SHA-256 |
| --- | --- |
| Current smoke script, deadline/opaque-fixture/Vault-diagnostics version | `4537D8827BC4DEAB6F74B8A9A1CE19393123BFD3A120D9DA8AA50E6DF326077C` |
| hero-deadline-contract.cjs | `6D8601A3C49DBB56C3DDFDA90561A86784ACC8BB39E26AF1E05D86E7A6966A70` |
| hero-deadline-red.log | `69334AE90EF1D11A57D919335509E57C980D73A4A3A5985D5010CADA97017FBB` |
| hero-deadline-green.log | `7FF54EC0B01DB200B6B2B8C1CBB42ED83D8C0E6619D764114DDD0B83AAD1518E` |
| Terminal heroes-clock-software.log | `2527561D5868C86D59CE29870EB26C3A22954BD74FC86957DAAFB2EEDFF8424B` |
| hero-clock-vault-probe.log | `F847497770B03F219B658946695D711BD2B7EF3D82E7DCE6D3E3C6B72C1D0AD0` |

Followup commands were bounded `git diff HEAD -- apps/web/scripts/smoke-heroes.cjs`, `git diff --stat`, `git --no-optional-locks status --short`, `git rev-parse HEAD`, targeted file discovery/reads/`rg`, SHA-256 reads/comparison, the five-case contract, and the seven-check in-memory VM script. All exited 0. Exit codes of the parent GPU runs are parent reports; their supplied logs contain the observed pass/failure data but no terminal exit marker. No parent log or canonical test-result directory was written here.

### Intermediate Deadline Verdict

**Deadline P2 CLOSED**, independently verified against the current exact source. No new validated P1/P2 in this bounded followup. Keep `runFor(1500)`, unchanged guards and timing limits. Full software hero validation is **FAILED at Vault, cause unknown**; the successful focused probe is not a substitute. Parent retains investigation and subsequent gate ownership. No full-hero or release approval.

## Visible-Page Final Handoff

### Scope And Declined Judgments

This final bounded review covers the exact frozen smoke script, including both new functions, and reconciles the 11 unchanged protected files. No GPU, browser, server, full gate, application command, remote query, push, or product edit was performed. Only this assigned Markdown file was written. Existing failed-head and intermediate-failure evidence is retained.

**Run identities:** original push `39612733144` failed; intermediate software run `81742` failed after nine desktop domains at Vault; current software run `11701` is parent-reported **running**. Its permanent controls reportedly passed at startup. These are different runs. No terminal result for `11701`, new hardware/strict-3D results, or new CI outcome is claimed here. The before/after probe below demonstrates a real failure mechanism, but cannot recreate the missing PNG of the intermediate full-run failure. Full validation remains parent-owned.

### Evidence Assessment

Independently read the warm probe source, log and verification JSON and viewed both PNGs. The before image is uniformly blank; its recorded 592x300 clip has zero foreground and a real ancestor at computed opacity 0 despite the geometry-ready/poster-opacity checks. The after image shows an intact Vault; the same clip records 26132 foreground pixels (14.71396%) and all recorded ancestor opacities 1. Pixel counts were read from the supplied verification, not independently recomputed.

[PageTransition.tsx:9](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/components/PageTransition.tsx:9>) actually starts at opacity 0 / y 10 and animates to opacity 1 / y 0 in 0.3 seconds. The inspected probe deliberately pauses before Vault navigation, then resumes the clock, waits for page opacity, and reopens the same asset at rest. It does not change geometry or set DOM opacity/pose to manufacture visibility. This is strong controlled evidence that freezing entrance animation can blank a genuinely ready model; it is not evidence of a Vault-model/math defect. The probe is a causal reproducer, not an exact recapture of the old full-run lane.

### Exact-Source Verification

- Independently reran `node .superpowers/sdd/2026-10-21-common-month/hero-deadline-contract.cjs --inflight`: **5/5, exit 0** against the current source. The late-result and pending-operation closure remains intact; intermediate pin `4537D882...` was not substituted for the source under test.
- Extracted the current `beforeDeadline`, `verifyDeadlineControls`, and `pauseAtVisibleHero` declarations with TypeScript AST into an in-memory VM. **12 checks passed, exit 0**: correct resume/wait/timestamp/pause order; rejection of own transparent opacity, transparent ancestor, partial ancestor opacity, ancestor opacity 0.99999, hidden ancestor, display-none ancestor, and absent hero; visibility-timeout propagation without pause/retry; pause-failure propagation without retry; actual permanent deadline controls; and the same helper at the domain-loop and Vault call sites.
- Executed the actual permanent `verifyDeadlineControls` in that VM, with real Node timers. It rejected expired entry without starting the action, a 15 ms result under the configured 5 ms budget, and a pending action rather than its 200 ms watchdog; the immediate positive succeeded. Instrumented timer registration confirmed both short deadline timers were armed in this execution. This is not a hard real-time claim that Node scheduling always rejects within exactly five elapsed milliseconds. The earlier exact-source VM cases separately exercise the post-resolution deadline assertion.

### Patch Judgment And Residual Risks

[pauseAtVisibleHero:67](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/smoke-heroes.cjs:67>) resumes the page clock before waiting, checks the actual hero and every parent for computed opacity exactly 1 and the specified display/visibility exclusions, then pauses before model opt-in. That allows the real entrance animation to finish. Both domain-loop and Vault use this one helper. No per-asset phase choice, style/pose setter, image-driven wait, recapture, or exception suppression was introduced. The existing keyed dashboard hero and fresh Vault route also support the intended pre-opt-in boundary.

[verifyDeadlineControls:52](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/smoke-heroes.cjs:52>) is awaited before server/browser startup. Its watchdog is cleared and failures propagate; it does not convert failed readiness into a pass or extend the production 120000 ms stage/screenshot limits. Original `runFor(1500)`, 2% occupancy, existing color/spatial/containment assertions, reduced-motion lane, opaque unit fixtures, Vault PNG-before-assert diagnostics, Three 700/300 limits, and the unchanged workflow cap are retained.

No new validated P1/P2 was found. The ancestor check is a narrow page-visibility boundary, not proof of complete absence of clipping/occlusion or all-phase geometry visibility; real pixel assertions remain necessary. The previously recorded absolute `Date.now()+100` pause-dispatch race remains an unobserved, fail-closed risk, not a newly validated finding. Node timers cannot preempt synchronous event-loop blockage, and promise racing does not itself cancel the browser RPC. The actual full software/hardware/browser outcomes are still outside this VM review.

### Final Pin Reconciliation

**Exact current target, before and after the source/VM review:** `1D629EA05D5AA64EDFDB259B290C4D96D8F7F0FA95720F05168DC3E5730F14B5`. This is the script containing both new functions. It is distinct from both earlier working hashes `A1552EC2...` and `4537D882...`; neither is relabeled as final.

HEAD remains `789ae25cc3feaefba942d26e1c1fbde02b747aaf`. Tracked status shows only `apps/web/scripts/smoke-heroes.cjs` modified; its diff versus HEAD is 83 insertions / 7 deletions. The protected-file diff is empty. SHA-256 comparison passed **12/12**: the exact current target plus all **11 protected files**. Ten retain the complete hashes recorded in the original pin table: `HeroModelStage.tsx`, `turntable.ts`, `AssetHero.tsx`, `png-pixel-proof.cjs`, `hero-contract-tests.cjs`, `browser-harness.cjs`, `test-three-stage.cjs`, `three-stage-timing.cjs`, `hero-fallback-smoke.cjs`, and `hero-resource-tests.cjs`. The eleventh protected source is `PageTransition.tsx`, pinned below. This is a bounded protected-set reconciliation, not a rebuilt 293-file manifest or a new math review.

| Additional Final Input | SHA-256 |
| --- | --- |
| PageTransition.tsx, unchanged | `C316B29A90F2F6473D3806B06BD1FA41CFB606E013BA72F240C0A82D121C2B0C` |
| hero-vault-opacity-probe.cjs, read only, not run | `23E74998A5B48FEFD006589191DA36D3C8CABF8AFD34C7AF8F30FA901BBDB5D1` |
| hero-vault-opacity-warm.log | `C20CA95E32831D62570F8B1550C5048679289EFB5085EC7495E72882679564C5` |
| warm verification.json | `99FA9C7C46ECA96FD66256FD8B79BC1F6A9F4EE9C55EA519CE9A1D4897DDAF37` |
| warm before-page-settle.png | `045951ACE1C78C20556026DF6D859EBF532E992F7A946894C324456EC76C1C0B` |
| warm after-page-settle.png | `EDD91279DCCB979DA84AA525FCD0AA17398B7F7391E51DCD5F6671699FF0900D` |

Final bounded commands: targeted source/probe reads and `rg` (including the two existing `AssetHero` call sites), `Get-FileHash`, `git diff HEAD`, `git diff --stat`, `git --no-optional-locks status --short`, `git rev-parse HEAD`, the five-case contract, and the 12-check exact-source VM script. All exited 0. The two supplied PNGs were viewed successfully. No GPU run, parent log or canonical results directory was created or modified.

### Final Bounded Verdict

**Current source reviewed at `1D629EA0...`; deadline P2 remains CLOSED; no new validated P1/P2 in this final bounded review.** The visible-page-before-pause fix addresses the reproduced ancestor-opacity mechanism without changing runtime 3D phase or guards. SW `11701` remains running and parent-owned; failed intermediate SW `81742` is not relabeled. Parent owns full software/hardware, strict Three and both new CI gates. No full-gate, push, or release approval.
