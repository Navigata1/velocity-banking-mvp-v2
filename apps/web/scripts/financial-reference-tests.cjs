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

console.log(`Independent financial reference lane passed ${fixtures.scenarios.length} anonymized scenarios.`);
