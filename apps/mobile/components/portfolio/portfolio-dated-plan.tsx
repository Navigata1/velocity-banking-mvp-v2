import { useLayoutEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { DATED_EVENT_LIMIT, type DatedPortfolioPlan } from '@interestshield/financial-engine/dated-plan';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createMobileDatedPlanDraft, mobileDatedPlanFields, readMobileDatedPlanDraft,
  type MobileDatedCashDraft, type MobileDatedPlanDraft } from '../../lib/mobile-dated-plan-draft';
import { ChoiceControl } from './choice-control';

type Props = { plan?: DatedPortfolioPlan; disabled?: boolean; onSave: (plan: DatedPortfolioPlan | null) => Promise<unknown> };
const sources = [{ value: '', label: 'Not entered' }, { value: 'checking', label: 'Checking' }, { value: 'loc', label: 'LOC' }] as const;

export function PortfolioDatedPlan(props: Props) {
  const [expanded, setExpanded] = useState(false), [working, setWorking] = useState(false);
  const active = useRef(false), busy = useRef(false);
  useLayoutEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const disabled = Boolean(props.disabled || working);
  const onWorking = (value: boolean) => { busy.current = value; if (active.current) setWorking(value); };
  return <View testID="native-dated-plan" style={styles.section}>
    <Pressable accessibilityRole="button" accessibilityLabel="Dated plan" accessibilityState={{ expanded, disabled }}
      disabled={disabled} style={styles.command} onPress={() => { if (active.current && !props.disabled && !busy.current) setExpanded(value => !value); }}>
      <Text style={styles.commandText}>Dated plan {props.plan === undefined ? '(optional)' : '(saved)'}</Text>
    </Pressable>
    {expanded ? <DatedPlanFields key={JSON.stringify(props.plan) ?? 'no-plan'} {...props} disabled={disabled} working={working} onWorking={onWorking} /> : null}
  </View>;
}

function DatedPlanFields(props: Props & { working: boolean; onWorking: (working: boolean) => void }) {
  const [draft, setDraft] = useState(() => createMobileDatedPlanDraft(props.plan));
  const [error, setError] = useState('');
  const current = useRef<Props | null>(props), busy = useRef(false);
  useLayoutEffect(() => { current.current = props; });
  useLayoutEffect(() => () => { current.current = null; }, []);
  const disabled = Boolean(props.disabled);
  const editable = () => current.current !== null && !current.current.disabled && !busy.current;
  function edit(change: (draft: MobileDatedPlanDraft) => MobileDatedPlanDraft) {
    if (!editable()) return;
    setDraft(change); setError('');
  }
  function editEvent(id: string, patch: Partial<MobileDatedCashDraft>) {
    edit(value => ({ ...value, cashEvents: value.cashEvents.map(event => event.id === id ? { ...event, ...patch } : event) }));
  }
  function move(id: string, offset: number) {
    edit(value => {
      const cashEvents = [...value.cashEvents], index = cashEvents.findIndex(event => event.id === id), next = index + offset;
      if (index < 0 || next < 0 || next >= cashEvents.length) return value;
      [cashEvents[index], cashEvents[next]] = [cashEvents[next], cashEvents[index]];
      return { ...value, cashEvents };
    });
  }
  function add(kind: 'income' | 'expense') {
    edit(value => value.cashEvents.length >= DATED_EVENT_LIMIT ? value : { ...value, cashEvents: [...value.cashEvents,
      { id: Crypto.randomUUID(), kind, day: '', amount: '', ...(kind === 'expense' ? { source: '' as const } : {}) }] });
  }
  async function publish(remove = false) {
    if (!editable()) return;
    const target = current.current!;
    let plan: DatedPortfolioPlan | null;
    try { plan = remove ? null : readMobileDatedPlanDraft(draft); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Review the dated inputs.'); return; }
    busy.current = true; props.onWorking(true); setError('');
    try { await target.onSave(plan); }
    catch (cause) { if (current.current) setError(cause instanceof Error ? cause.message : 'Dated plan could not be saved.'); }
    finally { busy.current = false; props.onWorking(false); }
  }
  return <View style={styles.fields}>
    {mobileDatedPlanFields.map(field => <View key={field.key} style={styles.field}>
      <Text style={styles.label}>{field.label}{field.kind === 'date' ? ' (YYYY-MM-DD)' : field.kind === 'money' ? ' ($)' : ' (1-31)'}</Text>
      <TextInput accessibilityLabel={field.label} value={draft[field.key]} editable={!disabled}
        keyboardType={field.kind === 'date' ? 'default' : field.kind === 'whole' ? 'number-pad' : 'decimal-pad'}
        autoCapitalize="none" autoCorrect={false} style={styles.input}
        onChangeText={value => edit(current => ({ ...current, [field.key]: value }))} />
    </View>)}
    <Text accessibilityRole="header" style={styles.heading}>Monthly cash entries</Text>
    <Text style={styles.detail}>Living expenses exclude debt payments. Entries repeat monthly; same-day postings retain this order. Days beyond month-end clamp to the last day.</Text>
    {draft.cashEvents.map((event, index) => <View key={event.id} style={styles.entry}>
      <View style={styles.row}>
        <Text style={styles.label}>{index + 1}. {event.kind === 'income' ? 'Income' : 'Expense'}</Text>
        <View style={styles.row}>
          <EntryCommand label={`Move entry ${index + 1} earlier`} symbol={'\u2191'} disabled={disabled || index === 0} onPress={() => move(event.id, -1)} />
          <EntryCommand label={`Move entry ${index + 1} later`} symbol={'\u2193'} disabled={disabled || index === draft.cashEvents.length - 1} onPress={() => move(event.id, 1)} />
          <EntryCommand label={`Remove entry ${index + 1}`} symbol="x" disabled={disabled}
            onPress={() => edit(value => ({ ...value, cashEvents: value.cashEvents.filter(candidate => candidate.id !== event.id) }))} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.smallField}><Text style={styles.label}>Day (1-31)</Text>
          <TextInput accessibilityLabel={`Entry ${index + 1} day`} value={event.day} editable={!disabled} keyboardType="number-pad" style={styles.input}
            onChangeText={day => editEvent(event.id, { day })} /></View>
        <View style={styles.amountField}><Text style={styles.label}>Amount ($)</Text>
          <TextInput accessibilityLabel={`Entry ${index + 1} amount`} value={event.amount} editable={!disabled} keyboardType="decimal-pad" style={styles.input}
            onChangeText={amount => editEvent(event.id, { amount })} /></View>
      </View>
      {event.kind === 'expense' ? <ChoiceControl label="Expense source" accessibilityLabel={`Entry ${index + 1} source`} value={event.source ?? ''}
        options={sources} mode="menu" disabled={disabled} onChange={source => editEvent(event.id, { source })} /> : null}
    </View>)}
    <View style={styles.row}>
      {(['income', 'expense'] as const).map(kind => <Pressable key={kind} accessibilityRole="button" accessibilityLabel={`Add ${kind}`}
        disabled={disabled || draft.cashEvents.length >= DATED_EVENT_LIMIT} accessibilityState={{ disabled: disabled || draft.cashEvents.length >= DATED_EVENT_LIMIT }}
        style={styles.command} onPress={() => add(kind)}><Text style={styles.commandText}>+ {kind === 'income' ? 'Income' : 'Expense'}</Text></Pressable>)}
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Pressable accessibilityRole="button" accessibilityLabel="Save dated plan" disabled={disabled} accessibilityState={{ disabled, busy: props.working }}
      style={styles.command} onPress={() => publish()}><Text style={styles.commandText}>{props.working ? 'Saving...' : 'Save dated plan'}</Text></Pressable>
    {props.plan !== undefined ? <Pressable accessibilityRole="button" accessibilityLabel="Remove dated plan" disabled={disabled} accessibilityState={{ disabled }}
      style={styles.command} onPress={() => publish(true)}><Text style={styles.commandText}>Remove dated plan</Text></Pressable> : null}
  </View>;
}

function EntryCommand({ label, symbol, disabled, onPress }: { label: string; symbol: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled }}
    style={[styles.icon, { opacity: disabled ? 0.4 : 1 }]} onPress={onPress}><Text style={styles.commandText}>{symbol}</Text></Pressable>;
}
const styles = StyleSheet.create({
  section: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 18, gap: 12, minWidth: 0 },
  fields: { gap: 14, minWidth: 0 }, field: { gap: 6, minWidth: 0 }, entry: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12, gap: 10, minWidth: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', minWidth: 0 },
  smallField: { flexBasis: 80, flexGrow: 1, gap: 6, minWidth: 0 }, amountField: { flexBasis: 140, flexGrow: 2, gap: 6, minWidth: 0 },
  heading: { color: '#f8fafc', fontSize: 16, fontWeight: '700' }, label: { color: '#cbd5e1', fontSize: 14, lineHeight: 20, flexShrink: 1 },
  detail: { color: '#94a3b8', fontSize: 13, lineHeight: 20 }, error: { color: '#fca5a5', fontSize: 14, lineHeight: 21 },
  input: { borderWidth: 1, borderColor: '#475569', borderRadius: 8, padding: 12, minHeight: 48, minWidth: 0, fontSize: 16, color: '#f8fafc' },
  command: { borderWidth: 1, borderColor: '#5eead4', borderRadius: 8, minHeight: 48, padding: 12, justifyContent: 'center', minWidth: 0 },
  commandText: { color: '#99f6e4', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  icon: { minHeight: 48, width: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#475569', borderRadius: 8 },
});
