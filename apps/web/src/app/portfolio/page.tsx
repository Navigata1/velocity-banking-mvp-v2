'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFinancialStore } from '@/stores/financial-store';
import { usePortfolioStore, PayoffStrategy } from '@/stores/portfolio-store';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import {
  formatCurrency,
  formatMonths,
  formatDate,
  simulateMultiDebt,
  DebtItem,
  MultiDebtResult,
} from '@/engine/calculations';

const DEBT_TYPE_META: Record<string, { icon: string; label: string }> = {
  car: { icon: '🚗', label: 'Auto Loan' },
  house: { icon: '🏠', label: 'Mortgage' },
  land: { icon: '🏞️', label: 'Land' },
  creditCard: { icon: '💳', label: 'Credit Card' },
  studentLoan: { icon: '🎓', label: 'Student Loan' },
  medical: { icon: '🏥', label: 'Medical' },
  personal: { icon: '💵', label: 'Personal Loan' },
  recreation: { icon: '🚤', label: 'Recreation' },
  custom: { icon: '➕', label: 'Custom' },
};

const STRATEGY_INFO: Record<PayoffStrategy, { label: string; icon: string; description: string }> = {
  velocity: {
    label: 'Velocity Banking',
    icon: '⚡',
    description: 'Use LOC chunking to accelerate payoff. Recommended for maximum savings.',
  },
  avalanche: {
    label: 'Avalanche',
    icon: '🏔️',
    description: 'Pay highest interest rate first. Saves the most interest overall.',
  },
  snowball: {
    label: 'Snowball',
    icon: '⛄',
    description: 'Pay smallest balance first. Builds momentum with quick wins.',
  },
};

export default function PortfolioPage() {
  const [mounted, setMounted] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];
  const financialStore = useFinancialStore();
  const portfolioStore = usePortfolioStore();

  useEffect(() => setMounted(true), []);

  // Run simulation
  const simulation: MultiDebtResult | null = useMemo(() => {
    if (!mounted || portfolioStore.debts.length === 0) return null;
    return simulateMultiDebt(
      portfolioStore.debts,
      financialStore.monthlyIncome,
      financialStore.monthlyExpenses,
      {
        limit: financialStore.loc.limit,
        apr: financialStore.loc.interestRate,
        balance: financialStore.loc.balance,
      },
      portfolioStore.strategy
    );
  }, [mounted, portfolioStore.debts, portfolioStore.strategy, financialStore.monthlyIncome, financialStore.monthlyExpenses, financialStore.loc]);

  if (!mounted) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-500/30 rounded w-1/3 mb-6" />
          <div className="h-48 bg-gray-500/20 rounded-2xl mb-6" />
          <div className="h-96 bg-gray-500/20 rounded-2xl" />
        </div>
      </div>
    );
  }

  const cashFlow = financialStore.getCashFlow();
  const totalDebt = portfolioStore.debts.reduce((s, d) => s + d.balance, 0);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${classes.text}`}>
            📋 Debt Portfolio
          </h1>
          <p className={`text-sm ${classes.textSecondary} mt-1`}>
            One lane at a time. Let&apos;s see your full picture.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
        >
          + Add Debt
        </button>
      </div>

      {/* Warnings */}
      {simulation?.warnings.filter(w => w.severity !== 'info').map((w, i) => (
        <div
          key={i}
          className={`rounded-xl p-4 border ${
            w.severity === 'critical'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          <span className="font-medium">{w.severity === 'critical' ? '⚠️' : '💡'} </span>
          {w.message}
        </div>
      ))}

      {/* Summary Stats */}
      {simulation && (
        <div className={`${classes.glass} rounded-2xl p-5`}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              label="Total Debt"
              value={formatCurrency(totalDebt)}
              classes={classes}
              color="text-white"
            />
            <StatCard
              label="Interest Saved"
              value={formatCurrency(simulation.totalInterestSaved)}
              classes={classes}
              color="text-emerald-400"
              sublabel={`vs standard payments`}
            />
            <StatCard
              label="Time Saved"
              value={formatMonths(simulation.monthsSaved)}
              classes={classes}
              color="text-blue-400"
            />
            <StatCard
              label="Freedom Date"
              value={formatDate(simulation.totalMonths)}
              classes={classes}
              color="text-amber-400"
              sublabel={`${formatMonths(simulation.totalMonths)} from now`}
            />
            <StatCard
              label="Monthly Cash Flow"
              value={formatCurrency(cashFlow)}
              classes={classes}
              color={cashFlow > 0 ? 'text-emerald-400' : 'text-red-400'}
              sublabel="Your velocity fuel"
            />
          </div>
        </div>
      )}

      {/* Strategy Selector */}
      <div className={`${classes.glass} rounded-2xl p-5`}>
        <h2 className={`text-sm font-semibold ${classes.textSecondary} uppercase tracking-wider mb-3`}>
          Payoff Strategy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.keys(STRATEGY_INFO) as PayoffStrategy[]).map((key) => {
            const info = STRATEGY_INFO[key];
            const isActive = portfolioStore.strategy === key;
            return (
              <button
                key={key}
                onClick={() => portfolioStore.setStrategy(key)}
                className={`p-4 rounded-xl text-left transition-all border ${
                  isActive
                    ? 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : `${classes.bgSecondary} border-transparent hover:border-slate-600`
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{info.icon}</span>
                  <span className={`font-semibold ${isActive ? 'text-emerald-400' : classes.text}`}>
                    {info.label}
                  </span>
                  {key === 'velocity' && (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
                      RECOMMENDED
                    </span>
                  )}
                </div>
                <p className={`text-xs ${classes.textSecondary}`}>{info.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Debt List */}
      <div className="space-y-3">
        <h2 className={`text-sm font-semibold ${classes.textSecondary} uppercase tracking-wider`}>
          Your Debts ({portfolioStore.debts.length})
        </h2>
        {portfolioStore.debts.length === 0 ? (
          <div className={`${classes.glass} rounded-2xl p-12 text-center`}>
            <p className="text-4xl mb-3">📋</p>
            <p className={`${classes.text} font-medium mb-1`}>No debts added yet</p>
            <p className={`text-sm ${classes.textSecondary} mb-4`}>
              Add your debts to see your payoff plan. One lane at a time.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
            >
              + Add Your First Debt
            </button>
          </div>
        ) : (
          portfolioStore.debts.map((debt, index) => {
            const simDebt = simulation?.debts.find((d) => d.id === debt.id);
            const isFocus = simulation && index === 0; // First in order is focus
            return (
              <DebtCard
                key={debt.id}
                debt={debt}
                simResult={simDebt}
                isFocus={!!isFocus}
                classes={classes}
                onEdit={() => setEditingId(debt.id)}
                onRemove={() => portfolioStore.removeDebt(debt.id)}
                strategy={portfolioStore.strategy}
              />
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddForm || editingId) && (
        <DebtFormModal
          classes={classes}
          existingDebt={editingId ? portfolioStore.debts.find((d) => d.id === editingId) : undefined}
          onSave={(debt) => {
            if (editingId) {
              portfolioStore.updateDebt(editingId, debt);
            } else {
              portfolioStore.addDebt(debt);
            }
            setShowAddForm(false);
            setEditingId(null);
          }}
          onClose={() => {
            setShowAddForm(false);
            setEditingId(null);
          }}
        />
      )}

      {/* Disclaimer */}
      <p className={`text-xs ${classes.textMuted} text-center pt-4`}>
        📚 Educational simulation only. Results are estimates based on your inputs. Not financial advice.
      </p>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  sublabel,
  classes,
}: {
  label: string;
  value: string;
  color: string;
  sublabel?: string;
  classes: typeof themeClasses['original'];
}) {
  return (
    <div className="text-center">
      <div className={`text-xs ${classes.textSecondary} mb-1`}>{label}</div>
      <div className={`text-lg md:text-xl font-bold ${color}`}>{value}</div>
      {sublabel && <div className={`text-[10px] ${classes.textMuted}`}>{sublabel}</div>}
    </div>
  );
}

function DebtCard({
  debt,
  simResult,
  isFocus,
  classes,
  onEdit,
  onRemove,
  strategy,
}: {
  debt: DebtItem;
  simResult?: MultiDebtResult['debts'][0];
  isFocus: boolean;
  classes: typeof themeClasses['original'];
  onEdit: () => void;
  onRemove: () => void;
  strategy: PayoffStrategy;
}) {
  const meta = DEBT_TYPE_META[debt.type] ?? DEBT_TYPE_META.custom;
  const progressPercent = simResult
    ? Math.max(0, Math.min(100, ((debt.balance - (simResult.totalInterest ?? 0)) / debt.balance) * 100))
    : 0;
  const payoffMonths = simResult?.payoffMonths ?? 0;
  const interestSaved = simResult?.interestSaved ?? 0;

  return (
    <div
      className={`${classes.glass} rounded-2xl p-5 transition-all ${
        isFocus ? 'ring-1 ring-emerald-500/40' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-3xl flex-shrink-0 mt-1">{meta.icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold ${classes.text} truncate`}>{debt.name}</h3>
            {isFocus && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium whitespace-nowrap">
                {strategy === 'velocity' ? '⚡ FOCUS' : strategy === 'snowball' ? '⛄ NEXT' : '🏔️ NEXT'}
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <div className={`text-[10px] ${classes.textMuted}`}>Balance</div>
              <div className={`text-sm font-semibold ${classes.text}`}>{formatCurrency(debt.balance)}</div>
            </div>
            <div>
              <div className={`text-[10px] ${classes.textMuted}`}>APR</div>
              <div className={`text-sm font-semibold ${debt.apr >= 0.15 ? 'text-red-400' : debt.apr >= 0.08 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {(debt.apr * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className={`text-[10px] ${classes.textMuted}`}>Payment</div>
              <div className={`text-sm font-semibold ${classes.text}`}>{formatCurrency(debt.monthlyPayment)}/mo</div>
            </div>
            <div>
              <div className={`text-[10px] ${classes.textMuted}`}>Payoff</div>
              <div className={`text-sm font-semibold text-blue-400`}>
                {payoffMonths > 0 ? formatMonths(payoffMonths) : '—'}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-[10px] mb-1">
              <span className={classes.textMuted}>
                {simResult ? `${formatDate(payoffMonths)} payoff` : 'Calculating...'}
              </span>
              {interestSaved > 0 && (
                <span className="text-emerald-400 font-medium">
                  Save {formatCurrency(interestSaved)} in interest
                </span>
              )}
            </div>
            <div className={`h-2 rounded-full ${classes.bgTertiary} overflow-hidden`}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.max(2, 100 - (payoffMonths / Math.max(1, debt.termMonths)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className={`p-2 rounded-lg ${classes.textSecondary} hover:${classes.text} hover:bg-slate-700/50 transition-colors text-sm`}
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={onRemove}
            className={`p-2 rounded-lg ${classes.textSecondary} hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm`}
            title="Remove"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

function DebtFormModal({
  classes,
  existingDebt,
  onSave,
  onClose,
}: {
  classes: typeof themeClasses['original'];
  existingDebt?: DebtItem;
  onSave: (debt: Omit<DebtItem, 'id'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(existingDebt?.name ?? '');
  const [type, setType] = useState(existingDebt?.type ?? 'creditCard');
  const [balance, setBalance] = useState(existingDebt?.balance?.toString() ?? '');
  const [apr, setApr] = useState(existingDebt ? (existingDebt.apr * 100).toString() : '');
  const [payment, setPayment] = useState(existingDebt?.monthlyPayment?.toString() ?? '');
  const [term, setTerm] = useState(existingDebt?.termMonths?.toString() ?? '60');

  const canSave = name.trim() && parseFloat(balance) > 0 && parseFloat(apr) > 0 && parseFloat(payment) > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      type,
      balance: parseFloat(balance),
      apr: parseFloat(apr) / 100,
      monthlyPayment: parseFloat(payment),
      termMonths: parseInt(term) || 60,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${classes.bgSecondary} rounded-2xl border ${classes.border} w-full max-w-md shadow-2xl`}>
        <div className={`flex items-center justify-between p-5 border-b ${classes.border}`}>
          <h3 className={`${classes.text} font-semibold text-lg`}>
            {existingDebt ? 'Edit Debt' : 'Add a Debt'}
          </h3>
          <button onClick={onClose} className={`${classes.textSecondary} hover:${classes.text} p-1`}>
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className={`text-xs ${classes.textSecondary} block mb-1`}>Type</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(DEBT_TYPE_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => {
                    setType(key);
                    if (!name) setName(meta.label);
                  }}
                  className={`p-2 rounded-lg text-center text-xs transition-all border ${
                    type === key
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : `${classes.bgTertiary} border-transparent ${classes.textSecondary}`
                  }`}
                >
                  <div className="text-lg">{meta.icon}</div>
                  <div className="mt-0.5">{meta.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className={`text-xs ${classes.textSecondary} block mb-1`}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Chase Visa"
              className={`w-full ${classes.bgTertiary} ${classes.border} border rounded-xl px-4 py-2.5 ${classes.text} placeholder-gray-500 focus:outline-none focus:border-emerald-500`}
            />
          </div>

          {/* Balance + APR */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs ${classes.textSecondary} block mb-1`}>Balance ($)</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="8,500"
                className={`w-full ${classes.bgTertiary} ${classes.border} border rounded-xl px-4 py-2.5 ${classes.text} placeholder-gray-500 focus:outline-none focus:border-emerald-500`}
              />
            </div>
            <div>
              <label className={`text-xs ${classes.textSecondary} block mb-1`}>APR (%)</label>
              <input
                type="number"
                step="0.1"
                value={apr}
                onChange={(e) => setApr(e.target.value)}
                placeholder="21.9"
                className={`w-full ${classes.bgTertiary} ${classes.border} border rounded-xl px-4 py-2.5 ${classes.text} placeholder-gray-500 focus:outline-none focus:border-emerald-500`}
              />
            </div>
          </div>

          {/* Payment + Term */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs ${classes.textSecondary} block mb-1`}>Monthly Payment ($)</label>
              <input
                type="number"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                placeholder="250"
                className={`w-full ${classes.bgTertiary} ${classes.border} border rounded-xl px-4 py-2.5 ${classes.text} placeholder-gray-500 focus:outline-none focus:border-emerald-500`}
              />
            </div>
            <div>
              <label className={`text-xs ${classes.textSecondary} block mb-1`}>Term (months)</label>
              <input
                type="number"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="60"
                className={`w-full ${classes.bgTertiary} ${classes.border} border rounded-xl px-4 py-2.5 ${classes.text} placeholder-gray-500 focus:outline-none focus:border-emerald-500`}
              />
            </div>
          </div>

          {/* Coach tip */}
          <div className={`rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20`}>
            <p className="text-xs text-emerald-400">
              💡 <strong>Tip:</strong> Include all debts, even small ones. When one gets paid off, that freed payment accelerates the next. That&apos;s momentum.
            </p>
          </div>
        </div>

        <div className={`flex gap-3 p-5 border-t ${classes.border}`}>
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl ${classes.bgTertiary} ${classes.textSecondary} hover:${classes.text} transition-colors`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${
              canSave
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {existingDebt ? 'Update' : 'Add Debt'}
          </button>
        </div>
      </div>
    </div>
  );
}
