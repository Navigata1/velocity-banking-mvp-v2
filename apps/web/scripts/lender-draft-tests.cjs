/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '../../../packages/financial-engine/src'), cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const loaded = { exports: {} }; cache.set(name, loaded);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, name + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { module: loaded, exports: loaded.exports, console, require: id => load(id.slice(2)) });
  return loaded.exports;
}
const api = load('lender-terms-draft'), plain = value => JSON.parse(JSON.stringify(value));
function runLenderDraftTests() {
  let cases = 0, failures = 0;
  function test(name, fn) { cases++; try { fn(); console.log('PASS lender draft ' + name); }
    catch (error) { failures++; console.error('FAIL lender draft ' + name + ': ' + error.message); } }
  test('blank fields stay absent instead of acquiring zero fees or fabricated periods', () => {
    const draft = api.createLenderTermsDraft();
    assert.equal(draft.annualFee, ''); assert.equal(draft.rateMode, '');
    assert.deepEqual(plain(api.readLenderTermsDraft(draft)), {});
  });
  test('all zero, partial nested and source-only profiles round-trip with no aliases', () => {
    for (const value of [{}, { minimumPayment: {} }, { sources: {} }, { sources: { annualFee: 'lender-document' } },
      { annualFee: 0, transactionFeePercent: 0, minimumDraw: 0, minimumPayment: { value: 0 } },
      { minimumPayment: { mode: 'interest-only' }, sources: { minimumPayment: 'model-default' } }]) {
      const draft = api.createLenderTermsDraft(value), result = api.readLenderTermsDraft(draft, value);
      assert.deepEqual(plain(result), value); assert.notEqual(draft.sources, value.sources);
    }
  });
  test('unchanged IEEE values preserve exact inputs, including large and tiny percentages', () => {
    const value = { annualFee: 100000000.125, transactionFeePercent: .07000000000000002, minimumDraw: .000000000001,
      drawPeriodMonths: 120, repaymentPeriodMonths: 180, rateMode: 'variable',
      minimumPayment: { mode: 'percent-of-balance', value: .020000000000000004 }, sources: { minimumPayment: 'lender-document' } };
    assert.deepEqual(plain(api.readLenderTermsDraft(api.createLenderTermsDraft(value), value)), value);
  });
  test('new percentage drafts use decimal fractions while periods remain positive safe integers', () => {
    const draft = api.createLenderTermsDraft(); draft.transactionFeePercent = '1.25';
    draft.minimumPaymentMode = 'percent-of-balance'; draft.minimumPaymentValue = '2.5';
    draft.drawPeriodMonths = '120'; draft.repaymentPeriodMonths = '180';
    assert.deepEqual(plain(api.readLenderTermsDraft(draft)), { transactionFeePercent: .0125,
      drawPeriodMonths: 120, repaymentPeriodMonths: 180, minimumPayment: { mode: 'percent-of-balance', value: .025 } });
  });
  test('invalid numerals, fractional periods, precision loss and impossible minimum percentages reject', () => {
    for (const [field, value] of [['annualFee', '-1'], ['annualFee', 'Infinity'], ['annualFee', '0.1234567890123456789'],
      ['drawPeriodMonths', '0'], ['drawPeriodMonths', '1.5'], ['repaymentPeriodMonths', '9007199254740992']]) {
      const draft = api.createLenderTermsDraft(); draft[field] = value; assert.throws(() => api.readLenderTermsDraft(draft));
    }
    const draft = api.createLenderTermsDraft(); draft.minimumPaymentMode = 'percent-of-balance'; draft.minimumPaymentValue = '101';
    assert.throws(() => api.readLenderTermsDraft(draft));
  });
  test('clearing a numeric field removes it without manufacturing zero, provenance choices remain explicit', () => {
    const value = { annualFee: 50, sources: { annualFee: 'lender-document' } }, draft = api.createLenderTermsDraft(value);
    draft.annualFee = ''; draft.sources.annualFee = '';
    assert.deepEqual(plain(api.readLenderTermsDraft(draft, value)), { sources: {} });
    draft.sources.annualFee = 'user-provided';
    assert.deepEqual(plain(api.readLenderTermsDraft(draft, value)), { sources: { annualFee: 'user-provided' } });
  });
  console.log(`${cases} lender draft groups, ${failures} failed.`);
  if (failures) throw new Error(`${failures} lender draft groups failed.`);
  return cases;
}
module.exports = { runLenderDraftTests };
if (require.main === module) runLenderDraftTests();
