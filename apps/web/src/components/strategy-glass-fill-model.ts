import { formatCurrency } from '../engine/calculations';

export interface StrategyDeltaInput {
  baselineMonths: number;
  baselineInterest: number;
  strategyMonths: number;
  strategyInterest: number;
}

export type StrategyDeltaTone = 'emerald' | 'amber' | 'sky';

function formatMonthDelta(baselineMonths: number, strategyMonths: number): string {
  if (!Number.isFinite(baselineMonths) || !Number.isFinite(strategyMonths)) return 'Review inputs';

  const monthDelta = Math.round(baselineMonths - strategyMonths);
  if (monthDelta > 0) return `${monthDelta} mo faster`;
  if (monthDelta < 0) return `${Math.abs(monthDelta)} mo slower`;
  return 'Same payoff time';
}

export function formatStrategyInterestDelta(baselineInterest: number, strategyInterest: number): string {
  if (!Number.isFinite(baselineInterest) || !Number.isFinite(strategyInterest)) return 'Interest not projected';

  const interestDelta = baselineInterest - strategyInterest;
  if (Math.abs(interestDelta) < 0.005) return 'same interest';

  return interestDelta > 0
    ? `${formatCurrency(interestDelta)} interest saved`
    : `${formatCurrency(Math.abs(interestDelta))} more interest`;
}

export function getStrategyDeltaTone(baselineInterest: number, strategyInterest: number): StrategyDeltaTone {
  if (!Number.isFinite(baselineInterest) || !Number.isFinite(strategyInterest)) return 'amber';

  const interestDelta = baselineInterest - strategyInterest;
  if (interestDelta > 0.005) return 'emerald';
  if (interestDelta < -0.005) return 'amber';
  return 'sky';
}

export function formatStrategyDeltaBadge(input: StrategyDeltaInput): string {
  return `${formatMonthDelta(input.baselineMonths, input.strategyMonths)} - ${formatStrategyInterestDelta(
    input.baselineInterest,
    input.strategyInterest
  )}`;
}
