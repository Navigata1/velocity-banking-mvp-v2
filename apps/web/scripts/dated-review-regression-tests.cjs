/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { datedBookFixture, loadDatedTestModule: load } = require('./dated-codec-tests.cjs');
function runDatedReviewRegressionTests() {
  const run = (book, maxMonths) => load('portfolio').simulatePortfolio({ ...load('portfolio-book').portfolioBookInputs(book), maxMonths });
  const zero = book => { book.loc.apr = 0; book.loc.lenderTerms.annualFee = 0; book.loc.lenderTerms.transactionFeePercent = 0; book.loc.lenderTerms.minimumPayment.value = 0; };
  let count = 0, failed = 0;
  function test(name, fn) { count++; try { fn(); console.log('PASS dated independent finding ' + name); } catch (error) { failed++; console.error('FAIL dated independent finding ' + name + ': ' + error.stack); } }
  test('posted next-cycle minimum is still earmarked after statement cut-off', () => {
    for (const strategy of ['snowball', 'avalanche']) {
      const b = datedBookFixture(); zero(b); b.strategy = strategy; b.loc.balance = 1000; b.loc.lenderTerms.minimumPayment.value = 50;
      b.monthlyIncome = 100; b.monthlyExpenses = 0;
      b.datedPlan.minimumDueDay = 15; b.datedPlan.debtPaymentDay = 25;
      b.datedPlan.cashEvents = [{ id: 'pay', day: 20, kind: 'income', amount: 100 }];
      b.debts = [{ id: 'small', name: 'Small loan', category: 'auto', kind: 'amortized', balance: 200, apr: strategy === 'avalanche' ? .00000001 : 0,
        minPaymentRule: { type: 'fixed', amount: 0 }, paymentSource: 'checking' }];
      const r = run(b, 2); assert.equal(r.monthResults.length, 2); assert.equal(r.monthResults[0].payments.small, 50);
      assert.equal(r.monthResults[0].cashBalance, 50); assert.equal(r.monthResults[0].balances.small, 150);
      assert.ok(r.datedLedger.events.some(event => event.date === '2026-02-15' && event.kind === 'loc-minimum' && event.amount === 50));
    }
  });
  test('decimal monthly draws and repayments are exact-cent outputs', () => {
    const b = datedBookFixture(); zero(b); b.loc.balance = 1; b.monthlyIncome = .3; b.monthlyExpenses = .3;
    b.datedPlan.cashEvents = [{ id: 'i1', day: 1, kind: 'income', amount: .1 }, { id: 'i2', day: 1, kind: 'income', amount: .2 },
      { id: 'e1', day: 1, kind: 'expense', amount: .1, source: 'loc' }, { id: 'e2', day: 1, kind: 'expense', amount: .2, source: 'loc' }];
    const row = run(b, 1).monthResults[0]; assert.equal(row.locDraw, .3); assert.equal(row.locPayment, .3);
  });
  test('a LOC repayment can discharge its own bill before a same-day capacity-sensitive expense', () => {
    const b = datedBookFixture(); zero(b); b.loc.balance = 600; b.loc.limit = 600; b.loc.lenderTerms.minimumPayment.value = 50;
    b.datedPlan.openingMinimumPayment = 50; b.monthlyIncome = 500; b.monthlyExpenses = 500;
    b.datedPlan.cashEvents = [{ id: 'income', day: 1, kind: 'income', amount: 500 }, { id: 'expense', day: 1, kind: 'expense', amount: 500, source: 'loc' }];
    const r = run(b, 1); assert.equal(r.monthResults.length, 1); assert.equal(r.monthResults[0].locBalance, 600); assert.equal(r.monthResults[0].cashBalance, 0);
    const payment = r.datedLedger.events.find(event => event.kind === 'loc-payment'); assert.equal(payment.amount, 500); assert.equal(payment.minimumOutstanding, 0);
  });
  test('direct LOC-first extra can credit the newly posted statement instead of holding its own payment', () => {
    for (const strategy of ['snowball','avalanche']) {
      const b = datedBookFixture(); zero(b); b.strategy = strategy; b.loc.balance = 1000; b.loc.lenderTerms.minimumPayment.value = 50;
      b.monthlyIncome = 100; b.monthlyExpenses = 0; b.datedPlan.cashEvents = [{ id: 'income', day: 20, kind: 'income', amount: 100 }];
      const r = run(b, 1); assert.equal(r.monthResults[0].locBalance, 900); assert.equal(r.monthResults[0].cashBalance, 0);
      assert.equal(r.datedLedger.daily.at(-1).minimumOutstanding, 0);
    }
  });
  test('normal common-month wealth differences use literal cents', () => {
    const b = datedBookFixture(); zero(b); b.loc.balance = 10; b.loc.apr = .365; b.monthlyIncome = 1; b.monthlyExpenses = 0;
    b.datedPlan.cashEvents = [{ id: 'pay', day: 1, kind: 'income', amount: 1 }];
    const c = load('portfolio-common-month').comparePortfolioAtMonth(b, 1);
    assert.equal(c.plans[0].snapshot.locBalance, 9.28); assert.equal(c.plans[0].wealthDifference, 0);
    for (const p of c.plans.slice(1)) { assert.equal(p.snapshot.locBalance, 9.31); assert.equal(p.wealthDifference, -.03); }
  });
  assert.equal(failed, 0, `${failed}/${count} dated independent findings failed`); console.log(count + ' dated independent finding groups passed.');
}
module.exports = { runDatedReviewRegressionTests }; if (require.main === module) runDatedReviewRegressionTests();
