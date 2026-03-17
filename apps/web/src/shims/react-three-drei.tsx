'use client';

import { PropsWithChildren, useEffect } from 'react';

export function Environment(_props: { preset?: string }) {
  return null;
}

export function ContactShadows(_props: { opacity?: number; scale?: number; blur?: number; far?: number }) {
  return null;
}

export function OrbitControls(_props: { enableZoom?: boolean; autoRotate?: boolean; autoRotateSpeed?: number }) {
  return null;
}

export function PerformanceMonitor({ onDecline, onIncline, children }: PropsWithChildren<{ onDecline?: () => void; onIncline?: () => void }>) {
  useEffect(() => {
    onIncline?.();
  }, [onIncline]);

  useEffect(() => {
    return () => onDecline?.();
  }, [onDecline]);

  return <>{children}</>;
}

