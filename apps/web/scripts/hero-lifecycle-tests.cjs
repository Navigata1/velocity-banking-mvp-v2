/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');
const read = name => fs.readFileSync(path.join(__dirname, '../src/components/hero', name), 'utf8');
const source = read('HeroModelStage.tsx');
function compile(text, imports = {}, globals = {}) {
  const output = { exports: {} };
  const js = ts.transpileModule(text, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(js, { module: output, exports: output.exports, require(name) {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
    return imports[name];
  }, ...globals });
  return output.exports;
}
const turntable = compile(read('turntable.ts'));
const geometryBounds = compile(read('hero-geometry-bounds.ts'), { three: THREE });
const once = { geometry: 1, material: 1, texture: 1, image: 1 };
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-12, label);

// Only browser/GPU boundaries are simulated; execute the actual component and math.
function mount(text = source, options = {}) {
  const slots = [], frames = new Map(), loads = [], renderers = [], models = [];
  const state = { renders: 0, errors: 0, ready: [], environment: 0, observer: 0, revoked: [] };
  let cursor = 0, effects = [], nextFrame = 1, now = 10000;
  const host = { clientWidth: 400, clientHeight: 300, dataset: {}, appendChild(node) { node.isConnected = true; } };
  class Renderer {
    constructor() {
      if (options.rendererFails) throw new Error('injected renderer failure');
      this.disposals = 0; this.losses = 0;
      const listeners = new Map();
      this.domElement = { listeners, isConnected: false,
        addEventListener: (name, fn) => listeners.set(name, fn),
        removeEventListener: name => listeners.delete(name), remove() { this.isConnected = false; } };
      renderers.push(this);
    }
    setPixelRatio() {} setClearColor() {} setSize() {}
    render(scene) { state.renders++; this.scene = scene; }
    dispose() { this.disposals++; }
    forceContextLoss() { this.losses++; this.domElement.listeners.get('webglcontextlost')?.({ preventDefault() {} }); }
  }
  class Loader {
    constructor(manager) { this.manager = manager; }
    setMeshoptDecoder() { return this; }
    load(model, success, progress, failure) { loads.push({ model, success, failure, manager: this.manager }); }
  }
  const component = compile(text, {
    react: {
      useRef(initial) { const i = cursor++; slots[i] ??= { ref: { current: initial } }; return slots[i].ref; },
      useEffect(effect, deps) {
        const i = cursor++, old = slots[i];
        if (!old || deps.length !== old.deps.length || deps.some((value, n) => !Object.is(value, old.deps[n]))) {
          effects.push({ i, effect, deps });
        }
      },
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    three: { ...THREE, WebGLRenderer: Renderer },
    'three/addons/loaders/GLTFLoader.js': { GLTFLoader: Loader },
    'three/addons/libs/meshopt_decoder.module.js': { MeshoptDecoder: {} },
    './studio-environment': { createHeroEnvironment() {
      if (options.environmentFails) throw new Error('injected environment failure');
      return { texture: {}, dispose() { state.environment++; } };
    } },
    './hero-geometry-bounds': geometryBounds, './turntable': turntable,
  }, {
    window: { devicePixelRatio: 1, matchMedia: () => ({ matches: !!options.reduced }) }, document: { hidden: false },
    ResizeObserver: class { observe() {} disconnect() { state.observer++; } },
    URL: { revokeObjectURL: url => state.revoked.push(url) },
    requestAnimationFrame(fn) { const id = nextFrame++; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  }).default;
  let props = { model: '/heroes/car.glb', replay: 0,
    onReady: value => state.ready.push(value), onError: () => state.errors++ };
  function update(changes = {}) {
    props = { ...props, ...changes }; cursor = 0; effects = [];
    component(props).props.ref.current = host;
    for (const { i } of effects) slots[i]?.cleanup?.();
    for (const { i, effect, deps } of effects) slots[i] = { deps, cleanup: effect() };
  }
  function resolve(index = loads.length - 1) {
    const object = new THREE.Group(), counts = { geometry: 0, material: 0, texture: 0, image: 0 };
    const texture = new THREE.Texture({ close() { counts.image++; } });
    const geometry = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial({ map: texture, normalMap: texture });
    for (const [name, resource] of Object.entries({ geometry, material, texture })) resource.addEventListener('dispose', () => counts[name]++);
    object.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
    models.push({ object, counts }); loads[index].success({ scene: object });
  }
  update();
  return { state, frames, loads, renderers, models, host, resolve, update,
    replay() { update({ replay: props.replay + 1 }); },
    tick(ms) {
      now += ms;
      for (const id of [...frames.keys()]) { const fn = frames.get(id); if (frames.delete(id)) fn(now); }
    },
    angle: () => models.at(-1).object.rotation.y,
    unmount() { for (const slot of slots) { slot?.cleanup?.(); if (slot) slot.cleanup = undefined; } },
  };
}
function released(h) {
  h.unmount(); h.unmount();
  assert.equal(h.frames.size, 0, 'unmount must cancel all RAF');
  assert.equal(h.state.environment, 1); assert.equal(h.state.observer, 1);
  for (const renderer of h.renderers) {
    assert.equal(renderer.disposals, 1); assert.equal(renderer.losses, 1);
    assert.equal(renderer.domElement.isConnected, false); assert.equal(renderer.domElement.listeners.size, 0);
  }
  for (const model of h.models) assert.deepEqual(model.counts, once);
}
function fullTurn(h) {
  close(h.angle(), -0.55, 'turn must start at original pose'); h.tick(16);
  // 62.5ms is exactly 1/16 second: no accumulated rounding at the eight-second endpoint.
  for (let i = 0; i < 64; i++) h.tick(62.5);
  close(h.angle(), Math.PI - 0.55, 'four seconds must be the halfway pose');
  for (let i = 0; i < 63; i++) h.tick(62.5);
  assert.equal(h.frames.size, 1, 'turn must remain active until eight seconds');
  assert.ok(h.angle() < 2 * Math.PI - 0.55, 'turn must not finish early'); h.tick(62.5);
  close(h.angle(), 2 * Math.PI - 0.55, 'eight seconds must complete 360 degrees');
  assert.equal(h.frames.size, 0, 'eight-second turn must stop RAF');
  const rendered = h.state.renders; h.tick(1000);
  assert.equal(h.state.renders, rendered, 'settled turn must not render');
}
function replayContract(text) {
  const h = mount(text);
  try {
    assert.deepEqual(h.state.ready, [false]); h.resolve(); fullTurn(h);
    const canvas = h.renderers[0].domElement, object = h.models[0].object, scene = h.renderers[0].scene;
    for (let i = 0; i < 4; i++) {
      h.replay(); assert.equal(h.frames.size, 1, 'rapid replay must leave exactly one RAF');
      close(h.angle(), -0.55, 'replay must reset initial pose');
      h.tick(16); h.tick(62.5);
    }
    h.replay(); assert.equal(h.frames.size, 1, 'rapid replay must leave exactly one RAF'); fullTurn(h);
    assert.equal(h.renderers.length, 1); assert.equal(h.loads.length, 1); assert.equal(h.models.length, 1);
    assert.equal(h.renderers[0].domElement, canvas); assert.equal(canvas.isConnected, true);
    assert.equal(h.renderers[0].scene, scene); assert.ok(scene.children.includes(object));
    assert.equal(h.models[0].object, object); assert.equal(h.host.dataset.ready, 'true');
    assert.deepEqual(h.state.ready, [false, true]); assert.equal(h.state.errors, 0);
    assert.deepEqual(h.models[0].counts, { geometry: 0, material: 0, texture: 0, image: 0 });
    h.replay(); released(h); assert.equal(h.state.errors, 0);
  } finally { h.unmount(); }
}
replayContract(source);
console.log('PASS hero lifecycle finite endpoint: initial and replay reach 360 degrees at 8 seconds');
console.log('PASS hero lifecycle RAF stop: zero pending and no renders after both turns');
console.log('PASS hero lifecycle replay cancellation: rapid replay leaves exactly one pending RAF');
console.log('PASS hero lifecycle retention and cleanup: one renderer/model/canvas, stable ready, resources released once');

const reduced = mount(source, { reduced: true }); reduced.resolve();
assert.equal(reduced.frames.size, 0, 'reduced-motion load must not schedule RAF');
for (let i = 0; i < 4; i++) {
  reduced.replay(); assert.equal(reduced.frames.size, 0, 'reduced-motion replay must not schedule RAF');
  const rendered = reduced.state.renders; reduced.tick(1000); assert.equal(reduced.state.renders, rendered);
}
close(reduced.angle(), -0.55, 'reduced-motion replay must stay at original pose');
assert.equal(reduced.loads.length, 1); assert.equal(reduced.renderers.length, 1);
assert.deepEqual(reduced.state.ready, [false, true]); released(reduced);
const pending = mount(); pending.replay(); pending.replay();
assert.equal(pending.loads.length, 1); assert.equal(pending.frames.size, 0);
assert.deepEqual(pending.state.ready, [false]); pending.resolve();
assert.deepEqual(pending.state.ready, [false, true]); fullTurn(pending); released(pending);
const late = mount(); late.replay(); released(late); late.resolve(); late.loads[0].failure();
assert.equal(late.frames.size, 0); assert.deepEqual(late.models[0].counts, once);
assert.deepEqual(late.state.ready, [false]); assert.equal(late.state.errors, 0);
for (const failure of ['network', 'texture', 'context']) {
  const h = mount();
  if (failure === 'network') h.loads[0].failure();
  if (failure === 'texture') { h.loads[0].manager.onError('blob:failed'); h.resolve(); assert.deepEqual(h.state.revoked, ['blob:failed']); }
  if (failure === 'context') {
    h.resolve(); h.replay(); let prevented = false;
    h.renderers[0].domElement.listeners.get('webglcontextlost')({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
  }
  assert.equal(h.state.errors, 1);
  assert.deepEqual(h.state.ready, failure === 'context' ? [false, true] : [false]);
  released(h); assert.equal(h.state.errors, 1);
}
for (const options of [{ rendererFails: true }, { environmentFails: true }]) {
  const h = mount(source, options); h.replay(); h.unmount();
  assert.equal(h.state.errors, 1); assert.equal(h.loads.length, 0); assert.equal(h.frames.size, 0);
  for (const renderer of h.renderers) { assert.equal(renderer.disposals, 1); assert.equal(renderer.domElement.isConnected, false); }
}
console.log('PASS hero lifecycle edge paths: reduced motion, loading replay, late load, errors, context loss');

// Permanent negative controls must fail behavior assertions, not merely parse differently.
for (const [name, pattern, replacement, message] of [
  ['missing restart cancellation', /(const restart = \(\) => \{[\s\S]*?)cancelAnimationFrame\(frame\);/, '$1', /rapid replay must leave exactly one RAF/],
  ['shortened 1.6-second turn', 'elapsed < HERO_TURN_SECONDS', 'elapsed < 1.6', /four seconds must be the halfway pose/],
  ['infinite RAF', 'elapsed < HERO_TURN_SECONDS', 'true', /eight-second turn must stop RAF/],
]) {
  const mutant = source.replace(pattern, replacement); assert.notEqual(mutant, source, `${name}: mutation must apply`);
  assert.throws(() => replayContract(mutant), error => error.code === 'ERR_ASSERTION' && message.test(error.message), name);
  console.log(`PASS hero lifecycle negative control rejected: ${name}`);
}
