/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '../../../packages/financial-engine/src'), cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const loaded = { exports: {} }; cache.set(name, loaded);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, name + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { module: loaded, exports: loaded.exports, console,
    require: id => id.startsWith('./') ? load(id.slice(2)) : require(id),
  }, { filename: name });
  return loaded.exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const book = () => ({ monthlyIncome: 8200.25, monthlyExpenses: 4700.125, extraMonthlyPayment: 0,
  chunkAmount: 1000.01, loc: { limit: 25000, balance: 3200.12, apr: 2 }, strategy: 'velocity',
  focusMode: 'single', splitRatioPrimary: .7, debts: [{ id: 'a', name: 'Loan', category: 'auto',
    kind: 'amortized', balance: 18450, apr: .069, minPaymentRule: { type: 'fixed', amount: 425 }, paymentSource: 'checking' }] });
const withTerms = terms => { const value = book(); value.loc.lenderTerms = terms; return value; };
const document = (data, version = 3) => JSON.stringify({ version, ...(version === 1 ? {} : { aprUnit: 'decimal' }), data });

function runLenderPortfolioTests() {
  const codec = load('portfolio-book'); let cases = 0, failures = 0;
  function test(name, fn) { cases++; try { fn(); console.log('PASS lender Portfolio ' + name); }
    catch (error) { failures++; console.error('FAIL lender Portfolio ' + name + ': ' + error.message); } }
  test('existing no-profile serialization remains exactly document2', () => {
    const value = book(); assert.equal(codec.encodePortfolioDocument(value), JSON.stringify({ version: 2, aprUnit: 'decimal', data: value }, null, 2));
    assert.deepEqual(plain(codec.decodePortfolioDocument(document(value, 2))), value);
  });
  test('bare book decoder preserves partial zero terms without inventing defaults', () => {
    const value = withTerms({ annualFee: 0, minimumPayment: { value: 0 }, sources: { annualFee: 'user-provided' } });
    assert.deepEqual(plain(codec.decodePortfolioBook(value)), value);
  });
  test('term-bearing export selects explicit version3 and decimal APR', () => {
    const value = withTerms({ transactionFeePercent: .0125, minimumPayment: { mode: 'interest-only' } });
    const encoded = JSON.parse(codec.encodePortfolioDocument(value));
    assert.equal(encoded.version, 3); assert.equal(encoded.aprUnit, 'decimal'); assert.deepEqual(encoded.data, value);
  });
  test('document3 reads preserve APR2 as200percent and exact input amounts', () => {
    const value = withTerms({ annualFee: 75.25, rateMode: 'variable', drawPeriodMonths: 120 });
    assert.deepEqual(plain(codec.decodePortfolioDocument(document(value))), value);
  });
  test('explicit version3 remains available after profile removal', () => {
    const value = book(), encoded = JSON.parse(codec.encodePortfolioDocument(value, 3));
    assert.equal(encoded.version, 3); assert.equal(Object.hasOwn(encoded.data.loc, 'lenderTerms'), false);
    assert.deepEqual(plain(codec.decodePortfolioDocument(JSON.stringify(encoded))), value);
  });
  test('documents1and2 cannot acquire new terms under old semantics', () => {
    const value = withTerms({});
    for (const version of [1, 2]) assert.throws(() => codec.decodePortfolioDocument(document(value, version)));
  });
  test('explicit old-version encoding cannot silently downgrade supplied terms', () => {
    const value = withTerms({ annualFee: 0 });
    assert.throws(() => codec.encodePortfolioDocument(value, 2));
    assert.throws(() => codec.encodePortfolioDocument(book(), 1));
  });
  test('legacy APR conversion stays separate and never writes its source', () => {
    const value = book(); value.loc.apr = 2; value.debts[0].apr = 6.5;
    const raw = ' \n' + document(value, 1) + '\n', before = raw, decoded = codec.decodePortfolioDocument(raw);
    assert.equal(decoded.loc.apr, .02); assert.equal(decoded.debts[0].apr, .065); assert.equal(raw, before);
    assert.equal(Object.hasOwn(decoded.loc, 'lenderTerms'), false);
  });
  test('normal simulation input construction carries terms with no aliases to source', () => {
    const value = withTerms({ minimumPayment: { mode: 'fixed', value: 100 }, sources: { minimumPayment: 'lender-document' } });
    const input = codec.portfolioBookInputs(value); assert.deepEqual(plain(input.loc.lenderTerms), value.loc.lenderTerms);
    assert.notEqual(input.loc.lenderTerms, value.loc.lenderTerms); assert.notEqual(input.loc.lenderTerms.minimumPayment, value.loc.lenderTerms.minimumPayment);
    input.loc.lenderTerms.minimumPayment.value = 999; assert.equal(value.loc.lenderTerms.minimumPayment.value, 100);
  });
  test('invalid or self-declared support metadata is rejected instead of stripped', () => {
    assert.deepEqual(plain(codec.decodePortfolioDocument(document(withTerms({})))), withTerms({}));
    for (const lenderTerms of [{ annualFee: -1 }, { confidence: 'complete' }, { projectionReady: true },
      { unmodeledFields: [] }, { sources: { annualFee: 'verified' } }, { minimumPayment: { unknown: 1 } }]) {
      assert.throws(() => codec.decodePortfolioDocument(document(withTerms(lenderTerms))));
    }
  });
  test('all supported term fields and declared sources survive a complete round-trip', () => {
    const terms = { annualFee: 75, transactionFeePercent: .01, rateMode: 'variable', drawPeriodMonths: 120,
      repaymentPeriodMonths: 180, minimumDraw: 500, minimumPayment: { mode: 'percent-of-balance', value: .02 },
      sources: { annualFee: 'lender-document', transactionFeePercent: 'model-default', minimumPayment: 'user-provided' } };
    const value = withTerms(terms), raw = codec.encodePortfolioDocument(value);
    assert.deepEqual(plain(codec.decodePortfolioDocument(raw)), value);
    const decoded = codec.decodePortfolioDocument(raw); decoded.loc.lenderTerms.sources.annualFee = 'model-default';
    assert.equal(terms.sources.annualFee, 'lender-document');
  });
  test('version3 rejects unknown units and preserves source objects on rejection', () => {
    const value = withTerms({ annualFee: 0 }), before = JSON.stringify(value);
    assert.throws(() => codec.decodePortfolioDocument(JSON.stringify({ version: 3, aprUnit: 'legacy', data: value })));
    assert.throws(() => codec.decodePortfolioDocument(JSON.stringify({ version: 4, aprUnit: 'decimal', data: value })));
    assert.equal(JSON.stringify(value), before);
  });
  assert.equal(failures, 0, `${failures}/${cases} lender Portfolio contracts failed`);
  console.log(`${cases} lender Portfolio contracts passed.`);
}
module.exports = { runLenderPortfolioTests };
if (require.main === module) runLenderPortfolioTests();
