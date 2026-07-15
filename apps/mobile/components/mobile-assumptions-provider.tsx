import { createContext, useContext, type PropsWithChildren } from 'react';
import { useMobileAuth } from '@/components/mobile-auth-provider';
import { usePersistedMobileAssumptions } from '@/hooks/use-persisted-mobile-assumptions';

export type MobileAssumptionsContextValue = ReturnType<typeof usePersistedMobileAssumptions>;

const MobileAssumptionsContext = createContext<MobileAssumptionsContextValue | null>(null);

export function MobileAssumptionsProvider({ children }: PropsWithChildren) {
  const { authReady, ownerId } = useMobileAuth();
  const assumptions = usePersistedMobileAssumptions(ownerId, authReady);

  return (
    <MobileAssumptionsContext.Provider value={assumptions}>
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
