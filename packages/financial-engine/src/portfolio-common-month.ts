import { decodePortfolioBook, portfolioBookInputs, type PortfolioBook } from './portfolio-book';
import { simulatePortfolio, type PayoffStrategy } from './portfolio';
import { isCommonMonth, snapshotAtMonth, sumCommonMonthTerms, unavailableCommonMonth, type CommonMonthSnapshot } from './common-month';

const strategies: readonly PayoffStrategy[] = ['velocity', 'snowball', 'avalanche'];
export interface PortfolioCommonMonthPlan {
  strategy: PayoffStrategy;
  snapshot: CommonMonthSnapshot;
  wealthDifference: number | null;
  payoff: { possible: boolean; months: number; reason?: string } | null;
}
export interface PortfolioCommonMonthComparison {
  horizonMonths: number | null;
  monthlyBudget: number | null;
  referenceStrategy: PayoffStrategy | null;
  plans: PortfolioCommonMonthPlan[];
}

function rejectedComparison(reason: 'invalid-input' | 'invalid-horizon', horizonMonths: number): PortfolioCommonMonthComparison {
  return {
    horizonMonths: isCommonMonth(horizonMonths) ? horizonMonths : null, monthlyBudget: null, referenceStrategy: null,
    plans: strategies.map(strategy => ({ strategy, snapshot: unavailableCommonMonth(isCommonMonth(horizonMonths) ? horizonMonths : null, reason), wealthDifference: null, payoff: null })),
  };
}
export interface PreparedPortfolioComparison { atMonth: (horizonMonths: number) => PortfolioCommonMonthComparison }

export function preparePortfolioComparison(value: PortfolioBook): PreparedPortfolioComparison {
  let book: PortfolioBook;
  try { book = decodePortfolioBook(value); } catch {
    return Object.freeze({ atMonth: (horizon: number) => rejectedComparison(isCommonMonth(horizon) ? 'invalid-input' : 'invalid-horizon', horizon) });
  }
  const input = portfolioBookInputs(book), ids = book.debts.map(debt => debt.id);
  const initial = { balances: Object.fromEntries(book.debts.map(debt => [debt.id, debt.balance])), locBalance: book.loc.balance, cashBalance: 0 };
  const monthlyBudget = book.monthlyIncome - book.monthlyExpenses;
  const projections = strategies.map(strategy => {
    const result = simulatePortfolio({ ...input, settings: { ...input.settings, strategy } });
    let previous = initial.balances, centToleranceFromMonth: number | undefined;
    // A size-only epsilon bound cannot prove that an unpaid residual is fictitious.
    for (const row of result.monthResults) {
      if (centToleranceFromMonth === undefined && ids.some(id => previous[id] > 0 && previous[id] <= 0.01
        && row.balances[id] === 0 && row.payments[id] === 0 && row.interestCharges[id] === 0)) centToleranceFromMonth = row.month;
      previous = row.balances;
    }
    const rows = result.monthResults.map(row => ({ month: row.month, balances: row.balances,
      locBalance: row.locBalance ?? NaN, cashBalance: row.cashBalance ?? NaN,
      interest: Object.keys(row.interestCharges).length === ids.length && ids.every(id => Object.prototype.hasOwnProperty.call(row.interestCharges, id))
        && Object.values(row.interestCharges).every(value => Number.isFinite(value) && value >= 0)
        ? Object.values(row.interestCharges).reduce((sum, value) => sum + value, row.locInterest ?? NaN) : NaN }));
    return { strategy, centToleranceFromMonth, payoff: { possible: result.isPayoffPossible, months: result.payoffMonths, reason: result.failureReason },
      trace: { rows, payoffPossible: result.isPayoffPossible, payoffMonth: result.payoffMonths } };
  });
  return Object.freeze({ atMonth(horizonMonths: number): PortfolioCommonMonthComparison {
    if (!isCommonMonth(horizonMonths)) return rejectedComparison('invalid-horizon', horizonMonths);
    const plans: PortfolioCommonMonthPlan[] = projections.map(plan => ({ strategy: plan.strategy, payoff: { ...plan.payoff }, wealthDifference: null,
      snapshot: plan.centToleranceFromMonth !== undefined && horizonMonths >= plan.centToleranceFromMonth
        ? unavailableCommonMonth(horizonMonths, 'cent-tolerance', plan.centToleranceFromMonth - 1)
        : snapshotAtMonth({ horizonMonths, monthlyBudget, initial, projection: plan.trace }) }));
    const reference = plans.find(plan => plan.strategy === book.strategy)!.snapshot;
    for (const plan of plans) if (reference.status !== 'unavailable' && plan.snapshot.status !== 'unavailable') {
      const snapshot = plan.snapshot;
      plan.wealthDifference = sumCommonMonthTerms([snapshot.cashBalance, -reference.cashBalance,
        ...ids.flatMap(id => [reference.balances[id], -snapshot.balances[id]]), reference.locBalance, -snapshot.locBalance]);
    }
    return { horizonMonths, monthlyBudget, referenceStrategy: book.strategy, plans };
  } });
}

export function comparePortfolioAtMonth(value: PortfolioBook, horizonMonths: number): PortfolioCommonMonthComparison {
  return isCommonMonth(horizonMonths) ? preparePortfolioComparison(value).atMonth(horizonMonths) : rejectedComparison('invalid-horizon', horizonMonths);
}

export function formatCommonMonthAmount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'Not available';
  const magnitude = Math.abs(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2,
    maximumFractionDigits: 2, notation: magnitude > 1e9 || magnitude > 0 && magnitude < 0.005 ? 'scientific' : 'standard' }).format(value);
}

export function parseCommonMonthDraft(draft: string): number | null {
  if (!/^\d+$/.test(draft)) return null;
  const value = Number(draft);
  return isCommonMonth(value) ? value : null;
}

export function commonMonthStatusLabel(snapshot: CommonMonthSnapshot): string {
  if (snapshot.status !== 'unavailable') {
    if (snapshot.status === 'initial') return 'Observed starting book';
    if (snapshot.status === 'post-payoff-cash') return 'Cash continued after payoff';
    return `Accepted month ${snapshot.horizonMonths}`;
  }
  const labels = {
    'invalid-horizon': 'Month not valid', 'invalid-input': 'Book needs review',
    'invalid-trace': 'Model rows need review', 'inconsistent-trace': 'Model rows need review',
    'numeric-range-exceeded': 'Amounts exceed comparison range',
    'cent-tolerance': 'Nonzero balance within model tolerance',
    'negative-cashflow': 'Future cash deficit not modeled',
    'incomplete-horizon': `Not covered; last accepted month ${snapshot.coveredThroughMonth}`,
  };
  return labels[snapshot.reason];
}
