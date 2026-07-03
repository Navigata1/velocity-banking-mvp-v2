# Vercel Release Alias Runbook

Last updated: 2026-07-03

## Current Release State

- Use issue #59 and `apps/web` `npm run smoke:production` as the live source of truth for the latest passing `main` commit and Vercel deployment target. Do not rely on a hard-coded runbook SHA after new PRs merge.
- Latest runbook-refresh observation before PR #196 merged: commit `e15482abf2a0448a557155cdd0060f8fd9dbf6ad` (`Tone down absolute Money Loop claims (#195)`).
- GitHub Actions CI run `28636369882` completed successfully for that observed commit.
- GitHub recorded deployment `5294296887` for that observed commit:
  - environment: `Production`
  - deployment URL pattern: `https://velocity-banking-mvp-v2-<deployment-suffix>-islanddevcrew.vercel.app`
  - latest target URL observed by that production smoke: `https://velocity-banking-mvp-v2-mxhnh9zn0-islanddevcrew.vercel.app`
  - deployment status observed by `npm run smoke:production`: `success`
  - GitHub deployment record still reports `production_environment: false`
- The generated deployment URL is ephemeral: every successful `main` deployment can create a new suffix. Rerun `apps/web` `npm run smoke:production` to read the current `Latest GitHub Production deployment target` before promoting or testing a direct deployment URL.
- That generated deployment URL is protected by Vercel login/protection and does not render the app shell without a bypass or authenticated Vercel access.
- The public alias `https://web-islanddevcrew.vercel.app/` still serves the older app deployment marker `dpl_FfPyuRhZM8G4pTofYifoajjVDpLg`.
- The public alias does not expose the current release markers:
  - `data-testid="primary-navigation"`
  - `money-loop-artifact-rail`
  - `money-loop-payoff-orbit`
- The latest source-side release additions now merged into `main` include:
  - PR #105: production smoke classifies Vercel login/protection pages and reports stale deployment diagnostics.
  - PR #106: Cockpit SVG gauge dash values are clamped.
  - PR #107: shared financial-engine primitives sanitize non-finite math inputs.
  - PR #108: mobile snapshot assumptions sanitize corrupt/non-finite values.
  - PR #109: shared currency formatting guards against non-finite values.
  - PR #110: portfolio rationale display copy rejects non-finite currency/APR output.
  - PR #111: animated `CountUp` financial metrics guard against non-finite values.
  - PR #112: editable financial controls sanitize non-finite display/edit values.
  - PR #113: simulator quick-adjust sliders clamp non-finite values and CSS percentages.
  - PR #114: production smoke includes the latest GitHub Production deployment target URL, SHA, and status in stale/protected failures.
  - PR #115: release runbook records the alias/protection blocker and exact remediation path.
  - PR #116: mobile educational footer exposes the required financial-advice disclaimer.
  - PR #117: Learn advanced debt-blitz example aligns with the shared engine calculation.
  - PR #118: backend persistence plan recommends a Supabase-first lane with Cloudflare optional later.
  - PR #119: Supabase first-lane schema documents owner-scoped tables, RLS, and RPC boundaries.
  - PR #120: Money Loop payment math caps same-month debt payments after LOC chunks.
  - PR #121: Money Loop artifact carousel supports keyboard roving focus and active-panel labeling.
  - PR #122: release runbook target refresh.
  - PR #123: Cockpit emergency recovery coach note.
  - PR #124: Cockpit routing toggles expose state and educational assumptions.
  - PR #125: Simulator mortgage controls expose selected state.
  - PR #126: Cockpit progress percentage is bounded.
  - PR #127: Vault mortgage controls expose selected state.
  - PR #128: Vault comparison bars clamp invalid and slower payoff widths.
  - PR #129: release runbook target refresh.
  - PR #130: dashboard Money Loop artifact orbit reticle visual.
  - PR #131: simulator balance chart bars clamp invalid and over-starting balances.
  - PR #132: Vault visual progress, payment split, amortization, and timeline percentages are bounded.
  - PR #133: release runbook target refresh.
  - PR #134: Guardian timeline guidance keeps assumptions explicit.
  - PR #135: Guardian payoff speed claims are gated behind assumptions.
  - PR #136: Simulator visual percentages are clamped.
  - PR #137: Vault freedom projections guard against non-finite inputs.
  - PR #138: ProgressRing geometry inputs are clamped.
  - PR #139: pre-app preview debt-free dates reject unstable projections.
  - PR #140: payoff date formatters reject invalid horizons.
  - PR #141: precise currency formatter rejects non-finite values.
  - PR #142: mortgage analysis guards against non-finite inputs.
  - PR #143: mortgage strategy inputs guard against non-finite values.
  - PR #144: single-debt velocity inputs are guarded.
  - PR #145: warning inputs are guarded.
  - PR #146: dashboard model inputs are guarded.
  - PR #147: mobile snapshot finite contracts are covered.
  - PR #148: mobile input display values are guarded.
  - PR #149: rendered audit records app UX risks and gates unstable Portfolio recommendations.
  - PR #150: dashboard Money Loop artifact carousel has explicit controls.
  - PR #151: compact mobile dashboard summary exposes all four vitals earlier.
  - PR #152: Portfolio Velocity copy distinguishes planning default from fastest/lowest-interest claims.
  - PR #153: release runbook target refresh.
  - PR #154: release runbook target guidance avoids hard-coded stale deployment URLs.
  - PR #155: backend readiness gates block premature production persistence.
  - PR #156: local web dev smoke uses webpack for stable browser checks.
  - PR #157: Portfolio Velocity modeling state is clarified.
  - PR #158: mobile Portfolio modeling mode is clarified.
  - PR #159: dashboard artifact selector fits desktop better.
  - PR #160: mobile dashboard Money Loop bridge exposes the loop sooner.
  - PR #161: mobile mode navigation accessibility is improved.
  - PR #162: Guardian LOC guidance keeps known-term and safety assumptions explicit.
  - PR #163: mobile LOC setup copy asks for known terms instead of only a limit.
  - PR #164: web Dashboard, Simulator, Vault, and warning models ask for known LOC terms instead of only a limit.
  - PR #165: mobile native smoke scripts separate Expo Go from native bundle expectations.
  - PR #166: mobile shell navigation active-state test IDs are stabilized.
  - PR #167: mobile smoke and release docs cover web export and native guardrails.
  - PR #168: web release smoke records the current production alias blocker.
  - PR #169: production smoke recognizes current deployment target diagnostics.
  - PR #170: simulator LOC balance controls expose clear reset and selected state.
  - PR #171: mobile dashboard shell token controls are easier to smoke test.
  - PR #172: Money Loop artifact selector renders selected-token depth layers.
  - PR #173: production smoke prints exact Vercel promote/cache-purge remediation commands.
  - PR #174: Supabase first-lane migration contract records the owner-scoped schema handoff.
  - PR #175: dashboard Money Loop pressure visual improves the artifact rail.
  - PR #176: mobile dashboard Money Loop pressure parity keeps Expo aligned with web.
  - PR #177: portfolio simulation input boundaries are hardened.
  - PR #178: portfolio percent minimum payments recalculate from current simulated balance.
  - PR #179: multi-debt simulation input boundaries are hardened.
  - PR #180: live financial store money setters sanitize non-finite inputs.
  - PR #181: Vault strategy labels guard against non-finite values.
  - PR #182: Simulator and Vault percentage labels guard invalid values.
  - PR #183: live Portfolio debt edits sanitize invalid money inputs.
  - PR #184: Portfolio percentage labels guard invalid values.
  - PR #185: Cloudflare edge lane contract documents Worker/D1/Durable Objects release boundaries without live backend wiring.
  - PR #186: release runbook handoff refreshes the current main target.
  - PR #187: mobile dashboard first screen is tightened.
  - PR #188: selected mobile loop artifacts are centered.
  - PR #189: mobile Cloudflare readiness copy is aligned.
  - PR #190: LOC ADB APR units are normalized.
  - PR #191: Guardian goodbye copy is calmed.
  - PR #192: amortized APR units are normalized.
  - PR #193: Portfolio APR display is normalized.
  - PR #194: Portfolio payoff APR math is normalized.
  - PR #195: absolute Money Loop claims are toned down and model-labeled.
- Tracking issue: `https://github.com/Navigata1/velocity-banking-mvp-v2/issues/59`

## Required Vercel Actions

1. Reauthenticate Vercel access.
   - Vercel MCP currently reports reauthentication required.
   - `npx vercel whoami`, `npx vercel inspect`, and `npx vercel ls` time out or wait for authentication in the local Codex environment.
   - The local environment is missing `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_AUTOMATION_BYPASS_SECRET`.
   - No `.vercel/project.json` link is present in this checkout.
   - Chrome redirects `https://vercel.com/islanddevcrew/velocity-banking-mvp-v2/deployments` to Vercel login.

2. Confirm the project that owns the release.
   - Expected team slug: `islanddevcrew`
   - Expected project slug: `velocity-banking-mvp-v2`
   - Vercel project page: `https://vercel.com/islanddevcrew/velocity-banking-mvp-v2`

3. Connect the project to Git if needed.
   - The Vercel overview showed the project checklist still includes `Connect Git Repository`.
   - Confirm the Vercel project is connected to `Navigata1/velocity-banking-mvp-v2`.
   - Confirm production builds trigger from `main`.

4. Promote or alias the current release build.
   - Promote the latest passing `main` deployment reported by `npm run smoke:production` to the public production alias.
   - Latest observed target URL: rerun `npm run smoke:production` and use the reported `Latest GitHub Production deployment target`.
   - Public alias to update first: `https://web-islanddevcrew.vercel.app/`
   - Add or update the final InterestShield custom domain after the alias smoke passes.
   - Example observed command from the latest runbook refresh; rerun `npm run smoke:production` and replace the URL before executing:

```powershell
npx vercel promote https://velocity-banking-mvp-v2-mxhnh9zn0-islanddevcrew.vercel.app --scope islanddevcrew
npx vercel cache purge --yes --scope islanddevcrew
```

   - If the CLI is not authenticated, run `npx vercel login` first or provide `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` through the release environment.

5. Decide protection posture.
   - If the production domain is public, the URL should be unprotected and `apps/web` `npm run smoke:production` should pass without a bypass secret.
   - If production protection is intentionally enabled, configure `VERCEL_AUTOMATION_BYPASS_SECRET` in GitHub and rerun the release smoke workflow with that secret.

## Verification Commands

Run from `apps/web` after the Vercel alias is corrected:

```powershell
npm run smoke:production
```

To test a different origin:

```powershell
$env:PRODUCTION_ORIGIN='https://your-domain.example'
npm run smoke:production
Remove-Item Env:PRODUCTION_ORIGIN
```

Expected pass criteria:

- `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and `/vault` return HTTP `200`.
- Each route returns `text/html`.
- Each route exposes `data-testid="primary-navigation"`.
- The response does not include Vercel deployment failure, protection, or stale-shell signatures.

## Rendered Freshness Smoke

After the HTTP production smoke passes, run Browser or Chrome against the public production alias.

Required rendered markers on `/`:

- `money-loop-artifact-rail`
- `money-loop-payoff-orbit`
- `dashboard-vital-cash-flow`
- `dashboard-vital-interest-burn`
- `dashboard-vital-debt-free-eta`
- `dashboard-vital-next-move`

Required rendered checks:

- The dashboard loads without the old intro gate.
- Console warnings/errors are empty or explainable and non-blocking.
- The Money Loop payoff orbit is visible.
- The four dashboard vitals are visible.
- No horizontal overflow on the initial dashboard viewport.

## GitHub Release Record

After verification passes:

1. Comment on issue #59 with:
   - production alias checked
   - deployment URL or commit deployed
   - `npm run smoke:production` result
   - Browser/Chrome rendered freshness result
2. Close issue #59.
3. If the final InterestShield custom domain was added, update this runbook with the domain and rerun the same smoke steps against it.

## Latest Codex Diagnostic Commands

These commands were run on 2026-07-03 from the local checkout on `main`:

```powershell
Invoke-WebRequest -Uri 'https://web-islanddevcrew.vercel.app/?codexFreshness=20260703a' -UseBasicParsing
npm run smoke:production
$sha = '<latest passing main sha from issue #59 or npm run smoke:production>'
gh api "repos/Navigata1/velocity-banking-mvp-v2/deployments?sha=$sha"
$env:PRODUCTION_ORIGIN='<latest GitHub Production deployment target>'; npm run smoke:production; Remove-Item Env:\PRODUCTION_ORIGIN
```

Result summary:

- Direct HTTP fetch of the public alias returned HTTP `200`, title `InterestShield - Financial Empowerment`, and stale deployment marker `dpl_FfPyuRhZM8G4pTofYifoajjVDpLg`.
- Public production smoke fails because the alias still lacks `data-testid="primary-navigation"`.
- The smoke script includes observed Vercel deployment diagnostics in freshness failures and classifies Vercel login-shell responses as deployment protection so the served deployment marker and response headers can be compared against GitHub/Vercel deployment records.
- The smoke script performs a best-effort GitHub Production deployment lookup and appends the latest deployment target URL, SHA, and status to stale/protected failures.
- Latest runbook-refresh smoke failure reports stale marker `dpl_FfPyuRhZM8G4pTofYifoajjVDpLg`, latest GitHub Production deployment target `https://velocity-banking-mvp-v2-mxhnh9zn0-islanddevcrew.vercel.app` for `e15482abf2a0448a557155cdd0060f8fd9dbf6ad`, and remediation commands for `npx vercel promote` plus `npx vercel cache purge`.
- Latest runbook-refresh public alias smoke failure reports `x-vercel-id: iad1::hj28m-1783049271361-1bcaba93985c` and `x-vercel-cache: HIT`.
- The Vercel app connector still reports `Reauthentication required`; Vercel CLI and Vercel project auth remain required before this environment can promote or alias the current deployment.
