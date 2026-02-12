'use client';

import { useState, useEffect } from 'react';
import { useThemeStore, themeClasses, Theme } from '@/stores/theme-store';
import { useAppStore, LandingPage } from '@/stores/app-store';
import { usePortfolioStore } from '@/stores/portfolio-store';

const themeOptions: { value: Theme; label: string; icon: string }[] = [
  { value: 'original', label: 'Original', icon: '🌙' },
  { value: 'dark', label: 'Dark', icon: '⚫' },
  { value: 'light', label: 'Light', icon: '☀️' },
];

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];
  const appStore = useAppStore();
  const portfolioStore = usePortfolioStore();
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-500/30 rounded w-1/3 mb-6" />
          <div className="h-96 bg-gray-500/20 rounded-2xl" />
        </div>
      </div>
    );
  }

  const handleExport = () => {
    const text = portfolioStore.exportState();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interestshield-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const res = portfolioStore.importState(text);
    if (res.ok) {
      setImportStatus('✅ Import successful!');
    } else {
      setImportStatus(`❌ ${res.error}`);
    }
    setTimeout(() => setImportStatus(null), 3000);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className={`text-3xl font-bold ${classes.text}`}>⚙️ Settings</h1>
        <p className={`text-sm ${classes.textSecondary} mt-1`}>
          Customize your InterestShield experience.
        </p>
      </header>

      {/* Theme */}
      <section className={`${classes.glass} rounded-2xl p-6`}>
        <h2 className={`text-lg font-semibold ${classes.text} mb-3`}>Theme</h2>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`p-4 rounded-xl text-center transition-all border ${
                theme === opt.value
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : `${classes.bgTertiary} border-transparent ${classes.textSecondary} hover:border-slate-600`
              }`}
            >
              <div className="text-2xl mb-1">{opt.icon}</div>
              <div className="text-sm font-medium">{opt.label}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Onboarding */}
      <section className={`${classes.glass} rounded-2xl p-6`}>
        <h2 className={`text-lg font-semibold ${classes.text} mb-3`}>Onboarding</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className={`font-medium ${classes.text}`}>Skip intro on startup</p>
              <p className={`text-xs ${classes.textSecondary}`}>
                Don&apos;t show the welcome modal when you open the app.
              </p>
            </div>
            <button
              onClick={() => appStore.setSkipIntroOnStartup(!appStore.skipIntroOnStartup)}
              className={`w-12 h-6 rounded-full transition-colors ${
                appStore.skipIntroOnStartup ? 'bg-emerald-500' : classes.bgTertiary
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  appStore.skipIntroOnStartup ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          <button
            onClick={() => appStore.openIntro()}
            className={`${classes.glassButton} px-4 py-2 rounded-xl border ${classes.border} text-sm ${classes.textSecondary} hover:${classes.text}`}
          >
            🎬 Replay Intro
          </button>
        </div>
      </section>

      {/* Landing Page */}
      <section className={`${classes.glass} rounded-2xl p-6`}>
        <h2 className={`text-lg font-semibold ${classes.text} mb-3`}>Default Landing Page</h2>
        <div className="grid grid-cols-2 gap-3">
          {(['dashboard', 'portfolio'] as LandingPage[]).map((page) => (
            <button
              key={page}
              onClick={() => appStore.setLandingPage(page)}
              className={`p-4 rounded-xl text-center transition-all border ${
                appStore.landingPage === page
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : `${classes.bgTertiary} border-transparent ${classes.textSecondary}`
              }`}
            >
              <div className="text-2xl mb-1">{page === 'dashboard' ? '📊' : '📋'}</div>
              <div className="text-sm font-medium capitalize">{page}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Data */}
      <section className={`${classes.glass} rounded-2xl p-6`}>
        <h2 className={`text-lg font-semibold ${classes.text} mb-3`}>Data Backup</h2>
        <p className={`text-sm ${classes.textSecondary} mb-4`}>
          Export your portfolio data as JSON. Import to restore on a new device.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            📤 Export Backup
          </button>
          <label className={`${classes.glassButton} px-4 py-2 rounded-xl border ${classes.border} text-sm font-medium cursor-pointer ${classes.textSecondary} hover:${classes.text}`}>
            📥 Import Backup
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>
        {importStatus && (
          <p className="mt-3 text-sm">{importStatus}</p>
        )}
      </section>

      {/* Demo Auth */}
      <section className={`${classes.glass} rounded-2xl p-6`}>
        <h2 className={`text-lg font-semibold ${classes.text} mb-3`}>Account (Demo)</h2>
        {appStore.user ? (
          <div className="space-y-3">
            <div className={`${classes.bgTertiary} rounded-xl p-4`}>
              <p className={`text-sm ${classes.textSecondary}`}>Signed in as</p>
              <p className={`font-medium ${classes.text}`}>{appStore.user.name || appStore.user.email}</p>
              <p className={`text-xs ${classes.textMuted}`}>{appStore.user.email}</p>
            </div>
            <button
              onClick={() => appStore.signOut()}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className={`text-sm ${classes.textSecondary}`}>
              Demo login for class presentation. No real authentication.
            </p>
            <button
              onClick={() => appStore.signInLocal('demo@interestshield.app', 'Demo User')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Sign In as Demo User
            </button>
            <div className="flex gap-2">
              {['Google', 'Microsoft', 'Apple'].map((provider) => (
                <button
                  key={provider}
                  disabled
                  className={`flex-1 px-3 py-2 rounded-xl ${classes.bgTertiary} ${classes.textMuted} text-xs cursor-not-allowed`}
                >
                  {provider} (requires keys)
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <p className={`text-xs ${classes.textMuted} text-center pt-4`}>
        InterestShield v2 • Educational tool • Not financial advice
      </p>
    </div>
  );
}
