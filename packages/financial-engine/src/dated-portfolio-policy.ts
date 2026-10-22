import type { PortfolioBook } from './portfolio-book';
import type { DebtItem, DebtPriorityRationale, PortfolioPlanSettings } from './portfolio';
import type { DatedLOCPosition } from './dated-loc';
import { addDatedMonths, datedCivilDate, datedMoneyCents, datedMonthDay, datedRateRatio, roundDatedRatio } from './dated-plan';

export interface DatedAllocationTarget { debt?: DebtItem; balance: number; apr: number }
export interface DatedPortfolioPolicy {
  apr: (debt: DebtItem) => number;
  targets: (debts: DebtItem[], balances: Map<string, number>, settings: PortfolioPlanSettings, loc: number, apr: number) => DatedAllocationTarget[];
  rationales: (debts: DebtItem[], balances: Map<string, number>, settings: PortfolioPlanSettings, loc: number, apr: number) => Record<string, DebtPriorityRationale>;
}
const min = (a: bigint, b: bigint) => a < b ? a : b;
const max = (a: bigint, b: bigint) => a > b ? a : b;

export function datedDebtInterest(debt: DebtItem, balance: bigint, policy: DatedPortfolioPolicy): bigint {
  const rate = datedRateRatio(policy.apr(debt));
  return roundDatedRatio(balance * rate.numerator, rate.denominator * 12n);
}
export function datedDebtMinimum(debt: DebtItem, balance: bigint): bigint {
  if (debt.minPaymentRule.type === 'fixed') return min(balance, datedMoneyCents(debt.minPaymentRule.amount));
  const rate = datedRateRatio(debt.minPaymentRule.percent);
  return min(balance, max(datedMoneyCents(debt.minPaymentRule.floor), roundDatedRatio(balance * rate.numerator, rate.denominator)));
}

export function allocateDatedExtra(capacities: readonly bigint[], budget: bigint, settings: PortfolioPlanSettings): bigint[] {
  if (budget < 0n || capacities.some(value => value < 0n)) throw new Error('Dated allocation requires non-negative capacities and budget.');
  const total = capacities.reduce((sum, value) => sum + value, 0n), working = min(budget, total);
  const preferred = capacities.map(() => 0n);
  if (preferred.length) preferred[0] = working;
  if (settings.focusMode === 'split' && preferred.length > 1) {
    const ratio = datedRateRatio(settings.splitRatioPrimary);
    if (ratio.numerator > ratio.denominator) throw new Error('Dated split ratio cannot exceed1.');
    const primary = working * ratio.numerator, secondary = working * (ratio.denominator - ratio.numerator);
    preferred[0] = primary / ratio.denominator; preferred[1] = secondary / ratio.denominator;
    if (preferred[0] + preferred[1] < working) preferred[primary % ratio.denominator >= secondary % ratio.denominator ? 0 : 1] += 1n;
  }
  let remaining = working;
  const allocated = capacities.map((capacity, index) => {
    const amount = min(remaining, min(capacity, preferred[index])); remaining -= amount; return amount;
  });
  for (let index = 0; index < capacities.length && remaining > 0n; index++) {
    const amount = min(remaining, capacities[index] - allocated[index]); allocated[index] += amount; remaining -= amount;
  }
  return allocated;
}

function nextDay(value: string): string | null {
  const current = datedCivilDate(value), next = new Date(Date.UTC(current.year, current.month - 1, current.day + 1));
  return next.getUTCFullYear() > 9999 ? null : datedMonthDay(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}
function daysBetween(from: string, to: string): number {
  const a = datedCivilDate(from), b = datedCivilDate(to);
  return (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86400000;
}

/** Spendable checking commitments are distinct from the protected reserve floor. */
export function datedCheckingEarmark(book: PortfolioBook, debts: DebtItem[], balances: Map<string, bigint>,
  position: DatedLOCPosition, date: string, afterOrder: number, policy: DatedPortfolioPolicy,
  omitDebtId?: string, payingLOC = false): bigint {
  const plan = book.datedPlan!;
  let end: string;
  try { end = addDatedMonths(date, 1); } catch { end = '9999-12-31'; }
  let checking = 0n, futureStatement = false, potentialLOC = position.locCents > 0n || position.unpostedNumerator > 0n;
  const current = datedCivilDate(date), rate = datedRateRatio(book.loc.apr);
  const firstFee = datedCivilDate(plan.annualFeeFirstDueOn);
  for (let future: string | null = date; future !== null && future <= end; future = nextDay(future)) {
    const civil = datedCivilDate(future), sameDay = future === date;
    for (const [index, event] of plan.cashEvents.entries()) {
      if (datedMonthDay(civil.year, civil.month, event.day) !== future || sameDay && index <= afterOrder) continue;
      if (event.kind === 'income' && event.amount > 0) return checking;
      if (event.kind === 'expense') {
        if (event.source === 'checking') checking += datedMoneyCents(event.amount);
        else if (event.amount > 0) potentialLOC = true;
      }
    }
    if ((!sameDay || afterOrder < 500) && future === datedMonthDay(civil.year, civil.month, plan.debtPaymentDay)) {
      for (const debt of debts) {
        if (debt.id === omitDebtId || debt.paymentSource === 'loc') continue;
        let balance = balances.get(debt.id) ?? 0n;
        if (civil.year !== current.year || civil.month !== current.month) {
          const next = debt.promo ? { ...debt, promo: { ...debt.promo, monthsRemaining: Math.max(0, debt.promo.monthsRemaining - 1) } } : debt;
          balance += datedDebtInterest(next, balance, policy);
        }
        checking += datedDebtMinimum(debt, balance);
      }
    }
    if (!position.closed && (!sameDay || afterOrder < 400) && future === plan.maturesOn) {
      const days = Math.max(0, daysBetween(date, future) - (afterOrder >= 900 ? 1 : 0));
      checking += roundDatedRatio(position.unpostedNumerator + position.locCents * rate.numerator * BigInt(days), rate.denominator * 365n);
    }
    if (!position.closed && future >= plan.annualFeeFirstDueOn && future === datedMonthDay(civil.year, firstFee.month, firstFee.day) && book.loc.lenderTerms!.annualFee! > 0) potentialLOC = true;
    if (!payingLOC && !position.closed && future === position.minimumDueOn && (!sameDay || afterOrder < 400)) {
      checking += min(position.minimumCents, position.locCents);
    }
    if (future === datedMonthDay(civil.year, civil.month, 31) && (!sameDay || afterOrder < 900)) futureStatement = true;
    if (!position.closed && futureStatement && potentialLOC && future === datedMonthDay(civil.year, civil.month, plan.minimumDueDay)
      && future.slice(0, 7) !== date.slice(0, 7)) {
      checking += datedMoneyCents(book.loc.lenderTerms!.minimumPayment!.value);
    }
  }
  return checking;
}
