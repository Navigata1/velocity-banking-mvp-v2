'use client';

import { ChangeEvent } from 'react';
import { formatCurrency } from '@/engine/utils';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface PortfolioHeaderProps {
  totalDebt: number;
  cashFlow: number;
  payoffMonths: number;
  payoffDateStr: string;
  totalInterest: number;
  warnings: string[];
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onOpenAdd: () => void;
}

export default function PortfolioHeader({
  totalDebt,
  cashFlow,
  payoffMonths,
  payoffDateStr,
  totalInterest,
  warnings,
  onExport,
  onImport,
  onOpenAdd,
}: PortfolioHeaderProps) {
  const onImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await onImport(file);
    }
    event.currentTarget.value = '';
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Portfolio Plan</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Money Loop + cash-flow-first payoff coaching.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={onExport}>Export</Button>
          <input id="portfolio-import" type="file" accept="application/json" className="hidden" onChange={onImportChange} />
          <label
            htmlFor="portfolio-import"
            className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-[color:var(--color-border-soft)] bg-[var(--surface-glass-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[color:var(--color-accent-soft)]"
          >
            Import
          </label>
          <Button onClick={onOpenAdd}>Add Debt</Button>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Total Debt" value={formatCurrency(totalDebt)} />
          <Metric label="Cash Flow" value={`${formatCurrency(cashFlow)}/mo`} tone={cashFlow > 0 ? 'good' : 'bad'} />
          <Metric label="Debt-Free ETA" value={payoffMonths > 0 ? `${payoffMonths} mo` : '—'} />
          <Metric label="Projected Interest" value={formatCurrency(totalInterest)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[var(--color-text-secondary)]">Estimated debt-free date: {payoffDateStr}</p>
          <div className="flex flex-wrap gap-2">
            {warnings.slice(0, 2).map((warning) => (
              <Badge key={warning} tone="warning" className="max-w-[320px] truncate">{warning}</Badge>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'bad' }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] p-3">
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-red-400' : 'text-[var(--color-text)]'}`}>
        {value}
      </p>
    </div>
  );
}
