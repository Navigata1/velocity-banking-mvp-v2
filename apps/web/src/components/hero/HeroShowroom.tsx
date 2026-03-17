'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { HeroAnimationMode } from '@/stores/preferences-store';
import { useGamificationStore } from '@/stores/gamification-store';

export type HeroAssetType = 'semiTruck' | 'jetSki' | 'blackCard' | 'townhouse' | 'jewelry';

interface HeroShowroomProps {
  assetType: HeroAssetType;
  mode: HeroAnimationMode;
  quality: 'low' | 'medium' | 'high';
  reducedMotion: boolean;
  muted?: boolean;
  onQualityDowngrade?: () => void;
}

function getQualityScale(quality: HeroShowroomProps['quality']): number {
  if (quality === 'low') return 0.92;
  if (quality === 'medium') return 1;
  return 1.06;
}

export default function HeroShowroom({
  assetType,
  mode,
  quality,
  reducedMotion,
  muted = false,
  onQualityDowngrade,
}: HeroShowroomProps) {
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const milestoneCount = useGamificationStore((state) => state.milestones.length);
  const qualityScale = getQualityScale(quality);

  const animation = useMemo(() => {
    if (reducedMotion) {
      return { y: 0, rotateY: 0, rotateX: 0, scale: qualityScale };
    }

    switch (mode) {
      case 'hover':
        return {
          y: [0, -6, 0],
          rotateY: [-2, 2, -2],
          rotateX: [0, 1.5, 0],
          scale: qualityScale,
        };
      case 'showroom360':
        return {
          rotateY: [0, 360],
          y: 0,
          rotateX: 0,
          scale: qualityScale,
        };
      case 'cinematicTilt':
        return {
          rotateY: cursor.x * 9,
          rotateX: cursor.y * -7,
          y: -2,
          scale: qualityScale,
        };
      case 'lightSweep':
        return {
          y: 0,
          rotateY: [0, 12, -12, 0],
          rotateX: 0,
          scale: qualityScale,
        };
      case 'focusPulse':
        return {
          y: 0,
          rotateY: 0,
          rotateX: 0,
          scale: milestoneCount > 0 ? [qualityScale, qualityScale * 1.03, qualityScale] : qualityScale,
        };
      default:
        return { y: 0, rotateY: 0, rotateX: 0, scale: qualityScale };
    }
  }, [cursor.x, cursor.y, milestoneCount, mode, qualityScale, reducedMotion]);

  return (
    <Canvas className="h-full w-full">
      <PerformanceMonitor onDecline={onQualityDowngrade}>
        <Environment preset="studio" />
        <div
          className="relative flex h-full w-full items-center justify-center"
          onPointerMove={(event) => {
            const target = event.currentTarget;
            const rect = target.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
            setCursor({ x, y });
          }}
        >
          <motion.div
            className={`relative h-[190px] w-[190px] ${muted ? 'opacity-70 grayscale-[0.35]' : 'opacity-100'}`}
            animate={animation}
            transition={{
              duration: mode === 'showroom360' ? 12 : mode === 'focusPulse' ? 0.9 : 2.2,
              repeat: reducedMotion || mode === 'cinematicTilt' ? 0 : Infinity,
              ease: 'easeInOut',
            }}
          >
            <ModelVisual assetType={assetType} muted={muted} mode={mode} />
          </motion.div>
        </div>
        <ContactShadows opacity={0.28} scale={7} blur={2.2} far={2} />
        {mode === 'showroom360' ? <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.6} /> : null}
      </PerformanceMonitor>
    </Canvas>
  );
}

function ModelVisual({
  assetType,
  muted,
  mode,
}: {
  assetType: HeroAssetType;
  muted: boolean;
  mode: HeroAnimationMode;
}) {
  const glow = muted ? 'shadow-[0_0_24px_rgba(148,163,184,0.2)]' : 'shadow-[0_0_36px_var(--color-accent-soft)]';
  const sheen = mode === 'lightSweep' ? 'animate-[shimmer_2.8s_ease-in-out_infinite]' : '';

  if (assetType === 'semiTruck') {
    return (
      <div className={`relative h-full w-full rounded-2xl bg-gradient-to-br from-zinc-200 via-zinc-500 to-zinc-900 ${glow} ${sheen}`}>
        <div className="absolute left-4 top-12 h-20 w-24 rounded-xl bg-zinc-700" />
        <div className="absolute right-3 top-16 h-14 w-24 rounded-md bg-zinc-600" />
        <Wheel x="left-4" />
        <Wheel x="left-16" />
        <Wheel x="right-12" />
      </div>
    );
  }

  if (assetType === 'jetSki') {
    return (
      <div className={`relative h-full w-full rounded-[45%] bg-gradient-to-br from-cyan-200 via-blue-500 to-slate-900 ${glow} ${sheen}`}>
        <div className="absolute inset-x-4 bottom-6 h-7 rounded-full bg-cyan-400/35" />
        <div className="absolute left-1/2 top-10 h-20 w-7 -translate-x-1/2 rounded-full bg-slate-900/70" />
      </div>
    );
  }

  if (assetType === 'blackCard') {
    return (
      <div className={`relative h-full w-full rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-800 to-zinc-900 ${glow} ${sheen}`}>
        <div className="absolute left-6 top-6 h-10 w-10 rounded-full border border-zinc-300/40" />
        <div className="absolute right-6 top-10 h-1 w-16 rounded-full bg-zinc-300/30" />
        <div className="absolute bottom-6 left-6 text-xs font-semibold tracking-[0.2em] text-zinc-200/70">INTERESTSHIELD</div>
      </div>
    );
  }

  if (assetType === 'townhouse') {
    return (
      <div className={`relative h-full w-full rounded-xl bg-gradient-to-b from-slate-200 via-slate-500 to-slate-900 ${glow} ${sheen}`}>
        <div className="absolute inset-x-5 top-8 h-16 rounded-t-xl bg-slate-700" />
        <div className="absolute inset-x-8 bottom-6 top-24 rounded-md bg-slate-800" />
        <Window y="top-28" />
        <Window y="top-40" />
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full rounded-full bg-gradient-to-br from-amber-200 via-yellow-400 to-yellow-700 ${glow} ${sheen}`}>
      <div className="absolute inset-7 rounded-full border border-yellow-100/50" />
      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-[40%] bg-cyan-100/70" />
    </div>
  );
}

function Wheel({ x }: { x: string }) {
  return <div className={`absolute ${x} bottom-3 h-8 w-8 rounded-full border border-zinc-200/50 bg-zinc-950`} />;
}

function Window({ y }: { y: string }) {
  return <div className={`absolute left-1/2 ${y} h-5 w-8 -translate-x-1/2 rounded-sm bg-amber-100/45`} />;
}

