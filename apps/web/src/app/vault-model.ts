import { formatCurrency } from '../engine/calculations';

interface VaultVelocityProjection {
  months: number;
  saved: number;
  isPayoffPossible: boolean;
  failureReason?: string;
}

interface VaultStrategyProjection {
  saved: number;
  monthsSaved: number;
  isPayoffPossible: boolean;
  failureReason?: string;
}

const MAX_FREED_PAYMENT_YEARS = 100;

export interface VaultFreedomPathInput {
  currentAge: number;
  standardMonths: number;
  velocity: VaultVelocityProjection;
  monthlyPayment: number;
  investmentRate: number;
}

export interface VaultFreedomPathModel {
  isProjected: boolean;
  standardYears: number;
  velocityYears: number;
  freedYears: number;
  investmentGrowth: number;
  interestSavedLabel: string;
  freedomYearsLabel: string;
  portfolioValueLabel: string;
  timelineLabel: string;
  standardAgeLabel: string;
  velocityAgeLabel: string;
  investmentCaption: string;
}

function calculateFreedPaymentGrowth(monthlyPayment: number, annualRate: number, freedYears: number): number {
  if (!Number.isFinite(monthlyPayment) || !Number.isFinite(annualRate) || !Number.isFinite(freedYears)) return 0;
  if (monthlyPayment <= 0 || annualRate < 0 || freedYears <= 0 || freedYears > MAX_FREED_PAYMENT_YEARS) return 0;

  let investmentGrowth = 0;
  for (let i = 0; i < freedYears * 12; i++) {
    investmentGrowth = (investmentGrowth + monthlyPayment) * (1 + annualRate / 12);
  }
  return investmentGrowth;
}

export function formatVaultProjectionFailure(reason?: string): string {
  if (reason === 'loc-setup') return 'Add LOC limit';
  if (reason === 'loc-no-capacity') return 'No LOC room';
  if (reason === 'loc-overlimit') return 'LOC over limit';
  if (reason === 'negative-cashflow') return 'Needs positive cash flow';
  if (reason === 'cashflow-below-minimums') return 'Cash flow below payment';
  if (reason === 'payment-below-interest') return 'Payment below interest';
  if (reason === 'payoff-horizon-exceeded') return 'Extend projection horizon';
  return 'Review inputs';
}

export function formatVaultStrategySavings(strategy: VaultStrategyProjection): string {
  if (!strategy.isPayoffPossible) return 'Not projected';
  return strategy.saved > 0.005 ? `Saves ${formatCurrency(strategy.saved)}` : 'No interest savings';
}

export function formatVaultStrategyTimeDelta(strategy: VaultStrategyProjection, suffix = ''): string {
  if (!strategy.isPayoffPossible) return formatVaultProjectionFailure(strategy.failureReason);
  return strategy.monthsSaved > 0 ? `${strategy.monthsSaved} months faster${suffix}` : 'No faster payoff';
}

export function buildVaultComparisonWidthPercent(
  strategyMonths: number,
  standardMonths: number,
  isPayoffPossible: boolean
): number {
  if (!isPayoffPossible) return 0;

  return buildVaultVisualPercent(strategyMonths, standardMonths);
}

export function buildVaultVisualPercent(value: number, maxValue = 100): number {
  if (!Number.isFinite(value) || !Number.isFinite(maxValue)) return 0;
  if (value <= 0 || maxValue <= 0) return 0;

  return Math.min(100, Math.max(0, (value / maxValue) * 100));
}

export function buildVaultFreedomPathModel(input: VaultFreedomPathInput): VaultFreedomPathModel {
  const standardYears = Number.isFinite(input.standardMonths) && input.standardMonths > 0
    ? Math.ceil(input.standardMonths / 12)
    : 0;
  const safeCurrentAge = Number.isFinite(input.currentAge) && input.currentAge >= 0 ? input.currentAge : 0;
  const canProject =
    input.velocity.isPayoffPossible &&
    Number.isFinite(input.velocity.months) &&
    Number.isFinite(input.velocity.saved) &&
    Number.isFinite(input.standardMonths) &&
    Number.isFinite(input.monthlyPayment) &&
    Number.isFinite(input.investmentRate) &&
    input.velocity.months > 0 &&
    input.standardMonths > 0 &&
    input.monthlyPayment >= 0 &&
    input.investmentRate >= 0 &&
    input.velocity.months <= input.standardMonths &&
    standardYears <= MAX_FREED_PAYMENT_YEARS;

  if (!canProject) {
    return {
      isProjected: false,
      standardYears,
      velocityYears: 0,
      freedYears: 0,
      investmentGrowth: 0,
      interestSavedLabel: 'Not projected',
      freedomYearsLabel: 'Review inputs',
      portfolioValueLabel: 'Not projected',
      timelineLabel: 'Velocity path needs usable inputs first',
      standardAgeLabel: standardYears > 0 ? `Age ${safeCurrentAge + standardYears}` : 'Review inputs',
      velocityAgeLabel: 'Review inputs',
      investmentCaption: 'Velocity payoff needs usable inputs before freed-payment growth can be estimated.',
    };
  }

  const velocityYears = Math.ceil(input.velocity.months / 12);
  const freedYears = Math.max(0, standardYears - velocityYears);
  const investmentGrowth = calculateFreedPaymentGrowth(
    input.monthlyPayment,
    input.investmentRate,
    freedYears
  );

  return {
    isProjected: true,
    standardYears,
    velocityYears,
    freedYears,
    investmentGrowth,
    interestSavedLabel: formatCurrency(input.velocity.saved),
    freedomYearsLabel: `${freedYears} years`,
    portfolioValueLabel: formatCurrency(investmentGrowth),
    timelineLabel: 'Velocity path projected',
    standardAgeLabel: `Age ${safeCurrentAge + standardYears}`,
    velocityAgeLabel: `Free at ${safeCurrentAge + velocityYears}`,
    investmentCaption: `By investing your freed ${formatCurrency(input.monthlyPayment)}/mo for ${freedYears} years @ ${(input.investmentRate * 100).toFixed(0)}% return`,
  };
}
