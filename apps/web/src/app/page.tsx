'use client';

import { useState } from 'react';
import VitalCard from '@/components/VitalCard';
import ProgressRing from '@/components/ProgressRing';
import { formatCurrency, formatDate, calculateCashFlow } from '@/engine/calculations';

export default function CarDashboard() {
  const [data] = useState({
    monthlyIncome: 5000,
    monthlyExpenses: 3500,
    carLoan: {
      originalBalance: 25000,
      currentBalance: 18500,
      apr: 6.5,
      monthlyPayment: 485,
    },
    payoffMonths: 22,
    interestPerDay: 3.29,
    interestPerMonth: 100,
    nextChunkDays: 12,
  });

  const cashFlow = calculateCashFlow(data.monthlyIncome, data.monthlyExpenses);
  const progress = ((data.carLoan.originalBalance - data.carLoan.currentBalance) / data.carLoan.originalBalance) * 100;
  const payoffDate = formatDate(data.payoffMonths);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Car Dashboard</h1>
        <p className="text-gray-400">Your velocity banking command center</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700">
          <ProgressRing 
            progress={progress} 
            size={220}
            label={`${Math.round(progress)}%`}
            sublabel="Car Payoff Progress"
          />
          <div className="mt-6 text-center">
            <p className="text-2xl font-bold text-white">{formatCurrency(data.carLoan.currentBalance)}</p>
            <p className="text-gray-400">remaining balance</p>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <VitalCard
            title="Monthly Cash Flow"
            value={formatCurrency(cashFlow)}
            subtitle="Income - Expenses"
            color={cashFlow > 0 ? 'green' : 'red'}
          />
          <VitalCard
            title="Interest Burn"
            value={`${formatCurrency(data.interestPerDay)}/day`}
            subtitle={`${formatCurrency(data.interestPerMonth)}/month`}
            color="amber"
          />
          <VitalCard
            title="Debt-Free ETA"
            value={`${data.payoffMonths} months`}
            subtitle={payoffDate}
            color="blue"
          />
          <VitalCard
            title="Next Move"
            value={`Chunk in ${data.nextChunkDays} days`}
            subtitle="Extra payment opportunity"
            color="green"
          />
        </div>
      </div>

      <div className="mt-8 bg-gradient-to-r from-emerald-500/20 to-transparent rounded-2xl p-6 border border-emerald-500/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/30 flex items-center justify-center">
            <span className="text-2xl">🎉</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-emerald-400">Cash Flow Unlock Coming!</h3>
            <p className="text-gray-400">
              When your car is paid off, {formatCurrency(data.carLoan.monthlyPayment)}/month becomes available for your next goal.
            </p>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500">
        Educational tool. Not financial advice.
      </footer>
    </div>
  );
}
