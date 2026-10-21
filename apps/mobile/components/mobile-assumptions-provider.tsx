import { createContext, useContext, type PropsWithChildren } from 'react';
import { useMobileAuth } from '@/components/mobile-auth-provider';
import { usePersistedMobileAssumptions } from '@/hooks/use-persisted-mobile-assumptions';

export type MobileAssumptionsContextValue = ReturnType<typeof usePersistedMobileAssumptions>;

const MobileAssumptionsContext = createContext<MobileAssumptionsContextValue | null>(null);

export function MobileAssumptionsProvider({ children }: PropsWithChildren) {
  const { authReady, ownerId, recoveryBusy, isRecoveryBusy } = useMobileAuth();
  const assumptions = usePersistedMobileAssumptions(ownerId, authReady);
  const editable = { ...assumptions, isHydrated: assumptions.isHydrated && !recoveryBusy,
    setInput: (input: Parameters<typeof assumptions.setInput>[0]) => { if (!isRecoveryBusy()) assumptions.setInput(input); },
    resetAssumptions: () => isRecoveryBusy() ? Promise.reject(new Error('Recovery is applying.')) : assumptions.resetAssumptions() };

  return (
    <MobileAssumptionsContext.Provider value={editable}>
      {children}
    </MobileAssumptionsContext.Provider>
  );
}

export function useMobileAssumptions(): MobileAssumptionsContextValue {
  const assumptions = useContext(MobileAssumptionsContext);
  if (!assumptions) {
    throw new Error('useMobileAssumptions must be used within MobileAssumptionsProvider');
  }
  return assumptions;
}
