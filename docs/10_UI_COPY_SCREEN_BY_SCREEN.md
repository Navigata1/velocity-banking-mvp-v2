# Screen-by-Screen UI Copy (MVP)

This document provides **paste-ready UI text** for every MVP screen.

## Copy principles
- **Calm + empowering:** “You’re in control now.” No shame.
- **Truth-first:** show numbers clearly; label assumptions.
- **Simple language:** explain terms in tooltips (HELOC, APR, principal).
- **Action-oriented:** every screen answers “What do I do next?”
- **Safety-forward:** remind users to keep minimums current and verify lender rules.

### Tone dial (optional)
If you want to support different personalities:
- **Coach Tone (default):** calm, encouraging, neutral.
- **Direct Tone (optional):** firmer language for users who want a wake-up call.

In this doc, the default is **Coach Tone**. Where helpful, a **Direct Tone** variant is included.

---

## Global strings

### App name (working)
- VelocityBank

### Tab labels
- Dashboard
- Accounts
- Simulator
- Cash Flow
- Learn

### Primary buttons
- Continue
- Save
- Done
- Next
- Back
- Run Simulation
- Create Plan
- Enable Reminders

### Secondary buttons
- Skip for now
- Not right now
- Edit
- Delete
- View details
- Learn more

### Common helper text
- “We’ll never sell your data.”
- “This is an educational tool, not financial advice.”
- “Numbers are estimates. Your lender’s terms are the source of truth.”

### Common validation
- “Please enter a number.”
- “This can’t be negative.”
- “That looks too high — double-check the amount.”
- “Your expenses are higher than your income. That’s okay — we’ll help you stabilize first.”

### Permission prompts
**Notifications (system prompt trigger):**
- Title (pre-prompt): “Want gentle reminders?”
- Body: “We can remind you about due dates and planned chunk payments. You control the schedule.”
- Buttons: “Enable reminders” / “Not now”

---

## Auth flow

### (auth)/login
**Goal:** sign in simply.
- Title: “Welcome back”
- Subtitle: “Pick up where you left off.”
- Email label: “Email”
- Email placeholder: “you@example.com”
- Password label: “Password”
- Password placeholder: “••••••••”
- Primary CTA: “Sign in”
- Secondary CTAs: “Create account” / “Forgot password?”
- Error (invalid): “That email or password doesn’t match.”

### (auth)/register
- Title: “Create your account”
- Subtitle: “Let’s turn your numbers into a plan.”
- Fields: Email / Password / Confirm password
- Primary CTA: “Create account”
- Secondary: “Already have an account? Sign in”
- Legal checkbox text: “I agree to the Terms and Privacy Policy.”

### (auth)/forgot-password
- Title: “Reset your password”
- Subtitle: “We’ll email you a reset link.”
- Primary CTA: “Send reset email”
- Success toast: “Check your inbox for a reset link.”
- Secondary: “Back to sign in”

---

## First-run experience

### First launch modal (before onboarding)
**Use case:** show the “Debt Escape / Money Loop” explainer.

- Title: “A 90‑second reset”
- Body: “Most people were taught to make payments. You’re about to learn a better tool.”
- Primary CTA: “Watch the Money Loop”
- Secondary CTA: “Skip (watch later)”
- Checkbox (optional): “Don’t show this again”

**Direct Tone variant:**
- Body: “The system profits when you stay confused. Let’s make it obvious.”

---

## Onboarding

### onboarding/index (Welcome)
**Goal:** pick a starting point and set expectations.

- Title: “Start with what’s closest”
- Subtitle: “Car first. Then house. Then vault.”

**Card options:**
1) **Car First**
   - Description: “Get a win fast. Turn payments into cash flow.”
   - CTA: “Start with my car”

2) **House Next**
   - Description: “See how chunking changes your mortgage timeline.”
   - CTA: “Start with my house”

3) **Vault Later**
   - Description: “Track interest avoided and build freedom.”
   - CTA: “Explore Vault mode”

**Footer note:**
- “You can switch paths anytime.”

### onboarding/revelation (Truth cost reveal)
**Goal:** reveal the interest picture without panic.

- Title: “Here’s what interest does”
- Subtitle: “Not to scare you — to put you back in control.”

**Section labels:**
- “Principal (your asset)”
- “Interest (cost of the loan)”
- “Total paid over time”

**Coach line:**
- “This isn’t about blame. It’s about tools.”

**Direct variant:**
- “You weren’t told the full cost. Now you see it.”

Primary CTA: “Show me a better path”
Secondary CTA: “I’m overwhelmed — go slower”

### onboarding/alternative (Money Loop preview)
**Goal:** explain the Money Loop.

- Title: “The Money Loop”
- Subtitle: “Same income. Same life. Different flow.”

**3-step diagram labels:**
1) “Income hits the line first”
2) “Expenses come out over the month”
3) “Cash flow stays behind to reduce the balance”

**Microcopy:**
- “Lower average balance → lower interest.”
- “Cash flow is the fuel.”

Primary CTA: “Let’s enter my numbers”
Secondary CTA: “Why does this work?” (opens glossary tooltip)

### onboarding/setup (Initial inputs)
**Goal:** capture enough data for Car Dashboard + Simulator.

#### Step header
- Title: “Your Snapshot”
- Subtitle: “You don’t need perfection — just a starting point.”

#### Section A — Income
- Label: “Monthly take-home income”
- Placeholder: “e.g. 5200”
- Helper: “After taxes. If your income changes, use an average.”

Optional toggle:
- “My income is irregular”
- Helper: “We’ll support best/worst-month scenarios.”

#### Section B — Expenses
- Label: “Monthly living expenses”
- Placeholder: “e.g. 3800”
- Helper: “Housing, food, bills, minimum payments — everything.”

#### Section C — Your first target (Car)
- Title: “Car loan”
- Balance label: “Current balance”
- Rate label: “Interest rate (APR %)”
- Payment label: “Monthly payment”
- Helper: “Find these on your last statement.”

#### Primary CTA
- “Build my dashboard”

#### Safety note
- “We will never tell you to miss required minimum payments.”

---

## Main app — Dashboard (Car)

### (tabs)/index
**Goal:** show progress and the next action in a calming way.

- Title: “Your Financial Vitals”
- Subtitle: “Small moves. Big momentum.”

#### Vitals cards
1) **Cash Flow**
   - Label: “Cash flow”
   - Helper: “Income minus expenses. This is your fuel.”
   - Empty state: “Add income + expenses to see this.”

2) **Interest Burn**
   - Label: “Interest burn”
   - Helper: “What the debt costs you per day.”
   - Empty state: “Add your target debt to see this.”

3) **Debt-Free ETA**
   - Label: “Car debt‑free”
   - Helper: “Based on your current plan.”

4) **Next Move**
   - Label: “Next best move”
   - Examples:
     - “Add your LOC/HELOC to simulate the Money Loop.”
     - “A $500 chunk this month saves ~X weeks.”

#### Quick actions
- Primary: “Run a what‑if”
- Secondary: “Add an account”

#### Coach feed (rotating)
- “You don’t need a perfect month. You need a consistent loop.”
- “If life hits, switch on Recovery Mode and keep moving.”
- “Every payment you eliminate becomes new cash flow.”

#### Empty state (first time)
- Title: “You’re one step away”
- Body: “Add your car loan and monthly numbers to see your first plan.”
- CTA: “Finish setup”

---

## Accounts

### (tabs)/accounts/index
- Title: “Your accounts”
- Subtitle: “Add what you want to simulate.”

**Account types (buttons):**
- Car loan
- Mortgage
- Credit card
- Line of credit (LOC / HELOC)

Empty state:
- Title: “Add your first account”
- Body: “Start with your car loan — you can add the rest later.”
- CTA: “Add car loan”

### (tabs)/accounts/add
- Title: “Add an account”
- Subtitle: “We’ll use this to calculate interest and payoff speed.”

Fields by type:
- Balance
- APR
- Minimum payment
- Due date (optional)
- Credit limit (LOC/credit card only)

Save CTA: “Save account”

### (tabs)/accounts/[id]
- Title: “Account details”
- Tabs: “Overview / History / Assumptions”

Buttons:
- “Edit”
- “Delete” (with confirm)

Delete confirm:
- Title: “Delete this account?”
- Body: “This removes it from your plan and simulations.”
- Buttons: “Delete” / “Cancel”

---

## Simulator

### (tabs)/calculator/index (Simulator home)
**Goal:** let users test scenarios ($100/$200/$400 etc.)

- Title: “What‑if simulator”
- Subtitle: “Try a strategy before you live it.”

Scenario presets:
- “Conservative” — “Small chunks, maximum safety.”
- “Balanced” — “Steady momentum.”
- “Aggressive” — “Fast payoff (requires strong cash flow).”

Inputs:
- “Extra per month” (quick chips: $100 / $200 / $400 / $800)
- “Chunk size”
- “Chunk frequency” (monthly / quarterly / when cash flow allows)

Primary CTA: “Run simulation”

Results labels:
- “Payoff time”
- “Interest paid”
- “Interest avoided”
- “Cash flow unlocked”

Safety banner (if risk flags):
- Title: “Pause — your plan needs a safety tweak”
- Body examples:
  - “Your cash flow is negative. Stabilize expenses before chunking.”
  - “Your LOC usage gets too close to the limit. Reduce chunk size.”
- CTA: “Show safer plan”

### (tabs)/calculator/comparison
- Title: “Compare paths”
- Subtitle: “Same numbers, different outcomes.”

Columns:
- “Baseline”
- “Your plan”

Row labels:
- “Debt‑free date”
- “Total interest”
- “Cash flow milestones”

CTA: “Save this plan”

### (tabs)/calculator/chunk (Chunk planner)
- Title: “Chunk planner”
- Subtitle: “Chunks are how you ‘jump the schedule.’”

Fields:
- “Target account”
- “Chunk amount”
- “When” (next payday / every month / custom)

Coach tip:
- “A chunk isn’t extra money — it’s money moved on purpose.”

CTA: “Add to plan”

---

## Cash Flow

### (tabs)/cashflow/index
- Title: “Cash flow”
- Subtitle: “This is what powers your plan.”

Cards:
- “Income”
- “Expenses”
- “Net cash flow”

Coach line:
- “If this number grows, everything gets easier.”

CTA: “Edit income” / “Edit expenses”

### (tabs)/cashflow/income
- Title: “Income sources”
- Subtitle: “Add one or more paychecks.”

Fields:
- “Source name” (e.g., Job, Side work)
- “Amount”
- “Schedule” (weekly / biweekly / monthly)

CTA: “Add income source”

### (tabs)/cashflow/expenses
- Title: “Expenses”
- Subtitle: “Start simple. Categories are optional.”

Options:
- “Simple total” (default)
- “Add categories” (optional)

Coach line:
- “This is not a budget to shame you. It’s a map.”

CTA: “Save expenses”

---

## Learn

### (tabs)/learn/index
- Title: “Learn the tools”
- Subtitle: “Short lessons. Big clarity.”

Top modules:
1) “The Money Loop (2 min)”
2) “Simple vs amortized interest (3 min)”
3) “Cash flow unlock (2 min)”
4) “Chunking basics (3 min)”
5) “Safety rules (2 min)”

CTA: “Watch the Money Loop”

### (tabs)/learn/[lesson]
- Title: (lesson title)
- Buttons: “Mark complete” / “Save for later”

End card:
- “Nice work. Want to apply this?”
- CTA: “Run a simulation”

### (tabs)/learn/glossary
- Title: “Glossary”
- Search placeholder: “Search terms (HELOC, APR, principal…)”

Glossary item template:
- Term
- One‑line definition
- “Why it matters” (1–2 sentences)

---

## Vault (MVP-lite)

> Vault becomes prominent once a user has meaningful momentum. In MVP, it can be a section inside Dashboard or Learn.

### Vault entry card
- Title: “Vault”
- Body: “Track interest avoided and build a freedom buffer.”
- CTA: “Open Vault”

### Wealth Transfer Timeline (optional experience)
**Coach tone default:**
- Title: “The Wealth Transfer”
- Subtitle: “See the true lifetime cost — then the alternative.”

**Direct tone optional:**
- Subtitle: “See what interest takes — and how to stop it.”

Safety footer:
- “Investment growth is hypothetical. Returns are not guaranteed.”

---

## Settings

### Settings main
- Title: “Settings”

Sections:
- “Coach tone” (Calm / Direct)
- “Celebrations” (On / Off)
- “Notifications” (Manage)
- “Assumptions” (Rates, tax, etc.)
- “Export data”
- “Privacy & security”

Privacy copy:
- “Your data is yours. We don’t sell it.”

Export copy:
- “Export a JSON backup you can move to another device.”

---

## Error states & edge cases (global)

### Negative cash flow
- Title: “Stabilize first”
- Body: “Your expenses are higher than your income right now. You’re not broken — the plan just needs a stabilizing step.”
- Actions: “Show expense levers” / “Run a worst‑month simulation”

### LOC limit risk
- Title: “Too close to the edge”
- Body: “This plan pushes your line of credit near its limit. Let’s reduce the chunk size for safety.”
- Action: “Adjust plan”

### Missing minimums
- Title: “Minimums come first”
- Body: “The fastest plan is never worth missed minimum payments. We’ll keep you safe.”

---

## Share cards (MVP)

### Share sheet title
- “My debt payoff progress”

Card headline examples:
- “Interest avoided: {amount}”
- “Months saved: {months}”
- “Cash flow unlocked: {amount}/mo”

Footer:
- “Built with VelocityBank (educational tool)”

---

## House Dashboard (MVP)

### (tabs)/index — when House path is active
**Goal:** make amortization + chunk impact obvious, without overwhelm.

- Title: “House Vitals”
- Subtitle: “Turn your mortgage from a 30‑year story into a near‑term plan.”

#### House hero card
- Label: “Mortgage balance”
- Sub-label: “Principal remaining”
- Tooltip: “Principal is the part that actually buys your home.”

#### Key cards
1) **Schedule Jump**
   - Label: “Schedule jump”
   - Helper: “How far forward your last chunk moved you.”
   - Empty state: “Run a chunk simulation to see a schedule jump.”

2) **Interest Avoided**
   - Label: “Interest avoided”
   - Helper: “Estimated savings vs baseline payments.”

3) **LOC/HELOC Utilization**
   - Label: “Line utilization”
   - Helper: “How much of your available line you’re using.”

4) **Next Chunk Window**
   - Label: “Next chunk window”
   - Helper: “When your cash flow supports your next chunk.”

#### House quick actions
- Primary: “Simulate a chunk”
- Secondary: “Add / edit HELOC”

#### House coach feed
- “Chunks work best when your cash flow is stable.”
- “You’re not ‘paying extra’ — you’re changing timing.”
- “Protect your minimums. Then attack principal.”

---

## Cockpit Mode (Flight Simulator)

> Cockpit Mode is an **alternate view** of the same simulation outputs.

### Entry point
- Button label: “Cockpit Mode”
- Tooltip: “See your plan like instruments on a dashboard.”

### Cockpit screen
- Title: “Cockpit”
- Subtitle: “Steady inputs. Smooth landing.”

#### Instruments
1) **Airspeed — Cash Flow**
   - Label: “Cash flow / mo”
   - Helper: “More airspeed = faster payoff.”

2) **Fuel Burn — Interest / day**
   - Label: “Interest burn / day”
   - Helper: “This is the leak you’re sealing.”

3) **Altitude — Net progress**
   - Label: “Progress”
   - Helper: “Distance to debt‑free.”

4) **Heading — Target**
   - Label: “Target”
   - Options: “Car / House / Cards”

5) **Turbulence — Volatility**
   - Label: “Turbulence”
   - Helper: “Irregular income or big upcoming expenses.”

#### Cockpit actions
- Primary: “Run this flight”
- Secondary: “Safer flight plan”

Safety banner examples:
- “Turbulence ahead: your cash flow dips next month. Switch to Recovery Mode.”
- “Warning: utilization gets high. Reduce chunk size.”

---

## Recovery Mode (Emergency handling)

### Toggle location
- Dashboard quick actions
- Simulator result banner

### Copy
- Title: “Recovery Mode”
- Body: “Life happens. We’ll keep minimums safe and reduce risk while you recover.”

What changes (microcopy):
- “Chunks pause automatically.”
- “Plan focuses on stability and avoiding new interest.”
- “We’ll suggest the smallest next step to resume momentum.”

Buttons:
- “Enable Recovery Mode” / “Resume full plan”

---

## Reminders & scheduling

### Reminder setup screen (MVP simple)
- Title: “Reminders”
- Subtitle: “Gentle nudges. You stay in control.”

Options:
- “Payday deposit reminder”
- “Credit card due date reminder”
- “Chunk window reminder”

Default microcopy:
- “We don’t move money for you. We just remind you.”

CTA:
- “Enable reminders”

---

## App store-safe phrasing guide (important)

To reduce review risk, prefer:
- “Interest is expensive and often misunderstood.”
- “Traditional loans can be interest-heavy early on.”
- “Banks profit from interest; you can reduce what you pay.”

Avoid as default copy (optional in Direct Tone):
- “Banks are stealing/robbing you.”
- “Highway robbery.”

