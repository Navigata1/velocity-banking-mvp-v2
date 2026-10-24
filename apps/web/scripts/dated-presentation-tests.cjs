/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const { datedBookFixture, loadDatedTestModule } = require('./dated-codec-tests.cjs');
const root = path.resolve(__dirname, '../src'), cache = new Map();
function load(relative) {
  if (cache.has(relative)) return cache.get(relative).exports;
  const file = path.join(root, relative), m = { exports: {} }; cache.set(relative, m);
  if (!fs.existsSync(file)) throw new Error('Missing presentation module: ' + relative);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { module: m, exports: m.exports, require: id => id.startsWith('@interestshield/financial-engine/') ? loadDatedTestModule(id.slice('@interestshield/financial-engine/'.length))
      : id === '@interestshield/financial-engine' ? loadDatedTestModule('index') : id.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(file), id + '.ts'))) : require(id), console });
  return m.exports;
}
function runDatedPresentationTests() {
  let count = 0, failures = 0;
  function test(name, fn) { count++; try { fn(); console.log('PASS dated presentation ' + name); } catch (cause) { failures++; console.error('FAIL dated presentation ' + name + ': ' + cause.message); } }
  const model = () => load('engine/portfolio-payoff-model.ts'), drafts = () => load('engine/dated-plan-draft.ts');
  test('own-payoff summary retains actual date and fees separately from interest', () => {
    const plan = model().buildPortfolioPayoffModel(datedBookFixture()).plans[0];
    assert.equal(plan.state, 'projected'); assert.equal(plan.payoffDate, '2026-04-30');
    assert.equal(plan.totalInterest, 31.07); assert.equal(plan.totalFees, 33); assert.equal(plan.endingCash, 235.93);
  });
  test('unavailable dated payoff has no false date or zero fee claim', () => {
    const b = datedBookFixture(); b.datedPlan.cashEvents[0].amount = 499;
    for (const plan of model().buildPortfolioPayoffModel(b).plans) { assert.equal(plan.state, 'review'); assert.equal(plan.payoffMonths, null); assert.equal(plan.payoffDate, undefined); assert.equal(plan.totalFees, undefined); }
  });
  test('no-profile monthly summary never acquires dated-only output keys', () => {
    const b = datedBookFixture(); delete b.datedPlan; delete b.loc.lenderTerms;
    for (const plan of model().buildPortfolioPayoffModel(b).plans) { assert.equal(Object.hasOwn(plan, 'payoffDate'), false); assert.equal(Object.hasOwn(plan, 'totalFees'), false); }
  });
  test('empty editor requires explicit dates, cash and entries instead of inventing them', () => {
    const d = drafts().createDatedPlanDraft(); for (const key of ['startDate','accountOpenedOn','drawEndsOn','maturesOn','annualFeeFirstDueOn','openingCash','cashReserve','openingMinimumPayment','minimumDueDay','debtPaymentDay']) assert.equal(d[key], '');
    assert.equal(d.cashEvents.length, 0); assert.throws(() => drafts().readDatedPlanDraft(d));
  });
  test('unchanged editor preserves exact cents, dates, ids and same-day order', () => {
    const b = datedBookFixture(), before = JSON.stringify(b.datedPlan), d = drafts().createDatedPlanDraft(b.datedPlan);
    assert.equal(JSON.stringify(drafts().readDatedPlanDraft(d)), before); d.cashEvents.reverse(); assert.equal(JSON.stringify(b.datedPlan), before);
  });
  test('invalid numeric drafts are rejected before any saved replacement', () => {
    const original = drafts().createDatedPlanDraft(datedBookFixture().datedPlan);
    for (const value of ['', ' ', '1e2', '-1', 'NaN', '0.001', '1000000001']) assert.throws(() => drafts().readDatedPlanDraft({ ...original, openingCash: value }), value);
    for (const value of ['', '0', '32', '2.5', '1e1']) assert.throws(() => drafts().readDatedPlanDraft({ ...original, minimumDueDay: value }), value);
  });
  test('expense source is explicit and changing kind does not inject income routing', () => {
    const d = drafts().createDatedPlanDraft(datedBookFixture().datedPlan);
    d.cashEvents[1].source = ''; assert.throws(() => drafts().readDatedPlanDraft(d)); d.cashEvents[1].source = 'checking';
    assert.equal(drafts().readDatedPlanDraft(d).cashEvents[1].source, 'checking');
    d.cashEvents[1].kind = 'income'; assert.equal(Object.hasOwn(drafts().readDatedPlanDraft(d).cashEvents[1], 'source'), false);
  });
  assert.equal(failures, 0, `${failures}/${count} dated presentation groups failed`); console.log(count + ' dated presentation groups passed.');
}
module.exports = { runDatedPresentationTests }; if (require.main === module) runDatedPresentationTests();
