'use client';

import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

const variantDefs: Record<string, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  },
};

interface ScrollRevealProps {
  children: ReactNode;
  variant?: 'fadeUp' | 'fadeIn' | 'scaleIn' | 'slideRight';
  stagger?: number;
  delay?: number;
  duration?: number;
  className?: string;
  as?: 'div' | 'section' | 'header' | 'footer';
}

export default function ScrollReveal({
  children,
  variant = 'fadeUp',
  stagger = 0,
  delay = 0,
  duration = 0.5,
  className = '',
  as = 'div',
}: ScrollRevealProps) {
  const v = variantDefs[variant];

  if (stagger > 0) {
    const container: Variants = {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: stagger,
          delayChildren: delay,
        },
      },
    };

    const child: Variants = {
      hidden: v.hidden,
      visible: {
        ...(v.visible as object),
        transition: { duration, ease: 'easeOut' },
      },
    };

    const Tag = motion[as];

    return (
      <Tag
        className={className}
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {Array.isArray(children)
          ? children.map((c, i) => (
              <motion.div key={i} variants={child}>
                {c}
              </motion.div>
            ))
          : <motion.div variants={child}>{children}</motion.div>
        }
      </Tag>
    );
  }

  const wrapperVariants: Variants = {
    hidden: v.hidden,
    visible: {
      ...(v.visible as object),
      transition: { duration, ease: 'easeOut', delay },
    },
  };

  const Tag = motion[as];

  return (
    <Tag
      className={className}
      variants={wrapperVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </Tag>
  );
}
