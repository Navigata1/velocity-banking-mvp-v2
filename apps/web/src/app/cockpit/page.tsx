'use client';

import PageTransition from '@/components/PageTransition';
import DomainTabs from '@/components/DomainTabs';
import CockpitHeader from '@/components/cockpit/CockpitHeader';
import CockpitInstruments from '@/components/cockpit/CockpitInstruments';
import { useFinancialStore, Domain } from '@/stores/financial-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { ReactNode } from 'react';

export default function CockpitPage() {
  const store = useFinancialStore();
  const debtType = store.getActiveDebtType();
  const currentDebt = store.debts[debtType];
  const dailyInterest = store.getDailyInterest(debtType);
  const velocity = store.getVelocityPayoff(debtType);
  const cashFlow = store.getCashFlow();

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <CockpitHeader subtitle="Pilot view for payoff trajectory and risk checks." />

        <div className="relative z-20">
          <DomainTabs activeTab={store.activeDomain} onTabChange={(tab) => store.setActiveDomain(tab as Domain)} />
        </div>

        <CockpitInstruments
          cashFlow={cashFlow}
          dailyInterest={dailyInterest}
          etaMonths={velocity.months}
          domainLabel={store.activeDomain}
        />

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Manual Trim</h2>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Monthly Income">
              <Input
                type="number"
                min={0}
                value={store.monthlyIncome}
                onChange={(event) => store.setMonthlyIncome(Number(event.target.value))}
              />
            </Field>
            <Field label="Monthly Expenses">
              <Input
                type="number"
                min={0}
                value={store.monthlyExpenses}
                onChange={(event) => store.setMonthlyExpenses(Number(event.target.value))}
              />
            </Field>
            <Field label="Minimum Payment">
              <Input
                type="number"
                min={0}
                value={currentDebt.minimumPayment}
                onChange={(event) => store.updateDebt(debtType, { minimumPayment: Number(event.target.value) })}
              />
            </Field>
            <Field label="Chunk Amount">
              <Input
                type="number"
                min={0}
                value={store.chunkAmount}
                onChange={(event) => store.setChunkAmount(Number(event.target.value))}
              />
            </Field>
          </CardBody>
        </Card>

        <p className="pb-2 text-center text-xs text-[var(--color-text-muted)]">Educational tool. Not financial advice.</p>
      </div>
    </PageTransition>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
      {children}
    </label>
  );
}
