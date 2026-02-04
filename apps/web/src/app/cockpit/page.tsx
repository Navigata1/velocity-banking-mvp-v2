'use client';

import { useState, useEffect } from 'react';
import DomainTabs from '@/components/DomainTabs';
import { EditableCurrency, EditableNumber, EditablePercentage } from '@/components/EditableNumber';
import { formatCurrency } from '@/engine/calculations';
import { useFinancialStore, Domain } from '@/stores/financial-store';
import { useThemeStore, themeClasses } from '@/stores/theme-store';

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
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];

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
          <div className="h-8 bg-gray-500/30 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-gray-500/20 rounded-3xl"></div>
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
        <h1 className={`text-3xl font-bold ${classes.text} mb-2`}>Cockpit Mode</h1>
        <p className={classes.textSecondary}>Your financial flight simulator</p>
      </header>

      <DomainTabs 
        activeTab={store.activeDomain} 
        onTabChange={(tab) => store.setActiveDomain(tab as Domain)} 
      />

      <div className="mt-6">
        {turbulence && (
          <div className="mb-6 bg-amber-500/20 border border-amber-500/50 rounded-xl p-4 animate-pulse">
            <p className="text-amber-400 font-medium">
              Turbulence Detected: Emergency expense impacting your trajectory. ETA extended by 2 months.
            </p>
          </div>
        )}

        <div className={`${classes.glass} rounded-3xl p-8 mb-8`}>
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

          {/* Flight Simulator Panel */}
          <div className={`mt-8 relative rounded-3xl overflow-hidden ${
            theme === 'light' 
              ? 'bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900' 
              : theme === 'dark'
              ? 'bg-gradient-to-b from-zinc-800 via-zinc-900 to-black'
              : 'bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900'
          } border-4 ${theme === 'light' ? 'border-slate-500' : theme === 'dark' ? 'border-zinc-600' : 'border-slate-600'}`}>
            {/* Cockpit frame with rivets */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 left-4 w-2 h-2 bg-zinc-500 rounded-full opacity-50" />
              <div className="absolute top-2 right-4 w-2 h-2 bg-zinc-500 rounded-full opacity-50" />
              <div className="absolute bottom-2 left-4 w-2 h-2 bg-zinc-500 rounded-full opacity-50" />
              <div className="absolute bottom-2 right-4 w-2 h-2 bg-zinc-500 rounded-full opacity-50" />
              <div className="absolute top-2 left-1/4 w-2 h-2 bg-zinc-500 rounded-full opacity-50" />
              <div className="absolute top-2 right-1/4 w-2 h-2 bg-zinc-500 rounded-full opacity-50" />
              <div className="absolute bottom-2 left-1/4 w-2 h-2 bg-zinc-500 rounded-full opacity-50" />
              <div className="absolute bottom-2 right-1/4 w-2 h-2 bg-zinc-500 rounded-full opacity-50" />
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Left panel - Altitude/Progress gauge */}
              <div className="flex flex-col items-center">
                <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border-2 border-zinc-500 shadow-inner">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="3" 
                      strokeDasharray={`${((currentDebt.balance / 50000) * 100) * 2.51} 251`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      className="opacity-60"
                    />
                    <text x="50" y="45" textAnchor="middle" fill="#9ca3af" fontSize="8">ALTITUDE</text>
                    <text x="50" y="58" textAnchor="middle" fill="#10b981" fontSize="12" fontFamily="monospace">
                      {(((50000 - currentDebt.balance) / 50000) * 100).toFixed(0)}%
                    </text>
                  </svg>
                </div>
                <span className="text-xs text-zinc-400 mt-2">Progress to Freedom</span>
              </div>

              {/* Center - Main Heading Dial */}
              <div className="flex flex-col items-center">
                <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-zinc-800 to-black border-4 border-zinc-500 shadow-2xl">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <defs>
                      <radialGradient id="dialGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#27272a" />
                        <stop offset="100%" stopColor="#18181b" />
                      </radialGradient>
                    </defs>
                    <circle cx="100" cy="100" r="90" fill="url(#dialGradient)" />
                    <circle
                      cx="100"
                      cy="100"
                      r="85"
                      fill="none"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="75"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="1"
                    />
                    {/* Tick marks */}
                    {[...Array(12)].map((_, i) => {
                      const angle = (i * 30 - 90) * (Math.PI / 180);
                      const x1 = 100 + 70 * Math.cos(angle);
                      const y1 = 100 + 70 * Math.sin(angle);
                      const x2 = 100 + 80 * Math.cos(angle);
                      const y2 = 100 + 80 * Math.sin(angle);
                      return (
                        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                      );
                    })}
                    {/* Needle */}
                    <line
                      x1="100"
                      y1="100"
                      x2="100"
                      y2="30"
                      stroke={turbulence ? '#f59e0b' : '#10b981'}
                      strokeWidth="4"
                      strokeLinecap="round"
                      className={turbulence ? 'animate-pulse' : ''}
                      style={{ filter: `drop-shadow(0 0 8px ${turbulence ? '#f59e0b' : '#10b981'})` }}
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="10"
                      fill={turbulence ? '#f59e0b' : '#10b981'}
                      style={{ filter: `drop-shadow(0 0 6px ${turbulence ? '#f59e0b' : '#10b981'})` }}
                    />
                    <text x="100" y="160" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="monospace">
                      DEBT-FREE HEADING
                    </text>
                  </svg>
                </div>
              </div>

              {/* Right panel - Fuel gauge */}
              <div className="flex flex-col items-center">
                <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border-2 border-zinc-500 shadow-inner">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="none" 
                      stroke="#f59e0b" 
                      strokeWidth="3" 
                      strokeDasharray={`${((cashFlow / 3000) * 100) * 2.51} 251`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      className="opacity-60"
                    />
                    <text x="50" y="45" textAnchor="middle" fill="#9ca3af" fontSize="8">FUEL</text>
                    <text x="50" y="58" textAnchor="middle" fill="#f59e0b" fontSize="12" fontFamily="monospace">
                      {formatCurrency(cashFlow)}
                    </text>
                  </svg>
                </div>
                <span className="text-xs text-zinc-400 mt-2">Cash Flow Rate</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className={`${classes.glass} rounded-2xl p-6`}>
            <h3 className={`font-semibold mb-4 ${classes.text}`}>Scenario Controls</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm ${classes.textSecondary} mb-2`}>Monthly Income</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="2000"
                    max="15000"
                    step="100"
                    value={store.monthlyIncome}
                    onChange={(e) => store.setMonthlyIncome(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-500/30 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <EditableCurrency value={store.monthlyIncome} onChange={store.setMonthlyIncome} size="sm" />
                </div>
              </div>
              <div>
                <label className={`block text-sm ${classes.textSecondary} mb-2`}>Monthly Expenses</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1000"
                    max="12000"
                    step="100"
                    value={store.monthlyExpenses}
                    onChange={(e) => store.setMonthlyExpenses(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-500/30 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <EditableCurrency value={store.monthlyExpenses} onChange={store.setMonthlyExpenses} size="sm" />
                </div>
              </div>
              <div>
                <label className={`block text-sm ${classes.textSecondary} mb-2`}>Chunk Size</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={store.chunkAmount}
                    onChange={(e) => store.setChunkAmount(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-500/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <EditableCurrency value={store.chunkAmount} onChange={store.setChunkAmount} size="sm" />
                </div>
              </div>
            </div>
          </div>

          <div className={`${classes.glass} rounded-2xl p-6`}>
            <h3 className={`font-semibold mb-4 ${classes.text}`}>
              {store.activeDomain.charAt(0).toUpperCase() + store.activeDomain.slice(1)} Details
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className={classes.textSecondary}>Balance</span>
                <EditableCurrency 
                  value={currentDebt.balance} 
                  onChange={(val) => store.updateDebt(debtType, { balance: val })}
                  size="md"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className={classes.textSecondary}>Interest Rate</span>
                <EditablePercentage 
                  value={currentDebt.interestRate} 
                  onChange={(val) => store.updateDebt(debtType, { interestRate: val })}
                  size="md"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className={classes.textSecondary}>Min Payment</span>
                <EditableCurrency 
                  value={currentDebt.minimumPayment} 
                  onChange={(val) => store.updateDebt(debtType, { minimumPayment: val })}
                  size="md"
                />
              </div>
              <div className={`pt-2 border-t ${classes.border} flex justify-between`}>
                <span className={classes.textSecondary}>Potential Savings</span>
                <span className="text-emerald-500 font-bold">{formatCurrency(velocity.savings)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`${classes.glass} rounded-2xl p-6`}>
          <h3 className={`font-semibold mb-4 ${classes.text}`}>Flight Controls</h3>
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
          <p className={`mt-4 text-sm ${classes.textSecondary}`}>
            Every slider change updates the gauges in real-time. More cash flow = lower average balance = less interest.
          </p>
        </div>
      </div>

      <footer className={`mt-12 text-center text-sm ${classes.textSecondary}`}>
        Educational tool. Click any number to edit. Not financial advice.
      </footer>
    </div>
  );
}
