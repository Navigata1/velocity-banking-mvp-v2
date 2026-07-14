import {
  defaultMobileDashboardInput,
  type MobileDashboardInput,
} from '@interestshield/financial-engine';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadMobileAssumptionsForOwner,
  mobileAssumptionsStorageKey,
  saveMobileAssumptionsForOwner,
  type MobileAssumptionOwnerId,
  type MobileAssumptionStorageBackend,
} from '@/lib/mobile-assumption-storage';

export type MobileAssumptionStorageStatus =
  | 'loading'
  | 'restored-secure-store'
  | 'restored-local-storage'
  | 'saved-secure-store'
  | 'saved-local-storage'
  | 'unavailable';

function toRestoredStatus(backend: MobileAssumptionStorageBackend, restored: boolean): MobileAssumptionStorageStatus {
  if (backend === 'secure-store') return restored ? 'restored-secure-store' : 'saved-secure-store';
  if (backend === 'local-storage') return restored ? 'restored-local-storage' : 'saved-local-storage';
  return 'unavailable';
}

function toSavedStatus(backend: MobileAssumptionStorageBackend): MobileAssumptionStorageStatus {
  if (backend === 'secure-store') return 'saved-secure-store';
  if (backend === 'local-storage') return 'saved-local-storage';
  return 'unavailable';
}

function cloneDefaultMobileInput(): MobileDashboardInput {
  return {
    ...defaultMobileDashboardInput,
    activeDebt: { ...defaultMobileDashboardInput.activeDebt },
    loc: { ...defaultMobileDashboardInput.loc },
  };
}

export function usePersistedMobileAssumptions(
  ownerId: MobileAssumptionOwnerId = null,
  authReady = true
) {
  const isMounted = useRef(true);
  const [input, setInput] = useState<MobileDashboardInput>(() => cloneDefaultMobileInput());
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<MobileAssumptionStorageStatus>('loading');
  const [canPersist, setCanPersist] = useState(false);
  const lastPersistedInput = useRef<MobileDashboardInput | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveVersion = useRef(0);
  const scope = mobileAssumptionsStorageKey(ownerId);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const isHydrated = authReady && loadedScope === scope;
  const fallbackInput = useMemo(() => cloneDefaultMobileInput(), [scope]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let shouldApply = true;
    setLoadedScope(null);
    setStorageStatus('loading');
    setCanPersist(false);
    lastPersistedInput.current = null;
    saveVersion.current += 1;
    setInput(cloneDefaultMobileInput());
    if (!authReady) return () => { shouldApply = false; };

    loadMobileAssumptionsForOwner(ownerId)
      .then((result) => {
        if (!shouldApply || !isMounted.current) return;
        lastPersistedInput.current = result.input;
        setInput(result.input);
        setLoadedScope(scope);
        setCanPersist(result.backend !== 'unavailable');
        setStorageStatus(toRestoredStatus(result.backend, result.restored));
      })
      .catch(() => {
        if (!shouldApply || !isMounted.current) return;
        const fallback = cloneDefaultMobileInput();
        lastPersistedInput.current = fallback;
        setInput(fallback);
        setLoadedScope(scope);
        setCanPersist(false);
        setStorageStatus('unavailable');
      });

    return () => {
      shouldApply = false;
    };
  }, [authReady, ownerId, scope]);

  useEffect(() => {
    if (!authReady || !canPersist || loadedScope !== scope || input === lastPersistedInput.current) return;
    lastPersistedInput.current = input;
    const operationVersion = ++saveVersion.current;
    const operation = saveQueue.current
      .catch(() => undefined)
      .then(() => saveMobileAssumptionsForOwner(ownerId, input));
    saveQueue.current = operation.then(() => undefined, () => undefined);
    operation
      .then((backend) => {
        if (isMounted.current && activeScope.current === scope && saveVersion.current === operationVersion) {
          setCanPersist(true);
          setStorageStatus(toSavedStatus(backend));
        }
      })
      .catch(() => {
        if (isMounted.current && activeScope.current === scope && saveVersion.current === operationVersion) {
          setCanPersist(false);
          setStorageStatus('unavailable');
        }
      });
  }, [authReady, canPersist, input, loadedScope, ownerId, scope]);

  const updateAssumptions = useCallback((nextInput: MobileDashboardInput) => {
    if (!isHydrated || activeScope.current !== scope) return;
    setInput(nextInput);
  }, [isHydrated, scope]);

  const resetAssumptions = useCallback(async (): Promise<MobileAssumptionStorageBackend> => {
    if (!isHydrated) throw new Error('Mobile assumptions are still loading for this account.');
    const nextInput = cloneDefaultMobileInput();
    lastPersistedInput.current = nextInput;
    setInput(nextInput);
    setLoadedScope(scope);
    if (!canPersist) return 'unavailable';

    const operationVersion = ++saveVersion.current;
    const operation = saveQueue.current
      .catch(() => undefined)
      .then(() => saveMobileAssumptionsForOwner(ownerId, nextInput));
    saveQueue.current = operation.then(() => undefined, () => undefined);
    try {
      const backend = await operation;
      if (isMounted.current && activeScope.current === scope && saveVersion.current === operationVersion) {
        setCanPersist(true);
        setStorageStatus(toSavedStatus(backend));
      }
      return backend;
    } catch (error) {
      if (isMounted.current && activeScope.current === scope && saveVersion.current === operationVersion) {
        setCanPersist(false);
        setStorageStatus('unavailable');
      }
      throw error;
    }
  }, [canPersist, isHydrated, ownerId, scope]);

  return {
    input: isHydrated ? input : fallbackInput,
    isHydrated,
    resetAssumptions,
    setInput: updateAssumptions,
    storageStatus,
  };
}
