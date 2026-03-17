'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-[var(--radius-control)] border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] transition-colors focus-visible:focus-ring',
        className,
      )}
      {...rest}
    />
  );
});

export default Input;

