# VelocityBank MVP v2 — Replit Agent Playbook (replit.md)

> Place this file in the **repo root** as `replit.md` so Replit Agent reads it.

## 0) North Star
Build a **truth-first, hope-forward** financial empowerment prototype that teaches and simulates **Velocity Banking**.

### The Real Engine: The Money Loop
1) Income deposits into a **Line of Credit (LOC/HELOC)** first  
2) Expenses are routed intentionally (often via an “expense card”)  
3) **Cash Flow = Income − Expenses** is what drives balances down  
4) Lower average balance → lower interest → faster payoff momentum  

### Tone
- Calm, modern, welcoming UI (not fear-based)
- Coach voice: supportive, no shame
- Always label assumptions; do not promise results
- Add a footer: “Educational tool. Not financial advice.”

## 1) What to ship for tonight (deadline-friendly)
Build a browser demo that runs in Replit preview.

### Routes (5 screens)
- `/` Car Dashboard (default)
- `/simulator` (what-if engine)
- `/cockpit` (alternate “flight” UI)
- `/learn` (micro-lessons + glossary)
- `/vault` (Wealth Transfer Timeline experience)

Non-goals for tonight:
- auth, bank integrations, real notifications, app-store packaging, heavy persistence

## 2) Stack (fastest for Replit)
Build a **Next.js + TypeScript + Tailwind** web app in `apps/web/`.

If `apps/web/` doesn’t exist, create it with:
```bash
npx create-next-app@latest apps/web --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

## 3) Design reference (optional but recommended)
Use this image as layout inspiration:
- `reference/design/dashboard-reference.png`

Try to mimic the “wellness dashboard” vibe:
- large hero visual on left
- 4 vitals in the middle
- action feed on right
- plenty of spacing, rounded corners

## 4) Required features by route

### 4.1 `/` Car Dashboard
Show only 4 vitals:
- Cash Flow (monthly)
- Interest Burn (per day + per month)
- Car Debt‑Free ETA (months + date)
- Next Move (e.g., “Next chunk in 12 days”)

Also show:
- Car payoff progress ring
- “Cash Flow Unlock” strip (when a payment disappears)

### 4.2 `/simulator`
Inputs (minimal):
- Monthly income
- Monthly expenses
- Car loan: balance, APR, monthly payment (or term)
- Optional LOC: limit, APR, starting balance
- Strategy toggles:
  - “Run income through LOC”
  - “Use expense card (paid in full)”
  - “Extra payment / chunk size”

Outputs:
- payoff months + payoff date (baseline vs strategy)
- interest paid (baseline vs strategy)
- interest saved
- simple chart: balance over time

Warnings (must):
- If cash flow <= 0 → “Stabilize first” warning
- If LOC utilization > 80% → risk warning

### 4.3 `/cockpit`
Reuse simulator results and render as instruments:
- Airspeed = Cash Flow
- Fuel Burn = Interest / Day
- Heading = Target debt (Car)
- Turbulence = Emergency event

Add one button:
- “Simulate emergency expense ($600)” and show updated ETA

### 4.4 `/learn`
For demo:
- A “First Run Video” card: **Debt Escape: The Money Loop** (placeholder)
- 6 micro-lessons (short)
- glossary: principal, interest, cash flow, amortization, LOC/HELOC, avg daily balance

### 4.5 `/vault`
Integrate the existing component:
- Search the repo for the Wealth Transfer Timeline component (likely under `prototypes/wealth-transfer-timeline/`).
- Import it into `/vault`.

Add disclaimer:
- “Educational estimate. Assumptions shown in the tool.”

## 5) Core math (truth-first)

### 5.1 Amortized car loan baseline
Monthly rate `r = APR/12`
Monthly interest = balance * r  
Principal = payment − interest  
New balance = balance − principal − extra

### 5.2 LOC interest (demo model)
Preferred:
- daily simulation with `APR/365` and event timeline

Fallback:
- average-balance monthly estimate (must label “estimate”)

## 6) Definition of Done
- App runs in Replit preview
- inputs → outputs update instantly
- simulator compares baseline vs strategy
- cockpit works
- vault timeline renders
- disclaimers exist
- no guaranteed results language

## 7) Coding rules
- TypeScript everywhere
- small components, small diffs
- do not add heavy dependencies unless necessary
- keep calculations isolated in `apps/web/src/engine/`

END.
