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

export type MobilePayoffFailureReason =
  | 'payment-below-interest'
  | 'negative-cashflow'
  | 'cashflow-below-minimums'
  | 'loc-overlimit';

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
  }>;
}

export interface MobilePortfolioPriority {
  name: string;
  balanceLabel: string;
  minimumPaymentLabel: string;
  dailyInterestBurnLabel: string;
  reason: string;
}

export interface MobilePortfolioSnapshot {
  totalDebt: number;
  totalDebtLabel: string;
  totalMinimums: number;
  totalMinimumsLabel: string;
  cashFlowAfterMinimums: number;
  cashFlowAfterMinimumsLabel: string;
  guardrail: string | null;
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

interface MobilePayoffProjection {
  payoffMonths: number;
  totalInterest: number;
  isPayoffPossible: boolean;
  failureReason?: MobilePayoffFailureReason;
}

export const defaultMobileDashboardInput: MobileDashboardInput = {
  monthlyIncome: 7000,
  monthlyExpenses: 4500,
  chunkAmount: 1500,
  activeDebtName: 'Auto Loan',
  activeDebt: {
    balance: 18450,
    apr: 0.069,
    monthlyPayment: 425,
    termMonths: 60,
  },
  loc: {
    limit: 0,
    apr: 0.085,
    balance: 3200,
  },
};

export function calculateMonthlyRate(apr: number): number {
  return apr / 12;
}

export function calculateDailyRate(apr: number): number {
  return apr / 365;
}

export function calculateCashFlow(income: number, expenses: number): number {
  return income - expenses;
}

export function calculateAmortizationPayment(principal: number, apr: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return principal / termMonths;
  return principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

export function calculateADBInterest(
  startBalance: number,
  apr: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  daysInMonth: number = 30
): number {
  const balanceAfterDeposit = startBalance - monthlyIncome;
  const dailyExpense = monthlyExpenses / daysInMonth;

  let totalDailyBalance = 0;
  for (let day = 0; day < daysInMonth; day += 1) {
    const dayBalance = balanceAfterDeposit + dailyExpense * day;
    totalDailyBalance += Math.max(0, dayBalance);
  }

  const averageDailyBalance = totalDailyBalance / daysInMonth;
  const dailyRate = apr / 365;

  return averageDailyBalance * dailyRate * daysInMonth;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function buildMobileDashboardSnapshot(
  input: MobileDashboardInput = defaultMobileDashboardInput
): MobileDashboardSnapshot {
  const cashFlow = calculateCashFlow(input.monthlyIncome, input.monthlyExpenses);
  const locNeedsSetup = input.loc.limit <= 0;
  const availableLoc = locNeedsSetup ? 0 : Math.max(0, input.loc.limit - input.loc.balance);
  const locUtilization = locNeedsSetup ? 0 : input.loc.balance / input.loc.limit;
  const debtDailyInterest = Math.max(0, input.activeDebt.balance) * calculateDailyRate(Math.max(0, input.activeDebt.apr));
  const locDailyInterest = Math.max(0, input.loc.balance) * calculateDailyRate(Math.max(0, input.loc.apr));
  const dailyInterestBurn = debtDailyInterest + locDailyInterest;
  const safeChunk = Math.min(Math.max(0, input.chunkAmount), Math.max(0, input.activeDebt.balance), availableLoc);

  let nextMove = 'Model the LOC limit';
  let warning: string | null = locNeedsSetup
    ? 'Add a LOC limit before trusting velocity chunk projections.'
    : null;

  if (cashFlow <= 0) {
    nextMove = 'Restore positive cash flow';
    warning = 'Income needs to exceed expenses before the Money Loop can recover LOC draws.';
  } else if (!locNeedsSetup && locUtilization > 0.8) {
    nextMove = 'Pay down the LOC';
    warning = 'LOC utilization is above the 80% planning guardrail.';
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
        label: 'LOC Room',
        value: locNeedsSetup ? 'Missing limit' : `${formatCurrency(availableLoc)} open`,
        detail: locNeedsSetup ? 'Setup needed before chunks are trusted.' : `${Math.round(locUtilization * 100)}% used.`,
        tone: locNeedsSetup || locUtilization > 0.8 ? 'watch' : 'good',
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
        value: formatCurrency(input.monthlyIncome),
        detail: 'Deposits start the loop.',
      },
      {
        label: 'Expenses',
        value: formatCurrency(input.monthlyExpenses),
        detail: 'Outflows define pressure.',
      },
      {
        label: 'Cash Flow',
        value: formatCurrency(cashFlow),
        detail: 'Positive flow can recover the LOC.',
      },
      {
        label: 'Principal',
        value: input.activeDebtName,
        detail: 'Chunks target balance reduction after setup checks.',
      },
    ],
  };
}

export function buildMobilePortfolioSnapshot(
  input: MobileDashboardInput = defaultMobileDashboardInput
): MobilePortfolioSnapshot {
  const totalDebt = Math.max(0, input.activeDebt.balance);
  const totalMinimums = Math.max(0, input.activeDebt.monthlyPayment);
  const cashFlow = calculateCashFlow(input.monthlyIncome, input.monthlyExpenses);
  const cashFlowAfterMinimums = cashFlow - totalMinimums;
  const dailyInterestBurn = totalDebt * calculateDailyRate(Math.max(0, input.activeDebt.apr));

  let guardrail: string | null = null;
  if (cashFlow <= 0) {
    guardrail = 'Cash flow is not positive, so portfolio payoff claims stay in review mode.';
  } else if (cashFlowAfterMinimums < 0) {
    guardrail = 'Cash flow does not cover the modeled minimum payment yet.';
  } else if (input.loc.limit <= 0) {
    guardrail = 'Add a LOC limit before modeling portfolio velocity movement.';
  } else if (input.loc.balance / input.loc.limit > 0.8) {
    guardrail = 'LOC utilization is above the 80% planning guardrail.';
  }

  return {
    totalDebt,
    totalDebtLabel: formatCurrency(totalDebt),
    totalMinimums,
    totalMinimumsLabel: formatCurrency(totalMinimums),
    cashFlowAfterMinimums,
    cashFlowAfterMinimumsLabel: formatCurrency(cashFlowAfterMinimums),
    guardrail,
    priorities: [
      {
        name: input.activeDebtName,
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
  if (reason === 'loc-overlimit') return 'LOC over limit';
  return 'Review inputs';
}

function formatMonthsSaved(months: number): string {
  return `${months} ${months === 1 ? 'month' : 'months'} faster`;
}

function simulateMobileBaseline(input: MobileDashboardInput): MobilePayoffProjection {
  const monthlyRate = Math.max(0, input.activeDebt.apr) / 12;
  let balance = Math.max(0, input.activeDebt.balance);
  let totalInterest = 0;
  let month = 0;
  const firstMonthInterest = balance * monthlyRate;

  if (balance > 0.01 && input.activeDebt.monthlyPayment <= firstMonthInterest) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'payment-below-interest',
    };
  }

  while (balance > 0.01 && month < 600) {
    month += 1;
    const interest = balance * monthlyRate;
    const payment = Math.min(input.activeDebt.monthlyPayment, balance + interest);
    const principal = payment - interest;

    if (principal <= 0) {
      balance += interest - input.activeDebt.monthlyPayment;
      totalInterest += interest;
      continue;
    }

    totalInterest += interest;
    balance = Math.max(0, balance - principal);
  }

  return {
    payoffMonths: month,
    totalInterest,
    isPayoffPossible: balance <= 0.01,
    failureReason: balance <= 0.01 ? undefined : 'payment-below-interest',
  };
}

function simulateMobileWithExtraPayments(input: MobileDashboardInput, extraPaymentInput: number): MobilePayoffProjection {
  const monthlyRate = Math.max(0, input.activeDebt.apr) / 12;
  let balance = Math.max(0, input.activeDebt.balance);
  let totalInterest = 0;
  let month = 0;
  const cashFlow = calculateCashFlow(input.monthlyIncome, input.monthlyExpenses);
  const extraPayment = Math.min(Math.max(0, extraPaymentInput), Math.max(0, cashFlow));
  const firstMonthInterest = balance * monthlyRate;

  if (balance > 0.01 && input.activeDebt.monthlyPayment + extraPayment <= firstMonthInterest) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'payment-below-interest',
    };
  }

  while (balance > 0.01 && month < 600) {
    month += 1;
    const interest = balance * monthlyRate;
    const totalPayment = Math.min(input.activeDebt.monthlyPayment + extraPayment, balance + interest);
    const principal = totalPayment - interest;

    totalInterest += interest;
    balance = Math.max(0, balance - Math.max(0, principal));
  }

  return {
    payoffMonths: month,
    totalInterest,
    isPayoffPossible: balance <= 0.01,
    failureReason: balance <= 0.01 ? undefined : 'payment-below-interest',
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
  if (input.cashFlowPaydown <= 0) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'negative-cashflow',
    };
  }

  if (input.loc.limit <= 0 || input.loc.balance >= input.loc.limit) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
    };
  }

  const firstMonthInterest = input.principalBalance * input.debtApr / 12;
  if (input.principalBalance > 0.01 && input.debtPayment <= firstMonthInterest) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'payment-below-interest',
    };
  }

  const chunkAmount = Math.max(0, input.chunkAmount);
  let debtBalance = Math.max(0, input.principalBalance);
  let locBalance = Math.max(0, input.loc.balance);
  let totalInterest = 0;
  let month = 0;
  let monthsSinceChunk = 0;

  while ((debtBalance > 0.01 || locBalance > 0.01) && month < 600) {
    month += 1;
    monthsSinceChunk += 1;

    const locAvailable = Math.max(0, input.loc.limit - locBalance);
    const effectiveChunkAmount = Math.min(chunkAmount, Math.max(0, debtBalance), locAvailable);
    const chunkRecoveryMonths = effectiveChunkAmount > 0 && input.cashFlowPaydown > 0
      ? Math.ceil(effectiveChunkAmount / input.cashFlowPaydown)
      : 999;

    const debtInterest = debtBalance * input.debtApr / 12;
    const debtPayment = Math.min(input.debtPayment, debtBalance + debtInterest);
    const debtPrincipalPaid = Math.max(0, debtPayment - debtInterest);
    const canChunk =
      effectiveChunkAmount > 0 &&
      monthsSinceChunk >= chunkRecoveryMonths &&
      debtBalance > effectiveChunkAmount * 0.1;

    if (canChunk) {
      locBalance += effectiveChunkAmount;
      debtBalance = Math.max(0, debtBalance - effectiveChunkAmount);
      monthsSinceChunk = 0;
    }

    debtBalance = Math.max(0, debtBalance - debtPrincipalPaid);
    const locInterest = calculateADBInterest(
      locBalance,
      input.loc.apr,
      input.locDepositAmount,
      input.locExpenseAmount
    );
    locBalance = Math.max(0, locBalance - input.cashFlowPaydown + locInterest);
    totalInterest += debtInterest + locInterest;
  }

  const isPayoffPossible = debtBalance <= 0.01 && locBalance <= 0.01;

  return {
    payoffMonths: month,
    totalInterest,
    isPayoffPossible,
    failureReason: isPayoffPossible ? undefined : 'payment-below-interest',
  };
}

function simulateMobileVelocity(input: MobileDashboardInput): MobilePayoffProjection {
  const cashFlow = calculateCashFlow(input.monthlyIncome, input.monthlyExpenses);

  if (cashFlow <= 0) {
    const baseline = simulateMobileBaseline(input);
    return {
      ...baseline,
      isPayoffPossible: false,
      failureReason: baseline.failureReason ?? 'negative-cashflow',
    };
  }

  if (input.loc.limit <= 0 || input.loc.balance >= input.loc.limit) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
    };
  }

  if (cashFlow < input.activeDebt.monthlyPayment) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'cashflow-below-minimums',
    };
  }

  const locCashFlowPaydown = Math.max(0, cashFlow - input.activeDebt.monthlyPayment);
  const chunkAmount = Math.max(
    0,
    input.chunkAmount > 0 ? input.chunkAmount : Math.min(locCashFlowPaydown * 3, input.loc.limit * 0.4)
  );

  return simulateMobileMoneyLoopPayoff({
    principalBalance: Math.max(0, input.activeDebt.balance),
    debtApr: Math.max(0, input.activeDebt.apr),
    debtPayment: Math.max(0, input.activeDebt.monthlyPayment),
    loc: input.loc,
    chunkAmount,
    cashFlowPaydown: locCashFlowPaydown,
    locDepositAmount: Math.max(0, input.monthlyIncome),
    locExpenseAmount: Math.max(0, input.monthlyExpenses + input.activeDebt.monthlyPayment),
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
  const baseline = simulateMobileBaseline(input);
  const cashFlow = calculateCashFlow(input.monthlyIncome, input.monthlyExpenses);
  const surplusAfterMinimum = Math.max(0, cashFlow - input.activeDebt.monthlyPayment);
  const accelerated = simulateMobileWithExtraPayments(input, surplusAfterMinimum);
  const velocityProjection = simulateMobileVelocity(input);
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
  } else if (input.loc.limit <= 0) {
    guardrail = 'Add a LOC limit before trusting velocity payoff projections.';
  } else if (input.loc.balance / input.loc.limit > 0.8) {
    guardrail = 'LOC utilization is above the 80% planning guardrail.';
  } else if (cashFlow < input.activeDebt.monthlyPayment) {
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
      interestSavedLabel: canCompareVelocity ? `Saves ${formatCurrency(interestSaved)}` : 'Not projected',
      monthsSavedLabel: canCompareVelocity ? formatMonthsSaved(monthsSaved) : 'Review inputs',
    },
  };
}

export function buildMobileCockpitSnapshot(
  input: MobileDashboardInput = defaultMobileDashboardInput
): MobileCockpitSnapshot {
  const dashboard = buildMobileDashboardSnapshot(input);
  const simulator = buildMobileSimulatorSnapshot(input);
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
        value: input.activeDebtName,
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
          ? 'Add a LOC limit before trusting chunk movement.'
          : `${formatCurrency(dashboard.availableLoc)} available capacity.`,
      },
      {
        label: 'Utilization under 80%',
        passed: !dashboard.locNeedsSetup && dashboard.locUtilization <= 0.8,
        detail: dashboard.locNeedsSetup
          ? 'Utilization needs a LOC limit.'
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
