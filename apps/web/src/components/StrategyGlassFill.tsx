'use client';

import { useMemo } from 'react';
import { formatCurrency } from '@/engine/calculations';
import { formatStrategyDeltaBadge, formatStrategyInterestDelta, getStrategyDeltaTone } from './strategy-glass-fill-model';

interface StrategyResult {
  name: string;
  months: number;
  totalInterest: number;
  color: string;       // tailwind color token e.g. 'red', 'blue', 'amber', 'emerald'
  icon?: string;
  isWinner?: boolean;
  isPayoffPossible?: boolean;
  monthsLabel?: string;
  interestLabel?: string;
  statusLabel?: string;
}

interface StrategyGlassFillProps {
  strategies: StrategyResult[];
  className?: string;
}

/**
 * 4-strategy glass-fill comparison cards.
 * Traditional = 100% filled. Others fill proportionally.
 * Less fill = faster payoff = better.
 * The empty space at the top IS the savings — visually.
 */
export default function StrategyGlassFill({ strategies, className = '' }: StrategyGlassFillProps) {
  const baseline = strategies[0]; // Traditional is always first
  const baselineMonths = baseline?.months || 1;
  const baselineInterest = baseline?.totalInterest || 1;

  // Find the winner (lowest months, excluding traditional)
  const winner = useMemo(() => {
    const nonTraditional = strategies
      .slice(1)
      .filter(s => s.isPayoffPossible !== false && s.months > 0 && s.months < baselineMonths);
    if (nonTraditional.length === 0) return null;
    return nonTraditional.reduce((best, s) => s.months < best.months ? s : best);
  }, [baselineMonths, strategies]);

  // Color maps for tailwind classes
  const colorMap: Record<string, { bg: string; border: string; text: string; fill: string; glow: string }> = {
    red:     { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     fill: 'bg-red-500/40',     glow: '' },
    blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    fill: 'bg-blue-500/40',    glow: '' },
    amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   fill: 'bg-amber-500/40',   glow: '' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', fill: 'bg-emerald-500/40', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]' },
  };
  const summaryToneMap: Record<string, { card: string; value: string; detail: string }> = {
    emerald: {
      card: 'bg-emerald-500/10 border-emerald-500/30',
      value: 'text-emerald-400',
      detail: 'text-emerald-400/80',
    },
    amber: {
      card: 'bg-amber-500/10 border-amber-500/30',
      value: 'text-amber-300',
      detail: 'text-amber-300/80',
    },
    sky: {
      card: 'bg-sky-500/10 border-sky-500/30',
      value: 'text-sky-300',
      detail: 'text-sky-300/80',
    },
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-4">
        {strategies.map((strategy, i) => {
          const colors = colorMap[strategy.color] || colorMap.red;
          const isValid = strategy.isPayoffPossible !== false && strategy.months > 0;
          const baselineValid = baseline?.isPayoffPossible !== false && baselineMonths > 0;
          const fillPercent = isValid && baselineValid ? Math.min(100, (strategy.months / baselineMonths) * 100) : 0;
          const monthsSaved = baselineMonths - strategy.months;
          const isThisWinner = winner && strategy.name === winner.name;
          const isBaseline = i === 0;

          return (
            <div
              key={strategy.name}
              className={`
                relative overflow-hidden rounded-xl border transition-all duration-500
                ${colors.bg} ${colors.border}
                ${isThisWinner ? colors.glow + ' ring-1 ring-emerald-500/40' : ''}
              `}
            >
              {/* Glass fill — rises from bottom */}
              <div className="absolute inset-0 flex items-end">
                <div
                  className={`w-full ${colors.fill} transition-all duration-1000 ease-out`}
                  style={{ height: `${fillPercent}%` }}
                />
              </div>

              {/* Content overlay */}
              <div className="relative z-10 p-4 min-h-[140px] flex flex-col justify-between">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-sm font-medium ${colors.text}`}>
                      {strategy.icon && <span className="mr-1">{strategy.icon}</span>}
                      {strategy.name}
                    </span>
                    {isThisWinner && <span className="text-yellow-400 text-xs">⚡ Fastest</span>}
                  </div>

                  {/* Primary metric: months */}
                  <p className={`text-2xl font-bold ${colors.text}`}>
                    {isValid ? (
                      strategy.monthsLabel ?? `${strategy.months} mo`
                    ) : (
                      strategy.monthsLabel ?? 'Review inputs'
                    )}
                  </p>

                  {/* Total interest */}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isValid ? `${formatCurrency(strategy.totalInterest)} interest` : strategy.interestLabel ?? 'Not projected'}
                  </p>
                  {!isValid && (
                    <p className="mt-2 w-fit rounded-lg bg-black/30 px-2 py-1 text-xs font-medium text-amber-300">
                      {strategy.statusLabel ?? 'Review inputs'}
                    </p>
                  )}
                </div>

                {/* Savings badge — in the empty space */}
                {!isBaseline && isValid && baselineValid && monthsSaved > 0 && (
                  <div className={`mt-2 text-xs font-medium ${colors.text} bg-black/30 rounded-lg px-2 py-1 inline-block w-fit`}>
                    {formatStrategyDeltaBadge({
                      baselineMonths,
                      baselineInterest,
                      strategyMonths: strategy.months,
                      strategyInterest: strategy.totalInterest,
                    })}
                  </div>
                )}
                {!isBaseline && isValid && baselineValid && monthsSaved <= 0 && (
                  <div className="mt-2 text-xs text-gray-500 bg-black/20 rounded-lg px-2 py-1 inline-block w-fit">
                    No time savings
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Velocity Advantage summary — only if velocity wins */}
      {winner && baseline?.isPayoffPossible !== false && winner.months < baselineMonths && (() => {
        const summaryTone = getStrategyDeltaTone(baselineInterest, winner.totalInterest);
        const summaryToneClasses = summaryToneMap[summaryTone];

        return (
          <div className={`mt-4 rounded-xl border p-4 text-center ${summaryToneClasses.card}`}>
            <p className="text-sm text-gray-400 mb-1">Fastest Strategy: {winner.name}</p>
            <p className={`text-2xl font-bold ${summaryToneClasses.value}`}>
              {formatStrategyInterestDelta(baselineInterest, winner.totalInterest)}
            </p>
            <p className={`${summaryToneClasses.detail} text-sm mt-1`}>
              {baselineMonths - winner.months} months faster
            </p>
          </div>
        );
      })()}
    </div>
  );
}
