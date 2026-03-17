/**
 * Motion System Constants
 *
 * Consistent animation timing across the UI kit.
 * Respects prefers-reduced-motion via CSS media queries.
 */

import { useReducedMotion } from 'framer-motion';

// Duration constants (ms)
export const MICRO_DURATION = 150; // 120-180ms for micro-interactions
export const CARD_DURATION = 230; // 200-260ms for card transitions
export const CELEBRATION_DURATION = 750; // 600-900ms max for celebrations

// Spring configurations
export const SPRING_BOUNCE = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
};

export const SPRING_SMOOTH = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 20,
};

// Ease curves
export const EASE_OUT = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT = [0.4, 0, 0.2, 1];

export function useMotionDuration(durationMs: number): number {
  const prefersReduced = useReducedMotion();
  return prefersReduced ? 0.001 : durationMs / 1000;
}

// Common animation variants
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: MICRO_DURATION / 1000 },
};

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: { duration: CARD_DURATION / 1000, ease: EASE_OUT },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: CARD_DURATION / 1000, ease: EASE_OUT },
};

// Stagger children
export const staggerContainer = (staggerMs: number = 50) => ({
  animate: {
    transition: {
      staggerChildren: staggerMs / 1000,
    },
  },
});
