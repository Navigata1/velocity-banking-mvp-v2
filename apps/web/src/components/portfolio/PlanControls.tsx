'use client';

import { FocusMode, PayoffStrategy } from '@/engine/portfolio';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Progress from '@/components/ui/Progress';
import { ReactNode } from 'react';

interface PlanControlsProps {
  strategy: PayoffStrategy;
  focusMode: FocusMode;
  splitRatioPrimary: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  extraMonthlyPayment: number;
  onStrategyChange: (value: PayoffStrategy) => void;
  onFocusModeChange: (value: FocusMode) => void;
  onSplitRatioChange: (value: number) => void;
  onIncomeChange: (value: number) => void;
  onExpensesChange: (value: number) => void;
  onExtraPaymentChange: (value: number) => void;
}

export default function PlanControls({
  strategy,
  focusMode,
  splitRatioPrimary,
  monthlyIncome,
  monthlyExpenses,
  extraMonthlyPayment,
  onStrategyChange,
  onFocusModeChange,
  onSplitRatioChange,
  onIncomeChange,
  onExpensesChange,
  onExtraPaymentChange,
}: PlanControlsProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Plan Controls</h2>
      </CardHeader>
      <CardBody className="grid gap-4 md:grid-cols-2">
        <Field label="Strategy">
          <Select value={strategy} onChange={(event) => onStrategyChange(event.target.value as PayoffStrategy)}>
            <option value="velocity">Velocity (cash-flow first)</option>
            <option value="snowball">Snowball (smallest balance)</option>
            <option value="avalanche">Avalanche (highest APR)</option>
          </Select>
        </Field>

        <Field label="Focus Mode">
          <Select value={focusMode} onChange={(event) => onFocusModeChange(event.target.value as FocusMode)}>
            <option value="single">Single target</option>
            <option value="split">Split top two targets</option>
          </Select>
        </Field>

        <Field label="Monthly Income">
          <Input type="number" min={0} value={monthlyIncome} onChange={(event) => onIncomeChange(Number(event.target.value))} />
        </Field>

        <Field label="Monthly Expenses">
          <Input type="number" min={0} value={monthlyExpenses} onChange={(event) => onExpensesChange(Number(event.target.value))} />
        </Field>

        <Field label="Planned Extra Payment">
          <Input
            type="number"
            min={0}
            value={extraMonthlyPayment}
            onChange={(event) => onExtraPaymentChange(Number(event.target.value))}
          />
        </Field>

        <Field label="Split Ratio (Primary Target)">
          <div className="space-y-2">
            <Input
              type="number"
              min={0.5}
              max={0.95}
              step={0.05}
              value={splitRatioPrimary}
              onChange={(event) => onSplitRatioChange(Number(event.target.value))}
              disabled={focusMode !== 'split'}
            />
            <Progress value={splitRatioPrimary * 100} />
            <p className="text-xs text-[var(--color-text-secondary)]">
              Secondary gets {Math.round((1 - splitRatioPrimary) * 100)}%
            </p>
          </div>
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
