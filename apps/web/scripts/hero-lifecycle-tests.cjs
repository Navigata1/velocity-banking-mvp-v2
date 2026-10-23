/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');
const test = require('node:test');
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
const heroMaterials = compile(read('hero-materials.ts'), { three: THREE });
const houseInstances = compile(read('house-instances.ts'));
const once = { geometry: 1, material: 2, texture: 1, image: 1 };
const cardOnce = { geometry: 1, material: 3, texture: 1, image: 1 };
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-12, label);

// Only browser/GPU boundaries are simulated; execute the actual component and math.
function mount(text = source, options = {}) {
  const slots = [], frames = new Map(), loads = [], renderers = [], models = [];
  const documentListeners = new Map();
  const documentProbe = { hidden: false,
    addEventListener(name, listener) {
      const listeners = documentListeners.get(name) ?? new Set();
      listeners.add(listener); documentListeners.set(name, listeners);
    },
    removeEventListener(name, listener) { documentListeners.get(name)?.delete(listener); },
  };
  const state = { renders: 0, errors: 0, ready: [], environment: 0, observer: 0, revoked: [] };
  let cursor = 0, effects = [], nextFrame = 1, now = options.now ?? 10000;
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
    './hero-geometry-bounds': geometryBounds, './turntable': turntable, './hero-materials': heroMaterials,
    './house-instances': houseInstances,
  }, {
    window: { devicePixelRatio: 1, matchMedia: () => ({ matches: !!options.reduced }) }, document: documentProbe,
    ResizeObserver: class { observe() {} disconnect() { state.observer++; } },
    URL: { revokeObjectURL: url => state.revoked.push(url) },
    requestAnimationFrame(fn) { const id = nextFrame++; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  }).default;
  let props = { model: options.model ?? '/heroes/car.glb', replay: 0,
    onReady: value => state.ready.push(value), onError: () => state.errors++ };
  function update(changes = {}) {
    props = { ...props, ...changes }; cursor = 0; effects = [];
    component(props).props.ref.current = host;
    for (const { i } of effects) slots[i]?.cleanup?.();
    for (const { i, effect, deps } of effects) slots[i] = { deps, cleanup: effect() };
  }
  function resolve(index = loads.length - 1) {
    const object = new THREE.Group(), counts = { geometry: 0, material: 0, texture: 0, image: 0 };
    const card = loads[index].model === '/heroes/creditCard.glb';
    const house = loads[index].model === '/heroes/house.glb';
    const image = { close() { counts.image++; } };
    if (card) Object.assign(image, { data: new Uint8Array([255, 255, 255, 255]), width: 1, height: 1 });
    const texture = new THREE.Texture(image);
    const geometry = new THREE.BoxGeometry();
    const materials = card
      ? [options.missingSilver ? 'Missing silver' : 'CC-Brushed-Silver', 'CC-Emerald-Metal', 'CC-Turned-Silver'].map((name, i) =>
        new THREE.MeshPhysicalMaterial({ name, map: texture, normalMap: texture, normalScale: new THREE.Vector2(.08, -.08), anisotropy: [.65, .5, .25][i] }))
      : ['Paint 1 Carmine', options.missingPaint ? 'Missing paint' : 'Paint 2 Carmine'].map(name =>
        new THREE.MeshStandardMaterial({ name, map: texture, normalMap: texture, normalScale: new THREE.Vector2(.3, -.3) }));
    if (card && options.invalidSilver) materials[0].anisotropy = NaN;
    for (const [name, resource] of Object.entries({ geometry, texture })) resource.addEventListener('dispose', () => counts[name]++);
    for (const material of materials) material.addEventListener('dispose', () => counts.material++);
    if (house) {
      materials[0].name = 'House-Limestone'; materials[1].name = 'House-Glass';
      materials[1].transparent = true; materials[1].opacity = .3;
      for (let i = 0; i < 4; i++) {
        const mesh = new THREE.Mesh(geometry, materials[0]); mesh.position.x = i * .4; object.add(mesh);
      }
      object.add(new THREE.Mesh(geometry, materials[1]));
      if (options.houseAttachFails) object.addEventListener('childadded', () => { throw new Error('injected House attachment'); });
    } else if (card) object.add(new THREE.Mesh(geometry, materials[0]), new THREE.Mesh(geometry, [materials[0], materials[0]]),
      new THREE.Mesh(geometry, materials[1]), new THREE.Mesh(geometry, materials[2]));
    else object.add(new THREE.Mesh(geometry, materials[0]), new THREE.Mesh(geometry, materials[0]), new THREE.Mesh(geometry, materials[1]));
    const loaded = { object, counts, materials, originalMeshes: object.children.slice() };
    models.push(loaded); loads[index].success({ scene: object });
    return loaded;
  }
  update();
  return { state, frames, loads, renderers, models, host, resolve, update, documentListeners,
    hidden(value) {
      documentProbe.hidden = value;
      for (const listener of documentListeners.get('visibilitychange') ?? []) listener({ type: 'visibilitychange' });
    },
    skip(ms) { now += ms; },
    replay() { update({ replay: props.replay + 1 }); },
    tick(ms) {
      now += ms;
      for (const id of [...frames.keys()]) { const fn = frames.get(id); if (frames.delete(id)) fn(now); }
    },
    angle: () => models.at(-1).object.rotation.y,
    unmount() { for (const slot of slots) { const cleanup = slot?.cleanup; if (slot) slot.cleanup = undefined; cleanup?.(); } },
  };
}
function released(h, expected = once) {
  h.unmount(); h.unmount();
  assert.equal(h.frames.size, 0, 'unmount must cancel all RAF');
  assert.equal([...h.documentListeners.values()].reduce((n, listeners) => n + listeners.size, 0), 0, 'unmount must remove owned document listeners');
  assert.equal(h.state.environment, 1); assert.equal(h.state.observer, 1);
  for (const renderer of h.renderers) {
    assert.equal(renderer.disposals, 1); assert.equal(renderer.losses, 1);
    assert.equal(renderer.domElement.isConnected, false); assert.equal(renderer.domElement.listeners.size, 0);
  }
  for (const model of h.models) assert.deepEqual(model.counts, expected);
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
    const normalScales = () => h.models[0].object.children.map(mesh => mesh.material.normalScale.toArray());
    assert.deepEqual(normalScales(), [[.15,-.15],[.15,-.15],[.15,-.15]], 'loaded Car must apply shared material refinement');
    const canvas = h.renderers[0].domElement, object = h.models[0].object, scene = h.renderers[0].scene;
    for (let i = 0; i < 4; i++) {
      h.replay(); assert.equal(h.frames.size, 1, 'rapid replay must leave exactly one RAF');
      close(h.angle(), -0.55, 'replay must reset initial pose');
      h.tick(16); h.tick(62.5);
    }
    h.replay(); assert.equal(h.frames.size, 1, 'rapid replay must leave exactly one RAF'); fullTurn(h);
    assert.deepEqual(normalScales(), [[.15,-.15],[.15,-.15],[.15,-.15]], 'Replay must not compound material refinement');
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
console.log('PASS hero lifecycle material refinement: applied on load, unchanged through full turns and repeated Replay');

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
for (const failure of ['network', 'texture', 'context', 'material']) {
  const h = mount(source, { missingPaint: failure === 'material' });
  if (failure === 'network') h.loads[0].failure();
  if (failure === 'texture') { h.loads[0].manager.onError('blob:failed'); h.resolve(); assert.deepEqual(h.state.revoked, ['blob:failed']); }
  if (failure === 'material') h.resolve();
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

function cardReplayContract(text) {
  const h = mount(text, { model: '/heroes/creditCard.glb' });
  try {
    assert.deepEqual(h.state.ready, [false]);
    const loaded = h.resolve();
    assert.equal(h.state.errors, 0, 'Card load must refine its own material path');
    assert.deepEqual(h.state.ready, [false, true]);
    assert.deepEqual(loaded.materials.map(material => material.anisotropy), [.3, .5, .25], 'loaded Card must refine only brushed silver');
    assert.deepEqual(loaded.materials.map(material => material.normalScale.toArray()), [[.08, -.08], [.08, -.08], [.08, -.08]]);
    const before = loaded.materials.map(material => material.toJSON());
    const canvas = h.renderers[0].domElement, scene = h.renderers[0].scene;
    fullTurn(h);
    for (let i = 0; i < 4; i++) {
      h.replay(); assert.equal(h.frames.size, 1, 'Card replay must leave exactly one RAF');
      h.tick(16); h.tick(62.5);
    }
    h.replay(); fullTurn(h);
    assert.deepEqual(loaded.materials.map(material => material.toJSON()), before, 'Card Replay must not alter any material state');
    assert.equal(h.loads.length, 1); assert.equal(h.renderers.length, 1); assert.equal(h.models.length, 1);
    assert.equal(h.renderers[0].domElement, canvas); assert.equal(canvas.isConnected, true);
    assert.equal(h.renderers[0].scene, scene); assert.ok(scene.children.includes(loaded.object));
    assert.deepEqual(h.state.ready, [false, true]); assert.equal(h.state.errors, 0);
    assert.deepEqual(loaded.counts, { geometry: 0, material: 0, texture: 0, image: 0 });
    h.replay(); released(h, cardOnce); assert.equal(h.state.errors, 0);
  } finally { h.unmount(); }
}
cardReplayContract(source);
console.log('PASS hero lifecycle Card load and Replay: silver 0.3, other alloys stable, one model/canvas, resources released once');

for (const options of [{ missingSilver: true }, { invalidSilver: true }]) {
  const h = mount(source, { model: '/heroes/creditCard.glb', ...options });
  try {
    const loaded = h.resolve();
    assert.equal(h.state.errors, 1); assert.deepEqual(h.state.ready, [false]);
    assert.equal(h.frames.size, 0); assert.deepEqual(loaded.counts, cardOnce);
    assert.equal(loaded.materials[1].anisotropy, .5); assert.equal(loaded.materials[2].anisotropy, .25);
    if (options.invalidSilver) assert.ok(Number.isNaN(loaded.materials[0].anisotropy));
    else assert.equal(loaded.materials[0].anisotropy, .65);
    h.replay(); assert.equal(h.frames.size, 0);
    released(h, cardOnce); assert.equal(h.state.errors, 1);
  } finally { h.unmount(); }
}
console.log('PASS hero lifecycle Card rejection: missing or invalid silver never ready, resources released once');

const switched = mount();
try {
  switched.update({ model: '/heroes/creditCard.glb' });
  assert.deepEqual(switched.loads.map(load => load.model), ['/heroes/car.glb', '/heroes/creditCard.glb']);
  assert.deepEqual(switched.state.ready, [false, false]);
  const staleCar = switched.resolve(0);
  assert.deepEqual(staleCar.counts, once);
  assert.deepEqual(staleCar.materials.map(material => material.normalScale.toArray()), [[.3, -.3], [.3, -.3]], 'late Car must be disposed before material refinement');
  switched.loads[0].failure(); assert.equal(switched.state.errors, 0);
  const currentCard = switched.resolve(1);
  assert.deepEqual(currentCard.materials.map(material => material.anisotropy), [.3, .5, .25]);
  assert.deepEqual(switched.state.ready, [false, false, true]);
  assert.ok(!switched.renderers[1].scene.children.includes(staleCar.object));
  assert.ok(switched.renderers[1].scene.children.includes(currentCard.object));
  fullTurn(switched); switched.replay(); fullTurn(switched);
  assert.deepEqual(currentCard.materials.map(material => material.anisotropy), [.3, .5, .25]);
  assert.deepEqual(currentCard.counts, { geometry: 0, material: 0, texture: 0, image: 0 });
  switched.unmount(); switched.unmount();
  assert.deepEqual(staleCar.counts, once); assert.deepEqual(currentCard.counts, cardOnce);
  assert.equal(switched.loads.length, 2); assert.equal(switched.models.length, 2);
  assert.equal(switched.state.environment, 2); assert.equal(switched.state.observer, 2);
  assert.equal(switched.frames.size, 0); assert.equal(switched.state.errors, 0);
  for (const renderer of switched.renderers) {
    assert.equal(renderer.disposals, 1); assert.equal(renderer.losses, 1);
    assert.equal(renderer.domElement.isConnected, false); assert.equal(renderer.domElement.listeners.size, 0);
  }
} finally { switched.unmount(); }
console.log('PASS hero lifecycle stale Car->Card: late Car unrefined and released, Card isolated through Replay and teardown');

function houseReplayContract(text) {
  const h = mount(text, { model: '/heroes/house.glb' });
  try {
    const loaded = h.resolve(), instances = loaded.object.children.filter(node => node.isInstancedMesh);
    assert.equal(instances.length, 1, 'House must configure its repeated opaque parts once per load');
    const batch = instances[0], canvas = h.renderers[0].domElement;
    assert.equal(batch.count, 4); assert.equal(batch.material, loaded.materials[0]);
    assert.ok(loaded.originalMeshes.slice(0, 4).every(node => !node.visible));
    assert.equal(loaded.originalMeshes[4].visible, true, 'House glass remains outside the batch');
    let disposed = 0; batch.addEventListener('dispose', () => disposed++);
    fullTurn(h);
    for (let i = 0; i < 4; i++) { h.replay(); h.tick(16); h.tick(62.5); }
    h.replay(); fullTurn(h);
    assert.equal(h.renderers[0].domElement, canvas); assert.equal(h.loads.length, 1);
    assert.deepEqual(loaded.object.children.filter(node => node.isInstancedMesh), [batch]);
    assert.equal(disposed, 0); assert.equal(h.state.errors, 0);
    released(h);
    assert.equal(disposed, 1, 'House teardown must release the owned instance exactly once');
    assert.ok(loaded.originalMeshes.every(node => node.visible), 'House teardown restores original visibility');
    assert.equal(loaded.object.children.some(node => node.isInstancedMesh), false);
  } finally { h.unmount(); }
}
houseReplayContract(source);
for (const failure of ['attach', 'late', 'context']) {
  const h = mount(source, { model: '/heroes/house.glb', houseAttachFails: failure === 'attach' });
  try {
    if (failure === 'late') h.unmount();
    const loaded = h.resolve();
    if (failure === 'context') h.renderers[0].domElement.listeners.get('webglcontextlost')({ preventDefault() {} });
    h.unmount(); h.unmount();
    assert.deepEqual(loaded.counts, once);
    assert.ok(loaded.originalMeshes.every(node => node.visible));
    assert.equal(loaded.object.children.some(node => node.isInstancedMesh), false);
    assert.equal(h.state.errors, failure === 'late' ? 0 : 1);
    assert.equal(h.frames.size, 0);
  } finally { h.unmount(); }
}
console.log('PASS House lifecycle: one instance setup across Replay, borrowed resources and owned teardown, late/error paths');

function houseCleanupFailureContract(text) {
  const h = mount(text, { model: '/heroes/house.glb' });
  try {
    const loaded = h.resolve(), batch = loaded.object.children.find(node => node.isInstancedMesh);
    assert.ok(batch);
    batch.addEventListener('dispose', () => { throw new Error('injected House owned disposal'); });
    assert.throws(() => h.unmount(), /injected House owned disposal/);
    assert.deepEqual(loaded.counts, once, 'House cleanup errors must still dispose borrowed model resources');
    assert.equal(h.state.environment, 1); assert.equal(h.state.observer, 1);
    assert.equal(h.renderers[0].disposals, 1); assert.equal(h.renderers[0].losses, 1);
    assert.equal(h.renderers[0].domElement.isConnected, false);
    assert.ok(loaded.originalMeshes.every(node => node.visible));
  } finally { h.unmount(); }
}
houseCleanupFailureContract(source);
const withoutCleanupFinally = source.replace('try { releaseInstances?.(); }\n      finally {', 'releaseInstances?.();\n      {');
assert.notEqual(withoutCleanupFinally, source);
assert.throws(() => houseCleanupFailureContract(withoutCleanupFinally), error => error.code === 'ERR_ASSERTION');
console.log('PASS House teardown error: renderer/model/environment release survives owned-disposal failure; missing finally rejected');

for (const [from, name] of [
  ['releaseInstances = configureHouseInstances({ THREE, scene: gltf.scene, model });', 'missing House instance setup'],
  ['releaseInstances?.();', 'missing House instance cleanup'],
]) {
  const mutant = source.replace(from, ''); assert.notEqual(mutant, source, name + ': mutation must apply');
  assert.throws(() => houseReplayContract(mutant), error => error.code === 'ERR_ASSERTION', name);
}

const hardcodedCar = source.replace('refineHeroMaterials(gltf.scene, model)', "refineHeroMaterials(gltf.scene, '/heroes/car.glb')");
assert.notEqual(hardcodedCar, source, 'hardcoded Car material path: mutation must apply');
assert.throws(() => cardReplayContract(hardcodedCar), error => error.code === 'ERR_ASSERTION' && /Card load must refine its own material path/.test(error.message));
console.log('PASS hero lifecycle negative control rejected: hardcoded Car material path');

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

function visibleClockContract(text, intervals, now = 10000) {
  const h = mount(text, { now });
  try {
    h.resolve(); h.tick(0);
    let elapsed = 0;
    for (const interval of intervals) {
      h.tick(interval); elapsed += interval;
      if (elapsed < 8000) assert.equal(h.frames.size, 1, 'visible turn must not finish early');
    }
    close(h.angle(), 2 * Math.PI - .55, 'eight visible seconds must complete one revolution');
    assert.equal(h.frames.size, 0, 'visible endpoint must stop RAF');
    const renders = h.state.renders; h.tick(1000);
    assert.equal(h.state.renders, renders, 'resting clock must not render again');
  } finally { released(h); }
}

const clockCadences = [
  ['normal', Array(128).fill(62.5)],
  ['slow', Array(16).fill(500)],
  ['irregular', [10, 490, 1200, 300, 2000, 500, 1000, 1000, 1500]],
  ['single visible gap', [8000]],
];
for (const [name, intervals] of clockCadences) {
  test(`hero clock: ${name} cadence completes a finite eight-second visible turn`, () => visibleClockContract(source, intervals));
}
test('hero clock: timestamp zero is a valid first RAF', () => visibleClockContract(source, [8000], 0));

function hiddenClockContract(text, deliverHiddenFrames) {
  const h = mount(text);
  try {
    h.resolve(); h.tick(16); h.tick(62.5); const angle = h.angle();
    h.hidden(true);
    if (deliverHiddenFrames) for (let i = 0; i < 4; i++) h.tick(15000);
    else h.skip(60000);
    close(h.angle(), angle, 'hidden delivery must not advance pose');
    h.hidden(false); h.tick(16);
    close(h.angle(), angle, 'hidden gap and first resumed RAF must not advance the turn');
    for (let i = 0; i < 127; i++) h.tick(62.5);
    close(h.angle(), 2 * Math.PI - .55, 'remaining visible time must complete the turn');
    assert.equal(h.frames.size, 0, 'resumed endpoint must stop RAF');
  } finally { released(h); }
}
for (const delivered of [false, true]) {
  test(`hero clock: hidden gap excludes time with${delivered ? '' : 'out'} hidden callbacks`, () => hiddenClockContract(source, delivered));
}

function pausedReplayClockContract(text) {
  const h = mount(text);
  try {
    const loaded = h.resolve(), canvas = h.renderers[0].domElement;
    h.tick(16); h.tick(62.5); h.hidden(true); h.skip(10000); h.replay();
    close(h.angle(), -.55, 'paused Replay must reset the pose');
    assert.equal(h.frames.size, 1, 'paused Replay must keep exactly one RAF');
    h.skip(10000); h.hidden(false); h.tick(16);
    close(h.angle(), -.55, 'hidden time must not shorten Replay');
    for (let i = 0; i < 16; i++) h.tick(500);
    close(h.angle(), 2 * Math.PI - .55, 'paused Replay must complete its own visible revolution');
    assert.equal(h.frames.size, 0); assert.equal(h.loads.length, 1); assert.equal(h.renderers.length, 1);
    assert.equal(h.renderers[0].domElement, canvas); assert.equal(h.models[0], loaded);
    assert.deepEqual(loaded.counts, { geometry: 0, material: 0, texture: 0, image: 0 });
  } finally { released(h); }
}
test('hero clock: Replay during hidden pause resets without refetch or another renderer', () => pausedReplayClockContract(source));

function replayOriginClockContract(text) {
  const h = mount(text);
  try {
    h.resolve(); h.tick(16); h.tick(500); h.skip(1000); h.replay(); h.tick(500);
    close(h.angle(), -.55, 'first Replay RAF must establish a fresh visible-time origin');
    for (let i = 0; i < 16; i++) h.tick(500);
    close(h.angle(), 2 * Math.PI - .55, 'Replay must accrue its own eight seconds');
    assert.equal(h.frames.size, 0); assert.equal(h.loads.length, 1); assert.equal(h.renderers.length, 1);
  } finally { released(h); }
}
test('hero clock: visible Replay discards the old timestamp and elapsed time', () => replayOriginClockContract(source));

test('hero clock: unmount while hidden removes callbacks and owned listeners', () => {
  const h = mount();
  h.resolve(); h.tick(16); h.hidden(true); released(h);
  const renders = h.state.renders; h.hidden(false); h.tick(8000);
  assert.equal(h.state.renders, renders); assert.equal(h.state.errors, 0);
});
test('hero clock: reduced motion stays at rest through visibility and Replay', () => {
  const h = mount(source, { reduced: true });
  try {
    h.resolve(); h.hidden(true); h.skip(60000); h.replay(); h.hidden(false); h.tick(8000);
    close(h.angle(), -.55, 'reduced-motion clock must retain original rest pose');
    assert.equal(h.frames.size, 0); assert.equal(h.loads.length, 1); assert.equal(h.renderers.length, 1);
  } finally { released(h); }
});

for (const [name, from, to, contract, message] of [
  ['visible 100ms cap', 'Math.max((now - previous) / 1000, 0)', 'Math.min((now - previous) / 1000, 0.1)',
    mutant => visibleClockContract(mutant, Array(16).fill(500)), /eight visible seconds must complete one revolution/],
  ['truthy timestamp sentinel', 'previous !== undefined', 'previous',
    mutant => visibleClockContract(mutant, [8000], 0), /eight visible seconds must complete one revolution/],
  ['missing visibility reset', 'const visibilityChanged = () => { previous = undefined; };', 'const visibilityChanged = () => {};',
    mutant => hiddenClockContract(mutant, false), /hidden gap and first resumed RAF must not advance the turn/],
  ['missing visibility cleanup', "document.removeEventListener('visibilitychange', visibilityChanged);", '',
    mutant => visibleClockContract(mutant, [8000]), /unmount must remove owned document listeners/],
  ['stale Replay timestamp', 'elapsed = 0; previous = undefined;', 'elapsed = 0;',
    mutant => replayOriginClockContract(mutant), /first Replay RAF must establish a fresh visible-time origin/],
  ['stale Replay elapsed time', 'elapsed = 0; previous = undefined;', 'previous = undefined;',
    mutant => replayOriginClockContract(mutant), /first Replay RAF must establish a fresh visible-time origin/],
]) {
  assert.equal(source.split(from).length, 2, `${name}: mutation must target exactly one expression`);
  const mutant = source.replace(from, to);
  assert.throws(() => contract(mutant), error => error.code === 'ERR_ASSERTION' && message.test(error.message), name);
  console.log(`PASS hero clock negative control rejected: ${name}`);
}
