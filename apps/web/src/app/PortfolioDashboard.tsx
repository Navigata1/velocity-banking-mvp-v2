'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { buildPortfolioOverview } from '@interestshield/financial-engine/portfolio-overview';
import AssetHero from '@/components/hero/AssetHero';
import ForecastBasisStatus from '@/components/ForecastBasisStatus';
import PageTransition from '@/components/PageTransition';
import { EditableCurrency, EditablePercentage } from '@/components/PortfolioEditableNumber';
import { portfolioDebtHeroes } from '@/data/portfolio-hero';
import { useIsClient } from '@/hooks/useIsClient';
import { portfolioPersistence, usePortfolioStore } from '@/stores/portfolio-store';
import { themeClasses, useThemeStore } from '@/stores/theme-store';
import { strategyLabel } from './portfolio/portfolio-formatters';
import { buildPortfolioSimulatorModel } from './simulator/portfolio-simulator-model';

function money(value: number): string {
  if (!Number.isFinite(value)) return 'Not available';
  const scientific = Math.abs(value) >= 1e21 || value !== 0 && Math.abs(value) < 0.01;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
    notation: scientific ? 'scientific' : 'standard', maximumFractionDigits: scientific ? 3 : 2 }).format(value);
}

export default function PortfolioDashboard() {
  const mounted = useIsClient();
  const store = usePortfolioStore();
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];
  const tones = theme === 'light' ? { flow: 'text-emerald-700', burn: 'text-cyan-700', warning: 'text-amber-700' }
    : { flow: 'text-emerald-400', burn: 'text-cyan-400', warning: 'text-amber-300' };
  const persistence = useSyncExternalStore(portfolioPersistence.subscribe, portfolioPersistence.getStatus, portfolioPersistence.getStatus);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const overview = useMemo(() => {
    if (!mounted || persistence.status !== 'ready') return null;
    return buildPortfolioOverview({ monthlyIncome: store.monthlyIncome, monthlyExpenses: store.monthlyExpenses,
      extraMonthlyPayment: store.extraMonthlyPayment, chunkAmount: store.chunkAmount, loc: store.loc,
      strategy: store.strategy, focusMode: store.focusMode, splitRatioPrimary: store.splitRatioPrimary, debts: store.debts,
      ...(store.datedPlan === undefined ? {} : { datedPlan: store.datedPlan }) });
  }, [mounted, persistence.status, store.monthlyIncome, store.monthlyExpenses, store.extraMonthlyPayment,
    store.chunkAmount, store.loc, store.strategy, store.focusMode, store.splitRatioPrimary, store.debts, store.datedPlan]);
  const payoff = useMemo(() => overview ? buildPortfolioSimulatorModel(overview.book).plans.find(plan => plan.strategy === overview.book.strategy) : null, [overview]);

  if (!mounted) return <p role="status" className="p-6">Loading saved portfolio...</p>;
  if (persistence.status !== 'ready') return <div data-testid="shared-dashboard-storage-error" className="mx-auto max-w-6xl space-y-4 p-4 md:p-8">
    <h1 className={`text-2xl font-semibold ${classes.text}`}>Portfolio storage needs review</h1>
    <p role="alert" className={tones.warning}>{persistence.error}</p>
    <p className={classes.textSecondary}>Payoff projections and editing are paused. Existing saved data was not replaced.</p>
    <button type="button" aria-label="Reload saved portfolio and discard unsaved edits" onClick={() => window.location.reload()}
      className="inline-flex min-h-12 items-center gap-2 rounded-lg border px-4 py-2"><RefreshCw aria-hidden="true" size={16} />Reload saved portfolio</button>
    <p className={`text-xs ${classes.textMuted}`}>Reloading discards unsaved edits. Educational tool. Not financial advice.</p>
  </div>;
  if (!overview) return null;

  const selected = inspectedId === null ? store.debts[0] : store.debts.find(debt => debt.id === inspectedId);
  const state = payoff?.state === 'residual' ? 'tolerance' : payoff?.state ?? 'review';
  const review = state === 'review' || state === 'tolerance';
  const utilizationWarning = store.loc.balance > store.loc.limit * 0.8;
  const nextMove = overview.cashFlow <= 0 ? 'Review cash flow' : payoff?.reason === 'loc-projection-overlimit' ? 'Review LOC capacity'
    : utilizationWarning ? 'Review LOC utilization'
    : review ? 'Review payoff inputs' : state === 'cleared' ? 'Plan your next goal'
      : overview.nextTargetLabels.length ? overview.nextTargetLabels.join(' + ') : 'Review target allocation';
  const eta = state === 'cleared' ? 'No debt remaining' : state === 'tolerance' ? 'Below model tolerance'
    : state === 'projected' && payoff ? payoff.payoffDate ?? `${payoff.payoffMonths} mo` : 'Review inputs';
  const burn = overview.dailyInterestBurn === null ? 'Not available'
    : overview.dailyInterestBurn > 0 && overview.dailyInterestBurn < 0.01 ? '<$0.01/day' : `${money(overview.dailyInterestBurn)}/day`;
  const vitals = [
    { id: 'cash-flow', label: 'Cash Flow', value: money(overview.cashFlow), note: 'Monthly income minus household expenses.', tone: tones.flow },
    { id: 'interest-burn', label: 'Interest Burn', value: burn, note: 'Current APRs across all listed debts and the LOC; daily estimate.', tone: tones.burn },
    { id: 'eta', label: 'Debt-Free ETA', value: eta, note: 'All listed debts plus the separate LOC balance.', tone: review ? tones.warning : tones.flow },
    { id: 'next-move', label: 'Next Move', value: nextMove, note: review ? 'A payoff date is not confirmed.' : 'Modeled first target, not a payment instruction.', tone: tones.warning },
  ];
  const selectedApr = selected?.promo ? selected.promo.monthsRemaining > 0 ? selected.promo.introApr : selected.promo.postIntroApr : selected?.apr;

  return <PageTransition><div data-testid="shared-portfolio-dashboard" className={`mx-auto max-w-[1500px] space-y-5 p-3 md:p-6 ${classes.text}`}>
    <header className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${classes.border}`}>
      <div className="min-w-0"><p className={`text-xs ${classes.textSecondary}`}>InterestShield</p>
        <h1 className="text-xl font-semibold md:text-2xl">Portfolio Dashboard</h1>
        <p className={`mt-1 text-xs ${classes.textSecondary}`}>{strategyLabel(store.strategy)} / {store.focusMode === 'split' ? 'Split focus' : 'Single focus'}</p></div>
      <nav aria-label="Dashboard scenario" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/simulator?scenario=portfolio" className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4">Compare strategies<ArrowRight aria-hidden="true" size={16} /></Link>
        <Link href="/portfolio" className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4">Edit portfolio<ArrowRight aria-hidden="true" size={16} /></Link>
        <Link href="/" className={`inline-flex min-h-11 items-center ${classes.textSecondary}`}>Single-target demo</Link>
      </nav>
    </header>
    <ForecastBasisStatus terms={store.loc.lenderTerms} computed={overview.result.forecastBasis} />
    <section aria-label="Portfolio dashboard vitals" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {vitals.map(vital => <article key={vital.id} data-testid={`shared-vital-${vital.id}`}
        className={`min-h-32 min-w-0 rounded-lg border p-3 ${classes.border} ${classes.bgSecondary}`}>
        <h2 className={`text-xs font-medium ${classes.textSecondary}`}>{vital.label}</h2>
        <p data-testid={`shared-value-${vital.id}`} className={`my-2 text-base font-semibold leading-snug [overflow-wrap:anywhere] md:text-xl ${vital.tone}`}>{vital.value}</p>
        <p className={`text-xs leading-5 ${classes.textSecondary}`}>{vital.note}</p>
      </article>)}
    </section>
    <section aria-label="Portfolio debt inspection" className={`grid min-w-0 items-center gap-4 border-b pb-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] ${classes.border}`}>
      <div className="min-w-0">{selected ? <AssetHero key={selected.id} id={portfolioDebtHeroes[selected.category]} />
        : <div className={`flex min-h-64 items-center justify-center ${classes.textSecondary}`}>{store.debts.length ? 'Choose a listed debt' : 'No listed debts'}</div>}</div>
      <div className="min-w-0 space-y-4">
        <label className={`block text-xs ${classes.textSecondary}`} htmlFor="portfolio-dashboard-debt">Inspect debt</label>
        <select id="portfolio-dashboard-debt" aria-label="Portfolio dashboard debt" value={selected?.id ?? ''} onChange={event => setInspectedId(event.target.value)}
          className={`min-h-12 w-full min-w-0 rounded-lg border px-3 text-sm ${classes.bgSecondary} ${classes.border}`}>
          {!selected ? <option value="">{store.debts.length ? 'Choose a listed debt' : 'No listed debts'}</option> : null}
          {store.debts.map(debt => <option key={debt.id} value={debt.id}>{debt.name}</option>)}
        </select>
        {selected ? <div data-testid="shared-selected-debt" className="space-y-2 [overflow-wrap:anywhere]">
          <h2 className="text-lg font-semibold">{selected.name}</h2><p className="text-2xl font-semibold">{money(selected.balance)}</p>
          <p className={`text-sm ${classes.textSecondary}`}>Current APR: {new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 3 }).format(selectedApr ?? 0)}</p>
          {selected.promo ? <p className={`text-xs ${classes.textSecondary}`}>{selected.promo.monthsRemaining > 0 ? `Introductory rate: ${selected.promo.monthsRemaining} modeled months remaining.` : 'Introductory period ended; post-intro rate applies.'}</p> : null}
        </div> : null}
        <dl className={`space-y-2 border-t pt-3 text-sm ${classes.border}`}>
          <div className="flex flex-wrap justify-between gap-2"><dt className={classes.textSecondary}>All listed debts + LOC</dt><dd data-testid="shared-total-debt" className="min-w-0 [overflow-wrap:anywhere]">{money(overview.totalDebt)}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt className={classes.textSecondary}>LOC balance</dt><dd className="min-w-0 [overflow-wrap:anywhere]">{money(store.loc.balance)}</dd></div>
        </dl>
        <Link href="/portfolio" className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4">Review payoff plan<ArrowRight aria-hidden="true" size={16} /></Link>
      </div>
    </section>
    <section aria-label="Portfolio plan status" className={`space-y-2 border-b pb-5 ${classes.border}`}>
      <h2 className="text-base font-semibold">{review ? 'Payoff needs review' : overview.state === 'cleared' ? 'Balances cleared' : 'Modeled payoff path'}</h2>
      {overview.cashFlow <= 0 ? <p className={`text-sm ${tones.warning}`}>Cash flow is not positive. Review income and expenses before planning extra payments.</p> : null}
      {utilizationWarning ? <p className={`text-sm ${tones.warning}`}>LOC utilization is above 80%. Review available room and lender terms.</p> : null}
      {overview.state === 'tolerance' ? <p className={`text-sm ${tones.warning}`}>A nonzero balance remains below the model&apos;s payoff threshold. Verify the lender&apos;s final balance.</p> : null}
      {overview.result.warnings.map((warning, index) => <p key={index} className={`text-sm [overflow-wrap:anywhere] ${tones.warning}`}>{warning}</p>)}
      <p className={`text-xs leading-5 ${classes.textSecondary}`}>{overview.result.forecastBasis?.kind === 'lender-dated' ? 'Declared dated LOC estimate; other debts use educational monthly rules. Actual lender terms may differ.' : 'Monthly interest estimates. Lender fees, compounding, minimums and statement timing may change actual outcomes.'}</p>
    </section>
    <section aria-label="Portfolio household inputs" className={`space-y-4 [&_button>span]:whitespace-normal [&_button>span]:[overflow-wrap:anywhere] ${theme === 'light' ? '[&_[role=alert]]:text-amber-700' : ''}`}>
      <h2 className="text-base font-semibold">Household &amp; line of credit</h2>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <EditableCurrency label="Monthly income" ariaLabel="Shared portfolio monthly income" value={store.monthlyIncome} onChange={store.setMonthlyIncome} />
        <EditableCurrency label="Monthly expenses" ariaLabel="Shared portfolio monthly expenses" value={store.monthlyExpenses} onChange={store.setMonthlyExpenses} />
        <EditableCurrency label="Extra allocation cap (0 = automatic)" ariaLabel="Shared portfolio extra allocation" value={store.extraMonthlyPayment} onChange={store.setExtraMonthlyPayment} />
        <EditableCurrency label="LOC limit" ariaLabel="Shared portfolio line of credit limit" value={store.loc.limit} onChange={value => store.updateLOC({ limit: value })} />
        <EditableCurrency label="LOC balance" ariaLabel="Shared portfolio line of credit balance" value={store.loc.balance} onChange={value => store.updateLOC({ balance: value })} />
        <EditablePercentage label="LOC APR" ariaLabel="Shared portfolio line of credit APR" value={store.loc.apr} onChange={value => store.updateLOC({ apr: value })} />
        {store.strategy === 'velocity' && store.focusMode === 'single' ? <EditableCurrency label="Velocity chunk" ariaLabel="Shared portfolio velocity chunk" value={store.chunkAmount} onChange={store.setChunkAmount} /> : null}
      </div>
      <fieldset className="min-w-0"><legend className={`mb-2 text-xs ${classes.textSecondary}`}>Payoff strategy</legend>
        <div className="flex flex-wrap gap-2">{(['velocity', 'snowball', 'avalanche'] as const).map(strategy => <label key={strategy} className="inline-flex min-h-11 cursor-pointer items-center gap-2 pr-3 text-sm">
          <input type="radio" name="shared-portfolio-strategy" checked={store.strategy === strategy} onChange={() => { if (store.strategy !== strategy) store.setStrategy(strategy); }} />{strategyLabel(strategy)}
        </label>)}</div>
      </fieldset>
    </section>
    <details className={`border-t py-4 text-xs leading-5 ${classes.border} ${classes.textSecondary}`}><summary className="min-h-11 cursor-pointer">Model assumptions</summary>
      <ul className="list-disc space-y-2 pl-5">{overview.result.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul>
    </details>
    <p className={`pb-2 text-xs ${classes.textSecondary}`}>Educational tool. Not financial advice.</p>
  </div></PageTransition>;
}
