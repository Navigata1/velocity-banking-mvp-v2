# Vercel Release Alias Runbook

Last updated: 2026-07-02

## Current Release State

- `main` contains the InterestShield 2026 release stack through commit `a34f34888bbd8720eeee9b14d1211632c9bfb526` (`Add Money Loop artifact depth layers (#172)`).
- GitHub Actions CI run `28587985161` completed successfully for `a34f34888bbd8720eeee9b14d1211632c9bfb526`.
- GitHub recorded a successful Vercel deployment for `a34f34888bbd8720eeee9b14d1211632c9bfb526`:
  - environment: `Production`
  - deployment URL pattern: `https://velocity-banking-mvp-v2-<deployment-suffix>-islanddevcrew.vercel.app`
  - deployment status observed by `npm run smoke:production`
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
   - Promote the deployment for `a34f34888bbd8720eeee9b14d1211632c9bfb526`, or a newer passing `main` deployment, to the public production alias.
   - Latest observed target URL: rerun `npm run smoke:production` and use the reported `Latest GitHub Production deployment target`.
   - Public alias to update first: `https://web-islanddevcrew.vercel.app/`
   - Add or update the final InterestShield custom domain after the alias smoke passes.
   - Current observed promotion command:

```powershell
npx vercel promote https://velocity-banking-mvp-v2-l8ca7dla3-islanddevcrew.vercel.app --scope islanddevcrew
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

These commands were run on 2026-07-02 from the local checkout on `main`:

```powershell
Invoke-WebRequest -Uri 'https://web-islanddevcrew.vercel.app/?codexFreshness=20260702a' -UseBasicParsing
npm run smoke:production
$sha = 'a34f34888bbd8720eeee9b14d1211632c9bfb526'
gh api "repos/Navigata1/velocity-banking-mvp-v2/deployments?sha=$sha"
$env:PRODUCTION_ORIGIN='<latest GitHub Production deployment target>'; npm run smoke:production; Remove-Item Env:\PRODUCTION_ORIGIN
```

Result summary:

- Direct HTTP fetch of the public alias returned HTTP `200`, title `InterestShield - Financial Empowerment`, and stale deployment marker `dpl_FfPyuRhZM8G4pTofYifoajjVDpLg`.
- Public production smoke fails because the alias still lacks `data-testid="primary-navigation"`.
- The smoke script includes observed Vercel deployment diagnostics in freshness failures and classifies Vercel login-shell responses as deployment protection so the served deployment marker and response headers can be compared against GitHub/Vercel deployment records.
- The smoke script performs a best-effort GitHub Production deployment lookup and appends the latest deployment target URL, SHA, and status to stale/protected failures.
- Current default-origin smoke failure reports stale marker `dpl_FfPyuRhZM8G4pTofYifoajjVDpLg`, latest GitHub Production deployment target `https://velocity-banking-mvp-v2-l8ca7dla3-islanddevcrew.vercel.app` for `a34f34888bbd8720eeee9b14d1211632c9bfb526`, and remediation commands for `npx vercel promote` plus `npx vercel cache purge`.
- Current latest-target smoke failure reports Vercel login/protection marker `dpl_JBAG6QhponBeGDuAqUTe11z8mMXu`, `data-testid="login/email-button"`, `x-vercel-id: iad1::mnh6g-1782988669387-937dd83f07ce`, and `x-vercel-cache: HIT`; configure `VERCEL_AUTOMATION_BYPASS_SECRET` or remove protection before treating that deployment as publicly release-ready.
- Current PR #172 production smoke failure reports stale public alias marker `dpl_FfPyuRhZM8G4pTofYifoajjVDpLg`, latest target `https://velocity-banking-mvp-v2-l8ca7dla3-islanddevcrew.vercel.app`, `x-vercel-id: iad1::hdh8k-1782993352098-9e60c3e03f77`, and `x-vercel-cache: HIT`.
- Vercel CLI and Vercel project auth remain required before this environment can promote or alias the current deployment.
