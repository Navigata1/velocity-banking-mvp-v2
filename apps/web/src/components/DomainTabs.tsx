'use client';

interface DomainTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'car', label: 'Car', icon: '🚗' },
  { id: 'house', label: 'House', icon: '🏠' },
  { id: 'land', label: 'Land', icon: '🏞️' },
  { id: 'vault', label: 'Vault', icon: '🏦' },
];

export default function DomainTabs({ activeTab, onTabChange }: DomainTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-emerald-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
