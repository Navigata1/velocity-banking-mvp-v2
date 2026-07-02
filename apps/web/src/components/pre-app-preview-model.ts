import type { DebtAccount } from '@/stores/financial-store';
import { estimateDailyInterest, rankDebtsVelocity, type VelocityDebt } from '@/engine/velocity-targeting';

interface PayoffProjection {
  months: number;
  totalInterest: number;
  isPayoffPossible?: boolean;
}

interface VelocityPayoffProjection extends PayoffProjection {
  savings: number;
}

export interface PreAppPreviewSnapshotInput {
  debts: DebtAccount[];
  cashFlow: number;
  currentTime: number;
  baseline: PayoffProjection;
  velocity: VelocityPayoffProjection;
}

export interface PreAppPreviewSnapshot {
  totalDebt: number;
  cashFlow: number;
  next: VelocityDebt | null;
  dailyBurn: number;
  velocityScore: number;
  debtFreeDateLabel: string;
  payoffProjected: boolean;
  top3: VelocityDebt[];
}

function finiteNonNegative(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function hasStablePayoffProjection(baseline: PayoffProjection, velocity: VelocityPayoffProjection): boolean {
  return (
    baseline.isPayoffPossible === true &&
    velocity.isPayoffPossible === true &&
    Number.isFinite(baseline.totalInterest) &&
    baseline.totalInterest > 0 &&
    Number.isFinite(velocity.savings) &&
    Number.isFinite(velocity.months) &&
    velocity.months > 0
  );
}

export function buildPreAppPreviewSnapshot(input: PreAppPreviewSnapshotInput): PreAppPreviewSnapshot {
  const debts = input.debts.filter((debt) => finiteNonNegative(debt?.balance) > 0) as VelocityDebt[];
  const ranked = rankDebtsVelocity(debts);
  const top3 = ranked.slice(0, 3);
  const next = ranked[0] || null;
  const totalDebt = debts.reduce((sum, debt) => sum + finiteNonNegative(debt.balance), 0);
  const dailyBurn = next ? estimateDailyInterest(finiteNonNegative(next.balance), finiteNonNegative(next.interestRate)) : 0;
  const payoffProjected = hasStablePayoffProjection(input.baseline, input.velocity);
  const velocityScore = payoffProjected
    ? Math.min(100, Math.max(0, Math.round((input.velocity.savings / input.baseline.totalInterest) * 100)))
    : 0;
  const debtFreeDateLabel = payoffProjected
    ? new Date(input.currentTime + input.velocity.months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Review inputs';

  return {
    totalDebt,
    cashFlow: input.cashFlow,
    next,
    dailyBurn,
    velocityScore,
    debtFreeDateLabel,
    payoffProjected,
    top3,
  };
}
