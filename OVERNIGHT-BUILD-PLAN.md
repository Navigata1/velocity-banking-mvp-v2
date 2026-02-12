# InterestShield V2 — Overnight Build Plan

## Source of Truth
- **Handoff docs:** `docs/40_CURSOR_CODEX_IMPLEMENTATION.md` (functional sprints) + `docs/41_CLAUDE_CODE_OPUS46_POLISH_HANDOFF.md` (polish layer)
- **Design mockups:** `context/design-reference/01-08` + `reference/design/`
- **Velocity banking math:** `context/transcripts/01-06` + `reference/opus/Opus_4_5.md`
- **North Star:** `docs/01_NORTH_STAR.md`

## Priority Order (class submission ready)

### Phase 1: Fix Core Math (Sprint 3 from handoff)
- [ ] Fix `engine/calculations.ts` — remove placeholder math
- [ ] Implement proper amortization baseline calculation
- [ ] Implement velocity simulation with LOC chunking + average daily balance
- [ ] Add safety warnings: negative cash flow, LOC >80%, negative amortization
- [ ] Ensure Dashboard vitals respond to input changes

### Phase 2: Portfolio Page (Sprint 2 from handoff)
- [ ] Create `/portfolio` route matching mockup image 01
- [ ] Multi-debt management (add/edit/delete)
- [ ] Strategy selector: Velocity Mode (default), Snowball, Avalanche
- [ ] Focus Mode: single lane default, advanced split toggle
- [ ] Progress bars per debt with payoff projections

### Phase 3: Dashboard Overhaul (from mockup images 05-08)
- [ ] Add Wealth Timeline banner at top
- [ ] Expand domain tabs: Auto, House, Land, Credit Card, Student Loan, Medical, Personal, Recreation, Custom
- [ ] Sub-type dropdowns per domain (Auto → Sports Car, SUV, Motorcycle, etc.)
- [ ] Hero image area with dynamic asset per type
- [ ] Cashflow Insights panel (Income, Expenses, Cash Flow, LOC Available)
- [ ] Action Feed sidebar (Payday Incoming, Chunk Ready, etc.)

### Phase 4: Cockpit Enhancement (from mockup image 04)
- [ ] Add Custom asset type with subtypes (Business, Equipment, Jewelry, Art)
- [ ] Fix aviation gauges to use real data

### Phase 5: Learn + Wealth Timeline (from mockup images 02-03)
- [ ] Micro-Lessons with expandable content
- [ ] Wealth Transfer Timeline wizard (step-by-step)
- [ ] Glossary section

### Phase 6: Teacher Mode + Polish (Sprint 0 + doc 41)
- [ ] Verify Teacher Mode toggle works and persists
- [ ] Coach microcopy throughout app
- [ ] Page transitions (Framer Motion)
- [ ] Accessibility pass

## Constraints
- Truth-first math, clearly labeled estimates
- Calm teacher tone — "one lane at a time"
- No shame, no guarantees, "not financial advice"
- Dark theme (emerald/slate palette)
- Must run cleanly for class demo
