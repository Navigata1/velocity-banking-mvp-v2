/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ownerId = '00000000-0000-4000-8000-00000000000a';
const base = { monthlyIncome: 8200, monthlyExpenses: 4700, chunkAmount: 1000, activeDebtName: 'Synthetic loan',
  activeDebt: { balance: 12000, apr: 0.065, monthlyPayment: 400, termMonths: 60 }, loc: { limit: 25000, balance: 3200, apr: 0.085 } };
const clone = x => JSON.parse(JSON.stringify(x));
const compiled = new Map();
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const unsupported = error => error?.code === 'unsupported-mobile-assumptions';
const payload = (input, owner, revision = 4) => JSON.stringify({ version: 1, ownerId: owner, revision, savedAt: '2026-10-22T12:00:00Z', input });
const extended = () => ({ ...clone(base), loc: { ...base.loc, lenderTerms: { annualFee: 0, minimumPayment: { mode: 'fixed', value: 0 } } } });

function harness(platform) {
  const secureValues = new Map(), webValues = new Map(), cache = new Map(), browserLocks = new Map(); let generation = 0, readFailure = false;
  const values = platform === 'ios' ? secureValues : webValues;
  const secure = { isAvailableAsync: async () => platform === 'ios',
    getItemAsync: async key => { if (readFailure) throw new Error('ordinary read failure'); return secureValues.get(key) ?? null; },
    setItemAsync: async (key, value) => { secureValues.set(key, value); }, deleteItemAsync: async key => { secureValues.delete(key); } };
  const globals = { localStorage: { getItem: key => { if (readFailure) throw new Error('ordinary read failure'); return webValues.get(key) ?? null; },
    setItem: (key, value) => { webValues.set(key, value); }, removeItem: key => webValues.delete(key) }, navigator: { locks: { request: (key, _options, action) => {
      const next = (browserLocks.get(key) ?? Promise.resolve()).catch(() => undefined).then(action);
      browserLocks.set(key, next.then(() => undefined, () => undefined)); return next;
    } } } };
  let hookContext, controls, alerts;
  const mocks = { 'expo-secure-store': secure, 'expo-crypto': { randomUUID: () => `physical-generation-${++generation}` },
    'react-native': { Platform: { OS: platform } },
    'expo-router': { useRouter: () => ({ push() {} }) }, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    '@/components/mobile-assumptions-provider': { useMobileAssumptions: () => hookContext },
    '../mobile-shell/controls': { AssumptionControls: props => { controls = props; return null; }, StorageStatusCard: () => null },
    '../mobile-shell/navigation': { MobileModeNavigation: () => null, modes: [{ id: 'dashboard', label: 'Dashboard' }], modeRoutes: {} } };
  function resolveSource(base) { return [`${base}.ts`, `${base}.tsx`].find(file => fs.existsSync(file)); }
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    if (!compiled.has(file)) compiled.set(file, ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText);
    const local = id => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('@/')) return load(resolveSource(path.join(root, id.slice(2))));
      if (id.startsWith('@interestshield/')) return load(fs.realpathSync(require.resolve(id)));
      if (id.startsWith('.')) return load(resolveSource(path.resolve(path.dirname(file), id)));
      return require(id);
    };
    vm.runInNewContext(compiled.get(file), { module, exports: module.exports, require: local, globalThis: globals, console, Error }, { filename: file });
    return module.exports;
  }
  const storage = load(path.join(root, 'lib/mobile-assumption-storage.ts'));
  const auth = load(path.join(root, 'lib/supabase/auth-storage.ts'));
  function hook(owner, options = {}) {
    const { React, createRoot, document, hostElement } = nullHost();
    const Fragment = ({ children }) => React.createElement(React.Fragment, null, children);
    const commands = new Map(), widgets = new Map();
    const captureWidget = name => props => {
      React.useLayoutEffect(() => { widgets.set(name, props); return () => { widgets.delete(name); }; });
      return null;
    };
    mocks['react-native'] = { ...mocks['react-native'], View: Fragment, ScrollView: Fragment,
      StyleSheet: { create: x => x },
      Pressable: props => {
        React.useLayoutEffect(() => { commands.set(props.accessibilityLabel, props); return () => { commands.delete(props.accessibilityLabel); }; });
        return React.createElement(Fragment, null, props.children);
      },
      Text: props => { if (props.accessibilityRole === 'alert') alerts = props.children; return null; } };
    mocks['@/components/mobile-portfolio-provider'] = { useMobilePortfolio: () => options.portfolio };
    mocks['@/components/mobile-auth-provider'] = { useMobileAuth: () => ({ recoveryBusy: false }) };
    mocks['@/components/financial-card'] = { FinancialCard: () => null };
    mocks['@/hooks/use-accessibility-announcement'] = { useAccessibilityAnnouncement() {} };
    mocks['@/components/mobile-supabase-account'] = { MobileSupabaseAccount: captureWidget('account') };
    mocks['../mobile-shell/controls'].mobileStorageStatusCopy = Object.fromEntries(['loading', 'unavailable', 'saved-secure-store', 'saved-local-storage',
      'restored-secure-store', 'restored-local-storage'].map(status => [status, { value: status, detail: 'Storage status.' }]));
    for (const [module, component] of [['portfolio-controls', 'PortfolioControls'], ['portfolio-debt-editor', 'PortfolioDebtEditor'],
      ['portfolio-payoff-path', 'PortfolioPayoffPath'], ['portfolio-common-month', 'PortfolioCommonMonth'],
      ['portfolio-transfer', 'PortfolioTransfer'], ['portfolio-lender-terms', 'PortfolioLenderTerms'],
      ['portfolio-dated-plan', 'PortfolioDatedPlan'], ['portfolio-dated-ledger', 'PortfolioDatedLedger']]) {
      mocks[`@/components/portfolio/${module}`] = { [component]: captureWidget(component) };
    }
    const api = load(path.join(root, 'hooks/use-persisted-mobile-assumptions.ts'));
    const route = load(path.join(root, 'components/mobile-routes/route-screen.tsx'));
    const selectedRoute = options.route ? load(path.join(root, `components/mobile-routes/${options.route}-route.tsx`)) : null;
    const frames = []; let current, mounted = true;
    function Probe({ forced, mode }) {
      const state = api.usePersistedMobileAssumptions(owner);
      hookContext = forced ?? state; const frame = { error: hookContext.storageError, isHydrated: hookContext.isHydrated, rendered: false }; frames.push(frame);
      React.useLayoutEffect(() => { current = state; });
      if (selectedRoute) return React.createElement(selectedRoute[options.route === 'portfolio' ? 'PortfolioRoute' : 'SettingsRoute']);
      return React.createElement(route.MobileRouteScreen, { mode, renderContent: context => { frame.rendered = true; frame.isHydrated = context.isHydrated; return null; } });
    }
    const container = hostElement('div'); container.ownerDocument = document; const mountedRoot = createRoot(container);
    return { React, current: () => current, controls: () => controls, alerts: () => alerts, frames, commands, widgets,
      render: async (forced, mode = 'dashboard') => { await React.act(async () => { mountedRoot.render(React.createElement(Probe, { forced, mode })); }); },
      edit: async input => { await React.act(async () => { current.setInput(input); }); },
      close: async () => { if (mounted) { await React.act(async () => { mountedRoot.unmount(); }); mounted = false; } } };
  }
  return { storage, auth, values, secureValues, webValues, load, hook,
    key: owner => storage.mobileAssumptionsStorageKey(owner), failRead: () => { readFailure = true; } };
}

let host;
function nullHost() {
  if (host) return host;
  process.env.NODE_ENV = 'development'; global.IS_REACT_ACT_ENVIRONMENT = true;
  const hostElement = tag => ({ nodeType: 1, nodeName: tag.toUpperCase(), tagName: tag.toUpperCase(), namespaceURI: 'http://www.w3.org/1999/xhtml', style: {},
    setAttribute() {}, removeAttribute() {}, addEventListener() {}, removeEventListener() {}, appendChild() {}, removeChild() {}, contains() { return false; } });
  const document = { nodeType: 9, createElement: hostElement, addEventListener() {}, removeEventListener() {}, activeElement: null };
  document.documentElement = hostElement('html'); document.body = hostElement('body');
  const window = { document, HTMLElement: class {}, HTMLIFrameElement: class {}, addEventListener() {}, removeEventListener() {}, getSelection() { return null; } };
  document.defaultView = window; global.document = document; global.window = window;
  host = { React: require('react'), createRoot: require('react-dom/client').createRoot, document, hostElement }; return host;
}

async function run() {
  let count = 0;
  async function test(name, action) { count++; try { await action(); console.log(`PASS physical assumptions ${name}`); }
    catch (error) { console.error(`FAIL physical assumptions ${name}`); console.error(error); process.exitCode = 1; } }
  await test('pure legacy codecs reject zero empty invalid and explicitly undefined term extensions', async () => {
    const h = harness('web');
    for (const owner of [ownerId, null]) for (const lenderTerms of [{ annualFee: 0 }, {}, null, 'unsupported']) {
      const input = { ...clone(base), loc: { ...base.loc, lenderTerms } }, raw = payload(input, owner);
      assert.equal(h.storage.decodeMobileAssumptions(raw, owner), null);
      assert.throws(() => h.storage.encodeMobileAssumptions(input, '2026-10-22T12:00:00Z', owner), unsupported);
    }
    assert.throws(() => h.storage.encodeMobileAssumptions({ ...base, loc: { ...base.loc, lenderTerms: undefined } }), unsupported);
  });
  await test('legacy codecs reject top-level datedPlan even when null or explicitly undefined', async () => {
    const h = harness('web');
    for (const datedPlan of [null, undefined, {}, require('./dated-storage-contract.cjs').plan()]) {
      const input = { ...clone(base), datedPlan };
      assert.throws(() => h.storage.encodeMobileAssumptions(input), unsupported);
      if (datedPlan !== undefined) assert.equal(h.storage.decodeMobileAssumptions(payload(input, ownerId), ownerId), null);
    }
  });
  for (const platform of ['ios', 'web']) {
    for (const owner of [ownerId, null]) await test(`${platform}/${owner ?? 'guest'}: datedPlan null and supplied context fail closed without replacing any bytes`, async () => {
      for (const datedPlan of [null, require('./dated-storage-contract.cjs').plan()]) {
        const h = harness(platform), key = h.key(owner), raw = payload({ ...clone(base), datedPlan }, owner); h.values.set(key, raw);
        await assert.rejects(() => h.storage.loadMobileAssumptionsForOwner(owner), unsupported);
        await assert.rejects(() => h.storage.saveMobileAssumptionsForOwner(owner, base, { expectedRevision: 4 }), unsupported);
        await assert.rejects(() => h.storage.saveMobileAssumptionsForOwner(owner, { ...base, datedPlan }), unsupported);
        const probe = h.hook(owner);
        try {
          await probe.render(); assert.equal(probe.current().isHydrated, false);
          await assert.rejects(() => probe.current().resetAssumptions());
          await assert.rejects(() => probe.current().replaceAssumptions(base));
          assert.equal(h.values.get(key), raw);
        } finally { await probe.close(); }
      }
    });
    await test(`${platform}: legacy storage errors block legacy routes but preserve Portfolio and Settings content with unready scenario context`, async () => {
      const h = harness(platform), key = h.key(ownerId), raw = payload(extended(), ownerId); h.values.set(key, raw); const probe = h.hook(ownerId);
      try {
        for (const mode of ['dashboard', 'simulator', 'cockpit', 'learn', 'vault', 'portfolio', 'settings']) {
          await probe.render(undefined, mode);
          assert.equal(probe.frames.at(-1).rendered, mode === 'portfolio' || mode === 'settings', mode);
          assert.equal(probe.current().isHydrated, false); assert.equal(probe.controls().disabled, true);
          assert.match(probe.alerts(), /terms|review|unsupported/i);
        }
        assert.equal(h.values.get(key), raw);
      } finally { await probe.close(); }
    });
    await test(`${platform}: actual empty Portfolio route permits blank creation but disables Copy current scenario from corrupt legacy storage`, async () => {
      const h = harness(platform), key = h.key(ownerId), raw = payload(extended(), ownerId); h.values.set(key, raw);
      const probe = h.hook(ownerId, { route: 'portfolio', portfolio: { book: null, status: 'empty', isHydrated: true, storageScope: 'separate-portfolio' } });
      try {
        await probe.render(); assert.equal(probe.current().isHydrated, false);
        assert.equal(probe.commands.get('Create blank portfolio')?.disabled, false);
        assert.equal(probe.commands.get('Copy current scenario')?.disabled, true);
        assert.match(probe.alerts(), /terms|review|unsupported/i); assert.equal(h.values.get(key), raw);
      } finally { await probe.close(); }
    });
    await test(`${platform}: actual canonical Portfolio3 remains editable and exportable independently of corrupt legacy storage`, async () => {
      const h = harness(platform), key = h.key(ownerId), raw = payload(extended(), ownerId); h.values.set(key, raw);
      const storage = h.load(path.join(root, 'lib/mobile-portfolio-storage.ts'));
      const book = { monthlyIncome: 8200, monthlyExpenses: 4700, chunkAmount: 1000, extraMonthlyPayment: 0,
        loc: { limit: 1000, balance: 50, apr: 0.12 }, debts: [], strategy: 'avalanche', focusMode: 'single', splitRatioPrimary: 0.7 };
      await storage.saveMobilePortfolioForOwner(ownerId, book, { expectedRevision: 0, documentVersion: 3 });
      const saved = await storage.loadMobilePortfolioForOwner(ownerId);
      const probe = h.hook(ownerId, { route: 'portfolio', portfolio: { ...saved, status: 'saved', isHydrated: true, storageScope: 'separate-portfolio' } });
      try {
        await probe.render(); assert.equal(probe.current().isHydrated, false);
        assert.equal(probe.widgets.get('PortfolioControls')?.disabled, false);
        assert.equal(probe.widgets.get('PortfolioLenderTerms')?.disabled, false);
        assert.equal(probe.widgets.get('PortfolioTransfer')?.disabled, false);
        assert.equal(probe.widgets.get('PortfolioTransfer')?.documentVersion, 3);
        assert.match(probe.alerts(), /terms|review|unsupported/i); assert.equal(h.values.get(key), raw);
      } finally { await probe.close(); }
    });
    await test(`${platform}: actual Settings route remains available while scenario reset and account sync readiness stay blocked`, async () => {
      const h = harness(platform), key = h.key(ownerId), raw = payload(extended(), ownerId); h.values.set(key, raw);
      const probe = h.hook(ownerId, { route: 'settings' });
      try {
        await probe.render(); assert.equal(probe.current().isHydrated, false);
        assert.equal(probe.commands.get('Reset mobile starter assumptions')?.disabled, true);
        assert.equal(probe.widgets.get('account')?.assumptionsReady, false);
        assert.match(probe.alerts(), /terms|review|unsupported/i); assert.equal(h.values.get(key), raw);
      } finally { await probe.close(); }
    });
    for (const owner of [ownerId, null]) {
      const scope = `${platform}/${owner === null ? 'guest' : 'owner'}`;
      await test(`${scope}: present unsupported raw blocks physical hydration without defaulting or stripping`, async () => {
        const h = harness(platform), key = h.key(owner), raw = payload(extended(), owner); h.values.set(key, raw);
        if (platform === 'ios') h.webValues.set(key, payload({ ...base, monthlyIncome: 9999 }, owner));
        await assert.rejects(() => h.storage.loadMobileAssumptionsForOwner(owner, { ...base, monthlyIncome: 1 }), unsupported);
        assert.equal(h.values.get(key), raw);
      });
      await test(`${scope}: ordinary edits cannot erase unsupported stored extensions`, async () => {
        const h = harness(platform), key = h.key(owner), raw = payload(extended(), owner); h.values.set(key, raw);
        for (const options of [{}, { expectedRevision: 0 }, { expectedRevision: 4 }]) {
          await assert.rejects(() => h.storage.saveMobileAssumptionsForOwner(owner, { ...base, monthlyIncome: 9000 }, options), unsupported);
          assert.equal(h.values.get(key), raw);
        }
        await h.auth.withMobileSnapshotOwnerLock(owner ?? 'guest', async ownerLock => {
          await assert.rejects(() => h.storage.saveMobileAssumptionsForOwner(owner, base, { expectedRevision: 4, ownerLock }), unsupported);
        });
        assert.equal(h.values.get(key), raw);
      });
      await test(`${scope}: newly supplied profiles cannot be saved under legacy semantics`, async () => {
        const h = harness(platform);
        await assert.rejects(() => h.storage.saveMobileAssumptionsForOwner(owner, extended()), unsupported);
        assert.equal(h.values.size, 0);
      });
      await test(`${scope}: a queued save preflights the actual raw source after acquiring its owner lock`, async () => {
        const h = harness(platform), gate = deferred(), key = h.key(owner); h.values.set(key, payload(base, owner));
        const holding = h.auth.withMobileSnapshotOwnerLock(owner ?? 'guest', () => gate.promise);
        const saving = h.storage.saveMobileAssumptionsForOwner(owner, { ...base, monthlyIncome: 9000 }, { expectedRevision: 4 });
        const raw = payload(extended(), owner); h.values.set(key, raw); gate.resolve(); await holding;
        await assert.rejects(() => saving, unsupported); assert.equal(h.values.get(key), raw);
      });
      await test(`${scope}: ordinary absence malformed data and successful results retain exact fallback shapes`, async () => {
        const h = harness(platform), key = h.key(owner), backend = platform === 'ios' ? 'secure-store' : 'local-storage';
        for (const raw of [null, '', '{', 'null', '{}', JSON.stringify({ version: 9, input: base })]) {
          if (raw === null) h.values.delete(key); else h.values.set(key, raw);
          assert.deepEqual(clone(await h.storage.loadMobileAssumptionsForOwner(owner, base)), { backend, input: base, restored: false, revision: 0 });
        }
        h.values.delete(key); assert.deepEqual(clone(await h.storage.saveMobileAssumptionsForOwner(owner, base)), { backend, revision: 1 });
        assert.deepEqual(clone(await h.storage.loadMobileAssumptionsForOwner(owner)), { backend, input: base, restored: true, revision: 1 });
      });
      await test(`${scope}: unsupported hydration suppresses hook readiness edits reset replacement and route content`, async () => {
        const h = harness(platform), key = h.key(owner), raw = payload(extended(), owner); h.values.set(key, raw); const probe = h.hook(owner);
        try {
          await probe.render(); assert.equal(probe.current().isHydrated, false); assert.equal(probe.current().storageStatus, 'unavailable');
          assert.match(probe.current().storageError, /terms|review|unsupported/i); assert.equal(probe.controls().disabled, true);
          assert.equal(probe.frames.filter(frame => frame.error).every(frame => !frame.rendered), true);
          await probe.edit({ ...base, monthlyIncome: 9000 });
          await assert.rejects(() => probe.current().resetAssumptions()); await assert.rejects(() => probe.current().replaceAssumptions(base));
          assert.equal(h.values.get(key), raw);
        } finally { await probe.close(); }
      });
    }
    await test(`${platform}: actual guest recovery never offers a stripped unsupported scenario`, async () => {
      const h = harness(platform), key = h.key(null), raw = payload(extended(), null); h.values.set(key, raw);
      const recovery = h.load(path.join(root, 'lib/supabase/snapshot-recovery.ts'));
      const query = { select: () => query, eq: () => query, order: () => query, limit: () => query,
        then: resolve => Promise.resolve({ data: [], error: null }).then(resolve) };
      const client = { auth: { getClaims: async () => ({ data: { claims: { sub: ownerId } }, error: null }) }, from: () => query };
      await assert.rejects(() => recovery.loadMobileSnapshotRecoveryOptions(client, ownerId), unsupported); assert.equal(h.values.get(key), raw);
    });
    await test(`${platform}: unsupported raw arriving after hydration closes readiness on a failed autosave`, async () => {
      const h = harness(platform), key = h.key(ownerId); h.values.set(key, payload(base, ownerId)); const probe = h.hook(ownerId);
      try {
        await probe.render(); assert.equal(probe.current().isHydrated, true);
        const raw = payload(extended(), ownerId); h.values.set(key, raw); await probe.edit({ ...base, monthlyIncome: 9000 });
        assert.equal(probe.current().isHydrated, false); assert.match(probe.current().storageError, /terms|review|unsupported/i);
        assert.equal(h.values.get(key), raw);
      } finally { await probe.close(); }
    });
    for (const operation of ['resetAssumptions', 'replaceAssumptions']) await test(`${platform}: ${operation} cannot erase unsupported raw introduced after hydration`, async () => {
      const h = harness(platform), key = h.key(ownerId); h.values.set(key, payload(base, ownerId)); const probe = h.hook(ownerId);
      try {
        await probe.render(); assert.equal(probe.current().isHydrated, true);
        const raw = payload(extended(), ownerId); h.values.set(key, raw); let failure;
        await probe.React.act(async () => {
          try { await probe.current()[operation](base); } catch (error) { failure = error; }
        });
        assert.equal(unsupported(failure), true); assert.equal(probe.current().isHydrated, false);
        assert.equal(probe.controls().disabled, true); assert.match(probe.current().storageError, /terms|review|unsupported/i);
        assert.equal(h.values.get(key), raw);
      } finally { await probe.close(); }
    });
  }
  await test('ordinary storage read errors retain the existing unavailable fallback readiness', async () => {
    const h = harness('web'); h.failRead(); const probe = h.hook(ownerId);
    try { await probe.render(); assert.equal(probe.current().isHydrated, true); assert.equal(probe.current().storageStatus, 'unavailable');
      assert.equal('storageError' in probe.current(), false); } finally { await probe.close(); }
  });
  await test('route storage-review errors suppress forecast callbacks without changing unrelated loading behavior', async () => {
    const h = harness('web'), probe = h.hook(ownerId);
    try {
      await probe.render({ input: base, storageScope: 'blocked', isHydrated: false, storageStatus: 'unavailable', storageError: 'Review unsupported lender terms.' });
      assert.equal(probe.frames.at(-1).rendered, false); assert.match(probe.alerts(), /Review unsupported/);
    } finally { await probe.close(); }
  });
  console.log(`${count} physical legacy assumption contracts ${process.exitCode ? 'failed' : 'passed'}. CPU real-module ports only.`);
}
module.exports = run;
module.exports.nullHost = nullHost;
if (require.main === module) {
  const watchdog = setTimeout(() => { console.error('Physical assumptions contracts timed out.'); process.exit(1); }, 15000);
  run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
}
