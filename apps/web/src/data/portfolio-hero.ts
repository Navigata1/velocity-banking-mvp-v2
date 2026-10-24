import type { DebtItem } from '@/engine/portfolio';
import type { HeroId } from './hero-assets';

export const portfolioDebtHeroes: Record<DebtItem['category'], HeroId> = {
  auto: 'car', mortgage: 'house', land: 'land', credit_card: 'creditCard', student_loan: 'studentLoan',
  personal_loan: 'personal', medical: 'medical', purchase_plan: 'custom', custom: 'custom',
};
