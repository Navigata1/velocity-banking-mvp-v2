'use client';

import HeroStage from '@/components/hero/HeroStage';
import { Domain } from '@/stores/financial-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { HeroAssetType } from '@/components/hero/HeroShowroom';

interface DashboardHeroPanelProps {
  domain: Domain;
  nextMove: string;
  payoffMonths: number;
}

export default function DashboardHeroPanel({ domain, nextMove, payoffMonths }: DashboardHeroPanelProps) {
  const assetType: HeroAssetType =
    domain === 'recreation'
      ? 'jetSki'
      : domain === 'creditCard'
        ? 'blackCard'
        : domain === 'house' || domain === 'land'
          ? 'townhouse'
          : domain === 'custom'
            ? 'jewelry'
            : 'semiTruck';

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Hero Stage</h2>
      </CardHeader>
      <CardBody className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="min-h-[340px]">
          <HeroStage assetType={assetType} className="h-full" />
        </div>
        <div className="rounded-xl border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Next Move</p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-accent)]">{nextMove}</p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Keep routing income and freed payments into the current target. Momentum increases as each payment unlocks.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
