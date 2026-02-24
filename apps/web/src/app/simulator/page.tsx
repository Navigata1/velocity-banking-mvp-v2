'use client';

import { useState, useMemo, useEffect } from 'react';
import { runSimulation, formatCurrency, formatDate, formatMonths, SimulationInputs, simulateMultiDebt, calculateMortgageAnalysis, comparePaymentStrategies } from '@/engine/calculations';
import DomainTabs from '@/components/DomainTabs';
import DualSlider from '@/components/DualSlider';
import { EditableCurrency, EditableNumber, EditablePercentage } from '@/components/EditableNumber';
import { useFinancialStore, Domain, DebtType } from '@/stores/financial-store';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import ScrollReveal from '@/components/ScrollReveal';
import CountUp from '@/components/CountUp';
import PageTransition from '@/components/PageTransition';

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false);
  const store = useFinancialStore();
  const { theme } = useThemeStore();
  
  useEffect(() => {
    setMounted(true);
  }, []);

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
  const locUtilization = (store.loc.balance / store.loc.limit) * 100;

  const results = useMemo(() => runSimulation(inputs), [inputs]);

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
        {cashFlow <= 0 && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-400 font-medium">
              Stabilize First: Your expenses exceed your income. Focus on positive cash flow before using velocity banking.
            </p>
          </div>
        )}

        {locUtilization > 80 && (
          <div className="mb-6 bg-amber-500/20 border border-amber-500/50 rounded-xl p-4">
            <p className="text-amber-400 font-medium">
              High LOC Utilization: Your line of credit is over 80% utilized. This increases risk.
            </p>
          </div>
        )}

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
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Monthly Expenses</label>
                  <EditableCurrency 
                    value={store.monthlyExpenses} 
                    onChange={store.setMonthlyExpenses}
                    size="lg"
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
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>APR</label>
                  <EditablePercentage 
                    value={currentDebt.interestRate} 
                    onChange={(val) => store.updateDebt(debtType, { interestRate: val })}
                    size="lg"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Monthly Payment</label>
                  <EditableCurrency 
                    value={currentDebt.minimumPayment} 
                    onChange={(val) => store.updateDebt(debtType, { minimumPayment: val })}
                    size="lg"
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
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>APR</label>
                  <EditablePercentage 
                    value={store.loc.interestRate} 
                    onChange={(val) => store.updateLOC({ interestRate: val })}
                    size="lg"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Extra Payment / Chunk</label>
                  <EditableCurrency 
                    value={store.chunkAmount} 
                    onChange={store.setChunkAmount}
                    size="lg"
                  />
                </div>
              </div>
            </div>


            {/* Mortgage Details Panel */}
            {store.activeDomain === 'house' && (
              <div className={`${classes.glass} rounded-2xl p-6`}>
                <h2 className={`text-xl font-semibold mb-4 ${classes.text}`}>🏠 Mortgage Details</h2>
                <div className="flex gap-2 mb-4">
                  {(['purchase', 'current', 'both'] as const).map((mode) => (
                    <button
                      key={mode}
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
                        <EditableNumber value={store.mortgageDetails.purchaseAge} onChange={(v) => store.updateMortgageDetails({ purchaseAge: v })} size="lg" />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Purchase Price</label>
                        <EditableCurrency value={store.mortgageDetails.originalCost} onChange={(v) => store.updateMortgageDetails({ originalCost: v })} size="lg" />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Down Payment</label>
                        <EditableCurrency value={store.mortgageDetails.downPayment} onChange={(v) => store.updateMortgageDetails({ downPayment: v })} size="lg" />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Term</label>
                        <div className="flex gap-2">
                          {[15, 30].map(t => (
                            <button key={t} onClick={() => store.updateMortgageDetails({ originalTermYears: t })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                store.mortgageDetails.originalTermYears === t
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                              }`}>{t} yr</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Original Rate</label>
                        <EditablePercentage value={store.mortgageDetails.originalRate} onChange={(v) => store.updateMortgageDetails({ originalRate: v })} size="lg" />
                      </div>
                    </>
                  )}
                  {(store.mortgageDetails.entryMode === 'current' || store.mortgageDetails.entryMode === 'both') && (
                    <>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Current Balance</label>
                        <EditableCurrency value={store.mortgageDetails.currentBalance} onChange={(v) => store.updateMortgageDetails({ currentBalance: v })} size="lg" />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Remaining Months</label>
                        <EditableNumber value={store.mortgageDetails.remainingTermMonths} onChange={(v) => store.updateMortgageDetails({ remainingTermMonths: v })} size="lg" />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Current Rate</label>
                        <EditablePercentage value={store.mortgageDetails.currentRate} onChange={(v) => store.updateMortgageDetails({ currentRate: v })} size="lg" />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Monthly Payment</label>
                        <EditableCurrency value={store.mortgageDetails.currentMonthlyPayment} onChange={(v) => store.updateMortgageDetails({ currentMonthlyPayment: v })} size="lg" />
                      </div>
                    </>
                  )}
                  <div className="pt-2 border-t border-gray-400/30">
                    <label className={`text-sm ${classes.textSecondary} mb-2 block`}>Payment Frequency</label>
                    <div className="flex gap-2">
                      {(['monthly', 'biweekly', 'weekly'] as const).map((freq) => (
                        <button
                          key={freq}
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
                      <button onClick={() => store.updateMortgageDetails({ hasExtraPayments: !store.mortgageDetails.hasExtraPayments })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          store.mortgageDetails.hasExtraPayments
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                        }`}>{store.mortgageDetails.hasExtraPayments ? 'Yes' : 'No'}</button>
                    </div>
                    {store.mortgageDetails.hasExtraPayments && (
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Extra/payment</label>
                        <EditableCurrency value={store.mortgageDetails.extraPaymentAmount} onChange={(v) => store.updateMortgageDetails({ extraPaymentAmount: v })} size="lg" />
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <label className={`text-sm ${classes.textSecondary}`}>Refinanced?</label>
                      <button onClick={() => store.updateMortgageDetails({ hasRefinanced: !store.mortgageDetails.hasRefinanced, refinanceCount: store.mortgageDetails.hasRefinanced ? 0 : 1 })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          store.mortgageDetails.hasRefinanced
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                        }`}>{store.mortgageDetails.hasRefinanced ? 'Yes' : 'No'}</button>
                    </div>
                    {store.mortgageDetails.hasRefinanced && (
                      <div className="flex justify-between items-center">
                        <label className={`text-sm ${classes.textSecondary}`}>Times refinanced</label>
                        <EditableNumber value={store.mortgageDetails.refinanceCount} onChange={(v) => store.updateMortgageDetails({ refinanceCount: v })} size="lg" min={1} max={10} />
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
              <h2 className={`text-xl font-semibold mb-6 ${classes.text}`}>Strategy Comparison</h2>
              
              {(() => {
                // Compare strategies on the ACTIVE debt only
                const activeDebt = [{
                  id: currentDebt.id,
                  name: currentDebt.name,
                  type: debtType,
                  balance: currentDebt.balance,
                  apr: currentDebt.interestRate,
                  monthlyPayment: currentDebt.minimumPayment,
                  termMonths: currentDebt.termMonths,
                }];
                const locDetails = { limit: store.loc.limit, apr: store.loc.interestRate, balance: store.loc.balance };

                const traditional = { months: results.baseline.payoffMonths, totalInterest: results.baseline.totalInterest };
                const snowballResult = simulateMultiDebt(activeDebt, store.monthlyIncome, store.monthlyExpenses, locDetails, 'snowball', store.chunkAmount);
                const avalancheResult = simulateMultiDebt(activeDebt, store.monthlyIncome, store.monthlyExpenses, locDetails, 'avalanche', store.chunkAmount);
                const velocityResult = simulateMultiDebt(activeDebt, store.monthlyIncome, store.monthlyExpenses, locDetails, 'velocity', store.chunkAmount);

                const tradInterest = traditional.totalInterest;
                const strategies = [
                  { label: 'Traditional', months: traditional.months, interest: tradInterest, saved: 0, monthsSaved: 0, color: 'red', highlight: false },
                  { label: 'Snowball', months: snowballResult.totalMonths, interest: snowballResult.totalInterestPaid, saved: Math.max(0, tradInterest - snowballResult.totalInterestPaid), monthsSaved: Math.max(0, traditional.months - snowballResult.totalMonths), color: 'blue', highlight: false },
                  { label: 'Avalanche', months: avalancheResult.totalMonths, interest: avalancheResult.totalInterestPaid, saved: Math.max(0, tradInterest - avalancheResult.totalInterestPaid), monthsSaved: Math.max(0, traditional.months - avalancheResult.totalMonths), color: 'amber', highlight: false },
                  { label: 'Velocity ⭐', months: velocityResult.totalMonths, interest: velocityResult.totalInterestPaid, saved: Math.max(0, tradInterest - velocityResult.totalInterestPaid), monthsSaved: Math.max(0, traditional.months - velocityResult.totalMonths), color: 'emerald', highlight: true },
                ];

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {strategies.map((s) => (
                        <div
                          key={s.label}
                          className={`rounded-xl p-4 border ${
                            s.highlight
                              ? 'bg-emerald-500/15 border-emerald-500/50 ring-1 ring-emerald-500/30'
                              : `bg-${s.color}-500/10 border-${s.color}-500/30`
                          }`}
                        >
                          <p className={`text-xs ${classes.textSecondary} mb-1`}>{s.label}</p>
                          <p className={`text-xl font-bold text-${s.color}-400`}>
                            <CountUp value={s.months} prefix="" suffix=" mo" />
                          </p>
                          <p className={`text-sm text-${s.color}-400/80 mt-1`}>{formatCurrency(s.interest)}</p>
                          {s.label === 'Traditional' ? (
                            <p className={`text-xs ${classes.textMuted} mt-1`}>Baseline</p>
                          ) : s.highlight ? (
                            <div className="mt-1">
                              <p className="text-xs text-emerald-400 font-medium">
                                Saves {formatCurrency(s.saved)} ✨
                              </p>
                              {s.monthsSaved > 0 && (
                                <p className="text-xs text-emerald-400/70">{s.monthsSaved} months faster</p>
                              )}
                            </div>
                          ) : (
                            <div className="mt-1">
                              <p className={`text-xs ${classes.textMuted}`}>
                                {s.saved > 0 ? `Saves ${formatCurrency(s.saved)}` : 'No savings vs traditional'}
                              </p>
                              {s.monthsSaved > 0 && (
                                <p className={`text-xs ${classes.textMuted}`}>{s.monthsSaved} months faster</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className={`${classes.glass} rounded-xl p-6 text-center border border-emerald-500/30`}>
                      <p className={`${classes.textSecondary} mb-2`}>Velocity Advantage</p>
                      <p className="text-3xl font-bold text-emerald-400"><CountUp value={results.velocity.interestSaved} /></p>
                      <p className="text-amber-500 mt-2"><CountUp value={results.velocity.monthsSaved} prefix="" suffix=" months faster" /></p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className={`${classes.glass} rounded-2xl p-6`}>
              <h3 className="font-semibold mb-4">Balance Over Time (Estimate)</h3>
              <div className="h-48 flex items-end justify-between gap-1">
                {results.baseline.monthlyData.slice(0, 24).map((month, i) => (
                  <div key={i} className="flex-1 flex flex-col gap-1">
                    <div 
                      className="bg-red-500/50 rounded-t"
                      style={{ height: `${(month.carBalance / (currentDebt.balance || 1)) * 100}%` }}
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
