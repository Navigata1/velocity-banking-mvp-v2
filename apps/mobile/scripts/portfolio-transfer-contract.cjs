const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

// Load the actual shared codec, including its cyclic engine imports, without a test codec.
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  if (!fs.existsSync(file)) return {};
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const local = id => {
    if (id.startsWith('@interestshield/financial-engine')) return load(fs.realpathSync(require.resolve(id)));
    if (id.startsWith('.')) return load(path.resolve(path.dirname(file), `${id}.ts`));
    return require(id);
  };
  vm.runInNewContext(source, { module, exports: module.exports, require: local, console }, { filename: file });
  return module.exports;
}
const api = load(path.resolve(__dirname, '../lib/portfolio-transfer-review.ts'));
const plain = value => JSON.parse(JSON.stringify(value));
const { plan } = require('./dated-storage-contract.cjs');
function call(name, ...args) {
  assert.equal(typeof api[name], 'function', `native portable Portfolio review helper ${name} must exist`);
  return api[name](...args);
}
const destination = {
  monthlyIncome: 8200.755, monthlyExpenses: 4700.255, extraMonthlyPayment: 250.125,
  chunkAmount: 1000.555, loc: { limit: 25000.995, balance: 3200.255, apr: 2 },
  strategy: 'velocity', focusMode: 'split', splitRatioPrimary: 0.650123456789,
  debts: [{ id: 'synthetic-a', name: '  Synthetic loan  ', category: 'custom', kind: 'amortized',
    balance: 12000.705, apr: 2, minPaymentRule: { type: 'percent', percent: 0.025123456789, floor: 35.005 },
    termMonths: 61, paymentSource: 'either', createdAt: '2026-01-01T00:00:00Z', notes: '  Exact notes\nsecond line  ',
    promo: { introApr: 1, monthsRemaining: 3, postIntroApr: 2 } },
  { id: 'synthetic-b', name: 'Synthetic card', category: 'credit_card', kind: 'revolving', balance: 200.125,
    apr: 0.065, minPaymentRule: { type: 'fixed', amount: 20.005 }, paymentSource: 'checking' }],
};
const incoming = { ...plain(destination), monthlyIncome: 9000.755 };
const document = book => JSON.stringify({ version: 2, aprUnit: 'decimal', data: book });
const current = () => ({ sourceJSON: document(incoming), book: plain(destination), storageScope: 'guest', revision: 7 });
const make = input => call('makePortfolioTransferReview', input);
const begin = (review, input) => call('beginPortfolioTransferConfirmation', review, input);
const validate = (review, input) => call('validatePortfolioTransferReview', review, input);
let count = 0;
function test(name, run) {
  count += 1;
  try { run(); console.log(`PASS Portfolio transfer ${name}`); }
  catch (error) { console.error(`FAIL Portfolio transfer ${name}`); console.error(error); process.exitCode = 1; }
}

test('review freezes source text and a detached exact destination signature without writing', () => {
  const input = current(), before = JSON.stringify(input), review = make(input);
  assert.equal(JSON.stringify(input), before);
  assert.ok(Object.isFrozen(review));
  assert.equal(review.sourceJSON, input.sourceJSON);
  assert.equal(review.storageScope, 'guest');
  assert.equal(review.revision, 7);
  assert.equal(review.phase, 'review');
  assert.equal(review.debtCount, 2);
  assert.equal(review.locBalance, 3200.255);
  assert.equal(review.locLimit, 25000.995);
  assert.equal(review.locAPR, 2);
  input.book.debts[0].balance = 1;
  assert.equal(JSON.parse(review.destinationSignature).data.debts[0].balance, 12000.705);
  assert.equal(JSON.parse(review.canonicalDocument).data.monthlyIncome, 9000.755);
});

test('canonical 2 remains 200-percent APR through review and confirmation', () => {
  const input = current(), review = make(input), result = begin(review, input);
  assert.equal(review.sourceVersion, 2);
  assert.equal(JSON.parse(review.canonicalDocument).aprUnit, 'decimal');
  assert.equal(result.review.phase, 'pending');
  assert.equal(result.replacement.expectedRevision, 7);
  assert.deepEqual(plain(result.replacement.book), incoming);
  assert.equal(result.replacement.book.debts[0].apr, 2);
  assert.equal(result.replacement.book.loc.apr, 2);
  assert.equal(result.replacement.book.debts[0].promo.postIntroApr, 2);
});

test('legacy 6.5-percent rates convert once while IDs and precise metadata survive', () => {
  const legacy = plain(incoming);
  legacy.debts[0].apr = 6.5;
  legacy.debts[0].promo.introApr = 1.5;
  legacy.debts[0].promo.postIntroApr = 6.5;
  legacy.loc.apr = 8.5;
  const input = { ...current(), sourceJSON: JSON.stringify({ version: 1, state: legacy }) };
  const before = input.sourceJSON, review = make(input), result = begin(review, input);
  assert.equal(review.sourceVersion, 1);
  assert.equal(input.sourceJSON, before);
  assert.deepEqual(plain(result.replacement.book), { ...legacy, loc: { ...legacy.loc, apr: 0.085 },
    debts: [{ ...legacy.debts[0], apr: 0.065, promo: { introApr: 0.015, monthsRemaining: 3, postIntroApr: 0.065 } }, legacy.debts[1]] });
  assert.equal(JSON.parse(review.canonicalDocument).version, 2);
  assert.equal(JSON.parse(review.canonicalDocument).data.debts[0].apr, 0.065);
});

test('missing malformed and unsupported documents reject instead of defaulting to empty', () => {
  // First make a valid review so a missing helper cannot masquerade as invalid-document rejection.
  make(current());
  for (const sourceJSON of [undefined, null, '', ' ', '{', 'null', '[]', '{}',
    JSON.stringify({ version: 2, aprUnit: 'decimal' }),
    JSON.stringify({ version: 5, aprUnit: 'decimal', data: incoming }),
    JSON.stringify({ version: 2, aprUnit: 'percent', data: incoming })]) {
    assert.throws(() => make({ ...current(), sourceJSON }), undefined, `reject ${String(sourceJSON)}`);
  }
  const empty = { ...plain(incoming), debts: [], loc: { limit: 0, balance: 0, apr: 0 } };
  const input = { ...current(), sourceJSON: document(empty) };
  const result = begin(make(input), input);
  assert.equal(result.review.debtCount, 0);
  assert.deepEqual(plain(result.replacement.book), empty, 'explicit empty is a valid reviewed replacement');
});

test('explicit4 preserves ordered dated context and replaces using the reviewed revision', () => {
  const input = { ...current(), sourceJSON: JSON.stringify({ version: 4, aprUnit: 'decimal', data: { ...incoming, datedPlan: plan() } }) };
  const review = make(input), result = begin(review, input);
  assert.equal(review.sourceVersion, 4); assert.equal(result.replacement.documentVersion, 4);
  assert.equal(result.replacement.expectedRevision, 7); assert.deepEqual(plain(result.replacement.book.datedPlan), plan());
});
test('import from3 cannot downgrade4 after removal and source4 cannot downgrade to3', () => {
  for (const [source, destination, expected] of [[3, 4, 4], [4, 3, 4], [2, 4, 4]]) {
    const input = { ...current(), documentVersion: destination, sourceJSON: JSON.stringify({ version: source, aprUnit: 'decimal', data: incoming }) };
    const review = make(input), result = begin(review, input);
    assert.equal(JSON.parse(review.canonicalDocument).version, expected); assert.equal(result.replacement.documentVersion, expected);
  }
});
test('dated-only and transport-only destination changes invalidate import review', () => {
  const input = { ...current(), documentVersion: 4, book: { ...plain(destination), datedPlan: plan() } }, review = make(input);
  input.book.datedPlan.cashEvents.reverse(); assert.throws(() => validate(review, input), /changed/i);
  const old = current(), oldReview = make(old); old.documentVersion = 4;
  assert.throws(() => validate(oldReview, old), /changed/i);
});

test('strict codec rules still reject strings duplicate IDs unknown fields and nonfinite amounts', () => {
  make(current());
  for (const book of [{ ...incoming, monthlyIncome: '9000.755' }, { ...incoming, surprise: true },
    { ...incoming, debts: [incoming.debts[0], incoming.debts[0]] },
    { ...incoming, debts: [{ ...incoming.debts[0], termMonths: 0 }] },
    { ...incoming, splitRatioPrimary: 1.01 }]) {
    assert.throws(() => make({ ...current(), sourceJSON: document(book) }));
  }
  assert.throws(() => make({ ...current(), sourceJSON: document(incoming).replace('9000.755', '1e309') }));
});

test('changed owner scope rejects before a replacement is produced', () => {
  const input = current(), review = make(input);
  assert.throws(() => begin(review, { ...input, storageScope: 'owner.other' }), /scope|owner/i);
  assert.equal(review.phase, 'review');
});

test('changed revision rejects even if destination values are identical', () => {
  const input = current(), review = make(input);
  assert.throws(() => begin(review, { ...input, revision: 8 }), /revision|changed/i);
});

test('any changed destination field rejects including notes IDs APR LOC and ordering', () => {
  const input = current(), review = make(input);
  const mutations = [
    book => { book.monthlyIncome += 0.001; }, book => { book.monthlyExpenses += 0.001; },
    book => { book.extraMonthlyPayment += 0.001; }, book => { book.chunkAmount += 0.001; },
    book => { book.strategy = 'avalanche'; }, book => { book.focusMode = 'single'; },
    book => { book.splitRatioPrimary = 0.5; }, book => { book.loc.balance += 0.001; },
    book => { book.loc.limit += 0.001; }, book => { book.loc.apr = 0.02; },
    book => { book.debts[0].notes += ' '; }, book => { book.debts[0].name += ' '; },
    book => { book.debts[0].id = 'new-id'; }, book => { book.debts[0].apr = 0.02; },
    book => { book.debts[0].balance += 0.001; }, book => { book.debts[0].termMonths += 1; },
    book => { book.debts[0].promo.monthsRemaining += 1; }, book => { book.debts[0].minPaymentRule.floor += 0.001; },
    book => { book.debts.reverse(); },
  ];
  for (const mutate of mutations) {
    const book = plain(destination); mutate(book);
    assert.throws(() => begin(review, { ...input, book }), /destination|changed/i);
  }
});

test('source edits after review reject even equivalent whitespace-only JSON changes', () => {
  const input = current(), review = make(input);
  assert.throws(() => begin(review, { ...input, sourceJSON: `${input.sourceJSON}\n` }), /source|import.*changed/i);
  assert.throws(() => begin(review, { ...input, sourceJSON: document({ ...incoming, monthlyIncome: 1 }) }), /source|import.*changed/i);
});

test('disabled and invalid destination identity cannot open or confirm a review', () => {
  const input = current(), review = make(input);
  assert.throws(() => begin(review, { ...input, disabled: true }), /edit|disabled|available/i);
  for (const invalid of [{ disabled: true }, { storageScope: '' }, { revision: -1 }, { revision: 1.5 },
    { revision: Number.MAX_SAFE_INTEGER + 1 }]) assert.throws(() => make({ ...input, ...invalid }));
});

test('value-equivalent destination objects remain valid without a reference-identity trap', () => {
  const input = current(), review = make(input);
  const reordered = Object.fromEntries(Object.entries(destination).reverse());
  assert.deepEqual(plain(validate(review, { ...input, book: reordered })), incoming);
});

test('matching imports are conditional no-ops only after destination validation', () => {
  const input = { ...current(), sourceJSON: document(destination) }, review = make(input);
  const result = begin(review, input);
  assert.equal(result.replacement, null, 'identical books must not call storage or advance revision');
  assert.equal(result.review.phase, 'complete');
  assert.throws(() => begin(result.review, input), /review|confirm|pending|complete/i);
  assert.throws(() => begin(review, { ...input, revision: 8 }), /revision|changed/i);
});

test('pending confirmation cannot be repeated or cancelled before the save settles', () => {
  const input = current(), result = begin(make(input), input);
  assert.throws(() => begin(result.review, input), /pending|review|confirm/i);
  assert.equal(call('cancelPortfolioTransferReview', result.review), result.review, 'Cancel cannot claim to abort an in-flight write');
  const saved = call('finishPortfolioTransferConfirmation', result.review, 'saved');
  assert.equal(saved.phase, 'complete');
  assert.throws(() => begin(saved, input), /complete|review|confirm/i);
  assert.equal(call('finishPortfolioTransferConfirmation', saved, 'failed'), saved, 'late duplicate settlement cannot change success');
});

test('failed confirmation preserves the imported draft and requires a fresh review', () => {
  const input = current(), result = begin(make(input), input);
  const failed = call('finishPortfolioTransferConfirmation', result.review, 'failed');
  assert.equal(failed.phase, 'failed');
  assert.equal(failed.sourceJSON, input.sourceJSON);
  assert.equal(failed.canonicalDocument, result.review.canonicalDocument);
  assert.throws(() => begin(failed, input), /review|confirm|failed/i);
  assert.equal(begin(make(input), input).replacement.expectedRevision, 7);
});

test('cancel before confirmation preserves source text and prevents subsequent replacement', () => {
  const input = current(), review = make(input), cancelled = call('cancelPortfolioTransferReview', review);
  assert.equal(cancelled.phase, 'cancelled');
  assert.equal(cancelled.sourceJSON, input.sourceJSON);
  assert.equal(review.phase, 'review', 'pure transitions do not mutate previous states');
  assert.throws(() => begin(cancelled, input), /review|cancel|confirm/i);
  assert.equal(call('cancelPortfolioTransferReview', cancelled), cancelled);
});

test('replacement books cannot mutate frozen review contents or the destination book', () => {
  const input = current(), review = make(input), result = begin(review, input), frozen = review.canonicalDocument;
  result.replacement.book.debts[0].notes = 'Changed by recipient';
  result.replacement.book.loc.apr = 0;
  assert.equal(review.canonicalDocument, frozen);
  assert.equal(input.book.debts[0].notes, '  Exact notes\nsecond line  ');
  assert.equal(JSON.parse(review.canonicalDocument).data.loc.apr, 2);
});

test('explicit3 without terms retains format and requests adoption even for the same book', () => {
  const input = { ...current(), sourceJSON: JSON.stringify({ version: 3, aprUnit: 'decimal', data: destination }) };
  const review = make(input), result = begin(review, input);
  assert.equal(review.sourceVersion, 3); assert.equal(JSON.parse(review.canonicalDocument).version, 3);
  assert.ok(result.replacement); assert.equal(result.replacement.documentVersion, 3);
  assert.deepEqual(plain(result.replacement.book), destination);
  const adopted = { ...input, documentVersion: 3 }, adoptedReview = make(adopted);
  assert.equal(begin(adoptedReview, adopted).replacement, null);
});

test('active3 destination remains3 on old imports and transport-only changes expire review', () => {
  const input = { ...current(), documentVersion: 3 }, review = make(input);
  assert.equal(JSON.parse(review.destinationSignature).version, 3);
  assert.equal(begin(review, input).replacement.documentVersion, 3);
  assert.throws(() => begin(review, { ...input, documentVersion: undefined }), /destination|changed/i);
});

test('nested terms and provenance participate in destination stale-review detection', () => {
  const input = current(); input.book.loc.lenderTerms = { annualFee: 0,
    minimumPayment: { mode: 'fixed', value: 0 }, sources: { annualFee: 'lender-document' } };
  const review = make(input);
  for (const mutate of [b => { b.loc.lenderTerms.annualFee = 1; },
    b => { b.loc.lenderTerms.minimumPayment.value = 1; }, b => { b.loc.lenderTerms.sources.annualFee = 'model-default'; }]) {
    const changed = plain(input.book); mutate(changed);
    assert.throws(() => begin(review, { ...input, book: changed }), /destination|changed/i);
  }
});

test('term-bearing3 replacement is detached from both source and prior review', () => {
  const imported = plain(incoming); imported.loc.lenderTerms = { annualFee: 0,
    minimumPayment: { mode: 'fixed', value: 0 }, sources: { annualFee: 'lender-document' } };
  const input = { ...current(), sourceJSON: JSON.stringify({ version: 3, aprUnit: 'decimal', data: imported }) };
  const review = make(input), result = begin(review, input); assert.equal(result.replacement.documentVersion, 3);
  result.replacement.book.loc.lenderTerms.minimumPayment.value = 999;
  result.replacement.book.loc.lenderTerms.sources.annualFee = 'user-provided';
  assert.deepEqual(JSON.parse(review.canonicalDocument).data.loc.lenderTerms, imported.loc.lenderTerms);
});

console.log(`${count} portable Portfolio transfer contracts ${process.exitCode ? 'failed' : 'passed'}. No server, storage writes or native Share sheet exercised.`);
