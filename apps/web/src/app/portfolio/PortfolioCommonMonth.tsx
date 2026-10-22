'use client';

import { useMemo, useState } from 'react';
import type { PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import { commonMonthStatusLabel, preparePortfolioComparison, formatCommonMonthAmount, parseCommonMonthDraft } from '@interestshield/financial-engine/portfolio-common-month';
import { strategyLabel } from './portfolio-formatters';
import type { PortfolioThemeClasses } from './portfolio-types';

export default function PortfolioCommonMonth({ book, classes, warningClass = 'text-amber-400' }: { book: PortfolioBook; classes: PortfolioThemeClasses; warningClass?: string }) {
  const [draft, setDraft] = useState('60');
  const month = parseCommonMonthDraft(draft);
  const prepared = useMemo(() => preparePortfolioComparison(book), [book]);
  const comparison = useMemo(() => prepared.atMonth(month ?? NaN), [prepared, month]);
  const reference = comparison.referenceStrategy ? strategyLabel(comparison.referenceStrategy) : 'selected plan';
  return (
    <section data-testid="common-month-comparison" aria-label="Same-month comparison" className={`mt-8 min-w-0 border-t ${classes.border} pt-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h2 className={`text-lg font-semibold ${classes.text}`}>Same-Month Comparison</h2>
          <p data-testid="common-month-period" className={`text-sm ${classes.textSecondary}`}>{month === null ? 'Month not selected' : `Month ${month}${comparison.horizonDate ? ` / ${comparison.horizonDate}` : ''}`}</p>
        </div>
        <label className={`flex flex-col gap-1 text-xs ${classes.textSecondary}`}>
          Comparison month
          <input aria-label="Comparison month" aria-invalid={month === null} aria-describedby="common-month-scope"
            inputMode="numeric" pattern="[0-9]*" value={draft} onChange={event => setDraft(event.target.value)}
            className={`h-12 w-24 rounded border ${classes.border} ${classes.bgTertiary} ${classes.text} px-3 text-sm tabular-nums outline-none focus:border-emerald-400`} />
        </label>
      </div>
      {month === null && <p role="alert" data-testid="common-month-error" className={`mt-2 text-sm ${warningClass}`}>Month must be a whole number from 0 to 600.</p>}
      <p id="common-month-scope" className={`mt-3 text-xs leading-5 ${classes.textSecondary}`}>
        Same listed debts, LOC and household cash flow. Net modeled wealth is cash minus those liabilities, not total household wealth. After exact payoff, unchanged cash flow accumulates without returns or new debt. Amounts are independently rounded.
        {book.datedPlan ? ' Dated continuation replays cash entries in checking only, protecting the reserve. An earlier unfunded expense makes that future horizon unavailable; the closed LOC is not reused.' : ''}
      </p>
      <div className="mt-4 divide-y divide-current/10">
        {comparison.plans.map(plan => {
          const s = plan.snapshot;
          const metrics = [['cash', 'Cash', s.cashBalance], ['debt', 'Listed debts', s.debtBalance],
            ['loc', 'LOC balance', s.locBalance], ['net', 'Net modeled wealth', s.netModeledWealth],
            ['difference', `Net difference vs ${reference}`, plan.wealthDifference]] as const;
          return (
            <article key={plan.strategy} data-testid={`common-month-plan-${plan.strategy}`} className="min-w-0 py-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className={`text-sm font-semibold ${classes.text}`}>{strategyLabel(plan.strategy)}</h3>
                <p className={`text-xs ${s.status === 'unavailable' ? warningClass : classes.textSecondary}`}>{commonMonthStatusLabel(s)}</p>
              </div>
              <dl className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-x-4 gap-y-3 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
                {metrics.map(([id, label, value]) => <div key={id} className="min-w-0">
                  <dt className={`min-h-8 text-xs leading-4 ${classes.textMuted}`}>{label}</dt>
                  <dd data-testid={`common-month-${id}-${plan.strategy}`} className={`mt-1 text-xs font-semibold tabular-nums sm:text-sm ${classes.text}`}>{formatCommonMonthAmount(value)}</dd>
                </div>)}
              </dl>
              {s.feesThroughMonth !== undefined ? <p className={`mt-2 text-xs ${classes.textSecondary}`}>Modeled fees through this month: {formatCommonMonthAmount(s.feesThroughMonth)}</p> : null}
              {plan.dateFailure ? <p className={`mt-2 text-xs ${warningClass}`}>Cash continuation stops {plan.dateFailure}.</p> : null}
              {plan.payoff && !plan.payoff.possible && <p className={`mt-2 text-xs ${classes.textSecondary}`}>Payoff projection needs review.</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
