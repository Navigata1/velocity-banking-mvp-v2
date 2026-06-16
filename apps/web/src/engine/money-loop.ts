export interface MoneyLoopLOC {
  limit: number;
  apr: number;
  balance: number;
}

export type MoneyLoopFailureReason = 'payment-below-interest' | 'negative-cashflow' | 'loc-overlimit';

export type MoneyLoopEventType =
  | 'debt-interest'
  | 'debt-payment'
  | 'income-to-loc'
  | 'expenses-from-loc'
  | 'loc-chunk-draw'
  | 'loc-interest'
  | 'loc-cashflow-paydown';

export interface MoneyLoopEvent {
  type: MoneyLoopEventType;
  label: string;
  amount: number;
  balanceAfter: number;
  note: string;
}

export interface MoneyLoopMonthlyResult {
  month: number;
  debtBalance: number;
  locBalance: number;
  debtInterest: number;
  locInterest: number;
  cashFlowPaydown: number;
  events: MoneyLoopEvent[];
}

export interface MoneyLoopPayoffInputs {
  principalBalance: number;
  debtApr: number;
  debtPayment: number;
  loc: MoneyLoopLOC;
  chunkAmount: number;
  cashFlowPaydown: number;
  locDepositAmount: number;
  locExpenseAmount: number;
  maxMonths?: number;
  initialMonthsSinceChunk?: number;
}

export interface MoneyLoopMonthInputs {
  month: number;
  debtBalance: number;
  debtApr: number;
  debtPayment: number;
  loc: MoneyLoopLOC;
  locBalance: number;
  chunkAmount: number;
  cashFlowPaydown: number;
  locDepositAmount: number;
  locExpenseAmount: number;
  monthsSinceChunk: number;
}

export interface MoneyLoopMonthResult extends MoneyLoopMonthlyResult {
  debtPayment: number;
  debtPrincipalPaid: number;
  monthsSinceChunk: number;
  didChunk: boolean;
}

export interface MoneyLoopPayoffResult {
  payoffMonths: number;
  totalInterest: number;
  debtInterestPaid: number;
  locInterestPaid: number;
  monthlyData: MoneyLoopMonthlyResult[];
  isPayoffPossible: boolean;
  failureReason?: MoneyLoopFailureReason;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function calculateAverageDailyBalanceInterest(
  startBalance: number,
  apr: number,
  depositAmount: number,
  expenseAmount: number,
  daysInMonth = 30
): number {
  const balanceAfterDeposit = startBalance - depositAmount;
  const dailyExpense = expenseAmount / daysInMonth;

  let totalDailyBalance = 0;
  for (let day = 0; day < daysInMonth; day++) {
    const dayBalance = balanceAfterDeposit + dailyExpense * day;
    totalDailyBalance += Math.max(0, dayBalance);
  }

  const averageDailyBalance = totalDailyBalance / daysInMonth;
  return averageDailyBalance * (apr / 365) * daysInMonth;
}

export function simulateMoneyLoopMonth(inputs: MoneyLoopMonthInputs): MoneyLoopMonthResult {
  const chunkAmount = Math.max(0, inputs.chunkAmount);
  const events: MoneyLoopEvent[] = [];
  let debtBalance = inputs.debtBalance;
  let locBalance = inputs.locBalance;
  let monthsSinceChunk = inputs.monthsSinceChunk + 1;
  let didChunk = false;
  const locAvailable = Math.max(0, inputs.loc.limit - locBalance);
  const effectiveChunkAmount = Math.min(chunkAmount, Math.max(0, inputs.debtBalance), locAvailable);
  const chunkRecoveryMonths = effectiveChunkAmount > 0 && inputs.cashFlowPaydown > 0
    ? Math.ceil(effectiveChunkAmount / inputs.cashFlowPaydown)
    : 999;

  const debtInterest = debtBalance * inputs.debtApr / 12;
  const debtPayment = Math.min(inputs.debtPayment, debtBalance + debtInterest);
  const debtPrincipal = debtPayment - debtInterest;
  const debtPrincipalPaid = Math.max(0, debtPrincipal);

  events.push({
    type: 'debt-interest',
    label: 'Debt interest posts',
    amount: debtInterest,
    balanceAfter: debtBalance + debtInterest,
    note: 'Monthly amortized-loan interest estimated from the current balance and APR.',
  });

  const canChunk =
    effectiveChunkAmount > 0 &&
    monthsSinceChunk >= chunkRecoveryMonths &&
    debtBalance > effectiveChunkAmount * 0.1;

  if (canChunk) {
    locBalance += effectiveChunkAmount;
    debtBalance = Math.max(0, debtBalance - effectiveChunkAmount);
    monthsSinceChunk = 0;
    didChunk = true;
    events.push({
      type: 'loc-chunk-draw',
      label: 'LOC chunk targets principal',
      amount: effectiveChunkAmount,
      balanceAfter: locBalance,
      note: 'Chunk draw increases LOC balance and immediately reduces the active debt principal.',
    });
  }

  debtBalance = Math.max(0, debtBalance - debtPrincipalPaid);
  events.push({
    type: 'debt-payment',
    label: 'Debt payment applies',
    amount: debtPayment,
    balanceAfter: debtBalance,
    note: `${formatCurrency(debtPrincipalPaid)} of this payment is estimated principal after interest.`,
  });

  events.push({
    type: 'income-to-loc',
    label: 'Income enters LOC',
    amount: inputs.locDepositAmount,
    balanceAfter: Math.max(0, locBalance - inputs.locDepositAmount),
    note: 'Income is modeled as entering the LOC first, lowering the average daily balance.',
  });

  events.push({
    type: 'expenses-from-loc',
    label: 'Expenses leave LOC',
    amount: inputs.locExpenseAmount,
    balanceAfter: Math.max(0, locBalance - inputs.locDepositAmount + inputs.locExpenseAmount),
    note: 'Expenses are modeled as flowing back out across the month.',
  });

  const locInterest = calculateAverageDailyBalanceInterest(
    locBalance,
    inputs.loc.apr,
    inputs.locDepositAmount,
    inputs.locExpenseAmount
  );
  events.push({
    type: 'loc-interest',
    label: 'LOC interest posts',
    amount: locInterest,
    balanceAfter: locBalance + locInterest,
    note: 'LOC interest uses the average daily balance estimate for this month.',
  });

  locBalance = Math.max(0, locBalance - inputs.cashFlowPaydown + locInterest);
  events.push({
    type: 'loc-cashflow-paydown',
    label: 'Cash flow pays down LOC',
    amount: inputs.cashFlowPaydown,
    balanceAfter: locBalance,
    note: 'Positive cash flow is applied after expenses to pull the LOC balance back down.',
  });

  return {
    month: inputs.month,
    debtBalance,
    locBalance,
    debtInterest,
    locInterest,
    cashFlowPaydown: inputs.cashFlowPaydown,
    events,
    debtPayment,
    debtPrincipalPaid,
    monthsSinceChunk,
    didChunk,
  };
}

export function simulateMoneyLoopPayoff(inputs: MoneyLoopPayoffInputs): MoneyLoopPayoffResult {
  const maxMonths = inputs.maxMonths ?? 600;
  const chunkAmount = Math.max(0, inputs.chunkAmount);
  const monthlyData: MoneyLoopMonthlyResult[] = [];

  if (inputs.cashFlowPaydown <= 0) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      debtInterestPaid: 0,
      locInterestPaid: 0,
      monthlyData,
      isPayoffPossible: false,
      failureReason: 'negative-cashflow',
    };
  }

  if (inputs.loc.limit <= 0 || inputs.loc.balance >= inputs.loc.limit) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      debtInterestPaid: 0,
      locInterestPaid: 0,
      monthlyData,
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
    };
  }

  const firstMonthInterest = inputs.principalBalance * inputs.debtApr / 12;
  if (inputs.principalBalance > 0.01 && inputs.debtPayment <= firstMonthInterest) {
    return {
      payoffMonths: 0,
      totalInterest: 0,
      debtInterestPaid: 0,
      locInterestPaid: 0,
      monthlyData,
      isPayoffPossible: false,
      failureReason: 'payment-below-interest',
    };
  }

  let debtBalance = inputs.principalBalance;
  let locBalance = inputs.loc.balance;
  let debtInterestPaid = 0;
  let locInterestPaid = 0;
  let month = 0;
  let monthsSinceChunk = inputs.initialMonthsSinceChunk ?? 0;

  while ((debtBalance > 0.01 || locBalance > 0.01) && month < maxMonths) {
    month++;
    const monthResult = simulateMoneyLoopMonth({
      month,
      debtBalance,
      debtApr: inputs.debtApr,
      debtPayment: inputs.debtPayment,
      loc: inputs.loc,
      locBalance,
      chunkAmount,
      cashFlowPaydown: inputs.cashFlowPaydown,
      locDepositAmount: inputs.locDepositAmount,
      locExpenseAmount: inputs.locExpenseAmount,
      monthsSinceChunk,
    });
    debtBalance = monthResult.debtBalance;
    locBalance = monthResult.locBalance;
    monthsSinceChunk = monthResult.monthsSinceChunk;
    debtInterestPaid += monthResult.debtInterest;
    locInterestPaid += monthResult.locInterest;
    monthlyData.push(monthResult);
  }

  const isPayoffPossible = debtBalance <= 0.01 && locBalance <= 0.01;

  return {
    payoffMonths: month,
    totalInterest: debtInterestPaid + locInterestPaid,
    debtInterestPaid,
    locInterestPaid,
    monthlyData,
    isPayoffPossible,
    failureReason: isPayoffPossible ? undefined : 'payment-below-interest',
  };
}
