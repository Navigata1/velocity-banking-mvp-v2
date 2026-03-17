'use client';

import { HTMLAttributes, PropsWithChildren } from 'react';
import { HTMLMotionProps, motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { CARD_DURATION, useMotionDuration } from '@/components/ui/motion';

interface CardProps extends HTMLMotionProps<'div'> {
  interactive?: boolean;
}

export function Card({ className, interactive = false, children, ...rest }: PropsWithChildren<CardProps>) {
  const duration = useMotionDuration(CARD_DURATION);

  return (
    <motion.div
      className={cn('glass-card', interactive && 'cursor-pointer', className)}
      whileHover={interactive ? { y: -2, scale: 1.005 } : undefined}
      transition={{ duration }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pt-5 pb-3 border-b border-[color:var(--color-border-soft)]', className)} {...rest} />;
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...rest} />;
}
