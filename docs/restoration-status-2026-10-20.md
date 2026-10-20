# InterestShield Restoration Status

## Verdict

Verified local restoration build, pushed as draft PR #256. Not a production release.

The recognizable asset-centered dashboard is back, with four vitals, a selected
debt summary and a secondary Money Loop explorer. Vault also has its own hero.
The existing aligned demo defaults were preserved.

## Delivered

- Ten high-detail generated hero artworks, with original PNGs and optimized WebP posters.
- One refined licensed Auto GLB: 134,971 triangles, 13 embedded textures, 1.92 MiB,
  with clearcoat paint, glass, interior, wheels and brakes.
- Original refined Vault candidate: 31,976 triangles, six embedded 512px PBR maps,
  703 KiB, an open chamber, beveled door and physically connected hinge links.
  Eight authored studies and collection-wide art approval remain.
- Smooth one-revolution-and-rest viewing, reduced motion, resource cleanup and static fallbacks.
- Ten HyperFrames 1080p turntable videos, verified through actual rendered pixels.
- Reproducible source-hashed car import, Meshopt/WebP compression, visible credits,
  and removal of separately licensed trademark geometry and shared logo texture.
- Slow-network artwork continuity, texture/network failure fallbacks and shared
  geometry/material/decoded-texture cleanup regressions.
- Shared photographic reflection setup for web and HyperFrames, with temporary
  resource cleanup and poster fallback on environment setup failure.
- Serialized model/manifest publication, atomic JSON replacement, Windows sharing
  retries and protection against overlapping imports or full study rebuilds.
- A standing disposable Supabase database CI job with pinned tooling, clean migration
  replay, real SQL owner/RPC tests, lint/advisors, repeated-fixture rollback proof
  and failure artifacts. Both source-checkpoint database jobs passed 63 assertions
  twice, with clean lint/advisors and successful project cleanup. Cloud wiring,
  provider patch alignment and backup/account recovery remain open.
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
- Vault's four policies now share the mortgage, existing LOC and available budget.
  Extras are funded after obligations; retained cash and adverse deltas are visible.
  The contribution illustration is budget-capped, month-accurate and explicitly
  separate from incremental savings or common-date net wealth. Saved data is intact.
- Web Portfolio now uses a portable shared funded book: existing LOC in every
  strategy/focus, global direct extra caps, ranked LOC split slots and retained cash.
  Single Velocity reserves scheduled/manual payments before LOC recovery. The chart
  and summaries include LOC. Saved fields remain intact; native aggregate adoption
  and shared scenario ownership are still separate work.

The Auto model is an adapted Car Concept by Eric Chadwick / DGG, CC BY 4.0,
not a reconstruction of the generated coupe poster. Vault is an original authored
refinement, not an AI reconstruction of its poster. The other eight meshes remain
studies. A coherent artist-approved textured collection is still unfinished.
The app defaults to the polished artwork; real 3D inspection is optional and lazy-loaded.

## Verification

- Next.js production build, TypeScript and ESLint passed.
- 329 web/shared regressions, two independent reference scenarios,78 prior
  comparisons,25 zero-recovery,100 capped-mortgage and480 new Portfolio closed-form
  cases pass, plus360 repeatable seeded paths with240 direct-oracle matches and
  ancillary contracts.
- Twenty Vault browser executions at1440px/375px pass funding, cash, disclosures,
  stored timing, adverse results, exact final/cent-short, failed horizon and large
  amount bounds. The16 existing Simulator/saved-data cases remain green.
- Twenty-four Portfolio executions at1440px/375px pass policy/cap edits, retained cash,
  existing/ranked/split LOC, final/cent-short/cleared states and unchanged separate
  scenario data. Chrome caught an imported100m balance shownas10m; both editors
  now preserve that value through a no-op edit. Review also caught imported LOC
  clipping, lost LOC targets, invalid interest claims and paid-state copy; fixed and
  cleared on re-review. Screenshots wait for reveal opacity.
- Live hosted QA then caught current-target badges derived from eventual payoff
  order. They now use the engine's explicit allocation targets in desktop/mobile
  and the payoff list. A dedicated fixture proves Auto clears first while Mortgage
  remains current; focused independent review cleared the display-only correction.
- All seven routes passed rendered desktop/mobile smoke.
- All ten heroes passed desktop and 375px mobile nonblank, framing and rotation checks.
- Delayed loading and repeated mode selection passed at both widths; injected WebP
  decode rejection and network failure both preserve the artwork and release the stage.
- Failed-texture blob URL cleanup passed a real-browser red/green regression (12
  leaked URLs before the fix, zero afterward). Logo-linked emission was neutralized
  so metal components retain their intended non-glowing appearance.
- Reduced-motion and the pre-existing WebGL selection suites passed.
- Ten nine-second videos passed movement and return-to-start checks.
- 41 media contracts pass. Existing HyperFrames/Remotion checks pass with 27 fresh
  stills; new all-model turntables have fresh movement/rest pixel proof. The existing
  reel retains three layout information notices at a transition, with zero errors/warnings.
- New HyperFrames checks passed with one Intel shader precision warning.
- Independent financial review's one introduced edge case was fixed and approved on re-review.
- Media production dependency audit: zero advisories. Full media development-toolchain
  audit: 13 advisories (8 high, 5 moderate), requiring a separately verified toolchain update.
- Historical checkpoint: Vercel preview passed. GitHub Actions run39463072955 showed:
  web, media, Worker and Expo smoke passed, but two mobile fixtures expected old
  demo defaults. The fixtures are corrected and the mobile contract suite passes
  locally. A fresh exact-SHA green run is still required; preview is not CI approval.
- Latest fully verified baseline ec11223 passed both complete runs39502097560/
  39502102981, real SQL, Vercel and hosted proof; receipt PR256 issuecomment-6302535434.
  The new shared Portfolio checkpoint needs its own postflight receipt. No production
  release is inferred from either earlier success or this local preflight report.
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

Vault now includes both liabilities and the same available budget. Its four
allocation policies remain distinct and are named explicitly. Cash is measured at
each plan's own payoff month, not a common date; lender/calendar/posting rules and
full cash-inclusive net-wealth comparisons remain release work. See
`docs/mortgage-comparison-contract-2026-10-20.md`.

Budget/cadence corrections and preserved legacy timing data:
`docs/money-loop-budget-contract-2026-10-20.md`. Independent review's exact-payment
floating-point and optimistic calendar-summary cases were reproduced and fixed.
An exactly funded $120.70 final payment passes; one cent less remains unaffordable.

## Remaining Production Gates

1. Complete eight remaining textured models and artist-review both candidates and collection consistency.
2. Shared scenario ownership across Dashboard, Portfolio and Vault, with safe migration of existing data.
3. Lender-term enforcement and real transaction-calendar integration in the normal simulation paths.
4. Equal-budget, equal-liability strategy comparisons across every route.
5. Normal-path dated-calendar support; inactive timing choices are now removed,
   not represented as a completed weekly/biweekly scheduling engine.
6. Live Supabase isolation, schema, environment and recovery verification.
7. Final restored production artifact verification. The existing custom domain,
   DNS and HTTPS are now identified/verified; no new domain wiring is required.
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

## Custom Domain Identified

Authenticated Vercel discovery now confirms `interestshield.app` and `www` on the
exact app project. DNS matches Vercel's configuration, Cloudflare nameservers are
authoritative, HTTPS returns the app, `www` redirects 308 to apex and all seven
current public routes pass HTTP smoke. Settings confirms local demo mode and
unconfigured private sync. This does not prove the unreleased restoration candidate.

The source canonical default and environment example now use the verified domain;
runtime tests preserve explicit overrides, and the built canonical/robots/sitemap
were checked. No DNS, domain assignment, production env, backend or deployment
mutation occurred. A fresh bounded Docker probe still did not return in 20 seconds.
See `ops/mission/evidence/timing-and-budget-2026-10-20/domain-readiness.json`.

## Vault Refinement

The original steel/brass Vault identity is now backed by textured geometry rather
than a texture-free study. Web and video share the same local studio environment;
all ten videos were rebuilt and pass full-turn/rest pixel checks. Browser checks
pass all ten models at desktop/375px, reduced motion and failure fallbacks.
Source/binary hashes and clean-regeneration preservation are verified. Independent
review's hinge-contact, overlapping-write/rebuild and Windows-sharing findings
were reproduced and corrected; 20 repeated eight-process runs passed re-review.

This is two refined textured candidates, not two final photorealism approvals.
The app still defaults to the reference artwork, and its financial/scenario/layout
code was not changed. The prior 2b19284 checkpoint passed both hosted CI jobs and
Vercel; the new candidate must receive its own exact-head receipt before release.
See `docs/vault-refinement-contract-2026-10-20.md` and the new evidence folder.

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
