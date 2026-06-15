'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { EditableCurrency, EditableNumber, EditablePercentage } from '@/components/EditableNumber';
import { useFinancialStore } from '@/stores/financial-store';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import ScrollReveal from '@/components/ScrollReveal';
import PageTransition from '@/components/PageTransition';
import CountUp from '@/components/CountUp';
import { useIsClient } from '@/hooks/useIsClient';
import {
  buildVaultFreedomPathModel,
  formatVaultProjectionFailure,
  formatVaultStrategySavings,
  formatVaultStrategyTimeDelta,
} from '@/app/vault-model';
import {
  calculateMortgageAnalysis,
  analyzeMortgageHistory,
  generateAmortizationBreakdown,
  compareMortgageStrategies,
  formatCurrency,
  MortgageAnalysisInput,
} from '@/engine/calculations';

const calculateFutureValue = (presentValue: number, annualRate: number, years: number) => {
  return presentValue * Math.pow(1 + annualRate, years);
};

function ProgressBar({ progress, color = 'green' }: { progress: number; color?: 'green' | 'red' | 'gold' | 'blue' | 'emerald' }) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-500', red: 'bg-red-500', gold: 'bg-amber-500', blue: 'bg-blue-500', emerald: 'bg-emerald-500',
  };
  return (
    <div className="w-full bg-gray-400/30 rounded-full h-3 overflow-hidden">
      <div className={`h-full ${colors[color]} transition-all duration-1000 ease-out rounded-full`}
        style={{ width: `${Math.min(progress, 100)}%` }} />
    </div>
  );
}

function formatProjectionFailure(reason?: string): string {
  return formatVaultProjectionFailure(reason);
}

function formatMortgageMonths(strategy: { months: number; isPayoffPossible: boolean }): string {
  return strategy.isPayoffPossible ? `${strategy.months} mo` : 'Review inputs';
}

function formatMortgageInterest(totalInterest: number, isPayoffPossible: boolean): string {
  return isPayoffPossible ? `${formatCurrency(totalInterest)} interest` : 'Not projected';
}

function formatMortgageSavings(strategy: { saved: number; isPayoffPossible: boolean }): string {
  return formatVaultStrategySavings({ ...strategy, monthsSaved: 0 });
}

function formatMortgageTimeDelta(strategy: { monthsSaved: number; isPayoffPossible: boolean; failureReason?: string }, suffix = ''): string {
  return formatVaultStrategyTimeDelta({ ...strategy, saved: 0 }, suffix);
}

export default function VaultPage() {
  const mounted = useIsClient();
  const [step, setStep] = useState(0);
  const [investmentRate, setInvestmentRate] = useState(0.07);
  const store = useFinancialStore();
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];

  // Build mortgage analysis input from store
  const mortgageInput: MortgageAnalysisInput = useMemo(() => ({
    ...store.mortgageDetails,
    currentAge: store.currentAge,
  }), [store.mortgageDetails, store.currentAge]);

  const analysis = useMemo(() => calculateMortgageAnalysis(mortgageInput), [mortgageInput]);
  const history = useMemo(() => analyzeMortgageHistory(mortgageInput), [mortgageInput]);
  const amortBreakdown = useMemo(() =>
    generateAmortizationBreakdown(analysis.originalLoanAmount, store.mortgageDetails.originalRate, store.mortgageDetails.originalTermYears),
    [analysis.originalLoanAmount, store.mortgageDetails.originalRate, store.mortgageDetails.originalTermYears]
  );
  const strategies = useMemo(() => {
    const cashFlow = store.monthlyIncome - store.monthlyExpenses;
    return compareMortgageStrategies(mortgageInput, cashFlow, {
      limit: store.loc.limit, apr: store.loc.interestRate, balance: store.loc.balance,
    });
  }, [mortgageInput, store.monthlyIncome, store.monthlyExpenses, store.loc]);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 0));
  const restart = () => setStep(0);

  if (!mounted) {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-500/30 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-gray-500/20 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const md = store.mortgageDetails;
  const updateMD = store.updateMortgageDetails;

  const renderStep = () => {
    switch (step) {
      // ── Step 0: Tell Me About Your Home ──
      case 0:
        return (
          <div className="space-y-6">
            {/* Entry mode tabs */}
            <div className="flex gap-2">
              {(['purchase', 'current', 'both'] as const).map((mode) => (
                <button key={mode} onClick={() => updateMD({ entryMode: mode })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    md.entryMode === mode
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                  }`}>
                  {mode === 'purchase' ? 'When I Bought It' : mode === 'current' ? 'Where I Am Now' : 'Both'}
                </button>
              ))}
            </div>

            {/* Purchase fields */}
            {(md.entryMode === 'purchase' || md.entryMode === 'both') && (
              <div className={`${classes.glass} rounded-xl p-5 space-y-4`}>
                <h3 className={`text-sm font-semibold ${classes.textSecondary} uppercase tracking-wide`}>🏠 When You Bought It</h3>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Age at Purchase</label>
                  <EditableNumber value={md.purchaseAge} onChange={(v) => updateMD({ purchaseAge: v })} ariaLabel="Vault age at purchase" size="lg" />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Purchase Price</label>
                  <EditableCurrency value={md.originalCost} onChange={(v) => updateMD({ originalCost: v })} ariaLabel="Vault purchase price" size="lg" />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Down Payment</label>
                  <EditableCurrency value={md.downPayment} onChange={(v) => updateMD({ downPayment: v })} ariaLabel="Vault down payment" size="lg" />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Term</label>
                  <div className="flex gap-2">
                    {[15, 30].map(t => (
                      <button key={t} onClick={() => updateMD({ originalTermYears: t })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          md.originalTermYears === t
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                        }`}>
                        {t} yr
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Original Rate</label>
                  <EditablePercentage value={md.originalRate} onChange={(v) => updateMD({ originalRate: v })} ariaLabel="Vault original rate" size="lg" />
                </div>
              </div>
            )}

            {/* Current fields */}
            {(md.entryMode === 'current' || md.entryMode === 'both') && (
              <div className={`${classes.glass} rounded-xl p-5 space-y-4`}>
                <h3 className={`text-sm font-semibold ${classes.textSecondary} uppercase tracking-wide`}>📍 Where You Are Now</h3>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Current Age</label>
                  <EditableNumber value={store.currentAge} onChange={store.setCurrentAge} ariaLabel="Vault current age" size="lg" />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Current Balance</label>
                  <EditableCurrency value={md.currentBalance} onChange={(v) => updateMD({ currentBalance: v })} ariaLabel="Vault current balance" size="lg" />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Remaining Years</label>
                  <EditableNumber value={Math.round(md.remainingTermMonths / 12)} onChange={(v) => updateMD({ remainingTermMonths: v * 12 })} suffix=" years" ariaLabel="Vault remaining years" size="lg" />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Current Rate</label>
                  <EditablePercentage value={md.currentRate} onChange={(v) => updateMD({ currentRate: v })} ariaLabel="Vault current rate" size="lg" />
                </div>
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Monthly Payment</label>
                  <EditableCurrency value={md.currentMonthlyPayment} onChange={(v) => updateMD({ currentMonthlyPayment: v })} ariaLabel="Vault monthly payment" size="lg" />
                </div>
              </div>
            )}

            {/* Payment behavior */}
            <div className={`${classes.glass} rounded-xl p-5 space-y-4`}>
              <h3 className={`text-sm font-semibold ${classes.textSecondary} uppercase tracking-wide`}>💰 Payment Behavior</h3>
              <div>
                <label className={`text-sm ${classes.textSecondary} mb-2 block`}>Payment Frequency</label>
                <div className="flex gap-2">
                  {(['monthly', 'biweekly', 'weekly'] as const).map((freq) => (
                    <button key={freq} onClick={() => updateMD({ paymentFrequency: freq })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        md.paymentFrequency === freq
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                      }`}>
                      {freq === 'monthly' ? 'Monthly' : freq === 'biweekly' ? 'Bi-Weekly' : 'Weekly'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <label className={`text-sm ${classes.textSecondary}`}>Making extra payments?</label>
                <button onClick={() => updateMD({ hasExtraPayments: !md.hasExtraPayments })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    md.hasExtraPayments
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                  }`}>
                  {md.hasExtraPayments ? 'Yes' : 'No'}
                </button>
              </div>
              {md.hasExtraPayments && (
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>Extra per payment</label>
                  <EditableCurrency value={md.extraPaymentAmount} onChange={(v) => updateMD({ extraPaymentAmount: v })} ariaLabel="Vault extra payment amount" size="lg" />
                </div>
              )}
              <div className="flex justify-between items-center">
                <label className={`text-sm ${classes.textSecondary}`}>Have you refinanced?</label>
                <button onClick={() => updateMD({ hasRefinanced: !md.hasRefinanced, refinanceCount: md.hasRefinanced ? 0 : 1 })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    md.hasRefinanced
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : `${classes.glass} ${classes.textSecondary} border border-gray-400/20`
                  }`}>
                  {md.hasRefinanced ? 'Yes' : 'No'}
                </button>
              </div>
              {md.hasRefinanced && (
                <div className="flex justify-between items-center">
                  <label className={`text-sm ${classes.textSecondary}`}>How many times?</label>
                  <EditableNumber value={md.refinanceCount} onChange={(v) => updateMD({ refinanceCount: v })} ariaLabel="Vault refinance count" size="lg" min={1} max={10} />
                </div>
              )}
            </div>

            <p className={`text-sm ${classes.textMuted} text-center`}>Click any number to edit</p>
          </div>
        );

      // ── Step 1: The Wealth Transfer ──
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center py-4">
              <div className={`${classes.textSecondary} mb-1`}>Your original mortgage</div>
              <div className={`text-3xl font-mono ${classes.text}`}>{formatCurrency(analysis.originalLoanAmount)}</div>
              <div className={`text-sm ${classes.textMuted} mt-1`}>
                {formatCurrency(md.originalCost)} home − {formatCurrency(md.downPayment)} down
              </div>
            </div>

            <div className={`${classes.glass} rounded-xl p-6 space-y-4`}>
              <div className="flex justify-between items-center">
                <span className={classes.textSecondary}>Total you&apos;ll pay over {md.originalTermYears} years</span>
                <span className={`text-2xl font-mono ${classes.text}`}>
                  <CountUp value={analysis.totalPaidLifetime} />
                </span>
              </div>
              <div className="border-t border-gray-400/30 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className={classes.textSecondary}>Your home (principal)</span>
                  <span className="text-emerald-500 font-mono">{formatCurrency(analysis.originalLoanAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={classes.textSecondary}>Interest portion</span>
                  <span className="text-red-500 font-mono text-2xl font-bold">
                    <CountUp value={analysis.totalInterestLifetime} />
                  </span>
                </div>
              </div>
            </div>

            {/* Interest vs Principal bar for current payment */}
            <div className={`${classes.glass} rounded-xl p-6`}>
              <p className={`text-sm ${classes.textSecondary} mb-3`}>Where your payment goes RIGHT NOW</p>
              <div className="flex h-8 rounded-lg overflow-hidden mb-2">
                <div className="bg-red-500 transition-all duration-1000" style={{ width: `${analysis.interestPercentOfPayment}%` }} />
                <div className="bg-emerald-500 transition-all duration-1000" style={{ width: `${analysis.principalPercentOfPayment}%` }} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-400">🏦 Interest: {analysis.interestPercentOfPayment.toFixed(0)}%</span>
                <span className="text-emerald-400">🏠 Your Equity: {analysis.principalPercentOfPayment.toFixed(0)}%</span>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
              <p className={classes.textSecondary}>In the first 7 years...</p>
              <p className="text-3xl font-bold text-red-500 my-2">
                <CountUp value={analysis.first7YearsInterestPercent} prefix="" suffix="%" decimals={0} />
              </p>
              <p className={classes.textSecondary}>of each payment is estimated as interest</p>
            </div>

            {md.hasRefinanced && analysis.refinancePenalty > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                <p className={classes.textSecondary}>Refinancing can <span className="text-amber-400 font-bold">change the interest schedule</span></p>
                <p className="text-2xl font-bold text-amber-500 mt-2">
                  <CountUp value={analysis.refinancePenalty} />
                </p>
                <p className={`text-sm ${classes.textMuted} mt-1`}>estimated extra interest from {md.refinanceCount} refinance{md.refinanceCount > 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        );

      // ── Step 2: The Amortization Trap ──
      case 2:
        return (
          <div className="space-y-6">
            {/* Amortization bar chart */}
            <div className={`${classes.glass} rounded-xl p-6`}>
              <p className={`text-sm ${classes.textSecondary} mb-4`}>Interest vs Principal by Year</p>
              <div className="h-48 flex items-end gap-[2px]">
                {amortBreakdown.map((yr) => {
                  const total = yr.interestPaid + yr.principalPaid;
                  const intPct = total > 0 ? (yr.interestPaid / total) * 100 : 0;
                  const maxVal = amortBreakdown[0].interestPaid + amortBreakdown[0].principalPaid;
                  const heightPct = maxVal > 0 ? (total / maxVal) * 100 : 0;
                  const isCurrentYear = yr.year === Math.ceil(history.yearsInMortgage);
                  return (
                    <div key={yr.year} className="flex-1 flex flex-col justify-end" style={{ height: '100%' }}>
                      <div className={`rounded-t-sm overflow-hidden ${isCurrentYear ? 'ring-2 ring-white/50' : ''}`}
                        style={{ height: `${heightPct}%` }}>
                        <div className="bg-red-500/70 w-full" style={{ height: `${intPct}%` }} />
                        <div className="bg-emerald-500/70 w-full" style={{ height: `${100 - intPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className={classes.textMuted}>Year 1</span>
                <span className={classes.textMuted}>Year {md.originalTermYears}</span>
              </div>
              <div className="flex gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500/70 rounded" /> Interest</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500/70 rounded" /> Principal</span>
                {history.yearsInMortgage > 0 && (
                  <span className="flex items-center gap-1"><span className="w-3 h-3 ring-2 ring-white/50 rounded" /> You are here</span>
                )}
              </div>
            </div>

            {/* Your progress so far */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center space-y-3">
              <p className={classes.textSecondary}>
                You&apos;ve been paying for <span className="text-white font-bold">{history.yearsInMortgage.toFixed(1)} years</span>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs ${classes.textMuted}`}>Total Paid So Far</p>
                  <p className="text-xl font-bold text-amber-400"><CountUp value={history.totalPaidSoFar} /></p>
                </div>
                <div>
                  <p className={`text-xs ${classes.textMuted}`}>Your Equity (Principal)</p>
                  <p className="text-xl font-bold text-emerald-400"><CountUp value={history.principalPaidSoFar} /></p>
                </div>
              </div>
              <p className="text-red-400 text-sm font-medium">
                      {formatCurrency(history.interestPaidSoFar)} was paid as interest
              </p>
            </div>

            {/* Equity progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className={classes.textSecondary}>Equity Built</span>
                <span className="text-emerald-400 font-bold">{history.equityPercent.toFixed(1)}%</span>
              </div>
              <ProgressBar progress={history.equityPercent} color="emerald" />
              <p className={`text-xs ${classes.textMuted} mt-1 text-center`}>
                After {history.yearsInMortgage.toFixed(1)} years of payments, you own {history.equityPercent.toFixed(1)}% of your home
              </p>
            </div>
          </div>
        );

      // ── Step 3: What If You Changed The Tool? ──
      case 3:
        return (
          <div className="space-y-6">
            <p className={`text-sm ${classes.textSecondary} text-center`}>4 strategies for YOUR remaining mortgage</p>

            <div className="grid grid-cols-2 gap-3">
              {/* Standard */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-xs text-red-400 font-semibold mb-2">Keep Paying As-Is</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatMortgageMonths(strategies.standard)}
                </p>
                <p className="text-sm text-red-400/80">{formatMortgageInterest(strategies.standard.totalInterest, strategies.standard.isPayoffPossible)}</p>
                <p className={`text-xs ${classes.textMuted} mt-1`}>
                  {strategies.standard.isPayoffPossible
                    ? `Payoff: ${strategies.standard.payoffDate}`
                    : formatProjectionFailure(strategies.standard.failureReason)}
                </p>
              </div>

              {/* Bi-weekly */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-xs text-blue-400 font-semibold mb-2">Bi-Weekly Payments</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatMortgageMonths(strategies.biweekly)}
                </p>
                <p className="text-sm text-blue-400/80">{formatMortgageSavings(strategies.biweekly)}</p>
                <p className={`text-xs ${classes.textMuted} mt-1`}>{formatMortgageTimeDelta(strategies.biweekly)}</p>
              </div>

              {/* Extra Payments */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-xs text-amber-400 font-semibold mb-2">+{formatCurrency(strategies.extraPayment.extraAmount)}/mo Extra</p>
                <p className="text-2xl font-bold text-amber-400">
                  {formatMortgageMonths(strategies.extraPayment)}
                </p>
                <p className="text-sm text-amber-400/80">{formatMortgageSavings(strategies.extraPayment)}</p>
                <p className={`text-xs ${classes.textMuted} mt-1`}>{formatMortgageTimeDelta(strategies.extraPayment)}</p>
              </div>

              {/* Velocity */}
              <div className="bg-emerald-500/15 border border-emerald-500/50 rounded-xl p-4 ring-1 ring-emerald-500/30">
                <p className="text-xs text-emerald-400 font-semibold mb-2">⚡ Velocity Banking</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {strategies.velocity.isPayoffPossible ? (
                    `${strategies.velocity.months} mo`
                  ) : (
                    'Review inputs'
                  )}
                </p>
                <p className="text-sm text-emerald-400/80">
                  {formatMortgageSavings(strategies.velocity)}
                </p>
                <p className="text-xs text-emerald-400 mt-1 font-medium">
                  {formatMortgageTimeDelta(strategies.velocity)}
                </p>
              </div>
            </div>

            {/* Visual comparison bar */}
            <div className={`${classes.glass} rounded-xl p-5 space-y-3`}>
              <p className={`text-xs ${classes.textSecondary} mb-2`}>Time to Payoff</p>
              {[
                { label: 'Standard', months: strategies.standard.months, color: 'bg-red-500', isPayoffPossible: strategies.standard.isPayoffPossible },
                { label: 'Bi-Weekly', months: strategies.biweekly.months, color: 'bg-blue-500', isPayoffPossible: strategies.biweekly.isPayoffPossible },
                { label: 'Extra $', months: strategies.extraPayment.months, color: 'bg-amber-500', isPayoffPossible: strategies.extraPayment.isPayoffPossible },
                { label: 'Velocity', months: strategies.velocity.months, color: 'bg-emerald-500', isPayoffPossible: strategies.velocity.isPayoffPossible },
              ].map(s => {
                const width = s.isPayoffPossible && strategies.standard.months > 0
                  ? (s.months / strategies.standard.months) * 100
                  : 0;
                return (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className={`text-xs w-16 ${classes.textSecondary}`}>{s.label}</span>
                    <div className="flex-1 bg-gray-400/20 rounded-full h-4 overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full transition-all duration-1000`}
                        style={{ width: `${width}%` }} />
                    </div>
                    <span className={`text-xs font-mono w-14 text-right ${classes.textSecondary}`}>
                      {s.isPayoffPossible ? `${Math.floor(s.months / 12)}y ${s.months % 12}m` : 'Review'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      // ── Step 4: The Generational Picture ──
      case 4: {
        const priorGenerationInterest = analysis.totalInterestLifetime * 0.73;
        const nextGenerationInterest = analysis.totalInterestLifetime * 1.56;
        const totalGenerational = priorGenerationInterest + analysis.totalInterestLifetime + nextGenerationInterest;
        const generationalFutureValue = calculateFutureValue(totalGenerational, investmentRate, 50);

        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <p className={classes.textSecondary}>How mortgage interest can echo across generations</p>
              <p className={`text-xs ${classes.textMuted}`}>A calm estimate of interest patterns, assumptions, and choices.</p>
              <p className={`text-xs ${classes.textMuted} mt-1`}>
                Illustrative multipliers: prior generation 73% of this loan&apos;s lifetime interest; next generation 156%.
              </p>
            </div>

            <div className="space-y-3">
              <div className={`${classes.glass} rounded-xl p-4 flex justify-between items-center`}>
                <span className={classes.textSecondary}>Assumed prior-generation interest</span>
                <span className="text-red-500 font-mono">{formatCurrency(priorGenerationInterest)}</span>
              </div>
              <div className={`${classes.glass} rounded-xl p-4 flex justify-between items-center border border-red-500/30`}>
                <span className={classes.textSecondary}>Your mortgage interest</span>
                <span className="text-red-500 font-mono font-bold">{formatCurrency(analysis.totalInterestLifetime)}</span>
              </div>
              <div className={`${classes.glass} rounded-xl p-4 flex justify-between items-center`}>
                <span className={classes.textSecondary}>Assumed next-generation interest</span>
                <span className="text-red-500 font-mono">{formatCurrency(nextGenerationInterest)}</span>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <div className={`${classes.textSecondary} mb-2`}>Estimated interest across 3 generations</div>
              <div className="text-4xl font-bold text-red-500">
                <CountUp value={totalGenerational} />
              </div>
              <p className={`text-xs ${classes.textMuted} mt-2`}>Many households refinance, move, or restart amortization before full payoff.</p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
              <div className={`${classes.textSecondary} mb-2`}>If invested instead (50 years @ {(investmentRate * 100).toFixed(0)}%)</div>
              <div className="text-4xl font-bold text-amber-500">
                <CountUp value={generationalFutureValue} />
              </div>
              <p className={`text-sm ${classes.textMuted} mt-2`}>Modeled opportunity cost if assumptions held</p>
              <div className="mt-3">
                <EditablePercentage value={investmentRate} onChange={setInvestmentRate} size="sm" label="Adjust return rate" ariaLabel="Vault investment return rate" />
              </div>
            </div>
          </div>
        );
      }

      // ── Step 5: Your Freedom Path ──
      case 5: {
        const monthlyPayment = md.entryMode === 'purchase' ? analysis.originalPayment : md.currentMonthlyPayment;
        const freedomPath = buildVaultFreedomPathModel({
          currentAge: store.currentAge,
          standardMonths: strategies.standard.months,
          velocity: strategies.velocity,
          monthlyPayment,
          investmentRate,
        });
        const velocityTimelinePercent = freedomPath.isProjected && freedomPath.standardYears > 0
          ? Math.min(100, Math.max(0, (freedomPath.velocityYears / freedomPath.standardYears) * 100))
          : 0;

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center">
                <div className={`${classes.textSecondary} text-sm mb-2`}>Interest Saved</div>
                <div className="text-2xl font-bold text-emerald-500">
                  {freedomPath.isProjected ? (
                    <CountUp value={strategies.velocity.saved} />
                  ) : (
                    freedomPath.interestSavedLabel
                  )}
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 text-center">
                <div className={`${classes.textSecondary} text-sm mb-2`}>Years of Freedom</div>
                <div className="text-2xl font-bold text-blue-500">
                  {freedomPath.isProjected ? (
                    <CountUp value={freedomPath.freedYears} prefix="" suffix=" years" />
                  ) : (
                    freedomPath.freedomYearsLabel
                  )}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className={`${classes.glass} rounded-xl p-5`}>
              <div className="mb-4">
                <div className={`text-sm ${classes.textSecondary} mb-2`}>Traditional Path</div>
                <div className="relative h-4 bg-gray-400/30 rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-400 rounded-full" />
                </div>
                <div className={`flex justify-between mt-1 text-xs ${classes.textMuted}`}>
                  <span>Age {store.currentAge}</span>
                  <span>{freedomPath.standardAgeLabel}</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-emerald-500 mb-2">Velocity Banking Path</div>
                <div className="relative h-4 bg-gray-400/30 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                    style={{ width: `${velocityTimelinePercent}%` }} />
                  {freedomPath.isProjected && (
                    <div className="absolute inset-y-0 bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                      style={{ left: `${velocityTimelinePercent}%`, right: 0 }} />
                  )}
                </div>
                <div className="flex justify-between mt-1 text-xs">
                  <span className={classes.textMuted}>Age {store.currentAge}</span>
                  <span className="text-emerald-500">{freedomPath.velocityAgeLabel}</span>
                  {freedomPath.isProjected ? (
                  <span className="text-amber-500">Building wealth →</span>
                  ) : (
                    <span className="text-amber-500">{freedomPath.timelineLabel}</span>
                  )}
                </div>
              </div>
            </div>

            <div className={`${classes.glass} rounded-xl p-8 text-center border border-emerald-500/30`}>
              <div className={`${classes.textSecondary} mb-2`}>Potential Portfolio Value</div>
              <div className="text-5xl font-bold text-emerald-500">
                {freedomPath.isProjected ? (
                  <CountUp value={freedomPath.investmentGrowth} />
                ) : (
                  freedomPath.portfolioValueLabel
                )}
              </div>
              <p className={`text-sm ${classes.textMuted} mt-3`}>
                {freedomPath.investmentCaption}
              </p>
            </div>

            <div className="text-center">
              <p className={classes.textSecondary}>
                This is a modeled planning path —
                <span className="text-emerald-500 font-semibold"> with assumptions you can inspect.</span>
              </p>
            </div>

            <div className="bg-gray-500/20 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">
                <Link href="/" className="text-emerald-500 hover:underline">Dashboard</Link>
                {" · "}
                <Link href="/simulator" className="text-blue-500 hover:underline">Simulator</Link>
              </p>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const stepTitles = [
    { title: "Tell Me About Your Home", subtitle: "Let's see what your mortgage is really costing you" },
    { title: "The Wealth Transfer", subtitle: "Understand the schedule before it runs you" },
    { title: "The Amortization Pattern", subtitle: "How front-loaded interest slows equity" },
    { title: "What If You Changed The Tool?", subtitle: "4 strategies for your specific mortgage" },
    { title: "The Generational Picture", subtitle: "It's not just about you" },
    { title: "Your Freedom Path", subtitle: "Build a clear payoff path" },
  ];

  return (
    <PageTransition>
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <ScrollReveal as="header" className="mb-8">
        <h1 className={`text-3xl font-bold ${classes.text} mb-2`}>Wealth Transfer Timeline</h1>
        <p className={classes.textSecondary}>See the true cost of your mortgage</p>
      </ScrollReveal>

      <div className="flex gap-2 mb-8">
        {stepTitles.map((_, i) => (
          <div key={i}
            className={`flex-1 h-2 rounded-full cursor-pointer transition-colors ${i <= step ? 'bg-emerald-500' : `${classes.bgSecondary} hover:opacity-80`}`}
            onClick={() => setStep(i)} />
        ))}
      </div>

      {analysis.warnings.length > 0 && (
        <div className={`${classes.glass} border border-amber-400/40 rounded-xl p-4 mb-6 space-y-2`}>
          <div className="text-sm font-semibold text-amber-300">Assumption check</div>
          {analysis.warnings.map((warning) => (
            <p
              key={warning.type}
              className={`text-sm ${warning.severity === 'critical' ? 'text-red-300' : 'text-amber-100'}`}
            >
              {warning.message}
            </p>
          ))}
        </div>
      )}

      <ScrollReveal variant="scaleIn">
      <div className={`${classes.glass} rounded-3xl p-8 mb-8`}>
        <div className="text-center mb-6">
          <h2 className={`text-xl font-semibold ${classes.text}`}>{stepTitles[step].title}</h2>
          <p className={classes.textSecondary}>{stepTitles[step].subtitle}</p>
        </div>
        {renderStep()}
      </div>
      </ScrollReveal>

      <div className="flex gap-4">
        {step > 0 && (
          <button onClick={prevStep}
            className={`flex-1 px-6 py-3 ${classes.glassButton} ${classes.text} rounded-xl transition-colors`}>
            Back
          </button>
        )}
        {step < 5 ? (
          <button onClick={nextStep}
            className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
            {step === 0 ? "Show Me The Truth" : "Continue"}
          </button>
        ) : (
          <button onClick={restart}
            className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors">
            Start Over
          </button>
        )}
      </div>

      <footer className={`mt-12 text-center text-sm ${classes.textSecondary}`}>
        Educational estimate. Click any number to edit. Not financial advice.
      </footer>
    </div>
    </PageTransition>
  );
}
