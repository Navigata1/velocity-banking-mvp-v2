/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), path = require('node:path');
const { root, loader, clone, fixture, componentHarness } = require('./native-dated-test-helpers.cjs');
const load = loader(), engine = load(require.resolve('@interestshield/financial-engine/portfolio'));
const codec = load(require.resolve('@interestshield/financial-engine/portfolio-book'));
const resultFor = book => engine.simulatePortfolio(codec.portfolioBookInputs(book));
let cases = 0;
async function test(name, action) { cases++; try { await action(); console.log('PASS dated UI ' + name); } catch (error) { console.error('FAIL dated UI ' + name); console.error(error); process.exitCode = 1; } }
const editor = (props = {}) => componentHarness('components/portfolio/portfolio-dated-plan.tsx', { onSave: async () => {}, ...props });
async function main() {
  await test('optional editor is collapsed and new dates and events are blank', async () => {
    const h = editor(); try {
      await h.render(); assert.equal(h.inputs.size, 0); await h.press('Dated plan');
      for (const label of ['Plan start date', 'Account opened on', 'Draw ends on', 'Matures on', 'First annual fee date', 'Opening cash', 'Cash reserve']) assert.equal(h.input(label).value, '');
      assert.equal([...h.inputs.values()].some(p => /Entry/.test(p.accessibilityLabel)), false);
      await h.press('Save dated plan'); assert.match(h.text(), /date|number|amount/i);
    } finally { await h.close(); }
  });
  await test('complete blank form saves only explicitly entered dates, cash and ordered entries', async () => {
    const saves = [], h = editor({ onSave: async value => { saves.push(clone(value)); } });
    try {
      await h.render(); await h.press('Dated plan');
      const fields = { 'Plan start date': '2026-01-01', 'Account opened on': '2020-01-01', 'Draw ends on': '2030-01-01',
        'Matures on': '2045-01-01', 'First annual fee date': '2026-01-01', 'Opening cash': '0', 'Cash reserve': '0',
        'Opening statement minimum': '0', 'LOC minimum due day': '15', 'Other debt payment day': '15' };
      for (const [label, value] of Object.entries(fields)) await h.edit(label, value);
      await h.press('Add income'); await h.edit('Entry 1 day', '1'); await h.edit('Entry 1 amount', '500');
      await h.press('Add expense'); await h.edit('Entry 2 day', '1'); await h.edit('Entry 2 amount', '200'); await h.choose('Entry 2 source', 'LOC');
      assert.equal(saves.length, 0); await h.press('Save dated plan'); assert.equal(saves.length, 1);
      const plan = fixture().datedPlan; assert.deepEqual({ ...saves[0], cashEvents: [] }, { ...plan, cashEvents: [] });
      assert.deepEqual(saves[0].cashEvents.map(({ id, ...event }) => event), plan.cashEvents.map(({ id, ...event }) => event));
    } finally { await h.close(); }
  });
  await test('invalid dates, money and incomplete entries remain drafts without saving', async () => {
    const saves = [], h = editor({ plan: fixture().datedPlan, onSave: async value => { saves.push(clone(value)); } });
    try {
      await h.render(); await h.press('Dated plan'); await h.edit('Plan start date', '2026-02-30'); await h.press('Save dated plan');
      assert.equal(saves.length, 0); assert.equal(h.input('Plan start date').value, '2026-02-30');
      await h.edit('Plan start date', '2026-01-01'); await h.edit('Opening cash', '0.001'); await h.press('Save dated plan'); assert.equal(saves.length, 0);
      await h.edit('Opening cash', '0'); await h.press('Add expense'); await h.edit('Entry 3 day', '31'); await h.edit('Entry 3 amount', '10');
      await h.press('Save dated plan'); assert.equal(saves.length, 0); assert.match(h.text(), /source|routing/i);
      await h.choose('Entry 3 source', 'Checking'); await h.press('Save dated plan'); assert.equal(saves.length, 1);
      assert.equal(saves[0].cashEvents[2].source, 'checking');
    } finally { await h.close(); }
  });
  await test('ordered same-day entries can move and be removed without sorting or guessing amounts', async () => {
    const saves = [], h = editor({ plan: fixture().datedPlan, onSave: async value => { saves.push(clone(value)); } });
    try {
      await h.render(); await h.press('Dated plan'); await h.press('Move entry 2 earlier'); await h.press('Save dated plan');
      assert.deepEqual(saves[0].cashEvents.map(e => e.id), ['bill', 'pay']);
      await h.press('Remove entry 1'); await h.press('Add income');
      assert.equal(h.input('Entry 2 day').value, ''); assert.equal(h.input('Entry 2 amount').value, '');
      await h.edit('Entry 2 day', '2'); await h.edit('Entry 2 amount', '1'); await h.press('Save dated plan');
      assert.equal(saves[1].cashEvents[0].id, 'pay'); assert.equal('source' in saves[1].cashEvents[1], false);
    } finally { await h.close(); }
  });
  await test('pending and failed publication preserve drafts and block duplicate save and clear', async () => {
    let release, fail = true; const gate = new Promise(r => { release = r; }), saves = [];
    const h = editor({ plan: fixture().datedPlan, onSave: async value => { saves.push(value); await gate; if (fail) throw new Error('durable write failed'); } });
    try {
      await h.render(); await h.press('Dated plan'); await h.edit('Opening cash', '12.34');
      const staleSave = h.control('Save dated plan').onPress, staleClear = h.control('Remove dated plan').onPress; let pending;
      await h.React.act(async () => { pending = staleSave(); });
      assert.equal(h.control('Dated plan').disabled, true, 'cannot collapse and lose a pending draft');
      await h.React.act(async () => { await staleSave(); await staleClear(); }); assert.equal(saves.length, 1);
      await h.React.act(async () => { release(); await pending; });
      assert.match(h.text(), /durable write failed/); assert.equal(h.input('Opening cash').value, '12.34');
      fail = false; await h.press('Save dated plan'); assert.equal(saves.length, 2);
      await h.press('Remove dated plan'); assert.equal(saves[2], null);
    } finally { release(); await h.close(); }
  });
  await test('disabled, imported and unmounted forms reject retained callbacks', async () => {
    const saves = [], h = editor({ plan: fixture().datedPlan, onSave: async value => { saves.push(value); } });
    try {
      await h.render(); await h.press('Dated plan'); const stale = h.control('Save dated plan').onPress;
      await h.render({ disabled: true }); await h.React.act(async () => { await stale(); }); assert.equal(saves.length, 0);
      await h.render({ disabled: false, plan: { ...fixture().datedPlan, openingCash: 99 } });
      await h.React.act(async () => { await stale(); }); assert.equal(saves.length, 0);
      const latest = h.control('Remove dated plan').onPress; await h.close(); await h.React.act(async () => { await latest(); }); assert.equal(saves.length, 0);
    } finally { await h.close(); }
  });
  await test('lender section uses computed dated basis instead of raw terms-only review', async () => {
    const book = fixture(), result = resultFor(book), h = componentHarness('components/portfolio/portfolio-lender-terms.tsx', {
      terms: book.loc.lenderTerms, basis: result.forecastBasis, onSave: async () => {},
    });
    try { await h.render(); assert.match(h.text(), /Declared dated estimate/); assert.doesNotMatch(h.text(), /these terms are not enforced|Terms not modeled/); }
    finally { await h.close(); }
  });
  await test('daily ledger shows actual dates, fee postings, minimum due and separate cent values', async () => {
    const result = resultFor(fixture()), h = componentHarness('components/portfolio/portfolio-dated-ledger.tsx', { result });
    try {
      await h.render(); assert.match(h.text(), /2026-01-01/); assert.match(h.text(), new RegExp(result.payoffDate));
      assert.match(h.text(), /Interest balance|Accrual balance/); assert.match(h.text(), /Minimum|minimum/);
      await h.press('Dated ledger view Postings'); assert.match(h.text(), /Annual fee/); assert.match(h.text(), /\$25\.00/);
      assert.ok(h.control('Next ledger month')); await h.press('Next ledger month'); assert.match(h.text(), /2026-02/);
    } finally { await h.close(); }
  });
  await test('failed daily ledger exposes dated failure and no payoff while an absent ledger stays absent', async () => {
    const book = fixture(); book.loc.limit = 1000; book.datedPlan.cashEvents.reverse(); const result = resultFor(book);
    const h = componentHarness('components/portfolio/portfolio-dated-ledger.tsx', { result });
    try {
      await h.render(); assert.match(h.text(), /2026-01-01/); assert.match(h.text(), /over|limit/i); assert.doesNotMatch(h.text(), /Payoff.*2026-/);
      delete book.datedPlan; const noLedger = resultFor(book); await h.render({ result: noLedger }); assert.equal(h.text(), '');
    } finally { await h.close(); }
  });
  console.log(`${cases} native dated UI contracts ${process.exitCode ? 'failed' : 'passed'}. CPU null host only.`);
}
const watchdog = setTimeout(() => { console.error('Dated UI timed out'); process.exit(1); }, 20000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
