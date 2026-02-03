'use client';

import { useState } from 'react';
import { formatCurrency } from '@/engine/calculations';

interface Instrument {
  label: string;
  value: string | number;
  unit?: string;
  status: 'normal' | 'warning' | 'danger';
}

export default function CockpitPage() {
  const [emergency, setEmergency] = useState(false);
  const [data, setData] = useState({
    cashFlow: 1500,
    interestPerDay: 3.29,
    targetDebt: 'Car',
    payoffMonths: 22,
    turbulence: false,
  });

  const handleEmergency = () => {
    setEmergency(true);
    setData(prev => ({
      ...prev,
      turbulence: true,
      payoffMonths: prev.payoffMonths + 2,
    }));
  };

  const resetEmergency = () => {
    setEmergency(false);
    setData(prev => ({
      ...prev,
      turbulence: false,
      payoffMonths: prev.payoffMonths - 2,
    }));
  };

  const instruments: Instrument[] = [
    {
      label: 'Airspeed',
      value: formatCurrency(data.cashFlow),
      unit: '/mo',
      status: data.cashFlow > 500 ? 'normal' : data.cashFlow > 0 ? 'warning' : 'danger',
    },
    {
      label: 'Fuel Burn',
      value: formatCurrency(data.interestPerDay),
      unit: '/day',
      status: 'warning',
    },
    {
      label: 'Heading',
      value: data.targetDebt,
      status: 'normal',
    },
    {
      label: 'ETA',
      value: data.payoffMonths,
      unit: ' months',
      status: data.turbulence ? 'warning' : 'normal',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
      case 'warning': return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
      case 'danger': return 'text-red-400 border-red-500/50 bg-red-500/10';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Cockpit Mode</h1>
        <p className="text-gray-400">Your financial flight simulator</p>
      </header>

      {data.turbulence && (
        <div className="mb-6 bg-amber-500/20 border border-amber-500/50 rounded-xl p-4 animate-pulse">
          <p className="text-amber-400 font-medium">
            ⚠️ Turbulence Detected: Emergency expense impacting your trajectory. ETA extended by 2 months.
          </p>
        </div>
      )}

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {instruments.map((instrument, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-6 text-center ${getStatusColor(instrument.status)}`}
            >
              <div className="text-sm opacity-80 mb-2">{instrument.label}</div>
              <div className="text-2xl md:text-3xl font-bold">
                {instrument.value}
                {instrument.unit && <span className="text-lg opacity-60">{instrument.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center">
          <div className="relative w-64 h-64">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="4"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="2"
              />
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="30"
                stroke={data.turbulence ? '#f59e0b' : '#10b981'}
                strokeWidth="4"
                strokeLinecap="round"
                className={data.turbulence ? 'animate-pulse' : ''}
              />
              <circle
                cx="100"
                cy="100"
                r="8"
                fill={data.turbulence ? '#f59e0b' : '#10b981'}
              />
              <text x="100" y="160" textAnchor="middle" fill="#9ca3af" fontSize="12">
                DEBT-FREE HEADING
              </text>
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h3 className="font-semibold mb-4">Flight Controls</h3>
        <div className="flex flex-wrap gap-4">
          {!emergency ? (
            <button
              onClick={handleEmergency}
              className="px-6 py-3 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded-xl hover:bg-amber-500/30 transition-colors"
            >
              Simulate Emergency Expense ($600)
            </button>
          ) : (
            <button
              onClick={resetEmergency}
              className="px-6 py-3 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors"
            >
              Clear Turbulence
            </button>
          )}
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500">
        Educational tool. Not financial advice.
      </footer>
    </div>
  );
}
