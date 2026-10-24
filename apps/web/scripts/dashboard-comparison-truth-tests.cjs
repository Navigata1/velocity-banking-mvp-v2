/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
function registerDashboardComparisonTruthTests({ test, financialStore, dashboardModel, calculations, sharedFinancialEngine, loadTsModule }) {
  const store = financialStore.useFinancialStore;
  const inputs = state => ({ monthlyIncome: state.monthlyIncome, monthlyExpenses: state.monthlyExpenses,
    carLoan: { balance: state.debts.car.balance, apr: state.debts.car.interestRate, monthlyPayment: state.debts.car.minimumPayment },
    loc: { limit: state.loc.limit, balance: state.loc.balance, apr: state.loc.interestRate }, useVelocity: true, extraPayment: state.chunkAmount });
  const model = (state, result) => dashboardModel.buildDashboardModel({ monthlyIncome: state.monthlyIncome,
    monthlyExpenses: state.monthlyExpenses, chunkAmount: state.chunkAmount, activeDebt: state.debts.car,
    allDebts: Object.values(state.debts), loc: state.loc, baseline: {
      months: result.baseline.payoffMonths, totalInterest: result.baseline.totalInterest, isPayoffPossible: result.baseline.isPayoffPossible },
    velocity: { months: result.velocity.payoffMonths, totalInterest: result.velocity.totalInterest,
      isPayoffPossible: result.velocity.isPayoffPossible, savings: result.velocity.interestSaved } });
  test('Dashboard comparison uses equal-budget target plus LOC and retains adverse differences', () => {
    const state = store.getState(), before = JSON.stringify(state), expected = calculations.runSimulation(inputs(state));
    assert.equal(typeof state.getPayoffComparison, 'function', 'guarded comparison getter required');
    const actual = state.getPayoffComparison('car');
    assert.equal(actual.baseline.months, expected.baseline.payoffMonths);
    assert.equal(actual.baseline.totalInterest, expected.baseline.totalInterest);
    assert.equal(actual.velocity.totalInterest, expected.velocity.totalInterest);
    assert.equal(actual.velocity.savings, expected.velocity.interestSaved);
    assert.ok(actual.velocity.savings < 0, 'default model has an adverse difference, not zero savings');
    assert.notEqual(actual.baseline.totalInterest, state.getBaselinePayoff('car').totalInterest);
    assert.equal(JSON.stringify(state), before, 'reading comparison must not mutate stored inputs');
  });
  test('Dashboard comparison rejects a missing target instead of using another debt', () => {
    const state = store.getState(); assert.equal(typeof state.getPayoffComparison, 'function', 'guarded comparison getter required');
    for (const target of ['missing-target', 'toString', '__proto__', 'constructor']) {
      const result = state.getPayoffComparison(target);
      assert.equal(result.baseline.isPayoffPossible, false); assert.equal(result.velocity.isPayoffPossible, false);
    }
  });
  test('Dashboard comparison preserves the blocked legacy source boundary', () => {
    const guard = loadTsModule('src/stores/legacy-scenario-storage.ts').legacyScenarioStorage, original = guard.getStatus;
    assert.equal(typeof store.getState().getPayoffComparison, 'function', 'guarded comparison getter required');
    // Inject only the storage-status port; this is not a managed-storage/browser test.
    try { guard.getStatus = () => ({ blocked: true, error: 'CPU blocked-source control' });
      const result = store.getState().getPayoffComparison('car');
      assert.equal(result.baseline.isPayoffPossible, false); assert.equal(result.velocity.isPayoffPossible, false);
      assert.equal(result.baseline.months, 0); assert.equal(result.velocity.months, 0);
    } finally { guard.getStatus = original; }
  });
  test('Dashboard comparison refuses a valid target inherited from another object', () => {
    const original = store.getState();
    try {
      store.setState({ debts: Object.create(original.debts) });
      const inherited = store.getState(); assert.equal(Object.hasOwn(inherited.debts, 'car'), false);
      const result = inherited.getPayoffComparison('car');
      assert.equal(result.baseline.isPayoffPossible, false, 'inherited target cannot establish a comparison');
      assert.equal(result.velocity.isPayoffPossible, false);
    } finally { store.setState(original); }
  });
  test('Dashboard adverse, lower-interest and equal-interest models all require comparison before a draw', () => {
    const state = store.getState(), projection = calculations.runSimulation(inputs(state));
    assert.equal(projection.baseline.payoffMonths, 7); assert.equal(projection.velocity.payoffMonths, 14);
    for (const [kind, expectedSign] of [['default', -1], ['lower-interest', 1], ['equal', 0]]) {
      const sample = kind === 'default' ? state : { ...state, chunkAmount: 3075,
        debts: { ...state.debts, car: { ...state.debts.car, balance: 10000, interestRate: 0 } },
        loc: { ...state.loc, balance: kind === 'equal' ? 0 : 3200, interestRate: kind === 'equal' ? 0 : 0.085 } };
      const result = calculations.runSimulation(inputs(sample)); assert.equal(Math.sign(result.velocity.interestSaved), expectedSign);
      const actual = model(sample, result);
      assert.equal(actual.nextMove.title, 'Compare payoff paths'); assert.match(actual.nextMove.caption, /same.*budget/i);
      const eta = actual.vitals.find(vital => vital.id === 'debt-free-eta');
      assert.ok(eta.assumptions.some(text => /same.*budget/i.test(text) && /LOC/.test(text)));
      assert.ok(!eta.assumptions.some(text => /target loan only|scope differs/.test(text)));
    }
  });
  test('Dashboard route consumes the guarded comparison rather than minimum-only helpers', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../src/app/page.tsx'), 'utf8');
    assert.ok(source.includes('store.getPayoffComparison(debtType)'));
    assert.ok(!source.includes('store.getBaselinePayoff(debtType)'));
    assert.ok(!source.includes('store.getVelocityPayoff(debtType)'));
  });
  test('Shared adverse, lower-interest and equal-interest coaching is compare-first without changing projections', () => {
    for (const [kind, expectedSign] of [['default', -1], ['lower-interest', 1], ['equal', 0]]) {
      const input = JSON.parse(JSON.stringify(sharedFinancialEngine.defaultMobileDashboardInput));
      if (kind !== 'default') {
        input.activeDebt.balance = 10000; input.activeDebt.apr = 0; input.chunkAmount = 3075;
        input.loc.balance = kind === 'equal' ? 0 : 3200; input.loc.apr = kind === 'equal' ? 0 : 0.085;
      }
      const before = JSON.stringify(input), simulator = sharedFinancialEngine.buildMobileSimulatorSnapshot(input);
      assert.equal(Math.sign(simulator.velocity.interestSaved), expectedSign);
      const dashboard = sharedFinancialEngine.buildMobileDashboardSnapshot(input);
      assert.equal(dashboard.nextMove, 'Compare payoff paths'); assert.equal(dashboard.warning, null);
      assert.equal(dashboard.vitals.find(vital => vital.label === 'Next Move').value, dashboard.nextMove);
      assert.equal(JSON.stringify(input), before);
    }
  });
}
module.exports = { registerDashboardComparisonTruthTests };
