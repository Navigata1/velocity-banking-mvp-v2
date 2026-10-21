import type { MobileDashboardInput } from '@interestshield/financial-engine';
import { InputAccessoryView, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import type { MobileAssumptionStorageStatus } from '@/hooks/use-persisted-mobile-assumptions';
import { FinancialNumberInput, MOBILE_NUMBER_INPUT_ACCESSORY_ID } from './number-input';

export const mobileStorageStatusCopy: Record<
  MobileAssumptionStorageStatus,
  { detail: string; value: string }
> = {
  loading: {
    detail: 'Checking for locally saved assumptions.',
    value: 'Loading',
  },
  'restored-secure-store': {
    detail: 'Assumptions restored from encrypted native storage on this device.',
    value: 'Restored securely',
  },
  'restored-local-storage': {
    detail: 'Assumptions restored from localStorage for exported web testing.',
    value: 'Restored locally',
  },
  'saved-secure-store': {
    detail: 'Assumptions are saved in encrypted native storage on this device.',
    value: 'Saved securely',
  },
  'saved-local-storage': {
    detail: 'Assumptions are saved in localStorage for exported web testing.',
    value: 'Saved locally',
  },
  unavailable: {
    detail: 'Local persistence is unavailable, so assumptions reset when this session ends.',
    value: 'Session only',
  },
};

function MoneyInput({
  accessibilityLabel,
  disabled = false,
  label,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return <FinancialNumberInput accessibilityLabel={accessibilityLabel} disabled={disabled} label={label} value={value} onChange={onChange} kind={'money'} />;
}

function TextValueInput({
  accessibilityLabel,
  disabled = false,
  label,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ gap: 6, minWidth: 150 }}>
      <Text accessible={false} style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        editable={!disabled}
        autoCapitalize="words"
        onChangeText={(nextValue) => onChange(nextValue.trimStart())}
        selectTextOnFocus
        style={{
          backgroundColor: '#020617',
          borderColor: '#334155',
          borderCurve: 'continuous',
          borderRadius: 12,
          borderWidth: 1,
          color: '#f8fafc',
          fontSize: 18,
          fontWeight: '800',
          minHeight: 48,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
        value={value}
      />
    </View>
  );
}

function WholeNumberInput({
  accessibilityLabel,
  disabled = false,
  label,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return <FinancialNumberInput accessibilityLabel={accessibilityLabel} disabled={disabled} label={label} value={value} onChange={onChange} kind={'whole'} />;
}

function PercentageInput({
  accessibilityLabel,
  disabled = false,
  label,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return <FinancialNumberInput accessibilityLabel={accessibilityLabel} disabled={disabled} label={label} value={value} onChange={onChange} kind={'percent'} />;
}

export function AssumptionControls({
  disabled = false,
  input,
  onChange,
}: {
  disabled?: boolean;
  input: MobileDashboardInput;
  onChange: (input: MobileDashboardInput) => void;
}) {
  return (
    <>
      <FinancialCard title="Tune Assumptions">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <TextValueInput
          accessibilityLabel="Active debt name"
          disabled={disabled}
          label="Debt Name"
          value={input.activeDebtName}
          onChange={(activeDebtName) => onChange({ ...input, activeDebtName })}
        />
        <MoneyInput
          accessibilityLabel="Monthly income"
          disabled={disabled}
          label="Income"
          value={input.monthlyIncome}
          onChange={(monthlyIncome) => onChange({ ...input, monthlyIncome })}
        />
        <MoneyInput
          accessibilityLabel="Monthly expenses"
          disabled={disabled}
          label="Expenses"
          value={input.monthlyExpenses}
          onChange={(monthlyExpenses) => onChange({ ...input, monthlyExpenses })}
        />
        <MoneyInput
          accessibilityLabel="Velocity chunk amount"
          disabled={disabled}
          label="Chunk"
          value={input.chunkAmount}
          onChange={(chunkAmount) => onChange({ ...input, chunkAmount })}
        />
        <MoneyInput
          accessibilityLabel="Line of credit limit"
          disabled={disabled}
          label="LOC Limit"
          value={input.loc.limit}
          onChange={(limit) => onChange({ ...input, loc: { ...input.loc, limit } })}
        />
        <MoneyInput
          accessibilityLabel="Line of credit balance"
          disabled={disabled}
          label="LOC Balance"
          value={input.loc.balance}
          onChange={(balance) => onChange({ ...input, loc: { ...input.loc, balance } })}
        />
        <PercentageInput
          accessibilityLabel="Line of credit APR"
          disabled={disabled}
          label="LOC APR"
          value={input.loc.apr}
          onChange={(apr) => onChange({ ...input, loc: { ...input.loc, apr } })}
        />
        <MoneyInput
          accessibilityLabel="Active debt balance"
          disabled={disabled}
          label="Debt Balance"
          value={input.activeDebt.balance}
          onChange={(balance) => onChange({ ...input, activeDebt: { ...input.activeDebt, balance } })}
        />
        <PercentageInput
          accessibilityLabel="Active debt APR"
          disabled={disabled}
          label="Debt APR"
          value={input.activeDebt.apr}
          onChange={(apr) => onChange({ ...input, activeDebt: { ...input.activeDebt, apr } })}
        />
        <MoneyInput
          accessibilityLabel="Active debt monthly payment"
          disabled={disabled}
          label="Debt Payment"
          value={input.activeDebt.monthlyPayment}
          onChange={(monthlyPayment) => onChange({ ...input, activeDebt: { ...input.activeDebt, monthlyPayment } })}
        />
        <WholeNumberInput
          accessibilityLabel="Active debt term months"
          disabled={disabled}
          label="Debt Term"
          value={input.activeDebt.termMonths ?? 0}
          onChange={(termMonths) => onChange({ ...input, activeDebt: { ...input.activeDebt, termMonths } })}
        />
        </View>
      </FinancialCard>
      {process.env.EXPO_OS === 'ios' ? (
        <InputAccessoryView nativeID={MOBILE_NUMBER_INPUT_ACCESSORY_ID}>
          <View style={{ alignItems: 'flex-end', backgroundColor: '#0f172a', padding: 8 }}>
            <Pressable
              accessibilityLabel="Finish editing financial input"
              accessibilityRole="button"
              onPress={Keyboard.dismiss}
              style={{ justifyContent: 'center', minHeight: 48, paddingHorizontal: 16 }}
            >
              <Text style={{ color: '#bae6fd', fontSize: 16, fontWeight: '800' }}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </>
  );
}

export function StorageStatusCard({ status }: { status: MobileAssumptionStorageStatus }) {
  const statusCopy = mobileStorageStatusCopy[status];

  return <FinancialCard title="Local Storage" value={statusCopy.value} detail={statusCopy.detail} />;
}
