/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { datedBookFixture, loadDatedTestModule: load } = require('./dated-codec-tests.cjs');
function runDatedFeeUnitTests() {
  const drafts = load('lender-terms-draft'), codec = load('portfolio-book'), engine = load('portfolio');
  function entered(percent) {
    const b = datedBookFixture(), d = drafts.createLenderTermsDraft(b.loc.lenderTerms); d.transactionFeePercent = percent;
    b.loc.lenderTerms = drafts.readLenderTermsDraft(d, b.loc.lenderTerms); return b;
  }
  const run = b => engine.simulatePortfolio({ ...codec.portfolioBookInputs(b), maxMonths: 1 });
  let count = 0, failed = 0;
  function test(name, fn) { count++; try { fn(); console.log('PASS dated fee units ' + name); } catch (error) { failed++; console.error('FAIL dated fee units ' + name + ': ' + error.stack); } }
  test('actual one-percent lender editor reaches the normal dated ledger once, not divided twice', () => {
    const b = entered('1'); assert.equal(b.loc.lenderTerms.transactionFeePercent, .01);
    const encoded = codec.encodePortfolioDocument(b), decoded = codec.decodePortfolioDocument(encoded);
    assert.equal(decoded.loc.lenderTerms.transactionFeePercent, .01);
    const r = run(decoded); assert.equal(r.monthResults[0].locFees, 27); assert.equal(r.monthResults[0].locInterest, 19.44);
    assert.equal(r.monthResults[0].locBalance, 646.44); assert.equal(r.datedLedger.events.find(e => e.kind === 'draw-fee').amount, 2);
  });
  test('1.25 percent preserves the existing fractional .0125 contract and exact 2.50 draw fee', () => {
    const b = entered('1.25'); assert.equal(b.loc.lenderTerms.transactionFeePercent, .0125);
    const r = run(b); assert.equal(r.monthResults[0].locFees, 27.5); assert.equal(r.monthResults[0].locInterest, 19.45);
    assert.equal(r.monthResults[0].locBalance, 646.95); assert.equal(r.datedLedger.events.find(e => e.kind === 'draw-fee').amount, 2.5);
  });
  test('half-percent one-dollar draw rounds half a cent before an atomic capacity check', () => {
    const b = entered('0.5'); assert.equal(b.loc.lenderTerms.transactionFeePercent, .005);
    const loc = { ...b.loc, balance: 0, limit: 1, apr: 0, lenderTerms: { ...b.loc.lenderTerms, annualFee: 0 } };
    const a = new (load('dated-loc').DatedLOCAccount)(loc, b.datedPlan); a.startDay('2026-01-01');
    assert.throws(() => a.spend(100n, 'loc'), error => error.code === 'loc-projection-overlimit' && error.attemptedBalance === 1.01);
    assert.equal(a.position.locCents, 0n); assert.equal(a.position.totalFeesCents, 0n);
  });
  test('an unchanged old3 fractional fee retains bytes and gains no new unit conversion at adoption', () => {
    const b = entered('1.25'), plan = b.datedPlan; delete b.datedPlan;
    const raw = codec.encodePortfolioDocument(b, 3), decoded = codec.decodePortfolioDocument(raw);
    assert.equal(codec.encodePortfolioDocument(decoded, 3), raw);
    assert.equal(drafts.createLenderTermsDraft(decoded.loc.lenderTerms).transactionFeePercent, '1.25');
    const result = run({ ...decoded, datedPlan: plan }); assert.equal(result.monthResults[0].locFees, 27.5);
    assert.equal(codec.encodePortfolioDocument(decoded, 3), raw);
  });
  test('stored one is a 100-percent fee, not an alternative encoding for one percent', () => {
    const b = entered('100'); assert.equal(b.loc.lenderTerms.transactionFeePercent, 1);
    const r = run(b); assert.equal(r.monthResults[0].locFees, 225); assert.equal(r.monthResults[0].locInterest, 25.58);
    assert.equal(r.monthResults[0].locBalance, 850.58); assert.equal(r.datedLedger.events.find(e => e.kind === 'draw-fee').amount, 200);
  });
  assert.equal(failed, 0, `${failed}/${count} dated fee-unit groups failed`); console.log(count + ' dated fee-unit groups passed.');
}
module.exports = { runDatedFeeUnitTests }; if (require.main === module) runDatedFeeUnitTests();
