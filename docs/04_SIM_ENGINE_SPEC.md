# Simulation & Calculation Engine Spec

This engine powers:
- dashboard vitals
- what-if simulator
- plan projections
- shareable reports

## 1) Account Types

### A) Amortized Loan (Car/Mortgage)
Fields:
- principal_balance
- annual_interest_rate (APR)
- term_months
- scheduled_payment (if not provided, compute)
- next_due_date
- compounding: monthly (default)

Core formulas:
- monthly_rate = APR / 12
- payment = P * r / (1 - (1+r)^(-n))  (if needed)

Interest accrual (monthly):
- interest = balance * monthly_rate
- principal_paid = payment - interest
- balance = balance - principal_paid - extra_principal

### B) Revolving Line of Credit (LOC/HELOC)
Fields:
- credit_limit
- balance
- APR
- day_count_basis: 365 (default), optional 360
- interest_method: daily simple interest, billed monthly
- minimum_payment_rule: lender-specific (MVP uses % of balance or interest-only toggle)

Daily interest:
- daily_rate = APR / basis
- daily_interest = balance * daily_rate

Monthly billing:
- sum daily_interest over statement period
- balance += interest_charge

### C) Credit Card (Expense Vehicle)
MVP: support two modes
1) **Paid in full each month**: interest = 0
2) **Carrying balance**: daily interest similar to LOC

Fields:
- APR
- statement_day
- due_day
- rewards_rate (cashback %)
- current_balance
- statement_balance

Rewards:
- rewards = spend * rewards_rate
- store as “reward_credit” and show as offset metric (do not distort principal math)

## 2) Events

We simulate time with either:
- daily loop (accurate; fine for up to 10 years)
- event-driven (faster; more complex)

MVP recommendation: daily loop with monthly rollups.

Event types:
- IncomeDeposit(date, amount, destination)
- Expense(date, amount, routing = {cash|card|loc})
- CardPayment(date, amount, source=LOC)
- ChunkPayment(date, amount, from=LOC, to=LoanPrincipal)
- MinimumPayment(date, loan/card)
- InterestPost(date, account)

## 3) Strategy Rules (toggles)
- Deposit all income to LOC (default ON)
- Route eligible expenses to credit card (default ON)
- Pay credit card statement from LOC on due date (default ON)
- Chunk rule:
  - fixed amount
  - “excess cash flow” rule (balance threshold)
  - calendar-based (every X weeks/months)

## 4) Core Loop (Daily)
Pseudo:
1. Apply events scheduled today (income, expenses, chunk)
2. Accrue daily interest for LOC (and card if revolving)
3. At statement end:
   - post interest to balances
4. At due dates:
   - pay minimums (unless strategy replaces it)
5. Validate constraints:
   - if LOC balance > limit → flag as invalid plan
   - if any minimum payment missed → flag

## 5) Outputs (what simulator returns)
- debt_free_date per target
- total_interest_paid by account
- total_interest_avoided vs baseline (baseline = standard amortization / minimum-pay behavior)
- cash_flow_over_time
- average_daily_balance series for LOC
- “cash flow unlocked” events (payment eliminated)
- risk flags + explanations

## 6) Risk Flags
- Negative cash flow (plan not self-amortizing)
- LOC utilization > configurable threshold (e.g., 80%)
- Promo APR expiration within 90 days
- Income volatility high (seasonal)
- Emergency buffer below minimum (user-defined)

## 7) Validation Tests (must-have)
- Known amortization examples match third-party calculators
- Invariant: balances never become NaN, never negative unless paid off
- Compare baseline vs strategy for same inputs yields plausible interest difference

## 8) Transparency UI requirement
Every output must show:
- assumptions (basis 365, statement length, compounding)
- where interest is calculated
- why the result differs from the baseline
