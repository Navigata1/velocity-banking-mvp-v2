'use client';

import { EditableCurrency, EditablePercentage } from '@/components/EditableNumber';
import ScrollReveal from '@/components/ScrollReveal';
import { formatCurrency } from '@/engine/calculations';
import type { DebtItem, DebtPriorityRationale } from '@/engine/portfolio';
import { usePortfolioStore } from '@/stores/portfolio-store';
import {
  ALL_CATEGORIES,
  categoryIcon,
  categoryLabel,
  debtKindLabel,
  formatPortfolioPercentLabel,
  getMinPaymentValue,
  paymentSourceLabel,
} from './portfolio-formatters';
import type { PortfolioThemeClasses } from './portfolio-types';

interface PortfolioDebtsSectionProps {
  classes: PortfolioThemeClasses;
  onAddDebt: () => void;
}

export default function PortfolioDebtsSection({ classes, onAddDebt }: PortfolioDebtsSectionProps) {
  const store = usePortfolioStore();
  const result = store.lastResult;
  const payoffOrder = result?.payoffOrder ?? [];

  const renderCategorySelect = (debt: DebtItem, fullWidth = false, ariaLabel = `${debt.name} debt type`) => (
    <select
      value={debt.category}
      aria-label={ariaLabel}
      onChange={(e) => store.updateDebt(debt.id, { category: e.target.value as DebtItem['category'] })}
      className={`bg-transparent border ${classes.border} rounded-lg px-2 py-2 ${classes.text} text-xs ${fullWidth ? 'w-full' : ''}`}
    >
      {ALL_CATEGORIES.map((c) => (
        <option key={c} value={c} className="bg-slate-900">
          {categoryLabel(c)}
        </option>
      ))}
    </select>
  );

  const renderMinimumEditor = (d: DebtItem) => (
    d.minPaymentRule.type === 'fixed' ? (
      <EditableCurrency
        value={d.minPaymentRule.amount}
        onChange={(v) => store.updateDebt(d.id, { minPaymentRule: { type: 'fixed', amount: v } })}
        ariaLabel={`${d.name} minimum payment`}
        size="md"
      />
    ) : (
      <div>
        <p className={`${classes.textSecondary} text-sm font-mono`}>{formatCurrency(getMinPaymentValue(d))}</p>
        <p className={`${classes.textMuted} text-[11px]`}>
          {formatPortfolioPercentLabel(d.minPaymentRule.percent)} floor {formatCurrency(d.minPaymentRule.floor)}
        </p>
      </div>
    )
  );

  const renderPaymentSourceSelect = (debt: DebtItem, fullWidth = false, ariaLabel = `${debt.name} payment source`) => (
    <select
      value={debt.paymentSource}
      aria-label={ariaLabel}
      onChange={(e) => store.updateDebt(debt.id, { paymentSource: e.target.value as DebtItem['paymentSource'] })}
      className={`bg-transparent border ${classes.border} rounded-lg px-2 py-2 ${classes.text} text-xs ${fullWidth ? 'w-full' : ''}`}
    >
      {(['checking', 'either', 'loc'] as DebtItem['paymentSource'][]).map((s) => (
        <option key={s} value={s} className="bg-slate-900">
          {paymentSourceLabel(s)}
        </option>
      ))}
    </select>
  );

  const renderPromoControl = (debt: DebtItem) => (
    debt.promo ? (
      <div>
        <p className="text-emerald-300 text-xs font-semibold">
          {formatPortfolioPercentLabel(debt.promo.introApr)} for {debt.promo.monthsRemaining} mo
        </p>
        <p className={`${classes.textMuted} text-[11px]`}>
          Then {formatPortfolioPercentLabel(debt.promo.postIntroApr)}
        </p>
      </div>
    ) : (
      <button
        onClick={() =>
          store.updateDebt(debt.id, {
            promo: { introApr: 0, monthsRemaining: 6, postIntroApr: debt.apr },
          })
        }
        className="text-xs text-emerald-400 hover:text-emerald-300 underline"
      >
        + Add promo
      </button>
    )
  );

  const renderDebtRationale = (rationale?: DebtPriorityRationale, compact = false) => {
    if (!rationale) return null;
    const visiblePoints = compact ? rationale.points.slice(0, 2) : rationale.points;

    return (
      <div data-testid="portfolio-debt-rationale" className={`mt-2 space-y-1 text-[11px] leading-relaxed ${classes.textMuted}`}>
        <p className={`${classes.textSecondary} font-semibold`}>
          {rationale.isCurrentTarget ? 'Why this is the target' : `Priority #${rationale.rank}`}
        </p>
        {!compact && <p>{rationale.summary}</p>}
        <ul className="space-y-1">
          {visiblePoints.map((point) => (
            <li key={point} className="flex gap-1">
              <span className="text-emerald-400">-</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <ScrollReveal variant="fadeUp" delay={0.1}>
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
              onClick={onAddDebt}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium"
            >
              + Add Your First Debt
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4 md:hidden">
              {store.debts.map((d) => {
                const isPrimary = payoffOrder.length > 0 && payoffOrder[0]?.id === d.id;
                return (
                  <div
                    key={d.id}
                    data-testid="portfolio-mobile-debt-card"
                    className={`${classes.glassButton} rounded-2xl p-4 border ${classes.border} space-y-4 ${isPrimary ? 'bg-emerald-500/5 ring-1 ring-emerald-400/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="shrink-0 text-2xl">{categoryIcon(d.category)}</span>
                        <div className="min-w-0 flex-1">
                          <input
                            value={d.name}
                            aria-label={`Debt name for ${d.name}`}
                            onChange={(e) => store.updateDebt(d.id, { name: e.target.value })}
                            className={`w-full bg-transparent border-b ${classes.border} ${classes.text} focus:border-emerald-500 focus:outline-none`}
                          />
                          <p className={`${classes.textMuted} mt-1 text-[11px]`}>
                            {debtKindLabel(d.kind)}
                            {isPrimary && <span className="ml-2 text-emerald-400">Focus Target</span>}
                          </p>
                          {renderDebtRationale(result?.debtRationales?.[d.id])}
                        </div>
                      </div>
                      <button
                        onClick={() => store.removeDebt(d.id)}
                        aria-label={`Remove ${d.name}`}
                        className="shrink-0 text-xs text-red-300 hover:text-red-200 underline"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className={`${classes.glass} rounded-xl p-3`}>
                        <p className={`${classes.textMuted} text-[11px] mb-1`}>Balance</p>
                        <EditableCurrency value={d.balance} onChange={(v) => store.updateDebt(d.id, { balance: v })} ariaLabel={`${d.name} balance`} size="md" />
                      </div>
                      <div className={`${classes.glass} rounded-xl p-3`}>
                        <p className={`${classes.textMuted} text-[11px] mb-1`}>APR</p>
                        <EditablePercentage value={d.apr} onChange={(v) => store.updateDebt(d.id, { apr: v })} ariaLabel={`${d.name} APR`} size="md" />
                      </div>
                      <div className={`${classes.glass} rounded-xl p-3`}>
                        <p className={`${classes.textMuted} text-[11px] mb-1`}>Minimum</p>
                        {renderMinimumEditor(d)}
                      </div>
                      <div className={`${classes.glass} rounded-xl p-3`}>
                        <p className={`${classes.textMuted} text-[11px] mb-1`}>Pay From</p>
                        {renderPaymentSourceSelect(d, true)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className={`${classes.glass} rounded-xl p-3`}>
                        <p className={`${classes.textMuted} text-[11px] mb-1`}>Type</p>
                        {renderCategorySelect(d, true)}
                      </div>
                      <div className={`${classes.glass} rounded-xl p-3`}>
                        <p className={`${classes.textMuted} text-[11px] mb-1`}>Promo</p>
                        {renderPromoControl(d)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
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
                                aria-label={`Debt name for ${d.name}`}
                                onChange={(e) => store.updateDebt(d.id, { name: e.target.value })}
                                className={`bg-transparent border-b ${classes.border} ${classes.text} focus:border-emerald-500 focus:outline-none w-full`}
                              />
                              <p className={`${classes.textMuted} text-[11px]`}>
                                {debtKindLabel(d.kind)}
                                {isPrimary && <span className="text-emerald-400 ml-2">⚡ Focus Target</span>}
                              </p>
                              {renderDebtRationale(result?.debtRationales?.[d.id], true)}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3">{renderCategorySelect(d)}</td>
                        <td className="py-3 pr-3">
                          <EditableCurrency value={d.balance} onChange={(v) => store.updateDebt(d.id, { balance: v })} ariaLabel={`${d.name} balance`} size="md" />
                        </td>
                        <td className="py-3 pr-3">
                          <EditablePercentage value={d.apr} onChange={(v) => store.updateDebt(d.id, { apr: v })} ariaLabel={`${d.name} APR`} size="md" />
                        </td>
                        <td className="py-3 pr-3">
                          {d.minPaymentRule.type === 'fixed' ? (
                            <EditableCurrency
                              value={d.minPaymentRule.amount}
                              onChange={(v) => store.updateDebt(d.id, { minPaymentRule: { type: 'fixed', amount: v } })}
                              ariaLabel={`${d.name} minimum payment`}
                              size="md"
                            />
                          ) : (
                            <div>
                              <p className={`${classes.textSecondary} text-xs`}>{formatCurrency(getMinPaymentValue(d))}</p>
                              <p className={`${classes.textMuted} text-[11px]`}>
                                {formatPortfolioPercentLabel(d.minPaymentRule.percent)} • floor {formatCurrency(d.minPaymentRule.floor)}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-3">{renderPaymentSourceSelect(d)}</td>
                        <td className="py-3 pr-3">{renderPromoControl(d)}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => store.removeDebt(d.id)}
                            aria-label={`Remove ${d.name}`}
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
          </>
        )}
      </section>
    </ScrollReveal>
  );
}
