'use client';

import { useCallback, useMemo } from 'react';

interface DualSliderProps {
  incomeValue: number;
  expenseValue: number;
  onIncomeChange: (value: number) => void;
  onExpenseChange: (value: number) => void;
}

const MIN_VALUE = 1;
const BREAKPOINT_VALUE = 750000;
const MAX_VALUE = 10000000;
const BREAKPOINT_PERCENT = 0.75;

function valueToSlider(value: number): number {
  if (value <= BREAKPOINT_VALUE) {
    return (value - MIN_VALUE) / (BREAKPOINT_VALUE - MIN_VALUE) * BREAKPOINT_PERCENT * 100;
  } else {
    return (BREAKPOINT_PERCENT + (value - BREAKPOINT_VALUE) / (MAX_VALUE - BREAKPOINT_VALUE) * (1 - BREAKPOINT_PERCENT)) * 100;
  }
}

function sliderToValue(sliderPercent: number): number {
  const percent = sliderPercent / 100;
  if (percent <= BREAKPOINT_PERCENT) {
    return MIN_VALUE + (percent / BREAKPOINT_PERCENT) * (BREAKPOINT_VALUE - MIN_VALUE);
  } else {
    return BREAKPOINT_VALUE + ((percent - BREAKPOINT_PERCENT) / (1 - BREAKPOINT_PERCENT)) * (MAX_VALUE - BREAKPOINT_VALUE);
  }
}

function formatCompactCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export default function DualSlider({ incomeValue, expenseValue, onIncomeChange, onExpenseChange }: DualSliderProps) {
  const incomeSlider = useMemo(() => valueToSlider(incomeValue), [incomeValue]);
  const expenseSlider = useMemo(() => valueToSlider(expenseValue), [expenseValue]);

  const handleIncomeSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.round(sliderToValue(parseFloat(e.target.value)));
    onIncomeChange(newValue);
  }, [onIncomeChange]);

  const handleExpenseSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.round(sliderToValue(parseFloat(e.target.value)));
    onExpenseChange(newValue);
  }, [onExpenseChange]);

  return (
    <div className="mt-4 p-3 bg-slate-700/50 rounded-xl border border-slate-600/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-emerald-400 font-medium">Quick Adjust</span>
        <span className="text-xs text-gray-500">Slide to estimate</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-16">Income</span>
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={incomeSlider}
              onChange={handleIncomeSlider}
              className="w-full h-1.5 bg-slate-600 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 
                [&::-webkit-slider-thumb]:hover:bg-emerald-400 [&::-webkit-slider-thumb]:transition-colors
                [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-emerald-500/30
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:border-0"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #10b981 ${incomeSlider}%, #475569 ${incomeSlider}%, #475569 100%)`
              }}
            />
          </div>
          <span className="text-xs text-emerald-400 font-medium w-16 text-right">{formatCompactCurrency(incomeValue)}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-16">Expenses</span>
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={expenseSlider}
              onChange={handleExpenseSlider}
              className="w-full h-1.5 bg-slate-600 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 
                [&::-webkit-slider-thumb]:hover:bg-amber-400 [&::-webkit-slider-thumb]:transition-colors
                [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-amber-500/30
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                [&::-moz-range-thumb]:bg-amber-500 [&::-moz-range-thumb]:border-0"
              style={{
                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${expenseSlider}%, #475569 ${expenseSlider}%, #475569 100%)`
              }}
            />
          </div>
          <span className="text-xs text-amber-400 font-medium w-16 text-right">{formatCompactCurrency(expenseValue)}</span>
        </div>
      </div>

      <div className="flex justify-between mt-2 text-[10px] text-gray-500">
        <span>$1</span>
        <span className="opacity-60">$750K</span>
        <span>$10M</span>
      </div>
    </div>
  );
}
