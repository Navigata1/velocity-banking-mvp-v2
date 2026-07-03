export interface LoanDetails {
  balance: number;
  apr: number;
  monthlyPayment: number;
  termMonths?: number;
}

export interface LOCDetails {
  limit: number;
  apr: number;
  balance: number;
}

export type AmortizedPayoffFailureReason = 'payment-below-interest' | 'payoff-horizon-exceeded';

export interface AmortizedPayoffMonth {
  month: number;
  balance: number;
  interest: number;
  principal: number;
  payment: number;
}

export interface AmortizedPayoffInputs {
  principalBalance: number;
  apr: number;
  monthlyPayment: number;
  extraPayment?: number;
  maxMonths?: number;
}

export interface AmortizedPayoffResult {
  payoffMonths: number;
  totalInterest: number;
  monthlyData: AmortizedPayoffMonth[];
  isPayoffPossible: boolean;
  failureReason?: AmortizedPayoffFailureReason;
}

export interface MoneyLoopLOC {
  limit: number;
  apr: number;
  balance: number;
}

export type MoneyLoopFailureReason =
  | 'payment-below-interest'
  | 'negative-cashflow'
  | 'loc-setup'
  | 'loc-no-capacity'
  | 'loc-overlimit'
  | 'payoff-horizon-exceeded';

export type MoneyLoopEventType =
  | 'debt-interest'
  | 'debt-payment'
  | 'income-to-loc'
  | 'expenses-from-loc'
  | 'loc-chunk-draw'
  | 'loc-interest'
  | 'loc-cashflow-paydown';

export interface MoneyLoopEvent {
  type: MoneyLoopEventType;
  label: string;
  amount: number;
  balanceAfter: number;
  note: string;
}

export interface MoneyLoopMonthlyResult {
  month: number;
  debtBalance: number;
  locBalance: number;
  debtInterest: number;
  locInterest: number;
  cashFlowPaydown: number;
  events: MoneyLoopEvent[];
}

export interface MoneyLoopPayoffInputs {
  principalBalance: number;
  debtApr: number;
  debtPayment: number;
  loc: MoneyLoopLOC;
  chunkAmount: number;
  cashFlowPaydown: number;
  locDepositAmount: number;
  locExpenseAmount: number;
  maxMonths?: number;
  initialMonthsSinceChunk?: number;
}

export interface MoneyLoopMonthInputs {
  month: number;
  debtBalance: number;
  debtApr: number;
  debtPayment: number;
  loc: MoneyLoopLOC;
  locBalance: number;
  chunkAmount: number;
  cashFlowPaydown: number;
  locDepositAmount: number;
  locExpenseAmount: number;
  monthsSinceChunk: number;
}

export interface MoneyLoopMonthResult extends MoneyLoopMonthlyResult {
  debtPayment: number;
  debtPrincipalPaid: number;
  monthsSinceChunk: number;
  didChunk: boolean;
}

export interface MoneyLoopPayoffResult {
  payoffMonths: number;
  totalInterest: number;
  debtInterestPaid: number;
  locInterestPaid: number;
  monthlyData: MoneyLoopMonthlyResult[];
  isPayoffPossible: boolean;
  failureReason?: MoneyLoopFailureReason;
}

export type MobilePayoffFailureReason =
  | 'payment-below-interest'
  | 'negative-cashflow'
  | 'cashflow-below-minimums'
  | 'loc-setup'
  | 'loc-no-capacity'
  | 'loc-overlimit'
  | 'payoff-horizon-exceeded';

export type MobileSimulatorStrategyName = 'Traditional' | 'Snowball' | 'Avalanche' | 'Velocity';

export interface MobileDashboardInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  activeDebtName: string;
  activeDebt: LoanDetails;
  loc: LOCDetails;
  chunkAmount: number;
}

export type MobileSignalTone = 'good' | 'watch' | 'risk' | 'neutral';

export interface MobileVital {
  label: string;
  value: string;
  detail: string;
  tone: MobileSignalTone;
}

export interface MobileDashboardSnapshot {
  cashFlow: number;
  locNeedsSetup: boolean;
  locUtilization: number;
  dailyInterestBurn: number;
  availableLoc: number;
  nextMove: string;
  warning: string | null;
  vitals: MobileVital[];
  loop: Array<{
    label: string;
    value: string;
    detail: string;
    pressurePercent: number;
  }>;
}

export interface MobilePortfolioPriority {
  name: string;
  balanceLabel: string;
  minimumPaymentLabel: string;
  dailyInterestBurnLabel: string;
  reason: string;
}

export interface MobilePortfolioPathPoint {
  month: number;
  balance: number;
  progressPercent: number;
}

export interface MobilePortfolioPathSnapshot {
  isProjected: boolean;
  statusLabel: 'Projected path' | 'Review inputs';
  startingBalanceLabel: string;
  payoffMonthsLabel: string;
  totalInterestLabel: string;
  progressPercent: number;
  points: MobilePortfolioPathPoint[];
}

export interface MobilePortfolioSnapshot {
  totalDebt: number;
  totalDebtLabel: string;
  totalMinimums: number;
  totalMinimumsLabel: string;
  cashFlowAfterMinimums: number;
  cashFlowAfterMinimumsLabel: string;
  modelingLabel: 'Amortized planning view' | 'Review mode';
  modelingDetail: string;
  guardrail: string | null;
  payoffPath: MobilePortfolioPathSnapshot;
  priorities: MobilePortfolioPriority[];
}

export interface MobileSimulatorStrategy {
  name: MobileSimulatorStrategyName;
  months: number;
  totalInterest: number;
  isPayoffPossible: boolean;
  failureReason?: MobilePayoffFailureReason;
  monthsLabel: string;
  totalInterestLabel: string;
  interestLabel: string;
  statusLabel?: string;
}

export interface MobileSimulatorSnapshot {
  guardrail: string | null;
  fastestStrategyName: MobileSimulatorStrategyName | null;
  strategies: MobileSimulatorStrategy[];
  velocity: {
    months: number;
    totalInterest: number;
    interestSaved: number;
    monthsSaved: number;
    interestSavedLabel: string;
    monthsSavedLabel: string;
  };
}

export type MobileCockpitStatus = 'normal' | 'warning' | 'danger';

export interface MobileCockpitInstrument {
  label: 'Airspeed' | 'Fuel Burn' | 'Heading' | 'ETA';
  value: string;
  detail: string;
  status: MobileCockpitStatus;
}

export interface MobileCockpitCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface MobileCockpitSnapshot {
  flightStatusLabel: 'Ready to model' | 'Review inputs';
  warning: string | null;
  instruments: MobileCockpitInstrument[];
  flightChecks: MobileCockpitCheck[];
}

export interface MobileVaultStage {
  title: 'Stabilize' | 'Debt Freedom' | 'Buffer';
  value: string;
  detail: string;
}

export interface MobileVaultSnapshot {
  guardrail: string | null;
  freedomPathLabel: string;
  interestFreedLabel: string;
  stages: MobileVaultStage[];
}

export interface MobileLearnLesson {
  title: 'Money Loop' | 'Cash Flow' | 'LOC Room' | 'Interest Visibility';
  value: string;
  detail: string;
}

export interface MobileLearnSnapshot {
  guardrail: string | null;
  lessons: MobileLearnLesson[];
}

interface MobilePayoffProjection {
  payoffMonths: number;
  totalInterest: number;
  isPayoffPossible: boolean;
  failureReason?: MobilePayoffFailureReason;
}

export const defaultMobileDashboardInput: MobileDashboardInput = {
  monthlyIncome: 6500,
  monthlyExpenses: 5000,
  chunkAmount: 1000,
  activeDebtName: 'Auto Loan',
  activeDebt: {
    balance: 18450,
    apr: 0.069,
    monthlyPayment: 425,
    termMonths: 48,
  },
  loc: {
    limit: 25000,
    apr: 0.085,
    balance: 3200,
  },
};

const LOC_HIGH_UTILIZATION_WARNING = 'LOC utilization is above the 80% planning guardrail.';
const LOC_NO_CAPACITY_WARNING = 'LOC balance is at the entered limit. Pay it down before modeling another chunk.';
const LOC_OVER_LIMIT_WARNING = 'LOC balance is above the available limit. Pay the LOC down before modeling velocity chunks.';

function finiteNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function finiteNonNegative(value: number): number {
  return Math.max(0, finiteNumber(value));
}

function normalizeApr(apr: number): number {
  const safeApr = finiteNumber(apr);
  return safeApr > 1 ? safeApr / 100 : safeApr;
}

function clampLoopPressure(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 8;
  return Math.min(100, Math.max(8, Math.round(value * 100)));
}

function finitePositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.trunc(value));
}

function normalizeMobileDashboardInput(input: MobileDashboardInput): MobileDashboardInput {
  return {
    monthlyIncome: finiteNonNegative(input.monthlyIncome),
    monthlyExpenses: finiteNonNegative(input.monthlyExpenses),
    chunkAmount: finiteNonNegative(input.chunkAmount),
    activeDebtName: input.activeDebtName || defaultMobileDashboardInput.activeDebtName,
    activeDebt: {
      balance: finiteNonNegative(input.activeDebt.balance),
      apr: finiteNonNegative(input.activeDebt.apr),
      monthlyPayment: finiteNonNegative(input.activeDebt.monthlyPayment),
      termMonths: input.activeDebt.termMonths === undefined
        ? undefined
        : finitePositiveInteger(input.activeDebt.termMonths, defaultMobileDashboardInput.activeDebt.termMonths ?? 1),
    },
    loc: {
      limit: finiteNonNegative(input.loc.limit),
      apr: finiteNonNegative(input.loc.apr),
      balance: finiteNonNegative(input.loc.balance),
    },
  };
}

export function calculateMonthlyRate(apr: number): number {
  return finiteNonNegative(normalizeApr(apr)) / 12;
}

export function calculateDailyRate(apr: number): number {
  return finiteNonNegative(normalizeApr(apr)) / 365;
}

export function calculateDailyInterest(balance: number, apr: number): number {
  return finiteNonNegative(balance) * calculateDailyRate(apr);
}

export function calculateCashFlow(income: number, expenses: number): number {
  return finiteNumber(income) - finiteNumber(expenses);
}

export function calculateAmortizationPayment(principal: number, apr: number, termMonths: number): number {
  const safePrincipal = finiteNonNegative(principal);
  const safeTermMonths = finitePositiveInteger(termMonths, 0);
  if (safePrincipal <= 0 || safeTermMonths <= 0) return 0;
  const r = calculateMonthlyRate(apr);
  if (r === 0) return safePrincipal / safeTermMonths;
  return safePrincipal * (r * Math.pow(1 + r, safeTermMonths)) / (Math.pow(1 + r, safeTermMonths) - 1);
}

export function calculateTotalAmortizationInterest(principal: number, apr: number, termMonths: number): number {
  const payment = calculateAmortizationPayment(principal, apr, termMonths);
  return Math.max(0, payment * finiteNonNegative(termMonths) - finiteNonNegative(principal));
}

export function simulateAmortizedPayoff(inputs: AmortizedPayoffInputs): AmortizedPayoffResult {
  const maxMonths = finitePositiveInteger(inputs.maxMonths ?? 600, 600);
  const monthlyRate = calculateMonthlyRate(inputs.apr);
  const scheduledPayment = finiteNonNegative(inputs.monthlyPayment) + finiteNonNegative(inputs.extraPayment ?? 0);
  const monthlyData: AmortizedPayoffMonth[] = [];
  let balance = finiteNonNegative(inputs.principalBalance);
  let totalInterest = 0;
  let month = 0;
  const firstMonthInterest = balance * monthlyRate;

  if (balance > 0.01 && scheduledPayment <= firstMonthInterest) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      monthlyData,
      isPayoffPossible: false,
      failureReason: 'payment-below-interest',
    };
  }

  while (balance > 0.01 && month < maxMonths) {
    month += 1;
    const interest = balance * monthlyRate;
    const payment = Math.min(scheduledPayment, balance + interest);
    const principal = Math.max(0, payment - interest);

    totalInterest += interest;
    balance = Math.max(0, balance - principal);
    monthlyData.push({
      month,
      balance,
      interest,
      principal,
      payment,
    });
  }

  const isPayoffPossible = balance <= 0.01;

  return {
    payoffMonths: month,
    totalInterest,
    monthlyData,
    isPayoffPossible,
    failureReason: isPayoffPossible ? undefined : 'payoff-horizon-exceeded',
  };
}

export function calculateADBInterest(
  startBalance: number,
  apr: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  daysInMonth: number = 30
): number {
  const dayCount = finitePositiveInteger(daysInMonth, 30);
  const balanceAfterDeposit = finiteNonNegative(startBalance) - finiteNonNegative(monthlyIncome);
  const dailyExpense = finiteNonNegative(monthlyExpenses) / dayCount;

  let totalDailyBalance = 0;
  for (let day = 1; day <= dayCount; day += 1) {
    const dayBalance = balanceAfterDeposit + dailyExpense * day;
    totalDailyBalance += Math.max(0, dayBalance);
  }

  const averageDailyBalance = totalDailyBalance / dayCount;
  const dailyRate = calculateDailyRate(apr);

  return averageDailyBalance * dailyRate * dayCount;
}

export function formatCurrency(amount: number): string {
  const safeAmount = finiteNumber(amount);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

export function simulateMoneyLoopMonth(inputs: MoneyLoopMonthInputs): MoneyLoopMonthResult {
  const chunkAmount = finiteNonNegative(inputs.chunkAmount);
  const events: MoneyLoopEvent[] = [];
  const loc = {
    limit: finiteNonNegative(inputs.loc.limit),
    apr: finiteNonNegative(inputs.loc.apr),
    balance: finiteNonNegative(inputs.loc.balance),
  };
  const debtApr = finiteNonNegative(inputs.debtApr);
  const debtPaymentInput = finiteNonNegative(inputs.debtPayment);
  const cashFlowPaydown = finiteNonNegative(inputs.cashFlowPaydown);
  const locDepositAmount = finiteNonNegative(inputs.locDepositAmount);
  const locExpenseAmount = finiteNonNegative(inputs.locExpenseAmount);
  let debtBalance = finiteNonNegative(inputs.debtBalance);
  let locBalance = finiteNonNegative(inputs.locBalance);
  let monthsSinceChunk = finitePositiveInteger(inputs.monthsSinceChunk, 0) + 1;
  let didChunk = false;
  const locAvailable = Math.max(0, loc.limit - locBalance);
  const effectiveChunkAmount = Math.min(chunkAmount, debtBalance, locAvailable);
  const chunkRecoveryMonths = effectiveChunkAmount > 0 && cashFlowPaydown > 0
    ? Math.ceil(effectiveChunkAmount / cashFlowPaydown)
    : 999;

  const debtInterest = debtBalance * calculateMonthlyRate(debtApr);

  events.push({
    type: 'debt-interest',
    label: 'Debt interest posts',
    amount: debtInterest,
    balanceAfter: debtBalance + debtInterest,
    note: 'Monthly amortized-loan interest estimated from the current balance and APR.',
  });

  const canChunk =
    effectiveChunkAmount > 0 &&
    monthsSinceChunk >= chunkRecoveryMonths &&
    debtBalance > effectiveChunkAmount * 0.1;

  if (canChunk) {
    locBalance += effectiveChunkAmount;
    debtBalance = Math.max(0, debtBalance - effectiveChunkAmount);
    monthsSinceChunk = 0;
    didChunk = true;
    events.push({
      type: 'loc-chunk-draw',
      label: 'LOC chunk targets principal',
      amount: effectiveChunkAmount,
      balanceAfter: locBalance,
      note: 'Chunk draw increases LOC balance and immediately reduces the active debt principal.',
    });
  }

  const debtPayment = Math.min(debtPaymentInput, debtBalance + debtInterest);
  const debtPrincipal = debtPayment - debtInterest;
  const debtPrincipalPaid = Math.min(debtBalance, Math.max(0, debtPrincipal));

  debtBalance = Math.max(0, debtBalance - debtPrincipalPaid);
  events.push({
    type: 'debt-payment',
    label: 'Debt payment applies',
    amount: debtPayment,
    balanceAfter: debtBalance,
    note: `${formatCurrency(debtPrincipalPaid)} of this payment is estimated principal after interest.`,
  });

  events.push({
    type: 'income-to-loc',
    label: 'Income enters LOC',
    amount: locDepositAmount,
    balanceAfter: Math.max(0, locBalance - locDepositAmount),
    note: 'Income is modeled as entering the LOC first, lowering the average daily balance.',
  });

  events.push({
    type: 'expenses-from-loc',
    label: 'Expenses leave LOC',
    amount: locExpenseAmount,
    balanceAfter: Math.max(0, locBalance - locDepositAmount + locExpenseAmount),
    note: 'Expenses are modeled as flowing back out across the month.',
  });

  const locInterest = calculateADBInterest(
    locBalance,
    loc.apr,
    locDepositAmount,
    locExpenseAmount
  );
  events.push({
    type: 'loc-interest',
    label: 'LOC interest posts',
    amount: locInterest,
    balanceAfter: locBalance + locInterest,
    note: 'LOC interest uses the average daily balance estimate for this month.',
  });

  locBalance = Math.max(0, locBalance - cashFlowPaydown + locInterest);
  events.push({
    type: 'loc-cashflow-paydown',
    label: 'Cash flow pays down LOC',
    amount: cashFlowPaydown,
    balanceAfter: locBalance,
    note: 'Positive cash flow is applied after expenses to pull the LOC balance back down.',
  });

  return {
    month: inputs.month,
    debtBalance,
    locBalance,
    debtInterest,
    locInterest,
    cashFlowPaydown,
    events,
    debtPayment,
    debtPrincipalPaid,
    monthsSinceChunk,
    didChunk,
  };
}

export function simulateMoneyLoopPayoff(inputs: MoneyLoopPayoffInputs): MoneyLoopPayoffResult {
  const maxMonths = finitePositiveInteger(inputs.maxMonths ?? 600, 600);
  const chunkAmount = finiteNonNegative(inputs.chunkAmount);
  const principalBalance = finiteNonNegative(inputs.principalBalance);
  const debtApr = finiteNonNegative(inputs.debtApr);
  const debtPayment = finiteNonNegative(inputs.debtPayment);
  const loc = {
    limit: finiteNonNegative(inputs.loc.limit),
    apr: finiteNonNegative(inputs.loc.apr),
    balance: finiteNonNegative(inputs.loc.balance),
  };
  const cashFlowPaydown = finiteNumber(inputs.cashFlowPaydown);
  const locDepositAmount = finiteNonNegative(inputs.locDepositAmount);
  const locExpenseAmount = finiteNonNegative(inputs.locExpenseAmount);
  const monthlyData: MoneyLoopMonthlyResult[] = [];

  if (cashFlowPaydown <= 0) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      debtInterestPaid: 0,
      locInterestPaid: 0,
      monthlyData,
      isPayoffPossible: false,
      failureReason: 'negative-cashflow',
    };
  }

  if (loc.limit <= 0) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      debtInterestPaid: 0,
      locInterestPaid: 0,
      monthlyData,
      isPayoffPossible: false,
      failureReason: 'loc-setup',
    };
  }

  if (loc.balance > loc.limit) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      debtInterestPaid: 0,
      locInterestPaid: 0,
      monthlyData,
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
    };
  }

  if (loc.balance === loc.limit) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      debtInterestPaid: 0,
      locInterestPaid: 0,
      monthlyData,
      isPayoffPossible: false,
      failureReason: 'loc-no-capacity',
    };
  }

  const firstMonthInterest = principalBalance * calculateMonthlyRate(debtApr);
  if (principalBalance > 0.01 && debtPayment <= firstMonthInterest) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      debtInterestPaid: 0,
      locInterestPaid: 0,
      monthlyData,
      isPayoffPossible: false,
      failureReason: 'payment-below-interest',
    };
  }

  let debtBalance = principalBalance;
  let locBalance = loc.balance;
  let debtInterestPaid = 0;
  let locInterestPaid = 0;
  let month = 0;
  let monthsSinceChunk = finitePositiveInteger(inputs.initialMonthsSinceChunk ?? 0, 0);

  while ((debtBalance > 0.01 || locBalance > 0.01) && month < maxMonths) {
    month += 1;
    const monthResult = simulateMoneyLoopMonth({
      month,
      debtBalance,
      debtApr,
      debtPayment,
      loc,
      locBalance,
      chunkAmount,
      cashFlowPaydown,
      locDepositAmount,
      locExpenseAmount,
      monthsSinceChunk,
    });
    debtBalance = monthResult.debtBalance;
    locBalance = monthResult.locBalance;
    monthsSinceChunk = monthResult.monthsSinceChunk;
    debtInterestPaid += monthResult.debtInterest;
    locInterestPaid += monthResult.locInterest;
    monthlyData.push(monthResult);
  }

  const isPayoffPossible = debtBalance <= 0.01 && locBalance <= 0.01;

  return {
    payoffMonths: month,
    totalInterest: debtInterestPaid + locInterestPaid,
    debtInterestPaid,
    locInterestPaid,
    monthlyData,
    isPayoffPossible,
    failureReason: isPayoffPossible ? undefined : 'payoff-horizon-exceeded',
  };
}

export function buildMobileDashboardSnapshot(
  input: MobileDashboardInput = defaultMobileDashboardInput
): MobileDashboardSnapshot {
  const model = normalizeMobileDashboardInput(input);
  const cashFlow = calculateCashFlow(model.monthlyIncome, model.monthlyExpenses);
  const locNeedsSetup = model.loc.limit <= 0;
  const locOverLimit = !locNeedsSetup && model.loc.balance > model.loc.limit;
  const locNoCapacity = !locNeedsSetup && model.loc.balance === model.loc.limit;
  const availableLoc = locNeedsSetup ? 0 : Math.max(0, model.loc.limit - model.loc.balance);
  const locUtilization = locNeedsSetup ? 0 : model.loc.balance / model.loc.limit;
  const availableLocRatio = locNeedsSetup ? 0 : availableLoc / model.loc.limit;
  const debtDailyInterest = calculateDailyInterest(model.activeDebt.balance, model.activeDebt.apr);
  const locDailyInterest = calculateDailyInterest(model.loc.balance, model.loc.apr);
  const dailyInterestBurn = debtDailyInterest + locDailyInterest;
  const safeChunk = Math.min(model.chunkAmount, model.activeDebt.balance, availableLoc);
  const monthlyFlowBase = Math.max(model.monthlyIncome, model.monthlyExpenses, 1);
  const principalImpact = model.activeDebt.balance > 0 ? safeChunk / model.activeDebt.balance : 0;
  const velocityProjection = simulateMobileVelocity(model);
  const etaValue = velocityProjection.isPayoffPossible
    ? `${velocityProjection.payoffMonths} mo`
    : cashFlow <= 0
      ? 'Stabilize first'
      : 'Review inputs';

  let nextMove = 'Enter known LOC terms';
  let warning: string | null = locNeedsSetup
    ? 'Enter known LOC limit, APR, fees, and draw rules before trusting velocity chunk projections.'
    : null;

  if (cashFlow <= 0) {
    nextMove = 'Restore positive cash flow';
    warning = 'Income needs to exceed expenses before the Money Loop can recover LOC draws.';
  } else if (locOverLimit) {
    nextMove = 'Pay down the LOC';
    warning = LOC_OVER_LIMIT_WARNING;
  } else if (locNoCapacity) {
    nextMove = 'Create LOC room';
    warning = LOC_NO_CAPACITY_WARNING;
  } else if (!locNeedsSetup && locUtilization > 0.8) {
    nextMove = 'Pay down the LOC';
    warning = LOC_HIGH_UTILIZATION_WARNING;
  } else if (!locNeedsSetup && safeChunk > 0) {
    nextMove = `Send ${formatCurrency(safeChunk)} to principal`;
  }

  return {
    cashFlow,
    locNeedsSetup,
    locUtilization,
    dailyInterestBurn,
    availableLoc,
    nextMove,
    warning,
    vitals: [
      {
        label: 'Cash Flow',
        value: formatCurrency(cashFlow),
        detail: 'Income minus expenses.',
        tone: cashFlow > 0 ? 'good' : 'risk',
      },
      {
        label: 'Interest Burn',
        value: `${formatCurrency(dailyInterestBurn)}/day`,
        detail: 'Simple daily accrual estimate across active debt and LOC balance.',
        tone: dailyInterestBurn > 50 ? 'watch' : 'neutral',
      },
      {
        label: 'Debt-Free ETA',
        value: etaValue,
        detail: velocityProjection.isPayoffPossible
          ? 'Velocity payoff estimate from the shared simulator.'
          : 'No debt-free date shown until inputs support a stable projection.',
        tone: velocityProjection.isPayoffPossible ? 'good' : cashFlow <= 0 ? 'risk' : 'watch',
      },
      {
        label: 'Next Move',
        value: nextMove,
        detail: 'Educational estimate, not a money movement instruction.',
        tone: warning ? 'watch' : 'good',
      },
    ],
    loop: [
      {
        label: 'Income',
        value: formatCurrency(model.monthlyIncome),
        detail: 'Deposits start the loop.',
        pressurePercent: clampLoopPressure(model.monthlyIncome / monthlyFlowBase),
      },
      {
        label: 'LOC',
        value: locNeedsSetup ? 'Enter LOC terms' : `${formatCurrency(availableLoc)} open`,
        detail: locNeedsSetup
          ? 'LOC capacity needs known terms before chunk projections are meaningful.'
          : `${Math.round(locUtilization * 100)}% used. Capacity is useful only with a comfortable buffer.`,
        pressurePercent: clampLoopPressure(locNeedsSetup ? 0 : Math.max(availableLocRatio, locUtilization)),
      },
      {
        label: 'Expenses',
        value: formatCurrency(model.monthlyExpenses),
        detail: 'Outflows define pressure.',
        pressurePercent: clampLoopPressure(model.monthlyExpenses / monthlyFlowBase),
      },
      {
        label: 'Cash Flow',
        value: formatCurrency(cashFlow),
        detail: 'Positive flow can recover the LOC.',
        pressurePercent: clampLoopPressure(cashFlow > 0 ? cashFlow / monthlyFlowBase : 0),
      },
      {
        label: 'Principal',
        value: model.activeDebtName,
        detail: 'Chunks target balance reduction after setup checks.',
        pressurePercent: clampLoopPressure(principalImpact),
      },
    ],
  };
}

export function buildMobilePortfolioSnapshot(
  input: MobileDashboardInput = defaultMobileDashboardInput
): MobilePortfolioSnapshot {
  const model = normalizeMobileDashboardInput(input);
  const totalDebt = model.activeDebt.balance;
  const totalMinimums = model.activeDebt.monthlyPayment;
  const cashFlow = calculateCashFlow(model.monthlyIncome, model.monthlyExpenses);
  const cashFlowAfterMinimums = cashFlow - totalMinimums;
  const dailyInterestBurn = calculateDailyInterest(totalDebt, model.activeDebt.apr);

  let guardrail: string | null = null;
  if (cashFlow <= 0) {
    guardrail = 'Cash flow is not positive, so portfolio payoff claims stay in review mode.';
  } else if (cashFlowAfterMinimums < 0) {
    guardrail = 'Cash flow does not cover the modeled minimum payment yet.';
  } else if (model.loc.limit <= 0) {
    guardrail = 'Enter known LOC terms before modeling portfolio velocity movement.';
  } else if (model.loc.balance > model.loc.limit) {
    guardrail = LOC_OVER_LIMIT_WARNING;
  } else if (model.loc.balance === model.loc.limit) {
    guardrail = LOC_NO_CAPACITY_WARNING;
  } else if (model.loc.balance / model.loc.limit > 0.8) {
    guardrail = LOC_HIGH_UTILIZATION_WARNING;
  }

  const payoffPath = buildMobilePortfolioPathSnapshot(model, guardrail);

  return {
    totalDebt,
    totalDebtLabel: formatCurrency(totalDebt),
    totalMinimums,
    totalMinimumsLabel: formatCurrency(totalMinimums),
    cashFlowAfterMinimums,
    cashFlowAfterMinimumsLabel: formatCurrency(cashFlowAfterMinimums),
    modelingLabel: guardrail ? 'Review mode' : 'Amortized planning view',
    modelingDetail: guardrail
      ? 'Resolve the guardrail before trusting a mobile portfolio payoff path.'
      : 'Mobile Portfolio uses the shared amortized payoff engine with cash flow after minimums; it is not a LOC event ledger.',
    guardrail,
    payoffPath,
    priorities: [
      {
        name: model.activeDebtName,
        balanceLabel: formatCurrency(totalDebt),
        minimumPaymentLabel: formatCurrency(totalMinimums),
        dailyInterestBurnLabel: `${formatCurrency(dailyInterestBurn)}/day`,
        reason: `Highest current modeled daily interest burn: ${formatCurrency(dailyInterestBurn)}/day.`,
      },
    ],
  };
}

function formatPayoffFailure(reason?: MobilePayoffFailureReason): string {
  if (reason === 'negative-cashflow') return 'Needs positive cash flow';
  if (reason === 'cashflow-below-minimums') return 'Cash flow below minimums';
  if (reason === 'payment-below-interest') return 'Payment below interest';
  if (reason === 'loc-setup') return 'Enter LOC terms';
  if (reason === 'loc-no-capacity') return 'No LOC room';
  if (reason === 'loc-overlimit') return 'LOC over limit';
  if (reason === 'payoff-horizon-exceeded') return 'Extend projection horizon';
  return 'Review inputs';
}

function formatMonthsSaved(months: number): string {
  return `${months} ${months === 1 ? 'month' : 'months'} faster`;
}

function simulateMobileBaseline(input: MobileDashboardInput): MobilePayoffProjection {
  const model = normalizeMobileDashboardInput(input);
  const projection = simulateAmortizedPayoff({
    principalBalance: model.activeDebt.balance,
    apr: model.activeDebt.apr,
    monthlyPayment: model.activeDebt.monthlyPayment,
    maxMonths: 600,
  });

  return {
    payoffMonths: projection.payoffMonths,
    totalInterest: projection.totalInterest,
    isPayoffPossible: projection.isPayoffPossible,
    failureReason: projection.failureReason,
  };
}

function simulateMobileWithExtraPayments(input: MobileDashboardInput, extraPaymentInput: number): MobilePayoffProjection {
  const model = normalizeMobileDashboardInput(input);
  const cashFlow = calculateCashFlow(model.monthlyIncome, model.monthlyExpenses);
  const extraPayment = Math.min(finiteNonNegative(extraPaymentInput), Math.max(0, cashFlow));
  const projection = simulateAmortizedPayoff({
    principalBalance: model.activeDebt.balance,
    apr: model.activeDebt.apr,
    monthlyPayment: model.activeDebt.monthlyPayment,
    extraPayment,
    maxMonths: 600,
  });

  return {
    payoffMonths: projection.payoffMonths,
    totalInterest: projection.totalInterest,
    isPayoffPossible: projection.isPayoffPossible,
    failureReason: projection.failureReason,
  };
}

function formatMobileMonths(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return 'Review inputs';

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) return `${months} mo`;
  if (remainingMonths === 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
}

function sampleMobilePortfolioPath(points: MobilePortfolioPathPoint[], maxPoints = 7): MobilePortfolioPathPoint[] {
  if (points.length <= maxPoints) return points;

  const lastIndex = points.length - 1;
  const sampledIndexes = new Set<number>([0, lastIndex]);

  for (let index = 1; index < maxPoints - 1; index += 1) {
    sampledIndexes.add(Math.round((index * lastIndex) / (maxPoints - 1)));
  }

  return Array.from(sampledIndexes)
    .sort((a, b) => a - b)
    .map((index) => points[index]);
}

function buildMobilePortfolioPathSnapshot(
  input: MobileDashboardInput,
  guardrail: string | null
): MobilePortfolioPathSnapshot {
  const model = normalizeMobileDashboardInput(input);
  const startingBalance = model.activeDebt.balance;
  const reviewPath: MobilePortfolioPathSnapshot = {
    isProjected: false,
    statusLabel: 'Review inputs',
    startingBalanceLabel: formatCurrency(startingBalance),
    payoffMonthsLabel: 'Review inputs',
    totalInterestLabel: 'Not projected',
    progressPercent: 0,
    points: [
      {
        month: 0,
        balance: startingBalance,
        progressPercent: 0,
      },
    ],
  };

  if (guardrail || startingBalance <= 0) {
    return reviewPath;
  }

  const cashFlow = calculateCashFlow(model.monthlyIncome, model.monthlyExpenses);
  const extraPayment = Math.max(0, cashFlow - model.activeDebt.monthlyPayment);
  const projection = simulateAmortizedPayoff({
    principalBalance: startingBalance,
    apr: model.activeDebt.apr,
    monthlyPayment: model.activeDebt.monthlyPayment,
    extraPayment,
    maxMonths: 600,
  });

  if (!projection.isPayoffPossible) {
    return reviewPath;
  }

  const points: MobilePortfolioPathPoint[] = [
    {
      month: 0,
      balance: startingBalance,
      progressPercent: 0,
    },
    ...projection.monthlyData.map((month) => ({
      month: month.month,
      balance: month.balance,
      progressPercent: startingBalance > 0
        ? Math.min(100, Math.max(0, ((startingBalance - month.balance) / startingBalance) * 100))
        : 100,
    })),
  ];

  return {
    isProjected: true,
    statusLabel: 'Projected path',
    startingBalanceLabel: formatCurrency(startingBalance),
    payoffMonthsLabel: formatMobileMonths(projection.payoffMonths),
    totalInterestLabel: formatCurrency(projection.totalInterest),
    progressPercent: 100,
    points: sampleMobilePortfolioPath(points),
  };
}

function simulateMobileMoneyLoopPayoff(input: {
  principalBalance: number;
  debtApr: number;
  debtPayment: number;
  loc: LOCDetails;
  chunkAmount: number;
  cashFlowPaydown: number;
  locDepositAmount: number;
  locExpenseAmount: number;
}): MobilePayoffProjection {
  const projection = simulateMoneyLoopPayoff({
    principalBalance: finiteNonNegative(input.principalBalance),
    debtApr: input.debtApr,
    debtPayment: input.debtPayment,
    loc: {
      ...input.loc,
      balance: finiteNonNegative(input.loc.balance),
    },
    chunkAmount: finiteNonNegative(input.chunkAmount),
    cashFlowPaydown: finiteNumber(input.cashFlowPaydown),
    locDepositAmount: finiteNonNegative(input.locDepositAmount),
    locExpenseAmount: finiteNonNegative(input.locExpenseAmount),
    maxMonths: 600,
  });

  return {
    payoffMonths: projection.payoffMonths,
    totalInterest: projection.totalInterest,
    isPayoffPossible: projection.isPayoffPossible,
    failureReason: projection.failureReason,
  };
}

function simulateMobileVelocity(input: MobileDashboardInput): MobilePayoffProjection {
  const model = normalizeMobileDashboardInput(input);
  const cashFlow = calculateCashFlow(model.monthlyIncome, model.monthlyExpenses);

  if (cashFlow <= 0) {
    const baseline = simulateMobileBaseline(model);
    return {
      ...baseline,
      isPayoffPossible: false,
      failureReason: baseline.failureReason ?? 'negative-cashflow',
    };
  }

  if (model.loc.limit <= 0) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'loc-setup',
    };
  }

  if (model.loc.balance > model.loc.limit) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
    };
  }

  if (model.loc.balance === model.loc.limit) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'loc-no-capacity',
    };
  }

  if (cashFlow < model.activeDebt.monthlyPayment) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'cashflow-below-minimums',
    };
  }

  const locCashFlowPaydown = Math.max(0, cashFlow - model.activeDebt.monthlyPayment);
  const chunkAmount = Math.max(
    0,
    model.chunkAmount > 0 ? model.chunkAmount : Math.min(locCashFlowPaydown * 3, model.loc.limit * 0.4)
  );

  return simulateMobileMoneyLoopPayoff({
    principalBalance: model.activeDebt.balance,
    debtApr: model.activeDebt.apr,
    debtPayment: model.activeDebt.monthlyPayment,
    loc: model.loc,
    chunkAmount,
    cashFlowPaydown: locCashFlowPaydown,
    locDepositAmount: model.monthlyIncome,
    locExpenseAmount: model.monthlyExpenses + model.activeDebt.monthlyPayment,
  });
}

function toMobileSimulatorStrategy(
  name: MobileSimulatorStrategyName,
  projection: MobilePayoffProjection
): MobileSimulatorStrategy {
  const isPayoffPossible = projection.isPayoffPossible !== false && projection.payoffMonths > 0;

  return {
    name,
    months: isPayoffPossible ? projection.payoffMonths : 0,
    totalInterest: isPayoffPossible ? projection.totalInterest : 0,
    isPayoffPossible,
    failureReason: projection.failureReason,
    monthsLabel: isPayoffPossible ? `${projection.payoffMonths} mo` : 'Review inputs',
    totalInterestLabel: isPayoffPossible ? formatCurrency(projection.totalInterest) : 'Not projected',
    interestLabel: isPayoffPossible ? 'Projected interest' : 'Not projected',
    statusLabel: isPayoffPossible ? undefined : formatPayoffFailure(projection.failureReason),
  };
}

export function buildMobileSimulatorSnapshot(
  input: MobileDashboardInput = defaultMobileDashboardInput
): MobileSimulatorSnapshot {
  const model = normalizeMobileDashboardInput(input);
  const baseline = simulateMobileBaseline(model);
  const cashFlow = calculateCashFlow(model.monthlyIncome, model.monthlyExpenses);
  const surplusAfterMinimum = Math.max(0, cashFlow - model.activeDebt.monthlyPayment);
  const accelerated = simulateMobileWithExtraPayments(model, surplusAfterMinimum);
  const velocityProjection = simulateMobileVelocity(model);
  const strategies = [
    toMobileSimulatorStrategy('Traditional', baseline),
    toMobileSimulatorStrategy('Snowball', accelerated),
    toMobileSimulatorStrategy('Avalanche', accelerated),
    toMobileSimulatorStrategy('Velocity', velocityProjection),
  ];
  const canCompareVelocity = baseline.isPayoffPossible && velocityProjection.isPayoffPossible;
  const interestSaved = canCompareVelocity ? Math.max(0, baseline.totalInterest - velocityProjection.totalInterest) : 0;
  const monthsSaved = canCompareVelocity ? Math.max(0, baseline.payoffMonths - velocityProjection.payoffMonths) : 0;
  const fastestStrategy = strategies
    .filter((strategy) => strategy.isPayoffPossible)
    .sort((a, b) => a.months - b.months || a.totalInterest - b.totalInterest)[0];

  let guardrail: string | null = null;
  if (cashFlow <= 0) {
    guardrail = 'Income needs to exceed expenses before velocity payoff claims are projected.';
  } else if (model.loc.limit <= 0) {
    guardrail = 'Enter known LOC terms before trusting velocity payoff projections.';
  } else if (model.loc.balance > model.loc.limit) {
    guardrail = LOC_OVER_LIMIT_WARNING;
  } else if (model.loc.balance === model.loc.limit) {
    guardrail = LOC_NO_CAPACITY_WARNING;
  } else if (model.loc.balance / model.loc.limit > 0.8) {
    guardrail = LOC_HIGH_UTILIZATION_WARNING;
  } else if (cashFlow < model.activeDebt.monthlyPayment) {
    guardrail = 'Cash flow does not cover the active debt minimum payment yet.';
  }

  return {
    guardrail,
    fastestStrategyName: fastestStrategy?.name ?? null,
    strategies,
    velocity: {
      months: velocityProjection.isPayoffPossible ? velocityProjection.payoffMonths : 0,
      totalInterest: velocityProjection.isPayoffPossible ? velocityProjection.totalInterest : 0,
      interestSaved,
      monthsSaved,
      interestSavedLabel: canCompareVelocity ? `${formatCurrency(interestSaved)} modeled interest difference` : 'Not projected',
      monthsSavedLabel: canCompareVelocity ? formatMonthsSaved(monthsSaved) : 'Review inputs',
    },
  };
}

export function buildMobileVaultSnapshot(
  input: MobileDashboardInput = defaultMobileDashboardInput
): MobileVaultSnapshot {
  const model = normalizeMobileDashboardInput(input);
  const dashboard = buildMobileDashboardSnapshot(model);
  const simulator = buildMobileSimulatorSnapshot(model);
  const guardrail = simulator.guardrail ?? dashboard.warning;
  const hasModeledPath = !guardrail && simulator.velocity.months > 0;
  const freedomPathLabel = hasModeledPath ? `${simulator.velocity.months} mo` : 'Review inputs';
  const interestFreedLabel = hasModeledPath ? simulator.velocity.interestSavedLabel : 'Not projected';

  return {
    guardrail,
    freedomPathLabel,
    interestFreedLabel,
    stages: [
      {
        title: 'Stabilize',
        value: guardrail ? 'Review inputs' : 'Ready',
        detail: guardrail ?? 'Cash flow, LOC capacity, and minimum-payment coverage pass the first checks.',
      },
      {
        title: 'Debt Freedom',
        value: freedomPathLabel,
        detail: hasModeledPath
          ? `${model.activeDebtName} has a modeled Velocity path using the current chunk, LOC recovery, and daily interest assumptions.`
          : 'No debt-free date is shown until the Money Loop inputs support a stable projection.',
      },
      {
        title: 'Buffer',
        value: interestFreedLabel,
        detail: hasModeledPath
          ? 'Modeled interest freed is shown as an educational comparison; emergency reserves stay separate from payoff claims.'
          : 'Buffer planning waits until the payoff path is stable enough to model.',
      },
    ],
  };
}

export function buildMobileLearnSnapshot(
  input: MobileDashboardInput = defaultMobileDashboardInput
): MobileLearnSnapshot {
  const model = normalizeMobileDashboardInput(input);
  const dashboard = buildMobileDashboardSnapshot(model);
  const simulator = buildMobileSimulatorSnapshot(model);
  const cashFlow = calculateCashFlow(model.monthlyIncome, model.monthlyExpenses);
  const locNeedsSetup = model.loc.limit <= 0;
  const locOverLimit = !locNeedsSetup && model.loc.balance > model.loc.limit;
  const locNoCapacity = !locNeedsSetup && model.loc.balance === model.loc.limit;
  const availableLoc = locNeedsSetup ? 0 : Math.max(0, model.loc.limit - model.loc.balance);
  const guardrail = simulator.guardrail ?? dashboard.warning;

  return {
    guardrail,
    lessons: [
      {
        title: 'Money Loop',
        value: dashboard.nextMove,
        detail: `${model.activeDebtName} is the current modeled target. The loop connects income, expenses, LOC room, and principal movement before any payoff claim is shown.`,
      },
      {
        title: 'Cash Flow',
        value: `${formatCurrency(cashFlow)}/mo`,
        detail: cashFlow > 0
          ? `${formatCurrency(cashFlow)} monthly cash flow is the recovery fuel after minimum payments and planned chunks.`
          : 'Income needs to exceed expenses first, so LOC payoff stays in learning mode.',
      },
      {
        title: 'LOC Room',
        value: locNeedsSetup ? 'Enter LOC terms' : `${formatCurrency(availableLoc)} open`,
        detail: locNeedsSetup
          ? 'Available credit needs a real limit before velocity chunks are modeled.'
          : locOverLimit
            ? 'The LOC balance is above the limit, so payoff claims stay in review mode.'
            : locNoCapacity
              ? 'The LOC is at the limit, so create room before modeling another chunk.'
              : `${formatCurrency(availableLoc)} is available capacity, not income.`,
      },
      {
        title: 'Interest Visibility',
        value: `${formatCurrency(dashboard.dailyInterestBurn)}/day`,
        detail: 'Daily interest is a simple accrual estimate across active debt and LOC balance, not a lender posting promise.',
      },
    ],
  };
}

export function buildMobileCockpitSnapshot(
  input: MobileDashboardInput = defaultMobileDashboardInput
): MobileCockpitSnapshot {
  const model = normalizeMobileDashboardInput(input);
  const dashboard = buildMobileDashboardSnapshot(model);
  const simulator = buildMobileSimulatorSnapshot(model);
  const warning = simulator.guardrail ?? dashboard.warning;
  const etaLabel = simulator.velocity.months > 0 ? `${simulator.velocity.months} mo` : 'Review inputs';

  return {
    flightStatusLabel: warning ? 'Review inputs' : 'Ready to model',
    warning,
    instruments: [
      {
        label: 'Airspeed',
        value: `${formatCurrency(dashboard.cashFlow)}/mo`,
        detail: 'Monthly cash flow powers LOC recovery.',
        status: dashboard.cashFlow > 500 ? 'normal' : dashboard.cashFlow > 0 ? 'warning' : 'danger',
      },
      {
        label: 'Fuel Burn',
        value: `${formatCurrency(dashboard.dailyInterestBurn)}/day`,
        detail: 'Daily interest estimate across active debt and LOC.',
        status: dashboard.dailyInterestBurn > 0 ? 'warning' : 'normal',
      },
      {
        label: 'Heading',
        value: model.activeDebtName,
        detail: 'Current modeled debt focus.',
        status: 'normal',
      },
      {
        label: 'ETA',
        value: etaLabel,
        detail: simulator.velocity.months > 0
          ? 'Velocity payoff estimate from the shared simulator.'
          : 'Suppressed until inputs support a stable projection.',
        status: simulator.velocity.months > 0 ? 'normal' : 'warning',
      },
    ],
    flightChecks: [
      {
        label: 'Positive cash flow',
        passed: dashboard.cashFlow > 0,
        detail: dashboard.cashFlow > 0
          ? 'Income exceeds expenses.'
          : 'Income needs to exceed expenses first.',
      },
      {
        label: 'LOC capacity loaded',
        passed: !dashboard.locNeedsSetup,
        detail: dashboard.locNeedsSetup
          ? 'Enter known LOC terms before trusting chunk movement.'
          : `${formatCurrency(dashboard.availableLoc)} available capacity.`,
      },
      {
        label: 'Utilization under 80%',
        passed: !dashboard.locNeedsSetup && dashboard.locUtilization <= 0.8,
        detail: dashboard.locNeedsSetup
          ? 'Utilization needs known LOC terms.'
          : `${Math.round(dashboard.locUtilization * 100)}% current utilization.`,
      },
      {
        label: 'Payoff claims labeled',
        passed: true,
        detail: warning
          ? 'Unstable projections stay in review mode.'
          : 'Projection copy remains labeled as educational.',
      },
    ],
  };
}
