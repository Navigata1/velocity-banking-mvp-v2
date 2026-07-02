const GAUGE_CIRCUMFERENCE = 251;

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function buildBoundedGaugeDash(value: number, target: number): string {
  const safeTarget = Number.isFinite(target) && target > 0 ? target : 1;
  const fill = clampRatio(value / safeTarget);
  return `${Math.round(fill * GAUGE_CIRCUMFERENCE)} ${GAUGE_CIRCUMFERENCE}`;
}

export function buildDebtBalanceGaugeDash(balance: number): string {
  return buildBoundedGaugeDash(balance, 50000);
}

export function buildDebtFreedomProgressPercent(balance: number, referenceBalance = 50000): number {
  const safeReference = Number.isFinite(referenceBalance) && referenceBalance > 0 ? referenceBalance : 50000;
  if (!Number.isFinite(balance)) return 0;
  const progress = (safeReference - balance) / safeReference;
  return Math.round(clampRatio(progress) * 100);
}

export function buildCashFlowGaugeDash(cashFlow: number): string {
  return buildBoundedGaugeDash(cashFlow, 3000);
}
