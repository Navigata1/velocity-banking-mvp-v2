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
  let investmentGrowth = 0;
  for (let i = 0; i < freedYears * 12; i++) {
    investmentGrowth = (investmentGrowth + monthlyPayment) * (1 + annualRate / 12);
  }
  return investmentGrowth;
}

export function formatVaultProjectionFailure(reason?: string): string {
  if (reason === 'loc-overlimit') return 'LOC over limit';
  if (reason === 'negative-cashflow') return 'Needs positive cash flow';
  if (reason === 'cashflow-below-minimums') return 'Cash flow below payment';
  if (reason === 'payment-below-interest') return 'Payment below interest';
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

export function buildVaultFreedomPathModel(input: VaultFreedomPathInput): VaultFreedomPathModel {
  const standardYears = Math.ceil(input.standardMonths / 12);
  const canProject =
    input.velocity.isPayoffPossible &&
    input.velocity.months > 0 &&
    input.standardMonths > 0 &&
    input.velocity.months <= input.standardMonths;

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
      standardAgeLabel: `Age ${input.currentAge + standardYears}`,
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
    standardAgeLabel: `Age ${input.currentAge + standardYears}`,
    velocityAgeLabel: `Free at ${input.currentAge + velocityYears}`,
    investmentCaption: `By investing your freed ${formatCurrency(input.monthlyPayment)}/mo for ${freedYears} years @ ${(input.investmentRate * 100).toFixed(0)}% return`,
  };
}
