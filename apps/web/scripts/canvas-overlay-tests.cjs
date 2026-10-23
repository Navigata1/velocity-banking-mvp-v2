/* eslint-disable @typescript-eslint/no-require-imports */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const filename=path.resolve(__dirname,'../../../apps/web/scripts/test-three-stage.cjs'),request=createRequire(filename);
class Style {
  constructor(initial, onSet = () => {}) { this.values = new Map(initial); this.onSet = onSet; }
  getPropertyValue(name) { return this.values.get(name)?.[0] ?? ''; }
  getPropertyPriority(name) { return this.values.get(name)?.[1] ?? ''; }
  setProperty(name, value, priority = '') { this.values.set(name, [value, priority]); this.onSet(name, value, priority); }
  removeProperty(name) { this.values.delete(name); }
  snapshot() { return [...this.values].sort(([a], [b]) => a.localeCompare(b)); }
}

class Element {
  constructor(rect, style) { this.rect = rect; this.style = style; this.children = []; this.isConnected = true; }
  getBoundingClientRect() {
    const { left, top, width, height } = this.rect;
    return { left, top, width, height, right: left + width, bottom: top + height };
  }
  contains(node) { return this === node || this.children.some(child => child.contains(node)); }
}

class HTMLElement extends Element {}

class HTMLCanvasElement extends HTMLElement {}

class SVGElement extends Element {}

function overlayFixture({ state = 'important', invalidAfterIsolation = false, moveAfterIsolation = false, geometryThrowsAfterIsolation = false, overlayThrowsAfterIsolation = false, screenshotError = null, svgOverlaps = true, canvasMatches = 1, detached = false, foreignCanvas = false, clock = { now: () => 1000 }, afterDecode = () => {}, stageSource = fs.readFileSync(filename, 'utf8') } = {}) {
  const events = [];
  const window = { innerWidth: 1440, innerHeight: 900, scrollY: 987.75, scrollX: 31.5 };
  const rect = { left: 12.25, top: 23.5, width: 400.5, height: 200.25 };
  const initial = property => [['outline', ['1px solid red', '']], ...(state === 'absent' ? [] : [[property, [property === 'visibility' ? 'visible' : 'rgb(12 34 56)', state === 'important' ? 'important' : '']]])];
  const stage = new HTMLElement(rect, new Style(initial('background-color'), (name, value) => {
    if (name !== 'background-color' || value !== 'rgb(0 0 0)') return;
    if (invalidAfterIsolation) rect.left = -0.001;
    if (moveAfterIsolation) { rect.left = 33.75; rect.top = 44.5; window.innerWidth = 800; window.innerHeight = 700; window.scrollY = 123.5; }
  }));
  const canvas = new HTMLCanvasElement(rect, new Style([['visibility', ['visible', '']]]));
  const geometryFailure = new Error('post-isolation geometry sentinel');
  const readRect = canvas.getBoundingClientRect.bind(canvas);
  canvas.getBoundingClientRect = () => {
    if (geometryThrowsAfterIsolation && stage.style.getPropertyValue('background-color') === 'rgb(0 0 0)') throw geometryFailure;
    return readRect();
  };
  stage.children = foreignCanvas ? [] : [canvas];
  canvas.isConnected = !detached;
  const overlayRect = { left: 50, top: 60, width: 40, height: 40 };
  const svg = new SVGElement(svgOverlaps ? overlayRect : { ...overlayRect, left: 1200 }, new Style(initial('visibility')));
  const overlayFailure = new Error('overlay mutation sentinel');
  svg.style.onSet = (name, value) => { if (overlayThrowsAfterIsolation && name === 'visibility' && value === 'hidden') throw overlayFailure; };
  const html = new HTMLElement(overlayRect, new Style(initial('visibility')));
  const outside = new SVGElement({ ...overlayRect, left: 1200 }, new Style(initial('visibility')));
  const orbit = new HTMLElement(rect, new Style([]));
  orbit.children = [stage, svg, html, outside];
  const nodes = [stage, canvas, svg, html, outside];
  const before = nodes.map(node => node.style.snapshot());
  const document = { querySelectorAll(selector) {
    assert.equal(selector, '[data-testid="money-loop-three-stage"] canvas');
    return Array.from({ length: canvasMatches }, () => canvas);
  }, querySelector(selector) {
    if (selector === '[data-testid="money-loop-three-stage"] canvas') return canvas;
    if (selector === '[data-testid="money-loop-three-stage"]') return stage;
    if (selector === '[data-testid="money-loop-payoff-orbit"]') return orbit;
    throw new Error('Unexpected query: ' + selector);
  } };
  const loaded = { exports: {} };
  const context = { document, window, Element, HTMLElement, HTMLCanvasElement, SVGElement,
    require: id => {
      if (id === 'playwright-core') return {};
      const actual = request(id);
      return id === './png-pixel-proof.cjs' ? { ...actual, decodePngRgba: bytes => { const decoded = actual.decodePngRgba(bytes); afterDecode(); return decoded; } } : actual;
    },
    __dirname: path.dirname(filename), module: loaded, process: { once() {} }, console, Date: { now: clock.now } };
  const boundary = stageSource.indexOf('\nmodule.exports =');
  assert.ok(boundary > 0);
  vm.runInNewContext(stageSource.slice(0, boundary) + '\nmodule.exports={captureIsolatedCanvasPng,captureSelectionCanvasState,exerciseSelection,createPhaseTiming};', context, { filename });
  const page = {
    getByTestId(id) {
      assert.equal(id, 'money-loop-three-stage');
      return { locator(selector) {
        assert.equal(selector, 'canvas');
        return { evaluate: async (fn, arg) => { events.push(String(fn).includes('window.__moneyLoopPixelCaptureOverlays =') ? 'isolate+geometry' : 'geometry'); return fn(canvas, arg); } };
      } };
    },
    evaluate: async (fn, arg) => { events.push(String(fn).includes('delete window.__moneyLoopPixelCaptureOverlays') ? 'restore' : String(fn).includes('window.__moneyLoopPixelCaptureOverlays =') ? 'isolate+geometry' : 'query'); return fn(arg); },
    screenshot: async options => {
      events.push('screenshot');
      assert.equal(stage.style.getPropertyValue('background-color'), 'rgb(0 0 0)');
      assert.equal(svg.style.getPropertyValue('visibility'), 'hidden');
      assert.equal(html.style.getPropertyValue('visibility'), 'hidden');
      assert.equal(outside.style.getPropertyValue('visibility'), state === 'absent' ? '' : 'visible');
      assert.equal(canvas.style.getPropertyValue('visibility'), 'visible');
      assert.equal(options.scale, 'css');
      if (screenshotError) throw screenshotError;
      return Buffer.from('Private CPU contract probe, not rendered pixel evidence');
    },
  };
  const restored = () => {
    assert.deepEqual(nodes.map(node => node.style.snapshot()), before);
    assert.equal(window.__moneyLoopPixelCaptureOverlays, undefined);
  };
  return { page, events, window, restored, geometryFailure, overlayFailure, context, helpers: loaded.exports, canvas, capture: () => loaded.exports.captureIsolatedCanvasPng(page, 'private-cpu', 1700) };
}

test('isolation and post-mutation geometry use one strict browser evaluation before capture',async()=>{
  const x=overlayFixture();await x.capture();x.restored();assert.deepEqual(x.events,['isolate+geometry','screenshot','restore']);
});

test('isolation queries the current canvas directly without resolving a locator handle',async()=>{
  const x=overlayFixture();x.page.getByTestId=()=>{throw new Error('isolation must not resolve a locator handle');};
  await x.capture();x.restored();assert.deepEqual(x.events,['isolate+geometry','screenshot','restore']);
});

test('actual isolation callback rejects missing,ambiguous,detached and foreign-stage canvases',async()=>{
  for(const options of [{canvasMatches:0},{canvasMatches:2},{detached:true},{foreignCanvas:true}]){
    const x=overlayFixture(options);await assert.rejects(x.capture(),/one connected canvas/);x.restored();
    assert.equal(x.events.includes('screenshot'),false);
  }
});

test('post-isolation geometry exceptions restore every changed inline style and preserve the error',async()=>{
  const x=overlayFixture({geometryThrowsAfterIsolation:true});await assert.rejects(x.capture(),error=>error===x.geometryFailure);x.restored();
  assert.deepEqual(x.events.filter(event=>event==='restore'),['restore']);assert.equal(x.events.includes('screenshot'),false);
});

test('overlay mutation exceptions restore even the property whose setter failed',async()=>{
  const x=overlayFixture({overlayThrowsAfterIsolation:true});await assert.rejects(x.capture(),error=>error===x.overlayFailure);x.restored();
  assert.deepEqual(x.events.filter(event=>event==='restore'),['restore']);assert.equal(x.events.includes('screenshot'),false);
});

test('real overlay callbacks restore absent,normal and important properties after success',async()=>{
  for(const state of ['absent','normal','important']){const x=overlayFixture({state});await x.capture();x.restored();assert.deepEqual(x.events,['isolate+geometry','screenshot','restore']);}
});
test('actual callbacks restore styles after post-isolation invalid geometry',async()=>{
  const x=overlayFixture({invalidAfterIsolation:true});await assert.rejects(x.capture(),/not fully visible/);x.restored();assert.deepEqual(x.events,['isolate+geometry','restore']);
});
test('actual callbacks restore styles and original cause after screenshot rejection',async()=>{
  const error=new Error('CPU compositor sentinel'),x=overlayFixture({screenshotError:error});await assert.rejects(x.capture(),failure=>failure.cause===error);x.restored();
});
test('actual callbacks restore on missing SVG and retain the measurable canvas visibility',async()=>{
  const x=overlayFixture({svgOverlaps:false});await assert.rejects(x.capture(),/overlapping SVG/);x.restored();assert.deepEqual(x.events,['isolate+geometry','restore']);
});
test('post-isolation snapshot coherently reads changed geometry,viewport and scroll',async()=>{
  const x=overlayFixture({moveAfterIsolation:true}),capture=await x.capture();x.restored();assert.deepEqual(structuredClone(capture.canvasClip),{box:{x:33.75,y:44.5,width:400.5,height:200.25},scrollY:123.5});
});
test('real-callback style assertions reject a deletion-only restoration mutant',async()=>{
  const ts=request('typescript'),source=fs.readFileSync(filename,'utf8'),tree=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const restore=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='restoreCanvasOverlaysAfterPixelCapture');assert.ok(restore?.body);
  const mutated=source.slice(0,restore.body.getStart(tree))+'{ await page.evaluate(() => { delete window.__moneyLoopPixelCaptureOverlays; }); }'+source.slice(restore.body.end);
  const x=overlayFixture({stageSource:mutated});await x.capture();assert.throws(x.restored,/Expected values to be strictly deep-equal/);
});

const pngTools = (() => {
  const file = path.join(__dirname, 'three-stage-helpers-tests.cjs'), source = fs.readFileSync(file, 'utf8');
  const boundary = source.indexOf('\nasync function run()'); assert.ok(boundary > 0);
  const loaded = { exports: {} };
  new Function('require', 'module', '__dirname', source.slice(0, boundary) + '\nmodule.exports={makePng,makeSpatialRaw};')(createRequire(file), loaded, __dirname);
  return loaded.exports;
})();
function pixelFixture(blockStart, alternate = false) {
  const raw = pngTools.makeSpatialRaw(24, 24, (x, y) => {
    const block = x >= blockStart && x < blockStart + 8 && y >= 8 && y < 16;
    return [...(alternate ? block ? [100, 200, 220] : [32, 32, 160] : block ? [224, 192, 64] : [32, 64, 96]), 255];
  });
  return pngTools.makePng({ width: 24, height: 24, raw });
}
const beforePng = pixelFixture(2), selectedPng = pixelFixture(14), unstablePng = pixelFixture(14, true);
const pixelProof = request('./png-pixel-proof.cjs');
const beforePixels = pixelProof.samplePngPixels(pixelProof.decodePngRgba(beforePng), 9);

function normalFixture({ elapsed = 500, captureCosts = [40, 40], restoreCosts = [10, 10], decodeCosts = [5, 5],
  scrollDelta = 0, candidate = selectedPng, confirmation = selectedPng, restoreError = null, ...options } = {}) {
  let now = 1000 + elapsed, captures = 0, restores = 0, decodes = 0;
  const shots = [], clock = { now: () => now }, advance = amount => { now += amount; };
  const x = overlayFixture({ ...options, clock, afterDecode: () => { x.events.push('decode'); advance(decodeCosts[decodes++] ?? 0); } });
  const clip = { box: { x: 12.25, y: 23.5, width: 400.5, height: 200.25 }, scrollY: x.window.scrollY - scrollDelta };
  const originalScreenshot = x.page.screenshot, originalEvaluate = x.page.evaluate;
  x.page.screenshot = async opts => {
    shots.push(opts); const index = captures++; advance(captureCosts[index] ?? 0);
    await originalScreenshot(opts); return index ? confirmation : candidate;
  };
  x.page.evaluate = async (fn, arg) => {
    const result = await originalEvaluate(fn, arg);
    if (String(fn).includes('delete window.__moneyLoopPixelCaptureOverlays')) {
      advance(restoreCosts[restores++] ?? 0); if (restoreError) throw restoreError;
    }
    return result;
  };
  const timing = x.helpers.createPhaseTiming(clock.now);
  return { ...x, clip, shots, advance, timing, get captures() { return captures; }, get decodes() { return decodes; },
    run: () => x.helpers.captureSelectionCanvasState(x.page, 'normal-cpu', 1000, beforePixels.identitySignature, beforePixels.stabilityDescriptor, clip, timing) };
}

test('normal caller fuses the unchanged-scroll decision into isolation with no extra browser query', async () => {
  const x = normalFixture(), result = await x.run(); x.restored();
  assert.deepEqual(x.events, ['isolate+geometry', 'screenshot', 'restore', 'decode', 'isolate+geometry', 'screenshot', 'restore', 'decode']);
  assert.strictEqual(x.shots[0].clip, x.clip.box); assert.strictEqual(x.shots[1].clip, x.clip.box);
  assert.equal(result.settledAtMs, 555); assert.equal(result.stableThroughMs, 610);
  assert.deepEqual(x.shots.map(s => [s.scale, s.timeout]), [['css', 200], ['css', 300]]);
});
test('normal caller fuses changed-scroll geometry and preserves its fractional pre-isolation crop', async () => {
  const x = normalFixture({ scrollDelta: 1, moveAfterIsolation: true }); await x.run(); x.restored();
  assert.equal(x.events.includes('query'), false); assert.equal(x.events.includes('geometry'), false);
  assert.deepEqual(structuredClone(x.shots[0].clip), x.clip.box); assert.notStrictEqual(x.shots[0].clip, x.clip.box);
  assert.strictEqual(x.shots[1].clip, x.shots[0].clip);
});
test('normal caller retains cached object precedence strictly below the one-pixel threshold', async () => {
  for (const scrollDelta of [0, .999, -.999]) {
    const x = normalFixture({ scrollDelta, moveAfterIsolation: true }); await x.run(); x.restored();
    assert.strictEqual(x.shots[0].clip, x.clip.box); assert.strictEqual(x.shots[1].clip, x.clip.box);
  }
});
test('normal caller refreshes the crop for either scroll direction at the exact one-pixel threshold', async () => {
  for (const scrollDelta of [1, -1, 1.001, -1.001]) {
    const x = normalFixture({ scrollDelta }); await x.run(); x.restored();
    assert.notStrictEqual(x.shots[0].clip, x.clip.box); assert.deepEqual(structuredClone(x.shots[0].clip), x.clip.box);
    assert.strictEqual(x.shots[1].clip, x.shots[0].clip);
  }
});
test('normal caller charges candidate restoration and real PNG decode to the original700ms limit', async () => {
  const exact = normalFixture({ captureCosts: [190, 40], restoreCosts: [5, 10], decodeCosts: [5, 5] });
  assert.equal((await exact.run()).settledAtMs, 700); exact.restored();
  for (const costs of [{ restoreCosts: [6, 10], decodeCosts: [5, 5] }, { restoreCosts: [5, 10], decodeCosts: [6, 5] }]) {
    const late = normalFixture({ captureCosts: [190, 40], ...costs });
    await assert.rejects(late.run(), /decoded material canvas candidate settled in 701ms/); late.restored();
    assert.equal(late.captures, 1); assert.equal(late.decodes, 1);
  }
});
test('normal caller charges confirmation restoration and real decode to actual candidate completion plus300ms', async () => {
  const exact = normalFixture({ captureCosts: [40, 285], restoreCosts: [10, 10], decodeCosts: [5, 5] });
  const result = await exact.run(); assert.equal(result.settledAtMs, 555); assert.equal(result.stableThroughMs, 855); exact.restored();
  for (const costs of [{ restoreCosts: [10, 11], decodeCosts: [5, 5] }, { restoreCosts: [10, 10], decodeCosts: [5, 6] }]) {
    const late = normalFixture({ captureCosts: [40, 285], ...costs });
    await assert.rejects(late.run(), /stability confirmation completed 301ms later/); late.restored(); assert.equal(late.captures, 2);
  }
});
test('normal caller retains screenshot failures as causes, restores once and never retries', async () => {
  const original = new Error('normal compositor sentinel'), x = normalFixture({ screenshotError: original });
  await assert.rejects(x.run(), error => error.cause === original); x.restored();
  assert.equal(x.captures, 1); assert.equal(x.decodes, 0); assert.equal(x.events.filter(e => e === 'restore').length, 1);
  assert.equal(x.timing.phases.find(p => p.name === 'candidate.capture').deadline, 1700);
});
test('normal caller retains restoration failures without performing decode or another capture', async () => {
  const original = new Error('normal restoration sentinel'), x = normalFixture({ restoreError: original });
  await assert.rejects(x.run(), error => error === original); x.restored();
  assert.equal(x.captures, 1); assert.equal(x.decodes, 0); assert.equal(x.timing.phases.find(p => p.name === 'candidate.restore').status, 'failed');
});
test('normal caller really decodes PNGs and rejects corrupt, unchanged and unstable candidates', async () => {
  for (const [options, pattern, captures] of [[{ candidate: Buffer.from('not PNG') }, /not a PNG/, 1],
    [{ candidate: beforePng }, /candidate did not materially change/, 1],
    [{ confirmation: beforePng }, /confirmation did not materially retain/, 2],
    [{ confirmation: unstablePng }, /was not stable through/, 2]]) {
    const x = normalFixture(options); await assert.rejects(x.run(), pattern); x.restored(); assert.equal(x.captures, captures);
  }
});
test('normal caller preserves canvas-isolation and SVG guards without screenshots after failure', async () => {
  for (const options of [{ svgOverlaps: false }, { canvasMatches: 0 }, { canvasMatches: 2 }, { detached: true }, { foreignCanvas: true }]) {
    const x = normalFixture(options); await assert.rejects(x.run(), /overlapping SVG|one connected canvas/); x.restored();
    assert.equal(x.captures, 0); assert.equal(x.events.filter(e => e === 'restore').length, 1);
  }
});
test('normal caller retains actual geometry and overlay exceptions and restores their partial mutations', async () => {
  for (const [options, field] of [[{ geometryThrowsAfterIsolation: true }, 'geometryFailure'], [{ overlayThrowsAfterIsolation: true }, 'overlayFailure']]) {
    const x = normalFixture(options);
    if (field === 'geometryFailure') x.canvas.getBoundingClientRect = () => { throw x.geometryFailure; };
    await assert.rejects(x.run(), error => error === x[field]); x.restored();
    assert.equal(x.captures, 0); assert.equal(x.events.filter(e => e === 'restore').length, 1);
  }
});
test('real exerciseSelection retains the original input timestamp through dispatch and settle work', async () => {
  for (const dispatchMs of [200, 221]) {
    const x = normalFixture({ elapsed: 0, captureCosts: [15, 40], restoreCosts: [10, 10], decodeCosts: [5, 5] }), lines = [];
    Object.assign(x.context, { restoreStageForPixelSampling: async () => {}, prepareStageAndTargetForClick: async () => {},
      captureCanvasElementPngProof: async () => ({ ...beforePixels, canvasClip: x.clip }), waitForArtifactSelection: async () => {},
      waitForStageSettled: async () => x.advance(450), console: { log: line => lines.push(line) } });
    const result = x.helpers.exerciseSelection(x.page, 'normal-cpu', 'full', 'income', 'deposit-reservoir', async () => x.advance(dispatchMs));
    if (dispatchMs === 200) assert.equal((await result).settledAtMs, 680);
    else await assert.rejects(result, /settled in 701ms/);
    x.restored(); assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0].slice(lines[0].indexOf('{')));
    assert.equal(record.selectionStartedAt, 1000); assert.equal(record.selectionDeadline, 1700); assert.equal(record.stabilityBudgetMs, 300);
  }
});
test('normal caller rejects invalid fresh crop metadata before screenshot and restores changed styles', async () => {
  for (const patch of [{ left: -.001 }, { top: -.001 }, { width: 0 }, { height: 0 }, { width: Infinity }, { left: NaN }]) {
    const x = normalFixture({ scrollDelta: 1 }); Object.assign(x.canvas.rect, patch);
    await assert.rejects(x.run(), /not fully visible|overlapping SVG/); x.restored(); assert.equal(x.captures, 0);
  }
  for (const key of ['innerWidth', 'innerHeight', 'scrollY']) {
    const x = normalFixture({ scrollDelta: 1 }); x.window[key] = NaN;
    await assert.rejects(x.run(), /not fully visible/); x.restored(); assert.equal(x.captures, 0);
  }
});
test('explicit supplied clip callers ignore the optional previous clip and retain exact object precedence', async () => {
  const x = normalFixture(), explicit = { box: { x: 1.25, y: 2.5, width: 4.75, height: 5.5 }, scrollY: -20 };
  await x.helpers.captureIsolatedCanvasPng(x.page, 'explicit-cpu', 1700, explicit, x.timing, 'candidate', x.clip); x.restored();
  assert.strictEqual(x.shots[0].clip, explicit.box); assert.equal(x.captures, 1); assert.equal(x.events.includes('query'), false);
});
