import {
  defaultMobileDashboardInput,
  type MobileDashboardInput,
} from '@interestshield/financial-engine';
import * as SecureStore from 'expo-secure-store';
import {
  isMobileSnapshotOwnerLock,
  withMobileSnapshotOwnerLock,
  type MobileSnapshotOwnerLock,
} from './supabase/auth-storage';

export const MOBILE_ASSUMPTIONS_STORAGE_KEY = 'interestshield.mobile.assumptions.v1';
const OWNER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MobileAssumptionOwnerId = string | null;

export type MobileAssumptionStorageBackend = 'secure-store' | 'local-storage' | 'unavailable';

export interface MobileAssumptionsStorageResult {
  backend: MobileAssumptionStorageBackend;
  input: MobileDashboardInput;
  revision: number;
  restored: boolean;
}

export interface MobileAssumptionSaveResult {
  backend: MobileAssumptionStorageBackend;
  revision: number;
}

export interface MobileAssumptionSaveOptions {
  expectedRevision?: number;
  ownerLock?: MobileSnapshotOwnerLock;
}

interface StoredMobileAssumptionsPayload {
  input: MobileDashboardInput;
  ownerId?: MobileAssumptionOwnerId;
  revision?: number;
  savedAt: string;
  version: 1;
}

function normalizedOwnerId(ownerId: MobileAssumptionOwnerId): MobileAssumptionOwnerId {
  if (ownerId === null) return null;
  if (!OWNER_ID_PATTERN.test(ownerId)) throw new Error('Mobile assumption owner id must be a UUID.');
  return ownerId.toLowerCase();
}

export function mobileAssumptionsStorageKey(ownerId: MobileAssumptionOwnerId): string {
  const normalized = normalizedOwnerId(ownerId);
  return normalized ? `${MOBILE_ASSUMPTIONS_STORAGE_KEY}.owner.${normalized}` : MOBILE_ASSUMPTIONS_STORAGE_KEY;
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

function isLegacyStandaloneMobileDefault(input: MobileDashboardInput): boolean {
  return (
    input.monthlyIncome === 7000 &&
    input.monthlyExpenses === 4500 &&
    input.chunkAmount === 1500 &&
    input.activeDebtName === 'Auto Loan' &&
    input.activeDebt.balance === 18450 &&
    input.activeDebt.apr === 0.069 &&
    input.activeDebt.monthlyPayment === 425 &&
    input.activeDebt.termMonths === 60 &&
    input.loc.limit === 0 &&
    input.loc.apr === 0.085 &&
    input.loc.balance === 3200
  );
}

export function encodeMobileAssumptions(
  input: MobileDashboardInput,
  savedAt: string = new Date().toISOString(),
  ownerId: MobileAssumptionOwnerId = null,
  revision = 0
): string {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new Error('Mobile assumption revision must be a non-negative safe integer.');
  }
  const payload: StoredMobileAssumptionsPayload = {
    input,
    ownerId: normalizedOwnerId(ownerId),
    revision,
    savedAt,
    version: 1,
  };

  return JSON.stringify(payload);
}

function decodeMobileAssumptionsPayload(
  rawValue: string | null,
  expectedOwnerId: MobileAssumptionOwnerId = null
): { input: MobileDashboardInput; revision: number } | null {
  if (!rawValue) return null;

  try {
    const payload = JSON.parse(rawValue) as Partial<StoredMobileAssumptionsPayload>;
    if (payload.version !== 1) return null;
    const payloadOwnerId = typeof payload.ownerId === 'string'
      ? normalizedOwnerId(payload.ownerId)
      : null;
    if (payloadOwnerId !== normalizedOwnerId(expectedOwnerId)) return null;
    const revision = payload.revision ?? 0;
    if (!Number.isSafeInteger(revision) || revision < 0) return null;
    const normalized = normalizeMobileDashboardInput(payload.input);
    if (!normalized) return null;
    return {
      input: isLegacyStandaloneMobileDefault(normalized) ? defaultMobileDashboardInput : normalized,
      revision,
    };
  } catch {
    return null;
  }
}

export function decodeMobileAssumptions(
  rawValue: string | null,
  expectedOwnerId: MobileAssumptionOwnerId = null
): MobileDashboardInput | null {
  return decodeMobileAssumptionsPayload(rawValue, expectedOwnerId)?.input ?? null;
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

function assumptionOwnerLockId(ownerId: MobileAssumptionOwnerId): string {
  return normalizedOwnerId(ownerId) ?? 'guest';
}

function withAssumptionOwnerLock<T>(
  ownerId: MobileAssumptionOwnerId,
  ownerLock: MobileSnapshotOwnerLock | undefined,
  action: () => Promise<T>
): Promise<T> {
  const lockId = assumptionOwnerLockId(ownerId);
  if (isMobileSnapshotOwnerLock(ownerLock, lockId)) return action();
  return withMobileSnapshotOwnerLock(lockId, action);
}

export async function loadMobileAssumptionsForOwner(
  ownerId: MobileAssumptionOwnerId,
  fallbackInput: MobileDashboardInput = defaultMobileDashboardInput,
  ownerLock?: MobileSnapshotOwnerLock
): Promise<MobileAssumptionsStorageResult> {
  return withAssumptionOwnerLock(ownerId, ownerLock, async () => {
    const storageKey = mobileAssumptionsStorageKey(ownerId);
    if (await getSecureStoreAvailable()) {
      const stored = decodeMobileAssumptionsPayload(await SecureStore.getItemAsync(storageKey), ownerId);
      return {
        backend: 'secure-store',
        input: stored?.input ?? fallbackInput,
        restored: stored !== null,
        revision: stored?.revision ?? 0,
      };
    }

    const localStorage = getLocalStorage();
    if (localStorage) {
      const stored = decodeMobileAssumptionsPayload(localStorage.getItem(storageKey), ownerId);
      return {
        backend: 'local-storage',
        input: stored?.input ?? fallbackInput,
        restored: stored !== null,
        revision: stored?.revision ?? 0,
      };
    }

    return { backend: 'unavailable', input: fallbackInput, restored: false, revision: 0 };
  });
}

export async function saveMobileAssumptionsForOwner(
  ownerId: MobileAssumptionOwnerId,
  input: MobileDashboardInput,
  options: MobileAssumptionSaveOptions = {}
): Promise<MobileAssumptionSaveResult> {
  return withAssumptionOwnerLock(ownerId, options.ownerLock, async () => {
    const storageKey = mobileAssumptionsStorageKey(ownerId);
    const secureStoreAvailable = await getSecureStoreAvailable();
    const localStorage = secureStoreAvailable ? null : getLocalStorage();
    const raw = secureStoreAvailable
      ? await SecureStore.getItemAsync(storageKey)
      : localStorage?.getItem(storageKey) ?? null;
    const currentRevision = decodeMobileAssumptionsPayload(raw, ownerId)?.revision ?? 0;
    if (
      options.expectedRevision !== undefined
      && options.expectedRevision !== currentRevision
    ) throw new Error('Saved assumptions changed in another tab. Reload before saving again.');
    const revision = currentRevision + 1;
    if (!Number.isSafeInteger(revision)) throw new Error('Mobile assumption revision limit reached.');
    const payload = encodeMobileAssumptions(input, new Date().toISOString(), ownerId, revision);

    if (secureStoreAvailable) {
      await SecureStore.setItemAsync(storageKey, payload);
      return { backend: 'secure-store', revision };
    }
    if (localStorage) {
      localStorage.setItem(storageKey, payload);
      return { backend: 'local-storage', revision };
    }
    return { backend: 'unavailable', revision: currentRevision };
  });
}

export function loadMobileAssumptions(
  fallbackInput: MobileDashboardInput = defaultMobileDashboardInput
): Promise<MobileAssumptionsStorageResult> {
  return loadMobileAssumptionsForOwner(null, fallbackInput);
}

export function saveMobileAssumptions(
  input: MobileDashboardInput
): Promise<MobileAssumptionStorageBackend> {
  return saveMobileAssumptionsForOwner(null, input).then(({ backend }) => backend);
}
