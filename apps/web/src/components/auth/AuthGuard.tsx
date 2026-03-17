'use client';

import { PropsWithChildren, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

interface AuthGuardProps {
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export default function AuthGuard({
  requireAuth = false,
  fallback = <p className="text-sm text-[var(--color-text-secondary)]">Sign in to access this section.</p>,
  children,
}: PropsWithChildren<AuthGuardProps>) {
  const status = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);
  const setAuthModalOpen = useAuthStore((state) => state.setAuthModalOpen);

  useEffect(() => {
    if (requireAuth && !session && status !== 'loading') {
      setAuthModalOpen(true);
    }
  }, [requireAuth, session, setAuthModalOpen, status]);

  if (!requireAuth) return <>{children}</>;
  if (status === 'loading') {
    return <p className="text-sm text-[var(--color-text-secondary)]">Loading account...</p>;
  }
  if (!session) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

