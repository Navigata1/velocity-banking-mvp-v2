# InterestShield Rendered Smoke Audit - 2026-07-02

## Audit Scope

Target: local production build at `http://127.0.0.1:5000`.

Reason: the public Vercel alias is stale and the latest direct Vercel target is protected, so local production render is the current inspectable build.

Flow captured: dashboard, simulator, cockpit, portfolio, learn, vault, settings, mobile-width dashboard, plus a Chrome dashboard smoke.

Evidence folder: `docs/audits/rendered-smoke-2026-07-02/`.

## Captured Steps

1. `01-dashboard-desktop.png` - Dashboard, desktop viewport.
   Health: mostly strong. Four vitals, primary navigation, Money Loop artifact rail, payoff orbit, and change explanations are present.

2. `02-simulator-desktop.png` - Simulator, desktop viewport.
   Health: strong for comparison clarity. Strategy cards show Traditional, Snowball, Avalanche, and Velocity with visible payoff and interest differences.

3. `03-cockpit-desktop.png` - Cockpit, desktop viewport.
   Health: adequate. Routing toggles and cockpit assumption copy are present.

4. `04-portfolio-desktop.png` - Portfolio, desktop viewport.
   Health: needs copy alignment. The visible math guardrail says cash flow does not cover all minimums, while the Velocity strategy badge previously said "Recommended."

5. `05-learn-desktop.png` - Learn, desktop viewport.
   Health: adequate. Learning route renders without a blocked state.

6. `06-vault-desktop.png` - Vault, desktop viewport.
   Health: adequate. Wealth timeline route renders without a blocked state.

7. `07-settings-desktop.png` - Settings, desktop viewport.
   Health: strong for backend transparency. Local export/import, backend handoff, Supabase, and Cloudflare readiness surfaces are visible.

8. `08-dashboard-mobile.png` - Dashboard, mobile-width viewport.
   Health: usable with tradeoffs. No horizontal overflow was detected, but the first viewport only reaches two of four vitals before the bottom nav.

9. `09-dashboard-chrome-smoke.png` - Dashboard, Chrome-controlled smoke.
   Health: pass for required dashboard hooks. Chrome confirmed the shell, four dashboard vitals, Money Loop artifact rail, and payoff orbit in the DOM.

10. `10-portfolio-badge-fixed.png` - Portfolio, post-fix rendered check.
    Health: improved. Velocity is labeled "Default, review first" while the cash-flow warning and "Review inputs" state are visible.

11. Dashboard zero-LOC rendered smoke, post-fix.
    Health: improved. Setting Line of Credit limit to `$0` while a LOC balance remains shows "Enter known LOC terms", "Enter LOC terms", and known-term warnings for limit, APR, fees, and draw rules. The old "Add LOC limit" and "Add LOC details" copy is absent.

12. Simulator zero-LOC rendered smoke, post-fix.
    Health: improved. The persisted zero-limit state shows the known-terms warning and the Velocity strategy card reports "Enter LOC terms" instead of presenting a projection.

13. Vault zero-LOC rendered smoke, post-fix.
    Health: improved. Setting Line of Credit limit to `$0` from the Dashboard and opening Vault now shows "Enter known LOC terms" and the known-term mortgage-path warning before the mortgage wizard. The old "Add LOC limit" and "Add LOC details" copy is absent.

14. Dashboard artifact selector fit, post-fix.
    Health: improved. The desktop Money Loop selector now uses five fitted columns with compact stable card spacing, while narrow screens keep the horizontal snap rail.

15. Portfolio strategy badge fit, post-fix.
    Health: improved. The Portfolio strategy picker now gives the Velocity status badge a compact wrapping header row and keeps strategy explanation copy on its own line.

## Strengths

- Dashboard keeps the first screen focused on the required four vitals.
- The dashboard shows the current Money Loop visually with a model-backed artifact rail and orbit.
- Simulator comparison is truth-forward: the default scenario visibly shows Snowball outperforming Velocity in the strategy cards.
- Portfolio shows a blocking cash-flow guardrail before showing payoff-order results.
- Settings makes backend readiness explicit instead of implying Supabase or Cloudflare is already connected.
- Mobile-width dashboard avoids horizontal page overflow.
- Chrome and the in-app browser both render the current dashboard shell and required dashboard hooks locally.
- Missing LOC setup states now ask for known LOC terms instead of implying a limit alone is enough.

## UX Risks

- Portfolio strategy semantics still need cross-route reinforcement so users understand why Portfolio defaults to Velocity planning while Simulator may show another path as fastest.
- Post-fix Portfolio no longer overstates the current plan. The strategy picker now separates the Velocity status badge from description copy so narrow card widths do not force the badge to compete with explanatory text.
- Dashboard artifact rail now hides native scrollbar chrome and fits all five selector artifacts on desktop. Remaining visual-overhaul work should focus on richer 3D/artifact presentation rather than clipped selector layout.
- Mobile dashboard first viewport does not show the full four-vital set or the Money Loop artifact rail, so the educational "click" may require more scrolling than intended.
- The simulator and portfolio can disagree in tone: simulator shows Snowball as fastest, while Portfolio defaults to Velocity. The app should clearly explain that Portfolio Velocity is a ranking/planning default, not always the mathematically best payoff outcome.
- Chrome wraps the dashboard domain selector and vital cards differently than the in-app browser at similar desktop widths. The layout still works, but this should be included in future responsive QA.
- Vault now surfaces the zero-limit LOC setup text before the mortgage wizard. Remaining Vault browser work should focus on deeper mortgage input edge cases rather than the missing-LOC warning path.

## Accessibility Risks

- Screenshots confirm visible structure only; they do not prove full keyboard or screen-reader behavior.
- The dashboard carousel has visible scroll behavior; it needs keyboard and focus checks whenever the visual carousel is redesigned.
- Mobile bottom navigation is visually clear, but touch target size and screen-reader order still need device-level verification.

## Recommendations

1. Gate "Recommended" labels behind stable, warning-free projections.
2. Replace or refine the dashboard artifact rail scrollbar with explicit carousel controls or a centered selected artifact layout.
3. Add a compact mobile dashboard summary that exposes all four vitals before deeper panels.
4. Explain the difference between "Velocity as planning default" and "fastest/least-interest strategy" wherever both concepts appear together.
5. Continue keeping backend status explicit until Supabase or Cloudflare persistence is actually wired and verified.

## Fix Applied In This Pass

- Portfolio Velocity badge now shows "Default, review first" when the current projection has warnings or cannot support payoff claims. The rendered check confirmed "Recommended" is absent while the cash-flow warning remains visible.
- Web Dashboard, Simulator, Vault projection labels, and shared warning models now use known LOC terms language instead of limit-only setup copy. Rendered Chrome smoke confirmed Dashboard and Simulator zero-limit states show the revised copy and no console or page errors.
- Vault now derives a top-level setup warning from the same mortgage Velocity failure state used by strategy cards. Rendered Chrome smoke confirmed the warning appears before the mortgage wizard when LOC terms are missing, with no console or page errors.
- Dashboard Money Loop selector now uses a five-column fitted desktop grid and compact card dimensions so the artifact rail does not rely on desktop horizontal scrolling.
- Portfolio strategy cards now use a compact wrapped header for the Velocity status badge and keep strategy description copy on a separate line.

## Evidence Limits

- Public production was not visually audited because `https://web-islanddevcrew.vercel.app` serves a stale deployment and the latest direct Vercel target is behind protection.
- This audit used viewport screenshots, not full-page screenshots, because the browser full-page capture duplicated fixed viewport content.
- Screenshots do not prove WCAG compliance, calculation correctness, or complete device behavior.
