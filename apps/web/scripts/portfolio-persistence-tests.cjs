/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const adapterFile = path.resolve(__dirname, '../src/stores/portfolio-persistence.ts');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  if (!fs.existsSync(file)) return {};
  const testModule = { exports: {} };
  cache.set(file, testModule);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const local = id => {
    if (id.startsWith('@interestshield/financial-engine')) return load(fs.realpathSync(require.resolve(id)));
    if (id.startsWith('.')) return load(path.resolve(path.dirname(file), `${id}.ts`));
    return require(id);
  };
  vm.runInNewContext(source, { module: testModule, exports: testModule.exports, require: local, console }, { filename: file });
  return testModule.exports;
}
const api = load(adapterFile);
const legacyKey = 'interestshield-portfolio-v1';
const canonicalKey = 'interestshield-portfolio-v2';
const plain = value => JSON.parse(JSON.stringify(value));
const book = {
  monthlyIncome: 8200.45123, monthlyExpenses: 4700.121, extraMonthlyPayment: 50.125, chunkAmount: 1000.005,
  loc: { limit: 200000000, balance: 120.70001, apr: 2 }, strategy: 'avalanche', focusMode: 'split',
  splitRatioPrimary: 0.7123456789,
  debts: [{ id: 'synthetic-loan', name: '  Loan \u9ad8  ', category: 'custom', kind: 'amortized',
    balance: 100000000.125, apr: 2, minPaymentRule: { type: 'fixed', amount: 300.125 },
    paymentSource: 'checking', termMonths: 48, notes: '  Exact notes\nsecond line  ', createdAt: '2026-10-20T12:00:00Z' },
  { id: 'synthetic-card', name: 'Card', category: 'credit_card', kind: 'revolving', balance: 0.00123,
    apr: 0.219, minPaymentRule: { type: 'percent', percent: 0.020123456789, floor: 35.125 },
    paymentSource: 'either', promo: { introApr: 0.075, monthsRemaining: 2, postIntroApr: 2 } }],
};
const legacyBook = plain(book);
legacyBook.loc.apr = 8.5;
legacyBook.debts[0].apr = 6.5;
legacyBook.debts[1].promo.postIntroApr = 120;
const convertedLegacy = { ...legacyBook, loc: { ...legacyBook.loc, apr: 0.085 },
  debts: [{ ...legacyBook.debts[0], apr: 0.065 }, { ...legacyBook.debts[1],
    promo: { ...legacyBook.debts[1].promo, postIntroApr: 1.2 } }] };
const canonical = data => JSON.stringify({ version: 2, aprUnit: 'decimal', data }, null, 3) + '\n';
const legacyBytes = ' \n' + JSON.stringify({ version: 1, state: legacyBook }, null, 4) + '\n';

// Web Storage publishes a set/remove atomically or throws before altering its bytes.
function storage(initial = {}) {
  const entries = new Map(Object.entries(initial)), calls = [], failures = { get: null, set: null, remove: null };
  const port = {
    getItem(key) { calls.push(['get', key]); if (failures.get) throw failures.get; return entries.get(key) ?? null; },
    setItem(key, value) { calls.push(['set', key, value]); if (failures.set) throw failures.set; entries.set(key, value); },
    removeItem(key) { calls.push(['remove', key]); if (failures.remove) throw failures.remove; entries.delete(key); },
  };
  return { entries, calls, failures, port };
}
function create(port) {
  assert.equal(typeof api.createPortfolioPersistence, 'function', 'canonical Portfolio persistence factory must exist');
  assert.equal(api.LEGACY_PORTFOLIO_KEY, legacyKey);
  assert.equal(api.CANONICAL_PORTFOLIO_KEY, canonicalKey);
  return api.createPortfolioPersistence(port);
}
function assertError(adapter, pattern) {
  assert.equal(adapter.getStatus().status, 'error');
  assert.match(adapter.getStatus().error, pattern);
  assert.ok(Object.isFrozen(adapter.getStatus()));
}
let cases = 0;
function test(name, run) {
  cases += 1;
  try { run(); console.log(`PASS Portfolio persistence ${name}`); }
  catch (error) { console.error(`FAIL Portfolio persistence ${name}`); console.error(error); process.exitCode = 1; }
}

test('constructor and absent hydration never write defaults or probe before a read', () => {
  const io = storage(), adapter = create(io.port), initial = adapter.getStatus();
  assert.deepEqual(io.calls, []);
  assert.deepEqual(plain(initial), { status: 'ready', error: null });
  assert.ok(Object.isFrozen(initial));
  assert.equal(adapter.getItem(legacyKey), null);
  assert.deepEqual(io.calls, [['get', canonicalKey], ['get', legacyKey]]);
  assert.equal(io.entries.size, 0);
  assert.equal(adapter.getStatus(), initial);
});

test('legacy hydration converts 6.5-percent once without touching original bytes', () => {
  const io = storage({ [legacyKey]: legacyBytes }), adapter = create(io.port);
  assert.deepEqual(plain(adapter.getItem(legacyKey)), { state: convertedLegacy, version: 2 });
  assert.deepEqual(plain(adapter.getItem(legacyKey)), { state: convertedLegacy, version: 2 });
  assert.equal(io.entries.get(legacyKey), legacyBytes);
  assert.equal(io.entries.has(canonicalKey), false);
  assert.ok(io.calls.every(([operation]) => operation === 'get'), 'hydration is strictly read-only');
});

test('canonical 2 means 200-percent and takes precedence without even reading corrupt legacy', () => {
  const bytes = canonical(book), io = storage({ [canonicalKey]: bytes, [legacyKey]: '{broken legacy' });
  const adapter = create(io.port), result = adapter.getItem(legacyKey);
  assert.deepEqual(plain(result), { state: book, version: 2 });
  assert.equal(result.state.debts[0].apr, 2);
  assert.equal(result.state.loc.apr, 2);
  assert.equal(result.state.debts[1].promo.postIntroApr, 2);
  assert.deepEqual(io.calls, [['get', canonicalKey]]);
  assert.equal(io.entries.get(canonicalKey), bytes);
});

test('present corrupt or misplaced-v1 canonical data never falls back to legacy', () => {
  create(null);
  for (const bytes of ['', '{', 'null', '[]', JSON.stringify({ version: 1, state: legacyBook }),
    JSON.stringify({ version: 3, aprUnit: 'decimal', data: book }), JSON.stringify({ version: 2, data: book }),
    canonical({ ...book, monthlyIncome: '8200.45123' })]) {
    const io = storage({ [canonicalKey]: bytes, [legacyKey]: legacyBytes }), adapter = create(io.port);
    assert.equal(adapter.getItem(legacyKey), null);
    assertError(adapter, /read|version|Portfolio/i);
    assert.deepEqual(io.calls, [['get', canonicalKey]]);
    assert.equal(io.entries.get(canonicalKey), bytes);
    assert.equal(io.entries.get(legacyKey), legacyBytes);
  }
});

test('legacy physical key accepts only strict v1 documents, never a default or misplaced v2', () => {
  create(null);
  for (const bytes of ['', '{', 'null', canonical(book), JSON.stringify({ state: legacyBook }),
    JSON.stringify({ version: 1, state: { ...legacyBook, extra: true } }),
    JSON.stringify({ version: 1, state: { ...legacyBook, debts: [legacyBook.debts[0], legacyBook.debts[0]] } })]) {
    const io = storage({ [legacyKey]: bytes }), adapter = create(io.port);
    assert.equal(adapter.getItem(legacyKey), null);
    assertError(adapter, /read|version|Portfolio/i);
    assert.equal(io.entries.get(legacyKey), bytes);
    assert.ok(io.calls.every(([operation]) => operation === 'get'));
  }
});

test('legacy data export shape uses the same real codec without mutating persisted bytes', () => {
  const bytes = JSON.stringify({ version: 1, data: legacyBook, exportedAt: '2026-10-20T12:00:00Z' });
  const io = storage({ [legacyKey]: bytes }), adapter = create(io.port);
  assert.deepEqual(plain(adapter.getItem(legacyKey)), { state: convertedLegacy, version: 2 });
  assert.equal(io.entries.get(legacyKey), bytes);
  assert.equal(io.entries.has(canonicalKey), false);
});

test('writes only the new canonical key and keeps exact input metadata, precision and legacy bytes', () => {
  const io = storage({ [legacyKey]: legacyBytes, unrelated: 'keep' }), adapter = create(io.port);
  const value = { state: plain(book), version: 2 }, before = JSON.stringify(value);
  assert.doesNotThrow(() => adapter.setItem(legacyKey, value));
  assert.equal(JSON.stringify(value), before);
  assert.equal(io.entries.get(legacyKey), legacyBytes);
  assert.equal(io.entries.get('unrelated'), 'keep');
  assert.deepEqual(JSON.parse(io.entries.get(canonicalKey)), { version: 2, aprUnit: 'decimal', data: book });
  assert.deepEqual(io.calls.filter(([operation]) => operation !== 'get').map(([operation, key]) => [operation, key]), [['set', canonicalKey]]);
  assert.deepEqual(plain(adapter.getItem(legacyKey)), { state: book, version: 2 });
  assert.deepEqual(plain(adapter.getStatus()), { status: 'ready', error: null });
});

test('no-op canonical writes reuse original bytes and do not publish or rewrite', () => {
  const bytes = canonical(book), io = storage({ [canonicalKey]: bytes }), adapter = create(io.port);
  let notices = 0; adapter.subscribe(() => { notices += 1; });
  const before = adapter.getStatus(), read = adapter.getItem(legacyKey);
  adapter.setItem(legacyKey, { state: read.state, version: 2 });
  assert.equal(io.entries.get(canonicalKey), bytes, 'even existing JSON whitespace survives an equivalent save');
  assert.ok(io.calls.every(([operation]) => operation === 'get'));
  assert.equal(adapter.getStatus(), before);
  assert.equal(notices, 0);
});

test('failed explicit upgrade preserves legacy bytes and remains retryable without memory fallback', () => {
  const io = storage({ [legacyKey]: legacyBytes }), adapter = create(io.port);
  io.failures.set = new Error('synthetic quota failure');
  assert.doesNotThrow(() => adapter.setItem(legacyKey, { state: book, version: 2 }));
  const failure = adapter.getStatus(); assertError(adapter, /synthetic quota failure/);
  assert.equal(io.entries.has(canonicalKey), false);
  assert.equal(io.entries.get(legacyKey), legacyBytes);
  assert.deepEqual(plain(adapter.getItem(legacyKey)), { state: convertedLegacy, version: 2 });
  assert.equal(adapter.getStatus(), failure, 'reading old durable data must not hide an unsaved-write error');
  io.failures.set = null;
  adapter.setItem(legacyKey, { state: book, version: 2 });
  assert.deepEqual(plain(adapter.getStatus()), { status: 'ready', error: null });
  assert.equal(io.entries.get(legacyKey), legacyBytes);
  assert.deepEqual(JSON.parse(io.entries.get(canonicalKey)).data, book);
});

test('failed canonical set preserves its old bytes and freezes mutable error details', () => {
  const bytes = canonical(book), io = storage({ [canonicalKey]: bytes, [legacyKey]: legacyBytes }), adapter = create(io.port);
  const cause = new Error('synthetic disk failure'); io.failures.set = cause;
  const value = { state: { ...plain(book), monthlyIncome: 9000.755 }, version: 2 }, before = JSON.stringify(value);
  assert.doesNotThrow(() => adapter.setItem(legacyKey, value));
  const failure = adapter.getStatus(); assertError(adapter, /synthetic disk failure/);
  cause.message = 'mutated later';
  assert.equal(adapter.getStatus(), failure);
  assert.match(failure.error, /synthetic disk failure/);
  assert.doesNotMatch(failure.error, /mutated later/);
  assert.equal(JSON.stringify(value), before);
  assert.equal(io.entries.get(canonicalKey), bytes);
  assert.equal(io.entries.get(legacyKey), legacyBytes);
});

test('remove deletes canonical only; the retained legacy book is visible on a later read', () => {
  const io = storage({ [canonicalKey]: canonical(book), [legacyKey]: legacyBytes, unrelated: 'keep' }), adapter = create(io.port);
  assert.doesNotThrow(() => adapter.removeItem(legacyKey));
  assert.deepEqual(io.calls, [['remove', canonicalKey]]);
  assert.equal(io.entries.has(canonicalKey), false);
  assert.equal(io.entries.get(legacyKey), legacyBytes);
  assert.equal(io.entries.get('unrelated'), 'keep');
  assert.deepEqual(plain(adapter.getItem(legacyKey)), { state: convertedLegacy, version: 2 });
});

test('failed remove reports error without throwing or changing either physical key', () => {
  const bytes = canonical(book), io = storage({ [canonicalKey]: bytes, [legacyKey]: legacyBytes }), adapter = create(io.port);
  io.failures.remove = new Error('synthetic remove denied');
  assert.doesNotThrow(() => adapter.removeItem(legacyKey));
  assertError(adapter, /synthetic remove denied/);
  assert.equal(io.entries.get(canonicalKey), bytes);
  assert.equal(io.entries.get(legacyKey), legacyBytes);
  io.failures.remove = null;
  adapter.removeItem(legacyKey);
  assert.equal(io.entries.has(canonicalKey), false);
  assert.deepEqual(plain(adapter.getStatus()), { status: 'ready', error: null });
});

test('unknown write versions and invalid books reject without I/O or input mutation', () => {
  create(null);
  for (const value of [null, {}, { state: book }, { state: book, version: 1 }, { state: book, version: 3 },
    { state: book, version: '2' }, { state: book, version: 2, extra: true },
    { state: { ...book, monthlyIncome: '8200' }, version: 2 },
    { state: { ...book, splitRatioPrimary: 1.01 }, version: 2 },
    { state: { ...book, loc: { ...book.loc, apr: Infinity } }, version: 2 },
    { state: { ...book, debts: [{ ...book.debts[0], termMonths: 0 }] }, version: 2 }]) {
    const io = storage({ [canonicalKey]: canonical(book) }), adapter = create(io.port), before = JSON.stringify(value);
    assert.doesNotThrow(() => adapter.setItem(legacyKey, value));
    assertError(adapter, /save|version|Portfolio/i);
    assert.deepEqual(io.calls, []);
    assert.equal(JSON.stringify(value), before);
    assert.equal(io.entries.get(canonicalKey), canonical(book));
  }
});

test('set preflights existing data even if hydration was skipped or another writer corrupted it', () => {
  create(null);
  for (const key of [canonicalKey, legacyKey]) {
    const io = storage({ [key]: '{corrupt' }), adapter = create(io.port);
    assert.doesNotThrow(() => adapter.setItem(legacyKey, { state: book, version: 2 }));
    assertError(adapter, /read|saved|Portfolio/i);
    assert.equal(io.entries.get(key), '{corrupt');
    assert.ok(io.calls.every(([operation]) => operation === 'get'));
  }
  const io = storage({ [canonicalKey]: canonical(book) }), adapter = create(io.port);
  adapter.getItem(legacyKey);
  io.entries.set(canonicalKey, '{external corruption');
  adapter.setItem(legacyKey, { state: { ...plain(book), monthlyIncome: 9 }, version: 2 });
  assertError(adapter, /read|saved|Portfolio/i);
  assert.equal(io.entries.get(canonicalKey), '{external corruption');
  assert.ok(io.calls.every(([operation]) => operation === 'get'));
});

test('unreadable-present data blocks subsequent writes for that adapter even after bytes change', () => {
  const io = storage({ [canonicalKey]: '{corrupt', [legacyKey]: legacyBytes }), adapter = create(io.port);
  assert.equal(adapter.getItem(legacyKey), null);
  const failure = adapter.getStatus(), before = io.calls.length;
  io.entries.set(canonicalKey, canonical(book));
  adapter.setItem(legacyKey, { state: { ...plain(book), monthlyIncome: 1 }, version: 2 });
  assert.equal(io.calls.length, before, 'a poisoned adapter must not resume automatic writes');
  assert.equal(adapter.getStatus(), failure);
  assert.equal(io.entries.get(canonicalKey), canonical(book));
  adapter.removeItem(legacyKey);
  assert.equal(io.entries.has(canonicalKey), false, 'explicit canonical removal is still possible');
  adapter.setItem(legacyKey, { state: book, version: 2 });
  assert.equal(io.entries.has(canonicalKey), false, 'remove is not an implicit reset of the corruption latch');
  assert.equal(adapter.getStatus(), failure);
  assert.equal(io.entries.get(legacyKey), legacyBytes);
  assert.deepEqual(plain(create(io.port).getItem(legacyKey)), { state: convertedLegacy, version: 2 });
});

test('read I/O failure never falls back or permits an unchecked write', () => {
  const io = storage({ [legacyKey]: legacyBytes }), adapter = create(io.port);
  io.failures.get = new Error('synthetic read denied');
  assert.doesNotThrow(() => assert.equal(adapter.getItem(legacyKey), null));
  assertError(adapter, /synthetic read denied/);
  assert.deepEqual(io.calls, [['get', canonicalKey]]);
  io.failures.get = null;
  adapter.setItem(legacyKey, { state: book, version: 2 });
  assert.equal(io.calls.length, 1);
  assert.equal(io.entries.has(canonicalKey), false);
});

test('null storage is unavailable rather than a fake in-memory durable book', () => {
  const adapter = create(null), snapshot = adapter.getStatus();
  assert.equal(snapshot.status, 'unavailable');
  assert.ok(Object.isFrozen(snapshot));
  assert.equal(adapter.getItem(legacyKey), null);
  assert.doesNotThrow(() => adapter.setItem(legacyKey, { state: book, version: 2 }));
  assert.doesNotThrow(() => adapter.removeItem(legacyKey));
  assert.equal(adapter.getItem(legacyKey), null);
  assert.equal(adapter.getStatus(), snapshot);
});

test('wrong logical keys reject all operations without touching storage', () => {
  const io = storage({ [canonicalKey]: canonical(book), [legacyKey]: legacyBytes }), adapter = create(io.port);
  for (const key of ['', canonicalKey, 'unrelated']) {
    assert.doesNotThrow(() => assert.equal(adapter.getItem(key), null));
    assert.doesNotThrow(() => adapter.setItem(key, { state: book, version: 2 }));
    assert.doesNotThrow(() => adapter.removeItem(key));
    assertError(adapter, /logical key/i);
  }
  assert.deepEqual(io.calls, []);
  assert.equal(io.entries.get(legacyKey), legacyBytes);
  assert.equal(io.entries.get(canonicalKey), canonical(book));
});

test('status snapshots are stable, frozen and notify only actual changes with safe unsubscribe', () => {
  const io = storage(), adapter = create(io.port), received = [];
  const unsubscribe = adapter.subscribe(() => received.push(adapter.getStatus()));
  const ready = adapter.getStatus();
  assert.equal(adapter.getStatus(), ready);
  adapter.setItem(legacyKey, { state: book, version: 999 });
  const failure = adapter.getStatus();
  assert.equal(received.length, 1);
  assert.equal(received[0], failure);
  assert.notEqual(failure, ready);
  adapter.setItem(legacyKey, { state: book, version: 999 });
  assert.equal(adapter.getStatus(), failure);
  assert.equal(received.length, 1);
  adapter.setItem(legacyKey, { state: book, version: 2 });
  assert.equal(received.length, 2);
  assert.equal(received[1].status, 'ready');
  unsubscribe(); unsubscribe();
  adapter.setItem(legacyKey, { state: book, version: 999 });
  assert.equal(received.length, 2);
  assert.ok(received.every(Object.isFrozen));
});

test('subscriber exceptions cannot escape a storage event or suppress other subscribers', () => {
  const io = storage(), adapter = create(io.port);
  let notified = 0;
  adapter.subscribe(() => { throw new Error('synthetic listener failure'); });
  adapter.subscribe(() => { notified += 1; });
  assert.doesNotThrow(() => adapter.setItem(legacyKey, { state: book, version: 999 }));
  assertError(adapter, /version/i);
  assert.equal(notified, 1);
  assert.doesNotThrow(() => adapter.setItem(legacyKey, { state: book, version: 2 }));
  assert.equal(notified, 2);
  assert.equal(adapter.getStatus().status, 'ready');
  assert.deepEqual(JSON.parse(io.entries.get(canonicalKey)).data, book);
});

test('large finite values are not capped and returned books do not alias input or later reads', () => {
  const io = storage(), adapter = create(io.port), large = { ...plain(book), monthlyIncome: 1e100 };
  adapter.setItem(legacyKey, { state: large, version: 2 });
  const read = adapter.getItem(legacyKey);
  assert.deepEqual(plain(read), { state: large, version: 2 });
  read.state.debts[0].notes = 'modified only in memory';
  assert.equal(adapter.getItem(legacyKey).state.debts[0].notes, '  Exact notes\nsecond line  ');
  assert.equal(large.debts[0].notes, '  Exact notes\nsecond line  ');
  assert.equal(adapter.getItem(legacyKey).state.monthlyIncome, 1e100);
});

test('factory and public codec compile strictly without framework imports', () => {
  create(null);
  const program = ts.createProgram([adapterFile], { strict: true, noEmit: true,
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true, types: [], lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'] });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, { getCanonicalFileName: file => file,
    getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n' }));
});

console.log(`${cases} canonical Portfolio persistence contracts ${process.exitCode ? 'failed' : 'passed'}. Store/UI/reset integration remains separate.`);
