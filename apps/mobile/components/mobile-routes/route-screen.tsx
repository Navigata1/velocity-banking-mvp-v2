import type { ReactNode } from 'react';
import { useRouter, type Href } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import {
  useMobileAssumptions,
  type MobileAssumptionsContextValue,
} from '@/components/mobile-assumptions-provider';
import { AssumptionControls, StorageStatusCard } from '../mobile-shell/controls';
import {
  MobileModeNavigation,
  modeRoutes,
  modes,
  type MobileMode,
} from '../mobile-shell/navigation';

export type MobileRouteContext = MobileAssumptionsContextValue;

export function MobileRouteScreen({
  mode,
  renderContent,
  showAssumptionControls = true,
}: {
  mode: MobileMode;
  renderContent: (context: MobileRouteContext) => ReactNode;
  showAssumptionControls?: boolean;
}) {
  const router = useRouter();
  const context = useMobileAssumptions();
  const title = modes.find((item) => item.id === mode)?.label ?? 'Dashboard';
  const subtitle = mode === 'settings'
    ? 'Settings keeps secure native storage, backend readiness, and optional private account sync explicit.'
    : `${title} runs from the shared financial engine so web and native assumptions stay aligned.`;
  const handleModeChange = (nextMode: MobileMode) => {
    router.push(modeRoutes[nextMode] as Href);
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
      {showAssumptionControls ? <AssumptionControls disabled={!context.isHydrated} input={context.input} onChange={context.setInput} /> : null}
      <StorageStatusCard status={context.storageStatus} />
      {renderContent(context)}

      <Text selectable style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
        Educational tool. Not financial advice.
      </Text>
    </ScrollView>
  );
}
