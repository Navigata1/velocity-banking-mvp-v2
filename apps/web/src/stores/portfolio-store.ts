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
import type { PortfolioRunComparison, PortfolioRunSummary } from '@/engine/portfolio-run-diff';
import { comparePortfolioRuns, summarizePortfolioRun } from '@/engine/portfolio-run-diff';

export type { DebtItem, PayoffStrategy, FocusMode } from '@/engine/portfolio';

export interface PortfolioLOC {
  limit: number;
  balance: number;
  apr: number;
}

export interface PortfolioState {
  debts: DebtItem[];
  monthlyIncome: number;
  monthlyExpenses: number;
  extraMonthlyPayment: number;
  chunkAmount: number;
  loc: PortfolioLOC;
  strategy: PayoffStrategy;
  focusMode: FocusMode;
  splitRatioPrimary: number;
  lastResult?: PortfolioSimulationResult;
  lastRunSummary?: PortfolioRunSummary;
  lastRunComparison?: PortfolioRunComparison;

  setMonthlyIncome: (v: number) => void;
  setMonthlyExpenses: (v: number) => void;
  setExtraMonthlyPayment: (v: number) => void;
  setChunkAmount: (v: number) => void;
  updateLOC: (patch: Partial<PortfolioLOC>) => void;
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

const debtCategories: DebtItem['category'][] = [
  'mortgage', 'auto', 'credit_card', 'student_loan', 'personal_loan',
  'medical', 'land', 'purchase_plan', 'custom',
];
const debtKinds: DebtItem['kind'][] = ['amortized', 'revolving', 'simple'];
const paymentSources: DebtItem['paymentSource'][] = ['checking', 'loc', 'either'];
const payoffStrategies = ['velocity', 'snowball', 'avalanche'] as const satisfies readonly PayoffStrategy[];
const focusModes = ['single', 'split'] as const satisfies readonly FocusMode[];

function finiteNumber(value: unknown, fallback: number, label: string): number {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a valid number.`);
  }
  return number;
}

function nonNegativeNumber(value: unknown, fallback: number, label: string): number {
  return Math.max(0, finiteNumber(value, fallback, label));
}

function selectKnownValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? value as T
    : fallback;
}

function safeNonNegativeNumber(value: unknown, fallback: number, label: string): number {
  try {
    return nonNegativeNumber(value, fallback, label);
  } catch {
    return fallback;
  }
}

function safeRatio(value: unknown, fallback: number, label: string): number {
  try {
    return Math.min(1, Math.max(0, finiteNumber(value, fallback, label)));
  } catch {
    return fallback;
  }
}

function sanitizeImportedDebt(raw: unknown, index: number): DebtItem {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Debt ${index + 1} is invalid.`);
  }

  const debt = raw as Partial<DebtItem>;
  const label = typeof debt.name === 'string' && debt.name.trim()
    ? debt.name.trim()
    : `Debt ${index + 1}`;

  const rawRule = debt.minPaymentRule;
  let minPaymentRule: DebtItem['minPaymentRule'];
  if (rawRule && typeof rawRule === 'object' && !Array.isArray(rawRule) && rawRule.type === 'percent') {
    const rule = rawRule as Partial<Extract<DebtItem['minPaymentRule'], { type: 'percent' }>>;
    minPaymentRule = {
      type: 'percent',
      percent: nonNegativeNumber(rule.percent, 0, `${label} minimum percent`),
      floor: nonNegativeNumber(rule.floor, 0, `${label} minimum floor`),
    };
  } else {
    const rule = rawRule as Partial<Extract<DebtItem['minPaymentRule'], { type: 'fixed' }>> | undefined;
    minPaymentRule = {
      type: 'fixed',
      amount: nonNegativeNumber(rule?.amount, 0, `${label} minimum payment`),
    };
  }

  const rawPromo = debt.promo;
  let promo: DebtItem['promo'];
  if (rawPromo && typeof rawPromo === 'object' && !Array.isArray(rawPromo)) {
    const importedPromo = rawPromo as Partial<NonNullable<DebtItem['promo']>>;
    promo = {
      introApr: nonNegativeNumber(importedPromo.introApr, 0, `${label} promo intro APR`),
      monthsRemaining: Math.max(0, Math.round(finiteNumber(importedPromo.monthsRemaining, 0, `${label} promo months`))),
      postIntroApr: nonNegativeNumber(importedPromo.postIntroApr, debt.apr ?? 0, `${label} promo post-intro APR`),
    };
  }

  const termMonths = debt.termMonths == null
    ? undefined
    : Math.max(1, Math.round(finiteNumber(debt.termMonths, 1, `${label} term months`)));

  return {
    ...debt,
    id: typeof debt.id === 'string' && debt.id ? debt.id : uid(),
    name: label,
    category: selectKnownValue(debt.category, debtCategories, 'custom'),
    kind: selectKnownValue(debt.kind, debtKinds, 'amortized'),
    balance: nonNegativeNumber(debt.balance, 0, `${label} balance`),
    apr: nonNegativeNumber(debt.apr, 0, `${label} APR`),
    minPaymentRule,
    termMonths,
    paymentSource: selectKnownValue(debt.paymentSource, paymentSources, 'checking'),
    promo,
    createdAt: typeof debt.createdAt === 'string' && debt.createdAt ? debt.createdAt : new Date().toISOString(),
    notes: typeof debt.notes === 'string' ? debt.notes : undefined,
  };
}

function sanitizePersistedDebts(raw: unknown, fallback: DebtItem[]): DebtItem[] {
  if (!Array.isArray(raw)) return fallback;

  try {
    return raw.map(sanitizeImportedDebt);
  } catch {
    return fallback;
  }
}

type PersistedPortfolioFields = Pick<
  PortfolioState,
  | 'debts'
  | 'monthlyIncome'
  | 'monthlyExpenses'
  | 'extraMonthlyPayment'
  | 'chunkAmount'
  | 'loc'
  | 'strategy'
  | 'focusMode'
  | 'splitRatioPrimary'
>;

export function sanitizePersistedPortfolioState(
  persistedState: unknown,
  currentState: PortfolioState
): Partial<PersistedPortfolioFields> {
  if (!persistedState || typeof persistedState !== 'object' || Array.isArray(persistedState)) {
    return {};
  }

  const persisted = persistedState as Partial<PersistedPortfolioFields>;

  return {
    debts: sanitizePersistedDebts(persisted.debts, currentState.debts),
    monthlyIncome: safeNonNegativeNumber(persisted.monthlyIncome, currentState.monthlyIncome, 'Monthly income'),
    monthlyExpenses: safeNonNegativeNumber(persisted.monthlyExpenses, currentState.monthlyExpenses, 'Monthly expenses'),
    extraMonthlyPayment: safeNonNegativeNumber(
      persisted.extraMonthlyPayment,
      currentState.extraMonthlyPayment,
      'Extra monthly payment'
    ),
    chunkAmount: safeNonNegativeNumber(persisted.chunkAmount, currentState.chunkAmount, 'Velocity chunk'),
    loc: {
      limit: safeNonNegativeNumber(persisted.loc?.limit, currentState.loc.limit, 'LOC limit'),
      balance: safeNonNegativeNumber(persisted.loc?.balance, currentState.loc.balance, 'LOC balance'),
      apr: safeNonNegativeNumber(persisted.loc?.apr, currentState.loc.apr, 'LOC APR'),
    },
    strategy: selectKnownValue(persisted.strategy, payoffStrategies, currentState.strategy),
    focusMode: selectKnownValue(persisted.focusMode, focusModes, currentState.focusMode),
    splitRatioPrimary: safeRatio(persisted.splitRatioPrimary, currentState.splitRatioPrimary, 'Split ratio'),
  };
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      debts: starterDebts,
      monthlyIncome: 6500,
      monthlyExpenses: 5000,
      extraMonthlyPayment: 0,
      chunkAmount: 1000,
      loc: {
        limit: 25000,
        balance: 3200,
        apr: 0.085,
      },
      strategy: 'velocity' as PayoffStrategy,
      focusMode: 'single' as FocusMode,
      splitRatioPrimary: 0.7,
      lastResult: undefined,
      lastRunSummary: undefined,
      lastRunComparison: undefined,

      setMonthlyIncome: (v) => {
        const fallback = get().monthlyIncome;
        set({ monthlyIncome: safeNonNegativeNumber(v, fallback, 'Monthly income') });
        get().recompute();
      },
      setMonthlyExpenses: (v) => {
        const fallback = get().monthlyExpenses;
        set({ monthlyExpenses: safeNonNegativeNumber(v, fallback, 'Monthly expenses') });
        get().recompute();
      },
      setExtraMonthlyPayment: (v) => {
        const fallback = get().extraMonthlyPayment;
        set({ extraMonthlyPayment: safeNonNegativeNumber(v, fallback, 'Extra monthly payment') });
        get().recompute();
      },
      setChunkAmount: (v) => {
        const fallback = get().chunkAmount;
        set({ chunkAmount: safeNonNegativeNumber(v, fallback, 'Velocity chunk') });
        get().recompute();
      },
      updateLOC: (patch) => {
        set((state) => ({
          loc: {
            ...state.loc,
            ...patch,
            limit: safeNonNegativeNumber(patch.limit, state.loc.limit, 'LOC limit'),
            balance: safeNonNegativeNumber(patch.balance, state.loc.balance, 'LOC balance'),
            apr: safeNonNegativeNumber(patch.apr, state.loc.apr, 'LOC APR'),
          },
        }));
        get().recompute();
      },

      setStrategy: (s) => { set({ strategy: s }); get().recompute(); },
      setFocusMode: (m) => { set({ focusMode: m }); get().recompute(); },
      setSplitRatioPrimary: (r) => {
        const fallback = get().splitRatioPrimary;
        set({ splitRatioPrimary: safeRatio(r, fallback, 'Split ratio') });
        get().recompute();
      },

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
            chunkAmount: state.chunkAmount,
            loc: state.loc,
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
          const importedDebts = debts.map(sanitizeImportedDebt);
          const monthlyIncome = nonNegativeNumber(data.monthlyIncome, 0, 'Monthly income');
          const monthlyExpenses = nonNegativeNumber(data.monthlyExpenses, 0, 'Monthly expenses');
          const extraMonthlyPayment = nonNegativeNumber(data.extraMonthlyPayment, 0, 'Extra monthly payment');
          const chunkAmount = nonNegativeNumber(data.chunkAmount, 1000, 'Velocity chunk');
          const loc = {
            limit: nonNegativeNumber(data.loc?.limit, 25000, 'LOC limit'),
            balance: nonNegativeNumber(data.loc?.balance, 3200, 'LOC balance'),
            apr: nonNegativeNumber(data.loc?.apr ?? data.loc?.interestRate, 0.085, 'LOC APR'),
          };
          const splitRatioPrimary = Math.min(1, Math.max(0, finiteNumber(data.splitRatioPrimary, 0.7, 'Split ratio')));

          set({
            monthlyIncome,
            monthlyExpenses,
            extraMonthlyPayment,
            chunkAmount,
            loc,
            strategy: selectKnownValue(data.strategy, ['velocity', 'snowball', 'avalanche'], 'velocity') as PayoffStrategy,
            focusMode: selectKnownValue(data.focusMode, ['single', 'split'], 'single') as FocusMode,
            splitRatioPrimary,
            debts: importedDebts,
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
          loc: state.loc,
          chunkAmount: state.chunkAmount,
          maxMonths: 600,
        };
        const result = simulatePortfolio(inputs);
        const summary = summarizePortfolioRun(inputs, result);
        const comparison = comparePortfolioRuns(state.lastRunSummary, summary);
        set({
          lastResult: result,
          lastRunSummary: summary,
          lastRunComparison: comparison,
        });
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
        chunkAmount: state.chunkAmount,
        loc: state.loc,
        strategy: state.strategy,
        focusMode: state.focusMode,
        splitRatioPrimary: state.splitRatioPrimary,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedPortfolioState(persistedState, currentState),
      }),
    }
  )
);
