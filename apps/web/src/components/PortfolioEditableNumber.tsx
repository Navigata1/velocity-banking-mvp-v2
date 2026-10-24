'use client';

import { formatFinancialInput, resolveFinancialDraft, type FinancialInputKind } from '@interestshield/financial-engine/input-draft';
import { Pencil } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useThemeStore } from '@/stores/theme-store';

export interface EditableNumberProps {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  format?: 'currency' | 'percent' | 'number' | 'years' | 'months';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
  ariaLabel?: string;
  percentPolicy?: 'decimal' | 'legacy';
}

type Baseline = {
  value: number;
  kind: FinancialInputKind;
  min: number | undefined;
  max: number | undefined;
  format: EditableNumberProps['format'];
  controlLabel: string;
};
type Session = { baseline: Baseline; draft: string };
type Committed = Baseline & { onChange: (value: number) => void };

function sameBaseline(a: Baseline, b: Baseline): boolean {
  return Object.is(a.value, b.value) && Object.is(a.min, b.min) && Object.is(a.max, b.max)
    && a.kind === b.kind && a.format === b.format && a.controlLabel === b.controlLabel;
}

function formatDisplay(value: number, format: EditableNumberProps['format'], kind: FinancialInputKind): string {
  if (!Number.isFinite(value)) return 'Not available';
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
        minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    case 'percent': return `${formatFinancialInput(value, kind)}%`;
    case 'years': return `${value} yr${value !== 1 ? 's' : ''}`;
    case 'months': return `${value} mo`;
    default: return value.toLocaleString('en-US');
  }
}

const inputSizes = { sm: 'text-sm px-2 py-1', md: 'text-sm px-2 py-2', lg: 'text-base px-3 py-2', xl: 'text-lg px-3 py-3' };
const displaySizes = { sm: 'text-sm', md: 'text-sm', lg: 'text-2xl', xl: 'text-3xl' };

export function EditableNumber({ value, onChange, prefix = '', suffix = '', min = 0, max, step = 1,
  format = 'number', size = 'md', className = '', label, ariaLabel, percentPolicy = 'decimal' }: EditableNumberProps) {
  const { theme } = useThemeStore();
  const kind: FinancialInputKind = format === 'percent' ? percentPolicy === 'legacy' ? 'legacy-percent' : 'percent'
    : format === 'months' || format === 'years' ? 'whole' : 'money';
  const controlLabel = ariaLabel ?? label ?? 'Editable number';
  const baseline: Baseline = { value, kind, min, max, format, controlLabel };
  const [editor, setEditor] = useState<Session | null>(null);
  const [feedback, setFeedback] = useState<{ baseline: Baseline; message: string } | null>(null);
  const session = useRef<Session | null>(null);
  const committed = useRef<Committed | null>(null);
  const active = useRef(false);
  const returnFocus = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const feedbackId = useId();
  const isEditing = editor !== null;

  useLayoutEffect(() => {
    active.current = true;
    return () => { active.current = false; session.current = null; committed.current = null; };
  }, []);
  useLayoutEffect(() => {
    // Abandoned concurrent renders must not publish props that can authorize a commit.
    const next: Committed = { value, kind, min, max, format, controlLabel, onChange };
    committed.current = next;
    if (session.current && !sameBaseline(session.current.baseline, next)) session.current = null;
  });
  useLayoutEffect(() => {
    if (isEditing) { inputRef.current?.focus(); inputRef.current?.select(); }
    else if (returnFocus.current) { returnFocus.current = false; buttonRef.current?.focus(); }
  }, [isEditing]);

  function beginEdit() {
    const current = committed.current;
    if (!active.current || !current) return;
    const next = { baseline: current, draft: formatFinancialInput(current.value, current.kind) };
    session.current = next;
    setEditor(next); setFeedback(null);
  }
  function commit(fromKeyboard = false) {
    const current = committed.current, edit = session.current;
    session.current = null;
    if (!active.current || !current) return;
    if (!edit || !sameBaseline(edit.baseline, current)) { setEditor(null); return; }
    const result = resolveFinancialDraft(current.value, edit.draft, current.kind, { minimum: current.min, maximum: current.max });
    if (result.error) { setFeedback({ baseline: current, message: result.error }); return; }
    returnFocus.current = fromKeyboard;
    setEditor(null); setFeedback(null);
    if (!Object.is(result.value, current.value)) current.onChange(result.value);
  }
  function cancel() {
    if (!active.current) return;
    session.current = null;
    returnFocus.current = true;
    setEditor(null); setFeedback(null);
  }

  const display = formatDisplay(value, format, kind);
  const draft = editor && sameBaseline(editor.baseline, baseline) ? editor.draft : formatFinancialInput(value, kind);
  const error = feedback && sameBaseline(feedback.baseline, baseline) ? feedback.message : '';
  const textClass = theme === 'light' ? 'text-slate-800' : 'text-white';
  const mutedClass = theme === 'light' ? 'text-slate-500' : 'text-gray-400';
  const inputClass = theme === 'light' ? 'bg-white text-slate-800' : 'bg-slate-700 text-white';
  const hoverClass = theme === 'light' ? 'hover:bg-gray-200/50' : 'hover:bg-slate-700/50';

  return (
    <div data-financial-editor className={`inline-flex w-full min-w-0 max-w-full flex-col ${className}`}>
      {label ? <span className={`mb-1 text-xs ${mutedClass}`}>{label}</span> : null}
      {isEditing ? (
        <div className="flex min-w-0 max-w-full items-center gap-1">
          {prefix ? <span className={`shrink-0 ${mutedClass}`}>{prefix}</span> : null}
          <input ref={inputRef} type="text" inputMode={kind === 'whole' ? 'numeric' : 'decimal'} step={step}
            aria-label={`${controlLabel} value`} aria-invalid={Boolean(error)} aria-describedby={error ? feedbackId : undefined}
            value={draft}
            onChange={event => {
              const current = committed.current;
              if (!active.current || !current) return;
              const next = { baseline: current, draft: event.currentTarget.value };
              session.current = next; setEditor(next); setFeedback(null);
            }}
            onBlur={() => commit()}
            onKeyDown={event => {
              if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); commit(true); }
              else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); }
            }}
            className={`${inputClass} ${inputSizes[size]} box-border min-h-12 w-full min-w-0 max-w-full flex-1 rounded-lg border ${error ? 'border-amber-500' : 'border-emerald-500'} font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500`} />
          {suffix ? <span className={`shrink-0 ${mutedClass}`}>{suffix}</span> : null}
        </div>
      ) : (
        <button ref={buttonRef} type="button" onClick={beginEdit} aria-label={`Edit ${controlLabel}, current value ${display}`}
          aria-describedby={error ? feedbackId : undefined} title="Click to edit"
          className={`group inline-flex min-h-12 w-full min-w-0 max-w-full items-center gap-1 rounded-lg border border-transparent px-1 py-1 font-mono transition-colors hover:border-emerald-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${hoverClass} ${displaySizes[size]} ${textClass}`}>
          {prefix ? <span className="shrink-0">{prefix}</span> : null}
          <span className={`min-w-0 whitespace-nowrap text-left ${format === 'percent' ? 'text-sm' : ''}`}>{display}</span>
          {suffix ? <span className={`shrink-0 ${mutedClass}`}>{suffix}</span> : null}
          <Pencil aria-hidden="true" className="h-3 w-3 shrink-0 text-emerald-500 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        </button>
      )}
      {error ? <p id={feedbackId} role="alert" className={`mt-1 text-xs leading-5 [overflow-wrap:anywhere] ${theme === 'light' ? 'text-amber-800' : 'text-amber-300'}`}>{error}</p> : null}
    </div>
  );
}

export function EditablePercentage({ value, onChange, ...props }: Omit<EditableNumberProps, 'format'>) {
  return <EditableNumber value={value} onChange={onChange} format="percent" min={0} step={0.001} {...props} />;
}

export function EditableCurrency({ value, onChange, ...props }: Omit<EditableNumberProps, 'format' | 'prefix'>) {
  return <EditableNumber value={value} onChange={onChange} format="currency" {...props} />;
}
