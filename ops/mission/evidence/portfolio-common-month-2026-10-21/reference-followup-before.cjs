/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const startedAt = process.hrtime.bigint();
const testSourceHash = crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');

const root = path.resolve(__dirname, '../../../packages/financial-engine/src');
const modules = new Map();
const sourceHashes = {};
function load(name) {
  if (modules.has(name)) return modules.get(name).exports;
  const filename = path.join(root, `${name}.ts`);
  const testModule = { exports: {} };
  modules.set(name, testModule);
  const text = fs.readFileSync(filename, 'utf8');
  sourceHashes[name] = crypto.createHash('sha256').update(text).digest('hex');
  const source = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, {
    module: testModule, exports: testModule.exports,
    require: id => id.startsWith('./') ? load(id.slice(2)) : require(id), console,
  }, { filename });
  return testModule.exports;
}

const { comparePortfolioAtMonth, preparePortfolioComparison } = load('portfolio-common-month');
const { snapshotAtMonth } = load('common-month');
const { simulatePortfolio } = load('portfolio');
const policies = ['velocity', 'snowball', 'avalanche'];
const focuses = ['single', 'split'];
const SEED = 20261021;
let state = SEED;
let draws = 0;
function integer(min, max) {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  draws++;
  return min + Math.floor(state / 4294967296 * (max - min + 1));
}
const counts = {
  zeroSources: 0, zeroBooks: 0, zeroComparisons: 0, zeroSnapshots: 0,
  zeroPreparations: 0, zeroParityComparisons: 0, zeroParitySnapshots: 0,
  handSources: 0, handComparisons: 0, handSnapshots: 0,
  rateSources: 0, rateBooks: 0, ratePaths: 0, accountedRows: 0,
  directOraclePaths: 0, directOracleRows: 0, rateComparisons: 0, rateSnapshots: 0,
  prefixSources: 0, prefixMutations: 0, prefixSnapshots: 0, boundarySnapshots: 0,
  boundaryComparisons: 0, boundaryAdapterSnapshots: 0,
};
const groups = new Map();
function probe(group, label, check) {
  if (!groups.has(group)) groups.set(group, { passed: 0, failed: 0 });
  const result = groups.get(group);
  try { check(); result.passed++; }
  catch (error) {
    result.failed++;
    process.exitCode = 1;
    if (result.failed <= 8) console.error(`FAIL ${group}: ${label}\n${error.stack}`);
  }
}
const plain = value => JSON.parse(JSON.stringify(value));
function near(actual, expected, label, tolerance = 1e-7) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);
}
function available(snapshot) {
  assert.ok(snapshot && snapshot.status !== 'unavailable', `unavailable snapshot: ${JSON.stringify(snapshot)}`);
}
function unavailable(snapshot, reason) {
  assert.equal(snapshot.status, 'unavailable');
  if (reason) assert.equal(snapshot.reason, reason);
  for (const key of ['balances', 'debtBalance', 'locBalance', 'cashBalance',
    'netModeledWealth', 'interestThroughMonth', 'budgetThroughMonth']) assert.equal(snapshot[key], null, key);
}
function finiteTree(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), 'no non-finite output');
  else if (value && typeof value === 'object') Object.values(value).forEach(finiteTree);
}
function debt(id, balance, minimum = 10, apr = 0) {
  return { id, name: id, category: 'custom', kind: 'amortized', balance, apr,
    minPaymentRule: { type: 'fixed', amount: minimum }, paymentSource: 'checking' };
}
function book(changes = {}) {
  return { monthlyIncome: 100, monthlyExpenses: 0, extraMonthlyPayment: 20, chunkAmount: 10,
    loc: { limit: 10000, balance: 40, apr: 0 }, strategy: 'snowball',
    focusMode: 'single', splitRatioPrimary: 0.7, debts: [debt('a', 120), debt('b', 20)], ...changes };
}
function inputs(value, strategy) {
  return { aprUnit: 'decimal', monthlyIncome: value.monthlyIncome, monthlyExpenses: value.monthlyExpenses,
    extraMonthlyPayment: value.extraMonthlyPayment, chunkAmount: value.chunkAmount,
    debts: value.debts, loc: value.loc, maxMonths: 600,
    settings: { strategy, focusMode: value.focusMode, splitRatioPrimary: value.splitRatioPrimary } };
}
const liabilities = position => Object.values(position.balances).reduce((sum, n) => sum + n, 0) + position.locBalance;
const initialPosition = value => ({ balances: Object.fromEntries(value.debts.map(d => [d.id, d.balance])),
  locBalance: value.loc.balance, cashBalance: 0 });

// Binary split ratios and integer sources make the zero-APR identity exact,
// without rounding an observed balance or forgiving a terminal cent.
const zeroStartedAt = process.hrtime.bigint();
for (let source = 0; source < 8; source++) {
  counts.zeroSources++;
  const debts = Array.from({ length: 3 + source % 3 }, (_, i) => ({
    ...debt(`zero-${source}-${i}`, integer(25, 250), integer(3, 15)),
    paymentSource: ['checking', 'loc', 'either'][i % 3],
  }));
  debts.push(debt(`cleared-${source}`, 0, 0));
  const expenses = integer(0, 400), budget = integer(120, 400);
  const loc = { limit: 100000, balance: source === 0 ? 0 : integer(10, 100), apr: 0 };
  for (const focusMode of focuses) for (const cap of [0, [1, 7, 31, 10000][source % 4]]) {
    counts.zeroBooks++;
    const value = book({ debts, monthlyIncome: budget + expenses, monthlyExpenses: expenses,
      loc, focusMode, extraMonthlyPayment: cap, chunkAmount: [0, 13, 200, 500][source % 4],
      splitRatioPrimary: [0, 0.25, 0.5, 0.75, 1][source % 5], strategy: policies[source % 3] });
    const before = JSON.stringify(value), startingLiabilities = liabilities(initialPosition(value));
    const prepared = preparePortfolioComparison(value);
    counts.zeroPreparations++;
    for (let horizon = 0; horizon <= 600; horizon++) {
      counts.zeroComparisons++;
      probe('zero-apr', `${source}/${focusMode}/cap=${cap}/H=${horizon}`, () => {
        const result = prepared.atMonth(horizon);
        assert.deepEqual(plain(result.plans.map(p => p.strategy)), policies);
        assert.equal(result.monthlyBudget, budget);
        assert.equal(result.referenceStrategy, value.strategy);
        for (const plan of result.plans) {
          counts.zeroSnapshots++;
          const snapshot = plan.snapshot;
          available(snapshot);
          assert.deepEqual(Object.keys(snapshot.balances).sort(), debts.map(d => d.id).sort());
          assert.equal(snapshot.netModeledWealth, horizon * budget - startingLiabilities);
          assert.equal(snapshot.cashBalance - snapshot.debtBalance - snapshot.locBalance, snapshot.netModeledWealth);
          assert.equal(snapshot.interestThroughMonth, 0);
          assert.equal(snapshot.budgetThroughMonth, horizon * budget);
          assert.equal(plan.wealthDifference, 0);
          if (snapshot.status === 'post-payoff-cash') {
            assert.equal(snapshot.cashBalance, horizon * budget - startingLiabilities);
            assert.ok(snapshot.coveredThroughMonth < horizon);
            assert.equal(snapshot.debtBalance + snapshot.locBalance, 0);
          }
        }
        assert.equal(JSON.stringify(value), before, 'comparison changed its captured book');
      });
    }
    for (const horizon of [0, 1, 36, 600]) {
      counts.zeroParityComparisons++;
      probe('zero-convenience-parity', `${source}/${focusMode}/cap=${cap}/H=${horizon}`, () => {
        const convenient = comparePortfolioAtMonth(value, horizon);
        const captured = prepared.atMonth(horizon);
        counts.zeroParitySnapshots += convenient.plans.length;
        assert.deepEqual(plain(convenient), plain(captured));
        assert.equal(JSON.stringify(value), before, 'convenience comparison changed its captured book');
      });
    }
  }
  console.log(`Zero-APR source ${source + 1}/8 complete (all H0..600).`);
}
const zeroElapsedMilliseconds = Number(process.hrtime.bigint() - zeroStartedAt) / 1e6;

function hand(label, value, horizons) {
  counts.handSources++;
  for (const [horizon, expected] of horizons) {
    counts.handComparisons++;
    probe('hand-calculated', `${label}/H=${horizon}`, () => {
      const result = comparePortfolioAtMonth(value, horizon);
      for (const plan of result.plans) {
        counts.handSnapshots++;
        const want = expected[plan.strategy], snapshot = plan.snapshot;
        if (want.reason) { unavailable(snapshot, want.reason); assert.equal(snapshot.coveredThroughMonth, want.covered); }
        else {
          available(snapshot);
          for (const [key, n] of Object.entries(want)) {
            if (key === 'balances') {
              assert.deepEqual(Object.keys(snapshot.balances).sort(), Object.keys(n).sort());
              for (const [id, amount] of Object.entries(n)) near(snapshot.balances[id], amount, `${label}/${plan.strategy}/${id}`);
            } else near(snapshot[key], n, `${label}/${plan.strategy}/${key}`);
          }
        }
      }
      const reference = expected[value.strategy];
      for (const plan of result.plans) {
        const want = expected[plan.strategy];
        if (reference.reason || want.reason) assert.equal(plan.wealthDifference, null);
        else near(plan.wealthDifference, want.netModeledWealth - reference.netModeledWealth, 'signed wealth difference');
      }
    });
  }
}
const same = value => Object.fromEntries(policies.map(strategy => [strategy, value]));

// M1 Avalanche pays the loan first; M2 interest is 21.2 * .01 = .212.
// Velocity retains more cash but pays 1.2 + 1.012 interest, so its delta is -.8.
hand('signed-adverse', book({ strategy: 'avalanche', extraMonthlyPayment: 0,
  debts: [debt('a', 120, 10, 0.12)] }), [[2, {
  avalanche: { balances: { a: 0 }, locBalance: 0, cashBalance: 38.588, interestThroughMonth: 1.412, netModeledWealth: 38.588 },
  snowball: { balances: { a: 0 }, locBalance: 0, cashBalance: 38.188, interestThroughMonth: 1.812, netModeledWealth: 38.188 },
  velocity: { balances: { a: 82.212 }, locBalance: 0, cashBalance: 120, interestThroughMonth: 2.212, netModeledWealth: 37.788 },
}]]);

// After the first zero-rate promo month, Velocity attempts month2 but cannot
// fund its 18 interest from the 10 scheduled payment. Direct rows remain usable.
hand('partial-promo-prefix', book({ monthlyIncome: 20, extraMonthlyPayment: 0, chunkAmount: 0,
  loc: { limit: 1000, balance: 0, apr: 0 }, strategy: 'velocity',
  debts: [{ ...debt('a', 100), promo: { introApr: 0, monthsRemaining: 1, postIntroApr: 2.4 } }] }), [
  [1, { velocity: { balances: { a: 90 }, locBalance: 0, cashBalance: 10, interestThroughMonth: 0, netModeledWealth: -80 },
    snowball: { balances: { a: 80 }, locBalance: 0, cashBalance: 0, interestThroughMonth: 0, netModeledWealth: -80 },
    avalanche: { balances: { a: 80 }, locBalance: 0, cashBalance: 0, interestThroughMonth: 0, netModeledWealth: -80 } }],
  [2, { velocity: { reason: 'incomplete-horizon', covered: 1 },
    snowball: { balances: { a: 76 }, locBalance: 0, cashBalance: 0, interestThroughMonth: 16, netModeledWealth: -76 },
    avalanche: { balances: { a: 76 }, locBalance: 0, cashBalance: 0, interestThroughMonth: 16, netModeledWealth: -76 } }],
  [3, { velocity: { reason: 'incomplete-horizon', covered: 1 },
    snowball: { balances: { a: 71.2 }, locBalance: 0, cashBalance: 0, interestThroughMonth: 31.2, netModeledWealth: -71.2 },
    avalanche: { balances: { a: 71.2 }, locBalance: 0, cashBalance: 0, interestThroughMonth: 31.2, netModeledWealth: -71.2 } }],
]);

// Direct LOC interest is 365 * .365 * 30/365 = 10.95. Velocity's first-month
// daily balances are 275 + day/3; their sum8405 produces 8.405 LOC interest.
hand('loc-adb-versus-direct', book({ extraMonthlyPayment: 0, strategy: 'avalanche',
  debts: [debt('a', 120, 10, 0.12)], loc: { limit: 10000, balance: 365, apr: 0.365 } }), [[1, {
  velocity: { balances: { a: 101.2 }, locBalance: 293.405, cashBalance: 0, interestThroughMonth: 9.605, netModeledWealth: -394.605 },
  snowball: { balances: { a: 32.15 }, locBalance: 365, cashBalance: 0, interestThroughMonth: 12.15, netModeledWealth: -397.15 },
  avalanche: { balances: { a: 111.2 }, locBalance: 285.95, cashBalance: 0, interestThroughMonth: 12.15, netModeledWealth: -397.15 },
}]]);
hand('decimal-apr2-loan', book({ monthlyIncome: 1000, debts: [debt('a', 1200, 300, 2)],
  loc: { limit: 0, balance: 0, apr: 0 } }), [[1, same({ balances: { a: 1080 }, locBalance: 0,
  cashBalance: 680, interestThroughMonth: 200, netModeledWealth: -400 })]]);
hand('decimal-apr2-loc', book({ monthlyIncome: 1000, extraMonthlyPayment: 0,
  debts: [debt('paid', 0, 0)], loc: { limit: 0, balance: 365, apr: 2 } }), [
  [1, same({ balances: { paid: 0 }, locBalance: 0, cashBalance: 575, interestThroughMonth: 60, netModeledWealth: 575 })],
  [600, same({ balances: { paid: 0 }, locBalance: 0, cashBalance: 599575, interestThroughMonth: 60, netModeledWealth: 599575 })],
]);

function aprAt(loan, month) {
  return loan.promo ? month <= loan.promo.monthsRemaining ? loan.promo.introApr : loan.promo.postIntroApr : loan.apr;
}
function minimum(loan, balance, interest) {
  if (balance <= 0.01) return 0;
  const scheduled = loan.minPaymentRule.type === 'fixed' ? loan.minPaymentRule.amount
    : Math.max(loan.minPaymentRule.floor, balance * loan.minPaymentRule.percent);
  return Math.min(scheduled, balance + interest);
}

// Independent direct-policy ledger: no production normalization, allocation,
// codec or common-month helper is used to calculate reference positions.
function directRows(value, policy) {
  assert.ok(policy === 'snowball' || policy === 'avalanche');
  const loans = value.debts.map(loan => ({ ...loan }));
  let locBalance = value.loc.balance, cashBalance = 0;
  const rows = [], budget = value.monthlyIncome - value.monthlyExpenses;
  for (let month = 1; month <= 600; month++) {
    if (loans.every(loan => loan.balance <= 0.01) && locBalance <= 0.01) break;
    const charges = loans.map(loan => loan.balance <= 0.01 ? 0 : loan.balance * aprAt(loan, month) / 12);
    const payments = loans.map((loan, i) => minimum(loan, loan.balance, charges[i]));
    const locInterest = locBalance * value.loc.apr / 365 * 30;
    const surplus = budget - payments.reduce((sum, amount) => sum + amount, 0) - locInterest;
    assert.ok(surplus >= -1e-8, 'reference source must fund its scheduled obligations');
    const extra = Math.min(Math.max(0, surplus), value.extraMonthlyPayment > 0 ? value.extraMonthlyPayment : Infinity);
    const targets = loans.flatMap((loan, i) => loan.balance <= 0.01 ? [] : [{
      index: i, balance: loan.balance, apr: aprAt(loan, month), capacity: loan.balance + charges[i] - payments[i],
    }]);
    if (locBalance > 0.01) targets.push({ index: loans.length, balance: locBalance, apr: value.loc.apr, capacity: locBalance });
    targets.sort(policy === 'snowball' ? (a, b) => a.balance - b.balance : (a, b) => b.apr - a.apr);
    const extras = Array(loans.length + 1).fill(0);
    let remaining = extra;
    if (value.focusMode === 'split' && targets.length >= 2) {
      for (let slot = 0; slot < 2; slot++) {
        const target = targets[slot], share = slot === 0 ? value.splitRatioPrimary : 1 - value.splitRatioPrimary;
        const paid = Math.min(target.capacity, extra * share, remaining);
        extras[target.index] += paid;
        remaining -= paid;
      }
    }
    for (const target of targets) {
      const paid = Math.min(remaining, Math.max(0, target.capacity - extras[target.index]));
      extras[target.index] += paid;
      remaining -= paid;
    }
    for (let i = 0; i < loans.length; i++) {
      loans[i].balance = loans[i].balance <= 0.01 ? 0 : Math.max(0, loans[i].balance + charges[i] - payments[i] - extras[i]);
    }
    locBalance = Math.max(0, locBalance - extras[loans.length]);
    cashBalance += budget - payments.reduce((sum, amount) => sum + amount, 0) - locInterest
      - extras.reduce((sum, amount) => sum + amount, 0);
    rows.push({ month, balances: Object.fromEntries(loans.map(loan => [loan.id, loan.balance])), locBalance, cashBalance,
      interest: charges.reduce((sum, amount) => sum + amount, locInterest) });
  }
  return rows;
}

function rowInterest(value, strategy, previous, row) {
  const loanInterest = value.debts.reduce((sum, loan) => sum +
    (previous.balances[loan.id] <= 0.01 ? 0 : previous.balances[loan.id] * aprAt(loan, row.month) / 12), 0);
  const adb = strategy === 'velocity' && value.focusMode === 'single' && value.loc.limit > 0
    && value.loc.balance < value.loc.limit && value.debts.some(loan => loan.balance > 0.01);
  let locInterest = previous.locBalance * value.loc.apr / 365 * 30;
  if (adb) {
    const routedSpending = value.monthlyExpenses + Object.values(row.payments).reduce((sum, amount) => sum + amount, 0);
    let dailyTotal = 0;
    for (let day = 1; day <= 30; day++) dailyTotal += Math.max(0,
      previous.locBalance + row.locDraw - previous.cashBalance - value.monthlyIncome + routedSpending / 30 * day);
    locInterest = dailyTotal * value.loc.apr / 365;
  }
  return { loanInterest, locInterest };
}
function accountRow(value, strategy, previous, row) {
  const ids = value.debts.map(loan => loan.id).sort();
  for (const field of ['balances', 'interestCharges', 'payments']) assert.deepEqual(Object.keys(row[field]).sort(), ids, field);
  const interest = rowInterest(value, strategy, previous, row);
  const payments = Object.values(row.payments).reduce((sum, amount) => sum + amount, 0);
  for (const loan of value.debts) {
    const before = previous.balances[loan.id];
    const expectedInterest = before <= 0.01 ? 0 : before * aprAt(loan, row.month) / 12;
    near(row.interestCharges[loan.id], expectedInterest, `${loan.id} independently computed interest`);
    const internalDraw = row.locDraw && row.targetIds[0] === loan.id ? row.locDraw : 0;
    near(row.balances[loan.id], before + expectedInterest - row.payments[loan.id] - internalDraw, `${loan.id} balance rollforward`);
  }
  near(row.locInterest, interest.locInterest, 'independent LOC interest');
  near(row.locBalance, previous.locBalance + row.locDraw + interest.locInterest - row.locPayment, 'LOC rollforward');
  near(row.cashBalance, previous.cashBalance + value.monthlyIncome - value.monthlyExpenses - payments - row.locPayment, 'cash rollforward');
  near(row.cashBalance - liabilities(row), previous.cashBalance - liabilities(previous)
    + value.monthlyIncome - value.monthlyExpenses - interest.loanInterest - interest.locInterest, 'whole-book row accounting');
}

function expectObserved(value, horizon, rows, payoffPossible, payoffMonth) {
  const budget = value.monthlyIncome - value.monthlyExpenses, initial = initialPosition(value);
  if (horizon === 0) return { ...initial, interest: 0, covered: 0, status: 'initial' };
  let cumulative = 0;
  for (const row of rows.slice(0, horizon)) cumulative += row.interest;
  if (horizon <= rows.length) return { ...rows[horizon - 1], interest: cumulative, covered: horizon, status: 'modeled' };
  const terminal = rows.at(-1) || initial;
  const debtValues = [...Object.values(terminal.balances), terminal.locBalance];
  if (debtValues.some(n => n !== 0)) return {
    reason: payoffPossible && debtValues.every(n => n <= 0.01) ? 'cent-tolerance' : 'incomplete-horizon', covered: rows.length,
  };
  if (!payoffPossible || payoffMonth !== rows.length) return { reason: 'incomplete-horizon', covered: rows.length };
  return { ...terminal, cashBalance: terminal.cashBalance + (horizon - rows.length) * budget,
    interest: cumulative, covered: rows.length, status: 'post-payoff-cash' };
}
function matchesObserved(snapshot, expected, value, horizon) {
  if (expected.reason) { unavailable(snapshot, expected.reason); assert.equal(snapshot.coveredThroughMonth, expected.covered); return; }
  available(snapshot);
  assert.equal(snapshot.status, expected.status);
  assert.equal(snapshot.coveredThroughMonth, expected.covered);
  assert.deepEqual(Object.keys(snapshot.balances).sort(), value.debts.map(loan => loan.id).sort());
  for (const [id, amount] of Object.entries(expected.balances)) near(snapshot.balances[id], amount, `${id} reference position`);
  near(snapshot.locBalance, expected.locBalance, 'reference LOC');
  near(snapshot.cashBalance, expected.cashBalance, 'reference retained cash');
  near(snapshot.interestThroughMonth, expected.interest, 'reference cumulative interest');
  const wealth = horizon * (value.monthlyIncome - value.monthlyExpenses) - liabilities(initialPosition(value)) - expected.interest;
  near(snapshot.netModeledWealth, wealth, 'reference wealth, not cash or payoff counter', 1e-6);
  near(snapshot.netModeledWealth, expected.cashBalance - liabilities(expected), 'reference inventory wealth', 1e-6);
}

for (let source = 0; source < 12; source++) {
  counts.rateSources++;
  const debts = Array.from({ length: 3 }, (_, i) => {
    const balance = integer(200, 2500), apr = integer(1, 24) / 100;
    const loan = debt(`rate-${source}-${i}`, balance, balance * 0.36 / 12 + integer(20, 90), apr);
    if (i === 1) loan.minPaymentRule = { type: 'percent', percent: 0.08, floor: loan.minPaymentRule.amount };
    if (i === 2) loan.promo = { introApr: 0, monthsRemaining: 1 + source % 3, postIntroApr: 0.36 };
    return loan;
  });
  const loc = { limit: 50000, balance: integer(50, 1500), apr: integer(1, 30) / 100 };
  const expenses = integer(0, 1000), budget = Math.ceil(debts.reduce((sum, loan) => sum +
    (loan.minPaymentRule.type === 'fixed' ? loan.minPaymentRule.amount : Math.max(loan.minPaymentRule.floor, loan.balance * loan.minPaymentRule.percent)), 0)
    + loc.balance * loc.apr / 365 * 30) + integer(100, 600);
  for (const focusMode of focuses) {
    counts.rateBooks++;
    const value = book({ debts, loc, monthlyIncome: budget + expenses, monthlyExpenses: expenses, focusMode,
      extraMonthlyPayment: source % 2 ? integer(5, 100) : 0, chunkAmount: [0, 20, 200][source % 3],
      splitRatioPrimary: [0, 0.1, 0.33, 0.7, 0.9, 1][source % 6], strategy: policies[source % 3] });
    const expectedByPolicy = new Map();
    for (const strategy of policies) {
      counts.ratePaths++;
      const projection = simulatePortfolio(inputs(value, strategy));
      let previous = initialPosition(value);
      const observed = [];
      for (const row of projection.monthResults) {
        counts.accountedRows++;
        probe('engine-row-accounting', `${source}/${focusMode}/${strategy}/M=${row.month}`, () => accountRow(value, strategy, previous, row));
        const charges = rowInterest(value, strategy, previous, row);
        observed.push({ ...row, interest: charges.loanInterest + charges.locInterest });
        previous = row;
      }
      if (strategy !== 'velocity') {
        counts.directOraclePaths++;
        const references = directRows(value, strategy);
        probe('direct-reference-length', `${source}/${focusMode}/${strategy}`, () => assert.equal(projection.monthResults.length, references.length));
        for (const [index, reference] of references.entries()) {
          counts.directOracleRows++;
          probe('direct-reference-row', `${source}/${focusMode}/${strategy}/M=${index + 1}`, () => {
            const actual = projection.monthResults[index];
            assert.ok(actual, 'reference month must exist');
            for (const [id, amount] of Object.entries(reference.balances)) near(actual.balances[id], amount, `${id} direct oracle`, 1e-6);
            near(actual.locBalance, reference.locBalance, 'direct oracle LOC', 1e-6);
            near(actual.cashBalance, reference.cashBalance, 'direct oracle cash', 1e-6);
          });
        }
        expectedByPolicy.set(strategy, { rows: references, possible: projection.isPayoffPossible, payoffMonth: references.length });
      } else expectedByPolicy.set(strategy, { rows: observed, possible: projection.isPayoffPossible, payoffMonth: projection.payoffMonths });
    }
    for (const horizon of [0, 1, 2, 3, 6, 12, 24, 60, 120, 600]) {
      counts.rateComparisons++;
      probe('rate-snapshots', `${source}/${focusMode}/H=${horizon}`, () => {
        const actual = comparePortfolioAtMonth(value, horizon);
        const expected = new Map(policies.map(strategy => {
          const projection = expectedByPolicy.get(strategy);
          return [strategy, expectObserved(value, horizon, projection.rows, projection.possible, projection.payoffMonth)];
        }));
        const reference = expected.get(value.strategy);
        for (const plan of actual.plans) {
          counts.rateSnapshots++;
          const wanted = expected.get(plan.strategy);
          matchesObserved(plan.snapshot, wanted, value, horizon);
          if (reference.reason || wanted.reason) assert.equal(plan.wealthDifference, null);
          else near(plan.wealthDifference, (wanted.cashBalance - liabilities(wanted))
            - (reference.cashBalance - liabilities(reference)), 'independent signed reference delta', 1e-6);
        }
      });
    }
  }
}

function prefix() {
  return { monthlyBudget: 25, initial: { balances: { alpha: 60, beta: 40, cleared: 0 }, locBalance: 50, cashBalance: 7 },
    projection: { payoffPossible: true, payoffMonth: 6, rows: [
      [45, 35, 45], [30, 30, 40], [15, 25, 35], [0, 20, 30], [0, 0, 25], [0, 0, 0],
    ].map(([alpha, beta, locBalance], index) => ({ month: index + 1, balances: { alpha, beta, cleared: 0 },
      locBalance, cashBalance: 7, interest: 0 })) } };
}
counts.prefixSources++;
const corruptions = [
  ['missing-loc', row => { delete row.locBalance; }],
  ['missing-cash', row => { delete row.cashBalance; }],
  ['missing-id', row => { delete row.balances.beta; }],
  ['missing-zero-id', row => { delete row.balances.cleared; }],
  ['extra-id', row => { row.balances.unknown = 0; }],
  ['nan-balance', row => { row.balances.alpha = NaN; }],
  ['negative-loc', row => { row.locBalance = -1; }],
  ['infinite-cash', row => { row.cashBalance = Infinity; }],
  ['negative-interest', row => { row.interest = -1; }],
  ['infinite-interest', row => { row.interest = Infinity; }],
  ['gap-or-duplicate', row => { row.month++; }],
  ['invented-cent', row => { row.cashBalance += 0.01; }],
];
for (let rowIndex = 0; rowIndex < 6; rowIndex++) for (const [label, corrupt] of corruptions) {
  counts.prefixMutations++;
  const input = prefix();
  corrupt(input.projection.rows[rowIndex]);
  for (let horizon = 0; horizon <= 6; horizon++) {
    counts.prefixSnapshots++;
    probe('required-prefix', `${label}/bad-row=${rowIndex + 1}/H=${horizon}`, () => {
      const snapshot = snapshotAtMonth({ ...input, horizonMonths: horizon });
      if (horizon <= rowIndex) {
        available(snapshot);
        assert.equal(snapshot.netModeledWealth, 25 * horizon - 143);
        assert.equal(snapshot.coveredThroughMonth, horizon);
      } else {
        unavailable(snapshot);
        assert.equal(snapshot.coveredThroughMonth, rowIndex);
      }
      finiteTree(snapshot);
    });
  }
}

function boundary(label, input, check) {
  counts.boundarySnapshots++;
  probe('boundaries', label, () => { const snapshot = snapshotAtMonth(input); check(snapshot); finiteTree(snapshot); });
}
for (const possible of [false, true]) for (const counter of [1, 600]) {
  const input = prefix();
  input.projection.rows.length = 1;
  input.projection.payoffPossible = possible;
  input.projection.payoffMonth = counter;
  boundary(`counter-not-coverage/${possible}/${counter}`, { ...input, horizonMonths: 2 }, snapshot => {
    unavailable(snapshot, 'incomplete-horizon'); assert.equal(snapshot.coveredThroughMonth, 1);
  });
  boundary(`counter-does-not-erase-prefix/${possible}/${counter}`, { ...input, horizonMonths: 1 }, snapshot => {
    available(snapshot); assert.equal(snapshot.netModeledWealth, -118);
  });
}
const dust = { monthlyBudget: 10, initial: { balances: { a: 10.005 }, locBalance: 0, cashBalance: 0 },
  projection: { payoffPossible: true, payoffMonth: 1,
    rows: [{ month: 1, balances: { a: 0.005 }, locBalance: 0, cashBalance: 0, interest: 0 }] } };
boundary('terminal-dust-observed', { ...dust, horizonMonths: 1 }, snapshot => {
  available(snapshot); near(snapshot.netModeledWealth, -0.005, 'terminal dust');
});
for (const horizon of [2, 600]) boundary(`terminal-dust-no-continuation/${horizon}`,
  { ...dust, horizonMonths: horizon }, snapshot => unavailable(snapshot, 'cent-tolerance'));
for (const horizon of [7, 100, 600]) boundary(`no-extra-scheduled-bonus/${horizon}`,
  { ...prefix(), horizonMonths: horizon }, snapshot => {
    available(snapshot); assert.equal(snapshot.status, 'post-payoff-cash');
    assert.equal(snapshot.cashBalance, 7 + (horizon - 6) * 25);
    assert.equal(snapshot.netModeledWealth, horizon * 25 - 143);
    assert.equal(snapshot.coveredThroughMonth, 6);
  });
for (const horizon of [1, 2]) {
  const input = prefix();
  input.projection.rows[1].balances = { alpha: Number.MAX_VALUE, beta: Number.MAX_VALUE, cleared: 0 };
  boundary(`unrequested-future-overflow/${horizon}`, { ...input, horizonMonths: horizon }, snapshot => {
    if (horizon === 1) { available(snapshot); assert.equal(snapshot.netModeledWealth, -118); }
    else { unavailable(snapshot, 'numeric-range-exceeded'); assert.equal(snapshot.coveredThroughMonth, 1); }
  });
}

// Each Number below is an exactly represented integer. BigInt establishes the
// representable small residual without asking for arbitrary-precision posting.
for (const [label, balances, locBalance, cashBalance] of [
  ['listed-small-after-large', { large: 1e16, small: 1 }, 0, 1e16],
  ['listed-small-before-large', { small: 1, large: 1e16 }, 0, 1e16],
  ['separate-loc-small', { large: 1e16 }, 1, 1e16],
  ['cash-residual-plus-small', { large: 1e16, small: 3 }, 2, 1e16 + 8],
]) {
  const exact = Number(BigInt(cashBalance) - Object.values(balances).reduce((sum, n) => sum + BigInt(n), 0n) - BigInt(locBalance));
  boundary(`large-cancellation/${label}`, { horizonMonths: 0, monthlyBudget: 0,
    initial: { balances, locBalance, cashBalance }, projection: { rows: [], payoffPossible: false, payoffMonth: 0 } }, snapshot => {
    available(snapshot); assert.equal(snapshot.netModeledWealth, exact, 'a representable liability must not disappear in cancellation');
  });
}
boundary('large-cancellation-in-accepted-row', { horizonMonths: 1, monthlyBudget: 1e16,
  initial: { balances: { large: 1e16, small: 1 }, locBalance: 0, cashBalance: 0 },
  projection: { payoffPossible: false, payoffMonth: 1,
    rows: [{ month: 1, balances: { large: 0, small: 1 }, locBalance: 0, cashBalance: 0, interest: 0 }] } }, snapshot => {
  available(snapshot); assert.equal(snapshot.netModeledWealth, -1);
});

for (const [label, input] of [
  ['liability-overflow', { horizonMonths: 0, monthlyBudget: 0,
    initial: { balances: { a: Number.MAX_VALUE, b: 1 }, locBalance: 0, cashBalance: 0 },
    projection: { rows: [], payoffPossible: false, payoffMonth: 0 } }],
  ['continuation-budget-overflow', { horizonMonths: 600, monthlyBudget: 1e308,
    initial: { balances: {}, locBalance: 0, cashBalance: 0 },
    projection: { rows: [], payoffPossible: true, payoffMonth: 0 } }],
]) boundary(label, input, snapshot => unavailable(snapshot, 'numeric-range-exceeded'));

for (const horizon of [0, 1, 2, 600]) {
  counts.boundaryComparisons++;
  probe('adapter-overflow', `cleared-finite-income/H=${horizon}`, () => {
    const result = comparePortfolioAtMonth(book({ monthlyIncome: 1e308, debts: [],
      loc: { limit: 0, balance: 0, apr: 0 } }), horizon);
    for (const plan of result.plans) {
      counts.boundaryAdapterSnapshots++;
      if (horizon < 2) { available(plan.snapshot); assert.equal(plan.snapshot.cashBalance, horizon * 1e308); }
      else unavailable(plan.snapshot, 'numeric-range-exceeded');
    }
    finiteTree(result);
  });
}
for (const horizon of [0, 1, 600]) {
  counts.boundaryComparisons++;
  probe('adapter-overflow', `finite-input-sum-overflow/H=${horizon}`, () => {
    const result = comparePortfolioAtMonth(book({ debts: [debt('large', Number.MAX_VALUE), debt('small', 1)],
      loc: { limit: 0, balance: 0, apr: 0 } }), horizon);
    for (const plan of result.plans) {
      counts.boundaryAdapterSnapshots++;
      unavailable(plan.snapshot, 'invalid-input'); assert.equal(plan.wealthDifference, null);
    }
    finiteTree(result);
  });
}

for (const [name, result] of groups) console.log(`${name}: ${result.passed} passed, ${result.failed} failed`);
console.log(JSON.stringify({ seed: SEED, finalState: state, randomDraws: draws, testSourceHash, sourceHashes, counts,
  zeroElapsedMilliseconds, elapsedMilliseconds: Number(process.hrtime.bigint() - startedAt) / 1e6,
  passed: [...groups.values()].reduce((sum, value) => sum + value.passed, 0),
  failed: [...groups.values()].reduce((sum, value) => sum + value.failed, 0) }));
