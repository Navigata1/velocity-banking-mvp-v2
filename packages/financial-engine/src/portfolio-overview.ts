import { calculateDailyInterest } from './index';
import { decodePortfolioBook, portfolioBookInputs, type PortfolioBook } from './portfolio-book';
import { simulatePortfolio, type PortfolioSimulationResult } from './portfolio';

export interface PortfolioOverview {
  book: PortfolioBook;
  result: PortfolioSimulationResult;
  cashFlow: number;
  totalDebt: number;
  dailyInterestBurn: number | null;
  state: 'projected' | 'review' | 'cleared' | 'tolerance';
  payoffMonths: number | null;
  nextTargetIds: string[];
  nextTargetLabels: string[];
  locIsTarget: boolean;
}

export function buildPortfolioOverview(input: PortfolioBook): PortfolioOverview {
  const book = decodePortfolioBook(input);
  const result = simulatePortfolio(portfolioBookInputs(book));
  const cashFlow = book.monthlyIncome - book.monthlyExpenses;
  const totalDebt = book.debts.reduce((sum, debt) => sum + debt.balance, 0) + book.loc.balance;
  const burn = book.debts.reduce((sum, debt) => {
    const apr = debt.promo
      ? debt.promo.monthsRemaining > 0 ? debt.promo.introApr : debt.promo.postIntroApr
      : debt.apr;
    return sum + calculateDailyInterest(debt.balance, apr, 'decimal');
  }, calculateDailyInterest(book.loc.balance, book.loc.apr, 'decimal'));
  const dailyInterestBurn = Number.isFinite(burn) ? burn : null;
  const state = totalDebt === 0 ? 'cleared'
    : result.isPayoffPossible && result.payoffMonths === 0 ? 'tolerance'
      : result.isPayoffPossible && dailyInterestBurn !== null ? 'projected' : 'review';
  const first = state === 'projected' ? result.monthResults[0] : undefined;
  const nextTargetIds = first ? [...first.targetIds] : [];
  const locIsTarget = first?.locIsTarget === true;
  const nextTargetLabels = nextTargetIds.map(id => book.debts.find(debt => debt.id === id)?.name ?? id);
  if (locIsTarget) nextTargetLabels.push('Line of credit');
  return { book, result, cashFlow, totalDebt, dailyInterestBurn, state,
    payoffMonths: state === 'cleared' ? 0 : state === 'projected' ? result.payoffMonths : null,
    nextTargetIds, nextTargetLabels, locIsTarget };
}
