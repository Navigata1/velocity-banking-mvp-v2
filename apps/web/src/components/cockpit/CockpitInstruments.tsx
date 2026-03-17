'use client';

import { formatCurrency } from '@/engine/utils';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface CockpitInstrumentsProps {
  cashFlow: number;
  dailyInterest: number;
  etaMonths: number;
  domainLabel: string;
}

export default function CockpitInstruments({
  cashFlow,
  dailyInterest,
  etaMonths,
  domainLabel,
}: CockpitInstrumentsProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Flight Instruments</h2>
        <Badge>{domainLabel}</Badge>
      </CardHeader>
      <CardBody className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Instrument label="Airspeed" value={`${formatCurrency(cashFlow)}/mo`} tone={cashFlow > 0 ? 'good' : 'danger'} />
        <Instrument label="Fuel Burn" value={`${formatCurrency(dailyInterest)}/day`} tone="warn" />
        <Instrument label="Heading" value={domainLabel} />
        <Instrument label="ETA" value={`${etaMonths} months`} tone="good" />
      </CardBody>
    </Card>
  );
}

function Instrument({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'good' | 'warn' | 'danger' }) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-400'
        : tone === 'danger'
          ? 'text-red-400'
          : 'text-[var(--color-text)]';

  return (
    <div className="rounded-xl border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

