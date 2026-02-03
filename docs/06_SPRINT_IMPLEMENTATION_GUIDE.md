# Sprint & Implementation Guide (Claude Code project folder)

This is a practical runbook to execute the MVP in phases.

---

## Repo / Folder Structure (recommended)
```
velocity-banking-app/
  CLAUDE.md
  README.md
  docs/
    (this folder)
  apps/
    mobile/                 # React Native / Expo
    web/                    # optional marketing pages
  packages/
    engine/                 # simulation + calculators (TypeScript)
    ui/                     # reusable components + theme
    content/                # lesson metadata + scripts
  scripts/
    build/
    data/
  .github/
    ISSUE_TEMPLATE/
    workflows/
```

### CLAUDE.md (how to work in this repo)
- Product north star
- Definition of done
- Coding standards
- How to run tests
- How to add a calculator
- How to add a screen

---

## Phases & Sprints

### Phase 0 — Foundation (Sprint 0, 1 week)
Deliverables:
- design tokens (colors, typography, spacing)
- navigation scaffold
- input forms (income/expenses/debts)
- local data storage + encryption

Definition of done:
- user can enter data and see “Your Snapshot” screen
- data persists offline

### Phase 1 — Core Engine (Sprints 1–2)
Sprint 1 (Engine v0):
- amortized loan functions
- LOC daily interest functions
- event timeline model
- baseline plan projection

Sprint 2 (Simulator v0):
- scenario builder (3 presets)
- run simulation + compare results
- risk flags (negative cash flow, over limit)

DoD:
- simulation outputs stable and test-covered
- baseline vs strategy comparison works

### Phase 2 — Dashboards (Sprint 3)
- Car Dashboard (default)
- House Dashboard (basic)
- vitals cards + action feed
- “Run a What‑If” deep link

DoD:
- dashboards update from engine outputs
- empty-state UX for missing data

### Phase 3 — Planning & Reminders (Sprint 4)
- plan builder (chunk rule + reminders)
- calendar notifications
- “Recovery Mode” toggle (pause chunking)

DoD:
- reminders fire reliably
- plan changes trigger recalculation

### Phase 4 — Learn + First-run Experience (Sprint 5)
- “Debt Escape” intro animation (embedded)
- micro-lessons (10)
- glossary + tooltips

DoD:
- first-run flow works offline
- lesson completion tracked locally

### Phase 5 — Polish, QA, Store Prep (Sprint 6)
- analytics (privacy)
- export/share card
- accessibility pass
- app store assets + review checklist

DoD:
- beta build ready
- crash-free on test devices
- store metadata complete

---

## Sprint ceremonies (lightweight)
- Sprint planning (45 min): select tickets, confirm DoD
- Daily (10 min): blockers only
- Review (30 min): demo + measure against acceptance criteria
- Retro (20 min): what to improve

---

## Ticket template (copy/paste)
**Title:**  
**User story:** As a ___ I want ___ so that ___  
**Acceptance criteria:**  
- [ ]  
**Edge cases:**  
**Telemetry:** event_name + properties  
**Screens impacted:**  
**Notes / references:**  

---

## Testing strategy
- Unit tests: engine formulas + event timeline
- Snapshot tests: UI components
- Golden tests: scenario inputs → expected outputs (saved JSON)
- Manual QA scripts: onboarding, simulator, reminders

---

## Release gating checklist
- [ ] Security review: encryption + no sensitive logs
- [ ] Accessibility review
- [ ] Offline mode verified
- [ ] Disclaimers visible in onboarding + settings
- [ ] App store review risk words checked (“bank robbery”, etc.)
