import {
  buildMobileDashboardSnapshot,
  buildMobilePortfolioSnapshot,
  defaultMobileDashboardInput,
  type MobileDashboardInput,
  type MobileDashboardSnapshot,
  type MobilePortfolioSnapshot,
} from '@interestshield/financial-engine';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';

type MobileMode = 'dashboard' | 'simulator' | 'portfolio' | 'learn' | 'vault';

const modes: Array<{ id: MobileMode; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'learn', label: 'Learn' },
  { id: 'vault', label: 'Vault' },
];

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

function SimulatorPanel({ snapshot }: { snapshot: MobileDashboardSnapshot }) {
  return (
    <View style={{ gap: 12 }}>
      <FinancialCard
        title="Current Plan"
        value={snapshot.nextMove}
        detail={snapshot.warning ?? 'Inputs are ready for a simulator pass.'}
      />
      <FinancialCard
        title="Interest Visibility"
        value={snapshot.vitals[1].value}
        detail="LOC interest and debt interest stay visible before any savings claim is shown."
      />
      <FinancialCard
        title="Next Native Gate"
        detail="Scenario editing is now backed by native assumption controls and the shared engine snapshot."
      />
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

export function MobileShell() {
  const [mode, setMode] = useState<MobileMode>('dashboard');
  const [input, setInput] = useState<MobileDashboardInput>(defaultMobileDashboardInput);
  const snapshot = buildMobileDashboardSnapshot(input);
  const portfolio = buildMobilePortfolioSnapshot(input);
  const title = modes.find((item) => item.id === mode)?.label ?? 'Dashboard';

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
        <ModeButton active={mode === 'dashboard'} label="Dashboard" onPress={() => setMode('dashboard')} />
        <ModeButton active={mode === 'simulator'} label="Simulator" onPress={() => setMode('simulator')} />
        <ModeButton active={mode === 'portfolio'} label="Portfolio" onPress={() => setMode('portfolio')} />
        <ModeButton active={mode === 'learn'} label="Learn" onPress={() => setMode('learn')} />
        <ModeButton active={mode === 'vault'} label="Vault" onPress={() => setMode('vault')} />
      </View>

      <AssumptionControls input={input} onChange={setInput} />

      {mode === 'dashboard' ? <DashboardPanel snapshot={snapshot} /> : null}
      {mode === 'simulator' ? <SimulatorPanel snapshot={snapshot} /> : null}
      {mode === 'portfolio' ? <PortfolioPanel portfolio={portfolio} /> : null}
      {mode === 'learn' ? <LearnPanel /> : null}
      {mode === 'vault' ? <VaultPanel snapshot={snapshot} /> : null}

      <Text selectable style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
        Educational tool. Not financial advice.
      </Text>
    </ScrollView>
  );
}
