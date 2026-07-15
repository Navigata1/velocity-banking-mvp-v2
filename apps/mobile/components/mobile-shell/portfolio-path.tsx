import type { MobilePortfolioPathSnapshot } from '@interestshield/financial-engine';
import { Text, View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import { portfolioPointAccessibilityLabel } from '@/lib/accessibility-labels';

export function MobilePortfolioPath({ path }: { path: MobilePortfolioPathSnapshot }) {
  const tone = path.isProjected
    ? { accent: '#34d399', surface: '#064e3b', text: '#bbf7d0' }
    : { accent: '#fbbf24', surface: '#78350f', text: '#fde68a' };

  return (
    <FinancialCard title="Portfolio Payoff Path">
      <View
        testID="mobile-portfolio-payoff-path"
        accessibilityLabel="Portfolio payoff path"
        style={{
          backgroundColor: '#020617',
          borderColor: tone.accent,
          borderCurve: 'continuous',
          borderRadius: 18,
          borderWidth: 1,
          gap: 14,
          padding: 14,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
              Balance descent
            </Text>
            <Text selectable style={{ color: '#f8fafc', fontSize: 22, fontWeight: '900', lineHeight: 28 }}>
              {path.startingBalanceLabel} to {path.isProjected ? '$0' : 'review'}
            </Text>
          </View>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: tone.surface,
              borderColor: tone.accent,
              borderCurve: 'continuous',
              borderRadius: 10,
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 7,
            }}
          >
            <Text selectable style={{ color: tone.text, fontSize: 12, fontWeight: '900' }}>
              {path.statusLabel}
            </Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <View
            style={{
              backgroundColor: '#0f172a',
              borderColor: '#1e293b',
              borderCurve: 'continuous',
              borderRadius: 16,
              borderWidth: 1,
              height: 124,
              justifyContent: 'flex-end',
              overflow: 'hidden',
              padding: 12,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 7, height: 82, alignItems: 'flex-end' }}>
              {path.points.map((point, index) => (
                <View
                  key={`${point.month}-${index}`}
                  testID={`mobile-portfolio-payoff-path-node-${index}`}
                  accessible
                  accessibilityLabel={portfolioPointAccessibilityLabel(point)}
                  accessibilityRole="text"
                  style={{
                    alignItems: 'center',
                    flex: 1,
                    gap: 6,
                    justifyContent: 'flex-end',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: tone.accent,
                      borderRadius: 999,
                      height: 8,
                      opacity: path.isProjected ? 1 : 0.55,
                      width: 8,
                    }}
                  />
                  <View
                    style={{
                      backgroundColor: tone.accent,
                      borderRadius: 999,
                      height: `${Math.max(8, Math.round(point.progressPercent))}%`,
                      opacity: path.isProjected ? 0.86 : 0.42,
                      width: '100%',
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800' }}>
              Month 0
            </Text>
            <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800' }}>
              {path.payoffMonthsLabel}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View
            accessible
            accessibilityLabel="Portfolio payoff progress"
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(path.progressPercent),
              text: `${path.statusLabel}. ${path.payoffMonthsLabel}.`,
            }}
            style={{ minWidth: 120, flex: 1 }}
          >
            <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
              Progress
            </Text>
            <Text selectable style={{ color: tone.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>
              {Math.round(path.progressPercent)}%
            </Text>
          </View>
          <View style={{ minWidth: 120, flex: 1 }}>
            <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
              Interest estimate
            </Text>
            <Text selectable style={{ color: '#f8fafc', fontSize: 18, fontWeight: '900', marginTop: 4 }}>
              {path.totalInterestLabel}
            </Text>
          </View>
        </View>
      </View>
    </FinancialCard>
  );
}
