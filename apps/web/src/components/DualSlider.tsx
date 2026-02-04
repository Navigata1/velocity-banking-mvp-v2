'use client';

import { useCallback, useMemo } from 'react';
import { useThemeStore, themeClasses } from '@/stores/theme-store';

interface DualSliderProps {
  incomeValue: number;
  expenseValue: number;
  onIncomeChange: (value: number) => void;
  onExpenseChange: (value: number) => void;
}

const BREAKPOINTS = [
  { percent: 0, value: 1 },
  { percent: 25, value: 3000 },
  { percent: 35, value: 5000 },
  { percent: 45, value: 10000 },
  { percent: 55, value: 20000 },
  { percent: 65, value: 50000 },
  { percent: 75, value: 100000 },
  { percent: 85, value: 500000 },
  { percent: 100, value: 10000000 },
];

function valueToSlider(value: number): number {
  value = Math.max(1, Math.min(10000000, value));
  
  for (let i = 1; i < BREAKPOINTS.length; i++) {
    const prev = BREAKPOINTS[i - 1];
    const curr = BREAKPOINTS[i];
    if (value <= curr.value) {
      const valueRatio = (value - prev.value) / (curr.value - prev.value);
      return prev.percent + valueRatio * (curr.percent - prev.percent);
    }
  }
  return 100;
}

function sliderToValue(sliderPercent: number): number {
  sliderPercent = Math.max(0, Math.min(100, sliderPercent));
  
  for (let i = 1; i < BREAKPOINTS.length; i++) {
    const prev = BREAKPOINTS[i - 1];
    const curr = BREAKPOINTS[i];
    if (sliderPercent <= curr.percent) {
      const percentRatio = (sliderPercent - prev.percent) / (curr.percent - prev.percent);
      return prev.value + percentRatio * (curr.value - prev.value);
    }
  }
  return 10000000;
}

function roundToNice(value: number): number {
  if (value <= 100) return Math.round(value);
  if (value <= 1000) return Math.round(value / 10) * 10;
  if (value <= 5000) return Math.round(value / 50) * 50;
  if (value <= 10000) return Math.round(value / 100) * 100;
  if (value <= 50000) return Math.round(value / 500) * 500;
  if (value <= 100000) return Math.round(value / 1000) * 1000;
  if (value <= 500000) return Math.round(value / 5000) * 5000;
  if (value <= 1000000) return Math.round(value / 10000) * 10000;
  return Math.round(value / 50000) * 50000;
}

function formatCompactCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export default function DualSlider({ incomeValue, expenseValue, onIncomeChange, onExpenseChange }: DualSliderProps) {
  const { theme } = useThemeStore();
  const classes = themeClasses[theme];
  
  const incomeSlider = useMemo(() => valueToSlider(incomeValue), [incomeValue]);
  const expenseSlider = useMemo(() => valueToSlider(expenseValue), [expenseValue]);

  const handleIncomeSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = sliderToValue(parseFloat(e.target.value));
    onIncomeChange(roundToNice(rawValue));
  }, [onIncomeChange]);

  const handleExpenseSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = sliderToValue(parseFloat(e.target.value));
    onExpenseChange(roundToNice(rawValue));
  }, [onExpenseChange]);

  const sliderTrackColor = theme === 'light' ? '#d1d5db' : '#475569';

  return (
    <div className={`mt-4 p-3 ${classes.glass} rounded-xl border border-gray-400/30`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-emerald-500 font-medium">Quick Adjust</span>
        <span className={`text-xs ${classes.textMuted}`}>Slide to estimate</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className={`text-xs ${classes.textSecondary} w-16`}>Income</span>
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={incomeSlider}
              onChange={handleIncomeSlider}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 
                [&::-webkit-slider-thumb]:hover:bg-emerald-400 [&::-webkit-slider-thumb]:transition-colors
                [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-emerald-500/30
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:border-0"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #10b981 ${incomeSlider}%, ${sliderTrackColor} ${incomeSlider}%, ${sliderTrackColor} 100%)`
              }}
            />
          </div>
          <span className="text-xs text-emerald-500 font-medium w-16 text-right">{formatCompactCurrency(incomeValue)}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs ${classes.textSecondary} w-16`}>Expenses</span>
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={expenseSlider}
              onChange={handleExpenseSlider}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 
                [&::-webkit-slider-thumb]:hover:bg-amber-400 [&::-webkit-slider-thumb]:transition-colors
                [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-amber-500/30
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                [&::-moz-range-thumb]:bg-amber-500 [&::-moz-range-thumb]:border-0"
              style={{
                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${expenseSlider}%, ${sliderTrackColor} ${expenseSlider}%, ${sliderTrackColor} 100%)`
              }}
            />
          </div>
          <span className="text-xs text-amber-500 font-medium w-16 text-right">{formatCompactCurrency(expenseValue)}</span>
        </div>
      </div>

      <div className={`flex justify-between mt-2 text-[10px] ${classes.textMuted}`}>
        <span>$1</span>
        <span className="opacity-50">$3K</span>
        <span className="opacity-50">$10K</span>
        <span className="opacity-50">$100K</span>
        <span>$10M</span>
      </div>
    </div>
  );
}
