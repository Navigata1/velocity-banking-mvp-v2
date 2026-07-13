import type {
  MobileCockpitSnapshot,
  MobileDashboardSnapshot,
  MobileLearnSnapshot,
  MobilePortfolioSnapshot,
  MobileSimulatorSnapshot,
  MobileVaultSnapshot,
} from '@interestshield/financial-engine';
import { Text, View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import { MobileMoneyLoopOrbit, MobileMoneyLoopPressureStrip } from './money-loop-visuals';
import { MobilePortfolioPath } from './portfolio-path';

export function DashboardPanel({ snapshot }: { snapshot: MobileDashboardSnapshot }) {
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

export function SimulatorPanel({
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
        detail="LOC interest and debt interest stay visible before any modeled payoff difference is shown."
      />
      <SimulatorStrategyPanel simulator={simulator} />
    </View>
  );
}

export function CockpitPanel({ cockpit }: { cockpit: MobileCockpitSnapshot }) {
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

export function PortfolioPanel({ portfolio }: { portfolio: MobilePortfolioSnapshot }) {
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

export function LearnPanel({ learn }: { learn: MobileLearnSnapshot }) {
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

export function VaultPanel({ vault }: { vault: MobileVaultSnapshot }) {
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
