'use client';

import { useState } from 'react';
import { useThemeStore, themeClasses, Theme } from '@/stores/theme-store';
import { useAppStore, LandingPage } from '@/stores/app-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import { usePortfolioStore } from '@/stores/portfolio-store';
import ScrollReveal from '@/components/ScrollReveal';
import PageTransition from '@/components/PageTransition';
import { useIsClient } from '@/hooks/useIsClient';
import { BACKEND_READINESS_OPTIONS, BACKEND_STATUS_SUMMARY } from './backend-readiness';
import { clearLocalDemoData } from './local-data-reset';
import { exportLocalDemoSnapshot, importLocalDemoSnapshot } from './local-demo-snapshot';

const themeOptions: { value: Theme; label: string; icon: string }[] = [
  { value: 'original', label: 'Original', icon: '🌙' },
  { value: 'dark', label: 'Dark', icon: '⚫' },
  { value: 'light', label: 'Light', icon: '☀️' },
];

export default function SettingsPage() {
  const mounted = useIsClient();
  const { theme, setTheme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];
  const appStore = useAppStore();
  const preferencesStore = usePreferencesStore();
  const portfolioStore = usePortfolioStore();
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [snapshotImportText, setSnapshotImportText] = useState('');
  const [snapshotStatus, setSnapshotStatus] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<string | null>(null);

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

  const showImportResult = (res: ReturnType<typeof portfolioStore.importState>) => {
    setImportStatus(
      res.ok
        ? 'Import complete. This local portfolio plan was replaced by the backup file.'
        : `Import failed: ${res.error}`
    );
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    showImportResult(portfolioStore.importState(text));
  };

  const handleImportText = () => {
    const text = importText.trim();
    if (!text) {
      showImportResult({ ok: false, error: 'Paste backup JSON first.' });
      return;
    }

    const res = portfolioStore.importState(text);
    if (res.ok) setImportText('');
    showImportResult(res);
  };

  const handleResetLocalData = () => {
    const result = clearLocalDemoData();
    setResetStatus(
      result.cleared > 0
        ? `Local demo data cleared from this browser. Reload the page to restore starter defaults.`
        : 'No local demo data was found in this browser.'
    );
    setTimeout(() => setResetStatus(null), 5000);
  };

  const handleExportLocalSnapshot = () => {
    const result = exportLocalDemoSnapshot();
    if (!result.ok) {
      setSnapshotStatus(`Snapshot export failed: ${result.error}`);
      setTimeout(() => setSnapshotStatus(null), 5000);
      return;
    }

    const blob = new Blob([result.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interestshield-local-demo-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSnapshotStatus(`Backend handoff snapshot exported with ${result.count} local data keys.`);
    setTimeout(() => setSnapshotStatus(null), 5000);
  };

  const handleImportLocalSnapshot = () => {
    const text = snapshotImportText.trim();
    if (!text) {
      setSnapshotStatus('Paste a backend handoff snapshot first.');
      setTimeout(() => setSnapshotStatus(null), 5000);
      return;
    }

    const result = importLocalDemoSnapshot(text);
    if (result.ok) {
      setSnapshotImportText('');
      setSnapshotStatus(`Backend handoff snapshot restored ${result.imported} local data keys. Reload to apply it.`);
    } else {
      setSnapshotStatus(`Snapshot import failed: ${result.error}`);
    }
    setTimeout(() => setSnapshotStatus(null), 5000);
  };

  return (
    <PageTransition>
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <ScrollReveal as="header">
        <h1 className={`text-3xl font-bold ${classes.text}`}>⚙️ Settings</h1>
        <p className={`text-sm ${classes.textSecondary} mt-1`}>
          Customize your InterestShield experience.
        </p>
      </ScrollReveal>

      {/* Theme */}
      <ScrollReveal variant="fadeUp">
      <section className={`${classes.glass} rounded-2xl p-6`}>
        <h2 className={`text-lg font-semibold ${classes.text} mb-3`}>Theme</h2>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              aria-label={`Use ${opt.label} theme`}
              aria-pressed={theme === opt.value}
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
      </ScrollReveal>

      {/* Onboarding */}
      <ScrollReveal variant="fadeUp" delay={0.05}>
      <section className={`${classes.glass} rounded-2xl p-6`}>
        <h2 className={`text-lg font-semibold ${classes.text} mb-3`}>Onboarding</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className={`font-medium ${classes.text}`}>Keep intro hidden on startup</p>
              <p className={`text-xs ${classes.textSecondary}`}>
                The dashboard opens first by default. Turn this off only when you want the intro to appear at launch.
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

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className={`font-medium ${classes.text}`}>Show snapshot preview</p>
              <p className={`text-xs ${classes.textSecondary}`}>
                Allow the quick snapshot to appear again after its refresh window expires.
              </p>
            </div>
            <button
              aria-label="Toggle snapshot preview"
              aria-pressed={preferencesStore.showPreAppPreview}
              onClick={() => preferencesStore.setShowPreAppPreview(!preferencesStore.showPreAppPreview)}
              className={`w-12 h-6 rounded-full transition-colors ${
                preferencesStore.showPreAppPreview ? 'bg-emerald-500' : classes.bgTertiary
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  preferencesStore.showPreAppPreview ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          <button
            onClick={() => {
              preferencesStore.setShowPreAppPreview(true);
              preferencesStore.setLastPreviewRefresh(0);
              appStore.setPreviewDismissed(false);
            }}
            className={`${classes.glassButton} px-4 py-2 rounded-xl border ${classes.border} text-sm ${classes.textSecondary} hover:${classes.text}`}
          >
            Show snapshot next visit
          </button>
        </div>
      </section>
      </ScrollReveal>

      {/* Landing Page */}
      <ScrollReveal variant="fadeUp" delay={0.1}>
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
      </ScrollReveal>

      {/* Data */}
      <ScrollReveal variant="fadeUp" delay={0.15}>
      <section className={`${classes.glass} rounded-2xl p-6`}>
        <h2 className={`text-lg font-semibold ${classes.text} mb-3`}>Data Backup</h2>
        <p className={`text-sm ${classes.textSecondary} mb-4`}>
          Local backup only. Export your portfolio balances, LOC settings, strategy, and planning inputs as JSON.
          Import replaces the current local portfolio plan in this browser.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            aria-label="Export local portfolio backup"
            data-testid="settings-export-backup"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            📤 Export Backup
          </button>
          <label
            data-testid="settings-import-backup"
            className={`${classes.glassButton} px-4 py-2 rounded-xl border ${classes.border} text-sm font-medium cursor-pointer ${classes.textSecondary} hover:${classes.text}`}
          >
            📥 Import Backup
            <input
              type="file"
              accept="application/json"
              aria-label="Import local portfolio backup JSON"
              data-testid="settings-import-backup-input"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>
        <div className="mt-4 space-y-2">
          <label htmlFor="settings-import-backup-json" className={`block text-xs font-medium ${classes.textSecondary}`}>
            Paste backup JSON
          </label>
          <textarea
            id="settings-import-backup-json"
            aria-label="Paste local portfolio backup JSON"
            data-testid="settings-import-backup-json"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={4}
            placeholder='{"version":1,"data":{"debts":[]}}'
            className={`w-full rounded-xl border ${classes.border} ${classes.bgTertiary} ${classes.text} px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500/70`}
          />
          <button
            type="button"
            onClick={handleImportText}
            data-testid="settings-import-backup-json-submit"
            className={`${classes.glassButton} px-4 py-2 rounded-xl border ${classes.border} text-sm font-medium ${classes.textSecondary} hover:${classes.text}`}
          >
            Import pasted JSON
          </button>
        </div>
        {importStatus && (
          <p className="mt-3 text-sm" role="status">{importStatus}</p>
        )}
        <div className={`mt-5 border-t ${classes.border} pt-4`}>
          <div data-testid="settings-backend-handoff-snapshot" className="mb-5 space-y-3">
            <div>
              <p className={`text-sm font-medium ${classes.text}`}>Backend handoff snapshot</p>
              <p className={`text-sm ${classes.textSecondary}`}>
                Export all known InterestShield browser keys as a local-demo snapshot for a future Supabase/Auth/RLS
                or Cloudflare migration. Import replaces only InterestShield demo keys and leaves unrelated browser
                storage alone.
              </p>
              <p data-testid="settings-backend-migration-contract" className={`mt-2 text-xs ${classes.textMuted}`}>
                Includes a provider-neutral migration contract for owner rules, financial snapshots, simulation runs,
                and learning progress.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportLocalSnapshot}
              data-testid="settings-export-local-snapshot"
              className={`${classes.glassButton} px-4 py-2 rounded-xl border ${classes.border} text-sm font-medium ${classes.textSecondary} hover:${classes.text}`}
            >
              Export backend handoff snapshot
            </button>
            <div className="space-y-2">
              <label
                htmlFor="settings-import-local-snapshot-json"
                className={`block text-xs font-medium ${classes.textSecondary}`}
              >
                Paste handoff snapshot JSON
              </label>
              <textarea
                id="settings-import-local-snapshot-json"
                aria-label="Paste backend handoff snapshot JSON"
                data-testid="settings-import-local-snapshot-json"
                value={snapshotImportText}
                onChange={(e) => setSnapshotImportText(e.target.value)}
                rows={4}
                placeholder='{"version":1,"mode":"local-demo","storage":[]}'
                className={`w-full rounded-xl border ${classes.border} ${classes.bgTertiary} ${classes.text} px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500/70`}
              />
              <button
                type="button"
                onClick={handleImportLocalSnapshot}
                data-testid="settings-import-local-snapshot-submit"
                className={`${classes.glassButton} px-4 py-2 rounded-xl border ${classes.border} text-sm font-medium ${classes.textSecondary} hover:${classes.text}`}
              >
                Import pasted handoff snapshot
              </button>
            </div>
            {snapshotStatus && (
              <p className="text-sm" role="status">{snapshotStatus}</p>
            )}
          </div>
          <p className={`text-sm ${classes.textSecondary} mb-3`}>
            Reset only InterestShield demo data stored in this browser. This does not touch files on your device.
          </p>
          <button
            type="button"
            onClick={handleResetLocalData}
            data-testid="settings-reset-local-data"
            className="px-4 py-2 rounded-xl bg-red-500/15 text-red-300 border border-red-400/30 text-sm font-medium hover:bg-red-500/25 transition-colors"
          >
            Reset local demo data
          </button>
          {resetStatus && (
            <p className="mt-3 text-sm" role="status">{resetStatus}</p>
          )}
        </div>
      </section>
      </ScrollReveal>

      {/* Backend Status */}
      <ScrollReveal variant="fadeUp" delay={0.2}>
      <section className={`${classes.glass} rounded-2xl p-6`}>
        <h2 className={`text-lg font-semibold ${classes.text} mb-3`}>Backend status</h2>
        <div data-testid="settings-backend-readiness" className={`${classes.bgTertiary} rounded-xl p-4 space-y-4`}>
          <div className="space-y-2">
            <p className={`text-sm font-medium ${classes.text}`}>{BACKEND_STATUS_SUMMARY.mode}</p>
            <p className={`text-sm ${classes.textSecondary}`}>
              {BACKEND_STATUS_SUMMARY.headline} {BACKEND_STATUS_SUMMARY.detail}
            </p>
            <p className={`text-xs ${classes.textMuted}`}>{BACKEND_STATUS_SUMMARY.nextGate}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {BACKEND_READINESS_OPTIONS.map((option) => (
              <article
                key={option.id}
                data-testid={`settings-backend-option-${option.id}`}
                className={`rounded-xl border ${classes.border} p-4 space-y-3`}
              >
                <div className="space-y-1">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${classes.textMuted}`}>{option.status}</p>
                  <h3 className={`text-sm font-semibold ${classes.text}`}>{option.label}</h3>
                  <p className={`text-xs ${classes.textSecondary}`}>{option.bestFit}</p>
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${classes.textMuted}`}>Strengths</p>
                  <ul className={`mt-1 space-y-1 text-xs ${classes.textSecondary}`}>
                    {option.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${classes.textMuted}`}>Open gates</p>
                  <ul className={`mt-1 space-y-1 text-xs ${classes.textSecondary}`}>
                    {option.openGates.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <p className={`text-xs ${classes.textMuted}`}>{option.nextGate}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* Demo Auth */}
      <ScrollReveal variant="fadeUp" delay={0.25}>
      <section className={`${classes.glass} rounded-2xl p-6`}>
        <h2 className={`text-lg font-semibold ${classes.text} mb-3`}>Account (Local demo)</h2>
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
              Demo login for class presentation. No real authentication yet.
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
                  aria-label={`${provider} sign-in unavailable: backend not connected`}
                  title={`${provider} sign-in unavailable until backend keys are configured`}
                  className={`flex-1 px-3 py-2 rounded-xl ${classes.bgTertiary} ${classes.textMuted} text-xs cursor-not-allowed`}
                >
                  {provider} (requires keys)
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
      </ScrollReveal>

      <p className={`text-xs ${classes.textMuted} text-center pt-4`}>
        InterestShield v2 • Educational tool • Not financial advice
      </p>
    </div>
    </PageTransition>
  );
}
