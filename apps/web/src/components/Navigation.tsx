'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useFinancialStore, Domain } from '@/stores/financial-store';
import { useThemeStore, themeClasses, Theme } from '@/stores/theme-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import { getGuardianResponse } from '@/data/shield-guardian-qa';
import { useState, useCallback } from 'react';
import { useIsClient } from '@/hooks/useIsClient';

const themeOptions: { value: Theme; label: string; icon: string }[] = [
  { value: 'original', label: 'Original', icon: '🌙' },
  { value: 'dark', label: 'Dark', icon: '⚫' },
  { value: 'light', label: 'Light', icon: '☀️' },
];

const navIconTokens: Record<string, string> = {
  '/': 'DB',
  '/simulator': 'SIM',
  '/cockpit': 'CK',
  '/learn': 'LRN',
  '/portfolio': 'PF',
  '/vault': 'WT',
  '/settings': 'SET',
};

const themeIconTokens: Record<Theme, string> = {
  original: 'OR',
  dark: 'DK',
  light: 'LT',
};

function NavIconToken({ token }: { token: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-current/10 text-[11px] font-bold leading-none tracking-normal"
    >
      {token}
    </span>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const mounted = useIsClient();
  const [showAI, setShowAI] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: "Hi! I'm your Velocity Guardian. I can help explain velocity banking concepts, answer questions about debt payoff strategy, or guide you through the app. What would you like to know?" }
  ]);
  const store = useFinancialStore();
  const activeDomain = store.activeDomain;
  const { theme, setTheme } = useThemeStore();
  const { teacherMode, setTeacherMode } = usePreferencesStore();

  const handleAISubmit = useCallback(() => {
    if (!aiQuery.trim()) return;
    const userMessage = aiQuery.trim();
    setAiMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setAiQuery('');
    setTimeout(() => {
      const response = getGuardianResponse(userMessage, {
        teacherMode,
        context: {
          monthlyIncome: store.monthlyIncome,
          monthlyExpenses: store.monthlyExpenses,
          cashFlow: store.monthlyIncome - store.monthlyExpenses,
          activeDomainLabel: store.activeDomain,
        }
      });
      setAiMessages(prev => [...prev, { role: 'ai', text: response }]);
    }, 300);
  }, [aiQuery, teacherMode, store]);

  const activeSubcat = mounted ? store.getActiveSubcategory(activeDomain as Domain) : null;
  const dashboardIcon = activeSubcat?.icon || '🚗';
  const classes = themeClasses[mounted ? theme : 'original'];

  const navItems = [
    { href: '/', label: 'Dashboard', icon: dashboardIcon, isDynamic: true },
    { href: '/simulator', label: 'Simulator', icon: '📊' },
    { href: '/cockpit', label: 'Cockpit', icon: '✈️' },
    { href: '/learn', label: 'Learn', icon: '📚' },
    { href: '/portfolio', label: 'Portfolio', icon: '📋' },
    { href: '/vault', label: 'Wealth Timeline', icon: '🏆' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <>
      <nav
        aria-label="Primary navigation"
        data-testid="primary-navigation"
        className={`fixed bottom-0 left-0 right-0 z-50 ${classes.nav} border-t md:relative md:border-t-0 md:border-r md:w-64 md:min-h-screen`}
      >
        <div className="px-4 py-2 md:p-6">
          <div className="hidden md:block mb-8">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo-64.png" 
                alt="InterestShield Logo" 
                width={40}
                height={40}
                className="w-10 h-10 flex-shrink-0"
              />
              <div>
                <h1 className={`text-xl font-bold ${classes.text}`}>InterestShield</h1>
                <p className={`text-[10px] ${classes.textSecondary} tracking-wide uppercase`}>Powered by Velocity Banking</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-8 gap-1 md:flex md:flex-col md:space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={`flex min-h-12 min-w-0 items-center justify-center gap-3 rounded-xl px-2 py-3 transition-all md:justify-start md:px-4 ${
                  pathname === item.href
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : `${classes.textSecondary} hover:${classes.text} hover:bg-slate-800/50`
                } ${item.isDynamic ? 'relative' : ''}`}
              >
                <NavIconToken token={navIconTokens[item.href]} />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            ))}
            
            <button
              type="button"
              onClick={() => setShowAI(true)}
              className="flex min-h-12 min-w-0 items-center justify-center gap-3 rounded-xl px-2 py-3 text-gray-400 transition-all hover:bg-gray-800 hover:text-white md:hidden [&>span:last-child]:hidden"
              aria-label="Open Velocity Guardian"
            >
              <NavIconToken token="AI" />
              <span className="text-xl">🛡️</span>
            </button>
          </div>
          
          <button
            type="button"
            onClick={() => setShowAI(true)}
            aria-label="Open Velocity Guardian"
            className={`hidden md:flex group relative w-full flex-col items-center gap-2 p-3 mt-4 rounded-2xl ${classes.glassButton}`}
            style={{ perspective: '500px' }}
          >
            <div 
              className="relative w-16 h-16 group-hover:scale-110 transition-transform duration-300"
              style={{ animation: 'float 3s ease-in-out infinite' }}
            >
              <Image
                src="/shield-guardian.png"
                alt="Velocity Guardian"
                fill
                sizes="64px"
                loading="eager"
                className="object-contain drop-shadow-lg"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.3))' }}
              />
            </div>
            <span className="text-sm font-medium text-emerald-400 group-hover:text-emerald-300">Velocity Guardian</span>
            <span className={`text-xs ${classes.textSecondary}`}>Ask me anything</span>
          </button>
          
          <div className="hidden md:block mt-6">
            <button
              type="button"
              onClick={() => setShowThemes(!showThemes)}
              aria-label="Choose theme"
              aria-expanded={showThemes}
              aria-haspopup="true"
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl ${classes.glassButton}`}
            >
              <span className={`text-sm ${classes.textSecondary}`}>Theme</span>
              <NavIconToken token={themeIconTokens[theme]} />
            </button>
            
            {showThemes && (
              <div className={`mt-2 p-2 rounded-xl ${classes.glass}`}>
                {themeOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => { setTheme(option.value); setShowThemes(false); }}
                    aria-label={`Use ${option.label} theme`}
                    aria-pressed={theme === option.value}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                      theme === option.value 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : `${classes.textSecondary} hover:bg-slate-700/50`
                    }`}
                  >
                    <NavIconToken token={themeIconTokens[option.value]} />
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="hidden md:block absolute bottom-4 left-4 right-4">
          <p className={`text-xs ${classes.textSecondary} text-center`}>
            Educational tool. Not financial advice.
          </p>
        </div>
        
      </nav>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotateY(0deg); }
          50% { transform: translateY(-5px) rotateY(10deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.05); }
        }
      `}</style>

      {showAI && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="velocity-guardian-title"
            className={`${classes.bgSecondary} rounded-2xl ${classes.border} border w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl`}
          >
            <div className={`flex items-center justify-between p-4 border-b ${classes.border} bg-gradient-to-r from-emerald-900/30 to-transparent`}>
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14">
                  <Image
                    src="/shield-guardian.png"
                    alt="Velocity Guardian"
                    fill
                    sizes="56px"
                    className="object-contain"
                    style={{
                      filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.4))',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />
                </div>
                <div>
                  <h3 id="velocity-guardian-title" className={`${classes.text} font-semibold text-lg`}>Velocity Guardian</h3>
                  <p className="text-emerald-400 text-sm">Your interest protection guide</p>
                </div>
              </div>
               <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTeacherMode(!teacherMode)}
                  aria-pressed={teacherMode}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${teacherMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-transparent text-gray-400 border-slate-600/50 hover:border-slate-500/70'}`}
                  title="Teacher Mode formats answers as: what it means → what to do next → why it works"
                >
                  {teacherMode ? 'Teacher Mode: On' : 'Teacher Mode: Off'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAI(false)}
                aria-label="Close Velocity Guardian"
                className={`${classes.textSecondary} hover:${classes.text} p-2 hover:bg-slate-700/50 rounded-lg transition-colors`}
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white' 
                      : `${classes.bgTertiary} ${classes.text}`
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            
            <div className={`p-4 border-t ${classes.border}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  aria-label="Ask Velocity Guardian a question"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAISubmit()}
                  placeholder="Ask about velocity banking..."
                  className={`flex-1 ${classes.bgTertiary} ${classes.border} border rounded-xl px-4 py-3 ${classes.text} placeholder-gray-400 focus:outline-none focus:border-emerald-500`}
                />
                <button
                  type="button"
                  onClick={handleAISubmit}
                  className={`${classes.glassButton} text-emerald-400 px-6 py-3 rounded-xl font-medium`}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
