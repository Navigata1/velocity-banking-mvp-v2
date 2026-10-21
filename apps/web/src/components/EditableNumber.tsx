'use client';

import { EditableNumber as ValidatedNumber, type EditableNumberProps as ValidatedProps } from './PortfolioEditableNumber';

export type EditableNumberProps = Omit<ValidatedProps, 'percentPolicy'>;

export function EditableNumber(props: EditableNumberProps) {
  return <ValidatedNumber {...props} percentPolicy="legacy" />;
}

export function EditablePercentage({ value, onChange, ...props }: Omit<EditableNumberProps, 'format'>) {
  return <EditableNumber value={value} onChange={onChange} format="percent" min={0} step={0.001} {...props} />;
}

export function EditableCurrency({ value, onChange, ...props }: Omit<EditableNumberProps, 'format' | 'prefix'>) {
  return <EditableNumber value={value} onChange={onChange} format="currency" {...props} />;
}
