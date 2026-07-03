import {
  buildMobileCockpitSnapshot,
  buildMobileDashboardSnapshot,
  buildMobileLearnSnapshot,
  buildMobilePortfolioSnapshot,
  buildMobileSimulatorSnapshot,
  buildMobileVaultSnapshot,
  type MobileCockpitSnapshot,
  type MobileDashboardInput,
  type MobileDashboardSnapshot,
  type MobileLearnSnapshot,
  type MobilePortfolioPathSnapshot,
  type MobilePortfolioSnapshot,
  type MobileSimulatorSnapshot,
  type MobileVaultSnapshot,
} from '@interestshield/financial-engine';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import {
  usePersistedMobileAssumptions,
  type MobileAssumptionStorageStatus,
} from '@/hooks/use-persisted-mobile-assumptions';

type MobileMode = 'dashboard' | 'simulator' | 'cockpit' | 'portfolio' | 'learn' | 'vault' | 'settings';

const modes: Array<{ id: MobileMode; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'learn', label: 'Learn' },
  { id: 'vault', label: 'Vault' },
  { id: 'settings', label: 'Settings' },
];

const modeRoutes: Record<MobileMode, '/' | '/simulator' | '/cockpit' | '/portfolio' | '/learn' | '/vault' | '/settings'> = {
  dashboard: '/',
  simulator: '/simulator',
  cockpit: '/cockpit',
  portfolio: '/portfolio',
  learn: '/learn',
  vault: '/vault',
  settings: '/settings',
};

const mobileBackendReadinessOptions = [
  {
    id: 'supabase-postgres-auth-rls',
    label: 'Supabase Postgres + Auth + RLS',
    status: 'Candidate',
    detail: 'Best fit for relational snapshots, user-owned records, and SQL reporting. Next gate: schema plus RLS policy draft.',
  },
  {
    id: 'cloudflare-workers-d1-durable-objects',
    label: 'Cloudflare Workers + D1/Durable Objects',
    status: 'Candidate',
    detail: 'Best fit for edge APIs, D1 owner-scoped records, and future session state. Next gate: authenticated Worker snapshot API plus D1 owner indexes.',
  },
] as const;

const mobileStorageStatusCopy: Record<MobileAssumptionStorageStatus, { detail: string; value: string }> = {
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

function ModeButton({
  active,
  id,
  label,
  onPress,
}: {
  active: boolean;
  id: MobileMode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label} mobile section`}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      aria-selected={active}
      onPress={onPress}
      style={{
        backgroundColor: active ? '#047857' : '#111827',
        borderColor: active ? '#34d399' : '#243244',
        borderCurve: 'continuous',
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
      testID={`mobile-mode-tab-${id}`}
    >
      <Text selectable style={{ color: active ? '#ecfdf5' : '#cbd5e1', fontSize: 13, fontWeight: '800' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function parseMoneyInput(value: string): number | null {
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function parsePercentageInput(value: string): number | null {
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, parsed / 100) : null;
}

function parseWholeNumberInput(value: string): number | null {
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function finiteNonNegativeInputValue(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function formatMoneyInputValue(value: number): string {
  return String(Math.round(finiteNonNegativeInputValue(value)));
}

function formatWholeNumberInputValue(value: number): string {
  return String(Math.round(finiteNonNegativeInputValue(value)));
}

function formatPercentageInputValue(value: number): string {
  return String(Math.round(finiteNonNegativeInputValue(value) * 10000) / 100);
}

function MoneyInput({
  accessibilityLabel,
  label,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ gap: 6, minWidth: 150 }}>
      <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        inputMode="numeric"
        keyboardType="decimal-pad"
        onChangeText={(nextValue) => {
          const parsed = parseMoneyInput(nextValue);
          if (parsed !== null) onChange(parsed);
        }}
        selectTextOnFocus
        style={{
          backgroundColor: '#020617',
          borderColor: '#334155',
          borderCurve: 'continuous',
          borderRadius: 12,
          borderWidth: 1,
          color: '#f8fafc',
          fontSize: 18,
          fontVariant: ['tabular-nums'],
          fontWeight: '800',
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
        value={formatMoneyInputValue(value)}
      />
    </View>
  );
}

function TextValueInput({
  accessibilityLabel,
  label,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ gap: 6, minWidth: 150 }}>
      <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
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
  label,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ gap: 6, minWidth: 150 }}>
      <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        inputMode="numeric"
        keyboardType="number-pad"
        onChangeText={(nextValue) => {
          const parsed = parseWholeNumberInput(nextValue);
          if (parsed !== null) onChange(parsed);
        }}
        selectTextOnFocus
        style={{
          backgroundColor: '#020617',
          borderColor: '#334155',
          borderCurve: 'continuous',
          borderRadius: 12,
          borderWidth: 1,
          color: '#f8fafc',
          fontSize: 18,
          fontVariant: ['tabular-nums'],
          fontWeight: '800',
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
        value={formatWholeNumberInputValue(value)}
      />
    </View>
  );
}

function PercentageInput({
  accessibilityLabel,
  label,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ gap: 6, minWidth: 150 }}>
      <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        inputMode="decimal"
        keyboardType="decimal-pad"
        onChangeText={(nextValue) => {
          const parsed = parsePercentageInput(nextValue);
          if (parsed !== null) onChange(parsed);
        }}
        selectTextOnFocus
        style={{
          backgroundColor: '#020617',
          borderColor: '#334155',
          borderCurve: 'continuous',
          borderRadius: 12,
          borderWidth: 1,
          color: '#f8fafc',
          fontSize: 18,
          fontVariant: ['tabular-nums'],
          fontWeight: '800',
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
        value={formatPercentageInputValue(value)}
      />
    </View>
  );
}

function AssumptionControls({
  input,
  onChange,
}: {
  input: MobileDashboardInput;
  onChange: (input: MobileDashboardInput) => void;
}) {
  return (
    <FinancialCard title="Tune Assumptions" detail="Native controls update the shared engine snapshot immediately.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <TextValueInput
          accessibilityLabel="Active debt name"
          label="Debt Name"
          value={input.activeDebtName}
          onChange={(activeDebtName) => onChange({ ...input, activeDebtName })}
        />
        <MoneyInput
          accessibilityLabel="Monthly income"
          label="Income"
          value={input.monthlyIncome}
          onChange={(monthlyIncome) => onChange({ ...input, monthlyIncome })}
        />
        <MoneyInput
          accessibilityLabel="Monthly expenses"
          label="Expenses"
          value={input.monthlyExpenses}
          onChange={(monthlyExpenses) => onChange({ ...input, monthlyExpenses })}
        />
        <MoneyInput
          accessibilityLabel="Velocity chunk amount"
          label="Chunk"
          value={input.chunkAmount}
          onChange={(chunkAmount) => onChange({ ...input, chunkAmount })}
        />
        <MoneyInput
          accessibilityLabel="Line of credit limit"
          label="LOC Limit"
          value={input.loc.limit}
          onChange={(limit) => onChange({ ...input, loc: { ...input.loc, limit } })}
        />
        <MoneyInput
          accessibilityLabel="Line of credit balance"
          label="LOC Balance"
          value={input.loc.balance}
          onChange={(balance) => onChange({ ...input, loc: { ...input.loc, balance } })}
        />
        <PercentageInput
          accessibilityLabel="Line of credit APR"
          label="LOC APR"
          value={input.loc.apr}
          onChange={(apr) => onChange({ ...input, loc: { ...input.loc, apr } })}
        />
        <MoneyInput
          accessibilityLabel="Active debt balance"
          label="Debt Balance"
          value={input.activeDebt.balance}
          onChange={(balance) => onChange({ ...input, activeDebt: { ...input.activeDebt, balance } })}
        />
        <PercentageInput
          accessibilityLabel="Active debt APR"
          label="Debt APR"
          value={input.activeDebt.apr}
          onChange={(apr) => onChange({ ...input, activeDebt: { ...input.activeDebt, apr } })}
        />
        <MoneyInput
          accessibilityLabel="Active debt monthly payment"
          label="Debt Payment"
          value={input.activeDebt.monthlyPayment}
          onChange={(monthlyPayment) => onChange({ ...input, activeDebt: { ...input.activeDebt, monthlyPayment } })}
        />
        <WholeNumberInput
          accessibilityLabel="Active debt term months"
          label="Debt Term"
          value={input.activeDebt.termMonths ?? 0}
          onChange={(termMonths) => onChange({ ...input, activeDebt: { ...input.activeDebt, termMonths } })}
        />
      </View>
    </FinancialCard>
  );
}

function StorageStatusCard({ status }: { status: MobileAssumptionStorageStatus }) {
  const statusCopy = mobileStorageStatusCopy[status];

  return (
    <FinancialCard
      title="Local Storage"
      value={statusCopy.value}
      detail={statusCopy.detail}
    />
  );
}

type MobileLoopStep = MobileDashboardSnapshot['loop'][number];

const mobileLoopOrbitPositions: Record<string, { left: number; top: number }> = {
  Income: { left: 93, top: 8 },
  LOC: { left: 176, top: 48 },
  Expenses: { left: 158, top: 154 },
  'Cash Flow': { left: 28, top: 154 },
  Principal: { left: 10, top: 48 },
};

const mobileLoopToneStyles: Record<string, { accent: string; surface: string; text: string }> = {
  Income: { accent: '#34d399', surface: '#064e3b', text: '#bbf7d0' },
  LOC: { accent: '#38bdf8', surface: '#075985', text: '#bae6fd' },
  Expenses: { accent: '#fbbf24', surface: '#78350f', text: '#fde68a' },
  'Cash Flow': { accent: '#34d399', surface: '#065f46', text: '#bbf7d0' },
  Principal: { accent: '#22c55e', surface: '#064e3b', text: '#bbf7d0' },
};

function loopNodeId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getLoopTone(step: MobileLoopStep): { accent: string; surface: string; text: string } {
  return mobileLoopToneStyles[step.label] ?? { accent: '#94a3b8', surface: '#1e293b', text: '#e2e8f0' };
}

function MobileMoneyLoopOrbit({ steps }: { steps: MobileLoopStep[] }) {
  const [activeLabel, setActiveLabel] = useState(steps[0]?.label ?? 'Income');
  const activeStep = steps.find((step) => step.label === activeLabel) ?? steps[0];
  const activeIndex = Math.max(0, steps.findIndex((step) => step.label === activeStep?.label));
  const activeTone = activeStep ? getLoopTone(activeStep) : mobileLoopToneStyles.Income;

  if (!activeStep) {
    return null;
  }

  return (
    <View
      testID="mobile-payoff-orbit"
      accessibilityLabel="Money Loop payoff orbit"
      accessibilityRole="radiogroup"
      style={{
        backgroundColor: '#020617',
        borderColor: activeTone.accent,
        borderCurve: 'continuous',
        borderRadius: 18,
        borderWidth: 1,
        gap: 14,
        overflow: 'hidden',
        padding: 14,
      }}
    >
      <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
        Payoff Orbit
      </Text>

      <View style={{ alignItems: 'center' }}>
        <View style={{ height: 230, width: 230 }}>
          <View
            style={{
              borderColor: activeTone.accent,
              borderRadius: 92,
              borderWidth: 1,
              height: 184,
              left: 23,
              opacity: 0.48,
              position: 'absolute',
              top: 23,
              transform: [{ rotateX: '62deg' }, { rotateZ: '-14deg' }],
              width: 184,
            }}
          />
          <View
            style={{
              borderColor: '#334155',
              borderRadius: 68,
              borderWidth: 1,
              height: 136,
              left: 47,
              opacity: 0.7,
              position: 'absolute',
              top: 47,
              transform: [{ rotateX: '62deg' }, { rotateZ: '-14deg' }],
              width: 136,
            }}
          />
          <View
            style={{
              alignItems: 'center',
              backgroundColor: activeTone.surface,
              borderColor: activeTone.accent,
              borderCurve: 'continuous',
              borderRadius: 58,
              borderWidth: 2,
              height: 116,
              justifyContent: 'center',
              left: 57,
              position: 'absolute',
              shadowColor: activeTone.accent,
              shadowOpacity: 0.25,
              shadowRadius: 18,
              top: 57,
              transform: [{ rotateX: '58deg' }, { rotateZ: '-14deg' }],
              width: 116,
            }}
          >
            <Text selectable style={{ color: '#f8fafc', fontSize: 12, fontWeight: '900' }}>
              {String(activeIndex + 1).padStart(2, '0')}
            </Text>
            <Text selectable style={{ color: activeTone.text, fontSize: 13, fontWeight: '900', marginTop: 2 }}>
              {activeStep.label}
            </Text>
          </View>

          {steps.map((step, index) => {
            const tone = getLoopTone(step);
            const isActive = step.label === activeStep.label;
            const position = mobileLoopOrbitPositions[step.label] ?? { left: 93, top: 8 };

            return (
              <Pressable
                key={step.label}
                testID={`mobile-payoff-orbit-node-${loopNodeId(step.label)}`}
                accessibilityLabel={`${step.label} orbit step`}
                accessibilityRole="radio"
                accessibilityState={{ checked: isActive, selected: isActive }}
                aria-checked={isActive}
                aria-selected={isActive}
                onPress={() => setActiveLabel(step.label)}
                style={{
                  alignItems: 'center',
                  backgroundColor: isActive ? tone.accent : tone.surface,
                  borderColor: isActive ? '#f8fafc' : tone.accent,
                  borderRadius: 22,
                  borderWidth: 1,
                  height: 44,
                  justifyContent: 'center',
                  left: position.left,
                  position: 'absolute',
                  top: position.top,
                  width: 44,
                }}
              >
                <Text selectable style={{ color: isActive ? '#020617' : tone.text, fontSize: 13, fontWeight: '900' }}>
                  {index + 1}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text selectable style={{ color: activeTone.text, fontSize: 24, fontWeight: '900', lineHeight: 30 }}>
          {activeStep.value}
        </Text>
        <Text selectable style={{ color: '#f8fafc', fontSize: 18, fontWeight: '900' }}>
          {activeStep.label}
        </Text>
        <Text selectable style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 20 }}>
          {activeStep.detail}
        </Text>
      </View>
    </View>
  );
}

function MobileMoneyLoopPressureStrip({ steps }: { steps: MobileLoopStep[] }) {
  return (
    <View
      testID="mobile-money-loop-pressure"
      accessibilityLabel="Money Loop pressure strip"
      style={{
        backgroundColor: '#020617',
        borderColor: '#1e293b',
        borderCurve: 'continuous',
        borderRadius: 18,
        borderWidth: 1,
        gap: 12,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
            Loop Pressure
          </Text>
          <Text selectable style={{ color: '#f8fafc', fontSize: 18, fontWeight: '900', lineHeight: 24 }}>
            Model-backed flow intensity
          </Text>
        </View>
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#0f172a',
            borderColor: '#334155',
            borderCurve: 'continuous',
            borderRadius: 10,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 7,
          }}
        >
          <Text selectable style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '900' }}>
            8-100%
          </Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {steps.map((step) => {
          const tone = getLoopTone(step);
          const pressurePercent = Math.min(100, Math.max(8, Math.round(step.pressurePercent)));

          return (
            <View
              key={step.label}
              testID={`mobile-money-loop-pressure-segment-${loopNodeId(step.label)}`}
              accessibilityLabel={`${step.label} loop pressure ${pressurePercent}%`}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: pressurePercent }}
              style={{ gap: 6 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Text selectable style={{ color: '#f8fafc', flex: 1, fontSize: 13, fontWeight: '900' }}>
                  {step.label}
                </Text>
                <Text selectable style={{ color: tone.text, fontSize: 13, fontWeight: '900' }}>
                  {pressurePercent}%
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderCurve: 'continuous',
                  borderRadius: 999,
                  borderWidth: 1,
                  height: 12,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    backgroundColor: tone.accent,
                    borderRadius: 999,
                    height: '100%',
                    opacity: 0.88,
                    width: `${pressurePercent}%`,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>

      <Text selectable style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18 }}>
        Educational estimate. Pressure shows relative intensity, not a guarantee.
      </Text>
    </View>
  );
}

function MobilePortfolioPath({ path }: { path: MobilePortfolioPathSnapshot }) {
  const tone = path.isProjected
    ? { accent: '#34d399', surface: '#064e3b', text: '#bbf7d0' }
    : { accent: '#fbbf24', surface: '#78350f', text: '#fde68a' };

  return (
    <FinancialCard title="Portfolio Payoff Path">
      <View
        testID="mobile-portfolio-payoff-path"
        accessibilityLabel="Portfolio payoff path"
        style={{
          backgroundColor: '#020617',
          borderColor: tone.accent,
          borderCurve: 'continuous',
          borderRadius: 18,
          borderWidth: 1,
          gap: 14,
          padding: 14,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
              Balance descent
            </Text>
            <Text selectable style={{ color: '#f8fafc', fontSize: 22, fontWeight: '900', lineHeight: 28 }}>
              {path.startingBalanceLabel} to {path.isProjected ? '$0' : 'review'}
            </Text>
          </View>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: tone.surface,
              borderColor: tone.accent,
              borderCurve: 'continuous',
              borderRadius: 10,
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 7,
            }}
          >
            <Text selectable style={{ color: tone.text, fontSize: 12, fontWeight: '900' }}>
              {path.statusLabel}
            </Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(path.progressPercent) }}
            style={{
              backgroundColor: '#0f172a',
              borderColor: '#1e293b',
              borderCurve: 'continuous',
              borderRadius: 16,
              borderWidth: 1,
              height: 124,
              justifyContent: 'flex-end',
              overflow: 'hidden',
              padding: 12,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 7, height: 82, alignItems: 'flex-end' }}>
              {path.points.map((point, index) => (
                <View
                  key={`${point.month}-${index}`}
                  testID={`mobile-portfolio-payoff-path-node-${index}`}
                  accessibilityLabel={`Month ${point.month} payoff path point`}
                  style={{
                    alignItems: 'center',
                    flex: 1,
                    gap: 6,
                    justifyContent: 'flex-end',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: tone.accent,
                      borderRadius: 999,
                      height: 8,
                      opacity: path.isProjected ? 1 : 0.55,
                      width: 8,
                    }}
                  />
                  <View
                    style={{
                      backgroundColor: tone.accent,
                      borderRadius: 999,
                      height: `${Math.max(8, Math.round(point.progressPercent))}%`,
                      opacity: path.isProjected ? 0.86 : 0.42,
                      width: '100%',
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800' }}>
              Month 0
            </Text>
            <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800' }}>
              {path.payoffMonthsLabel}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ minWidth: 120, flex: 1 }}>
            <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
              Progress
            </Text>
            <Text selectable style={{ color: tone.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>
              {Math.round(path.progressPercent)}%
            </Text>
          </View>
          <View style={{ minWidth: 120, flex: 1 }}>
            <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
              Interest estimate
            </Text>
            <Text selectable style={{ color: '#f8fafc', fontSize: 18, fontWeight: '900', marginTop: 4 }}>
              {path.totalInterestLabel}
            </Text>
          </View>
        </View>
      </View>
    </FinancialCard>
  );
}

function DashboardPanel({ snapshot }: { snapshot: MobileDashboardSnapshot }) {
  return (
    <View style={{ gap: 12 }}>
      {snapshot.vitals.map((vital) => (
        <FinancialCard key={vital.label} title={vital.label} value={vital.value} detail={vital.detail} />
      ))}

      {snapshot.warning ? (
        <FinancialCard title="Review Before Modeling" value={snapshot.nextMove} detail={snapshot.warning} />
      ) : (
        <FinancialCard title="Coach Note" value={snapshot.nextMove} detail="Educational estimate. Not financial advice." />
      )}

      <FinancialCard title="Money Loop">
        <View style={{ gap: 12 }}>
          <MobileMoneyLoopOrbit steps={snapshot.loop} />
          <MobileMoneyLoopPressureStrip steps={snapshot.loop} />

          {snapshot.loop.map((step) => (
            <View key={step.label} style={{ gap: 2 }}>
              <Text selectable style={{ color: '#f8fafc', fontSize: 16, fontWeight: '800' }}>
                {step.label}: {step.value}
              </Text>
              <Text selectable style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 19 }}>
                {step.detail}
              </Text>
            </View>
          ))}
        </View>
      </FinancialCard>
    </View>
  );
}

function SimulatorStrategyPanel({ simulator }: { simulator: MobileSimulatorSnapshot }) {
  return (
    <FinancialCard title="Strategy Comparison">
      <View style={{ gap: 12 }}>
        {simulator.strategies.map((strategy) => (
          <View
            key={strategy.name}
            style={{
              borderColor: strategy.name === simulator.fastestStrategyName ? '#34d399' : '#243244',
              borderCurve: 'continuous',
              borderRadius: 12,
              borderWidth: 1,
              gap: 4,
              padding: 12,
            }}
          >
            <Text selectable style={{ color: '#f8fafc', fontSize: 16, fontWeight: '800' }}>
              {strategy.name}: {strategy.monthsLabel}
            </Text>
            <Text selectable style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 19 }}>
              {strategy.totalInterestLabel} interest. {strategy.statusLabel ?? strategy.interestLabel}
            </Text>
          </View>
        ))}
      </View>
    </FinancialCard>
  );
}

function SimulatorPanel({
  snapshot,
  simulator,
}: {
  snapshot: MobileDashboardSnapshot;
  simulator: MobileSimulatorSnapshot;
}) {
  return (
    <View style={{ gap: 12 }}>
      <FinancialCard
        title="Current Plan"
        value={snapshot.nextMove}
        detail={simulator.guardrail ?? snapshot.warning ?? 'Inputs are ready for a simulator pass.'}
      />
      <FinancialCard
        title="Velocity Delta"
        value={simulator.velocity.interestSavedLabel}
        detail={simulator.velocity.monthsSavedLabel}
      />
      <FinancialCard
        title="Interest Visibility"
        value={snapshot.vitals[1].value}
        detail="LOC interest and debt interest stay visible before any savings claim is shown."
      />
      <SimulatorStrategyPanel simulator={simulator} />
    </View>
  );
}

function CockpitPanel({ cockpit }: { cockpit: MobileCockpitSnapshot }) {
  return (
    <View style={{ gap: 12 }}>
      <FinancialCard
        title="Flight Status"
        value={cockpit.flightStatusLabel}
        detail={cockpit.warning ?? 'Core Money Loop instruments are ready for an educational pass.'}
      />
      <FinancialCard title="Instruments">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {cockpit.instruments.map((instrument) => (
            <View
              key={instrument.label}
              style={{
                borderColor:
                  instrument.status === 'danger'
                    ? '#fb7185'
                    : instrument.status === 'warning'
                      ? '#f59e0b'
                      : '#34d399',
                borderCurve: 'continuous',
                borderRadius: 12,
                borderWidth: 1,
                gap: 4,
                minWidth: 150,
                padding: 12,
              }}
            >
              <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
                {instrument.label}
              </Text>
              <Text selectable style={{ color: '#f8fafc', fontSize: 20, fontVariant: ['tabular-nums'], fontWeight: '900' }}>
                {instrument.value}
              </Text>
              <Text selectable style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 19 }}>
                {instrument.detail}
              </Text>
            </View>
          ))}
        </View>
      </FinancialCard>
      <FinancialCard title="Flight Checks">
        <View style={{ gap: 10 }}>
          {cockpit.flightChecks.map((check) => (
            <View key={check.label} style={{ gap: 2 }}>
              <Text selectable style={{ color: check.passed ? '#bbf7d0' : '#fecdd3', fontSize: 15, fontWeight: '800' }}>
                {check.passed ? 'Pass' : 'Review'}: {check.label}
              </Text>
              <Text selectable style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 19 }}>
                {check.detail}
              </Text>
            </View>
          ))}
        </View>
      </FinancialCard>
    </View>
  );
}

function PortfolioPanel({ portfolio }: { portfolio: MobilePortfolioSnapshot }) {
  return (
    <View style={{ gap: 12 }}>
      <FinancialCard
        title="Portfolio Coverage"
        value={portfolio.cashFlowAfterMinimumsLabel}
        detail={
          portfolio.guardrail ??
          `Cash flow after modeled minimums. Total minimums: ${portfolio.totalMinimumsLabel}.`
        }
      />
      <FinancialCard title="Modeling Mode" value={portfolio.modelingLabel} detail={portfolio.modelingDetail} />
      <FinancialCard title="Total Modeled Debt" value={portfolio.totalDebtLabel} detail="Current mobile shell starts with the active web demo debt." />
      <MobilePortfolioPath path={portfolio.payoffPath} />
      {portfolio.priorities.map((priority) => (
        <FinancialCard
          key={priority.name}
          title={priority.name}
          value={priority.balanceLabel}
          detail={`${priority.reason} Minimum payment: ${priority.minimumPaymentLabel}.`}
        />
      ))}
    </View>
  );
}

function LearnPanel({ learn }: { learn: MobileLearnSnapshot }) {
  return (
    <View style={{ gap: 12 }}>
      {learn.guardrail ? (
        <FinancialCard title="Learning Mode" value="Review inputs" detail={learn.guardrail} />
      ) : null}
      {learn.lessons.map((lesson) => (
        <FinancialCard key={lesson.title} title={lesson.title} value={lesson.value} detail={lesson.detail} />
      ))}
    </View>
  );
}

function VaultPanel({ vault }: { vault: MobileVaultSnapshot }) {
  return (
    <View style={{ gap: 12 }}>
      <FinancialCard
        title="Freedom Path"
        value={vault.freedomPathLabel}
        detail={vault.guardrail ?? 'Modeled from the same shared engine used by Dashboard, Simulator, and Cockpit.'}
      />
      {vault.stages.map((stage) => (
        <FinancialCard key={stage.title} title={stage.title} value={stage.value} detail={stage.detail} />
      ))}
    </View>
  );
}

function SettingsPanel({
  onResetAssumptions,
  resetStatus,
  storageStatus,
}: {
  onResetAssumptions: () => void;
  resetStatus: string | null;
  storageStatus: MobileAssumptionStorageStatus;
}) {
  const statusCopy = mobileStorageStatusCopy[storageStatus];

  return (
    <View style={{ gap: 12 }}>
      <FinancialCard
        title="Local Demo Storage"
        value={statusCopy.value}
        detail={`${statusCopy.detail} No production backend is connected.`}
      />
      <View
        testID="settings-backend-readiness"
        accessibilityLabel="Backend readiness"
        style={{ gap: 12 }}
      >
        <FinancialCard
          title="Backend Status"
          value="Local demo mode"
          detail="Data stays on this device or exported web browser until auth, access rules, and snapshot migration are selected."
        />
        {mobileBackendReadinessOptions.map((option) => (
          <FinancialCard
            key={option.id}
            title={option.label}
            value={option.status}
          detail={option.detail}
        />
      ))}
      </View>
      <View style={{ gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset mobile starter assumptions"
          onPress={onResetAssumptions}
          testID="settings-reset-mobile-assumptions"
          style={{
            alignItems: 'center',
            backgroundColor: '#047857',
            borderColor: '#34d399',
            borderCurve: 'continuous',
            borderRadius: 14,
            borderWidth: 1,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Text selectable style={{ color: '#ecfdf5', fontSize: 14, fontWeight: '900' }}>
            Reset Starter Assumptions
          </Text>
        </Pressable>
        {resetStatus ? (
          <Text
            accessibilityLiveRegion="polite"
            selectable
            testID="settings-reset-mobile-assumptions-status"
            style={{ color: '#bbf7d0', fontSize: 13, lineHeight: 19 }}
          >
            {resetStatus}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function MobileShell({ initialMode = 'dashboard' }: { initialMode?: MobileMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<MobileMode>(initialMode);
  const [settingsResetStatus, setSettingsResetStatus] = useState<string | null>(null);
  const { input, resetAssumptions, setInput, storageStatus } = usePersistedMobileAssumptions();
  const snapshot = buildMobileDashboardSnapshot(input);
  const cockpit = buildMobileCockpitSnapshot(input);
  const portfolio = buildMobilePortfolioSnapshot(input);
  const simulator = buildMobileSimulatorSnapshot(input);
  const vault = buildMobileVaultSnapshot(input);
  const learn = buildMobileLearnSnapshot(input);
  const title = modes.find((item) => item.id === mode)?.label ?? 'Dashboard';
  const subtitle = mode === 'settings'
    ? 'Settings keeps native storage and backend readiness explicit before any account backend is connected.'
    : `${title} runs from the shared financial engine so web and native assumptions stay aligned.`;
  const handleModeChange = (nextMode: MobileMode) => {
    setMode(nextMode);
    router.push(modeRoutes[nextMode] as Href);
  };
  const handleResetAssumptions = () => {
    setSettingsResetStatus('Restoring starter assumptions...');
    resetAssumptions()
      .then((backend) => {
        setSettingsResetStatus(
          backend === 'unavailable'
            ? 'Starter assumptions restored for this session. Local persistence is unavailable.'
            : 'Starter assumptions restored and saved on this device.'
        );
      })
      .catch(() => {
        setSettingsResetStatus('Reset could not save locally. Review storage permissions and try again.');
      });
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: '#020617' }}
      contentContainerStyle={{ gap: 18, padding: 18, paddingBottom: 36 }}
    >
      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: '#94a3b8', fontSize: 14, fontWeight: '700' }}>
          Money Loop Mobile
        </Text>
        <Text selectable style={{ color: '#f8fafc', fontSize: 34, fontWeight: '900', lineHeight: 38 }}>
          InterestShield
        </Text>
        <Text selectable style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 22 }}>
          {subtitle}
        </Text>
      </View>

      <View
        accessibilityLabel="Mobile section navigation"
        accessibilityRole="tablist"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
      >
        {modes.map((mobileMode) => (
          <ModeButton
            active={mode === mobileMode.id}
            id={mobileMode.id}
            key={mobileMode.id}
            label={mobileMode.label}
            onPress={() => handleModeChange(mobileMode.id)}
          />
        ))}
      </View>

      {mode === 'settings' ? null : <AssumptionControls input={input} onChange={setInput} />}
      <StorageStatusCard status={storageStatus} />

      {mode === 'dashboard' ? <DashboardPanel snapshot={snapshot} /> : null}
      {mode === 'simulator' ? <SimulatorPanel snapshot={snapshot} simulator={simulator} /> : null}
      {mode === 'cockpit' ? <CockpitPanel cockpit={cockpit} /> : null}
      {mode === 'portfolio' ? <PortfolioPanel portfolio={portfolio} /> : null}
      {mode === 'learn' ? <LearnPanel learn={learn} /> : null}
      {mode === 'vault' ? <VaultPanel vault={vault} /> : null}
      {mode === 'settings' ? (
        <SettingsPanel
          onResetAssumptions={handleResetAssumptions}
          resetStatus={settingsResetStatus}
          storageStatus={storageStatus}
        />
      ) : null}

      <Text selectable style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
        Educational tool. Not financial advice.
      </Text>
    </ScrollView>
  );
}
