import { useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { assessForecastBasis, decodeLenderTerms, type LenderTermField, type LenderTermsInput } from '@interestshield/financial-engine';
import { createLenderTermsDraft, lenderTermFields, lenderTermLabels, readLenderTermsDraft, type LenderTermsDraft } from '@interestshield/financial-engine/lender-terms-draft';
import { ChoiceControl } from './choice-control';

type Props = { terms?: LenderTermsInput; disabled?: boolean; onSave: (terms: LenderTermsInput | null) => Promise<unknown> };
const sources = [{ value: '', label: 'Unspecified' }, { value: 'user-provided', label: 'User provided' },
  { value: 'lender-document', label: 'Lender document' }, { value: 'model-default', label: 'Model default' }] as const;
const rateModes = [{ value: '', label: 'Unknown' }, { value: 'fixed', label: 'Fixed' }, { value: 'variable', label: 'Variable' }] as const;
const minimumModes = [{ value: '', label: 'Unknown' }, { value: 'fixed', label: 'Fixed amount' },
  { value: 'percent-of-balance', label: 'Percent of balance' }, { value: 'interest-only', label: 'Interest only' }] as const;

export function PortfolioLenderTerms({ terms, disabled = false, onSave }: Props) {
  const basis = assessForecastBasis(terms), busy = useRef(false);
  const latest = useRef<Props | null>({ terms, disabled, onSave });
  useLayoutEffect(() => { latest.current = { terms, disabled, onSave }; });
  useLayoutEffect(() => () => { latest.current = null; }, []);
  const [expanded, setExpanded] = useState(false), [working, setWorking] = useState(false);
  const [error, setError] = useState(''), [status, setStatus] = useState('');
  async function publish(input: LenderTermsInput | null) {
    const current = latest.current;
    if (!current || current.disabled || busy.current) return;
    const unchanged = input === null ? current.terms === undefined : current.terms !== undefined
      && JSON.stringify(decodeLenderTerms(input)) === JSON.stringify(decodeLenderTerms(current.terms));
    if (unchanged) { setStatus('Terms unchanged.'); setError(''); return; }
    busy.current = true; setWorking(true); setError(''); setStatus('');
    try { await current.onSave(input); if (latest.current) setStatus(input === null ? 'Profile removed. Monthly educational assumptions apply.' : 'Terms saved. Forecast remains in review.'); }
    catch (cause) { if (latest.current) setError(cause instanceof Error ? cause.message : 'Lender terms could not be saved.'); }
    finally { busy.current = false; if (latest.current) setWorking(false); }
  }
  return <View testID="native-lender-terms" style={styles.section}>
    <Text testID="native-forecast-basis" accessibilityRole="header" style={styles.heading}>{basis.label}</Text>
    <Text style={styles.detail}>{basis.canProject
      ? 'Monthly educational estimate. Lender fees, minimums, rate changes and dated posting are not verified.'
      : 'Supplied terms are retained. Lender-specific payoff dates, savings and payment targets are not projected; these terms are not enforced by the monthly model.'}</Text>
    {!basis.canProject ? <>
      {basis.lenderTerms.missingFields.length ? <Text style={styles.detail}>Missing: {basis.lenderTerms.missingFields.map(field => lenderTermLabels[field]).join(', ')}.</Text> : null}
      {basis.lenderTerms.unmodeledFields.length ? <Text style={styles.detail}>Not modeled: {basis.lenderTerms.unmodeledFields.map(field => lenderTermLabels[field]).join(', ')}.</Text> : null}
      <Text style={styles.detail}>Document-sourced is your provenance assertion, not verification by InterestShield.</Text>
    </> : null}
    <Pressable accessibilityRole="button" accessibilityLabel="Lender terms" accessibilityState={{ expanded, disabled: disabled || working }}
      disabled={disabled || working} onPress={() => { if (!disabled && !busy.current) setExpanded(current => !current); }} style={styles.command}>
      <Text style={styles.commandText}>Lender terms</Text>
    </Pressable>
    {expanded ? <LenderTermsFields key={JSON.stringify(terms) ?? 'no-profile'} terms={terms} disabled={disabled || working}
      onSave={publish} onError={setError} onEdit={() => { setError(''); setStatus(''); }} /> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {status ? <Text accessibilityLiveRegion="polite" style={styles.detail}>{status}</Text> : null}
  </View>;
}

function LenderTermsFields({ terms, disabled, onSave, onError, onEdit }: Props & {
  onError: (message: string) => void; onEdit: () => void;
}) {
  const [draft, setDraft] = useState(() => createLenderTermsDraft(terms));
  const mounted = useRef(false);
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function change<K extends Exclude<keyof LenderTermsDraft, 'sources'>>(key: K, value: LenderTermsDraft[K], field: LenderTermField) {
    if (disabled || !mounted.current) return;
    setDraft(current => ({ ...current, [key]: value,
      ...(key === 'minimumPaymentMode' && value === 'interest-only' ? { minimumPaymentValue: '' } : {}),
      sources: { ...current.sources, [field]: 'user-provided' } })); onEdit();
  }
  return <View style={styles.fields}>
    {lenderTermFields.map(field => <View key={field} style={styles.field}>
      <Text style={styles.label}>{lenderTermLabels[field]}{field.endsWith('Months') ? ' (months)' : field === 'transactionFeePercent' ? ' (%)' : field === 'rateMode' || field === 'minimumPayment' ? '' : ' ($)'}</Text>
      {field === 'rateMode' ? <ChoiceControl label="Rate type" accessibilityLabel="Lender rate type" value={draft.rateMode}
        options={rateModes} mode="menu" disabled={disabled} onChange={value => change('rateMode', value, field)} />
        : field === 'minimumPayment' ? <>
          <ChoiceControl label="Minimum payment" accessibilityLabel="Lender minimum payment mode" value={draft.minimumPaymentMode}
            options={minimumModes} mode="menu" disabled={disabled} onChange={value => change('minimumPaymentMode', value, field)} />
          {draft.minimumPaymentMode !== 'interest-only' ? <TextInput accessibilityLabel={`Lender minimum payment ${draft.minimumPaymentMode === 'percent-of-balance' ? 'percent' : 'amount'}`}
            editable={!disabled} keyboardType="decimal-pad" value={draft.minimumPaymentValue} style={styles.input}
            onChangeText={value => change('minimumPaymentValue', value, field)} /> : null}
        </> : <TextInput accessibilityLabel={`Lender ${lenderTermLabels[field].toLowerCase()}`} editable={!disabled}
          keyboardType={field.endsWith('Months') ? 'number-pad' : 'decimal-pad'} value={draft[field]} style={styles.input}
          onChangeText={value => change(field, value, field)} />}
      <ChoiceControl label={`${lenderTermLabels[field]} source`} accessibilityLabel={`Lender ${lenderTermLabels[field].toLowerCase()} source`}
        value={draft.sources[field]} options={sources} mode="menu" disabled={disabled} onChange={value => {
          if (disabled || !mounted.current) return;
          setDraft(current => ({ ...current, sources: { ...current.sources, [field]: value } })); onEdit();
        }} />
    </View>)}
    <Pressable accessibilityRole="button" accessibilityLabel="Save lender terms" disabled={disabled} accessibilityState={{ disabled }} style={styles.command}
      onPress={async () => { if (disabled || !mounted.current) return; try { await onSave(readLenderTermsDraft(draft, terms)); } catch (cause) { if (mounted.current) onError(cause instanceof Error ? cause.message : 'Lender terms are invalid.'); } }}>
      <Text style={styles.commandText}>Save lender terms</Text>
    </Pressable>
    {terms !== undefined ? <Pressable accessibilityRole="button" accessibilityLabel="Remove lender profile" disabled={disabled} accessibilityState={{ disabled }} style={styles.command}
      onPress={() => { if (!disabled && mounted.current) return onSave(null); }}><Text style={styles.commandText}>Remove lender profile</Text></Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 12, minWidth: 0, borderTopColor: '#334155', borderTopWidth: 1, paddingTop: 18 },
  fields: { gap: 18, minWidth: 0 }, field: { gap: 8, minWidth: 0 },
  heading: { color: '#f8fafc', fontSize: 18, fontWeight: '800', lineHeight: 24 },
  label: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 }, detail: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  input: { borderColor: '#475569', borderWidth: 1, borderRadius: 8, color: '#f8fafc', fontSize: 16, minHeight: 48, minWidth: 0, padding: 12 },
  command: { borderColor: '#5eead4', borderWidth: 1, borderRadius: 8, minHeight: 48, padding: 12, justifyContent: 'center' },
  commandText: { color: '#99f6e4', fontSize: 14, fontWeight: '700' }, error: { color: '#fca5a5', fontSize: 14, lineHeight: 21 },
});
