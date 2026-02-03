'use client';

import { useState, useMemo, useEffect } from 'react';
import { runSimulation, formatCurrency, formatDate, SimulationInputs } from '@/engine/calculations';
import DomainTabs from '@/components/DomainTabs';
import DualSlider from '@/components/DualSlider';
import { EditableCurrency, EditableNumber, EditablePercentage } from '@/components/EditableNumber';
import { useFinancialStore, Domain } from '@/stores/financial-store';

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false);
  const store = useFinancialStore();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const inputs: SimulationInputs = useMemo(() => {
    const debtType = store.getActiveDebtType();
    const debt = store.debts[debtType];
    return {
      monthlyIncome: store.monthlyIncome,
      monthlyExpenses: store.monthlyExpenses,
      carLoan: {
        balance: debt.balance,
        apr: debt.interestRate * 100,
        monthlyPayment: debt.minimumPayment,
      },
      loc: {
        limit: store.loc.limit,
        apr: store.loc.interestRate * 100,
        balance: store.loc.balance,
      },
      useVelocity: true,
      extraPayment: store.chunkAmount,
    };
  }, [store]);

  const cashFlow = store.getCashFlow();
  const locUtilization = (store.loc.balance / store.loc.limit) * 100;

  const results = useMemo(() => runSimulation(inputs), [inputs]);

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
  const domainName = store.activeDomain.charAt(0).toUpperCase() + store.activeDomain.slice(1);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">What-If Simulator</h1>
        <p className="text-gray-400">See how velocity banking could accelerate your payoff</p>
      </header>

      <DomainTabs 
        activeTab={store.activeDomain} 
        onTabChange={(tab) => store.setActiveDomain(tab as Domain)} 
      />

      <div className="mt-6">
        {cashFlow <= 0 && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-400 font-medium">
              Stabilize First: Your expenses exceed your income. Focus on positive cash flow before using velocity banking.
            </p>
          </div>
        )}

        {locUtilization > 80 && (
          <div className="mb-6 bg-amber-500/20 border border-amber-500/50 rounded-xl p-4">
            <p className="text-amber-400 font-medium">
              High LOC Utilization: Your line of credit is over 80% utilized. This increases risk.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-4">Income & Expenses</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Monthly Income</label>
                  <EditableCurrency 
                    value={store.monthlyIncome} 
                    onChange={store.setMonthlyIncome}
                    size="lg"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Monthly Expenses</label>
                  <EditableCurrency 
                    value={store.monthlyExpenses} 
                    onChange={store.setMonthlyExpenses}
                    size="lg"
                  />
                </div>
                <DualSlider
                  incomeValue={store.monthlyIncome}
                  expenseValue={store.monthlyExpenses}
                  onIncomeChange={store.setMonthlyIncome}
                  onExpenseChange={store.setMonthlyExpenses}
                />
                <div className="pt-2 border-t border-slate-700">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cash Flow</span>
                    <span className={cashFlow > 0 ? 'text-emerald-400 font-bold text-xl' : 'text-red-400 font-bold text-xl'}>
                      {formatCurrency(cashFlow)}/mo
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-4">{domainName} Loan</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Balance</label>
                  <EditableCurrency 
                    value={currentDebt.balance} 
                    onChange={(val) => store.updateDebt(debtType, { balance: val })}
                    size="lg"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">APR</label>
                  <EditablePercentage 
                    value={currentDebt.interestRate} 
                    onChange={(val) => store.updateDebt(debtType, { interestRate: val })}
                    size="lg"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Monthly Payment</label>
                  <EditableCurrency 
                    value={currentDebt.minimumPayment} 
                    onChange={(val) => store.updateDebt(debtType, { minimumPayment: val })}
                    size="lg"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-4">Line of Credit</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Limit</label>
                  <EditableCurrency 
                    value={store.loc.limit} 
                    onChange={(val) => store.updateLOC({ limit: val })}
                    size="lg"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">APR</label>
                  <EditablePercentage 
                    value={store.loc.interestRate} 
                    onChange={(val) => store.updateLOC({ interestRate: val })}
                    size="lg"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Extra Payment / Chunk</label>
                  <EditableCurrency 
                    value={store.chunkAmount} 
                    onChange={store.setChunkAmount}
                    size="lg"
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
                      style={{ height: `${(month.carBalance / (currentDebt.balance || 1)) * 100}%` }}
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

            <a
              href="/cockpit"
              className="block bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl p-6 border border-blue-500/30 hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">🛩️</span>
                <div>
                  <h3 className="text-lg font-semibold text-blue-400">Try Cockpit Mode</h3>
                  <p className="text-gray-400 text-sm">Interactive flight simulator for your finances</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500">
        Educational tool. Click any number to edit. Estimates are simplified models. Not financial advice.
      </footer>
    </div>
  );
}
