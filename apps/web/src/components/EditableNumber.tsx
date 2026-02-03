'use client';

import { useState, useRef, useEffect } from 'react';

interface EditableNumberProps {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  format?: 'currency' | 'percent' | 'number' | 'years' | 'months';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export function EditableNumber({
  value,
  onChange,
  prefix = '',
  suffix = '',
  min = 0,
  max = 10000000,
  step = 1,
  format = 'number',
  size = 'md',
  className = '',
  label,
}: EditableNumberProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setTempValue(value.toString());
    }
  }, [value, isEditing]);

  const formatDisplay = (val: number): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percent':
        return `${(val * 100).toFixed(1)}%`;
      case 'years':
        return `${val} yr${val !== 1 ? 's' : ''}`;
      case 'months':
        return `${val} mo`;
      default:
        return val.toLocaleString();
    }
  };

  const parseInput = (input: string): number => {
    const cleaned = input.replace(/[^0-9.-]/g, '');
    let parsed = parseFloat(cleaned) || 0;
    if (format === 'percent') {
      parsed = parsed / 100;
    }
    return Math.min(max, Math.max(min, parsed));
  };

  const handleClick = () => {
    if (format === 'percent') {
      setTempValue((value * 100).toFixed(1));
    } else {
      setTempValue(value.toString());
    }
    setIsEditing(true);
  };

  const handleBlur = () => {
    const newValue = parseInput(tempValue);
    onChange(newValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(value.toString());
    }
  };

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-lg px-3 py-2',
    lg: 'text-2xl px-4 py-2',
    xl: 'text-3xl px-4 py-3',
  };

  const displaySizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  if (isEditing) {
    return (
      <div className={`inline-flex flex-col ${className}`}>
        {label && <span className="text-xs text-gray-500 mb-1">{label}</span>}
        <div className="flex items-center gap-1">
          {prefix && <span className="text-gray-400">{prefix}</span>}
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            step={step}
            className={`bg-slate-700 border border-emerald-500 rounded-lg font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${sizeClasses[size]} w-32`}
          />
          {suffix && <span className="text-gray-400">{suffix}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      {label && <span className="text-xs text-gray-500 mb-1">{label}</span>}
      <button
        onClick={handleClick}
        className={`group inline-flex items-center gap-1 hover:bg-slate-700/50 rounded-lg px-2 py-1 transition-colors cursor-pointer border border-transparent hover:border-emerald-500/50 ${displaySizeClasses[size]} font-mono text-white`}
        title="Click to edit"
      >
        {prefix && <span>{prefix}</span>}
        <span>{formatDisplay(value)}</span>
        {suffix && <span className="text-gray-400">{suffix}</span>}
        <svg 
          className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  );
}

export function EditablePercentage({
  value,
  onChange,
  ...props
}: Omit<EditableNumberProps, 'format'>) {
  return (
    <EditableNumber
      value={value}
      onChange={onChange}
      format="percent"
      min={0}
      max={1}
      step={0.001}
      {...props}
    />
  );
}

export function EditableCurrency({
  value,
  onChange,
  ...props
}: Omit<EditableNumberProps, 'format' | 'prefix'>) {
  return (
    <EditableNumber
      value={value}
      onChange={onChange}
      format="currency"
      {...props}
    />
  );
}
