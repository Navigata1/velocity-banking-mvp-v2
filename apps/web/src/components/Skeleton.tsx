'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle';
}

export default function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  const base = 'animate-shimmer bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%] rounded';
  const variants = {
    text: 'h-4 w-full',
    card: 'h-32 w-full rounded-2xl',
    circle: 'h-12 w-12 rounded-full',
  };
  return <div className={`${base} ${variants[variant]} ${className}`} />;
}
