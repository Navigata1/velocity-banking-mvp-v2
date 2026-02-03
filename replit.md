# VelocityBank MVP

A truth-first, hope-forward financial empowerment prototype that teaches and simulates Velocity Banking.

## Overview

VelocityBank is an educational web application that helps users understand and visualize velocity banking strategies for debt payoff. The app provides interactive simulations, visual dashboards, and educational content.

## Project Structure

```
apps/web/                    # Next.js 16 web application
├── src/
│   ├── app/                # App router pages
│   │   ├── page.tsx        # Multi-Domain Dashboard (/)
│   │   ├── simulator/      # What-If Simulator
│   │   ├── cockpit/        # Flight Simulator UI
│   │   ├── learn/          # Micro-lessons & glossary
│   │   └── vault/          # Wealth Transfer Timeline
│   ├── components/         # Reusable UI components
│   │   ├── Navigation.tsx
│   │   ├── DomainTabs.tsx
│   │   ├── EditableNumber.tsx  # Inline editable numbers
│   │   ├── HeroVisual.tsx
│   │   ├── VitalsGrid.tsx
│   │   └── ActionFeed.tsx
│   ├── stores/             # Zustand state management
│   │   └── financial-store.ts
│   └── engine/             # Calculation logic
│       └── calculations.ts
├── package.json
└── next.config.ts

docs/                        # Specification documents
prototypes/                  # Reference implementations
reference/                   # Design assets and transcripts
```

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Runtime**: Node.js 20

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Multi-Domain Dashboard with tabs (Car, House, Land, Credit Card, Student Loan) |
| `/simulator` | What-If Engine - Compare baseline vs velocity strategy |
| `/cockpit` | Flight Simulator - Visual instruments for debt payoff |
| `/learn` | Micro-lessons and glossary |
| `/vault` | Wealth Timeline - Generational wealth transfer calculator (standalone) |

## Dashboard Domains

The main dashboard (`/`) features a tabbed interface with 5 debt domains:

| Domain | Hero Visual | Purpose |
|--------|-------------|---------|
| Car | 🚗 | Car loan payoff tracking |
| House | 🏠 | Mortgage acceleration |
| Land | 🏞️ | Property/land investment tracking |
| Credit Card | 💳 | High-interest credit card debt crushing |
| Student Loan | 🎓 | Education debt payoff tracking |

Each domain includes:
- **Hero Visual**: Large visual on left with interactive hotspots
- **Vitals Grid**: 4 key metrics in center column
- **Action Feed**: Contextual actions/tips/milestones on right

## Running the App

The app runs on port 5000:
```bash
cd apps/web && npm run dev
```

## Key Features

1. **Car Dashboard**: Visual progress tracking with key metrics
2. **Simulator**: Side-by-side comparison of traditional vs velocity banking
3. **Cockpit Mode**: Gamified flight simulator visualization
4. **Learn**: Educational content with expandable lessons and glossary
5. **Vault**: Multi-step wealth transfer timeline calculator

## Design Principles

- Calm, modern, welcoming UI (not fear-based)
- Coach voice: supportive, no shame
- All assumptions labeled; no guaranteed results language
- Footer disclaimer: "Educational tool. Not financial advice."

## Core Math

### Amortized Loan
- Monthly rate: `r = APR/12`
- Monthly interest: `balance * r`
- Principal: `payment - interest`

### LOC Interest
- Uses average-balance monthly estimate (labeled as estimate)

## Shared State Management

The app uses Zustand for shared state across all views. The `financial-store.ts` provides:

- **User data**: Income, expenses, age, active domain
- **Debt accounts**: Car, House, Land with balance, rate, term, minimum payment
- **LOC**: Limit, balance, interest rate
- **Chunk settings**: Amount and frequency
- **Calculated values**: Cash flow, daily interest, baseline vs velocity payoff

All views (Dashboard, Simulator, Cockpit, Vault) share this state, so changes in one view are reflected everywhere.

## Editable Numbers

Click any number in the app to edit it inline. The EditableNumber component supports:
- Currency formatting ($X,XXX)
- Percentage formatting (X.X%)
- Custom suffixes (years, months)
- Keyboard shortcuts (Enter to save, Escape to cancel)

## Dashboard Features

### Vitals Category Buttons (💰📊🎯⚡)
Four icon buttons switch between different insight categories:
- **💰 Cashflow**: Income, expenses, cash flow, LOC available
- **📊 Analytics**: Daily interest burn, baseline vs velocity interest, savings
- **🎯 Goals**: Debt balance, time to freedom, min payment, chunk power
- **⚡ Velocity**: Velocity score, acceleration, LOC cycles, efficiency

### Action Feed Filters (All/Actions/Tips/Wins)
Filter the action feed by type:
- **All**: Shows all items
- **Actions**: Actionable tasks (payday, chunks, payments)
- **Tips**: Helpful suggestions and optimizations
- **Wins**: Milestones and achievements

### Click-to-Expand Deep Insights
Every vitals card and action item can be clicked to reveal:
- Detailed description
- 3 key metrics with trend indicators (up/down/neutral)
- Actionable tips

### Domain-Specific Content
Each domain (Car, House, Land, Credit Card, Student Loan) has unique:
- Actions tailored to that asset type
- Metrics relevant to the specific debt
- Tips specific to that financial situation

### Auto-Cycling Highlight
Action items cycle every 5 seconds with a subtle ring highlight.

## Current Phase

**Phase 2: Dashboards** (Sprint 3) - COMPLETE
- ✅ Multi-domain dashboard with tabs
- ✅ Domain tabs in Cockpit view
- ✅ Editable numbers across all views
- ✅ Shared state with Zustand
- ✅ Vault calculator connected to shared state
- ✅ Interactive vitals category buttons
- ✅ Action feed filtering
- ✅ Click-to-expand deep insights
- ✅ Domain-specific actions and content

**Next Steps (Phase 3)**:
- Plan builder with chunk rules and reminders
- Calendar notifications
- Recovery Mode toggle

## Recent Changes

- 2026-02-03: Initial setup with Next.js 16, TypeScript, Tailwind CSS
- 2026-02-03: Implemented all 5 routes with core functionality
- 2026-02-03: Added calculation engine in `/engine/calculations.ts`
- 2026-02-03: Redesigned dashboard with 3-column layout matching reference design
- 2026-02-03: Added multi-domain tabs (Car, House, Land, Vault) with domain-specific data
- 2026-02-03: Created HeroVisual, VitalsGrid, ActionFeed, and DomainTabs components
- 2026-02-03: Added Zustand store for shared state management across views
- 2026-02-03: Created EditableNumber component for inline editing
- 2026-02-03: Added domain tabs to Cockpit view
- 2026-02-03: Connected all views to shared store for real-time calculations
- 2026-02-03: Updated Vault to use shared state for mortgage calculations
- 2026-02-03: Added interactive vitals category buttons (💰📊🎯⚡) with 4 insight categories
- 2026-02-03: Added Action Feed filtering (All/Actions/Tips/Wins) with dynamic content
- 2026-02-03: Implemented click-to-expand deep insights with metrics and tips
- 2026-02-03: Created domain-specific actions for Car, House, Land, and Vault

## User Preferences

- Dark theme with slate/emerald color scheme
- Responsive design with mobile-first navigation
- Interactive components with smooth transitions
