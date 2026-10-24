/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const clone = value => JSON.parse(JSON.stringify(value));
function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    if (!fs.existsSync(file)) return {};
    const module = { exports: {} }; cache.set(file, module);
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    const resolve = base => [base, `${base}.ts`, `${base}.tsx`].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
    vm.runInNewContext(output, { module, exports: module.exports, console, Error, require: id => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('@interestshield/')) return load(fs.realpathSync(require.resolve(id)));
      if (id.startsWith('@/')) return load(resolve(path.join(root, id.slice(2))));
      if (id.startsWith('.')) return load(resolve(path.resolve(path.dirname(file), id)));
      return require(id);
    } }, { filename: file });
    return module.exports;
  }
  return load;
}
function fixture() {
  return { monthlyIncome: 500, monthlyExpenses: 200, extraMonthlyPayment: 0, chunkAmount: 0,
    strategy: 'velocity', focusMode: 'single', splitRatioPrimary: 0.7, debts: [],
    loc: { limit: 2000, balance: 900, apr: 0.365, lenderTerms: { annualFee: 25, transactionFeePercent: 0.01,
      rateMode: 'fixed', drawPeriodMonths: 120, repaymentPeriodMonths: 180, minimumDraw: 0, minimumPayment: { mode: 'fixed', value: 0 } } },
    datedPlan: { contract: 'fixed-loc-daily-v1', startDate: '2026-01-01', openingCash: 0, cashReserve: 0,
      accountOpenedOn: '2020-01-01', drawEndsOn: '2030-01-01', maturesOn: '2045-01-01', annualFeeFirstDueOn: '2026-01-01',
      openingMinimumPayment: 0, minimumDueDay: 15, debtPaymentDay: 15,
      cashEvents: [{ id: 'pay', day: 1, kind: 'income', amount: 500 }, { id: 'bill', day: 1, kind: 'expense', amount: 200, source: 'loc' }] } };
}
module.exports = { root, loader, clone, fixture };
function componentHarness(file, initialProps = {}, extraMocks = {}) {
  const assert = require('node:assert/strict');
  const { React, createRoot, hostElement, document } = require('./mobile-assumption-physical-contract.cjs').nullHost();
  const controls = new Map(), inputs = new Map(), texts = new Map(); let props = initialProps, mounted = true, sequence = 0, wrap = value => value;
  const Fragment = ({ children }) => React.createElement(React.Fragment, null, children);
  const capture = (map, children = false) => p => {
    const id = React.useRef(Symbol()); React.useLayoutEffect(() => { map.set(id.current, p); return () => map.delete(id.current); });
    return children ? React.createElement(Fragment, null, p.children) : null;
  };
  const native = { View: Fragment, ScrollView: Fragment, Text: capture(texts), TextInput: capture(inputs),
    Pressable: capture(controls, true), StyleSheet: { create: value => value }, Platform: { OS: 'ios' } };
  const load = loader({ 'react-native': native, 'expo-crypto': { randomUUID: () => `entry-${++sequence}` }, ...extraMocks });
  const Component = Object.values(load(path.join(root, file)))[0];
  assert.equal(typeof Component, 'function', `${file} must implement the native UI`);
  const container = hostElement('div'); container.ownerDocument = document; const mountedRoot = createRoot(container);
  const control = label => { const p = [...controls.values()].find(p => p.accessibilityLabel === label); assert.ok(p, `missing control ${label}`); return p; };
  const input = label => { const p = [...inputs.values()].find(p => p.accessibilityLabel === label); assert.ok(p, `missing input ${label}`); return p; };
  return { React, load, controls, inputs, texts, control, input, wrap: wrapper => { wrap = wrapper; },
    text: () => [...texts.values()].map(p => Array.isArray(p.children) ? p.children.join('') : p.children).join('\n'),
    render: async patch => { props = { ...props, ...patch }; await React.act(async () => mountedRoot.render(wrap(React.createElement(Component, props)))); },
    press: async label => { const p = control(label); assert.equal(Boolean(p.disabled), false, label); await React.act(async () => { await p.onPress(); }); },
    edit: async (label, value) => { await React.act(async () => { input(label).onChangeText(value); }); },
    choose: async (label, value) => { await React.act(async () => { control(label).onPress(); }); await React.act(async () => { control(`${label} ${value}`).onPress(); }); },
    close: async () => { if (mounted) { await React.act(async () => { mountedRoot.unmount(); }); mounted = false; } },
  };
}
module.exports.componentHarness = componentHarness;
