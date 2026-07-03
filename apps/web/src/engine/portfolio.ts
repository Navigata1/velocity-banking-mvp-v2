/**
 * Portfolio Simulation Engine
 * 
 * Supports multi-debt payoff simulation with velocity, snowball, and avalanche strategies.
 * Truth-first math. Educational estimates only. Not financial advice.
 */

// ─── Types ───────────────────────────────────────────────────────────

import {
  simulateMoneyLoopMonth,
  type MoneyLoopLOC,
  type MoneyLoopMonthlyResult,
} from './money-loop';
import { calculateDailyInterest, calculateMonthlyRate, formatCurrency } from '@interestshield/financial-engine';

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
export type PortfolioFailureReason =
  | 'negative-cashflow'
  | 'cashflow-below-minimums'
  | 'payment-below-interest'
  | 'loc-setup'
  | 'loc-no-capacity'
  | 'loc-overlimit'
  | 'payoff-horizon-exceeded';

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
  loc?: MoneyLoopLOC;
  chunkAmount?: number;
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

export interface DebtPriorityRationale {
  debtId: string;
  rank: number;
  strategy: PayoffStrategy;
  isCurrentTarget: boolean;
  monthlyPaymentUnlock: number;
  dailyInterestBurn: number;
  aprUsedForBurn: number;
  promoUrgency?: {
    monthsRemaining: number;
    introApr: number;
    postIntroApr: number;
  };
  paymentSourceCaution?: string;
  summary: string;
  points: string[];
}

export interface PortfolioSimulationResult {
  payoffMonths: number;
  totalInterest: number;
  isPayoffPossible: boolean;
  failureReason?: PortfolioFailureReason;
  payoffOrder: DebtPayoffEvent[];
  monthResults: MonthResult[];
  debtRationales: Record<string, DebtPriorityRationale>;
  locInterestPaid: number;
  moneyLoopMonthlyData: MoneyLoopMonthlyResult[];
  assumptions: string[];
  warnings: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

function finiteNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function finiteNonNegative(value: number): number {
  return Math.max(0, finiteNumber(value));
}

function finitePositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.trunc(value));
}

function getMinPaymentForBalance(debt: DebtItem, balance: number = debt.balance): number {
  if (debt.minPaymentRule.type === 'fixed') {
    return finiteNonNegative(debt.minPaymentRule.amount);
  }
  return Math.max(
    finiteNonNegative(debt.minPaymentRule.floor),
    finiteNonNegative(balance) * finiteNonNegative(debt.minPaymentRule.percent)
  );
}

function getMinPayment(debt: DebtItem): number {
  return getMinPaymentForBalance(debt, debt.balance);
}

function getEffectiveApr(debt: DebtItem): number {
  if (debt.promo && debt.promo.monthsRemaining > 0) {
    return finiteNonNegative(debt.promo.introApr);
  }
  if (debt.promo) {
    return finiteNonNegative(debt.promo.postIntroApr);
  }
  return finiteNonNegative(debt.apr);
}

function estimateMonthlyInterest(balance: number, apr: number): number {
  return finiteNonNegative(balance) * calculateMonthlyRate(apr);
}

/**
 * Velocity scoring — teacher-aligned:
 * 1) Cash-flow unlock (monthly payment freed) is primary
 * 2) Daily interest burn is secondary
 * 3) Promo expiration risk adds urgency
 */
function velocityScore(debt: DebtItem, balance: number): number {
  const unlock = getMinPaymentForBalance(debt, balance);
  const burn = calculateDailyInterest(balance, getEffectiveApr(debt));
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

function selectTargetIds(sorted: DebtItem[], settings: PortfolioPlanSettings): string[] {
  if (settings.focusMode === 'single' && sorted.length > 0) {
    return [sorted[0].id];
  }
  if (settings.focusMode === 'split' && sorted.length > 1) {
    return [sorted[0].id, sorted[1].id];
  }
  if (sorted.length > 0) {
    return [sorted[0].id];
  }
  return [];
}

function buildSplitExtraAllocations(
  debts: DebtItem[],
  balances: Map<string, number>,
  targetIds: string[],
  availableExtra: number,
  settings: PortfolioPlanSettings
): Map<string, number> | null {
  if (settings.focusMode !== 'split' || targetIds.length < 2 || availableExtra <= 0) {
    return null;
  }

  const primaryRatio = Math.min(1, Math.max(0, settings.splitRatioPrimary));
  const ratios = [primaryRatio, 1 - primaryRatio];
  const allocations = new Map<string, number>();
  const capacities = new Map<string, number>();
  let remaining = availableExtra;

  targetIds.slice(0, 2).forEach((targetId, index) => {
    const debt = debts.find((item) => item.id === targetId);
    const balance = debt ? balances.get(debt.id) ?? 0 : 0;
    const interest = debt ? estimateMonthlyInterest(balance, getEffectiveApr(debt)) : 0;
    const minimumPayment = debt ? Math.min(getMinPaymentForBalance(debt, balance), balance + interest) : 0;
    const capacity = Math.max(0, balance + interest - minimumPayment);
    const preferred = availableExtra * ratios[index];
    const amount = Math.min(preferred, capacity, remaining);

    allocations.set(targetId, amount);
    capacities.set(targetId, capacity);
    remaining -= amount;
  });

  for (const targetId of targetIds.slice(0, 2)) {
    if (remaining <= 0) break;

    const capacity = capacities.get(targetId) ?? 0;
    const current = allocations.get(targetId) ?? 0;
    const rollover = Math.min(remaining, Math.max(0, capacity - current));

    allocations.set(targetId, current + rollover);
    remaining -= rollover;
  }

  return allocations;
}

function formatPercent(apr: number): string {
  const normalizedApr = Number.isFinite(apr) ? (apr > 1 ? apr / 100 : apr) : 0;
  const percent = normalizedApr * 100;
  return `${percent.toFixed(percent >= 10 ? 1 : 2)}%`;
}

function buildDebtRationales(
  debts: DebtItem[],
  balances: Map<string, number>,
  settings: PortfolioPlanSettings
): Record<string, DebtPriorityRationale> {
  const sorted = sortDebts(debts, balances, settings.strategy);
  const targetIds = selectTargetIds(sorted, settings);
  const ranks = new Map(sorted.map((debt, index) => [debt.id, index + 1]));
  const rationales: Record<string, DebtPriorityRationale> = {};

  for (const debt of debts) {
    const balance = balances.get(debt.id) ?? debt.balance;
    const monthlyPaymentUnlock = getMinPaymentForBalance(debt, balance);
    const aprUsedForBurn = debt.promo?.postIntroApr ?? finiteNonNegative(debt.apr);
    const dailyInterestBurn = calculateDailyInterest(balance, aprUsedForBurn);
    const rank = ranks.get(debt.id) ?? debts.length;
    const isCurrentTarget = targetIds.includes(debt.id);
    const strategyIntro =
      settings.strategy === 'velocity'
        ? 'Velocity reads the cash-flow unlock first, then the daily interest burn'
        : settings.strategy === 'snowball'
          ? 'Snowball reads the smallest balance first, then the momentum it unlocks'
          : 'Avalanche reads the APR pressure first, then the interest it avoids';
    const points = [
      `Cash-flow unlock: frees ${fmt(monthlyPaymentUnlock)}/mo when this debt is cleared.`,
      `Daily burn: about ${fmt(dailyInterestBurn)}/day at ${formatPercent(aprUsedForBurn)} APR.`,
    ];

    let promoUrgency: DebtPriorityRationale['promoUrgency'];
    if (debt.promo) {
      promoUrgency = {
        monthsRemaining: debt.promo.monthsRemaining,
        introApr: debt.promo.introApr,
        postIntroApr: debt.promo.postIntroApr,
      };
      points.push(
        `Promo urgency: ${debt.promo.monthsRemaining} mo at ${formatPercent(debt.promo.introApr)}, then ${formatPercent(debt.promo.postIntroApr)} APR.`
      );
    }

    let paymentSourceCaution: string | undefined;
    if (debt.paymentSource !== 'checking') {
      paymentSourceCaution = 'LOC utilization: use the LOC lane only while utilization stays under 80%.';
      points.push(paymentSourceCaution);
    }

    rationales[debt.id] = {
      debtId: debt.id,
      rank,
      strategy: settings.strategy,
      isCurrentTarget,
      monthlyPaymentUnlock,
      dailyInterestBurn,
      aprUsedForBurn,
      promoUrgency,
      paymentSourceCaution,
      summary: `${strategyIntro}; this is priority #${rank} with ${fmt(monthlyPaymentUnlock)}/mo cash-flow unlock and ${fmt(dailyInterestBurn)}/day interest burn.`,
      points,
    };
  }

  return rationales;
}

export function simulatePortfolio(inputs: PortfolioSimulationInputs): PortfolioSimulationResult {
  const monthlyIncome = finiteNonNegative(inputs.monthlyIncome);
  const monthlyExpenses = finiteNonNegative(inputs.monthlyExpenses);
  const extraMonthlyPayment = finiteNonNegative(inputs.extraMonthlyPayment);
  const maxMonths = finitePositiveInteger(inputs.maxMonths ?? 600, 600);
  const settings: PortfolioPlanSettings = {
    strategy: inputs.settings.strategy,
    focusMode: inputs.settings.focusMode,
    splitRatioPrimary: Math.min(1, Math.max(0, finiteNumber(inputs.settings.splitRatioPrimary, 0.7))),
  };
  const debts = inputs.debts.map((debt) => ({
    ...debt,
    balance: finiteNonNegative(debt.balance),
    apr: finiteNonNegative(debt.apr),
    minPaymentRule: debt.minPaymentRule.type === 'fixed'
      ? { type: 'fixed' as const, amount: finiteNonNegative(debt.minPaymentRule.amount) }
      : {
          type: 'percent' as const,
          percent: finiteNonNegative(debt.minPaymentRule.percent),
          floor: finiteNonNegative(debt.minPaymentRule.floor),
        },
    termMonths: debt.termMonths === undefined ? undefined : finitePositiveInteger(debt.termMonths, 0),
    promo: debt.promo
      ? {
          introApr: finiteNonNegative(debt.promo.introApr),
          monthsRemaining: finitePositiveInteger(debt.promo.monthsRemaining, 0),
          postIntroApr: finiteNonNegative(debt.promo.postIntroApr),
        }
      : undefined,
  }));
  const sanitizedLoc = inputs.loc
    ? {
        limit: finiteNonNegative(inputs.loc.limit),
        apr: finiteNonNegative(inputs.loc.apr),
        balance: finiteNonNegative(inputs.loc.balance),
      }
    : undefined;
  const warnings: string[] = [];
  const cashFlow = monthlyIncome - monthlyExpenses;
  const velocityLoc = settings.strategy === 'velocity' && settings.focusMode === 'single'
    ? sanitizedLoc
    : undefined;
  const locNeedsSetup =
    !!velocityLoc &&
    velocityLoc.limit <= 0 &&
    velocityLoc.balance > 0;
  const locBlocksVelocity =
    !!velocityLoc &&
    velocityLoc.limit > 0 &&
    velocityLoc.balance >= velocityLoc.limit;
  const locBalanceOverLimit =
    !!velocityLoc &&
    velocityLoc.limit > 0 &&
    velocityLoc.balance > velocityLoc.limit;
  const locHighUtilization =
    !!velocityLoc &&
    velocityLoc.limit > 0 &&
    velocityLoc.balance < velocityLoc.limit &&
    velocityLoc.balance / velocityLoc.limit > 0.8;
  const totalMinimums = debts.reduce((s, d) => s + getMinPayment(d), 0);
  const hasUsableVelocityLoc =
    settings.strategy === 'velocity' &&
    settings.focusMode === 'single' &&
    !!velocityLoc &&
    velocityLoc.limit > 0 &&
    velocityLoc.balance < velocityLoc.limit &&
    cashFlow >= totalMinimums;
  const assumptions = [
    'Portfolio estimates monthly interest from each debt balance and APR; lender fees, compounding rules, and statement timing can change real totals.',
  ];

  if (hasUsableVelocityLoc) {
    assumptions.push(
      'Portfolio Velocity Mode simulates LOC chunk draws and LOC interest for the single focus target using the shared Money Loop average-daily-balance estimate.'
    );
  } else if (settings.strategy === 'velocity') {
    assumptions.push(
      'Portfolio Velocity Mode is a ranking planner: it orders debts by cash-flow unlock, daily interest burn, and promo urgency. It does not simulate LOC chunk draws or LOC interest; use the Simulator or Vault for full LOC payoff math.'
    );
  } else if (settings.strategy === 'snowball') {
    assumptions.push('Snowball Mode ranks active debts by smallest current balance first.');
  } else {
    assumptions.push('Avalanche Mode ranks active debts by highest APR first.');
  }

  // Warnings
  if (cashFlow <= 0) {
    warnings.push(`Cash flow is negative (${fmt(cashFlow)}/mo). Keep the Money Loop in review mode until income is higher than expenses.`);
  }
  if (cashFlow < totalMinimums) {
    warnings.push(`Cash flow (${fmt(cashFlow)}/mo) doesn't cover all minimums (${fmt(totalMinimums)}/mo). Some payments may be missed.`);
  }

  const underInterestDebt = debts.find((debt) => {
    const monthlyInterest = estimateMonthlyInterest(debt.balance, getEffectiveApr(debt));
    return debt.balance > 0.01 && getMinPayment(debt) <= monthlyInterest;
  });
  if (underInterestDebt) {
    const monthlyInterest = estimateMonthlyInterest(underInterestDebt.balance, getEffectiveApr(underInterestDebt));
    warnings.push(
      `${underInterestDebt.name} payment doesn't cover monthly interest (${fmt(monthlyInterest)}). Raise the payment or reduce principal before trusting a payoff estimate.`
    );
  }
  if (locBlocksVelocity) {
    warnings.push(
      locBalanceOverLimit
        ? 'LOC balance is above the available limit. Bring it back under the limit before modeling a Portfolio Velocity plan.'
        : 'LOC balance is at the available limit. Pay it down before modeling a Portfolio Velocity plan.'
    );
  }
  if (locNeedsSetup) {
    warnings.push(
      'LOC balance is present, but the limit is missing. Enter a limit before trusting Portfolio Velocity projections.'
    );
  }
  if (locHighUtilization) {
    warnings.push(
      'LOC is over 80% utilized. Bring it below 80% before modeling another Portfolio Velocity chunk.'
    );
  }

  const balances = new Map<string, number>();
  const totalInterestPaid = new Map<string, number>();
  
  for (const d of debts) {
    balances.set(d.id, d.balance);
    totalInterestPaid.set(d.id, 0);
  }

  const debtRationales = buildDebtRationales(debts, balances, settings);
  const payoffOrder: DebtPayoffEvent[] = [];
  const monthResults: MonthResult[] = [];
  const moneyLoopMonthlyData: MoneyLoopMonthlyResult[] = [];

  if (cashFlow <= 0 || cashFlow < totalMinimums || underInterestDebt || locNeedsSetup || locBlocksVelocity) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: cashFlow <= 0
        ? 'negative-cashflow'
        : cashFlow < totalMinimums
          ? 'cashflow-below-minimums'
          : underInterestDebt
            ? 'payment-below-interest'
            : locNeedsSetup
              ? 'loc-setup'
              : locBalanceOverLimit
                ? 'loc-overlimit'
                : 'loc-no-capacity',
      payoffOrder,
      monthResults,
      debtRationales,
      locInterestPaid: 0,
      moneyLoopMonthlyData,
      assumptions,
      warnings,
    };
  }

  let locBalance = sanitizedLoc?.balance ?? 0;
  let locInterestPaid = 0;
  let monthsSinceChunk = 999;
  const effectiveChunk = Math.max(
    0,
    inputs.chunkAmount === undefined
      ? Math.min(Math.max(0, cashFlow) * 3, (sanitizedLoc?.limit ?? 0) * 0.4)
      : finiteNonNegative(inputs.chunkAmount)
  );
  let month = 0;

  while (month < maxMonths) {
    const allPaidOff = debts.every(d => (balances.get(d.id) ?? 0) <= 0.01);
    const hasOutstandingVelocityLoc = hasUsableVelocityLoc && locBalance > 0.01;
    if (allPaidOff && !hasOutstandingVelocityLoc) break;

    month++;
    let usedMoneyLoopThisMonth = false;

    // Sort by strategy to determine targets
    const sorted = sortDebts(debts, balances, settings.strategy);
    const targetIds = selectTargetIds(sorted, settings);

    // Calculate available extra payment
    const currentMinimums = debts.reduce((sum, d) => {
      const bal = balances.get(d.id) ?? 0;
      if (bal <= 0.01) return sum;

      const interest = estimateMonthlyInterest(bal, getEffectiveApr(d));
      return sum + Math.min(getMinPaymentForBalance(d, bal), bal + interest);
    }, 0);
    let availableExtra = Math.max(0, cashFlow - currentMinimums) + extraMonthlyPayment;

    const splitExtraAllocations = buildSplitExtraAllocations(debts, balances, targetIds, availableExtra, settings);

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

      const effectiveApr = getEffectiveApr(d);
      const isMoneyLoopTarget = hasUsableVelocityLoc && targetIds.length === 1 && targetIds[0] === d.id && !!sanitizedLoc;

      if (isMoneyLoopTarget && sanitizedLoc) {
        const minimumPayment = getMinPaymentForBalance(d, bal);
        const debtInterest = estimateMonthlyInterest(bal, effectiveApr);
        let payment = Math.min(minimumPayment, bal + debtInterest);

        if (availableExtra > 0) {
          const extra = Math.min(availableExtra, bal + debtInterest - payment);
          payment += extra;
          availableExtra -= extra;
        }

        const otherActivePayments = debts.reduce((sum, otherDebt) => {
          if (otherDebt.id === d.id) return sum;
          const otherBalance = balances.get(otherDebt.id) ?? 0;
          if (otherBalance <= 0.01) return sum;

          const otherInterest = estimateMonthlyInterest(otherBalance, getEffectiveApr(otherDebt));
          return sum + Math.min(getMinPaymentForBalance(otherDebt, otherBalance), otherBalance + otherInterest);
        }, 0);
        const locCashFlowPaydown = Math.max(0, cashFlow - payment - otherActivePayments);

        const monthResult = simulateMoneyLoopMonth({
          month,
          debtBalance: bal,
          debtApr: effectiveApr,
          debtPayment: payment,
          loc: sanitizedLoc,
          locBalance,
          chunkAmount: effectiveChunk,
          cashFlowPaydown: locCashFlowPaydown,
          locDepositAmount: monthlyIncome,
          locExpenseAmount: monthlyExpenses + payment + otherActivePayments,
          monthsSinceChunk,
        });

        locBalance = monthResult.locBalance;
        locInterestPaid += monthResult.locInterest;
        monthsSinceChunk = monthResult.monthsSinceChunk;
        balances.set(d.id, monthResult.debtBalance);
        totalInterestPaid.set(d.id, (totalInterestPaid.get(d.id) ?? 0) + monthResult.debtInterest);

        monthBalances[d.id] = monthResult.debtBalance;
        monthInterest[d.id] = monthResult.debtInterest;
        monthPayments[d.id] = monthResult.debtPayment;
        moneyLoopMonthlyData.push({
          month: monthResult.month,
          debtBalance: monthResult.debtBalance,
          locBalance: monthResult.locBalance,
          debtInterest: monthResult.debtInterest,
          locInterest: monthResult.locInterest,
          cashFlowPaydown: monthResult.cashFlowPaydown,
          events: monthResult.events,
        });
        usedMoneyLoopThisMonth = true;

        if (monthResult.debtBalance <= 0.01 && !payoffOrder.find(p => p.id === d.id)) {
          payoffOrder.push({ id: d.id, name: d.name, monthPaidOff: month });
        }
        continue;
      }

      const interest = estimateMonthlyInterest(bal, effectiveApr);
      let payment = Math.min(getMinPaymentForBalance(d, bal), bal + interest);

      // Apply extra to target debts
      if (targetIds.includes(d.id) && availableExtra > 0) {
        let extra: number;
        if (splitExtraAllocations) {
          extra = splitExtraAllocations.get(d.id) ?? 0;
        } else {
          extra = availableExtra;
        }
        extra = Math.min(extra, availableExtra, bal + interest - payment);
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

    if (hasUsableVelocityLoc && sanitizedLoc && locBalance > 0.01 && !usedMoneyLoopThisMonth) {
      const locRecoveryMonth = simulateMoneyLoopMonth({
        month,
        debtBalance: 0,
        debtApr: 0,
        debtPayment: 0,
        loc: sanitizedLoc,
        locBalance,
        chunkAmount: 0,
        cashFlowPaydown: cashFlow,
        locDepositAmount: monthlyIncome,
        locExpenseAmount: monthlyExpenses,
        monthsSinceChunk,
      });

      locBalance = locRecoveryMonth.locBalance;
      locInterestPaid += locRecoveryMonth.locInterest;
      monthsSinceChunk = locRecoveryMonth.monthsSinceChunk;
      moneyLoopMonthlyData.push({
        month: locRecoveryMonth.month,
        debtBalance: locRecoveryMonth.debtBalance,
        locBalance: locRecoveryMonth.locBalance,
        debtInterest: locRecoveryMonth.debtInterest,
        locInterest: locRecoveryMonth.locInterest,
        cashFlowPaydown: locRecoveryMonth.cashFlowPaydown,
        events: locRecoveryMonth.events,
      });
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

  const totalInterest = Array.from(totalInterestPaid.values()).reduce((s, v) => s + v, 0) + locInterestPaid;
  const isPayoffPossible = debts.every(d => (balances.get(d.id) ?? 0) <= 0.01) && (!hasUsableVelocityLoc || locBalance <= 0.01);

  return {
    payoffMonths: month,
    totalInterest,
    isPayoffPossible,
    failureReason: isPayoffPossible ? undefined : 'payoff-horizon-exceeded',
    payoffOrder,
    monthResults,
    debtRationales,
    locInterestPaid,
    moneyLoopMonthlyData,
    assumptions,
    warnings,
  };
}

function fmt(n: number): string {
  return formatCurrency(n);
}
