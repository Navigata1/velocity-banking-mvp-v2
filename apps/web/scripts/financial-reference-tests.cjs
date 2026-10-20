/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const enginePath = path.join(repoRoot, 'packages', 'financial-engine', 'src', 'index.ts');
const fixturePath = path.join(repoRoot, 'packages', 'financial-engine', 'fixtures', 'anonymized-lender-scenarios.v1.json');

function loadEngine() {
  const output = ts.transpileModule(fs.readFileSync(enginePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const testModule = { exports: {} };
  const context = vm.createContext({ module: testModule, exports: testModule.exports });
  new vm.Script(output, { filename: enginePath }).runInContext(context);
  return testModule.exports;
}

function referenceAmortizedPayment({ principal, apr, termMonths }) {
  const monthlyRate = apr / 12;
  if (monthlyRate === 0) return principal / termMonths;
  const growth = (1 + monthlyRate) ** termMonths;
  return principal * ((monthlyRate * growth) / (growth - 1));
}

function referenceLOCMonth({ startBalance, apr, year, month, transactions }) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const changesByDay = new Map();
  for (const transaction of transactions) {
    const signedAmount = transaction.type === 'deposit' ? -transaction.amount : transaction.amount;
    changesByDay.set(transaction.day, (changesByDay.get(transaction.day) ?? 0) + signedAmount);
  }

  let balance = startBalance;
  let totalDailyBalance = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    balance = Math.max(0, balance + (changesByDay.get(day) ?? 0));
    totalDailyBalance += balance;
  }

  const interest = totalDailyBalance * (apr / 365);
  return {
    daysInMonth,
    averageDailyBalance: totalDailyBalance / daysInMonth,
    interest,
    endingBalance: balance + interest,
  };
}

function assertNear(actual, expected, label, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, received ${actual}`);
}

const engine = loadEngine();
const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
assert.equal(fixtures.version, 1);
assert.match(fixtures.provenance, /not lender quotes/i);

for (const scenario of fixtures.scenarios) {
  const fields = [
    'annualFee',
    'transactionFeePercent',
    'rateMode',
    'drawPeriodMonths',
    'repaymentPeriodMonths',
    'minimumDraw',
    'minimumPayment',
  ];
  const contract = engine.buildLenderTermsContract({
    ...scenario.lenderTerms,
    sources: Object.fromEntries(fields.map((field) => [field, 'lender-document'])),
  });
  assert.equal(contract.confidence, 'complete', `${scenario.id} lender terms`);

  const referencePayment = referenceAmortizedPayment(scenario.amortizedLoan);
  const enginePayment = engine.calculateAmortizationPayment(
    scenario.amortizedLoan.principal,
    scenario.amortizedLoan.apr,
    scenario.amortizedLoan.termMonths
  );
  assertNear(enginePayment, referencePayment, `${scenario.id} amortized payment`);

  const referenceAccrual = referenceLOCMonth(scenario.locMonth);
  const engineAccrual = engine.calculateLOCInterestAccrual({
    startBalance: scenario.locMonth.startBalance,
    apr: scenario.locMonth.apr,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    calendar: {
      year: scenario.locMonth.year,
      month: scenario.locMonth.month,
      transactions: scenario.locMonth.transactions,
    },
  });
  assert.equal(engineAccrual.daysInMonth, referenceAccrual.daysInMonth, `${scenario.id} calendar days`);
  assertNear(engineAccrual.averageDailyBalance, referenceAccrual.averageDailyBalance, `${scenario.id} ADB`);
  assertNear(engineAccrual.interest, referenceAccrual.interest, `${scenario.id} LOC interest`);
  assertNear(engineAccrual.endingBalance, referenceAccrual.endingBalance, `${scenario.id} ending balance`);
}

// With zero interest, any full-budget priority must clear the same total liability
// in ceil(total / budget) months, regardless of how the payment is split.
let directCases = 0;
for (let index = 1; index <= 25; index += 1) {
  const principal = 100 + index * 117;
  const locBalance = index * 43;
  const budget = 100 + index * 13;
  const expectedMonths = Math.ceil((principal + locBalance) / budget);
  for (const strategy of ['debt-first', 'snowball', 'avalanche']) {
    const projection = engine.simulateDirectRepayment({
      principalBalance: principal, debtApr: 0, debtPayment: index % 2 ? 25 : 0,
      loc: { limit: 10000, balance: locBalance, apr: 0 },
      monthlyBudget: budget, strategy,
    });
    assert.equal(projection.isPayoffPossible, true);
    assert.equal(projection.payoffMonths, expectedMonths);
    assert.equal(projection.totalInterest, 0);
    const last = projection.monthlyData.at(-1);
    assertNear(last.debtBalance + last.locBalance, 0, `${strategy} ending liabilities`);
    assertNear(last.cashBalance, expectedMonths * budget - principal - locBalance, `${strategy} retained cash`);
    directCases += 1;
  }
}

// An affordable first-month payoff has a closed-form interest bill: one loan
// month plus 30 actual/365 LOC days, paid from a single shared budget.
for (const strategy of ['debt-first', 'snowball', 'avalanche']) {
  const expectedInterest = 1250 * 0.12 / 12 + 450 * 0.24 * 30 / 365;
  const projection = engine.simulateDirectRepayment({
    principalBalance: 1250, debtApr: 0.12, debtPayment: 100,
    loc: { limit: 2000, balance: 450, apr: 0.24 }, monthlyBudget: 2000, strategy,
  });
  assert.equal(projection.payoffMonths, 1);
  assertNear(projection.totalInterest, expectedInterest, `${strategy} closed-form interest`);
  assertNear(projection.monthlyData[0].cashBalance, 300 - expectedInterest, `${strategy} closed-form cash`);
  directCases += 1;
}

let boundaryCases = 0;
for (let index = 1; index <= 25; index += 1) {
  const principal = index * 120;
  const locBalance = index * 30;
  const budget = 425;
  const expectedMonths = Math.ceil((principal + locBalance) / budget);
  const result = engine.simulateMoneyLoopPayoff({
    principalBalance: principal, debtApr: 0, debtPayment: budget,
    loc: { limit: 10000, balance: locBalance, apr: 0 },
    chunkAmount: 100, cashFlowPaydown: 0,
    locDepositAmount: budget + 200, locExpenseAmount: budget + 200,
    initialMonthsSinceChunk: 999,
  });
  assert.equal(result.isPayoffPossible, true);
  assert.equal(result.payoffMonths, expectedMonths);
  assert.ok(result.monthlyData.every(row => !row.events.some(event => event.type === 'loc-chunk-draw')));
  for (const row of result.monthlyData) {
    assertNear(principal + locBalance - row.month * budget + row.cashBalance,
      row.debtBalance + row.locBalance, `zero-recovery conservation ${index}/${row.month}`);
  }
  assertNear(result.monthlyData.at(-1).cashBalance, expectedMonths * budget - principal - locBalance, 'closed-form final reserve');
  boundaryCases += 1;
}
console.log(`Independent financial reference lane passed ${fixtures.scenarios.length} anonymized scenarios, ${directCases} closed-form comparison cases and ${boundaryCases} zero-recovery conservation cases.`);
