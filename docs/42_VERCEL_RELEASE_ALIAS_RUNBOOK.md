# Vercel Release Alias Runbook

Last updated: 2026-06-16

## Current Release State

- `main` contains the InterestShield 2026 release stack through commit `ed08f2912f92aace1901e4e7643314edf770217d` (`Merge pull request #70 from Navigata1/codex/mobile-settings-readiness`).
- GitHub CI passed on `main` run `27612140333`.
- GitHub recorded a successful Vercel deployment for the latest merge commit:
  - deployment record `5078173939`
  - environment: `Production`
  - `production_environment: false`
  - deployment URL: `https://velocity-banking-mvp-v2-eg615xlt9-islanddevcrew.vercel.app`
- The public alias `https://web-islanddevcrew.vercel.app/` still serves the older app deployment marker `dpl_FfPyuRhZM8G4pTofYifoajjVDpLg`.
- The public alias does not expose the current release markers:
  - `data-testid="primary-navigation"`
  - `money-loop-artifact-rail`
  - `money-loop-payoff-orbit`
- The latest source-side release additions now merged into `main` include:
  - PR #68: mobile Portfolio payoff path visual.
  - PR #69: provider-neutral backend readiness panel in web Settings.
  - PR #70: Expo `/settings` route and mobile backend readiness panel.
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
   - Promote the deployment for `ed08f2912f92aace1901e4e7643314edf770217d`, or a newer passing `main` deployment, to the public production alias.
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

These commands were run on 2026-06-16 from the local checkout on `main`:

```powershell
gh run watch 27612140333 --exit-status
gh api 'repos/Navigata1/velocity-banking-mvp-v2/deployments?sha=ed08f2912f92aace1901e4e7643314edf770217d'
gh api 'repos/Navigata1/velocity-banking-mvp-v2/deployments/5078173939/statuses'
npm run smoke:production
npx vercel whoami
```

Result summary:

- `main` CI passed.
- GitHub has a successful Vercel deployment URL for the latest commit: `https://velocity-banking-mvp-v2-eg615xlt9-islanddevcrew.vercel.app`.
- The deployment record is not marked as the production environment.
- Public production smoke fails because the alias still lacks `data-testid="primary-navigation"`.
- Vercel CLI, Vercel MCP, and Chrome are all unauthenticated from this Codex environment.
