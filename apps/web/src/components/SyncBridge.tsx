'use client';

import { useEffect } from 'react';
import { useAutoSync } from '@/lib/sync';
import { useAuthStore } from '@/stores/auth-store';

export default function SyncBridge() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  useAutoSync();

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return null;
}

