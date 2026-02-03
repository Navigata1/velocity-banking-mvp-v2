# Cockpit Mode (Flight Simulator for Money)

## Why it exists
Some people don’t learn from charts. They learn when they can **feel** cause → effect.
Cockpit Mode turns the Money Loop into an experience.

## Core mapping (instruments)
- **Altitude** = Net Worth (or “Debt Remaining” inverted)
- **Airspeed** = Cash Flow (positive = faster)
- **Fuel** = Liquidity buffer (available credit + cash)
- **Fuel Burn** = Interest per day
- **Heading** = Target debt (Car / House / Cards)
- **Turbulence** = Variable income + emergencies

## MVP Cockpit Screen Layout
```
[Altimeter]   [Airspeed]   [Fuel]
[Burn/day]    [Heading]    [Turbulence]

[Scenario Controls]
- Income slider
- Expense slider
- Chunk size + frequency
- Toggle: Expense Card on/off
- Toggle: “Deposit all income to LOC” on/off

[Run] button + [Compare] button
```

## What makes it “click”
Every time the user moves a slider:
- the Burn/day gauge updates
- the ETA shifts
- the app narrates in one sentence:
  - “More cash flow = lower average balance = less interest.”

## Safety rail
If a slider creates a plan that exceeds credit line limits:
- cockpit shakes lightly
- message: “This plan runs out of runway. Reduce chunk size or increase buffer.”
