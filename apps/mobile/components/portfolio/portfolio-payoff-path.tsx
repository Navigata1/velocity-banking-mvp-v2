import type { PortfolioPathVisualModel } from '@interestshield/financial-engine/portfolio-path';
import { formatCurrency } from '@interestshield/financial-engine';
import { Text, View } from 'react-native';
import { FinancialCard } from '../financial-card';

export function PortfolioPayoffPath({ path }: { path: PortfolioPathVisualModel }) {
  return (
    <FinancialCard title="Portfolio Payoff Path">
      <View testID="mobile-portfolio-payoff-path" accessibilityLabel="Portfolio payoff path" style={{ gap: 12, minWidth: 0 }}>
        <Text style={{ color: '#cbd5e1', fontSize: 14 }}>{path.statusLabel}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 132 }}>
          {path.sampledPoints.map((point, index) => (
            <View key={point.month} testID={`mobile-portfolio-payoff-path-node-${index}`} accessible
              accessibilityRole="text"
              accessibilityLabel={`Month ${point.month}. Modeled balance ${formatCurrency(point.balance)}. Interest this month ${formatCurrency(point.interest)}. ${point.targetCount} targets.`}
              style={{ flex: 1, minWidth: 0, height: '100%', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: path.isProjected ? '#34d399' : '#fbbf24', borderRadius: 4,
                height: Math.max(2, 132 * point.balance / path.maxBalance) }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>Month 0</Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, flex: 1, textAlign: 'right' }}>{path.isProjected ? `Month ${path.payoffMonths}` : path.statusLabel}</Text>
        </View>
      </View>
    </FinancialCard>
  );
}
