'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, ImageIcon, RotateCcw } from 'lucide-react';
import { heroAssets, type HeroId } from '@/data/hero-assets';

const HeroModelStage = dynamic(() => import('./HeroModelStage'), { ssr: false });

export default function AssetHero({ id, compact = false }: { id: HeroId; compact?: boolean }) {
  const hero = heroAssets[id];
  const [mode, setMode] = useState<'poster' | 'model'>('poster');
  const [replay, setReplay] = useState(0);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [onScreen, setOnScreen] = useState(true);
  const figure = useRef<HTMLElement>(null);
  const fail = useCallback(() => setFailed(true), []);
  useEffect(() => {
    const listener = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: '100px' });
    if (figure.current) observer.observe(figure.current);
    return () => observer.disconnect();
  }, []);
  return (
    <figure ref={figure} data-testid="asset-hero" data-hero={id} className="m-0 min-w-0">
      <div className={`relative isolate w-full ${compact ? 'h-[240px] md:h-[300px]' : 'h-[270px] md:h-[370px] xl:h-[420px]'}`}>
        <Image src={hero.poster} alt={hero.alt} fill priority={id === 'car'} sizes="(max-width: 768px) 92vw, 60vw"
          className={`object-contain p-3 transition-opacity ${mode === 'model' && !failed && visible && onScreen ? 'opacity-0' : 'opacity-100'}`} />
        {mode === 'model' && !failed && visible && onScreen && <HeroModelStage key={id} model={hero.model} replay={replay} onError={fail} />}
      </div>
      <figcaption className="flex min-h-11 flex-wrap items-center justify-center gap-2 text-xs text-current/70">
        <div role="group" aria-label={`${hero.label} presentation`} className="inline-flex overflow-hidden rounded-md border border-current/20">
          <button type="button" title="Studio artwork" aria-label="Studio artwork" aria-pressed={mode === 'poster'}
            onClick={() => setMode('poster')} className={`min-h-10 px-3 ${mode === 'poster' ? 'bg-current/10' : ''}`}><ImageIcon size={16} /></button>
          <button type="button" title="Inspect authored 3D model" aria-label="Inspect authored 3D model" aria-pressed={mode === 'model'}
            onClick={() => { setFailed(false); setMode('model'); }} className={`min-h-10 px-3 ${mode === 'model' ? 'bg-current/10' : ''}`}><Box size={16} /></button>
        </div>
        {mode === 'model' && !failed && <button type="button" title="Replay full turn" aria-label="Replay full turn" onClick={() => setReplay(r => r + 1)} className="grid size-10 place-items-center rounded-md border border-current/20"><RotateCcw size={16} /></button>}
        {failed && <span role="status">3D unavailable. Studio artwork shown.</span>}
      </figcaption>
    </figure>
  );
}
