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
