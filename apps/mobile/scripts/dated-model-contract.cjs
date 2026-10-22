/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), path = require('node:path');
const { root, loader, clone, fixture } = require('./native-dated-test-helpers.cjs');
const load = loader(), api = load(path.join(root, 'lib/mobile-portfolio-model.ts'));
const codec = load(require.resolve('@interestshield/financial-engine/portfolio-book'));
const engine = load(require.resolve('@interestshield/financial-engine/portfolio'));
let cases = 0;
function test(name, run) { cases++; try { run(); console.log('PASS dated model ' + name); } catch (error) { console.error('FAIL dated model ' + name); console.error(error); process.exitCode = 1; } }
test('normal computed basis, actual payoff date and separate exact fees reach the native view', () => {
  const book = fixture(), before = clone(book), result = engine.simulatePortfolio(codec.portfolioBookInputs(book));
  const view = api.buildMobilePortfolioBookView(book);
  assert.deepEqual(clone(view.result), clone(result)); assert.equal(view.forecastBasis.kind, result.forecastBasis.kind);
  assert.equal(result.forecastBasis.kind, 'lender-dated'); assert.equal(result.isPayoffPossible, true);
  assert.match(view.payoffLabel, new RegExp(result.payoffDate));
  assert.equal(view.feeLabel, api.formatMobileDatedAmount(result.totalFees));
  assert.equal(view.interestLabel, api.formatMobileDatedAmount(result.totalInterest)); assert.notEqual(view.feeLabel, view.interestLabel);
  assert.deepEqual(book, before);
});
test('invalid schedule receives the normal result review basis, not a second terms-only assessment', () => {
  const book = fixture(); book.monthlyIncome++;
  const view = api.buildMobilePortfolioBookView(book);
  assert.equal(view.forecastBasis, view.result.forecastBasis); assert.equal(view.forecastBasis.canProject, false);
  assert.match(view.forecastBasis.reasons.join(' '), /totals/i); assert.equal(view.feeLabel, 'Not projected');
  assert.equal(view.state, 'review'); assert.equal(view.interestLabel, 'Not projected');
});
test('failed dated policy retains actual diagnostic dates but never supplies payoff or zero fee claims', () => {
  const book = fixture(); book.loc.limit = 1000; book.datedPlan.cashEvents.reverse();
  const view = api.buildMobilePortfolioBookView(book);
  assert.equal(view.state, 'review'); assert.equal(view.payoffLabel, 'Review inputs'); assert.equal(view.feeLabel, 'Not projected');
  assert.equal(view.result.datedLedger.failure.date, book.datedPlan.startDate); assert.equal(view.result.payoffDate, undefined);
});
test('legacy scenario copy refuses dated extensions rather than silently dropping them', () => {
  const input = load(require.resolve('@interestshield/financial-engine')).defaultMobileDashboardInput;
  for (const datedPlan of [null, fixture().datedPlan]) assert.throws(() => api.copyMobileScenarioToPortfolio({ ...input, datedPlan }, 'new-id'), /dated|legacy|scenario/i);
});
test('dated amounts keep cents without changing legacy currency formatting', () => {
  assert.equal(typeof api.formatMobileDatedAmount, 'function');
  assert.equal(api.formatMobileDatedAmount(19.44), '$19.44'); assert.equal(api.formatMobileDatedAmount(0.01), '$0.01');
});
test('native view forwards detached plan and ordered event copies to normal simulation', () => {
  const book = fixture(), result = engine.simulatePortfolio(codec.portfolioBookInputs(book)); let captured;
  const probe = loader({ '@interestshield/financial-engine/portfolio': { simulatePortfolio: input => { captured = input; return result; } } })(path.join(root, 'lib/mobile-portfolio-model.ts'));
  probe.buildMobilePortfolioBookView(book); assert.deepEqual(clone(captured.datedPlan), book.datedPlan);
  assert.notEqual(captured.datedPlan, book.datedPlan); assert.notEqual(captured.datedPlan.cashEvents, book.datedPlan.cashEvents);
  captured.datedPlan.cashEvents[0].amount = 1; assert.equal(book.datedPlan.cashEvents[0].amount, 500);
});
console.log(`${cases} native dated model contracts ${process.exitCode ? 'failed' : 'passed'}. Normal engine entry point, no independent math claim.`);
