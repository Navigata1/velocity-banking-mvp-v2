'use client';

import { useMemo, useState } from 'react';
import PageTransition from '@/components/PageTransition';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { HeroAnimationMode, usePreferencesStore } from '@/stores/preferences-store';
import { mapDebtToHeroAsset } from '@/components/hero/hero-mapping';
import HeroStage from '@/components/hero/HeroStage';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Drawer from '@/components/ui/Drawer';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { formatCurrency } from '@/engine/utils';

const modeOptions: HeroAnimationMode[] = ['hover', 'showroom360', 'cinematicTilt', 'lightSweep', 'focusPulse'];

export default function ShowroomPage() {
  const portfolioStore = usePortfolioStore();
  const preferencesStore = usePreferencesStore();
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);

  const selectedDebt = useMemo(
    () => portfolioStore.debts.find((debt) => debt.id === selectedDebtId) ?? null,
    [portfolioStore.debts, selectedDebtId],
  );

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Showroom</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Procedural hero models for each debt target. Paid-off heroes appear pristine; active debts stay slightly muted.
          </p>
        </header>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Motion Mode</h2>
            <div className="w-[220px]">
              <Select
                value={preferencesStore.heroAnimationMode}
                onChange={(event) => preferencesStore.setHeroAnimationMode(event.target.value as HeroAnimationMode)}
              >
                {modeOptions.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </Select>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {portfolioStore.debts.map((debt) => {
            const isPaidOff = debt.balance <= 0.01;
            return (
              <button
                type="button"
                key={debt.id}
                onClick={() => setSelectedDebtId(debt.id)}
                className="text-left"
              >
                <Card interactive>
                  <CardBody className="space-y-3">
                    <div className="h-52">
                      <HeroStage
                        assetType={mapDebtToHeroAsset(debt)}
                        muted={!isPaidOff}
                        className="h-full"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[var(--color-text)]">{debt.name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Balance {formatCurrency(debt.balance)}</p>
                      </div>
                      <Badge tone={isPaidOff ? 'success' : 'default'}>{isPaidOff ? 'Pristine' : 'Active'}</Badge>
                    </div>
                  </CardBody>
                </Card>
              </button>
            );
          })}
        </div>

        <Drawer
          open={Boolean(selectedDebt)}
          onClose={() => setSelectedDebtId(null)}
          title={selectedDebt ? `${selectedDebt.name} · Showroom View` : undefined}
        >
          {selectedDebt ? (
            <div className="space-y-3">
              <div className="h-72">
                <HeroStage
                  assetType={mapDebtToHeroAsset(selectedDebt)}
                  muted={selectedDebt.balance > 0.01}
                  className="h-full"
                />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Motion mode: <span className="font-semibold text-[var(--color-text)]">{preferencesStore.heroAnimationMode}</span>
              </p>
            </div>
          ) : null}
        </Drawer>

        <p className="pb-2 text-center text-xs text-[var(--color-text-muted)]">Educational tool. Not financial advice.</p>
      </div>
    </PageTransition>
  );
}

