'use client';

import { useState, useMemo } from 'react';
import { runSimulation, formatCurrency, formatDate, SimulationInputs } from '@/engine/calculations';

export default function SimulatorPage() {
  const [inputs, setInputs] = useState<SimulationInputs>({
    monthlyIncome: 5000,
    monthlyExpenses: 3500,
    carLoan: {
      balance: 25000,
      apr: 6.5,
      monthlyPayment: 485,
    },
    loc: {
      limit: 15000,
      apr: 9.0,
      balance: 0,
    },
    useVelocity: true,
    extraPayment: 500,
  });

  const cashFlow = inputs.monthlyIncome - inputs.monthlyExpenses;
  const locUtilization = inputs.loc ? (inputs.loc.balance / inputs.loc.limit) * 100 : 0;

  const results = useMemo(() => runSimulation(inputs), [inputs]);

  const updateInput = (path: string, value: number) => {
    setInputs(prev => {
      const newInputs = { ...prev };
      const keys = path.split('.');
      let obj: Record<string, unknown> = newInputs;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]] as Record<string, unknown>;
      }
      obj[keys[keys.length - 1]] = value;
      return newInputs;
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">What-If Simulator</h1>
        <p className="text-gray-400">See how velocity banking could accelerate your payoff</p>
      </header>

      {cashFlow <= 0 && (
        <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4">
          <p className="text-red-400 font-medium">
            ⚠️ Stabilize First: Your expenses exceed your income. Focus on positive cash flow before using velocity banking.
          </p>
        </div>
      )}

      {locUtilization > 80 && (
        <div className="mb-6 bg-amber-500/20 border border-amber-500/50 rounded-xl p-4">
          <p className="text-amber-400 font-medium">
            ⚠️ High LOC Utilization: Your line of credit is over 80% utilized. This increases risk.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">Income & Expenses</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Monthly Income</label>
                <input
                  type="number"
                  value={inputs.monthlyIncome}
                  onChange={(e) => updateInput('monthlyIncome', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Monthly Expenses</label>
                <input
                  type="number"
                  value={inputs.monthlyExpenses}
                  onChange={(e) => updateInput('monthlyExpenses', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="pt-2 border-t border-slate-700">
                <div className="flex justify-between">
                  <span className="text-gray-400">Cash Flow</span>
                  <span className={cashFlow > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {formatCurrency(cashFlow)}/mo
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">Car Loan</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Balance</label>
                <input
                  type="number"
                  value={inputs.carLoan.balance}
                  onChange={(e) => updateInput('carLoan.balance', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">APR (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inputs.carLoan.apr}
                  onChange={(e) => updateInput('carLoan.apr', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Monthly Payment</label>
                <input
                  type="number"
                  value={inputs.carLoan.monthlyPayment}
                  onChange={(e) => updateInput('carLoan.monthlyPayment', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">Line of Credit (Optional)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Limit</label>
                <input
                  type="number"
                  value={inputs.loc?.limit || 0}
                  onChange={(e) => updateInput('loc.limit', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">APR (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inputs.loc?.apr || 0}
                  onChange={(e) => updateInput('loc.apr', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Extra Payment / Chunk</label>
                <input
                  type="number"
                  value={inputs.extraPayment}
                  onChange={(e) => updateInput('extraPayment', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-6">Results Comparison</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                  <p className="text-sm text-gray-400 mb-1">Traditional</p>
                  <p className="text-2xl font-bold text-red-400">{results.baseline.payoffMonths} mo</p>
                  <p className="text-sm text-gray-500">{formatDate(results.baseline.payoffMonths)}</p>
                </div>
                <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                  <p className="text-sm text-gray-400 mb-1">Velocity</p>
                  <p className="text-2xl font-bold text-emerald-400">{results.velocity.payoffMonths} mo</p>
                  <p className="text-sm text-gray-500">{formatDate(results.velocity.payoffMonths)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Traditional Interest</p>
                  <p className="text-xl font-bold text-red-400">{formatCurrency(results.baseline.totalInterest)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Velocity Interest</p>
                  <p className="text-xl font-bold text-emerald-400">{formatCurrency(results.velocity.totalInterest)}</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-500/20 to-amber-500/20 rounded-xl p-6 text-center">
                <p className="text-gray-400 mb-2">Potential Savings</p>
                <p className="text-3xl font-bold text-emerald-400">{formatCurrency(results.velocity.interestSaved)}</p>
                <p className="text-amber-400 mt-2">{results.velocity.monthsSaved} months faster</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="font-semibold mb-4">Balance Over Time (Estimate)</h3>
            <div className="h-48 flex items-end justify-between gap-1">
              {results.baseline.monthlyData.slice(0, 24).map((month, i) => (
                <div key={i} className="flex-1 flex flex-col gap-1">
                  <div 
                    className="bg-red-500/50 rounded-t"
                    style={{ height: `${(month.carBalance / inputs.carLoan.balance) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Month 1</span>
              <span>Month 24</span>
            </div>
            <div className="flex gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500/50 rounded" />
                <span className="text-gray-400">Traditional</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500">
        Educational tool. Estimates shown are simplified models. Not financial advice.
      </footer>
    </div>
  );
}
