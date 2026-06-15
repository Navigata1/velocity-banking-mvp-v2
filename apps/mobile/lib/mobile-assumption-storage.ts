import {
  defaultMobileDashboardInput,
  type MobileDashboardInput,
} from '@interestshield/financial-engine';
import * as SecureStore from 'expo-secure-store';

export const MOBILE_ASSUMPTIONS_STORAGE_KEY = 'interestshield.mobile.assumptions.v1';

export type MobileAssumptionStorageBackend = 'secure-store' | 'local-storage' | 'unavailable';

export interface MobileAssumptionsStorageResult {
  backend: MobileAssumptionStorageBackend;
  input: MobileDashboardInput;
  restored: boolean;
}

interface StoredMobileAssumptionsPayload {
  input: MobileDashboardInput;
  savedAt: string;
  version: 1;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeMobileDashboardInput(value: unknown): MobileDashboardInput | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<MobileDashboardInput>;
  const activeDebt = candidate.activeDebt;
  const loc = candidate.loc;

  if (
    !activeDebt ||
    !loc ||
    typeof activeDebt !== 'object' ||
    typeof loc !== 'object' ||
    typeof candidate.activeDebtName !== 'string' ||
    candidate.activeDebtName.trim().length === 0 ||
    !isFiniteNumber(candidate.monthlyIncome) ||
    !isFiniteNumber(candidate.monthlyExpenses) ||
    !isFiniteNumber(candidate.chunkAmount) ||
    !isFiniteNumber(activeDebt.balance) ||
    !isFiniteNumber(activeDebt.apr) ||
    !isFiniteNumber(activeDebt.monthlyPayment) ||
    !isFiniteNumber(loc.limit) ||
    !isFiniteNumber(loc.apr) ||
    !isFiniteNumber(loc.balance)
  ) {
    return null;
  }

  if (
    candidate.monthlyIncome < 0 ||
    candidate.monthlyExpenses < 0 ||
    candidate.chunkAmount < 0 ||
    activeDebt.balance < 0 ||
    activeDebt.apr < 0 ||
    activeDebt.monthlyPayment < 0 ||
    loc.limit < 0 ||
    loc.apr < 0 ||
    loc.balance < 0
  ) {
    return null;
  }

  return {
    activeDebt: {
      apr: activeDebt.apr,
      balance: activeDebt.balance,
      monthlyPayment: activeDebt.monthlyPayment,
      termMonths: isFiniteNumber(activeDebt.termMonths) && activeDebt.termMonths > 0
        ? activeDebt.termMonths
        : undefined,
    },
    activeDebtName: candidate.activeDebtName.trim(),
    chunkAmount: candidate.chunkAmount,
    loc: {
      apr: loc.apr,
      balance: loc.balance,
      limit: loc.limit,
    },
    monthlyExpenses: candidate.monthlyExpenses,
    monthlyIncome: candidate.monthlyIncome,
  };
}

export function encodeMobileAssumptions(
  input: MobileDashboardInput,
  savedAt: string = new Date().toISOString()
): string {
  const payload: StoredMobileAssumptionsPayload = {
    input,
    savedAt,
    version: 1,
  };

  return JSON.stringify(payload);
}

export function decodeMobileAssumptions(rawValue: string | null): MobileDashboardInput | null {
  if (!rawValue) return null;

  try {
    const payload = JSON.parse(rawValue) as Partial<StoredMobileAssumptionsPayload>;
    if (payload.version !== 1) return null;
    return normalizeMobileDashboardInput(payload.input);
  } catch {
    return null;
  }
}

async function getSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

function getLocalStorage(): Storage | null {
  if (typeof globalThis.localStorage === 'undefined') return null;
  return globalThis.localStorage;
}

export async function loadMobileAssumptions(
  fallbackInput: MobileDashboardInput = defaultMobileDashboardInput
): Promise<MobileAssumptionsStorageResult> {
  if (await getSecureStoreAvailable()) {
    const stored = decodeMobileAssumptions(
      await SecureStore.getItemAsync(MOBILE_ASSUMPTIONS_STORAGE_KEY)
    );

    return {
      backend: 'secure-store',
      input: stored ?? fallbackInput,
      restored: stored !== null,
    };
  }

  const localStorage = getLocalStorage();
  if (localStorage) {
    const stored = decodeMobileAssumptions(localStorage.getItem(MOBILE_ASSUMPTIONS_STORAGE_KEY));

    return {
      backend: 'local-storage',
      input: stored ?? fallbackInput,
      restored: stored !== null,
    };
  }

  return {
    backend: 'unavailable',
    input: fallbackInput,
    restored: false,
  };
}

export async function saveMobileAssumptions(input: MobileDashboardInput): Promise<MobileAssumptionStorageBackend> {
  const payload = encodeMobileAssumptions(input);

  if (await getSecureStoreAvailable()) {
    await SecureStore.setItemAsync(MOBILE_ASSUMPTIONS_STORAGE_KEY, payload);
    return 'secure-store';
  }

  const localStorage = getLocalStorage();
  if (localStorage) {
    localStorage.setItem(MOBILE_ASSUMPTIONS_STORAGE_KEY, payload);
    return 'local-storage';
  }

  return 'unavailable';
}
