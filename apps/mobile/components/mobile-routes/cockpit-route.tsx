import { buildMobileCockpitSnapshot } from '@interestshield/financial-engine';
import { Text, View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import { MobileRouteScreen } from './route-screen';

export function CockpitRoute() {
  return (
    <MobileRouteScreen
      mode="cockpit"
      renderContent={({ input }) => {
        const cockpit = buildMobileCockpitSnapshot(input);
        return (
          <View style={{ gap: 12 }}>
            <FinancialCard
              title="Flight Status"
              value={cockpit.flightStatusLabel}
              detail={cockpit.warning ?? 'Core Money Loop instruments are ready for an educational pass.'}
            />
            <FinancialCard title="Instruments">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {cockpit.instruments.map((instrument) => (
                  <View
                    key={instrument.label}
                    style={{
                      borderColor:
                        instrument.status === 'danger'
                          ? '#fb7185'
                          : instrument.status === 'warning'
                            ? '#f59e0b'
                            : '#34d399',
                      borderCurve: 'continuous',
                      borderRadius: 12,
                      borderWidth: 1,
                      gap: 4,
                      minWidth: 150,
                      padding: 12,
                    }}
                  >
                    <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
                      {instrument.label}
                    </Text>
                    <Text selectable style={{ color: '#f8fafc', fontSize: 20, fontVariant: ['tabular-nums'], fontWeight: '900' }}>
                      {instrument.value}
                    </Text>
                    <Text selectable style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 19 }}>
                      {instrument.detail}
                    </Text>
                  </View>
                ))}
              </View>
            </FinancialCard>
            <FinancialCard title="Flight Checks">
              <View style={{ gap: 10 }}>
                {cockpit.flightChecks.map((check) => (
                  <View key={check.label} style={{ gap: 2 }}>
                    <Text selectable style={{ color: check.passed ? '#bbf7d0' : '#fecdd3', fontSize: 15, fontWeight: '800' }}>
                      {check.passed ? 'Pass' : 'Review'}: {check.label}
                    </Text>
                    <Text selectable style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 19 }}>
                      {check.detail}
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
