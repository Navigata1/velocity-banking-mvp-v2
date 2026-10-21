/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../../packages/financial-engine/src');
const modules = new Map();
function load(name, cache = modules, portfolioSource) {
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.join(root, `${name}.ts`), testModule = { exports: {} };
  cache.set(name, testModule);
  const source = name === 'portfolio' && portfolioSource !== undefined
    ? portfolioSource : fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(output, { module: testModule, exports: testModule.exports,
    require: id => id.startsWith('./') ? load(id.slice(2), cache) : require(id) }, { filename });
  return testModule.exports;
}
const engine = load('index'), portfolio = load('portfolio');
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)), `${label}: expected ${expected}, received ${actual}`);
const debt = { id: 'loan', name: 'Loan', category: 'custom', kind: 'amortized',
  balance: 1200, apr: 2, minPaymentRule: { type: 'fixed', amount: 300 }, paymentSource: 'checking' };
const book = { monthlyIncome: 2000, monthlyExpenses: 1000, extraMonthlyPayment: 20,
  debts: [debt], loc: { limit: 0, balance: 0, apr: 0 }, chunkAmount: 0, maxMonths: 3,
  settings: { strategy: 'snowball', focusMode: 'single', splitRatioPrimary: 0.7 } };
let tests = 0;
function test(name, action) {
  tests++;
  try { action(); console.log(`PASS APR units ${name}`); }
  catch (error) { console.error(`FAIL APR units ${name}`); console.error(error); process.exitCode = 1; }
}

const velocityCases = [
  { apr: 0.9999, firstLoanInterest: 99.99, remainingLoan: 79.99, payoffMonth: 4 },
  { apr: 1, firstLoanInterest: 100, remainingLoan: 80, payoffMonth: 4 },
  { apr: 1.0001, firstLoanInterest: 100.01, remainingLoan: 80.01, payoffMonth: 4 },
  { apr: 2, firstLoanInterest: 200, remainingLoan: 180, payoffMonth: 5 },
];

// Income arrives first; $500 household spending plus actual loan payments leave
// evenly over 30 days. No production rate or accrual helper supplies expectations.
function referenceVelocityLOC(startBalance, expenses, apr) {
  let dollarDays = 0;
  for (let day = 1; day <= 30; day++) {
    dollarDays += Math.max(0, startBalance - 1500 + expenses * day / 30);
  }
  const interest = dollarDays * apr / 365;
  return {
    locInterest: interest,
    locBalance: Math.max(0, startBalance - 1500 + expenses) + interest,
    cashBalance: Math.max(0, 1500 - startBalance - expenses),
  };
}

function assertFundedVelocity(simulator, fixture) {
  const { apr, firstLoanInterest, remainingLoan, payoffMonth } = fixture;
  const input = { ...book, aprUnit: 'decimal', monthlyIncome: 1500, monthlyExpenses: 500,
    debts: [{ ...debt, apr }], loc: { limit: 10000, balance: 2000, apr },
    chunkAmount: 900, maxMonths: 8, settings: { ...book.settings, strategy: 'velocity' } };
  const before = JSON.stringify(input);
  const result = simulator.simulatePortfolio(input);
  assert.equal(JSON.stringify(input), before, 'funded Velocity preserves its inputs');

  // First: $900 chunk, then the full $300 scheduled + $20 capped extra.
  // Second: chunk the remaining principal; only that month's interest is payable.
  const secondLoanInterest = remainingLoan * apr / 12;
  const firstLOC = referenceVelocityLOC(2900, 820, apr);
  close(firstLOC.locInterest, 54710 * apr / 365, 'fixture first-month dollar-days');
  const expected = [
    { loanInterest: firstLoanInterest, loanBalance: remainingLoan, payment: 320, draw: 900, ...firstLOC },
    { loanInterest: secondLoanInterest, loanBalance: 0, payment: secondLoanInterest, draw: remainingLoan,
      ...referenceVelocityLOC(firstLOC.locBalance + remainingLoan, 500 + secondLoanInterest, apr) },
  ];
  for (let month = 3; month <= payoffMonth; month++) {
    expected.push({ loanInterest: 0, loanBalance: 0, payment: 0, draw: 0,
      ...referenceVelocityLOC(expected.at(-1).locBalance, 500, apr) });
  }

  let totalInterest = 0;
  let locInterest = 0;
  let previousLoc = 2000;
  for (const [index, want] of expected.entries()) {
    const month = index + 1, label = `${apr} APR month ${month}`;
    const row = result.monthResults[index], ledger = result.moneyLoopMonthlyData[index];
    assert.ok(row && ledger, `${label}: expected a funded monthly ledger`);
    assert.equal(row.month, month);
    close(row.interestCharges.loan, want.loanInterest, `${label} loan interest`);
    close(row.payments.loan, want.payment, `${label} actual loan payment`);
    close(row.balances.loan, want.loanBalance, `${label} remaining loan`);
    close(row.locDraw, want.draw, `${label} funded chunk`);
    close(row.locInterest, want.locInterest, `${label} LOC daily interest`);
    close(row.locBalance, want.locBalance, `${label} remaining LOC`);
    close(row.locPayment, previousLoc + want.draw + want.locInterest - want.locBalance, `${label} LOC payment`);
    close(row.cashBalance, want.cashBalance, `${label} retained cash`);
    const eventAmount = type => ledger.events.filter(event => event.type === type).reduce((sum, event) => sum + event.amount, 0);
    close(eventAmount('debt-payment'), want.payment, `${label} scheduled/released loan payment`);
    close(eventAmount('loc-chunk-draw'), want.draw, `${label} chunk event`);
    close(eventAmount('income-to-loc'), 1500, `${label} income routing`);
    close(eventAmount('expenses-from-loc'), 500 + want.payment, `${label} actual expenses after payment release`);
    close(eventAmount('loc-interest'), want.locInterest, `${label} posted LOC charge`);
    close(ledger.cashFlowPaydown, 1000 - want.payment, `${label} funded residual`);
    close(ledger.cashBalance, want.cashBalance, `${label} ledger cash reserve`);
    assert.equal(ledger.locInterestMethod, 'average-daily-balance-estimate');
    totalInterest += want.loanInterest + want.locInterest;
    locInterest += want.locInterest;
    close(row.balances.loan + row.locBalance - row.cashBalance,
      3200 + totalInterest - month * 1000, `${label} independently funded net balance`);
    previousLoc = want.locBalance;
  }
  const secondExpenses = result.moneyLoopMonthlyData[1].events.find(event => event.type === 'expenses-from-loc').amount;
  close(500 + Math.min(300, remainingLoan + secondLoanInterest) - secondExpenses,
    remainingLoan, 'second chunk releases the unused principal payment from routed expenses');
  assert.ok(expected[2].locInterest > 0 && expected[2].locBalance > 0, 'substantive LOC-only recovery');
  assert.ok(expected.at(-1).cashBalance > 0, 'payoff retains a positive cash reserve');
  assert.equal(result.monthResults.length, payoffMonth);
  assert.equal(result.moneyLoopMonthlyData.length, payoffMonth);
  assert.equal(result.payoffOrder[0].monthPaidOff, 2);
  assert.equal(result.payoffMonths, payoffMonth);
  assert.equal(result.isPayoffPossible, true);
  assert.equal(result.failureReason, undefined);
  close(result.totalInterest, totalInterest, 'funded Velocity total interest');
  close(result.locInterestPaid, locInterest, 'funded Velocity LOC interest total');
  close(result.cashAtPayoff, expected.at(-1).cashBalance, 'funded Velocity cash at payoff');
}

function loadPortfolioWithoutUnit(binding) {
  const source = fs.readFileSync(path.join(root, 'portfolio.ts'), 'utf8');
  const argument = new RegExp(`(const ${binding} = simulateMoneyLoopMonth\\(\\{\\s*)aprUnit: 'decimal',\\s*`, 'g');
  assert.equal([...source.matchAll(argument)].length, 1, `expected exactly one ${binding} APR argument to mutate`);
  // Each mutant gets its own module cache; real source bytes and exports stay intact.
  return load('portfolio', new Map(), source.replace(argument, '$1'));
}

test('legacy defaults remain mixed-unit compatible', () => {
  assert.equal(engine.calculateMonthlyRate(6.5), engine.calculateMonthlyRate(0.065));
  assert.equal(engine.calculateMonthlyRate(2), 0.02 / 12);
  assert.equal(engine.calculateDailyRate(2), 0.02 / 365);
});
test('explicit decimal scalars do not jump down at100 percent', () => {
  for (const apr of [0, 0.065, 0.9999, 1, 1.0001, 2, 6.5]) {
    close(engine.calculateMonthlyRate(apr, 'decimal'), apr / 12, `monthly ${apr}`);
    close(engine.calculateDailyRate(apr, 'decimal'), apr / 365, `daily ${apr}`);
    close(engine.calculateDailyInterest(1200, apr, 'decimal'), 1200 * apr / 365, `burn ${apr}`);
  }
});
test('dated and estimated LOC accrual retain the explicit APR', () => {
  for (const calendar of [undefined, { year: 2026, month: 4, transactions: [] }]) {
    const result = engine.calculateLOCInterestAccrual({ startBalance: 1000, apr: 2,
      monthlyIncome: 0, monthlyExpenses: 0, aprUnit: 'decimal', calendar });
    close(result.interest, 1000 * 2 * 30 / 365, 'LOC period charge');
    assert.equal(result.method, calendar ? 'transaction-calendar' : 'average-daily-balance-estimate');
  }
});
test('Money Loop month forwards units to loan and daily LOC charges', () => {
  const result = engine.simulateMoneyLoopMonth({ month: 1, debtBalance: 1200, debtApr: 2,
    debtPayment: 300, loc: { limit: 10000, balance: 500, apr: 2 }, locBalance: 500,
    chunkAmount: 0, cashFlowPaydown: 0, locDepositAmount: 0, locExpenseAmount: 300,
    monthsSinceChunk: 0, aprUnit: 'decimal' });
  close(result.debtInterest, 200, 'loan charge');
  close(result.locInterest, (500 * 30 + 10 * 30 * 31 / 2) * 2 / 365, 'daily closing LOC charge');
});
test('Portfolio decimal loan charge and retained cash have independent expected values', () => {
  const result = portfolio.simulatePortfolio({ ...book, aprUnit: 'decimal' });
  const row = result.monthResults[0];
  close(row.interestCharges.loan, 200, '200 percent loan month');
  close(row.payments.loan, 320, 'funded capped payment');
  close(row.balances.loan, 1080, 'remaining loan');
  close(row.cashBalance, 680, 'retained cash');
});
test('avalanche ranks decimal high-rate loans and LOC without legacy reinterpretation', () => {
  const low = { ...debt, id: 'low', apr: 0.9 };
  const result = portfolio.simulatePortfolio({ ...book, aprUnit: 'decimal',
    debts: [low, { ...debt, id: 'high', apr: 1.2 }],
    settings: { ...book.settings, strategy: 'avalanche' } });
  assert.equal(result.monthResults[0].targetIds[0], 'high');
  const loc = portfolio.simulatePortfolio({ ...book, aprUnit: 'decimal', debts: [low],
    loc: { limit: 10000, balance: 1000, apr: 2 },
    settings: { ...book.settings, strategy: 'avalanche' } });
  assert.equal(loc.monthResults[0].locIsTarget, true);
  close(loc.monthResults[0].locInterest, 1000 * 2 * 30 / 365, 'direct LOC charge');
});
test('promo transition and rationale retain high decimal APR meaning', () => {
  const result = portfolio.simulatePortfolio({ ...book, aprUnit: 'decimal',
    debts: [{ ...debt, promo: { introApr: 0, monthsRemaining: 1, postIntroApr: 2 } }] });
  close(result.monthResults[0].interestCharges.loan, 0, 'promo first month');
  close(result.monthResults[1].interestCharges.loan, 880 * 2 / 12, 'post-promo month');
  assert.equal(result.debtRationales.loan.aprUsedForBurn, 2);
  close(result.debtRationales.loan.dailyInterestBurn, 1200 * 2 / 365, 'rationale daily burn');
  assert.ok(result.debtRationales.loan.points.some(point => point.includes('200.0%')));
});
test('all policy/focus rows conserve high-rate debts LOC interest and funded cash', () => {
  for (const strategy of ['snowball', 'avalanche', 'velocity']) for (const focusMode of ['single', 'split']) {
    const input = { ...book, aprUnit: 'decimal', loc: { limit: 10000, balance: 500, apr: 1.2 },
      settings: { ...book.settings, strategy, focusMode } };
    const before = JSON.stringify(input), result = portfolio.simulatePortfolio(input);
    assert.equal(JSON.stringify(input), before, 'simulation must not mutate canonical inputs');
    assert.ok(result.monthResults.length > 0);
    let interest = 0;
    for (const row of result.monthResults) {
      interest += Object.values(row.interestCharges).reduce((a,b) => a+b,0) + row.locInterest;
      close(Object.values(row.balances).reduce((a,b) => a+b,0) + row.locBalance - row.cashBalance,
        1700 + interest - row.month * 1000, `${strategy}/${focusMode} month${row.month}`);
    }
  }
});
test('legacy whole-percent Portfolio results match equivalent decimal books', () => {
  const legacy = { ...book, debts: [{ ...debt, apr: 6.5 }], loc: { limit: 10000, balance: 500, apr: 8.5 } };
  const decimal = { ...legacy, aprUnit: 'decimal', debts: [{ ...debt, apr: 0.065 }],
    loc: { ...legacy.loc, apr: 0.085 } };
  const a = portfolio.simulatePortfolio(legacy), b = portfolio.simulatePortfolio(decimal);
  close(a.totalInterest, b.totalInterest, 'legacy/canonical total interest');
  assert.deepEqual(JSON.parse(JSON.stringify(a.monthResults)), JSON.parse(JSON.stringify(b.monthResults)));
});
for (const fixture of velocityCases) {
  test(`funded Velocity retains ${fixture.apr * 100}% loan and LOC APR through chunks, released payments and recovery`, () => {
    assertFundedVelocity(portfolio, fixture);
  });
}
test('independent funded oracle rejects a missing Velocity target decimal argument', () => {
  const mutant = loadPortfolioWithoutUnit('monthResult');
  assert.throws(() => assertFundedVelocity(mutant, velocityCases.at(-1)), error =>
    error.code === 'ERR_ASSERTION' && /2 APR month 1 loan interest: expected 200, received 2/.test(error.message));
});
test('independent funded oracle rejects a missing LOC-only recovery decimal argument', () => {
  const mutant = loadPortfolioWithoutUnit('locRecoveryMonth');
  assert.throws(() => assertFundedVelocity(mutant, velocityCases.at(-1)), error =>
    error.code === 'ERR_ASSERTION' && /2 APR month 3 LOC daily interest:/.test(error.message));
});
console.log(`${tests} explicit APR unit contracts ${process.exitCode ? 'failed' : 'passed'}. Native UI adoption and lender rules remain separate.`);
