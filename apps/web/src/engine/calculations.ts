export interface LoanDetails {
  balance: number;
  apr: number;
  monthlyPayment: number;
}

export interface LOCDetails {
  limit: number;
  apr: number;
  balance: number;
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
}

export function calculateMonthlyRate(apr: number): number {
  return apr / 100 / 12;
}

export function calculateDailyRate(apr: number): number {
  return apr / 100 / 365;
}

export function calculateCashFlow(income: number, expenses: number): number {
  return income - expenses;
}

export function simulateBaseline(inputs: SimulationInputs): { payoffMonths: number; totalInterest: number; monthlyData: MonthlyResult[] } {
  const monthlyRate = calculateMonthlyRate(inputs.carLoan.apr);
  let balance = inputs.carLoan.balance;
  let totalInterest = 0;
  const monthlyData: MonthlyResult[] = [];
  let month = 0;

  while (balance > 0 && month < 360) {
    month++;
    const interest = balance * monthlyRate;
    const principal = Math.min(inputs.carLoan.monthlyPayment - interest, balance);
    
    totalInterest += interest;
    balance = Math.max(0, balance - principal);

    monthlyData.push({
      month,
      carBalance: balance,
      locBalance: 0,
      carInterest: interest,
      locInterest: 0,
      cashFlow: inputs.monthlyIncome - inputs.monthlyExpenses - inputs.carLoan.monthlyPayment,
    });
  }

  return { payoffMonths: month, totalInterest, monthlyData };
}

export function simulateVelocity(inputs: SimulationInputs): { payoffMonths: number; totalInterest: number; monthlyData: MonthlyResult[] } {
  const carMonthlyRate = calculateMonthlyRate(inputs.carLoan.apr);
  const locMonthlyRate = inputs.loc ? calculateMonthlyRate(inputs.loc.apr) : 0;
  
  let carBalance = inputs.carLoan.balance;
  let locBalance = inputs.loc?.balance || 0;
  let totalCarInterest = 0;
  let totalLocInterest = 0;
  const monthlyData: MonthlyResult[] = [];
  let month = 0;

  const cashFlow = calculateCashFlow(inputs.monthlyIncome, inputs.monthlyExpenses);
  const chunkAmount = cashFlow + inputs.extraPayment;

  while (carBalance > 0 && month < 360) {
    month++;
    
    const carInterest = carBalance * carMonthlyRate;
    let carPrincipal = inputs.carLoan.monthlyPayment - carInterest;
    
    if (inputs.loc && chunkAmount > 0) {
      locBalance += chunkAmount;
      carPrincipal += chunkAmount;
    }
    
    totalCarInterest += carInterest;
    carBalance = Math.max(0, carBalance - carPrincipal);
    
    if (inputs.loc) {
      const locInterest = locBalance * locMonthlyRate;
      totalLocInterest += locInterest;
      locBalance = Math.max(0, locBalance - cashFlow + locInterest);
    }

    monthlyData.push({
      month,
      carBalance,
      locBalance,
      carInterest,
      locInterest: inputs.loc ? locBalance * locMonthlyRate : 0,
      cashFlow,
    });
  }

  return { 
    payoffMonths: month, 
    totalInterest: totalCarInterest + totalLocInterest, 
    monthlyData 
  };
}

export function runSimulation(inputs: SimulationInputs): SimulationResult {
  const baseline = simulateBaseline(inputs);
  const velocity = simulateVelocity(inputs);

  return {
    baseline,
    velocity: {
      ...velocity,
      interestSaved: baseline.totalInterest - velocity.totalInterest,
      monthsSaved: baseline.payoffMonths - velocity.payoffMonths,
    },
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(monthsFromNow: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
