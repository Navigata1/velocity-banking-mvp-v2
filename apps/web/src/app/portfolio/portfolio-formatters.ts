import type { DebtItem, PayoffStrategy } from '@/engine/portfolio';
import type { PortfolioRunChangeDirection, PortfolioRunComparisonStatus } from '@/engine/portfolio-run-diff';

export const ALL_CATEGORIES: DebtItem['category'][] = [
  'mortgage', 'auto', 'credit_card', 'student_loan', 'personal_loan', 'medical', 'land', 'purchase_plan', 'custom',
];

export function categoryLabel(cat: DebtItem['category']): string {
  const labels: Record<string, string> = {
    mortgage: 'Mortgage', auto: 'Auto', credit_card: 'Credit Card',
    student_loan: 'Student Loan', personal_loan: 'Personal Loan',
    medical: 'Medical', land: 'Land', purchase_plan: 'Purchase Plan', custom: 'Custom',
  };
  return labels[cat] || 'Custom';
}

export function categoryIcon(cat: DebtItem['category']): string {
  const icons: Record<string, string> = {
    mortgage: '🏠', auto: '🚗', credit_card: '💳', student_loan: '🎓',
    personal_loan: '💵', medical: '🏥', land: '🏞️', purchase_plan: '🛒', custom: '➕',
  };
  return icons[cat] || '📌';
}

export function paymentSourceLabel(src: DebtItem['paymentSource']): string {
  return src === 'checking' ? 'Checking-only' : src === 'loc' ? 'LOC/HELOC' : 'Either';
}

export function strategyLabel(s: PayoffStrategy): string {
  if (s === 'velocity') return 'Velocity Mode';
  if (s === 'snowball') return 'Snowball';
  return 'Avalanche';
}

export function strategyDescription(s: PayoffStrategy): string {
  if (s === 'velocity') return 'Planning default: ranks debts for cash-flow unlock, then daily interest burn. Compare Simulator cards before treating it as fastest or lowest-interest.';
  if (s === 'snowball') return 'Smallest balance first for fast wins and motivation.';
  return 'Highest APR first to minimize total interest (classic math-optimal approach).';
}

export function debtKindLabel(k: DebtItem['kind']): string {
  return k === 'amortized' ? 'Amortized' : k === 'revolving' ? 'Revolving' : 'Simple';
}

export function runChangeTone(direction: PortfolioRunChangeDirection): string {
  if (direction === 'improved') return 'text-emerald-300';
  if (direction === 'worsened') return 'text-rose-300';
  return 'text-sky-300';
}

export function runComparisonStatusLabel(status: PortfolioRunComparisonStatus): string {
  if (status === 'baseline') return 'Baseline';
  if (status === 'changed') return 'Updated';
  return 'Stable';
}

export function getMinPaymentValue(debt: DebtItem): number {
  if (debt.minPaymentRule.type === 'fixed') return debt.minPaymentRule.amount;
  return Math.max(debt.minPaymentRule.floor, debt.balance * debt.minPaymentRule.percent);
}

export function formatPortfolioPercentLabel(value: number): string {
  if (!Number.isFinite(value)) return 'Review inputs';
  return `${Math.round(value * 100)}%`;
}
