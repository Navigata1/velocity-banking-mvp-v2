'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotionValue, useTransform, animate, useInView } from 'framer-motion';

interface CountUpProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export default function CountUp({
  value,
  duration = 1.5,
  prefix = '$',
  suffix = '',
  decimals = 0,
  className = '',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const motionVal = useMotionValue(0);
  const display = useTransform(motionVal, (v) => {
    const formatted = Math.abs(v) >= 1
      ? v.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : decimals > 0
      ? v.toFixed(decimals)
      : '0';
    return `${prefix}${formatted}${suffix}`;
  });
  const [text, setText] = useState(`${prefix}0${suffix}`);

  useEffect(() => {
    const unsub = display.on('change', (v) => setText(v));
    return unsub;
  }, [display]);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(motionVal, value, {
      duration,
      ease: 'easeOut',
    });
    return () => controls.stop();
  }, [isInView, value, duration, motionVal]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
