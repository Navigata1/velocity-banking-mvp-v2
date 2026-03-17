'use client';

import { DebtItem } from '@/engine/portfolio';
import { calculateMinimumPayment, formatCurrency, formatPercent } from '@/engine/utils';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

interface DebtTableProps {
  debts: DebtItem[];
  onUpdateDebt: (id: string, patch: Partial<DebtItem>) => void;
  onRemoveDebt: (id: string) => void;
}

export default function DebtTable({ debts, onUpdateDebt, onRemoveDebt }: DebtTableProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Debt Accounts</h2>
      </CardHeader>
      <CardBody className="space-y-3">
        {debts.map((debt) => {
          const minimum = calculateMinimumPayment(debt.minPaymentRule, debt.balance);
          return (
            <div
              key={debt.id}
              className="grid gap-3 rounded-xl border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] p-3 md:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))_auto]"
            >
              <div>
                <p className="font-semibold text-[var(--color-text)]">{debt.name}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge>{debt.category.replace('_', ' ')}</Badge>
                  <Badge>{debt.kind}</Badge>
                </div>
              </div>

              <MetricEditor
                label="Balance"
                value={debt.balance}
                suffix={formatCurrency(debt.balance)}
                onChange={(value) => onUpdateDebt(debt.id, { balance: value })}
              />

              <MetricEditor
                label="APR"
                value={debt.apr * 100}
                suffix={formatPercent(debt.apr)}
                onChange={(value) => onUpdateDebt(debt.id, { apr: value / 100 })}
              />

              <div>
                <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">Minimum</p>
                <p className="text-sm font-semibold text-[var(--color-text)]">{formatCurrency(minimum)}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {debt.minPaymentRule.type === 'fixed'
                    ? 'Fixed'
                    : `${Math.round(debt.minPaymentRule.percent * 100)}% (floor ${formatCurrency(debt.minPaymentRule.floor)})`}
                </p>
              </div>

              <MetricEditor
                label="Term (mo)"
                value={debt.termMonths ?? 0}
                suffix={debt.termMonths ? `${debt.termMonths} mo` : '—'}
                onChange={(value) => onUpdateDebt(debt.id, { termMonths: value })}
              />

              <div className="flex items-center justify-end">
                <Button variant="ghost" onClick={() => onRemoveDebt(debt.id)}>
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function MetricEditor({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</span>
      <Input type="number" value={value} min={0} onChange={(event) => onChange(Number(event.target.value))} className="py-1.5" />
      <span className="text-xs text-[var(--color-text-secondary)]">{suffix}</span>
    </label>
  );
}

