import { decodeDatedPortfolioPlan, type DatedPortfolioPlan } from '@interestshield/financial-engine/dated-plan';

export const datedDateFields = ['startDate', 'accountOpenedOn', 'drawEndsOn', 'maturesOn', 'annualFeeFirstDueOn'] as const;
export const datedMoneyFields = ['openingCash', 'cashReserve', 'openingMinimumPayment'] as const;
export const datedDayFields = ['minimumDueDay', 'debtPaymentDay'] as const;
type DraftKey = typeof datedDateFields[number] | typeof datedMoneyFields[number] | typeof datedDayFields[number];
export type DatedPlanDraft = Record<DraftKey, string> & {
  cashEvents: Array<{ id: string; day: string; kind: 'income' | 'expense'; amount: string; source: '' | 'checking' | 'loc' }>;
};
export const datedFieldLabels: Record<DraftKey, string> = {
  startDate: 'Plan start date', accountOpenedOn: 'LOC opened on', drawEndsOn: 'Draw period ends on (exclusive)',
  maturesOn: 'LOC matures on', annualFeeFirstDueOn: 'First annual fee due on', openingCash: 'Opening checking cash ($)',
  cashReserve: 'Protected cash reserve ($)', openingMinimumPayment: 'Outstanding statement minimum ($)',
  minimumDueDay: 'LOC minimum due day', debtPaymentDay: 'Other debt payment day',
};
export function createDatedPlanDraft(plan?: DatedPortfolioPlan): DatedPlanDraft {
  return { startDate: plan?.startDate ?? '', accountOpenedOn: plan?.accountOpenedOn ?? '',
    drawEndsOn: plan?.drawEndsOn ?? '', maturesOn: plan?.maturesOn ?? '', annualFeeFirstDueOn: plan?.annualFeeFirstDueOn ?? '',
    openingCash: plan ? String(plan.openingCash) : '', cashReserve: plan ? String(plan.cashReserve) : '',
    openingMinimumPayment: plan ? String(plan.openingMinimumPayment) : '', minimumDueDay: plan ? String(plan.minimumDueDay) : '',
    debtPaymentDay: plan ? String(plan.debtPaymentDay) : '', cashEvents: plan?.cashEvents.map(event => ({ id: event.id,
      day: String(event.day), kind: event.kind, amount: String(event.amount), source: event.source ?? '' })) ?? [] };
}
function amount(value: string): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Enter a non-negative dollar amount with at most two decimal places.');
  return Number(value);
}
function day(value: string): number {
  if (!/^\d{1,2}$/.test(value) || Number(value) < 1 || Number(value) > 31) throw new Error('Enter a whole calendar day from 1 to 31.');
  return Number(value);
}
export function readDatedPlanDraft(draft: DatedPlanDraft): DatedPortfolioPlan {
  return decodeDatedPortfolioPlan({ contract: 'fixed-loc-daily-v1', startDate: draft.startDate,
    openingCash: amount(draft.openingCash), cashReserve: amount(draft.cashReserve), accountOpenedOn: draft.accountOpenedOn,
    drawEndsOn: draft.drawEndsOn, maturesOn: draft.maturesOn, annualFeeFirstDueOn: draft.annualFeeFirstDueOn,
    openingMinimumPayment: amount(draft.openingMinimumPayment), minimumDueDay: day(draft.minimumDueDay), debtPaymentDay: day(draft.debtPaymentDay),
    cashEvents: draft.cashEvents.map(event => ({ id: event.id, day: day(event.day), kind: event.kind, amount: amount(event.amount),
      ...(event.kind === 'expense' ? { source: event.source } : {}) })) });
}
