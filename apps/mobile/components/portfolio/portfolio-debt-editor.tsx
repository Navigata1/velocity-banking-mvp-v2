import type { PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import * as Crypto from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { FinancialCard } from '../financial-card';
import { FinancialNumberInput } from '../mobile-shell/number-input';
import { ChoiceControl } from './choice-control';

type Debt = PortfolioBook['debts'][number];
type Props = {
  book: PortfolioBook;
  disabled?: boolean;
  onChange: (update: (current: PortfolioBook) => PortfolioBook) => void;
};
type Removal = { debt: Debt; index: number; nextId?: string };

const categories = [
  { value: 'mortgage', label: 'Mortgage' }, { value: 'auto', label: 'Auto' },
  { value: 'credit_card', label: 'Credit card' }, { value: 'student_loan', label: 'Student loan' },
  { value: 'personal_loan', label: 'Personal loan' }, { value: 'medical', label: 'Medical' },
  { value: 'land', label: 'Land' }, { value: 'purchase_plan', label: 'Purchase plan' },
  { value: 'custom', label: 'Custom' },
] as const;
const kinds = [
  { value: 'amortized', label: 'Amortized' }, { value: 'revolving', label: 'Revolving' }, { value: 'simple', label: 'Simple' },
] as const;
const sources = [
  { value: 'checking', label: 'Checking' }, { value: 'loc', label: 'LOC' }, { value: 'either', label: 'Either' },
] as const;
const minimumModes = [{ value: 'fixed', label: 'Fixed' }, { value: 'percent', label: 'Percent' }] as const;

function DebtTextInput({ accessibilityLabel, label, value, disabled, onChange, required = false, multiline = false }: {
  accessibilityLabel: string;
  label: string;
  value: string | undefined;
  disabled: boolean;
  onChange: (value: string) => void;
  required?: boolean;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value ?? '');
  const [error, setError] = useState('');
  const session = useRef<{ value: string | undefined; draft: string } | null>(null);
  useEffect(() => {
    session.current = null;
    setDraft(value ?? '');
    setError('');
    return () => { session.current = null; };
  }, [value, disabled]);

  const commit = () => {
    const edit = session.current;
    session.current = null;
    if (!edit || disabled || edit.value !== value) {
      setDraft(value ?? '');
      return;
    }
    if (required && !edit.draft.trim()) {
      setDraft(value ?? '');
      setError('Enter a name for this simulated debt.');
      return;
    }
    setError('');
    if (edit.draft !== (value ?? '')) onChange(edit.draft);
  };

  return (
    <View style={styles.textField}>
      <Text accessible={false} style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={accessibilityLabel} accessibilityHint={error || undefined}
        editable={!disabled} multiline={multiline} value={draft}
        onFocus={() => { session.current = { value, draft: value ?? '' }; setDraft(value ?? ''); setError(''); }}
        onChangeText={next => {
          if (disabled) return;
          session.current ??= { value, draft: value ?? '' };
          session.current.draft = next;
          setDraft(next); setError('');
        }}
        onBlur={commit} onSubmitEditing={multiline ? undefined : commit}
        submitBehavior={multiline ? 'newline' : 'blurAndSubmit'}
        style={[styles.textInput, multiline && styles.notes, Boolean(error) && styles.invalid]} />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function DebtFields({ debt, index, disabled, onChange, onRemove }: {
  debt: Debt;
  index: number;
  disabled: boolean;
  onChange: (update: (current: Debt) => Debt) => void;
  onRemove: () => void;
}) {
  const prefix = `Debt ${index + 1}`;
  function change<K extends keyof Debt>(key: K, value: Debt[K]) {
    if (disabled) return;
    onChange(current => Object.is(current[key], value) ? current : { ...current, [key]: value });
  }
  function changeMinimum(key: 'amount' | 'percent' | 'floor', value: number) {
    if (disabled) return;
    onChange(current => {
      const rule = current.minPaymentRule;
      if (rule.type === 'fixed' && key === 'amount') return Object.is(rule.amount, value) ? current
        : { ...current, minPaymentRule: { ...rule, amount: value } };
      if (rule.type === 'percent' && key !== 'amount') return Object.is(rule[key], value) ? current
        : { ...current, minPaymentRule: { ...rule, [key]: value } };
      return current;
    });
  }
  function changePromo(key: 'introApr' | 'monthsRemaining' | 'postIntroApr', value: number) {
    if (disabled) return;
    onChange(current => !current.promo || Object.is(current.promo[key], value) ? current
      : { ...current, promo: { ...current.promo, [key]: value } });
  }

  return (
    <FinancialCard title={`${prefix} - simulated`}>
      <DebtTextInput accessibilityLabel={`${prefix} name`} label="Name" value={debt.name} required
        disabled={disabled} onChange={value => change('name', value)} />
      <View style={styles.fields}>
        <FinancialNumberInput accessibilityLabel={`${prefix} balance`} label="Balance ($)" kind="money"
          disabled={disabled} value={debt.balance} onChange={value => change('balance', value)} />
        <FinancialNumberInput accessibilityLabel={`${prefix} APR`} label="APR (%)" kind="percent"
          disabled={disabled} value={debt.apr} onChange={value => change('apr', value)} />
      </View>
      <ChoiceControl label="Category" accessibilityLabel={`${prefix} category`} mode="menu"
        value={debt.category} options={categories} disabled={disabled} onChange={value => change('category', value)} />
      <ChoiceControl label="Kind" accessibilityLabel={`${prefix} kind`} mode="menu"
        value={debt.kind} options={kinds} disabled={disabled} onChange={value => change('kind', value)} />
      <ChoiceControl label="Payment source" accessibilityLabel={`${prefix} payment source`} mode="menu"
        value={debt.paymentSource} options={sources} disabled={disabled} onChange={value => change('paymentSource', value)} />
      <ChoiceControl label="Minimum payment" accessibilityLabel={`${prefix} minimum`} value={debt.minPaymentRule.type}
        options={minimumModes} disabled={disabled} onChange={type => {
          if (disabled) return;
          onChange(current => current.minPaymentRule.type === type ? current : { ...current,
            minPaymentRule: type === 'fixed'
              ? { type, amount: current.minPaymentRule.type === 'percent' ? current.minPaymentRule.floor : 0 }
              : { type, percent: 0, floor: current.minPaymentRule.type === 'fixed' ? current.minPaymentRule.amount : 0 } });
        }} />
      <View style={styles.fields}>
        {debt.minPaymentRule.type === 'fixed' ? (
          <FinancialNumberInput accessibilityLabel={`${prefix} minimum payment`} label="Minimum payment ($)" kind="money"
            disabled={disabled} value={debt.minPaymentRule.amount} onChange={value => changeMinimum('amount', value)} />
        ) : (
          <>
            <FinancialNumberInput accessibilityLabel={`${prefix} minimum percent`} label="Minimum percent (%)" kind="percent"
              disabled={disabled} value={debt.minPaymentRule.percent} onChange={value => changeMinimum('percent', value)} />
            <FinancialNumberInput accessibilityLabel={`${prefix} minimum floor`} label="Minimum floor ($)" kind="money"
              disabled={disabled} value={debt.minPaymentRule.floor} onChange={value => changeMinimum('floor', value)} />
          </>
        )}
      </View>
      <View style={styles.switchRow}>
        <Text accessible={false} style={styles.switchLabel}>Promotional APR</Text>
        <Switch accessibilityLabel={`${prefix} promotional APR`} disabled={disabled} value={Boolean(debt.promo)}
          onValueChange={enabled => {
            if (disabled) return;
            onChange(current => {
              if (enabled === Boolean(current.promo)) return current;
              if (enabled) return { ...current, promo: { introApr: 0, monthsRemaining: 0, postIntroApr: current.apr } };
              const { promo: _promo, ...withoutPromo } = current;
              return withoutPromo;
            });
          }} trackColor={{ false: '#475569', true: '#0f766e' }} thumbColor="#f8fafc"
          style={styles.switch} />
      </View>
      {debt.promo ? (
        <View style={styles.fields}>
          <FinancialNumberInput accessibilityLabel={`${prefix} promo APR`} label="Promo APR (%)" kind="percent"
            disabled={disabled} value={debt.promo.introApr} onChange={value => changePromo('introApr', value)} />
          <FinancialNumberInput accessibilityLabel={`${prefix} promo months remaining`} label="Promo months remaining" kind="whole"
            disabled={disabled} value={debt.promo.monthsRemaining} onChange={value => changePromo('monthsRemaining', value)} />
          <FinancialNumberInput accessibilityLabel={`${prefix} post-promo APR`} label="Post-promo APR (%)" kind="percent"
            disabled={disabled} value={debt.promo.postIntroApr} onChange={value => changePromo('postIntroApr', value)} />
        </View>
      ) : null}
      {debt.termMonths !== undefined ? (
        <View style={styles.recordedTerm}>
          <FinancialNumberInput accessibilityLabel={`${prefix} recorded term months`} label="Recorded term (months)" kind="whole"
            minimum={1} disabled={disabled} value={debt.termMonths} onChange={value => change('termMonths', value)} />
          <Text style={styles.detail}>Recorded term is reference only. This estimate uses the minimum payments entered above.</Text>
        </View>
      ) : null}
      <DebtTextInput accessibilityLabel={`${prefix} notes`} label="Notes" value={debt.notes} multiline
        disabled={disabled} onChange={value => change('notes', value)} />
      <Pressable accessibilityLabel={`Remove simulated debt ${index + 1}`} accessibilityRole="button"
        accessibilityState={{ disabled }} disabled={disabled} onPress={onRemove}
        style={({ pressed }) => [styles.command, { opacity: disabled || pressed ? 0.6 : 1 }]}>
        <Text style={styles.removeText}>Remove simulated debt</Text>
      </Pressable>
    </FinancialCard>
  );
}

export function PortfolioDebtEditor({ book, disabled = false, onChange }: Props) {
  const [removed, setRemoved] = useState<Removal | null>(null);
  useEffect(() => { setRemoved(null); }, [disabled]);

  function changeDebt(id: string, update: (current: Debt) => Debt) {
    if (disabled) return;
    onChange(current => {
      const debt = current.debts.find(item => item.id === id);
      if (!debt) return current;
      const next = update(debt);
      return next === debt ? current : { ...current, debts: current.debts.map(item => item.id === id ? next : item) };
    });
  }
  function addDebt() {
    if (disabled) return;
    const debt: Debt = { id: Crypto.randomUUID(), name: 'New simulated debt', category: 'custom', kind: 'amortized',
      balance: 0, apr: 0, minPaymentRule: { type: 'fixed', amount: 0 }, paymentSource: 'checking', createdAt: new Date().toISOString() };
    onChange(current => current.debts.some(item => item.id === debt.id) ? current : { ...current, debts: [...current.debts, debt] });
  }
  function removeDebt(debt: Debt, index: number) {
    if (disabled) return;
    const removal = { debt, index, nextId: book.debts[index + 1]?.id };
    setRemoved(removal);
    onChange(current => {
      const present = current.debts.find(item => item.id === debt.id);
      // Do not remove a concurrently edited item with an outdated undo snapshot.
      if (!present || JSON.stringify(present) !== JSON.stringify(debt)) return current;
      return { ...current, debts: current.debts.filter(item => item.id !== debt.id) };
    });
  }
  function undoRemoval() {
    if (disabled || !removed) return;
    const removal = removed;
    onChange(current => {
      if (current.debts.some(item => item.id === removal.debt.id)) return current;
      const nextIndex = current.debts.findIndex(item => item.id === removal.nextId);
      const index = nextIndex < 0 ? Math.min(removal.index, current.debts.length) : nextIndex;
      return { ...current, debts: [...current.debts.slice(0, index), removal.debt, ...current.debts.slice(index)] };
    });
    setRemoved(null);
  }
  const canUndo = removed && !book.debts.some(item => item.id === removed.debt.id);

  return (
    <View style={styles.editor}>
      <Text accessibilityRole="header" style={styles.heading}>Simulated debts</Text>
      {book.debts.length === 0 ? <Text style={styles.detail}>No simulated debts. Any LOC balance remains in this portfolio.</Text> : null}
      {book.debts.map((debt, index) => (
        <DebtFields key={debt.id} debt={debt} index={index} disabled={disabled}
          onChange={update => changeDebt(debt.id, update)} onRemove={() => removeDebt(debt, index)} />
      ))}
      {canUndo ? (
        <View style={styles.undo}>
          <Text accessibilityLiveRegion="polite" style={styles.detail}>Removed {removed.debt.name} from this simulation.</Text>
          <Pressable accessibilityLabel="Undo debt removal" accessibilityRole="button" accessibilityState={{ disabled }}
            disabled={disabled} onPress={undoRemoval} style={({ pressed }) => [styles.command, { opacity: disabled || pressed ? 0.6 : 1 }]}>
            <Text style={styles.commandText}>Undo removal</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable accessibilityLabel="Add simulated debt" accessibilityRole="button" accessibilityState={{ disabled }}
        disabled={disabled} onPress={addDebt} style={({ pressed }) => [styles.command, styles.add, { opacity: disabled || pressed ? 0.6 : 1 }]}>
        <Text style={styles.commandText}>Add simulated debt</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: 16, minWidth: 0 },
  heading: { color: '#f8fafc', fontSize: 18, fontWeight: '800', lineHeight: 24 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, minWidth: 0 },
  textField: { gap: 6, minWidth: 0 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  textInput: { backgroundColor: '#020617', borderColor: '#334155', borderRadius: 12, borderWidth: 1,
    color: '#f8fafc', fontSize: 16, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10 },
  notes: { minHeight: 88, textAlignVertical: 'top' },
  invalid: { borderColor: '#fbbf24' },
  error: { color: '#fbbf24', fontSize: 12, lineHeight: 18 },
  detail: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', minHeight: 48 },
  switchLabel: { color: '#cbd5e1', flex: 1, fontSize: 14, fontWeight: '700' },
  switch: { minHeight: 48, minWidth: 48 },
  recordedTerm: { gap: 4 },
  command: { alignItems: 'center', borderColor: '#475569', borderRadius: 8, borderWidth: 1,
    justifyContent: 'center', minHeight: 48, paddingHorizontal: 12, paddingVertical: 12 },
  add: { backgroundColor: '#173c37', borderColor: '#5eead4' },
  commandText: { color: '#99f6e4', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  removeText: { color: '#fda4af', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  undo: { gap: 8 },
});
