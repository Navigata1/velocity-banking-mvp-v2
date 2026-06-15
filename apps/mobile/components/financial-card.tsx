import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export function FinancialCard({
  title,
  value,
  detail,
  children,
}: {
  title: string;
  value?: string;
  detail?: string;
  children?: ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: '#111827',
        borderColor: '#243244',
        borderCurve: 'continuous',
        borderRadius: 18,
        borderWidth: 1,
        gap: 8,
        padding: 16,
      }}
    >
      <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
        {title}
      </Text>
      {value ? (
        <Text
          selectable
          style={{
            color: '#f8fafc',
            fontSize: 24,
            fontVariant: ['tabular-nums'],
            fontWeight: '800',
            lineHeight: 30,
          }}
        >
          {value}
        </Text>
      ) : null}
      {detail ? (
        <Text selectable style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 20 }}>
          {detail}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
