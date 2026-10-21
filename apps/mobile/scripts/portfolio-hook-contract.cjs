/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

process.env.NODE_ENV = 'development';
global.IS_REACT_ACT_ENVIRONMENT = true;

// No host elements are rendered. These surfaces only let installed React DOM reconcile null.
function hostElement(tag) {
  return {
    nodeType: 1, nodeName: tag.toUpperCase(), tagName: tag.toUpperCase(),
    namespaceURI: 'http://www.w3.org/1999/xhtml', style: {},
    setAttribute() {}, removeAttribute() {}, addEventListener() {}, removeEventListener() {},
    appendChild() {}, removeChild() {}, contains() { return false; },
  };
}
const document = {
  nodeType: 9, createElement: hostElement, addEventListener() {}, removeEventListener() {}, activeElement: null,
};
document.documentElement = hostElement('html');
document.body = hostElement('body');
const window = {
  document, HTMLElement: class {}, HTMLIFrameElement: class {},
  addEventListener() {}, removeEventListener() {}, getSelection() { return null; },
};
document.defaultView = window;
global.window = window;
global.document = document;

const React = require('react');
const { createRoot } = require('react-dom/client');
const mobileRoot = path.resolve(__dirname, '..');
const hookPath = path.join(mobileRoot, 'hooks/use-persisted-mobile-portfolio.ts');
const sessionPath = path.join(mobileRoot, 'lib/mobile-portfolio-session.ts');
// Read the actual production sources once so a concurrent parent edit cannot mix hook versions.
const sourceSnapshot = new Map([hookPath, sessionPath].map(file => [file, fs.readFileSync(file, 'utf8')]));
const ownerA = '00000000-0000-4000-8000-00000000000a';
const ownerB = '00000000-0000-4000-8000-00000000000b';
const base = {
  monthlyIncome: 8200.451, monthlyExpenses: 4700.125, extraMonthlyPayment: 50, chunkAmount: 1000,
  loc: { limit: 1000, balance: 50.125, apr: 0.12 }, strategy: 'avalanche', focusMode: 'single', splitRatioPrimary: 0.7,
  debts: [{ id: 'loan', name: 'Loan', category: 'custom', kind: 'amortized', balance: 120.70001, apr: 2,
    minPaymentRule: { type: 'fixed', amount: 30.005 }, paymentSource: 'checking' }],
};
const clone = value => JSON.parse(JSON.stringify(value));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
const outcome = promise => promise.then(
  value => ({ status: 'fulfilled', value }),
  error => ({ status: 'rejected', error: error.message })
);

function createHarness() {
  const records = new Map([
    [ownerA, { book: clone(base), revision: 1 }],
    [ownerB, { book: { ...clone(base), monthlyIncome: 9100 }, revision: 1 }],
  ]);
  const calls = { loads: [], saves: [] };
  const gates = { load: new Map(), save: new Map() };
  const moduleCache = new Map();
  const scope = owner => `portfolio-contract.${owner ?? 'guest'}`;
  function holdNext(kind, owner) {
    const gate = { started: deferred(), release: deferred() };
    assert.equal(gates[kind].has(owner), false, 'only one next-operation gate per owner');
    gates[kind].set(owner, gate);
    return gate;
  }
  async function waitForGate(kind, owner) {
    const gate = gates[kind].get(owner);
    if (!gate) return;
    gates[kind].delete(owner);
    gate.started.resolve();
    await gate.release.promise;
  }
  const storage = {
    mobilePortfolioStorageKey: scope,
    async loadMobilePortfolioForOwner(owner) {
      calls.loads.push(owner);
      await waitForGate('load', owner);
      const saved = records.get(owner);
      return { backend: 'local-storage', book: saved ? clone(saved.book) : null, revision: saved?.revision ?? 0 };
    },
    async saveMobilePortfolioForOwner(owner, book, options) {
      const candidate = clone(book), expectedRevision = options.expectedRevision;
      calls.saves.push({ owner, book: candidate, expectedRevision });
      await waitForGate('save', owner);
      const revision = records.get(owner)?.revision ?? 0;
      if (revision !== expectedRevision) throw new Error('stale revision');
      records.set(owner, { book: candidate, revision: revision + 1 });
      return { backend: 'local-storage', revision: revision + 1 };
    },
  };
  function loadModule(file) {
    if (moduleCache.has(file)) return moduleCache.get(file).exports;
    const testModule = { exports: {} };
    moduleCache.set(file, testModule);
    const source = sourceSnapshot.get(file) ?? fs.readFileSync(file, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    const localRequire = id => {
      if (id === 'react') return React;
      if (id === '@/lib/mobile-portfolio-session') return loadModule(sessionPath);
      if (file === sessionPath && id === './mobile-portfolio-storage') return storage;
      if (file === sessionPath && id === './supabase/auth-storage') return { isMobileSnapshotOwnerLock: () => false };
      if (id.startsWith('@interestshield/financial-engine')) return loadModule(fs.realpathSync(require.resolve(id)));
      if (id.startsWith('.')) {
        const basePath = path.resolve(path.dirname(file), id);
        const resolved = [basePath, `${basePath}.ts`, path.join(basePath, 'index.ts')]
          .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (!resolved) throw new Error(`Cannot resolve ${id} from ${file}`);
        return loadModule(resolved);
      }
      return require(id);
    };
    vm.runInNewContext(output, { module: testModule, exports: testModule.exports, require: localRequire, console }, { filename: file });
    return testModule.exports;
  }
  const { usePersistedMobilePortfolio } = loadModule(hookPath);
  let committed = null, mounted = true, commits = 0, cleanups = 0;
  const renders = [];
  const suspended = deferred();
  function Probe({ owner, ready, suspend }) {
    const value = usePersistedMobilePortfolio(owner, ready);
    renders.push({ owner, book: value.book, isHydrated: value.isHydrated, storageScope: value.storageScope });
    React.useLayoutEffect(() => { committed = value; commits++; return () => { cleanups++; }; });
    if (suspend) throw suspended.promise;
    return null;
  }
  const container = hostElement('div');
  container.ownerDocument = document;
  const root = createRoot(container);
  function tree(owner, { ready = true, suspend = false, strict = false } = {}) {
    const content = React.createElement(React.Suspense, { fallback: null }, React.createElement(Probe, { owner, ready, suspend }));
    return strict ? React.createElement(React.StrictMode, null, content) : content;
  }
  return {
    calls, renders, scope,
    committed: () => committed,
    effectCounts: () => ({ commits, cleanups }),
    stored: owner => clone(records.get(owner)),
    holdNext,
    async render(owner, options) { await React.act(async () => { root.render(tree(owner, options)); }); },
    async transition(owner) { await React.act(async () => { React.startTransition(() => root.render(tree(owner, { suspend: true }))); }); },
    async unmount() {
      if (!mounted) return;
      await React.act(async () => { root.unmount(); });
      mounted = false;
    },
  };
}

let count = 0, failures = 0;
async function test(name, run) {
  count++;
  const h = createHarness();
  try {
    await run(h);
    console.log(`PASS Portfolio hook ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL Portfolio hook ${name}`);
    console.error(error);
  } finally {
    await h.unmount();
  }
}

async function main() {
  console.log(`React ${React.version}; installed React DOM null host; memory storage ports only.`);
  for (const [file, source] of sourceSnapshot) {
    console.log(`SOURCE ${path.relative(mobileRoot, file)} sha256=${crypto.createHash('sha256').update(source).digest('hex')}`);
  }
  await test('StrictMode cleanup replay hydrates and continues publishing saved edits', async h => {
    await h.render(ownerA, { strict: true });
    assert.ok(h.effectCounts().cleanups >= 1, 'StrictMode must exercise effect cleanup');
    assert.equal(h.committed().status, 'saved');
    assert.equal(h.committed().book.monthlyIncome, 8200.451);
    assert.equal(h.calls.saves.length, 0, 'hydration never saves defaults');
    await React.act(async () => { await h.committed().update(book => ({ ...book, monthlyIncome: 9000 })); });
    assert.equal(h.committed().status, 'saved');
    assert.equal(h.committed().revision, 2);
    assert.equal(h.stored(ownerA).book.monthlyIncome, 9000);
  });
  await test('uncommitted suspended owner renders preserve committed-owner callbacks', async h => {
    await h.render(ownerA);
    const visible = h.committed();
    await h.transition(ownerB);
    assert.ok(h.renders.some(render => render.owner === ownerB), 'owner B must actually render');
    assert.equal(h.committed(), visible, 'suspended B must not commit');
    let result;
    await React.act(async () => { result = await outcome(visible.update(book => ({ ...book, monthlyIncome: 9000 }))); });
    assert.equal(result.status, 'fulfilled', `committed owner A must remain valid: ${result.error}`);
    assert.equal(h.stored(ownerA).book.monthlyIncome, 9000);
    assert.equal(h.stored(ownerB).book.monthlyIncome, 9100);
  });
  await test('abandoned owner renders cannot strand an already-started save as saving', async h => {
    await h.render(ownerA);
    const gate = h.holdNext('save', ownerA);
    let saved;
    try {
      await React.act(async () => {
        saved = outcome(h.committed().update(book => ({ ...book, monthlyIncome: 9000 })));
        await gate.started.promise;
      });
      await h.transition(ownerB);
      await React.act(async () => { gate.release.resolve(); await saved; });
      await h.render(ownerA);
      await React.act(async () => {
        await h.committed().update(book => ({ ...book, monthlyExpenses: 1234 }));
        await h.committed().flush();
      });
      const result = await saved;
      assert.equal(result.status, 'fulfilled', `durable A save must not reject for a speculative owner: ${result.error}`);
      assert.equal(h.committed().status, 'saved', 'successful subsequent edit and flush cannot remain saving');
      assert.deepEqual(clone(h.committed().book), h.stored(ownerA).book);
    } finally { gate.release.resolve(); }
  });
  await test('unmounted stale reload cannot reactivate an owner or enable stale writes', async h => {
    await h.render(ownerA);
    const stale = h.committed();
    await h.unmount();
    const loads = h.calls.loads.length;
    await stale.reload();
    const result = await outcome(stale.update(book => ({ ...book, monthlyIncome: 7777 })));
    assert.equal(h.calls.loads.length, loads, 'stale reload must not start storage IO after unmount');
    assert.equal(result.status, 'rejected', 'unmounted stale update must reject');
    assert.equal(h.calls.saves.length, 0);
    assert.equal(h.stored(ownerA).book.monthlyIncome, 8200.451);
  });
  await test('committed owner switch hides outgoing data and invalidates old callbacks', async h => {
    await h.render(ownerA);
    const stale = h.committed();
    await h.render(ownerB);
    const firstB = h.renders.find(render => render.owner === ownerB);
    assert.equal(firstB.book, null, 'first B render must not expose A data');
    assert.equal(firstB.isHydrated, false);
    assert.equal(firstB.storageScope, h.scope(ownerB));
    assert.equal(h.committed().book.monthlyIncome, 9100);
    const loads = h.calls.loads.length;
    await stale.reload();
    assert.equal(h.calls.loads.length, loads);
    assert.equal((await outcome(stale.update(book => ({ ...book, monthlyIncome: 7777 })))).status, 'rejected');
    await React.act(async () => { await h.committed().update(book => ({ ...book, monthlyIncome: 9200 })); });
    assert.deepEqual(h.calls.saves.map(call => call.owner), [ownerB]);
    assert.equal(h.stored(ownerA).book.monthlyIncome, 8200.451);
    assert.equal(h.stored(ownerB).book.monthlyIncome, 9200);
  });
  await test('late outgoing hydration cannot publish into the committed next owner', async h => {
    const gate = h.holdNext('load', ownerA);
    try {
      await h.render(ownerA);
      await gate.started.promise;
      const stale = h.committed();
      await h.render(ownerB);
      await React.act(async () => { gate.release.resolve(); });
      assert.equal(h.committed().storageScope, h.scope(ownerB));
      assert.equal(h.committed().book.monthlyIncome, 9100);
      assert.equal(h.committed().status, 'saved');
      assert.equal((await outcome(stale.update(book => ({ ...book, monthlyIncome: 7777 })))).status, 'rejected');
      assert.equal(h.calls.saves.length, 0);
    } finally { gate.release.resolve(); }
  });
  await test('auth readiness gates hydration reload and writes until a ready commit', async h => {
    await h.render(ownerA, { ready: false, strict: true });
    const blocked = h.committed();
    assert.equal(blocked.book, null);
    assert.equal(blocked.isHydrated, false);
    await blocked.reload();
    assert.equal(h.calls.loads.length, 0);
    assert.equal((await outcome(blocked.create(base))).status, 'rejected');
    await h.render(ownerA, { ready: true, strict: true });
    assert.equal(h.committed().status, 'saved');
    assert.equal(h.committed().book.monthlyIncome, 8200.451);
    assert.equal((await outcome(blocked.update(book => ({ ...book, monthlyIncome: 7777 })))).status, 'rejected');
    assert.equal(h.calls.saves.length, 0);
  });
  console.log(`${count} Portfolio hook contracts: ${count - failures} passed, ${failures} failed. No browser, native device, physical storage, or cloud proof.`);
  if (failures) process.exitCode = 1;
}

const watchdog = setTimeout(() => { console.error('Portfolio hook contracts exceeded their finite 15-second deadline.'); process.exit(1); }, 15000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
