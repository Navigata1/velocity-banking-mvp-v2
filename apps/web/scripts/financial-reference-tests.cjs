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

// At zero APR, a capped mortgage cannot finish before its own payment schedule
// or before the full household budget can clear both liabilities.
let mortgageCases = 0;
for (let index = 1; index <= 25; index += 1) {
  const principal = 1200 + index * 47;
  const payment = 35 + index * 7;
  const budget = payment + 100 + index * 23;
  for (const cap of [0, 15 + index * 3]) {
    for (const locBalance of [0, index * 43]) {
      const expectedMonths = Math.max(Math.ceil(principal / (payment + cap)), Math.ceil((principal + locBalance) / budget));
      const result = engine.simulateDirectRepayment({
        principalBalance: principal, debtApr: 0, debtPayment: payment,
        loc: { limit: 10000, balance: locBalance, apr: 0 },
        monthlyBudget: budget, strategy: 'debt-first', debtExtraPaymentCap: cap,
      });
      assert.equal(result.isPayoffPossible, true);
      assert.equal(result.payoffMonths, expectedMonths);
      for (const row of result.monthlyData) {
        assert.ok(row.debtPayment <= payment + cap + 1e-8);
        assert.ok(row.debtPayment + row.locPayment <= budget + 1e-8);
        assertNear(principal + locBalance - row.month * budget + row.cashBalance,
          row.debtBalance + row.locBalance, `capped mortgage conservation ${index}/${cap}/${row.month}`);
      }
      assertNear(result.monthlyData.at(-1).cashBalance, expectedMonths * budget - principal - locBalance, 'capped mortgage cash');
      mortgageCases += 1;
    }
  }
}
const portfolioPath = path.join(repoRoot, 'packages/financial-engine/src/portfolio.ts');
const portfolioModule = { exports: {} };
const portfolioOutput = ts.transpileModule(fs.readFileSync(portfolioPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
new vm.Script(portfolioOutput, { filename: portfolioPath }).runInContext(vm.createContext({
  module: portfolioModule, exports: portfolioModule.exports,
  require: specifier => { assert.equal(specifier, './index'); return engine; },
}));
let portfolioCases = 0;
for (let index = 1; index <= 40; index += 1) {
  const principal = 600 + index * 73;
  const payment = 25 + index * 3;
  const budget = payment + 80 + index * 11;
  for (const strategy of ['snowball', 'avalanche', 'velocity']) {
    for (const focusMode of ['single', 'split']) {
      for (const manual of [false, true]) {
        const locBalance = manual ? 0 : index * 29;
        const cap = manual ? 10 + index : 0;
        const loanAllocation = manual ? payment + cap
          : strategy === 'velocity' && focusMode === 'single' ? payment : budget;
        const expected = Math.max(Math.ceil(principal / loanAllocation), Math.ceil((principal + locBalance) / budget));
        const result = portfolioModule.exports.simulatePortfolio({
          monthlyIncome: budget + 200, monthlyExpenses: 200, extraMonthlyPayment: cap,
          debts: [{ id: 'reference', name: 'Reference', category: 'auto', kind: 'amortized',
            balance: principal, apr: 0, minPaymentRule: { type: 'fixed', amount: payment }, paymentSource: 'checking' }],
          loc: manual ? undefined : { limit: 10000, balance: locBalance, apr: 0 }, chunkAmount: 0,
          settings: { strategy, focusMode, splitRatioPrimary: 0.7 },
        });
        assert.equal(result.isPayoffPossible, true);
        assert.equal(result.payoffMonths, expected, `${index}/${strategy}/${focusMode}/${manual}`);
        assertNear(result.cashAtPayoff, expected * budget - principal - locBalance, 'Portfolio closed-form cash');
        for (const row of result.monthResults) {
          assertNear(principal + locBalance - row.month * budget + row.cashBalance,
            row.balances.reference + row.locBalance, 'Portfolio zero-APR conserved book');
        }
        portfolioCases += 1;
      }
    }
  }
}
function referencePortfolioDirect(input) {
  const loans = input.debts.map(debt => ({ ...debt }));
  let loc = input.loc.balance;
  let cash = 0;
  const rows = [];
  const budget = input.monthlyIncome - input.monthlyExpenses;
  while ((loans.some(loan => loan.balance > 0.01) || loc > 0.01) && rows.length < 1200) {
    const interest = loans.map(loan => loan.balance * loan.apr / 12);
    const minimums = loans.map((loan, i) => loan.balance > 0.01 ? Math.min(loan.minPaymentRule.amount, loan.balance + interest[i]) : 0);
    const locInterest = loc * input.loc.apr * 30 / 365;
    const remaining = budget - minimums.reduce((sum, amount) => sum + amount, 0) - locInterest;
    assert.ok(remaining >= -1e-8, 'generated reference inputs must fund obligations');
    const extraBudget = Math.min(Math.max(0, remaining), input.extraMonthlyPayment || Infinity);
    const targets = loans.flatMap((loan, i) => loan.balance > 0.01
      ? [{ index: i, balance: loan.balance, apr: loan.apr, capacity: loan.balance + interest[i] - minimums[i] }] : []);
    if (loc > 0.01) targets.push({ index: loans.length, balance: loc, apr: input.loc.apr, capacity: loc });
    targets.sort(input.settings.strategy === 'snowball' ? (a, b) => a.balance - b.balance : (a, b) => b.apr - a.apr);
    const allocations = Array(loans.length + 1).fill(0);
    let unusedExtra = extraBudget;
    if (input.settings.focusMode === 'split' && targets.length > 1) {
      for (let i = 0; i < 2; i++) {
        const amount = Math.min(targets[i].capacity, extraBudget * (i ? 0.3 : 0.7));
        allocations[targets[i].index] = amount;
        unusedExtra -= amount;
      }
    }
    for (const target of targets) {
      const amount = Math.min(unusedExtra, Math.max(0, target.capacity - allocations[target.index]));
      allocations[target.index] += amount;
      unusedExtra -= amount;
    }
    loans.forEach((loan, i) => { loan.balance = Math.max(0, loan.balance + interest[i] - minimums[i] - allocations[i]); });
    loc = Math.max(0, loc - allocations[loans.length]);
    cash += budget - minimums.reduce((sum, value) => sum + value, 0) - locInterest - allocations.reduce((sum, value) => sum + value, 0);
    rows.push({ balances: loans.map(loan => loan.balance), loc, cash, interest: interest.reduce((sum, value) => sum + value, 0) + locInterest });
  }
  return rows;
}

let seed = 20261020;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
let seededPortfolioCases = 0;
let directOracleCases = 0;
for (let index = 0; index < 60; index++) {
  const debts = [0, 1, 2].map(id => {
    const balance = 500 + Math.floor(random() * 9500);
    const apr = random() * 0.2;
    return { id: `seeded-${id}`, name: `Seeded ${id}`, category: 'auto', kind: 'amortized', balance, apr,
      minPaymentRule: { type: 'fixed', amount: balance * apr / 12 + 30 + Math.floor(random() * 200) }, paymentSource: 'checking' };
  });
  const loc = { limit: 50000, balance: Math.floor(random() * 5000), apr: random() * 0.25 };
  const budget = debts.reduce((sum, debt) => sum + debt.minPaymentRule.amount, 0) + loc.balance * loc.apr * 30 / 365 + 100 + Math.floor(random() * 600);
  const expenses = 1000 + Math.floor(random() * 5000);
  const cap = index % 2 ? 50 + Math.floor(random() * 200) : 0;
  for (const strategy of ['snowball', 'avalanche', 'velocity']) {
    for (const focusMode of ['single', 'split']) {
      const input = { debts, loc, monthlyIncome: budget + expenses, monthlyExpenses: expenses, extraMonthlyPayment: cap,
        chunkAmount: 200, maxMonths: 1200, settings: { strategy, focusMode, splitRatioPrimary: 0.7 } };
      const before = JSON.stringify(input);
      const result = portfolioModule.exports.simulatePortfolio(input);
      assert.equal(JSON.stringify(input), before, 'seeded Portfolio inputs changed');
      let previousNet = debts.reduce((sum, debt) => sum + debt.balance, 0) + loc.balance;
      let summedInterest = 0;
      for (const row of result.monthResults) {
        const interest = Object.values(row.interestCharges).reduce((sum, value) => sum + value, 0) + row.locInterest;
        const net = Object.values(row.balances).reduce((sum, value) => sum + value, 0) + row.locBalance - row.cashBalance;
        assertNear(net, previousNet + interest - budget, 'seeded Portfolio conserved book', 1e-6);
        previousNet = net;
        summedInterest += interest;
      }
      assertNear(result.totalInterest, summedInterest, 'seeded Portfolio interest reconciliation', 1e-6);
      if (strategy !== 'velocity') {
        const expected = referencePortfolioDirect(input);
        assert.equal(result.isPayoffPossible, true);
        assert.equal(result.payoffMonths, expected.length);
        expected.forEach((reference, month) => {
          const actual = result.monthResults[month];
          debts.forEach((debt, id) => assertNear(actual.balances[debt.id], reference.balances[id], 'direct oracle loan', 1e-6));
          assertNear(actual.locBalance, reference.loc, 'direct oracle LOC', 1e-6);
          assertNear(actual.cashBalance, reference.cash, 'direct oracle cash', 1e-6);
        });
        directOracleCases++;
      }
      seededPortfolioCases++;
    }
  }
}
console.log(`Independent financial reference lane passed ${fixtures.scenarios.length} anonymized scenarios, ${directCases} closed-form comparison cases, ${boundaryCases} zero-recovery conservation cases, ${mortgageCases} capped-mortgage and ${portfolioCases} Portfolio closed-form policy cases; ${seededPortfolioCases} repeatable seeded Portfolio paths including ${directOracleCases} direct-oracle matches.`);
