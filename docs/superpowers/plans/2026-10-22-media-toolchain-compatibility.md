# Media Toolchain Compatibility Probe Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Determine whether the isolated zero-advisory media lock candidate can install and operate correctly before considering any application dependency change.

**Architecture:** Copy the candidate into a new private source fixture, not into the app. Cold-install media dependencies with lifecycle scripts disabled, private cache/home/temp paths and no credentials. Test only vetted CPU CLI/setup behavior first; browser, native lifecycle and full render compatibility are a separate reviewed gate.

**Tech Stack:** Node22, npm10, proposed HyperFrames0.7.111, unchanged Remotion4.0.489 and existing web Three dependencies.

**Spec:** Mission R4-T4 in `ops/mission/state.json`; `.superpowers/sdd/2026-10-22-media-audit-followup/candidate-lockfile-20261022-863-sidecar/README.md`; independent `review-a8172042-683c-4ea6-a495-1cbb642dfcd6/REVIEW.md`.

## Global Constraints

- Actual app manifest/lock remain exact de55ed3793da7d51fdf319fb5940b4911a0f1dadd1c851a5f5c2c41451156f75 / de10e0c7531e32bb6e1d654b22f443b551e1823ffea31d959f6145c49b350870.
- Candidate manifest/lock are exact ae48471ac8aee0079b8041238fa9e585a5af61b3c8dac5da9f0144a6ac221fdb /66da5a70a96257a5ff52676fa7aca0c9fb642672106e1c1eeca76b4685ab13b2.
- Keep all other23direct exact declarations/resolved artifacts unchanged. Review all236lock-entry changes, not only the top-level version.
- Write only in this plan's private `.superpowers/sdd/2026-10-22-media-toolchain-compatibility/` workspace; preserve all1518candidate originals and all prior receipts.
- One cold-install attempt, at most10minutes; fetch retries0 and fetch timeout30000ms. No force, legacy-peer bypass, override, audit-fix, lifecycle execution or automatic retry.
- Require at least5GiB free space. Never delete prior evidence to make room.
- Do not change the current app, system/browser configuration, global npm cache, user credentials, public assets, workflows or450/700/300/pixel/job limits.
- No browser/GPU/server/cloud/paid action during Task1. Keep the current mixed CI checkpoint failed; lock-only audit0 is not installed remediation or production approval.

## Review Focus

- ONNX1.21.1 has a changed native installer and potential downloads outside lock integrity; do not run it implicitly.
- Puppeteer156, tagged HyperFrames152 and Remotion150 browser choices need explicit later testing, not a presumed incompatibility or silent browser substitution.
- Existing private `dist/cli.js`, variables, readiness, seek and bundled audit-asset coupling may break despite a successful install.
- Hono2, Sharp deduplication and Remotion's shared transitives may change runtime behavior although direct pins stay fixed.
- A borrowed unchanged web node_modules junction is not a clean whole-repository installation; record and exclude only the exact known junction from recursive evidence walks.

---

### Task 1: Cold Media Install And CPU Compatibility Evidence

**Files:**
- Create new private `compat-<UUID>/` source fixture, runner, logs and `verification.json`.
- Read only current `apps/media/`, required tracked web hero/public sources, candidate stage2 manifest/lock and review artifacts.
- Do not edit `apps/media/package.json`, its lock or the version-pin test.

**Interfaces:**
- Inputs: exact candidate hashes, current source package hashes, explicit source file manifest and copied fixture root.
- Output: `{id, inputs, commands, installation, cli, pinContract, preparation, rootUnchanged, resources, limitations}` with exact byte hashes and raw failures.

- [x] Step1: Check free disk, exact inputs and actual Node/npm versions. Create a faithful tracked-file fixture; record copied sources and any single borrowed web dependency junction. Verify every resolved write path stays inside the named compatibility root.
- [x] Step2: Construct a minimal child environment with private userconfig/cache/home/temp and no inherited service credentials. Use only the already-known official registry; do not change user/global/project config.
- [x] Step3: Run one `npm ci --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000` in the private media package under the10-minute bound. Preserved one exit0 install:340 genuine packages and compressed-tarball integrity checks; no lifecycle execution or retry.
- [ ] Step4: If installation succeeds, verify installed HyperFrames and all direct artifact versions/integrities. Read candidate CLI entry/imports before invoking vetted `--version` and `--help` CPU commands with short bounds. Do not start a server, browser, model download or lifecycle script.
- [ ] Step5: Run the unchanged version-pin contract in the fixture and retain its expected0.7.56-versus0.7.111 RED. Run existing local vendor preparation only after confirming all writes stay in the fixture. Retain any new compatibility error; do not patch around it.
- [x] Step6: Rehash current app package/lock, copied inputs and all candidate originals. Confirm no parent tracked file changed. Independent reviews accept partial evidence only. CLI execution remains unvetted; original vendor preparation failed, and a separate vendor-only probe produced25 exact primary files but missed25 mirrors after a narrow ancestor-read denial. Broader mutable-ledger preservation failures are retained and attributed to the parent. Full summary: `ops/mission/evidence/media-compatibility-probe-2026-10-22/summary.json`.

### Task 2: Reviewed Runtime Test Design Before Adoption

**Files:**
- Create a separate private runtime-test design and evidence root after Task1 is reviewed.
- Keep product source and original pin expectation unchanged until the actual migration is deliberately scoped.

**Interfaces:**
- Consume Task1's exact installation, failures and package graph.
- Produce a concrete browser/lifecycle containment decision and exact commands for current strict HyperFrames checks, Remotion27stills and all-ten hero exports.

- [ ] Step1: Resolve any actual CLI/vendor/setup break with a failing fixture test before proposing a product patch. A version expectation update must preserve exact pinning, not remove the test.
- [ ] Step2: Choose documented, vendor-authenticated browser/native acquisition and containment only after reviewing actual need. Do not execute outside-lock native downloaders merely because npm audit is zero.
- [ ] Step3: Schedule all browser/GPU work serially, retaining existing readiness/seek/PNG/motion/fallback/asset-size and450/700/300limits. Verify finite360turns and all-frame nonblank/rest behavior for any newly exported videos.
- [ ] Step4: Independently review installed-runtime results and graph changes. Only then write a focused adoption plan, including atomic generated-lock handling, full standing29gate rerun, both new exact-head CI events and fresh preview proof.

This plan tests a candidate. It does not adopt dependencies, remediate the current13reported findings, waive CI, claim photoreal quality or authorize production promotion.
