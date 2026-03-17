'use client';

import { useEffect, useMemo, useRef } from 'react';
import PageTransition from '@/components/PageTransition';
import DomainTabs from '@/components/DomainTabs';
import SimulatorHeader from '@/components/simulator/SimulatorHeader';
import SimulatorSummary from '@/components/simulator/SimulatorSummary';
import SimulatorControls from '@/components/simulator/SimulatorControls';
import { useFinancialStore, Domain } from '@/stores/financial-store';
import { runSimulation, SimulationInputs } from '@/engine/calculations';
import { Card, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { publishEvent } from '@/lib/events';

export default function SimulatorPage() {
  const store = useFinancialStore();
  const runTrackedRef = useRef(false);
  const debtType = store.getActiveDebtType();
  const debt = store.debts[debtType];
  const cashFlow = store.getCashFlow();
  const locUtilization = store.loc.limit > 0 ? (store.loc.balance / store.loc.limit) * 100 : 0;

  const inputs: SimulationInputs = useMemo(
    () => ({
      monthlyIncome: store.monthlyIncome,
      monthlyExpenses: store.monthlyExpenses,
      carLoan: {
        balance: debt.balance,
        apr: debt.interestRate,
        monthlyPayment: debt.minimumPayment,
      },
      loc: {
        limit: store.loc.limit,
        apr: store.loc.interestRate,
        balance: store.loc.balance,
      },
      useVelocity: true,
      extraPayment: store.chunkAmount,
    }),
    [debt.balance, debt.interestRate, debt.minimumPayment, store.chunkAmount, store.loc.balance, store.loc.interestRate, store.loc.limit, store.monthlyExpenses, store.monthlyIncome],
  );

  const result = useMemo(() => runSimulation(inputs), [inputs]);

  useEffect(() => {
    if (!runTrackedRef.current) {
      publishEvent({ type: 'simulation_ran' });
      runTrackedRef.current = true;
    }
  }, [result]);

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <SimulatorHeader subtitle="Compare baseline amortization vs velocity loop assumptions." />

        <div className="relative z-20">
          <DomainTabs activeTab={store.activeDomain} onTabChange={(tab) => store.setActiveDomain(tab as Domain)} />
        </div>

        <Card>
          <CardBody className="flex flex-wrap gap-2">
            {cashFlow <= 0 ? (
              <Badge tone="danger">Cash flow is not positive. Stabilize first.</Badge>
            ) : (
              <Badge tone="success">Cash flow supports velocity.</Badge>
            )}
            {locUtilization > 80 ? (
              <Badge tone="warning">LOC utilization above 80%.</Badge>
            ) : (
              <Badge>LOC utilization {Math.round(locUtilization)}%</Badge>
            )}
          </CardBody>
        </Card>

        <SimulatorSummary result={result} />

        <SimulatorControls
          debtType={debtType}
          debtBalance={debt.balance}
          debtApr={debt.interestRate}
          debtMinPayment={debt.minimumPayment}
          locLimit={store.loc.limit}
          locApr={store.loc.interestRate}
          chunkAmount={store.chunkAmount}
          updateDebt={store.updateDebt}
          updateLOC={store.updateLOC}
          setChunkAmount={store.setChunkAmount}
        />

        <p className="pb-2 text-center text-xs text-[var(--color-text-muted)]">Educational tool. Not financial advice.</p>
      </div>
    </PageTransition>
  );
}
