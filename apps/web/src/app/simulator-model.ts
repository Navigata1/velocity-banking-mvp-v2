import type { PayoffFailureReason, SingleDebtStrategyResult } from '../engine/calculations';

export interface SimulatorStrategyCard {
  name: SingleDebtStrategyResult['name'];
  months: number;
  totalInterest: number;
  color: 'red' | 'blue' | 'amber' | 'emerald';
  icon: string;
  isPayoffPossible: boolean;
  failureReason?: PayoffFailureReason;
  monthsLabel: string;
  interestLabel: string;
  statusLabel?: string;
}

export interface SimulatorWarningInput {
  cashFlow: number;
  loc: {
    limit: number;
    balance: number;
  };
}

export interface SimulatorWarning {
  kind: 'cash-flow' | 'loc-setup' | 'loc-overlimit' | 'loc-utilization';
  title: string;
  body: string;
  tone: 'rose' | 'amber';
}

export interface SimulatorTimelineStatus {
  label: string;
  tone: 'emerald' | 'amber';
}

const strategyStyles: Record<SingleDebtStrategyResult['name'], Pick<SimulatorStrategyCard, 'color' | 'icon'>> = {
  Traditional: { color: 'red', icon: '📊' },
  Snowball: { color: 'blue', icon: '☃️' },
  Avalanche: { color: 'amber', icon: '🏔️' },
  Velocity: { color: 'emerald', icon: '⚡' },
};

const LOC_OVER_LIMIT_TITLE = 'LOC balance is over the limit';
const LOC_OVER_LIMIT_BODY = 'The LOC balance is above the available limit. Bring it back under the limit before modeling another chunk.';

function formatFailure(reason?: PayoffFailureReason): string {
  if (reason === 'negative-cashflow') return 'Needs positive cash flow';
  if (reason === 'cashflow-below-minimums') return 'Cash flow below minimums';
  if (reason === 'payment-below-interest') return 'Payment below interest';
  if (reason === 'loc-setup') return 'Add LOC limit';
  if (reason === 'loc-no-capacity') return 'No LOC room';
  if (reason === 'loc-overlimit') return 'LOC over limit';
  if (reason === 'payoff-horizon-exceeded') return 'Extend projection horizon';
  return 'Review inputs';
}

export function buildSimulatorWarnings(input: SimulatorWarningInput): SimulatorWarning[] {
  const warnings: SimulatorWarning[] = [];

  if (input.cashFlow <= 0) {
    warnings.push({
      kind: 'cash-flow',
      title: 'Stabilize first',
      body: 'Income needs to exceed expenses before velocity banking is modeled as usable.',
      tone: 'rose',
    });
  }

  if (input.loc.limit <= 0) {
    const hasLocBalance = input.loc.balance > 0;
    warnings.push({
      kind: 'loc-setup',
      title: hasLocBalance ? 'Add LOC limit' : 'Add LOC details',
      body: hasLocBalance
        ? 'A LOC balance is present, but the limit is missing. Enter a limit before trusting utilization or chunk projections.'
        : 'Enter a LOC limit before trusting utilization or chunk projections.',
      tone: 'amber',
    });

    return warnings;
  }

  if (input.loc.balance > input.loc.limit) {
    warnings.push({
      kind: 'loc-overlimit',
      title: LOC_OVER_LIMIT_TITLE,
      body: LOC_OVER_LIMIT_BODY,
      tone: 'rose',
    });

    return warnings;
  }

  if (input.loc.balance / input.loc.limit > 0.8) {
    warnings.push({
      kind: 'loc-utilization',
      title: 'High LOC utilization',
      body: 'The LOC is over 80% utilized. Bring it below 80% before modeling another chunk.',
      tone: 'amber',
    });
  }

  return warnings;
}

export function buildSimulatorTimelineStatus(eventCount: number): SimulatorTimelineStatus {
  return eventCount > 0
    ? { label: 'LOC interest visible', tone: 'emerald' }
    : { label: 'Review inputs', tone: 'amber' };
}

export function buildSimulatorStrategyCards(strategies: SingleDebtStrategyResult[]): SimulatorStrategyCard[] {
  return strategies.map((strategy) => {
    const isPayoffPossible = strategy.isPayoffPossible !== false && strategy.months > 0;
    const style = strategyStyles[strategy.name];

    return {
      name: strategy.name,
      months: isPayoffPossible ? strategy.months : 0,
      totalInterest: isPayoffPossible ? strategy.totalInterest : 0,
      color: style.color,
      icon: style.icon,
      isPayoffPossible,
      failureReason: strategy.failureReason,
      monthsLabel: isPayoffPossible ? `${strategy.months} mo` : 'Review inputs',
      interestLabel: isPayoffPossible ? 'Projected interest' : 'Not projected',
      statusLabel: isPayoffPossible ? undefined : formatFailure(strategy.failureReason),
    };
  });
}
