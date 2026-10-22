/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '../src'), cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const loaded = { exports: {} }; cache.set(file, loaded);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { module: loaded, exports: loaded.exports, console, require: id => {
    if (id.startsWith('@interestshield/')) return load(fs.realpathSync(require.resolve(id)));
    if (id.startsWith('@/')) return load(path.resolve(root, id.slice(2) + '.ts'));
    if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id + '.ts'));
    return require(id);
  } }, { filename: file });
  return loaded.exports;
}
const snapshot = load(path.join(root, 'app/settings/local-demo-snapshot.ts'));
const sync = load(path.join(root, 'lib/supabase/account-sync-source.ts'));
const reset = load(path.join(root, 'app/settings/local-data-reset.ts'));
const legacy = 'interestshield-portfolio-v1', canonical = 'interestshield-portfolio-v2', active = 'interestshield-portfolio-v3';
const book = () => ({ monthlyIncome: 8200.25, monthlyExpenses: 4700.125, extraMonthlyPayment: 0,
  chunkAmount: 1000.01, loc: { limit: 25000, balance: 3200.12, apr: 2 }, strategy: 'velocity',
  focusMode: 'single', splitRatioPrimary: .7, debts: [] });
const document = (data, version = 3) => JSON.stringify({ version, aprUnit: 'decimal', data }, null, 2);
const payload = value => JSON.stringify({ version: 1, storage: [{ key: legacy, value }] });
function storage(initial = {}) {
  const values = new Map(Object.entries(initial)), writes = [];
  return { values, writes, getItem: key => values.get(key) ?? null,
    setItem(key, value) { writes.push(['set', key]); values.set(key, value); },
    removeItem(key) { writes.push(['remove', key]); values.delete(key); } };
}
function runLenderSnapshotTests() {
  let cases = 0, failures = 0;
  function test(name, fn) { cases++; try { fn(); console.log('PASS lender snapshot ' + name); }
    catch (error) { failures++; console.error('FAIL lender snapshot ' + name + ': ' + error.message); } }
  test('export and sync capture explicit3 under the existing logical key, with nested terms intact', () => {
    const value = book(); value.loc.lenderTerms = { annualFee: 0, minimumPayment: { value: 0 }, sources: { annualFee: 'user-provided' } };
    const raw = document(value), io = storage({ [active]: raw, [canonical]: '{bad archive', [legacy]: 'old raw' });
    const exported = snapshot.exportLocalDemoSnapshot(io); assert.equal(exported.ok, true);
    assert.deepEqual(JSON.parse(exported.json).storage, [{ key: legacy, value: raw }]);
    assert.deepEqual(JSON.parse(JSON.stringify(sync.collectBrowserSnapshotStorage(io))), [{ key: legacy, value: raw }]);
    assert.equal(io.writes.length, 0);
  });
  test('term-bearing restore adopts3 and preserves old1,old2 and separate legacy scenario bytes', () => {
    const value = book(); value.loc.lenderTerms = { rateMode: 'variable', annualFee: 0 };
    const raw = document(value), old = document(book(), 2);
    const io = storage({ [canonical]: old, [legacy]: 'old legacy bytes', 'velocity-bank-storage': 'separate scenario' });
    assert.equal(snapshot.importLocalDemoSnapshot(payload(raw), io).ok, true);
    assert.deepEqual(JSON.parse(io.getItem(active)), JSON.parse(raw)); assert.equal(io.getItem(canonical), old);
    assert.equal(io.getItem(legacy), 'old legacy bytes'); assert.equal(io.getItem('velocity-bank-storage'), 'separate scenario');
  });
  test('explicit3 without terms remains3 through restore and export', () => {
    const raw = document(book()), io = storage({ [canonical]: document(book(), 2) });
    assert.equal(snapshot.importLocalDemoSnapshot(payload(raw), io).ok, true);
    assert.equal(io.getItem(active), raw);
    assert.equal(JSON.parse(JSON.parse(snapshot.exportLocalDemoSnapshot(io).json).storage[0].value).version, 3);
  });
  test('old-format restore into active3 stays3 and never writes the old2 archive', () => {
    const value = book(); value.monthlyIncome = 9100;
    const old = document(book(), 2), io = storage({ [active]: document(book()), [canonical]: old });
    assert.equal(snapshot.importLocalDemoSnapshot(payload(document(value, 2)), io).ok, true);
    assert.equal(io.getItem(active), document(value)); assert.equal(io.getItem(canonical), old);
  });
  test('malformed present active3 blocks export, sync and restore without destination changes', () => {
    const io = storage({ [active]: '{broken', [canonical]: document(book(), 2), 'velocity-bank-storage': 'keep' });
    const before = JSON.stringify([...io.values]);
    assert.equal(snapshot.exportLocalDemoSnapshot(io).ok, false);
    assert.throws(() => sync.collectBrowserSnapshotStorage(io));
    assert.equal(snapshot.importLocalDemoSnapshot(payload(document(book())), io).ok, false);
    assert.equal(JSON.stringify([...io.values]), before); assert.equal(io.writes.length, 0);
  });
  test('unknown terms or extensions under old versions reject before any destination writes', () => {
    for (const [version, terms] of [[3, { approved: true }], [3, { annualFee: '0' }], [2, {}], [1, {}]]) {
      const value = book(); value.loc.lenderTerms = terms;
      const io = storage({ [canonical]: document(book(), 2) });
      assert.equal(snapshot.importLocalDemoSnapshot(payload(document(value, version)), io).ok, false);
      assert.equal(io.writes.length, 0);
    }
  });
  test('legacy single-target snapshots reject supplied term extensions before any replacement', () => {
    for (const terms of [{}, { annualFee: 75 }, null]) {
      const io = storage({ [canonical]: document(book(), 2), 'velocity-bank-storage': 'keep original' });
      const input = JSON.stringify({ version: 1, storage: [{ key: 'velocity-bank-storage',
        value: JSON.stringify({ version: 0, state: { loc: { limit: 25000, balance: 3200, interestRate: .085, lenderTerms: terms } } }) }] });
      assert.equal(snapshot.importLocalDemoSnapshot(input, io).ok, false);
      assert.equal(io.getItem('velocity-bank-storage'), 'keep original'); assert.equal(io.writes.length, 0);
      io.values.set('velocity-bank-storage', JSON.parse(input).storage[0].value);
      assert.throws(() => sync.collectBrowserSnapshotStorage(io), /terms|Portfolio|version/i);
    }
  });
  test('interrupted3 publication rolls back both active3 and other changed keys without touching archives', () => {
    for (const existing of [null, document(book())]) for (const failedKey of [active, 'velocity-bank-storage']) {
      const old = document(book(), 2), io = storage({ [canonical]: old, [legacy]: 'legacy', 'velocity-bank-storage': 'original', ...(existing === null ? {} : { [active]: existing }) });
      const before = new Map(io.values), value = book(); value.loc.lenderTerms = { annualFee: 0 };
      let failed = false;
      const port = { ...io, setItem(key, raw) { if (!failed && key === failedKey) { failed = true; throw new Error('Synthetic interrupted publication'); } io.setItem(key, raw); } };
      const json = JSON.stringify({ version: 1, storage: [{ key: legacy, value: document(value) }, { key: 'velocity-bank-storage', value: 'updated' }] });
      assert.equal(snapshot.importLocalDemoSnapshot(json, port).ok, false);
      assert.deepEqual(io.values, before);
      assert.ok(io.writes.every(([, key]) => key !== canonical && key !== legacy));
    }
  });
  test('explicit full local reset clears all three physical Portfolio channels only within its allowlist', () => {
    const io = storage({ [legacy]: 'one', [canonical]: 'two', [active]: 'three', unrelated: 'keep' });
    const result = reset.clearLocalDemoData(io);
    assert.equal(result.cleared, 3); assert.equal(result.attempted, reset.LOCAL_DEMO_STORAGE_KEYS.length + 2);
    for (const key of [legacy, canonical, active]) assert.equal(io.getItem(key), null);
    assert.equal(io.getItem('unrelated'), 'keep');
  });
  console.log(`${cases} lender snapshot groups, ${failures} failed.`);
  if (failures) throw new Error(`${failures} lender snapshot groups failed.`);
  return cases;
}
module.exports = { runLenderSnapshotTests };
if (require.main === module) runLenderSnapshotTests();
