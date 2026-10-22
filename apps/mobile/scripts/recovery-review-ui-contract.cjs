/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

process.env.NODE_ENV = 'development';
global.IS_REACT_ACT_ENVIRONMENT = true;

// Only React effects/state and captured RN callbacks run; no host UI is rendered.
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
const componentPath = path.join(mobileRoot, 'components/mobile-supabase-account.tsx');
const componentSource = fs.readFileSync(componentPath, 'utf8');
const ownerA = '00000000-0000-4000-8000-00000000000a';
const ownerB = '00000000-0000-4000-8000-00000000000b';
const snapshotId = '00000000-0000-4000-8000-000000000007';
const scenario = { activeDebtName: 'Local Loan', monthlyIncome: 8200.451, monthlyExpenses: 4700.125, chunkAmount: 1000,
  activeDebt: { balance: 12000, apr: 0.07, monthlyPayment: 300, termMonths: 60 },
  loc: { limit: 5000, balance: 100, apr: 0.12 } };
const book = { monthlyIncome: 7300.125, monthlyExpenses: 4300.255, extraMonthlyPayment: 50, chunkAmount: 1000,
  loc: { limit: 1000, balance: 50.125, apr: 0.12 }, strategy: 'avalanche', focusMode: 'single', splitRatioPrimary: 0.7,
  debts: [{ id: 'loan', name: 'Portfolio Loan', category: 'custom', kind: 'amortized', balance: 120.70001,
    apr: 0.2, minPaymentRule: { type: 'fixed', amount: 30.005 }, paymentSource: 'checking' }] };
const remoteScenario = { ...scenario, monthlyIncome: 10000 };
const remoteBook = { ...book, monthlyIncome: 11000 };
const clone = value => JSON.parse(JSON.stringify(value));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
// Fingerprint services are deterministic memory ports, not replacements for component guards.
const fingerprint = value => JSON.stringify(value);
const portfolioFingerprint = (value, version) => version===3?JSON.stringify({documentVersion:3,book:value}):fingerprint(value);

function harness() {
  let owner = ownerA, assumptions = clone(scenario), portfolioBook = clone(book), portfolioStatus = 'saved', mounted = true;
  let assumptionsReady = true, nextNetworkGate = null, documentVersion;
  const physical = new Map([
    [ownerA, { assumptions: clone(scenario), book: clone(book) }],
    [ownerB, { assumptions: { ...clone(scenario), monthlyIncome: 9200 }, book: { ...clone(book), monthlyIncome: 9300 } }],
  ]);
  const controls = new Map(), applyCalls = [], writes = [], runs = [], frames = new Set(), queued = [], replacements = [];
  const source = { assumptions: clone(remoteScenario), portfolio: clone(remoteBook), clientRevision: 7,
    snapshotId, snapshotIdempotencyKey: 'memory-remote-stream', updatedAt: '2026-10-20T12:00:00Z' };
  const client = { auth: {
    signInWithOtp: async () => { throw new Error('Unexpected sign-in operation'); },
    signOut: async () => { throw new Error('Unexpected sign-out operation'); },
  } };
  const runRecovery = async (expectedOwner, action) => { runs.push(expectedOwner); return action(); };
  const outbox = {
    readRecovery: async () => null,
    enqueue: async input => { queued.push(clone(input)); },
    flush: async () => ({remaining:0,sent:1}),
  };
  function Pressable(props) {
    const id = React.useRef(Symbol('pressable'));
    React.useLayoutEffect(() => { controls.set(id.current, props); return () => { controls.delete(id.current); }; });
    return React.createElement(React.Fragment, null, props.children);
  }
  const View = ({ children }) => React.createElement(React.Fragment, null, children);
  const Text = () => null;
  class PendingRecoveryError extends Error {}
  const services = {
    MobileSnapshotRecoveryPendingError: PendingRecoveryError,
    serializeMobileRecoveryAssumptions: fingerprint,
    serializeMobileRecoveryPortfolio: portfolioFingerprint,
    loadMobileSnapshotRecoveryOptions: async () => ({ guestAssumptions: null, guestPortfolio: null,
      rejectedCount: 0, selectedSnapshotId: null, snapshots: [clone(source)], streamRevisions: {} }),
    applyMobileSnapshotRecovery: async (_client, input, dependencies) => {
      applyCalls.push(clone(input));
      const saved = physical.get(input.expectedOwnerId);
      assert.equal(input.reviewedLocalAssumptions, fingerprint(saved.assumptions), 'memory API checks physical scenario only');
      assert.equal(input.reviewedLocalPortfolio, portfolioFingerprint(saved.book,saved.documentVersion), 'memory API checks physical Portfolio only');
      const target = input.source.kind==='remote'?input.source.snapshot:input.source;
      await dependencies.replaceAssumptions(clone(target.assumptions), Object.freeze({ ownerId: input.expectedOwnerId }), 1);
      await dependencies.replacePortfolio(clone(target.portfolio), Object.freeze({ ownerId: input.expectedOwnerId }), 1,target.portfolioDocumentVersion);
      return { discarded: 0, synced: false };
    },
  };
  function replaceScenario(boundOwner) {
    return async input => {
      physical.get(boundOwner).assumptions = clone(input);
      writes.push({ owner: boundOwner, kind: 'scenario' });
      return 'local-storage';
    };
  }
  const mocks = {
    'expo-linking': { createURL: route => `memory://${route}` },
    'expo-network': { getNetworkStateAsync: async () => {
      const gate = nextNetworkGate; nextNetworkGate = null;
      if (gate) { gate.started.resolve(); await gate.release.promise; }
      return { isConnected: true, isInternetReachable: true };
    } },
    'react-native': { View, Pressable, Text, TextInput: () => null,
      AccessibilityInfo: { setAccessibilityFocus() {} }, findNodeHandle: () => null },
    '@/components/mobile-auth-provider': { useMobileAuth: () => ({ authError: null, authReady: true, client,
      consumeSyncNotice() {}, session: { user: { id: owner, email: 'memory@example.test' } }, syncNotice: null,
      retryPendingRecovery: async () => false, runRecovery, recoveryBusy: false, isRecoveryBusy: () => false }) },
    '@/components/mobile-portfolio-provider': { useMobilePortfolio: () => {
      const boundOwner = owner;
      return { book: portfolioBook, isHydrated: true, status: portfolioStatus, backend: 'local-storage', revision: 1,
        ...(documentVersion===3?{documentVersion:3}:{}),
        replace: async (input,lock,revision,version) => {
          replacements.push({book:clone(input),version});
          physical.get(boundOwner).book = clone(input);
          if(version===3)physical.get(boundOwner).documentVersion=3;
          writes.push({ owner: boundOwner, kind: 'portfolio' });
          return 'local-storage';
        } };
    } },
    '@/hooks/use-accessibility-announcement': { useAccessibilityAnnouncement() {} },
    '@/lib/accessibility-labels': { formatRecoveryAPR: value => String(value), recoveryChoiceAccessibilityLabel: (_input, label) => label },
    '@interestshield/financial-engine/input-draft': { formatFinancialInput: value => String(value) },
    '@/lib/supabase/snapshot-outbox': { mobileSnapshotOutbox: outbox },
    '@/lib/supabase/snapshot-recovery': services,
  };
  const testModule = { exports: {} };
  const output = ts.transpileModule(componentSource, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(output, { module: testModule, exports: testModule.exports,
    require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id), console, Error,
    requestAnimationFrame: callback => {
      const frame = setImmediate(() => { frames.delete(frame); callback(); }); frames.add(frame); return frame;
    },
    cancelAnimationFrame: frame => { clearImmediate(frame); frames.delete(frame); },
  }, { filename: componentPath });
  const container = hostElement('div'); container.ownerDocument = document;
  const root = createRoot(container);
  function control(label) {
    const matches = [...controls.values()].filter(props => props.accessibilityLabel === label);
    assert.equal(matches.length, 1, `expected one captured Pressable: ${label}`);
    return matches[0];
  }
  async function render() {
    await React.act(async () => { root.render(React.createElement(testModule.exports.MobileSupabaseAccount, {
      assumptions, assumptionsReady, onReplaceAssumptions: replaceScenario(owner),
    })); });
  }
  async function press(label) {
    const props = control(label);
    assert.equal(Boolean(props.disabled), false, `${label} must be enabled on the valid review path`);
    await React.act(async () => { await props.onPress(); });
  }
  return {
    applyCalls, writes, runs, control, render, queued, replacements, press,
    sourceVersion:version=>{source.portfolioDocumentVersion=version;},
    async version(value,physicalAlso=false){documentVersion=value;if(physicalAlso)physical.get(owner).documentVersion=value;await render();},
    stored: id => clone(physical.get(id)),
    async review() {
      await press('Review snapshot recovery options');
      await press('Snapshot revision 7');
      await press('Review selected snapshot restore');
      return control('Confirm assumption recovery').onPress;
    },
    async confirm() { const callback = control('Confirm assumption recovery').onPress; await React.act(async () => { await callback(); }); },
    async startConfirmation() {
      const callback = control('Confirm assumption recovery').onPress;
      let completion;
      await React.act(async () => { completion = callback(); });
      return { completion };
    },
    holdNextNetwork() {
      assert.equal(nextNetworkGate, null, 'only one next network check can be held');
      nextNetworkGate = { started: deferred(), release: deferred() };
      return nextNetworkGate;
    },
    async ready(value) { assumptionsReady = value; await render(); },
    async scenario(input) { assumptions = clone(input); await render(); },
    async portfolio(input, status = 'saved') { portfolioBook = clone(input); portfolioStatus = status; await render(); },
    async owner(id) {
      owner = id; assumptions = clone(physical.get(id).assumptions); portfolioBook = clone(physical.get(id).book);
      portfolioStatus = 'saved'; await render();
    },
    async unmount() {
      if (!mounted) return;
      await React.act(async () => { root.unmount(); }); mounted = false;
      for (const frame of frames) clearImmediate(frame);
      frames.clear();
    },
  };
}

let count = 0, failures = 0;
async function test(name, run) {
  count++;
  const h = harness();
  try { await h.render(); await run(h); console.log(`PASS Recovery review UI ${name}`); }
  catch (error) { failures++; console.error(`FAIL Recovery review UI ${name}`); console.error(error); }
  finally { await h.unmount(); }
}
async function main() {
  console.log(`React ${React.version}; actual MobileSupabaseAccount; captured RN Pressables, null host, memory services.`);
  console.log(`SOURCE components/mobile-supabase-account.tsx sha256=${crypto.createHash('sha256').update(componentSource).digest('hex')}`);
  await test('unchanged pair applies with review-open destination fingerprints', async h => {
    await h.review(); await h.confirm();
    assert.equal(h.applyCalls.length, 1);
    const input = h.applyCalls[0];
    assert.equal(input.expectedOwnerId, ownerA);
    assert.deepEqual(JSON.parse(input.reviewedLocalAssumptions), scenario);
    assert.deepEqual(JSON.parse(input.reviewedLocalPortfolio), book);
    assert.deepEqual(input.confirmation, { clientRevision: 7, snapshotId });
    assert.equal(input.source.kind, 'remote');
    assert.deepEqual(h.stored(ownerA), { assumptions: remoteScenario, book: remoteBook });
  });
  await test('optimistic scenario change after review rejects before apply despite unchanged physical storage', async h => {
    await h.review();
    await h.scenario({ ...clone(scenario), monthlyIncome: 9999 });
    assert.deepEqual(h.stored(ownerA), { assumptions: scenario, book });
    await h.confirm();
    assert.equal(h.applyCalls.length, 0, 'changed committed scenario must invalidate confirmation before recovery API');
    assert.equal(h.writes.length, 0);
    assert.deepEqual(h.stored(ownerA), { assumptions: scenario, book });
  });
  await test('changed committed Portfolio after review rejects before apply despite unchanged physical storage', async h => {
    await h.review();
    await h.portfolio({ ...clone(book), monthlyExpenses: 999 });
    assert.deepEqual(h.stored(ownerA), { assumptions: scenario, book });
    await h.confirm();
    assert.equal(h.applyCalls.length, 0, 'changed committed book must invalidate confirmation before recovery API');
    assert.equal(h.writes.length, 0);
    assert.deepEqual(h.stored(ownerA), { assumptions: scenario, book });
  });
  await test('saving Portfolio blocks confirmation even when both current values equal review', async h => {
    await h.review(); await h.portfolio(book, 'saving');
    assert.deepEqual(h.stored(ownerA), { assumptions: scenario, book });
    await h.confirm();
    assert.equal(h.applyCalls.length, 0, 'pending persistence must block confirmation before recovery API');
    assert.equal(h.writes.length, 0);
  });
  await test('scenario readiness loss blocks confirmation even when both values equal review', async h => {
    await h.review(); await h.ready(false); await h.confirm();
    assert.equal(h.runs.length, 0, 'unready committed scenario must reject before the global recovery gate');
    assert.equal(h.applyCalls.length, 0);
    assert.equal(h.writes.length, 0);
    assert.deepEqual(h.stored(ownerA), { assumptions: scenario, book });
  });
  await test('unchanged pair still applies once after a held network check', async h => {
    await h.review();
    const gate = h.holdNextNetwork();
    let completion;
    try {
      ({ completion } = await h.startConfirmation());
      await gate.started.promise;
      assert.equal(h.runs.length, 0);
      assert.equal(h.applyCalls.length, 0);
      await React.act(async () => { gate.release.resolve(); await completion; });
      assert.deepEqual(h.runs, [ownerA]);
      assert.equal(h.applyCalls.length, 1);
      assert.deepEqual(JSON.parse(h.applyCalls[0].reviewedLocalAssumptions), scenario);
      assert.deepEqual(JSON.parse(h.applyCalls[0].reviewedLocalPortfolio), book);
      assert.deepEqual(h.stored(ownerA), { assumptions: remoteScenario, book: remoteBook });
    } finally { gate.release.resolve(); if (completion) await React.act(async () => { await completion; }); }
  });
  for (const [name, change] of [
    ['scenario edit', h => h.scenario({ ...clone(scenario), monthlyIncome: 9999 })],
    ['Portfolio edit', h => h.portfolio({ ...clone(book), monthlyExpenses: 999 })],
    ['scenario readiness loss with identical values', h => h.ready(false)],
    ['Portfolio saving with identical values', h => h.portfolio(book, 'saving')],
  ]) {
    await test(`${name} during network await rejects using current committed context`, async h => {
      await h.review();
      const gate = h.holdNextNetwork();
      let completion;
      try {
        ({ completion } = await h.startConfirmation());
        await gate.started.promise;
        assert.equal(h.applyCalls.length, 0, 'confirmation must actually pause at the network await');
        await change(h);
        assert.deepEqual(h.stored(ownerA), { assumptions: scenario, book }, 'physical stores deliberately remain at the reviewed values');
        await React.act(async () => { gate.release.resolve(); await completion; });
        assert.equal(h.runs.length, 0, 'post-await check must reject before the global recovery gate');
        assert.equal(h.applyCalls.length, 0);
        assert.equal(h.writes.length, 0);
        assert.deepEqual(h.stored(ownerA), { assumptions: scenario, book });
      } finally { gate.release.resolve(); if (completion) await React.act(async () => { await completion; }); }
    });
  }
  await test('retained old-owner confirmation cannot apply or change the new owner', async h => {
    const stale = await h.review();
    const beforeA = h.stored(ownerA), beforeB = h.stored(ownerB);
    await h.owner(ownerB);
    await React.act(async () => { await stale(); });
    assert.equal(h.applyCalls.length, 0);
    assert.equal(h.writes.length, 0);
    assert.deepEqual(h.stored(ownerA), beforeA);
    assert.deepEqual(h.stored(ownerB), beforeB);
  });
  await test('account sync includes active3 marker after profile removal and omits it for old books',async h=>{
    await h.press('Sync local assumptions');assert.equal('portfolioDocumentVersion' in h.queued[0],false);
    await h.version(3,true);await h.press('Sync local assumptions');assert.equal(h.queued[1].portfolioDocumentVersion,3);
  });
  await test('format-only destination adoption expires review before recovery API',async h=>{
    await h.review();await h.version(3);await h.confirm();assert.equal(h.applyCalls.length,0);assert.equal(h.writes.length,0);
  });
  await test('remote3 marker reaches recovery source and four-argument replacement unchanged',async h=>{
    h.sourceVersion(3);await h.review();await h.confirm();
    assert.equal(h.applyCalls[0].source.snapshot.portfolioDocumentVersion,3);assert.equal(h.replacements[0].version,3);
  });
  await test('device3 source and both reviewed fingerprints retain format',async h=>{
    await h.version(3,true);await h.press('Review snapshot recovery options');await h.press('Current device assumptions');await h.confirm();
    const input=h.applyCalls[0];assert.ok(input);assert.equal(input.source.portfolioDocumentVersion,3);
    assert.equal(JSON.parse(input.confirmation.reviewedPortfolio).documentVersion,3);
    assert.equal(JSON.parse(input.reviewedLocalPortfolio).documentVersion,3);
  });
  await require('./portfolio-transfer-ui-contract.cjs')({React,createRoot,hostElement,document})();
  await require('./lender-terms-ui-contract.cjs')({React,createRoot,hostElement,document})();
  console.log(`${count} Recovery review UI contracts: ${count - failures} passed, ${failures} failed. Memory ports only; no browser, device, native accessibility, physical storage, or cloud proof.`);
  if (failures) process.exitCode = 1;
}

const watchdog = setTimeout(() => { console.error('Recovery review UI contracts exceeded their finite 20-second deadline.'); process.exit(1); }, 20000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
