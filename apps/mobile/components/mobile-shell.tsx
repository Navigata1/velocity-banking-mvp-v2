import {
  buildMobileCockpitSnapshot,
  buildMobileDashboardSnapshot,
  buildMobileLearnSnapshot,
  buildMobilePortfolioSnapshot,
  buildMobileSimulatorSnapshot,
  buildMobileVaultSnapshot,
  type MobileDashboardInput,
} from '@interestshield/financial-engine';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import { MobileSupabaseAccount } from '@/components/mobile-supabase-account';
import {
  usePersistedMobileAssumptions,
  type MobileAssumptionStorageStatus,
} from '@/hooks/use-persisted-mobile-assumptions';
import {
  AssumptionControls,
  mobileStorageStatusCopy,
  StorageStatusCard,
} from './mobile-shell/controls';
import {
  MobileModeNavigation,
  modeRoutes,
  modes,
  type MobileMode,
} from './mobile-shell/navigation';
import {
  CockpitPanel,
  DashboardPanel,
  LearnPanel,
  PortfolioPanel,
  SimulatorPanel,
  VaultPanel,
} from './mobile-shell/route-panels';

const mobileBackendReadinessOptions = [
  {
    id: 'supabase-postgres-auth-rls',
    label: 'Supabase Postgres + Auth + RLS',
    status: 'Candidate',
    detail: 'Best fit for relational snapshots, run history, exports, audit events, and SQL reporting. Next gate: six-collection schema plus RLS policy review.',
  },
  {
    id: 'cloudflare-worker-r2-reports',
    label: 'Cloudflare Worker + private R2 reports',
    status: 'Candidate',
    detail: 'Best fit for explicit report export, download, and deletion while Supabase remains the private system of record. Next gate: dedicated R2 buckets and deployed owner-isolation smoke.',
  },
] as const;

function SettingsPanel({
  assumptions,
  onResetAssumptions,
  resetStatus,
  storageStatus,
}: {
  assumptions: MobileDashboardInput;
  onResetAssumptions: () => void;
  resetStatus: string | null;
  storageStatus: MobileAssumptionStorageStatus;
}) {
  const statusCopy = mobileStorageStatusCopy[storageStatus];

  return (
    <View style={{ gap: 12 }}>
      <FinancialCard
        title="Local Demo Storage"
        value={statusCopy.value}
        detail={`${statusCopy.detail} No production backend is connected.`}
      />
      <View
        testID="settings-backend-readiness"
        accessibilityLabel="Backend readiness"
        style={{ gap: 12 }}
      >
        <FinancialCard
          title="Backend Status"
          value="Local demo mode"
          detail="Data stays on this device or exported web browser until auth, access rules, and snapshot migration are selected."
        />
        {mobileBackendReadinessOptions.map((option) => (
          <FinancialCard
            key={option.id}
            title={option.label}
            value={option.status}
            detail={option.detail}
          />
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset mobile starter assumptions"
          onPress={onResetAssumptions}
          testID="settings-reset-mobile-assumptions"
          style={{
            alignItems: 'center',
            backgroundColor: '#047857',
            borderColor: '#34d399',
            borderCurve: 'continuous',
            borderRadius: 14,
            borderWidth: 1,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Text selectable style={{ color: '#ecfdf5', fontSize: 14, fontWeight: '900' }}>
            Reset Starter Assumptions
          </Text>
        </Pressable>
        {resetStatus ? (
          <Text
            accessibilityLiveRegion="polite"
            selectable
            testID="settings-reset-mobile-assumptions-status"
            style={{ color: '#bbf7d0', fontSize: 13, lineHeight: 19 }}
          >
            {resetStatus}
          </Text>
        ) : null}
      </View>
      <MobileSupabaseAccount assumptions={assumptions} />
    </View>
  );
}

export function MobileShell({ initialMode = 'dashboard' }: { initialMode?: MobileMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<MobileMode>(initialMode);
  const [settingsResetStatus, setSettingsResetStatus] = useState<string | null>(null);
  const { input, resetAssumptions, setInput, storageStatus } = usePersistedMobileAssumptions();
  const snapshot = buildMobileDashboardSnapshot(input);
  const cockpit = buildMobileCockpitSnapshot(input);
  const portfolio = buildMobilePortfolioSnapshot(input);
  const simulator = buildMobileSimulatorSnapshot(input);
  const vault = buildMobileVaultSnapshot(input);
  const learn = buildMobileLearnSnapshot(input);
  const title = modes.find((item) => item.id === mode)?.label ?? 'Dashboard';
  const subtitle = mode === 'settings'
    ? 'Settings keeps encrypted local storage, backend readiness, and optional private account sync explicit.'
    : `${title} runs from the shared financial engine so web and native assumptions stay aligned.`;
  const handleModeChange = (nextMode: MobileMode) => {
    setMode(nextMode);
    router.push(modeRoutes[nextMode] as Href);
  };
  const handleResetAssumptions = () => {
    setSettingsResetStatus('Restoring starter assumptions...');
    resetAssumptions()
      .then((backend) => {
        setSettingsResetStatus(
          backend === 'unavailable'
            ? 'Starter assumptions restored for this session. Local persistence is unavailable.'
            : 'Starter assumptions restored and saved on this device.'
        );
      })
      .catch(() => {
        setSettingsResetStatus('Reset could not save locally. Review storage permissions and try again.');
      });
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: '#020617' }}
      contentContainerStyle={{ gap: 18, padding: 18, paddingBottom: 36 }}
    >
      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: '#94a3b8', fontSize: 14, fontWeight: '700' }}>
          Money Loop Mobile
        </Text>
        <Text selectable style={{ color: '#f8fafc', fontSize: 34, fontWeight: '900', lineHeight: 38 }}>
          InterestShield
        </Text>
        <Text selectable style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 22 }}>
          {subtitle}
        </Text>
      </View>

      <MobileModeNavigation activeMode={mode} onModeChange={handleModeChange} />

      {mode === 'settings' ? null : <AssumptionControls input={input} onChange={setInput} />}
      <StorageStatusCard status={storageStatus} />

      {mode === 'dashboard' ? <DashboardPanel snapshot={snapshot} /> : null}
      {mode === 'simulator' ? <SimulatorPanel snapshot={snapshot} simulator={simulator} /> : null}
      {mode === 'cockpit' ? <CockpitPanel cockpit={cockpit} /> : null}
      {mode === 'portfolio' ? <PortfolioPanel portfolio={portfolio} /> : null}
      {mode === 'learn' ? <LearnPanel learn={learn} /> : null}
      {mode === 'vault' ? <VaultPanel vault={vault} /> : null}
      {mode === 'settings' ? (
        <SettingsPanel
          assumptions={input}
          onResetAssumptions={handleResetAssumptions}
          resetStatus={settingsResetStatus}
          storageStatus={storageStatus}
        />
      ) : null}

      <Text selectable style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
        Educational tool. Not financial advice.
      </Text>
    </ScrollView>
  );
}
