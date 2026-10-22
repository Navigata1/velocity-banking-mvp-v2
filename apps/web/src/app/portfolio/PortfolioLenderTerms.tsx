'use client';

import { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import type { LenderTermField, LenderTermSource } from '@interestshield/financial-engine';
import { createLenderTermsDraft, lenderTermFields, lenderTermLabels, readLenderTermsDraft, type LenderTermsDraft } from '@interestshield/financial-engine/lender-terms-draft';
import ForecastBasisStatus from '@/components/ForecastBasisStatus';
import { usePortfolioStore } from '@/stores/portfolio-store';
import type { PortfolioThemeClasses } from './portfolio-types';

export default function PortfolioLenderTerms({ classes }: { classes: PortfolioThemeClasses }) {
  const terms = usePortfolioStore(state => state.loc.lenderTerms);
  const [notice, setNotice] = useState('');
  return <section className={`min-w-0 space-y-3 border-t py-4 ${classes.border} ${classes.text}`}>
    <ForecastBasisStatus terms={terms} />
    <details><summary className="min-h-11 cursor-pointer text-sm">Lender terms</summary>
      <LenderTermsForm key={JSON.stringify(terms) ?? 'no-profile'} classes={classes} onSaved={setNotice} onEdit={() => setNotice('')} />
    </details>
    {notice ? <p role="status" className="text-sm">{notice}</p> : null}
  </section>;
}

function LenderTermsForm({ classes, onSaved, onEdit }: { classes: PortfolioThemeClasses; onSaved: (message: string) => void; onEdit: () => void }) {
  const terms = usePortfolioStore(state => state.loc.lenderTerms), save = usePortfolioStore(state => state.setLenderTerms);
  const [draft, setDraft] = useState(() => createLenderTermsDraft(terms));
  const [error, setError] = useState('');
  const control = `min-h-11 w-full min-w-0 rounded-md border px-3 text-sm ${classes.bgSecondary} ${classes.border}`;
  function change<K extends Exclude<keyof LenderTermsDraft, 'sources'>>(key: K, value: LenderTermsDraft[K], field: LenderTermField) {
    setDraft(current => ({ ...current, [key]: value,
      ...(key === 'minimumPaymentMode' && value === 'interest-only' ? { minimumPaymentValue: '' } : {}),
      sources: { ...current.sources, [field]: 'user-provided' } }));
    onEdit(); setError('');
  }
  function publish(remove = false) {
    try {
      const input = remove ? null : readLenderTermsDraft(draft, terms), result = save(input);
      if (!result.ok) throw new Error(result.error);
      onSaved(remove ? 'Profile removed. Monthly educational assumptions apply.' : 'Lender terms saved. Forecast remains in review.'); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Terms could not be saved.'); onEdit(); }
  }
  return <form onSubmit={event => { event.preventDefault(); publish(); }} className="min-w-0 space-y-4 pt-2">
    <div className="grid min-w-0 gap-x-5 gap-y-4 md:grid-cols-2">
      {lenderTermFields.map(field => <fieldset key={field} className="min-w-0 space-y-2">
        <legend className="mb-2 text-sm font-medium">{lenderTermLabels[field]}{field.endsWith('Months') ? ' (months)' : field === 'transactionFeePercent' ? ' (%)' : field === 'rateMode' || field === 'minimumPayment' ? '' : ' ($)'}</legend>
        {field === 'rateMode' ? <select aria-label="Lender rate type" value={draft.rateMode} className={control}
          onChange={event => change('rateMode', event.target.value as LenderTermsDraft['rateMode'], field)}>
          <option value="">Unknown</option><option value="fixed">Fixed</option><option value="variable">Variable</option>
        </select> : field === 'minimumPayment' ? <>
          <select aria-label="Lender minimum payment mode" value={draft.minimumPaymentMode} className={control}
            onChange={event => change('minimumPaymentMode', event.target.value as LenderTermsDraft['minimumPaymentMode'], field)}>
            <option value="">Unknown</option><option value="fixed">Fixed amount</option><option value="percent-of-balance">Percent of balance</option><option value="interest-only">Interest only</option>
          </select>
          {draft.minimumPaymentMode !== 'interest-only' ? <input aria-label={`Lender minimum payment ${draft.minimumPaymentMode === 'percent-of-balance' ? 'percent' : 'amount'}`}
            inputMode="decimal" autoComplete="off" value={draft.minimumPaymentValue} className={control}
            onChange={event => change('minimumPaymentValue', event.target.value, field)} /> : null}
        </> : <input aria-label={`Lender ${lenderTermLabels[field].toLowerCase()}`} inputMode={field.endsWith('Months') ? 'numeric' : 'decimal'} autoComplete="off"
          value={draft[field]} className={control} onChange={event => change(field, event.target.value, field)} />}
        <label className={`block text-xs ${classes.textSecondary}`}>{lenderTermLabels[field]} source
          <select aria-label={`Lender ${lenderTermLabels[field].toLowerCase()} source`} value={draft.sources[field]} className={`${control} mt-1`}
            onChange={event => { setDraft(current => ({ ...current, sources: { ...current.sources, [field]: event.target.value as LenderTermSource | '' } })); onEdit(); setError(''); }}>
            <option value="">Unspecified</option><option value="user-provided">User provided</option><option value="lender-document">Lender document</option><option value="model-default">Model default</option>
          </select>
        </label>
      </fieldset>)}
    </div>
    {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
    <div className="flex flex-wrap gap-3">
      <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm"><Save aria-hidden="true" size={16} />Save lender terms</button>
      {terms !== undefined ? <button type="button" onClick={() => publish(true)} className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm"><Trash2 aria-hidden="true" size={16} />Remove lender profile</button> : null}
    </div>
  </form>;
}
