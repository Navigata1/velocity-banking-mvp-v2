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

function formatCountUpValue(value: number, prefix: string, suffix: string, decimals: number): string {
  const formatted = Math.abs(value) >= 1
    ? value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : decimals > 0
    ? value.toFixed(decimals)
    : '0';
  return `${prefix}${formatted}${suffix}`;
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
  const motionVal = useMotionValue(value);
  const display = useTransform(motionVal, (v) => formatCountUpValue(v, prefix, suffix, decimals));
  const stableText = formatCountUpValue(value, prefix, suffix, decimals);
  const [text, setText] = useState(() => stableText);

  useEffect(() => {
    const unsub = display.on('change', (v) => setText(v));
    return unsub;
  }, [display]);

  useEffect(() => {
    if (!isInView) {
      motionVal.set(value);
      return;
    }

    const controls = animate(motionVal, value, {
      duration,
      ease: 'easeOut',
    });
    return () => controls.stop();
  }, [isInView, value, duration, motionVal, prefix, suffix, decimals]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{stableText}</span>
    </span>
  );
}
