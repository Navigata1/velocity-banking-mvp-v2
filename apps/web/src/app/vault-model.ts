import { formatCurrency, formatCurrencyPrecise } from '../engine/calculations';

interface VaultVelocityProjection {
  months: number;
  saved: number;
  isPayoffPossible: boolean;
  failureReason?: string;
  canCompare?: boolean;
}

interface VaultStrategyProjection {
  saved: number;
  monthsSaved: number;
  isPayoffPossible: boolean;
  failureReason?: string;
  canCompare?: boolean;
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
  monthlyBudget: number;
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

function calculateFreedPaymentGrowth(monthlyPayment: number, annualRate: number, freedMonths: number): number {
  if (!Number.isFinite(monthlyPayment) || !Number.isFinite(annualRate) || !Number.isInteger(freedMonths)) return 0;
  if (monthlyPayment <= 0 || annualRate < 0 || freedMonths <= 0 || freedMonths > MAX_FREED_PAYMENT_YEARS * 12) return 0;

  let investmentGrowth = 0;
  for (let i = 0; i < freedMonths; i++) {
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
  if (!strategy.isPayoffPossible || strategy.canCompare === false || !Number.isFinite(strategy.saved)) return 'Not projected';
  if (Math.abs(strategy.saved) < 0.005) return 'Same modeled interest';
  const amount = Math.abs(strategy.saved);
  return `${amount < 1 ? formatCurrencyPrecise(amount) : formatCurrency(amount)} ${strategy.saved > 0 ? 'less' : 'more'} modeled interest`;
}

export function formatVaultStrategyTimeDelta(strategy: VaultStrategyProjection, suffix = ''): string {
  if (!strategy.isPayoffPossible || !Number.isFinite(strategy.monthsSaved)) {
    return formatVaultProjectionFailure(strategy.failureReason);
  }
  if (strategy.canCompare === false) return 'Reference needs review';
  if (strategy.monthsSaved === 0) return 'No faster payoff';
  return `${Math.abs(strategy.monthsSaved)} month${Math.abs(strategy.monthsSaved) === 1 ? '' : 's'} ${strategy.monthsSaved > 0 ? 'faster' : 'slower'}${suffix}`;
}

export function formatVaultStrategyMonths(strategy: VaultMonthsProjection): string {
  if (!strategy.isPayoffPossible || !Number.isFinite(strategy.months) || strategy.months < 0) {
    return 'Review inputs';
  }
  if (strategy.months === 0) return 'Paid off';
  return `${strategy.months} mo`;
}

export function formatVaultCashAtPayoff(strategy: { cashAtPayoff: number; isPayoffPossible: boolean }): string {
  if (!strategy.isPayoffPossible || !Number.isFinite(strategy.cashAtPayoff)) return 'Cash at payoff: Not projected';
  return `Cash at payoff: ${strategy.cashAtPayoff < 1 ? formatCurrencyPrecise(strategy.cashAtPayoff) : formatCurrency(strategy.cashAtPayoff)}`;
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

export function buildVaultComparisonMaxMonths(plans: VaultMonthsProjection[]): number {
  return Math.max(0, ...plans.filter(plan => plan.isPayoffPossible && Number.isInteger(plan.months) && plan.months >= 0).map(plan => plan.months));
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
  if (input.standardMonths === 0 && input.velocity.months === 0 && input.velocity.isPayoffPossible && input.velocity.canCompare !== false) {
    return { isProjected: false, standardYears: 0, velocityYears: 0, freedYears: 0, investmentGrowth: 0,
      interestSavedLabel: 'Already paid off', freedomYearsLabel: 'Paid off',
      portfolioValueLabel: 'Not projected', timelineLabel: 'Already paid off',
      standardAgeLabel: 'Already paid off', velocityAgeLabel: 'Already paid off',
      investmentCaption: 'No remaining payoff period to illustrate. Existing savings are not estimated here.',
    };
  }
  const canProject =
    input.velocity.isPayoffPossible &&
    input.velocity.canCompare !== false &&
    Number.isInteger(input.velocity.months) &&
    Number.isFinite(input.velocity.saved) &&
    Number.isInteger(input.standardMonths) &&
    Number.isFinite(input.monthlyPayment) &&
    Number.isFinite(input.monthlyBudget) && input.monthlyBudget > 0 &&
    Number.isFinite(input.investmentRate) &&
    input.velocity.months > 0 &&
    input.standardMonths > 0 &&
    input.monthlyPayment >= 0 &&
    input.investmentRate >= 0 &&
    Math.ceil(input.velocity.months / 12) <= MAX_FREED_PAYMENT_YEARS &&
    standardYears <= MAX_FREED_PAYMENT_YEARS;
  const monthsEarlier = input.standardMonths - input.velocity.months;
  const contribution = Math.min(input.monthlyPayment, input.monthlyBudget);
  const investmentGrowth = canProject ? calculateFreedPaymentGrowth(contribution, input.investmentRate, Math.max(0, monthsEarlier)) : 0;

  if (!canProject || !Number.isFinite(investmentGrowth)) {
    return {
      isProjected: false,
      standardYears,
      velocityYears: 0,
      freedYears: 0,
      investmentGrowth: 0,
      interestSavedLabel: 'Not projected',
      freedomYearsLabel: 'Review inputs',
      portfolioValueLabel: 'Not projected',
      timelineLabel: 'Illustration needs review',
      standardAgeLabel: standardYears > 0 ? `Age ${safeCurrentAge + standardYears}` : 'Review inputs',
      velocityAgeLabel: 'Review inputs',
      investmentCaption: 'Review payoff horizons, available budget and return assumptions before estimating contributions.',
    };
  }

  const velocityYears = Math.ceil(input.velocity.months / 12);
  const freedYears = Math.max(0, monthsEarlier) / 12;
  const portfolioValueLabel = investmentGrowth < 1e6 ? formatCurrencyPrecise(investmentGrowth)
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
      notation: investmentGrowth < 1e15 ? 'compact' : 'scientific', maximumFractionDigits: 2 }).format(investmentGrowth);

  return {
    isProjected: true,
    standardYears,
    velocityYears,
    freedYears,
    investmentGrowth,
    interestSavedLabel: formatVaultStrategySavings({ ...input.velocity, monthsSaved: monthsEarlier }),
    freedomYearsLabel: `${freedYears.toFixed(1)} years`,
    portfolioValueLabel,
    timelineLabel: monthsEarlier === 0 ? 'Same modeled payoff month'
      : `${Math.abs(monthsEarlier)} month${Math.abs(monthsEarlier) === 1 ? '' : 's'} ${monthsEarlier > 0 ? 'earlier' : 'later'}`,
    standardAgeLabel: `Age ${(safeCurrentAge + input.standardMonths / 12).toFixed(1)}`,
    velocityAgeLabel: `Paid off at ${(safeCurrentAge + input.velocity.months / 12).toFixed(1)}`,
    investmentCaption: monthsEarlier > 0
      ? `Illustration: assume a ${formatCurrencyPrecise(contribution)}/mo contribution at each month start for ${monthsEarlier} months @ ${formatVaultPercentLabel(input.investmentRate * 100)} annual return. This is not incremental savings; excludes cash reserves and is not a net-wealth comparison.`
      : 'No earlier payoff in this model; no freed-payment growth is projected.',
  };
}
