import type { MobileDashboardInput } from '@interestshield/financial-engine';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import { MobileSupabaseAccount } from '@/components/mobile-supabase-account';
import type { MobileAssumptionStorageStatus } from '@/hooks/use-persisted-mobile-assumptions';
import type { MobileAssumptionStorageBackend } from '@/lib/mobile-assumption-storage';
import type { MobileSnapshotOwnerLock } from '@/lib/supabase/auth-storage';
import { mobileStorageStatusCopy } from '../mobile-shell/controls';
import { MobileRouteScreen } from './route-screen';

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
  assumptionsReady,
  onResetAssumptions,
  onReplaceAssumptions,
  resetStatus,
  storageStatus,
}: {
  assumptions: MobileDashboardInput;
  assumptionsReady: boolean;
  onResetAssumptions: () => void;
  onReplaceAssumptions: (
    input: MobileDashboardInput,
    ownerLock?: MobileSnapshotOwnerLock,
    expectedRevision?: number
  ) => Promise<MobileAssumptionStorageBackend>;
  resetStatus: string | null;
  storageStatus: MobileAssumptionStorageStatus;
}) {
  const statusCopy = mobileStorageStatusCopy[storageStatus];
  return (
    <View style={{ gap: 12 }}>
      <FinancialCard title="Local Demo Storage" value={statusCopy.value} detail={`${statusCopy.detail} No production backend is connected.`} />
      <View testID="settings-backend-readiness" accessibilityLabel="Backend readiness" style={{ gap: 12 }}>
        <FinancialCard
          title="Backend Status"
          value="Local demo mode"
          detail="Data stays on this device or exported web browser until auth, access rules, and snapshot migration are selected."
        />
        {mobileBackendReadinessOptions.map((option) => (
          <FinancialCard key={option.id} title={option.label} value={option.status} detail={option.detail} />
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset mobile starter assumptions"
          disabled={!assumptionsReady}
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
            opacity: assumptionsReady ? 1 : 0.65,
            paddingVertical: 12,
          }}
        >
          <Text selectable style={{ color: '#ecfdf5', fontSize: 14, fontWeight: '900' }}>
            Reset Starter Assumptions
          </Text>
        </Pressable>
        {resetStatus ? (
          <Text accessibilityLiveRegion="polite" selectable testID="settings-reset-mobile-assumptions-status" style={{ color: '#bbf7d0', fontSize: 13, lineHeight: 19 }}>
            {resetStatus}
          </Text>
        ) : null}
      </View>
      <MobileSupabaseAccount
        assumptions={assumptions}
        assumptionsReady={assumptionsReady}
        onReplaceAssumptions={onReplaceAssumptions}
      />
    </View>
  );
}

export function SettingsRoute() {
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  return (
    <MobileRouteScreen
      mode="settings"
      showAssumptionControls={false}
      renderContent={({ input, isHydrated, replaceAssumptions, resetAssumptions, storageStatus }) => {
        const handleResetAssumptions = () => {
          setResetStatus('Restoring starter assumptions...');
          resetAssumptions()
            .then((backend) => {
              setResetStatus(
                backend === 'unavailable'
                  ? 'Starter assumptions restored for this session. Local persistence is unavailable.'
                  : 'Starter assumptions restored and saved on this device.'
              );
            })
            .catch(() => {
              setResetStatus('Reset could not save locally. Review storage permissions and try again.');
            });
        };
        return (
          <SettingsPanel
            assumptions={input}
            assumptionsReady={isHydrated}
            onReplaceAssumptions={replaceAssumptions}
            onResetAssumptions={handleResetAssumptions}
            resetStatus={resetStatus}
            storageStatus={storageStatus}
          />
        );
      }}
    />
  );
}
