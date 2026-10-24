# Direct Selection State Reader Plan

## Evidence And Scope

Original491-source run97fa04cc remainsFAILED atPortfolio; current493-source
full c7b6d6d0 remainsFAILED stage7Three after6passes. No unchanged full retry.
One built-in API/input diagnostic57f45c51 completed six unchanged selection
cases with45nativeprocesses/0active and736copied web/static/server pins exact.
All six passed under non-neutral logging. This is NOT historical cause closure.

In the diagnostic's desktop rapid return, click took108ms and locator state read
9ms (118ms total including small gaps); preceding away-state read took68ms.
The earlier244ms failing combined span was not split. Do not call state reads
the established dominant cause or guarantee that an optimization fixes the miss.

Pinned Playwright1.61.1 implements locator.evaluate via strict waitForSelector,
handle evaluation and disposal; current test's state() repeats this lifecycle.
The existing isolated-canvas checker already uses a direct synchronous page
evaluation. Evaluate the same pattern for selection state with stronger native
DOM guards. No app, asset, math, dependency, browser flags, real actions or
450/700/300ms budgets change. No force actions, sleeps or filtered errors.

Four-file delta: add scripts/selection-stage-state.cjs and its focused tests;
modify scripts/smoke-three-selection.cjs and package.json test prefix only.
New lab .superpowers/sdd/2026-10-23-selection-state-reader/ owns next proof.
Original6ff-relative scope16files,495source inputs/228web inputs. Prior493 QA
lab/producers frozen except progress. Old full/diagnostic proofs never relabeled.

## Steps

- [x] Pin prior493/v3/failed-full/API diagnostic and current assets/runtime.
- [x] Desired RED then minimal direct-reader implementation: one fresh read-only
  evaluate, exactly one connected native HTMLElement, valid current artifact/
  transition state, raw nullable revision. No cached handles or page writes.
- [x] Test duplicate/missing/detached/non-native/invalid state and fresh reads;
  source-backed wiring/inverse checks keep all workflow actions/assertions intact.
- [x] One predeclared paired actual-DOM parity/timing sample on unchanged compiled
 493-source app, both desktop/mobile, alternate ordering. This is helper-method
 parity, not a new495-source build or a repeat of the failed full benchmark.
 Source library structure is not measured protocol-count proof.
- [ ] Independent narrow source/parity review must explicitly rule on ONE fresh
 current-source complete29 run. No root-cause or speed/reliability guarantee from
 the paired sample; a full pass cannot close historical failures by itself.

Current parity bf7c34a7:100pairs all equal,35nativeprocesses/0active,two contexts/
browser/server closed. All ten group medians lower, but four desktop group
sample-max/p95 values worse. No tail/reliability/cause or transition claim.

Shipping remains held behind local29, current source review, canonical export,
exact-head CI pair/READY/hosted/actual IAB+Chrome and bounded receipt. Private
publication draft separately has three P2 findings (fresh CI selection, recovery
attestation retention, serialized marker/POST) and is not execution-cleared.
Production remainsOPEN, verifiedGitHub6ff5568 unchanged.
