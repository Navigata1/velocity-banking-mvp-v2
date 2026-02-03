# Lovable Handoff — VelocityBank MVP v2

Lovable works best with **clear scope**, **component-level prompts**, and **a defined aesthetic**.

Use this file as your “starter prompt library” for Lovable.

---

## 0) One-line product
A calm dashboard + simulator that helps people understand the Money Loop (velocity banking) by showing cash flow, interest burn, payoff timelines, and risk warnings.

## 1) Aesthetic
**Calm, wellness-dashboard inspired.**
- dark neutral background
- rounded cards
- generous spacing
- “Inter” style typography
- soft shadows, subtle borders
- accessibility: high contrast, readable numbers

Design reference image (store in repo):
- `reference/design/dashboard-reference.png`

If Lovable supports adding visuals by URL, upload this image somewhere public (GitHub raw) and include the URL in your prompt.

Example template (replace placeholders):
```txt
Use this design reference image: https://raw.githubusercontent.com/<USER>/<REPO>/main/reference/design/dashboard-reference.png
```

---

## 2) Initial Lovable prompt (paste this first)

**Prompt:**
Build a responsive web app called “VelocityBank (Demo)”.  
It has 5 routes: `/`, `/simulator`, `/cockpit`, `/learn`, `/vault`.

Core requirements:
- Calm dashboard UI (wellness vibe)
- Car-first: default dashboard is Car payoff
- “Truth machine”: correct math, label assumptions, no guaranteed results
- Coach tone (supportive, never shaming)
- Include warnings: cash flow <= 0 and LOC utilization > 80%

Tech:
- React + TypeScript
- Tailwind for styling
- Keep dependencies light

Ask me any questions you need in order to fully understand what I want from this feature and how I envision it.

---

## 3) Follow-up prompts (use in Plan mode)

### Prompt A — Build the engine module
Create an `engine/` module with pure functions:
- `calcCashFlow(income, expenses)`
- `simulateCarLoanBaseline(...)`
- `simulateWithStrategy(...)` (extra payment + optional LOC estimate)
Return arrays for charting + summary outputs.

Add unit tests if possible.

### Prompt B — Car Dashboard
Create `/` with:
- 4 vitals cards (cash flow, interest burn/day, debt-free ETA, next move)
- car progress ring
- small action feed (3 items)
- disclaimer footer

### Prompt C — Simulator UI
Create `/simulator` with inputs and a compare view:
- baseline vs strategy summary
- balance-over-time chart
- warnings section

### Prompt D — Cockpit mode
Create `/cockpit` showing:
- Airspeed (cash flow)
- Fuel burn (interest/day)
- Heading (target debt = Car)
- Turbulence button: “Simulate emergency expense $600”

### Prompt E — Learn
Create `/learn`:
- “Debt Escape: The Money Loop” video placeholder card
- 6 micro-lessons
- glossary panel

### Prompt F — Vault
Create `/vault`:
- “Wealth Transfer Timeline” stepper UI that shows interest avoided
- Include clear assumptions
- If you can’t import external component code, recreate the UX in-app.

---

## 4) Copy guardrails
- Always say “estimate” / “example”
- Always include: “Educational tool. Not financial advice.”
- Avoid inflammatory language by default
- Encourage “Recovery Mode” after emergencies (recalculate, don’t shame)

END.
