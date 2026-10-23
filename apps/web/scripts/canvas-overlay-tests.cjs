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

function overlayFixture({ state = 'important', invalidAfterIsolation = false, moveAfterIsolation = false, geometryThrowsAfterIsolation = false, overlayThrowsAfterIsolation = false, screenshotError = null, svgOverlaps = true, canvasMatches = 1, detached = false, foreignCanvas = false, stageSource = fs.readFileSync(filename, 'utf8') } = {}) {
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
    require: id => id === 'playwright-core' ? {} : request(id),
    __dirname: path.dirname(filename), module: loaded, process: { once() {} }, console, Date: { now: () => 1000 } };
  const boundary = stageSource.indexOf('\nmodule.exports =');
  assert.ok(boundary > 0);
  vm.runInNewContext(stageSource.slice(0, boundary) + '\nmodule.exports={captureIsolatedCanvasPng};', context, { filename });
  const page = {
    getByTestId(id) {
      assert.equal(id, 'money-loop-three-stage');
      return { locator(selector) {
        assert.equal(selector, 'canvas');
        return { evaluate: async (fn, arg) => { events.push(String(fn).includes('window.__moneyLoopPixelCaptureOverlays =') ? 'isolate+geometry' : 'geometry'); return fn(canvas, arg); } };
      } };
    },
    evaluate: async (fn, arg) => { events.push(String(fn).includes('delete window.__moneyLoopPixelCaptureOverlays') ? 'restore' : 'isolate+geometry'); return fn(arg); },
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
  return { page, events, window, restored, geometryFailure, overlayFailure, capture: () => loaded.exports.captureIsolatedCanvasPng(page, 'private-cpu', 1700) };
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
