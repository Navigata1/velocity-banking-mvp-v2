'use client';

import Image from 'next/image';
import { Domain, useFinancialStore, domainSubcategories } from '@/stores/financial-store';
import { useState, useEffect } from 'react';

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

const domainGradients: Record<string, string> = {
  car: 'from-blue-600/30 via-cyan-500/20 to-blue-900/40',
  house: 'from-amber-600/30 via-orange-500/20 to-amber-900/40',
  land: 'from-green-600/30 via-emerald-500/20 to-green-900/40',
  creditCard: 'from-purple-600/30 via-pink-500/20 to-purple-900/40',
  studentLoan: 'from-indigo-600/30 via-violet-500/20 to-indigo-900/40',
  medical: 'from-red-600/30 via-rose-500/20 to-red-900/40',
  personal: 'from-emerald-600/30 via-green-500/20 to-emerald-900/40',
  recreation: 'from-sky-600/30 via-blue-500/20 to-sky-900/40',
  custom: 'from-slate-600/30 via-gray-500/20 to-slate-900/40',
};

const domainFallbackImages: Record<string, string> = {
  car: '/images/hero-car.png',
  house: '/images/hero-house.png',
  land: '/images/hero-land.png',
  creditCard: '/images/hero-creditcard.png',
  studentLoan: '/images/hero-studentloan.png',
  medical: '/images/hero-medical.png',
  personal: '/images/hero-personal.png',
  recreation: '/images/hero-recreation.png',
  custom: '/images/hero-custom.png',
};

const subcategoryImageMap: Record<string, Record<string, string>> = {
  car: {
    sedan: '/heroes/subcategories/auto-sedan.png',
    sports: '/heroes/subcategories/auto-sports.png',
    suv: '/heroes/subcategories/auto-suv.png',
    motorcycle: '/heroes/subcategories/auto-motorcycle.png',
    truck: '/heroes/subcategories/auto-pickup.png',
    semi: '/heroes/subcategories/auto-semi.png',
  },
  house: {
    starter: '/heroes/subcategories/house-starter.png',
    family: '/heroes/subcategories/house-family.png',
    townhouse: '/heroes/subcategories/house-townhouse.png',
    condo: '/heroes/subcategories/house-condo.png',
    luxury: '/heroes/subcategories/house-luxury.png',
    mansion: '/heroes/subcategories/house-mansion.png',
  },
  land: {
    lot: '/heroes/subcategories/land-lot.png',
    acre: '/heroes/subcategories/land-acreage.png',
    farm: '/heroes/subcategories/land-farmland.png',
    ranch: '/heroes/subcategories/land-ranch.png',
    commercial: '/heroes/subcategories/land-commercial.png',
    estate: '/heroes/subcategories/land-estate.png',
  },
  creditCard: {
    basic: '/heroes/subcategories/card-basic.png',
    rewards: '/heroes/subcategories/card-rewards.png',
    store: '/heroes/subcategories/card-store.png',
    premium: '/heroes/subcategories/card-premium.png',
    platinum: '/heroes/subcategories/card-platinum.png',
    black: '/heroes/subcategories/card-black.png',
  },
  studentLoan: {
    community: '/heroes/subcategories/student-community.png',
    state: '/heroes/subcategories/student-state.png',
    private: '/heroes/subcategories/student-private.png',
    graduate: '/heroes/subcategories/student-graduate.png',
    professional: '/heroes/subcategories/student-professional.png',
    phd: '/heroes/subcategories/student-doctorate.png',
  },
  medical: {
    routine: '/heroes/subcategories/medical-routine.png',
    dental: '/heroes/subcategories/medical-dental.png',
    emergency: '/heroes/subcategories/medical-emergency.png',
    surgery: '/heroes/subcategories/medical-surgery.png',
    specialist: '/heroes/subcategories/medical-specialist.png',
    major: '/heroes/subcategories/medical-major.png',
  },
  personal: {
    small: '/heroes/subcategories/personal-small.png',
    medium: '/heroes/subcategories/personal-medium.png',
    consolidation: '/heroes/subcategories/personal-consolidation.png',
    large: '/heroes/subcategories/personal-large.png',
    signature: '/heroes/subcategories/personal-signature.png',
    premium: '/heroes/subcategories/personal-premium.png',
  },
  recreation: {
    jetski: '/heroes/subcategories/recreation-jetski.png',
    boat: '/heroes/subcategories/recreation-boat.png',
    rv: '/heroes/subcategories/recreation-rv.png',
    yacht: '/heroes/subcategories/recreation-yacht.png',
    superyacht: '/heroes/subcategories/recreation-superyacht.png',
    jet: '/heroes/subcategories/recreation-privatejet.png',
  },
  custom: {
    other: '/heroes/subcategories/custom-other.png',
    business: '/heroes/subcategories/custom-business.png',
    equipment: '/heroes/subcategories/custom-equipment.png',
    jewelry: '/heroes/subcategories/custom-jewelry.png',
    art: '/heroes/subcategories/custom-art.png',
    crypto: '/heroes/subcategories/custom-crypto.png',
  },
};

export default function HeroVisual({ domain, hotspots = [], trendValue, trendLabel }: HeroVisualProps) {
  const store = useFinancialStore();
  const subcategory = store.getActiveSubcategory(domain);
  const gradient = domainGradients[domain] || domainGradients.car;
  const [rotationY, setRotationY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const heroImage = subcategoryImageMap[domain]?.[subcategory?.id] || domainFallbackImages[domain] || domainFallbackImages.car;

  useEffect(() => {
    if (isHovered) return;
    
    const interval = setInterval(() => {
      setRotationY(prev => (prev + 0.5) % 360);
    }, 50);
    
    return () => clearInterval(interval);
  }, [isHovered]);

  const rotation3D = isHovered ? 0 : Math.sin(rotationY * Math.PI / 180) * 15;

  return (
    <div 
      className={`relative bg-gradient-to-br ${gradient} rounded-[2.5rem] border border-slate-600/50 p-6 h-full min-h-[400px] flex flex-col items-center justify-center overflow-hidden`}
      style={{
        boxShadow: `
          0 0 60px rgba(16, 185, 129, 0.15),
          inset 0 1px 0 rgba(255,255,255,0.1),
          inset 0 -1px 0 rgba(0,0,0,0.2)
        `,
      }}
    >
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 60%)',
        }}
      />
      
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[2px] blur-sm"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.5), transparent)',
        }}
      />
      
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-20"
        style={{
          background: 'radial-gradient(ellipse at center bottom, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
        }}
      />

      <div 
        className="relative w-full max-w-[320px] aspect-[4/3] z-10"
        style={{
          perspective: '1000px',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="relative w-full h-full transition-transform duration-300"
          style={{
            transform: `rotateY(${rotation3D}deg) scale(${isHovered ? 1.05 : 1})`,
            transformStyle: 'preserve-3d',
          }}
        >
          <Image
            src={heroImage}
            alt={`${subcategory?.label || domain} hero`}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-contain"
            style={{
              filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.5)) drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
            }}
            priority
          />
          
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
            }}
          />
        </div>
        
        {hotspots.map((hotspot, i) => (
          <div
            key={i}
            className="absolute group cursor-pointer z-20"
            style={{ top: hotspot.position.top, left: hotspot.position.left }}
          >
            <div className={`w-3 h-3 rounded-full ${hotspot.color} animate-ping absolute`} />
            <div className={`w-3 h-3 rounded-full ${hotspot.color} relative`} />
            <div className="absolute left-5 top-1/2 -translate-y-1/2 bg-slate-800/95 backdrop-blur border border-slate-600 rounded-xl px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 shadow-xl">
              <p className="text-xs text-gray-400">{hotspot.label}</p>
              <p className="text-sm font-bold text-white">{hotspot.value}</p>
            </div>
          </div>
        ))}
      </div>

      {trendValue && (
        <div className="mt-6 text-center z-10">
          <div className="flex items-center justify-center gap-3 mb-1">
            <span className="text-3xl drop-shadow-lg">{subcategory?.icon}</span>
            <span className="text-2xl font-bold text-white drop-shadow-lg">{trendValue}</span>
          </div>
          <p className="text-sm text-gray-300">{trendLabel}</p>
          <div className="mt-4 h-12 flex items-end gap-1 px-4">
            {[40, 35, 45, 30, 50, 42, 38, 55, 48, 60, 52, 65].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t transition-all duration-300 hover:bg-emerald-400/60"
                style={{ 
                  height: `${h}%`,
                  background: `linear-gradient(to top, rgba(16, 185, 129, 0.4), rgba(16, 185, 129, 0.2))`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
