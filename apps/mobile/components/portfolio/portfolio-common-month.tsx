import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import { commonMonthStatusLabel, preparePortfolioComparison, formatCommonMonthAmount, parseCommonMonthDraft } from '@interestshield/financial-engine/portfolio-common-month';
import { MOBILE_NUMBER_INPUT_ACCESSORY_ID } from '../mobile-shell/number-input';

const labels = { velocity: 'Velocity Mode', snowball: 'Snowball', avalanche: 'Avalanche' };
export function PortfolioCommonMonth({ book, disabled = false }: { book: PortfolioBook; disabled?: boolean }) {
  const [draft, setDraft] = useState('60');
  const month = parseCommonMonthDraft(draft);
  const prepared = useMemo(() => preparePortfolioComparison(book), [book]);
  const comparison = useMemo(() => prepared.atMonth(month ?? NaN), [prepared, month]);
  const reference = comparison.referenceStrategy ? labels[comparison.referenceStrategy] : 'selected plan';
  return <View testID="common-month-comparison" style={styles.section}>
    <View style={styles.header}>
      <View style={styles.title}>
        <Text accessibilityRole="header" style={styles.heading}>Same-Month Comparison</Text>
        <Text testID="common-month-period" style={styles.detail}>{month === null ? 'Month not selected' : `Month ${month}`}</Text>
      </View>
      <View style={styles.control}>
        <Text style={styles.detail}>Comparison month</Text>
        <TextInput accessibilityLabel="Comparison month" inputMode="numeric" keyboardType="number-pad"
          inputAccessoryViewID={MOBILE_NUMBER_INPUT_ACCESSORY_ID} value={draft} editable={!disabled}
          onChangeText={value => { if (!disabled) setDraft(value); }} style={styles.input} />
      </View>
    </View>
    {month === null ? <Text testID="common-month-error" accessibilityRole="alert" style={styles.warning}>Month must be a whole number from 0 to 600.</Text> : null}
    <Text style={styles.detail}>Same listed debts, LOC and household cash flow. Net modeled wealth is cash minus those liabilities, not total household wealth. After exact payoff, unchanged cash flow accumulates without returns or new debt. Amounts are independently rounded.</Text>
    {comparison.plans.map(plan => {
      const s = plan.snapshot;
      const metrics = [['cash', 'Cash', s.cashBalance], ['debt', 'Listed debts', s.debtBalance],
        ['loc', 'LOC balance', s.locBalance], ['net', 'Net modeled wealth', s.netModeledWealth],
        ['difference', `Net difference vs ${reference}`, plan.wealthDifference]] as const;
      return <View key={plan.strategy} testID={`common-month-plan-${plan.strategy}`} style={styles.plan}>
        <Text accessibilityRole="header" style={styles.planHeading}>{labels[plan.strategy]}</Text>
        <Text style={s.status === 'unavailable' ? styles.warning : styles.detail}>{commonMonthStatusLabel(s)}</Text>
        <View style={styles.metrics}>
          {metrics.map(([id, label, value]) => <View key={id} style={styles.metric}>
            <Text style={styles.detail}>{label}</Text>
            <Text testID={`common-month-${id}-${plan.strategy}`} style={styles.amount}>{formatCommonMonthAmount(value)}</Text>
          </View>)}
        </View>
        {plan.payoff && !plan.payoff.possible ? <Text style={styles.detail}>Payoff projection needs review.</Text> : null}
      </View>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  section: { borderTopColor: '#334155', borderTopWidth: 1, paddingTop: 20, gap: 16, minWidth: 0 },
  header: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', minWidth: 0 },
  title: { flexBasis: 180, flexGrow: 1, gap: 4 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: '#f8fafc' },
  control: { width: 120, gap: 4 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#5eead4', borderRadius: 4, paddingHorizontal: 12,
    fontSize: 14, color: '#f8fafc', backgroundColor: '#020617' },
  detail: { fontSize: 12, lineHeight: 18, color: '#94a3b8' },
  warning: { fontSize: 12, lineHeight: 18, color: '#fbbf24' },
  plan: { borderTopColor: '#334155', borderTopWidth: 1, paddingTop: 16, gap: 8, minWidth: 0 },
  planHeading: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: '#f8fafc' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, minWidth: 0 },
  metric: { flexBasis: '40%', flexGrow: 1, gap: 4, minWidth: 0 },
  amount: { fontSize: 12, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'], color: '#f8fafc' },
});
