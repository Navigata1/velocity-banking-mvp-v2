'use client';

import DomainTabs from '@/components/DomainTabs';
import { Domain, FinancialState } from '@/stores/financial-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { formatCurrency } from '@/engine/utils';
import { ReactNode } from 'react';
import { publishEvent } from '@/lib/events';

interface DashboardControlsProps {
  activeDomain: Domain;
  debtName: string;
  debtBalance: number;
  debtApr: number;
  locLimit: number;
  locBalance: number;
  chunkAmount: number;
  setActiveDomain: (domain: Domain) => void;
  setChunkAmount: (value: number) => void;
  updateDebt: FinancialState['updateDebt'];
  updateLOC: FinancialState['updateLOC'];
}

export default function DashboardControls({
  activeDomain,
  debtName,
  debtBalance,
  debtApr,
  locLimit,
  locBalance,
  chunkAmount,
  setActiveDomain,
  setChunkAmount,
  updateDebt,
  updateLOC,
}: DashboardControlsProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Plan Inputs</h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <DomainTabs activeTab={activeDomain} onTabChange={(tab) => setActiveDomain(tab as Domain)} />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label={`${debtName} Balance`} hint={formatCurrency(debtBalance)}>
            <Input
              type="number"
              min={0}
              value={debtBalance}
              onChange={(event) => updateDebt(activeDomain, { balance: Number(event.target.value) })}
            />
          </Field>

          <Field label="APR (%)" hint={`${(debtApr * 100).toFixed(2)}%`}>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={(debtApr * 100).toFixed(2)}
              onChange={(event) => updateDebt(activeDomain, { interestRate: Number(event.target.value) / 100 })}
            />
          </Field>

          <Field label="LOC Limit" hint={formatCurrency(locLimit)}>
            <Input
              type="number"
              min={0}
              value={locLimit}
              onChange={(event) => {
                updateLOC({ limit: Number(event.target.value) });
                publishEvent({ type: 'loc_configured' });
              }}
            />
          </Field>

          <Field label="LOC Balance" hint={formatCurrency(locBalance)}>
            <Input
              type="number"
              min={0}
              value={locBalance}
              onChange={(event) => updateLOC({ balance: Number(event.target.value) })}
            />
          </Field>

          <Field label="Chunk Amount" hint={formatCurrency(chunkAmount)}>
            <Input
              type="number"
              min={0}
              value={chunkAmount}
              onChange={(event) => setChunkAmount(Number(event.target.value))}
            />
          </Field>
        </div>
      </CardBody>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
      {children}
      <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>
    </label>
  );
}
