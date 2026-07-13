import {
  buildMobileDashboardSnapshot,
  buildMobileSimulatorSnapshot,
  type MobileSimulatorSnapshot,
} from '@interestshield/financial-engine';
import { Text, View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import { MobileRouteScreen } from './route-screen';

function SimulatorStrategyPanel({ simulator }: { simulator: MobileSimulatorSnapshot }) {
  return (
    <FinancialCard title="Strategy Comparison">
      <View style={{ gap: 12 }}>
        {simulator.strategies.map((strategy) => (
          <View
            key={strategy.name}
            style={{
              borderColor: strategy.name === simulator.fastestStrategyName ? '#34d399' : '#243244',
              borderCurve: 'continuous',
              borderRadius: 12,
              borderWidth: 1,
              gap: 4,
              padding: 12,
            }}
          >
            <Text selectable style={{ color: '#f8fafc', fontSize: 16, fontWeight: '800' }}>
              {strategy.name}: {strategy.monthsLabel}
            </Text>
            <Text selectable style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 19 }}>
              {strategy.totalInterestLabel} interest. {strategy.statusLabel ?? strategy.interestLabel}
            </Text>
          </View>
        ))}
      </View>
    </FinancialCard>
  );
}

export function SimulatorRoute() {
  return (
    <MobileRouteScreen
      mode="simulator"
      renderContent={({ input }) => {
        const snapshot = buildMobileDashboardSnapshot(input);
        const simulator = buildMobileSimulatorSnapshot(input);
        return (
          <View style={{ gap: 12 }}>
            <FinancialCard
              title="Current Plan"
              value={snapshot.nextMove}
              detail={simulator.guardrail ?? snapshot.warning ?? 'Inputs are ready for a simulator pass.'}
            />
            <FinancialCard
              title="Velocity Delta"
              value={simulator.velocity.interestSavedLabel}
              detail={simulator.velocity.monthsSavedLabel}
            />
            <FinancialCard
              title="Interest Visibility"
              value={snapshot.vitals[1].value}
              detail="LOC interest and debt interest stay visible before any modeled payoff difference is shown."
            />
            <SimulatorStrategyPanel simulator={simulator} />
          </View>
        );
      }}
    />
  );
}
