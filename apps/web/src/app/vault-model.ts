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

interface VaultMonthsProjection {
  months: number;
  isPayoffPossible: boolean;
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

export interface VaultVelocitySetupWarningInput {
  isPayoffPossible: boolean;
  failureReason?: string;
}

export interface VaultVelocitySetupWarning {
  title: string;
  body: string;
  severity: 'warning' | 'critical';
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
  if (reason === 'loc-setup') return 'Enter LOC terms';
  if (reason === 'loc-no-capacity') return 'No LOC room';
  if (reason === 'loc-overlimit') return 'LOC over limit';
  if (reason === 'negative-cashflow') return 'Needs positive cash flow';
  if (reason === 'cashflow-below-minimums') return 'Cash flow below payment';
  if (reason === 'payment-below-interest') return 'Payment below interest';
  if (reason === 'payoff-horizon-exceeded') return 'Extend projection horizon';
  return 'Review inputs';
}

export function buildVaultVelocitySetupWarning(
  velocity: VaultVelocitySetupWarningInput
): VaultVelocitySetupWarning | null {
  if (velocity.isPayoffPossible) return null;

  if (velocity.failureReason === 'loc-setup') {
    return {
      title: 'Enter known LOC terms',
      body: 'Vault velocity projections need known LOC or HELOC limit, APR, fees, and draw rules before the mortgage path can be trusted.',
      severity: 'warning',
    };
  }

  if (velocity.failureReason === 'loc-no-capacity') {
    return {
      title: 'No LOC room available',
      body: 'The entered LOC balance is at the limit. Pay the LOC down or adjust the assumptions before modeling another mortgage chunk.',
      severity: 'warning',
    };
  }

  if (velocity.failureReason === 'loc-overlimit') {
    return {
      title: 'LOC balance above limit',
      body: 'The entered LOC balance is above the limit. Bring it back within the entered terms before relying on Vault velocity projections.',
      severity: 'critical',
    };
  }

  if (velocity.failureReason === 'negative-cashflow' || velocity.failureReason === 'cashflow-below-minimums') {
    return {
      title: 'Cash flow needs room first',
      body: 'Vault velocity projections need enough monthly cash flow to cover the mortgage payment and recover LOC draws.',
      severity: 'warning',
    };
  }

  if (velocity.failureReason === 'payment-below-interest') {
    return {
      title: 'Mortgage payment needs review',
      body: 'The entered mortgage payment does not support a stable payoff projection. Review payment, rate, and remaining balance before comparing strategies.',
      severity: 'critical',
    };
  }

  if (velocity.failureReason === 'payoff-horizon-exceeded') {
    return {
      title: 'Projection horizon needs review',
      body: 'The modeled mortgage path does not finish inside the current projection horizon. Extend the horizon or review the payment assumptions.',
      severity: 'warning',
    };
  }

  return {
    title: 'Vault projection needs review',
    body: 'Review mortgage, cash-flow, and LOC assumptions before relying on the velocity path.',
    severity: 'warning',
  };
}

export function formatVaultStrategySavings(strategy: VaultStrategyProjection): string {
  if (!strategy.isPayoffPossible || !Number.isFinite(strategy.saved)) return 'Not projected';
  return strategy.saved > 0.005 ? `Saves ${formatCurrency(strategy.saved)}` : 'No interest savings';
}

export function formatVaultStrategyTimeDelta(strategy: VaultStrategyProjection, suffix = ''): string {
  if (!strategy.isPayoffPossible || !Number.isFinite(strategy.monthsSaved)) {
    return formatVaultProjectionFailure(strategy.failureReason);
  }
  return strategy.monthsSaved > 0 ? `${strategy.monthsSaved} months faster${suffix}` : 'No faster payoff';
}

export function formatVaultStrategyMonths(strategy: VaultMonthsProjection): string {
  if (!strategy.isPayoffPossible || !Number.isFinite(strategy.months) || strategy.months <= 0) {
    return 'Review inputs';
  }
  return `${strategy.months} mo`;
}

export function formatVaultStrategyInterest(totalInterest: number, isPayoffPossible: boolean): string {
  if (!isPayoffPossible || !Number.isFinite(totalInterest)) return 'Not projected';
  return `${formatCurrency(totalInterest)} interest`;
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

export function formatVaultPercentLabel(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return 'Review inputs';
  const safeDecimals = Number.isFinite(decimals) ? Math.min(2, Math.max(0, Math.round(decimals))) : 0;
  return `${value.toFixed(safeDecimals)}%`;
}

export function formatVaultYearsLabel(value: number, decimals = 1): string {
  if (!Number.isFinite(value) || value < 0) return 'Review inputs';
  const safeDecimals = Number.isFinite(decimals) ? Math.min(2, Math.max(0, Math.round(decimals))) : 1;
  return `${value.toFixed(safeDecimals)} years`;
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
    investmentCaption: `By investing your freed ${formatCurrency(input.monthlyPayment)}/mo for ${freedYears} years @ ${formatVaultPercentLabel(input.investmentRate * 100)} return`,
  };
}
