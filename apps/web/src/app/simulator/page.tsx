'use client';

import { useMemo } from 'react';
import { runSimulation, formatCurrency, SimulationInputs, calculateMortgageAnalysis, compareSingleDebtStrategies } from '@/engine/calculations';
import DomainTabs from '@/components/DomainTabs';
import DualSlider from '@/components/DualSlider';
import { EditableCurrency, EditableNumber, EditablePercentage } from '@/components/EditableNumber';
import { useFinancialStore, Domain } from '@/stores/financial-store';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import ScrollReveal from '@/components/ScrollReveal';
import PageTransition from '@/components/PageTransition';
import StrategyGlassFill from '@/components/StrategyGlassFill';
import { useIsClient } from '@/hooks/useIsClient';
import {
  buildSimulatorBalanceBarHeightPercent,
  buildSimulatorStrategyCards,
  buildSimulatorTimelineStatus,
  buildSimulatorWarnings,
} from '@/app/simulator-model';

export default function SimulatorPage() {
  const mounted = useIsClient();
  const store = useFinancialStore();
  const { theme } = useThemeStore();

  const classes = themeClasses[mounted ? theme : 'original'];

  const inputs: SimulationInputs = useMemo(() => {
    const debtType = store.getActiveDebtType();
    const debt = store.debts[debtType];
    return {
      monthlyIncome: store.monthlyIncome,
      monthlyExpenses: store.monthlyExpenses,
      carLoan: {
        balance: debt.balance,
        apr: debt.interestRate,
        monthlyPayment: debt.minimumPayment,
      },
      loc: {
        limit: store.loc.limit,
        apr: store.loc.interestRate,
        balance: store.loc.balance,
      },
      useVelocity: true,
      extraPayment: store.chunkAmount,
    };
  }, [store]);

  const cashFlow = store.getCashFlow();
  const simulatorWarnings = buildSimulatorWarnings({ cashFlow, loc: store.loc });

  const results = useMemo(() => runSimulation(inputs), [inputs]);

  // Keep visible strategy cards aligned with the single-debt engine.
  const strategyResults = useMemo(() => {
    return buildSimulatorStrategyCards(compareSingleDebtStrategies(inputs));
  }, [inputs]);

  if (!mounted) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-500/30 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-gray-500/20 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const debtType = store.getActiveDebtType();
  const currentDebt = store.debts[debtType];
  const domainName = store.activeDomain.charAt(0).toUpperCase() + store.activeDomain.slice(1);
  const timelineMonth = results.velocity.monthlyData[0];
  const timelineEvents = timelineMonth?.events ?? [];
  const timelineStatus = buildSimulatorTimelineStatus(timelineEvents.length);
  const timelineStatusClass = timelineStatus.tone === 'emerald'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : 'border-amber-500/30 bg-amber-500/10 text-amber-200';

  return (
    <PageTransition>
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <ScrollReveal as="header" className="mb-8">
        <h1 className={`text-3xl font-bold ${classes.text} mb-2`}>What-If Simulator</h1>
        <p className={classes.textSecondary}>See how velocity banking could accelerate your payoff</p>
      </ScrollReveal>

      <div className="relative z-50">
        <DomainTabs 
          activeTab={store.activeDomain} 
          onTabChange={(tab) => store.setActiveDomain(tab as Domain)} 
        />
      </div>

      <div className="mt-6 relative z-10">
        {simulatorWarnings.map((warning) => {
          const boxClass = warning.tone === 'rose'
            ? 'bg-red-500/20 border-red-500/50'
            : 'bg-amber-500/20 border-amber-500/50';
          const textClass = warning.tone === 'rose' ? 'text-red-400' : 'text-amber-400';

          return (
            <div key={warning.kind} className={`mb-6 rounded-xl border p-4 ${boxClass}`}>
              <p className={`${textClass} font-medium`}>
                {warning.title}: {warning.body}
              </p>
            </div>
          );
        })}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ScrollReveal variant="fadeUp" className="space-y-6" stagger={0.08}>
            <div className={`${classes.glass} rounded-2xl p-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${classes.text}`}>Income & Expenses</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Monthly Income</label>
                  <EditableCurrency 
                    value={store.monthlyIncome} 
                    onChange={store.setMonthlyIncome}
                    size="lg"
                    ariaLabel="Simulator monthly income"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Monthly Expenses</label>
                  <EditableCurrency 
                    value={store.monthlyExpenses} 
                    onChange={store.setMonthlyExpenses}
                    size="lg"
                    ariaLabel="Simulator monthly expenses"
                  />
                </div>
                <DualSlider
                  incomeValue={store.monthlyIncome}
                  expenseValue={store.monthlyExpenses}
                  onIncomeChange={store.setMonthlyIncome}
                  onExpenseChange={store.setMonthlyExpenses}
                />
                <div className="pt-2 border-t border-gray-400/30">
                  <div className="flex justify-between">
                    <span className={classes.textSecondary}>Cash Flow</span>
                    <span className={cashFlow > 0 ? 'text-emerald-400 font-bold text-xl' : 'text-red-400 font-bold text-xl'}>
                      {formatCurrency(cashFlow)}/mo
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${classes.glass} rounded-2xl p-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${classes.text}`}>{domainName} Loan</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Balance</label>
                  <EditableCurrency 
                    value={currentDebt.balance} 
                    onChange={(val) => store.updateDebt(debtType, { balance: val })}
                    size="lg"
                    ariaLabel={`${domainName} balance`}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>APR</label>
                  <EditablePercentage 
                    value={currentDebt.interestRate} 
                    onChange={(val) => store.updateDebt(debtType, { interestRate: val })}
                    size="lg"
                    ariaLabel={`${domainName} APR`}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Monthly Payment</label>
                  <EditableCurrency 
                    value={currentDebt.minimumPayment} 
                    onChange={(val) => store.updateDebt(debtType, { minimumPayment: val })}
                    size="lg"
                    ariaLabel={`${domainName} monthly payment`}
                  />
                </div>
              </div>
            </div>

            <div className={`${classes.glass} rounded-2xl p-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${classes.text}`}>Line of Credit</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Limit</label>
                  <EditableCurrency 
                    value={store.loc.limit} 
                    onChange={(val) => store.updateLOC({ limit: val })}
                    size="lg"
                    ariaLabel="Simulator line of credit limit"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>APR</label>
                  <EditablePercentage 
                    value={store.loc.interestRate} 
                    onChange={(val) => store.updateLOC({ interestRate: val })}
                    size="lg"
                    ariaLabel="Simulator line of credit APR"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Extra Payment / Chunk</label>
                  <EditableCurrency 
                    value={store.chunkAmount} 
                    onChange={store.setChunkAmount}
                    size="lg"
                    ariaLabel="Simulator extra payment chunk"
                  />
                </div>
              </div>
            </div>


            {/* Mortgage Details Panel */}
            {store.activeDomain === 'house' && (
              <div className={`${classes.glass} rounded-2xl p-6`}>
                <h2 className={`text-xl font-semibold mb-4 ${classes.text}`}>🏠 Mortgage Details</h2>
                <div className="flex gap-2 mb-4" role="group" aria-label="Mortgage entry mode">
                  {(['purchase', 'current', 'both'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={store.mortgageDetails.entryMode === mode}
                      onClick={() => store.updateMortgageDetails({ entryMode: mode })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        store.mortgageDetails.entryMode === mode
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                      }`}
                    >
                      {mode === 'purchase' ? 'Purchase' : mode === 'current' ? 'Current' : 'Both'}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {(store.mortgageDetails.entryMode === 'purchase' || store.mortgageDetails.entryMode === 'both') && (
                    <>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Age at Purchase</label>
                        <EditableNumber value={store.mortgageDetails.purchaseAge} onChange={(v) => store.updateMortgageDetails({ purchaseAge: v })} size="lg" ariaLabel="Mortgage purchase age" />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Purchase Price</label>
                        <EditableCurrency value={store.mortgageDetails.originalCost} onChange={(v) => store.updateMortgageDetails({ originalCost: v })} size="lg" ariaLabel="Mortgage purchase price" />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Down Payment</label>
                        <EditableCurrency value={store.mortgageDetails.downPayment} onChange={(v) => store.updateMortgageDetails({ downPayment: v })} size="lg" ariaLabel="Mortgage down payment" />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Term</label>
                        <div className="flex gap-2" role="group" aria-label="Mortgage original term">
                          {[15, 30].map(t => (
                            <button
                              key={t}
                              type="button"
                              aria-pressed={store.mortgageDetails.originalTermYears === t}
                              onClick={() => store.updateMortgageDetails({ originalTermYears: t })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                store.mortgageDetails.originalTermYears === t
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                              }`}
                            >
                              {t} yr
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Original Rate</label>
                        <EditablePercentage value={store.mortgageDetails.originalRate} onChange={(v) => store.updateMortgageDetails({ originalRate: v })} size="lg" ariaLabel="Mortgage original rate" />
                      </div>
                    </>
                  )}
                  {(store.mortgageDetails.entryMode === 'current' || store.mortgageDetails.entryMode === 'both') && (
                    <>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Current Balance</label>
                        <EditableCurrency value={store.mortgageDetails.currentBalance} onChange={(v) => store.updateMortgageDetails({ currentBalance: v })} size="lg" ariaLabel="Mortgage current balance" />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Remaining Months</label>
                        <EditableNumber value={store.mortgageDetails.remainingTermMonths} onChange={(v) => store.updateMortgageDetails({ remainingTermMonths: v })} size="lg" ariaLabel="Mortgage remaining months" />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Current Rate</label>
                        <EditablePercentage value={store.mortgageDetails.currentRate} onChange={(v) => store.updateMortgageDetails({ currentRate: v })} size="lg" ariaLabel="Mortgage current rate" />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Monthly Payment</label>
                        <EditableCurrency value={store.mortgageDetails.currentMonthlyPayment} onChange={(v) => store.updateMortgageDetails({ currentMonthlyPayment: v })} size="lg" ariaLabel="Mortgage current monthly payment" />
                      </div>
                    </>
                  )}
                  <div className="pt-2 border-t border-gray-400/30">
                    <label className={`text-sm ${classes.textSecondary} mb-2 block`}>Payment Frequency</label>
                    <div className="flex gap-2" role="group" aria-label="Mortgage payment frequency">
                      {(['monthly', 'biweekly', 'weekly'] as const).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          aria-pressed={store.mortgageDetails.paymentFrequency === freq}
                          onClick={() => store.updateMortgageDetails({ paymentFrequency: freq })}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                            store.mortgageDetails.paymentFrequency === freq
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                          }`}
                        >
                          {freq === 'monthly' ? 'Monthly' : freq === 'biweekly' ? 'Bi-Weekly' : 'Weekly'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Extra payments & refinance toggles */}
                  <div className="pt-2 border-t border-gray-400/30 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className={`text-sm ${classes.textSecondary}`}>Extra payments?</label>
                      <button
                        type="button"
                        aria-pressed={store.mortgageDetails.hasExtraPayments}
                        onClick={() => store.updateMortgageDetails({ hasExtraPayments: !store.mortgageDetails.hasExtraPayments })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          store.mortgageDetails.hasExtraPayments
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                        }`}
                      >
                        {store.mortgageDetails.hasExtraPayments ? 'Yes' : 'No'}
                      </button>
                    </div>
                    {store.mortgageDetails.hasExtraPayments && (
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Extra/payment</label>
                        <EditableCurrency value={store.mortgageDetails.extraPaymentAmount} onChange={(v) => store.updateMortgageDetails({ extraPaymentAmount: v })} size="lg" ariaLabel="Mortgage extra payment amount" />
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <label className={`text-sm ${classes.textSecondary}`}>Refinanced?</label>
                      <button
                        type="button"
                        aria-pressed={store.mortgageDetails.hasRefinanced}
                        onClick={() => store.updateMortgageDetails({ hasRefinanced: !store.mortgageDetails.hasRefinanced, refinanceCount: store.mortgageDetails.hasRefinanced ? 0 : 1 })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          store.mortgageDetails.hasRefinanced
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                        }`}
                      >
                        {store.mortgageDetails.hasRefinanced ? 'Yes' : 'No'}
                      </button>
                    </div>
                    {store.mortgageDetails.hasRefinanced && (
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Times refinanced</label>
                        <EditableNumber value={store.mortgageDetails.refinanceCount} onChange={(v) => store.updateMortgageDetails({ refinanceCount: v })} size="lg" min={1} max={10} ariaLabel="Mortgage refinance count" />
                      </div>
                    )}
                  </div>
                </div>
                {/* Mortgage Analysis Summary */}
                {(() => {
                  const analysis = calculateMortgageAnalysis({
                    ...store.mortgageDetails,
                    currentAge: store.currentAge,
                  });
                  return (
                    <div className="mt-4 pt-4 border-t border-gray-400/30 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-500/10 rounded-lg p-3">
                          <p className={`text-xs ${classes.textMuted}`}>Interest Paid So Far</p>
                          <p className="text-lg font-bold text-red-400">{formatCurrency(analysis.interestPaidSoFar)}</p>
                        </div>
                        <div className="bg-amber-500/10 rounded-lg p-3">
                          <p className={`text-xs ${classes.textMuted}`}>Interest Remaining</p>
                          <p className="text-lg font-bold text-amber-400">{formatCurrency(analysis.interestRemaining)}</p>
                        </div>
                      </div>
                      {/* Interest vs Principal bar */}
                      <div className="flex h-4 rounded-lg overflow-hidden">
                        <div className="bg-red-500" style={{ width: `${analysis.interestPercentOfPayment}%` }} />
                        <div className="bg-emerald-500" style={{ width: `${analysis.principalPercentOfPayment}%` }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-red-400">Interest: {analysis.interestPercentOfPayment.toFixed(0)}%</span>
                        <span className="text-emerald-400">Principal: {analysis.principalPercentOfPayment.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={classes.textSecondary}>Equity Built</span>
                        <span className="text-emerald-400 font-medium">{analysis.equityPercent.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={classes.textSecondary}>Total Lifetime Interest</span>
                        <span className="text-red-400 font-medium">{formatCurrency(analysis.totalInterestLifetime)}</span>
                      </div>
                      {analysis.refinancePenalty > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-amber-400">Refinance Penalty (est.)</span>
                          <span className="text-amber-400 font-medium">{formatCurrency(analysis.refinancePenalty)}</span>
                        </div>
                      )}
                      <a href="/vault" className="block text-center text-xs text-emerald-400 hover:underline mt-2">
                        See full Wealth Transfer Timeline →
                      </a>
                    </div>
                  );
                })()}
              </div>
            )}
          </ScrollReveal>

          <ScrollReveal variant="fadeUp" delay={0.15} className="space-y-6" stagger={0.08}>
            {/* 4-Way Strategy Comparison */}
            <div className={`${classes.glass} rounded-2xl p-6 border border-gray-400/30`}>
              <h2 className={`text-xl font-semibold mb-2 ${classes.text}`}>Strategy Comparison</h2>
              <p className={`text-xs ${classes.textMuted} mb-5`}>Fill level = time to payoff. Less fill = faster. Traditional is always 100%.</p>
              
              <StrategyGlassFill strategies={strategyResults} />
            </div>

            <div className={`${classes.glass} rounded-2xl p-6`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className={`text-xl font-semibold ${classes.text}`}>Money Loop Timeline</h2>
                  <p className={`text-xs ${classes.textMuted} mt-1`}>
                    Month {timelineMonth?.month ?? 1} event ledger from the velocity engine.
                  </p>
                </div>
                <span className={`w-fit rounded-lg border px-3 py-1 text-xs font-medium ${timelineStatusClass}`}>
                  {timelineStatus.label}
                </span>
              </div>

              {timelineEvents.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {timelineEvents.map((event, index) => (
                    <div
                      key={`${event.type}-${index}`}
                      className={`rounded-xl border ${classes.border} p-4`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={`text-sm font-semibold ${classes.text}`}>{event.label}</p>
                          <p className={`mt-1 text-xs leading-5 ${classes.textSecondary}`}>{event.note}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-400">{formatCurrency(event.amount)}</p>
                          <p className={`text-[11px] ${classes.textMuted}`}>
                            Balance after {formatCurrency(event.balanceAfter)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-sm font-medium text-amber-300">Timeline unavailable</p>
                  <p className={`mt-1 text-xs leading-5 ${classes.textSecondary}`}>
                    The current inputs do not produce a valid velocity event ledger. Check cash flow, LOC, and payment assumptions.
                  </p>
                </div>
              )}
            </div>

            <div className={`${classes.glass} rounded-2xl p-6`}>
              <h3 className="font-semibold mb-4">Balance Over Time (Estimate)</h3>
              <div className="h-48 flex items-end justify-between gap-1">
                {results.baseline.monthlyData.slice(0, 24).map((month, i) => (
                  <div key={i} className="flex-1 flex flex-col gap-1">
                    <div 
                      className="bg-red-500/50 rounded-t"
                      style={{ height: `${buildSimulatorBalanceBarHeightPercent(month.carBalance, currentDebt.balance)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Month 1</span>
                <span>Month 24</span>
              </div>
              <div className="flex gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500/50 rounded" />
                  <span className="text-gray-400">Traditional</span>
                </div>
              </div>
            </div>

            <a
              href="/cockpit"
              className="block bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl p-6 border border-blue-500/30 hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">🛩️</span>
                <div>
                  <h3 className="text-lg font-semibold text-blue-400">Try Cockpit Mode</h3>
                  <p className="text-gray-400 text-sm">Interactive flight simulator for your finances</p>
                </div>
              </div>
            </a>
          </ScrollReveal>
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500">
        Educational tool. Click any number to edit. Estimates are simplified models. Not financial advice.
      </footer>
    </div>
    </PageTransition>
  );
}
