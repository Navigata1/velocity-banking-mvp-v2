# InterestShield Restoration Status

## Verdict

Verified local restoration build, pushed as draft PR #256. Not a production release.

The recognizable asset-centered dashboard is back, with four vitals, a selected
debt summary and a secondary Money Loop explorer. Vault also has its own hero.
The existing aligned demo defaults were preserved.

## Delivered

- Ten high-detail generated hero artworks, with original PNGs and optimized WebP posters.
- One refined licensed Auto GLB: 134,971 triangles, 13 embedded textures, 1.92 MiB,
  with clearcoat paint, glass, interior, wheels and brakes. Nine authored studies remain.
- Smooth one-revolution-and-rest viewing, reduced motion, resource cleanup and static fallbacks.
- Ten HyperFrames 1080p turntable videos, verified through actual rendered pixels.
- Reproducible source-hashed car import, Meshopt/WebP compression, visible credits,
  and removal of separately licensed trademark geometry and shared logo texture.
- Slow-network artwork continuity, texture/network failure fallbacks and shared
  geometry/material/decoded-texture cleanup regressions.
- Repairs for phantom payments after payoff, extra payments exceeding the budget,
  lost calendar deposit surplus, and dashboard interest-scope inconsistency.
- Removed the dashboard's unequal-liability savings claim.
- Simulator web/Expo comparisons now retain the existing LOC in every plan, use
  the same available household budget, and expose cash retained at payoff. Adverse
  Velocity outcomes are signed and visible, not clamped to zero. Actual lender
  terms and the other routes still need integration; see the comparison contract.
- Affordable final payments and zero residual after scheduled payments now remain
  valid paths in the shared/single-target engine. Unfunded chunk draws, optimistic
  recovery hints and omitted payment outflows are blocked; actual calendar totals
  govern recovery when supplied. New chunks stay paused when scheduled recovery
  cash is unavailable, without hiding an otherwise valid payoff path.
- Inactive mortgage-frequency buttons removed from Simulator/Vault, with saved
  fields preserved. Monthly estimates and the annual-extra approximation are
  explicit; Guardian guidance matches the current Simulator contract.

The Auto model is an adapted Car Concept by Eric Chadwick / DGG, CC BY 4.0,
not a reconstruction of the generated coupe poster. The other nine meshes remain
studies. A coherent artist-approved textured collection is still unfinished.
The app defaults to the polished artwork; real 3D inspection is optional and lazy-loaded.

## Verification

- Next.js production build, TypeScript and ESLint passed.
- 289 financial regressions, two independent reference scenarios, 78 closed-form
  comparison cases, 25 zero-recovery conservation cases and ancillary contracts pass.
- All seven routes passed rendered desktop/mobile smoke.
- All ten heroes passed desktop and 375px mobile nonblank, framing and rotation checks.
- Delayed loading and repeated mode selection passed at both widths; injected WebP
  decode rejection and network failure both preserve the artwork and release the stage.
- Failed-texture blob URL cleanup passed a real-browser red/green regression (12
  leaked URLs before the fix, zero afterward). Logo-linked emission was neutralized
  so metal components retain their intended non-glowing appearance.
- Reduced-motion and the pre-existing WebGL selection suites passed.
- Ten nine-second videos passed movement and return-to-start checks.
- 35 media contracts and existing HyperFrames/Remotion checks passed; 27 Remotion stills rendered.
- New HyperFrames checks passed with one Intel shader precision warning.
- Independent financial review's one introduced edge case was fixed and approved on re-review.
- Media production dependency audit: zero advisories. Full media development-toolchain
  audit: 13 advisories (8 high, 5 moderate), requiring a separately verified toolchain update.
- Checkpoint Vercel preview passed. GitHub Actions run 39463072955 is now visible:
  web, media, Worker and Expo smoke passed, but two mobile fixtures expected old
  demo defaults. The fixtures are corrected and the mobile contract suite passes
  locally. A fresh exact-SHA green run is still required; preview is not CI approval.
- On the refined checkpoint 0d72c6b, push CI passed and all seven remote preview
  routes passed at desktop/375px. Its PR CI run exposed software-GPU screenshot
  stability timeouts. The capture path now uses fixed canvas bounds and bounded
  timeouts, with every existing pixel assertion retained; all ten heroes passed
  a fresh software-rendered local run after the security patch.
- Patched checkpoint 8e1f41d passed both hosted CI runs (39469462980 and
  39469479740), Vercel and seven remote desktop/375px route checks. Later commits
  still require their own exact-head hosted checks; a green checkpoint is not
  production approval.
- Checkpoint 58d0df5 passed both hosted CI runs (39471854169 and 39471862274),
  Vercel and all seven preview routes at desktop/375px. New comparison work needs
  fresh exact-head hosted checks. Local Chrome verifies three comparison cases
  at desktop/375px, including slower/more-interest Velocity and unaffordable inputs.
- Checkpoint 30b810e passed both hosted CI runs (39476307257 and 39476316604),
  Vercel and all remote route/comparison checks. The timing/budget follow-up has
  fresh local proof and still needs exact-head hosted checks. Its browser gate
  now covers 16 cases across desktop/375px, including saved timing values surviving
  an unrelated edit and navigation. No prior checkpoint authorizes production.

## Comparison Correction

The previous Simulator reference omitted the existing LOC and used a smaller
payment budget than the accelerated strategies. The new shared direct-repayment
projection fixes that scope without changing the existing Velocity allocation
policy or overwriting household data. The chart also includes both balances.

The default educational example now projects direct repayment in 7 months versus
14 for the low-chunk Velocity policy, with different cash reserves. Cash is shown
at each plan's own payoff month, not at a shared date. This is not a universal
strategy recommendation. Constant rates, zero fees, month-end direct payments,
30/365 LOC interest and an unverified interest-only LOC obligation are disclosed.
Full lender/calendar enforcement remains a release gate.

Detailed contract and limitations: `docs/simulator-comparison-contract-2026-10-20.md`.

Vault's mortgage comparison still has differing payment allocations and LOC coverage.
It now discloses that limitation before its deltas; this warning is not a substitute
for completing the equal-budget/liability calculation contract before release.

Budget/cadence corrections and preserved legacy timing data:
`docs/money-loop-budget-contract-2026-10-20.md`. Independent review's exact-payment
floating-point and optimistic calendar-summary cases were reproduced and fixed.
An exactly funded $120.70 final payment passes; one cent less remains unaffordable.

## Remaining Production Gates

1. Complete nine remaining textured models and review collection consistency.
2. Shared scenario ownership across Dashboard, Portfolio and Vault, with safe migration of existing data.
3. Lender-term enforcement and real transaction-calendar integration in the normal simulation paths.
4. Equal-budget, equal-liability strategy comparisons across every route.
5. Normal-path dated-calendar support; inactive timing choices are now removed,
   not represented as a completed weekly/biweekly scheduling engine.
6. Live Supabase isolation, schema, environment and recovery verification.
7. Custom-domain and verified production deployment.
8. Final native-device QA and refreshed bundles after remaining shared-engine changes.
9. Resolve media-toolchain advisories and prove exact-SHA hosted CI on the final candidate.
10. Complete supported native dependency upgrades and assess SDK build-tool exposure.

## Security Refresh

The broader audit found six web runtime dependency findings, including critical
Next.js advisories. The local branch now uses Next.js and ESLint config 16.4.2,
PostCSS 8.5.31 and compatible transitive patches. The web runtime registry audit
is now clean; build, TypeScript, regressions, lint, seven rendered routes, all ten
software-rendered heroes and the standalone Money Loop proof passed. Independent
dependency/capture review found no issues. This patch has not been promoted to
the live production app. Runtime patch: 60ab957; capture correction: b4df206.

Primary references: [Next.js 16.4.2 release](https://github.com/vercel/next.js/releases/tag/v16.4.2)
and [next/og advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j).
An advisory match is not proof this application's configuration was exploitable.

The native critical finding was then fixed in 6e900d0 through one compatible
transitive update: shell-quote 1.8.4 to 1.12.0, without changing the Expo SDK.
The advisory input now throws without being executed; normal quoting still works.
Fresh native typecheck, contracts, web export/seven routes and Android/iOS Hermes
exports passed. These exports are not final-device QA.

Remaining dependency findings: 12 in web development tooling; 13 in media tooling;
40 noncritical findings in the mobile omit-dev tree (28 high, 12 moderate).
Expo CLI/Metro are included in that tree, so these counts must not be presented
as confirmed device-runtime vulnerabilities. The full native audit still fails,
although its critical-only gate passes. The Worker runtime audit is clean. Do not
apply suggested major SDK downgrades without compatibility review.

## Backend Reality

Supabase cloud discovery is now authenticated. A healthy project named
"Navigata1's Velocity Banking" exists, but it is only a name-matched candidate:
it has zero public tables and zero applied migrations. The repo has four migration
files and no cloud-project link. Local public-client credentials are absent, and
the deployed preview explicitly reports local demo mode and unconfigured sync.

Client/account contracts passed, but fresh SQL/RLS replay has not been completed
in this session. Docker was stopped; its installed launcher exceeded the requested
timeout and only that CLI request was canceled. No isolated SQL test stack was verified.
Zero advisor notices on an empty schema do not prove owner isolation. No schema,
grants, keys, user records or DNS were changed. See the sanitized
`ops/mission/evidence/security-refresh-2026-10-20/backend-readiness.json` inventory.

Comparison preview: http://127.0.0.1:53144/simulator

Desktop package: `C:/Users/IslandDevCrew/Desktop/InterestShield-Hero-Collection-2026-10-20`

Branch: `codex/restoration/asset-heroes`.
Draft: https://github.com/Navigata1/velocity-banking-mvp-v2/pull/256
The original restoration checkpoint was pushed in commits 382f042, 474f5cf and 24d238e.
No production deployment was made. July mission state is archived in
`ops/mission/history/july-2026-state.json`; October phases are now active.

Approved recurring improvement runs are scheduled every four hours in this chat
under `interestshield-production-improvements`. They must make focused verified
changes, preserve the original identity, and push to the draft without auto-merging.
