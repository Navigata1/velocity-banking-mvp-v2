const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const repo = path.resolve(__dirname, '../../..');
const ts = require(require.resolve('typescript', { paths: [path.join(repo, 'apps/web')] }));
const cache = new Map(), hashes = {};
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.join(repo, 'packages/financial-engine/src', `${name}.ts`);
  const text = fs.readFileSync(filename, 'utf8'), testModule = { exports: {} };
  cache.set(name, testModule);
  hashes[name] = crypto.createHash('sha256').update(text).digest('hex');
  vm.runInNewContext(ts.transpileModule(text, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText, { module: testModule, exports: testModule.exports,
    require: id => id.startsWith('./') ? load(id.slice(2)) : require(id), console }, { filename });
  return testModule.exports;
}
const { simulatePortfolio } = load('portfolio');
const { preparePortfolioComparison } = load('portfolio-common-month');
let state = 20261021, draws = 0;
function integer(min, max) {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  draws++;
  return min + Math.floor(state / 4294967296 * (max - min + 1));
}
for (let source = 0; source < 8; source++) {
  for (let i = 0; i < 3 + source % 3; i++) { integer(25, 250); integer(3, 15); }
  integer(0, 400); integer(120, 400);
  if (source !== 0) integer(10, 100);
}
assert.equal(draws, 85); assert.equal(state, 4261141148);
let fixture;
for (let source = 0; source <= 4; source++) {
  const debts = Array.from({ length: 3 }, (_, i) => {
    const balance = integer(200, 2500), apr = integer(1, 24) / 100;
    const loan = { id: `rate-${source}-${i}`, name: `rate-${source}-${i}`, category: 'custom', kind: 'amortized',
      balance, apr, minPaymentRule: { type: 'fixed', amount: balance * 0.36 / 12 + integer(20, 90) }, paymentSource: 'checking' };
    if (i === 1) loan.minPaymentRule = { type: 'percent', percent: 0.08, floor: loan.minPaymentRule.amount };
    if (i === 2) loan.promo = { introApr: 0, monthsRemaining: 1 + source % 3, postIntroApr: 0.36 };
    return loan;
  });
  const loc = { limit: 50000, balance: integer(50, 1500), apr: integer(1, 30) / 100 };
  const expenses = integer(0, 1000), budget = Math.ceil(debts.reduce((sum, loan) => sum +
    (loan.minPaymentRule.type === 'fixed' ? loan.minPaymentRule.amount : Math.max(loan.minPaymentRule.floor, loan.balance * loan.minPaymentRule.percent)), 0)
    + loc.balance * loc.apr / 365 * 30) + integer(100, 600);
  for (const focusMode of ['single', 'split']) {
    const value = { debts, loc, monthlyIncome: budget + expenses, monthlyExpenses: expenses, focusMode,
      extraMonthlyPayment: source % 2 ? integer(5, 100) : 0, chunkAmount: [0, 20, 200][source % 3],
      splitRatioPrimary: [0, 0.1, 0.33, 0.7, 0.9, 1][source % 6], strategy: ['velocity', 'snowball', 'avalanche'][source % 3] };
    if (source === 4 && focusMode === 'split') fixture = value;
  }
}

const buffer = new DataView(new ArrayBuffer(8));
function dyadic(value) {
  assert.ok(Number.isFinite(value));
  buffer.setFloat64(0, value, false);
  const bits = buffer.getBigUint64(0, false), encoded = Number(bits >> 52n & 2047n);
  const fraction = bits & ((1n << 52n) - 1n);
  return { n: (bits >> 63n ? -1n : 1n) * (encoded ? fraction + (1n << 52n) : fraction),
    e: encoded ? encoded - 1023 - 52 : -1074 };
}
function exact(terms) {
  const parts = terms.map(dyadic), e = Math.min(...parts.map(part => part.e));
  let n = parts.reduce((sum, part) => sum + (part.n << BigInt(part.e - e)), 0n), exponent = e;
  if (n === 0n) return { value: 0, numerator: '0', exponent: 0 };
  while (n % 2n === 0n) { n /= 2n; exponent++; }
  return { value: Number(n) * 2 ** exponent, numerator: String(n), exponent };
}
console.log(JSON.stringify({ fixture, seed: 20261021, drawsThroughFixture: draws, stateThroughFixture: state }));
for (const strategy of ['velocity', 'snowball', 'avalanche']) {
  const result = simulatePortfolio({ ...fixture, aprUnit: 'decimal', settings: {
    strategy, focusMode: fixture.focusMode, splitRatioPrimary: fixture.splitRatioPrimary }, maxMonths: 600 });
  const rows = result.monthResults;
  const terms = new Map(fixture.debts.map(loan => [loan.id, [loan.balance]]));
  console.log(JSON.stringify({ strategy, payoff: result.payoffMonths, rows: rows.filter(row => row.month >= 5 && row.month <= 9) }));
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index], previous = index ? rows[index - 1] : {
      balances: Object.fromEntries(fixture.debts.map(loan => [loan.id, loan.balance])), locBalance: fixture.loc.balance, cashBalance: 0 };
    for (const loan of fixture.debts) terms.get(loan.id).push(row.interestCharges[loan.id], -row.payments[loan.id],
      -(row.targetIds.length === 1 && row.targetIds[0] === loan.id ? row.locDraw : 0));
    if (row.month >= 6 && row.month <= 8) {
      const loans = fixture.debts.map(loan => {
        const draw = row.targetIds.length === 1 && row.targetIds[0] === loan.id ? row.locDraw : 0;
        return { id: loan.id, before: previous.balances[loan.id], interest: row.interestCharges[loan.id],
          payment: row.payments[loan.id], draw, after: row.balances[loan.id],
          exactUnpaidAfterPayment: exact([previous.balances[loan.id], row.interestCharges[loan.id], -row.payments[loan.id], -draw]),
          exactEnteredPlusAllPostedChargesLessAllPayments: exact(terms.get(loan.id)),
          exactPostingResidual: exact([previous.balances[loan.id], row.interestCharges[loan.id], -row.payments[loan.id], -draw, -row.balances[loan.id]]) };
      });
      const cashResidual = exact([previous.cashBalance, fixture.monthlyIncome, -fixture.monthlyExpenses,
        ...Object.values(row.payments).map(n => -n), -row.locPayment, -row.cashBalance]);
      const locResidual = exact([previous.locBalance, row.locDraw, row.locInterest, -row.locPayment, -row.locBalance]);
      console.log(JSON.stringify({ strategy, month: row.month, loans, cashResidual, locResidual }));
    }
  }
}
const prepared = preparePortfolioComparison(fixture);
for (const horizon of [6, 7, 8, 12]) console.log(JSON.stringify({ horizon, result: prepared.atMonth(horizon) }));
console.log(JSON.stringify({ hashes }));
