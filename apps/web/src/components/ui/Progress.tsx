'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
}

export default function Progress({ className, value, ...rest }: ProgressProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]', className)}
      {...rest}
    >
      <div
        className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-[var(--motion-card)]"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}

