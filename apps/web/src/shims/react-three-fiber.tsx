'use client';

import { PropsWithChildren } from 'react';

export function Canvas({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={className ?? ''}>
      {children}
    </div>
  );
}

export function useFrame(_callback: () => void) {
  return;
}

