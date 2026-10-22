/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { fixture, componentHarness } = require('./native-dated-test-helpers.cjs');
async function main() {
  const book = fixture(); book.loc.lenderTerms.transactionFeePercent = .01; book.loc.lenderTerms.minimumPayment.value = 50;
  const h = componentHarness('components/portfolio/portfolio-common-month.tsx', { book });
  try {
    await h.render(); await h.edit('Comparison month', '4');
    assert.match(h.text(), /2026-04-30/); assert.match(h.text(), /Modeled fees through this month: \$33\.00/);
    assert.match(h.text(), /235\.93/); assert.match(h.text(), /closed LOC is not reused/);
    console.log('PASS native dated comparison actual horizon, separate fee total and checking-only continuation scope');
    const closed = fixture(); closed.loc.balance = 0; closed.monthlyIncome = 0; closed.monthlyExpenses = 100;
    closed.datedPlan.openingCash = 200; closed.datedPlan.cashReserve = 150;
    closed.datedPlan.cashEvents = [{ id: 'bill', day: 1, kind: 'expense', amount: 100, source: 'loc' }];
    await h.render({ book: closed }); await h.edit('Comparison month', '1');
    assert.match(h.text(), /Cash continuation stops 2026-01-01/); assert.match(h.text(), /Not available/);
    console.log('PASS native dated comparison an unfunded closed-account expense exposes actual failure date without fake cash');
    const old = fixture(); delete old.datedPlan; delete old.loc.lenderTerms;
    await h.render({ book: old });
    assert.doesNotMatch(h.text(), /Modeled fees through|Cash continuation stops|closed LOC is not reused|2026-01-31/);
    console.log('PASS native dated comparison legacy monthly presenter retains its original scope and keys');
  } finally { await h.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
