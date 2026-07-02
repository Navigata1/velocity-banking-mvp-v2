import { formatCurrency } from '../engine/calculations';

export interface StrategyGlassStrategyInput {
  name: string;
  months: number;
  totalInterest: number;
  isPayoffPossible?: boolean;
}

export interface StrategyDeltaInput {
  baselineMonths: number;
  baselineInterest: number;
  strategyMonths: number;
  strategyInterest: number;
}

export type StrategyDeltaTone = 'emerald' | 'amber' | 'sky';

export interface StrategyGlassCardModel {
  name: string;
  isValid: boolean;
  fillPercent: number;
  monthsSaved: number;
  isWinner: boolean;
  isBaseline: boolean;
}

export interface StrategyGlassComparisonModel {
  baselineMonths: number;
  baselineInterest: number;
  baselineValid: boolean;
  winner: StrategyGlassStrategyInput | null;
  cards: StrategyGlassCardModel[];
}

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function isStrategyGlassProjectionValid(strategy: StrategyGlassStrategyInput | undefined): boolean {
  return (
    strategy?.isPayoffPossible !== false &&
    isFinitePositive(strategy?.months ?? Number.NaN) &&
    isFiniteNonNegative(strategy?.totalInterest ?? Number.NaN)
  );
}

export function buildStrategyGlassComparison(strategies: StrategyGlassStrategyInput[]): StrategyGlassComparisonModel {
  const baseline = strategies[0];
  const baselineValid = isStrategyGlassProjectionValid(baseline);
  const baselineMonths = baselineValid ? baseline.months : 0;
  const baselineInterest = baselineValid ? baseline.totalInterest : 0;
  const winner = baselineValid
    ? strategies
        .slice(1)
        .filter((strategy) => isStrategyGlassProjectionValid(strategy) && strategy.months < baselineMonths)
        .reduce<StrategyGlassStrategyInput | null>(
          (best, strategy) => (!best || strategy.months < best.months ? strategy : best),
          null
        )
    : null;

  return {
    baselineMonths,
    baselineInterest,
    baselineValid,
    winner,
    cards: strategies.map((strategy, index) => {
      const isValid = isStrategyGlassProjectionValid(strategy);
      const fillPercent = isValid && baselineValid ? Math.min(100, (strategy.months / baselineMonths) * 100) : 0;
      const monthsSaved = isValid && baselineValid ? baselineMonths - strategy.months : 0;

      return {
        name: strategy.name,
        isValid,
        fillPercent,
        monthsSaved,
        isWinner: Boolean(winner && strategy.name === winner.name),
        isBaseline: index === 0,
      };
    }),
  };
}

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
