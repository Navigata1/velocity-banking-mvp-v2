import { formatCurrency } from './calculations';
import type {
  DebtItem,
  FocusMode,
  PayoffStrategy,
  PortfolioFailureReason,
  PortfolioSimulationInputs,
  PortfolioSimulationResult,
} from './portfolio';

export type PortfolioRunChangeDirection = 'improved' | 'worsened' | 'neutral';
export type PortfolioRunComparisonStatus = 'baseline' | 'changed' | 'unchanged';

export interface PortfolioRunSummary {
  cashFlow: number;
  totalDebt: number;
  totalMinimums: number;
  payoffMonths: number;
  totalInterest: number;
  isPayoffPossible: boolean;
  failureReason?: PortfolioFailureReason;
  strategy: PayoffStrategy;
  focusMode: FocusMode;
  primaryTargetName?: string;
  debtCount: number;
}

export interface PortfolioRunChange {
  id:
    | 'projection'
    | 'payoff-months'
    | 'total-interest'
    | 'cash-flow'
    | 'debt-load'
    | 'minimums'
    | 'strategy'
    | 'focus'
    | 'target';
  label: string;
  value: string;
  body: string;
  direction: PortfolioRunChangeDirection;
}

export interface PortfolioRunComparison {
  status: PortfolioRunComparisonStatus;
  current: PortfolioRunSummary;
  previous?: PortfolioRunSummary;
  changes: PortfolioRunChange[];
}

function getMinPayment(debt: DebtItem): number {
  if (debt.minPaymentRule.type === 'fixed') {
    return Math.max(0, debt.minPaymentRule.amount);
  }

  return Math.max(
    Math.max(0, debt.minPaymentRule.floor),
    Math.max(0, debt.balance) * Math.max(0, debt.minPaymentRule.percent)
  );
}

function formatMonths(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return 'not projected';

  const wholeMonths = Math.ceil(months);
  const years = Math.floor(wholeMonths / 12);
  const remainingMonths = wholeMonths % 12;

  if (years === 0) return `${wholeMonths} mo`;
  if (remainingMonths === 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
}

function formatSignedCurrencyDelta(delta: number): string {
  if (Math.abs(delta) < 0.5) return formatCurrency(0);

  const sign = delta > 0 ? '+' : '-';
  return `${sign}${formatCurrency(Math.abs(delta))}`;
}

function strategyLabel(strategy: PayoffStrategy): string {
  if (strategy === 'velocity') return 'Velocity Mode';
  if (strategy === 'snowball') return 'Snowball';
  return 'Avalanche';
}

function focusLabel(focusMode: FocusMode): string {
  return focusMode === 'single' ? 'Single Lane' : 'Split Mode';
}

function findPrimaryTargetName(
  inputs: PortfolioSimulationInputs,
  result: PortfolioSimulationResult
): string | undefined {
  const rationaleTarget = Object.values(result.debtRationales)
    .find((rationale) => rationale.isCurrentTarget);
  if (rationaleTarget) {
    return inputs.debts.find((debt) => debt.id === rationaleTarget.debtId)?.name;
  }

  const firstMonthTarget = result.monthResults[0]?.targetIds[0];
  if (firstMonthTarget) {
    return inputs.debts.find((debt) => debt.id === firstMonthTarget)?.name;
  }

  return result.payoffOrder[0]?.name;
}

export function summarizePortfolioRun(
  inputs: PortfolioSimulationInputs,
  result: PortfolioSimulationResult
): PortfolioRunSummary {
  return {
    cashFlow: inputs.monthlyIncome - inputs.monthlyExpenses,
    totalDebt: inputs.debts.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0),
    totalMinimums: inputs.debts.reduce((sum, debt) => sum + getMinPayment(debt), 0),
    payoffMonths: result.payoffMonths,
    totalInterest: result.totalInterest,
    isPayoffPossible: result.isPayoffPossible,
    failureReason: result.failureReason,
    strategy: inputs.settings.strategy,
    focusMode: inputs.settings.focusMode,
    primaryTargetName: findPrimaryTargetName(inputs, result),
    debtCount: inputs.debts.length,
  };
}

export function comparePortfolioRuns(
  previous: PortfolioRunSummary | undefined,
  current: PortfolioRunSummary
): PortfolioRunComparison {
  if (!previous) {
    return {
      status: 'baseline',
      current,
      changes: [
        {
          id: 'projection',
          label: 'Baseline captured',
          value: current.isPayoffPossible ? formatMonths(current.payoffMonths) : 'Review inputs',
          body: current.isPayoffPossible
            ? 'The next edit will compare against this projection.'
            : 'Fix the warning inputs first, then the next stable projection can be compared.',
          direction: 'neutral',
        },
      ],
    };
  }

  const changes: PortfolioRunChange[] = [];

  if (previous.isPayoffPossible !== current.isPayoffPossible) {
    changes.push({
      id: 'projection',
      label: 'Projection status',
      value: current.isPayoffPossible ? 'Projection restored' : 'Needs review',
      body: current.isPayoffPossible
        ? `The plan moved from ${previous.failureReason ?? 'an invalid state'} back to a projected payoff.`
        : `The latest inputs stopped the payoff projection: ${current.failureReason ?? 'review the warnings'}.`,
      direction: current.isPayoffPossible ? 'improved' : 'worsened',
    });
  }

  if (previous.isPayoffPossible && current.isPayoffPossible) {
    const payoffDelta = current.payoffMonths - previous.payoffMonths;
    if (payoffDelta !== 0) {
      changes.push({
        id: 'payoff-months',
        label: 'Debt-free ETA',
        value: payoffDelta < 0 ? `${Math.abs(payoffDelta)} mo sooner` : `${payoffDelta} mo later`,
        body: `Projection moved from ${formatMonths(previous.payoffMonths)} to ${formatMonths(current.payoffMonths)}.`,
        direction: payoffDelta < 0 ? 'improved' : 'worsened',
      });
    }

    const interestDelta = current.totalInterest - previous.totalInterest;
    if (Math.abs(interestDelta) >= 1) {
      changes.push({
        id: 'total-interest',
        label: 'Interest estimate',
        value: formatSignedCurrencyDelta(interestDelta),
        body: `Estimated total interest moved from ${formatCurrency(previous.totalInterest)} to ${formatCurrency(current.totalInterest)}.`,
        direction: interestDelta < 0 ? 'improved' : 'worsened',
      });
    }
  }

  const cashFlowDelta = current.cashFlow - previous.cashFlow;
  if (Math.abs(cashFlowDelta) >= 1) {
    changes.push({
      id: 'cash-flow',
      label: 'Cash flow',
      value: formatSignedCurrencyDelta(cashFlowDelta),
      body: `Monthly cash flow moved from ${formatCurrency(previous.cashFlow)} to ${formatCurrency(current.cashFlow)}.`,
      direction: cashFlowDelta > 0 ? 'improved' : 'worsened',
    });
  }

  const debtDelta = current.totalDebt - previous.totalDebt;
  if (Math.abs(debtDelta) >= 1) {
    changes.push({
      id: 'debt-load',
      label: 'Debt load',
      value: formatSignedCurrencyDelta(debtDelta),
      body: `Total entered balances moved from ${formatCurrency(previous.totalDebt)} to ${formatCurrency(current.totalDebt)}.`,
      direction: debtDelta < 0 ? 'improved' : 'worsened',
    });
  }

  const minimumDelta = current.totalMinimums - previous.totalMinimums;
  if (Math.abs(minimumDelta) >= 1) {
    changes.push({
      id: 'minimums',
      label: 'Minimums',
      value: formatSignedCurrencyDelta(minimumDelta),
      body: `Required monthly minimums moved from ${formatCurrency(previous.totalMinimums)} to ${formatCurrency(current.totalMinimums)}.`,
      direction: minimumDelta < 0 ? 'improved' : 'worsened',
    });
  }

  if (previous.strategy !== current.strategy) {
    changes.push({
      id: 'strategy',
      label: 'Strategy',
      value: strategyLabel(current.strategy),
      body: `Comparison changed from ${strategyLabel(previous.strategy)} to ${strategyLabel(current.strategy)}.`,
      direction: 'neutral',
    });
  }

  if (previous.focusMode !== current.focusMode) {
    changes.push({
      id: 'focus',
      label: 'Focus mode',
      value: focusLabel(current.focusMode),
      body: `Focus changed from ${focusLabel(previous.focusMode)} to ${focusLabel(current.focusMode)}.`,
      direction: 'neutral',
    });
  }

  if ((previous.primaryTargetName ?? '') !== (current.primaryTargetName ?? '')) {
    changes.push({
      id: 'target',
      label: 'Next target',
      value: current.primaryTargetName ?? 'No target',
      body: previous.primaryTargetName
        ? `The first target changed from ${previous.primaryTargetName} to ${current.primaryTargetName ?? 'no active debt'}.`
        : `The plan now has ${current.primaryTargetName ?? 'no active debt'} as the first target.`,
      direction: 'neutral',
    });
  }

  if (changes.length === 0) {
    changes.push({
      id: 'projection',
      label: 'No material change',
      value: 'Stable',
      body: 'The latest edit did not materially change payoff timing, interest, cash flow, minimums, strategy, or target order.',
      direction: 'neutral',
    });
  }

  return {
    status: changes.some((change) => change.id !== 'projection' || change.label !== 'No material change')
      ? 'changed'
      : 'unchanged',
    current,
    previous,
    changes,
  };
}
