import {
  simulateMoneyLoopMonth,
  simulateMoneyLoopPayoff,
  type MoneyLoopMonthlyResult,
} from './money-loop';

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

export interface LOCDetails {
  limit: number;
  apr: number;         // decimal
  balance: number;
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
  | 'loc-overlimit';

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
  type: 'negative-cashflow' | 'cashflow-below-minimums' | 'loc-overutilization' | 'negative-amortization' | 'payment-too-low' | 'no-loc';
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

export function calculateDailyRate(apr: number): number {
  return apr / 365;
}

export function calculateCashFlow(income: number, expenses: number): number {
  return income - expenses;
}

/**
 * Calculate the standard amortization monthly payment.
 */
export function calculateAmortizationPayment(principal: number, apr: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return principal / termMonths;
  return principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

/**
 * Calculate total interest paid over the life of an amortized loan.
 */
export function calculateTotalAmortizationInterest(principal: number, apr: number, termMonths: number): number {
  const payment = calculateAmortizationPayment(principal, apr, termMonths);
  return Math.max(0, payment * termMonths - principal);
}

/**
 * Average Daily Balance interest calculation for LOC.
 * Models a month where income is deposited on day 1, then expenses are
 * drawn evenly over the remaining days.
 */
export function calculateADBInterest(
  startBalance: number,
  apr: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  daysInMonth: number = 30
): number {
  // Day 1: income deposited, reducing balance immediately
  const balanceAfterDeposit = startBalance - monthlyIncome;
  
  // Expenses drawn evenly over the month
  const dailyExpense = monthlyExpenses / daysInMonth;
  
  let totalDailyBalance = 0;
  for (let day = 0; day < daysInMonth; day++) {
    const dayBalance = balanceAfterDeposit + (dailyExpense * day);
    totalDailyBalance += Math.max(0, dayBalance); // can't go below 0 on LOC
  }
  
  const averageDailyBalance = totalDailyBalance / daysInMonth;
  const dailyRate = apr / 365;
  
  return averageDailyBalance * dailyRate * daysInMonth;
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
      if (utilization > 0.8) {
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
  const monthlyRate = inputs.carLoan.apr / 12;
  let balance = inputs.carLoan.balance;
  let totalInterest = 0;
  const monthlyData: MonthlyResult[] = [];
  let month = 0;
  const cashFlow = inputs.monthlyIncome - inputs.monthlyExpenses;
  const firstMonthInterest = balance * monthlyRate;

  if (balance > 0.01 && inputs.carLoan.monthlyPayment <= firstMonthInterest) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      monthlyData,
      isPayoffPossible: false,
      failureReason: 'payment-below-interest',
    };
  }

  while (balance > 0.01 && month < 600) {
    month++;
    const interest = balance * monthlyRate;
    const payment = Math.min(inputs.carLoan.monthlyPayment, balance + interest);
    const principal = payment - interest;

    if (principal <= 0) {
      // Negative amortization — balance grows
      balance += (interest - inputs.carLoan.monthlyPayment);
      totalInterest += interest;
      monthlyData.push({
        month,
        carBalance: balance,
        locBalance: 0,
        carInterest: interest,
        locInterest: 0,
        cashFlow: cashFlow - inputs.carLoan.monthlyPayment,
      });
      if (month >= 600) break;
      continue;
    }

    totalInterest += interest;
    balance = Math.max(0, balance - principal);

    monthlyData.push({
      month,
      carBalance: balance,
      locBalance: 0,
      carInterest: interest,
      locInterest: 0,
      cashFlow: cashFlow - inputs.carLoan.monthlyPayment,
    });
  }

  return { payoffMonths: month, totalInterest, monthlyData, isPayoffPossible: true };
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

  if (inputs.loc.limit <= 0 || inputs.loc.balance >= inputs.loc.limit) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      monthlyData: [],
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
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
  const monthlyRate = inputs.carLoan.apr / 12;
  let balance = inputs.carLoan.balance;
  let totalInterest = 0;
  const monthlyData: MonthlyResult[] = [];
  let month = 0;
  const cashFlow = inputs.monthlyIncome - inputs.monthlyExpenses;
  const extraPayment = Math.min(inputs.extraPayment, Math.max(0, cashFlow));
  const firstMonthInterest = balance * monthlyRate;

  if (balance > 0.01 && inputs.carLoan.monthlyPayment + extraPayment <= firstMonthInterest) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      monthlyData,
      isPayoffPossible: false,
      failureReason: 'payment-below-interest',
    };
  }

  while (balance > 0.01 && month < 600) {
    month++;
    const interest = balance * monthlyRate;
    const totalPayment = Math.min(inputs.carLoan.monthlyPayment + extraPayment, balance + interest);
    const principal = totalPayment - interest;

    totalInterest += interest;
    balance = Math.max(0, balance - Math.max(0, principal));

    monthlyData.push({
      month,
      carBalance: balance,
      locBalance: 0,
      carInterest: interest,
      locInterest: 0,
      cashFlow: cashFlow - inputs.carLoan.monthlyPayment - extraPayment,
    });
  }

  return { payoffMonths: month, totalInterest, monthlyData, isPayoffPossible: true };
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

  if (strategy === 'velocity' && loc && (loc.limit <= 0 || loc.balance >= loc.limit)) {
    return buildInvalidResult('loc-overlimit');
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
    failureReason: isPayoffPossible ? undefined : 'payment-below-interest',
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
  const monthlyRate = debt.apr / 12;
  let balance = debt.balance;
  let totalInterest = 0;
  let month = 0;

  while (balance > 0.01 && month < 600) {
    month++;
    const interest = balance * monthlyRate;
    const payment = Math.min(debt.monthlyPayment, balance + interest);
    const principal = payment - interest;

    if (principal <= 0) {
      balance += (interest - debt.monthlyPayment);
      totalInterest += interest;
      if (month >= 600) break;
      continue;
    }

    totalInterest += interest;
    balance = Math.max(0, balance - principal);
  }

  return { payoffMonths: month, totalInterest, id: debt.id, name: debt.name };
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

  // Simulate elapsed months
  const monthlyRate = originalRate / 12;
  let bal = loanAmount;
  let interestPaidSoFar = 0;
  let first7YearsInterest = 0;
  let first7YearsTotal = 0;
  for (let m = 0; m < Math.max(monthsElapsed, 84) && bal > 0.01; m++) {
    const interest = bal * monthlyRate;
    const principal = origPayment - interest;
    if (m < monthsElapsed) {
      interestPaidSoFar += interest;
    }
    if (m < 84) { // first 7 years
      first7YearsInterest += interest;
      first7YearsTotal += origPayment;
    }
    bal = Math.max(0, bal - Math.max(0, principal));
  }

  // Current interest vs principal split
  const currentBalance = input.entryMode === 'purchase' ? bal : input.currentBalance;
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

  const principalPaidSoFar = loanAmount - currentBalance;
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
  const monthlyRate = rate / 12;
  let bal = principal;
  const results: AmortizationYearBreakdown[] = [];

  for (let year = 1; year <= termYears && bal > 0.01; year++) {
    let yearInterest = 0;
    let yearPrincipal = 0;
    for (let m = 0; m < 12 && bal > 0.01; m++) {
      const interest = bal * monthlyRate;
      const princ = Math.min(payment - interest, bal);
      yearInterest += interest;
      yearPrincipal += princ;
      bal = Math.max(0, bal - princ);
    }
    results.push({
      year,
      interestPaid: yearInterest,
      principalPaid: yearPrincipal,
      remainingBalance: bal,
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
  if (balance <= 0.01) {
    return { months: 0, totalInterest: 0, isPayoffPossible: true };
  }

  const monthlyRate = apr / 12;
  const firstMonthInterest = balance * monthlyRate;
  if (monthlyPayment <= firstMonthInterest) {
    return {
      months: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'payment-below-interest',
    };
  }

  let currentBalance = balance;
  let totalInterest = 0;
  let months = 0;

  while (currentBalance > 0.01 && months < maxMonths) {
    months++;
    const interest = currentBalance * monthlyRate;
    const totalPayment = Math.min(monthlyPayment, currentBalance + interest);
    const principal = totalPayment - interest;
    if (principal <= 0) {
      return {
        months,
        totalInterest,
        isPayoffPossible: false,
        failureReason: 'payment-below-interest',
      };
    }
    totalInterest += interest;
    currentBalance = Math.max(0, currentBalance - principal);
  }

  return {
    months,
    totalInterest,
    isPayoffPossible: currentBalance <= 0.01,
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

  const locOverLimit = loc.limit <= 0 || loc.balance >= loc.limit;
  const locCashFlowPaydown = Math.max(0, cashFlow - payment);
  const chunkSize = locOverLimit || cashFlow <= 0 || locCashFlowPaydown <= 0
    ? 0
    : Math.min(loc.limit * 0.4, locCashFlowPaydown * 3, balance * 0.1);

  let velocity: MortgagePaymentProjection;
  if (locOverLimit) {
    velocity = {
      months: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
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
  // Bi-weekly = 26 half-payments per year = 13 full payments
  const biweeklyPayment = monthlyPayment / 2;
  const dailyRate = apr / 365;
  let bal = balance;
  let day = 0;
  const maxDays = termMonths * 31;

  while (bal > 0.01 && day < maxDays) {
    // Every 14 days, make a payment
    for (let d = 0; d < 14 && bal > 0.01; d++) {
      const interest = bal * dailyRate;
      bal += interest; // accrue daily (simplified)
      day++;
    }
    // Subtract accrued interest from balance tracking (already added above), apply payment
    bal = Math.max(0, bal - biweeklyPayment);
  }

  // Simplified: re-simulate as monthly equivalent (13 payments/year)
  // More accurate approach:
  const monthlyResult = calculateTotalAmortizationInterest(balance, apr, termMonths);
  const annualPaymentMonthly = monthlyPayment * 12;
  const annualPaymentBiweekly = monthlyPayment * 13; // 26 half-payments
  const extraAnnual = annualPaymentBiweekly - annualPaymentMonthly;

  // Simulate with extra payment each month
  let bal2 = balance;
  let totalInt2 = 0;
  let months2 = 0;
  const mr = apr / 12;
  const extraMonthly = extraAnnual / 12;

  while (bal2 > 0.01 && months2 < termMonths) {
    months2++;
    const interest = bal2 * mr;
    const payment = Math.min(monthlyPayment + extraMonthly, bal2 + interest);
    const principal = payment - interest;
    totalInt2 += interest;
    bal2 = Math.max(0, bal2 - Math.max(0, principal));
  }

  return {
    totalMonths: months2,
    totalInterest: totalInt2,
    monthsSavedVsMonthly: termMonths - months2,
    interestSavedVsMonthly: Math.max(0, monthlyResult - totalInt2),
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
  const monthlyInterest = calculateTotalAmortizationInterest(balance, apr, termMonths);
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
    monthly: { months: termMonths, totalInterest: monthlyInterest },
    biweekly: { months: biweekly.totalMonths, totalInterest: biweekly.totalInterest },
    velocity: { months: velResult.payoffMonths, totalInterest: velResult.totalInterest },
  };
}

// ─── Formatting ──────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

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
