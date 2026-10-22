import { decodeDatedPortfolioPlan, type DatedPortfolioPlan } from '@interestshield/financial-engine/dated-plan';
import { formatFinancialInput, resolveFinancialDraft } from './financial-input-draft';

export const mobileDatedPlanFields = [
  { key: 'startDate', label: 'Plan start date', kind: 'date' },
  { key: 'accountOpenedOn', label: 'Account opened on', kind: 'date' },
  { key: 'drawEndsOn', label: 'Draw ends on', kind: 'date' },
  { key: 'maturesOn', label: 'Matures on', kind: 'date' },
  { key: 'annualFeeFirstDueOn', label: 'First annual fee date', kind: 'date' },
  { key: 'openingCash', label: 'Opening cash', kind: 'money' },
  { key: 'cashReserve', label: 'Cash reserve', kind: 'money' },
  { key: 'openingMinimumPayment', label: 'Opening statement minimum', kind: 'money' },
  { key: 'minimumDueDay', label: 'LOC minimum due day', kind: 'whole' },
  { key: 'debtPaymentDay', label: 'Other debt payment day', kind: 'whole' },
] as const;
export type MobileDatedPlanField = typeof mobileDatedPlanFields[number]['key'];
export interface MobileDatedCashDraft {
  id: string;
  day: string;
  kind: 'income' | 'expense';
  amount: string;
  source?: '' | 'checking' | 'loc';
}
export type MobileDatedPlanDraft = Record<MobileDatedPlanField, string> & { cashEvents: MobileDatedCashDraft[] };

export function createMobileDatedPlanDraft(input?: DatedPortfolioPlan): MobileDatedPlanDraft {
  const plan = input === undefined ? undefined : decodeDatedPortfolioPlan(input);
  const fields = Object.fromEntries(mobileDatedPlanFields.map(field => [field.key, plan === undefined ? ''
    : field.kind === 'date' ? plan[field.key] : formatFinancialInput(plan[field.key] as number, field.kind)]));
  return { ...fields, cashEvents: plan?.cashEvents.map(event => ({ ...event,
    day: formatFinancialInput(event.day, 'whole'), amount: formatFinancialInput(event.amount, 'money') })) ?? [] } as MobileDatedPlanDraft;
}

function numeric(text: string, kind: 'money' | 'whole', label: string): number {
  const parsed = resolveFinancialDraft(0, text, kind, kind === 'whole' ? { minimum: 1, maximum: 31 } : {});
  if (parsed.error) throw new Error(`${label}: ${parsed.error}`);
  return parsed.value;
}

export function readMobileDatedPlanDraft(draft: MobileDatedPlanDraft): DatedPortfolioPlan {
  const fields = Object.fromEntries(mobileDatedPlanFields.map(field => [field.key, field.kind === 'date'
    ? draft[field.key] : numeric(draft[field.key], field.kind, field.label)]));
  return decodeDatedPortfolioPlan({ contract: 'fixed-loc-daily-v1', ...fields,
    cashEvents: draft.cashEvents.map((event, index) => ({ id: event.id, kind: event.kind,
      day: numeric(event.day, 'whole', `Entry ${index + 1} day`), amount: numeric(event.amount, 'money', `Entry ${index + 1} amount`),
      ...(event.kind === 'expense' || event.source !== undefined ? { source: event.source } : {}) })) });
}
