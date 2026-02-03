'use client';

import { useState } from 'react';
import DomainTabs from '@/components/DomainTabs';
import HeroVisual from '@/components/HeroVisual';
import VitalsGrid from '@/components/VitalsGrid';
import ActionFeed from '@/components/ActionFeed';
import { formatCurrency } from '@/engine/calculations';

const domainData = {
  car: {
    title: 'Car Dashboard',
    subtitle: 'Your velocity banking command center',
    hotspots: [
      { label: 'Engine (Cash Flow)', value: '$1,500/mo', position: { top: '20%', left: '80%' }, color: 'bg-emerald-500' },
      { label: 'Fuel Leak (Interest)', value: '$3.29/day', position: { top: '60%', left: '10%' }, color: 'bg-amber-500' },
      { label: 'Speed (ETA)', value: '22 months', position: { top: '80%', left: '75%' }, color: 'bg-blue-500' },
      { label: 'Tank (LOC Available)', value: '$8,500', position: { top: '40%', left: '5%' }, color: 'bg-cyan-500' },
    ],
    trendValue: '$18,500',
    trendLabel: 'remaining balance',
    vitals: [
      { icon: '💰', label: 'Cash Flow', value: '$1,500/mo', sublabel: 'Income - Expenses' },
      { icon: '🔥', label: 'Interest Burn', value: '$3.29/day', sublabel: '$100/month' },
      { icon: '🎯', label: 'Car Loan Balance', value: '$18,450', sublabel: '@ 6.9% APR' },
      { icon: '📅', label: 'Next Move', value: 'Chunk in 14 days', sublabel: '$400 payment ready' },
    ],
    actions: [
      { id: '1', type: 'action' as const, title: 'Payday Incoming', subtitle: 'Deposit to LOC tomorrow', icon: '💵', chart: 'line' as const },
      { id: '2', type: 'tip' as const, title: 'Expense Card Due', subtitle: 'Pay in full in 3 days', icon: '💳', chart: 'bars' as const },
      { id: '3', type: 'milestone' as const, title: 'Cash Flow Unlocked!', subtitle: 'You freed $160/mo last month', icon: '🎉' },
      { id: '4', type: 'alert' as const, title: 'Emergency Mode', subtitle: 'Tap if unexpected expense hits', icon: '🚨' },
    ],
  },
  house: {
    title: 'House Dashboard',
    subtitle: 'Mortgage acceleration headquarters',
    hotspots: [
      { label: 'Roof (Principal)', value: '$285,000', position: { top: '10%', left: '50%' }, color: 'bg-amber-500' },
      { label: 'Basement (HELOC)', value: '$45,000 avail', position: { top: '85%', left: '50%' }, color: 'bg-cyan-500' },
      { label: 'Pipes (Money Flow)', value: '+$2,100/mo', position: { top: '50%', left: '90%' }, color: 'bg-emerald-500' },
      { label: 'Fire (Interest Burn)', value: '$49/day', position: { top: '50%', left: '10%' }, color: 'bg-red-500' },
    ],
    trendValue: '$285,000',
    trendLabel: 'mortgage remaining',
    vitals: [
      { icon: '🏠', label: 'Mortgage Balance', value: '$285,000', sublabel: '@ 6.5% APR' },
      { icon: '🏦', label: 'HELOC Available', value: '$45,000', sublabel: '$15,000 used' },
      { icon: '📉', label: 'Interest Saved (YTD)', value: '$4,230', sublabel: 'vs traditional path' },
      { icon: '⏩', label: 'Next Chunk', value: '$3,000 in 8 days', sublabel: 'Schedule jump: 4 months' },
    ],
    actions: [
      { id: '1', type: 'milestone' as const, title: 'Chunk #3 Complete!', subtitle: 'Moved payoff 6 months forward', icon: '🎯', chart: 'line' as const },
      { id: '2', type: 'action' as const, title: 'HELOC Payment Due', subtitle: 'Interest-only: $87', icon: '📋' },
      { id: '3', type: 'tip' as const, title: 'Optimize Timing', subtitle: 'Best chunk day: the 5th', icon: '💡', chart: 'bars' as const },
      { id: '4', type: 'milestone' as const, title: 'Payoff Accelerated', subtitle: 'Now 7.2 years ahead of schedule', icon: '🚀' },
    ],
  },
  land: {
    title: 'Land Dashboard',
    subtitle: 'Property investment tracker',
    hotspots: [
      { label: 'Land Value', value: '$125,000', position: { top: '30%', left: '70%' }, color: 'bg-green-500' },
      { label: 'Loan Balance', value: '$85,000', position: { top: '70%', left: '30%' }, color: 'bg-amber-500' },
      { label: 'Equity Built', value: '$40,000', position: { top: '20%', left: '20%' }, color: 'bg-emerald-500' },
      { label: 'Monthly Payment', value: '$650', position: { top: '80%', left: '80%' }, color: 'bg-blue-500' },
    ],
    trendValue: '$85,000',
    trendLabel: 'land loan remaining',
    vitals: [
      { icon: '🏞️', label: 'Land Loan Balance', value: '$85,000', sublabel: '@ 7.2% APR' },
      { icon: '📈', label: 'Current Equity', value: '$40,000', sublabel: '32% of value' },
      { icon: '🔥', label: 'Interest Burn', value: '$16.77/day', sublabel: '$510/month' },
      { icon: '🎯', label: 'Debt-Free ETA', value: '18 months', sublabel: 'With velocity strategy' },
    ],
    actions: [
      { id: '1', type: 'action' as const, title: 'Development Permit', subtitle: 'Approved - value increase expected', icon: '📋', chart: 'line' as const },
      { id: '2', type: 'tip' as const, title: 'Land Appreciation', subtitle: 'Up 8% in your area this year', icon: '📈', chart: 'bars' as const },
      { id: '3', type: 'milestone' as const, title: 'Halfway Point', subtitle: 'Loan now under $90k', icon: '🎉' },
      { id: '4', type: 'action' as const, title: 'Next Payment', subtitle: 'Chunk $1,200 in 5 days', icon: '💵' },
    ],
  },
  vault: {
    title: 'Vault Dashboard',
    subtitle: 'Your wealth building command center',
    hotspots: [
      { label: 'Net Worth', value: '$142,000', position: { top: '30%', left: '70%' }, color: 'bg-emerald-500' },
      { label: 'Interest Avoided', value: '$188,400', position: { top: '60%', left: '20%' }, color: 'bg-green-500' },
      { label: 'Freedom Fund', value: '$12,000', position: { top: '20%', left: '30%' }, color: 'bg-blue-500' },
      { label: 'Monthly Surplus', value: '$2,100', position: { top: '75%', left: '75%' }, color: 'bg-amber-500' },
    ],
    trendValue: '$142,000',
    trendLabel: 'net worth',
    vitals: [
      { icon: '💎', label: 'Net Worth', value: '$142,000', sublabel: 'Up $18k this year' },
      { icon: '🛡️', label: 'Interest Avoided', value: '$188,400', sublabel: 'Lifetime savings' },
      { icon: '🏦', label: 'Freedom Fund', value: '$12,000', sublabel: '6 months expenses' },
      { icon: '🎯', label: 'Next Goal', value: 'Max Roth IRA', sublabel: '$6,500 remaining' },
    ],
    actions: [
      { id: '1', type: 'milestone' as const, title: 'Debt-Free Achieved!', subtitle: 'All consumer debt eliminated', icon: '🎉', chart: 'line' as const },
      { id: '2', type: 'action' as const, title: 'Investment Opportunity', subtitle: 'Index fund contribution ready', icon: '📈', chart: 'bars' as const },
      { id: '3', type: 'tip' as const, title: 'Share Your Journey', subtitle: 'Generate shareable results card', icon: '📱' },
      { id: '4', type: 'milestone' as const, title: 'Generational Impact', subtitle: 'Breaking the debt cycle', icon: '👨‍👩‍👧‍👦' },
    ],
  },
};

export default function Dashboard() {
  const [activeDomain, setActiveDomain] = useState<'car' | 'house' | 'land' | 'vault'>('car');
  const data = domainData[activeDomain];

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
        
        <DomainTabs activeTab={activeDomain} onTabChange={(tab) => setActiveDomain(tab as 'car' | 'house' | 'land' | 'vault')} />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <HeroVisual
            domain={activeDomain}
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
          <VitalsGrid vitals={data.vitals} />
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
        Educational tool. Not financial advice.
      </footer>
    </div>
  );
}
