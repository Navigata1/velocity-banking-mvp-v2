import {
  buildMobileCockpitSnapshot,
  buildMobileDashboardSnapshot,
  buildMobilePortfolioSnapshot,
  buildMobileSimulatorSnapshot,
  type MobileCockpitSnapshot,
  type MobileDashboardInput,
  type MobileDashboardSnapshot,
  type MobilePortfolioSnapshot,
  type MobileSimulatorSnapshot,
} from '@interestshield/financial-engine';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import {
  usePersistedMobileAssumptions,
  type MobileAssumptionStorageStatus,
} from '@/hooks/use-persisted-mobile-assumptions';

type MobileMode = 'dashboard' | 'simulator' | 'cockpit' | 'portfolio' | 'learn' | 'vault';

const modes: Array<{ id: MobileMode; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'learn', label: 'Learn' },
  { id: 'vault', label: 'Vault' },
];

const modeRoutes: Record<MobileMode, '/' | '/simulator' | '/cockpit' | '/portfolio' | '/learn' | '/vault'> = {
  dashboard: '/',
  simulator: '/simulator',
  cockpit: '/cockpit',
  portfolio: '/portfolio',
  learn: '/learn',
  vault: '/vault',
};

const lessons = [
  {
    title: 'Cash Flow',
    detail: 'Positive cash flow is the fuel that recovers LOC draws after a principal chunk.',
  },
  {
    title: 'LOC Room',
    detail: 'Available credit is capacity, not income. Missing limits stay in setup mode.',
  },
  {
    title: 'Interest Burn',
    detail: 'Daily interest estimates are labels for learning, not promises about lender posting rules.',
  },
];

function ModeButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        backgroundColor: active ? '#047857' : '#111827',
        borderColor: active ? '#34d399' : '#243244',
        borderCurve: 'continuous',
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
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
        value={String(Math.round(value))}
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
      </View>
    </FinancialCard>
  );
}

function StorageStatusCard({ status }: { status: MobileAssumptionStorageStatus }) {
  const copy: Record<MobileAssumptionStorageStatus, { detail: string; value: string }> = {
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
  const statusCopy = copy[status];

  return (
    <FinancialCard
      title="Local Storage"
      value={statusCopy.value}
      detail={statusCopy.detail}
    />
  );
}

function DashboardPanel({ snapshot }: { snapshot: MobileDashboardSnapshot }) {
  return (
    <View style={{ gap: 12 }}>
      {snapshot.warning ? (
        <FinancialCard title="Review Before Modeling" value={snapshot.nextMove} detail={snapshot.warning} />
      ) : (
        <FinancialCard title="Next Move" value={snapshot.nextMove} detail="Educational estimate. Not financial advice." />
      )}

      {snapshot.vitals.map((vital) => (
        <FinancialCard key={vital.label} title={vital.label} value={vital.value} detail={vital.detail} />
      ))}

      <FinancialCard title="Money Loop">
        <View style={{ gap: 12 }}>
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
      <FinancialCard title="Total Modeled Debt" value={portfolio.totalDebtLabel} detail="Current mobile shell starts with the active web demo debt." />
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

function LearnPanel() {
  return (
    <View style={{ gap: 12 }}>
      {lessons.map((lesson) => (
        <FinancialCard key={lesson.title} title={lesson.title} detail={lesson.detail} />
      ))}
    </View>
  );
}

function VaultPanel({ snapshot }: { snapshot: MobileDashboardSnapshot }) {
  return (
    <View style={{ gap: 12 }}>
      <FinancialCard title="Stage 1" value="Stabilize" detail={snapshot.warning ?? 'Cash flow and LOC setup pass the first checks.'} />
      <FinancialCard title="Stage 2" value="Debt Freedom" detail="Principal movement remains assumption-labeled until scenarios are editable." />
      <FinancialCard title="Stage 3" value="Buffer" detail="Emergency reserves stay separate from velocity banking payoff claims." />
    </View>
  );
}

export function MobileShell({ initialMode = 'dashboard' }: { initialMode?: MobileMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<MobileMode>(initialMode);
  const { input, setInput, storageStatus } = usePersistedMobileAssumptions();
  const snapshot = buildMobileDashboardSnapshot(input);
  const cockpit = buildMobileCockpitSnapshot(input);
  const portfolio = buildMobilePortfolioSnapshot(input);
  const simulator = buildMobileSimulatorSnapshot(input);
  const title = modes.find((item) => item.id === mode)?.label ?? 'Dashboard';
  const handleModeChange = (nextMode: MobileMode) => {
    setMode(nextMode);
    router.push(modeRoutes[nextMode]);
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
          {title} runs from the shared financial engine so web and native assumptions stay aligned.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <ModeButton active={mode === 'dashboard'} label="Dashboard" onPress={() => handleModeChange('dashboard')} />
        <ModeButton active={mode === 'simulator'} label="Simulator" onPress={() => handleModeChange('simulator')} />
        <ModeButton active={mode === 'cockpit'} label="Cockpit" onPress={() => handleModeChange('cockpit')} />
        <ModeButton active={mode === 'portfolio'} label="Portfolio" onPress={() => handleModeChange('portfolio')} />
        <ModeButton active={mode === 'learn'} label="Learn" onPress={() => handleModeChange('learn')} />
        <ModeButton active={mode === 'vault'} label="Vault" onPress={() => handleModeChange('vault')} />
      </View>

      <AssumptionControls input={input} onChange={setInput} />
      <StorageStatusCard status={storageStatus} />

      {mode === 'dashboard' ? <DashboardPanel snapshot={snapshot} /> : null}
      {mode === 'simulator' ? <SimulatorPanel snapshot={snapshot} simulator={simulator} /> : null}
      {mode === 'cockpit' ? <CockpitPanel cockpit={cockpit} /> : null}
      {mode === 'portfolio' ? <PortfolioPanel portfolio={portfolio} /> : null}
      {mode === 'learn' ? <LearnPanel /> : null}
      {mode === 'vault' ? <VaultPanel snapshot={snapshot} /> : null}

      <Text selectable style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
        Educational tool. Not financial advice.
      </Text>
    </ScrollView>
  );
}
