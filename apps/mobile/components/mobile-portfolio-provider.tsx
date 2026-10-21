import { createContext, useContext, type PropsWithChildren } from 'react';
import { useMobileAuth } from './mobile-auth-provider';
import { usePersistedMobilePortfolio } from '@/hooks/use-persisted-mobile-portfolio';

type Value = ReturnType<typeof usePersistedMobilePortfolio>;
const Context = createContext<Value | null>(null);
export function MobilePortfolioProvider({ children }: PropsWithChildren) {
  const { ownerId, authReady, isRecoveryBusy } = useMobileAuth();
  const portfolio = usePersistedMobilePortfolio(ownerId, authReady);
  const value = { ...portfolio,
    create: (...args: Parameters<typeof portfolio.create>) => isRecoveryBusy() ? Promise.reject(new Error('Recovery is applying.')) : portfolio.create(...args),
    update: (...args: Parameters<typeof portfolio.update>) => isRecoveryBusy() ? Promise.reject(new Error('Recovery is applying.')) : portfolio.update(...args) };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useMobilePortfolio(): Value {
  const context = useContext(Context);
  if (!context) throw new Error('useMobilePortfolio must be used within MobilePortfolioProvider');
  return context;
}
