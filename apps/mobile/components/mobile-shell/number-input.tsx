import { useEffect, useRef, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { formatFinancialInput, resolveFinancialDraft, type FinancialInputKind } from '@/lib/financial-input-draft';

export const MOBILE_NUMBER_INPUT_ACCESSORY_ID = 'interestshield-mobile-number-inputs';

export function FinancialNumberInput({ accessibilityLabel, disabled = false, label, value, onChange, kind }: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  value: number;
  onChange: (value: number) => void;
  kind: FinancialInputKind;
}) {
  const display = formatFinancialInput(value, kind);
  const [draft, setDraft] = useState(display);
  const [error, setError] = useState('');
  const session = useRef<{ value: number; draft: string } | null>(null);

  useEffect(() => {
    session.current = null;
    setDraft(formatFinancialInput(value, kind));
    setError('');
    return () => { session.current = null; };
  }, [value, kind, disabled]);

  const commit = () => {
    const edit = session.current;
    session.current = null;
    if (!edit || disabled || !Object.is(edit.value, value)) {
      setDraft(display);
      return;
    }
    const result = resolveFinancialDraft(value, edit.draft, kind);
    setDraft(formatFinancialInput(result.value, kind));
    setError(result.error ?? '');
    if (!result.error && !Object.is(result.value, value)) onChange(result.value);
  };

  return (
    <View style={{ flexBasis: 150, flexGrow: 1, gap: 6, minWidth: 150 }}>
      <Text accessible={false} style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={error || undefined}
        editable={!disabled}
        inputAccessoryViewID={MOBILE_NUMBER_INPUT_ACCESSORY_ID}
        inputMode={kind === 'whole' ? 'numeric' : 'decimal'}
        keyboardType={kind === 'whole' ? 'number-pad' : 'decimal-pad'}
        onFocus={() => {
          session.current = { value, draft: display };
          setDraft(display); setError('');
        }}
        onChangeText={next => {
          if (disabled) return;
          session.current ??= { value, draft: display };
          session.current.draft = next;
          setDraft(next); setError('');
        }}
        onBlur={commit}
        onSubmitEditing={commit}
        submitBehavior="blurAndSubmit"
        selectTextOnFocus={Platform.OS !== 'web'}
        style={{ backgroundColor: '#020617', borderColor: error ? '#fbbf24' : '#334155', borderCurve: 'continuous',
          borderRadius: 12, borderWidth: 1, color: '#f8fafc', fontSize: 18, fontVariant: ['tabular-nums'],
          fontWeight: '800', minHeight: 48, paddingHorizontal: 12, paddingVertical: 10 }}
        value={draft}
      />
      <Text accessible={Boolean(error)} accessibilityLiveRegion="polite" style={{ color: '#fbbf24', fontSize: 12, lineHeight: 16, minHeight: 32 }}>
        {error || ' '}
      </Text>
    </View>
  );
}
