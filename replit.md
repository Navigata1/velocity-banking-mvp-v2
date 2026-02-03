# VelocityBank MVP

A truth-first, hope-forward financial empowerment prototype that teaches and simulates Velocity Banking.

## Overview

VelocityBank is an educational web application that helps users understand and visualize velocity banking strategies for debt payoff. The app provides interactive simulations, visual dashboards, and educational content.

## Project Structure

```
apps/web/                    # Next.js 16 web application
├── src/
│   ├── app/                # App router pages
│   │   ├── page.tsx        # Car Dashboard (/)
│   │   ├── simulator/      # What-If Simulator
│   │   ├── cockpit/        # Flight Simulator UI
│   │   ├── learn/          # Micro-lessons & glossary
│   │   └── vault/          # Wealth Transfer Timeline
│   ├── components/         # Reusable UI components
│   │   ├── Navigation.tsx
│   │   ├── VitalCard.tsx
│   │   └── ProgressRing.tsx
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
| `/` | Car Dashboard - 4 vitals, progress ring, cash flow unlock |
| `/simulator` | What-If Engine - Compare baseline vs velocity strategy |
| `/cockpit` | Flight Simulator - Visual instruments for debt payoff |
| `/learn` | Micro-lessons and glossary |
| `/vault` | Wealth Transfer Timeline - Generational impact calculator |

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

## Recent Changes

- 2026-02-03: Initial setup with Next.js 16, TypeScript, Tailwind CSS
- 2026-02-03: Implemented all 5 routes with core functionality
- 2026-02-03: Added calculation engine in `/engine/calculations.ts`

## User Preferences

- Dark theme with slate/emerald color scheme
- Responsive design with mobile-first navigation
- Interactive components with smooth transitions
