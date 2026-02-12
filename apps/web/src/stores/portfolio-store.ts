'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DebtItem,
  PayoffStrategy,
  FocusMode,
  PortfolioPlanSettings,
  PortfolioSimulationInputs,
  PortfolioSimulationResult,
} from '@/engine/portfolio';
import { simulatePortfolio } from '@/engine/portfolio';

export type { DebtItem, PayoffStrategy, FocusMode } from '@/engine/portfolio';

export interface PortfolioState {
  debts: DebtItem[];
  monthlyIncome: number;
  monthlyExpenses: number;
  extraMonthlyPayment: number;
  strategy: PayoffStrategy;
  focusMode: FocusMode;
  splitRatioPrimary: number;
  lastResult?: PortfolioSimulationResult;

  setMonthlyIncome: (v: number) => void;
  setMonthlyExpenses: (v: number) => void;
  setExtraMonthlyPayment: (v: number) => void;
  setStrategy: (s: PayoffStrategy) => void;
  setFocusMode: (m: FocusMode) => void;
  setSplitRatioPrimary: (r: number) => void;

  addDebt: (debt: Omit<DebtItem, 'id' | 'createdAt'> & { id?: string }) => void;
  updateDebt: (id: string, patch: Partial<DebtItem>) => void;
  removeDebt: (id: string) => void;

  exportState: () => string;
  importState: (json: string) => { ok: true } | { ok: false; error: string };
  recompute: () => PortfolioSimulationResult;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}

const starterDebts: DebtItem[] = [
  {
    id: 'auto-demo',
    name: 'Auto Loan',
    category: 'auto',
    kind: 'amortized',
    balance: 18450,
    apr: 0.069,
    minPaymentRule: { type: 'fixed', amount: 425 },
    termMonths: 48,
    paymentSource: 'checking',
    createdAt: new Date().toISOString(),
    notes: 'Demo — replace with your real numbers.',
  },
  {
    id: 'mortgage-demo',
    name: 'Mortgage',
    category: 'mortgage',
    kind: 'amortized',
    balance: 285000,
    apr: 0.0575,
    minPaymentRule: { type: 'fixed', amount: 1850 },
    termMonths: 336,
    paymentSource: 'checking',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'land-demo',
    name: 'Land Loan',
    category: 'land',
    kind: 'amortized',
    balance: 45000,
    apr: 0.065,
    minPaymentRule: { type: 'fixed', amount: 450 },
    termMonths: 180,
    paymentSource: 'checking',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'card-demo',
    name: 'Credit Card',
    category: 'credit_card',
    kind: 'revolving',
    balance: 8500,
    apr: 0.219,
    minPaymentRule: { type: 'percent', percent: 0.02, floor: 35 },
    paymentSource: 'either',
    createdAt: new Date().toISOString(),
  },
];

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      debts: starterDebts,
      monthlyIncome: 6500,
      monthlyExpenses: 5000,
      extraMonthlyPayment: 0,
      strategy: 'velocity' as PayoffStrategy,
      focusMode: 'single' as FocusMode,
      splitRatioPrimary: 0.7,
      lastResult: undefined,

      setMonthlyIncome: (v) => { set({ monthlyIncome: Math.max(0, v) }); get().recompute(); },
      setMonthlyExpenses: (v) => { set({ monthlyExpenses: Math.max(0, v) }); get().recompute(); },
      setExtraMonthlyPayment: (v) => { set({ extraMonthlyPayment: v }); get().recompute(); },

      setStrategy: (s) => { set({ strategy: s }); get().recompute(); },
      setFocusMode: (m) => { set({ focusMode: m }); get().recompute(); },
      setSplitRatioPrimary: (r) => { set({ splitRatioPrimary: Math.min(1, Math.max(0, r)) }); get().recompute(); },

      addDebt: (debt) => {
        const id = debt.id ?? uid();
        const createdAt = new Date().toISOString();
        set((state) => ({
          debts: [...state.debts, { ...debt, id, createdAt } as DebtItem],
        }));
        get().recompute();
      },

      updateDebt: (id, patch) => {
        set((state) => ({
          debts: state.debts.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        }));
        get().recompute();
      },

      removeDebt: (id) => {
        set((state) => ({ debts: state.debts.filter((d) => d.id !== id) }));
        get().recompute();
      },

      exportState: () => {
        const state = get();
        return JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          data: {
            monthlyIncome: state.monthlyIncome,
            monthlyExpenses: state.monthlyExpenses,
            extraMonthlyPayment: state.extraMonthlyPayment,
            strategy: state.strategy,
            focusMode: state.focusMode,
            splitRatioPrimary: state.splitRatioPrimary,
            debts: state.debts,
          },
        }, null, 2);
      },

      importState: (jsonStr) => {
        try {
          const parsed = JSON.parse(jsonStr);
          const data = parsed?.data ?? parsed;
          if (!data) return { ok: false as const, error: 'Invalid file format.' };
          const debts = Array.isArray(data.debts) ? data.debts : null;
          if (!debts) return { ok: false as const, error: 'No debts found in file.' };

          set({
            monthlyIncome: Number(data.monthlyIncome ?? 0),
            monthlyExpenses: Number(data.monthlyExpenses ?? 0),
            extraMonthlyPayment: Number(data.extraMonthlyPayment ?? 0),
            strategy: (data.strategy ?? 'velocity') as PayoffStrategy,
            focusMode: (data.focusMode ?? 'single') as FocusMode,
            splitRatioPrimary: Number(data.splitRatioPrimary ?? 0.7),
            debts,
          });
          get().recompute();
          return { ok: true as const };
        } catch (e: unknown) {
          return { ok: false as const, error: e instanceof Error ? e.message : 'Failed to parse JSON.' };
        }
      },

      recompute: () => {
        const state = get();
        const settings: PortfolioPlanSettings = {
          strategy: state.strategy,
          focusMode: state.focusMode,
          splitRatioPrimary: state.splitRatioPrimary,
        };
        const inputs: PortfolioSimulationInputs = {
          monthlyIncome: state.monthlyIncome,
          monthlyExpenses: state.monthlyExpenses,
          extraMonthlyPayment: state.extraMonthlyPayment,
          debts: state.debts.map(d => ({ ...d })), // clone to avoid mutation
          settings,
          maxMonths: 600,
        };
        const result = simulatePortfolio(inputs);
        set({ lastResult: result });
        return result;
      },
    }),
    {
      name: 'interestshield-portfolio-v1',
      version: 1,
      partialize: (state) => ({
        debts: state.debts,
        monthlyIncome: state.monthlyIncome,
        monthlyExpenses: state.monthlyExpenses,
        extraMonthlyPayment: state.extraMonthlyPayment,
        strategy: state.strategy,
        focusMode: state.focusMode,
        splitRatioPrimary: state.splitRatioPrimary,
      }),
    }
  )
);
