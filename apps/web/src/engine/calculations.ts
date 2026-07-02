import {
  calculateADBInterest,
  calculateAmortizationPayment,
  calculateCashFlow,
  calculateDailyInterest,
  calculateDailyRate,
  calculateTotalAmortizationInterest,
  formatCurrency,
  simulateAmortizedPayoff,
  type LOCDetails,
} from '@interestshield/financial-engine';
import {
  simulateMoneyLoopMonth,
  simulateMoneyLoopPayoff,
  type MoneyLoopMonthlyResult,
} from './money-loop';

export {
  calculateADBInterest,
  calculateAmortizationPayment,
  calculateCashFlow,
  calculateDailyInterest,
  calculateDailyRate,
  calculateTotalAmortizationInterest,
  formatCurrency,
  simulateAmortizedPayoff,
};

export type { LOCDetails };

/**
 * InterestShield Velocity Banking Calculation Engine
 * 
 * Truth-first math. All results are estimates based on user inputs.
 * Not financial advice.
 * 
 * Key concepts from velocity banking methodology:
 * - Amortized loans compute interest before principal each period
 * - Lines of Credit use average daily balance for interest calculation
 * - Income deposited into LOC immediately reduces interest basis
 * - "Chunks" from LOC attack amortized debt principal directly
 * - Cash flow (Income - Expenses) pays down LOC over time
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface LoanDetails {
  balance: number;
  apr: number;         // decimal (e.g. 0.069 for 6.9%)
  monthlyPayment: number;
  termMonths?: number;
}

export interface DebtItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  apr: number;         // decimal
  monthlyPayment: number;
  termMonths: number;
}

export interface SimulationInputs {
  monthlyIncome: number;
  monthlyExpenses: number;
  carLoan: LoanDetails;
  loc?: LOCDetails;
  useVelocity: boolean;
  extraPayment: number;
}

export type SimulationEventType =
  | 'debt-interest'
  | 'debt-payment'
  | 'income-to-loc'
  | 'expenses-from-loc'
  | 'loc-chunk-draw'
  | 'loc-interest'
  | 'loc-cashflow-paydown';

export interface SimulationEvent {
  type: SimulationEventType;
  label: string;
  amount: number;
  balanceAfter: number;
  note: string;
}

export interface MonthlyResult {
  month: number;
  carBalance: number;
  locBalance: number;
  carInterest: number;
  locInterest: number;
  cashFlow: number;
  events?: SimulationEvent[];
}

export type PayoffFailureReason =
  | 'payment-below-interest'
  | 'negative-cashflow'
  | 'cashflow-below-minimums'
  | 'loc-setup'
  | 'loc-no-capacity'
  | 'loc-overlimit'
  | 'payoff-horizon-exceeded';

export interface PayoffSimulation {
  payoffMonths: number;
  totalInterest: number;
  monthlyData: MonthlyResult[];
  isPayoffPossible: boolean;
  failureReason?: PayoffFailureReason;
}

export interface SimulationResult {
  baseline: PayoffSimulation;
  velocity: PayoffSimulation & {
    interestSaved: number;
    monthsSaved: number;
  };
  warnings: Warning[];
}

export interface Warning {
  type:
    | 'negative-cashflow'
    | 'cashflow-below-minimums'
    | 'loc-overlimit'
    | 'loc-no-capacity'
    | 'loc-overutilization'
    | 'negative-amortization'
    | 'payment-too-low'
    | 'no-loc';
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface MultiDebtResult {
  strategy: 'velocity' | 'snowball' | 'avalanche';
  debts: DebtPayoffResult[];
  isPayoffPossible: boolean;
  failureReason?: PayoffFailureReason;
  totalInterestPaid: number;
  locInterestPaid: number;
  moneyLoopMonthlyData: MoneyLoopMonthlyResult[];
  baselineTotalInterest: number;
  totalInterestSaved: number;
  totalMonths: number;
  baselineTotalMonths: number;
  monthsSaved: number;
  freedomDate: Date;
  warnings: Warning[];
}

export interface DebtPayoffResult {
  id: string;
  name: string;
  originalBalance: number;
  apr: number;
  payoffMonths: number;
  baselinePayoffMonths: number;
  totalInterest: number;
  baselineInterest: number;
  interestSaved: number;
  monthlyData: { month: number; balance: number; interestPaid: number; principalPaid: number }[];
}

export interface SingleDebtStrategyResult {
  name: 'Traditional' | 'Snowball' | 'Avalanche' | 'Velocity';
  months: number;
  totalInterest: number;
  isPayoffPossible: boolean;
  failureReason?: PayoffFailureReason;
}

// ─── Core Math ───────────────────────────────────────────────────────

export function calculateMonthlyRate(apr: number): number {
  return apr / 12;
}

// ─── Safety Warnings ─────────────────────────────────────────────────

export function generateWarnings(
  monthlyIncome: number,
  monthlyExpenses: number,
  loc?: LOCDetails,
  debts?: DebtItem[]
): Warning[] {
  const warnings: Warning[] = [];
  const cashFlow = monthlyIncome - monthlyExpenses;

  if (cashFlow <= 0) {
    warnings.push({
      type: 'negative-cashflow',
      severity: 'critical',
      message: `Your expenses (${formatCurrency(monthlyExpenses)}) exceed your income (${formatCurrency(monthlyIncome)}). Velocity banking requires positive cash flow to work. Let's focus on increasing income or reducing expenses first.`,
    });
  } else if (cashFlow < 200) {
    warnings.push({
      type: 'negative-cashflow',
      severity: 'warning',
      message: `Your cash flow is tight at ${formatCurrency(cashFlow)}/month. The strategy works better with more breathing room. Even small increases help.`,
    });
  }

  if (loc) {
    if (loc.limit <= 0) {
      warnings.push({
        type: 'no-loc',
        severity: loc.balance > 0 ? 'warning' : 'info',
        message: loc.balance > 0
          ? 'LOC balance is present, but the limit is missing. Enter a LOC limit before trusting utilization or chunk projections.'
          : 'No line of credit limit is set. Enter a LOC or HELOC limit before trusting velocity chunk projections.',
      });
    } else {
      const utilization = loc.balance / loc.limit;
      if (loc.balance > loc.limit) {
        warnings.push({
          type: 'loc-overlimit',
          severity: 'critical',
          message: `Your LOC balance (${formatCurrency(loc.balance)}) is above the entered limit (${formatCurrency(loc.limit)}). Bring it back under the limit before modeling another chunk.`,
        });
      } else if (loc.balance === loc.limit) {
        warnings.push({
          type: 'loc-no-capacity',
          severity: 'critical',
          message: 'Your LOC balance is at the entered limit. Pay it down before modeling another chunk.',
        });
      } else if (utilization > 0.8) {
        warnings.push({
          type: 'loc-overutilization',
          severity: 'critical',
          message: `Your LOC is ${Math.round(utilization * 100)}% utilized. Keep utilization under 80% for safety. Consider a smaller chunk size.`,
        });
      } else if (utilization > 0.5) {
        warnings.push({
          type: 'loc-overutilization',
          severity: 'warning',
          message: `LOC utilization at ${Math.round(utilization * 100)}%. Healthy range is under 50%. You have room, but watch it.`,
        });
      }
    }
  } else {
    warnings.push({
      type: 'no-loc',
      severity: 'info',
      message: 'No line of credit set up. Velocity banking works best with a LOC or HELOC to cycle income through.',
    });
  }

  if (debts) {
    const totalMinimums = debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
    if (cashFlow > 0 && cashFlow < totalMinimums) {
      warnings.push({
        type: 'cashflow-below-minimums',
        severity: 'critical',
        message: `Cash flow (${formatCurrency(cashFlow)}/month) doesn't cover all minimum payments (${formatCurrency(totalMinimums)}/month). Review expenses or payment assumptions before trusting payoff estimates.`,
      });
    }
  }

  if (debts) {
    for (const debt of debts) {
      const monthlyInterest = debt.balance * debt.apr / 12;
      if (debt.monthlyPayment <= monthlyInterest && debt.balance > 0) {
        warnings.push({
          type: 'negative-amortization',
          severity: 'critical',
          message: `${debt.name}: Your payment (${formatCurrency(debt.monthlyPayment)}) doesn't cover monthly interest (${formatCurrency(monthlyInterest)}). Your balance is growing, not shrinking.`,
        });
      }
    }
  }

  return warnings;
}

// ─── Baseline Simulation (Standard Amortization) ─────────────────────

export function simulateBaseline(inputs: SimulationInputs): PayoffSimulation {
  const cashFlow = inputs.monthlyIncome - inputs.monthlyExpenses;
  const projection = simulateAmortizedPayoff({
    principalBalance: inputs.carLoan.balance,
    apr: inputs.carLoan.apr,
    monthlyPayment: inputs.carLoan.monthlyPayment,
    maxMonths: 600,
  });

  return {
    payoffMonths: projection.payoffMonths,
    totalInterest: projection.totalInterest,
    monthlyData: projection.monthlyData.map((month) => ({
      month: month.month,
      carBalance: month.balance,
      locBalance: 0,
      carInterest: month.interest,
      locInterest: 0,
      cashFlow: cashFlow - inputs.carLoan.monthlyPayment,
    })),
    isPayoffPossible: projection.isPayoffPossible,
    failureReason: projection.failureReason,
  };
}

// ─── Velocity Simulation (LOC Chunking + ADB Interest) ───────────────

/**
 * Velocity banking simulation:
 * 1. Each month, income goes into LOC (reduces LOC balance / increases available)
 * 2. Expenses come out of LOC over the month
 * 3. LOC interest calculated on Average Daily Balance
 * 4. When LOC has enough room, deploy a "chunk" to the amortized debt
 * 5. Continue until debt is paid off
 * 
 * Chunk deployment: when LOC available >= chunkAmount, transfer chunk to debt principal.
 * LOC balance increases by chunk amount, then gets paid down by cash flow over time.
 */
export function simulateVelocity(inputs: SimulationInputs): PayoffSimulation {
  if (!inputs.loc) {
    // Without LOC, velocity = baseline + extra payments
    return simulateWithExtraPayments(inputs);
  }

  const cashFlow = inputs.monthlyIncome - inputs.monthlyExpenses;

  if (cashFlow <= 0) {
    const baseline = simulateBaseline(inputs);
    return {
      ...baseline,
      isPayoffPossible: false,
      failureReason: baseline.failureReason ?? 'negative-cashflow',
    };
  }

  if (inputs.loc.limit <= 0) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      monthlyData: [],
      isPayoffPossible: false,
      failureReason: 'loc-setup',
    };
  }

  if (inputs.loc.balance > inputs.loc.limit) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      monthlyData: [],
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
    };
  }

  if (inputs.loc.balance === inputs.loc.limit) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      monthlyData: [],
      isPayoffPossible: false,
      failureReason: 'loc-no-capacity',
    };
  }

  if (cashFlow < inputs.carLoan.monthlyPayment) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      monthlyData: [],
      isPayoffPossible: false,
      failureReason: 'cashflow-below-minimums',
    };
  }

  const locCashFlowPaydown = Math.max(0, cashFlow - inputs.carLoan.monthlyPayment);
  const chunkAmount = Math.max(
    0,
    inputs.extraPayment > 0 ? inputs.extraPayment : Math.min(locCashFlowPaydown * 3, inputs.loc.limit * 0.4)
  );

  const moneyLoop = simulateMoneyLoopPayoff({
    principalBalance: inputs.carLoan.balance,
    debtApr: inputs.carLoan.apr,
    debtPayment: inputs.carLoan.monthlyPayment,
    loc: inputs.loc,
    chunkAmount,
    cashFlowPaydown: locCashFlowPaydown,
    locDepositAmount: inputs.monthlyIncome,
    locExpenseAmount: inputs.monthlyExpenses + inputs.carLoan.monthlyPayment,
    maxMonths: 600,
    initialMonthsSinceChunk: 0,
  });

  return {
    payoffMonths: moneyLoop.payoffMonths,
    totalInterest: moneyLoop.totalInterest,
    monthlyData: moneyLoop.monthlyData.map((month) => ({
      month: month.month,
      carBalance: month.debtBalance,
      locBalance: month.locBalance,
      carInterest: month.debtInterest,
      locInterest: month.locInterest,
      cashFlow: locCashFlowPaydown,
      events: month.events,
    })),
    isPayoffPossible: moneyLoop.isPayoffPossible,
    failureReason: moneyLoop.failureReason,
  };
}

function simulateWithExtraPayments(inputs: SimulationInputs): PayoffSimulation {
  const cashFlow = inputs.monthlyIncome - inputs.monthlyExpenses;
  const extraPayment = Math.min(Math.max(0, inputs.extraPayment), Math.max(0, cashFlow));
  const projection = simulateAmortizedPayoff({
    principalBalance: inputs.carLoan.balance,
    apr: inputs.carLoan.apr,
    monthlyPayment: inputs.carLoan.monthlyPayment,
    extraPayment,
    maxMonths: 600,
  });

  return {
    payoffMonths: projection.payoffMonths,
    totalInterest: projection.totalInterest,
    monthlyData: projection.monthlyData.map((month) => ({
      month: month.month,
      carBalance: month.balance,
      locBalance: 0,
      carInterest: month.interest,
      locInterest: 0,
      cashFlow: cashFlow - inputs.carLoan.monthlyPayment - extraPayment,
    })),
    isPayoffPossible: projection.isPayoffPossible,
    failureReason: projection.failureReason,
  };
}

// ─── Multi-Debt Simulation ───────────────────────────────────────────

/**
 * Simulate payoff of multiple debts using different strategies.
 * 
 * Velocity: Use LOC chunking on the focus debt (highest APR by default),
 *           then cascade freed payments to next debt.
 * Snowball: Pay minimums on all, extra cash to smallest balance first.
 * Avalanche: Pay minimums on all, extra cash to highest APR first.
 */
export function simulateMultiDebt(
  debts: DebtItem[],
  monthlyIncome: number,
  monthlyExpenses: number,
  loc: LOCDetails | undefined,
  strategy: 'velocity' | 'snowball' | 'avalanche',
  chunkAmount?: number
): MultiDebtResult {
  const warnings = generateWarnings(monthlyIncome, monthlyExpenses, loc, debts);
  const cashFlow = monthlyIncome - monthlyExpenses;
  const totalMinPayments = debts.reduce((sum, d) => sum + d.monthlyPayment, 0);
  const surplus = Math.max(0, cashFlow - totalMinPayments);

  // Calculate baseline for each debt
  const baselineResults = debts.map(d => {
    const result = simulateBaselineDebt(d);
    return { ...result, id: d.id, name: d.name };
  });
  const baselineTotal = baselineResults.reduce((s, d) => s + d.totalInterest, 0);
  const baselineMaxMonths = baselineResults.length > 0 ? Math.max(...baselineResults.map(b => b.payoffMonths)) : 0;
  const buildInvalidResult = (failureReason: PayoffFailureReason): MultiDebtResult => {
    const invalidDebtResults: DebtPayoffResult[] = debts.map((debt) => {
      const baseline = baselineResults.find(b => b.id === debt.id)!;
      return {
        id: debt.id,
        name: debt.name,
        originalBalance: debt.balance,
        apr: debt.apr,
        payoffMonths: 0,
        baselinePayoffMonths: baseline.payoffMonths,
        totalInterest: 0,
        baselineInterest: baseline.totalInterest,
        interestSaved: 0,
        monthlyData: [],
      };
    });

    return {
      strategy,
      debts: invalidDebtResults,
      isPayoffPossible: false,
      failureReason,
      totalInterestPaid: 0,
      locInterestPaid: 0,
      moneyLoopMonthlyData: [],
      baselineTotalInterest: baselineTotal,
      totalInterestSaved: 0,
      totalMonths: 0,
      baselineTotalMonths: baselineMaxMonths,
      monthsSaved: 0,
      freedomDate: new Date(),
      warnings,
    };
  };

  const underInterestDebt = debts.find((debt) => {
    const monthlyInterest = debt.balance * debt.apr / 12;
    return debt.balance > 0.01 && debt.monthlyPayment <= monthlyInterest;
  });

  if (cashFlow <= 0) {
    return buildInvalidResult('negative-cashflow');
  }

  if (cashFlow < totalMinPayments) {
    return buildInvalidResult('cashflow-below-minimums');
  }

  if (underInterestDebt) {
    return buildInvalidResult('payment-below-interest');
  }

  if (strategy === 'velocity' && loc) {
    if (loc.limit <= 0) {
      return buildInvalidResult('loc-setup');
    }

    if (loc.balance > loc.limit) {
      return buildInvalidResult('loc-overlimit');
    }

    if (loc.balance === loc.limit) {
      return buildInvalidResult('loc-no-capacity');
    }
  }

  // Sort debts based on strategy
  const sortedDebts = [...debts];
  if (strategy === 'snowball') {
    sortedDebts.sort((a, b) => a.balance - b.balance);
  } else {
    // avalanche and velocity both target highest APR
    sortedDebts.sort((a, b) => b.apr - a.apr);
  }

  // Run multi-debt simulation
  const balances = new Map<string, number>();
  const interestPaid = new Map<string, number>();
  const monthlyDetails = new Map<string, { month: number; balance: number; interestPaid: number; principalPaid: number }[]>();
  const payoffMonths = new Map<string, number>();

  for (const d of debts) {
    balances.set(d.id, d.balance);
    interestPaid.set(d.id, 0);
    monthlyDetails.set(d.id, []);
    payoffMonths.set(d.id, 0);
  }

  let locBalance = loc?.balance ?? 0;
  let locInterestPaid = 0;
  const moneyLoopMonthlyData: MoneyLoopMonthlyResult[] = [];
  let month = 0;
  let monthsSinceChunk = 999; // allow first chunk immediately
  const effectiveChunk = Math.max(
    0,
    chunkAmount ?? Math.min(Math.max(0, cashFlow) * 3, (loc?.limit ?? 0) * 0.4)
  );

  while (month < 600) {
    const allPaidOff = sortedDebts.every(d => (balances.get(d.id) ?? 0) <= 0.01);
    const hasOutstandingVelocityLoc = strategy === 'velocity' && !!loc && locBalance > 0.01;
    if (allPaidOff && !hasOutstandingVelocityLoc) break;

    month++;

    let freedPayments = 0;
    let usedMoneyLoopThisMonth = false;

    // Find the current focus debt (first unpaid in sorted order)
    const focusDebt = sortedDebts.find(d => (balances.get(d.id) ?? 0) > 0.01);

    // Process each debt
    for (const d of debts) {
      const bal = balances.get(d.id) ?? 0;
      if (bal <= 0.01) {
        // Already paid off — freed payment goes to surplus
        freedPayments += d.monthlyPayment;
        continue;
      }

      if (strategy === 'velocity' && loc && focusDebt && d.id === focusDebt.id && cashFlow > 0) {
        const focusInterest = bal * d.apr / 12;
        const focusPayment = Math.min(d.monthlyPayment + surplus + freedPayments, bal + focusInterest);
        const otherActivePayments = debts.reduce((sum, otherDebt) => {
          if (otherDebt.id === d.id) return sum;
          const otherBalance = balances.get(otherDebt.id) ?? 0;
          if (otherBalance <= 0.01) return sum;

          const otherInterest = otherBalance * otherDebt.apr / 12;
          return sum + Math.min(otherDebt.monthlyPayment, otherBalance + otherInterest);
        }, 0);
        const locCashFlowPaydown = Math.max(0, cashFlow - focusPayment - otherActivePayments);
        freedPayments = 0;
        const monthResult = simulateMoneyLoopMonth({
          month,
          debtBalance: bal,
          debtApr: d.apr,
          debtPayment: focusPayment,
          loc,
          locBalance,
          chunkAmount: effectiveChunk,
          cashFlowPaydown: locCashFlowPaydown,
          locDepositAmount: monthlyIncome,
          locExpenseAmount: monthlyExpenses + focusPayment + otherActivePayments,
          monthsSinceChunk,
        });

        locBalance = monthResult.locBalance;
        locInterestPaid += monthResult.locInterest;
        monthsSinceChunk = monthResult.monthsSinceChunk;
        balances.set(d.id, monthResult.debtBalance);
        interestPaid.set(d.id, (interestPaid.get(d.id) ?? 0) + monthResult.debtInterest);
        monthlyDetails.get(d.id)?.push({
          month,
          balance: monthResult.debtBalance,
          interestPaid: monthResult.debtInterest,
          principalPaid: monthResult.debtPrincipalPaid,
        });
        moneyLoopMonthlyData.push({
          month: monthResult.month,
          debtBalance: monthResult.debtBalance,
          locBalance: monthResult.locBalance,
          debtInterest: monthResult.debtInterest,
          locInterest: monthResult.locInterest,
          cashFlowPaydown: monthResult.cashFlowPaydown,
          events: monthResult.events,
        });
        usedMoneyLoopThisMonth = true;

        if (monthResult.debtBalance <= 0.01 && !payoffMonths.get(d.id)) {
          payoffMonths.set(d.id, month);
        }
        continue;
      }

      const monthlyRate = d.apr / 12;
      const interest = bal * monthlyRate;
      let payment = d.monthlyPayment;

      // Add surplus + freed payments to focus debt
      if (focusDebt && d.id === focusDebt.id) {
        payment += surplus + freedPayments;
        freedPayments = 0; // consumed
      }

      payment = Math.min(payment, bal + interest);
      const principal = Math.max(0, payment - interest);

      const newBal = Math.max(0, bal - principal);
      balances.set(d.id, newBal);
      interestPaid.set(d.id, (interestPaid.get(d.id) ?? 0) + interest);

      monthlyDetails.get(d.id)?.push({
        month,
        balance: newBal,
        interestPaid: interest,
        principalPaid: principal,
      });

      if (newBal <= 0.01 && !payoffMonths.get(d.id)) {
        payoffMonths.set(d.id, month);
      }
    }

    // LOC: ADB interest + cash flow paydown (for velocity)
    if (strategy === 'velocity' && loc && locBalance > 0 && !usedMoneyLoopThisMonth) {
      const locInterest = calculateADBInterest(locBalance, loc.apr, monthlyIncome, monthlyExpenses);
      locInterestPaid += locInterest;
      locBalance = Math.max(0, locBalance - cashFlow + locInterest);
    }
  }

  // Compile results
  const debtResults: DebtPayoffResult[] = debts.map(d => {
    const baseline = baselineResults.find(b => b.id === d.id)!;
    const totalInt = interestPaid.get(d.id) ?? 0;
    return {
      id: d.id,
      name: d.name,
      originalBalance: d.balance,
      apr: d.apr,
      payoffMonths: payoffMonths.get(d.id) ?? month,
      baselinePayoffMonths: baseline.payoffMonths,
      totalInterest: totalInt,
      baselineInterest: baseline.totalInterest,
      interestSaved: Math.max(0, baseline.totalInterest - totalInt),
      monthlyData: monthlyDetails.get(d.id) ?? [],
    };
  });

  const debtInterest = debtResults.reduce((s, d) => s + d.totalInterest, 0);
  const totalInterest = debtInterest + (strategy === 'velocity' ? locInterestPaid : 0);
  const debtsPaidOff = debts.every(d => (balances.get(d.id) ?? 0) <= 0.01);
  const velocityLocRecovered = strategy !== 'velocity' || !loc || locBalance <= 0.01;
  const isPayoffPossible = debtsPaidOff && velocityLocRecovered;
  const freedomDate = new Date();
  freedomDate.setMonth(freedomDate.getMonth() + month);

  return {
    strategy,
    debts: debtResults,
    isPayoffPossible,
    failureReason: isPayoffPossible ? undefined : 'payoff-horizon-exceeded',
    totalInterestPaid: totalInterest,
    locInterestPaid: strategy === 'velocity' ? locInterestPaid : 0,
    moneyLoopMonthlyData: strategy === 'velocity' ? moneyLoopMonthlyData : [],
    baselineTotalInterest: baselineTotal,
    totalInterestSaved: Math.max(0, baselineTotal - totalInterest),
    totalMonths: month,
    baselineTotalMonths: baselineMaxMonths,
    monthsSaved: Math.max(0, baselineMaxMonths - month),
    freedomDate,
    warnings,
  };
}

function simulateBaselineDebt(debt: DebtItem): {
  payoffMonths: number;
  totalInterest: number;
  id: string;
  name: string;
} {
  const projection = simulateAmortizedPayoff({
    principalBalance: debt.balance,
    apr: debt.apr,
    monthlyPayment: debt.monthlyPayment,
    maxMonths: 600,
  });

  return {
    payoffMonths: projection.payoffMonths,
    totalInterest: projection.totalInterest,
    id: debt.id,
    name: debt.name,
  };
}

// ─── Legacy API (backwards compatible) ───────────────────────────────

export function runSimulation(inputs: SimulationInputs): SimulationResult {
  const baseline = simulateBaseline(inputs);
  const velocity = simulateVelocity(inputs);
  const canCompareSavings = baseline.isPayoffPossible && velocity.isPayoffPossible;
  const warnings = generateWarnings(
    inputs.monthlyIncome,
    inputs.monthlyExpenses,
    inputs.loc,
  );

  return {
    baseline,
    velocity: {
      ...velocity,
      interestSaved: canCompareSavings ? Math.max(0, baseline.totalInterest - velocity.totalInterest) : 0,
      monthsSaved: canCompareSavings ? Math.max(0, baseline.payoffMonths - velocity.payoffMonths) : 0,
    },
    warnings,
  };
}

export function compareSingleDebtStrategies(inputs: SimulationInputs): SingleDebtStrategyResult[] {
  const simulation = runSimulation(inputs);
  const surplusAfterMinimum = Math.max(
    0,
    inputs.monthlyIncome - inputs.monthlyExpenses - inputs.carLoan.monthlyPayment
  );
  const acceleratedInputs: SimulationInputs = {
    ...inputs,
    loc: undefined,
    useVelocity: false,
    extraPayment: surplusAfterMinimum,
  };
  const accelerated = simulateVelocity(acceleratedInputs);

  return [
    {
      name: 'Traditional',
      months: simulation.baseline.payoffMonths,
      totalInterest: simulation.baseline.totalInterest,
      isPayoffPossible: simulation.baseline.isPayoffPossible,
      failureReason: simulation.baseline.failureReason,
    },
    {
      name: 'Snowball',
      months: accelerated.payoffMonths,
      totalInterest: accelerated.totalInterest,
      isPayoffPossible: accelerated.isPayoffPossible,
      failureReason: accelerated.failureReason,
    },
    {
      name: 'Avalanche',
      months: accelerated.payoffMonths,
      totalInterest: accelerated.totalInterest,
      isPayoffPossible: accelerated.isPayoffPossible,
      failureReason: accelerated.failureReason,
    },
    {
      name: 'Velocity',
      months: simulation.velocity.payoffMonths,
      totalInterest: simulation.velocity.totalInterest,
      isPayoffPossible: simulation.velocity.isPayoffPossible,
      failureReason: simulation.velocity.failureReason,
    },
  ];
}

// ─── Mortgage Analysis ───────────────────────────────────────────────

export interface MortgageAnalysisInput {
  entryMode: 'purchase' | 'current' | 'both';
  purchaseAge: number;
  currentAge: number;
  originalCost: number;
  originalTermYears: number;
  originalRate: number;
  downPayment: number;
  currentBalance: number;
  remainingTermMonths: number;
  currentRate: number;
  currentMonthlyPayment: number;
  paymentFrequency: 'monthly' | 'biweekly' | 'weekly';
  hasExtraPayments: boolean;
  extraPaymentAmount: number;
  hasRefinanced: boolean;
  refinanceCount: number;
}

export type MortgageWarningType =
  | 'current-balance-exceeds-original-loan'
  | 'down-payment-exceeds-purchase-price'
  | 'payment-below-interest';

export interface MortgageWarning {
  type: MortgageWarningType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface MortgageAnalysisResult {
  originalPayment: number;
  originalLoanAmount: number;
  totalInterestLifetime: number;
  totalPaidLifetime: number;
  interestPaidSoFar: number;
  interestRemaining: number;
  principalPaidSoFar: number;
  monthsElapsed: number;
  equityPercent: number;
  interestPercentOfPayment: number;
  principalPercentOfPayment: number;
  first7YearsInterestPercent: number;
  refinancePenalty: number;
  warnings: MortgageWarning[];
}

export function calculateMortgageAnalysis(input: MortgageAnalysisInput): MortgageAnalysisResult {
  const originalCost = Number.isFinite(input.originalCost) ? Math.max(0, input.originalCost) : 0;
  const downPayment = Number.isFinite(input.downPayment) ? Math.max(0, input.downPayment) : 0;
  const loanAmount = Math.max(0, originalCost - downPayment);
  const originalTermYears = Number.isFinite(input.originalTermYears) ? Math.max(0, input.originalTermYears) : 0;
  const originalRate = Number.isFinite(input.originalRate) ? Math.max(0, input.originalRate) : 0;
  const origTermMonths = originalTermYears * 12;
  const origPayment = calculateAmortizationPayment(loanAmount, originalRate, origTermMonths);
  const totalInterestLifetime = calculateTotalAmortizationInterest(loanAmount, originalRate, origTermMonths);
  const totalPaidLifetime = origPayment * origTermMonths;

  let monthsElapsed: number;
  if (input.entryMode === 'purchase') {
    monthsElapsed = (input.currentAge - input.purchaseAge) * 12;
  } else {
    monthsElapsed = origTermMonths - input.remainingTermMonths;
  }
  monthsElapsed = Math.max(0, Math.min(monthsElapsed, origTermMonths));

  const originalSchedule = simulateAmortizedPayoff({
    principalBalance: loanAmount,
    apr: originalRate,
    monthlyPayment: origPayment,
    maxMonths: origTermMonths,
  }).monthlyData;
  const elapsedRows = originalSchedule.slice(0, monthsElapsed);
  const first7YearRows = originalSchedule.slice(0, 84);
  const interestPaidSoFar = elapsedRows.reduce((sum, month) => sum + month.interest, 0);
  const elapsedPrincipalPaid = elapsedRows.reduce((sum, month) => sum + month.principal, 0);
  const scheduledBalanceAfterElapsed =
    elapsedRows.length > 0 ? elapsedRows[elapsedRows.length - 1].balance : loanAmount;
  const first7YearsInterest = first7YearRows.reduce((sum, month) => sum + month.interest, 0);
  const first7YearsTotal = first7YearRows.reduce((sum, month) => sum + month.payment, 0);

  // Current interest vs principal split
  const currentBalance = input.entryMode === 'purchase' ? scheduledBalanceAfterElapsed : input.currentBalance;
  const currentRate = input.entryMode === 'purchase'
    ? originalRate
    : Number.isFinite(input.currentRate)
    ? Math.max(0, input.currentRate)
    : input.originalRate;
  const currentMonthlyInterest = currentBalance * (currentRate / 12);
  const currentPayment = input.entryMode === 'purchase'
    ? origPayment
    : Number.isFinite(input.currentMonthlyPayment)
    ? Math.max(0, input.currentMonthlyPayment)
    : origPayment;
  const interestPercent = currentPayment > 0 ? (currentMonthlyInterest / currentPayment) * 100 : 0;
  const interestPercentOfPayment = Math.max(0, Math.min(100, interestPercent));

  const warnings: MortgageWarning[] = [];
  if (downPayment > originalCost && originalCost > 0) {
    warnings.push({
      type: 'down-payment-exceeds-purchase-price',
      severity: 'warning',
      message: 'The down payment is higher than the purchase price. The financed amount is shown as zero, so review these purchase inputs before relying on the mortgage totals.',
    });
  }
  if (input.entryMode !== 'purchase' && currentBalance > loanAmount + 0.01) {
    warnings.push({
      type: 'current-balance-exceeds-original-loan',
      severity: 'warning',
      message: 'The current balance is higher than the original financed amount. This can happen after cash-out refinancing, rolled fees, or an input mismatch, so equity and interest history should be treated as an estimate.',
    });
  }
  if (currentBalance > 0.01 && currentPayment <= currentMonthlyInterest) {
    warnings.push({
      type: 'payment-below-interest',
      severity: 'critical',
      message: 'The current monthly payment does not cover the estimated monthly interest, so this mortgage will not amortize without a higher payment or principal reduction.',
    });
  }

  const principalPaidSoFar = input.entryMode === 'purchase'
    ? elapsedPrincipalPaid
    : loanAmount - currentBalance;
  const interestRemaining = totalInterestLifetime - interestPaidSoFar;
  const equityPercent = originalCost > 0 ? ((downPayment + Math.max(0, principalPaidSoFar)) / originalCost) * 100 : 0;

  // Refinance penalty estimate: each refinance resets ~2 years of amortization front-loading
  const refinancePenalty = input.hasRefinanced
    ? input.refinanceCount * loanAmount * originalRate * 0.15 // ~15% of first-year interest per refi
    : 0;

  return {
    originalPayment: origPayment,
    originalLoanAmount: loanAmount,
    totalInterestLifetime,
    totalPaidLifetime,
    interestPaidSoFar,
    interestRemaining: Math.max(0, interestRemaining),
    principalPaidSoFar: Math.max(0, principalPaidSoFar),
    monthsElapsed,
    equityPercent: Math.max(0, Math.min(100, equityPercent)),
    interestPercentOfPayment,
    principalPercentOfPayment: Math.max(0, 100 - interestPercentOfPayment),
    first7YearsInterestPercent: first7YearsTotal > 0 ? (first7YearsInterest / first7YearsTotal) * 100 : 0,
    refinancePenalty,
    warnings,
  };
}

// ─── Mortgage History Analysis ───────────────────────────────────────

export interface MortgageHistoryResult {
  yearsInMortgage: number;
  totalPaidSoFar: number;
  principalPaidSoFar: number;
  interestPaidSoFar: number;
  equityPercent: number;
  interestPercentOfPayments: number;
  principalPercentOfPayments: number;
  refinancePenalty: number;
}

export function analyzeMortgageHistory(input: MortgageAnalysisInput): MortgageHistoryResult {
  const analysis = calculateMortgageAnalysis(input);
  const yearsInMortgage = analysis.monthsElapsed / 12;
  const currentPayment = Number.isFinite(input.currentMonthlyPayment)
    ? Math.max(0, input.currentMonthlyPayment)
    : analysis.originalPayment;
  const totalPaidSoFar = analysis.monthsElapsed * currentPayment;

  return {
    yearsInMortgage,
    totalPaidSoFar,
    principalPaidSoFar: analysis.principalPaidSoFar,
    interestPaidSoFar: analysis.interestPaidSoFar,
    equityPercent: analysis.equityPercent,
    interestPercentOfPayments: analysis.interestPercentOfPayment,
    principalPercentOfPayments: analysis.principalPercentOfPayment,
    refinancePenalty: analysis.refinancePenalty,
  };
}

// ─── Amortization Breakdown by Year ──────────────────────────────────

export interface AmortizationYearBreakdown {
  year: number;
  interestPaid: number;
  principalPaid: number;
  remainingBalance: number;
}

export function generateAmortizationBreakdown(
  principal: number,
  rate: number,
  termYears: number
): AmortizationYearBreakdown[] {
  const termMonths = termYears * 12;
  const payment = calculateAmortizationPayment(principal, rate, termMonths);
  const projection = simulateAmortizedPayoff({
    principalBalance: principal,
    apr: rate,
    monthlyPayment: payment,
    maxMonths: termMonths,
  });
  const results: AmortizationYearBreakdown[] = [];

  for (let start = 0; start < projection.monthlyData.length; start += 12) {
    const months = projection.monthlyData.slice(start, start + 12);
    const yearInterest = months.reduce((sum, month) => sum + month.interest, 0);
    const yearPrincipal = months.reduce((sum, month) => sum + month.principal, 0);
    const finalMonth = months[months.length - 1];

    results.push({
      year: Math.floor(start / 12) + 1,
      interestPaid: yearInterest,
      principalPaid: yearPrincipal,
      remainingBalance: finalMonth?.balance ?? 0,
    });
  }

  return results;
}

// ─── Strategy Comparison ─────────────────────────────────────────────

interface MortgagePaymentProjection {
  months: number;
  totalInterest: number;
  isPayoffPossible: boolean;
  failureReason?: PayoffFailureReason;
}

interface MortgageStrategyProjection extends MortgagePaymentProjection {
  saved: number;
  monthsSaved: number;
}

export interface StrategyComparisonResult {
  standard: MortgagePaymentProjection & { payoffDate: string };
  biweekly: MortgageStrategyProjection;
  extraPayment: MortgageStrategyProjection & { extraAmount: number };
  velocity: MortgageStrategyProjection & { chunkSize: number };
}

function simulateMortgagePaymentPlan(
  balance: number,
  apr: number,
  monthlyPayment: number,
  maxMonths: number
): MortgagePaymentProjection {
  const projection = simulateAmortizedPayoff({
    principalBalance: balance,
    apr,
    monthlyPayment,
    maxMonths,
  });

  return {
    months: projection.payoffMonths,
    totalInterest: projection.totalInterest,
    isPayoffPossible: projection.isPayoffPossible,
    failureReason: projection.failureReason,
  };
}

export function compareMortgageStrategies(
  input: MortgageAnalysisInput,
  cashFlow: number,
  loc: LOCDetails
): StrategyComparisonResult {
  const originalTermMonths = (Number.isFinite(input.originalTermYears) ? Math.max(0, input.originalTermYears) : 0) * 12;
  const purchaseAnalysis = input.entryMode === 'purchase' ? calculateMortgageAnalysis(input) : null;
  const balance = purchaseAnalysis
    ? Math.max(0, purchaseAnalysis.originalLoanAmount - purchaseAnalysis.principalPaidSoFar)
    : Number.isFinite(input.currentBalance)
      ? Math.max(0, input.currentBalance)
      : 0;
  const rate = purchaseAnalysis
    ? Number.isFinite(input.originalRate)
      ? Math.max(0, input.originalRate)
      : 0
    : Number.isFinite(input.currentRate)
      ? Math.max(0, input.currentRate)
      : Number.isFinite(input.originalRate)
        ? Math.max(0, input.originalRate)
        : 0;
  const remainingMonths = purchaseAnalysis
    ? Math.max(0, originalTermMonths - purchaseAnalysis.monthsElapsed)
    : input.remainingTermMonths || originalTermMonths;
  const payment = purchaseAnalysis
    ? purchaseAnalysis.originalPayment
    : Number.isFinite(input.currentMonthlyPayment)
      ? Math.max(0, input.currentMonthlyPayment)
      : calculateAmortizationPayment(balance, rate, remainingMonths);
  const payoffHorizonMonths = Math.max(remainingMonths * 4, input.originalTermYears * 12, 1200);

  const standard = simulateMortgagePaymentPlan(balance, rate, payment, payoffHorizonMonths);
  const standardMonths = standard.isPayoffPossible ? standard.months : remainingMonths;
  const standardDate = standard.isPayoffPossible ? formatDate(standard.months) : 'Not projected';

  if (!standard.isPayoffPossible) {
    const invalidProjection: MortgagePaymentProjection = {
      months: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: standard.failureReason,
    };

    return {
      standard: { ...standard, payoffDate: standardDate },
      biweekly: {
        ...invalidProjection,
        saved: 0,
        monthsSaved: 0,
      },
      extraPayment: {
        ...invalidProjection,
        saved: 0,
        monthsSaved: 0,
        extraAmount: 0,
      },
      velocity: {
        ...invalidProjection,
        saved: 0,
        monthsSaved: 0,
        chunkSize: 0,
      },
    };
  }

  const calculateSavings = (projection: MortgagePaymentProjection) => ({
    saved: standard.isPayoffPossible && projection.isPayoffPossible
      ? Math.max(0, standard.totalInterest - projection.totalInterest)
      : 0,
    monthsSaved: standard.isPayoffPossible && projection.isPayoffPossible
      ? Math.max(0, standardMonths - projection.months)
      : 0,
  });

  const extraMonthlyFromBiweekly = cashFlow > 0 ? Math.min(payment / 12, cashFlow) : 0;
  const biweekly = simulateMortgagePaymentPlan(
    balance,
    rate,
    payment + extraMonthlyFromBiweekly,
    payoffHorizonMonths
  );

  const extraAmt = cashFlow > 0
    ? Math.min(cashFlow, Math.max(cashFlow * 0.5, 200), 1000)
    : 0;
  const extraPayment = simulateMortgagePaymentPlan(
    balance,
    rate,
    payment + extraAmt,
    payoffHorizonMonths
  );

  const locNeedsSetup = loc.limit <= 0;
  const locOverLimit = !locNeedsSetup && loc.balance > loc.limit;
  const locNoCapacity = !locNeedsSetup && loc.balance === loc.limit;
  const locCashFlowPaydown = Math.max(0, cashFlow - payment);
  const chunkSize = locNeedsSetup || locOverLimit || locNoCapacity || cashFlow <= 0 || locCashFlowPaydown <= 0
    ? 0
    : Math.min(loc.limit * 0.4, locCashFlowPaydown * 3, balance * 0.1);

  let velocity: MortgagePaymentProjection;
  if (locNeedsSetup) {
    velocity = {
      months: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'loc-setup',
    };
  } else if (locOverLimit) {
    velocity = {
      months: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
    };
  } else if (locNoCapacity) {
    velocity = {
      months: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'loc-no-capacity',
    };
  } else if (cashFlow <= 0) {
    velocity = {
      months: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'negative-cashflow',
    };
  } else if (locCashFlowPaydown <= 0) {
    velocity = {
      months: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'cashflow-below-minimums',
    };
  } else {
    const moneyLoopVelocity = simulateMoneyLoopPayoff({
      principalBalance: balance,
      debtApr: rate,
      debtPayment: payment,
      loc,
      chunkAmount: chunkSize,
      cashFlowPaydown: locCashFlowPaydown,
      locDepositAmount: cashFlow,
      locExpenseAmount: payment,
      maxMonths: payoffHorizonMonths,
      initialMonthsSinceChunk: 999,
    });
    velocity = {
      months: moneyLoopVelocity.payoffMonths,
      totalInterest: moneyLoopVelocity.totalInterest,
      isPayoffPossible: moneyLoopVelocity.isPayoffPossible,
      failureReason: moneyLoopVelocity.failureReason,
    };
  }

  return {
    standard: { ...standard, payoffDate: standardDate },
    biweekly: {
      ...biweekly,
      ...calculateSavings(biweekly),
    },
    extraPayment: {
      ...extraPayment,
      ...calculateSavings(extraPayment),
      extraAmount: extraAmt,
    },
    velocity: {
      ...velocity,
      ...calculateSavings(velocity),
      chunkSize,
    },
  };
}

export interface BiweeklyResult {
  totalMonths: number;
  totalInterest: number;
  monthsSavedVsMonthly: number;
  interestSavedVsMonthly: number;
}

export function simulateBiweeklyPayments(
  balance: number,
  apr: number,
  monthlyPayment: number,
  termMonths: number
): BiweeklyResult {
  // Monthly equivalent for 26 half-payments per year: 13 full payments.
  const payoffHorizonMonths = Math.max(termMonths * 4, termMonths, 600);
  const monthlyProjection = simulateAmortizedPayoff({
    principalBalance: balance,
    apr,
    monthlyPayment,
    maxMonths: payoffHorizonMonths,
  });
  const biweeklyProjection = simulateAmortizedPayoff({
    principalBalance: balance,
    apr,
    monthlyPayment,
    extraPayment: monthlyPayment / 12,
    maxMonths: payoffHorizonMonths,
  });

  return {
    totalMonths: biweeklyProjection.payoffMonths,
    totalInterest: biweeklyProjection.totalInterest,
    monthsSavedVsMonthly: Math.max(0, monthlyProjection.payoffMonths - biweeklyProjection.payoffMonths),
    interestSavedVsMonthly: Math.max(0, monthlyProjection.totalInterest - biweeklyProjection.totalInterest),
  };
}

export interface StrategyComparison {
  monthly: { months: number; totalInterest: number };
  biweekly: { months: number; totalInterest: number };
  velocity: { months: number; totalInterest: number };
}

export function comparePaymentStrategies(
  balance: number,
  apr: number,
  monthlyPayment: number,
  termMonths: number,
  loc: LOCDetails | undefined,
  monthlyIncome: number,
  monthlyExpenses: number,
  chunkAmount: number
): StrategyComparison {
  const payoffHorizonMonths = Math.max(termMonths * 4, termMonths, 600);
  const monthlyProjection = simulateAmortizedPayoff({
    principalBalance: balance,
    apr,
    monthlyPayment,
    maxMonths: payoffHorizonMonths,
  });
  const biweekly = simulateBiweeklyPayments(balance, apr, monthlyPayment, termMonths);

  // Velocity simulation
  const velInputs: SimulationInputs = {
    monthlyIncome,
    monthlyExpenses,
    carLoan: { balance, apr, monthlyPayment },
    loc: loc ? { limit: loc.limit, apr: loc.apr, balance: loc.balance } : undefined,
    useVelocity: true,
    extraPayment: chunkAmount,
  };
  const velResult = simulateVelocity(velInputs);

  return {
    monthly: { months: monthlyProjection.payoffMonths, totalInterest: monthlyProjection.totalInterest },
    biweekly: { months: biweekly.totalMonths, totalInterest: biweekly.totalInterest },
    velocity: { months: velResult.payoffMonths, totalInterest: velResult.totalInterest },
  };
}

// ─── Formatting ──────────────────────────────────────────────────────

export function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(monthsFromNow: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${months} months`;
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years}y ${remainingMonths}m`;
}
