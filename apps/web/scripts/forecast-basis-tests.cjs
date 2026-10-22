/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const vm = require('node:vm'), ts = require('typescript'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../src'), engine = path.resolve(__dirname, '../../../packages/financial-engine/src'), cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const loaded = { exports: {} }; cache.set(file, loaded);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { module: loaded, exports: loaded.exports, console, require: id => {
    if (id.startsWith('@interestshield/')) return load(fs.realpathSync(require.resolve(id)));
    if (id.startsWith('@/')) return load(path.resolve(root, id.slice(2) + '.ts'));
    if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id + '.ts'));
    return require(id);
  } }, { filename: file }); return loaded.exports;
}
const api = load(path.join(engine, 'index.ts')), portfolio = load(path.join(engine, 'portfolio.ts'));
const codec = load(path.join(engine, 'portfolio-book.ts')), common = load(path.join(engine, 'portfolio-common-month.ts'));
const web = load(path.join(root, 'engine/calculations.ts')), payoff = load(path.join(root, 'engine/portfolio-payoff-model.ts'));
const mobile = load(path.resolve(__dirname, '../../mobile/lib/mobile-portfolio-model.ts'));
const plain = value => JSON.parse(JSON.stringify(value));
const completeTerms = () => ({ annualFee: 0, transactionFeePercent: 0, rateMode: 'fixed', drawPeriodMonths: 120,
  repaymentPeriodMonths: 180, minimumDraw: 0, minimumPayment: { mode: 'fixed', value: 50 },
  sources: Object.fromEntries(['annualFee','transactionFeePercent','rateMode','drawPeriodMonths','repaymentPeriodMonths','minimumDraw','minimumPayment'].map(key => [key, 'lender-document'])) });
const book = terms => ({ monthlyIncome: 8200, monthlyExpenses: 4700, extraMonthlyPayment: 0, chunkAmount: 1000,
  loc: { limit: 25000, balance: 3200, apr: .085, ...(terms === undefined ? {} : { lenderTerms: terms }) },
  strategy: 'velocity', focusMode: 'single', splitRatioPrimary: .7, debts: [{ id: 'a', name: 'Auto', category: 'auto',
    kind: 'amortized', balance: 18450, apr: .069, minPaymentRule: { type: 'fixed', amount: 425 }, paymentSource: 'checking' }] });
const loopInput = terms => ({ principalBalance: 18450, debtApr: .069, debtPayment: 425, loc: book(terms).loc,
  chunkAmount: 1000, cashFlowPaydown: 3075, locDepositAmount: 8200, locExpenseAmount: 5125 });
function runForecastBasisTests() {
  let cases = 0, failures = 0;
  function test(name, fn) { cases++; try { fn(); console.log('PASS forecast basis ' + name); }
    catch (error) { failures++; console.error('FAIL forecast basis ' + name + ': ' + error.message); } }
  test('absence is explicitly educational and never lender approval', () => {
    assert.equal(typeof api.assessForecastBasis, 'function');
    const basis = api.assessForecastBasis();
    assert.equal(basis.kind, 'educational-monthly'); assert.equal(basis.label, 'Model estimate');
    assert.equal(basis.canProject, true); assert.equal('lenderTerms' in basis, false);
  });
  test('partial, complete and document-sourced profiles distinguish completeness from model support', () => {
    assert.equal(typeof api.assessForecastBasis, 'function');
    for (const terms of [{}, { annualFee: 0 }, completeTerms()]) {
      const before = JSON.stringify(terms), basis = api.assessForecastBasis(terms);
      assert.equal(basis.kind, 'lender-review'); assert.equal(basis.canProject, false);
      assert.equal(basis.reason, basis.lenderTerms.inputComplete ? 'lender-terms-unmodeled' : 'lender-terms-incomplete');
      assert.equal(basis.label, basis.lenderTerms.inputComplete ? 'Terms not modeled' : 'Terms incomplete');
      assert.ok(basis.reasons.length > 0); assert.equal(JSON.stringify(terms), before);
    }
  });
  test('invalid supplied terms cannot disappear into an educational basis', () => {
    assert.equal(typeof api.assessForecastBasis, 'function'); api.assessForecastBasis();
    for (const terms of [null, [], { annualFee: '0' }, { projectionReady: true }, { minimumPayment: { mode: 'invented' } }]) {
      assert.throws(() => api.assessForecastBasis(terms));
    }
  });
  test('all normal direct policies refuse unsupported terms without publishing monthly rows', () => {
    for (const terms of [{}, completeTerms()]) for (const strategy of ['debt-first','snowball','avalanche']) {
      const result = api.simulateDirectRepayment({ ...loopInput(terms), monthlyBudget: 3500, strategy });
      assert.equal(result.isPayoffPossible, false); assert.equal(result.forecastBasis.canProject, false);
      assert.equal(result.monthlyData.length, 0); assert.match(result.failureReason, /^lender-terms-/);
    }
  });
  test('Money Loop normal payoff refuses unsupported profiles before any modeled ledger', () => {
    for (const terms of [{ annualFee: 0 }, completeTerms()]) {
      const result = api.simulateMoneyLoopPayoff(loopInput(terms));
      assert.equal(result.isPayoffPossible, false); assert.equal(result.monthlyData.length, 0);
      assert.equal(result.forecastBasis.canProject, false); assert.match(result.failureReason, /^lender-terms-/);
    }
  });
  test('low-level Money Loop month cannot silently ignore a supplied lender profile', () => {
    const input = { ...loopInput({ annualFee: 0 }), month: 1, debtBalance: 18450, locBalance: 3200, monthsSinceChunk: 0 };
    assert.throws(() => api.simulateMoneyLoopMonth(input), /terms|modeled/i);
  });
  test('every Portfolio policy enters review, without a fabricated target or payoff ledger', () => {
    for (const terms of [{ annualFee: 0 }, completeTerms()]) for (const strategy of ['velocity','snowball','avalanche']) {
      const input = codec.portfolioBookInputs({ ...book(terms), strategy }), before = JSON.stringify(input);
      const result = portfolio.simulatePortfolio(input);
      assert.equal(result.isPayoffPossible, false); assert.equal(result.forecastBasis.canProject, false);
      assert.equal(result.monthResults.length, 0); assert.equal(result.moneyLoopMonthlyData.length, 0);
      assert.equal(result.primaryTargetName, undefined); assert.deepEqual(plain(result.debtRationales), {});
      assert.match(result.failureReason, /^lender-terms-/); assert.equal(JSON.stringify(input), before);
    }
  });
  test('common-month future values and payoff presenters remain unavailable, observed month0 remains inspectable', () => {
    const value = book(completeTerms()), observed = common.comparePortfolioAtMonth(value, 0);
    assert.ok(observed.plans.every(plan => plan.snapshot.status === 'initial'));
    const future = common.comparePortfolioAtMonth(value, 12);
    assert.ok(future.plans.every(plan => plan.snapshot.status === 'unavailable' && plan.wealthDifference === null));
    assert.equal(future.forecastBasis.canProject, false);
    const model = payoff.buildPortfolioPayoffModel(value);
    assert.ok(model.plans.every(plan => plan.state === 'review' && plan.payoffMonths === null && plan.totalInterest === null));
    assert.equal(model.forecastBasis.label, 'Terms not modeled');
    const native = mobile.buildMobilePortfolioBookView(value);
    assert.equal(native.state, 'review'); assert.equal(native.interestLabel, 'Not projected');
  });
  test('mortgage comparison cannot publish savings or accepted policies by stripping terms', () => {
    const result = api.compareMortgageRepayment({ ...loopInput(completeTerms()), monthlyIncome: 8200, monthlyExpenses: 4700 });
    assert.equal(result.forecastBasis.canProject, false);
    for (const plan of [result.standard,result.biweekly,result.extraPayment,result.velocity]) assert.equal(plan.isPayoffPossible, false);
    for (const plan of [result.biweekly,result.extraPayment,result.velocity]) { assert.equal(plan.canCompare, false); assert.equal(plan.saved, 0); }
  });
  test('normal web comparison and multi-debt entry points preserve review instead of stripping supplied terms', () => {
    const input = { monthlyIncome: 8200, monthlyExpenses: 4700, carLoan: { balance: 18450, apr: .069, monthlyPayment: 425 },
      loc: book(completeTerms()).loc, useVelocity: true, extraPayment: 1000 };
    assert.ok(web.compareSingleDebtStrategies(input).every(plan => !plan.isPayoffPossible && /^lender-terms-/.test(plan.failureReason)));
    for (const strategy of ['velocity','snowball','avalanche']) {
      const result = web.simulateMultiDebt([{ id: 'a', name: 'Auto', type: 'auto', ...input.carLoan, termMonths: 48 }], 8200, 4700, input.loc, strategy);
      assert.equal(result.isPayoffPossible, false); assert.equal(result.freedomDate, null); assert.equal(result.totalInterestSaved, 0);
      assert.match(result.failureReason, /^lender-terms-/);
    }
    assert.equal(web.simulateBaseline(input).isPayoffPossible, false);
    assert.throws(() => web.comparePaymentStrategies(18450, .069, 425, 48, input.loc, 8200, 4700, 1000), /terms|modeled/i);
    assert.ok(web.generateWarnings(8200, 4700, input.loc).some(warning => warning.type === 'lender-terms'));
  });
  test('normal native simulator entry point cannot drop supplied profile metadata', () => {
    const input = { ...api.defaultMobileDashboardInput, loc: book(completeTerms()).loc };
    const result = api.buildMobileSimulatorSnapshot(input);
    assert.ok(result.strategies.every(plan => !plan.isPayoffPossible));
    assert.equal(result.fastestStrategyName, null); assert.match(result.guardrail, /terms|modeled/i);
  });
  test('no-profile educational numerical traces remain byte-identical to pre-integration fixtures', () => {
    const projections = [
      [api.simulateDirectRepayment({ ...loopInput(), monthlyBudget: 3500, strategy: 'avalanche' }), 'monthlyData', 7, 464.17283099556397, '06dbfc4a9fd096887932f149c853377e63d5db3881db31dfc34b13d656e4115f'],
      [api.simulateMoneyLoopPayoff(loopInput()), 'monthlyData', 14, 779.9758112754789, '6670c278a18f120a3b4628c7ea43c4a821f06245c1a94e23e746c8d567ab86f4'],
      [portfolio.simulatePortfolio(codec.portfolioBookInputs(book())), 'monthResults', 14, 779.9758112754789, '4cef2e66d9edc1d218b72a078e04532d9b7e8e67a1b67f6b43668264caddfc21'],
    ];
    for (const [result, rows, months, interest, hash] of projections) {
      assert.equal(result.isPayoffPossible, true); assert.equal(result.payoffMonths, months); assert.equal(result.totalInterest, interest);
      assert.equal(crypto.createHash('sha256').update(JSON.stringify(result[rows])).digest('hex'), hash);
      assert.equal(result.forecastBasis.kind, 'educational-monthly');
    }
  });
  console.log(`${cases} forecast basis groups, ${failures} failed.`);
  if (failures) throw new Error(`${failures} forecast basis groups failed.`);
  return cases;
}
module.exports = { runForecastBasisTests };
if (require.main === module) runForecastBasisTests();
