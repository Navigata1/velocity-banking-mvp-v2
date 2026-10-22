import type { PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import type { ForecastBasis } from '@interestshield/financial-engine';
import { preparePortfolioComparison } from '@interestshield/financial-engine/portfolio-common-month';

export interface PortfolioPayoffPlan {
  strategy: PortfolioBook['strategy'];
  state: 'projected' | 'cleared' | 'review' | 'residual';
  payoffMonths: number | null;
  totalInterest: number | null;
  endingCash: number | null;
  reason?: string;
}
export interface PortfolioPayoffModel {
  forecastBasis: ForecastBasis | null;
  cashFlow: number | null;
  totalDebt: number | null;
  plans: PortfolioPayoffPlan[];
}

export function buildPortfolioPayoffModel(book: PortfolioBook): PortfolioPayoffModel {
  const prepared = preparePortfolioComparison(book), initial = prepared.atMonth(0);
  const observed = initial.plans[0].snapshot;
  const plans = initial.plans.map((plan): PortfolioPayoffPlan => {
    const unavailable = (state: 'review' | 'residual', reason: string): PortfolioPayoffPlan => ({
      strategy: plan.strategy, state, payoffMonths: null, totalInterest: null, endingCash: null, reason,
    });
    if (!plan.payoff?.possible) return unavailable('review', plan.payoff?.reason ?? 'invalid-input');
    // An accepted prefix or another policy's payoff row is not this policy's result.
    const snapshot = prepared.atMonth(plan.payoff.months).plans.find(p => p.strategy === plan.strategy)!.snapshot;
    if (snapshot.status === 'unavailable') {
      return unavailable(snapshot.reason === 'cent-tolerance' ? 'residual' : 'review', snapshot.reason);
    }
    if (snapshot.debtBalance !== 0 || snapshot.locBalance !== 0) return unavailable('residual', 'nonzero-residual');
    const cleared = plan.payoff.months === 0 && observed.status !== 'unavailable'
      && observed.debtBalance === 0 && observed.locBalance === 0;
    return {
      strategy: plan.strategy, state: cleared ? 'cleared' : 'projected', payoffMonths: plan.payoff.months,
      totalInterest: snapshot.interestThroughMonth, endingCash: snapshot.cashBalance,
    };
  });
  return {
    forecastBasis: initial.forecastBasis ?? null,
    cashFlow: observed.status === 'unavailable' ? null : initial.monthlyBudget,
    totalDebt: observed.status === 'unavailable' ? null : observed.debtBalance + observed.locBalance,
    plans,
  };
}
