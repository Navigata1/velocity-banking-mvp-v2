'use client';

import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { useState, useEffect } from 'react';

interface ActionCard {
  id: string;
  type: 'action' | 'milestone' | 'tip' | 'alert';
  title: string;
  subtitle: string;
  icon?: string;
  chart?: 'line' | 'bars';
}

interface ActionFeedProps {
  cards: ActionCard[];
}

const typeGradients = {
  action: 'from-blue-600/80 via-blue-500/60 to-blue-700/80',
  milestone: 'from-emerald-600/80 via-emerald-500/60 to-emerald-700/80',
  tip: 'from-amber-600/80 via-amber-500/60 to-amber-700/80',
  alert: 'from-red-600/80 via-red-500/60 to-red-700/80',
};

export default function ActionFeed({ cards }: ActionFeedProps) {
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const classes = themeClasses[mounted ? theme : 'original'];

  return (
    <div className="space-y-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`bg-gradient-to-br ${typeGradients[card.type]} backdrop-blur-xl border border-white/10 rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-lg`}
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {card.icon && (
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                  <span className="text-xl">{card.icon}</span>
                </div>
              )}
              <div>
                <p className="font-medium text-white">{card.title}</p>
                <p className="text-sm text-white/70">{card.subtitle}</p>
              </div>
            </div>
            {card.chart && (
              <div className="flex items-end gap-0.5 h-8">
                {card.chart === 'line' ? (
                  <svg viewBox="0 0 50 20" className="w-12 h-6">
                    <path
                      d="M0,15 Q10,10 20,12 T40,5 T50,8"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  [6, 10, 8, 14, 12, 16].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-white/50 rounded-t"
                      style={{ height: `${h * 2}px` }}
                    />
                  ))
                )}
              </div>
            )}
            <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
