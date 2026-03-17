'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  default: 'chip',
  success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/35',
  danger: 'bg-red-500/15 text-red-300 border border-red-500/35',
};

export default function Badge({ className, tone = 'default', ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        toneClasses[tone],
        className,
      )}
      {...rest}
    />
  );
}

