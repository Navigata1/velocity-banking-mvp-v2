import type { PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import { StyleSheet, Text, View } from 'react-native';
import { FinancialNumberInput } from '../mobile-shell/number-input';
import { ChoiceControl } from './choice-control';

type Props = {
  book: PortfolioBook;
  disabled?: boolean;
  onChange: (update: (current: PortfolioBook) => PortfolioBook) => void;
};

const strategies = [
  { value: 'velocity', label: 'Velocity' },
  { value: 'snowball', label: 'Snowball' },
  { value: 'avalanche', label: 'Avalanche' },
] as const;
const focusModes = [{ value: 'single', label: 'Single' }, { value: 'split', label: 'Split' }] as const;

export function PortfolioControls({ book, disabled = false, onChange }: Props) {
  function change<K extends Exclude<keyof PortfolioBook, 'loc' | 'debts'>>(key: K, value: PortfolioBook[K]) {
    if (disabled) return;
    onChange(current => Object.is(current[key], value) ? current : { ...current, [key]: value });
  }
  function changeLOC(key: keyof PortfolioBook['loc'], value: number) {
    if (disabled) return;
    onChange(current => Object.is(current.loc[key], value) ? current
      : { ...current, loc: { ...current.loc, [key]: value } });
  }

  return (
    <View style={styles.form}>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>Household cash flow</Text>
        <View style={styles.fields}>
          <FinancialNumberInput accessibilityLabel="Portfolio monthly income" label="Monthly income ($)"
            kind="money" disabled={disabled} value={book.monthlyIncome} onChange={value => change('monthlyIncome', value)} />
          <FinancialNumberInput accessibilityLabel="Portfolio monthly expenses" label="Household expenses ($)"
            kind="money" disabled={disabled} value={book.monthlyExpenses} onChange={value => change('monthlyExpenses', value)} />
          <FinancialNumberInput accessibilityLabel="Portfolio extra cap" label="Extra payment cap ($/month)"
            kind="money" disabled={disabled} value={book.extraMonthlyPayment} onChange={value => change('extraMonthlyPayment', value)} />
        </View>
        <Text style={styles.detail}>A $0 cap uses available cash after minimum payments. A positive cap limits that extra payment.</Text>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>Line of credit</Text>
        <View style={styles.fields}>
          <FinancialNumberInput accessibilityLabel="Portfolio LOC limit" label="LOC limit ($)"
            kind="money" disabled={disabled} value={book.loc.limit} onChange={value => changeLOC('limit', value)} />
          <FinancialNumberInput accessibilityLabel="Portfolio LOC balance" label="LOC balance ($)"
            kind="money" disabled={disabled} value={book.loc.balance} onChange={value => changeLOC('balance', value)} />
          <FinancialNumberInput accessibilityLabel="Portfolio LOC APR" label="LOC APR (%)"
            kind="percent" disabled={disabled} value={book.loc.apr} onChange={value => changeLOC('apr', value)} />
        </View>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>Payoff approach</Text>
        <ChoiceControl label="Strategy" accessibilityLabel="Portfolio strategy" value={book.strategy}
          options={strategies} disabled={disabled} onChange={value => change('strategy', value)} />
        <ChoiceControl label="Focus" accessibilityLabel="Portfolio focus" value={book.focusMode}
          options={focusModes} disabled={disabled} onChange={value => change('focusMode', value)} />
        {book.focusMode === 'split' ? (
          <FinancialNumberInput accessibilityLabel="Portfolio primary split percent" label="Primary share (%)"
            kind="percent" maximum={1} disabled={disabled} value={book.splitRatioPrimary}
            onChange={value => change('splitRatioPrimary', value)} />
        ) : null}
        {book.strategy === 'velocity' && book.focusMode === 'single' ? (
          <FinancialNumberInput accessibilityLabel="Portfolio chunk amount" label="LOC chunk ($)"
            kind="money" disabled={disabled} value={book.chunkAmount} onChange={value => change('chunkAmount', value)} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 24, minWidth: 0 },
  section: { gap: 12, minWidth: 0 },
  heading: { color: '#f8fafc', fontSize: 18, fontWeight: '800', lineHeight: 24 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, minWidth: 0 },
  detail: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },
});
