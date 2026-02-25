'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Beat {
  id: number;
  duration: number; // ms
  icon: string;
  title: string;
  caption: string;
}

const BEATS: Beat[] = [
  {
    id: 0,
    duration: 7000,
    icon: '🛡️',
    title: 'Interest Is Invisible',
    caption: 'Most people don\'t realize 85–90% of early payments go to interest, not principal. Your money drains silently every single day.',
  },
  {
    id: 1,
    duration: 7000,
    icon: '💸',
    title: 'The Daily Drain',
    caption: 'On a $285K mortgage at 5.75%, you lose $44.90 per day to interest. That\'s $1,347 per month — before a dime touches your balance.',
  },
  {
    id: 2,
    duration: 7000,
    icon: '🔄',
    title: 'Route Income Through LOC',
    caption: 'Deposit your paycheck into a Line of Credit first. Your income reduces the LOC balance instantly, slashing daily interest in real-time.',
  },
  {
    id: 3,
    duration: 7000,
    icon: '⚡',
    title: 'Deploy Chunks',
    caption: 'When the LOC accumulates enough, deploy a chunk payment to your target debt. Watch months fall off your timeline instantly.',
  },
  {
    id: 4,
    duration: 7000,
    icon: '🚀',
    title: 'Small Changes, Big Momentum',
    caption: 'You don\'t need more money — you need a better route. Velocity banking turns your existing income into a debt-crushing engine.',
  },
];

const TOTAL_DURATION = BEATS.reduce((sum, b) => sum + b.duration, 0);

interface IntroAnimationProps {
  onComplete: () => void;
  className?: string;
}

export default function IntroAnimation({ onComplete, className = '' }: IntroAnimationProps) {
  const [currentBeat, setCurrentBeat] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const pausedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [completed, setCompleted] = useState(false);

  const tick = useCallback(() => {
    if (!playing) return;
    const now = Date.now();
    const total = now - startRef.current;
    setElapsed(total);

    // Determine beat
    let acc = 0;
    for (let i = 0; i < BEATS.length; i++) {
      acc += BEATS[i].duration;
      if (total < acc) {
        setCurrentBeat(i);
        break;
      }
      if (i === BEATS.length - 1 && total >= acc) {
        setCurrentBeat(BEATS.length - 1);
        if (!completed) {
          setCompleted(true);
          setPlaying(false);
        }
        return;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [playing, completed]);

  useEffect(() => {
    if (playing && !completed) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, tick, completed]);

  const togglePlay = () => {
    if (completed) return;
    if (playing) {
      pausedAtRef.current = Date.now();
      setPlaying(false);
    } else {
      if (pausedAtRef.current) {
        startRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      setPlaying(true);
    }
  };

  const progress = Math.min(elapsed / TOTAL_DURATION, 1);
  const beat = BEATS[currentBeat];

  // Tank fill level for beats 0-1 (draining) and 2-4 (filling)
  const tankLevel = currentBeat <= 1 ? Math.max(20, 80 - currentBeat * 30) : Math.min(95, 40 + (currentBeat - 2) * 20);

  return (
    <div className={`relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 aspect-[3/4] sm:aspect-[4/3] md:aspect-video flex flex-col items-center justify-center overflow-hidden ${className}`}>
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-emerald-500/30"
            initial={{ x: `${Math.random() * 100}%`, y: '110%', opacity: 0 }}
            animate={{
              y: '-10%',
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-3 sm:gap-6 px-6 sm:px-8 max-w-lg text-center mb-16 sm:mb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={beat.id}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Icon */}
            <motion.div
              className="text-5xl sm:text-6xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {beat.icon}
            </motion.div>

            {/* Title */}
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              {beat.title}
            </h3>

            {/* Tank visual for beats 1-2 */}
            {(currentBeat === 1 || currentBeat === 2) && (
              <div className="w-32 h-20 rounded-lg border-2 border-emerald-500/40 relative overflow-hidden">
                <motion.div
                  className={`absolute bottom-0 left-0 right-0 ${currentBeat === 1 ? 'bg-red-500/40' : 'bg-emerald-500/40'}`}
                  animate={{ height: `${tankLevel}%` }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70 font-medium">
                  {currentBeat === 1 ? '💸 draining...' : '💰 filling!'}
                </div>
              </div>
            )}

            {/* Progress bar jump for beat 3 */}
            {currentBeat === 3 && (
              <div className="w-48 h-3 rounded-full bg-slate-700 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  initial={{ width: '15%' }}
                  animate={{ width: '75%' }}
                  transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Closed captions */}
      <div className="absolute bottom-16 sm:bottom-14 left-0 right-0 px-4 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={beat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="bg-black/80 backdrop-blur-sm rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 mx-auto max-w-lg"
          >
            <p className="text-xs sm:text-sm text-gray-200 text-center leading-relaxed">
              {beat.caption}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          {completed ? '✓' : playing ? '⏸' : '▶'}
        </button>

        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            style={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Beat indicators */}
        <div className="flex gap-1">
          {BEATS.map((b, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i <= currentBeat ? 'bg-emerald-500' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Complete overlay */}
      <AnimatePresence>
        {completed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20"
          >
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={onComplete}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/30"
            >
              Let&apos;s Go! 🚀
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
