# InterestShield 2026 Audit

Audit date: 2026-06-08

Source inspected: `Navigata1/velocity-banking-mvp-v2`
Deployed app smoke tested: `https://web-islanddevcrew.vercel.app`
Local app smoke tested: `apps/web` at `http://localhost:5000`

## Executive Summary

InterestShield has a strong product premise and a working Next.js MVP. The public deployment renders the main routes and the local source builds successfully. The app is not yet ready to be treated as a trusted financial calculator because several engines disagree with each other, important LOC interest is omitted in one simulator path, negative cash-flow cases can produce nonsensical balances, and there are no unit tests around the core math.

The product should move from "demo simulator" to "verified educational calculator" in phases:

1. Stabilize calculation correctness and test coverage.
2. Unify dashboard, simulator, portfolio, and vault around one engine.
3. Fix mobile and onboarding blockers.
4. Add backend only after the domain model is clean.
5. Then overhaul visuals, 3D/algorithmic art, Remotion/HyperFrames assets, and Expo portability.

## Smoke Test Results

### Local Build And Checks

- `npm ci`: passed.
- `npm run build`: passed. Next.js prerendered `/`, `/_not-found`, `/cockpit`, `/learn`, `/portfolio`, `/settings`, `/simulator`, and `/vault`.
- `npm run lint`: failed with 48 problems: 30 errors and 18 warnings.
- `npm audit`: 7 vulnerabilities: 3 moderate and 4 high.
- No test script existed in `apps/web/package.json` before the repair pass.
- No Supabase client, backend API routes, or environment files were present.
- Persistence is currently client-side Zustand/localStorage.

### Repair Pass 1: Math Guardrails

Local source repairs completed on 2026-06-08:

- Added `npm test` with focused engine regression coverage in `apps/web/scripts/engine-regression-tests.cjs`.
- `simulateMultiDebt` now tracks LOC interest and includes it in velocity `totalInterestPaid`.
- `simulateVelocity` no longer deploys negative LOC chunks when cash flow is zero or negative.
- `simulateBaseline` and the extra-payment path now return explicit invalid payoff status when the payment does not cover first-month interest.
- `simulatePortfolio` now clones debt inputs before running, preventing promo terms from being mutated between runs.

Post-repair verification:

- `npm test`: passed, 4 regression tests.
- `npm run build`: passed.
- `npm run lint`: still fails, now with 46 problems: 28 errors and 18 warnings. Remaining items are React/Next lint readiness, unused variables, and explicit typing cleanup.

### Repair Pass 2: Dashboard Engine Alignment

Local source repairs completed on 2026-06-08:

- Added regression coverage proving dashboard payoff helpers match the canonical single-debt engine.
- Replaced `financial-store.getBaselinePayoff` term-based amortization shortcut with `simulateBaseline`.
- Replaced `financial-store.getVelocityPayoff` simplified chunk math with `simulateVelocity`.
- Preserved the dashboard helper return shape while adding optional invalid-plan flags for the next UI pass.

Post-repair verification:

- `npm test`: passed, 5 regression tests.
- `npm run build`: passed.
- `npm run lint`: still fails with 46 problems: 28 errors and 18 warnings. No new lint categories were introduced by this pass.
- Local browser smoke at `http://localhost:5000`: `/`, `/cockpit`, `/simulator`, `/portfolio`, and `/vault` rendered with no captured console errors.

### Repair Pass 3: Simulator Strategy Alignment

Local source repairs completed on 2026-06-08:

- Added `compareSingleDebtStrategies` so the simulator has one shared single-debt comparison path.
- Removed the simulator's single-debt use of `simulateMultiDebt` for strategy cards.
- Kept the visible strategy comparison aligned with `runSimulation`, so the Velocity card no longer reports a different payoff from the main velocity result.
- Trimmed stale simulator imports while touching the page.

Post-repair verification:

- `npm test`: passed, 6 regression tests.
- `npm run build`: passed.
- `npm run lint`: still fails with 41 problems: 28 errors and 13 warnings. The remaining failures are the broader React/Next lint readiness items and unrelated typing cleanup.
- Local browser smoke at `http://localhost:5000/simulator`: strategy section rendered Traditional, Snowball, Avalanche, and Velocity cards with no captured console errors.

### Repair Pass 4: React/Next Readiness

Local source repairs completed on 2026-06-08:

- Added `useIsClient` to replace repeated `setMounted(true)` hydration gates without state-in-effect lint failures.
- Added `useClientNow` for stable client clock reads in preview rendering.
- Removed render-time `Date.now()` / `Math.random()` calls from intro and preview surfaces.
- Cleaned explicit `any` use in preview/portfolio strip components.
- Replaced internal app `<a>` links and the sidebar logo image with Next components where lint required it.
- Removed stale imports and unused local values uncovered during the cleanup.

Post-repair verification:

- `npm run lint`: passed with 0 problems.
- `npm test`: passed, 6 regression tests.
- `npm run build`: passed.
- Local browser smoke at `http://localhost:5000`: `/`, `/simulator`, `/cockpit`, `/learn`, `/portfolio`, `/settings`, and `/vault` rendered with no captured console errors.

### Repair Pass 5: Vault/Mortgage Accuracy

Local source repairs completed on 2026-06-08:

- Added regression coverage for mortgage assumption warnings and actual-payment payoff comparisons.
- `calculateMortgageAnalysis` now returns warning objects when the current balance exceeds the original financed amount or when the current payment does not cover monthly interest.
- `compareMortgageStrategies` now simulates the standard mortgage path with the entered monthly payment instead of substituting an ideal amortized payment.
- The Vault page now surfaces mortgage assumption warnings before showing strategy savings.

Post-repair verification:

- `npm test`: passed, 8 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed.
- Local browser smoke at `http://localhost:5000/vault`: assumption warning rendered, strategy values settled to Standard 333 months, Bi-Weekly 273 months, Extra 167 months, and Velocity 114 months with no captured console errors.

### Repair Pass 6: Mobile First-Run Reachability

Local source repairs completed on 2026-06-08:

- Constrained the intro modal to the mobile viewport and made its body scrollable when content is taller than the device.
- Reduced the intro animation height on mobile so Skip and Let's Go are visible without scrolling at 390x844.
- Added safer small-screen containment to the pre-app preview overlay.
- Rebuilt the mobile bottom nav as an eight-slot icon grid with aria labels so all routes plus Guardian fit inside the viewport.

Post-repair verification:

- `npm test`: passed, 8 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed.
- Local browser smoke at 390x844: intro close, pause, Skip, and Let's Go controls were fully visible; the modal measured 803px tall inside an 844px viewport; all eight mobile nav targets were inside the viewport with no horizontal overflow; dashboard nav click routed to `/`; no captured console errors.
- Local browser smoke at desktop default viewport: `/` rendered with navigation visible and no captured console errors.

### Repair Pass 7: Guardian Plain-Text Responses

Local source repairs completed on 2026-06-08:

- Added regression coverage for Guardian Teacher Mode output so plain chat responses do not include markdown emphasis markers.
- Removed `**...**` emphasis from Teacher Mode next-step strings.

Post-repair verification:

- `npm test`: passed, 9 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed.
- Local browser smoke on `/`: Guardian chat opened, answered "How do I improve cash flow?", rendered "Open Simulator" without `**` markers, and produced no captured console errors.

### Repair Pass 8: Portfolio Mobile Debt Cards

Local source repairs completed on 2026-06-08:

- Replaced the mobile debt table surface with stacked editable debt cards.
- Kept the full table available at tablet/desktop widths.
- Preserved the same editable controls for debt name, category, balance, APR, minimum, payment source, promo, and remove.
- Added a stable `data-testid` hook for mobile debt-card browser checks.

Post-repair verification:

- `npm test`: passed, 9 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed.
- Local browser smoke at 390x844: 4 mobile debt cards rendered, the desktop table was hidden, the debt section measured 341px client width / 341px scroll width, zero cards overflowed, and no console errors were captured.
- Local browser smoke at 1280x720: the desktop table rendered, mobile cards were hidden, and no console errors were captured.

### Repair Pass 9: Four-Vitals Dashboard

Local source repairs completed on 2026-06-08:

- Replaced the busy dashboard core with the four trusted vitals from the product playbook: Cash Flow, Interest Burn, Debt-Free ETA, and Next Move.
- Added a pure `dashboard-model` module so first-screen dashboard status, warnings, and vitals are regression-testable.
- Added assumptions disclosures to each calculated vital.
- Added invalid/unstable plan handling so the dashboard shows "Stabilize first" instead of a debt-free ETA when cash flow is not positive or the velocity payoff is invalid.
- Added explicit dashboard warnings for cash flow <= 0 and LOC utilization above 80%.
- Kept editable income, expenses, chunk, active debt, and LOC controls on the dashboard without adding banking integrations.
- Updated the dashboard footer to the playbook copy: "Educational tool. Not financial advice."

Post-repair verification:

- `npm test`: passed, 10 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.
- Chrome extension smoke at `http://localhost:5000/`: 4 dashboard vitals rendered with labels `Cash Flow|Interest Burn|Debt-Free ETA|Next Move`, the Money Loop section rendered, the assumptions input area rendered, the footer rendered, and no console errors were captured.
- In-app Browser mobile viewport smoke for this pass was not completed because the Browser viewport/navigation control channel timed out after the prior Portfolio smoke. The Portfolio mobile repair itself was already verified in Browser at 390x844.

### Repair Pass 10: Ungated Dashboard Startup

Local source repairs completed on 2026-06-08:

- Changed app startup defaults so the dashboard opens first instead of showing the intro modal.
- Added a migration for existing persisted app state so old first-run state does not keep blocking the dashboard.
- Kept the intro available from Settings as an explicit replay action.
- Changed the snapshot preview so it no longer appears as an immediate first-load overlay.
- Updated Settings copy to explain that the dashboard opens first by default.

Post-repair verification:

- `npm test`: passed, 11 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed.
- Chrome extension smoke at `http://localhost:5000/`: 4 dashboard vitals rendered, the Money Loop section rendered, intro overlay was not visible, preview overlay was not visible, footer rendered, and no console errors were captured.

### Repair Pass 11: Simulator Event Ledger

Local source repairs completed on 2026-06-08:

- Added a typed monthly event ledger to the canonical single-debt velocity simulation.
- Each velocity month can now expose debt interest, LOC chunk draw, debt payment, income-to-LOC, expenses-from-LOC, LOC interest, and cash-flow paydown events.
- Added regression coverage for the month-one event sequence and LOC interest event amount.
- Added a "Money Loop Timeline" panel to `/simulator` fed directly by the engine event ledger.
- Made LOC interest visible in the simulator timeline instead of hiding it inside total-interest summaries.

Post-repair verification:

- `npm test`: passed, 12 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed.
- Chrome extension smoke at `http://localhost:5000/simulator`: Money Loop Timeline rendered, all expected event labels rendered, "LOC interest visible" rendered, and no console errors were captured.

### Repair Pass 12: Simulator Invalid-Claim Guard

Local source repairs completed on 2026-06-08:

- Added a simulator presentation model that preserves invalid payoff status instead of turning invalid strategy results into confident `0 mo` claims.
- Added regression coverage for the negative-cash-flow velocity strategy card state.
- Updated strategy cards so invalid strategies show "Review inputs" and "Not projected".
- Excluded invalid and no-savings strategies from the "Best" badge and "Best Strategy" summary.
- Replaced animated strategy-card financial values with stable final text so cards do not briefly expose `0 mo` while CountUp animates.

Post-repair verification:

- `npm test`: passed, 13 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed.
- Chrome extension smoke at `http://localhost:5000/simulator` after editing expenses above income: "Stabilize First" rendered, Velocity showed "Review inputs" and "Not projected", no `0 mo` appeared in Strategy Comparison, no "Best" badge rendered, no "Best Strategy" summary rendered, and no console errors were captured.

### Repair Pass 13: Portfolio Strategy Rationale

Local source repairs completed on 2026-06-08:

- Added `DebtPriorityRationale` output to the Portfolio engine, keyed by debt id.
- Each debt now exposes rank, current target status, cash-flow unlock, daily interest burn, promo urgency, and LOC utilization caution when relevant.
- Added regression coverage proving Portfolio rationale is emitted without moving the explanation math into the page.
- Rendered rationale in both mobile debt cards and the desktop table.
- Kept the copy educational and assumption-labeled: it explains why a debt is prioritized without promising results.

Post-repair verification:

- `npm test`: passed, 14 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.
- Chrome extension smoke at `http://localhost:5127/portfolio`: Portfolio heading rendered, 8 rationale blocks rendered across mobile/desktop DOM surfaces, cash-flow unlock, daily burn, LOC utilization, priority/target labels rendered, no error overlay appeared, and no console errors were captured.

### Repair Pass 14: LOC Over-Limit Guard

Local source repairs completed on 2026-06-08:

- Added `loc-overlimit` as an explicit payoff failure reason.
- `simulateVelocity` now refuses velocity plans when the LOC balance is at or above the LOC limit.
- Suppressed velocity interest/month savings whenever baseline or velocity payoff is invalid.
- Added regression coverage proving an over-limit LOC cannot produce a LOC chunk draw.
- Updated simulator strategy-card labels so over-limit LOC cases render as "LOC over limit" instead of a generic review state.
- Wired the simulator route to the strategy-card presentation model so invalid reasons survive to the visible UI.
- Restored the simulator strategy symbols through the presentation model so cards do not render placeholder words such as `BoltVelocity`.
- Added the same over-limit LOC guard to Vault mortgage velocity comparisons, preventing invalid mortgage velocity savings claims.
- Updated Vault strategy cards so invalid velocity projections show "Review inputs", "Not projected", and "LOC over limit" instead of `0 mo`.
- Replaced Vault strategy-card month CountUp values with stable text so valid strategies do not briefly render as `0 mo`.

Post-repair verification:

- `npm test`: passed, 16 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.
- Chrome extension smoke at `http://localhost:5128/simulator` with LOC limit `$10,000`, balance `$10,500`, and chunk `$5,000`: High LOC Utilization rendered, Velocity showed "Review inputs" and "LOC over limit", the timeline showed "Timeline unavailable", no LOC chunk draw rendered, no error overlay appeared, and no console errors were captured.
- Chrome extension smoke at `http://localhost:5129/simulator`: strategy cards rendered visual symbols, no placeholder icon words appeared, no error overlay appeared, and no console errors were captured.
- Chrome extension smoke at `http://localhost:5131/vault` with LOC limit `$10,000` and balance `$10,500`: Vault strategy step rendered stable month values for valid strategies, Velocity showed "Review inputs", "Not projected", and "LOC over limit", the comparison bar showed "Velocity Review", no error overlay appeared, and no console errors were captured.

### Repair Pass 15: Shared Money Loop Engine

Local source repairs completed on 2026-06-08:

- Added `apps/web/src/engine/money-loop.ts` as a focused shared LOC chunk payoff engine.
- The shared engine emits the canonical Money Loop event ledger: debt interest, LOC chunk draw, debt payment, income-to-LOC, expenses-from-LOC, LOC interest, and cash-flow paydown.
- Added regression coverage proving the shared engine emits the canonical month-one event sequence and LOC interest event amount.
- Refactored single-debt `simulateVelocity` to use the shared engine while preserving its existing public return shape for dashboard and simulator consumers.
- Refactored Vault mortgage Velocity comparisons to use the shared engine with Vault's existing LOC average-daily-balance assumptions.
- Kept the prior over-limit LOC guard behavior intact through the shared engine.

Post-repair verification:

- `npm test`: passed, 18 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.
- Chrome extension smoke at `http://localhost:5132/simulator`: Strategy Comparison and Money Loop Timeline rendered, all expected event labels rendered, "LOC interest visible" rendered, no error overlay appeared, and no console errors were captured.
- Chrome extension smoke at `http://localhost:5132/vault`: Vault strategy step rendered stable strategy months, Velocity rendered `114 mo`, the comparison bar rendered, no `0 mo` strategy-card flash was detected, no error overlay appeared, and no console errors were captured.

### Repair Pass 16: Multi-Debt Money Loop Ledger

Local source repairs completed on 2026-06-08:

- Extracted a reusable one-month Money Loop step from the shared payoff engine.
- Refactored `simulateMoneyLoopPayoff` to use the one-month step while preserving the existing shared-engine behavior.
- Refactored multi-debt Velocity simulation to use the same one-month step for LOC chunk draws, debt interest, debt payment, income-to-LOC, expenses-from-LOC, LOC interest, and cash-flow paydown.
- Added `moneyLoopMonthlyData` to multi-debt results so Velocity calculations can expose the same transparent event ledger as single-debt simulations.
- Kept multi-debt LOC interest included in `totalInterestPaid`.

Post-repair verification:

- `npm test`: passed, 19 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.
- No browser smoke was needed for this pass because `simulateMultiDebt` is not currently a directly route-visible workflow.

### Repair Pass 17: Portfolio Velocity Assumption Labels

Local source repairs completed on 2026-06-08:

- Added `assumptions` to Portfolio simulation results.
- Portfolio Velocity Mode now plainly labels itself as a ranking planner based on cash-flow unlock, daily interest burn, and promo urgency.
- Portfolio Velocity Mode now explicitly states that it does not simulate LOC chunk draws or LOC interest.
- Rendered the Portfolio assumptions block near warnings so payoff totals are qualified before users trust the numbers.

Post-repair verification:

- `npm test`: passed, 20 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.
- Chrome extension smoke at `http://localhost:5133/portfolio`: Portfolio rendered, the assumptions block was visible, the Velocity scope note included the LOC chunk/interest limitation, no error overlay appeared, and no console errors were captured.

### Repair Pass 18: CountUp Zero-Placeholder Guard

Local source repairs completed on 2026-06-08:

- Updated the shared `CountUp` component to initialize its motion value from the supplied value instead of zero.
- Updated the shared `CountUp` component to initialize visible text from the supplied value instead of rendering a `$0` placeholder.
- Preserved change animation for later value updates while avoiding misleading first-paint financial values.
- Added regression coverage for the CountUp startup behavior.

Post-repair verification:

- `npm test`: passed, 21 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 19: Portfolio Money Loop LOC Simulation

Local source repairs completed on 2026-06-08:

- Added optional LOC and chunk inputs to the Portfolio simulation engine.
- Portfolio Velocity single-lane mode now uses the shared Money Loop monthly step when usable LOC inputs are present.
- Portfolio results now include `locInterestPaid` and `moneyLoopMonthlyData`.
- Portfolio total interest now includes LOC interest when the Money Loop simulation is active.
- Portfolio route now exposes editable LOC limit, LOC balance, LOC APR, and Velocity chunk controls.
- Portfolio summary now shows an estimated LOC interest total and whether the Money Loop ledger is active.
- Kept the prior ranking-planner assumption label for Portfolio cases that do not have usable LOC inputs or are using split focus mode.

Post-repair verification:

- `npm test`: passed, 23 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.
- Chrome extension smoke at `http://localhost:5134/portfolio`: LOC controls rendered, LOC interest estimate rendered as `$11`, "Money Loop ledger active" rendered, the assumption note stated that Portfolio simulates LOC chunk draws and LOC interest, no error overlay appeared, and no console errors were captured.

### Repair Pass 20: Vault Invalid Freedom-Path Guard

Local source repairs completed on 2026-06-08:

- Added a Vault presentation model for the freedom-path impact section.
- The freedom-path model now blocks interest-saved, years-of-freedom, timeline, and portfolio-value claims when Velocity payoff is invalid.
- Vault Step 5 now shows "Not projected", "Review inputs", and "Velocity path needs usable inputs first" instead of deriving fake results from `0` Velocity months.
- Added regression coverage for invalid Velocity freedom-path impact claims.

Post-repair verification:

- `npm test`: passed, 24 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.
- Chrome extension smoke at `http://localhost:5135/vault` after setting LOC balance above limit through the Dashboard UI: Vault Step 5 rendered "Not projected", "Review inputs", and "Velocity path needs usable inputs first"; no fake "Free at 32" claim rendered, no error overlay appeared, and no console errors were captured.

### Repair Pass 21: Vault Coach-Tone Copy

Local source repairs completed on 2026-06-08:

- Replaced loaded Vault defaults such as "death pledge", "banks extract", "bank didn't tell you", and "amortization trap" with calmer coach-tone copy.
- The generational section now frames mortgage interest as an estimate of patterns, assumptions, and choices.
- The amortization step now uses "Amortization Pattern" and explains that front-loaded interest slows equity.
- Added regression coverage to keep banned fear-language phrases out of Vault's visible default copy.

Post-repair verification:

- `npm test`: passed, 25 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.
- Chrome extension smoke at `http://localhost:5136/vault`: the generational step rendered "How mortgage interest can echo across generations", "Estimated interest across 3 generations", and "A calm estimate of interest patterns, assumptions, and choices"; "death pledge", "banks extract", "bank didn't tell", and "amortization trap" did not render; no error overlay appeared, and no console errors were captured.

### Repair Pass 22: Dashboard Money Loop Artifact Rail

Local source repairs completed on 2026-06-08:

- Added a five-part Money Loop artifact model to the dashboard presentation layer: Income, LOC, Expenses, Cash Flow, and Principal.
- Kept the dashboard to the required four vitals: Cash Flow, Interest Burn, Debt-Free ETA, and Next Move.
- Replaced the text-only Money Loop step grid with a rendered artifact rail that uses subtle 3D token motion, deterministic fill levels, and the existing tone system.
- Added internal horizontal rail scrolling so artifact cards keep readable dimensions inside narrow dashboard panels.
- Fixed mobile width containment with `min-w-0` so the rail scrolls inside its frame instead of widening the page.
- Added regression coverage for artifact model shape, stable smoke-test hooks, internal rail scrolling, and mobile width containment.

Post-repair verification:

- `npm test`: passed, 30 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.
- In-app browser desktop smoke at `http://localhost:5137/`: 4 dashboard vitals rendered, 5 artifact nodes rendered, the artifact rail rendered with internal scroll, footer rendered as "Educational tool. Not financial advice.", no body-level horizontal overflow was detected, and no console errors were captured.
- In-app browser mobile smoke at 390x844: 4 dashboard vitals rendered, 5 artifact nodes rendered, the artifact rail retained internal scroll, the page scroll width matched the viewport width, and no console errors were captured.
- Chrome extension smoke at `http://localhost:5137/`: the local route title loaded and no console errors were captured, but the extension-side DOM query returned 0 dashboard nodes on that first pass. Treat the Chrome pass as partial/inconclusive for this slice; the in-app browser smoke above is the authoritative browser verification.

### Repair Pass 23: Money Loop Chunk-Cap Edge Case

Local source repairs completed on 2026-06-08:

- Added known amortization fixture coverage for a $100,000, 30-year, 6% loan.
- Added zero-APR baseline payoff coverage so principal-only payoff remains explicit.
- Added payment-equal-to-interest coverage so the baseline engine does not claim a payoff date when no principal is being reduced.
- Added shared Money Loop coverage for the case where the requested LOC chunk is larger than the remaining principal.
- Fixed the shared Money Loop monthly step so the LOC chunk draw is capped to the actual remaining debt principal before updating the LOC balance and ledger event.
- Because the simulator, portfolio single-lane Velocity mode, and Vault mortgage Velocity path share this Money Loop engine, the cap flows through those surfaces instead of being patched route-by-route.

Post-repair verification:

- `npm test`: passed, 34 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 24: Portfolio Invalid Minimum-Coverage Guard

Local source repairs completed on 2026-06-08:

- Added Portfolio simulation validity output: `isPayoffPossible` and a failure reason.
- Added regression coverage for the case where monthly cash flow cannot cover the portfolio's total minimum payments.
- The Portfolio engine now returns a non-projected result when cash flow is negative or cannot cover minimum payments, instead of simulating all minimums as if the entered cash flow could pay them.
- The Portfolio route now shows "Review inputs", "Plan needs review", and "Not projected" for invalid projections.
- The Portfolio route now hides payoff order claims unless the projection is valid.
- Existing warnings and debt rationales remain available so the page can coach the user without making a false payoff claim.

Post-repair verification:

- `npm test`: passed, 36 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 25: Portfolio Promo APR Expiration

Local source repairs completed on 2026-06-08:

- Added regression coverage proving a Portfolio promo APR lasts for the full entered `monthsRemaining` window before post-intro APR starts.
- Fixed the Portfolio APR helper so cloned promo state uses the intro APR while `monthsRemaining > 0`, then switches to the post-intro APR after the monthly promo countdown reaches zero.
- Removed the prior double-count condition that compared the absolute simulation month against the shrinking `monthsRemaining` value.
- Preserved the input-purity repair from Repair Pass 1: the user's original promo object is still not mutated by simulation.

Post-repair verification:

- `npm test`: passed, 37 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 26: Portfolio Payment-Below-Interest Guard

Local source repairs completed on 2026-06-08:

- Added regression coverage for a Portfolio debt whose required payment does not cover first-month interest.
- Extended Portfolio validity output with `payment-below-interest`.
- The Portfolio engine now returns a non-projected result when any active debt minimum payment is below estimated monthly interest, instead of letting unpaid interest disappear from the plan.
- Portfolio warnings now name the debt and monthly interest gap before payoff estimates are trusted.
- The existing Portfolio route invalid-projection guard from Repair Pass 24 displays "Review inputs", "Plan needs review", and "Not projected" for this case.

Post-repair verification:

- `npm test`: passed, 38 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 27: Portfolio Split-Focus Extra Allocation

Local source repairs completed on 2026-06-08:

- Added regression coverage for Portfolio split-focus mode proving the full available extra payment is assigned across both targets.
- Fixed split-focus allocation so the second target receives its ratio from the original extra-payment pool, not from the already-reduced remainder.
- Added split allocation rollover so unused target capacity can move to the other split target before any available extra is left idle.
- Clamped the split ratio inside the engine so unusual stored values cannot create negative or over-100% extra-payment shares.

Post-repair verification:

- `npm test`: passed, 39 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 28: Money Loop Partial LOC-Credit Chunk

Local source repairs completed on 2026-06-08:

- Added regression coverage for a Money Loop chunk request that is larger than the remaining available LOC credit.
- Fixed the shared Money Loop monthly step so effective chunk draw is capped by requested chunk, remaining principal, and available LOC credit.
- Replaced the prior all-or-nothing available-credit check with a usable-credit cap, so the engine can model a partial chunk instead of silently skipping it.
- Because simulator, portfolio single-lane Velocity mode, and Vault mortgage Velocity use the shared Money Loop step, this partial-credit behavior now flows through those surfaces.

Post-repair verification:

- `npm test`: passed, 40 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 29: Money Loop Under-Interest Guard

Local source repairs completed on 2026-06-08:

- Added regression coverage for shared Money Loop payoff inputs where the regular debt payment is below first-month interest.
- The shared Money Loop payoff wrapper now returns a non-projected result before producing monthly ledger data when the debt payment cannot cover interest.
- This keeps single-debt Velocity, dashboard ETA helpers, and Vault mortgage Velocity from showing a long timeline for an unstable under-interest input.
- The guard uses the existing `payment-below-interest` failure reason so simulator and dashboard presentation models can continue to show review-state copy.

Post-repair verification:

- `npm test`: passed, 41 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 30: Multi-Debt Velocity Invalid Projection Guard

Local source repairs completed on 2026-06-08:

- Added regression coverage for multi-debt Velocity when the LOC balance is at or above its limit.
- Added regression coverage for multi-debt Velocity when a debt minimum payment does not cover first-month interest.
- Extended multi-debt results with `isPayoffPossible` and `failureReason` so callers can distinguish trusted projections from review states.
- Multi-debt Velocity now returns a non-projected result for over-limit LOC inputs instead of returning payoff months, interest savings, or Money Loop ledger data.
- Multi-debt simulations now return a non-projected result when any active debt's minimum payment is below estimated monthly interest, avoiding the prior behavior where unpaid interest could disappear from the simulated balance.
- Existing warnings remain available so the UI can coach the user without making a false payoff claim.

Post-repair verification:

- `npm test`: passed, 43 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 31: Multi-Debt Minimum-Coverage Guard

Local source repairs completed on 2026-06-08:

- Added regression coverage for multi-debt Velocity when positive cash flow is still below required minimum payments.
- Added `cashflow-below-minimums` to payoff failure reasons and warning types.
- Multi-debt simulations now return a non-projected result when cash flow cannot cover total minimum payments instead of assuming all minimums are paid anyway.
- Simulator strategy presentation now has a plain label for `cashflow-below-minimums`: "Cash flow below minimums".
- Existing warning output now names the cash-flow/minimum-payment gap so the UI can coach the user before payoff estimates are trusted.

Post-repair verification:

- `npm test`: passed, 44 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 32: Vault Extra-Payment Cash-Flow Cap

Local source repairs completed on 2026-06-08:

- Added regression coverage for the Vault mortgage extra-payment strategy when cash flow is not positive.
- Fixed the extra-payment strategy so it no longer invents a $200/mo extra payment when cash flow is zero or negative.
- Extra mortgage payment estimates are now capped to actual positive cash flow while still respecting the existing $1,000 planning ceiling.
- This keeps Vault from showing extra-payment interest savings that the user's stated monthly cash flow cannot fund.

Post-repair verification:

- `npm test`: passed, 45 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 33: Vault Biweekly Cash-Flow Cap

Local source repairs completed on 2026-06-08:

- Added regression coverage for the Vault mortgage biweekly strategy when cash flow is not positive.
- Fixed the biweekly strategy so it no longer assumes the user can fund the extra annual payment when monthly cash flow is zero or negative.
- The biweekly monthly-equivalent extra is now capped to actual positive cash flow and cannot exceed the standard one-extra-payment-per-year equivalent.
- This keeps Vault from showing biweekly interest savings that the user's stated monthly cash flow cannot fund.

Post-repair verification:

- `npm test`: passed, 46 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 34: Money Loop LOC Recovery Payoff Window

Local source repairs completed on 2026-06-08:

- Added regression coverage for a shared Money Loop payoff where the target debt is cleared by a LOC chunk before the LOC balance is fully recovered.
- Fixed the shared Money Loop payoff wrapper so payoff months continue until both the target debt and LOC balance are cleared.
- The shared Velocity path now includes the LOC recovery window in debt-free ETA calculations instead of stopping when the original lender balance reaches zero.
- Because dashboard Velocity helpers and Vault mortgage Velocity use this shared wrapper, their payoff estimates now inherit the more conservative debt-free timing.

Post-repair verification:

- `npm test`: passed, 47 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 35: Single-Debt Velocity Cash-Flow Allocation

Local source repairs completed on 2026-06-08:

- Added regression coverage proving single-debt Velocity treats the regular debt payment as a cash outflow before applying LOC recovery.
- Added regression coverage for single-debt Velocity when monthly cash flow cannot cover the regular target debt payment.
- Fixed the single-debt Velocity caller so `cashFlowPaydown` is income minus expenses minus the regular debt payment, instead of income minus expenses while also paying the debt separately.
- Single-debt Velocity now routes the regular debt payment through the LOC expense side of the average-daily-balance estimate.
- Single-debt Velocity now returns a non-projected result with `cashflow-below-minimums` when the target payment cannot be funded from stated cash flow.

Post-repair verification:

- `npm test`: passed, 49 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 36: Multi-Debt Velocity Cash-Flow Allocation

Local source repairs completed on 2026-06-08:

- Added regression coverage proving multi-debt Velocity treats the focus debt payment as a cash outflow before applying LOC recovery.
- Fixed the multi-debt Velocity Money Loop call so `cashFlowPaydown` is reduced by the actual focus payment and other active debt minimum payments.
- Multi-debt Velocity now routes focus and non-focus debt payments through the LOC expense side of the average-daily-balance estimate.
- The focus payment is capped to the remaining balance plus interest before it is used in LOC cash-flow allocation, so final-month excess cash is not incorrectly treated as debt outflow.
- This keeps multi-debt Velocity from double-counting the same monthly cash as both debt payment and LOC recovery.

Post-repair verification:

- `npm test`: passed, 50 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 37: Portfolio Velocity Cash-Flow Allocation

Local source repairs completed on 2026-06-08:

- Added regression coverage proving Portfolio single-lane Velocity treats the target debt payment as a cash outflow before applying LOC recovery.
- Fixed the Portfolio Money Loop call so `cashFlowPaydown` is reduced by the actual target payment and other active debt minimum payments.
- Portfolio single-lane Velocity now routes target and non-target debt payments through the LOC expense side of the average-daily-balance estimate.
- This keeps Portfolio Velocity from double-counting the same monthly cash as both debt payment and LOC recovery.
- The existing Portfolio assumptions note still labels that this is a shared Money Loop average-daily-balance estimate, not lender-specific advice.

Post-repair verification:

- `npm test`: passed, 51 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed after allowing Next.js to fetch configured Google font assets.

### Repair Pass 38: Vault Mortgage Velocity Cash-Flow Allocation

Local source repairs completed on 2026-06-08:

- Added regression coverage proving Vault mortgage Velocity refuses payoff projections when cash flow cannot cover the required mortgage payment.
- Fixed the Vault mortgage Velocity strategy so the mortgage payment is treated as a real cash outflow before LOC recovery is applied.
- Mortgage Velocity chunk sizing now uses only the leftover LOC recovery cash flow after the mortgage payment, instead of using the full pre-mortgage surplus.
- Vault now labels this invalid state as "Cash flow below payment" instead of falling back to a generic input-review message.
- This keeps the Vault from double-counting the same monthly cash as both mortgage payment and LOC recovery.

Post-repair verification:

- `npm test`: passed, 52 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build.

### Repair Pass 39: Multi-Debt And Portfolio LOC Recovery Windows

Local source repairs completed on 2026-06-08:

- Added regression coverage proving multi-debt Velocity includes the LOC recovery month after the final target debt is paid.
- Added matching Portfolio Velocity coverage so the user-facing planner also waits for LOC recovery before declaring payoff timing.
- Fixed the multi-debt Velocity loop so it continues while either any debt balance or the velocity LOC balance remains outstanding.
- Fixed Portfolio Velocity to keep simulating LOC-only recovery months after all debts are paid, using the shared Money Loop month engine for LOC interest and event transparency.
- Final payoff validity now includes LOC recovery, not just zero debt balances.

Post-repair verification:

- `npm test`: passed, 54 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build.

### Repair Pass 40: Single-Debt Automatic Chunk Sizing

Local source repairs completed on 2026-06-08:

- Added regression coverage proving single-debt Velocity auto-sizes LOC chunks from recoverable LOC cash flow.
- Fixed the single-debt Velocity engine so automatic chunk sizing subtracts the required debt payment before applying the three-month recovery rule.
- User-entered chunk amounts remain explicit overrides; only the automatic fallback chunk is now more conservative.
- This keeps the simulator from sizing a default chunk from cash that is already needed for the regular debt payment.

Post-repair verification:

- `npm test`: passed, 55 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build.

### Repair Pass 41: Client Hydration Route Smoke

Local source repairs completed on 2026-06-08:

- Local Browser smoke found `/` and `/simulator` rendering the shared navigation/footer but an empty route body after hydration.
- Added regression coverage proving the shared client-mounted hook has an active subscriber notification instead of an inert subscription.
- Fixed `useIsClient` so React receives a post-hydration notification and routes that wait for client mount leave their skeleton state.
- Re-smoked `/` and `/simulator` in the in-app Browser: Dashboard rendered four vitals plus the Money Loop artifact rail, Simulator rendered controls, strategy comparison, and the Money Loop Timeline, and no console errors were captured.
- Re-smoked `/` and `/simulator` in Chrome extension control with the same pass results and no captured console errors.

Post-repair verification:

- `npm test`: passed, 56 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build.

### Repair Pass 42: Core Interaction Smoke

Local source smoke completed on 2026-06-09:

- In-app Browser Dashboard flow: switched from Auto to House and back to Auto, edited monthly income from `$6,500` to `$7,000`, and verified the Cash Flow vital recalculated from `$1,500` to `$2,000` with no captured console errors.
- In-app Browser Simulator flow: edited monthly expenses to `$4,500`, edited Velocity chunk to `$1,500`, verified Cash Flow showed `$2,500/mo`, verified the strategy comparison still rendered, and verified the Money Loop Timeline showed the `$1,500` LOC chunk event with no captured console errors.
- In-app Browser Vault flow: advanced through all Vault steps from "Tell Me About Your Home" to "Your Freedom Path"; the strategy cards appeared on the strategy step and the final freedom path rendered with no captured console errors.
- Chrome extension cross-check: Dashboard domain switching and Vault first-step navigation worked against the same local server with no captured console errors.
- Locator note: Chrome required exact accessible names such as `🏡 House` for the domain tab; broad text filters timed out in one pass even though the DOM was healthy.

Post-smoke verification:

- Local app responded at `http://localhost:5000` with HTTP 200.
- `npm test`: passed, 56 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build.

### Repair Pass 43: Portfolio Identity And Backup Import Safety

Local source repairs completed on 2026-06-09:

- In-app Browser Portfolio smoke confirmed that debt names were present in editable fields, but generic `Remove` controls made debt-specific add/remove flows harder to target and weaker for assistive technology.
- Added debt-specific accessible labels to Portfolio debt name fields and remove buttons on both mobile-card and desktop-table surfaces.
- Re-smoked Portfolio add/remove in the in-app Browser: cleaned prior smoke debts, added a named test debt, verified matching `Debt name for ...` and `Remove ...` labels, removed the test debt, and captured no console errors.
- Added direct Portfolio store backup coverage for export/import round-trip preservation of Money Loop planning inputs: income, expenses, extra payment, LOC, Velocity chunk, strategy, split focus, and debt details.
- Fixed backup import so non-finite money values are rejected before mutating state instead of poisoning calculations with `NaN`.
- In-app Browser Settings smoke confirmed the Data Backup UI, but download events are not supported by that browser surface.
- Chrome extension cross-check confirmed Portfolio labels and Settings backup UI with no captured console errors. Chrome export click hit an extension timing limit, so backup behavior is covered by store regression tests rather than a completed browser download.

Post-repair verification:

- `npm test`: passed, 59 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 44: Guardian And Theme Control Smoke

Local source repairs completed on 2026-06-09:

- In-app Browser Settings smoke confirmed theme switching from Original to Light and back to Original worked visually with no captured console errors.
- Found that Settings theme buttons did not expose selected state, even though the active theme was visually highlighted.
- Added regression coverage requiring theme controls to expose selected and expanded states.
- Added `aria-label` and `aria-pressed` to Settings theme buttons.
- Added `aria-label`, `aria-expanded`, and `aria-haspopup` to the desktop navigation theme trigger, plus `aria-label` and `aria-pressed` to nav theme options.
- In-app Browser Guardian smoke opened the Guardian, submitted "How do I improve cash flow?", confirmed a plain teacher-mode cash-flow answer rendered, and captured no console errors.
- Chrome extension cross-check confirmed Settings theme `aria-pressed` state and Guardian answer rendering with no markdown markers and no captured console errors.

Post-repair verification:

- `npm test`: passed, 60 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 45: Editable Financial Control Labels

Local source repairs completed on 2026-06-09:

- Added regression coverage requiring shared editable financial controls to expose contextual screen-reader labels.
- Added an `ariaLabel` prop to `EditableNumber`; display buttons now announce `Edit <label>, current value <value>`, and edit-mode inputs announce `<label> value`.
- Added contextual labels to the Dashboard's core assumption controls: monthly income, monthly expenses, Velocity chunk amount, active debt balance/APR/minimum payment, and LOC limit/balance/APR.
- In-app Browser smoke verified the Dashboard controls were addressable by contextual labels, the monthly income input exposed `Monthly income value`, editing income updated the visible cash-flow result, and no console errors were captured.
- Chrome extension cross-check confirmed the same Dashboard editable labels rendered on the first screen with no captured console errors.

Post-repair verification:

- `npm test`: passed, 61 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 46: Simulator Editable Control Labels

Local source repairs completed on 2026-06-09:

- Added regression coverage requiring Simulator editable controls to pass contextual screen-reader labels.
- Added contextual labels to Simulator's always-visible controls: monthly income, monthly expenses, active debt balance/APR/monthly payment, LOC limit/APR, and extra payment chunk.
- Added contextual labels to House/Mortgage detail controls: purchase age, purchase price, down payment, original rate, current balance, remaining months, current rate, current monthly payment, extra payment amount, and refinance count.
- In-app Browser smoke verified Simulator labels in Auto mode, opened the monthly expenses editor through its label, confirmed the edit-mode input label, switched to House mode, verified mortgage labels, and captured no console errors.
- Chrome extension cross-check confirmed Simulator labels in Auto and House modes with no captured console errors.

Post-repair verification:

- `npm test`: passed, 62 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 47: Portfolio Editable Control Labels

Local source repairs completed on 2026-06-09:

- Added regression coverage requiring Portfolio editable controls to pass contextual screen-reader labels.
- Added contextual labels to Portfolio plan controls: monthly income, monthly expenses, extra debt payment, LOC limit, LOC balance, LOC APR, and Velocity chunk.
- Added contextual labels to Portfolio debt financial controls on both mobile-card and desktop-table surfaces: balance, APR, and fixed minimum payment.
- Added contextual labels to Add Debt modal financial controls: new debt balance, APR, and minimum payment.
- In-app Browser smoke verified Portfolio labels for plan controls, existing debts, and the Add Debt modal with no captured console errors.
- Chrome extension cross-check verified the same Portfolio labels and modal labels with no captured console errors; the Chrome temporary tab was cleaned up after the check.

Post-repair verification:

- `npm test`: passed, 63 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 48: Vault And Cockpit Editable Control Labels

Local source repairs completed on 2026-06-09:

- Added regression coverage requiring Vault and Cockpit editable controls to pass contextual screen-reader labels.
- Added contextual labels to Vault mortgage wizard controls: age at purchase, purchase price, down payment, original rate, current age, current balance, remaining years, current rate, monthly payment, extra payment amount, and refinance count.
- Added a contextual label to Vault's generational wealth investment return editor.
- Added contextual labels to Cockpit controls: airspeed cash flow, monthly income, monthly expenses, chunk size, active-domain balance, active-domain interest rate, and active-domain minimum payment.
- Added screen-reader labels to Cockpit's monthly income, monthly expenses, and chunk-size sliders.
- In-app Browser smoke verified Vault and Cockpit labels with no captured console errors.
- Chrome extension cross-check verified Cockpit labels on the first pass, then a focused Vault retry verified mortgage wizard labels after route hydration; no captured console errors.

Post-repair verification:

- `npm test`: passed, 64 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 49: Vault Mortgage Zero-Payment Projection Guard

Local source repairs completed on 2026-06-09:

- Added regression coverage proving a zero entered current mortgage payment is treated as real input instead of being replaced by a derived amortized payment.
- Mortgage analysis now raises the existing `payment-below-interest` warning when the entered current payment is zero or otherwise cannot cover estimated monthly interest.
- Mortgage strategy comparison now blocks Standard, Bi-weekly, Extra Payment, and Velocity projections when the base current mortgage payment cannot amortize.
- Vault strategy cards now render `Review inputs`, `Not projected`, and the failure reason for invalid Standard, Bi-weekly, and Extra Payment strategies instead of raw `0 mo` or `$0 interest` claims.
- In-app Browser smoke edited Vault monthly payment to `$0`, advanced to the strategy step, and confirmed all four cards rendered `Review inputs`, `Not projected`, and `Payment below interest`; no `0 mo` or `$0 interest` claim rendered and no console errors were captured.
- Chrome extension cross-check repeated the same invalid-payment Vault flow with no captured console errors; the temporary Chrome tab was cleaned up.

Post-repair verification:

- `npm test`: passed, 66 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 50: Vault Mortgage Zero-Current-Rate Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving an explicit `0%` current mortgage rate is preserved in both mortgage analysis and strategy comparison instead of being replaced by the original APR.
- Replaced truthy current-rate fallbacks in the mortgage analysis and strategy engines with explicit finite-number checks, so `0` remains a real zero-rate input while non-finite values still fall back safely.
- In-app Browser smoke set Vault current balance to `$12,000`, remaining term to `1` year, current rate to `0%`, and monthly payment to `$1,000`; the strategy step showed Standard `12 mo`, `$0 interest`, no `Payment below interest` warning, and no captured console errors.
- Chrome extension cross-check repeated the zero-current-rate Vault flow; the Standard card again showed `12 mo` and `$0 interest`, no `Payment below interest` warning, and no captured console errors. The temporary Chrome tab was cleaned up.

Post-repair verification:

- `npm test`: passed, 67 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 51: Vault Mortgage Over-Down-Payment Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving a down payment larger than the purchase price is clamped to a `$0` financed mortgage instead of producing a negative original loan amount.
- Mortgage analysis now sanitizes purchase price and down payment before deriving the financed amount, and emits a warning when down payment exceeds purchase price.
- The warning uses Vault's existing assumption-check surface, so users see that the financed amount is shown as zero and the purchase inputs need review before trusting totals.
- In-app Browser smoke set Vault purchase price to `$100,000` and down payment to `$125,000`; Step 1 rendered `Your original mortgage` as `$0`, showed the new warning, displayed no negative financed amount, and captured no console errors.
- Chrome extension cross-check repeated the same over-down-payment Vault flow after route hydration; it showed the same `$0` mortgage and warning, no negative financed amount, and no captured console errors. The temporary Chrome tab was cleaned up.

Post-repair verification:

- `npm test`: passed, 68 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 52: Vault Purchase-Mode Hidden Current-Field Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving purchase-only mortgage strategies ignore hidden stale `currentBalance` and `currentMonthlyPayment` values.
- Mortgage analysis now uses the visible original rate and original amortized payment for purchase-only mode, so hidden current-payment values cannot trigger false `payment-below-interest` warnings.
- Mortgage strategy comparison now derives purchase-only balance, payment, rate, and remaining term from visible purchase inputs instead of hidden current-status fields.
- In-app Browser smoke set current balance and monthly payment to `$0`, switched back to purchase-only mode, set purchase price to `$320,000` and down payment to `$64,000`, and confirmed the strategy step showed Standard `276 mo` and `$215,128 interest` instead of `0 mo` or `Review inputs`; no payment-below-interest warning or console errors were captured.
- Chrome extension cross-check repeated the same hidden-current-field purchase-only flow; Standard again showed real payoff time and interest instead of hidden-field review/zero claims, with no captured console errors. The temporary Chrome tab was cleaned up.

Post-repair verification:

- `npm test`: passed, 69 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 53: Dashboard Missing-LOC Setup State

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving a zero-limit, zero-balance LOC is treated as setup needed instead of maxed out.
- Added regression coverage for the related edge case where a LOC balance exists but the LOC limit is missing; the dashboard now labels that state as "Missing limit" instead of "No LOC" or "100% used".
- Dashboard model now exposes `locNeedsSetup`, sets missing-limit utilization to `0`, shows setup copy in the Money Loop artifact rail, and suppresses false high-utilization/pay-down coaching for missing LOC limits.
- Dashboard LOC input chip now uses the model's setup label, so the visible control says "No LOC" or "Missing limit" instead of a misleading percent.
- In-app Browser smoke set LOC limit to `$0` while the existing `$3,200` LOC balance remained, then confirmed "Missing limit", "Add LOC details", "Setup needed", no high-utilization/pay-down warning, and no captured console errors.
- Chrome extension smoke repeated the missing-limit flow against `http://localhost:5000/`; the dashboard rendered four vitals, "Missing limit", and "Add LOC details" with no captured console errors. The temporary Chrome tab was cleaned up.

Post-repair verification:

- `npm test`: passed, 71 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 54: Simulator Missing-LOC Warning And Timeline Badge

Local source repairs completed on 2026-06-09:

- Added regression coverage proving simulator route warnings treat a missing LOC limit as setup needed instead of high utilization.
- Added regression coverage proving the simulator timeline badge does not claim "LOC interest visible" when no velocity event ledger exists.
- Added `buildSimulatorWarnings` so `/simulator` no longer divides LOC balance by a zero limit and no longer labels missing LOC capacity as high utilization.
- Added `buildSimulatorTimelineStatus` so the Money Loop Timeline badge shows "Review inputs" when the ledger is unavailable and "LOC interest visible" only when events exist.
- In-app Browser smoke used the missing-limit state from Repair Pass 53 on `/simulator` and confirmed "Add LOC limit", the missing-limit body copy, "Review inputs" on the timeline badge, "Timeline unavailable", no "High LOC Utilization", no "LOC interest visible", and no captured console errors.

Post-repair verification:

- `npm test`: passed, 73 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 55: Shared Warning Missing-LOC Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving the shared warning generator treats a LOC balance with a missing limit as setup needed instead of producing `Infinity% utilized`.
- Updated `generateWarnings` so LOC limit validation happens before utilization math.
- Shared warnings now return a `no-loc` warning when a LOC balance is present but the limit is missing, and they avoid `NaN`/`Infinity` copy in all missing-limit warning messages.
- Existing over-limit LOC warnings remain intact for real positive-limit overutilization cases.

Post-repair verification:

- `npm test`: passed, 74 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 56: Simulator Strategy Copy Honesty

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving strategy comparison copy does not label faster-but-costlier paths as interest savings.
- Added `strategy-glass-fill-model.ts` so strategy delta text can independently report payoff-time direction and interest-cost direction.
- Updated StrategyGlassFill copy from "Best" to "Fastest" because the component selects by shortest payoff time, not by a full suitability score.
- Strategy delta badges now say plain outcomes such as "4 mo faster - $200 more interest" or "4 mo faster - $300 interest saved" instead of assuming every faster path saves interest.
- In-app Browser smoke on `/simulator` confirmed "Fastest", "Fastest Strategy", explicit interest-saved wording, no old "Best Strategy" copy, no old "Saves ..." badge, and no captured console errors.

Post-repair verification:

- `npm test`: passed, 75 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 57: Simulator Strategy Summary Tone

Local source repairs completed on 2026-06-09:

- Extended the strategy-copy regression so fastest-path summaries now expose tone semantics for interest saved, extra interest, or same interest.
- Added `getStrategyDeltaTone` to the StrategyGlassFill presentation model.
- Strategy summary styling now uses green only when the fastest path also saves interest, amber when it is faster but costs more interest, and sky when interest is effectively unchanged.
- In-app Browser smoke on `/simulator` confirmed the strategy comparison still renders "Fastest Strategy", explicit interest-delta copy, no old "Best Strategy" copy, and no captured console errors.

Post-repair verification:

- `npm test`: passed, 75 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 58: Vault Zero-Improvement Strategy Labels

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Vault strategy labels do not frame a valid zero-improvement projection as savings.
- Added Vault presentation helpers for projection failure copy, strategy interest savings copy, and strategy payoff-time copy.
- Updated Vault strategy cards so zero-improvement cases render "No interest savings" and "No faster payoff" while positive and invalid projections keep their explicit labels.
- In-app Browser smoke on `/vault` advanced to the strategy step, confirmed strategy projections still render, confirmed no visible `Saves $0` or `0 months faster` copy, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 76 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 59: Guardian Promise-Copy Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving the Guardian answer bank avoids unqualified savings promises and one-size-fits-all strategy claims.
- Replaced fixed savings ranges, fixed payoff-year claims, "Trust the math" language, and "HELOCs are perfect" copy with assumption-labeled guidance.
- Mortgage, car-loan, comparison, motivation, and troubleshooting answers now point users back to actual balances, rates, cash flow, fees, LOC terms, consistency, and collateral risk.
- In-app Browser smoke opened Guardian Teacher Mode on `/vault`, asked a focused mortgage question, confirmed the answer tells the user to run the model with actual rate/payment/cash-flow/LOC cost/fees, confirmed no banned promise phrases surfaced, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 77 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 60: Learn Page Sample-Assumption Copy

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Learn lesson copy does not present sample savings as universal outcomes.
- Reframed the Cash Flow and Chunk Strategy lesson takeaways so example savings are tied to actual inputs, rates, fees, LOC cost, timing, recovery plan, and consistency.
- Replaced aggressive or fear-leaning Learn copy such as "mortgage-killing power," "offensive weapon," and "silent killer" with calmer planning language.
- Updated the Chunk Strategy visualization caption from a fixed savings claim to "Sample chunk outcomes depend on rate, timing, LOC cost, and recovery."
- In-app Browser smoke on `/learn?module=4` confirmed the conditional chunk caption and sample-assumption copy render visibly, confirmed banned phrases are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 78 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 61: Vault Legacy-Impact Copy Guard

Local source repairs completed on 2026-06-09:

- Extended red/green copy regressions so Vault and Guardian do not present modeled opportunity cost as guaranteed "generational wealth" or inherited wealth.
- Reframed Vault's generation screen around modeled opportunity cost and assumption visibility.
- Reframed the final Vault path as "a modeled planning path" with inspectable assumptions.
- Updated Guardian's Vault answer to explain projected interest savings, redirected payments, and long-term options without "wealth created" or "multi-generational impact" promises.
- In-app Browser smoke advanced `/vault` to the generation and final path screens, confirmed the new modeled-opportunity and modeled-planning copy, asked Guardian "What is the Vault?", confirmed model/assumption language, confirmed banned legacy-promise phrases are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 78 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 62: Vault Generation Multiplier Assumptions

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Vault's generation screen does not label multiplier-derived estimates as real parent or child data.
- Renamed the fixed 73% and 156% family-generation scenarios to assumed prior-generation and assumed next-generation interest.
- Added visible copy explaining those estimates are illustrative multipliers derived from the current loan's lifetime interest.
- In-app Browser smoke advanced `/vault` to the generation screen, confirmed the multiplier note and assumed labels render, confirmed the old family-data labels are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 79 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 63: Learn LOC Rate-Spread Assumption Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Learn content does not present fixed LOC/debt-rate spreads as universal velocity banking rules.
- Replaced the claim that velocity banking still works when the LOC rate is slightly higher than the mortgage rate with guidance to model ADB benefit, chunk timing, fees, recovery window, and cash-flow stability together.
- Removed the fixed "LOC rate 2-4% below your primary debt rate" sweet-spot rule and softened "maximizes arbitrage"/"maximum impact" copy.
- In-app Browser smoke on `/learn?module=5` confirmed the revised modeled-spread copy renders, confirmed the old fixed-rate rules are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 80 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 64: Guardian Unsupported Statistics Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Guardian copy avoids unsupported population statistics, named anecdotes, and hard-coded cash-flow timeline claims.
- Replaced "most people find 10-20%," "average person has $200+," a named Sarah payoff anecdote, and the "average American has $100K+ in debt" line with input-driven examples and coach-tone guidance.
- Updated Guardian Teacher Mode so small cash-flow changes are framed as values to test in Simulator before trusting a timeline, not as guaranteed timeline-changing amounts.
- In-app Browser smoke asked Guardian "How can I increase my cash flow?", confirmed the revised Teacher Mode next step renders, confirmed removed stats/anecdotes are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 81 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 65: Guardian Cash-Flow Example Arithmetic

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage that scans Guardian cash-flow examples and verifies stated surplus equals income minus expenses.
- Fixed the Guardian example that incorrectly said `$5,000/month - $4,000/month = +$1,500`; it now states `+$1,000` and frames that amount as a value to test against payoff scenarios.
- In-app Browser smoke asked Guardian for a cash-flow example, confirmed the old incorrect arithmetic text is absent from the visible chat path, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 82 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 66: Learn LOC Availability Example Arithmetic

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage for the Learn "mistake cascade" LOC availability example.
- Fixed the safer-chunk example from `$7,000 available` to `$8,000 available`, matching `$15,000 limit - ($8,000 chunk - $1,000 recovery)`.
- In-app Browser smoke on `/learn?module=6` opened the Deep Dive panel, confirmed the corrected `$8,000 available` text renders, confirmed the old `$7,000 available` text is absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 83 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 67: Learn Neutral Planning Example

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Learn examples avoid unsupported named anecdotes and keep the scenario framed as a neutral planning example.
- Reframed the Common Mistakes Deep Dive from a named "real-world" story to a household planning scenario while preserving the corrected LOC availability math.
- In-app Browser smoke on `/learn?module=6` opened the Deep Dive panel, confirmed `Planning example` and `$8,000 available` render, confirmed `real-world example`, `Sarah`, and the old `$7,000 available` text are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 84 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 68: Guardian LOC Threshold Copy Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Guardian answers avoid hard-coded HELOC/LOC/credit-card rate ranges and generic credit/equity qualification thresholds.
- Reframed HELOC, LOC-versus-card, and LOC application answers around actual APR, fees, draw rules, repayment terms, grace periods, recovery timeline, lender criteria, and collateral risk.
- In-app Browser smoke asked Guardian HELOC/home-equity questions, confirmed the old hard-coded threshold text was absent from the rendered chat path, and found no captured console errors.
- Follow-up found: Guardian currently matches generic LOC intent before HELOC/home-equity intent when the prompt includes "HELOC" or "line of credit"; repair pass should prioritize the more specific HELOC answer.

Post-repair verification:

- `npm test`: passed, 85 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 69: Guardian HELOC Intent Priority

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Guardian prioritizes HELOC/home-equity intent over generic LOC matching.
- Replaced first-match answer lookup with strongest-keyword matching so longer, more specific prompts like `HELOC`, `home equity line of credit`, and `LOC vs credit card` can win over bare `loc`.
- Added `home equity line of credit` as an explicit HELOC keyword.
- In-app Browser smoke asked Guardian `What is a HELOC?`, confirmed the visible Teacher Mode answer uses the HELOC/collateral-risk guidance, confirmed the generic reusable-loan answer and old thresholds are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 86 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 70: Guardian Card And Investment Advice Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Guardian avoids directive credit-card and investing advice without modeled assumptions.
- Replaced fixed card APR ranges, "priority one," "attack aggressively," and simplified investing-versus-debt rules with copy that points users to card APR, minimums, fees, LOC terms, recovery timeline, risk, taxes, liquidity, employer match, and time horizon.
- In-app Browser smoke confirmed direct credit-card prompts render the safer modeled-language answer, investing prompts render assumption-aware guidance, the old directive phrases are absent, and no console errors were captured.
- Follow-up found: mixed prompts such as `Should I use velocity banking for credit cards?` still match generic velocity-banking intent before the credit-card intent; repair pass should add a specific mixed-intent guard.

Post-repair verification:

- `npm test`: passed, 87 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 71: Guardian Mixed Credit-Card Intent Routing

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage for the browser-discovered mixed prompt `Should I use velocity banking for credit cards?`.
- Added specific credit-card velocity keywords so strongest-keyword matching routes mixed velocity/card prompts to card guidance instead of generic velocity-banking answers.
- In-app Browser smoke asked the exact mixed prompt, confirmed the visible Teacher Mode answer uses credit-card guidance, confirmed the generic checking-account-hub answer and old directive phrases are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 88 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 72: Guardian Mortgage And Refinance Shortcut Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Guardian avoids fixed mortgage timeline examples, fixed interest examples, fixed chunk-impact examples, and refinance shortcuts.
- Reframed amortization, chunk-size, slow-progress, and refinance answers around exact loan inputs, Simulator testing, break-even math, closing costs, new term, time in loan, and payoff plan.
- In-app Browser smoke asked Guardian refinance and slow-progress questions, confirmed the visible Teacher Mode answers use modeled/break-even language, confirmed the old fixed claims are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 89 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 73: Learn Common-Mistakes Coach Tone

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Learn module 6 avoids fear/directive phrases while preserving the LOC utilization warning.
- Rewrote Common Mistakes copy from "most dangerous," "always maintain," "massive chunk," and "never use" language into coach-tone guidance about planning buffers, recovery risk, spendable income, and modeled cash flow.
- Updated the quiz explanation so the 80% answer is framed as preserving emergency capacity rather than protecting every outcome.
- In-app Browser smoke on `/learn?module=6` confirmed the visible lesson and quiz explanation render the new copy, confirmed the old fear/directive phrases are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 90 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 74: Pre-App Preview Projection Gate

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving the pre-app snapshot does not convert raw invalid velocity months into a debt-free date claim.
- Updated `PreAppPreview` to derive `payoffProjected` from both baseline and velocity projection validity before showing the Velocity Score or Debt-Free Date.
- Invalid/unstable preview projections now show `0%` for Velocity Score and `Review inputs` for Debt-Free Date instead of a manufactured calendar date.
- In-app Browser smoke loaded the local dashboard after the preview change, confirmed no `Invalid Date`/`NaN` text appears, and found no captured console errors. Direct preview forcing was not possible through Browser because the runtime exposes read-only page evaluation and the app has no visible preview-reset setting.

Post-repair verification:

- `npm test`: passed, 91 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 75: Settings Snapshot Preview Restore Controls

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Settings exposes visible controls to restore the pre-app snapshot preview.
- Added a `Show snapshot preview` toggle wired to preview preferences, with explicit `aria-label` and `aria-pressed` state.
- Added a `Show snapshot next visit` action that re-enables the preview, expires the preview refresh window, and clears the dismissed state.
- In-app Browser smoke on `/settings` confirmed the controls render, the toggle changes `aria-pressed`, the restore action is clickable, no `NaN`/`Invalid Date` text appears, and no console errors were captured.

Post-repair verification:

- `npm test`: passed, 92 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 76: Guardian Debt-Priority Guidance Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Guardian debt-priority answers do not use fixed APR examples or directive "attack the cards" language.
- Reframed `Which debt should I target first?` around actual APR, fees, minimum-payment pressure, LOC cost, recovery timeline, risk, and modeled Portfolio/Simulator scenarios.
- In-app Browser smoke asked Guardian `Which debt should I target first?`, confirmed the visible Teacher Mode answer points to modeled inputs, confirmed the old fixed-rate directive is absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 93 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 77: Guardian LOC Prerequisite And Income Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Guardian prerequisite and income answers avoid universal "start/apply now" and small-surplus "works" claims.
- Reframed LOC prerequisite guidance so users can learn the Money Loop before opening credit, and so any LOC use depends on real terms, collateral risk, fees, and recovery planning.
- Reframed minimum-income guidance around stable positive cash flow, essentials, minimum payments, safety buffer, and modeled surplus checks against balances, rates, fees, minimums, and recovery time.
- In-app Browser smoke asked Guardian `Do I need a LOC before starting?` and `Is there a minimum income needed?`, confirmed the visible Teacher Mode answers keep users in education/modeling mode, confirmed old universal claims are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 94 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 78: Settings Backend Status Clarity

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Settings labels the backend as local demo mode, says Supabase is not connected yet, explains browser-local storage, and names the next backend step.
- Added a Settings backend status panel so the app no longer implies real auth, Supabase, or server persistence is already wired.
- Clarified demo auth copy to say there is no real authentication yet.
- Added accessible disabled-provider labels and hover titles for Google, Microsoft, and Apple sign-in buttons so their unavailable state is explained.
- In-app Browser smoke loaded `/settings`, confirmed the backend status panel, Supabase/local-storage note, provider unavailable labels, and no captured console errors.

Post-repair verification:

- `npm test`: passed, 95 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 79: Vault Freedom-Path Payment Input Guard

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving the Vault freedom-path model input does not replace an explicit zero current mortgage payment with the derived original mortgage payment.
- Replaced the UI fallback `currentMonthlyPayment || originalPayment` with an explicit entry-mode check: purchase mode uses the derived original payment, while current/both mode preserves the user's current payment exactly.
- In-app Browser smoke loaded `/vault`, advanced through the Wealth Transfer Timeline to `Your Freedom Path`, confirmed the impacted cards render, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 96 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 80: Vault Coach-Tone Interest Copy Guard

Local source repairs completed on 2026-06-09:

- Strengthened the Vault coach-tone regression so visible copy cannot frame interest as "the bank's cut," "goes to the bank," or "reset the interest clock."
- Replaced sharper Vault mortgage copy with neutral calculation language: `Interest portion`, `of each payment is estimated as interest`, `change the interest schedule`, and `was paid as interest`.
- In-app Browser smoke loaded `/vault`, advanced to `The Wealth Transfer`, confirmed the neutral interest copy renders, confirmed the old phrases are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 96 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 81: Learn Cash-Flow Coach-Tone Guard

Local source repairs completed on 2026-06-09:

- Strengthened the Learn coach-tone regression so cash-flow lessons cannot use pressure phrases like `tracking it religiously`, `you must fix that first`, or universal `before starting velocity banking` directives.
- Reframed the Cash Flow lesson around checking surplus consistently, reviewing recent records, and keeping LOC-based payoff plans in learning mode when cash flow is negative.
- Reframed the Common Mistakes expense-tracking note so users are asked to track spending long enough to trust the modeled surplus before sizing chunks.
- In-app Browser smoke loaded `/learn`, opened the Cash Flow lesson and Deep Dive, confirmed the new learning-mode copy renders, confirmed old directive phrases are absent, and found no captured console errors.

Post-repair verification:

- `npm test`: passed, 96 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 82: Local Backup Clarity And Smoke Hooks

Local source repairs completed on 2026-06-09:

- Added red/green regression coverage proving Settings and Portfolio label backups as local-only demo data, explain that imports replace the current local portfolio plan, and expose stable export/import smoke-test hooks.
- Reframed Settings Data Backup copy around local portfolio balances, LOC settings, strategy, and planning inputs instead of implying server-backed restore.
- Added specific accessible labels and `data-testid` hooks for Settings and Portfolio export/import controls.
- Replaced Portfolio import failure `alert` feedback with in-page status feedback.
- In-app Browser smoke loaded `/settings` and `/portfolio`, confirmed the local-only backup copy, replacement warning, control labels, import file accept type, and no captured console errors. The in-app Browser does not support download capture, so actual file-download event verification remains a Chrome/manual file-management pass.

Post-repair verification:

- `npm test`: passed, 97 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 83: Chrome Backup Download Verification

Local smoke verification completed on 2026-06-09:

- Used Chrome control to load the local Settings backup panel, click the visible `Export local portfolio backup` control, and verify a matching `interestshield-backup-2026-06-09.json` file was created.
- Parsed the newest Settings backup file by schema summary only: version `1`, exported timestamp present, data object present, four debts, LOC data present, strategy `velocity`, focus mode `single`.
- Used Chrome control to load the local Portfolio backup panel, click the visible `Export local portfolio backup` control, and verify a matching `interestshield-portfolio-2026-06-09.json` file was created.
- Parsed the newest Portfolio backup file by schema summary only: version `1`, exported timestamp present, data object present, four debts, LOC data present, strategy `velocity`, focus mode `single`.
- Chrome's download-event hook was unreliable for these programmatic Blob downloads, so verification used Chrome-side clicks plus scoped Downloads-folder checks for InterestShield backup filenames.

Post-smoke verification:

- Settings export file: `interestshield-backup-2026-06-09.json`, 1,975 bytes, exported at `2026-06-09T10:00:36.639Z`.
- Portfolio export file: `interestshield-portfolio-2026-06-09.json`, 1,975 bytes, exported at `2026-06-09T10:03:07.640Z`.

### Repair Pass 84: Visible Import Hooks And Chrome Import Blocker

Local source repairs and smoke attempt completed on 2026-06-09:

- Strengthened the backup-control regression so Settings and Portfolio expose stable `data-testid` hooks on the visible Import controls, not only the hidden file inputs.
- Added `settings-import-backup` and `portfolio-import-backup` hooks so file chooser automation has a durable user-facing target.
- Re-ran the regression suite after the hook repair: `npm test` passed with 97 regression tests.
- Chrome import smoke could not proceed because the Chrome backend became unavailable. Chrome health checks showed Google Chrome is installed and the Codex Chrome Extension is installed/enabled, but the Windows native host registry key is missing: `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.openai.codexextension`.
- In-app Browser cannot complete the file import smoke either because its exposed API does not include file chooser upload control.

Post-repair verification:

- `npm test`: passed, 97 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build after allowing network access for Next font fetching.

### Repair Pass 85: Dashboard Why-This-Changed Explanations

Local source repairs and smoke verification completed on 2026-06-14:

- Added red/green regression coverage proving the dashboard model exposes model-backed change explanations without adding a fifth vital.
- Added a compact `Why this changed` panel to the dashboard, backed by `model.changeExplanations`, with explanations for Cash Flow, LOC Room, Chunk, and ETA.
- The explanations disclose the actual cash-flow equation, LOC setup/room assumptions, chunk capping against active debt and LOC room, and ETA suppression when inputs cannot support a stable projection.
- Browser smoke loaded the built local app at `/`, confirmed four dashboard vitals, confirmed the Money Loop artifact rail, confirmed `dashboard-change-explanations`, edited Monthly Income from `$7,000` to `$8,000`, and verified Cash Flow plus the explanation updated to `$3,500`.
- Browser console check found 0 captured errors and no Next.js/framework error overlay.
- Local dev-server smoke was blocked by a sandbox `spawn EPERM` during `next dev`; production-server smoke used the successful `next build` output instead.

Post-repair verification:

- `npm test`: passed, 99 regression tests.
- `npm run lint`: passed with 0 problems.
- `npm run build`: passed with a successful production build.

### Repair Pass 86: Expo Mobile Foundation And Shared Engine Contract

Local source repairs and smoke verification completed on 2026-06-15:

- Added an initial Expo SDK 56 mobile app at `apps/mobile` with an Expo Router entry, native `ScrollView` layout, and Dashboard, Simulator, Learn, and Vault mode controls.
- Added `packages/financial-engine` as the first shared engine boundary for native consumption. The mobile shell imports `@interestshield/financial-engine` instead of duplicating the dashboard cash-flow and interest formulas.
- Added `scripts/mobile-port-contract-tests.cjs` to prove the mobile app declares the shared engine dependency, the shared engine matches the current web engine on cash-flow, amortization, ADB interest, and currency fixtures, and the native shell does not rely on static-export tab route hydration.
- Replaced the first tab-route shell after browser smoke showed the static export changed URLs but kept Dashboard content mounted. The corrected shell uses in-app native mode switching so the exported web build and native shell render the same functional surface.
- Ran Expo dependency alignment with `npx expo install --check`; after aligning versions and adding `react-native-worklets`, Expo Doctor passed all 21 checks.
- Browser smoke served the exported Expo web build from `dist-web`, confirmed Dashboard, Simulator, Learn, and Vault modes render the expected panels, confirmed the footer copy remains visible, and found 0 captured console errors.
- Native simulator smoke remains environment-limited on this Windows machine: `adb`, Android `emulator`, and `xcrun` were not available, so Android device/emulator and iOS simulator runs could not be executed locally in this pass.
- `npm audit --audit-level=high` exited successfully. npm still reports moderate transitive Expo/uuid findings; the suggested `npm audit fix --force` would downgrade Expo to an old breaking version, so it was not applied.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npx expo install --check`: passed.
- `apps/mobile` `npx expo-doctor`: passed, 21/21 checks.
- `apps/mobile` `npx expo export --platform web --output-dir dist-web --clear`: passed.
- `apps/mobile` browser smoke at `http://127.0.0.1:8082/`: passed for Dashboard, Simulator, Learn, and Vault modes with 0 console errors.
- `apps/web` `npm test`: passed, 99 regression tests.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.

### Repair Pass 87: Mobile Editable Assumptions And Portfolio Mode

Local source repairs and smoke verification completed on 2026-06-15:

- Added a shared `buildMobilePortfolioSnapshot` engine function so the mobile shell can show portfolio coverage, modeled debt, priority debt, minimum payment, and daily interest burn rationale without duplicating formulas in the UI.
- Added native editable assumption controls in `apps/mobile` for Monthly income, Monthly expenses, Velocity chunk amount, and Line of credit limit. The controls feed the shared dashboard and portfolio snapshots directly.
- Added a Portfolio mode to the Expo shell while keeping Dashboard, Simulator, Learn, and Vault reachable through the same in-app native mode switcher.
- Expanded `scripts/mobile-port-contract-tests.cjs` to prove the native shell exposes editable financial inputs, includes Portfolio mode, and uses the shared portfolio snapshot contract.
- Browser smoke served the exported Expo web build from `dist-web`, confirmed the editable assumptions rendered with expected starting values, edited income to `$8,000` and LOC limit to `$25,000`, verified dashboard recalculation to `$3,500` cash flow and `$21,800 open` LOC room, opened Portfolio, and verified `$3,075` cash flow after minimums, `$18,450` modeled debt, and daily interest burn rationale with 0 console errors.
- Native simulator smoke remains environment-limited on this Windows machine: `adb`, Android `emulator`, and `xcrun` were not available, so Android device/emulator and iOS simulator runs could not be executed locally in this pass.
- `npm audit --audit-level=high` still exits successfully for the mobile app. npm continues to report moderate transitive Expo/uuid findings; the suggested forced fix would downgrade Expo to an old breaking version, so it was not applied.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npx expo install --check`: passed.
- `apps/mobile` `npx expo-doctor`: passed, 21/21 checks.
- `apps/mobile` `npm audit --audit-level=high`: passed with the moderate transitive Expo/uuid advisory noted above.
- `apps/mobile` `npx expo export --platform web --output-dir dist-web --clear`: passed.
- `apps/mobile` browser smoke at `http://127.0.0.1:8083/`: passed for editable Dashboard assumptions plus Dashboard, Portfolio, Simulator, Learn, and Vault modes with 0 console errors.
- `apps/web` `npm test`: passed, 99 regression tests.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.

### Repair Pass 88: Mobile Simulator Strategy Parity

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green contract coverage proving the shared mobile simulator snapshot exists, the Expo shell renders a native strategy panel, and the mobile strategy results match the current web single-debt simulator engine for Traditional, Snowball, Avalanche, and Velocity.
- Added shared mobile simulator payoff projections in `packages/financial-engine`, including baseline payoff, extra-payment comparison, and Money Loop velocity payoff with LOC average-daily-balance interest included in total interest.
- Added invalid-state handling so native Simulator suppresses Velocity payoff claims when cash flow is invalid, showing `Not projected`, `Review inputs`, and `Needs positive cash flow` instead of a false zero-month win.
- Updated the Expo Simulator mode to render Velocity Delta, Interest Visibility, and a four-strategy comparison from the shared engine snapshot.
- Browser smoke served the exported Expo web build from `dist-web`, edited income to `$8,000` and LOC limit to `$25,000`, opened Simulator, and verified Traditional `51 mo`, Snowball/Avalanche `6 mo`, Velocity `10 mo`, `Saves $2,252`, and `41 months faster` with 0 console errors. The same Browser flow then edited income to `$4,000` and verified the invalid cash-flow guardrail with 0 console errors.
- Chrome extension smoke loaded the same local export, edited income to `$8,000` and LOC limit to `$25,000`, opened Simulator, and verified Strategy Comparison, Snowball `6 mo`, Velocity `10 mo`, Velocity savings, footer copy, and 0 console errors.
- Native simulator smoke remains environment-limited on this Windows machine: `adb`, Android `emulator`, and `xcrun` were not available, so Android device/emulator and iOS simulator runs could not be executed locally in this pass.
- `npm audit --audit-level=high` still exits successfully for the mobile app. npm continues to report moderate transitive Expo/uuid findings; the suggested forced fix would downgrade Expo to an old breaking version, so it was not applied.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed after first failing for the missing shared simulator snapshot and native strategy panel.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npx expo install --check`: passed.
- `apps/mobile` `npx expo-doctor`: passed, 21/21 checks.
- `apps/mobile` `npm audit --audit-level=high`: passed with the moderate transitive Expo/uuid advisory noted above.
- `apps/mobile` `npx expo export --platform web --output-dir dist-web --clear`: passed.
- `apps/mobile` Browser smoke at `http://127.0.0.1:8084/`: passed for valid and invalid Simulator strategy states with 0 console errors.
- `apps/mobile` Chrome smoke at `http://127.0.0.1:8084/`: passed for the valid Simulator strategy state with 0 console errors.
- `apps/web` `npm test`: passed, 99 regression tests.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.

### Repair Pass 89: Mobile Assumption Persistence

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green contract coverage proving the Expo app declares encrypted native key-value storage, exposes a persisted-assumptions hook, avoids AsyncStorage, and can encode/decode saved mobile assumptions safely.
- Added `expo-secure-store` and its Expo config plugin so native iOS/Android builds can store assumptions through encrypted device storage when available.
- Added `apps/mobile/lib/mobile-assumption-storage.ts` to persist `MobileDashboardInput` through SecureStore on native and through localStorage for exported-web smoke testing.
- Added `apps/mobile/hooks/use-persisted-mobile-assumptions.ts` so the shell restores saved assumptions once, then saves edits after the initial restore completes.
- Added a Local Storage status card in the Expo shell so users can see whether assumptions are loading, saved securely, restored securely, saved locally, restored locally, or session-only.
- Browser smoke served the exported Expo web build from `dist-web`, verified the Local Storage card, edited income to `$8,123`, expenses to `$4,321`, chunk to `$987`, and LOC limit to `$25,000`, reloaded the page, and verified those values restored with `$3,802` cash flow, `$21,800 open` LOC room, footer copy, and 0 console errors.
- Chrome extension smoke loaded the same local export, edited income to `$9,123`, expenses to `$5,123`, chunk to `$1,111`, and LOC limit to `$25,000`, reloaded the page, and verified those values restored with `Send $1,111 to principal`, footer copy, and 0 console errors.
- Native simulator smoke remains environment-limited on this Windows machine: `adb`, Android `emulator`, and `xcrun` were not available, so Android device/emulator and iOS simulator runs could not be executed locally in this pass.
- `npm audit --audit-level=high` still exits successfully for the mobile app. npm continues to report moderate transitive Expo/uuid findings; the suggested forced fix would downgrade Expo to an old breaking version, so it was not applied.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed after first failing for missing `expo-secure-store`, persisted hook, and storage module.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npx expo install --check`: passed.
- `apps/mobile` `npx expo-doctor`: passed, 21/21 checks.
- `apps/mobile` `npm audit --audit-level=high`: passed with the moderate transitive Expo/uuid advisory noted above.
- `apps/mobile` `npx expo export --platform web --output-dir dist-web --clear`: passed.
- `apps/mobile` Browser smoke at `http://127.0.0.1:8085/`: passed for assumption persistence across reload with 0 console errors.
- `apps/mobile` Chrome smoke at `http://127.0.0.1:8085/`: passed for assumption persistence across reload with 0 console errors.
- `apps/web` `npm test`: passed, 99 regression tests.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.

### Repair Pass 90: Mobile Cockpit Mode

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green contract coverage for native Cockpit parity: the Expo shell now declares a Cockpit mode, renders a native Cockpit panel, and consumes a shared `buildMobileCockpitSnapshot` instead of duplicating formulas in the UI.
- Added shared mobile Cockpit instruments in `packages/financial-engine`: Airspeed, Fuel Burn, Heading, ETA, flight status, and flight checks for positive cash flow, LOC capacity, utilization under 80%, and labeled payoff claims.
- Added unsafe-input coverage so the mobile Cockpit switches to review mode when cash flow is negative or LOC setup is missing, suppressing unstable payoff confidence while preserving the educational warning copy.
- Updated the Expo shell mode switcher to include Cockpit alongside Dashboard, Simulator, Portfolio, Learn, and Vault.
- Browser smoke served the exported Expo web build from `dist-web`, edited assumptions to `$8,000` income, `$4,500` expenses, `$1,500` chunk, and `$25,000` LOC limit, opened Cockpit, and verified Ready to model, `$3,500/mo` Airspeed, `$4/day` Fuel Burn, Auto Loan heading, `10 mo` ETA, passing flight checks, footer copy, and 0 console warnings/errors.
- The same Browser smoke edited income to `$4,000` and LOC limit to `$0`, then verified Review inputs, the cash-flow warning, `-$500/mo` Airspeed, Review-input ETA, failed positive-cash-flow and LOC-capacity checks, and 0 console warnings/errors.
- Chrome smoke repeated the valid and invalid Cockpit states at `http://127.0.0.1:8086/` with 0 console warnings/errors, then closed the automation tab.
- Native Android/iOS simulator smoke remains environment-blocked on this Windows machine because `adb`, Android `emulator`, and `xcrun` are unavailable.
- `npm audit --audit-level=high` still exits successfully for the mobile app. npm continues to report moderate transitive Expo/uuid findings; the suggested forced fix would downgrade Expo to an old breaking version, so it was not applied.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed after first failing for the missing Cockpit mode and shared Cockpit snapshot.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npx expo install --check`: passed.
- `apps/mobile` `npx expo-doctor`: passed, 21/21 checks.
- `apps/mobile` `npm audit --audit-level=high`: passed with the moderate transitive Expo/uuid advisory noted above.
- `apps/mobile` `npx expo export --platform web --output-dir dist-web --clear`: passed.
- `apps/mobile` Browser smoke at `http://127.0.0.1:8086/`: passed for valid and invalid Cockpit states with 0 console warnings/errors.
- `apps/mobile` Chrome smoke at `http://127.0.0.1:8086/`: passed for valid and invalid Cockpit states with 0 console warnings/errors.
- `apps/web` `npm test`: passed, 99 regression tests.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.

### Repair Pass 91: Mobile Direct Route Parity

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green contract coverage proving the Expo app exposes direct route files for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- Added route-specific Expo screens that render the shared `MobileShell` with the matching initial mode, so direct links open the intended mobile surface instead of only the default dashboard shell.
- Registered all mobile demo routes in the Expo Router stack layout with route titles.
- Updated the mobile mode switcher to use Expo Router navigation, so mode buttons update both the visible panel and the URL path.
- Browser smoke served the exported Expo web build with SPA fallback at `http://127.0.0.1:8087`, verified all six direct routes render their expected mode content, clicked Simulator to Cockpit and Cockpit to Vault, verified URL changes to `/cockpit` and `/vault`, and captured 0 console warnings/errors.
- Chrome smoke repeated all six direct routes, clicked Learn to Simulator, verified the URL changes to `/simulator`, and captured 0 console warnings/errors before closing the automation tab.
- Native Android/iOS simulator smoke remains environment-blocked on this Windows machine because `adb`, Android `emulator`, and `xcrun` are unavailable.
- `npm audit --audit-level=high` still exits successfully for the mobile app. npm continues to report moderate transitive Expo/uuid findings; the suggested forced fix would downgrade Expo to an old breaking version, so it was not applied.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed after first failing for missing route-aware shell behavior and missing direct Expo routes.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npx expo install --check`: passed.
- `apps/mobile` `npx expo-doctor`: passed, 21/21 checks.
- `apps/mobile` `npm audit --audit-level=high`: passed with the moderate transitive Expo/uuid advisory noted above.
- `apps/mobile` `npx expo export --platform web --output-dir dist-web --clear`: passed.
- `apps/mobile` Browser smoke at `http://127.0.0.1:8087`: passed for direct route parity and route-changing mode buttons with 0 console warnings/errors.
- `apps/mobile` Chrome smoke at `http://127.0.0.1:8087`: passed for direct route parity and route-changing mode buttons with 0 console warnings/errors.
- `apps/web` `npm test`: passed, 99 regression tests.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.

### Repair Pass 92: Mobile Vercel Export Contract

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green contract coverage proving the mobile app has a repeatable Expo web export command, a local export server command, and Vercel SPA hosting configuration.
- Added `apps/mobile/vercel.json` with Vercel schema metadata, `npm run build:web` as the build command, `dist-web` as the output directory, and a rewrite from all paths to `/` so direct Expo Router paths can hydrate from the exported app.
- Added `apps/mobile/scripts/serve-web-export.cjs`, a small local static server for smoke tests that serves `dist-web`, falls back to `index.html` for direct routes, supports `PORT`, and guards against path traversal.
- Added `apps/mobile` package scripts: `build:web` and `serve:web-export`.
- Browser smoke used the committed `serve:web-export` script at `http://127.0.0.1:8088`, verified `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`, clicked Cockpit to Learn, verified URL/content updates, and captured 0 console warnings/errors.
- Chrome smoke repeated the same direct-route set, clicked Vault to Dashboard, verified URL/content updates, and captured 0 console warnings/errors. Chrome screenshot capture timed out after the DOM/URL/console checks, so screenshot evidence for this pass comes from the in-app Browser run.
- Vercel CLI remains unavailable as an installed local command. `npx @vercel/config validate` did not validate this static config in this environment because the validator attempted to load a missing `router.config.ts`; the committed config shape is still covered by contract tests and follows Vercel's documented `buildCommand`, `outputDirectory`, and `rewrites` properties.
- Native Android/iOS simulator smoke remains environment-blocked on this Windows machine because `adb`, Android `emulator`, and `xcrun` are unavailable.
- `npm audit --audit-level=high` still exits successfully for the mobile app. npm continues to report moderate transitive Expo/uuid findings; the suggested forced fix would downgrade Expo to an old breaking version, so it was not applied.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed after first failing for missing `build:web`, `serve:web-export`, and Vercel config.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npx expo install --check`: passed.
- `apps/mobile` `npx expo-doctor`: passed, 21/21 checks.
- `apps/mobile` `npm audit --audit-level=high`: passed with the moderate transitive Expo/uuid advisory noted above.
- `apps/mobile` `npm run serve:web-export`: served `/` and `/simulator` with HTTP 200 before browser smoke.
- `apps/mobile` Browser smoke at `http://127.0.0.1:8088`: passed for direct export routes and route-changing mode buttons with 0 console warnings/errors.
- `apps/mobile` Chrome smoke at `http://127.0.0.1:8088`: passed for direct export routes and route-changing mode buttons with 0 console warnings/errors; screenshot capture timed out after checks.
- `apps/web` `npm test`: passed, 99 regression tests.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.

### Repair Pass 93: Mobile Native Release Profiles

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green contract coverage proving the Expo app has explicit Android/iOS preview build scripts, native release metadata, EAS build profiles, and committed icon assets.
- Added `apps/mobile/eas.json` with development, preview, and production profiles. Preview builds target Android APKs and iOS simulator builds; production builds target Android app bundles with iOS `m-medium` resources and auto-increment enabled.
- Added native app metadata to `apps/mobile/app.json`: app icon, runtime version policy, iOS build number, Android version code, Android adaptive icon foreground image, and the non-exempt-encryption flag.
- Added `apps/mobile/assets/icon.png` and `apps/mobile/assets/adaptive-icon.png` from the existing 1024px project icon so native builds do not rely on parent-directory assets.
- Added package scripts for `build:android:preview`, `build:ios:preview`, and `build:native:production` using `npx eas-cli@latest`.
- Browser smoke used the committed `serve:web-export` script at `http://127.0.0.1:8092` and verified `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault` with 0 console warnings/errors.
- Chrome smoke repeated the same direct-route set at `http://127.0.0.1:8092`, verified route-specific rendered labels, captured 0 console warnings/errors, and finalized the test tab.
- Native Android/iOS simulator smoke was not run in this pass; the local Windows environment still needs Android SDK/emulator tooling and an iOS/macOS simulator path for true device smoke.
- `npm audit --audit-level=high` still exits successfully for the mobile app. npm continues to report moderate transitive Expo/uuid findings; the suggested forced fix would downgrade Expo to an old breaking version, so it was not applied.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed after first failing for missing native build scripts, `eas.json`, native icon metadata, and icon asset paths.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npx expo config --type public --json`: passed and showed the new icon, runtimeVersion, iOS, and Android metadata.
- `apps/mobile` `npx expo install --check`: passed.
- `apps/mobile` `npx expo-doctor`: passed, 21/21 checks.
- `apps/mobile` `npm run build:web`: passed; Expo printed the expected cache warning because the export script clears Metro cache.
- `apps/mobile` exported route HTTP checks: `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault` all returned 200.
- `apps/mobile` Browser smoke at `http://127.0.0.1:8092`: passed for all direct export routes with 0 console warnings/errors.
- `apps/mobile` Chrome smoke at `http://127.0.0.1:8092`: passed for all direct export routes with 0 console warnings/errors.
- `apps/web` `npm test`: passed, 99 regression tests.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.

### Repair Pass 94: Mobile Dashboard Four-Vitals Parity

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green contract coverage proving the Expo dashboard snapshot uses the required dashboard vitals: Cash Flow, Interest Burn, Debt-Free ETA, and Next Move.
- Replaced the mobile dashboard's `LOC Room` vital with `Debt-Free ETA`, derived from the same shared mobile velocity projection used by Simulator and Cockpit.
- Kept unsafe plans truth-labeled: negative cash flow renders `Stabilize first`, and other invalid setup states render `Review inputs` instead of a debt-free date.
- Kept LOC setup and utilization signals available through warnings, Money Loop details, and Cockpit checks without adding a fifth dashboard vital.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed after first failing with `Cash Flow|Interest Burn|LOC Room|Next Move`.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npx expo install --check`: passed.
- `apps/mobile` `npx expo-doctor`: passed, 21/21 checks.
- `apps/mobile` Browser smoke at `http://127.0.0.1:8094`: passed for dashboard four-vitals content and all direct export routes with 0 console warnings/errors.
- `apps/mobile` Chrome smoke at `http://127.0.0.1:8094`: passed for dashboard four-vitals content and all direct export routes with 0 console warnings/errors.
- Native Android/iOS simulator smoke was not run in this pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.
- `apps/web` `npm test`: passed, 99 regression tests.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.

### Repair Pass 95: Mobile First-Run Demo Alignment

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green contract coverage proving the Expo mobile default assumptions start from the same verified car-demo Money Loop values as the web app.
- Updated `defaultMobileDashboardInput` to match the web demo defaults: `$6,500` income, `$5,000` expenses, `$1,000` chunk, 48-month auto loan term, and a `$25,000` LOC limit with `$3,200` balance at 8.5% APR.
- Removed the first-run mobile setup blocker caused by a missing LOC limit, so the default Expo dashboard can render a model-ready Next Move, Debt-Free ETA, Simulator projection, and Cockpit status.
- Preserved explicit unsafe-input tests for negative cash flow and missing LOC limit, so setup and risk guardrails still suppress payoff claims when the user edits inputs into an unsafe state.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed after first failing on the old standalone mobile defaults.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npx expo install --check`: passed.
- `apps/mobile` `npx expo-doctor`: passed, 21/21 checks.
- `apps/mobile` Browser smoke at `http://127.0.0.1:8095`: passed for all direct export routes after clearing persisted local assumptions, confirmed the dashboard rendered `Send $1,000 to principal`, and captured 0 console warnings/errors.
- `apps/mobile` Chrome smoke at `http://127.0.0.1:8095`: loaded the exported app in the current Chrome profile, rendered route-specific content on the non-dashboard routes, and captured 0 console warnings/errors. The automated dashboard text read was inconclusive because it sampled before the React text appeared, so the clean first-run dashboard proof for this pass is the in-app Browser smoke above.
- Native Android/iOS simulator smoke was not run in this pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.
- `apps/web` `npm test`: passed, 99 regression tests.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.

### Repair Pass 96: Mobile Legacy Storage Migration

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green contract coverage for the old standalone Expo demo defaults that saved `loc.limit: 0` under the v1 mobile assumptions key.
- Added a narrow decode-time migration that upgrades only that exact legacy default shape to the current verified car-demo Money Loop defaults.
- Preserved custom unsafe saved inputs: a user-shaped zero-LOC-limit snapshot still restores as review-mode data instead of being silently upgraded.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first with `7000 !== 6500`, then passed after the migration fix.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` exported route HTTP checks at `http://127.0.0.1:8096`: `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault` all returned 200.
- `apps/mobile` Browser migration smoke at `http://127.0.0.1:8096`: a custom saved zero-LOC-limit snapshot stayed in `Review inputs`, the exact legacy standalone default migrated to `Send $1,000 to principal`, and 0 console warnings/errors were captured.
- Chrome was not repeated for this storage-only pass; Repair Pass 95 contains the current-profile Chrome cross-check for the same exported mobile shell.
- Native Android/iOS simulator smoke was not run in this pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.

### Repair Pass 97: Mobile LOC Over-Limit Guardrail

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green contract coverage proving mobile snapshots distinguish a LOC balance above its limit from the softer `>80%` utilization warning.
- Added shared mobile guardrail copy for over-limit LOC state and applied it before high-utilization checks in Dashboard, Simulator, Portfolio, and Cockpit-derived warnings.
- Preserved the existing high-utilization warning for balances that are above 80% but not over the LOC limit.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first with the old high-utilization warning, then passed after the over-limit guardrail fix.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` exported route HTTP checks at `http://127.0.0.1:8097`: `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault` all returned 200.
- `apps/mobile` Browser over-limit smoke at `http://127.0.0.1:8097`: Dashboard, Simulator, Portfolio, and Cockpit rendered the over-limit LOC guardrail, Simulator still rendered `LOC over limit`, the softer high-utilization warning did not replace the over-limit copy, and 0 console warnings/errors were captured.
- Chrome was not repeated for this mobile engine guardrail pass; Repair Pass 95 contains the current-profile Chrome cross-check for the same exported mobile shell.
- Native Android/iOS simulator smoke was not run in this pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.

### Repair Pass 98: Web LOC Over-Limit Warning Parity

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green regression coverage proving web Dashboard and Simulator warning models distinguish a LOC balance above its limit from generic high utilization.
- Added `loc-overlimit` warning branches in the web Dashboard and Simulator presentation models, so over-limit LOC state now renders a distinct warning before the softer `>80%` utilization warning.
- Preserved the high-utilization warning for balances above 80% but still within the LOC limit.

Post-repair verification:

- `apps/web` `npm test`: failed first with Simulator still returning `High LOC utilization`, then passed with 100 regression tests after the fix.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.
- Local route HTTP checks at `http://127.0.0.1:5140`: `/` and `/simulator` returned 200.
- In-app Browser smoke at `http://127.0.0.1:5140`: edited LOC limit to `$10,000` and LOC balance to `$10,500`; Dashboard rendered `Pay down the LOC`, `105% used`, and `LOC balance is over the limit`; Simulator rendered the same over-limit warning plus `LOC over limit`; generic high-utilization copy did not replace the over-limit copy; 0 console warnings/errors were captured.
- Chrome smoke repeated the same UI-edit flow with 0 console warnings/errors, then restored the Chrome demo values to `$6,500` income, `$5,000` expenses, `$1,000` chunk, `$25,000` LOC limit, and `$3,200` LOC balance before closing the automation tab.
- Native Android/iOS simulator smoke was not run in this web-only pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.

### Repair Pass 99: Portfolio LOC Over-Limit Projection Guard

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green regression coverage proving Portfolio Velocity refuses to project debt-free timing when the LOC balance is at or above the available limit.
- Added `loc-overlimit` to Portfolio invalid projection reasons, matching the shared Money Loop and multi-debt velocity guardrails.
- Portfolio Velocity now returns "Review inputs" / "Not projected" states for blocked LOC plans instead of ignoring the LOC balance and projecting payoff from the other debts.
- Portfolio warnings now explain that the LOC balance is above or at the available limit before the user trusts the Portfolio Velocity plan.

Post-repair verification:

- `apps/web` `npm test`: failed first with Portfolio still returning `isPayoffPossible: true`, then passed with 101 regression tests after the fix.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.
- `node scripts\mobile-port-contract-tests.cjs`: passed, keeping Expo/mobile shared-engine snapshots aligned.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.
- Local route HTTP check at `http://127.0.0.1:5140`: `/portfolio` returned 200.
- In-app Browser smoke at `http://127.0.0.1:5140/portfolio`: edited LOC limit to `$10,000` and LOC balance to `$10,500`; Portfolio rendered `Review inputs`, `Not projected`, and `LOC balance is above the available limit`; the generic LOC-utilization caution did not replace the over-limit warning; 0 console warnings/errors were captured.
- Chrome smoke repeated the same Portfolio UI-edit flow with 0 console warnings/errors, then restored the Chrome demo LOC values to `$25,000` limit and `$3,200` balance before closing the automation tab.
- Native Android/iOS simulator smoke was not run in this web-only pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.

### Repair Pass 100: Portfolio Missing LOC Limit Guard

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green regression coverage proving Portfolio Velocity treats an existing LOC balance without a LOC limit as setup needed.
- Added `loc-setup` to Portfolio invalid projection reasons so missing LOC capacity is distinct from an over-limit LOC.
- Portfolio Velocity now returns "Review inputs" / "Not projected" for a LOC balance with no limit instead of projecting payoff while excluding that LOC balance from the plan.
- Portfolio warnings now explain that the LOC balance is present but the limit is missing, without rendering `Infinity` or `NaN` utilization copy.

Post-repair verification:

- `apps/web` `npm test`: failed first with Portfolio still returning `isPayoffPossible: true`, then passed with 102 regression tests after the fix.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.
- `node scripts\mobile-port-contract-tests.cjs`: passed, keeping Expo/mobile shared-engine snapshots aligned.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.
- Local route HTTP check at `http://127.0.0.1:5143`: `/portfolio` returned 200.
- In-app Browser smoke at `http://127.0.0.1:5143/portfolio`: edited LOC limit to `$0` and LOC balance to `$3,200`; Portfolio rendered `Review inputs`, `Not projected`, and `LOC balance is present, but the limit is missing`; no `Infinity`/`NaN` copy appeared; 0 console warnings/errors were captured.
- Chrome smoke repeated the same Portfolio missing-limit state with 0 console warnings/errors, then restored the Chrome demo LOC values to `$25,000` limit and `$3,200` balance before closing the automation tab.
- Native Android/iOS simulator smoke was not run in this web-only pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.

### Repair Pass 101: Portfolio High LOC Utilization Warning

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green regression coverage proving Portfolio Velocity warns when LOC utilization is above 80% but still below the available limit.
- Portfolio Velocity now emits a non-blocking warning for high LOC utilization while keeping the Money Loop simulation active.
- The warning is separate from the over-limit and missing-limit guardrails, so users see the right coach-tone next step for each LOC state.

Post-repair verification:

- `apps/web` `npm test`: failed first with the high-utilization warning missing, then passed with 103 regression tests after the fix.
- `apps/web` `npm run lint`: passed with 0 problems.
- `apps/web` `npm run build`: passed with a successful production build.
- `node scripts\mobile-port-contract-tests.cjs`: passed, keeping Expo/mobile shared-engine snapshots aligned.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.
- Local route HTTP check at `http://127.0.0.1:5144`: `/portfolio` returned 200.
- In-app Browser smoke at `http://127.0.0.1:5144/portfolio`: edited monthly expenses to `$1,000`, LOC limit to `$10,000`, and LOC balance to `$9,000`; Portfolio rendered `LOC is over 80% utilized`, kept the Money Loop ledger active, did not render `Review inputs`, and captured 0 console warnings/errors.
- Chrome smoke repeated the same Portfolio high-utilization state with 0 console warnings/errors, then restored the Chrome demo values to `$5,000` expenses, `$25,000` LOC limit, and `$3,200` LOC balance before closing the automation tab.
- Native Android/iOS simulator smoke was not run in this web-only pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.

### Repair Pass 102: Mobile LOC Balance And APR Controls

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green mobile contract coverage requiring Expo native assumption controls for LOC balance and LOC APR, not only LOC limit.
- Added a native LOC balance input to the Expo shell so mobile users can exercise high-utilization and over-limit guardrails without lowering the LOC limit as a workaround.
- Added a native LOC APR input that stores APR as the shared engine decimal while displaying normal percent values with two-decimal precision.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first with the LOC balance/APR controls missing, failed again when APR display precision rounded `9.25%` to `9.3%`, then passed after both fixes.
- `apps/mobile` `npm run check`: passed with `tsc --noEmit`.
- `apps/mobile` `npm run build:web`: passed and exported `dist-web`.
- `apps/web` `npm test`: passed with 103 regression tests.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.
- Local exported Expo route HTTP check at `http://127.0.0.1:8088`: `/portfolio` returned 200.
- In-app Browser smoke on the exported Expo web build: opened `/portfolio`, edited LOC balance to `$21,000` and LOC APR to `9.25%`, confirmed both controls rendered, confirmed the high-utilization guardrail appeared, confirmed APR displayed as `9.25`, and captured 0 console warnings/errors.
- Chrome smoke repeated the same exported Expo LOC balance/APR edit flow with 0 console warnings/errors, then restored Chrome values to `$3,200` LOC balance and `8.5%` LOC APR before closing the automation tab.
- Native Android/iOS simulator smoke was not run in this pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.

### Repair Pass 103: Mobile Active Debt Controls

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green mobile contract coverage requiring Expo native controls for active debt balance, active debt APR, active debt monthly payment, and active debt term months.
- Added native active debt inputs to the Expo shell so the mobile Portfolio, Simulator, Dashboard, and Cockpit snapshots can be tested against debt assumptions beyond the default car demo.
- Added a whole-number input for debt term months so term edits stay numeric without treating the value as currency.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first with the active debt balance control missing, then passed after adding the debt controls.
- `apps/mobile` `npm run check`: passed with `tsc --noEmit`.
- `apps/mobile` `npm run build:web`: passed and exported `dist-web`.
- `apps/web` `npm test`: passed with 103 regression tests.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.
- Local exported Expo route HTTP check at `http://127.0.0.1:8103`: `/portfolio` returned 200.
- In-app Browser smoke on the exported Expo web build: opened `/portfolio`, confirmed all four active debt controls rendered uniquely, edited debt balance to `$12,000`, debt APR to `5.75%`, monthly payment to `$500`, and term to `36` months, confirmed Portfolio recalculated total modeled debt and modeled minimums from the edited inputs, and captured 0 console warnings/errors.
- Chrome smoke repeated the same exported Expo active-debt edit flow with 0 console warnings/errors, then restored Browser and Chrome active debt values to `$18,450`, `6.9%`, `$425`, and `48` months before closing the Chrome automation tab.
- Native Android/iOS simulator smoke was not run in this pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.

### Repair Pass 104: Mobile Active Debt Name Control

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green mobile contract coverage requiring an Expo native control for the active debt name, not only the debt balance, APR, payment, and term.
- Added a native debt-name text input to the Expo shell so Portfolio and Cockpit labels can reflect the user's modeled debt instead of staying fixed to the default car demo.
- Kept the control inside the existing persisted mobile assumption state so exported-web smoke and native storage use the same shared input shape.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first with the active debt name control missing, then passed after adding the text input.
- `apps/mobile` `npm run check`: passed with `tsc --noEmit`.
- `apps/mobile` `npm run build:web`: passed and exported `dist-web`.
- `apps/web` `npm test`: passed with 103 regression tests.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.
- Local exported Expo route HTTP check at `http://127.0.0.1:8104`: `/portfolio` returned 200.
- In-app Browser smoke on the exported Expo web build: opened `/portfolio`, confirmed the active debt name control rendered uniquely, edited it to `Credit Card`, confirmed Portfolio used the edited debt name, and captured 0 console warnings/errors.
- Chrome smoke repeated the same exported Expo debt-name edit flow with 0 console warnings/errors, then restored Browser and Chrome active debt names to `Auto Loan` before closing the Chrome automation tab.
- Native Android/iOS simulator smoke was not run in this pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.

### Repair Pass 105: Mobile Vault Outcome Path

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green mobile contract coverage requiring a shared `buildMobileVaultSnapshot` engine function and requiring the Expo Vault route to stop rendering the placeholder "until scenarios are editable" copy.
- Added a shared mobile Vault snapshot that turns the active debt, cash flow, chunk, and LOC inputs into a three-stage outcome path: Stabilize, Debt Freedom, and Buffer.
- Updated the Expo Vault panel to render the shared Vault snapshot, including a modeled freedom-path label, interest-freed comparison, and guardrail copy when inputs are unsafe.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first because `buildMobileVaultSnapshot` was missing and the Expo shell still lacked Vault snapshot wiring, then passed after adding the shared snapshot and panel wiring.
- `apps/mobile` `npm run check`: passed with `tsc --noEmit`.
- `apps/mobile` `npm run build:web`: passed and exported `dist-web`.
- `apps/web` `npm test`: passed with 103 regression tests.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.
- Local exported Expo route HTTP check at `http://127.0.0.1:8105`: `/vault` returned 200.
- In-app Browser smoke on the exported Expo web build: opened `/vault`, confirmed `Freedom Path`, `Debt Freedom`, and modeled engine copy rendered, edited monthly income below expenses, confirmed the Vault path switched to `Review inputs`, and captured 0 console warnings/errors.
- Chrome smoke repeated the same exported Expo Vault guardrail flow with 0 console warnings/errors, then restored Browser and Chrome income values to `$6,500` before closing the Chrome automation tab.
- Native Android/iOS simulator smoke was not run in this pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.

### Repair Pass 106: Mobile Learn Shared Lessons

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green mobile contract coverage requiring a shared `buildMobileLearnSnapshot` engine function, requiring the Expo Learn route to consume it, and requiring unsafe cash-flow inputs to stay in a learning-mode guardrail instead of presenting payoff claims.
- Added a shared mobile Learn snapshot that teaches Money Loop, Cash Flow, LOC Room, and Interest Visibility from the current active debt, cash flow, chunk, and LOC assumptions.
- Updated the Expo Learn panel to render those shared lessons and to show `Learning Mode` with `Review inputs` when the current assumptions are unsafe.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first because `buildMobileLearnSnapshot` was missing and the Expo shell still rendered local static lessons, then passed after adding the shared snapshot and panel wiring.
- `apps/mobile` `npm run check`: passed with `tsc --noEmit`.
- `apps/mobile` `npm run build:web`: passed and exported `dist-web`.
- `apps/web` `npm test`: passed with 103 regression tests.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.
- Local exported Expo route HTTP check at `http://127.0.0.1:8106`: `/learn` returned 200.
- In-app Browser smoke on the exported Expo web build: opened `/learn`, confirmed the shared Learn lessons rendered for stable inputs, edited monthly income below expenses, confirmed `Learning Mode`, `Review inputs`, negative cash flow, and the income guardrail rendered, restored income to `$6,500`, and captured 0 console warnings/errors.
- Chrome smoke repeated the exported Expo Learn guardrail flow with DOM and console checks, restored income to `$6,500`, and captured 0 console warnings/errors. Chrome screenshot and scroll capture timed out in the extension backend during this pass; Browser screenshot evidence was captured successfully.
- Native Android/iOS simulator smoke was not run in this pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.

### Repair Pass 107: Mobile Export Smoke Command

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green mobile contract coverage requiring a repeatable `smoke:web-export` command for the Expo web export.
- Added `apps/mobile/scripts/smoke-web-export.cjs`, which starts the committed export server, checks the Dashboard, Simulator, Cockpit, Portfolio, Learn, and Vault direct routes over HTTP, verifies `text/html` export-shell responses, and cleans up the server process.
- Added the `apps/mobile` package script `npm run smoke:web-export` so future mobile export route checks can run from one command after `npm run build:web`.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first because `smoke:web-export` and `scripts/smoke-web-export.cjs` were missing, then passed after adding the command and script.
- `apps/mobile` `npm run check`: passed with `tsc --noEmit`.
- `apps/mobile` `npm run build:web`: passed and exported `dist-web`.
- `apps/mobile` `npm run smoke:web-export` with `PORT=8112`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- `apps/web` `npm test`: passed with 103 regression tests.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.
- Browser/Chrome rendered smoke was not repeated for this pass because the change only adds a repeatable HTTP export fallback smoke command; Repair Pass 106 remains the latest rendered `/learn` behavior smoke.
- Native Android/iOS simulator smoke was not run in this pass; `adb`, Android `emulator`, and `xcrun` remain unavailable in the local Windows environment.

### Repair Pass 108: Mobile Native Smoke Preflight

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green mobile contract coverage requiring a repeatable `preflight:native` command for Android/iOS smoke readiness.
- Added `apps/mobile/scripts/native-preflight.cjs`, which validates native app ids, Expo platform config, EAS preview profiles, and local Android/iOS simulator tool availability.
- Added the `apps/mobile` package script `npm run preflight:native` so native smoke blockers are explicit before anyone claims Android or iOS simulator coverage.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first because `preflight:native` and `scripts/native-preflight.cjs` were missing, then passed after adding the command and script.
- `apps/mobile` `npm run check`: passed with `tsc --noEmit`.
- `apps/mobile` `npm run build:web`: passed and exported `dist-web`.
- `apps/mobile` `npm run smoke:web-export` with `PORT=8113`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- `apps/web` `npm test`: passed with 103 regression tests.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.
- `apps/mobile` `npm run preflight:native`: exited non-zero by design on this Windows host after passing app/config checks and reporting four native-smoke blockers: missing `adb`, missing Android `emulator`, non-macOS iOS simulator host, and missing `xcrun`.
- Native Android/iOS simulator smoke is still not complete; this pass makes the blocker repeatable and auditable instead of leaving it as ad hoc notes.

### Repair Pass 109: Web Built Route Smoke Command

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green web regression coverage requiring a repeatable `smoke:routes` command for the built Next app.
- Added `apps/web/scripts/smoke-routes.cjs`, which starts the built `next start` server, checks Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault over HTTP, verifies `text/html` responses, verifies InterestShield metadata, verifies Next static assets, and cleans up the server process tree on Windows.
- Added the `apps/web` package script `npm run smoke:routes` so future web route checks can run from one command after `npm run build`.

Post-repair verification:

- `apps/web` `npm test`: failed first because `smoke:routes` and `scripts/smoke-routes.cjs` were missing, failed again after real smoke exposed a Windows `npm.cmd` spawn issue, then passed after adding the Windows-safe `cmd.exe` wrapper and `taskkill` cleanup contract.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `npx vercel whoami`: timed out waiting for authentication, so deployment metadata and Vercel project logs are still not available from this environment.
- Browser/Chrome rendered smoke was not repeated for this pass because the change adds repeatable built-server HTTP route smoke; hydrated interaction coverage remains the Browser/Chrome smoke from earlier route passes.

### Repair Pass 110: Expo Codex Run Actions

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green mobile contract coverage requiring the Expo app to expose project-local Codex run actions under `apps/mobile`.
- Added `apps/mobile/script/build_and_run.sh`, which keeps the default `Run` path on `expo start`, supports direct iOS, Android, web, dev-client, tunnel, diagnostics, and local web export modes, and avoids authenticated EAS/cloud build actions.
- Added `apps/mobile/.codex/environments/environment.toml` with app-scoped actions for `Run`, `Run iOS`, `Run Android`, `Run Web`, `Expo Doctor`, and `Export Web`.
- Added a Git attributes rule so the mobile shell run script stays LF-only across Windows checkouts.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first because the project-local run script and Codex environment action file were missing, then passed after adding them.
- `apps/mobile` `bash -n ./script/build_and_run.sh`: passed.
- `apps/mobile` `bash ./script/build_and_run.sh --help`: passed and printed the supported local run modes without starting a long-lived Metro server.
- `apps/mobile` `bash ./script/build_and_run.sh --doctor`: passed 21/21 Expo project checks.
- `apps/mobile` `bash ./script/build_and_run.sh --export-web`: passed and exported `dist-web`.
- `apps/mobile` `npm run smoke:web-export` with `PORT=8115`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- `apps/web` `npm test`, `npm run build`, and `npm run smoke:routes`: passed, keeping the stacked web gate clean.
- Native Android/iOS simulator smoke is still blocked on this Windows host by the same missing local simulator tools recorded in Repair Pass 108; this pass improves the repeatable run entrypoint rather than claiming native simulator coverage.

### Repair Pass 111: Web Modal And Navigation Accessibility

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green web regression coverage requiring the primary navigation landmark, active-page `aria-current` state, intro dialog semantics, dialog label/description wiring, focus restoration, Tab focus containment, and Escape close behavior.
- Updated `Navigation` so the shared desktop/mobile nav exposes `aria-label="Primary navigation"`, a stable smoke hook, and `aria-current="page"` on the active route.
- Updated `IntroModal` so the onboarding replay overlay is a labeled modal dialog, places focus inside the dialog when opened, keeps keyboard focus inside the dialog, restores prior focus on close, and supports Escape close.
- Added a narrow ESLint exception to the CommonJS built-route smoke script so `npm run lint` can run cleanly while keeping that Node utility in `.cjs` form.

Post-repair verification:

- `apps/web` `npm test`: failed first on the new accessibility regressions, then passed with 106 regression tests after the repair.
- `apps/web` `npm run lint`: failed first on the existing CommonJS route-smoke utility, then passed after the file-scoped `@typescript-eslint/no-require-imports` exception.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- In-app Browser smoke at `http://127.0.0.1:5000/` and `/simulator`: primary navigation rendered with the correct landmark label and active route state, with no captured console errors.
- In-app Browser smoke at `http://127.0.0.1:5000/settings`: Replay Intro opened a labeled modal dialog, initial focus landed on Close intro, Shift+Tab wrapped to the final action, Escape closed the dialog, and no captured console errors were found.
- Chrome extension smoke repeated the primary navigation and Replay Intro dialog checks against the local production server with no captured console errors.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run build:web`: passed and exported `dist-web`.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- `apps/mobile` `npm run preflight:native`: exited non-zero by design on this Windows host after passing app/config checks and reporting the same four native-smoke blockers: missing `adb`, missing Android `emulator`, non-macOS iOS simulator host, and missing `xcrun`.

### Repair Pass 112: Web Skip Link Keyboard Access

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green web regression coverage requiring a keyboard skip link, plain skip-link copy, a stable main-content target, a focusable main landmark, and an accessible main landmark label.
- Added a first-focus skip link to the app shell that becomes visible on focus and points to `#main-content`.
- Updated the shared root `<main>` region with `id="main-content"`, `tabIndex={-1}`, and `aria-label="Main content"` so keyboard and assistive-technology users have a consistent destination after bypassing navigation.

Post-repair verification:

- `apps/web` `npm test`: failed first on the missing skip link, then passed with 107 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- In-app Browser smoke against the local production server confirmed the skip link text, `Main content` landmark label, focusable main target, click activation to `#main-content`, and no captured console errors. Enter-key activation on the visually hidden link was noisy in this Browser surface, so Chrome was used as the keyboard activation authority.
- Chrome extension smoke against the local production server confirmed Enter on the focused skip link moved to `#main-content` with no captured console errors.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.

### Repair Pass 113: CountUp Accessible Financial Values

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green web regression coverage requiring CountUp to compute a stable final value for assistive technology, hide animated tick text with `aria-hidden`, and render a screen-reader-only stable value.
- Updated the shared `CountUp` component so visual users still see the animated number, while assistive technology reads one stable formatted value instead of transient intermediate financial amounts.
- This central repair covers existing CountUp call sites in Portfolio and Vault without changing their financial calculations.

Post-repair verification:

- `apps/web` `npm test`: failed first on the missing stable assistive value, then passed with 108 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- In-app Browser smoke against the local production server confirmed Portfolio rendered 2 CountUp values with matching visual/stable text and `aria-hidden="true"` on the visual spans; Vault rendered 3 CountUp values after advancing to the wealth-transfer step; no console errors were captured.
- Chrome extension smoke against the local production server confirmed hydrated Portfolio CountUp values rendered the same visual/stable split with no captured console errors.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.

### Repair Pass 114: Pasted Backup Import Flow

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green web regression coverage requiring Settings and Portfolio to expose a pasted-JSON import path with stable textarea and submit hooks, visible copy, and direct empty-paste feedback.
- Added a paste-based JSON import fallback to Settings Data Backup and Portfolio backup controls so users can restore a local backup without relying only on a native file chooser.
- Kept existing file import/export controls intact and reused the same portfolio-store import validator so pasted data follows the existing sanitization and invalid-input protections.

Post-repair verification:

- `apps/web` `npm test`: failed first on the missing paste-import path, then passed with 109 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- In-app Browser smoke against the local production server confirmed Settings paste import accepted a valid backup and showed in-page success, Portfolio then rendered the imported Settings debt, Portfolio paste import accepted a second valid backup, Portfolio rendered the replacement debt, screenshot evidence was captured, and no console warnings/errors were found.
- Chrome extension smoke against the local production server confirmed the Portfolio pasted import path using the stable textarea hook and a coordinate-click fallback for the visible submit button after Chrome locator-click timed out; the imported debt and success status rendered with no console warnings/errors.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.

### Repair Pass 115: Web Vercel Deployment Config

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green web regression coverage requiring the web app to declare file-based Vercel deployment intent for the Next.js app.
- Added `apps/web/vercel.json` with Vercel schema metadata, `nextjs` framework detection, `npm run build` as the production build command, and `next dev --port $PORT` as the local Vercel dev command.
- Consulted Vercel's official project configuration and `vercel.json` documentation after the Vercel connector returned `401: Reauthentication required`; no authenticated deployment or project mutation was attempted in this pass.

Post-repair verification:

- `apps/web` `npm test`: failed first on the missing web Vercel config, then passed with 110 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `npx vercel --version`: passed with Vercel CLI 54.14.0.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.

### Repair Pass 116: Portfolio Persisted-State Sanitizer

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green web regression coverage proving corrupted browser-persisted Portfolio state is sanitized before hydration instead of poisoning the model with non-finite numbers, invalid modes, or malformed debts.
- Added a Portfolio persisted-state sanitizer that reuses the existing debt import validator, clamps safe non-negative values, falls back to current defaults for invalid fields, and preserves only known strategy/focus modes.
- Wired the sanitizer into the Zustand `persist` merge path for `interestshield-portfolio-v1`, so local-first demo storage is safer while backend auth/RLS remains intentionally unwired.

Post-repair verification:

- `apps/web` `npm test`: failed first on the missing sanitizer export, then passed with 111 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- Chrome rendered smoke against the local production server seeded corrupt `interestshield-portfolio-v1` storage, loaded `/portfolio`, confirmed the starter Portfolio rendered, the corrupt debt did not render, no bad numeric tokens appeared, and no console warnings/errors were captured.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.

### Repair Pass 117: Financial Store Persisted-State Sanitizer

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green web regression coverage proving corrupted `velocity-bank-storage` data is sanitized before hydrating the Dashboard/Simulator/Vault financial model.
- Added a financial-store persisted-state sanitizer for monthly cash-flow inputs, active domain/subcategory selections, debt accounts, LOC values, chunk settings, and mortgage details.
- Replaced the blind persisted-state merge with a sanitized merge so invalid local browser data cannot inject non-finite balances, unknown modes, malformed debts, or invalid mortgage settings into payoff calculations.

Post-repair verification:

- `apps/web` `npm test`: failed first on the missing financial-store sanitizer export, then passed with 112 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- Chrome rendered smoke against the local production server seeded corrupt `velocity-bank-storage`, loaded `/`, confirmed the Dashboard and Auto Loan rendered, no bad tokens appeared, and no console warnings/errors were captured.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.

### Repair Pass 118: Learn Progress Sanitizer

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green web regression coverage proving corrupt Learn progress storage is sanitized before hydration.
- Moved Learn progress parsing into `src/app/learn/progress-store.ts`, filtering completed module IDs to the known lesson range and preserving only valid quiz-answer indexes or explicit `null` answers.
- Replaced raw Learn `localStorage` reads/writes with guarded helpers so failed optional progress writes do not block the educational flow.

Post-repair verification:

- `apps/web` `npm test`: failed first on the missing Learn progress store module, then passed with 113 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- Chrome rendered smoke against the local production server seeded corrupt `interestshield-learn-progress`, loaded `/learn`, confirmed sanitized `2 of 6 modules complete` progress, no bad tokens appeared, and no console warnings/errors were captured.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.

### Repair Pass 119: Settings Local Demo Data Reset

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green web regression coverage requiring Settings to expose a local demo data reset path.
- Added a scoped `clearLocalDemoData` helper that removes only known InterestShield browser storage keys and preserves unrelated local storage.
- Added a Settings reset control with in-page status so users can recover from stale or corrupted local demo state without browser developer tools.

Post-repair verification:

- `apps/web` `npm test`: failed first on the missing local data reset helper, then passed with 115 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- Chrome rendered smoke against the local production server clicked the Settings reset control, confirmed the success status rendered, known InterestShield storage keys were cleared, an unrelated storage key was preserved, and no console warnings/errors were captured.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.

### Repair Pass 120: Shell Store Persisted-State Sanitizers

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green web regression coverage proving Theme, Preferences, and App shell persisted state normalize invalid browser storage before hydration.
- Added a Theme sanitizer so unknown stored theme values fall back to a valid theme class map instead of risking undefined UI classes.
- Added a Preferences sanitizer for teacher mode, intro behavior, landing preference, preview persistence hours, preview visibility, and preview refresh timestamps.
- Added an App shell sanitizer for startup gates, landing page, local demo user shape, and preview dismissal so stale storage cannot re-open the gated startup state or inject invalid routing state.

Post-repair verification:

- `apps/web` `npm test`: failed first on missing shell-store sanitizer exports, then passed with 118 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- In-app Browser smoke against the local production server loaded `/settings`, confirmed Settings and Backend status rendered, navigated through the shell to `/`, confirmed Money Loop Dashboard and Cash Flow rendered, captured screenshot evidence, and found no console warnings/errors.
- Chrome rendered smoke against the local production server seeded invalid `interestshield-theme`, `interestshield-preferences-v1`, and `interestshield-app-v1` storage, loaded `/settings`, confirmed Settings, Theme controls, Original theme, and Dashboard landing rendered, found no bad persisted tokens, captured screenshot evidence, and found no console warnings/errors.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.

### Repair Pass 121: Mobile Native Preflight SDK Detection

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green mobile contract coverage requiring native preflight to discover Android SDK tools outside PATH, inspect `ANDROID_HOME`/`ANDROID_SDK_ROOT`, and report connected devices and Android virtual devices separately.
- Updated `apps/mobile/scripts/native-preflight.cjs` so `adb` and `emulator` are discovered from PATH, Android SDK environment variables, or standard SDK install locations.
- Split Android SDK tool availability from Android smoke readiness: SDK tools can now pass while connected-device and AVD checks remain blocked when no device or virtual device is available.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first on missing SDK discovery coverage, then passed after the repair.
- `apps/mobile` `npm run preflight:native`: now passes Android app id, iOS bundle id, platform list, preview build scripts, `npx`, Android `adb`, and Android `emulator`; still blocks Android native smoke because no connected Android device is online and no AVD is returned by `emulator -list-avds`; still blocks iOS simulator smoke because the current host is Windows and `xcrun` is unavailable.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm test`: passed with 118 regression tests.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.

### Repair Pass 122: Mobile Native Preflight Run Action

Local source repairs and smoke verification completed on 2026-06-15:

- Added red/green mobile contract coverage requiring the Expo run script and Codex mobile environment to expose a direct native preflight action.
- Updated `apps/mobile/script/build_and_run.sh` with `--preflight-native` / `preflight-native` mode that reuses the committed `npm run preflight:native` check.
- Added a `Native Preflight` Codex action beside Run, Run iOS, Run Android, Run Web, Expo Doctor, and Export Web so Android/iOS readiness can be checked without starting an Expo server.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first on the missing action, then passed after the repair.
- `bash apps/mobile/script/build_and_run.sh --help`: passed and lists `--preflight-native`.
- `bash apps/mobile/script/build_and_run.sh --preflight-native`: executes the native preflight; expected exit 1 remains because no Android device is online, no Android virtual device is configured, and iOS simulator smoke requires macOS.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm test`: passed with 118 regression tests.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed.

### Repair Pass 123: Repeatable Android Expo Go Smoke

Local source repairs and smoke verification completed on 2026-06-15:

- Installed Android Command-Line Tools under the existing local Android SDK, accepted SDK licenses, installed `system-images;android-36;google_apis;x86_64`, and created the `InterestShield_Pixel_5_API_36` Android virtual device for local smoke testing.
- Added `apps/mobile` `smoke:android`, backed by `apps/mobile/scripts/smoke-android-expo-go.cjs`.
- Added `--smoke-android` / `smoke-android` to `apps/mobile/script/build_and_run.sh` and exposed a `Smoke Android` Codex action.
- The Android smoke script can boot the first available AVD when no Android device is online, waits for emulator boot completion, starts Expo in emulator-reachable LAN mode, force-stops Expo Go for a fresh launch, waits for the Android bundle, confirms `InterestShield` / `Money Loop Mobile` / `Dashboard` are present in the Android UI tree, rejects Expo Go error focus, captures a screenshot, stops Metro, shuts down only the emulator it started, and restores Expo-generated local file noise.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first on the missing script/action expectations, then passed after the repair.
- `apps/mobile` `npm run smoke:android`: passed from a cold AVD state, booted `InterestShield_Pixel_5_API_36`, smoked `emulator-5554`, captured `interestshield-android-smoke.png`, and shut the emulator down.
- `bash apps/mobile/script/build_and_run.sh --smoke-android`: passed through the same action command path.
- `apps/mobile` `npm run preflight:native`: Android SDK tools, connected emulator, and AVD checks pass; expected exit 1 remains for iOS simulator checks because the current host is Windows.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm test`: passed with 118 regression tests.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed.

### Repair Pass 124: Backend Handoff Snapshot

Local source repairs and smoke verification completed on 2026-06-15:

- Added a full local-demo backend handoff snapshot helper for Settings so future Supabase/Auth/RLS or Cloudflare migration work has a concrete, versioned export contract before real auth or server persistence is wired.
- The snapshot exports only known InterestShield browser storage keys, records `local-demo` mode, and labels provider targets as `supabase-postgres-auth-rls` and `cloudflare-workers-d1-durable-objects`.
- Added guarded snapshot import that validates version, rejects unknown storage keys before mutation, replaces only known InterestShield keys, and leaves unrelated browser storage untouched.
- Added visible Settings controls for exporting a backend handoff snapshot and importing pasted handoff JSON while keeping the existing local-only backend status truthful.

Post-repair verification:

- `apps/web` `npm test`: failed first on the missing snapshot module, then passed with 122 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed.
- `apps/mobile` `npm run check`: passed.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- In-app Browser rendered `/settings`, confirmed the backend handoff snapshot section, imported pasted handoff JSON, observed the success status, captured screenshot evidence, and found no console warnings/errors.
- Chrome rendered `/settings`, confirmed the backend handoff snapshot section and import controls, captured screenshot evidence, and found no console warnings/errors. Chrome extension click interaction timed out on this pass, so the completed import interaction proof came from the in-app Browser.

### Repair Pass 125: Production Vercel Route Smoke

Local source repairs and smoke verification completed on 2026-06-15:

- Added `apps/web` `smoke:production`, backed by `apps/web/scripts/smoke-production.cjs`.
- The production smoke defaults to `https://web-islanddevcrew.vercel.app`, allows override through `PRODUCTION_ORIGIN`, follows redirects, checks all app routes, verifies HTTP 200 HTML responses, verifies the expected InterestShield Next shell, and catches missing/protected/error deployment shells such as `DEPLOYMENT_NOT_FOUND`, `Vercel Authentication`, `Application error`, and `__next_error__`.
- Added regression coverage that the command exists, covers Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault, and keeps the production origin override explicit.
- Production Browser and Chrome smoke found the live URL reachable with no captured console warnings/errors, but the rendered app is still serving an older intro-gated UI with legacy copy. The current repo defaults keep the dashboard ungated and has stricter coach-tone copy rules, so production still needs a fresh deployment/promotion after the stacked PRs are merged.
- The Vercel connector still requires reauthentication, and this checkout has no `.vercel` project metadata or local `vercel` CLI binary available, so deployment/project inspection was not available in this pass.

Post-repair verification:

- `apps/web` `npm test`: failed first on the missing production smoke script expectation, then passed with 123 regression tests after the repair.
- `apps/web` `npm run smoke:production`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault` against `https://web-islanddevcrew.vercel.app`.
- In-app Browser rendered `https://web-islanddevcrew.vercel.app/`, confirmed title `InterestShield - Financial Empowerment`, captured screenshot evidence, found no console warnings/errors, and recorded the live deployment freshness mismatch described above.
- Chrome rendered the same live URL, confirmed the intro-gated legacy UI and no captured console warnings/errors, then closed the agent-created tab.

### Repair Pass 126: Coach-Tone Intro Copy

Local source repairs and smoke verification completed on 2026-06-15:

- Replaced legacy intro animation copy that used unsupported or fear-leaning phrasing such as `85-90%`, `drains silently`, `you lose`, `daily drain`, `watch months fall off`, and `debt-crushing`.
- Reframed the intro as an educational simulator for testing assumptions, with the sample mortgage explicitly labeled as a teaching example rather than a promise or lender quote.
- Renamed the intro action card from `Crush It` to `Plan It` and changed chunk copy to compare projected timeline changes instead of promising years off.
- Replaced a Guardian answer-bank hype phrase, `debt-crushing ammunition`, with `planned debt-paydown capacity`.
- Removed a stale engine comment that described early amortized payments with a fixed `85-90%` interest claim.
- Added regression coverage for the intro copy guard, compact mobile intro layout, and expanded the Guardian answer-bank claim guard.
- Browser mobile smoke found and repaired an overlap between the compact intro heading and caption area. The final 390x844 check measured an 11px gap between the heading and caption, action buttons ending at `y=810` inside the `844px` viewport, no horizontal overflow, and no captured console warnings/errors.

Post-repair verification:

- `apps/web` `npm test`: failed first on the old intro copy, failed again on the Guardian hype phrase after expanding the guard, then passed with 124 regression tests after the repair.
- `apps/web` `npm test`: passed with 125 regression tests after the mobile layout guard was added.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed.
- `apps/web` `npm run smoke:production`: passed against `https://web-islanddevcrew.vercel.app`.
- `apps/mobile` `npm run check`: passed.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- In-app Browser rendered local `/settings`, replayed the intro, confirmed the educational simulator copy, `Plan It` card, no legacy banned phrases, no horizontal overflow at 390x844, reachable action buttons, and no captured console warnings/errors.
- Chrome rendered local `/settings`, replayed the intro, confirmed the educational simulator copy and `Plan It` card, found no legacy banned phrases, and captured no console warnings/errors.

### Repair Pass 127: Repeatable iOS Expo Go Smoke

Local source repairs completed on 2026-06-16:

- Added a committed `apps/mobile` iOS Expo Go smoke command alongside the existing Android smoke command.
- Wired `npm run smoke:ios`, `./script/build_and_run.sh --smoke-ios`, and a Codex `Smoke iOS` action.
- The iOS smoke script fails immediately with a clear macOS/Xcode requirement on non-macOS hosts instead of hanging or implying simulator coverage exists on Windows.
- On macOS, the script uses Xcode `simctl` to choose or boot an available iPhone Simulator, starts Expo with `--ios --localhost`, waits for `iOS Bundled`, captures a simulator screenshot, and cleans up generated Expo type files and any simulator it booted.
- Added mobile contract coverage for the iOS smoke script, non-macOS blocker, Codex action, package script, and run-script mode.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first on the missing iOS smoke command, Codex action, and script; passed after the repair.
- `apps/mobile` `npm run smoke:ios`: returned the expected Windows blocker, `iOS Expo Go smoke requires macOS with Xcode and Simulator.`
- `apps/mobile` `bash script/build_and_run.sh --smoke-ios`: returned the same expected Windows blocker.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run smoke:android`: passed against `emulator-5554` and captured screenshot evidence at the temp smoke path.
- `apps/web` `npm test`: passed with 125 regression tests.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `apps/web` `npm run smoke:production`: passed for the same route set against `https://web-islanddevcrew.vercel.app`.

### Repair Pass 128: GitHub CI Quality Gates

Local source repairs completed on 2026-06-16:

- Added a GitHub Actions CI workflow for pull requests and pushes to `main` or `codex/**` branches.
- The workflow installs from the committed web and mobile lockfiles, runs web regression tests, lint, production build, and built-route smoke.
- The workflow installs mobile dependencies, runs the Expo TypeScript check, and runs the shared mobile contract tests.
- Added a Linux CI guard that runs `npm run smoke:ios` and requires the explicit macOS/Xcode blocker, so iOS simulator coverage remains honest on non-macOS runners.
- Added contract coverage requiring the CI workflow to keep the web, mobile, route-smoke, and iOS-guard checks wired.
- The first GitHub CI run exposed that `smoke:routes` killed the `npm` wrapper on Linux without killing the child Next server, leaving the step in progress. The route smoke now starts non-Windows servers in a process group and terminates that group during cleanup.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first because `.github/workflows/ci.yml` was missing; passed after the workflow was added.
- `apps/web` `npm test`: passed with 125 regression tests.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `apps/web` `npm test`: failed first after adding the route-smoke cleanup assertion, then passed with 125 regression tests after the process-group cleanup repair.
- `apps/web` `npm run smoke:routes`: passed after the cleanup repair and exited normally.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run smoke:ios`: returned the expected Windows blocker, `iOS Expo Go smoke requires macOS with Xcode and Simulator.`
- `apps/web` `npm run smoke:production`: passed against `https://web-islanddevcrew.vercel.app`.

### Repair Pass 129: Dashboard Artifact Carousel

Local source repairs completed on 2026-06-16:

- Rebuilt the Dashboard Money Loop artifact rail into an interactive artifact selector with one active showcase token and five selectable loop artifacts.
- The active artifact spins once on selection, then stops, while reduced-motion users get a stable tilted token.
- Kept the five-part Money Loop model unchanged: Income, LOC, Expenses, Cash Flow, and Principal.
- Preserved internal horizontal scrolling for the selector strip so the page remains width-contained on mobile.
- Added tab semantics, selected state, stable smoke hooks, and regression coverage for the carousel controls and animation class.

Post-repair verification:

- `apps/web` `npm test`: failed first on the missing item-selection carousel assertions, then passed with 126 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `apps/web` `npm run smoke:production`: passed against `https://web-islanddevcrew.vercel.app`.
- In-app Browser desktop smoke at `http://127.0.0.1:5000/`: 5 artifact selector nodes rendered, one selected artifact rendered, selecting Principal updated the active artifact, `artifactSpinSelect` was applied, page overflow stayed at 0, and no console warnings/errors were captured.
- In-app Browser mobile smoke at 390x844: page scroll width matched viewport width, the 760px selector strip stayed inside the rail's internal scroll area, selecting Cash Flow updated the active artifact, `artifactSpinSelect` was applied, and no console warnings/errors were captured.
- Chrome extension smoke at `http://127.0.0.1:5000/`: 5 artifact selector nodes rendered, selecting LOC updated the active artifact, `artifactSpinSelect` was applied, page overflow stayed at 0, and no console warnings/errors were captured.

### Repair Pass 130: Expo Web Export CI Gate

Local source repairs completed on 2026-06-16:

- Added the existing Expo web export build and route smoke to GitHub Actions CI.
- The CI workflow now runs `apps/mobile` `npm run build:web` with Expo telemetry disabled, then runs `npm run smoke:web-export` against the exported SPA routes.
- Extended the mobile contract test so CI must keep the Expo export build and smoke steps wired.
- This strengthens the Expo port gate by checking the web-exported mobile shell in addition to native type-checks, Android Expo Go smoke, and the explicit iOS macOS/Xcode guard.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: failed first because CI did not include the Expo web export build/smoke steps, then passed after the repair.
- `apps/mobile` `npm run build:web`: passed and exported `dist-web`.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run smoke:ios`: returned the expected Windows blocker, `iOS Expo Go smoke requires macOS with Xcode and Simulator.`
- `apps/mobile` `npm run smoke:android`: passed against `emulator-5554` and captured screenshot evidence at the temp smoke path.
- `apps/web` `npm test`: passed with 126 regression tests.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `apps/web` `npm run smoke:production`: passed against `https://web-islanddevcrew.vercel.app`.

### Repair Pass 131: Vercel Preview Protection Diagnostics

Local source repairs completed on 2026-06-16:

- Updated the production route smoke so it can send Vercel's automation bypass header when `VERCEL_AUTOMATION_BYPASS_SECRET` or `VERCEL_PROTECTION_BYPASS_SECRET` is present.
- Added dedicated diagnostics for HTTP `401`/`403` and protected-deployment signatures so release review can distinguish Vercel Deployment or Preview Protection from an application render failure.
- The current release PR preview remains blocked for unauthenticated public smoke because the Vercel preview URL returns HTTP `401`; the next release-ready smoke needs a valid bypass secret, `vercel curl`, or an unprotected production URL.

Post-repair verification:

- `apps/web` `npm test`: passed with 126 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `apps/web` `npm run smoke:production`: passed against `https://web-islanddevcrew.vercel.app`.
- Protected-preview stub smoke: passed by returning HTTP `401` with `Authentication Required` and confirming the failure text names Vercel Deployment or Preview Protection, `VERCEL_AUTOMATION_BYPASS_SECRET`, and `x-vercel-protection-bypass`.
- Bypass-header stub smoke: passed by requiring `x-vercel-protection-bypass: test-secret` before returning the valid Next shell for all production-smoke routes.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- `apps/mobile` `npm run smoke:ios`: returned the expected Windows blocker, `iOS Expo Go smoke requires macOS with Xcode and Simulator.`
- `apps/mobile` `npm run smoke:android`: passed against `emulator-5554` and captured screenshot evidence at the temp smoke path.

### Repair Pass 132: Manual Release Smoke Workflow

Local source repairs completed on 2026-06-16:

- Added `.github/workflows/release-smoke.yml` as a manual `workflow_dispatch` release check.
- The workflow accepts a `production_origin`, passes `VERCEL_AUTOMATION_BYPASS_SECRET` to the deployed route smoke when the secret is configured, and runs `apps/web` `npm run smoke:production` against the selected URL.
- The workflow can optionally rebuild and smoke the Expo web export so release verification can cover the browser app and the mobile web shell from the same run.
- Added regression coverage so the release workflow keeps the production smoke command, bypass secret, target-origin input, and optional Expo export smoke wired.

Post-repair verification:

- `apps/web` `npm test`: passed with 127 regression tests after the repair.
- GitHub workflow syntax check: `.github/workflows/release-smoke.yml` parsed as valid YAML.
- `apps/web` `npm run smoke:production`: passed against `https://web-islanddevcrew.vercel.app`.

### Repair Pass 133: Dashboard Payoff Orbit Visual

Local source repairs completed on 2026-06-16:

- Enhanced the Dashboard Money Loop artifact carousel with a dependency-free payoff orbit around the selected artifact.
- The orbit renders one model-backed node for Income, LOC, Expenses, Cash Flow, and Principal, using each artifact's tone color instead of static decoration.
- Kept the selected artifact spin-on-select behavior while adding a separate orbit sweep and reduced-motion state.
- Added regression coverage so the payoff orbit hook, five model-backed orbit nodes, tone-driven CSS variables, orbit ring, animated sweep, and reduced-motion handling remain wired.

Post-repair verification:

- `apps/web` `npm test`: passed with 128 regression tests after the repair.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- In-app Browser desktop smoke at `http://127.0.0.1:5000/`: payoff orbit rendered, 5 orbit nodes rendered, selecting Principal updated the active artifact, page overflow stayed contained, and no console warnings/errors were captured.
- In-app Browser mobile smoke at 390x844: payoff orbit rendered, 5 orbit nodes rendered, selecting Cash Flow updated the active artifact, page overflow stayed contained, and no console warnings/errors were captured.
- Chrome smoke at `http://127.0.0.1:5000/`: payoff orbit rendered, selecting LOC updated the active artifact, and no console warnings/errors were captured.

### Repair Pass 134: Mobile Dashboard Payoff Orbit Parity

Local source repairs completed on 2026-06-16:

- Added the LOC step to the shared mobile Dashboard Money Loop snapshot so Expo matches the web loop sequence: Income, LOC, Expenses, Cash Flow, and Principal.
- Added a native Dashboard payoff orbit to the Expo Money Loop card with one selectable node per shared loop step and active-step detail copy.
- Exposed the orbit as a radio group with checked and selected state for native accessibility and the exported web DOM.
- Added contract coverage for the five-step mobile loop, LOC utilization context, orbit smoke hooks, and active-node accessibility state.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- In-app Browser smoke at `http://localhost:8110/` with a 390x844 viewport: mobile payoff orbit rendered with 5 nodes, LOC selection exposed `aria-checked="true"` and `aria-selected="true"`, LOC detail copy rendered, no horizontal overflow, and no console warnings/errors were captured.
- Chrome smoke at `http://localhost:8110/`: mobile payoff orbit rendered with 5 nodes, LOC selection exposed checked/selected state, no horizontal overflow, and no console warnings/errors were captured.
- `apps/mobile` `npm run smoke:android`: passed on `emulator-5554`.
- `apps/mobile` `npm run smoke:ios`: reported the expected Windows blocker, `iOS Expo Go smoke requires macOS with Xcode and Simulator.`
- `apps/web` `npm test`: passed with 128 regression tests.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `apps/web` `npm run smoke:production`: passed against `https://web-islanddevcrew.vercel.app`.

### Repair Pass 135: Android Dashboard Orbit Smoke Gate

Local source repairs completed on 2026-06-16:

- Strengthened the repeatable Android Expo Go smoke so it scrolls the native Dashboard after launch and verifies the payoff orbit is reachable in the Android UI tree.
- The Android smoke now requires the orbit heading and LOC orbit-step label, captures a screenshot only after those checks pass, and reports a compact native UI text excerpt when the assertion fails.
- Added contract coverage so the Android smoke keeps the orbit text gate, native scroll action, case-insensitive UI dump matching, and failure excerpt.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run smoke:android`: passed on `emulator-5554` and reported `Orbit text: Payoff Orbit, LOC orbit step`.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- `apps/mobile` `npm run smoke:ios`: reported the expected Windows blocker, `iOS Expo Go smoke requires macOS with Xcode and Simulator.`
- `apps/web` `npm test`: passed with 128 regression tests.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `apps/web` `npm run smoke:production`: passed against `https://web-islanddevcrew.vercel.app`.

### Repair Pass 136: Mobile Web Export Orbit Smoke Gate

Local source repairs completed on 2026-06-16:

- Strengthened the repeatable Expo web export smoke so it inspects the emitted JavaScript bundle linked by `dist-web/index.html`, not only the HTML route shell.
- The export smoke now fails when the compiled Dashboard bundle is missing the mobile payoff orbit hook, orbit node hook prefix, orbit copy, or checked/selected ARIA state strings.
- Added contract coverage so CI keeps the bundle-level mobile Dashboard orbit assertion without adding a browser automation dependency.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault` with the Dashboard bundle orbit hooks present.
- `apps/web` `npm test`: passed with 128 regression tests.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `apps/web` `npm run smoke:production`: passed against `https://web-islanddevcrew.vercel.app`.

### Repair Pass 137: Release Smoke Mobile Contract Gate

Local source repairs completed on 2026-06-16:

- Strengthened the manual `Release smoke` workflow so optional Expo export verification now runs the mobile TypeScript check before building the export.
- Added shared mobile contract tests to the same manual release path, so a release smoke run verifies the mobile snapshots, Expo routes, native smoke wiring, and export smoke hooks before considering the mobile export gate complete.
- Added contract coverage for the manual release workflow itself, including protected-preview bypass support, deployed web route smoke, mobile type-check, Expo export smoke, and shared mobile contract tests.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- `apps/web` `npm test`: passed with 128 regression tests.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `apps/web` `npm run smoke:production`: passed against `https://web-islanddevcrew.vercel.app`.

### Repair Pass 138: Manual iOS Native Smoke Workflow

Local source repairs completed on 2026-06-16:

- Added a manual `Mobile iOS smoke` GitHub Actions workflow that runs on `macos-latest`, installs the Expo app dependencies, type-checks the mobile app, and runs the committed `npm run smoke:ios` script against an iOS Simulator.
- The workflow accepts an optional simulator name or UDID and forwards it through `IOS_SMOKE_SIMULATOR`, matching the existing iOS smoke script.
- Added contract coverage so the iOS native smoke workflow stays manual, macOS-backed, mobile-lockfile cached, type-checked, simulator-configurable, and wired to the existing Expo Go iOS smoke command.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run smoke:ios`: reported the expected Windows blocker, `iOS Expo Go smoke requires macOS with Xcode and Simulator.`
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- `apps/web` `npm test`: passed with 128 regression tests.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `apps/web` `npm run smoke:production`: passed against `https://web-islanddevcrew.vercel.app`.
- True iOS Simulator execution remains pending until the new manual workflow is run on GitHub's macOS runner or on a local macOS/Xcode host.

### Repair Pass 139: Manual Android Native Smoke Workflow

Local source repairs completed on 2026-06-16:

- Added a manual `Mobile Android smoke` GitHub Actions workflow that prepares an Android emulator on `ubuntu-latest`, installs mobile dependencies, type-checks the Expo app, and runs the committed `npm run smoke:android` script.
- The workflow accepts Android API level and AVD name inputs, creates the requested emulator profile, forwards it through `ANDROID_SMOKE_AVD`, and uploads the Android smoke screenshot artifact when available.
- Added contract coverage so the Android native smoke workflow stays manual, Linux-backed, Java/SDK prepared, emulator-backed, screenshot-producing, and wired to the existing Expo Go Android smoke command.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run smoke:android`: passed on `emulator-5554` and reported `Orbit text: Payoff Orbit, LOC orbit step`.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- `apps/web` `npm test`: passed with 128 regression tests.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed with all app routes prerendered.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- `apps/web` `npm run smoke:production`: passed against `https://web-islanddevcrew.vercel.app`.
- True GitHub-hosted Android emulator execution remains pending until the new manual workflow is available to dispatch from GitHub.

### Repair Pass 140: Live Production Rendered Freshness Smoke

Rendered production verification completed on 2026-06-16:

- In-app Browser loaded `https://web-islanddevcrew.vercel.app/` and confirmed the live production page does not expose the current dashboard hooks: `primary-navigation`, `money-loop-artifact-rail`, `money-loop-payoff-orbit`, or the four dashboard vital hooks.
- Chrome extension smoke loaded `https://web-islanddevcrew.vercel.app/?codexRenderedSmoke=20260616a` and confirmed the same production mismatch with a cache-busting query.
- Both Browser and Chrome rendered the older intro-gated app surface with title `InterestShield - Financial Empowerment`, legacy emoji navigation, `Welcome to InterestShield`, `The Money Loop - How Interest Really Works`, and `Financial Health` copy.
- Browser and Chrome captured no console warnings or errors, so the current issue is deployment freshness or production alias promotion, not a client-side crash.
- `npx vercel --version` reports Vercel CLI `54.14.0`, but `npx vercel whoami` still times out waiting for authentication and no `.vercel` project metadata exists in this checkout. Production deployment metadata, build logs, runtime logs, and alias inspection remain blocked until Vercel authentication/project access is restored.

Required release action:

- After the stacked PRs are merged, promote/deploy the current Next.js web app to the production alias, then rerun both `apps/web` `npm run smoke:production` and a rendered Browser or Chrome smoke that verifies `money-loop-artifact-rail`, `money-loop-payoff-orbit`, and the four dashboard vitals on `https://web-islanddevcrew.vercel.app/`.

### Repair Pass 141: Production Stale-Signature Smoke Guard

Local source repairs completed on 2026-06-16:

- Hardened `apps/web` `npm run smoke:production` so every route must expose the current shared shell marker `data-testid="primary-navigation"`.
- Kept extra stale-build context for the known old intro-gated build signatures: `Welcome to InterestShield`, `How Interest Really Works`, `This is NOT a budget app`, and `Financial Health`.
- Kept the smoke dependency-free and HTTP-based so the manual release workflow can still run without a browser automation package or Vercel project metadata.
- Preserved the Vercel Deployment/Preview Protection diagnostics and bypass-header support added earlier.
- Added regression coverage requiring the stale-production guard and its release-action message to stay wired.

Post-repair verification:

- `apps/web` `npm test`: passed with 128 regression tests.
- `apps/web` `npm run smoke:production`: intentionally failed against `https://web-islanddevcrew.vercel.app/` because the production alias does not expose `data-testid="primary-navigation"` from the current shell. This is the expected guard behavior until the current stack is promoted/deployed.

### Repair Pass 142: Vercel Alias Release Runbook

Release handoff completed on 2026-06-16 after PR #47 merged:

- PR #47 merged into `main` at merge commit `cebeede30c6b5f52ab5aaa0b58d1114df0ddc284`.
- `main` CI run `27596359559` passed the web and mobile quality gates.
- GitHub deployment status for `cebeede` reported Vercel success with environment URL `https://velocity-banking-mvp-v2-4jmnl51zf-islanddevcrew.vercel.app`.
- That Vercel deployment URL returned HTTP `401`, matching Deployment or Preview Protection behavior.
- The public alias `https://web-islanddevcrew.vercel.app/` still served old deployment marker `dpl_FfPyuRhZM8G4pTofYifoajjVDpLg` and did not expose `data-testid="primary-navigation"`, `money-loop-artifact-rail`, or `money-loop-payoff-orbit`.
- Chrome could open the Vercel project overview for `islanddevcrew/velocity-banking-mvp-v2`, but Vercel Domains and Deployments pages redirected to login. The overview also showed the project checklist still included `Connect Git Repository` and `Add Custom Domain`.
- Added `docs/42_VERCEL_RELEASE_ALIAS_RUNBOOK.md` with the exact alias/protection remediation steps, production smoke commands, rendered Browser/Chrome freshness markers, and GitHub issue close criteria.
- Opened issue #59 to track the remaining Vercel-side alias/protection fix.

Post-repair verification:

- `apps/web` `npm run smoke:production`: still failed against `https://web-islanddevcrew.vercel.app/` with the expected missing current shell marker.
- Vercel CLI inspect/list calls still timed out waiting for authentication.
- Vercel MCP still reported that the app connection requires reauthentication.

### Repair Pass 143: Native Preflight AVD Readiness

Local source repairs completed on 2026-06-16:

- Updated `apps/mobile/scripts/native-preflight.cjs` so a missing connected Android device is informational instead of blocking when an Android virtual device is available.
- Added an explicit `Android smoke target` preflight row that reports whether `smoke:android` will use a connected device or auto-boot the first available AVD.
- Kept iOS simulator readiness as a blocking check on non-macOS hosts so Windows runs still report that true iOS smoke requires macOS, Xcode, and Simulator.
- Updated the manual Android native smoke workflow so GitHub exposes the Android SDK command-line tools, platform tools, and emulator directories on `PATH` before calling `sdkmanager` or `avdmanager`.
- Updated the manual iOS native smoke workflow to select the available Xcode app and warm `simctl` before the Expo smoke command, and increased the iOS smoke script's initial `xcrun simctl` probe timeout for hosted macOS runners.
- Increased the iOS smoke timeout so first-run hosted macOS jobs have enough time to boot the simulator, fetch/install Expo Go, and bundle the app before declaring the smoke unavailable.
- Added one hosted iOS smoke retry so a first-run `simctl openurl` timeout after Expo Go installation can reuse the booted simulator and installed Expo Go before the workflow fails.
- Updated the iOS smoke simulator picker to prefer modern non-SE iPhone simulators before falling back to older/smaller devices, while preserving the `IOS_SMOKE_SIMULATOR` override.
- Increased the hosted Android smoke timeout so GitHub emulator boot has enough time after SDK image installation and AVD creation.
- Updated the Android hosted workflow to verify `/dev/kvm` access explicitly, and updated the Android smoke script to include recent emulator output when a hosted emulator does not finish booting.
- Added mobile contract coverage so the AVD auto-boot readiness behavior remains part of the committed mobile gate.

Post-repair verification:

- `node scripts\mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run preflight:native`: correctly reported Android AVD readiness and remained non-zero only for the expected Windows iOS simulator blockers.
- `apps/mobile` `npm run smoke:android`: passed on the local emulator, verified `Payoff Orbit` and `LOC orbit step`, and captured the Android smoke screenshot.
- `apps/mobile` `npm run smoke:ios`: correctly reported `iOS Expo Go smoke requires macOS with Xcode and Simulator.` on the Windows host.
- GitHub manual Android smoke run `27598059003` failed before this repair because `sdkmanager` was not on `PATH`; the workflow now validates the SDK command-line tools path before the install step.
- GitHub manual Android smoke run `27598285141` then reached AVD creation but timed out during hosted emulator boot at the old 240-second CI timeout; the workflow now gives hosted Android emulator boot a longer smoke window.
- GitHub manual Android smoke run `27598696767` still timed out during hosted emulator boot after the longer timeout; the workflow now verifies hosted KVM access and the smoke script emits emulator logs on boot timeout.
- GitHub manual iOS smoke run `27598059032` failed before this repair because the hosted runner did not return `xcrun simctl help` within the old 10-second startup window; the workflow now selects/warmups Xcode and the script allows a longer startup probe.
- GitHub manual iOS smoke run `27598285153` then reached Expo Go installation and Metro startup but timed out before `iOS Bundled`; the workflow now passes a longer hosted-runner timeout through `IOS_SMOKE_TIMEOUT_MS`.
- GitHub manual iOS smoke run `27598696739` then reached Expo Go installation but `simctl openurl` timed out after install; the workflow now retries the iOS smoke once to handle that first-run hosted Simulator condition.
- GitHub manual iOS smoke run `27599041735` retried but still timed out opening the project on the default iPhone SE simulator; the smoke script now prefers modern non-SE iPhone simulators when available.
- In-app Browser local rendered smoke verified the dashboard current-shell marker, four vitals, Money Loop artifact rail, payoff orbit, zero horizontal overflow, and no console warnings/errors. The Browser screenshot capture path timed out in this session.
- Chrome local mobile-emulation smoke at 390px verified the current dashboard shell, four vitals, Money Loop artifact rail, payoff orbit, zero horizontal overflow, a navigation click into `/simulator`, the Strategy Comparison and Money Loop Timeline, and no console warnings/errors. The Chrome screenshot capture path timed out in this session.

### Repair Pass 144: Hosted iOS Bundle Fallback Gate

Local source repairs completed on 2026-06-16:

- Added `apps/mobile/scripts/smoke-ios-bundle.cjs`, a repeatable iOS bundle smoke that runs `expo export --platform ios`, validates Expo metadata, and confirms an iOS bundle exists under `_expo/static/js/ios/`.
- Added `npm run smoke:ios-bundle` and ignored the generated `dist-ios/` export output.
- Updated the manual `Mobile iOS smoke` workflow so it still attempts the real Expo Go Simulator smoke first, but defaults to validating the iOS bundle export when GitHub-hosted Simulator launch fails.
- Added a `require_simulator` workflow input for strict simulator-only runs on a healthy macOS/Xcode host; strict mode keeps the second Simulator retry before failing without fallback.
- Added iOS bundle fallback artifact upload so hosted runs can keep the generated native export evidence.
- Added mobile contract coverage for the new package script, bundle smoke validator, strict workflow input, fallback copy, bounded hosted Simulator timeout, bundle output directory, and artifact upload.

Post-repair verification:

- `apps/mobile` `npm run smoke:ios-bundle`: passed and produced an iOS Hermes bundle at `dist-ios/_expo/static/js/ios/entry-*.hbc`.
- `node scripts\mobile-port-contract-tests.cjs`: passed.
- GitHub manual iOS smoke run `27599486816` still failed before this repair because hosted macOS could boot a modern `iPhone 16 Pro Max` simulator but `simctl openurl` timed out on both attempts. The new workflow path keeps that strict simulator failure visible when requested, while giving the hosted release gate a concrete iOS export validation fallback.

### Repair Pass 145: Hosted Android AVD Path Alignment

Local source repairs completed on 2026-06-16:

- Updated the manual `Mobile Android smoke` workflow to set and create `ANDROID_AVD_HOME` before SDK image installation, AVD creation, and emulator launch.
- Added a post-create `emulator -list-avds` check and an explicit `.ini` path assertion so the workflow fails immediately if the AVD is not visible where the emulator will look for it.
- Updated `apps/mobile/scripts/smoke-android-expo-go.cjs` to fail fast when `ANDROID_SMOKE_AVD` names an AVD that `emulator -list-avds` cannot see, instead of waiting through the full boot timeout.
- Added mobile contract coverage for `ANDROID_AVD_HOME`, AVD directory creation, created-AVD visibility checks, `.ini` path verification, and fail-fast requested-AVD errors.

Hosted evidence that drove the repair:

- GitHub manual Android smoke run `27600340673` completed setup, SDK install, KVM access, and AVD creation, then failed because the emulator reported `Unknown AVD name [InterestShield_CI_API_35_latest]` and searched `$HOME/.android/avd`. This repair aligns the workflow-created AVD directory with the smoke launch environment.

### Repair Pass 146: Hosted Android Bundle Fallback Gate

Local source repairs completed on 2026-06-16:

- Added `apps/mobile/scripts/smoke-android-bundle.cjs`, a repeatable Android bundle smoke that runs `expo export --platform android`, validates Expo metadata, and confirms an Android bundle exists under `_expo/static/js/android/`.
- Added `npm run smoke:android-bundle` and ignored the generated `dist-android/` export output.
- Updated the manual `Mobile Android smoke` workflow so it still attempts the real Expo Go emulator smoke first, but defaults to validating the Android bundle export when GitHub-hosted emulator launch does not complete.
- Added a `require_emulator` workflow input for strict emulator-only runs on a healthy hosted runner or dedicated Android runner.
- Added a shell-level hosted timeout around `npm run smoke:android` so a blocked emulator/device probe cannot hold the workflow until the job-level timeout.
- Added Android bundle fallback artifact upload so hosted runs can keep the generated native export evidence.
- Added mobile contract coverage for the new package script, bundle smoke validator, strict workflow input, shell-level timeout, fallback copy, Android bundle output directory, timeout, and artifact upload.

Post-repair local verification:

- `apps/mobile` `npm run smoke:android`: passed on the local emulator, verified `Payoff Orbit` and `LOC orbit step`, and captured the Android smoke screenshot.

### Repair Pass 147: Android Smoke Success Exit

Local source repairs completed on 2026-06-16:

- Updated `apps/mobile/scripts/smoke-android-expo-go.cjs` to call `process.exit(0)` after a successful `main()` resolution, ensuring hosted Android smoke exits after cleanup even if emulator or adb handles remain open.
- Added mobile contract coverage requiring the explicit success exit.

Hosted evidence that drove the repair:

- GitHub manual Android smoke run `27602289415` verified the dashboard orbit on `emulator-5554` and uploaded the screenshot, but the Node process stayed alive until the shell timeout and then ran the Android bundle fallback. This repair keeps a true emulator pass from falling through to fallback.

### Repair Pass 148: Production Alias Diagnostic Refresh

Release diagnostic work completed on 2026-06-16:

- Confirmed local `main` is at `80593472992818e76b8ecb4977a5ed5b6d2826dd` and GitHub `main` CI run `27603738467` passed the full web and mobile quality gate.
- Confirmed GitHub deployment record `5076411538` exists for that commit with environment `Production`, deployment URL `https://velocity-banking-mvp-v2-fqzvsk7oy-islanddevcrew.vercel.app`, and `production_environment: false`.
- Re-ran `apps/web` `npm run smoke:production` against `https://web-islanddevcrew.vercel.app`; it still fails because the alias does not expose `data-testid="primary-navigation"`.
- Fetched the public alias HTML with a cache-busting query and confirmed it still serves deployment marker `dpl_FfPyuRhZM8G4pTofYifoajjVDpLg`.
- Confirmed local Vercel CLI auth remains unavailable: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_AUTOMATION_BYPASS_SECRET` are missing, and `npx vercel whoami` waits for authentication.
- Confirmed the Vercel MCP connector still requires reauthentication.
- Confirmed Chrome redirects the Vercel project deployments page to login, so existing Chrome state cannot promote the alias from this environment.
- Updated `docs/42_VERCEL_RELEASE_ALIAS_RUNBOOK.md` with the latest commit, deployment record, current auth blockers, and exact diagnostic commands.

Current blocker:

- The remaining production issue is Vercel-side alias/promotion/authentication, tracked in issue #59. App source, CI, local smoke, and hosted mobile smoke gates are not the blocker.

### Repair Pass 149: Web Route Accessibility Contract

Local source repairs completed on 2026-06-16:

- Added `apps/web/scripts/accessibility-route-contract.cjs`, a dependency-free route accessibility contract that covers Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.
- Wired the contract into `apps/web` `npm test` and added `npm run test:a11y` for focused accessibility verification.
- Fixed the Vault wizard stepper so step indicators are native buttons with accessible names and current-step state instead of mouse-only clickable bars.
- Added dialog semantics and accessible names to the Guardian chat, the snapshot preview, and the Portfolio add-debt modal.
- Added accessible names/state to the domain selector, quick-adjust sliders, intro checkbox, Portfolio select controls, Portfolio split allocation editor, and add-debt modal fields.
- The contract now rejects non-native `onClick` targets and unnamed `input`, `select`, and `textarea` controls across the shared shell and route files.

Post-repair local verification:

- `apps/web` `npm test`: passed 129 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- Chrome-controlled smoke at `http://127.0.0.1:5011`: verified keyboard activation of the Vault stepper, Portfolio add-debt dialog labels/close control, Dashboard domain selector keyboard path, Guardian dialog input/send/close path, and captured no console warnings or errors.

### Repair Pass 150: Learn Progress Counter Stable Value

Local source repairs completed on 2026-06-16:

- Updated the Learn Center `AnimatedCounter` so the visual progress animation is hidden from assistive technology and a stable final value is available to screen readers.
- Initialized the Learn progress motion value from the supplied value instead of a zero placeholder.
- Added regression coverage requiring the stable screen-reader text and visual-only animated tick behavior.

Post-repair local verification:

- `apps/web` `npm test`: passed.
- `apps/web` `npm run lint`: passed.

### Repair Pass 151: Learn Decorative Canvas Accessibility

Local source repairs completed on 2026-06-16:

- Marked Learn Center confetti and grand-finale canvases as `aria-hidden` and `role="presentation"` because they are decorative celebration effects.
- Added regression coverage requiring the two Learn celebration canvases to stay hidden from assistive technology.

Post-repair local verification:

- `apps/web` `npm test`: passed.
- `apps/web` `npm run lint`: passed.

### Repair Pass 152: Portfolio Run-Diff Explanations

Local source repairs completed on 2026-06-16:

- Added `apps/web/src/engine/portfolio-run-diff.ts`, a pure comparison helper that summarizes Portfolio projections and classifies changes as improved, worsened, or neutral.
- Updated the Portfolio store to remember the previous run summary and expose `lastRunComparison` after each recompute.
- Added a visible `What changed since last run` panel to the Portfolio summary column with payoff timing, interest, cash-flow, balance, minimum-payment, strategy, focus, and target deltas.
- Added regression coverage for the comparison helper, store-backed previous-run state, and the visible Portfolio panel smoke hook.

Post-repair local verification:

- `apps/web` `npm test`: passed 134 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- In-app Browser smoke at `http://127.0.0.1:5016/portfolio`: imported a valid one-debt scenario, changed extra payment from `$0` to `$250`, verified the panel reported `2 mo sooner` and `-$219` estimated interest, and captured no console warnings or errors.

### Repair Pass 153: Portfolio Payoff Path SVG

Local source repairs completed on 2026-06-16:

- Added `apps/web/src/engine/portfolio-path-visual.ts`, a pure visual model that samples Portfolio month results into a bounded payoff path.
- Added `apps/web/src/components/PortfolioPayoffPath.tsx`, a responsive SVG panel showing balance descent, modeled progress, and total interest estimate.
- Mounted the path visual on the Portfolio route under the assumptions/warnings area, using the current Portfolio simulation result rather than duplicate page math.
- Added regression coverage for sampled balance descent, bounded SVG points, and the route-level visual smoke hooks.

Post-repair local verification:

- `apps/web` `npm test`: passed 136 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- In-app Browser smoke at `http://127.0.0.1:5019/portfolio`: imported a valid one-debt scenario, verified the Portfolio payoff path rendered with 9 model-backed nodes, a non-empty SVG path, section width `535px`, SVG width `475px`, projected-path copy, and no console warnings or errors.
- Browser screenshot capture timed out on this long page, so visual verification used rendered DOM dimensions and path/node probes.

### Repair Pass 154: Mobile Portfolio Payoff Path

Local source repairs completed on 2026-06-16:

- Added a shared-engine `payoffPath` snapshot to the mobile Portfolio model so Expo can render payoff progress without local duplicate math.
- Added a native-safe Portfolio payoff path panel in the Expo shell using React Native views, bounded engine points, accessible progress state, and stable smoke-test hooks.
- Expanded the mobile web-export smoke contract so the exported bundle must include the Portfolio payoff path markers.
- Added mobile port contract coverage for projected path status, unsafe-input review mode, bounded points, total-interest label, payoff month label, and native shell mount hooks.

Post-repair local verification:

- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`.
- `apps/mobile` `npm run smoke:android-bundle`: passed.
- `apps/mobile` `npm run smoke:ios-bundle`: passed.
- `apps/mobile` `npm run preflight:native`: Android tooling and AVD passed; iOS Simulator smoke remains blocked on this Windows host because Xcode and `xcrun` require macOS.
- `apps/mobile` `npm run smoke:android`: passed on emulator `emulator-5554`, confirming the native Expo Go shell rendered the payoff orbit path surface without source-side failure.
- `apps/mobile` `npm run smoke:ios`: blocked with the expected macOS/Xcode Simulator requirement.
- Installed-Chrome render smoke at `http://127.0.0.1:8121/portfolio`: verified the exported mobile Portfolio route rendered the payoff path, 7 sampled nodes, dimensions `320x300`, and no console warnings or page errors.
- `apps/web` `npm test`: passed 136 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.

### Repair Pass 155: Backend Readiness Panel

Local source repairs completed on 2026-06-16:

- Added `apps/web/src/app/settings/backend-readiness.ts`, a typed provider-readiness model for the current local-demo mode plus Supabase and Cloudflare backend candidates.
- Updated the Settings backend status panel so it no longer hard-codes Supabase as the selected next step while no production backend is connected.
- Reused the same backend target IDs for the backend handoff snapshot export, keeping migration metadata aligned with the Settings readiness panel.
- Added regression coverage for provider-neutral backend copy, candidate readiness fields, snapshot target consistency, and the access-control gate before storing user-owned financial data.

Post-repair local verification:

- `apps/web` `npm test`: passed 137 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault`.
- Installed-Chrome smoke at `http://127.0.0.1:5022/settings`: verified the backend readiness panel rendered 2 provider candidates, local-demo status, no-production-backend copy, and no console warnings or page errors.

### Repair Pass 156: Mobile Settings Readiness Route

Local source repairs completed on 2026-06-16:

- Added an Expo `/settings` route and stack screen so native/web-export mobile parity includes Settings.
- Added a native Settings panel with local demo storage status, provider-neutral backend readiness copy, and Supabase/Cloudflare candidate cards.
- Extended mobile export smoke to cover `/settings` and require backend-readiness bundle hooks.
- Updated mobile route contract coverage for the Settings route, typed Expo `Href` navigation boundary, and native backend readiness hooks.

Post-repair local verification:

- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/vault`, and `/settings`.
- `apps/mobile` `npm run smoke:android-bundle`: passed.
- `apps/mobile` `npm run smoke:ios-bundle`: passed.
- Installed-Chrome smoke at `http://127.0.0.1:8121/settings`: verified the exported mobile Settings route rendered the backend readiness panel, local-demo status, Supabase/Cloudflare candidates, and no console warnings or page errors.
- `apps/mobile` `npm run smoke:android`: passed on emulator `emulator-5554`.
- `apps/mobile` `npm run smoke:ios`: blocked with the expected macOS/Xcode Simulator requirement.

### Repair Pass 157: Production Alias Diagnostic Refresh

Local source repairs completed on 2026-06-16:

- Re-ran `apps/web` `npm run smoke:production` against `https://web-islanddevcrew.vercel.app` after PRs #68, #69, and #70 merged.
- Confirmed the public alias still fails because it does not expose `data-testid="primary-navigation"`.
- Confirmed latest `main` CI run `27612140333` passed for commit `ed08f2912f92aace1901e4e7643314edf770217d`.
- Confirmed GitHub deployment record `5078173939` exists for the latest commit, with Vercel target URL `https://velocity-banking-mvp-v2-eg615xlt9-islanddevcrew.vercel.app`, but `production_environment: false`.
- Updated `docs/42_VERCEL_RELEASE_ALIAS_RUNBOOK.md` with the current commit, CI run, deployment record, deployment URL, and stale public-alias result.

Current blocker:

- The remaining production issue is still Vercel-side alias/promotion/authentication, tracked in issue #59. App source, CI, local smoke, hosted preview checks, and mobile smoke gates are not the blocker.

### Repair Pass 158: GitHub Actions Node 24 Readiness

Local source repairs completed on 2026-06-16:

- Updated `.github/workflows/ci.yml` from `actions/checkout@v4` to `actions/checkout@v5`.
- Updated `.github/workflows/ci.yml` from `actions/setup-node@v4` to `actions/setup-node@v5`.
- Kept the app runtime at Node `22`; this pass only updates GitHub-owned action runtimes after hosted CI warned that Node 20 actions are deprecated.
- Verified official GitHub repository tags exist for `actions/checkout` `v5` and `actions/setup-node` `v5` through the GitHub API before editing the workflow.

Post-repair verification:

- Hosted PR and main CI are required to prove this workflow-only change because the affected behavior is GitHub Actions runtime selection.

### Repair Pass 159: Mobile Settings Starter Reset

Local source repairs completed on 2026-06-16:

- Added a persisted mobile starter-assumption reset through `usePersistedMobileAssumptions`, cloning the verified default input before saving.
- Added a native Settings action, stable smoke hook, and live status message for resetting Expo assumptions back to the starter demo.
- Extended Expo web-export smoke and mobile contract coverage for the Settings reset action, status hook, persistence hook reset path, and save-failure feedback.

Post-repair local verification:

- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/vault`, and `/settings`.
- `apps/mobile` `npm run smoke:android-bundle`: passed.
- `apps/mobile` `npm run smoke:ios-bundle`: passed.
- In-app Browser smoke at `http://127.0.0.1:8124`: edited mobile Dashboard income from `6500` to `7777`, clicked Settings reset, verified reset status text, returned to Dashboard, and verified income restored to `6500` with no console warnings/errors. Browser screenshot capture timed out, so screenshot evidence used installed Chrome fallback.
- Installed-Chrome fallback smoke at `http://127.0.0.1:8124/settings`: repeated the reset interaction, verified `7777` changed back to `6500`, captured the Settings reset status screenshot, and captured no console warnings/errors or page errors.
- Final installed-Chrome smoke against the rebuilt export at `http://127.0.0.1:8125/settings`: repeated the reset interaction, verified `7777` changed back to `6500`, and captured no console warnings/errors or page errors.
- `apps/mobile` `npm run smoke:android`: passed on emulator `emulator-5554`.
- `apps/mobile` `npm run smoke:ios`: blocked with the expected macOS/Xcode Simulator requirement.

### Repair Pass 160: Backend Migration Contract

Local source repairs completed on 2026-06-16:

- Added a typed, provider-neutral backend migration contract for user profiles, financial snapshots, simulation runs, and learning progress.
- Added owner-rule, provider-shape, local-storage-key, and handoff-target validation before any imported local-demo snapshot can claim a backend migration contract.
- Included the migration contract in the Settings backend handoff snapshot while keeping the app in truthful local-demo mode with no live auth or database writes.
- Added visible Settings copy so the exported handoff snapshot names the migration contract it contains.

Post-repair local verification:

- `apps/web` `npm test`: passed with 139 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for the production route smoke set.
- In-app Browser rendered `/settings`, confirmed the backend migration contract disclosure, financial snapshots, simulation runs, learning progress copy, and no captured console warnings/errors.
- Installed-Chrome fallback rendered `/settings`, confirmed the migration contract disclosure, captured screenshot evidence at `C:\Users\ISLAND~1\AppData\Local\Temp\interestshield-settings-contract.png`, and captured no console warnings/errors or page errors.

### Repair Pass 161: LOC ADB Closing-Balance Correction

Local source repairs completed on 2026-06-16:

- Corrected the shared Expo financial engine LOC average-daily-balance helper to sample daily closing balances, so a 30-day model includes the full month of evenly drawn expenses.
- Applied the same daily closing-balance correction to the web Money Loop event engine and the legacy web calculation helper.
- Added a cross-engine regression fixture proving the web helper, shared package helper, and Money Loop LOC interest event all return `$27.70` for the same 30-day LOC example.

Post-repair local verification:

- `apps/web` `npm test`: passed with 140 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.
- `apps/mobile` `npm run check`: passed.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/vault`, and `/settings`.
- `apps/mobile` `npm run smoke:android-bundle`: passed.
- `apps/mobile` `npm run smoke:ios-bundle`: passed.
- Installed-Chrome smoke at `http://127.0.0.1:5027`: rendered Dashboard and Simulator, confirmed the daily-accrual Dashboard assumption and Simulator event ledger, captured screenshot evidence at `C:\Users\ISLAND~1\AppData\Local\Temp\interestshield-adb-dashboard-smoke.png`, and captured no console warnings/errors or page errors.

### Repair Pass 162: Learn LOC Coach-Tone Copy

Local source repairs completed on 2026-06-16:

- Replaced Learn module copy that described the Money Loop as `magic`, `powerful`, or `double duty` with plain model-driven language.
- Replaced the common-mistakes LOC interest warning `It's not free money - every day costs you` with `LOC interest accrues daily in the model`.
- Updated the Dashboard Money Loop LOC note from a `free money` framing to `Available credit is capacity, not income`.
- Added regression coverage so Learn and Dashboard LOC copy avoid the removed hype and fear phrases.

Post-repair local verification:

- `apps/web` `npm test`: passed with 141 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.
- App-source phrase search found no remaining `magic`, `trap`, `robbed`, `scam`, `free money`, `costs you`, `double duty`, `powerful cycle`, or `it fails without` matches.
- Installed-Chrome smoke at `http://127.0.0.1:5029/learn?module=5` and `/learn?module=6`: confirmed the new module copy rendered, confirmed removed phrases stayed absent, captured screenshot evidence at `C:\Users\ISLAND~1\AppData\Local\Temp\interestshield-learn-final-copy-smoke.png`, and captured no console warnings/errors or page errors. Source regression coverage also guards the non-default quiz explanation copy.

### Repair Pass 163: Web Shared Engine Primitives

Local source repairs completed on 2026-06-16:

- Added `@interestshield/financial-engine` as a local web dependency so the web app can consume the same primitive formulas already used by the Expo shell.
- Refactored the web calculation module to import and re-export shared cash-flow, daily-rate, amortized-payment, LOC average-daily-balance interest, and currency-formatting primitives instead of maintaining duplicate implementations.
- Configured Next/Turbopack to resolve and transpile the workspace package from the repo root while keeping the app-level import stable.
- Extended the web regression harness so package-source imports resolve in tests and the suite fails if those primitives are duplicated in the web calculation module again.

Post-repair local verification:

- `apps/web` `npm test`: passed with 142 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.
- `apps/mobile` `npm run check`: passed.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/vault`, and `/settings`.
- `apps/mobile` `npm run smoke:android-bundle`: passed.
- `apps/mobile` `npm run smoke:ios-bundle`: passed.
- In-app Browser smoke at `http://127.0.0.1:5031`: rendered the local app, navigated from Dashboard to Simulator, confirmed the Simulator timeline and event ledger, and captured no console warnings/errors. Browser screenshot capture timed out.
- Installed-Chrome fallback smoke at `http://127.0.0.1:5031/simulator`: confirmed the Simulator timeline and event ledger, captured screenshot evidence at `C:\Users\ISLAND~1\AppData\Local\Temp\interestshield-shared-engine-simulator-smoke.png`, and captured no console warnings/errors or page errors.

### Repair Pass 164: Shared Money Loop Package

Local source repairs completed on 2026-06-16:

- Moved the canonical Money Loop month and payoff event-ledger types/functions into `packages/financial-engine`.
- Replaced the web `src/engine/money-loop.ts` implementation with a compatibility re-export from `@interestshield/financial-engine`, so dashboard, simulator, portfolio, and vault consumers keep their existing import path while the ledger logic has one package source.
- Reused the shared package LOC average-daily-balance helper inside the Money Loop ledger so LOC interest timing remains aligned with the closing-balance correction from Repair Pass 161.
- Added regression coverage proving the web Money Loop module re-exports the shared package functions and does not redeclare the month/payoff functions locally.

Post-repair local verification:

- `apps/web` `npm test`: passed with 143 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.
- `apps/mobile` `npm run check`: passed.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/vault`, and `/settings`.
- `apps/mobile` `npm run smoke:android-bundle`: passed.
- `apps/mobile` `npm run smoke:ios-bundle`: passed.
- In-app Browser smoke at `http://127.0.0.1:5032`: rendered Dashboard, followed the primary navigation to Simulator, confirmed the Simulator timeline and shared event ledger, and captured no console warnings/errors.

### Repair Pass 165: Mobile Uses Shared Money Loop

Local source repairs completed on 2026-06-16:

- Replaced the private mobile Velocity payoff loop inside `packages/financial-engine` with a call to the canonical `simulateMoneyLoopPayoff` function.
- Kept the mobile simulator projection shape intact while routing LOC recovery, debt interest, chunk deployment, and LOC interest through the same Money Loop payoff engine used by web consumers.
- Added a mobile contract test proving the mobile wrapper calls the canonical payoff engine, does not duplicate the payoff loop or LOC interest helper, and matches the canonical default Velocity projection.

Post-repair local verification:

- `apps/web` `npm test`: passed with 143 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.
- `apps/mobile` `npm run check`: passed.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/vault`, and `/settings`.
- `apps/mobile` `npm run smoke:android-bundle`: passed.
- `apps/mobile` `npm run smoke:ios-bundle`: passed.

### Repair Pass 166: Shared Amortized Payoff Helper

Local source repairs completed on 2026-06-16:

- Added a shared `simulateAmortizedPayoff` helper to `packages/financial-engine` with payoff months, total interest, monthly rows, and invalid-payment failure state.
- Replaced the mobile Traditional baseline and Snowball/Avalanche extra-payment payoff loops with calls to the shared amortized payoff helper.
- Added mobile contract coverage proving the mobile amortized strategy wrappers delegate to the helper, do not duplicate payoff loops, and match the canonical default projections.
- Extended the shared-engine fixture check so the helper matches the current web baseline payoff fixture.

Post-repair local verification:

- `apps/web` `npm test`: passed with 143 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.
- `apps/mobile` `npm run check`: passed.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/vault`, and `/settings`.
- `apps/mobile` `npm run smoke:android-bundle`: passed.
- `apps/mobile` `npm run smoke:ios-bundle`: passed.
- In-app Browser smoke at `http://127.0.0.1:5033/simulator`: confirmed page identity, nonblank Simulator content, strategy comparison, Money Loop timeline, event ledger, no framework overlay, and no console warnings/errors. Browser screenshot capture timed out.
- Playwright launched against installed Chrome captured fallback screenshot evidence at `C:\Users\IslandDevCrew\AppData\Local\Temp\interestshield-amortized-simulator-playwright-chrome.png` and confirmed the same Simulator strategy/timeline state with no console warnings/errors.

### Repair Pass 167: Web Uses Shared Amortized Payoff Helper

Local source repairs completed on 2026-07-01:

- Replaced the web single-debt Traditional baseline payoff loop with a call to the shared `simulateAmortizedPayoff` helper while preserving the existing web `MonthlyResult` row shape.
- Replaced the web no-LOC accelerated payoff path with the shared amortized payoff helper, including the existing cash-flow cap on extra payment.
- Re-exported `simulateAmortizedPayoff` from the web calculation compatibility module so downstream web consumers can use the canonical package surface.
- Added regression coverage proving the web baseline and no-LOC accelerated paths call the shared helper, do not keep local payoff loops, and match the shared projection fixture.

Post-repair local verification:

- `apps/web` `npm test`: passed with 144 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.
- `apps/mobile` `npm run check`: passed.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/vault`, and `/settings`.
- `apps/mobile` `npm run smoke:android-bundle`: passed.
- `apps/mobile` `npm run smoke:ios-bundle`: passed.
- In-app Browser smoke at `http://127.0.0.1:5034/simulator`: confirmed page identity, nonblank Simulator content, strategy comparison labels, Money Loop timeline, event ledger content, no framework overlay, no browser console warnings/errors, and screenshot evidence at `C:\Users\ISLAND~1\AppData\Local\Temp\interestshield-web-shared-amortized-simulator-browser.png`.

### Repair Pass 168: Web Multi-Debt Baseline Uses Shared Amortized Payoff

Local source repairs completed on 2026-07-01:

- Replaced the web multi-debt baseline comparison helper with a call to the shared `simulateAmortizedPayoff` helper.
- Preserved the existing multi-debt public result shape for baseline payoff months, baseline interest, baseline total interest, and debt names.
- Added regression coverage proving the multi-debt baseline comparison calls the shared helper, does not keep a local payoff loop, matches shared helper fixture values, and carries the shared invalid-payment baseline state for under-interest debts.

Post-repair local verification:

- `apps/web` `npm test`: passed with 145 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.
- `apps/mobile` `npm run check`: passed.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/vault`, and `/settings`.
- `apps/mobile` `npm run smoke:android-bundle`: passed.
- `apps/mobile` `npm run smoke:ios-bundle`: passed.
- In-app Browser smoke at `http://127.0.0.1:5035/portfolio`: confirmed page identity, nonblank Portfolio content, Your Debts, Payoff Strategy, Priority rows, Review Inputs, Monthly Cash Flow, no framework overlay, no browser console warnings/errors, and screenshot evidence at `C:\Users\ISLAND~1\AppData\Local\Temp\interestshield-web-multidebt-shared-amortized-portfolio-browser.png`.

### Repair Pass 169: Mobile Portfolio Path Uses Shared Amortized Payoff

Local source repairs completed on 2026-07-01:

- Replaced the shared mobile Portfolio payoff-path loop with a call to `simulateAmortizedPayoff`.
- Preserved the existing mobile Portfolio payoff-path shape, review mode, sampled points, projected-month label, total-interest label, and progress percentage behavior.
- Added mobile contract coverage proving the Portfolio path model delegates to the shared amortized payoff helper, does not duplicate a payoff loop, and matches helper fixture values for payoff months, total interest, final balance, and final progress.

Post-repair local verification:

- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/web` `npm test`: passed with 145 regression tests plus the accessibility route contract.
- `apps/web` `npm run lint`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm run build`: passed.
- `apps/mobile` `npm run build:web`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/vault`, and `/settings`.
- `apps/mobile` `npm run smoke:android-bundle`: passed.
- `apps/mobile` `npm run smoke:ios-bundle`: passed.
- In-app Browser smoke at `http://127.0.0.1:8112/portfolio`: confirmed the exported Expo Portfolio route rendered `PORTFOLIO PAYOFF PATH`, `Projected path`, `AUTO LOAN`, cash-flow coverage copy, no framework overlay, no browser console warnings/errors, and screenshot evidence at `C:\Users\ISLAND~1\AppData\Local\Temp\interestshield-mobile-portfolio-shared-amortized-browser.png`.

### Repair Pass 170: Shared Total Amortization Interest Primitive

Local source repairs completed on 2026-07-01:

- Added `calculateTotalAmortizationInterest` to `packages/financial-engine`.
- Replaced the web-local total amortization interest implementation with a compatibility import/re-export from the shared package.
- Extended web regression coverage and the mobile port contract so the shared package and web compatibility surface stay aligned on total amortization interest fixtures.

Post-repair local verification:

- `apps/web` `npm test`: passed with 145 regression tests plus the accessibility route contract.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/web` `npm run lint`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm run build`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.
- `apps/mobile` `npm run build:web`: passed.
- `apps/mobile` `npm run smoke:web-export`: passed for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/vault`, and `/settings`.
- `apps/mobile` `npm run smoke:android-bundle`: passed.
- `apps/mobile` `npm run smoke:ios-bundle`: passed.
- In-app Browser smoke at `http://127.0.0.1:5036/vault`: confirmed the local Vault route rendered the Wealth Transfer Timeline, mortgage mismatch warning, Bi-Weekly/Velocity strategy surface, footer advice disclaimer, no framework overlay, no browser console warnings/errors, and screenshot evidence at `C:\Users\ISLAND~1\AppData\Local\Temp\interestshield-shared-total-amortization-vault-browser.png`.

### Repair Pass 171: Vercel Alias Freshness Diagnostics

Changes:

- Hardened `apps/web` `npm run smoke:production` diagnostics so freshness failures include observed Vercel deployment markers plus response headers such as `x-vercel-id` and `x-vercel-cache` when present.
- Added regression coverage requiring the production smoke script to keep those deployment diagnostics.
- Refreshed `docs/42_VERCEL_RELEASE_ALIAS_RUNBOOK.md` with the current `main` commit, GitHub deployment record, deployment URL, stale public alias marker, and current remediation state.

Verification:

- `gh api 'repos/Navigata1/velocity-banking-mvp-v2/deployments?sha=2f48bbee744c1289f940e6e542b1fab48e9d004d'`: found deployment record `5277662889` for the current `main` commit.
- `gh api 'repos/Navigata1/velocity-banking-mvp-v2/deployments/5277662889/statuses'`: confirmed successful deployment URL `https://velocity-banking-mvp-v2-n31t811vi-islanddevcrew.vercel.app`; the deployment record is still not marked as the production environment.
- Direct HTTP fetch of `https://web-islanddevcrew.vercel.app/?codexFreshness=20260702a`: returned HTTP `200`, title `InterestShield - Financial Empowerment`, stale deployment marker `dpl_FfPyuRhZM8G4pTofYifoajjVDpLg`, and no current dashboard markers.
- `apps/web` `npm run smoke:production`: still intentionally fails against the public alias because `/` does not expose `data-testid="primary-navigation"`. After this pass, the failure includes the observed stale deployment marker for faster Vercel alias triage.

Remaining blocker:

- Promote or alias the current Vercel deployment to `https://web-islanddevcrew.vercel.app/`, then rerun `apps/web` `npm run smoke:production` and a rendered Browser/Chrome freshness check for the Money Loop artifact rail, payoff orbit, and four dashboard vitals.

### Repair Pass 172: Shared Daily Interest Burn Helper

Changes:

- Added `calculateDailyInterest` to `@interestshield/financial-engine` as the canonical non-negative balance-times-daily-rate helper for daily interest burn displays.
- Routed mobile dashboard and mobile portfolio daily-burn snapshots through the shared helper.
- Routed web Dashboard, Cockpit/store, Portfolio priority rationale, and Velocity targeting daily-burn logic through the shared helper instead of local `/365` formulas.
- Preserved the existing Velocity targeting behavior that accepts APR as either decimal (`0.069`) or percent (`6.9`) by normalizing percent-shaped APRs inside the shared helper.
- Added regression and mobile contract coverage for decimal APR, percent-shaped APR, and non-negative clamp behavior.

Verification:

- `apps/web` `npm test`: passed with 146 regression tests plus the accessibility route contract.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.

### Repair Pass 173: Shared Mortgage Strategy Payoff Helper

Changes:

- Replaced the web-local Vault mortgage strategy payment loop with a thin wrapper around the shared `simulateAmortizedPayoff` helper.
- Kept the existing Vault strategy result shape for Standard, Bi-Weekly, Extra Payment, and Velocity comparisons.
- Added regression coverage proving the mortgage strategy wrapper delegates to the shared helper and does not keep a separate payoff loop.

Verification:

- `apps/web` `npm test`: passed with 147 regression tests plus the accessibility route contract.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.

### Repair Pass 174: Shared Amortization Breakdown Schedule

Changes:

- Replaced the web-local yearly amortization breakdown loop with aggregation over the shared `simulateAmortizedPayoff` monthly schedule.
- Kept the existing `generateAmortizationBreakdown` return shape for Vault charts and mortgage education panels.
- Added regression coverage proving the yearly breakdown aggregates `projection.monthlyData` from the shared helper and does not keep a separate monthly-rate loop.

Verification:

- `apps/web` `npm test`: passed with 148 regression tests plus the accessibility route contract.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.

### Repair Pass 175: Shared Mortgage Analysis Schedule

Changes:

- Replaced the web-local mortgage history loop inside `calculateMortgageAnalysis` with rows from the shared `simulateAmortizedPayoff` schedule.
- Fixed purchase-mode mortgage analysis so first-seven-year education math no longer advances the current balance when `monthsElapsed` is `0`.
- Added regression coverage for same-day purchase-mode inputs: zero principal paid so far, zero interest paid so far, equity from down payment only, and a full 360-month Standard payoff strategy.

Verification:

- `apps/web` `npm test`: passed with 149 regression tests plus the accessibility route contract.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.

### Repair Pass 176: Shared Biweekly Payoff Helper

Changes:

- Replaced the exported web `simulateBiweeklyPayments` helper's discarded daily-accrual loop and separate local monthly payoff loop with a single call to the shared `simulateAmortizedPayoff` helper.
- Kept the existing labeled assumption: biweekly is modeled as the monthly equivalent of 26 half-payments per year, or one extra full payment annually.
- Added regression coverage that requires the biweekly helper to delegate to the shared payoff engine, avoid a separate loop, and match the shared fixture for a 30-year fixed loan.

Verification:

- `apps/web` `npm test`: passed with 150 regression tests plus the accessibility route contract.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.

### Repair Pass 177: Shared Standard Strategy Baseline

Changes:

- Routed the exported `comparePaymentStrategies` standard payoff path through the shared `simulateAmortizedPayoff` helper.
- Fixed the standard strategy comparison so payoff months and interest honor the actual `monthlyPayment` argument instead of assuming the entered `termMonths` and a newly derived amortized payment.
- Added regression coverage proving a higher actual monthly payment shortens the standard payoff and matches the shared helper's total-interest result.

Verification:

- `apps/web` `npm test`: passed with 151 regression tests plus the accessibility route contract.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.

### Repair Pass 178: Actual-Payment Biweekly Savings Baseline

Changes:

- Fixed the exported `simulateBiweeklyPayments` savings fields so months saved and interest saved compare against the caller's actual monthly payment baseline.
- Kept biweekly itself routed through the shared `simulateAmortizedPayoff` helper and gave both monthly and biweekly paths the same bounded payoff horizon.
- Added regression coverage proving biweekly savings now match the difference between two shared payoff projections when the actual payment differs from the term-derived amortized payment.

Verification:

- `apps/web` `npm test`: passed with 152 regression tests plus the accessibility route contract.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.

### Repair Pass 179: Payoff Horizon Failure Reason

Changes:

- Added `payoff-horizon-exceeded` to the shared amortized payoff, shared Money Loop payoff, mobile payoff, web multi-debt, and Portfolio failure-reason surfaces.
- Fixed shared payoff helpers so payments that exceed monthly interest but do not finish within the modeled horizon are no longer labeled `payment-below-interest`.
- Added web labels for Simulator and Vault invalid-state copy: `Extend projection horizon`.
- Added regression coverage for shared amortized payoff, shared Money Loop payoff, multi-debt payoff, Portfolio payoff, and Vault strategy labels.

Verification:

- `apps/web` `npm test`: passed with 156 regression tests plus the accessibility route contract.
- `scripts/mobile-port-contract-tests.cjs`: passed.
- `apps/web` `npm run lint`: passed.
- `apps/web` `npm run build`: passed.
- `apps/mobile` `npm run check`: passed.
- `apps/web` `npm run smoke:routes`: passed for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault.

### Browser And Chrome Smoke

- In-app Browser loaded local and production pages.
- Chrome extension smoke loaded production successfully.
- Current production route-shell smoke previously passed, but rendered Browser and Chrome smoke in Repair Pass 140 confirms `https://web-islanddevcrew.vercel.app` is still serving an older intro-gated deployment rather than the current four-vitals dashboard and payoff orbit surface. Repair Pass 141 turns the missing current shell marker into a failing `apps/web` `npm run smoke:production` release guard.
- Production routes rendered a reachable shell with no captured console errors:
  - `/`
  - `/simulator`
  - `/cockpit`
  - `/learn`
  - `/portfolio`
  - `/settings`
  - `/vault`
- Guardian chat opens and answers canned/state-aware questions.
- Domain switching works after the intro and preview gates are dismissed.
- The current production alias must not be treated as release-fresh until the rendered smoke hooks from Repair Pass 140 pass.

### Vercel

- The Vercel connector returned `401: Reauthentication required`.
- `npx vercel --version` is available, but `npx vercel whoami`, `npx vercel inspect`, and `npx vercel ls` timed out waiting for authentication again during Repair Pass 140 and Repair Pass 142.
- Chrome read-only inspection reached the Vercel project overview, but Domains and Deployments pages redirected to login during Repair Pass 142.
- Mobile Vercel file-based config was added in Repair Pass 92, and web Vercel file-based config was added in Repair Pass 115, but deployment metadata, build logs, runtime logs, alias promotion, and project settings still require Vercel authentication/access.
- The Vercel alias/protection handoff is documented in `docs/42_VERCEL_RELEASE_ALIAS_RUNBOOK.md` and tracked in issue #59. Repair Pass 171 refreshed the runbook with the current `main` deployment record and added stale deployment marker diagnostics to the production smoke failure.

## Highest Priority Findings

### 1. The Simulator Uses Two Different Velocity Engines

File: `apps/web/src/app/simulator/page.tsx`

Status: repaired in local source during Repair Pass 3.

The page computes `results = runSimulation(inputs)` and also computes strategy cards with `simulateMultiDebt`.

Observed with default car inputs:

- Baseline: 51 months, $2,836.85 interest.
- `runSimulation` velocity: 14 months, $789.91 interest, $2,046.93 saved.
- `simulateMultiDebt` velocity card: 8 months, $411.88 interest, $2,424.97 saved.
- `simulateMultiDebt` snowball: 13 months, $740.60 interest.

This means a user can see different "Velocity" answers for the same scenario depending on which part of the UI is consulted.

Recommended fix:

- Create one canonical engine API for strategy comparisons.
- Return all strategy results from the same daily/event simulation shape.
- Add snapshot tests for default car, mortgage, credit card, and negative cash-flow cases.

### 2. Multi-Debt Velocity Omits LOC Interest From Results

File: `apps/web/src/engine/calculations.ts`

Status: repaired in local source during Repair Pass 1.

In `simulateMultiDebt`, LOC interest is calculated and added to `locBalance`, but not added to `interestPaid` or final `totalInterestPaid`.

Impact:

- Velocity can appear artificially better than snowball/avalanche.
- The comparison card can understate true total interest.
- The "interest saved" number is not apples-to-apples.

Recommended fix:

- Track LOC interest in a separate bucket.
- Include it in total interest for velocity.
- Display debt interest, LOC interest, and total interest separately for transparency.

### 3. Negative Cash Flow Can Make Velocity Math Explode

File: `apps/web/src/engine/calculations.ts`

Status: repaired in local source during Repair Pass 1.

When cash flow is negative and `extraPayment` is zero, the default chunk calculation can become negative:

`chunkAmount = Math.min(cashFlow * 3, loc.limit * 0.4)`

Observed test:

- Income: $4,000.
- Expenses: $5,000.
- Extra payment: $0.
- Result: 600 months, $3,152,075.97 interest.
- Car balance grew from $18,450 to $1,815,104.41.

Recommended fix:

- If cash flow is `<= 0`, do not run velocity. Return a blocked/invalid plan status.
- Never allow chunk amount below zero.
- Treat invalid simulations as an explicit warning state, not as a 600-month payoff projection.

### 4. Baseline Negative Amortization Is Returned As A Payoff Projection

File: `apps/web/src/engine/calculations.ts`

Status: repaired in local source during Repair Pass 1.

For a $10,000 balance at 24 percent APR with a $100 payment, baseline simulation returned:

- 600 months.
- $722,946,405.60 interest.
- Ending balance: $722,896,405.60.

That is mathematically a failed repayment plan, not a payoff estimate.

Recommended fix:

- Return `status: "invalid"` or `status: "negative_amortization"`.
- Include `minimumRequiredPayment`.
- Block savings/ETA claims for invalid plans.

### 5. Dashboard Payoff Uses A Third Simplified Engine

File: `apps/web/src/stores/financial-store.ts`

Status: repaired in local source during Repair Pass 2.

`getVelocityPayoff` directly subtracts `minimumPayment - interest + chunkAmount` from debt monthly and estimates LOC interest as half of the chunk. It ignores LOC limit, LOC recovery time, expenses, utilization, and the daily/average-balance model used elsewhere.

Impact:

- Dashboard ETA can disagree with simulator cards.
- The dashboard may overstate velocity benefits.

Recommended fix:

- Remove calculation logic from the store.
- Stores should hold state only.
- Use one engine for dashboard, simulator, portfolio, cockpit, and vault.

### 6. Mortgage Analysis Can Report Zero Principal Paid Despite Equity

File: `apps/web/src/engine/calculations.ts`

Status: repaired in local source during Repair Pass 5.

Default mortgage inputs:

- Original cost: $320,000.
- Down payment: $64,000.
- Original loan: $256,000.
- Current balance: $285,000.

The engine clamps principal paid to zero because current balance is higher than original loan amount. That might happen after refinance/cash-out, but the app does not explain it clearly.

Recommended fix:

- Separate original purchase loan, refinance events, cash-out events, and current loan.
- If current balance exceeds original loan amount, show a "cash-out/refinance or input mismatch" warning. This warning is now emitted by the engine and surfaced in the Vault page.
- Do not infer lifetime interest from the original schedule when the current balance does not match it.

### 7. Mortgage Strategy Comparison Ignores The User Payment For Standard Interest

File: `apps/web/src/engine/calculations.ts`

Status: repaired in local source during Repair Pass 5.

`compareMortgageStrategies` reads `currentMonthlyPayment`, but standard interest is computed with `calculateTotalAmortizationInterest(balance, rate, remainingMonths)`, which derives its own amortized payment.

Impact:

- If the user's current payment differs from the amortized payment, the standard comparison can be wrong.
- Savings can be overstated or understated.

Recommended fix:

- Simulate standard payoff using the actual entered payment. This is now covered by regression tests.
- If payment is too low, return invalid/negative-amortization status. The standard mortgage strategy now exposes payoff validity.

### 8. Portfolio Simulation Mutates Input Debt Promo Terms

File: `apps/web/src/engine/portfolio.ts`

Status: repaired in local source during Repair Pass 1.

`simulatePortfolio` decrements `d.promo.monthsRemaining` on the passed-in debt objects.

Observed test:

- First run interest: $184.43.
- Same input object after first run had promo months reduced to 0.
- Second run on same input object interest: $290.55.

Recommended fix:

- Deep clone simulation inputs or store promo state in local simulation maps.
- Engine functions must be pure and deterministic.

## UX And Frontend Findings

### Onboarding And First-Run

Status: primary mobile reachability blocker repaired in local source during Repair Pass 6. Startup dashboard gate repaired in local source during Repair Pass 10.

- First-time users face an intro modal and then a second "Your Snapshot / Open Full App" preview gate.
- On mobile 390x844, the intro action buttons render at `y = 835.8` with height 56, meaning the button bottom is outside the viewport.
- The browser could not click "Let's Go!" on mobile because the target extended below the visible viewport.

Recommended fixes:

- Make the intro modal internally scrollable with reachable footer actions. The current local source now keeps the actions fully visible at 390x844.
- Combine intro and preview into one clear first-run flow. The current local source now opens the dashboard first, keeps the intro available on demand, and prevents the preview from appearing as an immediate startup overlay.
- Keep primary actions fully visible at 360x740, 390x844, and 430x932.

### Mobile Navigation

Status: viewport overflow repaired in local source during Repair Pass 6.

- Bottom navigation overflows horizontally on mobile.
- Settings and Guardian buttons were positioned beyond the 375px client width.

Recommended fixes:

- Move to a five-item bottom nav plus "More" drawer for the larger redesign, if information architecture needs more room.
- Put Guardian as a floating action button above the nav in the visual overhaul, if it should become a primary action.
- Use icons with accessible labels on mobile. The current local source now uses aria-labeled icon slots.

### Portfolio Mobile Layout

Status: repaired in local source during Repair Pass 8.

- The debt table is about 815px wide inside a 375px mobile viewport.
- It is functionally desktop-first.

Recommended fixes:

- Replace mobile table with stacked debt cards. The current local source now renders mobile debt cards and hides the table below `md`.
- Keep the table only for tablet/desktop. The current local source keeps the table visible at desktop width.
- Add compact "focus target", "balance", "APR", "minimum", and "source" rows per card. The current local source preserves editable controls in the card layout.

### Guardian Chat

Status: markdown marker issue repaired in local source during Repair Pass 7.

- Guardian chat works.
- Markdown markers render literally in some responses, for example `**Simulator**`.

Recommended fixes:

- Render markdown safely or remove markdown syntax from canned responses. The current local source removes markdown emphasis from Teacher Mode responses.
- Add quick-reply chips for common concepts.
- Show "based on your current inputs" when using app state in an answer.

### Animated Numbers

Status: simulator strategy-card animated financial values repaired in local source during Repair Pass 12. Vault strategy-card month values repaired in local source during Repair Pass 14. Shared CountUp zero-placeholder behavior repaired in local source during Repair Pass 18. Remaining animated financial values should still be reviewed route-by-route for whether animation is appropriate at all.

- CountUp previously initialized text at zero and animated when in view.
- During smoke testing, strategy values briefly exposed `0 mo` and transitional savings values.

Recommended fixes:

- For financial numbers, prefer stable final values with subtle highlight animation. The current local simulator strategy cards now use stable final text, and shared CountUp now starts from the supplied value instead of zero.
- If animation is kept, set the accessible/static value to the final value. Shared CountUp now initializes its visible value this way.
- Do not animate values in a way that can be mistaken for calculated results.

### Lint And React 19 Readiness

Lint failures include:

- `react-hooks/set-state-in-effect` across multiple mounted-state patterns.
- `react-hooks/purity` for `Date.now()` and `Math.random()` during render.
- `react-hooks/immutability` in `IntroAnimation`.
- `no-explicit-any` in portfolio/preview components.
- Unused imports and variables.

Recommended fixes:

- Create a hydration-safe client-only wrapper instead of repeated `setMounted(true)`.
- Move random particle data into `useMemo` or constants generated outside render.
- Remove unused imports.
- Replace `any` with domain types.

Status: repaired in local source during Repair Pass 4. Remaining frontend work is now product/UX quality rather than a failing lint gate.

## Backend Assessment

Current state:

- No Supabase backend is wired in this source.
- No API routes exist.
- No server data model exists.
- User data persists locally via Zustand/localStorage.
- Learn progress also uses localStorage.
- Settings page labels auth as demo-only.

Recommended backend direction:

### Best Fit For 2026 Serious Apps

Use a dedicated managed backend per serious app, not a shared loose backend.

Recommended stack:

- Supabase for relational user/account/plan data, auth, row-level security, and Postgres.
- Vercel for app hosting while the web app stays Next.js.
- Cloudflare R2 for durable exported reports/media if needed.
- Cloudflare Workers only for edge jobs, public API utilities, or image/media workflows where it clearly helps.

Why not jump straight to Cloudflare-only:

- InterestShield needs relational financial scenarios, user-owned plans, sharing/export history, and auditability.
- Supabase/Postgres is a better first fit than D1/KV for this domain.

Minimal backend schema:

- `users`
- `profiles`
- `financial_snapshots`
- `debts`
- `loc_accounts`
- `simulation_runs`
- `simulation_results`
- `learning_progress`
- `exports`
- `audit_events`

Privacy posture:

- Encrypt sensitive local exports.
- Keep bank integrations out until the simulation engine is verified.
- Make "delete my data" and "export my data" first-class.
- Never sell data.

## Visual And Product Revamp Opportunities

### Site/Hero

- Replace the current dashboard-first intro with a polished "InterestShield" product surface that still gets users into the tool immediately.
- Use a real 3D rendered financial artifact carousel:
  - shield token
  - debt note
  - LOC rail
  - mortgage vault
  - interest flame/burn meter
- Interaction: selected artifact rotates once, locks into place, and updates the dashboard context.
- Avoid a marketing-only landing page. First screen should still be usable.

### Dashboard

Status: first four-vitals repair completed in local source during Repair Pass 9. First visual teaching-layer repair completed in local source during Repair Pass 22.

- Reduce to four trusted vitals:
  - Cash Flow
  - Interest Burn
  - Debt-Free ETA
  - Next Move
- Add an "Assumptions" drawer on every calculated card. The current local dashboard now includes assumptions disclosures for each vital.
- Add an "Invalid Plan" state when math cannot support payoff. The current local dashboard now shows "Stabilize first" and warning copy instead of a debt-free date when the model is unstable.
- Add a distinctive Money Loop visual that teaches Income, LOC, Expenses, Cash Flow, and Principal. The current local dashboard now includes this as a width-contained artifact rail.
- Add "why this changed" explanations after users edit numbers. The current local dashboard now includes model-backed Cash Flow, LOC Room, Chunk, and ETA explanations that update after input edits.

### Simulator

Status: first event-ledger transparency repair completed in local source during Repair Pass 11. Invalid strategy claim guard repaired in local source during Repair Pass 12.

- Rebuild around transparent scenarios:
  - Traditional minimums
  - Extra principal
  - Snowball
  - Avalanche
  - Velocity with LOC
- Show LOC interest separately. The current local simulator now exposes LOC interest in the Money Loop Timeline.
- Show daily/event timeline for income, expenses, LOC draw, chunk, interest post. The current local simulator now shows a month-one event ledger from the canonical single-debt velocity engine.
- Add warnings before showing celebratory savings. The current local simulator now prevents invalid velocity payoff cards from showing projected months, interest, best badges, or best-strategy summaries.

### Portfolio

Status: first strategy-rationale repair completed in local source during Repair Pass 13. Minimum-coverage invalid projection guard completed during Repair Pass 24. Payment-below-interest projection guard completed during Repair Pass 26. Run-to-run Portfolio diffs completed during Repair Pass 152.

- Turn the debt table into a real planner.
- Add strategy rationale per debt:
  - cash-flow unlock
  - daily interest burn
  - promo expiration
  - utilization risk
- The current local Portfolio engine now emits this rationale per debt, and the page renders it on mobile and desktop.
- The current local Portfolio route now blocks debt-free dates and payoff-order claims when cash flow cannot cover all minimum payments.
- The current local Portfolio engine now blocks payoff projections when a debt's minimum payment does not cover estimated monthly interest.
- The current local Portfolio route now shows "what changed since last run" diffs after recomputes, including ETA, interest, cash flow, minimums, strategy, focus mode, and target changes.

### Vault

- Treat vault as an outcome path, not a calculator shortcut.
- Separate mortgage truth, debt freedom, emergency buffer, and wealth-building stages.
- Add conservative, moderate, and aggressive assumption modes.

### Algorithmic Art / SVG / Remotion / HyperFrames

- Algorithmic art:
  - daily interest burn particles
  - amortization curve morphing into a flat line
  - LOC balance as a tide/pressure gauge
- SVG:
  - small deterministic charts for payoff paths
  - icons for account types and risk flags
  - printable report graphics
- Remotion:
  - shareable "debt escape recap" videos
  - short lesson explainers
  - simulation before/after clips
- HyperFrames:
  - cinematic onboarding sequence
  - product demo reels
  - social proof/case-study videos
- 3D:
  - Three.js or React Three Fiber for web.
  - Expo GL/Three path later for native.
  - Keep all 3D optional and performance-gated.

## Testing Backlog

### Math Unit Tests

- Known amortization payment examples. Status: covered in Repair Pass 23 for a 30-year, 6% fixed-rate fixture.
- Zero APR. Status: covered in Repair Pass 23 for baseline payoff.
- Payment equal to interest. Status: covered in Repair Pass 23 for baseline invalid payoff handling.
- Payment below interest. Status: covered in Repair Pass 26 for Portfolio under-interest debt, with baseline payoff coverage from earlier engine guardrails. Shared Money Loop payoff coverage added in Repair Pass 29. Multi-debt Velocity coverage added in Repair Pass 30.
- Negative cash flow. Status: covered in Repair Pass 1 for Velocity chunk suppression and in Repair Pass 9 for dashboard unstable-plan warnings.
- Cash flow below total minimum payments. Status: covered in Repair Pass 24 for Portfolio, Repair Pass 31 for multi-debt Velocity, and Repair Pass 35 for single-debt Velocity.
- LOC balance at or above limit. Status: covered in Repair Pass 14 for single-debt Velocity, Repair Pass 30 for multi-debt Velocity, and Repair Pass 99 for Portfolio Velocity; web Dashboard/Simulator warning parity added in Repair Pass 98, and mobile snapshot warning parity added in Repair Pass 97.
- LOC utilization above 80%. Status: covered in Repair Pass 101 for Portfolio Velocity; web Dashboard/Simulator warning parity exists from earlier warning models, and mobile snapshot warning parity was added in Repair Pass 97.
- Missing LOC limit on dashboard/simulator/shared warnings. Status: covered in Repair Pass 53 for dashboard, Repair Pass 54 for simulator, Repair Pass 55 for shared engine warnings, and Repair Pass 100 for Portfolio Velocity so missing LOC capacity is setup needed instead of maxed-out/high utilization or `Infinity%` copy.
- Chunk larger than remaining debt. Status: covered in Repair Pass 23 for the shared Money Loop LOC chunk ledger.
- Chunk larger than available LOC credit. Status: covered in Repair Pass 28 for partial available-credit chunk draws.
- LOC recovery after target debt payoff. Status: covered in Repair Pass 34 for shared Money Loop payoff windows and Repair Pass 39 for multi-debt and Portfolio Velocity payoff windows.
- Single-debt Velocity cash-flow allocation. Status: covered in Repair Pass 35 so debt payment is not double-counted as LOC recovery cash flow.
- Single-debt automatic chunk sizing. Status: covered in Repair Pass 40 so the default chunk uses recoverable LOC cash flow after the regular debt payment.
- Multi-debt Velocity cash-flow allocation. Status: covered in Repair Pass 36 so focus and non-focus debt payments are not double-counted as LOC recovery cash flow.
- Portfolio Velocity cash-flow allocation. Status: covered in Repair Pass 37 so target and non-target debt payments are not double-counted as LOC recovery cash flow.
- LOC interest included in total interest. Status: covered in Repair Pass 1 for multi-debt Velocity and Repair Pass 19 for Portfolio single-lane Velocity.
- Simulator strategy comparison copy. Status: covered in Repair Pass 56 so the visual strategy comparison labels the shortest path as "Fastest" and separates time savings from interest savings or extra interest. Summary tone now follows the interest delta in Repair Pass 57.
- Promo APR expiration. Status: covered in Repair Pass 25 for Portfolio intro/post-intro APR timing.
- Portfolio split-focus extra allocation. Status: covered in Repair Pass 27.
- Portfolio engine purity. Status: covered in Repair Pass 1 for promo-term input cloning.
- Mortgage current-balance mismatch. Status: covered in Repair Pass 5.
- Mortgage extra-payment cash-flow cap. Status: covered in Repair Pass 32 for Vault mortgage strategy comparisons.
- Mortgage biweekly cash-flow cap. Status: covered in Repair Pass 33 for Vault mortgage strategy comparisons.
- Mortgage Velocity cash-flow allocation. Status: covered in Repair Pass 38 so the mortgage payment is not double-counted as LOC recovery cash flow.
- Mortgage current payment below interest. Status: covered in Repair Pass 49 for zero/under-interest current mortgage payment analysis warnings and Vault strategy guards.
- Mortgage explicit zero current rate. Status: covered in Repair Pass 50 so Vault mortgage analysis and strategy comparison do not replace `0%` current-rate inputs with the original APR.
- Mortgage down payment above purchase price. Status: covered in Repair Pass 51 so Vault mortgage analysis clamps the financed amount to `$0` and warns instead of showing a negative original loan.
- Mortgage purchase-only hidden current fields. Status: covered in Repair Pass 52 so hidden current balance, current payment, current rate, and remaining term do not drive purchase-only analysis or strategy cards. Repair Pass 175 also fixed same-day purchase-mode analysis so first-seven-year education math does not advance the current purchase balance.

### Browser/E2E Tests

- First-run desktop intro.
- First-run mobile intro.
- Open full app. Status: local Browser and Chrome route smoke covered in Repair Pass 41 for Dashboard and Simulator; expanded route interaction smoke covered in Repair Pass 42; repeatable built-server HTTP route-shell smoke added in Repair Pass 109 for Dashboard, Simulator, Cockpit, Portfolio, Learn, Settings, and Vault; repeatable production Vercel HTTP route-shell smoke added in Repair Pass 125 for the same route set. Repair Pass 140 confirmed with both Browser and Chrome that production is still serving an older intro-gated UI and does not expose the current dashboard vitals or payoff orbit hooks. Repair Pass 141 now makes the production smoke fail when the current shared navigation shell marker is missing, with extra stale-signature context for the old intro-gated deployment. Repair Pass 171 adds observed Vercel deployment diagnostics to that failure so stale alias triage can compare the served marker to the current deployment record.
- Domain switch. Status: covered in Repair Pass 42 for Dashboard Auto/House switching in Browser and Chrome.
- Edit income, expenses, chunk. Status: covered in Repair Pass 42 for Dashboard income and Simulator expenses/chunk edits.
- Simulator strategy values update. Status: covered in Repair Pass 42 for visible strategy comparison and Money Loop Timeline updates after edits.
- Guardian chat answer. Status: covered in Repair Pass 44 for Browser and Chrome teacher-mode cash-flow answer rendering.
- Export/import backup. Status: store-level round-trip and invalid-import rejection covered in Repair Pass 43; file export browser verification covered in Repair Pass 83; pasted JSON import fallback and rendered Browser/Chrome import smoke covered in Repair Pass 114. Native file-chooser upload automation remains browser-surface dependent.
- Settings theme switch. Status: covered in Repair Pass 44 for Browser theme switching and Chrome selected-state cross-check.
- Portfolio add/remove debt. Status: covered in Repair Pass 43 for in-app Browser add/remove flow with debt-specific labels; Chrome cross-check confirmed the labels.
- Vault mortgage analysis. Status: Vault step navigation and strategy/freedom-path rendering covered in Repair Pass 42; zero/under-interest current payment strategy guards covered in Repair Pass 49; explicit zero-current-rate rendering covered in Repair Pass 50; over-down-payment guard covered in Repair Pass 51; purchase-only hidden-current-field strategy guards covered in Repair Pass 52; same-day purchase-mode current-balance accuracy covered in Repair Pass 175; missing LOC limit mortgage Velocity labeling covered in Repair Pass 180; full-but-not-over-limit LOC mortgage Velocity labeling covered in Repair Pass 181. Deeper mortgage input edge cases beyond payment viability, zero-rate handling, purchase/down-payment mismatch, and entry-mode hidden-field leakage remain open for broader route-level exploration.

### Accessibility Tests

- Keyboard navigation. Status: intro modal focus containment and Escape close covered in Repair Pass 111; skip-to-main-content access covered in Repair Pass 112; broader route-by-route accessibility contract and Chrome-controlled keyboard smoke covered in Repair Pass 149.
- Screen-reader labels for editable numbers. Status: covered in Repair Pass 45 for the shared editable-number component and Dashboard core financial controls; Simulator route labels expanded in Repair Pass 46; Portfolio route labels expanded in Repair Pass 47; Vault and Cockpit labels expanded in Repair Pass 48.
- Portfolio debt-name and remove controls. Status: covered in Repair Pass 43 for debt-specific labels.
- Theme controls. Status: covered in Repair Pass 44 for selected and expanded state labels.
- Static final values for animated financial numbers. Status: CountUp visual animation now renders a stable screen-reader value in Repair Pass 113; the Learn progress counter now follows the same visual-only animation and stable screen-reader value pattern in Repair Pass 150. Decorative Learn celebration canvases are hidden from assistive technology in Repair Pass 151.
- Modal focus trap. Status: covered in Repair Pass 111 for the replayable intro dialog.
- Mobile nav reachability. Status: viewport reachability covered in Repair Pass 6; primary navigation landmark and active-page state covered in Repair Pass 111.

## Priority Roadmap

### Phase 0: Trust Stabilization

- Add math tests.
- Fix invalid/negative cash-flow handling.
- Include LOC interest in velocity totals.
- Remove duplicate calculation paths.
- Make engines pure.
- Fix lint.
- Fix mobile intro and nav.

### Phase 1: Unified Financial Engine

- Build a daily/event simulation engine. Status: started in Repair Pass 15 for single-debt and Vault mortgage Velocity; expanded in Repair Pass 16 for multi-debt Velocity.
- Define account types: amortized loan, revolving LOC, credit card, simple debt.
- Define event types: income deposit, expense, minimum payment, chunk payment, interest post.
- Return monthly rollups and transparent assumptions. Status: expanded through Repair Pass 16 with shared Money Loop ledgers for single-debt and multi-debt Velocity paths. Multi-debt invalid projection flags were added in Repair Pass 30.
- Replace dashboard/simulator/portfolio/vault calculations with this engine. Status: partial; dashboard/simulator single-debt, multi-debt Velocity, Vault mortgage Velocity, and Portfolio single-lane Velocity now use shared Money Loop steps. Repair Pass 161 aligned web and Expo LOC average-daily-balance interest to daily closing-balance sampling, Repair Pass 163 moved web cash-flow, amortized-payment, daily-rate, LOC ADB interest, and currency primitives onto `@interestshield/financial-engine`, Repair Pass 164 moved the canonical Money Loop month/payoff event ledger into the shared package, Repair Pass 165 routed the mobile Velocity payoff wrapper through that same shared payoff engine, Repair Pass 166 added shared amortized payoff helper coverage for mobile Traditional/Snowball/Avalanche, Repair Pass 167 moved the web single-debt Traditional/no-LOC accelerated payoff paths onto the shared amortized payoff helper, Repair Pass 168 moved the web multi-debt baseline comparison helper onto that shared amortized payoff helper, Repair Pass 169 moved the mobile Portfolio payoff-path projection onto the same helper, Repair Pass 170 moved total amortization interest into the shared package, Repair Pass 172 moved daily interest burn helpers for web Dashboard/Cockpit/Portfolio/Velocity targeting plus mobile snapshots into the shared package, Repair Pass 173 routed Vault mortgage strategy payment projections through the shared amortized payoff helper, Repair Pass 174 routed yearly amortization breakdowns through the shared payoff schedule, Repair Pass 175 routed mortgage analysis history through the shared payoff schedule, Repair Pass 176 routed the exported biweekly payoff helper through the shared payoff helper, Repair Pass 177 routed the exported standard strategy comparison baseline through the shared payoff helper, Repair Pass 178 aligned biweekly savings with the actual-payment monthly baseline, Repair Pass 179 added a distinct horizon-exceeded failure state for shared payoff helpers and web wrappers, Repair Pass 180 added a distinct LOC setup failure state for shared Money Loop, web Velocity, mobile Velocity, and Vault mortgage Velocity wrappers, and Repair Pass 181 split full LOC capacity from true over-limit failures across those same wrappers. Portfolio split mode now allocates available extra cash flow correctly, but still acts as a ranking/allocation planner rather than a full LOC event simulation.

### Phase 2: Product UX

- Redesign first-run flow.
- Rebuild dashboard vitals. Status: completed for the local dashboard in Repair Pass 9, with a Money Loop artifact rail added in Repair Pass 22; Expo mobile dashboard vital parity added in Repair Pass 94.
- Rebuild simulator scenario comparison.
- Rebuild portfolio mobile and desktop planner. Status: Portfolio desktop planner invalid-projection states, run comparison, and payoff path coverage are active; Repair Pass 182 formats Portfolio run-diff projection failure reasons as user-facing labels instead of raw engine codes.
- Add assumptions and warnings everywhere. Status: expanded through Repair Pass 101 with distinct over-limit LOC warnings on web Dashboard/Simulator, Portfolio invalid-projection warnings, missing-limit setup warnings, high-utilization Portfolio warnings, and Repair Pass 97 mobile snapshot parity. Repair Pass 162 tightened Learn and Dashboard LOC wording so warnings stay coach-tone instead of hype or fear phrasing. Repair Pass 180 kept missing LOC limit payoff failures labeled as setup work instead of over-limit debt. Repair Pass 181 kept exact-100% LOC utilization labeled as no available room rather than over-limit. Repair Pass 183 brought the dashboard no-capacity warning and next move into the same exact-full LOC language.

### Phase 3: Backend

- Add Supabase auth and RLS.
- Add user-owned financial snapshots. Status: backend not wired yet; Repair Pass 124 added a versioned local-demo handoff snapshot export/import path so known browser data can be migrated deliberately when Supabase/Auth/RLS or Cloudflare persistence is selected, Repair Pass 155 added a provider-neutral backend readiness model for Supabase and Cloudflare candidates before auth or user-owned data storage is implemented, and Repair Pass 160 added a provider-neutral migration contract with owner rules, provider shapes, handoff targets, and validation gates for profiles, snapshots, simulation runs, and learning progress.
- Add simulation run history.
- Add learning progress.
- Add export/import and delete account/data. Status: local portfolio backup, local demo reset, and full local-demo handoff snapshot are available; real account deletion remains blocked until backend auth exists.

### Phase 4: Visual Overhaul

- Add 3D artifact carousel hero.
- Add algorithmic payoff visuals. Status: started with the dashboard Money Loop artifact rail in Repair Pass 22, expanded with the Portfolio payoff path SVG in Repair Pass 153, and carried into the Expo native Portfolio path in Repair Pass 154; deeper 3D and animated explainers remain open.
- Add SVG charts and report cards. Status: first Portfolio SVG payoff-path panel added in Repair Pass 153; Expo native view-based payoff path parity added in Repair Pass 154.
- Add Remotion/HyperFrames-generated educational media.

### Phase 5: Mobile Port

- Port shared engine to a package. Status: started in Repair Pass 86 with `packages/financial-engine`, a mobile contract test, and shared fixtures for cash flow, amortization, ADB interest, and currency formatting; expanded in Repair Pass 163 by connecting the web app to the same package for the shared primitive formula surface; expanded in Repair Pass 164 by moving the web Money Loop event ledger into the package; expanded in Repair Pass 165 by routing the mobile Velocity payoff wrapper through the shared Money Loop payoff engine; expanded in Repair Pass 166 by adding a shared amortized payoff helper for mobile non-Velocity strategies; expanded in Repair Pass 167 by routing the web baseline and no-LOC accelerated payoff paths through that same shared amortized payoff helper; expanded in Repair Pass 168 by routing web multi-debt baseline comparisons through the helper; expanded in Repair Pass 169 by routing the mobile Portfolio payoff-path projection through the helper; expanded in Repair Pass 170 by adding shared total amortization interest; expanded in Repair Pass 172 by adding shared daily interest burn.
- Build Expo app shell. Status: started in Repair Pass 86 with an Expo SDK 56 app at `apps/mobile`, a native Dashboard/Simulator/Learn/Vault mode shell, Expo Doctor 21/21, and exported-web browser smoke; expanded in Repair Pass 91 with direct Expo Router paths for `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, and `/vault`; expanded in Repair Pass 92 with repeatable Expo web export, local SPA fallback smoke server, and Vercel file-based build/output/rewrite config; expanded in Repair Pass 93 with EAS native build profiles, native build scripts, runtime version policy, and Android/iOS icon metadata; expanded in Repair Pass 94 with dashboard four-vitals parity for Expo; expanded in Repair Pass 95 with first-run mobile defaults aligned to the verified web car demo; expanded in Repair Pass 96 with a legacy mobile storage migration for the old standalone Expo defaults; expanded in Repair Pass 97 with distinct over-limit LOC guardrails across mobile snapshots; expanded in Repair Pass 105 with a shared-engine mobile Vault outcome path; expanded in Repair Pass 106 with shared-engine mobile Learn lessons and unsafe-input learning-mode guardrails; expanded in Repair Pass 107 with a repeatable Expo web export route-smoke command; expanded in Repair Pass 108 with a repeatable native smoke preflight that records local Android/iOS simulator blockers; expanded in Repair Pass 110 with app-scoped Codex Run actions for Expo start, iOS, Android, web, diagnostics, and local export; expanded in Repair Pass 122 with a direct native preflight action; expanded in Repair Pass 123 with repeatable Android Expo Go smoke against a booted emulator; expanded in Repair Pass 127 with repeatable iOS Expo Go smoke wiring that runs on macOS/Xcode hosts and reports a clear Windows blocker; expanded in Repair Pass 130 with Expo web export build and route smoke coverage in CI; expanded in Repair Pass 143 with native preflight reporting that Android smoke can auto-boot an available AVD; expanded in Repair Pass 144 with a hosted iOS bundle export fallback gate for macOS runner Simulator launch failures; expanded in Repair Pass 145 with hosted Android AVD path alignment and fail-fast requested-AVD diagnostics; expanded in Repair Pass 146 with a hosted Android bundle export fallback gate for emulator launch failures; expanded in Repair Pass 147 with explicit Android smoke success exit after hosted emulator cleanup; expanded in Repair Pass 154 with native Portfolio payoff path parity, exported-web Chrome render smoke, Android emulator smoke, and iOS host-blocker documentation; expanded in Repair Pass 156 with a direct Expo `/settings` route, mobile backend readiness panel, exported-web Settings route smoke, and Android emulator smoke; expanded in Repair Pass 159 with a native Settings reset action for starter assumptions.
- Reuse validated domain types and test fixtures. Status: started in Repair Pass 86 for the first mobile dashboard snapshot; expanded in Repair Pass 163 with web primitive-formula package reuse; expanded in Repair Pass 164 with shared Money Loop ledger reuse; expanded in Repair Pass 165 with mobile Velocity wrapper reuse; expanded in Repair Pass 166 with mobile amortized strategy wrapper reuse; expanded in Repair Pass 167 with web single-debt amortized payoff fixture reuse; expanded in Repair Pass 168 with web multi-debt baseline fixture reuse; expanded in Repair Pass 169 with mobile Portfolio payoff-path fixture reuse; expanded in Repair Pass 170 with total amortization interest fixture reuse; expanded in Repair Pass 172 with daily interest burn fixture reuse; expanded in Repair Pass 174 with yearly amortization breakdown fixture reuse; expanded in Repair Pass 175 with mortgage-analysis history fixture reuse; expanded in Repair Pass 176 with biweekly payoff fixture reuse; expanded in Repair Pass 177 with standard strategy baseline fixture reuse; expanded in Repair Pass 178 with actual-payment biweekly savings fixture reuse; expanded in Repair Pass 179 with horizon-exceeded payoff fixtures; expanded in Repair Pass 180 with missing LOC limit payoff fixtures across web and mobile; expanded in Repair Pass 181 with full LOC no-capacity fixtures across web and mobile. Full web engine/package migration remains open for larger simulation paths and remaining mobile snapshot internals.
- Adapt dashboard, simulator, portfolio, and cockpit to native controls. Status: started in Repair Pass 87 with editable native assumption controls and a shared Portfolio coverage mode in the Expo shell; expanded in Repair Pass 88 with shared native Simulator strategy projections that match the current web single-debt engine; expanded in Repair Pass 90 with shared Cockpit instruments, flight checks, and unsafe-input review states; expanded in Repair Pass 102 with native LOC balance and LOC APR controls for mobile guardrail testing; expanded in Repair Pass 103 with native active-debt balance, APR, payment, and term controls; expanded in Repair Pass 104 with a native active-debt name control.
- Add offline-first encrypted local storage. Status: started in Repair Pass 89 with SecureStore-backed native assumption persistence and exported-web localStorage fallback smoke; expanded in Repair Pass 159 with a Settings reset path that restores and persists the verified starter assumptions.

## Recommended Next Move

Do not start with the 3D hero or backend migration. Start with the calculation engine and tests. Once the numbers are trustworthy, the visual layer can become bold without becoming misleading.

First implementation target:

1. Create engine test fixtures for default car, mortgage, credit card, negative cash flow, and LOC overutilization.
2. Fix `simulateMultiDebt` to include LOC interest.
3. Stop simulations from returning payoff claims when the plan is invalid.
4. Replace store-level payoff math with canonical engine calls.
5. Fix mobile intro and nav blockers.
