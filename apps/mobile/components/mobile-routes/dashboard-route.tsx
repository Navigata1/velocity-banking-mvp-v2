import { buildMobileDashboardSnapshot } from '@interestshield/financial-engine';
import { Text, View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import { MobileMoneyLoopOrbit, MobileMoneyLoopPressureStrip } from '../mobile-shell/money-loop-visuals';
import { MobileRouteScreen } from './route-screen';

export function DashboardRoute() {
  return (
    <MobileRouteScreen
      mode="dashboard"
      renderContent={({ input }) => {
        const snapshot = buildMobileDashboardSnapshot(input);
        return (
          <View style={{ gap: 12 }}>
            {snapshot.vitals.map((vital) => (
              <FinancialCard key={vital.label} title={vital.label} value={vital.value} detail={vital.detail} />
            ))}

            {snapshot.warning ? (
              <FinancialCard title="Review Before Modeling" value={snapshot.nextMove} detail={snapshot.warning} />
            ) : (
              <FinancialCard title="Coach Note" value={snapshot.nextMove} detail="Educational estimate. Not financial advice." />
            )}

            <FinancialCard title="Money Loop">
              <View style={{ gap: 12 }}>
                <MobileMoneyLoopOrbit steps={snapshot.loop} />
                <MobileMoneyLoopPressureStrip steps={snapshot.loop} />
                {snapshot.loop.map((step) => (
                  <View key={step.label} style={{ gap: 2 }}>
                    <Text selectable style={{ color: '#f8fafc', fontSize: 16, fontWeight: '800' }}>
                      {step.label}: {step.value}
                    </Text>
                    <Text selectable style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 19 }}>
                      {step.detail}
                    </Text>
                  </View>
                ))}
              </View>
            </FinancialCard>
          </View>
        );
      }}
    />
  );
}
