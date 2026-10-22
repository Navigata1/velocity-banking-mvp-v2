'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { createDatedPlanDraft, datedDateFields, datedDayFields, datedFieldLabels, datedMoneyFields,
  readDatedPlanDraft, type DatedPlanDraft } from '@/engine/dated-plan-draft';
import { usePortfolioStore } from '@/stores/portfolio-store';
import type { PortfolioThemeClasses } from './portfolio-types';

export default function PortfolioDatedPlan({ classes }: { classes: PortfolioThemeClasses }) {
  const plan = usePortfolioStore(state => state.datedPlan);
  const [notice, setNotice] = useState('');
  return <section data-testid="portfolio-dated-plan" className={`min-w-0 border-t py-4 ${classes.border} ${classes.text}`}>
    <details><summary className="min-h-11 cursor-pointer text-sm">Dated cash schedule {plan ? '(saved)' : '(optional)'}</summary>
      <p className={`mb-4 text-xs leading-5 ${classes.textSecondary}`}>Fixed-rate LOC only. Simple daily interest, actual calendar days / 365, monthly statement rounding and financed fees. Other debts use educational monthly rules. Dates and terms must agree; this is not lender verification.</p>
      <DatedPlanForm key={JSON.stringify(plan) ?? 'no-dates'} classes={classes} onSaved={setNotice} />
    </details>
    {notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}
  </section>;
}

function DatedPlanForm({ classes, onSaved }: { classes: PortfolioThemeClasses; onSaved: (message: string) => void }) {
  const store = usePortfolioStore(), [draft, setDraft] = useState(() => createDatedPlanDraft(store.datedPlan)), [error, setError] = useState('');
  const control = `min-h-11 w-full min-w-0 rounded-md border px-3 text-sm ${classes.bgSecondary} ${classes.border}`;
  const icon = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded border ${classes.border} disabled:opacity-40`;
  const change = (next: DatedPlanDraft) => { setDraft(next); setError(''); onSaved(''); };
  const changeEvent = (index: number, patch: Partial<DatedPlanDraft['cashEvents'][number]>) => change({ ...draft,
    cashEvents: draft.cashEvents.map((event, i) => i === index ? { ...event, ...patch } : event) });
  const move = (index: number, offset: number) => {
    const events = [...draft.cashEvents], destination = index + offset;
    [events[index], events[destination]] = [events[destination], events[index]]; change({ ...draft, cashEvents: events });
  };
  function publish(remove = false) {
    try {
      const result = store.setDatedPlan(remove ? null : readDatedPlanDraft(draft));
      if (!result.ok) throw new Error(result.error);
      onSaved(remove ? 'Dated schedule removed. Saved lender terms still apply to forecast availability.' : 'Dated schedule saved. See the computed estimate or review reasons above.'); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Schedule could not be saved.'); onSaved(''); }
  }
  return <form data-testid="dated-plan-form" onSubmit={event => { event.preventDefault(); publish(); }} className="min-w-0 space-y-5">
    <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[...datedDateFields, ...datedMoneyFields, ...datedDayFields].map(key => <label key={key} className="min-w-0 space-y-2 text-xs">
        <span className="block">{datedFieldLabels[key]}</span>
        <input aria-label={datedFieldLabels[key]} autoComplete="off" value={draft[key]} className={control}
          type={(datedDateFields as readonly string[]).includes(key) ? 'date' : 'text'}
          inputMode={(datedDayFields as readonly string[]).includes(key) ? 'numeric' : 'decimal'}
          onChange={event => change({ ...draft, [key]: event.target.value })} />
      </label>)}
    </div>
    <fieldset className="min-w-0 space-y-3"><legend className="mb-2 text-sm font-medium">Repeating monthly cash entries</legend>
      <p className={`text-xs leading-5 ${classes.textSecondary}`}>Entries on the same day follow their listed order. Days 29-31 clamp to month-end. Income enters checking; expenses use the selected account. Totals must match saved monthly income and living expenses, excluding separate debt payments.</p>
      {draft.cashEvents.map((event, index) => <div key={event.id} data-testid="dated-cash-entry" className={`min-w-0 space-y-3 border-t pt-3 ${classes.border}`}>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="min-w-0 space-y-1 text-xs">Entry {index + 1}: type<select aria-label={`Cash entry ${index + 1} type`} className={control} value={event.kind} onChange={e => changeEvent(index, { kind: e.target.value as 'income' | 'expense' })}><option value="income">Income</option><option value="expense">Expense</option></select></label>
          <label className="min-w-0 space-y-1 text-xs">Day<input aria-label={`Cash entry ${index + 1} day`} inputMode="numeric" autoComplete="off" className={control} value={event.day} onChange={e => changeEvent(index, { day: e.target.value })} /></label>
          <label className="min-w-0 space-y-1 text-xs">Amount ($)<input aria-label={`Cash entry ${index + 1} amount`} inputMode="decimal" autoComplete="off" className={control} value={event.amount} onChange={e => changeEvent(index, { amount: e.target.value })} /></label>
          {event.kind === 'expense' ? <label className="min-w-0 space-y-1 text-xs">Funding<select aria-label={`Cash entry ${index + 1} funding`} className={control} value={event.source} onChange={e => changeEvent(index, { source: e.target.value as '' | 'checking' | 'loc' })}><option value="">Choose account</option><option value="checking">Checking</option><option value="loc">LOC</option></select></label> : null}
        </div>
        <div className="flex gap-2">
          <button type="button" className={icon} title={`Move entry ${index + 1} up`} aria-label={`Move entry ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp aria-hidden="true" size={16} /></button>
          <button type="button" className={icon} title={`Move entry ${index + 1} down`} aria-label={`Move entry ${index + 1} down`} disabled={index === draft.cashEvents.length - 1} onClick={() => move(index, 1)}><ArrowDown aria-hidden="true" size={16} /></button>
          <button type="button" className={icon} title={`Remove entry ${index + 1}`} aria-label={`Remove entry ${index + 1}`} onClick={() => change({ ...draft, cashEvents: draft.cashEvents.filter((_, i) => i !== index) })}><Trash2 aria-hidden="true" size={16} /></button>
        </div>
      </div>)}
      <button type="button" disabled={draft.cashEvents.length >= 256} onClick={() => change({ ...draft, cashEvents: [...draft.cashEvents,
        { id: crypto.randomUUID(), kind: 'income', day: '', amount: '', source: '' }] })}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm disabled:opacity-40"><Plus aria-hidden="true" size={16} />Add cash entry</button>
    </fieldset>
    {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
    <div className="flex flex-wrap gap-3">
      <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm"><Save aria-hidden="true" size={16} />Save dated schedule</button>
      {store.datedPlan ? <button type="button" onClick={() => publish(true)} className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm"><Trash2 aria-hidden="true" size={16} />Remove dated schedule</button> : null}
    </div>
  </form>;
}
