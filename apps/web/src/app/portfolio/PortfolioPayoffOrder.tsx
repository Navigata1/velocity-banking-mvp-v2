'use client';

import ScrollReveal from '@/components/ScrollReveal';
import { formatDate } from '@/engine/calculations';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { strategyLabel } from './portfolio-formatters';
import type { PortfolioThemeClasses } from './portfolio-types';

export default function PortfolioPayoffOrder({ classes }: { classes: PortfolioThemeClasses }) {
  const store = usePortfolioStore();
  const result = store.lastResult;
  const payoffOrder = result?.payoffOrder ?? [];
  const portfolioProjectionValid = result?.isPayoffPossible !== false;

  if (!portfolioProjectionValid || payoffOrder.length === 0) return null;

  return (
    <ScrollReveal variant="fadeUp" delay={0.2}>
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
                  {idx === 0 && <p className={`text-xs ${classes.textMuted}`}>⚡ Current target</p>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </ScrollReveal>
  );
}
