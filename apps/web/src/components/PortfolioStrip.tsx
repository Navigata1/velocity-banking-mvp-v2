'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useFinancialStore } from '@/stores/financial-store';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { rankDebtsVelocity, getDebtIcon, buildVelocityReason, formatCurrency, estimateDailyInterest } from '@/engine/velocity-targeting';

export default function PortfolioStrip() {
  const store = useFinancialStore();
  const { theme } = useThemeStore();
  const classes = themeClasses[theme];

  const snapshot = useMemo(() => {
    const all = Object.values(store.debts || {}) as any[];
    const debts = all.filter((d) => (d?.balance ?? 0) > 0);
    const ranked = rankDebtsVelocity(debts);
    const top3 = ranked.slice(0, 3);
    const next = ranked[0] || null;
    const cashFlow = store.getCashFlow();
    const unlock = next?.minimumPayment ?? 0;
    return { top3, next, cashFlow, unlock };
  }, [store]);

  if (!snapshot.top3.length) {
    return (
      <div className={`${classes.glass} rounded-2xl p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-sm ${classes.textSecondary}`}>Portfolio Snapshot</div>
            <div className={`text-lg font-semibold ${classes.text}`}>Add a debt to start</div>
          </div>
          <Link href="/portfolio" className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600">
            Open Portfolio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${classes.glass} rounded-2xl p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`text-sm ${classes.textSecondary}`}>Portfolio Snapshot</div>
          <div className={`text-lg font-semibold ${classes.text}`}>
            Next target: {snapshot.next?.name}
          </div>
          <div className={`text-sm ${classes.textSecondary} mt-1`}>
            {snapshot.next ? buildVelocityReason(snapshot.next) : '—'}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm ${classes.textSecondary}`}>Cash Flow</div>
          <div className={`text-lg font-semibold ${snapshot.cashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(snapshot.cashFlow)}
          </div>
          {snapshot.unlock > 0 && (
            <div className={`text-xs ${classes.textMuted} mt-1`}>
              Paying it off frees ~{formatCurrency(snapshot.unlock)}/mo
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {snapshot.top3.map((d: any) => (
          <div key={d.id} className={`rounded-xl border ${classes.border} bg-black/20 p-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getDebtIcon(d.type)}</span>
                <span className={`text-sm font-medium ${classes.text}`}>{d.name}</span>
              </div>
              <span className={`text-sm ${classes.textSecondary}`}>{formatCurrency(d.balance)}</span>
            </div>
            <div className={`mt-2 flex items-center justify-between text-xs ${classes.textMuted}`}>
              <span>burn ~{formatCurrency(estimateDailyInterest(d.balance, d.interestRate))}/day</span>
              <span>min {formatCurrency(d.minimumPayment)}/mo</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className={`text-xs ${classes.textMuted}`}>
          Velocity Mode prioritizes cash-flow unlock first, then daily interest burn.
        </div>
        <Link href="/portfolio" className="text-sm font-medium text-emerald-400 hover:text-emerald-300">
          Full Portfolio →
        </Link>
      </div>
    </div>
  );
}
