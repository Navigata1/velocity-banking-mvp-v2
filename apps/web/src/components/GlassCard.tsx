'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', onClick }: GlassCardProps) {
  return (
    <motion.div
      className={className}
      whileHover={{
        scale: 1.015,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)',
      }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
