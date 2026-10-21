const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
const ts = require(path.join(root, 'apps/web/node_modules/typescript'));
const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name).exports;
  const filename = path.join(root, 'packages/financial-engine/src', name + '.ts');
  const module = { exports: {} }; modules.set(name, module);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, console,
    require: id => id.startsWith('./') ? load(id.slice(2)) : require(id) }, { filename });
  return module.exports;
}
const api = load('portfolio-common-month');
const generic = load('common-month');
const engine = load('portfolio');
const codec = load('portfolio-book');
const debt = (balance, minimum, id = 'a') => ({ id, name: id, balance, apr: 0,
  category: 'custom', kind: 'amortized', paymentSource: 'checking', minPaymentRule: { type: 'fixed', amount: minimum } });
const book = (changes = {}) => ({ monthlyIncome: 100, monthlyExpenses: 0, extraMonthlyPayment: 0,
  chunkAmount: 0, loc: { limit: 0, balance: 0, apr: 0 }, strategy: 'snowball', focusMode: 'single',
  splitRatioPrimary: 0.7, debts: [debt(100, 10)], ...changes });
const emit = (name, data) => console.log(JSON.stringify({ name, ...data }));
const mode = process.argv[2] || 'boundaries';
if (mode === 'boundaries') {
  for (const row of [null, undefined]) {
    const input = { horizonMonths: 1, monthlyBudget: 0, initial: { balances: {}, locBalance: 0, cashBalance: 0 },
      projection: { rows: [row], payoffPossible: false, payoffMonth: 1 } };
    try { emit('nullish-row', { row, actual: generic.snapshotAtMonth(input) }); }
    catch (error) { emit('nullish-row', { row, error: error.message }); }
  }
  for (const size of [1e9, 1e12, 1e13, 1e14]) {
    const value = book({ monthlyIncome: size, debts: [debt(size + 0.005, size)] });
    const rows = engine.simulatePortfolio(codec.portfolioBookInputs(value)).monthResults;
    emit('per-loan-residual', { value, rows: rows.slice(0, 3), months: [1, 2, 3].map(month => api.comparePortfolioAtMonth(value, month)) });
  }
  for (const dust of [1e-9, 1e-8, 2e-8]) {
    const input = { horizonMonths: 2, monthlyBudget: 0, initial: { balances: { a: dust }, locBalance: 0, cashBalance: 0 },
      projection: { rows: [{ month: 1, balances: { a: 0 }, locBalance: 0, cashBalance: 0, interest: 0 }], payoffPossible: true, payoffMonth: 1 } };
    emit('generic-unpaid-forgiveness', { input, actual: generic.snapshotAtMonth(input) });
  }
  const valid = book();
  const prepared = api.preparePortfolioComparison(valid);
  const first = prepared.atMonth(0);
  first.plans.reverse(); first.plans[0].snapshot.balances.a = 0;
  assert.equal(prepared.atMonth(0).plans[0].snapshot.balances.a, 100);
  valid.loc.balance = 1000; valid.debts[0].balance = 0;
  assert.equal(prepared.atMonth(0).plans[0].snapshot.locBalance, 0);
  emit('independent-capture-alias', { passed: true });
}
if (mode === 'sum') {
  // All integers are exact doubles; the oracle uses BigInt only as a test oracle.
  let seed = 918735, examined = 0, failures = 0;
  const next = () => seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  for (let i = 0; i < 12000; i++) {
    const large = 2 ** (54 + next() % 20), small = next() % 10001 - 5000;
    const terms = [large, small, -large, next() % 100 - 50, 2 ** (next() % 20)];
    for (let j = terms.length - 1; j > 0; j--) { const k = next() % (j + 1); [terms[j], terms[k]] = [terms[k], terms[j]]; }
    const exact = Number(terms.reduce((sum, n) => sum + BigInt(n), 0n));
    const actual = generic.sumCommonMonthTerms(terms); examined++;
    if (actual !== exact) { failures++; if (failures < 5) emit('sum-failure', { terms, exact, actual }); }
  }
  assert.equal(failures, 0); emit('sum-exact-integer-cancellation', { examined, failures, seed });
}
if (mode === 'precision') {
  const input = { horizonMonths: 2, monthlyBudget: 1e16,
    initial: { balances: { a: 1e16 }, locBalance: 0, cashBalance: 0 },
    projection: { payoffPossible: false, payoffMonth: 2, rows: [
      { month: 1, balances: { a: 1e16 }, locBalance: 0, cashBalance: 0, interest: 1e16 },
      { month: 2, balances: { a: 1e16 }, locBalance: 1, cashBalance: 1e16, interest: 1 },
    ] } };
  const initial = input.initial, row = input.projection.rows[1];
  const exactResidual = BigInt(row.cashBalance) - BigInt(initial.cashBalance)
    + BigInt(initial.balances.a) - BigInt(row.balances.a)
    + BigInt(initial.locBalance) - BigInt(row.locBalance) - 2n * BigInt(input.monthlyBudget)
    + input.projection.rows.reduce((n, r) => n + BigInt(r.interest), 0n);
  emit('cumulative-interest-cancellation', { input, exactResidual: String(exactResidual),
    exactNet: String(BigInt(row.cashBalance) - BigInt(row.balances.a) - BigInt(row.locBalance)),
    month1: generic.snapshotAtMonth({ ...input, horizonMonths: 1 }), month2: generic.snapshotAtMonth(input) });
  for (const scale of [1e7, 1e8, 1e9, 1e10]) {
    const value = book({ monthlyIncome: scale + 1, extraMonthlyPayment: 1,
      debts: [debt(scale + 0.000005, scale), debt(100, 1, 'b')] });
    emit('per-loan-actual-small-with-live-sibling', { value,
      rows: engine.simulatePortfolio(codec.portfolioBookInputs(value)).monthResults.slice(0, 3),
      month2: api.comparePortfolioAtMonth(value, 2) });
  }
}
if (mode === 'dust-ordinary' || mode === 'red-dust') {
  const dust = 2 ** -40;
  const value = book({ monthlyIncome: 257, extraMonthlyPayment: 1,
    debts: [debt(256 + dust, 256), debt(100, 1, 'b')] });
  const rows = engine.simulatePortfolio(codec.portfolioBookInputs(value)).monthResults;
  const actual = api.comparePortfolioAtMonth(value, 2);
  const expectedNet = generic.sumCommonMonthTerms([2 * 257, -(256 + dust), -100]);
  assert.equal(rows[0].balances.a, dust, 'exact subtraction leaves genuine entered inventory');
  assert.equal(rows[1].payments.a, 0); assert.equal(rows[1].interestCharges.a, 0);
  assert.equal(rows[1].balances.a, 0);
  const cutoff = rows[0].balances.a > Number.EPSILON * (256 + dust) * 16;
  emit('genuine-ordinary-unpaid-dust', { dust, value, rows: rows.slice(0, 2), expectedNet,
    rawNetOverstatement: actual.plans[1].snapshot.netModeledWealth - expectedNet, cutoff,
    month0: api.comparePortfolioAtMonth(value, 0), month1: api.comparePortfolioAtMonth(value, 1), month2: actual,
    month52: api.comparePortfolioAtMonth(value, 52) });
  if (mode === 'red-dust') for (const plan of actual.plans) {
    assert.equal(plan.snapshot.status, 'unavailable', 'an observed real unpaid residual was removed without payment');
    assert.equal(plan.snapshot.reason, 'cent-tolerance');
  }
}
if (mode === 'red-null') {
  const initial = { balances: { a: 100 }, locBalance: 0, cashBalance: 0 };
  const row1 = { month: 1, balances: { a: 90 }, locBalance: 0, cashBalance: 0, interest: 0 };
  const input = { monthlyBudget: 10, initial, projection: { payoffPossible: false, payoffMonth: 2, rows: [row1, null] } };
  assert.equal(generic.snapshotAtMonth({ ...input, horizonMonths: 1 }).netModeledWealth, -90);
  let actual;
  assert.doesNotThrow(() => { actual = generic.snapshotAtMonth({ ...input, horizonMonths: 2 }); }, 'a malformed required row must fail closed');
  assert.equal(actual.status, 'unavailable'); assert.equal(actual.reason, 'invalid-trace');
  assert.equal(actual.coveredThroughMonth, 1);
}
if (mode === 'red-interest') {
  const input = { horizonMonths: 2, monthlyBudget: 1e16,
    initial: { balances: { a: 1e16 }, locBalance: 0, cashBalance: 0 },
    projection: { payoffPossible: false, payoffMonth: 2, rows: [
      { month: 1, balances: { a: 1e16 }, locBalance: 0, cashBalance: 0, interest: 1e16 },
      { month: 2, balances: { a: 1e16 }, locBalance: 1, cashBalance: 1e16, interest: 1 },
    ] } };
  // Every supplied Number and the month-2 net -1 is exact and finite.
  const residual = generic.sumCommonMonthTerms([1e16, 1e16, -1e16, -1, -2e16, 1e16, 1]);
  assert.equal(residual, 0, 'raw summation establishes exact conservation');
  const actual = generic.snapshotAtMonth(input);
  emit('red-interest-input', { input, rawResidual: residual, actual });
  assert.equal(actual.status, 'modeled', 'rounding the diagnostic cumulative-interest scalar must not reject a conserving inventory');
  assert.equal(actual.netModeledWealth, -1);
}
