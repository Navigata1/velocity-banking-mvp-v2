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
  Collection-wide art approval remains.
- Original refined House candidate:31,316 triangles, six embedded material maps,
  1,144,500bytes, limestone facades, open glazing/interiors, charcoal standing seams,
  oak joinery and a clear landscaped approach.
- Original refined Land candidate: 49,834 triangles, eight embedded material maps,
  709,260 bytes, real recessed pond, grounded path/stakes, connected woody branches
  and folded individual leaf geometry. Six authored studies remain.
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
- Dashboard daily interest now shows explicit cent/sub-cent estimates and separately
  rounded components, with numeric overflow marked for review. Raw calculations
  and the selected-target-plus-LOC scope are unchanged. Seven currency editors also
  preserve current oversized imports; actual no-op data loss was reproduced first.
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
refinement, not an AI reconstruction of its poster. House is original architecture
with generated albedos and authored approximate micro-normal/roughness maps, not a
scanned building or exact reconstruction. Land is an original illustrative diorama
with generated albedos and authored approximate surface/shading maps. The other six meshes remain
studies. A coherent artist-approved textured collection is still unfinished.
The app defaults to the polished artwork; real 3D inspection is optional and lazy-loaded.

## Verification

- Next.js production build, TypeScript and ESLint passed.
- 340 web/shared regressions, two independent reference scenarios,78 prior
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
- Twelve new Dashboard browser cases at1440px/375px pass daily text/amount bounds,
  cent mismatch, small/cleared/large amounts, desktop assumptions, saved-input
  preservation, income edit/restore/navigation and seven oversized currency no-ops.
- All ten heroes passed desktop and 375px mobile nonblank, framing and rotation checks.
- Delayed loading and repeated mode selection passed at both widths; injected WebP
  decode rejection and network failure both preserve the artwork and release the stage.
- Failed-texture blob URL cleanup passed a real-browser red/green regression (12
  leaked URLs before the fix, zero afterward). Logo-linked emission was neutralized
  so metal components retain their intended non-glowing appearance.
- Reduced-motion and the pre-existing WebGL selection suites passed.
- Ten nine-second videos passed movement and return-to-start checks.
- 56 media contracts pass, including nine Land and six House cases. Existing
  HyperFrames/Remotion checks pass with 27 fresh stills; Land's turntable was rebuilt
  and nine unchanged videos rechecked with fresh movement/rest pixel proof. The existing
  reel retains three layout information notices at a transition, with zero errors/warnings.
- New HyperFrames checks passed with one Intel shader precision warning.
- Independent financial review's one introduced edge case was fixed and approved on re-review.
- Media production dependency audit: zero advisories. Full media development-toolchain
  audit: 13 advisories (8 high, 5 moderate), requiring a separately verified toolchain update.
- Historical checkpoint: Vercel preview passed. GitHub Actions run39463072955 showed:
  web, media, Worker and Expo smoke passed, but two mobile fixtures expected old
  demo defaults. The fixtures are corrected and the mobile contract suite passes
  locally. A fresh exact-SHA green run is still required; preview is not CI approval.
- Latest fully verified baseline 232b503 passed complete push/PR runs 39516617998/
  39516623494, real SQL, Vercel and hosted proof; receipt PR256 issuecomment-6304488154.
  The new Dashboard checkpoint needs its own postflight receipt. No production
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

1. Complete six remaining textured models and artist-review all four candidates and collection consistency.
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

Public assets total 10,447,116 bytes, only 38,644 bytes below the unchanged 10 MiB
cap. Later refinements must recover space through intentional optimization.

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

Client/account contracts passed. Local Docker remained unavailable, but disposable
GitHub CI subsequently replayed four migrations and passed 63 SQL assertions twice
on both events, with lint/advisors and cleanup. This supersedes the earlier missing
isolated-SQL proof, not the open hosted API/account/backup gates. Zero advisor
notices on the empty cloud candidate still do not prove owner isolation. No cloud schema,
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

That checkpoint established two textured candidates, not final photorealism approval.
The app still defaults to the reference artwork, and its financial/scenario/layout
code was not changed. The prior 2b19284 checkpoint passed both hosted CI jobs and
Vercel; the new candidate must receive its own exact-head receipt before release.
See `docs/vault-refinement-contract-2026-10-20.md` and the new evidence folder.

## House Refinement

The House now preserves the original limestone/roof/window/wood/forecourt identity
in a textured mesh. Six asset tests cover provenance, real apertures, retained-wall
blockers, roof/connecting-wall rays, a clear garage approach and normalized budgets.
Independent read-only review findings were reproduced, corrected and cleared on
the final artifact. The standing1.25MiB cap was retained after an oversized early
candidate failed. All ten desktop/375px viewers and the new House turn pass; nine
unchanged videos were rechecked, not rebuilt. Camera/studio/timing, finances and
saved inputs are unchanged. See the House contract and its evidence folder.

At the House checkpoint, three textured candidates were not three final art approvals. Economical foliage,
illustrative interiors, approximate maps and poster/model differences remain.
The previous14ad261 head passed both full CI runs, SQL, Vercel and hosted checks;
receipt: PR256 issuecomment-6303443438. This House report is preflight and requires
new exact-head checks before any release. No production promotion occurred.

## Land Refinement

The Land preserves the original cutaway parcel, pond, winding path, four survey
stakes and three broad-canopy trees. A shared analytic height field grounds actual
geometry; connected curved branches carry individual folded leaf cards. Irregular
layered faces include embedded roots/stones and a closed underside. Eight embedded
maps fit a 709,260-byte model; original meadow/leaf sources and briefs are retained.

Nine tests inspect hashes/PBR, terrain/pond/path contact, stakes/trees, cut faces,
branch connectivity, lower-face winding and locked budget rejection. Deliberate
in-memory branch detachment, face reversal and guard removal are rejected. Observed
red cases and independent review clearance are retained in the evidence folder.
The collection cap was not raised after richer intermediate builds failed.

All ten desktop/375px hero viewers and seven local routes pass. Land's 1080p
nine-second HyperFrames turn was rebuilt; nine unchanged turns were rechecked.
Full media validation and 27 fresh stills pass. Other nine model bytes/records,
camera/studio/timing, calculations, saved scenarios and dependencies are unchanged.

This is four textured candidates and six studies, not four final art approvals.
Canopy, water optics, layers and lighting remain illustrative and differ from the
poster. See `docs/land-refinement-contract-2026-10-20.md`. This report is local
preflight: require both new exact-head full CI runs, real SQL, Vercel and hosted
browser proof, recorded in a subsequent PR receipt. No production promotion.

Desktop package: `C:/Users/IslandDevCrew/Desktop/InterestShield-Hero-Collection-2026-10-20`

Branch: `codex/restoration/asset-heroes`.
Draft: https://github.com/Navigata1/velocity-banking-mvp-v2/pull/256
The original restoration checkpoint was pushed in commits 382f042, 474f5cf and 24d238e.
No production deployment was made. July mission state is archived in
`ops/mission/history/july-2026-state.json`; October phases are now active.

## Dashboard Estimate And Editor Correction

The House example's $51/day total with $51+$1 components was independent display
rounding, not an incorrect raw sum. It now shows `Est. $51.50/day`, with debt
$50.75/day and LOC $0.75/day described separately. Positive amounts below one cent
stay distinct from zero, assumptions disclose independent rounding, and invalid
numeric overflow asks for review. Four vitals, raw fields and tone thresholds stay
unchanged. No hidden rounding residual is assigned to an individual debt.

Visual QA then exposed an existing Dashboard editor issue: a 100-million mortgage
became 10 million after a real no-op Enter in an isolated fixture. All seven
currency fields now retain a larger current imported value using the established
Portfolio pattern. Desktop/mobile tests exercise no-op edits for balances,
minimum, LOC limit, income, expenses and chunk, then compare saved inputs.

The standing browser gate has 12 cases and retains failure artifacts. Eleven new
regressions bring the total to340; financial reference outcomes remain unchanged.
Independent scoped reviews cleared display/overflow and editor/harness changes.
This is local preflight; final exact-head hosted proof is mandatory. It does not
complete shared scenario ownership, dashboard/native Portfolio scope, actual
lender/calendars or native-device/release work. See
`docs/dashboard-display-contract-2026-10-20.md` and its evidence folder.

Approved recurring improvement runs are scheduled every four hours in this chat
under `interestshield-production-improvements`. They must make focused verified
changes, preserve the original identity, and push to the draft without auto-merging.
