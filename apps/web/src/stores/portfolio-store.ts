'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DebtItem } from '@/engine/calculations';

export type PayoffStrategy = 'velocity' | 'snowball' | 'avalanche';

interface PortfolioState {
  debts: DebtItem[];
  strategy: PayoffStrategy;
  focusMode: 'single' | 'split';
  
  addDebt: (debt: Omit<DebtItem, 'id'>) => void;
  updateDebt: (id: string, updates: Partial<DebtItem>) => void;
  removeDebt: (id: string) => void;
  setStrategy: (strategy: PayoffStrategy) => void;
  setFocusMode: (mode: 'single' | 'split') => void;
  reorderDebts: (fromIndex: number, toIndex: number) => void;
}

let counter = 0;
function generateId(): string {
  counter++;
  return `debt-${Date.now()}-${counter}`;
}

const defaultDebts: DebtItem[] = [
  {
    id: 'default-cc',
    name: 'Credit Card',
    type: 'creditCard',
    balance: 8500,
    apr: 0.219,
    monthlyPayment: 250,
    termMonths: 60,
  },
  {
    id: 'default-car',
    name: 'Auto Loan',
    type: 'car',
    balance: 18450,
    apr: 0.069,
    monthlyPayment: 425,
    termMonths: 48,
  },
  {
    id: 'default-student',
    name: 'Student Loan',
    type: 'studentLoan',
    balance: 32000,
    apr: 0.068,
    monthlyPayment: 380,
    termMonths: 120,
  },
];

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      debts: defaultDebts,
      strategy: 'velocity',
      focusMode: 'single',

      addDebt: (debt) =>
        set((state) => ({
          debts: [...state.debts, { ...debt, id: generateId() }],
        })),

      updateDebt: (id, updates) =>
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),

      removeDebt: (id) =>
        set((state) => ({
          debts: state.debts.filter((d) => d.id !== id),
        })),

      setStrategy: (strategy) => set({ strategy }),
      setFocusMode: (mode) => set({ focusMode: mode }),

      reorderDebts: (fromIndex, toIndex) =>
        set((state) => {
          const newDebts = [...state.debts];
          const [moved] = newDebts.splice(fromIndex, 1);
          newDebts.splice(toIndex, 0, moved);
          return { debts: newDebts };
        }),
    }),
    {
      name: 'interestshield-portfolio-v1',
    }
  )
);
