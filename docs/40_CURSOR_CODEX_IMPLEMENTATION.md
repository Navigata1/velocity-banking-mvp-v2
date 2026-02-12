# Cursor + Codex Implementation Guide (InterestShield / Velocity Banking MVP)

This guide is written for **Cursor** using **Codex** as the primary coding agent.
Goal: finish core MVP functionality **without losing the teacher’s tone**: calm, empowering, “one lane at a time”, recovery-friendly.

---

## Project quickstart

From repo root:

```bash
cd apps/web
npm install
npm run dev
```

Optional checks:

```bash
npm run lint
npm run build
```

---

## Non‑negotiables (read first)

1) **Truth-first math**
- Always label estimates and assumptions.
- Avoid “guaranteed savings” language.
- Show warnings when a plan becomes risky.

2) **Teacher vibe**
- Calm, encouraging, recovery-aware.
- “Single lane focus” default.
- Emphasize *momentum* over shame.

3) **MVP scope discipline**
- Ship a coherent, working demo.
- Prefer smaller, correct features over big, buggy ones.

---

## Current code landmarks

- Navigation + Shield Guardian modal: `src/components/Navigation.tsx`
- Teacher Mode formatting logic: `src/data/shield-guardian-qa.ts`
- Financial store: `src/stores/financial-store.ts`
- Pages: `src/app/*`

---

## Sprint 0 — Verify Teacher Mode toggle (already added)

**Goal:** ensure the “Teacher Mode” toggle in the Shield Guardian modal works and persists.

Acceptance:
- Toggle is visible in the Shield Guardian header.
- When ON, responses are structured:
  - “What it means”
  - “What to do next”
  - “Why it works”
- Uses the user’s **cash flow** when available.
- Persisted via `interestshield-preferences-v1`.

---

## Sprint 1 — First-run onboarding (video-first, click-to-play)

**Goal:** new users understand “this is not a budget app” in the first 10 seconds.

Build:
- Add `/start` route: video-first onboarding wizard.
- First-run gate:
  - show intro (click-to-play, muted, captions; has Skip)
  - forced only once
  - setting toggle: “Skip intro on startup”
- After intro:
  - run a mortgage demo (Starter / Steady / Strong presets)
  - then invite: “Try your own numbers”

Acceptance:
- Fresh browser profile lands in the onboarding flow.
- Returning users go to their preferred landing page.

Suggested files:
- `src/app/start/page.tsx`
- `src/stores/preferences-store.ts` (already exists; extend)
- `src/components/IntroModal.tsx`
- `public/intro/*` (video + captions)

---

## Sprint 2 — Portfolio (multi-debt, single lane default; advanced split)

**Goal:** users can add multiple debts and pick a payoff strategy.

Core:
- New `/portfolio` route
- Add multiple items (car, house, student loan, etc.)
- Strategy selector:
  - Velocity Mode (default, recommended)
  - Snowball
  - Avalanche
- Focus Mode:
  - Single lane default
  - “Advanced” toggle reveals Split Mode

Edge cases required:
- 0% promo APR (intro months, post-intro APR)
- “Checking-only” payments (must-pay-from-checking debts)

Acceptance:
- Add/edit/delete debts works.
- Payoff order changes instantly with strategy.
- Clearly labels promos + checking-only items.

---

## Sprint 3 — Simulation correctness pass (no placeholder math)

**Goal:** numbers respond to inputs across Dashboard / Simulator / Vault.

Checklist:
- Remove any hard-coded “interest saved” / “years gained” placeholders.
- Ensure:
  - Baseline payoff uses real amortization
  - Velocity payoff uses consistent rules and is clearly labeled as an estimate
- Add safety warnings:
  - cash flow <= 0
  - LOC utilization > 80%
  - monthly payment < monthly interest (negative amortization risk)

Acceptance:
- Changing income/expenses changes payoff + interest.
- Changing APR changes interest/day and totals.

---

## Sprint 4 — Auth scaffolding (demo-safe)

**Goal:** allow user identity without blocking the demo.

Implement:
- Local demo auth: email/password stored locally (for class demo).
- UI placeholder buttons for:
  - Google / Microsoft / Apple OAuth (disabled w/ “requires keys”)
- Profile menu in top-right:
  - Settings
  - Export/Import backup
  - Replay intro
  - Sign out

Acceptance:
- Demo login works locally.
- Export produces JSON backup; Import restores.

---

## Definition of Done (for class submission)

- App runs cleanly on Replit.
- A new user understands what it is within 1 minute.
- At least one debt can be simulated with real outputs.
- Teacher Mode is ON by default and feels like a coach.

---

## Codex prompting template (paste into Cursor)

> Read `AGENTS.md`, `replit.md`, and this guide first.  
> Do NOT rewrite the UI. Fix correctness and add the missing flows with minimal churn.  
> Preserve teacher tone: calm, recovery-aware, one-lane focus.

Then give Codex one sprint at a time, not all at once.
