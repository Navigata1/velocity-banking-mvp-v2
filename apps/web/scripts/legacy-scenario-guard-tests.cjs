/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '../src'), key = 'velocity-bank-storage';
function environment(raw) {
  const values = new Map(raw === undefined ? [] : [[key, raw]]), cache = new Map(), writes = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem(key, raw) { writes.push(['set', key]); values.set(key, raw); },
    removeItem(key) { writes.push(['remove', key]); values.delete(key); } };
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    if (!fs.existsSync(file)) return {};
    const loaded = { exports: {} }; cache.set(file, loaded);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, { module: loaded, exports: loaded.exports, console, window: { localStorage: storage }, localStorage: storage, require: id => {
      if (id.startsWith('@interestshield/')) return load(fs.realpathSync(require.resolve(id)));
      if (id.startsWith('@/')) return load(path.resolve(root, id.slice(2) + '.ts'));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id + '.ts'));
      return require(id);
    } }, { filename: file }); return loaded.exports;
  }
  return { storage, values, writes, load, financial: () => load(path.join(root, 'stores/financial-store.ts')),
    guard: () => load(path.join(root, 'stores/legacy-scenario-storage.ts')) };
}
const document = terms => JSON.stringify({ version: 0, state: { monthlyIncome: 8200, monthlyExpenses: 4700,
  loc: { limit: 25000, balance: 3200, interestRate: .085, ...(terms === undefined ? {} : { lenderTerms: terms }) } } }, null, 3);
function runLegacyScenarioGuardTests() {
  let cases = 0, failures = 0;
  function test(name, fn) { cases++; try { fn(); console.log('PASS legacy scenario guard ' + name); }
    catch (error) { failures++; console.error('FAIL legacy scenario guard ' + name + ': ' + error.message); } }
  test('unsupported at-rest terms cannot become accepted default forecasts or be overwritten on an unrelated edit', () => {
    for (const terms of [{ annualFee: 75 }, {}, null]) {
      const raw = document(terms), e = environment(raw), store = e.financial().useFinancialStore;
      assert.equal(store.getState().getVelocityPayoff('car').isPayoffPossible, false);
      assert.equal(store.getState().getBaselinePayoff('car').isPayoffPossible, false);
      store.getState().setMonthlyExpenses(4800);
      assert.equal(e.values.get(key), raw); assert.equal(e.writes.length, 0);
      assert.equal(e.guard().legacyScenarioStorage.getStatus().blocked, true);
    }
  });
  test('ordinary legacy scenarios retain existing hydration and editing behavior', () => {
    const e = environment(document()), store = e.financial().useFinancialStore;
    assert.equal(store.getState().monthlyIncome, 8200);
    assert.equal(store.getState().getVelocityPayoff('car').isPayoffPossible, true);
    store.getState().setMonthlyExpenses(4800);
    assert.equal(JSON.parse(e.values.get(key)).state.monthlyExpenses, 4800); assert.ok(e.writes.length > 0);
  });
  test('the persisted-state sanitizer itself rejects unsupported extensions instead of stripping them', () => {
    const e = environment(), api = e.financial();
    assert.throws(() => api.sanitizePersistedFinancialState(JSON.parse(document({ annualFee: 75 })).state, api.useFinancialStore.getState()), /version|Portfolio|terms/i);
  });
  test('blocked storage remains read-only after external source changes until a new adapter is created', () => {
    const e = environment(document({})), api = e.guard();
    assert.equal(typeof api.createLegacyScenarioStorage, 'function');
    const guard = api.createLegacyScenarioStorage(() => e.storage);
    assert.equal(guard.getItem(key), null); const failure = guard.getStatus();
    e.values.set(key, document()); guard.setItem(key, document()); guard.removeItem(key);
    assert.equal(e.writes.length, 0); assert.equal(guard.getStatus(), failure);
    assert.equal(api.createLegacyScenarioStorage(() => e.storage).getItem(key), document());
  });
  test('unsupported newly supplied writes reject without touching destination bytes', () => {
    const e = environment(document()), api = e.guard();
    assert.equal(typeof api.createLegacyScenarioStorage, 'function');
    const guard = api.createLegacyScenarioStorage(() => e.storage);
    assert.throws(() => guard.setItem(key, document({ annualFee: 75 })), /version|Portfolio|terms/i);
    assert.equal(e.writes.length, 0); assert.equal(e.values.get(key), document());
  });
  test('terms introduced after hydration cannot be erased by a later unrelated edit', () => {
    const e = environment(document()), store = e.financial().useFinancialStore, raw = document({ annualFee: 75 });
    e.values.set(key, raw); const before = e.writes.length;
    store.getState().setMonthlyExpenses(4800);
    assert.equal(e.values.get(key), raw); assert.equal(e.writes.length, before);
    assert.equal(e.guard().legacyScenarioStorage.getStatus().blocked, true);
    assert.equal(store.getState().getVelocityPayoff('car').isPayoffPossible, false);
  });
  test('saving or removing without a prior read must preflight the current legacy source', () => {
    for (const operation of ['save', 'remove']) {
      const raw = document({}), e = environment(raw), guard = e.guard().createLegacyScenarioStorage(() => e.storage);
      if (operation === 'save') guard.setItem(key, document()); else guard.removeItem(key);
      assert.equal(e.values.get(key), raw); assert.equal(e.writes.length, 0); assert.equal(guard.getStatus().blocked, true);
    }
  });
  console.log(`${cases} legacy scenario guard groups, ${failures} failed.`);
  if (failures) throw new Error(`${failures} legacy scenario guard groups failed.`);
  return cases;
}
module.exports = { runLegacyScenarioGuardTests };
if (require.main === module) runLegacyScenarioGuardTests();
