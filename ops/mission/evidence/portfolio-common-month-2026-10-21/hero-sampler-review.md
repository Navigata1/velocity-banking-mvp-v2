# Independent Hero Sampler Review

## Scope And Declined Judgments

Review target: working smoke-script SHA-256 `6231DB4E77516C3C811BDEFEE7D567265A80DEE3406EA05A1F7888AC74CD7FE9` against local HEAD `d6f6f5010237ff1843bb73a33360445b7d094687`. This is the actual three-function sampler patch, not just a hypothetical cadence proposal. The archived old script is independently verified as exact `1D629EA05D5AA64EDFDB259B290C4D96D8F7F0FA95720F05168DC3E5730F14B5`.

- No browser, GPU, server, heavy/full gate, remote command, push, publication, or other-thread message was performed. Only this assigned Markdown file was written. Tests below are bounded exact-source AST/VM checks, with a stub render counter rather than WebGL.
- Actual GPU pixel equivalence, complete SW/HW results, new CI completion within 20 minutes, real-time FPS/smoothness, physical devices, and release readiness remain parent-owned. Mathematical endpoint bounds are not rendered-pixel or performance certification.
- Do not relabel the cancelled PR as successful. Saved push metadata says run `39621111192` completed successfully; saved PR metadata says `39621121164` was cancelled. Both CI lanes are not green. No receipt/Desktop publication is approved by this review.

## Findings And Verdict

**No new validated P1/P2 in the reviewed sampler patch.** The now-observed job-cap cancellation justifies reducing the test's intermediate render workload. The patch retains the two-pose visibility/movement contract and strengthens the previously unbounded phase advance with one shared wall deadline. This conclusion applies only to the exact target hash above and protected sources below; any later executable edit needs reconciliation.

This is bounded source/semantics approval of the sampling change, not approval of GPU equivalence, complete gate timing, push, or release.

## Concrete Cost Evidence

Independently read the saved raw PR log, metadata and annotations under `release/failed-d6f6f50`. The annotation literally says: `The job has exceeded the maximum execution time of 20m0s`.

The hero step started `15:02:04` and was cancelled `15:15:37` on 2026-10-21, about 13m33s into that step. Its log records ten desktop cases and five mobile cases passing, then `The operation was canceled.` No hero assertion failure is recorded before cancellation. The SQL job succeeded; later web/mobile-job gates were skipped. These fifteen case passes are partial progress, not completion of the hero suite or the PR workflow.

This is real critical-path cost evidence, unlike the earlier speculative optimization discussion. It does not isolate GPU time from loading, screenshot, shader compilation, runner contention, or transport overhead. Fewer render callbacks are a justified intervention; a particular wall-time speedup or future sub-20-minute job is still unproven here.

## Actual Patch Review

- [primeMotionFrame:67](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/smoke-heroes.cjs:67>) awaits exactly one bounded `runFor(16)` before capture A. It seeds the runtime's `previous` timestamp through the real rAF callback path; it does not set rotation, elapsed time, DOM visibility, or pixels.
- [advanceMotionSample:70](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/smoke-heroes.cjs:70>) creates one `Date.now()+120000` deadline outside its loop and awaits exactly fifteen `fastForward(100)` calls. Each call uses the same `beforeDeadline`, including its post-resolution check. This bounds each pending operation by the remaining time and the entire fifteen-call group by that one phase budget. It is not fifteen fresh 120-second budgets.
- The primer has its own original 120-second phase budget. Capture/readiness budgets remain separate as before; there is no new claim of a 120-second aggregate budget for all loading, captures and sampling together. Node timers cannot preempt synchronous event-loop blockage, and promise racing does not cancel an underlying browser RPC. Rejections propagate to existing cleanup, not a retry.
- The domain loop and Vault both perform ready -> primer -> A -> fixed advance -> B. No per-asset schedule, angle setter, pixel-dependent stopping condition, alternative phase, or recovery capture was added. The separate reduced-motion context is unchanged and does not call these motion samplers.
- [verifyCadenceControls:77](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/smoke-heroes.cjs:77>) runs before server/browser startup. It checks the exact primer/fifteen-step sequence and injects failure at step seven, asserting no eighth dispatch or retry. The actual function was independently executed in a VM.
- AST comparison against the archived old script found all pre-existing non-`run` function declarations unchanged. After structurally removing only the new primer/control calls and restoring the two sampler calls to the old `runFor(1500)`, the printed `run` AST was identical. Thus the existing assertions, contexts, error handling, captures and guard logic were not weakened by this patch.

The literal 2% foreground floor, edge margins, existing `>12` color check, spatial-change predicate, page-overflow/error checks, visible-page pause boundary, saved Vault PNG diagnostics, reduced-motion stillness, and independent Three 700/300 limits are preserved. Coverage remains exactly what the old code asserted: the color floor applies to the first domain frame, not both images or a separate Vault color check. No such broader historical claim is made here.

## Installed-Clock Derivation

Used actual installed Playwright `1.61.1` injected clock/controller source from `coreBundle.js`, actual `HeroModelStage` `animate` arrow selected by TypeScript AST, and actual transpiled `heroAngleAt`. The renderer was replaced only with a counter in the VM. No application or test source was edited.

The installed `runFor` delivers intervening scheduled timers/rAF callbacks at its frame cadence. `fastForward` coalesces due timers to the target and fires each due rAF chain once; a callback scheduled during that callback is subsequently due after the current target. Therefore fifteen awaited jumps are fifteen actual callbacks in the active hero chain, not one 1500 ms callback and not fifteen direct pose assignments.

The unchanged animation accumulates `min((now-previous)/1000, 0.1)` when visible and already seeded, renders `heroAngleAt(elapsed)`, and schedules its next frame while below eight accumulated seconds and not reduced-motion. After priming, each 100 ms jump therefore contributes 0.1 animation seconds. Fifteen contribute nominally 1.5 seconds after A, subject only to ordinary floating-point accumulation. One `fastForward(1500)` instead contributes only 0.1 seconds after a seed and is not an equivalent replacement.

Enumerated all sixteen integer frame offsets and both supported loader states: the first rAF is pending, or has already seeded `previous` during the final 16 ms loading tick. This gives 32 cases per comparison. Positive initial virtual timestamps were used, matching the actual first scheduled frame rather than inventing a truthy timestamp of zero.

| Schedule | A Animation Seconds | B Animation Seconds | Callbacks After A |
| --- | --- | --- | --- |
| Archived unprimed D6 `runFor(1500)` | 0 | 1.472..1.504 | 93 or 94 |
| Reference with the same 16 ms primer, then `runFor(1500)` | 0..0.016 | 1.488..1.520 | 93 or 94 |
| Actual new primer, then 15 x `fastForward(100)` | 0..0.016 | 1.500..1.516 | exactly 15 |

The new sample uses sixteen callbacks including its primer. Paired with the equally primed reference at the same alignment/loader state, B differs by **-4 to +12 ms**, and the maximum absolute `heroAngleAt` difference was **0.0086589158 radians / 0.49611933 degrees**. Compared with the archived unprimed endpoint, the maximum was **0.0201217580 radians / 1.15289181 degrees**. These bounds are conditional on the unchanged single active hero rAF chain, visible document and the inspected loader behavior, not arbitrary future animation implementations.

Thus nominal 1500 ms is honest, but bit-identical endpoints are not. The parent's planned equally primed reference comparison is appropriate; both branches still need their unchanged pixel guards to pass. Pixel identity must not be assumed from phase bounds. The second comparison used a microtask host-yield shim only to accelerate the controller's internal VM yields; virtual timer ordering and the installed scheduling/animation logic were retained. It is not a browser wall-time benchmark.

## Controls And Residual Coverage

Independently executed the current ignored sampler contract: **5 passed, exit 0**. It verifies exact fixed sequence, seventh-dispatch failure with no retry, shared aggregate deadline, pending sample rejection and pending primer rejection. The existing deadline contract with `--inflight` also independently passed **5/5, exit 0**.

Additional exact-source/controller checks passed:

- Two 32-case enumerations: archived/unprimed versus sampled, and equally primed reference versus actual current sampler. The latter executes the real new helper functions, not a replacement sampler.
- A single `fastForward(1500)` after priming advances only 0.1 seconds; a hidden document gains no animation time. These are negative semantic controls, not GPU-pixel tests.
- The actual permanent cadence control passes. A final sample resolving exactly at total wall time 120000 ms rejects with fifteen calls and no extra dispatch; a successful first sample resolving after the deadline rejects and prevents further dispatch.
- Existing source bodies and normalized `run` AST match as described above. The sampler RED log was also read: its five failures on old D6 were missing-function/interface failures, not a GPU timing or mathematical-equivalence RED. The separate CI job-cap evidence supplies the concrete cost regression.

The optimization intentionally removes incidental roughly-90-frame execution coverage and substitutes a fixed 10 Hz virtual-clock cadence. It does not test smoothness, FPS, every intermediate angle, frame-count-specific defects, or performance of the application's normal turn. `fastForward` coalesces all due page timers, not only the hero's rAF; loading/page entrance must remain settled before the sampled interval. The existing visible-page boundary and readiness/opacity waits are retained. No runtime/video change is implied.

The existing pixel negatives, constant-frame motion rejection, ancestor-opacity checks, readiness deadlines and downstream error assertions must continue to fail honestly. The prior `Date.now()+100` absolute pause-dispatch race remains an unobserved fail-closed residual risk, not a new validated finding or a reason to retry. Parent owns actual GPU comparison, all normal/SW cases, strict Three and both fresh complete CI lanes within the unchanged 20-minute cap.

## Source Pins

Current script was observed at `6231DB4E...` before and after the executed patch checks. HEAD was initially clean at D6, then tracked status showed only the disclosed smoke-script edit: **27 insertions / 2 deletions**. The current target plus all eleven protected sources matched expected SHA-256 values, **12/12**. No full 293-file inventory or new financial-math review is claimed.

| Input | SHA-256 |
| --- | --- |
| Current smoke-heroes.cjs | `6231DB4E77516C3C811BDEFEE7D567265A80DEE3406EA05A1F7888AC74CD7FE9` |
| Archived D6 smoke-heroes-1d629ea0.cjs | `1D629EA05D5AA64EDFDB259B290C4D96D8F7F0FA95720F05168DC3E5730F14B5` |
| HeroModelStage.tsx | `B613999F1B117B52D3D92A9361B5B39B41AF52352D7CE6ED5FE03BB203FE8DAA` |
| turntable.ts | `EA4CA3AFA595B848A7735AD96082478FE195173271BAA99951D5574C20A2954A` |
| AssetHero.tsx | `E8CCA04AF1E34E358A9A0D2365380FC9DC57236B3249A60086494232CD9F121E` |
| PageTransition.tsx | `C316B29A90F2F6473D3806B06BD1FA41CFB606E013BA72F240C0A82D121C2B0C` |
| png-pixel-proof.cjs | `E0FFD1C18CBF8E93CB62EE23F89CFF915AEC0CE0E7231F75691DEE17F39F8D60` |
| hero-contract-tests.cjs | `364CD5F7ACDDE18EE9B716B5E323FDE532526E46DE3139041A6A512EDED47D1C` |
| browser-harness.cjs | `CA4832F7702C73D17AD07A8EE864EA7E009A217B18F3F9912D8A37D8F7082D80` |
| test-three-stage.cjs | `F5BB82A7CA80E8088FF7D6FF422BAE8826CCDCF39ECDB9862E75375C12EFEF15` |
| three-stage-timing.cjs | `2000DD8F29C728D54CE76E004064AFADD4B5F63346F9B27F58971EDF394D3329` |
| hero-fallback-smoke.cjs | `48510A3448BCCC618D07B386F464411115C8B9213B96201DD346F1C4020F6716` |
| hero-resource-tests.cjs | `EA6A1AB17B9B67F9011BE20F4C0C352CBF78EE65CD9FC3AC1D548B650C457F69` |
| Installed coreBundle.js | `6BE5C2EA035554E9B184B1DBC7AA5E7F1FB428DD1B5C202022858DCFAE9BEE27` |
| Installed playwright-core/package.json | `759E376F995BF39EDD4810D699B99469BAB1D7428B6FBC78D41912F367DF7BA9` |

| Evidence | SHA-256 |
| --- | --- |
| pr-ci-cancelled.json | `3DF6881A1272222163C87FE4CEEB25840410EAFEC5D62DC654D3BA4E711BC675` |
| pr-ci-cancelled.log | `DE5CF73D0FBD12E7029A4104B5A3649092A6BFD28C8EA3B2E5B3D8D31E3D4872` |
| pr-annotations.json | `659FBAF58BFAC4DA13093921F6B0AF8D306153FADEFEA460DFB5C6C81BDE7E49` |
| push-ci-success.json | `5AAB12AB440A9462C6E76853FA44EBDCB2EE1AFC4040B36819FFF99A214CDA05` |
| hero-sampler-contract.cjs | `0C2FEB2381E3F12E3B6F307162C9435772729EE9268443090473D34E79192F86` |
| hero-sampler-red.log | `D13F929B60DC6D049BBBB8C33B8F64494FE5FE4C323C0520CDB3D33420060FEC` |
| hero-sampler-green.log | `33E01A43DADFA0AC22972541D742C6EAD8076280442BAED35FD9F78442CC9001` |

## Bounded Command Record

Read-only `git rev-parse HEAD`, `git --no-optional-locks status --short`, scoped `git diff HEAD`/`--stat`, targeted `Get-Content`/`rg`/JSON parsing, file discovery and SHA-256 comparisons exited 0. The five-case sampler contract, five-case deadline contract, corrected installed-clock enumerations, normalized-AST/control checks and deadline-boundary mocks all exited 0. One initial VM setup attempt exited 1 before exercising any scenario because the bundled source exposes export thunks; dereferencing the actual `createClock` export corrected the review harness. That was not a product failure. No browser/package entrypoint or GPU suite was launched. No owned test session remains running.

Only this sidecar was created. Previous failed freezes, intermediate reviews and cancellation evidence were neither edited nor repinned as passing. Final source recheck is recorded below.

Final local recheck exited 0 after writing this report: target `6231DB4E77516C3C811BDEFEE7D567265A80DEE3406EA05A1F7888AC74CD7FE9` remained stable; all eleven protected files remained unchanged, **12/12** expected source pins matched; HEAD remained D6. The review applies to that exact snapshot, independently of any later parent freeze announcement or edit. GPU equivalence and both fresh complete CI outcomes remain unjudged.
