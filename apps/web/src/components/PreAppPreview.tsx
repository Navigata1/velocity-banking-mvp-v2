'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { useFinancialStore } from '@/stores/financial-store';
import { useAppStore } from '@/stores/app-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import { formatCurrency } from '@/engine/calculations';
import { rankDebtsVelocity, estimateDailyInterest } from '@/engine/velocity-targeting';

export default function PreAppPreview() {
  const [mounted, setMounted] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const classes = themeClasses[theme];

  const store = useFinancialStore();
  const { introModalOpen } = useAppStore();
  const previewDismissed = useAppStore((s) => s.previewDismissed);
  const setPreviewDismissed = useAppStore((s) => s.setPreviewDismissed);

  const showPreAppPreview = usePreferencesStore((s) => s.showPreAppPreview);
  const previewPersistHours = usePreferencesStore((s) => s.previewPersistHours);
  const lastPreviewRefresh = usePreferencesStore((s) => s.lastPreviewRefresh);
  const setLastPreviewRefresh = usePreferencesStore((s) => s.setLastPreviewRefresh);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Refresh preview data timestamp on mount if expired
  useEffect(() => {
    if (!lastPreviewRefresh) {
      setLastPreviewRefresh(Date.now());
    }
  }, [lastPreviewRefresh, setLastPreviewRefresh]);

  const isExpired = useMemo(() => {
    if (!lastPreviewRefresh) return false;
    const expiryMs = previewPersistHours * 60 * 60 * 1000;
    return Date.now() - lastPreviewRefresh > expiryMs;
  }, [lastPreviewRefresh, previewPersistHours]);

  const snapshot = useMemo(() => {
    const allDebts = Object.values(store.debts || {}) as any[];
    const debts = allDebts.filter((d) => (d?.balance ?? 0) > 0);
    const ranked = rankDebtsVelocity(debts);
    const top3 = ranked.slice(0, 3);
    const next = ranked[0] || null;

    const totalDebt = debts.reduce((sum: number, d: any) => sum + (d?.balance || 0), 0);
    const cashFlow = store.getCashFlow();
    const dailyBurn = next ? estimateDailyInterest(next.balance, next.interestRate) : 0;

    // Velocity score — savings / baseline interest
    const debtType = store.getActiveDebtType();
    const velocity = store.getVelocityPayoff(debtType);
    const baseline = store.getBaselinePayoff(debtType);
    const velocityScore = Math.min(100, Math.round((velocity.savings / Math.max(1, baseline.totalInterest)) * 100));

    // Estimated debt-free date
    const freedomMonths = velocity.months;
    const freedomDate = new Date(Date.now() + freedomMonths * 30 * 24 * 60 * 60 * 1000);

    return {
      totalDebt,
      cashFlow,
      next,
      dailyBurn,
      velocityScore,
      freedomDate,
      freedomMonths,
      top3,
    };
  }, [store]);

  // Visibility: not during intro, not dismissed, enabled, not expired
  const visible = mounted && !introModalOpen && !previewDismissed && showPreAppPreview && !isExpired;

  const handleDismiss = () => {
    setPreviewDismissed(true);
    setLastPreviewRefresh(Date.now());
  };

  if (!visible) return null;

  const cards = [
    {
      label: 'Total Debt',
      value: formatCurrency(snapshot.totalDebt),
      icon: '💰',
      color: 'text-red-400',
    },
    {
      label: 'Monthly Cash Flow',
      value: formatCurrency(snapshot.cashFlow),
      icon: '💵',
      color: snapshot.cashFlow >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
    {
      label: 'Velocity Score',
      value: `${snapshot.velocityScore}%`,
      icon: '⚡',
      color: 'text-amber-400',
    },
    {
      label: 'Debt-Free Date',
      value: snapshot.freedomDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      icon: '🎯',
      color: 'text-blue-400',
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`w-full max-w-md rounded-3xl overflow-hidden border ${classes.border} shadow-2xl shadow-emerald-500/10`}
          style={{
            background: theme === 'light'
              ? 'rgba(255,255,255,0.85)'
              : 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(24px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-xl">🛡️</span>
                </div>
                <div>
                  <p className="text-emerald-400 text-xs font-medium tracking-wider uppercase">InterestShield</p>
                  <h2 className={`text-lg font-bold ${classes.text}`}>Your Snapshot</h2>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className={`${classes.textSecondary} hover:${classes.text} text-lg p-1`}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Data cards */}
          <div className="px-6 pb-4 grid grid-cols-2 gap-3">
            {cards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                className={`rounded-2xl p-4 border ${classes.border}`}
                style={{
                  background: theme === 'light'
                    ? 'rgba(255,255,255,0.6)'
                    : 'rgba(30,41,59,0.5)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{card.icon}</span>
                  <span className={`text-xs ${classes.textSecondary}`}>{card.label}</span>
                </div>
                <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Next velocity target */}
          {snapshot.next && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className={`mx-6 mb-4 rounded-2xl p-4 border ${classes.border} bg-emerald-500/5`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${classes.textSecondary}`}>🎯 Next Velocity Target</span>
                <span className="text-xs text-red-400">{formatCurrency(snapshot.dailyBurn)}/day burn</span>
              </div>
              <div className={`text-base font-semibold ${classes.text}`}>{snapshot.next.name || snapshot.next.type}</div>
              <div className={`text-sm ${classes.textSecondary}`}>{formatCurrency(snapshot.next.balance)} remaining</div>
            </motion.div>
          )}

          {/* Top 3 debts */}
          {snapshot.top3.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.4 }}
              className="mx-6 mb-4"
            >
              <p className={`text-xs ${classes.textSecondary} mb-2`}>Priority Queue</p>
              <div className="space-y-2">
                {snapshot.top3.map((debt: any, i: number) => (
                  <div
                    key={debt.id || i}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border ${classes.border}`}
                    style={{
                      background: theme === 'light'
                        ? 'rgba(255,255,255,0.4)'
                        : 'rgba(30,41,59,0.3)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${i === 0 ? 'text-emerald-400' : classes.textSecondary}`}>#{i + 1}</span>
                      <span className={`text-sm ${classes.text}`}>{debt.name || debt.type}</span>
                    </div>
                    <span className={`text-sm font-medium ${classes.text}`}>{formatCurrency(debt.balance)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <div className="px-6 pb-6">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.3 }}
              onClick={handleDismiss}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
            >
              Open Full App →
            </motion.button>
            <p className={`text-center text-xs ${classes.textMuted} mt-2`}>
              Tap anywhere to dismiss
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
