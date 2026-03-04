/**
 * Shared Calculation Utilities
 *
 * Common formatting and interest calculation helpers used across the engine.
 */

// ─── Currency Formatting ─────────────────────────────────────────────

/**
 * Format a number as USD currency (no cents).
 */
export function formatCurrency(amount: number): string {
  if (!isFinite(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number as USD currency with cents.
 */
export function formatCurrencyPrecise(amount: number): string {
  if (!isFinite(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as a percentage.
 */
export function formatPercent(value: number, decimals: number = 1): string {
  // Handle both decimal (0.069) and percentage (6.9) inputs
  const normalized = value > 1 ? value : value * 100;
  return `${normalized.toFixed(decimals)}%`;
}

// ─── Date Formatting ─────────────────────────────────────────────────

/**
 * Calculate a date N months from now and format it.
 */
export function formatDate(monthsFromNow: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Format a number of months as "Xy Ym" or "N months".
 */
export function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${months} months`;
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years}y ${remainingMonths}m`;
}

// ─── Interest Calculations ───────────────────────────────────────────

/**
 * Calculate monthly interest rate from APR.
 */
export function calculateMonthlyRate(apr: number): number {
  return apr / 12;
}

/**
 * Calculate daily interest rate from APR.
 */
export function calculateDailyRate(apr: number): number {
  return apr / 365;
}

/**
 * Estimate daily interest charge on a balance.
 * Handles both decimal (0.069) and percentage (6.9) APR inputs.
 */
export function estimateDailyInterest(balance: number, apr: number): number {
  const rate = apr > 1 ? apr / 100 : apr;
  return Math.max(0, balance) * rate / 365;
}

/**
 * Calculate cash flow (income minus expenses).
 */
export function calculateCashFlow(income: number, expenses: number): number {
  return income - expenses;
}

// ─── Loan Calculations ───────────────────────────────────────────────

/**
 * Calculate the standard amortization monthly payment.
 */
export function calculateAmortizationPayment(principal: number, apr: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return principal / termMonths;
  return principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

/**
 * Calculate total interest paid over the life of an amortized loan.
 */
export function calculateTotalAmortizationInterest(principal: number, apr: number, termMonths: number): number {
  const payment = calculateAmortizationPayment(principal, apr, termMonths);
  return Math.max(0, payment * termMonths - principal);
}
