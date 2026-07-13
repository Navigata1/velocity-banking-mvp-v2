'use client';

import { useState } from 'react';
import { EditableCurrency, EditablePercentage } from '@/components/EditableNumber';
import type { DebtItem } from '@/engine/portfolio';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { ALL_CATEGORIES, categoryIcon, categoryLabel, paymentSourceLabel } from './portfolio-formatters';
import type { PortfolioThemeClasses } from './portfolio-types';

const initialDebt: Omit<DebtItem, 'id' | 'createdAt'> = {
  name: 'New Debt',
  category: 'auto',
  kind: 'amortized',
  balance: 10000,
  apr: 0.065,
  minPaymentRule: { type: 'fixed', amount: 300 },
  termMonths: 60,
  paymentSource: 'checking',
  notes: '',
};

interface AddDebtDialogProps {
  classes: PortfolioThemeClasses;
  open: boolean;
  onClose: () => void;
}

export default function AddDebtDialog({ classes, open, onClose }: AddDebtDialogProps) {
  const store = usePortfolioStore();
  const [newDebt, setNewDebt] = useState(initialDebt);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="portfolio-add-debt-title"
        className={`${classes.glass} w-full max-w-xl rounded-3xl p-6 md:p-8`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 id="portfolio-add-debt-title" className={`text-xl font-bold ${classes.text}`}>Add a debt</h3>
            <p className={`${classes.textSecondary} text-sm`}>Start simple. You can refine details later.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add debt dialog"
            className={`text-xl ${classes.textSecondary}`}
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${classes.glassButton} rounded-2xl p-4`}>
            <p className={`${classes.textMuted} text-xs mb-1`}>Name</p>
            <input
              value={newDebt.name}
              aria-label="New debt name"
              onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
              className={`w-full bg-transparent border ${classes.border} rounded-lg px-3 py-2 ${classes.text}`}
            />
          </div>

          <div className={`${classes.glassButton} rounded-2xl p-4`}>
            <p className={`${classes.textMuted} text-xs mb-1`}>Type</p>
            <select
              value={newDebt.category}
              aria-label="New debt type"
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
            <EditableCurrency value={newDebt.balance} onChange={(v) => setNewDebt({ ...newDebt, balance: v })} ariaLabel="New debt balance" size="lg" />
          </div>

          <div className={`${classes.glassButton} rounded-2xl p-4`}>
            <p className={`${classes.textMuted} text-xs mb-1`}>APR</p>
            <EditablePercentage value={newDebt.apr} onChange={(v) => setNewDebt({ ...newDebt, apr: v })} ariaLabel="New debt APR" size="lg" />
          </div>

          <div className={`${classes.glassButton} rounded-2xl p-4`}>
            <p className={`${classes.textMuted} text-xs mb-1`}>Minimum Payment</p>
            <EditableCurrency
              value={newDebt.minPaymentRule.type === 'fixed' ? newDebt.minPaymentRule.amount : 0}
              onChange={(v) => setNewDebt({ ...newDebt, minPaymentRule: { type: 'fixed', amount: v } })}
              ariaLabel="New debt minimum payment"
              size="lg"
            />
          </div>

          <div className={`${classes.glassButton} rounded-2xl p-4`}>
            <p className={`${classes.textMuted} text-xs mb-1`}>Pay From</p>
            <select
              value={newDebt.paymentSource}
              aria-label="New debt payment source"
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

        <div className="mt-4 rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-emerald-400">
            💡 <strong>Tip:</strong> Include all debts, even small ones. When one gets paid off, that freed payment accelerates the next. That&apos;s momentum.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className={`${classes.glassButton} px-4 py-2 rounded-xl border ${classes.border} ${classes.textSecondary}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              store.addDebt(newDebt as Omit<DebtItem, 'id' | 'createdAt'>);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-all text-sm font-semibold text-white"
          >
            Add Debt
          </button>
        </div>
      </div>
    </div>
  );
}
