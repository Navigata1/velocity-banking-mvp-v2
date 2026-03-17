'use client';

import { useEffect, useMemo } from 'react';
import PageTransition from '@/components/PageTransition';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardVitals from '@/components/dashboard/DashboardVitals';
import DashboardControls from '@/components/dashboard/DashboardControls';
import DashboardHeroPanel from '@/components/dashboard/DashboardHeroPanel';
import { useFinancialStore } from '@/stores/financial-store';
import { Card, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { usePortfolioStore } from '@/stores/portfolio-store';
import MomentumLadder from '@/components/MomentumLadder';
import { publishEvent } from '@/lib/events';

export default function DashboardPage() {
  const store = useFinancialStore();
  const portfolioStore = usePortfolioStore();
  const debtType = store.getActiveDebtType();
  const currentDebt = store.debts[debtType];
  const cashFlow = store.getCashFlow();
  const dailyInterest = store.getDailyInterest(debtType);
  const velocity = store.getVelocityPayoff(debtType);
  const locUtilization = store.loc.limit > 0 ? (store.loc.balance / store.loc.limit) * 100 : 0;

  const nextMove = useMemo(() => {
    const ordered = Object.values(store.debts)
      .filter((debt) => debt.balance > 0)
      .sort((left, right) => (right.balance * right.interestRate) - (left.balance * left.interestRate));
    return ordered[0]?.name ?? 'No active debt';
  }, [store.debts]);

  const warnings = useMemo(() => {
    const list: string[] = [];
    if (cashFlow <= 0) {
      list.push('Cash flow is zero or negative. Stabilize income vs expenses first.');
    }
    if (locUtilization > 80) {
      list.push(`LOC utilization is ${Math.round(locUtilization)}%. Keep it under 80% for safety.`);
    }
    return list;
  }, [cashFlow, locUtilization]);

  useEffect(() => {
    publishEvent({ type: 'app_opened' });
    portfolioStore.recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <DashboardHeader subtitle="Truth-first dashboard for your Money Loop." />

        <DashboardVitals
          cashFlow={cashFlow}
          interestBurnDaily={dailyInterest}
          debtFreeEtaMonths={velocity.months}
          nextMove={nextMove}
        />

        {warnings.length > 0 ? (
          <Card>
            <CardBody className="flex flex-wrap gap-2">
              {warnings.map((warning) => (
                <Badge key={warning} tone="warning">{warning}</Badge>
              ))}
            </CardBody>
          </Card>
        ) : null}

        <DashboardHeroPanel domain={store.activeDomain} nextMove={nextMove} payoffMonths={velocity.months} />

        <MomentumLadder
          payoffOrder={portfolioStore.lastResult?.payoffOrder ?? []}
          debts={portfolioStore.debts}
          payoffMonths={portfolioStore.lastResult?.payoffMonths ?? 0}
        />

        <DashboardControls
          activeDomain={store.activeDomain}
          debtName={currentDebt.name}
          debtBalance={currentDebt.balance}
          debtApr={currentDebt.interestRate}
          locLimit={store.loc.limit}
          locBalance={store.loc.balance}
          chunkAmount={store.chunkAmount}
          setActiveDomain={store.setActiveDomain}
          setChunkAmount={store.setChunkAmount}
          updateDebt={store.updateDebt}
          updateLOC={store.updateLOC}
        />

        <p className="pb-2 text-center text-xs text-[var(--color-text-muted)]">
          Educational tool. Not financial advice.
        </p>
      </div>
    </PageTransition>
  );
}
