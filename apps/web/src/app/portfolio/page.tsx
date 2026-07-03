'use client';

import { useEffect, useState } from 'react';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { EditableCurrency, EditablePercentage, EditableNumber } from '@/components/EditableNumber';
import type { DebtItem, DebtPriorityRationale, PayoffStrategy } from '@/engine/portfolio';
import type { PortfolioRunChangeDirection, PortfolioRunComparisonStatus } from '@/engine/portfolio-run-diff';
import { formatCurrency, formatDate } from '@/engine/calculations';
import ScrollReveal from '@/components/ScrollReveal';
import CountUp from '@/components/CountUp';
import PageTransition from '@/components/PageTransition';
import PortfolioPayoffPath from '@/components/PortfolioPayoffPath';
import { buildPortfolioPathVisualModel } from '@/engine/portfolio-path-visual';
import { useIsClient } from '@/hooks/useIsClient';

function categoryLabel(cat: DebtItem['category']): string {
  const labels: Record<string, string> = {
    mortgage: 'Mortgage', auto: 'Auto', credit_card: 'Credit Card',
    student_loan: 'Student Loan', personal_loan: 'Personal Loan',
    medical: 'Medical', land: 'Land', purchase_plan: 'Purchase Plan', custom: 'Custom',
  };
  return labels[cat] || 'Custom';
}

function categoryIcon(cat: DebtItem['category']): string {
  const icons: Record<string, string> = {
    mortgage: '🏠', auto: '🚗', credit_card: '💳', student_loan: '🎓',
    personal_loan: '💵', medical: '🏥', land: '🏞️', purchase_plan: '🛒', custom: '➕',
  };
  return icons[cat] || '📌';
}

function paymentSourceLabel(src: DebtItem['paymentSource']): string {
  return src === 'checking' ? 'Checking-only' : src === 'loc' ? 'LOC/HELOC' : 'Either';
}

function strategyLabel(s: PayoffStrategy): string {
  if (s === 'velocity') return 'Velocity Mode';
  if (s === 'snowball') return 'Snowball';
  return 'Avalanche';
}

function strategyDescription(s: PayoffStrategy): string {
  if (s === 'velocity') return 'Planning default: ranks debts for cash-flow unlock, then daily interest burn. Compare Simulator cards before treating it as fastest or lowest-interest.';
  if (s === 'snowball') return 'Smallest balance first for fast wins and motivation.';
  return 'Highest APR first to minimize total interest (classic math-optimal approach).';
}

function debtKindLabel(k: DebtItem['kind']): string {
  return k === 'amortized' ? 'Amortized' : k === 'revolving' ? 'Revolving' : 'Simple';
}

function runChangeTone(direction: PortfolioRunChangeDirection): string {
  if (direction === 'improved') return 'text-emerald-300';
  if (direction === 'worsened') return 'text-rose-300';
  return 'text-sky-300';
}

function runComparisonStatusLabel(status: PortfolioRunComparisonStatus): string {
  if (status === 'baseline') return 'Baseline';
  if (status === 'changed') return 'Updated';
  return 'Stable';
}

function getMinPaymentValue(debt: DebtItem): number {
  if (debt.minPaymentRule.type === 'fixed') return debt.minPaymentRule.amount;
  return Math.max(debt.minPaymentRule.floor, debt.balance * debt.minPaymentRule.percent);
}

function formatPortfolioPercentLabel(value: number): string {
  if (!Number.isFinite(value)) return 'Review inputs';
  return `${Math.round(value * 100)}%`;
}

const ALL_CATEGORIES: DebtItem['category'][] = [
  'mortgage', 'auto', 'credit_card', 'student_loan', 'personal_loan', 'medical', 'land', 'purchase_plan', 'custom',
];

export default function PortfolioPage() {
  const mounted = useIsClient();
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];
  const store = usePortfolioStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [newDebt, setNewDebt] = useState<Omit<DebtItem, 'id' | 'createdAt'>>({
    name: 'New Debt',
    category: 'auto',
    kind: 'amortized',
    balance: 10000,
    apr: 0.065,
    minPaymentRule: { type: 'fixed', amount: 300 },
    termMonths: 60,
    paymentSource: 'checking',
    notes: '',
  });

  useEffect(() => {
    store.recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-500/30 rounded w-1/3 mb-6" />
          <div className="h-48 bg-gray-500/20 rounded-2xl mb-6" />
          <div className="h-96 bg-gray-500/20 rounded-2xl" />
        </div>
      </div>
    );
  }

  const result = store.lastResult;
  const payoffMonths = result?.payoffMonths ?? 0;
  const payoffDateStr = payoffMonths ? formatDate(payoffMonths) : '—';
  const totalInterest = result?.totalInterest ?? 0;
  const portfolioProjectionValid = result?.isPayoffPossible !== false;
  const displayedPayoffDateStr = result
    ? portfolioProjectionValid ? formatDate(payoffMonths) : 'Review inputs'
    : payoffDateStr;
  const totalInterestLabel = portfolioProjectionValid ? formatCurrency(totalInterest) : 'Not projected';
  const payoffOrder = result?.payoffOrder ?? [];
  const warnings = result?.warnings ?? [];
  const assumptions = result?.assumptions ?? [];
  const locInterestPaid = result?.locInterestPaid ?? 0;
  const moneyLoopActive = (result?.moneyLoopMonthlyData?.length ?? 0) > 0;
  const velocityNeedsReview = store.strategy === 'velocity' && (!portfolioProjectionValid || warnings.length > 0);
  const velocityBadgeLabel = velocityNeedsReview
    ? 'Review first'
    : moneyLoopActive
      ? 'LOC modeled'
      : 'Planning default';
  const velocityBadgeTone = velocityNeedsReview
    ? 'text-amber-300'
    : moneyLoopActive
      ? 'text-emerald-400'
      : 'text-sky-300';
  const totalDebt = store.debts.reduce((s, d) => s + d.balance, 0);
  const cashFlow = store.monthlyIncome - store.monthlyExpenses;
  const runComparison = store.lastRunComparison;
  const payoffPathModel = buildPortfolioPathVisualModel(result, totalDebt);

  const handleExport = () => {
    const text = store.exportState();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interestshield-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showImportResult = (res: ReturnType<typeof store.importState>) => {
    setImportStatus(
      res.ok
        ? 'Import complete. This local portfolio plan was replaced by the backup file.'
        : `Import failed: ${res.error}`
    );
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    showImportResult(store.importState(text));
  };

  const handleImportText = () => {
    const text = importText.trim();
    if (!text) {
      showImportResult({ ok: false, error: 'Paste backup JSON first.' });
      return;
    }

    const res = store.importState(text);
    if (res.ok) setImportText('');
    showImportResult(res);
  };

  const renderCategorySelect = (debt: DebtItem, fullWidth = false, ariaLabel = `${debt.name} debt type`) => (
    <select
      value={debt.category}
      aria-label={ariaLabel}
      onChange={(e) => store.updateDebt(debt.id, { category: e.target.value as DebtItem['category'] })}
      className={`bg-transparent border ${classes.border} rounded-lg px-2 py-2 ${classes.text} text-xs ${fullWidth ? 'w-full' : ''}`}
    >
      {ALL_CATEGORIES.map((c) => (
        <option key={c} value={c} className="bg-slate-900">
          {categoryLabel(c)}
        </option>
      ))}
    </select>
  );

  const renderMinimumEditor = (d: DebtItem) => (
    d.minPaymentRule.type === 'fixed' ? (
      <EditableCurrency
        value={d.minPaymentRule.amount}
        onChange={(v) => store.updateDebt(d.id, { minPaymentRule: { type: 'fixed', amount: v } })}
        ariaLabel={`${d.name} minimum payment`}
        size="md"
      />
    ) : (
      <div>
        <p className={`${classes.textSecondary} text-sm font-mono`}>{formatCurrency(getMinPaymentValue(d))}</p>
        <p className={`${classes.textMuted} text-[11px]`}>
          {formatPortfolioPercentLabel(d.minPaymentRule.percent)} floor {formatCurrency(d.minPaymentRule.floor)}
        </p>
      </div>
    )
  );

  const renderPaymentSourceSelect = (debt: DebtItem, fullWidth = false, ariaLabel = `${debt.name} payment source`) => (
    <select
      value={debt.paymentSource}
      aria-label={ariaLabel}
      onChange={(e) => store.updateDebt(debt.id, { paymentSource: e.target.value as DebtItem['paymentSource'] })}
      className={`bg-transparent border ${classes.border} rounded-lg px-2 py-2 ${classes.text} text-xs ${fullWidth ? 'w-full' : ''}`}
    >
      {(['checking', 'either', 'loc'] as DebtItem['paymentSource'][]).map((s) => (
        <option key={s} value={s} className="bg-slate-900">
          {paymentSourceLabel(s)}
        </option>
      ))}
    </select>
  );

  const renderPromoControl = (debt: DebtItem) => (
    debt.promo ? (
      <div>
        <p className="text-emerald-300 text-xs font-semibold">
          {formatPortfolioPercentLabel(debt.promo.introApr)} for {debt.promo.monthsRemaining} mo
        </p>
        <p className={`${classes.textMuted} text-[11px]`}>
          Then {formatPortfolioPercentLabel(debt.promo.postIntroApr)}
        </p>
      </div>
    ) : (
      <button
        onClick={() =>
          store.updateDebt(debt.id, {
            promo: { introApr: 0, monthsRemaining: 6, postIntroApr: debt.apr },
          })
        }
        className="text-xs text-emerald-400 hover:text-emerald-300 underline"
      >
        + Add promo
      </button>
    )
  );

  const renderDebtRationale = (rationale?: DebtPriorityRationale, compact = false) => {
    if (!rationale) return null;

    const visiblePoints = compact ? rationale.points.slice(0, 2) : rationale.points;

    return (
      <div data-testid="portfolio-debt-rationale" className={`mt-2 space-y-1 text-[11px] leading-relaxed ${classes.textMuted}`}>
        <p className={`${classes.textSecondary} font-semibold`}>
          {rationale.isCurrentTarget ? 'Why this is the target' : `Priority #${rationale.rank}`}
        </p>
        {!compact && <p>{rationale.summary}</p>}
        <ul className="space-y-1">
          {visiblePoints.map((point) => (
            <li key={point} className="flex gap-1">
              <span className="text-emerald-400">-</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <PageTransition>
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <ScrollReveal as="header" className="space-y-2">
        <h1 className={`text-3xl font-bold tracking-tight ${classes.text}`}>📋 Portfolio</h1>
        <p className={`${classes.textSecondary} max-w-3xl`}>
          Build a complete picture of your debts, then choose a payoff approach.{' '}
          <span className="text-emerald-400">Velocity Mode</span> prioritizes{' '}
          <span className="text-emerald-400">cash-flow unlock</span> first, then reduces daily interest burn — matching the Money Loop mindset.
        </p>
        <p className={`${classes.textMuted} text-xs`}>
          Educational estimates. Not financial advice. Always verify lender terms.
        </p>
      </ScrollReveal>

      {/* Plan Controls */}
      <ScrollReveal variant="fadeUp">
      <section className={`${classes.glass} rounded-3xl p-6 md:p-8`}>
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start lg:justify-between">
          <div className="space-y-4 flex-1">
            {/* Income / Expenses / Extra */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Monthly Income</p>
                <EditableCurrency value={store.monthlyIncome} onChange={store.setMonthlyIncome} ariaLabel="Portfolio monthly income" size="lg" />
              </div>
              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Monthly Expenses</p>
                <EditableCurrency value={store.monthlyExpenses} onChange={store.setMonthlyExpenses} ariaLabel="Portfolio monthly expenses" size="lg" />
              </div>
              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Extra Toward Debt</p>
                <EditableCurrency value={store.extraMonthlyPayment} onChange={store.setExtraMonthlyPayment} ariaLabel="Portfolio extra debt payment" size="lg" />
                <p className={`${classes.textMuted} text-[11px] mt-1`}>Optional, beyond minimums</p>
              </div>
            </div>

            {store.strategy === 'velocity' && (
              <div data-testid="portfolio-loc-controls" className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`${classes.glassButton} rounded-2xl p-4`}>
                  <p className={`${classes.textMuted} text-xs mb-1`}>LOC Limit</p>
                  <EditableCurrency value={store.loc.limit} onChange={(value) => store.updateLOC({ limit: value })} ariaLabel="Portfolio line of credit limit" size="md" />
                </div>
                <div className={`${classes.glassButton} rounded-2xl p-4`}>
                  <p className={`${classes.textMuted} text-xs mb-1`}>LOC Balance</p>
                  <EditableCurrency value={store.loc.balance} onChange={(value) => store.updateLOC({ balance: value })} ariaLabel="Portfolio line of credit balance" size="md" />
                </div>
                <div className={`${classes.glassButton} rounded-2xl p-4`}>
                  <p className={`${classes.textMuted} text-xs mb-1`}>LOC APR</p>
                  <EditablePercentage value={store.loc.apr} onChange={(value) => store.updateLOC({ apr: value })} ariaLabel="Portfolio line of credit APR" size="md" />
                </div>
                <div className={`${classes.glassButton} rounded-2xl p-4`}>
                  <p className={`${classes.textMuted} text-xs mb-1`}>Velocity Chunk</p>
                  <EditableCurrency value={store.chunkAmount} onChange={store.setChunkAmount} ariaLabel="Portfolio velocity chunk" size="md" />
                </div>
              </div>
            )}

            {/* Strategy + Focus */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Strategy Picker */}
              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-2`}>Payoff Strategy</p>
                <div className="space-y-2">
                  {(['velocity', 'snowball', 'avalanche'] as PayoffStrategy[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => store.setStrategy(s)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        store.strategy === s
                          ? 'border-emerald-400 bg-emerald-500/10'
                          : `${classes.border} hover:bg-slate-800/40`
                      }`}
                    >
                      <div className="flex min-w-0 flex-col gap-2">
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                          <p className={`min-w-0 font-semibold ${classes.text}`}>{strategyLabel(s)}</p>
                          {s === 'velocity' && (
                            <span
                              data-testid="portfolio-velocity-strategy-badge"
                              className={`${velocityBadgeTone} shrink-0 rounded-md border border-current/25 px-2 py-1 text-[11px] font-semibold leading-none`}
                            >
                              {velocityBadgeLabel}
                            </span>
                          )}
                        </div>
                        <p className={`${classes.textSecondary} text-xs leading-5`}>{strategyDescription(s)}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <p data-testid="portfolio-strategy-alignment-note" className={`${classes.textMuted} mt-3 text-xs leading-5`}>
                  Velocity Mode is the Portfolio planning default, not a promise that it is the fastest or lowest-interest path. Use the Simulator cards to compare modeled payoff speed and interest cost under the same assumptions.
                </p>
                {store.strategy === 'velocity' && (
                  <p data-testid="portfolio-velocity-modeling-note" className={`${classes.textSecondary} mt-2 text-xs leading-5`}>
                    {moneyLoopActive
                      ? 'This single-lane plan includes a LOC event ledger and LOC interest estimate.'
                      : 'This Portfolio view is ranking and allocation guidance only; it is not a LOC event ledger.'}
                  </p>
                )}
              </div>

              {/* Focus Mode */}
              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <div className="flex items-center justify-between">
                  <p className={`${classes.textMuted} text-xs`}>Focus Mode</p>
                  <span className="text-xs text-emerald-400 font-semibold">Single Lane Default</span>
                </div>
                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => store.setFocusMode('single')}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      store.focusMode === 'single'
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : `${classes.border} hover:bg-slate-800/40`
                    }`}
                  >
                    <p className={`font-semibold ${classes.text}`}>Single Lane</p>
                    <p className={`${classes.textSecondary} text-xs mt-1`}>
                      One target at a time for clarity and momentum.
                    </p>
                  </button>

                  <button
                    onClick={() => setShowAdvanced((v) => !v)}
                    className={`w-full text-left px-4 py-3 rounded-xl border ${classes.border} hover:bg-slate-800/40 transition-all`}
                  >
                    <p className={`font-semibold ${classes.text}`}>Advanced {showAdvanced ? '▲' : '▼'}</p>
                    <p className={`${classes.textSecondary} text-xs mt-1`}>Split Mode toggle + allocation control.</p>
                  </button>

                  {showAdvanced && (
                    <div className={`p-4 rounded-2xl border ${classes.border} bg-slate-900/30 space-y-3`}>
                      <button
                        onClick={() => store.setFocusMode(store.focusMode === 'split' ? 'single' : 'split')}
                        className={`w-full px-4 py-3 rounded-xl border transition-all ${
                          store.focusMode === 'split'
                            ? 'border-emerald-400 bg-emerald-500/10'
                            : `${classes.border} hover:bg-slate-800/40`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-semibold ${classes.text}`}>Split Mode</p>
                            <p className={`${classes.textSecondary} text-xs mt-1`}>
                              Allocate extra budget across the top two targets. This is planning guidance, not a LOC event ledger.
                            </p>
                          </div>
                          <span className={`text-sm ${classes.text}`}>
                            {store.focusMode === 'split' ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </button>

                      {store.focusMode === 'split' && (
                        <div>
                          <p className={`${classes.textMuted} text-xs mb-2`}>Primary target share</p>
                          <EditableNumber
                            value={store.splitRatioPrimary}
                            onChange={store.setSplitRatioPrimary}
                            format="percent"
                            min={0.5}
                            max={0.95}
                            step={0.05}
                            size="md"
                            ariaLabel="Portfolio primary target share"
                          />
                          <p className={`${classes.textSecondary} text-[11px] mt-1`}>
                            Secondary target receives {formatPortfolioPercentLabel(1 - store.splitRatioPrimary)}.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10">
                <p className="font-semibold text-amber-300">⚠️ Heads up</p>
                <ul className="list-disc list-inside mt-2 text-sm text-amber-200/90 space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {assumptions.length > 0 && (
              <div data-testid="portfolio-assumptions" className={`p-4 rounded-2xl border ${classes.border} bg-slate-950/25`}>
                <p className={`font-semibold ${classes.text}`}>Assumptions</p>
                <ul className={`mt-2 text-sm ${classes.textSecondary} space-y-1`}>
                  {assumptions.map((note) => (
                    <li key={note}>- {note}</li>
                  ))}
                </ul>
              </div>
            )}

            <PortfolioPayoffPath model={payoffPathModel} />
          </div>

          {/* Summary sidebar */}
          <div className="w-full lg:w-[320px] space-y-3 flex-shrink-0">
            <div className={`${classes.glassButton} rounded-2xl p-4`}>
              <p className={`${classes.textMuted} text-xs`}>Total Debt</p>
              <p className={`text-2xl font-bold mt-1 ${classes.text}`}><CountUp value={totalDebt} /></p>
            </div>
            <div className={`${classes.glassButton} rounded-2xl p-4`}>
              <p className={`${classes.textMuted} text-xs`}>Estimated Debt-Free</p>
              <p className={`text-2xl font-bold mt-1 ${classes.text}`}>{displayedPayoffDateStr}</p>
              <p className={`${classes.textSecondary} text-sm mt-1`}>
                {portfolioProjectionValid ? `${payoffMonths} mo` : 'Plan needs review'} • Interest est. {totalInterestLabel}
              </p>
            </div>
            <div className={`${classes.glassButton} rounded-2xl p-4`}>
              <p className={`${classes.textMuted} text-xs`}>Monthly Cash Flow</p>
              <p className={`text-2xl font-bold mt-1 ${cashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <CountUp value={cashFlow} />
              </p>
              <p className={`${classes.textMuted} text-[11px] mt-1`}>Your velocity fuel</p>
            </div>
            {runComparison && (
              <div
                aria-label="Portfolio changes since last run"
                aria-live="polite"
                data-testid="portfolio-run-comparison"
                className={`${classes.glassButton} rounded-2xl p-4 border ${classes.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`${classes.textMuted} text-xs`}>What changed since last run</p>
                    <p className={`mt-1 text-sm ${classes.textSecondary}`}>
                      Compared against the previous Portfolio projection.
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border ${classes.border} px-2 py-1 text-[11px] font-semibold ${classes.textSecondary}`}>
                    {runComparisonStatusLabel(runComparison.status)}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {runComparison.changes.slice(0, 5).map((change) => (
                    <div key={`${change.id}-${change.label}`} data-testid="portfolio-run-change" className={`border-t ${classes.border} pt-3 first:border-t-0 first:pt-0`}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={`text-xs font-semibold uppercase ${classes.textMuted}`}>{change.label}</p>
                        <p className={`text-sm font-bold ${runChangeTone(change.direction)}`}>{change.value}</p>
                      </div>
                      <p className={`mt-1 text-xs leading-5 ${classes.textSecondary}`}>{change.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {store.strategy === 'velocity' && (
              <div data-testid="portfolio-loc-summary" className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs`}>LOC Interest Est.</p>
                <p className={`text-2xl font-bold mt-1 ${classes.text}`}>{formatCurrency(locInterestPaid)}</p>
                <p className={`${classes.textMuted} text-[11px] mt-1`}>
                  {moneyLoopActive ? 'Money Loop ledger active' : 'Ranking planner only'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 transition-all text-sm font-semibold text-white"
              >
                + Add Debt
              </button>
              <button
                type="button"
                onClick={handleExport}
                aria-label="Export local portfolio backup"
                data-testid="portfolio-export-backup"
                className={`${classes.glassButton} px-4 py-3 rounded-2xl border ${classes.border} hover:bg-slate-800/40 transition-all text-sm font-semibold ${classes.text}`}
              >
                Export
              </button>
            </div>
            <div className={`${classes.textMuted} text-xs leading-5`}>
              <p>Local backup only. Export your portfolio balances, LOC settings, strategy, and planning inputs as JSON.</p>
              <p>Import replaces the current local portfolio plan in this browser.</p>
            </div>
            <label
              data-testid="portfolio-import-backup"
              className={`${classes.glassButton} block px-4 py-3 rounded-2xl border ${classes.border} hover:bg-slate-800/40 transition-all text-sm font-semibold cursor-pointer text-center ${classes.text}`}
            >
              Import
              <input
                type="file"
                accept="application/json"
                aria-label="Import local portfolio backup JSON"
                data-testid="portfolio-import-backup-input"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.currentTarget.value = '';
                }}
              />
            </label>
            <div className="space-y-2">
              <label htmlFor="portfolio-import-backup-json" className={`block text-xs font-medium ${classes.textSecondary}`}>
                Paste backup JSON
              </label>
              <textarea
                id="portfolio-import-backup-json"
                aria-label="Paste local portfolio backup JSON"
                data-testid="portfolio-import-backup-json"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={3}
                placeholder='{"version":1,"data":{"debts":[]}}'
                className={`w-full rounded-xl border ${classes.border} ${classes.bgTertiary} ${classes.text} px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500/70`}
              />
              <button
                type="button"
                onClick={handleImportText}
                data-testid="portfolio-import-backup-json-submit"
                className={`${classes.glassButton} w-full px-4 py-3 rounded-2xl border ${classes.border} hover:bg-slate-800/40 transition-all text-sm font-semibold ${classes.text}`}
              >
                Import pasted JSON
              </button>
            </div>
            {importStatus && (
              <p className={`text-xs ${classes.textSecondary}`} role="status">
                {importStatus}
              </p>
            )}
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* Debts Table */}
      <ScrollReveal variant="fadeUp" delay={0.1}>
      <section className={`${classes.glass} rounded-3xl p-6 md:p-8`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-xl font-bold ${classes.text}`}>Your Debts</h2>
            <p className={`${classes.textSecondary} text-sm`}>
              Edit balances, APR, and minimums. Promo and payment-source flags help keep the plan realistic.
            </p>
          </div>
        </div>

        {store.debts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className={`${classes.text} font-medium mb-1`}>No debts added yet</p>
            <p className={`text-sm ${classes.textSecondary} mb-4`}>
              Add your debts to see your payoff plan. One lane at a time.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium"
            >
              + Add Your First Debt
            </button>
          </div>
        ) : (
          <>
          <div className="space-y-4 md:hidden">
            {store.debts.map((d) => {
              const isPrimary = payoffOrder.length > 0 && payoffOrder[0]?.id === d.id;
              return (
                <div
                  key={d.id}
                  data-testid="portfolio-mobile-debt-card"
                  className={`${classes.glassButton} rounded-2xl p-4 border ${classes.border} space-y-4 ${isPrimary ? 'bg-emerald-500/5 ring-1 ring-emerald-400/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="shrink-0 text-2xl">{categoryIcon(d.category)}</span>
                      <div className="min-w-0 flex-1">
                        <input
                          value={d.name}
                          aria-label={`Debt name for ${d.name}`}
                          onChange={(e) => store.updateDebt(d.id, { name: e.target.value })}
                          className={`w-full bg-transparent border-b ${classes.border} ${classes.text} focus:border-emerald-500 focus:outline-none`}
                        />
                        <p className={`${classes.textMuted} mt-1 text-[11px]`}>
                          {debtKindLabel(d.kind)}
                          {isPrimary && <span className="ml-2 text-emerald-400">Focus Target</span>}
                        </p>
                        {renderDebtRationale(result?.debtRationales?.[d.id])}
                      </div>
                    </div>
                    <button
                      onClick={() => store.removeDebt(d.id)}
                      aria-label={`Remove ${d.name}`}
                      className="shrink-0 text-xs text-red-300 hover:text-red-200 underline"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={`${classes.glass} rounded-xl p-3`}>
                      <p className={`${classes.textMuted} text-[11px] mb-1`}>Balance</p>
                      <EditableCurrency value={d.balance} onChange={(v) => store.updateDebt(d.id, { balance: v })} ariaLabel={`${d.name} balance`} size="md" />
                    </div>
                    <div className={`${classes.glass} rounded-xl p-3`}>
                      <p className={`${classes.textMuted} text-[11px] mb-1`}>APR</p>
                      <EditablePercentage value={d.apr} onChange={(v) => store.updateDebt(d.id, { apr: v })} ariaLabel={`${d.name} APR`} size="md" />
                    </div>
                    <div className={`${classes.glass} rounded-xl p-3`}>
                      <p className={`${classes.textMuted} text-[11px] mb-1`}>Minimum</p>
                      {renderMinimumEditor(d)}
                    </div>
                    <div className={`${classes.glass} rounded-xl p-3`}>
                      <p className={`${classes.textMuted} text-[11px] mb-1`}>Pay From</p>
                      {renderPaymentSourceSelect(d, true)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className={`${classes.glass} rounded-xl p-3`}>
                      <p className={`${classes.textMuted} text-[11px] mb-1`}>Type</p>
                      {renderCategorySelect(d, true)}
                    </div>
                    <div className={`${classes.glass} rounded-xl p-3`}>
                      <p className={`${classes.textMuted} text-[11px] mb-1`}>Promo</p>
                      {renderPromoControl(d)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className={`${classes.textMuted} text-xs border-b ${classes.border}`}>
                  <th className="py-3 text-left">Debt</th>
                  <th className="py-3 text-left">Type</th>
                  <th className="py-3 text-left">Balance</th>
                  <th className="py-3 text-left">APR</th>
                  <th className="py-3 text-left">Minimum</th>
                  <th className="py-3 text-left">Pay From</th>
                  <th className="py-3 text-left">Promo</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody>
                {store.debts.map((d) => {
                  const isPrimary = payoffOrder.length > 0 && payoffOrder[0]?.id === d.id;
                  return (
                    <tr key={d.id} className={`border-b ${classes.border} hover:bg-slate-800/20 transition-colors ${isPrimary ? 'bg-emerald-500/5' : ''}`}>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{categoryIcon(d.category)}</span>
                          <div>
                            <input
                              value={d.name}
                              aria-label={`Debt name for ${d.name}`}
                              onChange={(e) => store.updateDebt(d.id, { name: e.target.value })}
                              className={`bg-transparent border-b ${classes.border} ${classes.text} focus:border-emerald-500 focus:outline-none w-full`}
                            />
                            <p className={`${classes.textMuted} text-[11px]`}>
                              {debtKindLabel(d.kind)}
                              {isPrimary && <span className="text-emerald-400 ml-2">⚡ Focus Target</span>}
                            </p>
                            {renderDebtRationale(result?.debtRationales?.[d.id], true)}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        {renderCategorySelect(d)}
                      </td>
                      <td className="py-3 pr-3">
                        <EditableCurrency value={d.balance} onChange={(v) => store.updateDebt(d.id, { balance: v })} ariaLabel={`${d.name} balance`} size="md" />
                      </td>
                      <td className="py-3 pr-3">
                        <EditablePercentage value={d.apr} onChange={(v) => store.updateDebt(d.id, { apr: v })} ariaLabel={`${d.name} APR`} size="md" />
                      </td>
                      <td className="py-3 pr-3">
                        {d.minPaymentRule.type === 'fixed' ? (
                          <EditableCurrency
                            value={d.minPaymentRule.amount}
                            onChange={(v) => store.updateDebt(d.id, { minPaymentRule: { type: 'fixed', amount: v } })}
                            ariaLabel={`${d.name} minimum payment`}
                            size="md"
                          />
                        ) : (
                          <div>
                            <p className={`${classes.textSecondary} text-xs`}>{formatCurrency(getMinPaymentValue(d))}</p>
                            <p className={`${classes.textMuted} text-[11px]`}>
                              {formatPortfolioPercentLabel(d.minPaymentRule.percent)} • floor {formatCurrency(d.minPaymentRule.floor)}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        {renderPaymentSourceSelect(d)}
                      </td>
                      <td className="py-3 pr-3">
                        {d.promo ? (
                          <div>
                            <p className="text-emerald-300 text-xs font-semibold">
                              {formatPortfolioPercentLabel(d.promo.introApr)} for {d.promo.monthsRemaining} mo
                            </p>
                            <p className={`${classes.textMuted} text-[11px]`}>
                              Then {formatPortfolioPercentLabel(d.promo.postIntroApr)}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              store.updateDebt(d.id, {
                                promo: { introApr: 0, monthsRemaining: 6, postIntroApr: d.apr },
                              })
                            }
                            className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                          >
                            + Add promo
                          </button>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => store.removeDebt(d.id)}
                          aria-label={`Remove ${d.name}`}
                          className="text-xs text-red-300 hover:text-red-200 underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
      </ScrollReveal>

      {/* Payoff Order */}
      {portfolioProjectionValid && payoffOrder.length > 0 && (
        <ScrollReveal variant="fadeUp" delay={0.2}>
        <section className={`${classes.glass} rounded-3xl p-6 md:p-8`}>
          <h2 className={`text-xl font-bold ${classes.text} mb-2`}>Payoff Order</h2>
          <p className={`${classes.textSecondary} text-sm mb-4`}>
            Your plan based on {strategyLabel(store.strategy)} strategy, {store.focusMode === 'single' ? 'single lane' : 'split mode'} focus.
          </p>
          <ol className="space-y-3">
            {payoffOrder.map((p, idx) => (
              <li key={p.id} className={`${classes.glassButton} rounded-2xl p-4 border ${classes.border}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-emerald-500 text-white' : `${classes.bgTertiary} ${classes.textSecondary}`
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className={`font-semibold ${classes.text}`}>{p.name}</p>
                      <p className={`${classes.textSecondary} text-sm`}>Paid off around {formatDate(p.monthPaidOff)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-emerald-400 font-semibold">Month {p.monthPaidOff}</p>
                    {idx === 0 && (
                      <p className={`text-xs ${classes.textMuted}`}>⚡ Current target</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
        </ScrollReveal>
      )}

      {/* Add Debt Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="portfolio-add-debt-title"
            className={`${classes.glass} w-full max-w-xl rounded-3xl p-6 md:p-8`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 id="portfolio-add-debt-title" className={`text-xl font-bold ${classes.text}`}>Add a debt</h3>
                <p className={`${classes.textSecondary} text-sm`}>Start simple. You can refine details later.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                aria-label="Close add debt dialog"
                className={`text-xl ${classes.textSecondary}`}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Name</p>
                <input
                  value={newDebt.name}
                  aria-label="New debt name"
                  onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
                  className={`w-full bg-transparent border ${classes.border} rounded-lg px-3 py-2 ${classes.text}`}
                />
              </div>

              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Type</p>
                <select
                  value={newDebt.category}
                  aria-label="New debt type"
                  onChange={(e) => setNewDebt({ ...newDebt, category: e.target.value as DebtItem['category'] })}
                  className={`w-full bg-transparent border ${classes.border} rounded-lg px-3 py-2 ${classes.text}`}
                >
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-slate-900">
                      {categoryIcon(c)} {categoryLabel(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Balance</p>
                <EditableCurrency value={newDebt.balance} onChange={(v) => setNewDebt({ ...newDebt, balance: v })} ariaLabel="New debt balance" size="lg" />
              </div>

              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>APR</p>
                <EditablePercentage value={newDebt.apr} onChange={(v) => setNewDebt({ ...newDebt, apr: v })} ariaLabel="New debt APR" size="lg" />
              </div>

              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Minimum Payment</p>
                <EditableCurrency
                  value={newDebt.minPaymentRule.type === 'fixed' ? newDebt.minPaymentRule.amount : 0}
                  onChange={(v) => setNewDebt({ ...newDebt, minPaymentRule: { type: 'fixed', amount: v } })}
                  ariaLabel="New debt minimum payment"
                  size="lg"
                />
              </div>

              <div className={`${classes.glassButton} rounded-2xl p-4`}>
                <p className={`${classes.textMuted} text-xs mb-1`}>Pay From</p>
                <select
                  value={newDebt.paymentSource}
                  aria-label="New debt payment source"
                  onChange={(e) => setNewDebt({ ...newDebt, paymentSource: e.target.value as DebtItem['paymentSource'] })}
                  className={`w-full bg-transparent border ${classes.border} rounded-lg px-3 py-2 ${classes.text}`}
                >
                  {(['checking', 'either', 'loc'] as DebtItem['paymentSource'][]).map((s) => (
                    <option key={s} value={s} className="bg-slate-900">
                      {paymentSourceLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Coach tip */}
            <div className="mt-4 rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-400">
                💡 <strong>Tip:</strong> Include all debts, even small ones. When one gets paid off, that freed payment accelerates the next. That&apos;s momentum.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className={`${classes.glassButton} px-4 py-2 rounded-xl border ${classes.border} ${classes.textSecondary}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  store.addDebt(newDebt as Omit<DebtItem, 'id' | 'createdAt'>);
                  setShowAdd(false);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-all text-sm font-semibold text-white"
              >
                Add Debt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className={`text-xs ${classes.textMuted} text-center pt-2`}>
        📚 Educational simulation only. Results are estimates based on your inputs. Not financial advice.
      </p>
    </div>
    </PageTransition>
  );
}
