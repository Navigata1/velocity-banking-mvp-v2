'use client';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

function clampProgressPercent(progress: number): number {
  if (!Number.isFinite(progress)) return 0;

  return Math.min(100, Math.max(0, progress));
}

function safePositiveDimension(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export default function ProgressRing({ 
  progress, 
  size = 200, 
  strokeWidth = 12,
  label,
  sublabel 
}: ProgressRingProps) {
  const safeSize = safePositiveDimension(size, 200);
  const safeStrokeWidth = Math.min(
    safeSize,
    safePositiveDimension(strokeWidth, 12)
  );
  const safeProgress = clampProgressPercent(progress);
  const radius = Math.max(0, (safeSize - safeStrokeWidth) / 2);
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (safeProgress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={safeSize} height={safeSize} className="transform -rotate-90">
        <circle
          cx={safeSize / 2}
          cy={safeSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={safeStrokeWidth}
        />
        <circle
          cx={safeSize / 2}
          cy={safeSize / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={safeStrokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && <span className="text-3xl font-bold text-white">{label}</span>}
        {sublabel && <span className="text-sm text-gray-400">{sublabel}</span>}
      </div>
    </div>
  );
}
