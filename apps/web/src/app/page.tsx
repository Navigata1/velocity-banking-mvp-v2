'use client';

import Link from 'next/link';
import DomainTabs from '@/components/DomainTabs';
import { EditableCurrency, EditablePercentage } from '@/components/EditableNumber';
import MoneyLoopArtifactRail from '@/components/MoneyLoopArtifactRail';
import PageTransition from '@/components/PageTransition';
import { useFinancialStore, Domain } from '@/stores/financial-store';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { useIsClient } from '@/hooks/useIsClient';
import { buildDashboardModel, type DashboardTone } from './dashboard-model';

const toneStyles: Record<DashboardTone, {
  card: string;
  value: string;
  chip: string;
  dot: string;
  border: string;
}> = {
  emerald: {
    card: 'border-emerald-500/35 bg-emerald-500/10',
    value: 'text-emerald-400',
    chip: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/30',
  },
  sky: {
    card: 'border-sky-500/35 bg-sky-500/10',
    value: 'text-sky-400',
    chip: 'border-sky-500/35 bg-sky-500/15 text-sky-300',
    dot: 'bg-sky-400',
    border: 'border-sky-500/30',
  },
  amber: {
    card: 'border-amber-500/35 bg-amber-500/10',
    value: 'text-amber-300',
    chip: 'border-amber-500/35 bg-amber-500/15 text-amber-200',
    dot: 'bg-amber-300',
    border: 'border-amber-500/30',
  },
  rose: {
    card: 'border-rose-500/35 bg-rose-500/10',
    value: 'text-rose-300',
    chip: 'border-rose-500/35 bg-rose-500/15 text-rose-200',
    dot: 'bg-rose-300',
    border: 'border-rose-500/30',
  },
};

export default function Dashboard() {
  const mounted = useIsClient();
  const store = useFinancialStore();
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];

  if (!mounted) {
    return (
      <div className="p-4 md:p-8 max-w-[1500px] mx-auto">
        <div className="animate-pulse space-y-5">
          <div className="h-8 w-56 rounded-lg bg-gray-500/25" />
          <div className="grid gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-40 rounded-2xl bg-gray-500/20" />
            ))}
          </div>
          <div className="h-96 rounded-2xl bg-gray-500/15" />
        </div>
      </div>
    );
  }

  const domain = store.activeDomain;
  const debtType = store.getActiveDebtType();
  const activeDebt = store.debts[debtType];
  const baseline = store.getBaselinePayoff(debtType);
  const velocity = store.getVelocityPayoff(debtType);
  const model = buildDashboardModel({
    monthlyIncome: store.monthlyIncome,
    monthlyExpenses: store.monthlyExpenses,
    chunkAmount: store.chunkAmount,
    activeDebt,
    allDebts: Object.values(store.debts),
    loc: store.loc,
    baseline,
    velocity,
  });
  const statusStyle = toneStyles[model.statusTone];
  const nextMoveStyle = toneStyles[model.nextMove.tone];
  return (
    <PageTransition>
      <div className="mx-auto max-w-[1680px] p-3 md:p-5 xl:p-6">
        <header className="mb-3 border-b border-white/10 pb-3 md:mb-4 md:pb-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div>
                <p className={`text-xs font-medium ${classes.textSecondary}`}>Money Loop Dashboard</p>
                <h1 className={`mt-0.5 text-xl font-semibold md:text-2xl ${classes.text}`}>Dashboard</h1>
              </div>
              <div className={`hidden items-center gap-2 border-l border-white/10 pl-4 text-xs font-medium sm:inline-flex ${statusStyle.value}`}>
                <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
                {model.statusLabel}
              </div>
            </div>

            <div className="domain-tab-scroll min-w-0 overflow-x-auto">
              <DomainTabs
                activeTab={domain}
                onTabChange={(tab) => store.setActiveDomain(tab as Domain)}
              />
            </div>
          </div>
        </header>

        <section
          data-testid="dashboard-mobile-vitals"
          className="grid grid-cols-4 gap-1.5 md:hidden"
          aria-label="Dashboard vitals"
        >
          {model.vitals.map((vital) => {
            const style = toneStyles[vital.tone];
            return (
              <article
                key={vital.id}
                data-testid={`dashboard-mobile-vital-${vital.id}`}
                className={`${classes.glass} ${style.card} min-h-[82px] rounded-xl border p-2`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className={`text-[9px] font-semibold uppercase leading-3 ${classes.textSecondary}`}>
                    {vital.label}
                  </p>
                  <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                </div>
                <p className={`mt-1.5 text-sm font-bold leading-tight break-words ${style.value}`}>
                  {vital.value}
                </p>
                <p className="sr-only">
                  {vital.caption}
                </p>
              </article>
            );
          })}
        </section>

        <section
          data-testid="dashboard-mobile-money-loop-bridge"
          className={`${classes.glass} mt-1.5 rounded-xl border ${classes.border} p-2.5 md:hidden`}
          aria-label="Mobile Money Loop summary"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${classes.textSecondary}`}>Money Loop</p>
              <p className={`mt-1 text-sm font-semibold leading-tight ${classes.text}`}>
                Income - LOC - expenses - cash flow - principal
              </p>
            </div>
            <a
              href="#dashboard-money-loop-artifacts"
              className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-semibold ${nextMoveStyle.chip}`}
            >
              Open loop
            </a>
          </div>
          <div className="mt-1.5 grid grid-cols-5 gap-1">
            {model.moneyLoopArtifacts.map((artifact, index) => {
              const style = toneStyles[artifact.tone];

              return (
                <div
                  key={artifact.id}
                  data-testid={`dashboard-mobile-loop-chip-${artifact.id}`}
                  className={`min-h-[40px] rounded-lg border ${style.border} bg-slate-950/25 p-1.5`}
                >
                  <p className={`text-[10px] font-bold ${style.value}`}>{String(index + 1).padStart(2, '0')}</p>
                  <p className={`mt-0.5 text-[10px] font-semibold leading-3 ${classes.text}`}>{artifact.label}</p>
                  <p className={`sr-only`}>{artifact.signal}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`hidden overflow-hidden rounded-md border ${classes.border} bg-black/10 md:grid md:grid-cols-2 xl:grid-cols-4`} aria-label="Dashboard vitals">
          {model.vitals.map((vital) => {
            const style = toneStyles[vital.tone];
            return (
              <article
                key={vital.id}
                data-testid={`dashboard-vital-${vital.id}`}
                className={`min-h-[148px] border-b border-white/10 p-4 last:border-b-0 md:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0 ${style.card}`}
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-semibold uppercase ${classes.textSecondary}`}>{vital.label}</p>
                      <p className={`mt-2 text-2xl font-semibold leading-tight break-words ${style.value}`}>
                        {vital.value}
                      </p>
                    </div>
                    <span className={`mt-1 h-2 w-2 rounded-full ${style.dot}`} />
                  </div>

                  <p className={`mt-2 text-xs leading-5 ${classes.textSecondary}`}>{vital.caption}</p>

                  <details className={`mt-auto pt-3 text-xs ${classes.textSecondary}`}>
                    <summary className={`cursor-pointer font-medium ${classes.text}`}>Assumptions</summary>
                    <ul className="mt-2 space-y-1.5">
                      {vital.assumptions.map((assumption) => (
                        <li key={assumption} className="leading-5">
                          {assumption}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </article>
            );
          })}
        </section>

        <section id="dashboard-money-loop-artifacts" className="mt-4 scroll-mt-4 border-y border-white/10 py-4 md:mt-5 md:py-5">
          <div className="min-w-0">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className={`text-xs font-medium ${classes.textSecondary}`}>How the loop reads today</p>
                <h2 className={`mt-1 text-xl font-semibold md:text-2xl ${classes.text}`}>Money Loop</h2>
              </div>
              <p className={`max-w-2xl text-sm leading-6 ${classes.textSecondary}`}>
                Income enters the LOC, expenses leave intentionally, and positive cash flow drives principal down.
              </p>
            </div>

            <MoneyLoopArtifactRail
              data-testid="money-loop-artifact-rail"
              artifacts={model.moneyLoopArtifacts}
              className="mt-4"
            />
          </div>
        </section>

        <section className="grid gap-4 border-b border-white/10 py-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div data-testid="dashboard-change-explanations" className="min-w-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className={`text-xs font-semibold ${classes.textSecondary}`}>Why this changed</p>
                  <p className={`mt-1 text-sm leading-6 ${classes.textSecondary}`}>
                    Each edit updates the plan through these assumptions.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {model.changeExplanations.map((explanation) => {
                  const style = toneStyles[explanation.tone];

                  return (
                    <div key={explanation.id} className={`border-l-2 ${style.border} bg-white/[0.025] p-3`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm font-semibold ${classes.text}`}>{explanation.label}</p>
                        <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${style.chip}`}>
                          {explanation.value}
                        </span>
                      </div>
                      <p className={`mt-2 text-xs leading-5 ${classes.textSecondary}`}>{explanation.body}</p>
                    </div>
                  );
                })}
              </div>
          </div>

          <aside className={`border-l-2 ${nextMoveStyle.border} bg-white/[0.025] p-4`}>
            <p className={`text-xs font-semibold ${classes.textSecondary}`}>Next Move</p>
            <p className={`mt-2 text-xl font-semibold ${nextMoveStyle.value}`}>{model.nextMove.title}</p>
            <p className={`mt-2 text-sm leading-6 ${classes.textSecondary}`}>{model.nextMove.caption}</p>
            <Link
              href="/simulator"
              className={`mt-5 inline-flex min-h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold ${nextMoveStyle.chip}`}
            >
              Review plan
            </Link>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className={`${classes.glass} rounded-2xl p-5`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-sm font-medium ${classes.textSecondary}`}>Plan warnings</p>
                <h2 className={`mt-1 text-xl font-semibold ${classes.text}`}>
                  {model.warnings.length > 0 ? 'Review before relying on the estimate' : 'No blocking warnings'}
                </h2>
              </div>
              <span className={`rounded-lg border px-3 py-1 text-xs font-medium ${statusStyle.chip}`}>
                {model.warnings.length}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {model.warnings.length > 0 ? (
                model.warnings.map((warning) => (
                  <div key={warning.kind} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <p className="font-medium text-amber-200">{warning.title}</p>
                    <p className={`mt-1 text-sm leading-6 ${classes.textSecondary}`}>{warning.body}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="font-medium text-emerald-300">Ready for a simulator pass</p>
                  <p className={`mt-1 text-sm leading-6 ${classes.textSecondary}`}>
                    The current demo inputs have positive cash flow and LOC utilization is under the warning threshold.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/simulator"
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
              >
                Open Simulator
              </Link>
              <Link
                href="/portfolio"
                className={`rounded-xl px-4 py-2 text-sm font-medium ${classes.glassButton} ${classes.text}`}
              >
                Review Portfolio
              </Link>
            </div>
          </div>

          <div className={`${classes.glass} rounded-2xl p-5`}>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className={`text-sm font-medium ${classes.textSecondary}`}>Inputs</p>
                <h2 className={`mt-1 text-xl font-semibold ${classes.text}`}>Tune the assumptions</h2>
              </div>
              <span className={`w-fit rounded-lg border px-3 py-1 text-xs font-medium ${toneStyles.sky.chip}`}>
                Educational estimate
              </span>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <div className={`rounded-xl border ${classes.border} p-4`}>
                <h3 className={`text-sm font-semibold ${classes.text}`}>Monthly Flow</h3>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className={`block text-xs ${classes.textSecondary}`}>Income</span>
                    <EditableCurrency value={store.monthlyIncome} onChange={store.setMonthlyIncome} size="md" ariaLabel="Monthly income" />
                  </label>
                  <label className="block">
                    <span className={`block text-xs ${classes.textSecondary}`}>Expenses</span>
                    <EditableCurrency value={store.monthlyExpenses} onChange={store.setMonthlyExpenses} size="md" ariaLabel="Monthly expenses" />
                  </label>
                  <label className="block">
                    <span className={`block text-xs ${classes.textSecondary}`}>Chunk Amount</span>
                    <EditableCurrency value={store.chunkAmount} onChange={store.setChunkAmount} size="md" ariaLabel="Velocity chunk amount" />
                  </label>
                </div>
              </div>

              <div className={`rounded-xl border ${classes.border} p-4`}>
                <h3 className={`text-sm font-semibold ${classes.text}`}>{activeDebt.name}</h3>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className={`block text-xs ${classes.textSecondary}`}>Balance</span>
                    <EditableCurrency
                      value={activeDebt.balance}
                      onChange={(value) => store.updateDebt(debtType, { balance: value })}
                      size="md"
                      ariaLabel={`${activeDebt.name} balance`}
                    />
                  </label>
                  <label className="block">
                    <span className={`block text-xs ${classes.textSecondary}`}>APR</span>
                    <EditablePercentage
                      value={activeDebt.interestRate}
                      onChange={(value) => store.updateDebt(debtType, { interestRate: value })}
                      size="md"
                      ariaLabel={`${activeDebt.name} APR`}
                    />
                  </label>
                  <label className="block">
                    <span className={`block text-xs ${classes.textSecondary}`}>Minimum Payment</span>
                    <EditableCurrency
                      value={activeDebt.minimumPayment}
                      onChange={(value) => store.updateDebt(debtType, { minimumPayment: value })}
                      size="md"
                      ariaLabel={`${activeDebt.name} minimum payment`}
                    />
                  </label>
                </div>
              </div>

              <div className={`rounded-xl border ${classes.border} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className={`text-sm font-semibold ${classes.text}`}>Line of Credit</h3>
                  <span className={`rounded-md border px-2 py-1 text-[11px] ${model.locNeedsSetup || model.locUtilization > 0.8 ? toneStyles.amber.chip : toneStyles.emerald.chip}`}>
                    {model.locNeedsSetup ? model.locUtilizationLabel : `${model.locUtilizationLabel} used`}
                  </span>
                </div>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className={`block text-xs ${classes.textSecondary}`}>Limit</span>
                    <EditableCurrency
                      value={store.loc.limit}
                      onChange={(value) => store.updateLOC({ limit: value })}
                      size="md"
                      ariaLabel="Line of credit limit"
                    />
                  </label>
                  <label className="block">
                    <span className={`block text-xs ${classes.textSecondary}`}>Balance</span>
                    <EditableCurrency
                      value={store.loc.balance}
                      onChange={(value) => store.updateLOC({ balance: value })}
                      size="md"
                      ariaLabel="Line of credit balance"
                    />
                  </label>
                  <label className="block">
                    <span className={`block text-xs ${classes.textSecondary}`}>APR</span>
                    <EditablePercentage
                      value={store.loc.interestRate}
                      onChange={(value) => store.updateLOC({ interestRate: value })}
                      size="md"
                      ariaLabel="Line of credit APR"
                    />
                  </label>
                </div>
              </div>
            </div>

            <p className={`mt-5 text-xs leading-5 ${classes.textSecondary}`}>
              Active target: {activeDebt.name}. LOC daily interest is estimated from the current balance; real lenders may calculate and post interest differently.
            </p>
          </div>
        </section>

        <footer className={`mt-8 text-center text-sm ${classes.textSecondary}`}>
          Educational tool. Not financial advice.
        </footer>
      </div>
    </PageTransition>
  );
}
