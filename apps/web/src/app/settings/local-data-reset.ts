export interface StorageLike {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

export const LOCAL_DEMO_STORAGE_KEYS = [
  'velocity-bank-storage',
  'interestshield-portfolio-v1',
  'interestshield-learn-progress',
  'interestshield-preferences-v1',
  'interestshield-theme',
  'interestshield-app-v1',
] as const;

function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function clearLocalDemoData(storage: StorageLike | null = browserStorage()): {
  attempted: number;
  cleared: number;
} {
  if (!storage) {
    return { attempted: LOCAL_DEMO_STORAGE_KEYS.length, cleared: 0 };
  }

  let cleared = 0;
  for (const key of LOCAL_DEMO_STORAGE_KEYS) {
    if (storage.getItem(key) != null) cleared += 1;
    storage.removeItem(key);
  }

  return { attempted: LOCAL_DEMO_STORAGE_KEYS.length, cleared };
}
