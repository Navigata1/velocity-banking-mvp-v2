'use client';

import Image from 'next/image';

interface DomainTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'car', label: 'Auto', icon: '🚗', image: '/images/hero-car.png' },
  { id: 'house', label: 'House', icon: '🏠', image: '/images/hero-house.png' },
  { id: 'land', label: 'Land', icon: '🏞️', image: '/images/hero-land.png' },
  { id: 'creditCard', label: 'Credit Card', icon: '💳', image: '/images/hero-creditcard.png' },
  { id: 'studentLoan', label: 'Student Loan', icon: '🎓', image: '/images/hero-studentloan.png' },
  { id: 'medical', label: 'Medical', icon: '🏥', image: '/images/hero-medical.png' },
  { id: 'personal', label: 'Personal', icon: '💵', image: '/images/hero-personal.png' },
  { id: 'recreation', label: 'Recreation', icon: '🚤', image: '/images/hero-recreation.png' },
  { id: 'custom', label: 'Custom', icon: '➕', image: '/images/hero-custom.png' },
];

export default function DomainTabs({ activeTab, onTabChange }: DomainTabsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-800/50 rounded-xl border border-slate-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all text-sm ${
            activeTab === tab.id
              ? 'bg-emerald-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <span className="text-base">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export { tabs };
