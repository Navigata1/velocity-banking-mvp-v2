'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFinancialStore, Domain } from '@/stores/financial-store';
import { useEffect, useState, useCallback } from 'react';

const aiResponses: Record<string, string[]> = {
  greeting: [
    "Hi! I'm your VelocityBank assistant. I can help explain velocity banking concepts, answer questions about your debt payoff strategy, or guide you through the app. What would you like to know?",
  ],
  velocity: [
    "Velocity Banking uses a line of credit (LOC) as a hub for your income and expenses. By depositing your paycheck into the LOC, you reduce your average daily balance and pay less interest. Then you make 'chunk' payments to your main debt.",
    "The key is your positive cash flow - the difference between income and expenses. This surplus becomes your 'chunk power' that accelerates debt payoff.",
  ],
  chunk: [
    "A 'chunk' is a lump-sum payment from your LOC to your primary debt. Larger chunks made more frequently accelerate your payoff and reduce total interest paid.",
    "The optimal chunk strategy depends on your cash flow. Generally, making chunks when your LOC balance approaches your available credit keeps the strategy efficient.",
  ],
  loc: [
    "Your Line of Credit (LOC) is the heart of velocity banking. It acts as your 'banking hub' where you deposit income and pay expenses, keeping the average balance low to minimize interest.",
    "Choose an LOC with low or no annual fees, competitive interest rates, and easy access. Home equity lines (HELOCs) often have the lowest rates.",
  ],
  fallback: [
    "Great question! While I'm a simple assistant, I recommend checking out the Learn section for detailed lessons on velocity banking concepts.",
    "I'm here to help! For more detailed information, the Learn page has comprehensive lessons and a glossary of terms.",
  ],
};

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('velocity') || lower.includes('how does') || lower.includes('what is velocity')) {
    return aiResponses.velocity[Math.floor(Math.random() * aiResponses.velocity.length)];
  }
  if (lower.includes('chunk') || lower.includes('payment')) {
    return aiResponses.chunk[Math.floor(Math.random() * aiResponses.chunk.length)];
  }
  if (lower.includes('loc') || lower.includes('line of credit') || lower.includes('heloc')) {
    return aiResponses.loc[Math.floor(Math.random() * aiResponses.loc.length)];
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('help')) {
    return aiResponses.greeting[0];
  }
  return aiResponses.fallback[Math.floor(Math.random() * aiResponses.fallback.length)];
}

export default function Navigation() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: aiResponses.greeting[0] }
  ]);
  const store = useFinancialStore();
  const activeDomain = store.activeDomain;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAISubmit = useCallback(() => {
    if (!aiQuery.trim()) return;
    const userMessage = aiQuery.trim();
    setAiMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setAiQuery('');
    setTimeout(() => {
      const response = getAIResponse(userMessage);
      setAiMessages(prev => [...prev, { role: 'ai', text: response }]);
    }, 500);
  }, [aiQuery]);

  const activeSubcat = mounted ? store.getActiveSubcategory(activeDomain as Domain) : null;
  const dashboardIcon = activeSubcat?.icon || '🚗';

  const navItems = [
    { href: '/', label: 'Dashboard', icon: dashboardIcon, isDynamic: true },
    { href: '/simulator', label: 'Simulator', icon: '📊' },
    { href: '/cockpit', label: 'Cockpit', icon: '✈️' },
    { href: '/learn', label: 'Learn', icon: '📚' },
    { href: '/vault', label: 'Wealth Timeline', icon: '🏆' },
  ];

  return (
    <>
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
            
            <button
              onClick={() => setShowAI(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-400 hover:text-white hover:bg-gray-800 md:mt-4 md:border-t md:border-gray-700 md:pt-4"
            >
              <span className="text-xl">🤖</span>
              <span className="hidden md:inline">AI Assistant</span>
            </button>
          </div>
        </div>
        <div className="hidden md:block absolute bottom-6 left-6 right-6">
          <p className="text-xs text-gray-500 text-center">
            Educational tool. Not financial advice.
          </p>
        </div>
      </nav>

      {showAI && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <h3 className="text-white font-semibold">VelocityBank AI</h3>
                  <p className="text-gray-400 text-sm">Ask me about velocity banking</p>
                </div>
              </div>
              <button
                onClick={() => setShowAI(false)}
                className="text-gray-400 hover:text-white p-2"
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
                      : 'bg-slate-700 text-gray-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAISubmit()}
                  placeholder="Ask about velocity banking..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleAISubmit}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
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
