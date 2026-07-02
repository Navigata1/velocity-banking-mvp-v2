'use client';

import { useState, useRef, useEffect } from 'react';
import { useFinancialStore, Domain, domainSubcategories } from '@/stores/financial-store';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { useIsClient } from '@/hooks/useIsClient';

interface DomainTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'car', label: 'Auto', defaultIcon: '🚗' },
  { id: 'house', label: 'House', defaultIcon: '🏠' },
  { id: 'land', label: 'Land', defaultIcon: '🏞️' },
  { id: 'creditCard', label: 'Credit Card', defaultIcon: '💳' },
  { id: 'studentLoan', label: 'Student Loan', defaultIcon: '🎓' },
  { id: 'medical', label: 'Medical', defaultIcon: '🏥' },
  { id: 'personal', label: 'Personal', defaultIcon: '💵' },
  { id: 'recreation', label: 'Recreation', defaultIcon: '🚤' },
  { id: 'custom', label: 'Custom', defaultIcon: '➕' },
];

const domainIconTokens: Record<string, string> = {
  car: 'AU',
  house: 'HM',
  land: 'LD',
  creditCard: 'CC',
  studentLoan: 'SL',
  medical: 'MD',
  personal: 'PL',
  recreation: 'RC',
  custom: 'CU',
};

function DomainIconToken({ token }: { token: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-current/10 px-1.5 text-[10px] font-bold leading-none tracking-normal"
    >
      {token}
    </span>
  );
}

function buildSubcategoryToken(label: string): string {
  const words = label
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'DM';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();

  return words.map((word) => word[0]).join('').slice(0, 3).toUpperCase();
}

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

  const getTabToken = (tabId: string) => {
    return domainIconTokens[tabId] ?? 'DM';
  };

  return (
    <div
      role="tablist"
      aria-label="Financial domain"
      className={`relative flex flex-wrap justify-center gap-1.5 p-1.5 ${classes.glass} rounded-xl`}
      ref={dropdownRef}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const hasDropdown = dropdownOpen === tab.id;
        const currentToken = getTabToken(tab.id);
        const subcategories = domainSubcategories[tab.id as Domain];
        
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
              <DomainIconToken token={currentToken} />
              <span className="hidden sm:inline">{tab.label}</span>
              {isActive && (
                <span aria-hidden="true" className={`ml-1 text-[10px] transition-transform ${hasDropdown ? 'rotate-180' : ''}`}>
                  v
                </span>
              )}
              {isActive && (
                <span className="hidden">
                  ▼
                </span>
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
                    const isSelected = store.getActiveSubcategory(tab.id as Domain)?.id === subcat.id;
                    return (
                      <button
                        type="button"
                        key={subcat.id}
                        onClick={() => handleSubcategorySelect(tab.id as Domain, subcat.id)}
                        aria-label={`Use ${subcat.label} for ${tab.label}`}
                        aria-pressed={isSelected}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all [&>span:last-child]:hidden ${
                          isSelected
                            ? 'bg-emerald-500/30 text-emerald-500 font-semibold'
                            : `${classes.text} hover:bg-emerald-500/10`
                        }`}
                      >
                        <DomainIconToken token={buildSubcategoryToken(subcat.label)} />
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${isSelected ? 'text-emerald-500' : classes.text}`}>{subcat.label}</p>
                          <p className={`text-xs ${classes.textSecondary}`}>{subcat.description}</p>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-semibold text-emerald-500">On</span>
                        )}
                        {isSelected && (
                          <span className="text-emerald-500">✓</span>
                        )}
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
