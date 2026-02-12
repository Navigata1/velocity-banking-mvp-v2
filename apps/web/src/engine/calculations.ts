/**
 * InterestShield Velocity Banking Calculation Engine
 * 
 * Truth-first math. All results are estimates based on user inputs.
 * Not financial advice.
 * 
 * Key concepts from velocity banking methodology:
 * - Amortized loans front-load interest (85-90% of early payments = interest)
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

export interface MonthlyResult {
  month: number;
  carBalance: number;
  locBalance: number;
  carInterest: number;
  locInterest: number;
  cashFlow: number;
}

export interface SimulationResult {
  baseline: {
    payoffMonths: number;
    totalInterest: number;
    monthlyData: MonthlyResult[];
  };
  velocity: {
    payoffMonths: number;
    totalInterest: number;
    monthlyData: MonthlyResult[];
    interestSaved: number;
    monthsSaved: number;
  };
  warnings: Warning[];
}

export interface Warning {
  type: 'negative-cashflow' | 'loc-overutilization' | 'negative-amortization' | 'payment-too-low' | 'no-loc';
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface MultiDebtResult {
  strategy: 'velocity' | 'snowball' | 'avalanche';
  debts: DebtPayoffResult[];
  totalInterestPaid: number;
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
  } else {
    warnings.push({
      type: 'no-loc',
      severity: 'info',
      message: 'No line of credit set up. Velocity banking works best with a LOC or HELOC to cycle income through.',
    });
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

export function simulateBaseline(inputs: SimulationInputs): {
  payoffMonths: number;
  totalInterest: number;
  monthlyData: MonthlyResult[];
} {
  const monthlyRate = inputs.carLoan.apr / 12;
  let balance = inputs.carLoan.balance;
  let totalInterest = 0;
  const monthlyData: MonthlyResult[] = [];
  let month = 0;
  const cashFlow = inputs.monthlyIncome - inputs.monthlyExpenses;

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

  return { payoffMonths: month, totalInterest, monthlyData };
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
export function simulateVelocity(inputs: SimulationInputs): {
  payoffMonths: number;
  totalInterest: number;
  monthlyData: MonthlyResult[];
} {
  if (!inputs.loc) {
    // Without LOC, velocity = baseline + extra payments
    return simulateWithExtraPayments(inputs);
  }

  const carMonthlyRate = inputs.carLoan.apr / 12;
  const cashFlow = inputs.monthlyIncome - inputs.monthlyExpenses;
  const chunkAmount = inputs.extraPayment > 0 ? inputs.extraPayment : Math.min(cashFlow * 3, inputs.loc.limit * 0.4);

  let carBalance = inputs.carLoan.balance;
  let locBalance = inputs.loc.balance;
  let totalCarInterest = 0;
  let totalLocInterest = 0;
  const monthlyData: MonthlyResult[] = [];
  let month = 0;

  // LOC recovery months counter — how many months of cash flow to pay off chunk
  let monthsSinceLastChunk = 0;
  const monthsToRecoverChunk = Math.ceil(chunkAmount / Math.max(1, cashFlow));

  while (carBalance > 0.01 && month < 600) {
    month++;
    monthsSinceLastChunk++;

    // 1. Car loan: standard amortization payment
    const carInterest = carBalance * carMonthlyRate;
    let carPayment = Math.min(inputs.carLoan.monthlyPayment, carBalance + carInterest);
    let carPrincipal = carPayment - carInterest;

    // 2. Check if we can deploy a chunk
    const locAvailable = inputs.loc.limit - locBalance;
    const canChunk = locAvailable >= chunkAmount && monthsSinceLastChunk >= monthsToRecoverChunk && carBalance > chunkAmount * 0.1;

    if (canChunk) {
      // Deploy chunk: LOC balance increases, car balance decreases
      locBalance += chunkAmount;
      carBalance = Math.max(0, carBalance - chunkAmount);
      monthsSinceLastChunk = 0;
    }

    // 3. Apply normal car payment
    totalCarInterest += carInterest;
    carBalance = Math.max(0, carBalance - Math.max(0, carPrincipal));

    // 4. LOC: income cycling reduces balance via ADB
    // Income deposited → LOC balance drops → expenses drawn over month
    const locInterest = calculateADBInterest(
      locBalance,
      inputs.loc.apr,
      inputs.monthlyIncome,
      inputs.monthlyExpenses
    );
    totalLocInterest += locInterest;

    // 5. LOC balance: reduced by cash flow, increased by LOC interest
    locBalance = Math.max(0, locBalance - cashFlow + locInterest);

    monthlyData.push({
      month,
      carBalance,
      locBalance,
      carInterest,
      locInterest,
      cashFlow,
    });
  }

  return {
    payoffMonths: month,
    totalInterest: totalCarInterest + totalLocInterest,
    monthlyData,
  };
}

function simulateWithExtraPayments(inputs: SimulationInputs): {
  payoffMonths: number;
  totalInterest: number;
  monthlyData: MonthlyResult[];
} {
  const monthlyRate = inputs.carLoan.apr / 12;
  let balance = inputs.carLoan.balance;
  let totalInterest = 0;
  const monthlyData: MonthlyResult[] = [];
  let month = 0;
  const cashFlow = inputs.monthlyIncome - inputs.monthlyExpenses;
  const extraPayment = Math.min(inputs.extraPayment, Math.max(0, cashFlow));

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

  return { payoffMonths: month, totalInterest, monthlyData };
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
  let month = 0;
  let monthsSinceChunk = 999; // allow first chunk immediately
  const effectiveChunk = chunkAmount ?? Math.min(cashFlow * 3, (loc?.limit ?? 0) * 0.4);
  const chunkRecoveryMonths = cashFlow > 0 ? Math.ceil(effectiveChunk / cashFlow) : 999;

  while (month < 600) {
    const allPaidOff = sortedDebts.every(d => (balances.get(d.id) ?? 0) <= 0.01);
    if (allPaidOff) break;

    month++;
    monthsSinceChunk++;

    let freedPayments = 0;

    // Find the current focus debt (first unpaid in sorted order)
    const focusDebt = sortedDebts.find(d => (balances.get(d.id) ?? 0) > 0.01);

    // Velocity: deploy LOC chunk to focus debt
    if (strategy === 'velocity' && loc && focusDebt) {
      const locAvailable = loc.limit - locBalance;
      const focusBalance = balances.get(focusDebt.id) ?? 0;
      if (locAvailable >= effectiveChunk && monthsSinceChunk >= chunkRecoveryMonths && focusBalance > effectiveChunk * 0.1) {
        locBalance += effectiveChunk;
        balances.set(focusDebt.id, Math.max(0, focusBalance - effectiveChunk));
        monthsSinceChunk = 0;
      }
    }

    // Process each debt
    for (const d of debts) {
      const bal = balances.get(d.id) ?? 0;
      if (bal <= 0.01) {
        // Already paid off — freed payment goes to surplus
        freedPayments += d.monthlyPayment;
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
    if (strategy === 'velocity' && loc && locBalance > 0) {
      const locInterest = calculateADBInterest(locBalance, loc.apr, monthlyIncome, monthlyExpenses);
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

  const totalInterest = debtResults.reduce((s, d) => s + d.totalInterest, 0);
  const baselineTotal = debtResults.reduce((s, d) => s + d.baselineInterest, 0);
  const baselineMaxMonths = Math.max(...baselineResults.map(b => b.payoffMonths));
  const freedomDate = new Date();
  freedomDate.setMonth(freedomDate.getMonth() + month);

  return {
    strategy,
    debts: debtResults,
    totalInterestPaid: totalInterest,
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
  const warnings = generateWarnings(
    inputs.monthlyIncome,
    inputs.monthlyExpenses,
    inputs.loc,
  );

  return {
    baseline,
    velocity: {
      ...velocity,
      interestSaved: Math.max(0, baseline.totalInterest - velocity.totalInterest),
      monthsSaved: Math.max(0, baseline.payoffMonths - velocity.payoffMonths),
    },
    warnings,
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
