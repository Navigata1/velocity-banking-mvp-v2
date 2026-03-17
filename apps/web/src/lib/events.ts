'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useGamificationStore } from '@/stores/gamification-store';
import { useAuthStore } from '@/stores/auth-store';
import { logGamificationEvent } from '@/lib/supabase';

export type AppEvent =
  | { type: 'app_opened' }
  | { type: 'plan_reviewed' }
  | { type: 'debt_added' }
  | { type: 'loc_configured' }
  | { type: 'simulation_ran' }
  | { type: 'debt_paid_off'; payload: { debtName: string; freedPayment: number } }
  | { type: 'freed_payment_milestone'; payload: { amount: number } };

type Listener = (event: AppEvent) => void;

const listeners = new Set<Listener>();

export function publishEvent(event: AppEvent): void {
  listeners.forEach((listener) => listener(event));
}

export function subscribeEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGamification() {
  const registerAppOpened = useGamificationStore((state) => state.registerAppOpened);
  const registerPlanReviewed = useGamificationStore((state) => state.registerPlanReviewed);
  const registerDebtAdded = useGamificationStore((state) => state.registerDebtAdded);
  const registerLocConfigured = useGamificationStore((state) => state.registerLocConfigured);
  const registerSimulationRun = useGamificationStore((state) => state.registerSimulationRun);
  const registerDebtPaidOff = useGamificationStore((state) => state.registerDebtPaidOff);
  const registerFreedPaymentMilestone = useGamificationStore((state) => state.registerFreedPaymentMilestone);
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const { pushToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeEvent((event) => {
      let unlocked = null;

      switch (event.type) {
        case 'app_opened':
          unlocked = registerAppOpened();
          break;
        case 'plan_reviewed':
          unlocked = registerPlanReviewed();
          break;
        case 'debt_added':
          unlocked = registerDebtAdded();
          break;
        case 'loc_configured':
          unlocked = registerLocConfigured();
          break;
        case 'simulation_ran':
          unlocked = registerSimulationRun();
          break;
        case 'debt_paid_off':
          unlocked = registerDebtPaidOff(event.payload.debtName, event.payload.freedPayment);
          break;
        case 'freed_payment_milestone':
          unlocked = registerFreedPaymentMilestone(event.payload.amount);
          break;
        default:
          break;
      }

      if (unlocked) {
        pushToast({
          title: unlocked.title,
          message: unlocked.description,
          tone: 'success',
          durationMs: 5200,
        });
      }

      if (profile?.id && session?.access_token) {
        const payload = 'payload' in event ? event.payload : {};
        void logGamificationEvent(profile.id, event.type, payload as Record<string, unknown>, session.access_token);
      }
    });

    return () => unsubscribe();
  }, [profile?.id, pushToast, registerAppOpened, registerDebtAdded, registerDebtPaidOff, registerFreedPaymentMilestone, registerLocConfigured, registerPlanReviewed, registerSimulationRun, session?.access_token]);

  return {
    publishEvent,
    state: useGamificationStore(),
  };
}
