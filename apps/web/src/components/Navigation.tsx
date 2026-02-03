'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFinancialStore } from '@/stores/financial-store';
import { useEffect, useState } from 'react';

const domainIcons: Record<string, string> = {
  car: '🚗',
  house: '🏠',
  land: '🏞️',
  creditCard: '💳',
  studentLoan: '🎓',
  medical: '🏥',
  personal: '💵',
  recreation: '🚤',
  custom: '➕',
};

export default function Navigation() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const activeDomain = useFinancialStore((state) => state.activeDomain);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dashboardIcon = mounted ? (domainIcons[activeDomain] || '🚗') : '🚗';

  const navItems = [
    { href: '/', label: 'Dashboard', icon: dashboardIcon, isDynamic: true },
    { href: '/simulator', label: 'Simulator', icon: '📊' },
    { href: '/cockpit', label: 'Cockpit', icon: '✈️' },
    { href: '/learn', label: 'Learn', icon: '📚' },
    { href: '/vault', label: 'Wealth Timeline', icon: '🏆' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 md:relative md:border-t-0 md:border-r md:w-64 md:min-h-screen">
      <div className="px-4 py-2 md:p-6">
        <h1 className="hidden md:block text-xl font-bold text-white mb-8">
          VelocityBank
        </h1>
        <div className="flex justify-around md:flex-col md:space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                pathname === item.href
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              } ${item.isDynamic ? 'relative' : ''}`}
            >
              <span className={`text-xl ${item.isDynamic ? 'transition-transform duration-200' : ''}`}>
                {item.icon}
              </span>
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="hidden md:block absolute bottom-6 left-6 right-6">
        <p className="text-xs text-gray-500 text-center">
          Educational tool. Not financial advice.
        </p>
      </div>
    </nav>
  );
}
