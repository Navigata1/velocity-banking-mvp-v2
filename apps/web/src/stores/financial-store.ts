'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DebtAccount {
  id: string;
  type: 'car' | 'house' | 'land' | 'creditCard' | 'studentLoan';
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  termMonths: number;
  startDate?: string;
}

export interface LOC {
  limit: number;
  balance: number;
  interestRate: number;
}

export type DebtType = 'car' | 'house' | 'land' | 'creditCard' | 'studentLoan';
export type Domain = 'car' | 'house' | 'land' | 'creditCard' | 'studentLoan';

export interface FinancialState {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentAge: number;
  activeDomain: Domain;
  
  debts: {
    car: DebtAccount;
    house: DebtAccount;
    land: DebtAccount;
    creditCard: DebtAccount;
    studentLoan: DebtAccount;
  };
  
  loc: LOC;
  
  chunkAmount: number;
  chunkFrequency: 'weekly' | 'biweekly' | 'monthly';
  
  setMonthlyIncome: (income: number) => void;
  setMonthlyExpenses: (expenses: number) => void;
  setCurrentAge: (age: number) => void;
  setActiveDomain: (domain: Domain) => void;
  updateDebt: (type: DebtType, updates: Partial<DebtAccount>) => void;
  updateLOC: (updates: Partial<LOC>) => void;
  setChunkAmount: (amount: number) => void;
  setChunkFrequency: (frequency: 'weekly' | 'biweekly' | 'monthly') => void;
  
  getActiveDebtType: () => DebtType;
  getCashFlow: () => number;
  getDailyInterest: (type: DebtType) => number;
  getTotalDebt: () => number;
  getBaselinePayoff: (type: DebtType) => { months: number; totalInterest: number };
  getVelocityPayoff: (type: DebtType) => { months: number; totalInterest: number; savings: number };
}

const calculateAmortization = (principal: number, annualRate: number, termMonths: number) => {
  if (principal <= 0 || termMonths <= 0) return { monthlyPayment: 0, totalInterest: 0 };
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return { monthlyPayment: principal / termMonths, totalInterest: 0 };
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  const totalPaid = monthlyPayment * termMonths;
  return { monthlyPayment, totalInterest: totalPaid - principal };
};

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set, get) => ({
      monthlyIncome: 6500,
      monthlyExpenses: 5000,
      currentAge: 32,
      activeDomain: 'car' as Domain,
      
      debts: {
        car: {
          id: 'car-1',
          type: 'car',
          name: 'Car Loan',
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
      },
      
      loc: {
        limit: 25000,
        balance: 3200,
        interestRate: 0.085,
      },
      
      chunkAmount: 1000,
      chunkFrequency: 'monthly',
      
      setMonthlyIncome: (income) => set({ monthlyIncome: income }),
      
      setMonthlyExpenses: (expenses) => set({ monthlyExpenses: expenses }),
      
      setCurrentAge: (age) => set({ currentAge: age }),
      
      setActiveDomain: (domain) => set({ activeDomain: domain }),
      
      getActiveDebtType: (): DebtType => {
        const state = get();
        return state.activeDomain;
      },
      
      updateDebt: (type, updates) => set((state) => ({
        debts: {
          ...state.debts,
          [type]: { ...state.debts[type], ...updates },
        },
      })),
      
      updateLOC: (updates) => set((state) => ({
        loc: { ...state.loc, ...updates },
      })),
      
      setChunkAmount: (amount) => set({ chunkAmount: amount }),
      
      setChunkFrequency: (frequency) => set({ chunkFrequency: frequency }),
      
      getCashFlow: () => {
        const state = get();
        return state.monthlyIncome - state.monthlyExpenses;
      },
      
      getDailyInterest: (type) => {
        const state = get();
        const debt = state.debts[type];
        if (!debt) return 0;
        return (debt.balance * debt.interestRate) / 365;
      },
      
      getTotalDebt: () => {
        const state = get();
        return Object.values(state.debts).reduce((sum, debt) => sum + debt.balance, 0);
      },
      
      getBaselinePayoff: (type) => {
        const state = get();
        const debt = state.debts[type];
        if (!debt) return { months: 0, totalInterest: 0 };
        const { totalInterest } = calculateAmortization(debt.balance, debt.interestRate, debt.termMonths);
        return { months: debt.termMonths, totalInterest };
      },
      
      getVelocityPayoff: (type) => {
        const state = get();
        const debt = state.debts[type];
        if (!debt) return { months: 0, totalInterest: 0, savings: 0 };
        const baseline = state.getBaselinePayoff(type);
        const cashFlow = state.getCashFlow();
        const chunkAmount = state.chunkAmount;
        
        if (cashFlow <= 0 || chunkAmount <= 0) {
          return { months: baseline.months, totalInterest: baseline.totalInterest, savings: 0 };
        }
        
        let balance = debt.balance;
        let months = 0;
        let totalInterest = 0;
        const monthlyRate = debt.interestRate / 12;
        const locRate = state.loc.interestRate / 12;
        
        while (balance > 0 && months < debt.termMonths) {
          const interestPayment = balance * monthlyRate;
          const principalPayment = Math.min(debt.minimumPayment - interestPayment + chunkAmount, balance);
          
          const locInterest = (chunkAmount * locRate) * 0.5;
          
          balance -= principalPayment;
          totalInterest += interestPayment + locInterest;
          months++;
        }
        
        const savings = baseline.totalInterest - totalInterest;
        
        return { months, totalInterest, savings: Math.max(0, savings) };
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
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<FinancialState>;
        return {
          ...currentState,
          ...persisted,
          debts: {
            ...currentState.debts,
            ...(persisted.debts || {}),
          },
        };
      },
    }
  )
);
