import { decodeLenderTerms, type LenderTermsInput, type LenderTermField, type LenderTermSource } from './index';
import { formatFinancialInput, resolveFinancialDraft, type FinancialInputKind } from './input-draft';

export const lenderTermLabels: Record<LenderTermField, string> = {
  annualFee: 'Annual fee', transactionFeePercent: 'Transaction fee', rateMode: 'Rate type',
  drawPeriodMonths: 'Draw period', repaymentPeriodMonths: 'Repayment period',
  minimumDraw: 'Minimum draw', minimumPayment: 'Minimum payment',
};
export const lenderTermFields = Object.keys(lenderTermLabels) as LenderTermField[];
export interface LenderTermsDraft {
  annualFee: string;
  transactionFeePercent: string;
  rateMode: '' | 'fixed' | 'variable';
  drawPeriodMonths: string;
  repaymentPeriodMonths: string;
  minimumDraw: string;
  minimumPaymentMode: '' | 'fixed' | 'percent-of-balance' | 'interest-only';
  minimumPaymentValue: string;
  sources: Record<LenderTermField, LenderTermSource | ''>;
}

export function createLenderTermsDraft(input?: LenderTermsInput): LenderTermsDraft {
  const terms = input === undefined ? {} : decodeLenderTerms(input);
  const formatted = (value: number | undefined, kind: FinancialInputKind) => value === undefined ? '' : formatFinancialInput(value, kind);
  return { annualFee: formatted(terms.annualFee, 'money'), transactionFeePercent: formatted(terms.transactionFeePercent, 'percent'),
    rateMode: terms.rateMode ?? '', drawPeriodMonths: formatted(terms.drawPeriodMonths, 'whole'),
    repaymentPeriodMonths: formatted(terms.repaymentPeriodMonths, 'whole'), minimumDraw: formatted(terms.minimumDraw, 'money'),
    minimumPaymentMode: terms.minimumPayment?.mode ?? '',
    minimumPaymentValue: formatted(terms.minimumPayment?.value, terms.minimumPayment?.mode === 'percent-of-balance' ? 'percent' : 'money'),
    sources: Object.fromEntries(lenderTermFields.map(field => [field, terms.sources?.[field] ?? ''])) as LenderTermsDraft['sources'] };
}

export function readLenderTermsDraft(draft: LenderTermsDraft, original?: LenderTermsInput): LenderTermsInput {
  const before = original === undefined ? {} : decodeLenderTerms(original);
  const result: LenderTermsInput = {};
  function number(text: string, previous: number | undefined, kind: FinancialInputKind, label: string): number {
    const parsed = resolveFinancialDraft(previous ?? NaN, text, kind);
    if (parsed.error) throw new Error(`${label}: ${parsed.error}`);
    return parsed.value;
  }
  for (const field of ['annualFee', 'transactionFeePercent', 'drawPeriodMonths', 'repaymentPeriodMonths', 'minimumDraw'] as const) {
    if (draft[field].trim() === '') continue;
    const kind = field === 'transactionFeePercent' ? 'percent' : field.endsWith('Months') ? 'whole' : 'money';
    result[field] = number(draft[field], before[field], kind, lenderTermLabels[field]);
  }
  if (draft.rateMode) result.rateMode = draft.rateMode;
  if (draft.minimumPaymentMode || draft.minimumPaymentValue.trim() !== ''
    || before.minimumPayment && Object.keys(before.minimumPayment).length === 0) {
    result.minimumPayment = {};
    if (draft.minimumPaymentMode) result.minimumPayment.mode = draft.minimumPaymentMode;
    if (draft.minimumPaymentValue.trim() !== '') result.minimumPayment.value = number(draft.minimumPaymentValue,
      before.minimumPayment?.mode === draft.minimumPaymentMode ? before.minimumPayment.value : undefined,
      draft.minimumPaymentMode === 'percent-of-balance' ? 'percent' : 'money', 'Minimum payment');
  }
  const sources = Object.fromEntries(lenderTermFields.filter(field => draft.sources[field] !== '').map(field => [field, draft.sources[field]]));
  if (Object.keys(sources).length || before.sources !== undefined) result.sources = sources;
  return decodeLenderTerms(result);
}
