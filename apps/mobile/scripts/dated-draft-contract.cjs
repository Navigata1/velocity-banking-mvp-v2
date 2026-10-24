/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), path = require('node:path');
const { root, loader, clone, fixture } = require('./native-dated-test-helpers.cjs');
const api = loader()(path.join(root, 'lib/mobile-dated-plan-draft.ts'));
let cases = 0;
function call(name, ...args) { assert.equal(typeof api[name], 'function', `${name} must validate actual native drafts`); return api[name](...args); }
function test(name, run) { cases++; try { run(); console.log('PASS dated draft ' + name); } catch (error) { console.error('FAIL dated draft ' + name); console.error(error); process.exitCode = 1; } }
test('new optional plan has no inferred dates, zeroes or monthly events', () => {
  const draft = call('createMobileDatedPlanDraft');
  for (const [key, value] of Object.entries(draft)) assert.deepEqual(clone(value), key === 'cashEvents' ? [] : '', key);
  assert.throws(() => call('readMobileDatedPlanDraft', draft));
});
test('saved drafts round trip through the strict codec with detached ordered entries', () => {
  const plan = fixture().datedPlan, draft = call('createMobileDatedPlanDraft', plan);
  assert.deepEqual(clone(call('readMobileDatedPlanDraft', draft)), plan);
  draft.cashEvents.reverse(); draft.cashEvents[0].amount = '200.01';
  const saved = call('readMobileDatedPlanDraft', draft);
  assert.equal(saved.cashEvents[0].id, 'bill'); assert.equal(saved.cashEvents[0].amount, 200.01);
  assert.equal(plan.cashEvents[0].id, 'pay');
});
test('invalid dates, precision, empty drafts, exponent notation and nonwhole days do not silently coerce', () => {
  const plan = fixture().datedPlan;
  for (const [key, value] of [['startDate', '2026-02-30'], ['startDate', '2026-01-02'], ['drawEndsOn', ''],
    ['openingCash', ''], ['openingCash', '0.001'], ['openingCash', '1e2'], ['cashReserve', '-1'], ['minimumDueDay', '1.5'], ['debtPaymentDay', '32']]) {
    const draft = call('createMobileDatedPlanDraft', plan); draft[key] = value;
    assert.throws(() => call('readMobileDatedPlanDraft', draft), undefined, key + '=' + value);
    assert.equal(draft[key], value, 'invalid draft remains editable');
  }
});
test('expense routing is explicit and income cannot retain a source', () => {
  const draft = call('createMobileDatedPlanDraft', fixture().datedPlan);
  draft.cashEvents[1].source = ''; assert.throws(() => call('readMobileDatedPlanDraft', draft));
  draft.cashEvents[1].source = 'checking'; draft.cashEvents[0].source = 'loc';
  assert.throws(() => call('readMobileDatedPlanDraft', draft));
});
console.log(`${cases} native dated draft contracts ${process.exitCode ? 'failed' : 'passed'}.`);
