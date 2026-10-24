/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const read = name => fs.readFileSync(path.join(__dirname, '../src', name), 'utf8');
function compile(text, imports = {}, globals = {}) {
  const output = { exports: {} };
  const js = ts.transpileModule(text, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(js, { module: output, exports: output.exports, require(name) {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`); return imports[name];
  }, ...globals });
  return output.exports;
}
const { heroAssets } = compile(read('data/hero-assets.ts'));
// Actual AssetHero runs; hooks, JSX, Next boundaries and document/observer events are simulated.
// Utility declarations are inspected, not CSS painting, React scheduling or WebGL pixels.
function mount(text, compact = false) {
  const slots = [], queue = [], listeners = new Set(), observers = [], Stage = Symbol('stage');
  let cursor = 0, effects = [], tree;
  const document = { hidden: false, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  const changed = (old, deps) => !old || deps.some((value, i) => !Object.is(value, old.deps[i]));
  const jsx = (type, props, key) => ({ type, props, key });
  const component = compile(text, {
    react: {
      useState(value) {
        const i = cursor++; slots[i] ??= { value };
        slots[i].set ??= value => queue.push(() => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; });
        return [slots[i].value, slots[i].set];
      },
      useRef(value) { const i = cursor++; slots[i] ??= { current: value }; return slots[i]; },
      useCallback(fn, deps) { const i = cursor++; if (changed(slots[i], deps)) slots[i] = { fn, deps }; return slots[i].fn; },
      useEffect(fn, deps) { const i = cursor++; if (changed(slots[i], deps)) effects.push({ i, fn, deps }); },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/image': { default: 'image' },
    'next/dynamic': { default: () => Stage }, 'lucide-react': { Box: 'box', ImageIcon: 'image-icon', RotateCcw: 'replay-icon' },
    '@/data/hero-assets': { heroAssets },
  }, { document, IntersectionObserver: class {
    constructor(fn, options) { this.fn = fn; this.options = options; observers.push(this); }
    observe() {} disconnect() { this.disconnected = true; }
  } }).default;
  function render() {
    for (const update of queue.splice(0)) update();
    cursor = 0; effects = []; tree = component({ id: 'car', compact }); tree.props.ref.current = {};
    for (const { i } of effects) slots[i]?.cleanup?.();
    for (const { i, fn, deps } of effects) slots[i] = { deps, cleanup: fn() };
  }
  function entries(node, parents = []) {
    if (!node || typeof node !== 'object') return [];
    return [{ node, parents }, ...[node.props?.children].flat(Infinity).flatMap(child => entries(child, [...parents, node]))];
  }
  const find = predicate => entries(tree).find(({ node }) => predicate(node));
  const tokens = node => (node.props.className ?? '').split(/\s+/);
  const shown = entry => !!entry && ![...entry.parents, entry.node].some(node => tokens(node).some(t => ['invisible', 'hidden', 'opacity-0'].includes(t)));
  const act = (fn, commit = true) => { fn(); if (commit) render(); };
  const button = label => find(node => node.props['aria-label'] === label).node;
  render();
  return {
    stage: () => find(node => node.type === Stage)?.node,
    click: label => act(() => button(label).props.onClick()),
    ready: value => act(() => find(node => node.type === Stage).node.props.onReady(value)),
    fail: () => act(() => find(node => node.type === Stage).node.props.onError()),
    hidden: (value, commit = true) => act(() => { document.hidden = value; for (const fn of listeners) fn(); }, commit),
    offscreen: (value, commit = true) => act(() => observers[0].fn([{ isIntersecting: !value }]), commit),
    commit: render,
    view: () => [shown(find(node => node.type === 'image')), shown(find(node => node.type === Stage))],
    image: () => find(node => node.type === 'image').node,
    frame: () => tree.props.children[0].props.className,
    pressed: label => button(label).props['aria-pressed'],
    status: () => find(node => node.props.role === 'status')?.node.props.children,
    clean() { for (const slot of slots) slot?.cleanup?.(); assert.equal(listeners.size, 0); assert.ok(observers.every(o => o.disconnected)); },
  };
}
const expectView = (h, want, message) => assert.equal(JSON.stringify(h.view()), JSON.stringify(want), message);
const inspect = h => h.click('Inspect 3D model');
const cases = [
  ['poster layout and opt-in unchanged', h => {
    expectView(h, [true, false], 'initial poster only'); assert.equal(h.stage(), undefined);
    assert.equal(h.pressed('Studio artwork'), true);
    assert.equal(h.frame(), 'relative isolate w-full h-[270px] md:h-[370px] xl:h-[420px]');
    assert.equal(h.image().props.src, heroAssets.car.poster); assert.equal(h.image().props.fill, true);
    assert.equal(h.image().props.sizes, '(max-width: 768px) 92vw, 60vw'); assert.equal(h.image().props.priority, true);
  }],
  ['loading gate', h => {
    inspect(h); assert.ok(h.stage(), 'loading must mount the stage');
    expectView(h, [true, false], 'pending stage must be invisible behind the poster');
  }],
  ['binary ready handoff', h => {
    inspect(h); h.ready(true); expectView(h, [false, true], 'ready exposes only model');
    h.ready(false); expectView(h, [true, false], 'not-ready restores only poster without unmount'); assert.ok(h.stage());
  }],
  ['no poster fade', h => {
    inspect(h); h.ready(true);
    assert.ok(h.image().props.className.split(/\s+/).includes('transition-none'), 'poster handoff must declare no transition');
    assert.ok(!h.image().props.className.split(/\s+/).some(t => /^transition(?:-|$)/.test(t) && t !== 'transition-none'), 'poster must not interpolate opacity');
  }],
  ['hidden return', h => {
    inspect(h); h.ready(true); h.hidden(true); expectView(h, [true, false], 'hidden removes stage'); assert.equal(h.stage(), undefined);
    h.hidden(false); expectView(h, [true, false], 'hidden return: poster stays until new readiness');
    assert.ok(h.stage()); h.ready(true); expectView(h, [false, true], 'hidden return ready');
  }],
  ['offscreen return', h => {
    inspect(h); h.ready(true); h.offscreen(true); expectView(h, [true, false], 'offscreen removes stage'); assert.equal(h.stage(), undefined);
    h.offscreen(false); expectView(h, [true, false], 'offscreen return: poster stays until new readiness');
    assert.ok(h.stage()); h.ready(true); expectView(h, [false, true], 'offscreen return ready');
  }],
  ['Replay and selected-mode policy unchanged', h => {
    inspect(h); const pending = h.stage(); h.click('Replay full turn'); assert.equal(h.stage().props.replay, 1);
    expectView(h, [true, false], 'Replay while loading keeps poster'); h.ready(true); const loaded = h.stage();
    h.click('Replay full turn'); expectView(h, [false, true], 'Replay must not reopen poster');
    assert.equal(h.stage().key, pending.key); assert.equal(h.stage().props.model, loaded.props.model);
    assert.equal(h.stage().props.onReady, loaded.props.onReady); assert.equal(h.stage().props.replay, 2);
    inspect(h); expectView(h, [false, true], 'selected model click stays ready'); assert.equal(h.stage().props.replay, 2);
  }],
  ['failure and retry', h => {
    for (const ready of [false, true]) {
      inspect(h); if (ready) h.ready(true); h.fail(); expectView(h, [true, false], 'failure restores poster');
      assert.equal(h.stage(), undefined); assert.equal(h.status(), '3D unavailable. Studio artwork shown.');
      assert.equal(h.pressed('Inspect 3D model'), true); inspect(h); assert.ok(h.stage());
      expectView(h, [true, false], 'retry waits for readiness'); assert.equal(h.status(), undefined);
      h.ready(true); expectView(h, [false, true], 'successful retry'); h.click('Studio artwork');
    }
  }],
  ['Studio artwork roundtrip', h => {
    inspect(h); h.ready(true); h.click('Studio artwork'); expectView(h, [true, false], 'Studio returns poster');
    assert.equal(h.stage(), undefined); assert.equal(h.pressed('Studio artwork'), true);
    inspect(h); expectView(h, [true, false], 'new Inspect waits'); h.ready(true); expectView(h, [false, true], 'new Inspect ready');
  }],
];
function run(text) {
  return cases.map(([name, contract]) => {
    const h = mount(text);
    try { contract(h); return { name, passed: true }; }
    catch (error) { return { name, passed: false, code: error.code, error: error.message }; }
    finally { h.clean(); }
  });
}
function controls(text) {
  return [
    ['fade', 'transition-none ${', 'transition-opacity motion-reduce:transition-none ${', 'no poster fade', 'poster handoff must declare no transition'],
    ['gate', "ready ? 'visible' : 'invisible'", "true ? 'visible' : 'invisible'", 'loading gate', 'pending stage must be invisible behind the poster'],
    ['hidden stale ready', 'if (document.hidden) {\n        setReadyGeneration(null);\n        setLoadGeneration(g => g + 1);', 'if (document.hidden) {', 'hidden return', 'hidden return: poster stays until new readiness'],
    ['offscreen stale ready', 'if (!entry.isIntersecting) {\n        setReadyGeneration(null);\n        setLoadGeneration(g => g + 1);', 'if (!entry.isIntersecting) {', 'offscreen return', 'offscreen return: poster stays until new readiness'],
  ].map(([name, from, to, target, message]) => {
    assert.equal(text.split(from).length, 2, name + ': mutation must target exactly one expression');
    const result = run(text.replace(from, to)).find(row => row.name === target);
    assert.equal(result.passed, false, name + ': mutation must fail');
    assert.equal(result.code, 'ERR_ASSERTION'); assert.equal(result.error.split('\n')[0], message);
    return { name, target, rejected: true, assertion: message };
  });
}
module.exports = { run, controls, mount };
if (require.main === module) {
  const text = read('components/hero/AssetHero.tsx'), results = run(text);
  for (const row of results) assert.equal(row.passed, true, row.name + ': ' + row.error);
  const compact = mount(text, true); assert.equal(compact.frame(), 'relative isolate w-full h-[240px] md:h-[300px]'); compact.clean();
  console.log(JSON.stringify({ results, controls: controls(text) }, null, 2));
}
