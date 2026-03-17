'use client';

import { PropsWithChildren, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { CARD_DURATION, useMotionDuration } from '@/components/ui/motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
  className?: string;
}

export default function Modal({ open, onClose, title, footer, className, children }: PropsWithChildren<ModalProps>) {
  const duration = useMotionDuration(CARD_DURATION);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          onClick={onClose}
        >
          <motion.div
            className={cn(
              'w-full max-w-xl rounded-[var(--radius-card)] border border-[color:var(--color-border-soft)] bg-[var(--surface-dropdown)] shadow-[0_24px_50px_var(--shadow-glass)]',
              className,
            )}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration }}
            onClick={(event) => event.stopPropagation()}
          >
            {(title || footer) && (
              <div className="border-b border-[color:var(--color-border-soft)] px-5 py-4">
                {title && <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>}
              </div>
            )}
            <div className="px-5 py-4">{children}</div>
            {footer ? <div className="border-t border-[color:var(--color-border-soft)] px-5 py-4">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

