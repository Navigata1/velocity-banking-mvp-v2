import { hasFiniteNonNegativeSum } from './numeric-range';
import { datedOutputCents } from './dated-plan';

export const COMMON_MONTH_LIMIT = 600;
export type CommonMonthReason = 'invalid-horizon' | 'invalid-input' | 'invalid-trace'
  | 'inconsistent-trace' | 'numeric-range-exceeded' | 'incomplete-horizon'
  | 'cent-tolerance' | 'negative-cashflow';

export interface CommonMonthPosition {
  balances: Readonly<Record<string, number>>;
  locBalance: number;
  cashBalance: number;
}
export interface CommonMonthRow extends CommonMonthPosition { month: number; interest: number; fees?: number }
export interface CommonMonthInput {
  includeFees?: boolean;
  allowNegativeBudget?: boolean;
  cashReserve?: number;
  horizonMonths: number;
  monthlyBudget: number;
  initial: CommonMonthPosition;
  projection: { rows: readonly CommonMonthRow[]; payoffPossible: boolean; payoffMonth: number };
}
interface SnapshotCoverage { horizonMonths: number | null; coveredThroughMonth: number }
export interface UnavailableCommonMonth extends SnapshotCoverage {
  feesThroughMonth?: null;
  status: 'unavailable'; reason: CommonMonthReason;
  balances: null; debtBalance: null; locBalance: null; cashBalance: null;
  netModeledWealth: null; interestThroughMonth: null; budgetThroughMonth: null;
}
export interface AvailableCommonMonth extends SnapshotCoverage {
  feesThroughMonth?: number;
  status: 'initial' | 'modeled' | 'post-payoff-cash';
  balances: Record<string, number>; debtBalance: number; locBalance: number; cashBalance: number;
  netModeledWealth: number; interestThroughMonth: number; budgetThroughMonth: number;
}
export type CommonMonthSnapshot = AvailableCommonMonth | UnavailableCommonMonth;

export function isCommonMonth(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= COMMON_MONTH_LIMIT;
}
export function unavailableCommonMonth(horizonMonths: number | null, reason: CommonMonthReason, coveredThroughMonth = 0): UnavailableCommonMonth {
  return { status: 'unavailable', horizonMonths, coveredThroughMonth, reason, balances: null,
    debtBalance: null, locBalance: null, cashBalance: null, netModeledWealth: null,
    interestThroughMonth: null, budgetThroughMonth: null };
}
const amount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const centLimit = 100_000_000_000_000n;
function exactCents(value: number): bigint | null {
  try { return value < 0 ? -datedOutputCents(-value) : datedOutputCents(value); } catch { return null; }
}
function sum(values: readonly number[]): number | null {
  return hasFiniteNonNegativeSum(values) ? values.reduce((total, value) => total + value, 0) : null;
}
function positionValid(position: CommonMonthPosition, ids: readonly string[]): boolean {
  return !!position && !!position.balances && typeof position.balances === 'object' && !Array.isArray(position.balances)
    && Object.keys(position.balances).length === ids.length
    && ids.every(id => Object.prototype.hasOwnProperty.call(position.balances, id) && amount(position.balances[id]))
    && amount(position.locBalance) && amount(position.cashBalance);
}
function values(position: CommonMonthPosition): number[] { return [...Object.values(position.balances), position.locBalance]; }
// Keep representable residuals when large cash and liability terms cancel.
export function sumCommonMonthTerms(terms: readonly number[]): number | null {
  let partials: number[] = [];
  for (let term of terms) {
    if (!Number.isFinite(term)) return null;
    const next: number[] = [];
    for (const part of partials) {
      const combined = term + part;
      if (!Number.isFinite(combined)) return null;
      const recovered = combined - term;
      const residual = (term - (combined - recovered)) + (part - recovered);
      if (residual !== 0) next.push(residual);
      term = combined;
    }
    next.push(term);
    partials = next;
  }
  const total = partials.reduce((result, part) => result + part, 0);
  return Number.isFinite(total) ? total : null;
}
function view(position: CommonMonthPosition, horizonMonths: number, coveredThroughMonth: number,
  status: AvailableCommonMonth['status'], interestThroughMonth: number, budgetThroughMonth: number, feesThroughMonth?: number): CommonMonthSnapshot {
  let debtBalance = sum(Object.values(position.balances)), liabilities = sum(values(position));
  let netModeledWealth = sumCommonMonthTerms([position.cashBalance, ...values(position).map(value => -value)]);
  if (feesThroughMonth !== undefined) {
    const debt = Object.values(position.balances).map(exactCents), loc = exactCents(position.locBalance), cash = exactCents(position.cashBalance);
    if (debt.some(value => value === null) || loc === null || cash === null) return unavailableCommonMonth(horizonMonths, 'invalid-trace', coveredThroughMonth);
    const totalDebt = (debt as bigint[]).reduce((total, value) => total + value, 0n), total = totalDebt + loc;
    if (total > centLimit || cash > centLimit) return unavailableCommonMonth(horizonMonths, 'numeric-range-exceeded', coveredThroughMonth);
    debtBalance = Number(totalDebt) / 100; liabilities = Number(total) / 100; netModeledWealth = Number(cash - total) / 100;
  }
  if (debtBalance === null || liabilities === null || netModeledWealth === null
    || !amount(interestThroughMonth) || !Number.isFinite(budgetThroughMonth) || feesThroughMonth !== undefined && !amount(feesThroughMonth)) {
    return unavailableCommonMonth(horizonMonths, 'numeric-range-exceeded', coveredThroughMonth);
  }
  return { status, horizonMonths, coveredThroughMonth, balances: { ...position.balances }, debtBalance,
    locBalance: position.locBalance, cashBalance: position.cashBalance,
    netModeledWealth, interestThroughMonth, budgetThroughMonth, ...(feesThroughMonth === undefined ? {} : { feesThroughMonth }) };
}

export function snapshotAtMonth(input: CommonMonthInput): CommonMonthSnapshot {
  const horizon = input?.horizonMonths;
  if (!isCommonMonth(horizon)) return unavailableCommonMonth(null, 'invalid-horizon');
  const initial = input.initial, ids = initial?.balances ? Object.keys(initial.balances) : [];
  const feesEnabled = input.includeFees === true, reserve = input.cashReserve ?? 0;
  const budgetCents = feesEnabled ? exactCents(input.monthlyBudget) : null;
  if (!Number.isFinite(input.monthlyBudget) || !positionValid(initial, ids)
    || ids.some(id => !id.trim() || ['__proto__', 'constructor', 'prototype'].includes(id))
    || input.includeFees !== undefined && typeof input.includeFees !== 'boolean'
    || input.allowNegativeBudget !== undefined && typeof input.allowNegativeBudget !== 'boolean'
    || input.allowNegativeBudget === true && !feesEnabled || !amount(reserve) || initial.cashBalance < reserve
    || feesEnabled && budgetCents === null) {
    return unavailableCommonMonth(horizon, 'invalid-input');
  }
  const initialLiabilities = sum(values(initial));
  if (initialLiabilities === null) return unavailableCommonMonth(horizon, 'numeric-range-exceeded');
  if (horizon === 0) return view(initial, 0, 0, 'initial', 0, 0, feesEnabled ? 0 : undefined);
  if (input.monthlyBudget < 0 && input.allowNegativeBudget !== true) return unavailableCommonMonth(horizon, 'negative-cashflow');
  const projection = input.projection;
  if (!projection || !Array.isArray(projection.rows) || typeof projection.payoffPossible !== 'boolean'
    || !isCommonMonth(projection.payoffMonth) || projection.rows.length > COMMON_MONTH_LIMIT) {
    return unavailableCommonMonth(horizon, 'invalid-trace');
  }
  let interest = 0, selected: CommonMonthSnapshot | undefined;
  const interestTerms: number[] = [];
  let interestCents = 0n, feeCents = 0n;
  for (const [index, row] of projection.rows.slice(0, horizon).entries()) {
    if (!row || typeof row !== 'object' || row.month !== index + 1 || !positionValid(row, ids) || !amount(row.interest)
      || row.cashBalance < reserve || feesEnabled && (!Object.prototype.hasOwnProperty.call(row, 'fees') || !amount(row.fees))
      || !feesEnabled && Object.prototype.hasOwnProperty.call(row, 'fees')) {
      return unavailableCommonMonth(horizon, 'invalid-trace', index);
    }
    interestTerms.push(row.interest);
    const liabilities = sum(values(row));
    let cumulative = sumCommonMonthTerms(interestTerms), budget = row.month * input.monthlyBudget;
    if (feesEnabled) {
      const rowInterest = exactCents(row.interest), rowFees = exactCents(row.fees!);
      const terms = [row.cashBalance, -initial.cashBalance,
        ...ids.flatMap(id => [initial.balances[id], -row.balances[id]]), initial.locBalance, -row.locBalance].map(exactCents);
      if (rowInterest === null || rowFees === null || terms.some(value => value === null)) return unavailableCommonMonth(horizon, 'invalid-trace', index);
      interestCents += rowInterest; feeCents += rowFees;
      const budgetTotal = BigInt(row.month) * budgetCents!;
      if (interestCents > centLimit || feeCents > centLimit || budgetTotal > centLimit || budgetTotal < -centLimit) return unavailableCommonMonth(horizon, 'numeric-range-exceeded', index);
      const residual = (terms as bigint[]).reduce((total, value) => total + value, 0n) - budgetTotal + interestCents + feeCents;
      if (residual !== 0n) return unavailableCommonMonth(horizon, 'inconsistent-trace', index);
      cumulative = Number(interestCents) / 100; budget = Number(budgetTotal) / 100;
    }
    if (liabilities === null || cumulative === null || !hasFiniteNonNegativeSum(interestTerms) || !Number.isFinite(budget)) {
      return unavailableCommonMonth(horizon, 'numeric-range-exceeded', index);
    }
    const conservationResidual = sumCommonMonthTerms([row.cashBalance, -initial.cashBalance,
      ...ids.flatMap(id => [initial.balances[id], -row.balances[id]]),
      initial.locBalance, -row.locBalance, -budget, ...interestTerms]);
    if (conservationResidual === null) return unavailableCommonMonth(horizon, 'numeric-range-exceeded', index);
    // Bound floating-intermediate drift without forgiving a cent or lost inventory.
    const scale = Math.max(1, initialLiabilities, initial.cashBalance, budget, cumulative, liabilities, row.cashBalance);
    const tolerance = Math.min(0.0001, Math.max(1e-8, Number.EPSILON * scale * (row.month + 1) * 16));
    if (!feesEnabled && Math.abs(conservationResidual) > tolerance) return unavailableCommonMonth(horizon, 'inconsistent-trace', index);
    interest = cumulative;
    if (row.month === horizon) selected = view(row, horizon, horizon, 'modeled', interest, budget, feesEnabled ? Number(feeCents) / 100 : undefined);
  }
  if (selected) return selected;
  const covered = projection.rows.length, terminal = projection.rows[covered - 1] ?? initial;
  if (values(terminal).some(value => value !== 0)) {
    const toleranceClearance = projection.payoffPossible && values(terminal).every(value => value <= 0.01);
    return unavailableCommonMonth(horizon, toleranceClearance ? 'cent-tolerance' : 'incomplete-horizon', covered);
  }
  if (!projection.payoffPossible || projection.payoffMonth !== covered) return unavailableCommonMonth(horizon, 'incomplete-horizon', covered);
  const terminalCents = feesEnabled ? exactCents(terminal.cashBalance) : null;
  const cashBalance = feesEnabled && terminalCents !== null ? Number(terminalCents + BigInt(horizon - covered) * budgetCents!) / 100
    : terminal.cashBalance + (horizon - covered) * input.monthlyBudget;
  if (input.allowNegativeBudget === true && cashBalance < reserve) return unavailableCommonMonth(horizon, 'negative-cashflow', covered);
  if (!amount(cashBalance)) return unavailableCommonMonth(horizon, 'numeric-range-exceeded', covered);
  return view({ ...terminal, cashBalance }, horizon, covered, 'post-payoff-cash', interest,
    feesEnabled ? Number(BigInt(horizon) * budgetCents!) / 100 : horizon * input.monthlyBudget,
    feesEnabled ? Number(feeCents) / 100 : undefined);
}
