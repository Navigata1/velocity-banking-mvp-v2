/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const { datedBookFixture } = require('./dated-codec-tests.cjs');
const root = path.resolve(__dirname, '../src');
const keys = [1, 2, 3, 4].map(version => `interestshield-portfolio-v${version}`);
const [legacy, canonical, terms, dated] = keys;
const plain = value => JSON.parse(JSON.stringify(value));
const document = (data, version = 4) => JSON.stringify({ version, ...(version === 1 ? {} : { aprUnit: 'decimal' }), data }, null, 4) + '\n';
function oldBook() { const value = datedBookFixture(); delete value.datedPlan; delete value.loc.lenderTerms; return value; }
function storage(initial = {}) {
  const values = new Map(Object.entries(initial)), calls = [];
  let failure = false;
  return { values, calls, fail(value) { failure = value; },
    getItem(key) { calls.push(['get', key]); return values.get(key) ?? null; },
    setItem(key, value) { calls.push(['set', key]); if (failure) throw new Error('Synthetic quota failure'); values.set(key, value); },
    removeItem(key) { calls.push(['remove', key]); values.delete(key); } };
}
function environment(initial = {}) {
  const io = storage(initial), cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const loaded = { exports: {} }; cache.set(file, loaded);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText, { module: loaded, exports: loaded.exports, console, window: { localStorage: io }, require: id => {
      if (id.startsWith('@interestshield/')) return load(fs.realpathSync(require.resolve(id)));
      if (id.startsWith('@/')) return load(path.join(root, id.slice(2) + '.ts'));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id + '.ts'));
      return require(id);
    } }, { filename: file });
    return loaded.exports;
  }
  return { io, load: relative => load(path.join(root, relative)),
    adapter: () => load(path.join(root, 'stores/portfolio-persistence.ts')).createPortfolioPersistence(io),
    store: () => load(path.join(root, 'stores/portfolio-store.ts')) };
}
const writes = io => io.calls.filter(([op]) => op !== 'get');
function runDatedStorageTests() {
  let count = 0, failed = 0;
  function test(name, fn) { count++; try { fn(); console.log('PASS dated storage ' + name); }
    catch (error) { failed++; console.error('FAIL dated storage ' + name + ': ' + error.message); } }
  test('active4 alone is read before corrupt archives, with logical wrapper2 and clone independence', () => {
    const value = datedBookFixture(), raw = document(value);
    const e = environment({ [dated]: raw, [terms]: '{bad3', [canonical]: '{bad2', [legacy]: '{bad1' });
    const adapter = e.adapter(); assert.deepEqual(e.io.calls, []);
    const read = adapter.getItem(legacy); assert.equal(read?.version, 2); assert.deepEqual(plain(read.state), value);
    assert.deepEqual(e.io.calls, [['get', dated]]); assert.equal(adapter.getDocumentVersion(), 4);
    read.state.datedPlan.cashEvents[0].amount = 999;
    assert.equal(adapter.getItem(legacy).state.datedPlan.cashEvents[0].amount, 500);
    assert.equal(e.io.getItem(dated), raw); assert.equal(writes(e.io).length, 0);
  });
  test('absence follows exact4>3>2>1 read priority without writes', () => {
    for (const version of [1, 2, 3, 4]) {
      const initial = Object.fromEntries(keys.slice(0, version).map((key, index) => [key, document(oldBook(), index + 1)]));
      const e = environment(initial), read = e.adapter().getItem(legacy);
      assert.deepEqual(plain(read.state), oldBook()); assert.equal(read.version, 2);
      assert.deepEqual(e.io.calls, keys.slice(version - 1).reverse().map(key => ['get', key]));
      assert.equal(writes(e.io).length, 0);
    }
  });
  test('present invalid4 latches reads and unchecked writes without archive fallback', () => {
    for (const raw of ['', '{', 'null', '[]', document(oldBook(), 3), document(oldBook(), 5),
      document({ ...datedBookFixture(), datedPlan: {} })]) {
      for (const readFirst of [true, false]) {
        const e = environment({ [dated]: raw, [terms]: document(oldBook(), 3) }), adapter = e.adapter();
        if (readFirst) assert.equal(adapter.getItem(legacy), null);
        adapter.setItem(legacy, { state: datedBookFixture(), version: 2 });
        assert.equal(adapter.getStatus().status, 'error'); assert.equal(adapter.canWrite(), false);
        assert.deepEqual(e.io.calls, [['get', dated]]); assert.equal(e.io.values.get(dated), raw);
        e.io.values.delete(dated); adapter.setItem(legacy, { state: oldBook(), version: 2 });
        assert.equal(writes(e.io).length, 0); assert.equal(adapter.getItem(legacy), null);
      }
    }
  });
  test('unchecked dated write adopts4 by copy and preserves source objects and all archives', () => {
    const archives = Object.fromEntries(keys.slice(0, 3).map((key, index) => [key, document(oldBook(), index + 1)]));
    const e = environment(archives), adapter = e.adapter(), value = datedBookFixture(), before = JSON.stringify(value);
    adapter.setItem(legacy, { state: value, version: 2 });
    assert.equal(adapter.getStatus().status, 'ready'); assert.equal(JSON.parse(e.io.values.get(dated)).version, 4);
    assert.deepEqual(JSON.parse(e.io.values.get(dated)).data, value); assert.equal(JSON.stringify(value), before);
    for (const [key, raw] of Object.entries(archives)) assert.equal(e.io.values.get(key), raw);
    assert.deepEqual(writes(e.io), [['set', dated]]);
  });
  test('explicit4 adoption and later context/profile removal stay4 without rewriting equivalent bytes', () => {
    const old = document(oldBook(), 3), e = environment({ [terms]: old }), adapter = e.adapter();
    adapter.setItem(legacy, { state: oldBook(), version: 2 }, 4);
    assert.equal(adapter.getDocumentVersion(), 4); assert.equal(e.io.values.get(terms), old);
    const raw = e.io.values.get(dated), before = writes(e.io).length;
    adapter.setItem(legacy, { state: oldBook(), version: 2 });
    assert.equal(writes(e.io).length, before); assert.equal(e.io.values.get(dated), raw);
    const value = datedBookFixture(); adapter.setItem(legacy, { state: value, version: 2 });
    delete value.datedPlan; delete value.loc.lenderTerms;
    adapter.setItem(legacy, { state: value, version: 2 });
    assert.equal(JSON.parse(e.io.values.get(dated)).version, 4); assert.deepEqual(JSON.parse(e.io.values.get(dated)).data, value);
    assert.equal(e.adapter().getDocumentVersion(), 4);
  });
  test('failed4 publication is retryable and does not acknowledge the older durable source', () => {
    const old = document(oldBook(), 3), e = environment({ [terms]: old }), adapter = e.adapter();
    e.io.fail(true); adapter.setItem(legacy, { state: datedBookFixture(), version: 2 });
    assert.equal(adapter.getStatus().status, 'error'); assert.equal(adapter.canWrite(), true);
    const failure = adapter.getStatus(); assert.equal(adapter.getItem(legacy).state.datedPlan, undefined);
    assert.equal(adapter.getStatus(), failure); assert.equal(e.io.values.has(dated), false);
    e.io.fail(false); adapter.setItem(legacy, { state: datedBookFixture(), version: 2 });
    assert.equal(adapter.getStatus().status, 'ready'); assert.equal(e.io.values.get(terms), old);
    assert.deepEqual(JSON.parse(e.io.values.get(dated)).data, datedBookFixture());
  });
  test('wrong logical wrappers and explicit dated downgrade requests reject before storage I/O', () => {
    for (const [wrapper, requested] of [[4, undefined], [2, 3], [2, 2], [2, 5]]) {
      const e = environment(), adapter = e.adapter();
      adapter.setItem(legacy, { state: datedBookFixture(), version: wrapper }, requested);
      assert.equal(adapter.getStatus().status, 'error'); assert.deepEqual(e.io.calls, []);
    }
  });
  test('dated extensions under old physical channels cannot be silently dropped or overwritten', () => {
    for (const version of [1, 2, 3]) {
      const raw = document(datedBookFixture(), version), e = environment({ [keys[version - 1]]: raw }), adapter = e.adapter();
      adapter.setItem(legacy, { state: oldBook(), version: 2 });
      assert.equal(adapter.canWrite(), false); assert.equal(writes(e.io).length, 0);
      assert.equal(e.io.values.get(keys[version - 1]), raw);
    }
  });
  test('store action saves cloned4 before state subscribers observe it and round-trips on reload', () => {
    const old = document(oldBook(), 3), e = environment({ [terms]: old });
    const { usePortfolioStore: store } = e.store(), plan = datedBookFixture().datedPlan;
    assert.equal(typeof store.getState().setDatedPlan, 'function'); let observed = 0;
    const unsubscribe = store.subscribe(state => { if (state.datedPlan) {
      observed++; assert.deepEqual(JSON.parse(e.io.values.get(dated)).data.datedPlan, plain(state.datedPlan));
    } });
    assert.equal(store.getState().setDatedPlan(plan).ok, true); unsubscribe(); assert.ok(observed > 0);
    plan.cashEvents[0].amount = 999; assert.equal(store.getState().datedPlan.cashEvents[0].amount, 500);
    assert.equal(e.io.values.get(terms), old); assert.equal(JSON.parse(store.getState().exportState()).version, 4);
    const reloaded = environment({ [dated]: e.io.values.get(dated) }).store().usePortfolioStore;
    assert.equal(reloaded.getState().datedPlan.cashEvents[0].amount, 500);
  });
  test('store failed adoption leaves state untouched, retries identically, and removes context/profile sticky4', () => {
    const e = environment({ [terms]: document(oldBook(), 3) }), { usePortfolioStore: store } = e.store();
    assert.equal(typeof store.getState().setDatedPlan, 'function'); const before = store.getState().exportState();
    e.io.fail(true); assert.equal(store.getState().setDatedPlan(datedBookFixture().datedPlan).ok, false);
    assert.equal(store.getState().exportState(), before); assert.equal(e.io.values.has(dated), false);
    e.io.fail(false); assert.equal(store.getState().setDatedPlan(datedBookFixture().datedPlan).ok, true);
    assert.equal(store.getState().setLenderTerms({ annualFee: 0 }).ok, true);
    assert.equal(store.getState().setDatedPlan(null).ok, true); assert.equal(store.getState().datedPlan, undefined);
    assert.equal(store.getState().setLenderTerms(null).ok, true);
    const exported = JSON.parse(store.getState().exportState()); assert.equal(exported.version, 4);
    assert.equal('datedPlan' in exported.data, false); assert.equal('lenderTerms' in exported.data.loc, false);
    assert.equal(environment({ [dated]: e.io.values.get(dated) }).store().usePortfolioStore.getState().datedPlan, undefined);
  });
  test('identical4 import/action is a byte and state no-op; same-data explicit4 still adopts4', () => {
    const raw = document(datedBookFixture()), e = environment({ [dated]: raw }), { usePortfolioStore: store } = e.store();
    assert.equal(typeof store.getState().setDatedPlan, 'function'); let notices = 0; const before = writes(e.io).length;
    const unsubscribe = store.subscribe(() => notices++);
    assert.equal(store.getState().setDatedPlan(datedBookFixture().datedPlan).ok, true);
    assert.equal(store.getState().importState(raw).ok, true); unsubscribe();
    assert.equal(notices, 0); assert.equal(writes(e.io).length, before); assert.equal(e.io.values.get(dated), raw);
    const other = environment({ [canonical]: document(oldBook(), 2) }), second = other.store().usePortfolioStore;
    let adoptedNotices = 0; second.subscribe(() => adoptedNotices++);
    assert.equal(second.getState().importState(document(oldBook(), 4)).ok, true);
    assert.equal(JSON.parse(other.io.values.get(dated)).version, 4); assert.equal(adoptedNotices, 0);
  });
  test('failed4 state edits require a real retry even for identical dated input', () => {
    const e = environment({ [dated]: document(datedBookFixture()) }), { usePortfolioStore: store, portfolioPersistence } = e.store();
    assert.equal(typeof store.getState().setDatedPlan, 'function');
    e.io.fail(true); store.getState().setMonthlyExpenses(201);
    assert.equal(portfolioPersistence.getStatus().status, 'error'); assert.equal(JSON.parse(e.io.values.get(dated)).data.monthlyExpenses, 200);
    e.io.fail(false); assert.equal(store.getState().setDatedPlan(datedBookFixture().datedPlan).ok, true);
    assert.equal(portfolioPersistence.getStatus().status, 'ready'); assert.equal(JSON.parse(e.io.values.get(dated)).data.monthlyExpenses, 201);
  });
  test('store corrupt4 latch and invalid plan/import cannot publish state or overwrite bytes', () => {
    const e = environment({ [dated]: '{bad4' }), { usePortfolioStore: store } = e.store();
    assert.equal(typeof store.getState().setDatedPlan, 'function'); const state = store.getState();
    assert.equal(state.setDatedPlan(datedBookFixture().datedPlan).ok, false);
    assert.equal(state.importState(document(datedBookFixture())).ok, false);
    assert.equal(writes(e.io).length, 0); assert.equal(e.io.values.get(dated), '{bad4');
    const valid = environment({ [dated]: document(datedBookFixture()) }), current = valid.store().usePortfolioStore;
    const before = current.getState();
    assert.equal(before.setDatedPlan({ ...datedBookFixture().datedPlan, supported: true }).ok, false);
    assert.equal(before.importState(document(datedBookFixture(), 3)).ok, false);
    assert.equal(current.getState(), before); assert.equal(writes(valid.io).length, 0);
  });
  test('old import into active4 clears dated context and keeps all archived channels', () => {
    const old = document(oldBook(), 3), e = environment({ [dated]: document(datedBookFixture()), [terms]: old });
    const store = e.store().usePortfolioStore; assert.equal(store.getState().importState(document(oldBook(), 2)).ok, true);
    assert.equal(store.getState().datedPlan, undefined); assert.equal(e.io.values.get(terms), old);
    const exported = JSON.parse(store.getState().exportState()); assert.equal(exported.version, 4); assert.deepEqual(exported.data, oldBook());
  });
  test('legacy sanitizer carries a cloned context and rejects malformed context instead of stripping it', () => {
    const e = environment(), api = e.store(), plan = datedBookFixture().datedPlan;
    const result = api.sanitizePersistedPortfolioState({ datedPlan: plan }, api.usePortfolioStore.getState());
    assert.deepEqual(plain(result.datedPlan), plan); plan.cashEvents[0].amount = 999;
    assert.equal(result.datedPlan.cashEvents[0].amount, 500);
    assert.throws(() => api.sanitizePersistedPortfolioState({ datedPlan: {} }, api.usePortfolioStore.getState()));
  });
  test('explicit active4 removal preserves archives and cannot clear a corruption latch', () => {
    const archives = Object.fromEntries(keys.slice(0, 3).map((key, index) => [key, document(oldBook(), index + 1)]));
    const e = environment({ ...archives, [dated]: '{bad4' }), adapter = e.adapter();
    assert.equal(adapter.getItem(legacy), null); const failure = adapter.getStatus();
    adapter.removeItem(legacy); assert.equal(e.io.values.has(dated), false); assert.equal(adapter.getStatus(), failure);
    for (const [key, raw] of Object.entries(archives)) assert.equal(e.io.values.get(key), raw);
    adapter.setItem(legacy, { state: datedBookFixture(), version: 2 }); assert.equal(e.io.values.has(dated), false);
    assert.equal(e.adapter().getDocumentVersion(), 3);
  });
  test('rehydration after snapshot removal clears live dated context without downgrading4', () => {
    const e = environment({ [dated]: document(datedBookFixture()) }), { usePortfolioStore: store } = e.store();
    const snapshot = e.load('app/settings/local-demo-snapshot.ts');
    const payload = JSON.stringify({ version: 1, storage: [{ key: legacy, value: document(oldBook(), 2) }] });
    assert.equal(snapshot.importLocalDemoSnapshot(payload, e.io).ok, true); store.persist.rehydrate();
    assert.equal(store.getState().datedPlan, undefined); assert.equal(JSON.parse(store.getState().exportState()).version, 4);
    assert.equal('datedPlan' in JSON.parse(e.io.values.get(dated)).data, false);
  });
  test('identical old-format import preflights newly corrupted active4 instead of claiming a no-op success', () => {
    const e = environment({ [dated]: document(oldBook()) }), { usePortfolioStore: store, portfolioPersistence } = e.store();
    e.io.values.set(dated, '{corrupted after hydration');
    assert.equal(store.getState().importState(document(oldBook(), 2)).ok, false);
    assert.equal(portfolioPersistence.canWrite(), false); assert.equal(writes(e.io).length, 0);
    assert.equal(e.io.values.get(dated), '{corrupted after hydration');
  });
  test('identical dated save cannot silently replace a different externally saved4 book', () => {
    const e = environment({ [dated]: document(datedBookFixture()) }), { usePortfolioStore: store } = e.store();
    const changed = datedBookFixture(); changed.monthlyIncome = 800; e.io.values.set(dated, document(changed));
    const raw = e.io.values.get(dated);
    assert.equal(store.getState().setDatedPlan(datedBookFixture().datedPlan).ok, false);
    assert.equal(e.io.values.get(dated), raw); assert.equal(writes(e.io).length, 0);
  });
  test('ordinary stale edits preserve a newer same-schema dated plan and pause persistence', () => {
    const e = environment({ [dated]: document(datedBookFixture()) }), { usePortfolioStore: store, portfolioPersistence } = e.store();
    const changed = datedBookFixture(); changed.datedPlan.cashReserve = 75; changed.datedPlan.openingCash = 100;
    const external = document(changed); e.io.values.set(dated, external);
    store.getState().setMonthlyIncome(800);
    assert.equal(e.io.values.get(dated), external); assert.equal(writes(e.io).length, 0);
    assert.equal(portfolioPersistence.getStatus().status, 'error'); assert.equal(portfolioPersistence.canWrite(), false);
    assert.throws(() => store.getState().exportState());
  });
  test('same-data import cannot acknowledge or overwrite an externally changed dated context', () => {
    const e = environment({ [dated]: document(datedBookFixture()) }), { usePortfolioStore: store, portfolioPersistence } = e.store();
    const exported = store.getState().exportState(), changed = datedBookFixture(); changed.datedPlan.openingCash = 100;
    const external = document(changed); e.io.values.set(dated, external);
    assert.equal(store.getState().importState(exported).ok, false); assert.equal(e.io.values.get(dated), external);
    assert.equal(writes(e.io).length, 0); assert.equal(portfolioPersistence.canWrite(), false);
  });
  test('equivalent old1 and absent-default imports retain the original no-migration no-op behavior', () => {
    for (const initial of [{ [legacy]: document(oldBook(), 1) }, {}]) {
      const e = environment(initial), { usePortfolioStore: store } = e.store();
      const raw = store.getState().exportState(); let notices = 0; const unsubscribe = store.subscribe(() => notices++);
      assert.equal(store.getState().importState(raw).ok, true); unsubscribe();
      assert.equal(writes(e.io).length, 0); assert.equal(notices, 0);
      assert.deepEqual([...e.io.values], Object.entries(initial));
    }
  });
  test('store export cannot relabel default or stale state as a backup after active4 corruption', () => {
    for (const initial of ['{invalid4', document(datedBookFixture())]) {
      const e = environment({ [dated]: initial }), { usePortfolioStore: store, portfolioPersistence } = e.store();
      e.io.values.set(dated, '{invalid4');
      assert.throws(() => store.getState().exportState(), /Portfolio|read|review/i);
      assert.equal(portfolioPersistence.canWrite(), false); assert.equal(writes(e.io).length, 0);
      assert.equal(e.io.values.get(dated), '{invalid4');
    }
  });
  console.log(`${count} dated storage groups, ${failed} failed. Transport only; no dated numerical assertions.`);
  if (failed) throw new Error(`${failed} dated storage groups failed.`);
  return count;
}
module.exports = { runDatedStorageTests, environment, storage, keys, document, oldBook, plain, writes };
if (require.main === module) runDatedStorageTests();
