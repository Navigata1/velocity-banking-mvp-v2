'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '🚗' },
  { href: '/simulator', label: 'Simulator', icon: '📊' },
  { href: '/cockpit', label: 'Cockpit', icon: '✈️' },
  { href: '/learn', label: 'Learn', icon: '📚' },
  { href: '/vault', label: 'Vault', icon: '🏦' },
];

export default function Navigation() {
  const pathname = usePathname();

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
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                pathname === item.href
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
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
