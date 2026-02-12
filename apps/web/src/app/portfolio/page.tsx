'use client';

import { useEffect, useState } from 'react';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { EditableCurrency, EditablePercentage, EditableNumber } from '@/components/EditableNumber';
import type { DebtItem, PayoffStrategy, FocusMode } from '@/engine/portfolio';
import { formatCurrency, formatDate } from '@/engine/calculations';

function categoryLabel(cat: DebtItem['category']): string {
  const labels: Record<string, string> = {
    mortgage: 'Mortgage', auto: 'Auto', credit_card: 'Credit Card',
    student_loan: 'Student Loan', personal_loan: 'Personal Loan',
    medical: 'Medical', land: 'Land', purchase_plan: 'Purchase Plan', custom: 'Custom',
  };
  return labels[cat] || 'Custom';
}

function categoryIcon(cat: DebtItem['category']): string {
  const icons: Record<string, string> = {
    mortgage: '🏠', auto: '🚗', credit_card: '💳', student_loan: '🎓',
    personal_loan: '💵', medical: '🏥', land: '🏞️', purchase_plan: '🛒', custom: '➕',
  };
  return icons[cat] || '📌';
}

function paymentSourceLabel(src: DebtItem['paymentSource']): string {
  return src === 'checking' ? 'Checking-only' : src === 'loc' ? 'LOC/HELOC' : 'Either';
}

function strategyLabel(s: PayoffStrategy): string {
  if (s === 'velocity') return 'Velocity Mode';
  if (s === 'snowball') return 'Snowball';
  return 'Avalanche';
}

function strategyDescription(s: PayoffStrategy): string {
  if (s === 'velocity') return 'Targets the debt that frees the most monthly payment next, then reduces daily interest burn — matching the Money Loop mindset.';
  if (s === 'snowball') return 'Smallest balance first for fast wins and motivation.';
  return 'Highest APR first to minimize total interest (classic math-optimal approach).';
}

function debtKindLabel(k: DebtItem['kind']): string {
  return k === 'amortized' ? 'Amortized' : k === 'revolving' ? 'Revolving' : 'Simple';
}

function getMinPaymentValue(debt: DebtItem): number {
  if (debt.minPaymentRule.type === 'fixed') return debt.minPaymentRule.amount;
  return Math.max(debt.minPaymentRule.floor, debt.balance * debt.minPaymentRule.percent);
}

const ALL_CATEGORIES: DebtItem['category'][] = [
  'mortgage', 'auto', 'credit_card', 'student_loan', 'personal_loan', 'medical', 'land', 'purchase_plan', 'custom',
];

export default function PortfolioPage() {
  const [mounted, setMounted] = useState(false);
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];
  const store = usePortfolioStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newDebt, setNewDebt] = useState<Omit<DebtItem, 'id' | 'createdAt'>>({
    name: 'New Debt',
    category: 'auto',
    kind: 'amortized',
    balance: 10000,
    apr: 0.065,
    minPaymentRule: { type: 'fixed', amount: 300 },
    termMonths: 60,
    paymentSource: 'checking',
    notes: '',
  });

  useEffect(() => {
    setMounted(true);
    store.recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-500/30 rounded w-1/3 mb-6" />
          <div className="h-48 bg-gray-500/20 rounded-2xl mb-6" />
          <div className="h-96 bg-gray-500/20 rounded-2xl" />
        </div>
      </div>
    );
  }

  const result = store.lastResult;
  const payoffMonths = result?.payoffMonths ?? 0;
  const payoffDateStr = payoffMonths ? formatDate(payoffMonths) : '—';
  const totalInterest = result?.totalInterest ?? 0;
  const payoffOrder = result?.payoffOrder ?? [];
  const warnings = result?.warnings ?? [];
  const totalDebt = store.debts.reduce((s, d) => s + d.balance, 0);
  const cashFlow = store.monthlyIncome - store.monthlyExpenses;

  const handleExport = () => {
    const text = store.exportState();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interestshield-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const res = store.importState(text);
    if (!res.ok) alert(res.error);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <h1 className={`text-3xl font-bold tracking-tight ${classes.text}`}>📋 Portfolio</h1>
        <p className={`${classes.textSecondary} max-w-3xl`}>
          Build a complete picture of your debts, then choose a payoff approach.{' '}
          <span className="text-emerald-400">Velocity Mode</span> prioritizes{' '}
          <span className="text-emerald-400">cash-flow unlock</span> first, then reduces daily interest burn — matching the Money Loop mindset.
        </p>
        <p className={`${classes.textMuted} text-xs`}>
          Educational estimates. Not financial advice. Always verify lender terms.
        </p>
      </header>

      {/* Plan Controls */}
      <section className={`${classes.glass} rounded-3xl p-6 md:p-8`}>
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start lg:justify-between">
          <div className="space-y-4 flex-1">
            {/* Income / Expenses / Extra */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Monthly Income</p>
                <EditableCurrency value={store.monthlyIncome} onChange={store.setMonthlyIncome} size="lg" />
              </div>
              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Monthly Expenses</p>
                <EditableCurrency value={store.monthlyExpenses} onChange={store.setMonthlyExpenses} size="lg" />
              </div>
              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Extra Toward Debt</p>
                <EditableCurrency value={store.extraMonthlyPayment} onChange={store.setExtraMonthlyPayment} size="lg" />
                <p className={`${classes.textMuted} text-[11px] mt-1`}>Optional, beyond minimums</p>
              </div>
            </div>

            {/* Strategy + Focus */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Strategy Picker */}
              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-2`}>Payoff Strategy</p>
                <div className="space-y-2">
                  {(['velocity', 'snowball', 'avalanche'] as PayoffStrategy[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => store.setStrategy(s)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        store.strategy === s
                          ? 'border-emerald-400 bg-emerald-500/10'
                          : `${classes.border} hover:bg-slate-800/40`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`font-semibold ${classes.text}`}>{strategyLabel(s)}</p>
                          <p className={`${classes.textSecondary} text-xs mt-1`}>{strategyDescription(s)}</p>
                        </div>
                        {s === 'velocity' && (
                          <span className="text-emerald-400 text-sm font-semibold flex-shrink-0">★ Recommended</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Mode */}
              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <div className="flex items-center justify-between">
                  <p className={`${classes.textMuted} text-xs`}>Focus Mode</p>
                  <span className="text-xs text-emerald-400 font-semibold">Single Lane Default</span>
                </div>
                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => store.setFocusMode('single')}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      store.focusMode === 'single'
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : `${classes.border} hover:bg-slate-800/40`
                    }`}
                  >
                    <p className={`font-semibold ${classes.text}`}>Single Lane</p>
                    <p className={`${classes.textSecondary} text-xs mt-1`}>
                      One target at a time for clarity and momentum.
                    </p>
                  </button>

                  <button
                    onClick={() => setShowAdvanced((v) => !v)}
                    className={`w-full text-left px-4 py-3 rounded-xl border ${classes.border} hover:bg-slate-800/40 transition-all`}
                  >
                    <p className={`font-semibold ${classes.text}`}>Advanced {showAdvanced ? '▲' : '▼'}</p>
                    <p className={`${classes.textSecondary} text-xs mt-1`}>Split Mode toggle + allocation control.</p>
                  </button>

                  {showAdvanced && (
                    <div className={`p-4 rounded-2xl border ${classes.border} bg-slate-900/30 space-y-3`}>
                      <button
                        onClick={() => store.setFocusMode(store.focusMode === 'split' ? 'single' : 'split')}
                        className={`w-full px-4 py-3 rounded-xl border transition-all ${
                          store.focusMode === 'split'
                            ? 'border-emerald-400 bg-emerald-500/10'
                            : `${classes.border} hover:bg-slate-800/40`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-semibold ${classes.text}`}>Split Mode</p>
                            <p className={`${classes.textSecondary} text-xs mt-1`}>
                              Allocate extra budget across the top two targets.
                            </p>
                          </div>
                          <span className={`text-sm ${classes.text}`}>
                            {store.focusMode === 'split' ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </button>

                      {store.focusMode === 'split' && (
                        <div>
                          <p className={`${classes.textMuted} text-xs mb-2`}>Primary target share</p>
                          <EditableNumber
                            value={store.splitRatioPrimary}
                            onChange={store.setSplitRatioPrimary}
                            format="percent"
                            min={0.5}
                            max={0.95}
                            step={0.05}
                            size="md"
                          />
                          <p className={`${classes.textSecondary} text-[11px] mt-1`}>
                            Secondary target receives {Math.round((1 - store.splitRatioPrimary) * 100)}%.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10">
                <p className="font-semibold text-amber-300">⚠️ Heads up</p>
                <ul className="list-disc list-inside mt-2 text-sm text-amber-200/90 space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          <div className="w-full lg:w-[320px] space-y-3 flex-shrink-0">
            <div className={`${classes.glassButton} rounded-2xl p-4`}>
              <p className={`${classes.textMuted} text-xs`}>Total Debt</p>
              <p className={`text-2xl font-bold mt-1 ${classes.text}`}>{formatCurrency(totalDebt)}</p>
            </div>
            <div className={`${classes.glassButton} rounded-2xl p-4`}>
              <p className={`${classes.textMuted} text-xs`}>Estimated Debt-Free</p>
              <p className={`text-2xl font-bold mt-1 ${classes.text}`}>{payoffDateStr}</p>
              <p className={`${classes.textSecondary} text-sm mt-1`}>
                {payoffMonths} mo • Interest est. {formatCurrency(totalInterest)}
              </p>
            </div>
            <div className={`${classes.glassButton} rounded-2xl p-4`}>
              <p className={`${classes.textMuted} text-xs`}>Monthly Cash Flow</p>
              <p className={`text-2xl font-bold mt-1 ${cashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(cashFlow)}
              </p>
              <p className={`${classes.textMuted} text-[11px] mt-1`}>Your velocity fuel</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAdd(true)}
                className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 transition-all text-sm font-semibold text-white"
              >
                + Add Debt
              </button>
              <button
                onClick={handleExport}
                className={`${classes.glassButton} px-4 py-3 rounded-2xl border ${classes.border} hover:bg-slate-800/40 transition-all text-sm font-semibold ${classes.text}`}
              >
                Export
              </button>
            </div>
            <label className={`${classes.glassButton} block px-4 py-3 rounded-2xl border ${classes.border} hover:bg-slate-800/40 transition-all text-sm font-semibold cursor-pointer text-center ${classes.text}`}>
              Import
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>
        </div>
      </section>

      {/* Debts Table */}
      <section className={`${classes.glass} rounded-3xl p-6 md:p-8`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-xl font-bold ${classes.text}`}>Your Debts</h2>
            <p className={`${classes.textSecondary} text-sm`}>
              Edit balances, APR, and minimums. Promo and payment-source flags help keep the plan realistic.
            </p>
          </div>
        </div>

        {store.debts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className={`${classes.text} font-medium mb-1`}>No debts added yet</p>
            <p className={`text-sm ${classes.textSecondary} mb-4`}>
              Add your debts to see your payoff plan. One lane at a time.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium"
            >
              + Add Your First Debt
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`${classes.textMuted} text-xs border-b ${classes.border}`}>
                  <th className="py-3 text-left">Debt</th>
                  <th className="py-3 text-left">Type</th>
                  <th className="py-3 text-left">Balance</th>
                  <th className="py-3 text-left">APR</th>
                  <th className="py-3 text-left">Minimum</th>
                  <th className="py-3 text-left">Pay From</th>
                  <th className="py-3 text-left">Promo</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody>
                {store.debts.map((d) => {
                  const isPrimary = payoffOrder.length > 0 && payoffOrder[0]?.id === d.id;
                  return (
                    <tr key={d.id} className={`border-b ${classes.border} hover:bg-slate-800/20 transition-colors ${isPrimary ? 'bg-emerald-500/5' : ''}`}>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{categoryIcon(d.category)}</span>
                          <div>
                            <input
                              value={d.name}
                              onChange={(e) => store.updateDebt(d.id, { name: e.target.value })}
                              className={`bg-transparent border-b ${classes.border} ${classes.text} focus:border-emerald-500 focus:outline-none w-full`}
                            />
                            <p className={`${classes.textMuted} text-[11px]`}>
                              {debtKindLabel(d.kind)}
                              {isPrimary && <span className="text-emerald-400 ml-2">⚡ Focus Target</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <select
                          value={d.category}
                          onChange={(e) => store.updateDebt(d.id, { category: e.target.value as DebtItem['category'] })}
                          className={`bg-transparent border ${classes.border} rounded-lg px-2 py-1 ${classes.text} text-xs`}
                        >
                          {ALL_CATEGORIES.map((c) => (
                            <option key={c} value={c} className="bg-slate-900">
                              {categoryLabel(c)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-3">
                        <EditableCurrency value={d.balance} onChange={(v) => store.updateDebt(d.id, { balance: v })} size="md" />
                      </td>
                      <td className="py-3 pr-3">
                        <EditablePercentage value={d.apr} onChange={(v) => store.updateDebt(d.id, { apr: v })} size="md" />
                      </td>
                      <td className="py-3 pr-3">
                        {d.minPaymentRule.type === 'fixed' ? (
                          <EditableCurrency
                            value={d.minPaymentRule.amount}
                            onChange={(v) => store.updateDebt(d.id, { minPaymentRule: { type: 'fixed', amount: v } })}
                            size="md"
                          />
                        ) : (
                          <div>
                            <p className={`${classes.textSecondary} text-xs`}>{formatCurrency(getMinPaymentValue(d))}</p>
                            <p className={`${classes.textMuted} text-[11px]`}>
                              {Math.round(d.minPaymentRule.percent * 100)}% • floor {formatCurrency(d.minPaymentRule.floor)}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <select
                          value={d.paymentSource}
                          onChange={(e) => store.updateDebt(d.id, { paymentSource: e.target.value as DebtItem['paymentSource'] })}
                          className={`bg-transparent border ${classes.border} rounded-lg px-2 py-1 ${classes.text} text-xs`}
                        >
                          {(['checking', 'either', 'loc'] as DebtItem['paymentSource'][]).map((s) => (
                            <option key={s} value={s} className="bg-slate-900">
                              {paymentSourceLabel(s)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-3">
                        {d.promo ? (
                          <div>
                            <p className="text-emerald-300 text-xs font-semibold">
                              {Math.round(d.promo.introApr * 100)}% for {d.promo.monthsRemaining} mo
                            </p>
                            <p className={`${classes.textMuted} text-[11px]`}>
                              Then {Math.round(d.promo.postIntroApr * 100)}%
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              store.updateDebt(d.id, {
                                promo: { introApr: 0, monthsRemaining: 6, postIntroApr: d.apr },
                              })
                            }
                            className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                          >
                            + Add promo
                          </button>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => store.removeDebt(d.id)}
                          className="text-xs text-red-300 hover:text-red-200 underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Payoff Order */}
      {payoffOrder.length > 0 && (
        <section className={`${classes.glass} rounded-3xl p-6 md:p-8`}>
          <h2 className={`text-xl font-bold ${classes.text} mb-2`}>Payoff Order</h2>
          <p className={`${classes.textSecondary} text-sm mb-4`}>
            Your plan based on {strategyLabel(store.strategy)} strategy, {store.focusMode === 'single' ? 'single lane' : 'split mode'} focus.
          </p>
          <ol className="space-y-3">
            {payoffOrder.map((p, idx) => (
              <li key={p.id} className={`${classes.glassButton} rounded-2xl p-4 border ${classes.border}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-emerald-500 text-white' : `${classes.bgTertiary} ${classes.textSecondary}`
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className={`font-semibold ${classes.text}`}>{p.name}</p>
                      <p className={`${classes.textSecondary} text-sm`}>Paid off around {formatDate(p.monthPaidOff)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-emerald-400 font-semibold">Month {p.monthPaidOff}</p>
                    {idx === 0 && (
                      <p className={`text-xs ${classes.textMuted}`}>⚡ Current target</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Add Debt Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${classes.glass} w-full max-w-xl rounded-3xl p-6 md:p-8`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className={`text-xl font-bold ${classes.text}`}>Add a debt</h3>
                <p className={`${classes.textSecondary} text-sm`}>Start simple. You can refine details later.</p>
              </div>
              <button onClick={() => setShowAdd(false)} className={`text-xl ${classes.textSecondary}`}>
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Name</p>
                <input
                  value={newDebt.name}
                  onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
                  className={`w-full bg-transparent border ${classes.border} rounded-lg px-3 py-2 ${classes.text}`}
                />
              </div>

              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Type</p>
                <select
                  value={newDebt.category}
                  onChange={(e) => setNewDebt({ ...newDebt, category: e.target.value as DebtItem['category'] })}
                  className={`w-full bg-transparent border ${classes.border} rounded-lg px-3 py-2 ${classes.text}`}
                >
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-slate-900">
                      {categoryIcon(c)} {categoryLabel(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Balance</p>
                <EditableCurrency value={newDebt.balance} onChange={(v) => setNewDebt({ ...newDebt, balance: v })} size="lg" />
              </div>

              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>APR</p>
                <EditablePercentage value={newDebt.apr} onChange={(v) => setNewDebt({ ...newDebt, apr: v })} size="lg" />
              </div>

              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Minimum Payment</p>
                <EditableCurrency
                  value={newDebt.minPaymentRule.type === 'fixed' ? newDebt.minPaymentRule.amount : 0}
                  onChange={(v) => setNewDebt({ ...newDebt, minPaymentRule: { type: 'fixed', amount: v } })}
                  size="lg"
                />
              </div>

              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Pay From</p>
                <select
                  value={newDebt.paymentSource}
                  onChange={(e) => setNewDebt({ ...newDebt, paymentSource: e.target.value as DebtItem['paymentSource'] })}
                  className={`w-full bg-transparent border ${classes.border} rounded-lg px-3 py-2 ${classes.text}`}
                >
                  {(['checking', 'either', 'loc'] as DebtItem['paymentSource'][]).map((s) => (
                    <option key={s} value={s} className="bg-slate-900">
                      {paymentSourceLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Coach tip */}
            <div className="mt-4 rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-400">
                💡 <strong>Tip:</strong> Include all debts, even small ones. When one gets paid off, that freed payment accelerates the next. That&apos;s momentum.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className={`${classes.glassButton} px-4 py-2 rounded-xl border ${classes.border} ${classes.textSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  store.addDebt(newDebt as Omit<DebtItem, 'id' | 'createdAt'>);
                  setShowAdd(false);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-all text-sm font-semibold text-white"
              >
                Add Debt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className={`text-xs ${classes.textMuted} text-center pt-2`}>
        📚 Educational simulation only. Results are estimates based on your inputs. Not financial advice.
      </p>
    </div>
  );
}
