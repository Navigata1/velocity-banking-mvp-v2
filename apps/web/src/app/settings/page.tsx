'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import PageTransition from '@/components/PageTransition';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import UserMenu from '@/components/auth/UserMenu';
import { useThemeStore, AccentColor, Theme } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/lib/sync';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { usePreferencesStore, HeroAnimationMode, HeroQuality } from '@/stores/preferences-store';
import { useGamificationStore } from '@/stores/gamification-store';

const themeOptions: Theme[] = ['original', 'dark', 'light'];
const accentOptions: AccentColor[] = ['emerald', 'blue', 'violet', 'amber'];
const animationModes: HeroAnimationMode[] = ['hover', 'showroom360', 'cinematicTilt', 'lightSweep', 'focusPulse'];
const qualityOptions: HeroQuality[] = ['low', 'medium', 'high'];

export default function SettingsPage() {
  const { theme, setTheme, accent, setAccent } = useThemeStore();
  const authSession = useAuthStore((state) => state.session);
  const setAuthModalOpen = useAuthStore((state) => state.setAuthModalOpen);
  const syncStatus = useSyncStore((state) => state.status);
  const syncError = useSyncStore((state) => state.error);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);

  const portfolioStore = usePortfolioStore();
  const preferencesStore = usePreferencesStore();
  const unlockedThemeAccents = useGamificationStore((state) => state.unlockedThemeAccents);
  const unlockedShowroomEffects = useGamificationStore((state) => state.unlockedShowroomEffects);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!unlockedThemeAccents.includes(accent)) {
      setAccent(unlockedThemeAccents[0] ?? 'emerald');
    }
  }, [accent, setAccent, unlockedThemeAccents]);

  const handleExport = () => {
    const text = portfolioStore.exportState();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `interestshield-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const result = portfolioStore.importState(text);
    setImportStatus(result.ok ? 'Import successful.' : `Import failed: ${result.error}`);
    event.currentTarget.value = '';
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Settings</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Account, cloud sync, theme, and motion preferences.</p>
        </header>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Appearance</h2>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs text-[var(--color-text-secondary)]">Theme</span>
              <Select value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
                {themeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-[var(--color-text-secondary)]">Accent</span>
              <Select value={accent} onChange={(event) => setAccent(event.target.value as AccentColor)}>
                {accentOptions.filter((option) => unlockedThemeAccents.includes(option)).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Cosmetic Unlocks</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Theme accents</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {accentOptions.map((option) => (
                  <Badge key={option} tone={unlockedThemeAccents.includes(option) ? 'success' : 'default'}>
                    {option}
                    {unlockedThemeAccents.includes(option) ? '' : ' (locked)'}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Hero showroom effects</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {unlockedShowroomEffects.map((effect) => (
                  <Badge key={effect} tone="success">{effect}</Badge>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Account & Cloud</h2>
            <Badge tone={syncStatus === 'error' ? 'danger' : syncStatus === 'synced' ? 'success' : 'default'}>
              {syncStatus}
            </Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            {authSession ? <UserMenu /> : <Button onClick={() => setAuthModalOpen(true)}>Sign In / Create Account</Button>}
            <p className="text-xs text-[var(--color-text-secondary)]">
              {authSession
                ? `Cloud sync ${syncStatus === 'synced' ? 'active' : 'available'}${lastSyncedAt ? ` · last sync ${new Date(lastSyncedAt).toLocaleString()}` : ''}.`
                : 'Not signed in. Your data stays local on this device.'}
            </p>
            {syncError ? <p className="text-xs text-amber-300">{syncError}</p> : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Hero & Motion</h2>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs text-[var(--color-text-secondary)]">Animation Mode</span>
              <Select
                value={preferencesStore.heroAnimationMode}
                onChange={(event) => preferencesStore.setHeroAnimationMode(event.target.value as HeroAnimationMode)}
              >
                {animationModes.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </Select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-[var(--color-text-secondary)]">3D Quality</span>
              <Select
                value={preferencesStore.heroQuality}
                onChange={(event) => preferencesStore.setHeroQuality(event.target.value as HeroQuality)}
              >
                {qualityOptions.map((quality) => (
                  <option key={quality} value={quality}>{quality}</option>
                ))}
              </Select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-[var(--color-text-secondary)]">Reduced Motion</span>
              <Select
                value={preferencesStore.reducedMotion ? 'on' : 'off'}
                onChange={(event) => preferencesStore.setReducedMotion(event.target.value === 'on')}
              >
                <option value="off">Off</option>
                <option value="on">On</option>
              </Select>
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Local Backup</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleExport}>Export JSON</Button>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)]">
                Import JSON
                <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
              </label>
            </div>
            {importStatus ? <p className="text-xs text-[var(--color-text-secondary)]">{importStatus}</p> : null}
          </CardBody>
        </Card>

        <p className="pb-2 text-center text-xs text-[var(--color-text-muted)]">Educational tool. Not financial advice.</p>
      </div>
    </PageTransition>
  );
}
