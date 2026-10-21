const GAUGE_CIRCUMFERENCE = 251;

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function buildBoundedGaugeDash(value: number, target: number): string {
  const safeTarget = Number.isFinite(target) && target > 0 ? target : 1;
  const fill = clampRatio(value / safeTarget);
  return `${Math.round(fill * GAUGE_CIRCUMFERENCE)} ${GAUGE_CIRCUMFERENCE}`;
}

export function buildDebtBalanceGaugeDash(balance: number): string {
  return buildBoundedGaugeDash(balance, 50000);
}

export function buildDebtFreedomProgressPercent(balance: number, referenceBalance = 50000): number {
  const safeReference = Number.isFinite(referenceBalance) && referenceBalance > 0 ? referenceBalance : 50000;
  if (!Number.isFinite(balance)) return 0;
  const progress = (safeReference - balance) / safeReference;
  return Math.round(clampRatio(progress) * 100);
}

export function buildCashFlowGaugeDash(cashFlow: number): string {
  return buildBoundedGaugeDash(cashFlow, 3000);
}

interface CockpitProjectionFact {
  months: number;
  totalInterest: number;
  isPayoffPossible?: boolean;
}

export interface CockpitProjectionInput {
  debtBalance: number;
  locBalance: number;
  baseline?: CockpitProjectionFact;
  velocity?: CockpitProjectionFact;
  emergencyActive: boolean;
  depositIncomeToLoc: boolean;
  expenseCardOn: boolean;
}

export interface CockpitProjectionView {
  state: 'projected' | 'cleared' | 'review' | 'unmodeled';
  eta: string;
  interestDelta: string;
  detail: string;
}

export function formatCockpitMoney(value: number, signed = false): string {
  if (!Number.isFinite(value)) return 'Not available';
  const scientific = Math.abs(value) >= 1e21 || value !== 0 && Math.abs(value) < 0.01;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
    notation: scientific ? 'scientific' : 'standard', signDisplay: signed ? 'exceptZero' : 'auto',
    minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function validProjection(projection?: CockpitProjectionFact): projection is CockpitProjectionFact {
  return projection?.isPayoffPossible === true && Number.isSafeInteger(projection.months) && projection.months >= 0
    && Number.isFinite(projection.totalInterest) && projection.totalInterest >= 0;
}

export function buildCockpitProjectionView(input: CockpitProjectionInput): CockpitProjectionView {
  const review: CockpitProjectionView = { state: 'review', eta: 'Review inputs', interestDelta: 'Not projected',
    detail: 'Payoff estimate unavailable. Review income, expenses, payment, APR and LOC terms.' };
  if (![input.debtBalance, input.locBalance].every(value => Number.isFinite(value) && value >= 0)
    || !Number.isFinite(input.debtBalance + input.locBalance)) return review;
  if (input.emergencyActive || !input.depositIncomeToLoc || !input.expenseCardOn) {
    return { state: 'unmodeled', eta: 'Not projected', interestDelta: 'Not projected', detail: input.emergencyActive
      ? 'The $600 emergency expense is not included in this projection. A revised payoff date is not modeled.'
      : 'Alternate routing is not modeled. A revised payoff date and interest difference are unavailable.' };
  }
  const { velocity, baseline } = input;
  const cleared = input.debtBalance === 0 && input.locBalance === 0;
  if (cleared) return { state:'cleared',eta:'No debt remaining',interestDelta:'$0.00',
    detail:'The selected debt and separate LOC balances are both zero. No future repayment is needed for this cohort.' };
  if (!validProjection(velocity) || velocity.months === 0) return review;
  const interestDelta = validProjection(baseline) && baseline.months > 0
    ? formatCockpitMoney(baseline.totalInterest - velocity.totalInterest, true) : 'Not projected';
  return { state:'projected',eta:`${velocity.months} mo`,interestDelta,
    detail:'Direct repayment and Velocity use the same available monthly budget, selected debt and existing LOC. Interest difference is direct repayment minus Velocity; a negative value means Velocity costs more. Lender terms and payment timing can change actual outcomes.' };
}
import { runSimulation, type SimulationInputs } from '../engine/calculations';


export function buildCockpitScenario(input: SimulationInputs,
  flags: Pick<CockpitProjectionInput,'emergencyActive'|'depositIncomeToLoc'|'expenseCardOn'>) {
  const simulation=runSimulation(input);
  const baseline={months:simulation.baseline.payoffMonths,totalInterest:simulation.baseline.totalInterest,
    isPayoffPossible:simulation.baseline.isPayoffPossible,failureReason:simulation.baseline.failureReason};
  const velocity={months:simulation.velocity.payoffMonths,totalInterest:simulation.velocity.totalInterest,
    isPayoffPossible:simulation.velocity.isPayoffPossible,failureReason:simulation.velocity.failureReason,
    savings:simulation.velocity.interestSaved};
  return {baseline,velocity,projection:buildCockpitProjectionView({...flags,baseline,velocity,
    debtBalance:input.carLoan.balance,locBalance:input.loc?.balance ?? 0})};
}
