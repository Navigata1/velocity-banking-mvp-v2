'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import PageTransition from '@/components/PageTransition';
import PortfolioHeader from '@/components/portfolio/PortfolioHeader';
import PlanControls from '@/components/portfolio/PlanControls';
import DebtTable from '@/components/portfolio/DebtTable';
import PayoffTimeline from '@/components/portfolio/PayoffTimeline';
import AddDebtModal from '@/components/portfolio/AddDebtModal';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { calculateMinimumPayment, formatDate } from '@/engine/utils';
import MomentumLadder from '@/components/MomentumLadder';
import { publishEvent } from '@/lib/events';

export default function PortfolioPage() {
  const [mounted, setMounted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const portfolioStore = usePortfolioStore();
  const seenPayoffIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
    portfolioStore.recompute();
    publishEvent({ type: 'plan_reviewed' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const result = portfolioStore.lastResult;
    if (!result) return;

    for (const event of result.payoffOrder) {
      if (seenPayoffIds.current.has(event.id)) continue;
      seenPayoffIds.current.add(event.id);
      const debt = portfolioStore.debts.find((item) => item.id === event.id);
      const freedPayment = debt ? calculateMinimumPayment(debt.minPaymentRule, debt.balance) : 0;
      publishEvent({ type: 'debt_paid_off', payload: { debtName: event.name, freedPayment } });
      publishEvent({ type: 'freed_payment_milestone', payload: { amount: freedPayment } });
    }
  }, [portfolioStore.debts, portfolioStore.lastResult]);

  const summary = useMemo(() => {
    const result = portfolioStore.lastResult;
    const payoffMonths = result?.payoffMonths ?? 0;
    return {
      payoffMonths,
      payoffDateStr: payoffMonths > 0 ? formatDate(payoffMonths) : '—',
      totalInterest: result?.totalInterest ?? 0,
      payoffOrder: result?.payoffOrder ?? [],
      warnings: result?.warnings ?? [],
      totalDebt: portfolioStore.debts.reduce((sum, debt) => sum + debt.balance, 0),
      cashFlow: portfolioStore.monthlyIncome - portfolioStore.monthlyExpenses,
    };
  }, [portfolioStore]);

  const handleExport = () => {
    const text = portfolioStore.exportState();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `interestshield-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const result = portfolioStore.importState(text);
    if (!result.ok) {
      window.alert(result.error);
    }
  };

  if (!mounted) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-1/2 rounded-xl bg-[var(--color-surface-muted)]" />
          <div className="h-44 rounded-xl bg-[var(--color-surface-muted)]" />
          <div className="h-[480px] rounded-xl bg-[var(--color-surface-muted)]" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <PortfolioHeader
          totalDebt={summary.totalDebt}
          cashFlow={summary.cashFlow}
          payoffMonths={summary.payoffMonths}
          payoffDateStr={summary.payoffDateStr}
          totalInterest={summary.totalInterest}
          warnings={summary.warnings}
          onExport={handleExport}
          onImport={handleImport}
          onOpenAdd={() => setShowAddModal(true)}
        />

        <PlanControls
          strategy={portfolioStore.strategy}
          focusMode={portfolioStore.focusMode}
          splitRatioPrimary={portfolioStore.splitRatioPrimary}
          monthlyIncome={portfolioStore.monthlyIncome}
          monthlyExpenses={portfolioStore.monthlyExpenses}
          extraMonthlyPayment={portfolioStore.extraMonthlyPayment}
          onStrategyChange={portfolioStore.setStrategy}
          onFocusModeChange={portfolioStore.setFocusMode}
          onSplitRatioChange={portfolioStore.setSplitRatioPrimary}
          onIncomeChange={portfolioStore.setMonthlyIncome}
          onExpensesChange={portfolioStore.setMonthlyExpenses}
          onExtraPaymentChange={portfolioStore.setExtraMonthlyPayment}
        />

        <DebtTable
          debts={portfolioStore.debts}
          onUpdateDebt={portfolioStore.updateDebt}
          onRemoveDebt={portfolioStore.removeDebt}
        />

        <PayoffTimeline payoffOrder={summary.payoffOrder} />

        <MomentumLadder
          payoffOrder={summary.payoffOrder}
          debts={portfolioStore.debts}
          payoffMonths={summary.payoffMonths}
        />

        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Educational simulation only. Results are estimates based on your inputs. Not financial advice.
        </p>
      </div>

      <AddDebtModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddDebt={(payload) => {
          portfolioStore.addDebt(payload);
          publishEvent({ type: 'debt_added' });
        }}
      />
    </PageTransition>
  );
}
