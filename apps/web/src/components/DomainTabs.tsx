'use client';

import { useState, useRef, useEffect } from 'react';
import {
  CarFront,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  GraduationCap,
  HeartPulse,
  House,
  Map,
  Sailboat,
  Shapes,
  type LucideIcon,
} from 'lucide-react';
import { useFinancialStore, Domain, domainSubcategories } from '@/stores/financial-store';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { useIsClient } from '@/hooks/useIsClient';

interface DomainTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs: { id: Domain; label: string; icon: LucideIcon }[] = [
  { id: 'car', label: 'Auto', icon: CarFront },
  { id: 'house', label: 'House', icon: House },
  { id: 'land', label: 'Land', icon: Map },
  { id: 'creditCard', label: 'Credit Card', icon: CreditCard },
  { id: 'studentLoan', label: 'Student Loan', icon: GraduationCap },
  { id: 'medical', label: 'Medical', icon: HeartPulse },
  { id: 'personal', label: 'Personal', icon: CircleDollarSign },
  { id: 'recreation', label: 'Recreation', icon: Sailboat },
  { id: 'custom', label: 'Custom', icon: Shapes },
];

export default function DomainTabs({ activeTab, onTabChange }: DomainTabsProps) {
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const mounted = useIsClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const store = useFinancialStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const classes = themeClasses[mounted ? theme : 'original'];

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      setDropdownOpen(dropdownOpen === tabId ? null : tabId);
    } else {
      onTabChange(tabId);
      setDropdownOpen(null);
    }
  };

  const handleSubcategorySelect = (domain: Domain, subcatId: string) => {
    store.setSubcategory(domain, subcatId);
    setDropdownOpen(null);
  };

  return (
    <div
      role="tablist"
      aria-label="Financial domain"
      className={`relative flex w-max min-w-full flex-nowrap justify-start gap-1 p-1 ${classes.glass} rounded-md`}
      ref={dropdownRef}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const hasDropdown = dropdownOpen === tab.id;
        const Icon = tab.icon;
        const subcategories = domainSubcategories[tab.id];
        
        return (
          <div key={tab.id} className="relative">
            <button
              type="button"
              role="tab"
              onClick={() => handleTabClick(tab.id)}
              aria-label={isActive ? `${tab.label} domain options` : `Switch to ${tab.label} domain`}
              aria-controls={isActive ? `domain-options-${tab.id}` : undefined}
              aria-expanded={isActive ? hasDropdown : undefined}
              aria-selected={isActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all text-sm ${
                isActive
                  ? `${classes.glassButton} text-emerald-400 ring-1 ring-emerald-500/50`
                  : `${classes.textSecondary} hover:${classes.text} hover:bg-slate-700/30`
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span className="hidden sm:inline">{tab.label}</span>
              {isActive && (
                <ChevronDown
                  aria-hidden="true"
                  className={`ml-1 h-3.5 w-3.5 transition-transform ${hasDropdown ? 'rotate-180' : ''}`}
                />
              )}
            </button>
            
            {hasDropdown && (
              <div 
                id={`domain-options-${tab.id}`}
                className={`absolute top-full left-0 mt-2 ${classes.dropdown} rounded-xl shadow-2xl overflow-hidden min-w-[220px] animate-in fade-in slide-in-from-top-2 duration-200`}
                style={{ zIndex: 9999 }}
              >
                <div className={`p-2 border-b ${classes.border}`}>
                  <p className={`text-xs ${classes.textSecondary} font-medium px-2`}>Select {tab.label} Type</p>
                </div>
                <div className="p-2 max-h-[300px] overflow-y-auto">
                  {subcategories.map((subcat) => {
                    const isSelected = store.getActiveSubcategory(tab.id)?.id === subcat.id;
                    return (
                      <button
                        type="button"
                        key={subcat.id}
                        onClick={() => handleSubcategorySelect(tab.id, subcat.id)}
                        aria-label={`Use ${subcat.label} for ${tab.label}`}
                        aria-pressed={isSelected}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-500/30 text-emerald-500 font-semibold'
                            : `${classes.text} hover:bg-emerald-500/10`
                        }`}
                      >
                        <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${isSelected ? 'text-emerald-500' : classes.text}`}>{subcat.label}</p>
                          <p className={`text-xs ${classes.textSecondary}`}>{subcat.description}</p>
                        </div>
                        {isSelected && <Check aria-hidden="true" className="h-4 w-4 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { tabs };
