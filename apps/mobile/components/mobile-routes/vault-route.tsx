import { buildMobileVaultSnapshot } from '@interestshield/financial-engine';
import { View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import { MobileRouteScreen } from './route-screen';

export function VaultRoute() {
  return (
    <MobileRouteScreen
      mode="vault"
      renderContent={({ input }) => {
        const vault = buildMobileVaultSnapshot(input);
        return (
          <View style={{ gap: 12 }}>
            <FinancialCard
              title="Freedom Path"
              value={vault.freedomPathLabel}
              detail={vault.guardrail ?? 'Modeled from the same shared engine used by Dashboard, Simulator, and Cockpit.'}
            />
            {vault.stages.map((stage) => (
              <FinancialCard key={stage.title} title={stage.title} value={stage.value} detail={stage.detail} />
            ))}
          </View>
        );
      }}
    />
  );
}
