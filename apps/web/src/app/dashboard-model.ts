import { formatCurrency } from '../engine/calculations';

export type DashboardTone = 'emerald' | 'sky' | 'amber' | 'rose';

export interface DashboardDebtInput {
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
}

export interface DashboardLocInput {
  limit: number;
  balance: number;
  interestRate: number;
}

export interface DashboardProjectionInput {
  months: number;
  totalInterest: number;
  isPayoffPossible?: boolean;
  failureReason?: string;
}

export interface DashboardVelocityProjectionInput extends DashboardProjectionInput {
  savings: number;
}

export interface DashboardModelInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  chunkAmount: number;
  activeDebt: DashboardDebtInput;
  allDebts: DashboardDebtInput[];
  loc: DashboardLocInput;
  baseline: DashboardProjectionInput;
  velocity: DashboardVelocityProjectionInput;
}

export interface DashboardVital {
  id: 'cash-flow' | 'interest-burn' | 'debt-free-eta' | 'next-move';
  label: string;
  value: string;
  caption: string;
  tone: DashboardTone;
  assumptions: string[];
}

export interface DashboardWarning {
  kind: 'cash-flow' | 'loc-setup' | 'loc-utilization' | 'payoff';
  title: string;
  body: string;
}

export interface DashboardLoopStep {
  label: string;
  value: string;
  note: string;
}

export interface DashboardLoopArtifact {
  id: 'income' | 'loc' | 'expenses' | 'cash-flow' | 'principal';
  label: string;
  value: string;
  signal: string;
  note: string;
  tone: DashboardTone;
  fillPercent: number;
}

export interface DashboardChangeExplanation {
  id: 'cash-flow' | 'loc-room' | 'chunk' | 'eta';
  label: string;
  value: string;
  body: string;
  tone: DashboardTone;
}

export interface DashboardNextMove {
  title: string;
  value: string;
  caption: string;
  tone: DashboardTone;
  assumptions: string[];
}

export interface DashboardModel {
  cashFlow: number;
  availableLoc: number;
  locNeedsSetup: boolean;
  locUtilization: number;
  locUtilizationLabel: string;
  dailyInterestBurn: number;
  debtDailyInterest: number;
  locDailyInterest: number;
  etaValue: string;
  statusLabel: string;
  statusTone: DashboardTone;
  nextMove: DashboardNextMove;
  vitals: DashboardVital[];
  warnings: DashboardWarning[];
  moneyLoopArtifacts: DashboardLoopArtifact[];
  changeExplanations: DashboardChangeExplanation[];
  moneyLoopSteps: DashboardLoopStep[];
}

function formatMonths(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return 'Needs inputs';

  const wholeMonths = Math.ceil(months);
  const years = Math.floor(wholeMonths / 12);
  const remainingMonths = wholeMonths % 12;

  if (years === 0) return `${wholeMonths} mo`;
  if (remainingMonths === 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
}

function isProjectedPayoffPossible(projection: DashboardProjectionInput): boolean {
  return projection.isPayoffPossible !== false && Number.isFinite(projection.months) && projection.months > 0;
}

function dailyInterest(balance: number, apr: number): number {
  return (Math.max(0, balance) * Math.max(0, apr)) / 365;
}

function formatLocSetupLabel(loc: DashboardLocInput): string {
  return loc.balance > 0 ? 'Missing limit' : 'No LOC';
}

function clampArtifactFill(value: number): number {
  if (!Number.isFinite(value)) return 12;
  return Math.min(100, Math.max(12, Math.round(value * 100)));
}

function buildMoneyLoopArtifacts(
  input: DashboardModelInput,
  cashFlow: number,
  availableLoc: number,
  locUtilization: number
): DashboardLoopArtifact[] {
  const locNeedsSetup = input.loc.limit <= 0;
  const monthlyFlowBase = Math.max(input.monthlyIncome, input.monthlyExpenses, 1);
  const availableLocRatio = input.loc.limit > 0 ? availableLoc / input.loc.limit : 0;
  const safeChunk = Math.min(Math.max(0, input.chunkAmount), Math.max(0, input.activeDebt.balance), availableLoc);
  const principalImpact = input.activeDebt.balance > 0 ? safeChunk / input.activeDebt.balance : 0;

  return [
    {
      id: 'income',
      label: 'Income',
      value: formatCurrency(input.monthlyIncome),
      signal: 'Fuel',
      note: 'Deposits start the loop and lower the average LOC balance.',
      tone: input.monthlyIncome > input.monthlyExpenses ? 'emerald' : 'amber',
      fillPercent: clampArtifactFill(input.monthlyIncome / monthlyFlowBase),
    },
    {
      id: 'loc',
      label: 'LOC',
      value: locNeedsSetup ? 'Add LOC limit' : `${formatCurrency(availableLoc)} open`,
      signal: locNeedsSetup ? 'Setup needed' : `${Math.round(locUtilization * 100)}% used`,
      note: locNeedsSetup
        ? 'LOC capacity needs a limit before chunk projections are meaningful.'
        : 'Capacity is useful only when it stays inside a comfortable buffer.',
      tone: locNeedsSetup || locUtilization > 0.8 ? 'amber' : 'sky',
      fillPercent: clampArtifactFill(availableLocRatio),
    },
    {
      id: 'expenses',
      label: 'Expenses',
      value: formatCurrency(input.monthlyExpenses),
      signal: 'Outflow',
      note: 'Planned expenses define how much pressure remains in the loop.',
      tone: input.monthlyExpenses < input.monthlyIncome ? 'sky' : 'rose',
      fillPercent: clampArtifactFill(input.monthlyExpenses / monthlyFlowBase),
    },
    {
      id: 'cash-flow',
      label: 'Cash Flow',
      value: formatCurrency(cashFlow),
      signal: cashFlow > 0 ? 'Surplus' : 'Stabilize',
      note: cashFlow > 0
        ? 'Positive flow is what pulls the LOC balance back down after chunks.'
        : 'Restore positive flow before relying on chunk projections.',
      tone: cashFlow > 0 ? 'emerald' : 'rose',
      fillPercent: clampArtifactFill(cashFlow > 0 ? cashFlow / monthlyFlowBase : 0),
    },
    {
      id: 'principal',
      label: 'Principal',
      value: safeChunk > 0 ? formatCurrency(safeChunk) : 'Set chunk',
      signal: input.activeDebt.name,
      note: safeChunk > 0
        ? 'The starter chunk targets principal so future interest has less balance to attach to.'
        : 'Choose a chunk only after cash flow and LOC room are usable.',
      tone: safeChunk > 0 && cashFlow > 0 ? 'emerald' : 'amber',
      fillPercent: clampArtifactFill(principalImpact),
    },
  ];
}

function buildChangeExplanations(
  input: DashboardModelInput,
  cashFlow: number,
  availableLoc: number,
  locUtilization: number,
  velocityPossible: boolean,
  baselinePossible: boolean
): DashboardChangeExplanation[] {
  const locNeedsSetup = input.loc.limit <= 0;
  const safeChunk = Math.min(Math.max(0, input.chunkAmount), Math.max(0, input.activeDebt.balance), availableLoc);
  const locUseLabel = locNeedsSetup ? formatLocSetupLabel(input.loc) : `${Math.round(locUtilization * 100)}% used`;
  const etaBody = velocityPossible
    ? `ETA changes when cash flow, payment, APR, or chunk assumptions change. Current velocity is compared against ${baselinePossible ? 'the baseline payoff path' : 'an invalid baseline path that needs review'}.`
    : 'No ETA is shown until cash flow and payoff inputs can support a stable projection.';

  return [
    {
      id: 'cash-flow',
      label: 'Cash Flow',
      value: formatCurrency(cashFlow),
      body: `Income minus expenses equals ${formatCurrency(cashFlow)}. Edits to either number change the cash available to recover the LOC and reduce debt.`,
      tone: cashFlow > 0 ? 'emerald' : 'rose',
    },
    {
      id: 'loc-room',
      label: 'LOC Room',
      value: locNeedsSetup ? locUseLabel : `${formatCurrency(availableLoc)} open`,
      body: locNeedsSetup
        ? 'Add a LOC limit before trusting chunk projections; without a limit, LOC room is treated as setup needed.'
        : `LOC balance and limit set the available room and interest burn. Current utilization is ${locUseLabel}.`,
      tone: locNeedsSetup || locUtilization > 0.8 ? 'amber' : 'sky',
    },
    {
      id: 'chunk',
      label: 'Chunk',
      value: safeChunk > 0 ? formatCurrency(safeChunk) : 'Set chunk',
      body: `The usable chunk is capped by the active debt balance and available LOC room. The current modeled chunk is ${safeChunk > 0 ? formatCurrency(safeChunk) : 'not ready yet'}.`,
      tone: safeChunk > 0 && cashFlow > 0 ? 'emerald' : 'amber',
    },
    {
      id: 'eta',
      label: 'ETA',
      value: velocityPossible ? formatMonths(input.velocity.months) : 'Stabilize first',
      body: etaBody,
      tone: velocityPossible ? 'sky' : 'rose',
    },
  ];
}

function buildNextMove(input: DashboardModelInput, cashFlow: number, locUtilization: number, velocityPossible: boolean): DashboardNextMove {
  const availableLoc = Math.max(0, input.loc.limit - input.loc.balance);
  const safeChunk = Math.min(Math.max(0, input.chunkAmount), Math.max(0, input.activeDebt.balance), availableLoc);

  if (cashFlow <= 0) {
    return {
      title: 'Restore positive cash flow',
      value: 'Stabilize first',
      caption: 'Income needs to exceed expenses before velocity banking is modeled as usable.',
      tone: 'rose',
      assumptions: [
        'Cash flow is monthly income minus monthly expenses.',
        'The model does not show a payoff claim when monthly cash flow is zero or negative.',
      ],
    };
  }

  if (locUtilization > 0.8) {
    return {
      title: 'Pay down the LOC',
      value: `${Math.round(locUtilization * 100)}% used`,
      caption: 'Bring utilization below 80% before adding another chunk.',
      tone: 'amber',
      assumptions: [
        'LOC utilization is current LOC balance divided by LOC limit.',
        'The 80% warning is a planning guardrail, not lender-specific advice.',
      ],
    };
  }

  if (input.loc.limit <= 0) {
    const locSetupLabel = formatLocSetupLabel(input.loc);

    return {
      title: 'Add LOC details',
      value: locSetupLabel === 'No LOC' ? 'No LOC set' : locSetupLabel,
      caption: 'Enter a LOC limit before modeling chunk movement.',
      tone: 'amber',
      assumptions: [
        'Velocity banking projections require available LOC capacity.',
        'A missing LOC limit is treated as setup needed, not high utilization.',
      ],
    };
  }

  if (!velocityPossible) {
    return {
      title: 'Fix the payoff inputs',
      value: 'Invalid plan',
      caption: 'The current payment assumptions do not support a stable payoff estimate.',
      tone: 'rose',
      assumptions: [
        'A payoff estimate requires payments to cover interest and reduce principal.',
        'The dashboard uses the same payoff status returned by the calculation engine.',
      ],
    };
  }

  if (safeChunk <= 0) {
    return {
      title: 'Choose a starter chunk',
      value: 'Set chunk',
      caption: 'Pick a chunk that leaves room in the LOC and can be paid down by cash flow.',
      tone: 'sky',
      assumptions: [
        'Chunk amount is user-entered and should stay inside available LOC capacity.',
        'Cash flow should be able to help bring the LOC balance back down after a chunk.',
      ],
    };
  }

  return {
    title: 'Send the next chunk',
    value: formatCurrency(safeChunk),
    caption: `Aim at ${input.activeDebt.name}, then use cash flow to pull the LOC back down.`,
    tone: 'emerald',
    assumptions: [
      'The chunk is capped by the active debt balance and available LOC capacity.',
      'This is an educational simulation step, not an instruction to move real funds.',
    ],
  };
}

export function buildDashboardModel(input: DashboardModelInput): DashboardModel {
  const cashFlow = input.monthlyIncome - input.monthlyExpenses;
  const availableLoc = Math.max(0, input.loc.limit - input.loc.balance);
  const locNeedsSetup = input.loc.limit <= 0;
  const locUtilization = locNeedsSetup ? 0 : input.loc.balance / input.loc.limit;
  const locUtilizationLabel = locNeedsSetup ? formatLocSetupLabel(input.loc) : `${Math.round(locUtilization * 100)}%`;
  const debtDailyInterest = input.allDebts.reduce(
    (sum, debt) => sum + dailyInterest(debt.balance, debt.interestRate),
    0
  );
  const locDailyInterest = dailyInterest(input.loc.balance, input.loc.interestRate);
  const dailyInterestBurn = debtDailyInterest + locDailyInterest;
  const velocityPossible = cashFlow > 0 && isProjectedPayoffPossible(input.velocity);
  const baselinePossible = isProjectedPayoffPossible(input.baseline);
  const etaValue = velocityPossible ? formatMonths(input.velocity.months) : 'Stabilize first';
  const nextMove = buildNextMove(input, cashFlow, locUtilization, velocityPossible);

  const warnings: DashboardWarning[] = [];
  if (cashFlow <= 0) {
    warnings.push({
      kind: 'cash-flow',
      title: 'Cash flow is not positive',
      body: 'Velocity banking needs surplus cash flow. Stabilize income and expenses before relying on payoff estimates.',
    });
  }
  if (locNeedsSetup) {
    warnings.push({
      kind: 'loc-setup',
      title: 'Add LOC details',
      body: 'The Money Loop needs a LOC limit before chunk projections can be trusted. Enter a limit or keep the dashboard in baseline mode.',
    });
  } else if (locUtilization > 0.8) {
    warnings.push({
      kind: 'loc-utilization',
      title: 'LOC utilization is above 80%',
      body: 'The LOC is too heavily used for a comfortable buffer. Pay it down before modeling another chunk.',
    });
  }
  if (!velocityPossible && cashFlow > 0 && !locNeedsSetup) {
    warnings.push({
      kind: 'payoff',
      title: 'Payoff estimate needs attention',
      body: 'The current payment inputs do not support a stable debt-free date. Check minimum payment, APR, and chunk assumptions.',
    });
  }

  const vitals: DashboardVital[] = [
    {
      id: 'cash-flow',
      label: 'Cash Flow',
      value: formatCurrency(cashFlow),
      caption: cashFlow > 0 ? 'Monthly velocity fuel after expenses.' : 'Stabilize income and expenses first.',
      tone: cashFlow > 0 ? 'emerald' : 'rose',
      assumptions: [
        'Cash flow = monthly income - monthly expenses.',
        'This does not include taxes, irregular expenses, or emergency reserves unless you enter them as expenses.',
      ],
    },
    {
      id: 'interest-burn',
      label: 'Interest Burn',
      value: `${formatCurrency(dailyInterestBurn)}/day`,
      caption: `${formatCurrency(debtDailyInterest)}/day debt + ${formatCurrency(locDailyInterest)}/day LOC.`,
      tone: dailyInterestBurn > 50 ? 'amber' : 'sky',
      assumptions: [
        'Daily burn is a simple daily accrual estimate across modeled debts plus current LOC balance.',
        'Actual lenders may post interest monthly and may use different balance rules.',
      ],
    },
    {
      id: 'debt-free-eta',
      label: 'Debt-Free ETA',
      value: etaValue,
      caption: velocityPossible
        ? `${formatMonths(input.baseline.months)} baseline, ${formatCurrency(input.velocity.savings)} estimated interest difference.`
        : 'No debt-free date shown until the plan is stable.',
      tone: velocityPossible ? 'sky' : 'rose',
      assumptions: [
        baselinePossible ? 'Baseline uses the current minimum-payment path.' : 'Baseline payoff is currently marked invalid by the engine.',
        'Velocity ETA uses the shared single-debt velocity engine for the active target.',
      ],
    },
    {
      id: 'next-move',
      label: 'Next Move',
      value: nextMove.title,
      caption: nextMove.caption,
      tone: nextMove.tone,
      assumptions: nextMove.assumptions,
    },
  ];

  return {
    cashFlow,
    availableLoc,
    locNeedsSetup,
    locUtilization,
    locUtilizationLabel,
    dailyInterestBurn,
    debtDailyInterest,
    locDailyInterest,
    etaValue,
    statusLabel: warnings.length > 0 ? 'Needs review' : 'Ready to simulate',
    statusTone: warnings.length > 0 ? 'amber' : 'emerald',
    nextMove,
    vitals,
    moneyLoopArtifacts: buildMoneyLoopArtifacts(input, cashFlow, availableLoc, locUtilization),
    changeExplanations: buildChangeExplanations(input, cashFlow, availableLoc, locUtilization, velocityPossible, baselinePossible),
    warnings,
    moneyLoopSteps: [
      {
        label: 'Income',
        value: formatCurrency(input.monthlyIncome),
        note: 'Deposits are modeled as the starting pressure in the loop.',
      },
      {
        label: 'LOC',
        value: `${formatCurrency(availableLoc)} open`,
        note: 'Available credit is capacity, not free money.',
      },
      {
        label: 'Expenses',
        value: formatCurrency(input.monthlyExpenses),
        note: 'Expenses define how much cash flow remains.',
      },
      {
        label: 'Cash Flow',
        value: formatCurrency(cashFlow),
        note: 'Positive flow pays the LOC down after a chunk.',
      },
      {
        label: 'Principal',
        value: input.activeDebt.name,
        note: 'Chunks target principal so future interest has less balance to attach to.',
      },
    ],
  };
}
