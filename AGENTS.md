# AGENTS.md — VelocityBank MVP v2 (Universal AI Playbook)

## Project overview
Build a **truth-first, hope-forward** demo that teaches and simulates **Velocity Banking** using a calm dashboard UI.

## North Star
- Make the “click” happen fast: **Money Loop** + **Cash Flow** + **Interest visibility**
- Never shame users. Be a coach.
- Never promise results. Label assumptions.

## Core idea: The Money Loop
Income → LOC (reduces balance)  
Expenses → routed intentionally  
Cash Flow (income − expenses) drives payoff  
Lower average balance → lower interest → momentum

## Demo scope (tonight)
Browser demo with 5 routes:
- `/` Car Dashboard
- `/simulator`
- `/cockpit`
- `/learn`
- `/vault`

## Design
- Calm “wellness dashboard” feel
- Reference: `reference/design/dashboard-reference.png`
- Four vitals only on dashboard: Cash Flow, Interest Burn, Debt‑Free ETA, Next Move

## Math rules
- Implement amortized loan math correctly
- Implement LOC interest as daily accrual if possible; otherwise average balance estimate (label it)
- Include warnings:
  - cash flow <= 0
  - LOC utilization > 80%

## Copy rules
- Plain language
- Coach tone
- Footer: “Educational tool. Not financial advice.”

## Do / Don’t
### Do
- keep components small
- keep diffs small
- isolate calculations in an engine module
- add unit tests for the core functions if time

### Don’t
- don’t add auth or banking integrations for the demo
- don’t add heavy dependencies without asking
- don’t use fear language (“robbed”, “scam”) as default UI copy

END.
