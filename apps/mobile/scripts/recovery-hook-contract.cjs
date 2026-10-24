/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

process.env.NODE_ENV = 'development';
global.IS_REACT_ACT_ENVIRONMENT = true;

// Installed React DOM reconciles null only; this host cannot render browser or device UI.
function hostElement(tag) {
  return { nodeType: 1, nodeName: tag.toUpperCase(), tagName: tag.toUpperCase(),
    namespaceURI: 'http://www.w3.org/1999/xhtml', style: {},
    setAttribute() {}, removeAttribute() {}, addEventListener() {}, removeEventListener() {},
    appendChild() {}, removeChild() {}, contains() { return false; } };
}
const document = { nodeType: 9, createElement: hostElement, addEventListener() {}, removeEventListener() {}, activeElement: null };
document.documentElement = hostElement('html');
document.body = hostElement('body');
const window = { document, HTMLElement: class {}, HTMLIFrameElement: class {},
  addEventListener() {}, removeEventListener() {}, getSelection() { return null; } };
document.defaultView = window;
global.window = window;
global.document = document;

const React = require('react');
const { createRoot } = require('react-dom/client');
const mobileRoot = path.resolve(__dirname, '..');
const assumptionsPath = path.join(mobileRoot, 'hooks/use-persisted-mobile-assumptions.ts');
const authPath = path.join(mobileRoot, 'components/mobile-auth-provider.tsx');
const sources = new Map([assumptionsPath, authPath].map(file => [file, fs.readFileSync(file, 'utf8')]));
const ownerA = '00000000-0000-4000-8000-00000000000a';
const ownerB = '00000000-0000-4000-8000-00000000000b';
const defaultInput = { activeDebtName: 'Loan', monthlyIncome: 7000, monthlyExpenses: 4500, chunkAmount: 1000,
  activeDebt: { balance: 12000, apr: 0.07, monthlyPayment: 300 }, loc: { limit: 5000, balance: 100, apr: 0.12 } };
const base = { ...defaultInput, monthlyIncome: 8200.451, monthlyExpenses: 4700.125 };
const clone = value => JSON.parse(JSON.stringify(value));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const outcome = promise => Promise.resolve(promise).then(
  value => ({ status: 'fulfilled', value }), error => ({ status: 'rejected', error })
);
const tick = () => new Promise(resolve => setImmediate(resolve));

function loadSource(file, mocks) {
  const testModule = { exports: {} };
  const output = ts.transpileModule(sources.get(file), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const localRequire = id => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  vm.runInNewContext(output, {
    module: testModule, exports: testModule.exports, require: localRequire, console, Error,
  }, { filename: file });
  return testModule.exports;
}
function nullRoot() {
  const container = hostElement('div');
  container.ownerDocument = document;
  const root = createRoot(container);
  let mounted = true;
  return { root, async unmount() {
    if (!mounted) return;
    await React.act(async () => { root.unmount(); });
    mounted = false;
  } };
}

function assumptionsHarness() {
  const records = new Map([
    [ownerA, { input: clone(base), revision: 1 }],
    [ownerB, { input: { ...clone(base), monthlyIncome: 9100 }, revision: 1 }],
  ]);
  const attempts = [], writes = [], tails = new Map(), tokens = new WeakSet();
  const scope = owner => `recovery-contract.${owner ?? 'guest'}`;
  const validLock = (lock, owner) => !!lock && tokens.has(lock) && lock.ownerId === owner;
  function withOwnerLock(owner, action) {
    const previous = tails.get(owner) ?? Promise.resolve();
    const operation = previous.catch(() => undefined).then(async () => {
      const lock = Object.freeze({ ownerId: owner });
      tokens.add(lock);
      try { return await action(lock); } finally { tokens.delete(lock); }
    });
    tails.set(owner, operation.then(() => undefined, () => undefined));
    return operation;
  }
  const storage = {
    mobileAssumptionsStorageKey: scope,
    async loadMobileAssumptionsForOwner(owner) {
      return withOwnerLock(owner, async () => {
        const saved = records.get(owner);
        return { backend: 'local-storage', input: clone(saved?.input ?? defaultInput), revision: saved?.revision ?? 0, restored: !!saved };
      });
    },
    async saveMobileAssumptionsForOwner(owner, input, options = {}) {
      const candidate = clone(input), expected = options.expectedRevision;
      attempts.push({ owner, input: candidate, expectedRevision: expected, leased: !!options.ownerLock });
      const save = async () => {
        const revision = records.get(owner)?.revision ?? 0;
        if (expected !== undefined && expected !== revision) throw new Error('stale revision');
        records.set(owner, { input: candidate, revision: revision + 1 });
        writes.push({ owner, input: candidate, revision: revision + 1 });
        return { backend: 'local-storage', revision: revision + 1 };
      };
      if (options.ownerLock) {
        if (!validLock(options.ownerLock, owner)) throw new Error('invalid owner lease');
        return save();
      }
      return withOwnerLock(owner, save);
    },
  };
  const { usePersistedMobileAssumptions } = loadSource(assumptionsPath, {
    '@interestshield/financial-engine': { defaultMobileDashboardInput: clone(defaultInput) },
    '@/lib/mobile-assumption-storage': storage,
    '@/lib/supabase/auth-storage': { isMobileSnapshotOwnerLock: validLock, withMobileSnapshotOwnerLock: withOwnerLock },
  });
  let committed = null;
  const renders = [], suspended = deferred(), host = nullRoot();
  function Probe({ owner, suspend }) {
    const value = usePersistedMobileAssumptions(owner, true);
    renders.push(owner);
    React.useLayoutEffect(() => { committed = value; });
    if (suspend) throw suspended.promise;
    return null;
  }
  const tree = (owner, strict = false, suspend = false) => {
    const content = React.createElement(React.Suspense, { fallback: null }, React.createElement(Probe, { owner, suspend }));
    return strict ? React.createElement(React.StrictMode, null, content) : content;
  };
  return {
    attempts, writes, renders, withOwnerLock,
    current: () => committed,
    stored: owner => clone(records.get(owner)),
    async render(owner, strict = false) { await React.act(async () => { host.root.render(tree(owner, strict)); }); },
    async transition(owner) { await React.act(async () => { React.startTransition(() => host.root.render(tree(owner, false, true))); }); },
    async drain() {
      for (let round = 0; round < 4; round++) { await Promise.all([...tails.values()]); await tick(); }
    },
    unmount: host.unmount,
  };
}

function authHarness() {
  const plans = new Map(), listeners = new Set(), activeReplays = new Set();
  const resumes = [], replayStarts = [], replayStops = [];
  let account = ownerA, committed = null;
  const sessionFor = owner => owner === null ? null : {
    access_token: 'memory-token', refresh_token: 'memory-refresh', expires_in: 3600, token_type: 'bearer',
    user: { id: owner, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-20T00:00:00Z' },
  };
  const client = { auth: {
    onAuthStateChange(listener) { listeners.add(listener); return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } }; },
    getSession: async () => ({ data: { session: sessionFor(account) }, error: null }),
  } };
  function nextResume(owner) {
    const gate = deferred();
    const queue = plans.get(owner) ?? [];
    queue.push(gate); plans.set(owner, queue);
    return gate;
  }
  const api = loadSource(authPath, {
    'expo-linking': { createURL: route => `memory://${route}` },
    '@/lib/supabase/auth-lifecycle': { registerMobileAuthLifecycle: () => () => undefined },
    '@/lib/supabase/auth-deep-link': { registerMobileAuthDeepLinks: () => () => undefined },
    '@/lib/supabase/client': { createMobileSupabaseClient: () => client },
    '@/lib/supabase/snapshot-recovery': { resumePendingMobileSnapshotRecovery: owner => {
      resumes.push(owner);
      return plans.get(owner)?.shift()?.promise ?? Promise.resolve(false);
    } },
    '@/lib/supabase/snapshot-outbox-replay': { registerMobileSnapshotOutboxReplay: (_client, owner) => {
      const replay = { owner }; replayStarts.push(owner); activeReplays.add(replay);
      return () => { activeReplays.delete(replay); replayStops.push(owner); };
    } },
  });
  function Consumer() {
    const value = api.useMobileAuth();
    React.useLayoutEffect(() => { committed = value; });
    return null;
  }
  const host = nullRoot();
  return {
    resumes, replayStarts, replayStops, nextResume,
    current: () => committed,
    activeReplayOwners: () => [...activeReplays].map(item => item.owner),
    async mount() { await React.act(async () => {
      host.root.render(React.createElement(api.MobileAuthProvider, null, React.createElement(Consumer)));
    }); },
    async owner(owner) { await React.act(async () => {
      account = owner;
      for (const listener of listeners) listener(owner ? 'SIGNED_IN' : 'SIGNED_OUT', sessionFor(owner));
    }); },
    unmount: host.unmount,
  };
}

let count = 0, failures = 0;
async function test(name, create, run) {
  count++;
  const h = create();
  try { await run(h); console.log(`PASS Recovery hook ${name}`); }
  catch (error) { failures++; console.error(`FAIL Recovery hook ${name}`); console.error(error); }
  finally { await h.unmount(); }
}

async function main() {
  console.log(`React ${React.version}; actual assumptions hook/auth provider; installed React DOM null host and memory ports.`);
  for (const [file, source] of sources) console.log(`SOURCE ${path.relative(mobileRoot, file)} sha256=${crypto.createHash('sha256').update(source).digest('hex')}`);
  await test('queued autosaves cannot borrow a leased replacement revision and overwrite it', assumptionsHarness, async h => {
    await h.render(ownerA);
    assert.equal(h.current().isHydrated, true);
    const entered = deferred(), restore = deferred(), replaced = deferred(), release = deferred();
    const target = { ...clone(base), monthlyIncome: 15000, monthlyExpenses: 3000 };
    const holding = h.withOwnerLock(ownerA, async lock => {
      entered.resolve();
      await restore.promise;
      try { replaced.resolve(await outcome(h.current().replaceAssumptions(target, lock, 1))); }
      finally { await release.promise; }
    });
    try {
      await entered.promise;
      await React.act(async () => { h.current().setInput({ ...h.current().input, monthlyIncome: 9000 }); });
      assert.equal(h.attempts.length, 1, 'first autosave must reach storage and wait for the owner lock');
      await React.act(async () => { h.current().setInput({ ...h.current().input, monthlyExpenses: 1234 }); });
      assert.equal(h.attempts.length, 1, 'second autosave must still be queued inside the real hook');
      let replacement;
      await React.act(async () => { restore.resolve(); replacement = await replaced.promise; });
      assert.equal(replacement.status, 'fulfilled', 'leased replacement must not wait for its own locked autosave');
      assert.deepEqual(h.stored(ownerA), { input: target, revision: 2 });
      await React.act(async () => { release.resolve(); await holding; await h.drain(); });
      assert.deepEqual(h.stored(ownerA), { input: target, revision: 2 }, 'cancelled queued autosave must not borrow revision 2');
      await React.act(async () => { h.current().setInput({ ...h.current().input, monthlyExpenses: 2500 }); });
      await React.act(async () => { await h.drain(); });
      assert.equal(h.stored(ownerA).input.monthlyIncome, 15000);
      assert.equal(h.stored(ownerA).input.monthlyExpenses, 2500);
      assert.equal(h.stored(ownerA).revision, 3, 'fresh editing must use the reviewed replacement revision');
    } finally { restore.resolve(); release.resolve(); await holding; await h.drain(); }
  });
  await test('queued reset cannot borrow a leased replacement revision and overwrite it', assumptionsHarness, async h => {
    await h.render(ownerA);
    const entered = deferred(), restore = deferred(), replaced = deferred(), release = deferred();
    const target = { ...clone(base), monthlyIncome: 15000, monthlyExpenses: 3000 };
    const holding = h.withOwnerLock(ownerA, async lock => {
      entered.resolve();
      await restore.promise;
      try { replaced.resolve(await outcome(h.current().replaceAssumptions(target, lock, 1))); }
      finally { await release.promise; }
    });
    let reset;
    try {
      await entered.promise;
      await React.act(async () => { h.current().setInput({ ...h.current().input, monthlyIncome: 9000 }); });
      assert.equal(h.attempts.length, 1, 'prior autosave must wait for the owner lock');
      await React.act(async () => { reset = outcome(h.current().resetAssumptions()); });
      assert.equal(h.attempts.length, 1, 'reset must remain queued behind the blocked autosave');
      let replacement;
      await React.act(async () => { restore.resolve(); replacement = await replaced.promise; });
      assert.equal(replacement.status, 'fulfilled');
      assert.deepEqual(h.stored(ownerA), { input: target, revision: 2 });
      let resetResult;
      await React.act(async () => { release.resolve(); await holding; await h.drain(); resetResult = await reset; });
      assert.deepEqual(h.stored(ownerA), { input: target, revision: 2 }, 'cancelled reset must not borrow revision 2 and replace reviewed data with defaults');
      assert.equal(resetResult.status, 'rejected', 'restore invalidates the queued reset');
      assert.deepEqual(clone(h.current().input), target);
    } finally { restore.resolve(); release.resolve(); await holding; await h.drain(); if (reset) await reset; }
  });
  await test('invalid replacement owner lock rejects without cancelling pending edits', assumptionsHarness, async h => {
    await h.render(ownerA);
    const entered = deferred(), release = deferred();
    const holding = h.withOwnerLock(ownerA, async () => { entered.resolve(); await release.promise; });
    let invalid;
    try {
      await entered.promise;
      await React.act(async () => { h.current().setInput({ ...h.current().input, monthlyIncome: 9000 }); });
      await React.act(async () => { h.current().setInput({ ...h.current().input, monthlyExpenses: 1234 }); });
      assert.equal(h.attempts.length, 1);
      invalid = outcome(h.current().replaceAssumptions({ ...clone(base), monthlyIncome: 7777 }, { ownerId: ownerA }, 1));
      let result;
      await React.act(async () => { release.resolve(); await holding; await h.drain(); result = await invalid; });
      assert.equal(result.status, 'rejected', 'forged lease must reject');
      assert.deepEqual(h.stored(ownerA), { input: { ...clone(base), monthlyIncome: 9000, monthlyExpenses: 1234 }, revision: 3 },
        'invalid restore must leave both queued edits valid');
      assert.equal(h.attempts.length, 2, 'invalid lease must reject before a storage attempt');
      assert.equal(h.current().storageStatus, 'saved-local-storage');
    } finally { release.resolve(); await holding; await h.drain(); if (invalid) await invalid; }
  });
  await test('suspended uncommitted owner render preserves committed assumptions callbacks', assumptionsHarness, async h => {
    await h.render(ownerA);
    const visible = h.current();
    await h.transition(ownerB);
    assert.ok(h.renders.includes(ownerB)); assert.equal(h.current(), visible);
    await React.act(async () => { visible.setInput({ ...visible.input, monthlyIncome: 9000 }); });
    await React.act(async () => { await h.drain(); });
    assert.equal(h.stored(ownerA).input.monthlyIncome, 9000, 'committed owner A callback must not be invalidated by B render');
    assert.equal(h.stored(ownerB).input.monthlyIncome, 9100);
  });
  await test('StrictMode effect replay reactivates assumptions hydration and persistence', assumptionsHarness, async h => {
    await h.render(ownerA, true);
    assert.equal(h.current().isHydrated, true, 'StrictMode replay must not leave isMounted false');
    assert.equal(h.current().input.monthlyIncome, 8200.451);
    await React.act(async () => { h.current().setInput({ ...h.current().input, monthlyIncome: 9000 }); });
    await React.act(async () => { await h.drain(); });
    assert.equal(h.stored(ownerA).input.monthlyIncome, 9000);
    assert.equal(h.current().storageStatus, 'saved-local-storage');
  });
  await test('unmounted stale assumptions reset and replacement callbacks cannot write', assumptionsHarness, async h => {
    await h.render(ownerA);
    const stale = h.current();
    await h.unmount();
    await outcome(stale.resetAssumptions());
    await outcome(stale.replaceAssumptions({ ...clone(base), monthlyIncome: 7777 }, undefined, 1));
    await h.drain();
    assert.equal(h.writes.length, 0, 'stale unmounted methods must stop before storage mutation');
    assert.deepEqual(h.stored(ownerA), { input: base, revision: 1 });
  });
  await test('committed owner switch blocks old assumptions callbacks', assumptionsHarness, async h => {
    await h.render(ownerA); const stale = h.current();
    await h.render(ownerB);
    await outcome(stale.replaceAssumptions({ ...clone(base), monthlyIncome: 7777 }, undefined, 1));
    assert.equal(h.writes.length, 0);
    await React.act(async () => { h.current().setInput({ ...h.current().input, monthlyIncome: 9200 }); });
    await React.act(async () => { await h.drain(); });
    assert.equal(h.stored(ownerA).input.monthlyIncome, 8200.451);
    assert.equal(h.stored(ownerB).input.monthlyIncome, 9200);
  });
  await test('startup resume rejection remains fail closed without registering replay', authHarness, async h => {
    const resume = h.nextResume(ownerA);
    await h.mount();
    await React.act(async () => { resume.reject(new Error('pending startup recovery failed')); });
    assert.equal(h.current().ownerId, ownerA);
    assert.equal(h.current().authReady, false);
    assert.ok(h.current().authError);
    assert.deepEqual(h.replayStarts, []);
    assert.deepEqual(h.activeReplayOwners(), []);
  });
  await test('explicit retry after startup failure restores readiness and replay', authHarness, async h => {
    const first = h.nextResume(ownerA);
    await h.mount();
    await React.act(async () => { first.reject(new Error('startup failed')); });
    assert.equal(h.current().authReady, false);
    const retry = h.nextResume(ownerA); let result;
    await React.act(async () => { const pending = outcome(h.current().retryPendingRecovery()); retry.resolve(false); result = await pending; });
    assert.equal(result.status, 'fulfilled'); assert.equal(result.value, false);
    assert.equal(h.current().authReady, true); assert.equal(h.current().authError, null);
    assert.deepEqual(h.resumes, [ownerA, ownerA]);
    assert.deepEqual(h.activeReplayOwners(), [ownerA]);
  });
  for (const settlement of ['resolve', 'reject']) {
    await test(`late outgoing startup ${settlement} cannot ready or poison the next owner`, authHarness, async h => {
      const old = h.nextResume(ownerA), next = h.nextResume(ownerB);
      await h.mount(); await h.owner(ownerB);
      await React.act(async () => { settlement === 'resolve' ? old.resolve(true) : old.reject(new Error('outgoing failure')); });
      assert.equal(h.current().ownerId, ownerB); assert.equal(h.current().authReady, false);
      assert.equal(h.current().authError, null); assert.deepEqual(h.replayStarts, []);
      await React.act(async () => { next.resolve(false); });
      assert.equal(h.current().authReady, true); assert.deepEqual(h.activeReplayOwners(), [ownerB]);
    });
  }
  await test('recovery busy guard excludes duplicate work and retry then clears on success', authHarness, async h => {
    await h.mount(); assert.equal(h.current().authReady, true);
    const gate = deferred(); let work, duplicate, retry, duplicateActions = 0;
    await React.act(async () => {
      work = outcome(h.current().runRecovery(ownerA, () => gate.promise));
      assert.equal(h.current().isRecoveryBusy(), true, 'busy ref must guard before React commits busy state');
      duplicate = await outcome(h.current().runRecovery(ownerA, async () => { duplicateActions++; }));
      retry = await outcome(h.current().retryPendingRecovery());
    });
    assert.equal(duplicate.status, 'rejected'); assert.equal(retry.status, 'rejected'); assert.equal(duplicateActions, 0);
    assert.equal(h.current().recoveryBusy, true);
    let result; await React.act(async () => { gate.resolve('applied'); result = await work; });
    assert.equal(result.value, 'applied'); assert.equal(h.current().isRecoveryBusy(), false);
    assert.equal(h.current().recoveryBusy, false); assert.equal(h.current().authReady, true);
  });
  await test('nonpending recovery error clears busy without closing an already-ready owner', authHarness, async h => {
    await h.mount(); let result;
    await React.act(async () => { result = await outcome(h.current().runRecovery(ownerA, async () => {
      throw Object.assign(new Error('review became stale before staging'), { pendingRecovery: false });
    })); });
    assert.equal(result.status, 'rejected'); assert.equal(h.current().recoveryBusy, false);
    assert.equal(h.current().isRecoveryBusy(), false); assert.equal(h.current().authReady, true);
    assert.equal(h.current().authError, null); assert.deepEqual(h.activeReplayOwners(), [ownerA]);
  });
  await test('pending recovery error closes readiness and replay until explicit retry succeeds', authHarness, async h => {
    await h.mount(); let result;
    await React.act(async () => { result = await outcome(h.current().runRecovery(ownerA, async () => {
      throw Object.assign(new Error('durable staging needs recovery'), { pendingRecovery: true });
    })); });
    assert.equal(result.status, 'rejected'); assert.equal(h.current().recoveryBusy, false);
    assert.equal(h.current().isRecoveryBusy(), false); assert.equal(h.current().authReady, false);
    assert.ok(h.current().authError); assert.deepEqual(h.activeReplayOwners(), []);
    const retry = h.nextResume(ownerA);
    await React.act(async () => { const pending = h.current().retryPendingRecovery(); retry.resolve(true); await pending; });
    assert.equal(h.current().authReady, true); assert.equal(h.current().authError, null);
    assert.deepEqual(h.activeReplayOwners(), [ownerA]);
  });
  await test('late outgoing recovery completion cannot clear a new owner busy gate', authHarness, async h => {
    await h.mount(); const old = deferred(), next = deferred(); let oldWork, nextWork;
    await React.act(async () => { oldWork = outcome(h.current().runRecovery(ownerA, () => old.promise)); });
    await h.owner(ownerB);
    assert.equal(h.current().recoveryBusy, false);
    await React.act(async () => { nextWork = outcome(h.current().runRecovery(ownerB, () => next.promise)); });
    await React.act(async () => { old.resolve('outgoing completed'); await oldWork; });
    assert.equal(h.current().ownerId, ownerB); assert.equal(h.current().recoveryBusy, true);
    assert.equal(h.current().isRecoveryBusy(), true);
    await React.act(async () => { next.resolve('current completed'); await nextWork; });
    assert.equal(h.current().recoveryBusy, false); assert.equal(h.current().isRecoveryBusy(), false);
  });
  await test('unmounted auth callbacks cannot resume recovery or run a stale action', authHarness, async h => {
    await h.mount();
    const stale = h.current();
    await h.unmount();
    const resumes = h.resumes.length;
    let actions = 0;
    const retry = await outcome(stale.retryPendingRecovery());
    const run = await outcome(stale.runRecovery(ownerA, async () => { actions++; return 'stale action ran'; }));
    assert.equal(h.resumes.length, resumes, 'unmounted retry must stop before recovery IO');
    assert.equal(actions, 0, 'unmounted runRecovery must not invoke the caller action');
    assert.equal(retry.status, 'rejected');
    assert.equal(run.status, 'rejected');
    assert.deepEqual(h.activeReplayOwners(), []);
  });
  console.log(`${count} Recovery hook contracts: ${count - failures} passed, ${failures} failed. Memory locking/ports only; no browser, device, cloud, or physical-storage proof.`);
  if (failures) process.exitCode = 1;
}

const watchdog = setTimeout(() => { console.error('Recovery hook contracts exceeded their finite 20-second deadline.'); process.exit(1); }, 20000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
