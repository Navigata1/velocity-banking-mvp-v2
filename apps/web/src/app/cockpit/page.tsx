'use client';

import { useState, useEffect } from 'react';
import DomainTabs from '@/components/DomainTabs';
import { EditableCurrency, EditableNumber, EditablePercentage } from '@/components/EditableNumber';
import { formatCurrency } from '@/engine/calculations';
import { useFinancialStore } from '@/stores/financial-store';

interface Instrument {
  label: string;
  value: string | number;
  unit?: string;
  status: 'normal' | 'warning' | 'danger';
  editable?: boolean;
  onEdit?: (val: number) => void;
  numericValue?: number;
}

export default function CockpitPage() {
  const [mounted, setMounted] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [turbulence, setTurbulence] = useState(false);
  const store = useFinancialStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEmergency = () => {
    setEmergency(true);
    setTurbulence(true);
  };

  const resetEmergency = () => {
    setEmergency(false);
    setTurbulence(false);
  };

  if (!mounted) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-slate-800 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const debtType = store.getActiveDebtType();
  const currentDebt = store.debts[debtType];
  const dailyInterest = store.getDailyInterest(debtType);
  const velocity = store.getVelocityPayoff(debtType);
  
  const cashFlow = store.getCashFlow();
  const etaMonths = turbulence ? velocity.months + 2 : velocity.months;

  const instruments: Instrument[] = [
    {
      label: 'Airspeed',
      value: formatCurrency(cashFlow),
      numericValue: cashFlow,
      unit: '/mo',
      status: cashFlow > 500 ? 'normal' : cashFlow > 0 ? 'warning' : 'danger',
      editable: true,
      onEdit: (val: number) => store.setMonthlyIncome(val + store.monthlyExpenses),
    },
    {
      label: 'Fuel Burn',
      value: formatCurrency(dailyInterest),
      unit: '/day',
      status: 'warning',
    },
    {
      label: 'Heading',
      value: store.activeDomain.charAt(0).toUpperCase() + store.activeDomain.slice(1),
      status: 'normal',
    },
    {
      label: 'ETA',
      value: etaMonths,
      unit: ' months',
      status: turbulence ? 'warning' : 'normal',
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

      <DomainTabs 
        activeTab={store.activeDomain} 
        onTabChange={(tab) => store.setActiveDomain(tab as 'car' | 'house' | 'land' | 'creditCard' | 'studentLoan')} 
      />

      <div className="mt-6">
        {turbulence && (
          <div className="mb-6 bg-amber-500/20 border border-amber-500/50 rounded-xl p-4 animate-pulse">
            <p className="text-amber-400 font-medium">
              Turbulence Detected: Emergency expense impacting your trajectory. ETA extended by 2 months.
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
                {instrument.editable && instrument.onEdit && instrument.numericValue !== undefined ? (
                  <EditableCurrency 
                    value={instrument.numericValue} 
                    onChange={instrument.onEdit}
                    size="lg"
                  />
                ) : (
                  <div className="text-2xl md:text-3xl font-bold">
                    {instrument.value}
                    {instrument.unit && <span className="text-lg opacity-60">{instrument.unit}</span>}
                  </div>
                )}
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
                  stroke={turbulence ? '#f59e0b' : '#10b981'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  className={turbulence ? 'animate-pulse' : ''}
                />
                <circle
                  cx="100"
                  cy="100"
                  r="8"
                  fill={turbulence ? '#f59e0b' : '#10b981'}
                />
                <text x="100" y="160" textAnchor="middle" fill="#9ca3af" fontSize="12">
                  DEBT-FREE HEADING
                </text>
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="font-semibold mb-4">Scenario Controls</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Monthly Income</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="2000"
                    max="15000"
                    step="100"
                    value={store.monthlyIncome}
                    onChange={(e) => store.setMonthlyIncome(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <EditableCurrency value={store.monthlyIncome} onChange={store.setMonthlyIncome} size="sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Monthly Expenses</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1000"
                    max="12000"
                    step="100"
                    value={store.monthlyExpenses}
                    onChange={(e) => store.setMonthlyExpenses(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <EditableCurrency value={store.monthlyExpenses} onChange={store.setMonthlyExpenses} size="sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Chunk Size</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={store.chunkAmount}
                    onChange={(e) => store.setChunkAmount(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <EditableCurrency value={store.chunkAmount} onChange={store.setChunkAmount} size="sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="font-semibold mb-4">
              {store.activeDomain.charAt(0).toUpperCase() + store.activeDomain.slice(1)} Details
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Balance</span>
                <EditableCurrency 
                  value={currentDebt.balance} 
                  onChange={(val) => store.updateDebt(debtType, { balance: val })}
                  size="md"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Interest Rate</span>
                <EditablePercentage 
                  value={currentDebt.interestRate} 
                  onChange={(val) => store.updateDebt(debtType, { interestRate: val })}
                  size="md"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Min Payment</span>
                <EditableCurrency 
                  value={currentDebt.minimumPayment} 
                  onChange={(val) => store.updateDebt(debtType, { minimumPayment: val })}
                  size="md"
                />
              </div>
              <div className="pt-2 border-t border-slate-700 flex justify-between">
                <span className="text-gray-400">Potential Savings</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(velocity.savings)}</span>
              </div>
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
            <button className="px-6 py-3 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-colors">
              Toggle: Deposit Income to LOC
            </button>
            <button className="px-6 py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-colors">
              Toggle: Expense Card On/Off
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Every slider change updates the gauges in real-time. More cash flow = lower average balance = less interest.
          </p>
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500">
        Educational tool. Click any number to edit. Not financial advice.
      </footer>
    </div>
  );
}
