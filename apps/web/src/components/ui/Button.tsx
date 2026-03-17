'use client';

import { forwardRef } from 'react';
import { HTMLMotionProps, motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { MICRO_DURATION, useMotionDuration } from '@/components/ui/motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent)] text-white border border-transparent hover:bg-[var(--color-accent-strong)] shadow-[0_10px_24px_var(--color-accent-soft)]',
  secondary:
    'bg-[var(--surface-glass-strong)] text-[var(--color-text)] border border-[color:var(--color-border-soft)] hover:border-[color:var(--color-accent-soft)]',
  ghost:
    'bg-transparent text-[var(--color-text-secondary)] border border-transparent hover:bg-[var(--surface-glass)] hover:text-[var(--color-text)]',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', loading = false, disabled, children, ...rest },
  ref,
) {
  const duration = useMotionDuration(MICRO_DURATION);

  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.98 }}
      transition={{ duration }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-semibold transition-all focus-visible:focus-ring disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {loading ? 'Working...' : children}
    </motion.button>
  );
});

export default Button;
