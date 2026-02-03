'use client';

import Image from 'next/image';
import { Domain } from '@/stores/financial-store';

interface HotspotProps {
  label: string;
  value: string;
  position: { top: string; left: string };
  color: string;
}

interface HeroVisualProps {
  domain: Domain;
  hotspots?: HotspotProps[];
  trendValue?: string;
  trendLabel?: string;
}

const domainVisuals: Record<string, { emoji: string; gradient: string; image: string }> = {
  car: { emoji: '🚗', gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent', image: '/images/hero-car.png' },
  house: { emoji: '🏠', gradient: 'from-amber-500/20 via-orange-500/10 to-transparent', image: '/images/hero-house.png' },
  land: { emoji: '🏞️', gradient: 'from-green-500/20 via-emerald-500/10 to-transparent', image: '/images/hero-land.png' },
  creditCard: { emoji: '💳', gradient: 'from-purple-500/20 via-pink-500/10 to-transparent', image: '/images/hero-creditcard.png' },
  studentLoan: { emoji: '🎓', gradient: 'from-indigo-500/20 via-violet-500/10 to-transparent', image: '/images/hero-studentloan.png' },
  medical: { emoji: '🏥', gradient: 'from-red-500/20 via-rose-500/10 to-transparent', image: '/images/hero-medical.png' },
  personal: { emoji: '💵', gradient: 'from-emerald-500/20 via-green-500/10 to-transparent', image: '/images/hero-personal.png' },
  recreation: { emoji: '🚤', gradient: 'from-sky-500/20 via-blue-500/10 to-transparent', image: '/images/hero-recreation.png' },
  custom: { emoji: '➕', gradient: 'from-slate-500/20 via-gray-500/10 to-transparent', image: '/images/hero-custom.png' },
};

export default function HeroVisual({ domain, hotspots = [], trendValue, trendLabel }: HeroVisualProps) {
  const visual = domainVisuals[domain] || domainVisuals.car;

  return (
    <div className={`relative bg-gradient-to-br ${visual.gradient} rounded-3xl border border-slate-700 p-6 h-full min-h-[400px] flex flex-col items-center justify-center overflow-hidden`}>
      <div className="relative w-full max-w-[280px] aspect-[4/3]">
        <Image
          src={visual.image}
          alt={`${domain} hero`}
          fill
          sizes="(max-width: 768px) 100vw, 280px"
          className="object-contain drop-shadow-2xl"
          priority
        />
        
        {hotspots.map((hotspot, i) => (
          <div
            key={i}
            className="absolute group cursor-pointer"
            style={{ top: hotspot.position.top, left: hotspot.position.left }}
          >
            <div className={`w-3 h-3 rounded-full ${hotspot.color} animate-ping absolute`} />
            <div className={`w-3 h-3 rounded-full ${hotspot.color} relative`} />
            <div className="absolute left-5 top-1/2 -translate-y-1/2 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              <p className="text-xs text-gray-400">{hotspot.label}</p>
              <p className="text-sm font-bold text-white">{hotspot.value}</p>
            </div>
          </div>
        ))}
      </div>

      {trendValue && (
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-emerald-400">💰</span>
            <span className="text-xl font-bold text-white">{trendValue}</span>
          </div>
          <p className="text-xs text-gray-400">{trendLabel}</p>
          <div className="mt-3 h-10 flex items-end gap-0.5">
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
