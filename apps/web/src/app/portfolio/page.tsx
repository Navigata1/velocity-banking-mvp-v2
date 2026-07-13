'use client';

import { useEffect, useState } from 'react';
import PageTransition from '@/components/PageTransition';
import ScrollReveal from '@/components/ScrollReveal';
import { useIsClient } from '@/hooks/useIsClient';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { themeClasses, useThemeStore } from '@/stores/theme-store';
import AddDebtDialog from './AddDebtDialog';
import PortfolioDebtsSection from './PortfolioDebtsSection';
import PortfolioPayoffOrder from './PortfolioPayoffOrder';
import PortfolioPlanSection from './PortfolioPlanSection';

export default function PortfolioPage() {
  const mounted = useIsClient();
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];
  const recompute = usePortfolioStore((state) => state.recompute);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    recompute();
  }, [recompute]);

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

  return (
    <PageTransition>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        <ScrollReveal as="header" className="space-y-2">
          <h1 className={`text-3xl font-bold tracking-tight ${classes.text}`}>📋 Portfolio</h1>
          <p className={`${classes.textSecondary} max-w-3xl`}>
            Build a complete picture of your debts, then choose a payoff approach.{' '}
            <span className="text-emerald-400">Velocity Mode</span> prioritizes{' '}
            <span className="text-emerald-400">cash-flow unlock</span> first, then reduces daily interest burn — matching the Money Loop mindset.
          </p>
          <p className={`${classes.textMuted} text-xs`}>
            Educational estimates. Not financial advice. Always verify lender terms.
          </p>
        </ScrollReveal>

        <PortfolioPlanSection classes={classes} onAddDebt={() => setShowAdd(true)} />
        <PortfolioDebtsSection classes={classes} onAddDebt={() => setShowAdd(true)} />
        <PortfolioPayoffOrder classes={classes} />
        <AddDebtDialog classes={classes} open={showAdd} onClose={() => setShowAdd(false)} />

        <p className={`text-xs ${classes.textMuted} text-center pt-2`}>
          📚 Educational simulation only. Results are estimates based on your inputs. Not financial advice.
        </p>
      </div>
    </PageTransition>
  );
}
