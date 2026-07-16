# Vercel Release Alias Runbook

Last verified: 2026-07-16

## Current Release State

- Team: `islanddevcrew` / Island Dev Crew.
- Project: `velocity-banking-mvp-v2`.
- Project ID: `prj_AYKVLmLw6D1vZmOFPQ512WdfpM5s`.
- Git source: `Navigata1/velocity-banking-mvp-v2`.
- Production branch: `main`.
- Root directory: `apps/web`.
- Framework: `nextjs`.
- Canonical project alias: `https://velocity-banking-mvp-v2.vercel.app`.
- Public compatibility alias: `https://web-islanddevcrew.vercel.app`.
- Production protection: public; Vercel project SSO protection is disabled.

The project had an empty root directory and framework setting. Git deployments
therefore reported Ready while building only the repository root in zero
milliseconds and returning HTTP 404. The configuration was repaired in place,
main SHA `71187011d5243889d681e05c37b1bd35ce0ef570` was rebuilt as deployment
`dpl_AfYvAyUF7mS8Dpx1T29ZxL2Hbdqk`, and both aliases passed the seven-route
production smoke.

The old compatibility-alias deployment is retained as a rollback reference:
`dpl_FfPyuRhZM8G4pTofYifoajjVDpLg`.

## Authentication And Linking

The July 16 verification used Vercel CLI 56.3.0 as user `jony02-7429`.

Run from the repository root:

```powershell
npx --yes vercel@latest whoami
npx --yes vercel@latest link --yes `
  --project velocity-banking-mvp-v2 `
  --scope islanddevcrew `
  --cwd apps/web
```

The generated `apps/web/.vercel` link and `.env.local` credentials are local
configuration. They must remain ignored and must never be committed.

## Deployment And Alias Promotion

Inspect the latest production deployment:

```powershell
npx --yes vercel@latest ls velocity-banking-mvp-v2 `
  --prod `
  --scope islanddevcrew
```

Promote the verified deployment to the compatibility alias:

```powershell
npx --yes vercel@latest alias set `
  <verified-deployment-url> `
  web-islanddevcrew.vercel.app `
  --scope islanddevcrew
```

Purge the project cache after a manual alias change:

```powershell
npx --yes vercel@latest cache purge `
  --yes `
  --scope islanddevcrew `
  --cwd apps/web
```

The canonical project alias follows production deployments. The compatibility
alias is manually assigned, so verify and reassign it after a release until the
final custom domain replaces it.

## Route Smoke

Run the public compatibility-alias smoke:

```powershell
npm --prefix apps/web run smoke:production
```

Run the same gate against the canonical project alias:

```powershell
$env:PRODUCTION_ORIGIN='https://velocity-banking-mvp-v2.vercel.app'
npm --prefix apps/web run smoke:production
Remove-Item Env:PRODUCTION_ORIGIN
```

Pass criteria:

- `/`, `/simulator`, `/cockpit`, `/portfolio`, `/learn`, `/settings`, and
  `/vault` return HTTP 200 HTML.
- Each route exposes the current primary-navigation marker.
- Each route has an `InterestShield` document title and Next static assets.
- No deployment-not-found, protection, framework-error, or malformed-asset
  shell is present.

## Rendered Chrome Smoke

The rendered harness can start the local built app or target a remote origin.
This release gate proves more than response HTML: it checks hydration, console
and page errors, image failures, framework overlays, horizontal page overflow,
the four dashboard vitals, the desktop Money Loop stage, and the mobile bridge.

```powershell
$env:RENDERED_SMOKE_ORIGIN='https://web-islanddevcrew.vercel.app'
$env:RENDERED_SMOKE_MOBILE_WIDTH='375'
$env:RENDERED_SMOKE_EVIDENCE_DIR='../../ops/mission/evidence/P0-production-rendered'
node apps/web/scripts/smoke-rendered.cjs
Remove-Item Env:RENDERED_SMOKE_ORIGIN
Remove-Item Env:RENDERED_SMOKE_MOBILE_WIDTH
Remove-Item Env:RENDERED_SMOKE_EVIDENCE_DIR
```

Pass criteria:

- All seven routes pass at 1440x900 and 375x844.
- Dashboard desktop exposes `money-loop-artifact-rail`,
  `money-loop-payoff-orbit`, and all four vital hooks.
- Dashboard mobile exposes `dashboard-mobile-money-loop-bridge`,
  `dashboard-mobile-vitals`, and all four mobile vital hooks.
- The desktop Next Money Loop control selects LOC.
- No console or uncaught page errors, broken visible images, framework error
  overlays, or page-width overflow.

## Release Verification

Before promoting an alias, run:

```powershell
npm --prefix apps/web test
npm --prefix apps/web run lint
npm --prefix apps/web run build
npm --prefix apps/web run smoke:rendered:built
npm --prefix apps/web run smoke:production
```

After merge:

1. Wait for GitHub CI and the Vercel production deployment to complete.
2. Inspect the deployment and verify its source SHA is the merged `main`.
3. Run route smoke against the canonical alias.
4. Assign the compatibility alias to that verified deployment.
5. Purge the project cache.
6. Run route and rendered Chrome smoke against the compatibility alias.
7. Record the deployment ID, source SHA, workflow runs, and screenshot paths in
   `ops/mission/evidence`.

## Rollback

If a release fails after promotion:

1. Reassign the compatibility alias to the last verified deployment.
2. Purge the project cache.
3. Run both route and rendered Chrome smoke.
4. Record the failed deployment and the rollback deployment in mission
   evidence before making another release attempt.

The pre-repair deployment
`dpl_FfPyuRhZM8G4pTofYifoajjVDpLg` is a historical reference, not a recommended
functional rollback, because it serves the obsolete app shell.

## Custom Domain

The final InterestShield custom-domain hostname was not found in the Vercel team
domain inventory or repository configuration during the July 16 verification.
Do not guess or silently register a hostname.

Once the owned hostname is identified:

1. Add it to `velocity-banking-mvp-v2` in Vercel.
2. Apply the Vercel DNS records at its authoritative DNS provider.
3. Wait for Vercel certificate issuance and domain verification.
4. Run route and rendered Chrome smoke with `PRODUCTION_ORIGIN` and
   `RENDERED_SMOKE_ORIGIN` set to the custom hostname.
5. Update `NEXT_PUBLIC_SITE_URL` in Production.
6. Verify canonical, sitemap, robots, Open Graph, and install metadata use the
   custom hostname.
7. Keep the `web-islanddevcrew.vercel.app` alias as a temporary rollback path
   until the custom domain has remained green through a release cycle.
