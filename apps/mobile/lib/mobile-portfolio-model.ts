import { formatCurrency, normalizeApr, type MobileDashboardInput } from '@interestshield/financial-engine';
import { simulatePortfolio } from '@interestshield/financial-engine/portfolio';
import { decodePortfolioBook, portfolioBookInputs, type PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import { buildPortfolioPathVisualModel } from '@interestshield/financial-engine/portfolio-path';

export function createBlankMobilePortfolio(): PortfolioBook {
  return { monthlyIncome: 0, monthlyExpenses: 0, extraMonthlyPayment: 0, chunkAmount: 0,
    loc: { limit: 0, balance: 0, apr: 0 }, debts: [], strategy: 'avalanche', focusMode: 'single', splitRatioPrimary: 0.7 };
}

export function copyMobileScenarioToPortfolio(input: MobileDashboardInput, id: string): PortfolioBook {
  return decodePortfolioBook({ ...createBlankMobilePortfolio(), monthlyIncome: input.monthlyIncome,
    monthlyExpenses: input.monthlyExpenses, chunkAmount: input.chunkAmount, strategy: 'velocity',
    loc: { limit: input.loc.limit, balance: input.loc.balance, apr: normalizeApr(input.loc.apr) },
    debts: [{ id, name: input.activeDebtName, category: 'custom', kind: 'amortized',
      balance: input.activeDebt.balance, apr: normalizeApr(input.activeDebt.apr), paymentSource: 'checking',
      minPaymentRule: { type: 'fixed', amount: input.activeDebt.monthlyPayment },
      ...(input.activeDebt.termMonths === undefined ? {} : { termMonths: input.activeDebt.termMonths }) }] });
}

export function buildMobilePortfolioBookView(book: PortfolioBook) {
  const input = portfolioBookInputs(book), result = simulatePortfolio(input);
  const startingBalance = book.debts.reduce((sum, debt) => sum + debt.balance, 0) + book.loc.balance;
  const visual = buildPortfolioPathVisualModel(result, startingBalance);
  const state = result.isPayoffPossible ? (result.payoffMonths === 0 ? 'cleared' : 'projected') : 'review';
  const centTolerance = state === 'cleared' && startingBalance > 0;
  const path = centTolerance ? { ...visual, isProjected: false, statusLabel: 'Within per-liability cent tolerance',
    startingBalance, endingBalance: startingBalance, maxBalance: Math.max(1, startingBalance),
    sampledPoints: [{ month: 0, balance: startingBalance, interest: 0, targetCount: 0 }] } : visual;
  const first = result.monthResults[0];
  const targets = first ? [...first.targetIds.map(id => book.debts.find(debt => debt.id === id)?.name ?? id),
    ...(first.locIsTarget ? ['Line of credit'] : [])] : [];
  const warnings = [...result.warnings];
  if (centTolerance) warnings.push('Each remaining liability is within the model\'s $0.01 tolerance. Nonzero balances are retained; this is not lender payoff confirmation.');
  if (book.monthlyIncome - book.monthlyExpenses <= 0 && state !== 'cleared'
    && !warnings.some(w => /cash flow/i.test(w))) warnings.push('Cash flow is zero or negative. Review income and household expenses.');
  if (book.loc.balance > 0 && (book.loc.limit <= 0 || book.loc.balance / book.loc.limit > 0.8)) {
    warnings.push('LOC utilization is above 80% or its limit is missing. Review capacity before relying on new borrowing.');
  }
  return { result, startingBalance, path, state,
    targetLabel: state === 'review' ? 'Not projected' : state === 'cleared' ? 'No modeled balances' : targets.join(' + ') || 'No active target',
    payoffLabel: centTolerance ? 'Within per-liability cent tolerance' : state === 'cleared' ? 'No modeled balances' : state === 'projected' ? `${result.payoffMonths} months estimated` : 'Review inputs',
    interestLabel: state === 'review' ? 'Not projected' : formatCurrency(result.totalInterest),
    cashLabel: state === 'review' ? 'Not projected' : formatCurrency(result.cashAtPayoff), warnings };
}
