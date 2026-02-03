'use client';

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

const typeStyles = {
  action: 'bg-blue-500',
  milestone: 'bg-emerald-500',
  tip: 'bg-amber-500',
  alert: 'bg-red-500',
};

export default function ActionFeed({ cards }: ActionFeedProps) {
  return (
    <div className="space-y-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`${typeStyles[card.type]} rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-transform`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {card.icon && (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
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
