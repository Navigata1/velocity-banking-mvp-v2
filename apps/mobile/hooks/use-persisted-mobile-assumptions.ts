import {
  defaultMobileDashboardInput,
  type MobileDashboardInput,
} from '@interestshield/financial-engine';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadMobileAssumptions,
  saveMobileAssumptions,
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

export function usePersistedMobileAssumptions() {
  const didLoad = useRef(false);
  const isMounted = useRef(true);
  const [input, setInput] = useState<MobileDashboardInput>(() => cloneDefaultMobileInput());
  const [storageStatus, setStorageStatus] = useState<MobileAssumptionStorageStatus>('loading');

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let shouldApply = true;

    loadMobileAssumptions().then((result) => {
      if (!shouldApply || !isMounted.current) return;
      setInput(result.input);
      setStorageStatus(toRestoredStatus(result.backend, result.restored));
      didLoad.current = true;
    });

    return () => {
      shouldApply = false;
    };
  }, []);

  useEffect(() => {
    if (!didLoad.current) return;

    let isMounted = true;

    saveMobileAssumptions(input)
      .then((backend) => {
        if (isMounted) setStorageStatus(toSavedStatus(backend));
      })
      .catch(() => {
        if (isMounted) setStorageStatus('unavailable');
      });

    return () => {
      isMounted = false;
    };
  }, [input]);

  const resetAssumptions = useCallback(async (): Promise<MobileAssumptionStorageBackend> => {
    const nextInput = cloneDefaultMobileInput();
    didLoad.current = true;
    setInput(nextInput);

    const backend = await saveMobileAssumptions(nextInput);
    if (isMounted.current) setStorageStatus(toSavedStatus(backend));
    return backend;
  }, []);

  return {
    input,
    resetAssumptions,
    setInput,
    storageStatus,
  };
}
