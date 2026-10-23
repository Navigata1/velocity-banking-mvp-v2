# Strict Canvas Evaluation Path Investigation

**Goal:** Investigate the repeated rapid-return PNG deadline failure without changing the app, calculation engine, artwork,450ms motion,700ms candidate/decode/restoration budget,300ms confirmation, actionability, clock origins or pixel requirements.

**Baseline:** Head617a2f845297ad5966fb86826e55ff0be8d2acec; both first-attempt primary CI jobs failed with5ms/35ms remaining. Both hero/SQL jobs and hosted15suites/210layouts/20asset hashes passed. Sealed5367-artifact failure receipt6358275114 remains FAILED.

**Single Initial Hypothesis:** The installed Playwright locator evaluation resolves and disposes an element handle around its callback. A single page evaluation with strict fresh DOM identity may remove some isolation overhead. Source inspection establishes this API path, not the number/cost of browser-protocol commands or the cause of remote scheduling variation.

**Architecture:** Private baseline/candidate helpers under `.superpowers/sdd/2026-10-23-canvas-evaluation-path/`. Keep all485 product inputs unchanged during diagnosis. Use structured parsing of the installed driver and actual helper source. Compare one evaluation-path change at a time before considering any screenshot-protocol alternative.

- [x] Record installed driver version, source hashes, exact relevant methods, current failure phases and explicit evidence limits.
- [x] Write private CPU contracts for the proposed direct-evaluation routing and strict unique/current/connected canvas binding. Record genuine baseline RED before implementing the candidate.
- [x] Preserve existing style-priority restoration, partial-mutation/error behavior, post-isolation geometry, supplied-clip identity and missing/ambiguous/detached rejection. CPU mocks are not pixel evidence.
- [x] Perform one declared serial browser comparison at desktop/mobile with fixed baseline/candidate ordering, real WebGL pixels, decoded-image parity and exact style restoration. Corrected harness31b37be8 passes8staticchecks; initial wrong decoder-field harness failure is retained.
- [x] Assess timing and protocol evidence with its uncertainty. Static isolation3-4ms candidate vs9-14ms baseline; first baseline decode colder. No measured CDP count, CI root cause or sufficient future reserve claim.
- [x] Run the unchanged six workflows with a predetermined candidate diagnostic collection. Corrected same-realm loader ac429c74 passes6baseline+6candidate workflows; initial VM-prototype failure is retained. Candidate worst611ms in this finite run, mixed overall totals, not a release check. Independent initial reviewer188c80c6 accepts further diagnosis only; source adoption requires a fresh scoped review below.
- [ ] A deliberate implementation needs permanent RED/GREEN contracts, risk-scaled standing gates, BOTH fresh complete exact-head CI events and hosted/browser proof. No production promotion or unchanged CI rerun.

The earlier Card workspace is sealed except `progress.md`. All new artifacts belong here. Existing user53143/53144 and owned53145 previews remain untouched. No app/math/art/dependency/backend change is authorized by a favorable private timing sample alone; broader production phases remain open.

The first proposed3-file local full run5b322775 remains FAILED after12 stages at an unrelated, unproven Portfolio network error. A separate confirmed UI detail correction now folds with the unchanged reviewed helper; its fresh486-source combined gates live in `.superpowers/sdd/2026-10-23-money-loop-metric-truth/`. No inherited12-stage approval or network workaround. See the matching truth spec/plan and Windows QA observation.
