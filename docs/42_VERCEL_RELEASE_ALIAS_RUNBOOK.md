# Vercel Release Alias Runbook

Last updated: 2026-07-02

## Current Release State

- `main` contains the InterestShield 2026 release stack through commit `35f22c15aa8fe1da11816ece1df701146d11904f` (`Clamp vault visual percentages (#132)`).
- GitHub recorded a successful Vercel deployment for `35f22c15aa8fe1da11816ece1df701146d11904f`:
  - environment: `Production`
  - deployment URL: `https://velocity-banking-mvp-v2-lolhjsqzd-islanddevcrew.vercel.app`
  - deployment status observed by `npm run smoke:production`
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
   - Promote the deployment for `35f22c15aa8fe1da11816ece1df701146d11904f`, or a newer passing `main` deployment, to the public production alias.
   - Latest observed target URL: `https://velocity-banking-mvp-v2-lolhjsqzd-islanddevcrew.vercel.app`
   - Public alias to update first: `https://web-islanddevcrew.vercel.app/`
   - Add or update the final InterestShield custom domain after the alias smoke passes.

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
$sha = '35f22c15aa8fe1da11816ece1df701146d11904f'
gh api "repos/Navigata1/velocity-banking-mvp-v2/deployments?sha=$sha"
$env:PRODUCTION_ORIGIN='https://velocity-banking-mvp-v2-lolhjsqzd-islanddevcrew.vercel.app'; npm run smoke:production; Remove-Item Env:\PRODUCTION_ORIGIN
```

Result summary:

- Direct HTTP fetch of the public alias returned HTTP `200`, title `InterestShield - Financial Empowerment`, and stale deployment marker `dpl_FfPyuRhZM8G4pTofYifoajjVDpLg`.
- Public production smoke fails because the alias still lacks `data-testid="primary-navigation"`.
- The smoke script includes observed Vercel deployment diagnostics in freshness failures and classifies Vercel login-shell responses as deployment protection so the served deployment marker and response headers can be compared against GitHub/Vercel deployment records.
- The smoke script performs a best-effort GitHub Production deployment lookup and appends the latest deployment target URL, SHA, and status to stale/protected failures.
- Current default-origin smoke failure reports stale marker `dpl_FfPyuRhZM8G4pTofYifoajjVDpLg` and latest GitHub Production target `https://velocity-banking-mvp-v2-lolhjsqzd-islanddevcrew.vercel.app` at `35f22c15aa8fe1da11816ece1df701146d11904f`.
- Current latest-target smoke failure reports Vercel login/protection marker `dpl_7QXo6vWqL835cVLK6hT2NA2skCVy`; configure `VERCEL_AUTOMATION_BYPASS_SECRET` or remove protection before treating that deployment as publicly release-ready.
- Vercel CLI and Vercel project auth remain required before this environment can promote or alias the current deployment.
