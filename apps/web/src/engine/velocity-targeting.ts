/**
 * Velocity Targeting Engine
 * 
 * Scores and ranks debts for velocity banking strategy.
 * Prioritizes: cash-flow unlock > daily interest burn > promo risk.
 */

import { calculateDailyInterest } from '@interestshield/financial-engine';
import type { DebtAccount, DebtType } from '@/stores/financial-store';

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

export function formatCurrency(n: number): string {
  if (!isFinite(n)) return '$0';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function estimateDailyInterest(balance: number, apr: number): number {
  return calculateDailyInterest(balance, apr);
}

function finiteNonNegative(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function finitePromoMonths(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : null;
}

/**
 * Velocity Mode scoring (teacher-aligned):
 * 1) Cash-flow unlock (monthly payment freed) is primary (55%)
 * 2) Interest burn is secondary (35%)
 * 3) Promo expiration risk (10%)
 */
export function velocityScore(d: VelocityDebt): number {
  const unlock = finiteNonNegative(d.minimumPayment);
  const burn = estimateDailyInterest(finiteNonNegative(d.balance), finiteNonNegative(d.interestRate));
  const promoMonths = finitePromoMonths(d.promo?.monthsRemaining);
  const promoRisk =
    promoMonths === null ? 0 :
    promoMonths <= 3 ? 1.0 :
    promoMonths <= 6 ? 0.7 :
    promoMonths <= 9 ? 0.4 : 0.15;

  return (unlock * 0.55) + (burn * 30 * 0.35) + (promoRisk * 200 * 0.10);
}

export function rankDebtsVelocity(debts: VelocityDebt[]): VelocityDebt[] {
  return [...debts]
    .filter(d => finiteNonNegative(d.balance) > 0)
    .sort((a, b) => {
      const sa = velocityScore(a);
      const sb = velocityScore(b);
      if (sb !== sa) return sb - sa;
      // Tie-breakers
      const pa = finiteNonNegative(a.minimumPayment);
      const pb = finiteNonNegative(b.minimumPayment);
      if (pb !== pa) return pb - pa;
      return finiteNonNegative(a.balance) - finiteNonNegative(b.balance);
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
  const unlock = finiteNonNegative(d.minimumPayment);
  if (unlock > 0) parts.push(`unlocks ~${formatCurrency(unlock)}/mo`);
  const burn = estimateDailyInterest(finiteNonNegative(d.balance), finiteNonNegative(d.interestRate));
  if (burn > 0.01) parts.push(`burns ~${formatCurrency(burn)}/day`);
  if (d.paymentSource === 'checking') parts.push('checking-only');
  const promoMonths = finitePromoMonths(d.promo?.monthsRemaining);
  if (promoMonths != null) parts.push(`promo ends in ${promoMonths} mo`);
  return parts.join(' • ');
}
