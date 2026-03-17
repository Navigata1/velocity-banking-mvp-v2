'use client';

import { PropsWithChildren, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CARD_DURATION, useMotionDuration } from '@/components/ui/motion';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  side?: 'left' | 'right';
  footer?: ReactNode;
}

export default function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  footer,
  children,
}: PropsWithChildren<DrawerProps>) {
  const duration = useMotionDuration(CARD_DURATION);
  const hiddenX = side === 'right' ? 36 : -36;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          onClick={onClose}
        >
          <motion.aside
            className={`absolute top-0 ${side === 'right' ? 'right-0' : 'left-0'} h-full w-full max-w-md border-l border-[color:var(--color-border-soft)] bg-[var(--surface-dropdown)] shadow-[0_24px_50px_var(--shadow-glass)]`}
            initial={{ opacity: 0, x: hiddenX }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: hiddenX }}
            transition={{ duration }}
            onClick={(event) => event.stopPropagation()}
          >
            {title ? (
              <div className="border-b border-[color:var(--color-border-soft)] px-5 py-4">
                <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
              </div>
            ) : null}
            <div className="h-[calc(100%-4.5rem)] overflow-y-auto px-5 py-4">{children}</div>
            {footer ? <div className="border-t border-[color:var(--color-border-soft)] px-5 py-4">{footer}</div> : null}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

