/**
 * Velocity Targeting Engine
 *
 * Scores and ranks debts for velocity banking strategy.
 * Prioritizes: cash-flow unlock > daily interest burn > promo risk.
 */

import type { DebtAccount, DebtType } from '@/stores/financial-store';
import { formatCurrency, estimateDailyInterest } from './utils';

export { formatCurrency, estimateDailyInterest };

export type PaymentSource = 'checking' | 'loc' | 'either';

export interface PromoTerms {
  introApr?: number;
  monthsRemaining?: number;
  postIntroApr?: number;
}

export interface VelocityDebt extends DebtAccount {
  paymentSource?: PaymentSource;
  promo?: PromoTerms;
}

/**
 * Velocity Mode scoring (teacher-aligned):
 * 1) Cash-flow unlock (monthly payment freed) is primary (55%)
 * 2) Interest burn is secondary (35%)
 * 3) Promo expiration risk (10%)
 */
export function velocityScore(d: VelocityDebt): number {
  const unlock = Math.max(0, d.minimumPayment || 0);
  const burn = estimateDailyInterest(d.balance || 0, d.interestRate || 0);
  const promoMonths = d.promo?.monthsRemaining ?? null;
  const promoRisk =
    promoMonths === null ? 0 :
    promoMonths <= 3 ? 1.0 :
    promoMonths <= 6 ? 0.7 :
    promoMonths <= 9 ? 0.4 : 0.15;

  return (unlock * 0.55) + (burn * 30 * 0.35) + (promoRisk * 200 * 0.10);
}

export function rankDebtsVelocity(debts: VelocityDebt[]): VelocityDebt[] {
  return [...debts]
    .filter(d => (d.balance ?? 0) > 0)
    .sort((a, b) => {
      const sa = velocityScore(a);
      const sb = velocityScore(b);
      if (sb !== sa) return sb - sa;
      // Tie-breakers
      const pa = a.minimumPayment || 0;
      const pb = b.minimumPayment || 0;
      if (pb !== pa) return pb - pa;
      return (a.balance || 0) - (b.balance || 0);
    });
}

export function getDebtIcon(type: DebtType | string): string {
  switch (type) {
    case 'car': return '🚗';
    case 'house': return '🏠';
    case 'land': return '🏞️';
    case 'creditCard': return '💳';
    case 'studentLoan': return '🎓';
    case 'medical': return '🩺';
    case 'personal': return '💰';
    case 'recreation': return '🏖️';
    case 'custom': return '➕';
    default: return '📌';
  }
}

export function buildVelocityReason(d: VelocityDebt): string {
  const parts: string[] = [];
  const unlock = d.minimumPayment || 0;
  if (unlock > 0) parts.push(`unlocks ~${formatCurrency(unlock)}/mo`);
  const burn = estimateDailyInterest(d.balance || 0, d.interestRate || 0);
  if (burn > 0.01) parts.push(`burns ~${formatCurrency(burn)}/day`);
  if (d.paymentSource === 'checking') parts.push('checking-only');
  const promoMonths = d.promo?.monthsRemaining;
  if (promoMonths != null) parts.push(`promo ends in ${promoMonths} mo`);
  return parts.join(' • ');
}
