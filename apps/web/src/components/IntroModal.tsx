'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { useAppStore } from '@/stores/app-store';

export default function IntroModal() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const classes = themeClasses[theme];

  const { introSeen, introModalOpen, skipIntroOnStartup } = useAppStore();
  const openIntro = useAppStore((s) => s.openIntro);
  const closeIntro = useAppStore((s) => s.closeIntro);
  const setIntroSeen = useAppStore((s) => s.setIntroSeen);
  const setSkipIntroOnStartup = useAppStore((s) => s.setSkipIntroOnStartup);

  const [muted, setMuted] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Show on first visit if not seen and not skipped
  useEffect(() => {
    if (!introSeen && !skipIntroOnStartup && !introModalOpen) {
      openIntro();
    }
  }, [introSeen, skipIntroOnStartup, introModalOpen, openIntro]);

  useEffect(() => {
    if (!introModalOpen && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [introModalOpen]);

  if (!introModalOpen) return null;

  const handleSkip = () => {
    setIntroSeen(true);
    if (dontShowAgain) setSkipIntroOnStartup(true);
    closeIntro();
  };

  const handleContinue = () => {
    setIntroSeen(true);
    if (dontShowAgain) setSkipIntroOnStartup(true);
    closeIntro();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`w-full max-w-3xl ${classes.bgSecondary} rounded-2xl border ${classes.border} shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-emerald-900/30 to-transparent">
          <div>
            <p className="text-sm text-emerald-300/90">Welcome to InterestShield</p>
            <h2 className={`text-xl font-semibold ${classes.text}`}>The Money Loop — How Interest Really Works</h2>
            <p className={`text-sm ${classes.textSecondary}`}>This is NOT a budget app. It&apos;s a velocity banking simulator.</p>
          </div>
          <button onClick={handleSkip} className={`${classes.textSecondary} hover:${classes.text} text-xl p-1`}>
            ✕
          </button>
        </div>

        {/* Video area */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted={muted}
            playsInline
            controls
            poster="/intro/poster.jpg"
          >
            <source src="/intro/money-loop.mp4" type="video/mp4" />
            <track kind="captions" src="/intro/captions.vtt" srcLang="en" label="English" default />
            Your browser does not support the video element.
          </video>

          {/* Sound toggle */}
          <button
            onClick={() => setMuted(!muted)}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/80 transition-colors"
          >
            {muted ? '🔇 Enable Sound' : '🔊 Sound On'}
          </button>

          {/* Fallback if no video exists */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none">
            <div className="text-6xl mb-4">🛡️</div>
            <h3 className="text-2xl font-bold text-white mb-2">Interest Is Invisible</h3>
            <p className="text-gray-300 max-w-md">
              Most people don&apos;t realize that 85-90% of their early mortgage payments go to interest, not principal.
              InterestShield makes this visible — and shows you how to change it.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`${classes.bgTertiary} rounded-xl p-3`}>
              <p className="text-emerald-400 font-semibold text-sm mb-1">📊 See It</p>
              <p className={`text-xs ${classes.textSecondary}`}>
                Watch your daily interest burn in real-time. Understand where your money actually goes.
              </p>
            </div>
            <div className={`${classes.bgTertiary} rounded-xl p-3`}>
              <p className="text-emerald-400 font-semibold text-sm mb-1">🔄 Loop It</p>
              <p className={`text-xs ${classes.textSecondary}`}>
                Learn the Money Loop: cycle income through your LOC to reduce average daily balance and interest.
              </p>
            </div>
            <div className={`${classes.bgTertiary} rounded-xl p-3`}>
              <p className="text-emerald-400 font-semibold text-sm mb-1">⚡ Crush It</p>
              <p className={`text-xs ${classes.textSecondary}`}>
                Deploy chunks to amortized debt and watch years fall off your timeline.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded border-gray-500"
              />
              <span className={`text-xs ${classes.textSecondary}`}>Don&apos;t show this again</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className={`px-4 py-2 rounded-xl ${classes.bgTertiary} ${classes.textSecondary} text-sm hover:${classes.text} transition-colors`}
              >
                Skip →
              </button>
              <button
                onClick={handleContinue}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
              >
                Let&apos;s Go! 🚀
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
