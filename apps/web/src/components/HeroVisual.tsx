'use client';

interface HotspotProps {
  label: string;
  value: string;
  position: { top: string; left: string };
  color: string;
}

interface HeroVisualProps {
  domain: 'car' | 'house' | 'land' | 'vault';
  hotspots?: HotspotProps[];
  trendValue?: string;
  trendLabel?: string;
}

const domainVisuals: Record<string, { emoji: string; gradient: string }> = {
  car: { emoji: '🚗', gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent' },
  house: { emoji: '🏠', gradient: 'from-amber-500/20 via-orange-500/10 to-transparent' },
  land: { emoji: '🏞️', gradient: 'from-green-500/20 via-emerald-500/10 to-transparent' },
  vault: { emoji: '🏦', gradient: 'from-purple-500/20 via-violet-500/10 to-transparent' },
};

export default function HeroVisual({ domain, hotspots = [], trendValue, trendLabel }: HeroVisualProps) {
  const visual = domainVisuals[domain];

  return (
    <div className={`relative bg-gradient-to-br ${visual.gradient} rounded-3xl border border-slate-700 p-8 h-full min-h-[400px] flex flex-col items-center justify-center`}>
      <div className="relative">
        <div className="text-[120px] md:text-[160px] animate-pulse">
          {visual.emoji}
        </div>
        
        {hotspots.map((hotspot, i) => (
          <div
            key={i}
            className="absolute group cursor-pointer"
            style={{ top: hotspot.position.top, left: hotspot.position.left }}
          >
            <div className={`w-4 h-4 rounded-full ${hotspot.color} animate-ping absolute`} />
            <div className={`w-4 h-4 rounded-full ${hotspot.color} relative`} />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              <p className="text-xs text-gray-400">{hotspot.label}</p>
              <p className="text-sm font-bold text-white">{hotspot.value}</p>
            </div>
          </div>
        ))}
      </div>

      {trendValue && (
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-emerald-400">💰</span>
            <span className="text-2xl font-bold text-white">{trendValue}</span>
          </div>
          <p className="text-sm text-gray-400">{trendLabel}</p>
          <div className="mt-4 h-12 flex items-end gap-1">
            {[40, 35, 45, 30, 50, 42, 38, 55, 48, 60, 52, 65].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-emerald-500/30 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
