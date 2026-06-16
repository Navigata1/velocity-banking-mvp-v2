import {
  defaultMobileDashboardInput,
  type MobileDashboardInput,
} from '@interestshield/financial-engine';
import { useEffect, useRef, useState } from 'react';
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

export function usePersistedMobileAssumptions() {
  const didLoad = useRef(false);
  const [input, setInput] = useState<MobileDashboardInput>(defaultMobileDashboardInput);
  const [storageStatus, setStorageStatus] = useState<MobileAssumptionStorageStatus>('loading');

  useEffect(() => {
    let isMounted = true;

    loadMobileAssumptions().then((result) => {
      if (!isMounted) return;
      setInput(result.input);
      setStorageStatus(toRestoredStatus(result.backend, result.restored));
      didLoad.current = true;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!didLoad.current) return;

    let isMounted = true;

    saveMobileAssumptions(input).then((backend) => {
      if (isMounted) setStorageStatus(toSavedStatus(backend));
    });

    return () => {
      isMounted = false;
    };
  }, [input]);

  return {
    input,
    setInput,
    storageStatus,
  };
}
