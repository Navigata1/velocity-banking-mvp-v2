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

### Browser And Chrome Smoke

- In-app browser loaded local and production pages.
- Chrome extension smoke test loaded production successfully.
- Production routes rendered with no captured console errors:
  - `/`
  - `/simulator`
  - `/cockpit`
  - `/learn`
  - `/portfolio`
  - `/settings`
  - `/vault`
- Guardian chat opens and answers canned/state-aware questions.
- Domain switching works after the intro and preview gates are dismissed.

### Vercel

- The Vercel connector returned `401: Reauthentication required`.
- The Vercel CLI is not installed in the workspace.
- Deployment metadata, build logs, runtime logs, and project settings were not available during this pass.

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

Status: first strategy-rationale repair completed in local source during Repair Pass 13. Minimum-coverage invalid projection guard completed during Repair Pass 24. Payment-below-interest projection guard completed during Repair Pass 26.

- Turn the debt table into a real planner.
- Add strategy rationale per debt:
  - cash-flow unlock
  - daily interest burn
  - promo expiration
  - utilization risk
- The current local Portfolio engine now emits this rationale per debt, and the page renders it on mobile and desktop.
- The current local Portfolio route now blocks debt-free dates and payoff-order claims when cash flow cannot cover all minimum payments.
- The current local Portfolio engine now blocks payoff projections when a debt's minimum payment does not cover estimated monthly interest.
- Add "what changed since last run" diffs.

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
- LOC balance at or above limit. Status: covered in Repair Pass 14 for single-debt Velocity and Repair Pass 30 for multi-debt Velocity.
- Missing LOC limit on dashboard/simulator/shared warnings. Status: covered in Repair Pass 53 for dashboard, Repair Pass 54 for simulator, and Repair Pass 55 for shared engine warnings so missing LOC capacity is setup needed instead of maxed-out/high utilization or `Infinity%` copy.
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
- Mortgage purchase-only hidden current fields. Status: covered in Repair Pass 52 so hidden current balance, current payment, current rate, and remaining term do not drive purchase-only analysis or strategy cards.

### Browser/E2E Tests

- First-run desktop intro.
- First-run mobile intro.
- Open full app. Status: local Browser and Chrome route smoke covered in Repair Pass 41 for Dashboard and Simulator; expanded route interaction smoke covered in Repair Pass 42.
- Domain switch. Status: covered in Repair Pass 42 for Dashboard Auto/House switching in Browser and Chrome.
- Edit income, expenses, chunk. Status: covered in Repair Pass 42 for Dashboard income and Simulator expenses/chunk edits.
- Simulator strategy values update. Status: covered in Repair Pass 42 for visible strategy comparison and Money Loop Timeline updates after edits.
- Guardian chat answer. Status: covered in Repair Pass 44 for Browser and Chrome teacher-mode cash-flow answer rendering.
- Export/import backup. Status: store-level round-trip and invalid-import rejection covered in Repair Pass 43; browser download/upload automation still needs a dedicated file-management pass.
- Settings theme switch. Status: covered in Repair Pass 44 for Browser theme switching and Chrome selected-state cross-check.
- Portfolio add/remove debt. Status: covered in Repair Pass 43 for in-app Browser add/remove flow with debt-specific labels; Chrome cross-check confirmed the labels.
- Vault mortgage analysis. Status: Vault step navigation and strategy/freedom-path rendering covered in Repair Pass 42; zero/under-interest current payment strategy guards covered in Repair Pass 49; explicit zero-current-rate rendering covered in Repair Pass 50; over-down-payment guard covered in Repair Pass 51; purchase-only hidden-current-field strategy guards covered in Repair Pass 52; deeper mortgage input edge cases beyond payment viability, zero-rate handling, purchase/down-payment mismatch, and entry-mode hidden-field leakage remain open.

### Accessibility Tests

- Keyboard navigation.
- Screen-reader labels for editable numbers. Status: covered in Repair Pass 45 for the shared editable-number component and Dashboard core financial controls; Simulator route labels expanded in Repair Pass 46; Portfolio route labels expanded in Repair Pass 47; Vault and Cockpit labels expanded in Repair Pass 48.
- Portfolio debt-name and remove controls. Status: covered in Repair Pass 43 for debt-specific labels.
- Theme controls. Status: covered in Repair Pass 44 for selected and expanded state labels.
- Static final values for animated financial numbers.
- Modal focus trap.
- Mobile nav reachability.

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
- Replace dashboard/simulator/portfolio/vault calculations with this engine. Status: partial; dashboard/simulator single-debt, multi-debt Velocity, Vault mortgage Velocity, and Portfolio single-lane Velocity now use shared Money Loop steps. Portfolio split mode now allocates available extra cash flow correctly, but still acts as a ranking/allocation planner rather than a full LOC event simulation.

### Phase 2: Product UX

- Redesign first-run flow.
- Rebuild dashboard vitals. Status: completed for the local dashboard in Repair Pass 9, with a Money Loop artifact rail added in Repair Pass 22.
- Rebuild simulator scenario comparison.
- Rebuild portfolio mobile and desktop planner.
- Add assumptions and warnings everywhere.

### Phase 3: Backend

- Add Supabase auth and RLS.
- Add user-owned financial snapshots.
- Add simulation run history.
- Add learning progress.
- Add export/import and delete account/data.

### Phase 4: Visual Overhaul

- Add 3D artifact carousel hero.
- Add algorithmic payoff visuals. Status: started with the dashboard Money Loop artifact rail in Repair Pass 22; full payoff-path visuals remain open.
- Add SVG charts and report cards.
- Add Remotion/HyperFrames-generated educational media.

### Phase 5: Mobile Port

- Port shared engine to a package. Status: started in Repair Pass 86 with `packages/financial-engine`, a mobile contract test, and shared fixtures for cash flow, amortization, ADB interest, and currency formatting.
- Build Expo app shell. Status: started in Repair Pass 86 with an Expo SDK 56 app at `apps/mobile`, a native Dashboard/Simulator/Learn/Vault mode shell, Expo Doctor 21/21, and exported-web browser smoke.
- Reuse validated domain types and test fixtures. Status: started in Repair Pass 86 for the first mobile dashboard snapshot; full web engine/package migration remains open.
- Adapt dashboard, simulator, and portfolio to native controls. Status: started in Repair Pass 87 with editable native assumption controls and a shared Portfolio coverage mode in the Expo shell; expanded in Repair Pass 88 with shared native Simulator strategy projections that match the current web single-debt engine.
- Add offline-first encrypted local storage. Status: started in Repair Pass 89 with SecureStore-backed native assumption persistence and exported-web localStorage fallback smoke.

## Recommended Next Move

Do not start with the 3D hero or backend migration. Start with the calculation engine and tests. Once the numbers are trustworthy, the visual layer can become bold without becoming misleading.

First implementation target:

1. Create engine test fixtures for default car, mortgage, credit card, negative cash flow, and LOC overutilization.
2. Fix `simulateMultiDebt` to include LOC interest.
3. Stop simulations from returning payoff claims when the plan is invalid.
4. Replace store-level payoff math with canonical engine calls.
5. Fix mobile intro and nav blockers.
