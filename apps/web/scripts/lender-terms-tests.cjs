/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');

function load(file, cache = new Map()) {
  if (cache.has(file)) return cache.get(file).exports;
  const loaded = { exports: {} }; cache.set(file, loaded);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, console,
    require: id => id.startsWith('.') ? load(path.resolve(path.dirname(file), id + '.ts'), cache) : require(id),
  }, { filename: file });
  return loaded.exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const fields = ['annualFee','transactionFeePercent','rateMode','drawPeriodMonths','repaymentPeriodMonths','minimumDraw','minimumPayment'];
const complete = () => ({ annualFee: 75, transactionFeePercent: .01, rateMode: 'variable',
  drawPeriodMonths: 120, repaymentPeriodMonths: 180, minimumDraw: 500,
  minimumPayment: { mode: 'percent-of-balance', value: .02 },
  sources: Object.fromEntries(fields.map(field => [field, 'lender-document'])),
});

function runLenderTermsTests() {
  const engine = load(path.join(root, 'packages/financial-engine/src/index.ts'));
  let count = 0, failures = 0;
  const decode = value => { assert.equal(typeof engine.decodeLenderTerms, 'function', 'lossless lender-term decoder must exist'); return engine.decodeLenderTerms(value); };
  function test(name, fn) { count++; try { fn(); console.log('PASS lender terms ' + name); }
    catch (error) { failures++; console.error('FAIL lender terms ' + name + ': ' + error.message); } }

  test('complete document-sourced values do not establish numerical model support', () => {
    const result = engine.buildLenderTermsContract(complete());
    assert.equal(result.projectionReady, false, 'populated variable rates, fees and minimums are not modeled');
    assert.equal(result.inputComplete, true); assert.equal(result.confidence, 'complete');
    assert.deepEqual(plain(result.unmodeledFields), fields); assert.equal(result.version, '3.0.0');
    assert.ok(result.assumptions.some(note => note.includes('not enforced')));
  });
  test('missing terms are distinct from supplied but unmodeled terms', () => {
    const result = engine.buildLenderTermsContract({});
    assert.equal(result.inputComplete, false); assert.equal(result.projectionReady, false);
    assert.equal(result.confidence, 'incomplete'); assert.deepEqual(plain(result.missingFields), fields);
    assert.deepEqual(plain(result.unmodeledFields), []);
  });
  test('provenance cannot upgrade model support or erase explicit zero costs', () => {
    const input = { annualFee: 0, transactionFeePercent: 0, minimumDraw: 0,
      sources: { annualFee: 'lender-document', transactionFeePercent: 'model-default' } };
    const result = engine.buildLenderTermsContract(decode(input));
    assert.equal(result.inputComplete, false); assert.equal(result.projectionReady, false);
    assert.deepEqual(plain(result.unmodeledFields), ['annualFee','transactionFeePercent','minimumDraw']);
    assert.equal(result.terms.annualFee, 0); assert.equal(result.terms.transactionFeePercent, 0);
    assert.equal(result.sources.annualFee, 'lender-document'); assert.equal(result.sources.minimumDraw, 'user-provided');
  });
  test('empty and partial input stays partial without invented defaults', () => {
    assert.deepEqual(plain(decode({})), {});
    const input = { annualFee: 0, minimumPayment: { value: 0 }, sources: { minimumPayment: 'user-provided' } };
    assert.deepEqual(plain(decode(input)), input);
    assert.equal(Object.hasOwn(decode(input), 'rateMode'), false);
  });
  test('full values and all source declarations round-trip without aliases', () => {
    const input = complete(), result = decode(input); assert.deepEqual(plain(result), input);
    assert.notEqual(result, input); assert.notEqual(result.minimumPayment, input.minimumPayment); assert.notEqual(result.sources, input.sources);
    result.minimumPayment.value = .9; result.sources.annualFee = 'model-default';
    assert.equal(input.minimumPayment.value, .02); assert.equal(input.sources.annualFee, 'lender-document');
  });
  test('fixed, percent and interest-only inputs retain their exact supplied values', () => {
    for (const minimumPayment of [{ mode: 'fixed', value: 42.25 }, { mode: 'percent-of-balance', value: 1 }, { mode: 'interest-only' }]) {
      assert.deepEqual(plain(decode({ minimumPayment })), { minimumPayment });
    }
    assert.equal(decode({ transactionFeePercent: 2 }).transactionFeePercent, 2, 'do not silently clamp a supplied fee');
  });
  test('unknown keys are rejected at every nested boundary', () => {
    decode({});
    for (const value of [{ surprise: 1 }, { minimumPayment: { mode: 'fixed', value: 1, floor: 5 } },
      { sources: { unknown: 'lender-document' } }, JSON.parse('{"__proto__":{}}')]) assert.throws(() => decode(value));
  });
  test('invalid numeric amounts never become zero defaults', () => {
    decode({});
    for (const field of ['annualFee','transactionFeePercent','minimumDraw']) for (const value of [-1, NaN, Infinity, '0', null, false, undefined]) {
      assert.throws(() => decode({ [field]: value }), field + ':' + String(value));
    }
    for (const value of [-1, NaN, Infinity, '10', undefined]) assert.throws(() => decode({ minimumPayment: { value } }));
  });
  test('periods require positive safe integers', () => {
    decode({});
    for (const field of ['drawPeriodMonths','repaymentPeriodMonths']) {
      for (const value of [0, -1, .5, Number.MAX_SAFE_INTEGER + 1, Infinity, '12']) assert.throws(() => decode({ [field]: value }));
      assert.equal(decode({ [field]: 12 })[field], 12);
    }
  });
  test('unsupported enums and malformed nested containers are rejected', () => {
    decode({});
    for (const value of [null, [], 0, false, new Date(), 'terms', { rateMode: 'floating' },
      { minimumPayment: [] }, { sources: [] }, { minimumPayment: { mode: 'amortizing' } },
      { sources: { annualFee: 'verified' } }, { sources: { annualFee: undefined } },
      { minimumPayment: { mode: 'interest-only', value: 10 } },
      { minimumPayment: { mode: 'percent-of-balance', value: 1.01 } }]) assert.throws(() => decode(value));
  });
  test('frozen inputs are not mutated by decoding or assessment', () => {
    const input = complete(); Object.freeze(input.minimumPayment); Object.freeze(input.sources); Object.freeze(input);
    const decoded = decode(input), result = engine.buildLenderTermsContract(decoded);
    assert.deepEqual(plain(decoded), plain(input)); assert.equal(result.projectionReady, false);
    assert.deepEqual(plain(input), complete());
  });
  test('input completeness rejects unsafe period counts', () => {
    const result = engine.buildLenderTermsContract({ ...complete(), drawPeriodMonths: Number.MAX_SAFE_INTEGER + 1 });
    assert.equal(result.inputComplete, false);
    assert.deepEqual(plain(result.missingFields), ['drawPeriodMonths']);
  });
  test('validation errors use domain names instead of implementation identifiers', () => {
    decode({});
    assert.throws(() => decode({ minimumPayment: [] }), /Lender minimum payment/);
    assert.throws(() => decode({ minimumPayment: { mode: 'other' } }), /Lender minimum payment mode/);
  });
  test('explicit zero fixed and percent minimums are supplied rather than missing', () => {
    for (const mode of ['fixed', 'percent-of-balance']) {
      const result = engine.buildLenderTermsContract({ ...complete(), minimumPayment: { mode, value: 0 } });
      assert.equal(result.inputComplete, true); assert.deepEqual(plain(result.missingFields), []);
      assert.deepEqual(plain(result.terms.minimumPayment), { mode, value: 0 });
      assert.equal(result.projectionReady, false); assert.ok(result.unmodeledFields.includes('minimumPayment'));
    }
  });
  test('custom prototypes, inherited fields and non-data properties cannot silently change inputs', () => {
    decode({});
    const inherited = Object.create({ annualFee: 75 });
    const nested = { minimumPayment: Object.create({ unexpected: 5 }) };
    const sources = { sources: Object.create({ annualFee: 'lender-document' }) };
    const nullPrototypeParent = { sources: Object.create(Object.assign(Object.create(null), { annualFee: 'lender-document' })) };
    const nonEnumerable = {}; Object.defineProperty(nonEnumerable, 'annualFee', { value: 50 });
    const symbol = { annualFee: 0, [Symbol('unknown')]: 1 };
    let getterRead = false; const accessor = { get annualFee() { getterRead = true; return 50; } };
    const tagged = { get [Symbol.toStringTag]() { getterRead = true; return 'Object'; } };
    const fakePrototype = Object.assign(Object.create(null), { annualFee: 'lender-document' });
    function FakeObject() {} FakeObject.prototype = fakePrototype;
    Object.defineProperty(fakePrototype, 'constructor', { value: FakeObject });
    const fakeConstructorSources = { sources: Object.create(fakePrototype) };
    for (const value of [inherited, nested, sources, nullPrototypeParent, nonEnumerable, symbol, accessor, tagged, fakeConstructorSources]) assert.throws(() => decode(value));
    assert.equal(getterRead, false);
    assert.deepEqual(plain(decode(Object.assign(Object.create(null), { annualFee: 0 }))), { annualFee: 0 });
  });
  assert.equal(failures, 0, `${failures}/${count} lender-term contracts failed`);
  console.log(`${count} lender-term contracts passed.`);
}
module.exports = { runLenderTermsTests };
if (require.main === module) runLenderTermsTests();
