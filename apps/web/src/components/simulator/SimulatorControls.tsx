'use client';

import { DebtType, FinancialState } from '@/stores/financial-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { ReactNode } from 'react';
import { publishEvent } from '@/lib/events';

interface SimulatorControlsProps {
  debtType: DebtType;
  debtBalance: number;
  debtApr: number;
  debtMinPayment: number;
  locLimit: number;
  locApr: number;
  chunkAmount: number;
  updateDebt: FinancialState['updateDebt'];
  updateLOC: FinancialState['updateLOC'];
  setChunkAmount: FinancialState['setChunkAmount'];
}

export default function SimulatorControls({
  debtType,
  debtBalance,
  debtApr,
  debtMinPayment,
  locLimit,
  locApr,
  chunkAmount,
  updateDebt,
  updateLOC,
  setChunkAmount,
}: SimulatorControlsProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Scenario Controls</h2>
      </CardHeader>
      <CardBody className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Debt Balance">
          <Input
            type="number"
            min={0}
            value={debtBalance}
            onChange={(event) => updateDebt(debtType, { balance: Number(event.target.value) })}
          />
        </Field>
        <Field label="Debt APR (%)">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={(debtApr * 100).toFixed(2)}
            onChange={(event) => updateDebt(debtType, { interestRate: Number(event.target.value) / 100 })}
          />
        </Field>
        <Field label="Debt Minimum Payment">
          <Input
            type="number"
            min={0}
            value={debtMinPayment}
            onChange={(event) => updateDebt(debtType, { minimumPayment: Number(event.target.value) })}
          />
        </Field>
        <Field label="LOC Limit">
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
        <Field label="LOC APR (%)">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={(locApr * 100).toFixed(2)}
            onChange={(event) => updateLOC({ interestRate: Number(event.target.value) / 100 })}
          />
        </Field>
        <Field label="Chunk Amount">
          <Input type="number" min={0} value={chunkAmount} onChange={(event) => setChunkAmount(Number(event.target.value))} />
        </Field>
      </CardBody>
    </Card>
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
