# UI Wireframes (Car → House → Vault)

These are layout wireframes (not pixel-perfect). Use them to build screens fast, then refine.

---

## Global Navigation (MVP)
Bottom tabs:
1. **Dashboard**
2. **Simulator**
3. **Plan**
4. **Learn**
5. **Profile**

Dashboard has three sub-tabs (top pills):
- **Car**
- **House**
- **Vault**

---

# 1) Car Dashboard (DEFAULT)

## Goal
Turn “my car loan is crushing me” into:
- daily interest visibility
- a payoff timeline the user can influence
- a simple plan they can follow

## Hero metaphor
A **car** visual with 4 “hotspots” (like the heart dashboard):
- Engine (Cash Flow)
- Speedometer (Payoff speed)
- Fuel (Available credit / liquidity buffer)
- Leak (Interest burn)

### Layout
```
[Top bar: Month selector | Notifications | Settings]

[Sub-tabs:  Car | House | Vault]

LEFT (Hero)
------------------------------------------------
[ 3D/Flat Car Illustration ]
   • Hotspot: Engine = Cash Flow
   • Hotspot: Leak = Interest/day
   • Hotspot: Fuel = Available LOC
   • Hotspot: Speed = Debt-free ETA
[ mini chart: balance trend ]

CENTER (Vitals Cards)
------------------------------------------------
[Cash Flow]        [Interest Burn]
$ +420/mo          $ 3.82/day | $115/mo

[Car Loan Balance] [Next Move]
$ 18,450 @ 6.9%    “Chunk in 14 days: $400”

RIGHT (Action Feed)
------------------------------------------------
Card 1: “Payday → deposit to LOC”
Card 2: “Expense card due in 3 days”
Card 3: “You unlocked $160/mo cash flow last month”
Card 4: “Emergency? Switch to Recovery Mode”
```

### Primary CTA
A large button: **Run a What‑If** → opens Simulator preloaded with Car scenario.

### Micro-copy tone examples
- “You’re not behind — you’re learning the system.”
- “Small chunks still work. Consistency wins.”

---

# 2) House Dashboard

## Goal
Make chunking + amortization visible without intimidating users.

## Hero metaphor
A **house** with:
- Roof: mortgage principal
- Basement: HELOC/LOC hub
- Pipes: money flow (income in, expenses out)
- Fire: “interest burn” (should shrink)

### Layout
```
[House illustration with flow lines]
[Mortgage Progress Ring: 18% paid | 82% remaining]
[Vitals]
- Mortgage balance + rate + payment
- LOC balance + limit + rate
- Interest saved (YTD / lifetime)
- Next chunk opportunity

[Timeline: “Schedule Jump”]
- Chunk #1 → moved payoff date forward by X months
- Chunk #2 → moved payoff date forward by Y months
```

### Comparison widget (killer feature)
Two small charts:
- **Standard amortization** (slow principal progress early)
- **Velocity plan** (principal drops faster)

---

# 3) Vault Dashboard (Wealth / Freedom)

## Goal
When users start winning, they shift from “escape debt” to “build wealth.”

## Hero metaphor
A **vault** with:
- “Wealth protected” vs “Wealth transferred”
- Net worth
- Freedom fund (liquidity buffer)
- Optional: investment growth comparisons

### Layout
```
[Vault illustration]
[Net Worth]         [Wealth Transfer]
$ 42,100            $ 188,400 interest avoided

[Freedom Fund]      [Next Goal]
$ 2,000 buffer      “Max Roth IRA” / “Buy another asset”

[Shareable Card Generator]
“Here’s what changed for me”
- months saved
- interest avoided
- cash flow unlocked
```

---

# Accessibility rules
- Default “simple view” (4 vitals only)
- “Advanced” toggle reveals:
  - daily interest models
  - average daily balance charts
  - multi-account orchestration details
