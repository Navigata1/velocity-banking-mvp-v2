'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { formatCommonMonthAmount } from '@interestshield/financial-engine/portfolio-common-month';
import { LOC_PROJECTION_OVER_LIMIT_WARNING } from '@interestshield/financial-engine';
import AssetHero from '@/components/hero/AssetHero';
import ForecastBasisStatus from '@/components/ForecastBasisStatus';
import PageTransition from '@/components/PageTransition';
import { EditableCurrency, EditablePercentage } from '@/components/PortfolioEditableNumber';
import { portfolioDebtHeroes } from '@/data/portfolio-hero';
import { useIsClient } from '@/hooks/useIsClient';
import { portfolioPersistence, usePortfolioStore } from '@/stores/portfolio-store';
import { themeClasses, useThemeStore } from '@/stores/theme-store';
import PortfolioCommonMonth from '../portfolio/PortfolioCommonMonth';
import { strategyLabel } from '../portfolio/portfolio-formatters';
import { buildPortfolioSimulatorModel } from './portfolio-simulator-model';

export default function PortfolioSimulator() {
  const mounted = useIsClient(), store = usePortfolioStore();
  const { theme } = useThemeStore(), classes = themeClasses[mounted ? theme : 'original'];
  const warning = theme === 'light' ? 'text-amber-800' : 'text-amber-300';
  const persistence = useSyncExternalStore(portfolioPersistence.subscribe, portfolioPersistence.getStatus, portfolioPersistence.getStatus);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const book = useMemo(() => ({ monthlyIncome: store.monthlyIncome, monthlyExpenses: store.monthlyExpenses,
    extraMonthlyPayment: store.extraMonthlyPayment, chunkAmount: store.chunkAmount, loc: store.loc,
    strategy: store.strategy, focusMode: store.focusMode, splitRatioPrimary: store.splitRatioPrimary, debts: store.debts }),
    [store.monthlyIncome, store.monthlyExpenses, store.extraMonthlyPayment, store.chunkAmount, store.loc,
      store.strategy, store.focusMode, store.splitRatioPrimary, store.debts]);
  const model = useMemo(() => mounted && persistence.status === 'ready' ? buildPortfolioSimulatorModel(book) : null,
    [mounted, persistence.status, book]);
  if (!mounted) return <p role="status" className="p-6">Loading saved portfolio...</p>;
  if (persistence.status !== 'ready') return <div data-testid="portfolio-simulator-storage-error" className={`mx-auto max-w-6xl space-y-4 p-4 md:p-8 ${classes.text}`}>
    <h1 className="text-2xl font-semibold">Portfolio storage needs review</h1>
    <p role="alert" className={warning}>{persistence.error}</p>
    <p className={classes.textSecondary}>Payoff projections and editing are paused. Existing saved data was not replaced.</p>
    <button type="button" aria-label="Reload saved portfolio and discard unsaved edits" onClick={() => window.location.reload()}
      className="inline-flex min-h-12 items-center gap-2 rounded-lg border px-4 py-2"><RefreshCw aria-hidden="true" size={16} />Reload saved portfolio</button>
    <p className={`text-xs ${classes.textSecondary}`}>Reloading discards unsaved edits. Educational tool. Not financial advice.</p>
  </div>;
  if (!model) return null;
  const selected = inspectedId === null ? store.debts[0] : store.debts.find(debt => debt.id === inspectedId);
  const selectedApr = selected?.promo ? selected.promo.monthsRemaining > 0 ? selected.promo.introApr : selected.promo.postIntroApr : selected?.apr;
  return <PageTransition><div data-testid="portfolio-simulator" className={`mx-auto max-w-[1500px] space-y-5 p-3 md:p-6 ${classes.text} ${theme === 'light' ? '[&_[role=alert]]:text-amber-800' : ''}`}>
    <header className={`flex flex-wrap items-start justify-between gap-3 border-b pb-3 ${classes.border}`}>
      <div className="min-w-0"><p className={`text-xs ${classes.textSecondary}`}>Portfolio scenario</p>
        <h1 className="text-xl font-semibold md:text-2xl">Portfolio Simulator</h1>
        <p className={`mt-1 text-xs ${classes.textSecondary}`}>{store.focusMode === 'split' ? 'Split focus' : 'Single focus'} / {store.debts.length} listed debts + LOC</p></div>
      <nav aria-label="Simulator scenario" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/?scenario=portfolio" className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4">Portfolio dashboard<ArrowRight aria-hidden="true" size={16} /></Link>
        <Link href="/portfolio" className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4">Edit portfolio<ArrowRight aria-hidden="true" size={16} /></Link>
        <Link href="/simulator" className={`inline-flex min-h-11 items-center ${classes.textSecondary}`}>Single-target demo</Link>
      </nav>
    </header>
    <ForecastBasisStatus terms={store.loc.lenderTerms} />
    <section aria-label="Portfolio simulation scope" className="space-y-4">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <div><h2 className={`text-xs ${classes.textSecondary}`}>Monthly cash flow</h2><p data-testid="portfolio-simulator-cash-flow" className="text-xl font-semibold [overflow-wrap:anywhere]">{formatCommonMonthAmount(model.cashFlow)}</p></div>
        <div><h2 className={`text-xs ${classes.textSecondary}`}>All listed debts + LOC</h2><p data-testid="portfolio-simulator-total-debt" className="text-xl font-semibold [overflow-wrap:anywhere]">{formatCommonMonthAmount(model.totalDebt)}</p></div>
      </div>
      {model.cashFlow !== null && model.cashFlow <= 0 ? <p className={`text-sm ${warning}`}>Cash flow is not positive. Review income and expenses before planning extra payments.</p> : null}
      {store.loc.balance > store.loc.limit * .8 ? <p className={`text-sm ${warning}`}>LOC utilization is above 80%. Review available room and lender terms.</p> : null}
    </section>
    <section aria-label="Portfolio debt inspection" className={`grid min-w-0 items-center gap-4 border-b pb-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] ${classes.border}`}>
      <div className="min-w-0">{selected ? <AssetHero key={selected.id} id={portfolioDebtHeroes[selected.category]} />
        : <div className={`flex min-h-48 items-center justify-center ${classes.textSecondary}`}>{store.debts.length ? 'Choose a listed debt' : 'No listed debts'}</div>}</div>
      <div className="min-w-0 space-y-3">
        <label htmlFor="simulator-portfolio-debt" className={`block text-xs ${classes.textSecondary}`}>Inspect debt</label>
        <select id="simulator-portfolio-debt" aria-label="Portfolio simulator debt" value={selected?.id ?? ''} onChange={e => setInspectedId(e.target.value)} className={`min-h-12 w-full min-w-0 rounded-lg border px-3 text-sm ${classes.bgSecondary} ${classes.border}`}>
          {!selected ? <option value="">{store.debts.length ? 'Choose a listed debt' : 'No listed debts'}</option> : null}
          {store.debts.map(debt => <option key={debt.id} value={debt.id}>{debt.name}</option>)}
        </select>
        {selected ? <div data-testid="simulator-selected-debt" className="space-y-2 [overflow-wrap:anywhere]"><h2 className="text-lg font-semibold">{selected.name}</h2><p className="text-xl font-semibold">{formatCommonMonthAmount(selected.balance)}</p>
          <p className={`text-sm ${classes.textSecondary}`}>Current APR: {new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 3 }).format(selectedApr ?? 0)}</p></div> : null}
        <Link href="/portfolio" className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4">Review debts and allocation<ArrowRight aria-hidden="true" size={16} /></Link>
      </div>
    </section>
    <section aria-label="Portfolio simulation inputs">
      <div className={`grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3 [&_button>span]:whitespace-normal [&_button>span]:[overflow-wrap:anywhere] ${theme === 'light' ? '[&_[data-financial-editor]>span]:text-slate-600' : ''}`}>
        <EditableCurrency label="Monthly income" ariaLabel="Shared simulator monthly income" value={store.monthlyIncome} onChange={store.setMonthlyIncome} />
        <EditableCurrency label="Monthly expenses" ariaLabel="Shared simulator monthly expenses" value={store.monthlyExpenses} onChange={store.setMonthlyExpenses} />
        <EditableCurrency label="Extra allocation cap (0 = automatic)" ariaLabel="Shared simulator extra allocation" value={store.extraMonthlyPayment} onChange={store.setExtraMonthlyPayment} />
        <EditableCurrency label="LOC limit" ariaLabel="Shared simulator line of credit limit" value={store.loc.limit} onChange={value => store.updateLOC({ limit: value })} />
        <EditableCurrency label="LOC balance" ariaLabel="Shared simulator line of credit balance" value={store.loc.balance} onChange={value => store.updateLOC({ balance: value })} />
        <EditablePercentage label="LOC APR" ariaLabel="Shared simulator line of credit APR" value={store.loc.apr} onChange={value => store.updateLOC({ apr: value })} />
        {store.focusMode === 'single' ? <EditableCurrency label="Velocity chunk" ariaLabel="Shared simulator velocity chunk" value={store.chunkAmount} onChange={store.setChunkAmount} /> : null}
      </div>
    </section>
    <section aria-label="Portfolio strategy summaries" className="space-y-3">
      <h2 className="text-base font-semibold">Payoff comparison</h2>
      <p className={`text-xs leading-5 ${classes.textSecondary}`}>Same listed debts, existing LOC and household budget. Interest and cash below are measured at each plan&apos;s own payoff date, not a common-date wealth comparison.</p>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">{model.plans.map(plan => {
        const available = plan.state === 'projected' || plan.state === 'cleared';
        return <article key={plan.strategy} data-testid={`simulator-plan-${plan.strategy}`} className={`min-w-0 space-y-3 border-t py-4 ${classes.border}`}>
          <h3 className="text-base font-semibold">{strategyLabel(plan.strategy)}</h3>
          <p data-testid={`simulator-payoff-${plan.strategy}`} className={`min-h-12 text-xl font-semibold leading-snug [overflow-wrap:anywhere] ${available ? classes.text : warning}`}>
            {plan.state === 'cleared' ? 'Already paid off' : plan.state === 'projected' ? `${plan.payoffMonths} mo` : plan.state === 'residual' ? 'Nonzero balance remains' : 'Review inputs'}
          </p>
          <dl className="grid min-w-0 grid-cols-2 gap-3">
            <div className="min-w-0"><dt className={`min-h-8 text-xs leading-4 ${classes.textSecondary}`}>Interest at own payoff</dt><dd data-testid={`simulator-interest-${plan.strategy}`} className="text-sm font-semibold [overflow-wrap:anywhere]">{formatCommonMonthAmount(plan.totalInterest)}</dd></div>
            <div className="min-w-0"><dt className={`min-h-8 text-xs leading-4 ${classes.textSecondary}`}>Cash at own payoff</dt><dd data-testid={`simulator-cash-${plan.strategy}`} className="text-sm font-semibold [overflow-wrap:anywhere]">{formatCommonMonthAmount(plan.endingCash)}</dd></div>
          </dl>
          {!available ? <p className={`text-xs leading-5 ${classes.textSecondary}`}>{plan.reason === 'loc-projection-overlimit' ? LOC_PROJECTION_OVER_LIMIT_WARNING
            : plan.state === 'residual' ? 'An unpaid balance remains or was removed by model tolerance. Verify the lender balance.' : 'A complete funded payoff is not confirmed for this policy.'}</p> : null}
        </article>;
      })}</div>
    </section>
    <PortfolioCommonMonth book={book} classes={{ ...classes, textMuted: classes.textSecondary }} warningClass={warning} />
    <p className={`text-xs leading-5 ${classes.textSecondary}`}>Monthly educational estimates. Lender fees, compounding, minimums and statement timing may change actual outcomes. Educational tool. Not financial advice.</p>
  </div></PageTransition>;
}
