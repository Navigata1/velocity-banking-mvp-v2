'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  calculateDailyInterest,
  simulateBaseline,
  simulateVelocity,
  type PayoffFailureReason,
  type SimulationInputs,
} from '../engine/calculations';

export interface DebtAccount {
  id: string;
  type: 'car' | 'house' | 'land' | 'creditCard' | 'studentLoan' | 'medical' | 'personal' | 'recreation' | 'custom';
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  termMonths: number;
  startDate?: string;
  customIcon?: string;
  customImage?: string;
}

export interface LOC {
  limit: number;
  balance: number;
  interestRate: number;
}

export type DebtType = 'car' | 'house' | 'land' | 'creditCard' | 'studentLoan' | 'medical' | 'personal' | 'recreation' | 'custom';
export type Domain = 'car' | 'house' | 'land' | 'creditCard' | 'studentLoan' | 'medical' | 'personal' | 'recreation' | 'custom';

export interface PayoffProjection {
  months: number;
  totalInterest: number;
  isPayoffPossible?: boolean;
  failureReason?: PayoffFailureReason;
}

export interface VelocityPayoffProjection extends PayoffProjection {
  savings: number;
}

export interface Subcategory {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const domainSubcategories: Record<Domain, Subcategory[]> = {
  car: [
    { id: 'sedan', label: 'Sedan', icon: '🚗', description: 'Family sedan' },
    { id: 'sports', label: 'Sports Car', icon: '🏎️', description: 'Two-door sports car' },
    { id: 'suv', label: 'SUV', icon: '🚙', description: 'Sport utility vehicle' },
    { id: 'motorcycle', label: 'Motorcycle', icon: '🏍️', description: 'Harley-Davidson style' },
    { id: 'truck', label: 'Pickup Truck', icon: '🛻', description: 'Dually or pickup' },
    { id: 'semi', label: 'Semi Truck', icon: '🚛', description: '18-wheeler' },
  ],
  house: [
    { id: 'starter', label: 'Starter Home', icon: '🏠', description: 'Small starter home' },
    { id: 'family', label: 'Family Home', icon: '🏡', description: 'Family-sized home' },
    { id: 'townhouse', label: 'Townhouse', icon: '🏘️', description: 'Townhouse or duplex' },
    { id: 'condo', label: 'Condo', icon: '🏢', description: 'Condominium' },
    { id: 'luxury', label: 'Luxury Home', icon: '🏛️', description: 'Luxury residence' },
    { id: 'mansion', label: 'Mansion', icon: '🏰', description: 'Estate or mansion' },
  ],
  land: [
    { id: 'lot', label: 'Building Lot', icon: '🏞️', description: 'Small building lot' },
    { id: 'acre', label: 'Acreage', icon: '🌾', description: 'Few acres' },
    { id: 'farm', label: 'Farmland', icon: '🚜', description: 'Working farm' },
    { id: 'ranch', label: 'Ranch', icon: '🐎', description: 'Large ranch' },
    { id: 'commercial', label: 'Commercial', icon: '🏗️', description: 'Commercial property' },
    { id: 'estate', label: 'Estate', icon: '⛳', description: 'Golf course or estate' },
  ],
  creditCard: [
    { id: 'basic', label: 'Basic Card', icon: '💳', description: 'Basic credit card' },
    { id: 'rewards', label: 'Rewards Card', icon: '🎁', description: 'Rewards or cashback' },
    { id: 'store', label: 'Store Card', icon: '🏪', description: 'Retail store card' },
    { id: 'premium', label: 'Premium Card', icon: '✨', description: 'Premium rewards' },
    { id: 'platinum', label: 'Platinum', icon: '💎', description: 'Platinum status' },
    { id: 'black', label: 'Black Card', icon: '🖤', description: 'Elite black card' },
  ],
  studentLoan: [
    { id: 'community', label: 'Community College', icon: '📚', description: 'Community college' },
    { id: 'state', label: 'State University', icon: '🎓', description: 'State school' },
    { id: 'private', label: 'Private University', icon: '🏫', description: 'Private university' },
    { id: 'graduate', label: 'Graduate Degree', icon: '📜', description: 'Masters program' },
    { id: 'professional', label: 'Professional', icon: '⚕️', description: 'Medical/Law school' },
    { id: 'phd', label: 'Doctorate', icon: '🎖️', description: 'PhD program' },
  ],
  medical: [
    { id: 'routine', label: 'Routine Care', icon: '🩺', description: 'Doctor visits' },
    { id: 'dental', label: 'Dental', icon: '🦷', description: 'Dental work' },
    { id: 'emergency', label: 'Emergency', icon: '🚑', description: 'ER visit' },
    { id: 'surgery', label: 'Surgery', icon: '🏥', description: 'Surgical procedure' },
    { id: 'specialist', label: 'Specialist', icon: '👨‍⚕️', description: 'Specialist treatment' },
    { id: 'major', label: 'Major Medical', icon: '💊', description: 'Major medical event' },
  ],
  personal: [
    { id: 'small', label: 'Small Loan', icon: '💵', description: 'Under $5K' },
    { id: 'medium', label: 'Medium Loan', icon: '💰', description: '$5K-$15K' },
    { id: 'consolidation', label: 'Consolidation', icon: '🔗', description: 'Debt consolidation' },
    { id: 'large', label: 'Large Loan', icon: '🏦', description: '$15K-$50K' },
    { id: 'signature', label: 'Signature Loan', icon: '✍️', description: 'Unsecured signature' },
    { id: 'premium', label: 'Premium Loan', icon: '💎', description: '$50K+' },
  ],
  recreation: [
    { id: 'jetski', label: 'Jet Ski', icon: '🌊', description: 'Personal watercraft' },
    { id: 'boat', label: 'Boat', icon: '🚤', description: 'Speedboat or fishing' },
    { id: 'rv', label: 'RV', icon: '🚐', description: 'Recreational vehicle' },
    { id: 'yacht', label: 'Yacht', icon: '🛥️', description: 'Luxury yacht' },
    { id: 'superyacht', label: 'Super Yacht', icon: '🚢', description: 'Mega yacht' },
    { id: 'jet', label: 'Private Jet', icon: '✈️', description: 'G5 or similar' },
  ],
  custom: [
    { id: 'other', label: 'Other Asset', icon: '➕', description: 'Custom asset' },
    { id: 'business', label: 'Business', icon: '🏢', description: 'Business expense' },
    { id: 'equipment', label: 'Equipment', icon: '🔧', description: 'Tools/equipment' },
    { id: 'jewelry', label: 'Jewelry', icon: '💍', description: 'Fine jewelry' },
    { id: 'art', label: 'Art/Collectibles', icon: '🎨', description: 'Art or collectibles' },
    { id: 'crypto', label: 'Crypto/Investments', icon: '📈', description: 'Investment debt' },
  ],
};

export interface MortgageDetails {
  entryMode: 'purchase' | 'current' | 'both';
  // Purchase details
  purchaseAge: number;
  originalCost: number;
  originalTermYears: number;
  originalRate: number;
  downPayment: number;
  // Current status
  currentAge: number;
  currentBalance: number;
  remainingTermMonths: number;
  currentRate: number;
  currentMonthlyPayment: number;
  // Payment behavior
  paymentFrequency: 'monthly' | 'biweekly' | 'weekly';
  hasExtraPayments: boolean;
  extraPaymentAmount: number;
  // Refinance history
  hasRefinanced: boolean;
  refinanceCount: number;
}

export interface FinancialState {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentAge: number;
  activeDomain: Domain;
  activeSubcategories: Record<Domain, string>;
  mortgageDetails: MortgageDetails;
  
  debts: {
    car: DebtAccount;
    house: DebtAccount;
    land: DebtAccount;
    creditCard: DebtAccount;
    studentLoan: DebtAccount;
    medical: DebtAccount;
    personal: DebtAccount;
    recreation: DebtAccount;
    custom: DebtAccount;
  };
  
  loc: LOC;
  
  chunkAmount: number;
  chunkFrequency: 'weekly' | 'biweekly' | 'monthly';
  
  setMonthlyIncome: (income: number) => void;
  setMonthlyExpenses: (expenses: number) => void;
  setCurrentAge: (age: number) => void;
  setActiveDomain: (domain: Domain) => void;
  setSubcategory: (domain: Domain, subcategoryId: string) => void;
  getActiveSubcategory: (domain: Domain) => Subcategory;
  updateDebt: (type: DebtType, updates: Partial<DebtAccount>) => void;
  updateLOC: (updates: Partial<LOC>) => void;
  setChunkAmount: (amount: number) => void;
  setChunkFrequency: (frequency: 'weekly' | 'biweekly' | 'monthly') => void;
  updateMortgageDetails: (updates: Partial<MortgageDetails>) => void;
  
  getActiveDebtType: () => DebtType;
  getCashFlow: () => number;
  getDailyInterest: (type: DebtType) => number;
  getTotalDebt: () => number;
  getBaselinePayoff: (type: DebtType) => PayoffProjection;
  getVelocityPayoff: (type: DebtType) => VelocityPayoffProjection;
}

const debtTypes: DebtType[] = [
  'car',
  'house',
  'land',
  'creditCard',
  'studentLoan',
  'medical',
  'personal',
  'recreation',
  'custom',
];
const chunkFrequencies = ['weekly', 'biweekly', 'monthly'] as const;
const mortgageEntryModes = ['purchase', 'current', 'both'] as const satisfies readonly MortgageDetails['entryMode'][];
const mortgagePaymentFrequencies = ['monthly', 'biweekly', 'weekly'] as const satisfies readonly MortgageDetails['paymentFrequency'][];

function finiteNumber(value: unknown, fallback: number, label: string): number {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a valid number.`);
  }
  return number;
}

function safeNonNegativeNumber(value: unknown, fallback: number, label: string): number {
  try {
    return Math.max(0, finiteNumber(value, fallback, label));
  } catch {
    return fallback;
  }
}

function safePositiveInteger(value: unknown, fallback: number, label: string): number {
  try {
    return Math.max(1, Math.round(finiteNumber(value, fallback, label)));
  } catch {
    return fallback;
  }
}

function safeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function selectKnownValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? value as T
    : fallback;
}

function readableString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function optionalString(value: unknown, fallback?: string): string | undefined {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeDebtAccount(raw: unknown, fallback: DebtAccount, type: DebtType): DebtAccount {
  const debt = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Partial<DebtAccount>
    : {};

  return {
    ...fallback,
    id: readableString(debt.id, fallback.id),
    type,
    name: readableString(debt.name, fallback.name),
    balance: safeNonNegativeNumber(debt.balance, fallback.balance, `${fallback.name} balance`),
    interestRate: safeNonNegativeNumber(debt.interestRate, fallback.interestRate, `${fallback.name} interest rate`),
    minimumPayment: safeNonNegativeNumber(debt.minimumPayment, fallback.minimumPayment, `${fallback.name} payment`),
    termMonths: safePositiveInteger(debt.termMonths, fallback.termMonths, `${fallback.name} term`),
    startDate: optionalString(debt.startDate, fallback.startDate),
    customIcon: optionalString(debt.customIcon, fallback.customIcon),
    customImage: optionalString(debt.customImage, fallback.customImage),
  };
}

function sanitizeDebtAccounts(raw: unknown, fallback: FinancialState['debts']): FinancialState['debts'] {
  const persisted = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Partial<Record<DebtType, unknown>>
    : {};

  return debtTypes.reduce((acc, type) => {
    acc[type] = sanitizeDebtAccount(persisted[type], fallback[type], type);
    return acc;
  }, {} as FinancialState['debts']);
}

function sanitizeActiveSubcategories(
  raw: unknown,
  fallback: FinancialState['activeSubcategories']
): FinancialState['activeSubcategories'] {
  const persisted = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Partial<Record<Domain, unknown>>
    : {};

  return debtTypes.reduce((acc, domain) => {
    const allowed = domainSubcategories[domain].map((subcategory) => subcategory.id);
    const fallbackValue = allowed.includes(fallback[domain])
      ? fallback[domain]
      : domainSubcategories[domain][0].id;
    acc[domain] = selectKnownValue(persisted[domain], allowed, fallbackValue);
    return acc;
  }, {} as FinancialState['activeSubcategories']);
}

function sanitizeMortgageDetails(raw: unknown, fallback: MortgageDetails): MortgageDetails {
  const details = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Partial<MortgageDetails>
    : {};

  return {
    entryMode: selectKnownValue(details.entryMode, mortgageEntryModes, fallback.entryMode),
    purchaseAge: safeNonNegativeNumber(details.purchaseAge, fallback.purchaseAge, 'Purchase age'),
    originalCost: safeNonNegativeNumber(details.originalCost, fallback.originalCost, 'Original cost'),
    originalTermYears: safePositiveInteger(details.originalTermYears, fallback.originalTermYears, 'Original term'),
    originalRate: safeNonNegativeNumber(details.originalRate, fallback.originalRate, 'Original rate'),
    downPayment: safeNonNegativeNumber(details.downPayment, fallback.downPayment, 'Down payment'),
    currentAge: safeNonNegativeNumber(details.currentAge, fallback.currentAge, 'Current age'),
    currentBalance: safeNonNegativeNumber(details.currentBalance, fallback.currentBalance, 'Current balance'),
    remainingTermMonths: safePositiveInteger(
      details.remainingTermMonths,
      fallback.remainingTermMonths,
      'Remaining term'
    ),
    currentRate: safeNonNegativeNumber(details.currentRate, fallback.currentRate, 'Current rate'),
    currentMonthlyPayment: safeNonNegativeNumber(
      details.currentMonthlyPayment,
      fallback.currentMonthlyPayment,
      'Current monthly payment'
    ),
    paymentFrequency: selectKnownValue(
      details.paymentFrequency,
      mortgagePaymentFrequencies,
      fallback.paymentFrequency
    ),
    hasExtraPayments: safeBoolean(details.hasExtraPayments, fallback.hasExtraPayments),
    extraPaymentAmount: safeNonNegativeNumber(details.extraPaymentAmount, fallback.extraPaymentAmount, 'Extra payment'),
    hasRefinanced: safeBoolean(details.hasRefinanced, fallback.hasRefinanced),
    refinanceCount: safeNonNegativeNumber(details.refinanceCount, fallback.refinanceCount, 'Refinance count'),
  };
}

type PersistedFinancialFields = Pick<
  FinancialState,
  | 'monthlyIncome'
  | 'monthlyExpenses'
  | 'currentAge'
  | 'activeDomain'
  | 'activeSubcategories'
  | 'mortgageDetails'
  | 'debts'
  | 'loc'
  | 'chunkAmount'
  | 'chunkFrequency'
>;

export function sanitizePersistedFinancialState(
  persistedState: unknown,
  currentState: FinancialState
): Partial<PersistedFinancialFields> {
  if (!persistedState || typeof persistedState !== 'object' || Array.isArray(persistedState)) {
    return {};
  }

  const persisted = persistedState as Partial<PersistedFinancialFields>;

  return {
    monthlyIncome: safeNonNegativeNumber(persisted.monthlyIncome, currentState.monthlyIncome, 'Monthly income'),
    monthlyExpenses: safeNonNegativeNumber(persisted.monthlyExpenses, currentState.monthlyExpenses, 'Monthly expenses'),
    currentAge: safeNonNegativeNumber(persisted.currentAge, currentState.currentAge, 'Current age'),
    activeDomain: selectKnownValue(persisted.activeDomain, debtTypes, currentState.activeDomain),
    activeSubcategories: sanitizeActiveSubcategories(persisted.activeSubcategories, currentState.activeSubcategories),
    mortgageDetails: sanitizeMortgageDetails(persisted.mortgageDetails, currentState.mortgageDetails),
    debts: sanitizeDebtAccounts(persisted.debts, currentState.debts),
    loc: {
      limit: safeNonNegativeNumber(persisted.loc?.limit, currentState.loc.limit, 'LOC limit'),
      balance: safeNonNegativeNumber(persisted.loc?.balance, currentState.loc.balance, 'LOC balance'),
      interestRate: safeNonNegativeNumber(persisted.loc?.interestRate, currentState.loc.interestRate, 'LOC rate'),
    },
    chunkAmount: safeNonNegativeNumber(persisted.chunkAmount, currentState.chunkAmount, 'Velocity chunk'),
    chunkFrequency: selectKnownValue(persisted.chunkFrequency, chunkFrequencies, currentState.chunkFrequency),
  };
}

const createSimulationInputs = (state: FinancialState, type: DebtType): SimulationInputs | null => {
  const debt = state.debts[type];
  if (!debt) return null;

  return {
    monthlyIncome: state.monthlyIncome,
    monthlyExpenses: state.monthlyExpenses,
    carLoan: {
      balance: debt.balance,
      apr: debt.interestRate,
      monthlyPayment: debt.minimumPayment,
      termMonths: debt.termMonths,
    },
    loc: {
      limit: state.loc.limit,
      apr: state.loc.interestRate,
      balance: state.loc.balance,
    },
    useVelocity: true,
    extraPayment: state.chunkAmount,
  };
};

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set, get) => ({
      monthlyIncome: 6500,
      monthlyExpenses: 5000,
      currentAge: 32,
      activeDomain: 'car' as Domain,
      mortgageDetails: {
        entryMode: 'both' as const,
        purchaseAge: 28,
        originalCost: 320000,
        originalTermYears: 30,
        originalRate: 0.065,
        downPayment: 64000,
        currentAge: 32,
        currentBalance: 285000,
        remainingTermMonths: 312,
        currentRate: 0.065,
        currentMonthlyPayment: 1850,
        paymentFrequency: 'monthly' as const,
        hasExtraPayments: false,
        extraPaymentAmount: 0,
        hasRefinanced: false,
        refinanceCount: 0,
      },
      activeSubcategories: {
        car: 'sedan',
        house: 'family',
        land: 'lot',
        creditCard: 'basic',
        studentLoan: 'state',
        medical: 'routine',
        personal: 'small',
        recreation: 'boat',
        custom: 'other',
      },
      
      debts: {
        car: {
          id: 'car-1',
          type: 'car',
          name: 'Auto Loan',
          balance: 18450,
          interestRate: 0.069,
          minimumPayment: 425,
          termMonths: 48,
        },
        house: {
          id: 'house-1',
          type: 'house',
          name: 'Mortgage',
          balance: 285000,
          interestRate: 0.065,
          minimumPayment: 1850,
          termMonths: 336,
        },
        land: {
          id: 'land-1',
          type: 'land',
          name: 'Land Investment',
          balance: 75000,
          interestRate: 0.055,
          minimumPayment: 650,
          termMonths: 180,
        },
        creditCard: {
          id: 'cc-1',
          type: 'creditCard',
          name: 'Credit Card',
          balance: 8500,
          interestRate: 0.219,
          minimumPayment: 250,
          termMonths: 60,
        },
        studentLoan: {
          id: 'student-1',
          type: 'studentLoan',
          name: 'Student Loan',
          balance: 32000,
          interestRate: 0.068,
          minimumPayment: 380,
          termMonths: 120,
        },
        medical: {
          id: 'medical-1',
          type: 'medical',
          name: 'Medical Debt',
          balance: 12000,
          interestRate: 0.18,
          minimumPayment: 300,
          termMonths: 48,
        },
        personal: {
          id: 'personal-1',
          type: 'personal',
          name: 'Personal Loan',
          balance: 15000,
          interestRate: 0.11,
          minimumPayment: 350,
          termMonths: 60,
        },
        recreation: {
          id: 'recreation-1',
          type: 'recreation',
          name: 'Boat/RV Loan',
          balance: 45000,
          interestRate: 0.089,
          minimumPayment: 650,
          termMonths: 84,
        },
        custom: {
          id: 'custom-1',
          type: 'custom',
          name: 'Custom Asset',
          balance: 25000,
          interestRate: 0.075,
          minimumPayment: 400,
          termMonths: 72,
        },
      },
      
      loc: {
        limit: 25000,
        balance: 3200,
        interestRate: 0.085,
      },
      
      chunkAmount: 1000,
      chunkFrequency: 'monthly',
      
      setMonthlyIncome: (income) => set((state) => ({
        monthlyIncome: safeNonNegativeNumber(income, state.monthlyIncome, 'Monthly income'),
      })),
      
      setMonthlyExpenses: (expenses) => set((state) => ({
        monthlyExpenses: safeNonNegativeNumber(expenses, state.monthlyExpenses, 'Monthly expenses'),
      })),
      
      setCurrentAge: (age) => set((state) => ({
        currentAge: safeNonNegativeNumber(age, state.currentAge, 'Current age'),
      })),
      
      setActiveDomain: (domain) => set({ activeDomain: domain }),
      
      setSubcategory: (domain, subcategoryId) => set((state) => ({
        activeSubcategories: {
          ...state.activeSubcategories,
          [domain]: subcategoryId,
        },
      })),
      
      getActiveSubcategory: (domain): Subcategory => {
        const state = get();
        const subcatId = state.activeSubcategories?.[domain] || domainSubcategories[domain][0].id;
        return domainSubcategories[domain].find(s => s.id === subcatId) || domainSubcategories[domain][0];
      },
      
      getActiveDebtType: (): DebtType => {
        const state = get();
        return state.activeDomain;
      },
      
      updateDebt: (type, updates) => set((state) => ({
        debts: {
          ...state.debts,
          [type]: sanitizeDebtAccount({ ...state.debts[type], ...updates }, state.debts[type], type),
        },
      })),
      
      updateLOC: (updates) => set((state) => ({
        loc: {
          limit: safeNonNegativeNumber(updates.limit, state.loc.limit, 'LOC limit'),
          balance: safeNonNegativeNumber(updates.balance, state.loc.balance, 'LOC balance'),
          interestRate: safeNonNegativeNumber(updates.interestRate, state.loc.interestRate, 'LOC rate'),
        },
      })),
      
      setChunkAmount: (amount) => set((state) => ({
        chunkAmount: safeNonNegativeNumber(amount, state.chunkAmount, 'Velocity chunk'),
      })),
      
      setChunkFrequency: (frequency) => set({ chunkFrequency: frequency }),
      
      updateMortgageDetails: (updates) => set((state) => ({
        mortgageDetails: sanitizeMortgageDetails(
          { ...state.mortgageDetails, ...updates },
          state.mortgageDetails
        ),
      })),
      
      getCashFlow: () => {
        const state = get();
        return state.monthlyIncome - state.monthlyExpenses;
      },
      
      getDailyInterest: (type) => {
        const state = get();
        const debt = state.debts[type];
        if (!debt) return 0;
        return calculateDailyInterest(debt.balance, debt.interestRate);
      },
      
      getTotalDebt: () => {
        const state = get();
        return Object.values(state.debts).reduce((sum, debt) => sum + debt.balance, 0);
      },
      
      getBaselinePayoff: (type) => {
        const state = get();
        const inputs = createSimulationInputs(state, type);
        if (!inputs) return { months: 0, totalInterest: 0, isPayoffPossible: false };

        const result = simulateBaseline(inputs);
        return {
          months: result.payoffMonths,
          totalInterest: result.totalInterest,
          isPayoffPossible: result.isPayoffPossible,
          failureReason: result.failureReason,
        };
      },
      
      getVelocityPayoff: (type) => {
        const state = get();
        const inputs = createSimulationInputs(state, type);
        if (!inputs) return { months: 0, totalInterest: 0, savings: 0, isPayoffPossible: false };

        const baseline = state.getBaselinePayoff(type);
        const velocity = simulateVelocity(inputs);
        const savings = baseline.isPayoffPossible && velocity.isPayoffPossible
          ? Math.max(0, baseline.totalInterest - velocity.totalInterest)
          : 0;

        return {
          months: velocity.payoffMonths,
          totalInterest: velocity.totalInterest,
          savings,
          isPayoffPossible: velocity.isPayoffPossible,
          failureReason: velocity.failureReason,
        };
      },
    }),
    {
      name: 'velocity-bank-storage',
      partialize: (state) => ({
        monthlyIncome: state.monthlyIncome,
        monthlyExpenses: state.monthlyExpenses,
        currentAge: state.currentAge,
        debts: state.debts,
        loc: state.loc,
        chunkAmount: state.chunkAmount,
        chunkFrequency: state.chunkFrequency,
        mortgageDetails: state.mortgageDetails,
      }),
      merge: (persistedState, currentState) => {
        return {
          ...currentState,
          ...sanitizePersistedFinancialState(persistedState, currentState),
        };
      },
    }
  )
);
