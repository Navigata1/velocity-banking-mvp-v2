/**
 * Portfolio Simulation Engine
 *
 * Supports multi-debt payoff simulation with velocity, snowball, and avalanche strategies.
 * Truth-first math. Educational estimates only. Not financial advice.
 */

// ─── Types ───────────────────────────────────────────────────────────

import {
  simulateMoneyLoopMonth,
  normalizeApr,
  type APRUnit,
  type MoneyLoopLOC,
  type MoneyLoopMonthlyResult,
  type LOCProjectionLimitBreach,
  LOC_PROJECTION_OVER_LIMIT_WARNING,
} from './index';
import { calculateDailyInterest, calculateMonthlyRate, formatCurrency } from './index';
import { hasFiniteNonNegativeSum } from './numeric-range';

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
  | 'loc-projection-overlimit'
  | 'numeric-range-exceeded'
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
  aprUnit?: APRUnit;
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
  locBalance?: number;
  locInterest?: number;
  locPayment?: number;
  locDraw?: number;
  cashBalance?: number;
  locIsTarget?: boolean;
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
  locLimitBreach?: LOCProjectionLimitBreach;
  payoffOrder: DebtPayoffEvent[];
  monthResults: MonthResult[];
  debtRationales: Record<string, DebtPriorityRationale>;
  locInterestPaid: number;
  moneyLoopMonthlyData: MoneyLoopMonthlyResult[];
  assumptions: string[];
  warnings: string[];
  cashAtPayoff: number;
  primaryTargetName?: string;
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

function finiteProjectionNumbers(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  return !value || typeof value !== 'object' || Object.values(value).every(finiteProjectionNumbers);
}

const NUMERIC_RANGE_WARNING = 'Projection stopped: amounts exceed the supported numeric range.';

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
  return finiteNonNegative(balance) * calculateMonthlyRate(apr, 'decimal');
}

/**
 * Velocity scoring — teacher-aligned:
 * 1) Cash-flow unlock (monthly payment freed) is primary
 * 2) Daily interest burn is secondary
 * 3) Promo expiration risk adds urgency
 */
function velocityScore(debt: DebtItem, balance: number): number {
  const unlock = getMinPaymentForBalance(debt, balance);
  const burn = calculateDailyInterest(balance, getEffectiveApr(debt), 'decimal');
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
      return active.sort((a, b) => calculateMonthlyRate(getEffectiveApr(b), 'decimal') - calculateMonthlyRate(getEffectiveApr(a), 'decimal'));
    case 'velocity':
    default:
      return active.sort((a, b) => velocityScore(b, balances.get(b.id) ?? 0) - velocityScore(a, balances.get(a.id) ?? 0));
  }
}

// ─── Simulation ──────────────────────────────────────────────────────

interface AllocationTarget { debt?: DebtItem; balance: number; apr: number }

function rankAllocationTargets(debts: DebtItem[], balances: Map<string, number>, settings: PortfolioPlanSettings, locBalance: number, locApr: number): AllocationTarget[] {
  const targets: AllocationTarget[] = sortDebts(debts, balances, settings.strategy)
    .map(debt => ({ debt, balance: balances.get(debt.id) ?? 0, apr: getEffectiveApr(debt) }));
  if (locBalance > 0.01) targets.push({ balance: locBalance, apr: locApr });
  if (settings.strategy === 'snowball') targets.sort((a, b) => a.balance - b.balance);
  if (settings.strategy === 'avalanche') targets.sort((a, b) => calculateMonthlyRate(b.apr, 'decimal') - calculateMonthlyRate(a.apr, 'decimal'));
  return targets;
}

function allocateExtra(capacities: number[], budget: number, settings: PortfolioPlanSettings): number[] {
  const allocations = capacities.map(() => 0);
  let remaining = budget;
  const preferred = settings.focusMode === 'split' && capacities.length > 1
    ? [budget * settings.splitRatioPrimary, budget * (1 - settings.splitRatioPrimary)] : [budget];
  preferred.forEach((amount, index) => {
    allocations[index] = Math.min(amount, capacities[index] ?? 0, remaining);
    remaining -= allocations[index];
  });
  // Finished targets release their allocation down the same ranked book.
  capacities.forEach((capacity, index) => {
    const amount = Math.min(remaining, Math.max(0, capacity - allocations[index]));
    allocations[index] += amount;
    remaining -= amount;
  });
  return allocations;
}

function formatPercent(apr: number): string {
  const normalizedApr = Number.isFinite(apr) ? apr : 0;
  const percent = normalizedApr * 100;
  return `${percent.toFixed(percent >= 10 ? 1 : 2)}%`;
}

function buildDebtRationales(
  debts: DebtItem[],
  balances: Map<string, number>,
  settings: PortfolioPlanSettings,
  locBalance = 0,
  locApr = 0,
): Record<string, DebtPriorityRationale> {
  const targets = rankAllocationTargets(debts, balances, settings, locBalance, locApr);
  const targetIds = targets.slice(0, settings.focusMode === 'split' ? 2 : 1).flatMap(target => target.debt ? [target.debt.id] : []);
  const ranks = new Map(targets.flatMap((target, index) => target.debt ? [[target.debt.id, index + 1] as const] : []));
  const rationales: Record<string, DebtPriorityRationale> = {};

  for (const debt of debts) {
    const balance = balances.get(debt.id) ?? debt.balance;
    const monthlyPaymentUnlock = getMinPaymentForBalance(debt, balance);
    const aprUsedForBurn = debt.promo?.postIntroApr ?? finiteNonNegative(debt.apr);
    const dailyInterestBurn = calculateDailyInterest(balance, aprUsedForBurn, 'decimal');
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
    apr: finiteNonNegative(normalizeApr(debt.apr, inputs.aprUnit)),
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
          introApr: finiteNonNegative(normalizeApr(debt.promo.introApr, inputs.aprUnit)),
          monthsRemaining: finitePositiveInteger(debt.promo.monthsRemaining, 0),
          postIntroApr: finiteNonNegative(normalizeApr(debt.promo.postIntroApr, inputs.aprUnit)),
        }
      : undefined,
  }));
  const sanitizedLoc = inputs.loc
    ? {
        limit: finiteNonNegative(inputs.loc.limit),
        apr: finiteNonNegative(normalizeApr(inputs.loc.apr, inputs.aprUnit)),
        balance: finiteNonNegative(inputs.loc.balance),
      }
    : undefined;
  const warnings: string[] = [];
  const cashFlow = monthlyIncome - monthlyExpenses;
  const velocityLoc = settings.strategy === 'velocity' && settings.focusMode === 'single' && debts.some(debt => debt.balance > 0.01)
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
  const totalMinimums = debts.reduce((s, d) => s + (d.balance <= 0.01 ? 0
    : Math.min(getMinPayment(d), d.balance + estimateMonthlyInterest(d.balance, getEffectiveApr(d)))), 0);
  const hasUsableVelocityLoc =
    settings.strategy === 'velocity' &&
    settings.focusMode === 'single' &&
    !!velocityLoc &&
    velocityLoc.limit > 0 &&
    velocityLoc.balance < velocityLoc.limit &&
    cashFlow >= totalMinimums;
  const assumptions = [
    'Portfolio estimates monthly interest from each debt balance and APR; lender fees, compounding rules, and statement timing can change real totals.',
    'Extra allocation is funded from income minus household expenses, not additional income. A positive amount caps extra target payments; zero uses automatic surplus allocation.',
    'Every strategy includes the listed debts and existing LOC. Unused money remains cash. Cash at each payoff date is not common-date net wealth.',
  ];

  if (hasUsableVelocityLoc) {
    assumptions.push(
      'Portfolio Velocity Mode simulates LOC chunk draws and LOC interest for the single focus target using the shared Money Loop average-daily-balance estimate. Scheduled payments and any funded manual extra leave before residual cash recovers the LOC. Automatic surplus targets the LOC, not extra loan payments. Interest is posted to the LOC; a separate verified lender minimum is not enforced.'
    );
  } else if (settings.strategy === 'velocity') {
    assumptions.push(
      'Portfolio Velocity Mode is a ranking planner: it orders debts by cash-flow unlock, daily interest burn, and promo urgency. No LOC chunk draws are modeled in this mode. Existing LOC interest and repayment remain included using the direct month-end estimate.'
    );
  } else if (settings.strategy === 'snowball') {
    assumptions.push('Snowball Mode ranks active debts by smallest current balance first.');
  } else {
    assumptions.push('Avalanche Mode ranks active debts by highest APR first.');
  }
  if (!hasUsableVelocityLoc) assumptions.push('Direct policies reserve modeled LOC interest at the starting balance for 30 days/365, not a verified lender minimum. Snowball and Avalanche include the LOC in their ranked target slots. A positive extra cap covers all extra principal, including LOC. Unallocated budget is held as cash.');

  // Warnings
  if (cashFlow <= 0) {
    warnings.push(`Cash flow is negative (${fmt(cashFlow)}/mo). Keep the Money Loop in review mode until income is higher than expenses.`);
  }
  const initialRequired = totalMinimums + (hasUsableVelocityLoc ? 0 : calculateDailyInterest(sanitizedLoc?.balance ?? 0, sanitizedLoc?.apr ?? 0, 'decimal') * 30);
  if (cashFlow + 1e-8 < initialRequired) {
    warnings.push(`Cash flow (${fmt(cashFlow)}/mo) doesn't cover modeled obligations (${fmt(initialRequired)}/mo), including the clipped loan payments and direct LOC interest reserve.`);
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

  const debtRationales = buildDebtRationales(debts, balances, settings, hasUsableVelocityLoc ? 0 : sanitizedLoc?.balance ?? 0, sanitizedLoc?.apr ?? 0);
  const primaryTarget = rankAllocationTargets(debts, balances, settings, hasUsableVelocityLoc ? 0 : sanitizedLoc?.balance ?? 0, sanitizedLoc?.apr ?? 0)[0];
  const primaryTargetName = primaryTarget ? primaryTarget.debt?.name ?? 'Line of Credit' : undefined;
  const payoffOrder: DebtPayoffEvent[] = [];
  const monthResults: MonthResult[] = [];
  const moneyLoopMonthlyData: MoneyLoopMonthlyResult[] = [];

  if (!finiteProjectionNumbers([cashFlow, initialRequired, totalMinimums, debtRationales,
    debts.map(debt => estimateMonthlyInterest(debt.balance, getEffectiveApr(debt))),
    debts.reduce((sum, debt) => sum + debt.balance, sanitizedLoc?.balance ?? 0)])
    || !hasFiniteNonNegativeSum([...debts.map(debt => debt.balance), sanitizedLoc?.balance ?? 0])) {
    return { payoffMonths: 0, totalInterest: 0, isPayoffPossible: false,
      failureReason: 'numeric-range-exceeded', payoffOrder, monthResults, debtRationales: {},
      locInterestPaid: 0, moneyLoopMonthlyData, assumptions, warnings: [NUMERIC_RANGE_WARNING], cashAtPayoff: 0 };
  }

  const clearedInputsValid = Number.isFinite(inputs.monthlyIncome) && Number.isFinite(inputs.monthlyExpenses)
    && inputs.debts.every(debt => Number.isFinite(debt.balance)) && Number.isFinite(inputs.loc?.balance ?? 0);
  if (clearedInputsValid && debts.every(debt => debt.balance <= 0.01) && (sanitizedLoc?.balance ?? 0) <= 0.01) {
    return { payoffMonths: 0, totalInterest: 0, isPayoffPossible: true, payoffOrder, monthResults,
      debtRationales, locInterestPaid: 0, moneyLoopMonthlyData, assumptions, warnings: [], cashAtPayoff: 0, primaryTargetName };
  }

  if (cashFlow <= 0 || cashFlow + 1e-8 < initialRequired || underInterestDebt || locNeedsSetup || locBlocksVelocity) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: cashFlow <= 0
        ? 'negative-cashflow'
        : cashFlow + 1e-8 < initialRequired
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
      cashAtPayoff: 0,
      primaryTargetName,
    };
  }

  let locBalance = sanitizedLoc?.balance ?? 0;
  let locCashBalance = 0;
  let locInterestPaid = 0;
  let monthsSinceChunk = 999;
  const effectiveChunk = Math.max(
    0,
    inputs.chunkAmount === undefined
      ? Math.min(Math.max(0, cashFlow) * 3, (sanitizedLoc?.limit ?? 0) * 0.4)
      : finiteNonNegative(inputs.chunkAmount)
  );
  let month = 0;
  let allocationFailure: PortfolioFailureReason | undefined;
  let locLimitBreach: LOCProjectionLimitBreach | undefined;
  let acceptedInterest = 0;
  let acceptedLocInterest = 0;

  while (month < maxMonths) {
    const allPaidOff = debts.every(d => (balances.get(d.id) ?? 0) <= 0.01);
    if (allPaidOff && locBalance <= 0.01) break;

    month++;
    const loopStart = moneyLoopMonthlyData.length;
    const payoffStart = payoffOrder.length;
    let usedMoneyLoopThisMonth = false;
    const startingLocBalance = locBalance;
    let monthLocInterest = hasUsableVelocityLoc ? 0 : calculateDailyInterest(locBalance, sanitizedLoc?.apr ?? 0, 'decimal') * 30;
    let monthLocPayment = monthLocInterest;
    let monthLocDraw = 0;

    // Sort by strategy to determine targets
    const rankedTargets = rankAllocationTargets(debts, balances, settings, hasUsableVelocityLoc ? 0 : locBalance, sanitizedLoc?.apr ?? 0);
    const allocationTargets = hasUsableVelocityLoc ? rankedTargets.slice(0, 1) : rankedTargets;
    const targetIds = rankedTargets.slice(0, settings.focusMode === 'split' ? 2 : 1).flatMap(target => target.debt ? [target.debt.id] : []);

    // Calculate available extra payment
    const plannedMinimums = new Map(debts.map(d => {
      const bal = balances.get(d.id) ?? 0;
      const interest = estimateMonthlyInterest(bal, getEffectiveApr(d));
      return [d.id, bal <= 0.01 ? 0 : Math.min(getMinPaymentForBalance(d, bal), bal + interest)];
    }));
    const currentMinimums = [...plannedMinimums.values()].reduce((sum, value) => sum + value, 0);
    if (currentMinimums + monthLocInterest > cashFlow + 1e-8) {
      allocationFailure = 'cashflow-below-minimums';
      break;
    }
    let availableExtra = Math.max(0, cashFlow - currentMinimums - monthLocInterest);
    const extraCap = extraMonthlyPayment > 0 ? extraMonthlyPayment : hasUsableVelocityLoc ? 0 : Infinity;
    availableExtra = Math.min(availableExtra, extraCap);
    const extraAllocations = allocateExtra(allocationTargets.map(target => target.debt
      ? Math.max(0, target.balance + estimateMonthlyInterest(target.balance, target.apr) - (plannedMinimums.get(target.debt.id) ?? 0))
      : target.balance), availableExtra, settings);
    const debtExtras = new Map(allocationTargets.flatMap((target, index) => target.debt ? [[target.debt.id, extraAllocations[index]] as const] : []));
    const locExtra = allocationTargets.reduce((sum, target, index) => sum + (target.debt ? 0 : extraAllocations[index]), 0);
    if (hasUsableVelocityLoc && debts.some(d => {
      const balance = balances.get(d.id) ?? 0;
      const interest = estimateMonthlyInterest(balance, getEffectiveApr(d));
      const fundedPayment = (plannedMinimums.get(d.id) ?? 0) + (debtExtras.get(d.id) ?? 0);
      return balance > 0.01 && fundedPayment + 1e-8 < interest;
    })) { allocationFailure = 'payment-below-interest'; break; }

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
        const minimumPayment = plannedMinimums.get(d.id) ?? 0;
        const debtInterest = estimateMonthlyInterest(bal, effectiveApr);
        let payment = Math.min(minimumPayment, bal + debtInterest);

        payment += debtExtras.get(d.id) ?? 0;

        const otherActivePayments = currentMinimums - minimumPayment;
        const locCashFlowPaydown = Math.max(0, cashFlow - payment - otherActivePayments);

        const monthResult = simulateMoneyLoopMonth({
          aprUnit: 'decimal',
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
          cashBalance: locCashBalance,
        });

        locBalance = monthResult.locBalance;
        locCashBalance = monthResult.cashBalance;
        locInterestPaid += monthResult.locInterest;
        monthLocInterest = monthResult.locInterest;
        monthLocDraw = monthResult.events.filter(event => event.type === 'loc-chunk-draw').reduce((sum, event) => sum + event.amount, 0);
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
          locInterestMethod: monthResult.locInterestMethod,
          cashFlowPaydown: monthResult.cashFlowPaydown,
          events: monthResult.events,
          cashBalance: monthResult.cashBalance,
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
      payment += debtExtras.get(d.id) ?? 0;
      const newBal = Math.max(0, bal + interest - payment);

      balances.set(d.id, newBal);
      totalInterestPaid.set(d.id, (totalInterestPaid.get(d.id) ?? 0) + interest);

      monthBalances[d.id] = newBal;
      monthInterest[d.id] = interest;
      monthPayments[d.id] = payment;

      if (newBal <= 0.01 && !payoffOrder.find(p => p.id === d.id)) {
        payoffOrder.push({ id: d.id, name: d.name, monthPaidOff: month });
      }
    }

    if (hasUsableVelocityLoc && sanitizedLoc && !usedMoneyLoopThisMonth) {
      const locRecoveryMonth = simulateMoneyLoopMonth({
        aprUnit: 'decimal',
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
        cashBalance: locCashBalance,
      });

      locBalance = locRecoveryMonth.locBalance;
      locCashBalance = locRecoveryMonth.cashBalance;
      locInterestPaid += locRecoveryMonth.locInterest;
      monthLocInterest = locRecoveryMonth.locInterest;
      monthsSinceChunk = locRecoveryMonth.monthsSinceChunk;
      moneyLoopMonthlyData.push({
        month: locRecoveryMonth.month,
        debtBalance: locRecoveryMonth.debtBalance,
        locBalance: locRecoveryMonth.locBalance,
        debtInterest: locRecoveryMonth.debtInterest,
        locInterest: locRecoveryMonth.locInterest,
        locInterestMethod: locRecoveryMonth.locInterestMethod,
        cashFlowPaydown: locRecoveryMonth.cashFlowPaydown,
        events: locRecoveryMonth.events,
        cashBalance: locRecoveryMonth.cashBalance,
      });
    }
    if (hasUsableVelocityLoc) {
      monthLocPayment = Math.max(0, startingLocBalance + monthLocDraw + monthLocInterest - locBalance);
    } else {
      locBalance = Math.max(0, locBalance - locExtra);
      monthLocPayment += locExtra;
      const debtPayments = Object.values(monthPayments).reduce((sum, value) => sum + value, 0);
      const remaining = Math.max(0, cashFlow - debtPayments - monthLocPayment);
      locCashBalance += remaining;
      locInterestPaid += monthLocInterest;
    }

    // Tick down promo months
    for (const d of debts) {
      if (d.promo && d.promo.monthsRemaining > 0) {
        d.promo.monthsRemaining--;
      }
    }

    const completedMonth: MonthResult = {
      month,
      balances: monthBalances,
      interestCharges: monthInterest,
      payments: monthPayments,
      targetIds,
      locBalance,
      locInterest: monthLocInterest,
      locPayment: monthLocPayment,
      locDraw: monthLocDraw,
      cashBalance: locCashBalance,
      locIsTarget: rankedTargets.slice(0, settings.focusMode === 'split' ? 2 : 1).some(target => !target.debt),
    };
    const cumulativeInterest = Array.from(totalInterestPaid.values()).reduce((sum, value) => sum + value, 0) + locInterestPaid;
    // An overflowing partial month cannot become a chart row or a payoff claim.
    if (!finiteProjectionNumbers([completedMonth, cumulativeInterest, locInterestPaid, moneyLoopMonthlyData.slice(loopStart),
      Object.values(monthBalances).reduce((sum, value) => sum + value, locBalance),
      Object.values(monthInterest).reduce((sum, value) => sum + value, monthLocInterest),
      Object.values(monthPayments).reduce((sum, value) => sum + value, monthLocPayment)])
      || ![ [...Object.values(monthBalances), locBalance], [...Object.values(monthInterest), monthLocInterest],
        [...Object.values(monthPayments), monthLocPayment] ].every(hasFiniteNonNegativeSum)) {
      allocationFailure = 'numeric-range-exceeded';
      moneyLoopMonthlyData.splice(loopStart);
      payoffOrder.splice(payoffStart);
      warnings.push(NUMERIC_RANGE_WARNING);
      month--;
      break;
    }
    if (hasUsableVelocityLoc && sanitizedLoc && locBalance > sanitizedLoc.limit) {
      allocationFailure = 'loc-projection-overlimit';
      locLimitBreach = { month, balance: locBalance, limit: sanitizedLoc.limit };
      moneyLoopMonthlyData.splice(loopStart);
      payoffOrder.splice(payoffStart);
      warnings.push(LOC_PROJECTION_OVER_LIMIT_WARNING);
      month--;
      break;
    }
    acceptedInterest = cumulativeInterest;
    acceptedLocInterest = locInterestPaid;
    monthResults.push(completedMonth);
  }

  const totalInterest = acceptedInterest;
  const isPayoffPossible = !allocationFailure && debts.every(d => (balances.get(d.id) ?? 0) <= 0.01) && locBalance <= 0.01;

  return {
    payoffMonths: month,
    totalInterest,
    isPayoffPossible,
    failureReason: isPayoffPossible ? undefined : allocationFailure ?? 'payoff-horizon-exceeded',
    ...(locLimitBreach ? { locLimitBreach } : {}),
    payoffOrder,
    monthResults,
    debtRationales,
    locInterestPaid: acceptedLocInterest,
    moneyLoopMonthlyData,
    assumptions,
    warnings,
    cashAtPayoff: isPayoffPossible ? locCashBalance : 0,
    primaryTargetName,
  };
}

function fmt(n: number): string {
  return formatCurrency(n);
}
