'use client';

import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CELEBRATION_DURATION, useMotionDuration } from '@/components/ui/motion';
import Button from '@/components/ui/Button';

export type ToastTone = 'default' | 'success' | 'warning' | 'danger';

interface ToastItem {
  id: string;
  title: string;
  message?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const toneClasses: Record<ToastTone, string> = {
  default: 'border-[color:var(--color-border-soft)]',
  success: 'border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.2)]',
  warning: 'border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.16)]',
  danger: 'border-red-500/40 shadow-[0_0_24px_rgba(239,68,68,0.16)]',
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = { id, tone: 'default', durationMs: 4200, ...toast };
      setToasts((current) => [...current, item]);

      const timeout = item.durationMs ?? 4200;
      window.setTimeout(() => {
        dismissToast(id);
      }, timeout);
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ pushToast, dismissToast }),
    [pushToast, dismissToast],
  );

  const duration = useMotionDuration(CELEBRATION_DURATION);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[160] flex w-[min(92vw,360px)] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.article
              key={toast.id}
              className={`pointer-events-auto rounded-xl border bg-[var(--surface-dropdown)] p-3 text-sm text-[var(--color-text)] backdrop-blur-xl ${toneClasses[toast.tone ?? 'default']}`}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--color-text)]">{toast.title}</p>
                  {toast.message ? <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{toast.message}</p> : null}
                </div>
                <Button
                  variant="ghost"
                  className="h-6 min-h-6 px-2 py-0 text-xs"
                  onClick={() => dismissToast(toast.id)}
                >
                  ✕
                </Button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}

