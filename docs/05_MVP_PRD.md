# MVP PRD — Velocity Banking App (Car → House → Vault)

## 0. One sentence
A calm dashboard + simulator that makes the Money Loop obvious, helps users plan “chunks,” and supports real life (emergencies, income volatility) without shame.

## 1. Target users
1) **The Struggler (new)**
- overwhelmed by payments
- high APR credit cards / auto loan
- needs hope + clarity

2) **The Planner (intermediate)**
- has stable income
- can create a chunk plan
- wants reminders + projections

3) **The Optimizer (advanced)**
- HELOC / first-lien HELOC curious
- wants daily interest math, average balance charts
- wants to compare multiple strategies

## 2. Core user journeys
### Journey A: “Car first” (default)
- Onboarding → enter income/expenses + car loan → see Car Dashboard
- Run Simulator → try $100/$200/$400 extra or chunk frequency
- Create Plan → reminders + mini-lessons
- Track → weekly vitals + milestones

### Journey B: House chunking
- Add mortgage + LOC
- Turn on “deposit income to LOC”
- Choose chunk rule
- Visualize amortization jump + interest avoided

### Journey C: Vault mode
- When debts drop, show “wealth building” pathway:
  - emergency buffer
  - investment comparison
  - “wealth transfer avoided” shareable card

## 3. Feature scope (MVP)
### Must-have
- Onboarding data capture (income, expenses, debts)
- Car Dashboard
- Simulator with 3 scenarios and comparison
- Plan builder + reminders
- Learn: 10 micro-lessons + “Debt Escape” intro video
- Shareable “progress card” export (image)

### Should-have
- House Dashboard
- Cockpit Mode (simplified)
- Case Studies library (6 examples)
- Emergency Mode (pause/recalculate plan)

### Later
- Vault Dashboard full wealth transfer timeline
- Bank integrations
- Community / coaching features

## 4. Screen list
- Welcome + “Choose your starting point: Car / House / Vault”
- Inputs: Income & schedule
- Inputs: Expenses (simple total + optional categories)
- Inputs: Debts (car/mortgage/cards/LOC)
- Dashboard: Car
- Dashboard: House
- Dashboard: Vault
- Simulator: Scenario builder + compare
- Plan: Reminder schedule + checklist
- Learn: Library + first-run animation
- Profile: Settings, assumptions, export data

## 5. Emotional UX (coach tone)
- Replace “You failed” with “Adjust plan.”
- Celebrate milestones:
  - “You lowered your interest burn by $1.20/day.”
  - “You unlocked $180/mo cash flow.”

## 6. Guardrails & disclaimers
- Not financial advice.
- Encourage users to read lender terms.
- Warn about variable rates, line freezes, missing minimums, overutilization.

## 7. Non-functional requirements
- Offline-first for input + simulation
- Local encryption for sensitive data
- Export/import JSON for portability
- Performance: run a 10-year daily simulation under 2 seconds on mid devices

## 8. Analytics (privacy-respecting)
Track:
- onboarding completion
- simulations run
- plan created
- reminders enabled
- lesson completion
No selling data. Clear consent.
