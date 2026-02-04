# InterestShield MVP

A truth-first, hope-forward financial empowerment prototype that teaches and simulates Velocity Banking.

## Overview

InterestShield is an educational web application that helps users understand and visualize velocity banking strategies for debt payoff. The app provides interactive simulations, visual dashboards, and educational content.

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
Each of the 9 domains has unique content:
- **Auto**: Car loan payoff with insurance tips
- **House**: Mortgage acceleration with equity insights
- **Land**: Property investment tracking
- **Credit Card**: High-interest debt crushing strategies
- **Student Loan**: Education debt with tax deduction tips
- **Medical**: Negotiable medical debt (18% APR default)
- **Personal Loan**: Debt consolidation (11% APR default)
- **Recreation**: Boats, RVs, jet skis (8.9% APR default)
- **Custom**: User-defined assets with custom settings

### AI Assistant
Click the 🤖 AI Assistant button in the navigation to open a chat interface:
- Answers questions about velocity banking concepts
- Explains chunks, LOC strategy, and cash flow
- Provides guidance on using the app
- Keyword-based responses with helpful tips

### Non-Linear Sliders
The income/expense quick-adjust sliders use non-linear breakpoints:
- 0-25% of slider = $1 to $3,000 (fine control for low incomes)
- Gradual acceleration through $10K, $100K to $10M
- Better UX for users across all income levels

### Subcategory Dropdowns
Click an active domain tab to reveal a dropdown with subcategory options:
- **Auto**: Sedan, Sports Car, SUV, Motorcycle, Pickup Truck, Semi Truck
- **House**: Starter Home, Family Home, Townhouse, Condo, Luxury Home, Mansion
- **Land**: Building Lot, Acreage, Farmland, Ranch, Commercial, Estate
- **Credit Card**: Basic, Rewards, Store Card, Premium, Platinum, Black Card
- **Student Loan**: Community College, State University, Private, Graduate, Professional, Doctorate
- **Medical**: Routine Care, Dental, Emergency, Surgery, Specialist, Major Medical
- **Personal Loan**: Small, Medium, Consolidation, Large, Signature, Premium
- **Recreation**: Jet Ski, Boat, RV, Yacht, Super Yacht, Private Jet
- **Custom**: Other Asset, Business, Equipment, Jewelry, Art/Collectibles, Crypto/Investments

Selected subcategory icons appear in the navigation and hero visual.

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

- 2026-02-04: Added Wealth Timeline summary section at top of dashboard with key metrics
- 2026-02-04: Created 3-gauge flight simulator panel in Cockpit page (altitude/progress, heading dial, fuel gauge) with decorative rivets
- 2026-02-04: Made EditableNumber component fully theme-aware for light theme text visibility
- 2026-02-04: Added textMuted class to theme store for consistent tertiary text styling
- 2026-02-04: Fixed Vault page step content with full theme support across all 5 steps
- 2026-02-04: Fixed remaining hardcoded colors in Cockpit and Vault pages for cross-theme compatibility
- 2026-02-04: Updated loading skeletons and progress bars to use theme-neutral bg-gray-500/20-30 colors
- 2026-02-04: Renamed "Black" theme to "Dark" for better naming consistency
- 2026-02-04: Fixed domain selector dropdown z-index (9999) to appear above hero visuals
- 2026-02-04: Generated 250 curated Q&A responses for Shield Guardian AI assistant
- 2026-02-04: Created three-theme system (Original dark, Dark deeper, Light white/grey)
- 2026-02-04: Applied liquid glass effects to all buttons, cards, hero visuals, and panels
- 2026-02-04: Repositioned Shield Guardian under Wealth Timeline for better visibility
- 2026-02-04: Updated all components with theme-aware styling (Navigation, DomainTabs, VitalsGrid, ActionFeed, Learn, Simulator)
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
- 2026-02-03: Replaced Vault domain with Credit Card (💳) and added Student Loan (🎓) as 5th domain
- 2026-02-03: Moved Vault to standalone "Wealth Timeline" page for generational wealth calculations
- 2026-02-03: Added comprehensive Investopedia resource links to all Learn page lessons and glossary
- 2026-02-03: Implemented store merge strategy for backward compatibility with persisted data
- 2026-02-03: Added guard clauses in calculations to prevent undefined errors
- 2026-02-03: Added dual non-linear sliders for quick income/expense adjustment in Simulator
- 2026-02-03: Dynamic dashboard icon in navigation changes based on active domain (Car/House/Land/Credit Card/Student Loan)
- 2026-02-03: Expanded to 9 domains: Auto, House, Land, Credit Card, Student Loan, Medical, Personal Loan, Recreation, Custom
- 2026-02-03: Generated AI hero images for all 9 domains (professional photography style)
- 2026-02-03: Added AI Assistant chatbot with velocity banking Q&A
- 2026-02-03: Improved dual sliders with non-linear breakpoints favoring low-income users
- 2026-02-04: Added subcategory dropdowns for all 9 domains (click active tab to reveal options)
- 2026-02-04: Subcategory icons reflect in navigation and hero visuals for personalization
- 2026-02-04: Rebranded from VelocityBank to InterestShield
- 2026-02-04: Generated 54 AI hero images for all subcategories (9 domains x 6 each)
- 2026-02-04: Immersive 3D hero container with gradients, glow effects, and soft rounded corners
- 2026-02-04: Added 3D rotation animation to hero images (racing game car selection style)
- 2026-02-04: Created Shield Guardian mascot with animated floating effect in navigation
- 2026-02-04: Domain background color shifts locked as permanent feature

## User Preferences

- Dark theme with slate/emerald color scheme
- Responsive design with mobile-first navigation
- Interactive components with smooth transitions
