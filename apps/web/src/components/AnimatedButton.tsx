'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  pulse?: boolean;
}

export default function AnimatedButton({
  children,
  className = '',
  onClick,
  pulse = false,
}: AnimatedButtonProps) {
  return (
    <motion.button
      className={className}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      animate={
        pulse
          ? {
              boxShadow: [
                '0 0 0 0 rgba(16, 185, 129, 0)',
                '0 0 0 6px rgba(16, 185, 129, 0.15)',
                '0 0 0 0 rgba(16, 185, 129, 0)',
              ],
            }
          : undefined
      }
      transition={
        pulse
          ? { duration: 2, repeat: 2, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 400, damping: 17 }
      }
    >
      {children}
    </motion.button>
  );
}
