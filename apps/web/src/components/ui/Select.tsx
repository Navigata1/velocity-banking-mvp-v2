'use client';

import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-[var(--radius-control)] border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] px-3 py-2.5 text-sm text-[var(--color-text)] transition-colors focus-visible:focus-ring',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

export default Select;

