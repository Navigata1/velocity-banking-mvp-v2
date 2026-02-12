/**
 * Portfolio Simulation Engine
 * 
 * Supports multi-debt payoff simulation with velocity, snowball, and avalanche strategies.
 * Truth-first math. Educational estimates only. Not financial advice.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type DebtCategory =
  | 'mortgage'
  | 'auto'
  | 'credit_card'
  | 'student_loan'
  | 'personal_loan'
  | 'medical'
  | 'land'
  | 'purchase_plan'
  | 'custom';

export type DebtKind = 'amortized' | 'revolving' | 'simple';
export type PaymentSource = 'checking' | 'loc' | 'either';
export type PayoffStrategy = 'velocity' | 'snowball' | 'avalanche';
export type FocusMode = 'single' | 'split';

export type MinPaymentRule =
  | { type: 'fixed'; amount: number }
  | { type: 'percent'; percent: number; floor: number };

export interface PromoApr {
  introApr: number;
  monthsRemaining: number;
  postIntroApr: number;
}

export interface DebtItem {
  id: string;
  name: string;
  category: DebtCategory;
  kind: DebtKind;
  balance: number;
  apr: number; // decimal (0.065 = 6.5%)
  minPaymentRule: MinPaymentRule;
  termMonths?: number;
  paymentSource: PaymentSource;
  promo?: PromoApr;
  createdAt?: string;
  notes?: string;
}

export interface PortfolioPlanSettings {
  strategy: PayoffStrategy;
  focusMode: FocusMode;
  splitRatioPrimary: number;
}

export interface PortfolioSimulationInputs {
  monthlyIncome: number;
  monthlyExpenses: number;
  extraMonthlyPayment: number;
  debts: DebtItem[];
  settings: PortfolioPlanSettings;
  maxMonths?: number;
}

export interface DebtPayoffEvent {
  id: string;
  name: string;
  monthPaidOff: number;
}

export interface MonthResult {
  month: number;
  balances: Record<string, number>;
  interestCharges: Record<string, number>;
  payments: Record<string, number>;
  targetIds: string[];
}

export interface PortfolioSimulationResult {
  payoffMonths: number;
  totalInterest: number;
  payoffOrder: DebtPayoffEvent[];
  monthResults: MonthResult[];
  warnings: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getMinPayment(debt: DebtItem): number {
  if (debt.minPaymentRule.type === 'fixed') {
    return debt.minPaymentRule.amount;
  }
  return Math.max(
    debt.minPaymentRule.floor,
    debt.balance * debt.minPaymentRule.percent
  );
}

function getEffectiveApr(debt: DebtItem, month: number): number {
  if (debt.promo && debt.promo.monthsRemaining > 0 && month <= debt.promo.monthsRemaining) {
    return debt.promo.introApr;
  }
  if (debt.promo) {
    return debt.promo.postIntroApr;
  }
  return debt.apr;
}

/**
 * Velocity scoring — teacher-aligned:
 * 1) Cash-flow unlock (monthly payment freed) is primary
 * 2) Daily interest burn is secondary
 * 3) Promo expiration risk adds urgency
 */
function velocityScore(debt: DebtItem, balance: number): number {
  const unlock = getMinPayment(debt);
  const burn = balance * debt.apr / 365;
  const promoMonths = debt.promo?.monthsRemaining ?? null;
  const promoRisk =
    promoMonths === null ? 0 :
    promoMonths <= 3 ? 1.0 :
    promoMonths <= 6 ? 0.7 :
    promoMonths <= 9 ? 0.4 : 0.15;

  return (unlock * 0.55) + (burn * 30 * 0.35) + (promoRisk * 200 * 0.10);
}

function sortDebts(debts: DebtItem[], balances: Map<string, number>, strategy: PayoffStrategy): DebtItem[] {
  const active = debts.filter(d => (balances.get(d.id) ?? 0) > 0.01);
  
  switch (strategy) {
    case 'snowball':
      return active.sort((a, b) => (balances.get(a.id) ?? 0) - (balances.get(b.id) ?? 0));
    case 'avalanche':
      return active.sort((a, b) => b.apr - a.apr);
    case 'velocity':
    default:
      return active.sort((a, b) => velocityScore(b, balances.get(b.id) ?? 0) - velocityScore(a, balances.get(a.id) ?? 0));
  }
}

// ─── Simulation ──────────────────────────────────────────────────────

export function simulatePortfolio(inputs: PortfolioSimulationInputs): PortfolioSimulationResult {
  const { monthlyIncome, monthlyExpenses, extraMonthlyPayment, debts, settings, maxMonths = 600 } = inputs;
  const warnings: string[] = [];
  
  const cashFlow = monthlyIncome - monthlyExpenses;
  const totalMinimums = debts.reduce((s, d) => s + getMinPayment(d), 0);
  
  // Warnings
  if (cashFlow <= 0) {
    warnings.push(`Cash flow is negative (${fmt(cashFlow)}/mo). Velocity banking requires positive cash flow.`);
  }
  if (cashFlow < totalMinimums) {
    warnings.push(`Cash flow (${fmt(cashFlow)}/mo) doesn't cover all minimums (${fmt(totalMinimums)}/mo). Some payments may be missed.`);
  }

  const balances = new Map<string, number>();
  const totalInterestPaid = new Map<string, number>();
  
  for (const d of debts) {
    balances.set(d.id, d.balance);
    totalInterestPaid.set(d.id, 0);
  }

  const payoffOrder: DebtPayoffEvent[] = [];
  const monthResults: MonthResult[] = [];
  let month = 0;

  while (month < maxMonths) {
    const allPaidOff = debts.every(d => (balances.get(d.id) ?? 0) <= 0.01);
    if (allPaidOff) break;

    month++;

    // Sort by strategy to determine targets
    const sorted = sortDebts(debts, balances, settings.strategy);
    const targetIds: string[] = [];
    
    if (settings.focusMode === 'single' && sorted.length > 0) {
      targetIds.push(sorted[0].id);
    } else if (settings.focusMode === 'split' && sorted.length > 1) {
      targetIds.push(sorted[0].id, sorted[1].id);
    } else if (sorted.length > 0) {
      targetIds.push(sorted[0].id);
    }

    // Calculate available extra payment
    let availableExtra = Math.max(0, cashFlow - totalMinimums) + extraMonthlyPayment;
    
    // Add freed payments from paid-off debts
    for (const d of debts) {
      if ((balances.get(d.id) ?? 0) <= 0.01) {
        availableExtra += getMinPayment(d);
      }
    }

    const monthBalances: Record<string, number> = {};
    const monthInterest: Record<string, number> = {};
    const monthPayments: Record<string, number> = {};

    // Pay each debt
    for (const d of debts) {
      const bal = balances.get(d.id) ?? 0;
      if (bal <= 0.01) {
        monthBalances[d.id] = 0;
        monthInterest[d.id] = 0;
        monthPayments[d.id] = 0;
        continue;
      }

      const effectiveApr = getEffectiveApr(d, month);
      const interest = bal * effectiveApr / 12;
      let payment = Math.min(getMinPayment(d), bal + interest);

      // Apply extra to target debts
      if (targetIds.includes(d.id) && availableExtra > 0) {
        let extra: number;
        if (settings.focusMode === 'split' && targetIds.length > 1) {
          const ratio = d.id === targetIds[0] ? settings.splitRatioPrimary : (1 - settings.splitRatioPrimary);
          extra = availableExtra * ratio;
        } else {
          extra = availableExtra;
        }
        extra = Math.min(extra, bal + interest - payment);
        payment += extra;
        availableExtra -= extra;
      }

      const principal = Math.max(0, payment - interest);
      const newBal = Math.max(0, bal - principal);
      
      balances.set(d.id, newBal);
      totalInterestPaid.set(d.id, (totalInterestPaid.get(d.id) ?? 0) + interest);

      monthBalances[d.id] = newBal;
      monthInterest[d.id] = interest;
      monthPayments[d.id] = payment;

      if (newBal <= 0.01 && !payoffOrder.find(p => p.id === d.id)) {
        payoffOrder.push({ id: d.id, name: d.name, monthPaidOff: month });
      }
    }

    // Tick down promo months
    for (const d of debts) {
      if (d.promo && d.promo.monthsRemaining > 0) {
        d.promo.monthsRemaining--;
      }
    }

    monthResults.push({
      month,
      balances: monthBalances,
      interestCharges: monthInterest,
      payments: monthPayments,
      targetIds,
    });
  }

  const totalInterest = Array.from(totalInterestPaid.values()).reduce((s, v) => s + v, 0);

  return {
    payoffMonths: month,
    totalInterest,
    payoffOrder,
    monthResults,
    warnings,
  };
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
