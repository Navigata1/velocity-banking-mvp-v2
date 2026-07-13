'use client';

import { useEffect, useState } from 'react';
import { animate, useMotionValue, useTransform } from 'framer-motion';

export function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const motionVal = useMotionValue(value);
  const rounded = useTransform(motionVal, (current) => Math.round(current));
  const [display, setDisplay] = useState(value);
  const stableText = String(value);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 0.6,
      ease: 'easeOut',
    });
    const unsubscribe = rounded.on('change', (current) => setDisplay(current));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, motionVal, rounded]);

  return (
    <span className={className}>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{stableText}</span>
    </span>
  );
}
