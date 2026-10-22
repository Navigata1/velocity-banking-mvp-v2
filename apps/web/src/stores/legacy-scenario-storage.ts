const LEGACY_SCENARIO_KEY = 'velocity-bank-storage';
const unsupported = 'The saved single-target scenario contains unsupported lender terms or a dated plan. Its original bytes were preserved. Use Portfolio document3 for lender profiles or document4 for dated plans.';

export function assertLegacyScenarioState(value: unknown): void {
  if (value && typeof value === 'object' && ('datedPlan' in value
    || 'loc' in value && value.loc && typeof value.loc === 'object' && ('lenderTerms' in value.loc || 'datedPlan' in value.loc))) {
    throw new Error(unsupported);
  }
}

export function assertLegacyScenarioDocument(raw: string): void {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return; }
  assertLegacyScenarioState(value);
  if (value && typeof value === 'object' && 'state' in value) assertLegacyScenarioState(value.state);
}

interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
interface GuardStatus { readonly blocked: boolean; readonly error: string | null }
const ready: GuardStatus = Object.freeze({ blocked: false, error: null });

export function createLegacyScenarioStorage(getStorage: () => StoragePort | null) {
  let status = ready;
  const listeners = new Set<() => void>();
  function supported(key: string, raw: string | null): boolean {
    if (key !== LEGACY_SCENARIO_KEY || raw === null) return true;
    try { assertLegacyScenarioDocument(raw); return true; }
    catch {
      status = Object.freeze({ blocked: true, error: unsupported });
      for (const listener of [...listeners]) { try { listener(); } catch { /* A listener cannot allow an unsafe write. */ } }
      return false;
    }
  }
  return {
    getStatus: () => status,
    getServerStatus: () => ready,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getItem(key: string): string | null {
      if (status.blocked) return null;
      const raw = getStorage()?.getItem(key) ?? null;
      return supported(key, raw) ? raw : null;
    },
    setItem(key: string, value: string): void {
      if (status.blocked) return;
      if (key === LEGACY_SCENARIO_KEY) assertLegacyScenarioDocument(value);
      const storage = getStorage();
      if (storage && supported(key, storage.getItem(key))) storage.setItem(key, value);
    },
    removeItem(key: string): void {
      if (status.blocked) return;
      const storage = getStorage();
      if (storage && supported(key, storage.getItem(key))) storage.removeItem(key);
    },
  };
}

export const legacyScenarioStorage = createLegacyScenarioStorage(() => typeof window === 'undefined' ? null : window.localStorage);
