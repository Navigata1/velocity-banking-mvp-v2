import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function ChoiceControl<T extends string>({ label, accessibilityLabel, value, options, onChange,
  disabled = false, mode = 'segments' }: {
  label: string;
  accessibilityLabel: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  mode?: 'segments' | 'menu';
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); }, [disabled, value]);
  const selected = options.find(option => option.value === value);

  return (
    <View style={styles.field}>
      <Text accessible={false} style={styles.label}>{label}</Text>
      {mode === 'menu' ? (
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled, expanded }}
          aria-expanded={expanded}
          accessibilityValue={{ text: selected?.label ?? value }}
          disabled={disabled}
          onPress={() => setExpanded(current => !current)}
          style={({ pressed }) => [styles.trigger, { opacity: disabled || pressed ? 0.6 : 1 }]}
        >
          <Text style={styles.optionText}>{selected?.label ?? value}</Text>
          <Text accessible={false} style={styles.menuState}>{expanded ? 'Close' : 'Change'}</Text>
        </Pressable>
      ) : null}
      {mode === 'segments' || expanded ? (
        <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}
          style={mode === 'menu' ? styles.menu : styles.segments}>
          {options.map(option => (
            <Pressable
              key={option.value}
              accessibilityLabel={`${accessibilityLabel} ${option.label}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: option.value === value, disabled }}
              disabled={disabled}
              onPress={() => {
                if (disabled) return;
                setExpanded(false);
                if (option.value !== value) onChange(option.value);
              }}
              style={({ pressed }) => [styles.option, mode === 'segments' ? styles.segment : styles.menuOption,
                option.value === value && styles.selected, { opacity: disabled || pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.optionText, option.value === value && styles.selectedText]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, minWidth: 0 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  trigger: { alignItems: 'center', borderColor: '#334155', borderRadius: 8, borderWidth: 1,
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', minHeight: 48, padding: 12 },
  menuState: { color: '#94a3b8', fontSize: 12 },
  segments: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  menu: { borderColor: '#334155', borderLeftWidth: 2, gap: 4, paddingLeft: 8 },
  option: { justifyContent: 'center', minHeight: 48, paddingHorizontal: 12, paddingVertical: 10 },
  segment: { alignItems: 'center', borderColor: '#334155', borderRadius: 8, borderWidth: 1,
    flexBasis: 96, flexGrow: 1, minWidth: 0 },
  menuOption: { borderRadius: 8 },
  selected: { backgroundColor: '#173c37', borderColor: '#5eead4' },
  optionText: { color: '#cbd5e1', flexShrink: 1, fontSize: 14, fontWeight: '700' },
  selectedText: { color: '#99f6e4' },
});
