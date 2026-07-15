import type {
  MobileDashboardInput,
  MobileDashboardSnapshot,
  MobilePortfolioPathPoint,
} from '@interestshield/financial-engine';

type MobileLoopStep = MobileDashboardSnapshot['loop'][number];

export function recoveryChoiceAccessibilityLabel(
  input: MobileDashboardInput,
  prefix: string,
  savedAt?: string
): string {
  const saved = savedAt ? ` Saved ${new Date(savedAt).toLocaleString()}.` : '';
  const term = input.activeDebt.termMonths ?? 'not set';
  return `${prefix}.${saved} Income $${input.monthlyIncome.toLocaleString()}, expenses $${input.monthlyExpenses.toLocaleString()}, chunk $${input.chunkAmount.toLocaleString()}. ${input.activeDebtName} balance $${input.activeDebt.balance.toLocaleString()} at ${(input.activeDebt.apr * 100).toFixed(2)} percent APR, payment $${input.activeDebt.monthlyPayment.toLocaleString()}, term ${term} months. LOC balance $${input.loc.balance.toLocaleString()} of $${input.loc.limit.toLocaleString()} at ${(input.loc.apr * 100).toFixed(2)} percent APR.`;
}

export function mobileLoopStepAccessibilityValue(step: MobileLoopStep): string {
  return `${step.value}. ${step.detail}`;
}

export function portfolioPointAccessibilityLabel(point: MobilePortfolioPathPoint): string {
  return `Month ${point.month}, balance $${Math.round(point.balance).toLocaleString()}, ${Math.round(point.progressPercent)} percent paid`;
}
