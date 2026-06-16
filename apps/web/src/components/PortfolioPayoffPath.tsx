'use client';

import { useMemo, type CSSProperties } from 'react';
import { formatCurrency } from '@/engine/calculations';
import type { PortfolioPathVisualModel } from '@/engine/portfolio-path-visual';
import { themeClasses, useThemeStore } from '@/stores/theme-store';
import { useIsClient } from '@/hooks/useIsClient';

interface PortfolioPayoffPathProps {
  model: PortfolioPathVisualModel;
}

const chartWidth = 360;
const chartHeight = 190;
const padX = 28;
const padTop = 20;
const padBottom = 30;
const baselineY = chartHeight - padBottom;

function formatMonths(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return 'Needs review';

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) return `${months} mo`;
  if (remainingMonths === 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export default function PortfolioPayoffPath({ model }: PortfolioPayoffPathProps) {
  const mounted = useIsClient();
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];
  const progressPercent = model.startingBalance > 0
    ? clampPercent(((model.startingBalance - model.endingBalance) / model.startingBalance) * 100)
    : model.isProjected ? 100 : 0;
  const strokeColor = model.isProjected ? '#34d399' : '#fbbf24';
  const fillColor = model.isProjected ? 'rgba(52, 211, 153, 0.18)' : 'rgba(251, 191, 36, 0.12)';

  const chart = useMemo(() => {
    const lastMonth = Math.max(1, ...model.sampledPoints.map((point) => point.month));
    const innerWidth = chartWidth - padX * 2;
    const innerHeight = baselineY - padTop;
    const coordinates = model.sampledPoints.map((point) => ({
      point,
      x: padX + (point.month / lastMonth) * innerWidth,
      y: padTop + (1 - point.balance / model.maxBalance) * innerHeight,
    }));
    const plotCoordinates = coordinates.length === 1
      ? [
        coordinates[0],
        {
          ...coordinates[0],
          x: chartWidth - padX,
        },
      ]
      : coordinates;
    const pathD = plotCoordinates
      .map((coordinate, index) => `${index === 0 ? 'M' : 'L'} ${coordinate.x.toFixed(1)} ${coordinate.y.toFixed(1)}`)
      .join(' ');
    const first = plotCoordinates[0];
    const last = plotCoordinates[plotCoordinates.length - 1];
    const areaD = `${pathD} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;

    return {
      areaD,
      coordinates,
      pathD,
    };
  }, [model]);

  const chartStyle = {
    '--portfolio-path-stroke': strokeColor,
    '--portfolio-path-fill': fillColor,
  } as CSSProperties;

  return (
    <section
      aria-label="Portfolio payoff path"
      data-testid="portfolio-payoff-path-visual"
      className={`rounded-2xl border ${classes.border} bg-slate-950/25 p-4`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase ${classes.textMuted}`}>Payoff path</p>
          <h2 className={`mt-1 text-xl font-bold ${classes.text}`}>Balance descent</h2>
          <p className={`mt-2 max-w-xl text-sm leading-6 ${classes.textSecondary}`}>
            {model.isProjected
              ? `Modeled from ${formatCurrency(model.startingBalance)} to ${formatCurrency(model.endingBalance)} across ${formatMonths(model.payoffMonths)}.`
              : 'Resolve the warning inputs before trusting a payoff path.'}
          </p>
        </div>
        <span
          className={`w-fit rounded-lg border px-3 py-1 text-xs font-semibold ${
            model.isProjected
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
              : 'border-amber-500/35 bg-amber-500/10 text-amber-200'
          }`}
        >
          {model.statusLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        <div className={`relative min-h-[220px] rounded-xl border ${classes.border} bg-slate-950/40 p-3`}>
          <svg
            aria-hidden="true"
            className="h-full min-h-[190px] w-full"
            data-testid="portfolio-payoff-path-svg"
            preserveAspectRatio="none"
            style={chartStyle}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          >
            <defs>
              <linearGradient id="portfolioPathGrid" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="rgba(148, 163, 184, 0)" />
                <stop offset="50%" stopColor="rgba(148, 163, 184, 0.22)" />
                <stop offset="100%" stopColor="rgba(148, 163, 184, 0)" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((line) => {
              const y = padTop + ((baselineY - padTop) / 3) * line;
              return (
                <line
                  key={line}
                  stroke="url(#portfolioPathGrid)"
                  strokeWidth="1"
                  x1={padX}
                  x2={chartWidth - padX}
                  y1={y}
                  y2={y}
                />
              );
            })}
            <path d={chart.areaD} fill="var(--portfolio-path-fill)" />
            <path
              d={chart.pathD}
              fill="none"
              stroke="var(--portfolio-path-stroke)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
            {chart.coordinates.map(({ point, x, y }, index) => (
              <circle
                key={`${point.month}-${index}`}
                cx={x}
                cy={y}
                data-testid="portfolio-payoff-path-node"
                fill="#0f172a"
                r={index === chart.coordinates.length - 1 ? 5 : 4}
                stroke="var(--portfolio-path-stroke)"
                strokeWidth="2"
              />
            ))}
          </svg>
          <div className={`pointer-events-none absolute bottom-3 left-4 right-4 flex justify-between text-[11px] ${classes.textMuted}`}>
            <span>Month 0</span>
            <span>{model.isProjected ? `Month ${model.payoffMonths}` : 'Timeline unavailable'}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className={`${classes.glassButton} rounded-xl border ${classes.border} p-3`}>
            <p className={`text-[11px] font-semibold uppercase ${classes.textMuted}`}>Start balance</p>
            <p className={`mt-1 text-lg font-bold ${classes.text}`}>{formatCurrency(model.startingBalance)}</p>
          </div>
          <div className={`${classes.glassButton} rounded-xl border ${classes.border} p-3`}>
            <p className={`text-[11px] font-semibold uppercase ${classes.textMuted}`}>Modeled progress</p>
            <p className={`mt-1 text-lg font-bold ${model.isProjected ? 'text-emerald-300' : 'text-amber-200'}`}>
              {Math.round(progressPercent)}%
            </p>
          </div>
          <div className={`${classes.glassButton} rounded-xl border ${classes.border} p-3`}>
            <p className={`text-[11px] font-semibold uppercase ${classes.textMuted}`}>Interest estimate</p>
            <p className={`mt-1 text-lg font-bold ${classes.text}`}>
              {model.isProjected ? formatCurrency(model.totalInterest) : 'Not projected'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
