'use client';

import { useState } from 'react';
import CountUp from '@/components/CountUp';
import { EditableCurrency, EditableNumber, EditablePercentage } from '@/components/EditableNumber';
import PortfolioPayoffPath from '@/components/PortfolioPayoffPath';
import ScrollReveal from '@/components/ScrollReveal';
import { formatCurrency, formatDate } from '@/engine/calculations';
import { buildPortfolioPathVisualModel } from '@/engine/portfolio-path-visual';
import type { PayoffStrategy } from '@/engine/portfolio';
import { usePortfolioStore } from '@/stores/portfolio-store';
import {
  formatPortfolioPercentLabel,
  runChangeTone,
  runComparisonStatusLabel,
  strategyDescription,
  strategyLabel,
} from './portfolio-formatters';
import type { PortfolioThemeClasses } from './portfolio-types';

interface PortfolioPlanSectionProps {
  classes: PortfolioThemeClasses;
  onAddDebt: () => void;
}

export default function PortfolioPlanSection({ classes, onAddDebt }: PortfolioPlanSectionProps) {
  const store = usePortfolioStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importText, setImportText] = useState('');

  const result = store.lastResult;
  const payoffMonths = result?.payoffMonths ?? 0;
  const payoffDateStr = payoffMonths ? formatDate(payoffMonths) : '—';
  const totalInterest = result?.totalInterest ?? 0;
  const portfolioProjectionValid = result?.isPayoffPossible !== false;
  const displayedPayoffDateStr = result
    ? portfolioProjectionValid ? formatDate(payoffMonths) : 'Review inputs'
    : payoffDateStr;
  const totalInterestLabel = portfolioProjectionValid ? formatCurrency(totalInterest) : 'Not projected';
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
  const totalDebt = store.debts.reduce((sum, debt) => sum + debt.balance, 0);
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

  return (
    <ScrollReveal variant="fadeUp">
      <section className={`${classes.glass} rounded-3xl p-6 md:p-8`}>
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start lg:justify-between">
          <div className="space-y-4 flex-1">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                    onClick={() => setShowAdvanced((value) => !value)}
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

            {warnings.length > 0 && (
              <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10">
                <p className="font-semibold text-amber-300">⚠️ Heads up</p>
                <ul className="list-disc list-inside mt-2 text-sm text-amber-200/90 space-y-1">
                  {warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                </ul>
              </div>
            )}

            {assumptions.length > 0 && (
              <div data-testid="portfolio-assumptions" className={`p-4 rounded-2xl border ${classes.border} bg-slate-950/25`}>
                <p className={`font-semibold ${classes.text}`}>Assumptions</p>
                <ul className={`mt-2 text-sm ${classes.textSecondary} space-y-1`}>
                  {assumptions.map((note) => <li key={note}>- {note}</li>)}
                </ul>
              </div>
            )}

            <PortfolioPayoffPath model={payoffPathModel} />
          </div>

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
                onClick={onAddDebt}
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
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
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
  );
}
