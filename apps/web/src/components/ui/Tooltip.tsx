'use client';

import { PropsWithChildren, ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MICRO_DURATION, useMotionDuration } from '@/components/ui/motion';

interface TooltipProps {
  content: ReactNode;
}

export default function Tooltip({ content, children }: PropsWithChildren<TooltipProps>) {
  const [open, setOpen] = useState(false);
  const duration = useMotionDuration(MICRO_DURATION);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open ? (
          <motion.span
            className="pointer-events-none absolute -top-2 left-1/2 z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-[color:var(--color-border-soft)] bg-[var(--surface-dropdown)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] shadow-lg"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration }}
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

