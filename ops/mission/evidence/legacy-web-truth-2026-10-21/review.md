# Tier 2 Independent Verification: Legacy Web Financial Truth

## Verdict

**Re-review: F1 and F2 remain closed. The additional dashboard-harness finding H1 is also closed by house-only priming. No unresolved actionable source findings remain at the 14 exact hashes below.** The original 13 pins are unchanged. This is bounded source/harness clearance, not a claim of one clean full browser run or final CI/hosted/production approval. No product, engine, configuration, test, storage, asset, dependency, or mission-state edits were made by this reviewer.

- Branch and HEAD verified: `codex/restoration/asset-heroes`, `17457ccd7db7cb83cf7ddecaa3a206ee7e345800`.
- Reviewed the full working diff, both added scripts, design and plan, shared draft parser/editor lifecycle, selected-APR readout, actual store-to-calculation adapters, Dashboard burn model, all three legacy route selectors, package commands and CI upload contracts.
- Initial review snapshot: `2026-10-21T19:23:59.294Z`. Final source re-review/pin snapshot: `2026-10-21T19:29:17.873Z`. The hashes include Vault's targeted `p-3 sm:p-8` wizard-panel correction, the actual comparison builder, negative-delta explanation and updated browser cases.
- Worker freeze received and verified against disk: `smoke-legacy-web-truth.cjs` SHA256 `dc12202ad43d1b276ee54735b17b51a2759b93f3395a053ea5e4caf4a4afc444`. Any subsequent executable-byte changes require new pins and review. This is not a final-head shipping clearance.
- Bounded harness-only reopening snapshot: `2026-10-21T19:46:10.992Z`. Whitelist expands only by `apps/web/scripts/smoke-dashboard-interest.cjs`; all original 13 hashes/byte counts still match and `.next/BUILD_ID` is still `Z-yZeymBAJICjBPEhV4He`.

## Dashboard Harness Reopening

**Adjudication:** the first deep-equality failure is a fixture preparation defect exposed by correct no-op behavior, not a newly authorized store/default-adoption policy. The raw fixture persists only one partial debt plus partial mortgage details. Existing hydration supplies defaults in memory; its first actual persisted edit serializes the existing complete state. The old same-value warmup depended on the unsafe editor always invoking the setter. The validated editor correctly leaves that no-op entirely unwritten, so the original `before` captured a partial serialized shape, while the later real House income edit captured the existing merged shape.

### H1 [P2, Closed] Unconditional +1 Priming Exceeds The Large-Import Editor Bound

- The initially proposed unconditional `changeIncome(state.monthlyIncome + 1)` is invalid for `large-import`: its income is `100000001` and the Dashboard's explicit maximum is `Math.max(10000000, store.monthlyIncome)` ([page.tsx:387](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/app/page.tsx:387>)). The actual parser returns the unchanged value and `Enter at most 100000001.` for draft `100000002`. The harness then times out awaiting a persisted value the editor correctly refused.
- Independently reproduced that bound failure without a browser. Read the parent-produced setup-timeout record, now retained as `dashboard-priming-oversize-setup.log`; its failure is at the unconditional warmup call, after the first five 375px cases pass. The failed unconditional harness snapshot had SHA256 `872319f903c04da523a75bb9dc30575152873417e9d4d5f33ef1dbf4e7895b7d` and is **not** the final cleared harness.
- Parent's final correction at [smoke-dashboard-interest.cjs:210](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/scripts/smoke-dashboard-interest.cjs:210>) asserts exact raw bytes after the same-value no-op on every case, then primes **only** `scenario.id === 'house'` with a valid `8201`/`8200` edit/restore before `before` capture. Only that scenario later performs the real `8300`/`8200` edit/navigation. Across three widths this means **3 primed House workflows and 15 untouched raw-fixture workflows**, not 17 others.
- AST/source comparison against baseline proves **all 34 original assertion call sites remain verbatim**, with exactly one new raw-byte no-op assertion call site. `storedInputs`, `vitalLayout`, `assertVitalLayout`, and `checkVitalOracleControls` are byte-identical. Removing only the new raw-byte assertion, house-only preparation and comment change reproduces the entire original script exactly after line-ending normalization. All 18 workflows, scenario values/captions, large-value precision checks, layouts, responsive/fallback-font probes, ten actual-node negative controls, timing checks and original deepEqual restoration assertions remain.
- Executed the **actual final preparation source** in a VM for all **18 width/scenario cases**, against the real in-memory Zustand store and real input parser with the Dashboard's actual bounds. Three House cases made exactly two preparation writes and normalized the existing hydrated shape; the other 15 made zero writes and retained exact original raw bytes. All 18 final restoration comparisons and seeded balance/rate/LOC/income/expense/chunk/frequency/mortgage values passed. This is a pure fixture adjudication, not browser/navigation/pixel proof. An earlier six-case store probe without UI bounds confirmed the shape diagnosis only; the separate actual-bound probe caught H1 before clearance.
- `node --check apps/web/scripts/smoke-dashboard-interest.cjs` and the pure source-retention/actual-preparation checks passed. No browser, media, native, build, server, commit or push was run by this reviewer. No store/schema/default-merge/adoption policy changed; legacy default adoption and full shared ownership remain open R2 work.

### Execution Evidence, Not A Single Clean Run

- Read the parent's completed `quality.json`: **9/9 quality stages exit 0**, completed `2026-10-21T19:33:57.160Z`. This is existing parent-produced evidence, not nine new reviewer executions.
- Read the unchanged first serial report: **7 successful stages**, then dashboard exit 1 at `2026-10-21T19:41:22.082Z`. The successful stages are new legacy truth, shared Dashboard, Three, heroes, fallbacks, HTTP routes and rendered routes. New legacy truth's actual receipt has **12/12 workflows, 711 assertions, 0 assertion failures, 0 setup failures**, frozen script hash `dc122...afc444`, and served/local build `Z-yZeymBAJICjBPEhV4He`.
- Preserve the first failed report copy `first-web-gates-red.json` (1712 bytes, SHA256 `91f67b2b29c06c3f4669726d18766ea76487d576c87b487aa7347276c0ab8a46`) and initial shape-failure log `dashboard-priming-red.log` (2872 bytes, SHA256 `118152b81771d24d98eabcde52551abdb97149a5a37cb24c95a983da735bf26a`). At review time these exactly match their original `web-gates.json` and `dashboard.log` contents. The later oversize-setup failure remains a separate failed attempt; do not rename either failure as passing evidence.
- The repaired standalone Dashboard rerun and remaining serial segment are parent-owned and pending here. Completion must be reported as **15 distinct successful stage executions covered across the retained first segment and the successful remaining segment, plus the initial harness failure and the intervening oversize setup failure**, not one uninterrupted clean 15-stage run. Any additional standalone success/repeated stage is an extra execution, not another distinct gate. Claim that aggregate only after the remaining receipts actually pass. No timing, pixel, layout, financial-value or restoration assertion is waived.
- This runtime-harness-only change does not require relabeling or rebuilding the first seven product successes: the same built product and original 13 source pins are retained. Final CI must still freshly run every complete required event at the final head.

## Initial Findings (Both Closed)

The following records the original defects and reproduction evidence, not current unresolved findings. Initial line references refer to the earlier snapshot; current closure locations and evidence follow below.

### F1 [P2, Closed] Do not describe the interest delta as a same-liability projection

**Location:** [cockpit-model.ts:78](C:/Users/IslandDevCrew/Documents/Interest%20Shield/apps/web/src/app/cockpit-model.ts:78), with the misleading common-scope detail at line 81 and [Cockpit page:84](C:/Users/IslandDevCrew/Documents/Interest%20Shield/apps/web/src/app/cockpit/page.tsx:84).

The new adapter authorizes a signed delta whenever the two facts are individually valid. However, `getBaselinePayoff` invokes `simulateBaseline`, which only amortizes `carLoan` and sets every baseline row's LOC balance/interest to zero ([calculations.ts:350](C:/Users/IslandDevCrew/Documents/Interest%20Shield/apps/web/src/engine/calculations.ts:350)). Velocity includes the existing LOC. The adapter then states "Selected debt plus the separate LOC balance" without explaining that this does not apply to the baseline. The baseline also uses only the scheduled target payment, not the same available repayment budget.

**Independent pure reproduction using the actual calculation modules and new adapter:** income 8200, expenses 4700, target 18450 at .069 with payment 425, LOC 3200 at .085/limit 25000, chunk 1000. Baseline is 51 months / 2836.8481160428687 interest; Velocity is 14 months / 779.9758112754789. The view claims `+$2,056.87` with the common debt-plus-LOC scope. Changing only the starting LOC balance from 3200 to 0 leaves the baseline exactly unchanged. This is not compatible starting liability scope, even though both payoff flags are true.

**Bounded correction:** suppress a like-for-like delta when its scope is incompatible, or explicitly label this as a target-only minimum-payment baseline versus a target-plus-LOC scenario, with unequal budgets, rather than a same-scope result. Do not change numerical engines or attempt the full R2 comparison project here. The new browser assertion at [smoke-legacy-web-truth.cjs:402](C:/Users/IslandDevCrew/Documents/Interest%20Shield/apps/web/scripts/smoke-legacy-web-truth.cjs:402) pins the arithmetic but not its compatibility or disclosure; add a literal scope regression.

### F2 [P2, Closed] Recognize an exactly cleared cohort without requiring a viable borrowing setup

**Location:** [cockpit-model.ts:76](C:/Users/IslandDevCrew/Documents/Interest%20Shield/apps/web/src/app/cockpit-model.ts:76).

The exact-zero balance check is followed by `validProjection(velocity)`, so a fully cleared target and LOC are labeled `review` whenever the existing solver declines to simulate for unrelated setup reasons. The adapter's mocked cleared contract only supplies `isPayoffPossible: true`, masking this reachable path.

**Independent pure reproduction through the real `simulateBaseline` / `simulateVelocity` and adapter:**

| Target | LOC | Other inputs | Actual Velocity fact | Current view |
| --- | --- | --- | --- | --- |
| 0 | 0 | Income 8200, expenses 4700, LOC limit 0 | months 0, interest 0, possible false, `loc-setup` | `review`, `Review inputs` |
| 0 | 0 | Income = expenses = 4700, LOC limit 25000 | months 0, interest 0, possible false, `negative-cashflow` | `review`, `Review inputs` |

There is no remaining liability in either case. Asking for APR/payment/LOC corrections to obtain a debt-free state is false and violates the explicitly distinct cleared-state contract.

**Bounded correction:** establish exact cleared balances independently of whether a future Velocity plan is viable. Preserve nonzero-balance zero-month rejection, invalid-balance rejection, and the separate drill/routing unmodeled policy. Add actual-engine-to-adapter tests for both cases; do not edit the engine.

## Independent Closure Evidence

- **F1 closed:** [Cockpit page:82](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/app/cockpit/page.tsx:82>) now obtains both facts from `buildCockpitScenario`, not the old store getters. [cockpit-model.ts:88](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/app/cockpit-model.ts:88>) calls the unchanged actual `runSimulation`, whose direct baseline covers the existing LOC and the same available budget. Display detail at line 83 states the common cohort/budget and explicitly explains that a negative delta means Velocity costs more.
- The same fixture now produces direct repayment **7 months / 485.5041104110338 interest** versus Velocity **14 months / 779.9758112754789 interest**, displayed **`-$294.47`**. A separate reviewer-written month recurrence, using the existing disclosed debt-first monthly-budget/LOC-interest convention and no production simulation helper, independently produced exactly 7 months / 485.5041104110338. Removing the initial LOC liability changes the baseline to **6 months / 341.54612173437687**, independently matching that recurrence too. The old 51-month minimum-only baseline is no longer the Cockpit comparator.
- **F2 closed:** [cockpit-model.ts:76](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/web/src/app/cockpit-model.ts:76>) treats finite, non-negative, exactly zero target and LOC balances as authoritative before viability checks. Actual-builder probes with absent LOC setup, zero cash flow and negative cash flow all return `cleared`, `No debt remaining`, `$0.00`. Nonzero sub-cent balances remain `review`; invalid/overflowing balances cannot become cleared.
- Twelve independent actual-builder checks passed, covering the recurrence, LOC sensitivity, the three cleared cases, each drill/routing override even when cleared, sub-cent nonzero debt, LOC-only debt, overflow and frozen inputs. Drill and routing flags still take precedence over cleared presentation and remain `unmodeled` without invented ETA/delta.
- A separate **64-case actual-builder matrix** passed: APR `.069/2/6.5/200`, LOC `0/3200/25000/26000`, and cash surplus `0/100/500/3500`. It observed 12 projected / 52 review states, exact mapping to actual engine facts and signed deltas, and no mutation.
- Freshly ran the final **31 Cockpit contracts**, **348 main regressions** with their imported focused contracts, and **14 CI contracts**; all passed. The final 31 include the literal baseline 7 / `-$294.47` assertion and both real-engine cleared counterexamples.
- Read the parent's `review-scope-zero-red.log` and `review-scope-zero-green.log`: the initial five failed assertions consist of changed cleared authority plus four integrations; the subsequent 31 pass. These are parent-produced red/green records, distinct from this reviewer's fresh passing runs.
- One initial reviewer ad hoc assertion guessed the wrong baseline literal (`498.9320488462837`) and exited 1 before completing the probe batch. That was a reviewer harness expectation error, not a product RED. The independent recurrence established the correct `485.5041104110338`, after which all 12 checks and the 64-case matrix passed; no product change was made in response to that erroneous assertion.
- Reviewed the frozen browser-script updates: healthy exact `-$294.47`, visible common budget/cohort disclosure, the added cleared limit-0 and zero-cash-flow variants, and restored cleared state after drill/routing with exact saved-byte/write preservation. These add variants within the existing 12 workflows, not a reduced workflow gate.

## Verified And Not Refuted

- The legacy facade explicitly selects `legacy`; the canonical editor defaults to `decimal`. Actual SSR contracts and five direct parser probes retain old raw 2 as 2%, raw 6.5 as 6.5%, new legacy 200 as raw 200, and canonical 2 as 200%. Equivalent no-ops preserve the original numeric representation.
- No blanket APR ceiling remains. Explicit input bounds reject rather than clamp; unchanged oversized values are preserved. Nonfinite displays say `Not available`.
- Actual-source, in-memory hook probes found one callback for Enter plus late blur, focus-return intent, no commit after a committed-value replacement, invalid-draft feedback without writes, and inert late blur after unmount. These are focused handler probes, not browser/React-scheduler or real-keyboard proof. The component reads the latest committed callback and includes kind/format/label/bounds in session invalidation.
- Root target APR now invokes the existing legacy `normalizeApr`; canonical Portfolio semantics are not routed through that normalization.
- Failed/missing/nonfinite/fractional/unsafe-month projections, nonzero zero-month results, negative/nonfinite interest, individually finite but overflowing balance totals, and signed tiny/large differences are guarded by the adapter's pure contracts. Exactly cleared balances now deliberately override stale projection facts, as requested; drill/routing still suppress ETA/delta and do not call store setters.
- Daily burn now consumes the Dashboard's precise selected-target-plus-LOC estimate, not all synthetic domain defaults. Its visible caption identifies the two components.
- `data-financial-editor` is on the common editor root. The `max-sm` selector is limited to flex field rows with that **direct** child on Simulator, Cockpit and Vault, rather than arbitrary flex containers. Vault additionally has the parent-authorized `p-3 sm:p-8` wizard padding at line 733.
- Light feedback and Cockpit status/delta classes now use darker light-theme colors. Actual contrast, glyph fit and animation-settled visibility still require the worker's final rendered run; this reviewer did not run a browser or inspect images.
- Existing package test/smoke commands remain and append the new contracts/workflows. CI retains both dashboard output trees under an `always()` upload. Fourteen CI contracts pass; 20-minute limits and the separate graphics/SQL jobs remain unchanged.
- `git diff -- packages/financial-engine apps/web/src/engine apps/web/src/stores apps/mobile apps/media supabase apps/web/public apps/web/package-lock.json` was empty again on re-review. The fix adopts an existing comparator; no numerical financial-engine, calculation adapter, store/schema, native/media, asset, or lockfile changes appear in this working diff.

## Fresh Commands Run

The final commands below were pure/read-only and exited 0; no log files were created by this reviewer. The earlier ad hoc expectation error is explicitly reconciled in the closure section.

| Command | Fresh observed result |
| --- | --- |
| `node scripts/engine-regression-tests.cjs` from `apps/web` | 348 main regressions passed, plus the imported APR/book/persistence/store/harness contracts |
| `node apps/web/scripts/cockpit-projection-tests.cjs` | 27 initial contracts passed; final 31 passed again after the final literal assertion |
| `node scripts/check-restoration-ci.test.cjs` | 14/14 passed |
| Inline Node/TypeScript VM parser and actual-editor handler probes | Five APR probes and four lifecycle probes passed |
| Inline Node/TypeScript VM actual calculation-to-adapter probes | Initially reproduced F1/F2; re-review passed 12 actual-builder checks including independent baseline recurrence, plus the 64-case matrix |
| `git diff --check` | Clean |

No browser, media, native, build, install, server, commit, push, or external service operation was run. Full `npm test`, lint, built/hosted workflows, live CI, physical devices and production readiness were not independently rerun or approved.

## Worker Evidence And Remaining Gates

- Read, but did not produce, the completed worker receipt `apps/web/test-results/legacy-web-truth/run-2026-10-21T19-16-28-403Z-30956/verification.json`: 12 workflows, 648 assertions, 19 assertion failures, 0 setup failures, 6 passing workflows. Its provenance says `red: false`, served/local build `CDLt6G3YZmgx7vpHcXlp3`, and script hash `106f0b1a93c58a96de98126d252c7df25d840ee4c9c1b6c0ede6e6dea2b48c99`. This is a working-source-build refinement RED, not proof that this receipt used the older frozen baseline build. HEAD alone does not identify uncommitted built source.
- Subsequently read the completed second worker receipt `run-2026-10-21T19-21-18-532Z-26940/verification.json`: 12 workflows, 648 assertions, 1 assertion failure, 0 setup failures, 11 passing workflows; completed `2026-10-21T19:24:55.267Z`. Its script hash is the earlier `855c9e0d03c4017b985050303cd7a7a7bef489dd85e895ad12cb1a2dc5955cf0`; served/local build is `H-q8DC3bStPKD1lSJZqSL`. Parent identifies the remaining real Vault 280px input-width failure as client 122 / scroll 149 for `100000001.125`. The targeted padding fix is present. This old receipt does not prove the final builder or frozen script.
- Worker freeze is received and its final hash matches disk. Read `.next/BUILD_ID` and confirmed `Z-yZeymBAJICjBPEhV4He`; build terminal exit 0 is parent-reported, not a build run by this reviewer. Full quality and the 15 serial web stages were pending at the earlier F1/F2 source stamp; their subsequent completed-quality/partial-browser status and preserved failures are recorded in the dashboard harness reopening above.
- The browser worker's current `reveal` waits for ancestor opacity before `fit` still checks visibility. Treat old opacity misses as unresolved observations until fresh evidence; do not waive the glyph/scroll-width or contrast assertions as animation races.
- Final exact-head push/PR CI, fresh READY deployment identity, hosted proof and actual IAB remain parent shipping gates. This review does not replace them or approve a changed script hash.
- Full shared scenario ownership/adoption across all routes/native remains open. The explicit canonical Dashboard slice does not make every legacy route share one book.
- Actual alternate routing and the $600 expense model remain deliberately unmodeled. Lender minimums, fees, posting/rounding, dated calendars, intra-month capacity and common-date wealth comparisons remain open.
- Full photoreal/all-angle collection approval, backend cloud association/isolation/recovery/backup/provider alignment, signed-in device/native/cloud/keyboard/accessibility proof and production release remain separate open gates. These are not new blockers invented by this review and are not silently marked complete.

## Exact Raw-Byte SHA256 Pins

Twelve modified tracked product/config/test/harness files and both new scripts: the original 13 pins are unchanged, and the corrected dashboard harness is the sole added whitelist entry. Hashes include actual line endings. A matching hash identifies only these reviewed bytes, not passing browser/CI/hosted evidence.

| File | Bytes | SHA256 |
| --- | ---: | --- |
| `.github/workflows/ci.yml` | 10011 | `b6061a158e6c0ad086717e6b0c0f956d1fec517837b2c9159cb4b5db28301527` |
| `apps/web/package.json` | 3304 | `a05d7916103320c2b0a78a4e5546e451ee84da3aa49b64d01e45c2b7a645fd35` |
| `apps/web/scripts/engine-regression-tests.cjs` | 419065 | `cb70a4d99f4cba99e9acff7ab213412c6c64de99a51dae2eaca66343d5c9e7d9` |
| `apps/web/src/app/cockpit-model.ts` | 5100 | `48c99c9d1906a0b792bb452cc66c358c3b8d517ced9e1abac10d7dd00ff83fc8` |
| `apps/web/src/app/cockpit/page.tsx` | 25016 | `db5d2d363318de706d1bed6a15683f3701059ce9a8c5b30f3c9fec7d53fbc0eb` |
| `apps/web/src/app/page.tsx` | 23649 | `9662553ea335c014d1ed71fc12cc358ba494b5e8cde96534ffcd07ca28577894` |
| `apps/web/src/app/simulator/page.tsx` | 30726 | `c365e2fbeb9efdfee4f899c3c2f5da59c145bf5f51e0649d148a49ccf4d9ccbe` |
| `apps/web/src/app/vault/page.tsx` | 42738 | `5b53dc4333b3888eb9c2af19684b9bf1154410e6fa54e0be656fd92e41fa4095` |
| `apps/web/src/components/EditableNumber.tsx` | 769 | `3550e875c19e9bd8758ff72f77c9bb92dccb35f4cebaa2db7d8e4eecfb43ca58` |
| `apps/web/src/components/PortfolioEditableNumber.tsx` | 8826 | `ec705586f8395c7f92841940f1b0e54d81dcc0bab9a50bfd5484984f3de4a4cc` |
| `scripts/check-restoration-ci.test.cjs` | 8352 | `00a23a7e0eb6bfc385fdb57a45b9619b3666085288da375ddfe5b5e186df285a` |
| `apps/web/scripts/cockpit-projection-tests.cjs` | 9640 | `1a97246d76159dc9459df4e19ca3b1b0a71c25702a92c934516bb5a92386ae89` |
| `apps/web/scripts/smoke-legacy-web-truth.cjs` | 45841 | `dc12202ad43d1b276ee54735b17b51a2759b93f3395a053ea5e4caf4a4afc444` |
| `apps/web/scripts/smoke-dashboard-interest.cjs` | 20600 | `9d9c268864f85cd8d51fea6e482f08934e55417d7329186cfaa46e09c5b8567b` |

Final source/harness stamp: **F1/F2/H1 closed; no unresolved actionable findings; bounded review cleared at the 14 exact pins above.** All original 13 pins and the final worker freeze match; only the explicitly reviewed dashboard harness is added. Nine completed parent quality stages and seven first-segment browser successes are retained evidence, not a clean completed full browser run. The remaining browser segment, final-head CI/hosted/actual-IAB and explicitly open production gates remain parent-owned and unapproved here. No product edits were authorized to or performed by the reviewer.
