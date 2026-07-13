'use client';

import dynamic from 'next/dynamic';
import { useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent } from 'react';
import {
  buildMoneyLoopVisualContract,
  selectSafeMoneyLoopDomArtifacts,
  type MoneyLoopRenderMode,
} from '@/app/artifact-visual-contract';
import type { DashboardLoopArtifact, DashboardTone } from '@/app/dashboard-model';
import { useIsClient } from '@/hooks/useIsClient';
import { themeClasses, useThemeStore } from '@/stores/theme-store';

const MoneyLoopThreeStage = dynamic(
  () => import('@/components/money-loop-3d/MoneyLoopThreeStage'),
  { ssr: false }
);

interface MoneyLoopArtifactRailProps extends HTMLAttributes<HTMLElement> {
  artifacts: DashboardLoopArtifact[];
}

type ArtifactTokenStyle = CSSProperties & {
  '--artifact-depth-color': string;
};

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

const orbitFlowSegments: Array<{
  from: DashboardLoopArtifact['id'];
  to: DashboardLoopArtifact['id'];
  path: string;
}> = [
  { from: 'income', to: 'loc', path: 'M88 26 C121 26 146 44 155 74' },
  { from: 'loc', to: 'expenses', path: 'M157 78 C166 106 153 136 127 151' },
  { from: 'expenses', to: 'cash-flow', path: 'M121 154 C96 169 63 169 39 154' },
  { from: 'cash-flow', to: 'principal', path: 'M34 150 C10 135 0 105 10 78' },
  { from: 'principal', to: 'income', path: 'M13 72 C23 43 51 26 86 26' },
];

export default function MoneyLoopArtifactRail({
  artifacts,
  className = '',
  ...sectionProps
}: MoneyLoopArtifactRailProps) {
  const mounted = useIsClient();
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];
  const visualContract = buildMoneyLoopVisualContract(artifacts);
  const displayArtifacts = selectSafeMoneyLoopDomArtifacts(artifacts);
  const [activeArtifactId, setActiveArtifactId] = useState<DashboardLoopArtifact['id']>(displayArtifacts[0]?.id ?? 'income');
  const [selectionStartedAt, setSelectionStartedAt] = useState(0);
  const [renderMode, setRenderMode] = useState<MoneyLoopRenderMode>('static');
  const activeArtifact = displayArtifacts.find((artifact) => artifact.id === activeArtifactId) ?? displayArtifacts[0];
  const activeVisualArtifact = visualContract.artifacts.find((artifact) => artifact.id === activeArtifact?.id);
  const activeTokenSelectionMotion = activeVisualArtifact?.selectionMotion ?? 'settle-only';
  const activeIndex = Math.max(0, displayArtifacts.findIndex((artifact) => artifact.id === activeArtifact?.id));

  if (!activeArtifact) {
    return null;
  }

  const activeTone = toneStyles[activeArtifact.tone] ?? toneStyles.amber;
  const activeTokenStyle: ArtifactTokenStyle = {
    background: `conic-gradient(${activeTone.accent} ${activeArtifact.fillPercent}%, rgba(148, 163, 184, 0.18) 0)`,
    '--artifact-depth-color': activeTone.accent,
  };
  const orbitStageStyle = {
    '--active-artifact-color': activeTone.accent,
    '--active-artifact-angle': orbitNodeAngles[activeArtifact.id],
  } as CSSProperties;
  const artifactById = Object.fromEntries(
    displayArtifacts.map((artifact) => [artifact.id, artifact])
  ) as Partial<Record<DashboardLoopArtifact['id'], DashboardLoopArtifact>>;

  function selectArtifactByIndex(index: number, focusTab = true, selectionStartedAt = 0) {
    const nextArtifact = displayArtifacts[index];
    if (!nextArtifact) return;

    selectArtifactById(nextArtifact.id, selectionStartedAt);
    if (!focusTab) return;
    window.requestAnimationFrame(() => {
      const nextTab = document.getElementById(`money-loop-artifact-tab-${nextArtifact.id}`);
      nextTab?.focus();
      nextTab?.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  }

  function selectArtifactById(id: DashboardLoopArtifact['id'], selectionStartedAt = 0) {
    if (!displayArtifacts.some((artifact) => artifact.id === id) || id === activeArtifactId) return;

    setSelectionStartedAt(selectionStartedAt);
    setActiveArtifactId(id);
  }

  function selectRelativeArtifact(direction: -1 | 1, selectionStartedAt = 0) {
    const lastIndex = displayArtifacts.length - 1;
    const nextIndex =
      direction === 1
        ? activeIndex === lastIndex ? 0 : activeIndex + 1
        : activeIndex === 0 ? lastIndex : activeIndex - 1;

    selectArtifactByIndex(nextIndex, false, selectionStartedAt);
  }

  function handleArtifactKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    const lastIndex = displayArtifacts.length - 1;
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
    selectArtifactByIndex(nextIndex, true, event.timeStamp);
  }

  return (
    <section
      {...sectionProps}
      aria-label="Money Loop artifact carousel"
      data-visual-contract-version={visualContract.version}
      data-visual-contract-complete={visualContract.isComplete}
      data-money-loop-render-mode={renderMode}
      className={`money-loop-render-${renderMode} relative min-w-0 ${className}`}
    >
      <div
        id="money-loop-artifact-panel"
        data-testid="money-loop-artifact-active"
        data-active-geometry={activeVisualArtifact?.geometry}
        role="tabpanel"
        aria-labelledby={`money-loop-artifact-tab-${activeArtifact.id}`}
        aria-live="polite"
        className={`relative overflow-hidden border-y ${activeTone.border} bg-black/20 py-5 md:px-6`}
      >
        <div className="pointer-events-none absolute inset-x-6 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="relative grid min-h-[330px] gap-6 lg:grid-cols-[minmax(320px,0.95fr)_minmax(300px,0.65fr)] lg:items-center">
          <div
            data-testid="money-loop-payoff-orbit"
            className="artifact-orbit-stage relative mx-auto h-64 w-64 md:h-72 md:w-72"
            aria-hidden="true"
            style={orbitStageStyle}
          >
            <MoneyLoopThreeStage
              visualContract={visualContract}
              activeArtifactId={activeArtifact.id}
              selectionStartedAt={selectionStartedAt}
              onSelect={selectArtifactById}
              onRenderModeChange={setRenderMode}
            />
            <div className="artifact-orbit-ring pointer-events-none absolute inset-3 rounded-full" />
            <div className="artifact-orbit-path pointer-events-none absolute inset-[27px] rounded-full" />
            <div className="artifact-orbit-sweep pointer-events-none absolute inset-[18px] rounded-full" />
            <div className="artifact-orbit-reticle pointer-events-none absolute inset-[13px] rounded-full" />
            <svg
              viewBox="0 0 176 176"
              data-testid="money-loop-pressure-path"
              className="artifact-flow-path pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              {orbitFlowSegments.map((segment) => {
                const fromArtifact = artifactById[segment.from];
                const toArtifact = artifactById[segment.to];
                if (!fromArtifact || !toArtifact) return null;
                const segmentTone = toneStyles[fromArtifact.tone] ?? toneStyles.amber;
                const pressureWidth = Math.max(2, Math.min(8, fromArtifact.pressurePercent / 14));
                const opacity = fromArtifact.id === activeArtifact.id || toArtifact.id === activeArtifact.id ? 0.9 : 0.42;

                return (
                  <path
                    key={`${segment.from}-${segment.to}`}
                    data-testid={`money-loop-pressure-segment-${segment.from}-${segment.to}`}
                    className="artifact-flow-segment"
                    d={segment.path}
                    pathLength={100}
                    style={{
                      stroke: segmentTone.accent,
                      strokeDasharray: `${Math.max(18, fromArtifact.pressurePercent)} 100`,
                      strokeWidth: pressureWidth,
                      opacity,
                    }}
                  />
                );
              })}
            </svg>

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 md:h-40 md:w-40">
              <div
                key={activeArtifact.id}
                data-testid="money-loop-active-artifact-token"
                className={`artifact-carousel-token artifact-carousel-token--${activeTokenSelectionMotion} relative isolate h-full w-full rounded-full border border-white/15 shadow-2xl`}
                style={activeTokenStyle}
                aria-hidden="true"
              >
                <div className="artifact-token-bevel absolute inset-[13px] rounded-full bg-slate-950/88 shadow-inner shadow-black/60" />
                <div className="artifact-token-core absolute inset-[34px] rounded-full border border-white/10 bg-white/10" />
                <div className="artifact-token-facet absolute inset-[22px] rounded-full" />
                <div className="absolute inset-0 grid place-items-center px-7 text-center">
                  <span className="text-sm font-semibold text-white/90 md:text-base">{activeArtifact.label}</span>
                </div>
                <div
                  className="absolute left-1/2 top-5 h-4 w-14 -translate-x-1/2 rounded-full bg-white/45 blur-[1px]"
                  aria-hidden="true"
                />
              </div>
            </div>

            {displayArtifacts.map((artifact, index) => {
              const tone = toneStyles[artifact.tone] ?? toneStyles.amber;
              const isActive = artifact.id === activeArtifact.id;
              const nodeStyle = {
                ...orbitNodePositions[artifact.id],
                '--orbit-node-color': tone.accent,
              } as CSSProperties;

              return (
                <div
                  key={artifact.id}
                  data-testid={`money-loop-orbit-node-${artifact.id}`}
                  className={`artifact-orbit-node pointer-events-none absolute grid h-9 w-9 place-items-center rounded-full border text-[11px] font-bold ${
                    isActive ? 'artifact-orbit-node-active border-white/60 text-white' : 'border-white/15 text-slate-300'
                  }`}
                  style={nodeStyle}
                >
                  {index + 1}
                </div>
              );
            })}
          </div>

          <div data-testid="money-loop-artifact-detail" className="min-w-0 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase ${activeTone.border} ${activeTone.text}`}>
                Step {String(activeIndex + 1).padStart(2, '0')}
              </span>
              <span className={`rounded-md border px-2 py-1 text-[11px] font-medium ${classes.border} ${classes.textSecondary}`}>
                {activeArtifact.signal}
              </span>
            </div>

            <h3 className={`mt-4 text-2xl font-semibold leading-tight md:text-3xl ${classes.text}`}>{activeArtifact.label}</h3>
            <p className={`mt-2 text-3xl font-semibold leading-tight md:text-4xl ${activeTone.text}`}>{activeArtifact.value}</p>
            <p className={`mt-3 max-w-xl text-sm leading-6 ${classes.textSecondary}`}>{activeArtifact.note}</p>

            <div className="mt-6 flex items-center justify-between text-xs">
              <span className={classes.textSecondary}>Modeled pressure</span>
              <span className={`font-semibold ${activeTone.text}`}>{activeArtifact.fillPercent}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-700/60">
              <div
                className={`h-full rounded-full ${activeTone.fill}`}
                style={{ width: `${activeArtifact.fillPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className={`text-xs font-semibold uppercase ${classes.textSecondary}`}>
          Artifact {activeIndex + 1} of {displayArtifacts.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous Money Loop artifact"
            aria-controls="money-loop-artifact-panel"
            data-testid="money-loop-artifact-previous"
            onClick={(event) => selectRelativeArtifact(-1, event.timeStamp)}
            title="Previous artifact"
            className={`grid h-10 w-10 place-items-center rounded-md border text-lg transition ${classes.border} ${classes.text} bg-slate-950/35 hover:bg-white/5`}
          >
            <span aria-hidden="true">&larr;</span>
          </button>
          <button
            type="button"
            aria-label="Next Money Loop artifact"
            aria-controls="money-loop-artifact-panel"
            data-testid="money-loop-artifact-next"
            onClick={(event) => selectRelativeArtifact(1, event.timeStamp)}
            title="Next artifact"
            className={`grid h-10 w-10 place-items-center rounded-md border text-lg transition ${classes.border} ${classes.text} bg-slate-950/35 hover:bg-white/5`}
          >
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>

      <div
        data-testid="money-loop-artifact-selector-viewport"
        className="artifact-carousel-scroll -mx-1 mt-3 overflow-x-auto scroll-smooth px-1 pb-1 md:overflow-visible"
      >
        <div
          role="tablist"
          aria-label="Money Loop artifact selector"
          data-testid="money-loop-artifact-selector-grid"
          className="grid w-max snap-x snap-mandatory grid-cols-[repeat(5,136px)] gap-1 scroll-px-1 px-[calc(50vw-68px)] md:w-full md:grid-cols-[repeat(5,minmax(0,1fr))] md:px-0 md:snap-none"
        >
          {displayArtifacts.map((artifact, index) => {
            const tone = toneStyles[artifact.tone] ?? toneStyles.amber;
            const isActive = artifact.id === activeArtifact.id;
            const tokenStyle: ArtifactTokenStyle = {
              animationDelay: `${index * 120}ms`,
              background: `conic-gradient(${tone.accent} ${artifact.fillPercent}%, rgba(148, 163, 184, 0.18) 0)`,
              '--artifact-depth-color': tone.accent,
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
                onClick={(event) => selectArtifactByIndex(index, true, event.timeStamp)}
                onKeyDown={(event) => handleArtifactKeyDown(event, index)}
                className={`relative min-h-[120px] min-w-0 snap-center border-b-2 border-x-0 border-t-0 p-3 text-left transition md:min-h-[78px] md:p-3 ${
                  isActive
                    ? `${tone.border} ${tone.surface}`
                    : `border-transparent bg-transparent hover:bg-white/5`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-[11px] font-semibold uppercase ${classes.textSecondary}`}>
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <p className={`mt-1 break-words text-sm font-semibold leading-tight ${classes.text}`}>{artifact.label}</p>
                  </div>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
                </div>

                <p className={`mt-2 hidden text-[11px] font-medium leading-4 ${classes.textSecondary} md:block`}>
                  {artifact.signal}
                </p>

                <div className="mt-3 flex items-center gap-2 md:hidden">
                  <div className="relative h-11 w-11 shrink-0" style={{ perspective: '900px' }}>
                    <div
                      className="artifact-token relative h-full w-full rounded-full border border-white/15 shadow-xl"
                      style={tokenStyle}
                    >
                      <div className="absolute inset-[6px] rounded-full bg-slate-950/85 shadow-inner shadow-black/50" />
                      <div className="absolute inset-[15px] rounded-full border border-white/10 bg-white/10" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`break-words text-sm font-bold leading-tight ${tone.text}`}>{artifact.value}</p>
                    <p className={`mt-1 break-words text-[11px] font-medium leading-4 ${classes.textSecondary}`}>{artifact.signal}</p>
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
