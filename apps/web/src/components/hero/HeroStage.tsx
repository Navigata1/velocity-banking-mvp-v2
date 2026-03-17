'use client';

import { Suspense, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { HeroAnimationMode, HeroQuality, usePreferencesStore } from '@/stores/preferences-store';
import type { HeroAssetType } from '@/components/hero/HeroShowroom';

const HeroShowroom = dynamic(() => import('@/components/hero/HeroShowroom'), {
  ssr: false,
  loading: () => <StageFallback />,
});

interface HeroStageProps {
  assetType: HeroAssetType;
  mode?: HeroAnimationMode;
  quality?: HeroQuality;
  reducedMotion?: boolean;
  muted?: boolean;
  className?: string;
}

function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export default function HeroStage({
  assetType,
  mode,
  quality,
  reducedMotion,
  muted,
  className,
}: HeroStageProps) {
  const preferences = usePreferencesStore();
  const [effectiveQuality, setEffectiveQuality] = useState<HeroQuality>(quality ?? preferences.heroQuality);

  const canUseWebGL = useMemo(() => supportsWebGL(), []);
  const currentMode = mode ?? preferences.heroAnimationMode;
  const currentReducedMotion = reducedMotion ?? preferences.reducedMotion;
  const fallbackImage =
    assetType === 'jetSki'
      ? '/heroes/subcategories/recreation-jetski.png'
      : assetType === 'blackCard'
        ? '/heroes/subcategories/card-black.png'
        : assetType === 'townhouse'
          ? '/heroes/subcategories/house-townhouse.png'
          : assetType === 'jewelry'
            ? '/heroes/subcategories/custom-jewelry.png'
            : '/heroes/subcategories/auto-semi.png';

  if (!canUseWebGL) {
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] ${className ?? ''}`}>
        <div className="relative flex h-full min-h-[220px] items-center justify-center">
          <Image
            src={fallbackImage}
            alt="Hero fallback"
            fill
            className="object-contain p-6"
          />
          <p className="absolute bottom-3 text-xs text-[var(--color-text-secondary)]">WebGL unavailable · 2D fallback</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] ${className ?? ''}`}>
      <Suspense fallback={<StageFallback />}>
        <HeroShowroom
          assetType={assetType}
          mode={currentMode}
          quality={effectiveQuality}
          reducedMotion={currentReducedMotion}
          muted={muted}
          onQualityDowngrade={() => {
            setEffectiveQuality((current) => {
              if (current === 'high') return 'medium';
              if (current === 'medium') return 'low';
              return 'low';
            });
          }}
        />
      </Suspense>
    </div>
  );
}

function StageFallback() {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center bg-[var(--surface-glass)]">
      <div className="h-20 w-20 animate-pulse rounded-full bg-[var(--color-accent-soft)]" />
    </div>
  );
}
