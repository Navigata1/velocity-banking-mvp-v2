'use client';

import { useEffect, useRef, useState } from 'react';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { useAppStore } from '@/stores/app-store';
import IntroAnimation from '@/components/IntroAnimation';

export default function IntroModal() {
  const theme = useThemeStore((s) => s.theme);
  const classes = themeClasses[theme];

  const { introModalOpen, skipIntroOnStartup } = useAppStore();
  const openIntro = useAppStore((s) => s.openIntro);
  const closeIntro = useAppStore((s) => s.closeIntro);
  const setIntroSeen = useAppStore((s) => s.setIntroSeen);
  const setSkipIntroOnStartup = useAppStore((s) => s.setSkipIntroOnStartup);

  const [dontShowAgain, setDontShowAgain] = useState(false);
  const startupChecked = useRef(false);

  // Dashboard opens first by default. Users can opt back into the startup intro from Settings.
  useEffect(() => {
    if (startupChecked.current) return;
    startupChecked.current = true;

    if (!skipIntroOnStartup && !introModalOpen) {
      openIntro();
    }
  }, [skipIntroOnStartup, introModalOpen, openIntro]);

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
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-3 sm:items-center sm:p-4">
      <div className={`my-3 w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] ${classes.bgSecondary} rounded-2xl border ${classes.border} shadow-2xl overflow-y-auto sm:my-0 sm:max-h-[calc(100dvh-2rem)]`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-emerald-900/30 to-transparent sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-sm text-emerald-300/90">Welcome to InterestShield</p>
            <h2 className={`text-xl font-semibold ${classes.text}`}>The Money Loop — How Interest Really Works</h2>
            <p className={`text-sm ${classes.textSecondary}`}>This is NOT a budget app. It&apos;s a velocity banking simulator.</p>
          </div>
          <button onClick={handleSkip} className={`${classes.textSecondary} hover:${classes.text} shrink-0 text-xl p-1`} aria-label="Close intro">
            ✕
          </button>
        </div>

        {/* Animated intro */}
        <IntroAnimation onComplete={handleContinue} className="h-[280px] sm:h-auto" />

        {/* Content */}
        <div className="px-4 py-4 space-y-3 sm:px-6 sm:py-5 sm:space-y-4">
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded border-gray-500"
              />
              <span className={`text-xs ${classes.textSecondary}`}>Don&apos;t show this again</span>
            </label>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <button
                onClick={handleSkip}
                className={`px-4 py-3 rounded-xl ${classes.bgTertiary} ${classes.textSecondary} text-sm hover:${classes.text} transition-colors sm:py-2`}
              >
                Skip →
              </button>
              <button
                onClick={handleContinue}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors sm:py-2"
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
