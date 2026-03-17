'use client';

import { formatCurrency, formatMonths } from '@/engine/utils';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface DashboardVitalsProps {
  cashFlow: number;
  interestBurnDaily: number;
  debtFreeEtaMonths: number;
  nextMove: string;
}

export default function DashboardVitals({
  cashFlow,
  interestBurnDaily,
  debtFreeEtaMonths,
  nextMove,
}: DashboardVitalsProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Core Vitals</h2>
        <Badge>4-tracker view</Badge>
      </CardHeader>
      <CardBody className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Vital
          label="Cash Flow"
          value={`${formatCurrency(cashFlow)}/mo`}
          hint={cashFlow > 0 ? 'Positive fuel for the loop' : 'Needs positive margin'}
          tone={cashFlow > 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        <Vital
          label="Interest Burn"
          value={`${formatCurrency(interestBurnDaily)}/day`}
          hint={`${formatCurrency(interestBurnDaily * 30)}/month`}
          tone="text-amber-400"
        />
        <Vital
          label="Debt-Free ETA"
          value={debtFreeEtaMonths > 0 ? formatMonths(debtFreeEtaMonths) : '—'}
          hint="Estimated from current settings"
        />
        <Vital
          label="Next Move"
          value={nextMove}
          hint="Highest impact target"
          tone="text-[var(--color-accent)]"
        />
      </CardBody>
    </Card>
  );
}

function Vital({
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

