# VelocityBank — Claude Code Implementation Guide

> **"Mort-gage" = Death Pledge. Named in 1929 for what it is. Let's help people escape.**

This is the master implementation guide for building VelocityBank using Claude Code. It contains everything needed to execute all development phases and sprints from start to MVP launch.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start](#quick-start)
3. [Development Phases](#development-phases)
4. [Sprint Execution Guide](#sprint-execution-guide)
5. [Technical Architecture](#technical-architecture)
6. [File Structure](#file-structure)
7. [Core Algorithms](#core-algorithms)
8. [Testing Strategy](#testing-strategy)
9. [Deployment](#deployment)
10. [Reference Links](#reference-links)

---

## Project Overview

### Vision
A mobile application that educates financially underserved individuals about velocity banking methodology while providing tools to eliminate debt through strategic interest arbitrage.

### Core Value Proposition
> "See exactly how much money banks steal from you daily—and the tools to stop it."

### Key Metrics
| Metric | Target |
|--------|--------|
| Target Launch | Q3 2026 |
| Platforms | iOS + Android |
| MVP Duration | 12 weeks |
| Daily Interest Accuracy | ±$0.01 |
| Calculation Response | <100ms |

### Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│  React Native + Expo SDK 52+                                │
│  TypeScript (strict mode)                                   │
│  Expo Router (file-based navigation)                        │
│  Zustand (state management)                                 │
│  NativeWind (Tailwind CSS)                                  │
│  Victory Native XL (charts)                                 │
│  React Native Reanimated 3 (animations)                     │
│  React Hook Form + Zod (forms/validation)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
├─────────────────────────────────────────────────────────────┤
│  Supabase                                                   │
│  ├── PostgreSQL (database)                                  │
│  ├── Supabase Auth (email + Apple + Google)                 │
│  ├── Edge Functions (Deno/TypeScript)                       │
│  ├── Row Level Security (data isolation)                    │
│  └── Realtime (future: live updates)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- iOS Simulator (Mac) or Android Emulator

### Initialize Project

```bash
# 1. Create Expo project
npx create-expo-app@latest velocitybank-app --template expo-template-blank-typescript
cd velocitybank-app

# 2. Install dependencies (run in sequence)
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar react-native-reanimated react-native-gesture-handler

npm install zustand @supabase/supabase-js react-hook-form zod @hookform/resolvers
npm install nativewind
npm install -D tailwindcss@3.3.2

# 3. Configure (see docs/setup/ for detailed instructions)
# - tailwind.config.js
# - babel.config.js
# - app.json

# 4. Start development
npx expo start
```

---

## Development Phases

### Phase Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                    12-WEEK MVP DEVELOPMENT PLAN                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PHASE 0: SETUP (Week 1)                                           │
│  ├── Sprint 0: Project scaffold, navigation, auth                  │
│  └── Deliverable: Running app with auth flow                       │
│                                                                     │
│  PHASE 1: CORE CALCULATIONS (Weeks 2-4)                            │
│  ├── Sprint 1: Amortization engine                                 │
│  ├── Sprint 2: Daily interest calculator                           │
│  ├── Sprint 3: Velocity comparison engine                          │
│  └── Deliverable: All financial calculations working               │
│                                                                     │
│  PHASE 2: USER INTERFACE (Weeks 5-7)                               │
│  ├── Sprint 4: Onboarding flow                                     │
│  ├── Sprint 5: Dashboard & account management                      │
│  ├── Sprint 6: Cash flow tracker                                   │
│  └── Deliverable: Complete UI with data entry                      │
│                                                                     │
│  PHASE 3: VISUALIZATION (Weeks 8-9)                                │
│  ├── Sprint 7: Charts integration                                  │
│  ├── Sprint 8: Interest Thief animations                           │
│  └── Deliverable: Visual data representation                       │
│                                                                     │
│  PHASE 4: EDUCATION & POLISH (Weeks 10-11)                         │
│  ├── Sprint 9: Education hub                                       │
│  ├── Sprint 10: Edge cases & testing                               │
│  └── Deliverable: Production-ready features                        │
│                                                                     │
│  PHASE 5: LAUNCH PREP (Week 12)                                    │
│  ├── Sprint 11: App store submission                               │
│  └── Deliverable: Apps submitted to stores                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Phase Details

#### Phase 0: Setup & Foundation (1 week)
**Goal:** Establish project scaffold with working navigation and authentication

| Task | Priority | Complexity |
|------|----------|------------|
| Initialize Expo project | P0 | Low |
| Configure Expo Router | P0 | Medium |
| Set up Supabase client | P0 | Medium |
| Implement auth store | P0 | Medium |
| Configure NativeWind | P1 | Low |
| Create base UI components | P1 | Medium |
| Database migration | P0 | Medium |

**Exit Criteria:**
- [ ] App launches without errors
- [ ] Navigation between screens works
- [ ] User can sign up / sign in
- [ ] Auth state persists across restarts

---

#### Phase 1: Core Calculations (3 weeks)
**Goal:** Build all financial calculation engines with 100% accuracy

| Algorithm | Sprint | Accuracy Requirement |
|-----------|--------|---------------------|
| Amortization schedule | 1 | ±$0.01 vs standard calculators |
| Position detection | 1 | ±2 months |
| Daily interest (simple) | 2 | Exact match |
| Daily interest (amortized) | 2 | ±$0.50/month |
| Velocity comparison | 3 | Validated against spreadsheets |
| Chunk impact | 3 | ±1 payment skipped |

**Exit Criteria:**
- [ ] All calculations match reference implementations
- [ ] Unit test coverage > 95%
- [ ] Edge cases handled (zero rates, large amounts)
- [ ] Performance < 100ms for any calculation

---

#### Phase 2: User Interface (3 weeks)
**Goal:** Complete user-facing screens with data management

| Screen | Sprint | Components |
|--------|--------|------------|
| Onboarding (4 screens) | 4 | Welcome, Revelation, Alternative, Setup |
| Dashboard | 5 | Summary cards, daily interest, quick actions |
| Account Management | 5 | List, Add/Edit forms, Delete confirmation |
| Cash Flow Tracker | 6 | Income, Expenses, Summary |
| Chunk Planner | 6 | Recommendations, Timeline |

**Exit Criteria:**
- [ ] All screens render correctly
- [ ] Forms validate properly
- [ ] Data persists to Supabase
- [ ] Responsive on all screen sizes

---

#### Phase 3: Visualization (2 weeks)
**Goal:** Create compelling visual representations of financial data

| Component | Sprint | Library |
|-----------|--------|---------|
| Amortization chart | 7 | Victory Native |
| Comparison timeline | 7 | Victory Native |
| Interest breakdown | 7 | Victory Native |
| Interest Thief counter | 8 | Reanimated 3 |
| Money flow animation | 8 | Reanimated 3 |
| Chunk impact preview | 8 | Reanimated 3 |

**Exit Criteria:**
- [ ] Charts render at 60fps
- [ ] Animations are smooth
- [ ] Data updates reflect in real-time
- [ ] Accessible (screen reader support)

---

#### Phase 4: Education & Polish (2 weeks)
**Goal:** Add educational content and handle all edge cases

| Feature | Sprint | Description |
|---------|--------|-------------|
| Education hub | 9 | Lessons, case studies, glossary |
| Error boundaries | 10 | Graceful error handling |
| Offline support | 10 | Core calculations work offline |
| Analytics | 10 | PostHog integration |
| Error tracking | 10 | Sentry integration |

**Exit Criteria:**
- [ ] Education content complete
- [ ] No unhandled exceptions
- [ ] App works offline for calculations
- [ ] Analytics tracking verified

---

#### Phase 5: Launch Prep (1 week)
**Goal:** Prepare and submit to app stores

| Task | Platform | Requirements |
|------|----------|--------------|
| App icons | Both | All sizes generated |
| Screenshots | Both | 6.5" and 5.5" iPhone, Pixel |
| Store listing | Both | Description, keywords, privacy policy |
| TestFlight | iOS | Beta testing complete |
| Internal testing | Android | Play Console testing |
| Submission | Both | Review guidelines compliance |

**Exit Criteria:**
- [ ] Apps submitted to both stores
- [ ] No blocking review issues
- [ ] Support email configured
- [ ] Landing page live

---

## Sprint Execution Guide

### Sprint Structure

Each sprint follows this pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                      SPRINT LIFECYCLE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Day 1: SETUP                                               │
│  ├── Review sprint goals                                    │
│  ├── Set up required files/folders                          │
│  └── Install sprint-specific dependencies                   │
│                                                              │
│  Days 2-4: IMPLEMENTATION                                   │
│  ├── Build core functionality                               │
│  ├── Write tests alongside code                             │
│  └── Document as you go                                     │
│                                                              │
│  Day 5: INTEGRATION & TESTING                               │
│  ├── Integration testing                                    │
│  ├── Fix bugs                                               │
│  ├── Update documentation                                   │
│  └── Sprint review                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Sprint Files Location

All sprint details are in `/sprints/`:

```
sprints/
├── SPRINT-00-setup.md           # Phase 0
├── SPRINT-01-amortization.md    # Phase 1
├── SPRINT-02-daily-interest.md  # Phase 1
├── SPRINT-03-velocity-engine.md # Phase 1
├── SPRINT-04-onboarding.md      # Phase 2
├── SPRINT-05-dashboard.md       # Phase 2
├── SPRINT-06-cashflow.md        # Phase 2
├── SPRINT-07-charts.md          # Phase 3
├── SPRINT-08-animations.md      # Phase 3
├── SPRINT-09-education.md       # Phase 4
├── SPRINT-10-polish.md          # Phase 4
└── SPRINT-11-launch.md          # Phase 5
```

### Claude Code Workflow

When working on a sprint with Claude Code:

```bash
# 1. Start sprint
claude "Starting Sprint X. Read sprints/SPRINT-0X-*.md and set up the task list"

# 2. Implement tasks
claude "Implement Task X.Y from the sprint file"

# 3. Test implementation
claude "Run tests for the code we just wrote"

# 4. Review and iterate
claude "Review the implementation against acceptance criteria"

# 5. Complete sprint
claude "Sprint X complete. Run final tests and update documentation"
```

---

## Technical Architecture

### Navigation Structure

```
app/
├── _layout.tsx              # Root layout (auth check)
├── index.tsx                # Entry redirect
├── (auth)/                  # Auth screens (unauthenticated)
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
├── onboarding/              # First-time user flow
│   ├── _layout.tsx
│   ├── index.tsx            # Welcome
│   ├── revelation.tsx       # True cost reveal
│   ├── alternative.tsx      # Velocity preview
│   └── setup.tsx            # Initial data entry
└── (tabs)/                  # Main app (authenticated)
    ├── _layout.tsx
    ├── index.tsx            # Dashboard
    ├── accounts/
    │   ├── index.tsx        # Account list
    │   ├── [id].tsx         # Account detail
    │   └── add.tsx          # Add account
    ├── calculator/
    │   ├── index.tsx        # Main calculator
    │   ├── chunk.tsx        # Chunk planner
    │   └── comparison.tsx   # Side-by-side comparison
    ├── cashflow/
    │   ├── index.tsx        # Cash flow summary
    │   ├── income.tsx       # Income sources
    │   └── expenses.tsx     # Expense tracking
    └── learn/
        ├── index.tsx        # Education hub
        ├── [lesson].tsx     # Individual lesson
        └── glossary.tsx     # Terms glossary
```

### State Management

```typescript
// Store structure with Zustand

stores/
├── auth-store.ts      # User authentication state
├── accounts-store.ts  # Debt accounts
├── cashflow-store.ts  # Income and expenses
├── plans-store.ts     # Velocity plans
├── ui-store.ts        # UI state (modals, loading)
└── settings-store.ts  # App settings
```

### Database Schema

```sql
-- Core tables (see supabase/migrations/ for full schema)

profiles           -- User profiles (extends auth.users)
debt_accounts      -- All debt accounts
income_sources     -- Income tracking
expenses           -- Expense tracking
velocity_plans     -- Saved velocity plans
chunk_history      -- Executed chunks
```

---

## File Structure

```
velocitybank-app/
├── app/                           # Expo Router screens
│   └── [see navigation structure above]
├── src/
│   ├── components/
│   │   ├── ui/                    # Base components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── index.ts
│   │   ├── charts/                # Chart components
│   │   │   ├── AmortizationChart.tsx
│   │   │   ├── ComparisonTimeline.tsx
│   │   │   └── InterestBreakdown.tsx
│   │   ├── forms/                 # Form components
│   │   │   ├── AccountForm.tsx
│   │   │   ├── IncomeForm.tsx
│   │   │   └── ExpenseForm.tsx
│   │   └── animations/            # Animated components
│   │       ├── InterestThief.tsx
│   │       ├── MoneyFlow.tsx
│   │       └── ChunkImpact.tsx
│   ├── services/
│   │   ├── supabase.ts            # Supabase client
│   │   ├── calculations/          # Financial calculations
│   │   │   ├── amortization.ts
│   │   │   ├── daily-interest.ts
│   │   │   ├── velocity-engine.ts
│   │   │   ├── chunk-calculator.ts
│   │   │   └── index.ts
│   │   └── api/                   # API helpers
│   │       ├── accounts.ts
│   │       ├── cashflow.ts
│   │       └── plans.ts
│   ├── stores/                    # Zustand stores
│   │   └── [see state management above]
│   ├── hooks/                     # Custom hooks
│   │   ├── useAccounts.ts
│   │   ├── useCashflow.ts
│   │   ├── useCalculations.ts
│   │   └── useDebounce.ts
│   ├── types/                     # TypeScript types
│   │   ├── accounts.ts
│   │   ├── calculations.ts
│   │   ├── api.ts
│   │   └── database.ts
│   ├── utils/                     # Utilities
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   ├── date-helpers.ts
│   │   └── math-helpers.ts
│   ├── constants/                 # App constants
│   │   ├── colors.ts
│   │   ├── config.ts
│   │   ├── interest-types.ts
│   │   └── education-content.ts
│   └── assets/                    # Static assets
│       ├── images/
│       └── fonts/
├── supabase/
│   ├── migrations/                # Database migrations
│   │   └── 001_initial_schema.sql
│   └── functions/                 # Edge functions
│       ├── calculate-amortization/
│       ├── calculate-velocity/
│       └── calculate-chunk/
├── __tests__/                     # Test files
│   ├── calculations/
│   │   ├── amortization.test.ts
│   │   ├── daily-interest.test.ts
│   │   └── velocity-engine.test.ts
│   ├── components/
│   └── integration/
├── docs/                          # Documentation
├── sprints/                       # Sprint definitions
├── .env.local                     # Environment variables
├── app.json                       # Expo config
├── babel.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Core Algorithms

### 1. Amortization Schedule Generation

**Location:** `src/services/calculations/amortization.ts`

**Formula:**
```
Monthly Payment = P × [r(1+r)^n] / [(1+r)^n - 1]

Where:
  P = Principal (loan amount)
  r = Monthly interest rate (annual rate / 12)
  n = Total number of payments
```

**Key Functions:**
- `calculateMonthlyPayment(principal, rate, termMonths)`
- `generateAmortizationSchedule(input)`
- `detectSchedulePosition(input)`

---

### 2. Daily Interest Calculation

**Location:** `src/services/calculations/daily-interest.ts`

**Simple Interest (HELOC, Credit Cards):**
```
Daily Interest = Balance × Annual Rate / 365
```

**Amortized (Mortgage):**
```
Daily Interest = (Current Month Interest from Schedule) / 30
```

---

### 3. Velocity Comparison Engine

**Location:** `src/services/calculations/velocity-engine.ts`

**Process:**
1. Generate base amortization schedule
2. Calculate LOC recovery time for chunk
3. Simulate chunk deployment cycle
4. Track cumulative interest (mortgage + LOC)
5. Compare to traditional payoff

---

### 4. Chunk Impact Calculator

**Location:** `src/services/calculations/chunk-calculator.ts`

**Process:**
1. Find current position in schedule
2. Calculate new position after chunk
3. Sum skipped interest payments
4. Calculate LOC recovery cost
5. Net savings = Interest skipped - LOC cost

---

## Testing Strategy

### Unit Tests

**Coverage Target:** 95% for calculations, 80% for components

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Files

```
__tests__/
├── calculations/
│   ├── amortization.test.ts      # Amortization tests
│   ├── daily-interest.test.ts    # Interest calculation tests
│   ├── velocity-engine.test.ts   # Comparison engine tests
│   └── chunk-calculator.test.ts  # Chunk impact tests
├── components/
│   ├── Button.test.tsx           # UI component tests
│   └── AccountForm.test.tsx      # Form tests
└── integration/
    ├── auth-flow.test.ts         # Auth integration
    └── account-crud.test.ts      # Account operations
```

### Critical Test Cases

| Algorithm | Test Case | Expected |
|-----------|-----------|----------|
| Amortization | $300K @ 6.5% / 30yr | Payment: $1,896.20 |
| Amortization | Zero interest rate | Payment: Principal / Months |
| Daily Interest | $10K @ 8% (simple) | $2.19/day |
| Position | Balance $278K on $300K loan | Month ~60 |
| Velocity | $5K chunk, $1.5K cash flow | ~4 month recovery |

---

## Deployment

### Environment Variables

```bash
# .env.local (never commit)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# For Edge Functions
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Build Commands

```bash
# Development
npx expo start

# Production builds
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Pre-Launch Checklist

**Technical:**
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Performance benchmarks met
- [ ] Offline calculations working
- [ ] Error tracking configured

**Content:**
- [ ] Privacy policy complete
- [ ] Terms of service complete
- [ ] Disclaimers reviewed by legal
- [ ] Education content finalized

**Store Assets:**
- [ ] App icons (all sizes)
- [ ] Screenshots (required sizes)
- [ ] App description
- [ ] Keywords/tags
- [ ] Category selected

---

## Reference Links

### Project Documentation (Notion)
- [Project Hub](https://www.notion.so/2fbaf53aefd781d79484c8dac0cc9c8c)
- [MVP Requirements](https://www.notion.so/2fbaf53aefd7811d94bdf824c339d7e9)
- [Visual System](https://www.notion.so/2fbaf53aefd78102b274d4b87e0cfcb5)
- [Methodology Deep Dive](https://www.notion.so/2fbaf53aefd7816b9931dc733361eae7)
- [Case Studies](https://www.notion.so/2fbaf53aefd7810c891dd7fb21e3991f)

### External Resources
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [Victory Native](https://formidable.com/open-source/victory/docs/native/)
- [NativeWind](https://www.nativewind.dev/)

---

## Command Quick Reference

```bash
# Development
npx expo start                    # Start dev server
npx expo start --ios             # iOS simulator
npx expo start --android         # Android emulator
npx expo start --web             # Web browser

# Testing
npm test                          # Run tests
npm run test:coverage            # With coverage
npm run test:watch               # Watch mode

# Supabase
npx supabase start               # Local Supabase
npx supabase db push             # Push migrations
npx supabase functions serve     # Local Edge Functions
npx supabase gen types typescript --local > src/types/database.ts

# Build & Deploy
eas build --platform ios         # iOS build
eas build --platform android     # Android build
eas submit --platform ios        # Submit to App Store
eas submit --platform android    # Submit to Play Store

# Utilities
npx expo-doctor                  # Check for issues
npx expo install --check         # Check dependencies
```

---

*"The foundation is set. Now execute sprint by sprint. Depth over speed. Always."*
