'use client';

import { useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent } from 'react';
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

const orbitNodePositions: Record<DashboardLoopArtifact['id'], CSSProperties> = {
  income: { left: '50%', top: '12%', transform: 'translate(-50%, -50%)' },
  loc: { left: '86%', top: '36%', transform: 'translate(-50%, -50%)' },
  expenses: { left: '74%', top: '80%', transform: 'translate(-50%, -50%)' },
  'cash-flow': { left: '26%', top: '80%', transform: 'translate(-50%, -50%)' },
  principal: { left: '14%', top: '36%', transform: 'translate(-50%, -50%)' },
};

const orbitNodeAngles: Record<DashboardLoopArtifact['id'], string> = {
  income: '0deg',
  loc: '72deg',
  expenses: '144deg',
  'cash-flow': '216deg',
  principal: '288deg',
};

export default function MoneyLoopArtifactRail({
  artifacts,
  className = '',
  ...sectionProps
}: MoneyLoopArtifactRailProps) {
  const mounted = useIsClient();
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];
  const [activeArtifactId, setActiveArtifactId] = useState<DashboardLoopArtifact['id']>(artifacts[0]?.id ?? 'income');
  const activeArtifact = artifacts.find((artifact) => artifact.id === activeArtifactId) ?? artifacts[0];
  const activeIndex = Math.max(0, artifacts.findIndex((artifact) => artifact.id === activeArtifact?.id));

  if (!activeArtifact) {
    return null;
  }

  const activeTone = toneStyles[activeArtifact.tone];
  const activeTokenStyle: CSSProperties = {
    background: `conic-gradient(${activeTone.accent} ${activeArtifact.fillPercent}%, rgba(148, 163, 184, 0.18) 0)`,
  };
  const orbitStageStyle = {
    '--active-artifact-color': activeTone.accent,
    '--active-artifact-angle': orbitNodeAngles[activeArtifact.id],
  } as CSSProperties;

  function selectArtifactByIndex(index: number) {
    const nextArtifact = artifacts[index];
    if (!nextArtifact) return;

    setActiveArtifactId(nextArtifact.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`money-loop-artifact-tab-${nextArtifact.id}`)?.focus();
    });
  }

  function selectRelativeArtifact(direction: -1 | 1) {
    const lastIndex = artifacts.length - 1;
    const nextIndex =
      direction === 1
        ? activeIndex === lastIndex ? 0 : activeIndex + 1
        : activeIndex === 0 ? lastIndex : activeIndex - 1;

    selectArtifactByIndex(nextIndex);
  }

  function handleArtifactKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    const lastIndex = artifacts.length - 1;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = index === 0 ? lastIndex : index - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    selectArtifactByIndex(nextIndex);
  }

  return (
    <section
      {...sectionProps}
      aria-label="Money Loop artifact carousel"
      className={`relative min-w-0 rounded-2xl border ${classes.border} bg-slate-950/25 p-4 ${className}`}
    >
      <div
        id="money-loop-artifact-panel"
        data-testid="money-loop-artifact-active"
        role="tabpanel"
        aria-labelledby={`money-loop-artifact-tab-${activeArtifact.id}`}
        aria-live="polite"
        className={`relative overflow-hidden rounded-xl border ${activeTone.border} ${activeTone.surface} p-4`}
      >
        <div className="pointer-events-none absolute inset-x-6 top-1/2 h-px bg-gradient-to-r from-transparent via-sky-300/40 to-transparent" />
        <div className="relative grid min-h-[258px] gap-5 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center">
          <div
            data-testid="money-loop-payoff-orbit"
            className="artifact-orbit-stage relative mx-auto h-44 w-44"
            aria-hidden="true"
            style={orbitStageStyle}
          >
            <div className="artifact-orbit-ring absolute inset-3 rounded-full" />
            <div className="artifact-orbit-path absolute inset-[27px] rounded-full" />
            <div className="artifact-orbit-sweep absolute inset-[18px] rounded-full" />
            <div className="artifact-orbit-reticle absolute inset-[13px] rounded-full" />

            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2">
              <div
                key={activeArtifact.id}
                className="artifact-carousel-token relative h-full w-full rounded-full border border-white/15 shadow-2xl"
                style={activeTokenStyle}
              >
                <div className="absolute inset-[13px] rounded-full bg-slate-950/88 shadow-inner shadow-black/60" />
                <div className="absolute inset-[34px] rounded-full border border-white/10 bg-white/10" />
                <div
                  className="absolute left-1/2 top-5 h-4 w-14 -translate-x-1/2 rounded-full bg-white/45 blur-[1px]"
                  aria-hidden="true"
                />
              </div>
            </div>

            {artifacts.map((artifact, index) => {
              const tone = toneStyles[artifact.tone];
              const isActive = artifact.id === activeArtifact.id;
              const nodeStyle = {
                ...orbitNodePositions[artifact.id],
                '--orbit-node-color': tone.accent,
              } as CSSProperties;

              return (
                <div
                  key={artifact.id}
                  data-testid={`money-loop-orbit-node-${artifact.id}`}
                  className={`artifact-orbit-node absolute grid h-9 w-9 place-items-center rounded-full border text-[11px] font-bold ${
                    isActive ? 'artifact-orbit-node-active border-white/60 text-white' : 'border-white/15 text-slate-300'
                  }`}
                  style={nodeStyle}
                >
                  {index + 1}
                </div>
              );
            })}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase ${activeTone.border} ${activeTone.text}`}>
                Step {String(activeIndex + 1).padStart(2, '0')}
              </span>
              <span className={`rounded-md border px-2 py-1 text-[11px] font-medium ${classes.border} ${classes.textSecondary}`}>
                {activeArtifact.signal}
              </span>
            </div>

            <h3 className={`mt-3 text-2xl font-bold leading-tight ${classes.text}`}>{activeArtifact.label}</h3>
            <p className={`mt-2 text-3xl font-bold leading-tight ${activeTone.text}`}>{activeArtifact.value}</p>
            <p className={`mt-3 max-w-xl text-sm leading-6 ${classes.textSecondary}`}>{activeArtifact.note}</p>

            <div className="mt-5 h-2 rounded-full bg-slate-700/60">
              <div
                className={`h-full rounded-full ${activeTone.fill}`}
                style={{ width: `${activeArtifact.fillPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className={`text-xs font-semibold uppercase ${classes.textSecondary}`}>
          Artifact {activeIndex + 1} of {artifacts.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous Money Loop artifact"
            aria-controls="money-loop-artifact-panel"
            data-testid="money-loop-artifact-previous"
            onClick={() => selectRelativeArtifact(-1)}
            className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition ${classes.border} ${classes.text} bg-slate-950/35 hover:bg-white/5`}
          >
            Prev
          </button>
          <button
            type="button"
            aria-label="Next Money Loop artifact"
            aria-controls="money-loop-artifact-panel"
            data-testid="money-loop-artifact-next"
            onClick={() => selectRelativeArtifact(1)}
            className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition ${classes.border} ${classes.text} bg-slate-950/35 hover:bg-white/5`}
          >
            Next
          </button>
        </div>
      </div>

      <div className="artifact-carousel-scroll -mx-1 mt-3 overflow-x-auto scroll-smooth px-1 pb-1">
        <div
          role="tablist"
          aria-label="Money Loop artifact selector"
          className="grid min-w-[760px] snap-x snap-mandatory grid-cols-5 gap-3 scroll-px-1"
        >
          {artifacts.map((artifact, index) => {
            const tone = toneStyles[artifact.tone];
            const isActive = artifact.id === activeArtifact.id;
            const tokenStyle: CSSProperties = {
              animationDelay: `${index * 120}ms`,
              background: `conic-gradient(${tone.accent} ${artifact.fillPercent}%, rgba(148, 163, 184, 0.18) 0)`,
            };

            return (
              <button
                key={artifact.id}
                id={`money-loop-artifact-tab-${artifact.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="money-loop-artifact-panel"
                tabIndex={isActive ? 0 : -1}
                data-testid={`money-loop-artifact-node-${artifact.id}`}
                onClick={() => selectArtifactByIndex(index)}
                onKeyDown={(event) => handleArtifactKeyDown(event, index)}
                className={`relative min-h-[132px] snap-center rounded-xl border p-3 text-left transition ${
                  isActive
                    ? `${tone.border} ${tone.surface} shadow-lg shadow-black/20`
                    : `${classes.border} bg-slate-950/20 hover:bg-white/5`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-[11px] font-semibold uppercase ${classes.textSecondary}`}>
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <p className={`mt-1 text-sm font-semibold leading-tight ${classes.text}`}>{artifact.label}</p>
                  </div>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0" style={{ perspective: '900px' }}>
                    <div
                      className="artifact-token relative h-full w-full rounded-full border border-white/15 shadow-xl"
                      style={tokenStyle}
                    >
                      <div className="absolute inset-[6px] rounded-full bg-slate-950/85 shadow-inner shadow-black/50" />
                      <div className="absolute inset-[15px] rounded-full border border-white/10 bg-white/10" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-bold leading-tight ${tone.text}`}>{artifact.value}</p>
                    <p className={`mt-1 truncate text-[11px] font-medium ${classes.textSecondary}`}>{artifact.signal}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
