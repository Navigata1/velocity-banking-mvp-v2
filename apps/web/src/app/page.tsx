'use client';

import { useState, useEffect } from 'react';
import DomainTabs from '@/components/DomainTabs';
import HeroVisual from '@/components/HeroVisual';
import VitalsGrid from '@/components/VitalsGrid';
import ActionFeed from '@/components/ActionFeed';
import { EditableCurrency, EditablePercentage, EditableNumber } from '@/components/EditableNumber';
import { formatCurrency } from '@/engine/calculations';
import { useFinancialStore } from '@/stores/financial-store';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const store = useFinancialStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const getDomainData = () => {
    const domain = store.activeDomain;
    
    if (domain === 'vault') {
      const velocity = store.getVelocityPayoff('house');
      return {
        hotspots: [
          { label: 'Net Worth', value: formatCurrency(velocity.savings * 2), position: { top: '30%', left: '70%' }, color: 'bg-emerald-500' },
          { label: 'Interest Avoided', value: formatCurrency(velocity.savings), position: { top: '60%', left: '20%' }, color: 'bg-green-500' },
          { label: 'Freedom Fund', value: formatCurrency(store.getCashFlow() * 6), position: { top: '20%', left: '30%' }, color: 'bg-blue-500' },
          { label: 'Monthly Surplus', value: formatCurrency(store.getCashFlow()), position: { top: '75%', left: '75%' }, color: 'bg-amber-500' },
        ],
        trendValue: formatCurrency(velocity.savings),
        trendLabel: 'potential savings',
        vitals: [
          { icon: '💎', label: 'Potential Savings', value: formatCurrency(velocity.savings), sublabel: 'With velocity strategy' },
          { icon: '🛡️', label: 'Monthly Cash Flow', value: store.getCashFlow(), sublabel: 'Available for investing', isEditable: true, onEdit: (val: number) => store.setMonthlyIncome(val + store.monthlyExpenses) },
          { icon: '🏦', label: 'Freedom Fund', value: formatCurrency(store.getCashFlow() * 6), sublabel: '6 months expenses' },
          { icon: '🎯', label: 'Time Saved', value: `${Math.round((store.getBaselinePayoff('house').months - velocity.months) / 12)} years`, sublabel: 'vs traditional path' },
        ],
        actions: [
          { id: '1', type: 'milestone' as const, title: 'Breaking the Cycle!', subtitle: `Save ${formatCurrency(velocity.savings)} in interest`, icon: '🎉', chart: 'line' as const },
          { id: '2', type: 'action' as const, title: 'Investment Opportunity', subtitle: 'Index fund contribution ready', icon: '📈', chart: 'bars' as const },
          { id: '3', type: 'tip' as const, title: 'Share Your Journey', subtitle: 'Generate shareable results card', icon: '📱' },
          { id: '4', type: 'milestone' as const, title: 'Generational Impact', subtitle: 'Breaking the debt cycle', icon: '👨‍👩‍👧‍👦' },
        ],
      };
    }
    
    const debt = store.debts[domain as keyof typeof store.debts];
    const dailyInterest = store.getDailyInterest(domain as keyof typeof store.debts);
    const velocity = store.getVelocityPayoff(domain as keyof typeof store.debts);
    
    const domainConfigs: Record<string, { hotspots: typeof store.debts.car; actions: { id: string; type: 'action' | 'tip' | 'milestone' | 'alert'; title: string; subtitle: string; icon: string; chart?: 'line' | 'bars' }[] }> = {
      car: {
        hotspots: debt,
        actions: [
          { id: '1', type: 'action', title: 'Payday Incoming', subtitle: 'Deposit to LOC tomorrow', icon: '💵', chart: 'line' },
          { id: '2', type: 'tip', title: 'Expense Card Due', subtitle: 'Pay in full in 3 days', icon: '💳', chart: 'bars' },
          { id: '3', type: 'milestone', title: 'Cash Flow Unlocked!', subtitle: `You freed ${formatCurrency(store.getCashFlow() * 0.1)}/mo`, icon: '🎉' },
          { id: '4', type: 'alert', title: 'Emergency Mode', subtitle: 'Tap if unexpected expense hits', icon: '🚨' },
        ],
      },
      house: {
        hotspots: debt,
        actions: [
          { id: '1', type: 'milestone', title: 'Chunk Ready!', subtitle: `Deploy ${formatCurrency(store.chunkAmount)} this week`, icon: '🎯', chart: 'line' },
          { id: '2', type: 'action', title: 'HELOC Payment Due', subtitle: `Interest-only: ${formatCurrency(store.loc.balance * store.loc.interestRate / 12)}`, icon: '📋' },
          { id: '3', type: 'tip', title: 'Optimize Timing', subtitle: 'Best chunk day: the 5th', icon: '💡', chart: 'bars' },
          { id: '4', type: 'milestone', title: 'Payoff Accelerated', subtitle: `Now ${Math.round((store.debts.house.termMonths - velocity.months) / 12)} years ahead`, icon: '🚀' },
        ],
      },
      land: {
        hotspots: debt,
        actions: [
          { id: '1', type: 'action', title: 'Payment Due', subtitle: `${formatCurrency(debt.minimumPayment)} due soon`, icon: '📋', chart: 'line' },
          { id: '2', type: 'tip', title: 'Land Appreciation', subtitle: 'Up 4% in your area this year', icon: '📈', chart: 'bars' },
          { id: '3', type: 'milestone', title: 'Equity Growing', subtitle: `${formatCurrency(debt.balance * 0.2)} built up`, icon: '🎉' },
          { id: '4', type: 'action', title: 'Next Chunk', subtitle: `${formatCurrency(store.chunkAmount)} in 5 days`, icon: '💵' },
        ],
      },
    };
    
    const config = domainConfigs[domain] || domainConfigs.car;
    
    return {
      hotspots: [
        { label: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Rate`, value: `${(debt.interestRate * 100).toFixed(1)}% APR`, position: { top: '20%', left: '80%' }, color: 'bg-emerald-500' },
        { label: 'Interest Burn', value: `${formatCurrency(dailyInterest)}/day`, position: { top: '60%', left: '10%' }, color: 'bg-amber-500' },
        { label: 'ETA', value: `${velocity.months} months`, position: { top: '80%', left: '75%' }, color: 'bg-blue-500' },
        { label: 'LOC Available', value: formatCurrency(store.loc.limit - store.loc.balance), position: { top: '40%', left: '5%' }, color: 'bg-cyan-500' },
      ],
      trendValue: formatCurrency(debt.balance),
      trendLabel: 'remaining balance',
      vitals: [
        { icon: '💰', label: 'Cash Flow', value: store.getCashFlow(), sublabel: 'Income - Expenses', isEditable: true, onEdit: (val: number) => store.setMonthlyIncome(val + store.monthlyExpenses) },
        { icon: '🔥', label: 'Interest Burn', value: formatCurrency(dailyInterest) + '/day', sublabel: formatCurrency(dailyInterest * 30) + '/month' },
        { icon: '🎯', label: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Balance`, value: debt.balance, sublabel: `@ ${(debt.interestRate * 100).toFixed(1)}% APR`, isEditable: true, onEdit: (val: number) => store.updateDebt(domain as keyof typeof store.debts, { balance: val }) },
        { icon: '📅', label: 'Next Move', value: `Chunk in ${Math.floor(Math.random() * 14) + 7} days`, sublabel: `${formatCurrency(store.chunkAmount)} ready` },
      ],
      actions: config.actions,
    };
  };

  if (!mounted) {
    return (
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-slate-800 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const data = getDomainData();

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <header className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <p className="text-gray-400 text-sm">Check your</p>
            <h1 className="text-3xl font-bold text-white">Financial Health</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-4 py-2 border border-slate-700">
              <button className="text-gray-400 hover:text-white">&lt;</button>
              <span className="text-white font-medium px-4">February 2026</span>
              <button className="text-gray-400 hover:text-white">&gt;</button>
            </div>
          </div>
        </div>
        
        <DomainTabs 
          activeTab={store.activeDomain} 
          onTabChange={(tab) => store.setActiveDomain(tab as 'car' | 'house' | 'land' | 'vault')} 
        />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <HeroVisual
            domain={store.activeDomain}
            hotspots={data.hotspots}
            trendValue={data.trendValue}
            trendLabel={data.trendLabel}
          />
        </div>

        <div className="lg:col-span-3">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-2">
              {['💰', '📊', '🎯', '⚡'].map((icon, i) => (
                <button
                  key={i}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-blue-500' : 'bg-slate-800 hover:bg-slate-700'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {data.vitals.map((vital, i) => (
              <div key={i} className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 hover:border-emerald-500/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{vital.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-400 mb-1">{vital.label}</div>
                    {vital.isEditable && typeof vital.onEdit === 'function' && typeof vital.value === 'number' ? (
                      <EditableCurrency value={vital.value} onChange={vital.onEdit} size="lg" />
                    ) : (
                      <div className="text-xl font-bold text-white">
                        {typeof vital.value === 'number' ? formatCurrency(vital.value) : vital.value}
                      </div>
                    )}
                    {vital.sublabel && <div className="text-xs text-gray-500 mt-1">{vital.sublabel}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="flex gap-2 mb-4">
            {['All', 'Actions', 'Tips', 'Wins'].map((label, i) => (
              <button
                key={label}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${i === 0 ? 'bg-blue-500 text-white' : 'bg-slate-800 text-gray-400 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <ActionFeed cards={data.actions} />
        </div>
      </div>

      <div className="mt-8 bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Monthly Income</label>
            <EditableCurrency value={store.monthlyIncome} onChange={store.setMonthlyIncome} size="md" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Monthly Expenses</label>
            <EditableCurrency value={store.monthlyExpenses} onChange={store.setMonthlyExpenses} size="md" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Chunk Amount</label>
            <EditableCurrency value={store.chunkAmount} onChange={store.setChunkAmount} size="md" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">LOC Rate</label>
            <EditablePercentage value={store.loc.interestRate} onChange={(val) => store.updateLOC({ interestRate: val })} size="md" />
          </div>
        </div>
      </div>

      <div className="mt-8 bg-gradient-to-r from-emerald-500/20 to-transparent rounded-2xl p-6 border border-emerald-500/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/30 flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-emerald-400">Run a What-If Simulation</h3>
              <p className="text-gray-400">See how changes affect your payoff timeline</p>
            </div>
          </div>
          <a
            href="/simulator"
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
          >
            Open Simulator
          </a>
        </div>
      </div>

      <footer className="mt-8 text-center text-sm text-gray-500">
        Educational tool. Click any number to edit. Not financial advice.
      </footer>
    </div>
  );
}
