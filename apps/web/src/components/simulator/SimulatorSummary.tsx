'use client';

import { SimulationResult } from '@/engine/calculations';
import { formatCurrency, formatDate } from '@/engine/utils';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface SimulatorSummaryProps {
  result: SimulationResult;
}

export default function SimulatorSummary({ result }: SimulatorSummaryProps) {
  const monthsSaved = Math.max(0, result.baseline.payoffMonths - result.velocity.payoffMonths);
  const interestSaved = Math.max(0, result.baseline.totalInterest - result.velocity.totalInterest);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Simulation Summary</h2>
        <Badge tone="success">Velocity Mode</Badge>
      </CardHeader>
      <CardBody className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Standard ETA" value={`${result.baseline.payoffMonths} mo`} hint={formatDate(result.baseline.payoffMonths)} />
        <Metric label="Velocity ETA" value={`${result.velocity.payoffMonths} mo`} hint={formatDate(result.velocity.payoffMonths)} />
        <Metric label="Months Saved" value={`${monthsSaved} mo`} hint="Estimated gain" tone="text-emerald-400" />
        <Metric label="Interest Saved" value={formatCurrency(interestSaved)} hint="Compared to baseline" tone="text-emerald-400" />
      </CardBody>
    </Card>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = 'text-[var(--color-text)]',
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">{hint}</p>
    </div>
  );
}

