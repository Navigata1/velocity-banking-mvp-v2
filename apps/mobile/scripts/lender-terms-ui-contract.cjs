/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const vm = require('node:vm'), ts = require('typescript');

module.exports = ({ React, createRoot, hostElement, document }) => async () => {
  let cases = 0;
  function environment() {
    const cache = new Map(), controls = new Map(), inputs = new Map(), texts = new Map(), saves = [];
    let props = { terms: undefined, disabled: false }, fail = false, gate = null;
    const Fragment = ({ children }) => React.createElement(React.Fragment, null, children);
    const native = { View: Fragment, StyleSheet: { create: value => value },
      Pressable: p => { const id = React.useRef(Symbol()); React.useLayoutEffect(() => { controls.set(id.current, p); return () => controls.delete(id.current); }); return React.createElement(Fragment, null, p.children); },
      Text: p => { const id = React.useRef(Symbol()); React.useLayoutEffect(() => { texts.set(id.current, p); return () => texts.delete(id.current); }); return null; },
      TextInput: p => { const id = React.useRef(Symbol()); React.useLayoutEffect(() => { inputs.set(id.current, p); return () => inputs.delete(id.current); }); return null; } };
    function load(file) {
      if (cache.has(file)) return cache.get(file).exports;
      const loaded = { exports: {} }; cache.set(file, loaded);
      vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
      } }).outputText, { module: loaded, exports: loaded.exports, console, Error, require: id => {
        if (id === 'react-native') return native;
        if (id.startsWith('@interestshield/')) return load(fs.realpathSync(require.resolve(id)));
        if (id.startsWith('.')) {
          const base = path.resolve(path.dirname(file), id);
          return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
        }
        return require(id);
      } }, { filename: file }); return loaded.exports;
    }
    const Component = load(path.resolve(__dirname, '../components/portfolio/portfolio-lender-terms.tsx')).PortfolioLenderTerms;
    const simulate = load(fs.realpathSync(require.resolve('@interestshield/financial-engine/portfolio'))).simulatePortfolio;
    const container = hostElement('div'); container.ownerDocument = document; const root = createRoot(container);
    const renderCurrent = () => root.render(React.createElement(Component, { ...props, basis: simulate({ aprUnit: 'decimal', monthlyIncome: 1000,
      monthlyExpenses: 0, extraMonthlyPayment: 0, debts: [], settings: { strategy: 'avalanche', focusMode: 'single', splitRatioPrimary: 0.7 },
      loc: { limit: 1000, balance: 0, apr: 0.1, ...(props.terms === undefined ? {} : { lenderTerms: props.terms }) } }).forecastBasis, onSave: async value => {
      saves.push(value); if (gate) await gate;
      if (fail) throw new Error('Synthetic publication failure');
      props = { ...props, terms: value === null ? undefined : value }; renderCurrent();
    } }));
    const control = label => { const p = [...controls.values()].find(p => p.accessibilityLabel === label); assert.ok(p, `missing ${label}`); return p; };
    const input = label => { const p = [...inputs.values()].find(p => p.accessibilityLabel === label); assert.ok(p, `missing ${label}`); return p; };
    return { saves, control, input, fail: value => { fail = value; }, gate: value => { gate = value; },
      render: async patch => { props = { ...props, ...patch }; await React.act(async () => renderCurrent()); },
      press: async label => { await React.act(async () => { await control(label).onPress(); }); },
      edit: async (label, value) => { await React.act(async () => input(label).onChangeText(value)); },
      choose: async (label, value) => { await React.act(async () => control(label).onPress()); await React.act(async () => control(`${label} ${value}`).onPress()); },
      basis: () => [...texts.values()].find(p => p.testID === 'native-forecast-basis')?.children,
      alerts: () => [...texts.values()].filter(p => p.accessibilityRole === 'alert').map(p => p.children).join(' '),
      close: async () => { await React.act(async () => root.unmount()); } };
  }
  async function test(name, fn) {
    const h = environment(); cases++;
    try { await h.render(); await fn(h); console.log('PASS native lender callbacks ' + name); }
    catch (error) { console.error('FAIL native lender callbacks ' + name); console.error(error); process.exitCode = 1; }
    finally { await h.close(); }
  }
  await test('blank inputs remain absent and saved partial zero terms stay in review', async h => {
    assert.equal(h.basis(), 'Model estimate'); await h.press('Lender terms');
    assert.equal(h.input('Lender annual fee').value, ''); await h.edit('Lender annual fee', '0');
    await h.press('Save lender terms'); assert.deepEqual(JSON.parse(JSON.stringify(h.saves[0])), { annualFee: 0, sources: { annualFee: 'user-provided' } });
    assert.equal(h.basis(), 'Terms incomplete');
  });
  await test('editing a document-sourced number changes its provenance to user-provided', async h => {
    await h.render({ terms: { annualFee: 75, sources: { annualFee: 'lender-document' } } }); await h.press('Lender terms');
    await h.edit('Lender annual fee', '80'); await h.press('Save lender terms');
    assert.equal(h.saves[0].sources.annualFee, 'user-provided'); assert.equal(h.saves[0].annualFee, 80);
  });
  await test('invalid periods are not coerced or committed', async h => {
    await h.press('Lender terms'); await h.edit('Lender draw period', '1.5'); await h.press('Save lender terms');
    assert.equal(h.saves.length, 0); assert.match(h.alerts(), /whole|period/i);
  });
  await test('transient publication failure retains draft for an explicit retry', async h => {
    await h.press('Lender terms'); await h.edit('Lender annual fee', '0'); h.fail(true); await h.press('Save lender terms');
    assert.match(h.alerts(), /publication failure/); assert.equal(h.input('Lender annual fee').value, '0');
    h.fail(false); await h.press('Save lender terms'); assert.equal(h.saves.length, 2); assert.equal(h.basis(), 'Terms incomplete');
  });
  await test('an unchanged profile does not issue another durable replacement', async h => {
    await h.render({ terms: { annualFee: 0, minimumDraw: 0, sources: { minimumDraw: 'user-provided', annualFee: 'lender-document' } } });
    await h.press('Lender terms'); await h.press('Save lender terms'); assert.equal(h.saves.length, 0);
  });
  await test('stale callbacks cannot save after editing is disabled or the owner surface unmounts', async h => {
    await h.press('Lender terms'); await h.edit('Lender annual fee', '0'); const stale = h.control('Save lender terms').onPress;
    await h.render({ disabled: true }); await React.act(async () => { await stale(); }); assert.equal(h.saves.length, 0);
    await h.render({ disabled: false, terms: { annualFee: 90 } });
    await React.act(async () => { await stale(); }); assert.equal(h.saves.length, 0, 'a replaced form cannot overwrite a newer imported profile');
    await h.close(); await React.act(async () => { await stale(); }); assert.equal(h.saves.length, 0);
  });
  await test('duplicate presses during a durable save cannot start a second publication', async h => {
    await h.press('Lender terms'); await h.edit('Lender annual fee', '0');
    let release; h.gate(new Promise(resolve => { release = resolve; })); const press = h.control('Save lender terms').onPress;
    let first, second; await React.act(async () => { first = press(); second = press(); });
    assert.equal(h.saves.length, 1); await React.act(async () => { release(); await Promise.all([first, second]); });
  });
  await test('profile removal is explicit and restores only educational status', async h => {
    await h.render({ terms: { annualFee: 0 } }); await h.press('Lender terms'); await h.press('Remove lender profile');
    assert.equal(h.saves[0], null); assert.equal(h.basis(), 'Model estimate');
  });
  console.log(`${cases} native lender callback contracts complete. CPU null host, not device or rendered evidence.`);
};
