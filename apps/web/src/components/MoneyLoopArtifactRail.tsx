'use client';

import type { CSSProperties, HTMLAttributes } from 'react';
import type { DashboardLoopArtifact, DashboardTone } from '@/app/dashboard-model';
import { useIsClient } from '@/hooks/useIsClient';
import { themeClasses, useThemeStore } from '@/stores/theme-store';

interface MoneyLoopArtifactRailProps extends HTMLAttributes<HTMLElement> {
  artifacts: DashboardLoopArtifact[];
}

const toneStyles: Record<DashboardTone, {
  accent: string;
  border: string;
  dot: string;
  fill: string;
  surface: string;
  text: string;
}> = {
  emerald: {
    accent: '#34d399',
    border: 'border-emerald-500/35',
    dot: 'bg-emerald-300',
    fill: 'bg-emerald-400',
    surface: 'bg-emerald-500/10',
    text: 'text-emerald-300',
  },
  sky: {
    accent: '#38bdf8',
    border: 'border-sky-500/35',
    dot: 'bg-sky-300',
    fill: 'bg-sky-400',
    surface: 'bg-sky-500/10',
    text: 'text-sky-300',
  },
  amber: {
    accent: '#fbbf24',
    border: 'border-amber-500/35',
    dot: 'bg-amber-300',
    fill: 'bg-amber-300',
    surface: 'bg-amber-500/10',
    text: 'text-amber-200',
  },
  rose: {
    accent: '#fb7185',
    border: 'border-rose-500/35',
    dot: 'bg-rose-300',
    fill: 'bg-rose-300',
    surface: 'bg-rose-500/10',
    text: 'text-rose-200',
  },
};

export default function MoneyLoopArtifactRail({
  artifacts,
  className = '',
  ...sectionProps
}: MoneyLoopArtifactRailProps) {
  const mounted = useIsClient();
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];

  return (
    <section
      {...sectionProps}
      aria-label="Money Loop visual path"
      className={`relative min-w-0 rounded-2xl border ${classes.border} bg-slate-950/25 p-4 ${className}`}
    >
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="relative min-w-[760px]">
          <div className="pointer-events-none absolute left-8 right-8 top-[5.6rem] h-px bg-gradient-to-r from-transparent via-sky-300/45 to-transparent" />
          <div className="pointer-events-none absolute left-10 right-10 top-[5.6rem] h-8 bg-[linear-gradient(180deg,rgba(56,189,248,0.12),transparent)]" />

          <div className="grid grid-cols-5 gap-3">
            {artifacts.map((artifact, index) => {
              const tone = toneStyles[artifact.tone];
              const tokenStyle: CSSProperties = {
                animationDelay: `${index * 120}ms`,
                background: `conic-gradient(${tone.accent} ${artifact.fillPercent}%, rgba(148, 163, 184, 0.18) 0)`,
              };

              return (
                <article
                  key={artifact.id}
                  data-testid={`money-loop-artifact-node-${artifact.id}`}
                  className={`relative min-h-[224px] rounded-xl border ${tone.border} ${tone.surface} p-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-[11px] font-semibold uppercase ${classes.textSecondary}`}>
                        {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3 className={`mt-1 text-sm font-semibold ${classes.text}`}>{artifact.label}</h3>
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                  </div>

                  <div className="relative mx-auto mt-4 h-20 w-20" style={{ perspective: '900px' }}>
                    <div
                      className="artifact-token relative h-full w-full rounded-full border border-white/15 shadow-xl"
                      style={tokenStyle}
                    >
                      <div className="absolute inset-[9px] rounded-full bg-slate-950/85 shadow-inner shadow-black/50" />
                      <div className="absolute inset-[22px] rounded-full border border-white/10 bg-white/10" />
                      <div
                        className="absolute left-1/2 top-3 h-3 w-8 -translate-x-1/2 rounded-full bg-white/45 blur-[1px]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-lg font-bold leading-tight ${tone.text}`}>{artifact.value}</p>
                      <p className={`text-[11px] font-medium ${classes.textSecondary}`}>{artifact.signal}</p>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-700/60">
                      <div
                        className={`h-full rounded-full ${tone.fill}`}
                        style={{ width: `${artifact.fillPercent}%` }}
                      />
                    </div>
                    <p className={`mt-3 text-xs leading-5 ${classes.textSecondary}`}>{artifact.note}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
