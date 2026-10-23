/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const helperFile = process.env.SHARED_CANVAS_DIAGNOSTICS_FILE || path.join(__dirname, 'shared-dashboard-canvas-diagnostics.cjs');
const { captureSharedDashboardCanvas } = require(helperFile);
const workflowFile = process.env.SHARED_CANVAS_WORKFLOW_FILE || path.join(__dirname, 'smoke-shared-portfolio-dashboard.cjs');
const source = ts.createSourceFile(workflowFile, fs.readFileSync(workflowFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nodes = []; function walk(node) { nodes.push(node); ts.forEachChild(node, walk); } walk(source);
const calls = nodes.filter(node => ts.isCallExpression(node) && node.expression.getText(source) === 'captureSharedDashboardCanvas');
const plain = value => JSON.parse(JSON.stringify(value));
const box = (top = 100) => ({ x: 20, y: top, top, left: 20, right: 370, bottom: top + 270, width: 350, height: 270 });
const element = (attrs = {}, rect = box()) => ({ getAttribute: key => attrs[key] ?? null, getBoundingClientRect: () => rect });
function boundary({ hidden = false, top = 100, stage = false, unavailable = false, resources = [], scripts = [] } = {}) {
  const hero = element({ 'data-hero': 'car' }, box(top));
  const canvas = Object.assign(element({}, box(top)), { width: 700, height: 540 });
  const stageNode = element({ 'data-ready': 'true' }, box(top));
  hero.querySelector = selector => selector === '[aria-label="Inspect 3D model"]' ? element({ 'aria-pressed': 'true' })
    : selector === '[aria-label="Replay full turn"]' ? element() : null;
  hero.querySelectorAll = selector => selector === '[role="status"]' && unavailable ? [{ textContent: '3D unavailable. Studio artwork shown.' }] : [];
  stageNode.querySelectorAll = selector => selector === 'canvas' ? [canvas] : [];
  const document = { hidden, visibilityState: hidden ? 'hidden' : 'visible', readyState: 'complete',
    querySelector: selector => selector === '[data-testid="asset-hero"]' ? hero
      : selector === '[data-testid="asset-hero-canvas"]' && stage ? stageNode : null,
    querySelectorAll: selector => selector === 'script[src]' ? scripts.map(src => ({ src })) : [],
    createElement: () => { throw Error('canvas allocation forbidden'); } };
  const globals = { document, location: { origin: 'http://127.0.0.1:54321' }, innerWidth: 375, innerHeight: 900,
    performance: { getEntriesByType: type => { assert.equal(type, 'resource'); return resources; } }, URL };
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globals, key, { get() { throw Error('storage read forbidden'); } });
  let evaluations = 0;
  const page = new Proxy({ evaluate: async callback => { evaluations++; return plain(vm.runInNewContext(`(${callback.toString()})()`, globals)); } },
    { get(target, key) { assert.equal(key, 'evaluate', `unexpected browser action ${String(key)}`); return target[key]; } });
  return { page, evaluations: () => evaluations };
}
test('absent canvas captures hidden document and observed controls, not private observer state', async () => {
  const b = boundary({ hidden: true }); const result = await captureSharedDashboardCanvas(b.page);
  assert.equal(result.captured, true); assert.equal(result.document.hidden, true); assert.equal(result.document.visibilityState, 'hidden');
  assert.equal(result.document.readyState, 'complete'); assert.deepEqual(result.viewport, { width: 375, height: 900 });
  assert.equal(result.hero.id, 'car'); assert.equal(result.hero.inspectPressed, true); assert.equal(result.hero.replayPresent, true);
  assert.equal(result.stage, null); assert.equal(result.hero.intersectsViewport, true);
  assert.equal(Object.hasOwn(result.hero, 'onScreen'), false);
});
test('loaded stage includes readiness and native canvas dimensions without GPU allocation', async () => {
  const result = await captureSharedDashboardCanvas(boundary({ stage: true }).page);
  assert.ok(result.stage, 'snapshot includes the loaded stage');
  assert.equal(result.stage.ready, 'true'); assert.equal(result.stage.canvases.length, 1);
  assert.equal(result.stage.canvases[0].width, 700); assert.equal(result.stage.canvases[0].height, 540);
  assert.deepEqual(result.stage.rect, box()); assert.deepEqual(result.stage.canvases[0].rect, box());
});
test('offscreen geometry is an observation, including the asset bounding rectangle', async () => {
  const result = await captureSharedDashboardCanvas(boundary({ top: -400 }).page);
  assert.ok(result.hero, 'snapshot includes the observed hero');
  assert.equal(result.hero.intersectsViewport, false); assert.equal(result.hero.rect.bottom, -130);
  assert.equal(result.hero.rect.top, -400);
});
test('unavailable fallback is reported separately from missing stage', async () => {
  const result = await captureSharedDashboardCanvas(boundary({ unavailable: true }).page);
  assert.ok(result.hero, 'snapshot includes the fallback state');
  assert.equal(result.hero.unavailable, true); assert.equal(result.stage, null);
});
test('bounded static resources retain failed status and strip queries, fragments and unrelated URLs', async () => {
  const origin = 'http://127.0.0.1:54321';
  const resources = Array.from({ length: 70 }, (_, i) => ({ name: `${origin}/_next/static/chunk-${i}.js?secret=value#private`,
    initiatorType: 'script', startTime: i, duration: 20, responseStatus: i === 0 ? 404 : 200, transferSize: 100 }));
  resources.push({ name: `${origin}/portfolio?private-financial-value=9000` }, { name: 'https://other.invalid/_next/static/external.js' });
  const result = await captureSharedDashboardCanvas(boundary({ resources, scripts: [resources[0].name, 'https://other.invalid/x.js', '/invalid'] }).page);
  assert.ok(result.staticResources, 'snapshot includes bounded static resource records');
  assert.equal(result.staticResources.total, 70); assert.equal(result.staticResources.limit, 64);
  assert.equal(result.staticResources.truncated, true); assert.equal(result.staticResources.entries.length, 64);
  assert.equal(result.staticResources.entries[0].responseStatus, 404);
  assert.equal(result.staticResources.entries[0].path, '/_next/static/chunk-0.js');
  assert.equal(result.staticScripts.total, 1); assert.equal(result.staticScripts.entries[0], '/_next/static/chunk-0.js');
  assert.doesNotMatch(JSON.stringify(result), /secret|private|other\.invalid|financial-value/);
});
test('evaluation failure returns explicit generic capture error, without disclosing the page error', async () => {
  const error = new Error('Target closed: https://private.invalid/?token=secret');
  const result = await captureSharedDashboardCanvas({ evaluate: async () => { throw error; } });
  assert.deepEqual(result, { captured: false, captureError: 'Browser state snapshot unavailable.' });
});
test('one read-only evaluate boundary does not access storage or other browser actions', async () => {
  const b = boundary(); const result = await captureSharedDashboardCanvas(b.page);
  assert.equal(result.captured, true); assert.equal(b.evaluations(), 1);
});
test('snapshot is catch-only and receipt preserves the original primary exception even if capture fails', async () => {
  assert.equal(calls.length, 1, 'exactly one failure snapshot call');
  const call = calls[0]; let enclosing = call.parent; while (enclosing && !ts.isCatchClause(enclosing)) enclosing = enclosing.parent;
  assert.ok(enclosing, 'snapshot must be inside a catch');
  assert.equal(enclosing.variableDeclaration.name.getText(source), 'error');
  assert.equal(nodes.filter(node => ts.isCallExpression(node) && node.expression.getText(source) === 'require'
    && node.arguments[0]?.text === './shared-dashboard-canvas-diagnostics.cjs').length, 1);
  const receipts = [], primary = new Error('original canvas timeout'); let screenshots = 0;
  const page = { evaluate: async () => { throw Error('closed page'); }, screenshot: async () => { screenshots++; } };
  const body = enclosing.block.statements.map(node => node.getText(source)).join('\n');
  await vm.runInNewContext(`(async () => { ${body} })()`, { error: primary, page, receipts, errors: ['raw error'], name: 'shared-edits', width: 1440,
    captureSharedDashboardCanvas, output: '.', path, console: { error() {} } });
  assert.equal(receipts.length, 1); assert.equal(receipts[0].passed, false); assert.equal(receipts[0].message, primary.message);
  assert.deepEqual(plain(receipts[0].errors), ['raw error']); assert.equal(screenshots, 1);
  assert.deepEqual(plain(receipts[0].canvasDiagnostics), { captured: false, captureError: 'Browser state snapshot unavailable.' });
});
function deadlineBoundary() {
  let sequence = 0; const timers = new Map(), cleared = [];
  const moduleRecord = { exports: {} };
  vm.runInNewContext(fs.readFileSync(helperFile, 'utf8'), { module: moduleRecord,
    setTimeout: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => { cleared.push(id); timers.delete(id); } });
  return { capture: moduleRecord.exports.captureSharedDashboardCanvas, timers, cleared };
}
test('pending evaluation has a bounded failure-only deadline and late rejection cannot replace the primary failure', async () => {
  const b = deadlineBoundary(); let rejectEvaluation;
  const evaluation = new Promise((resolve, reject) => { rejectEvaluation = reject; });
  const pending = b.capture({ evaluate: () => evaluation });
  const timers = [...b.timers.values()];
  assert.equal(timers.length, 1, 'a pending browser snapshot must have one Node-side watchdog');
  assert.equal(timers[0].delay, 2000); timers[0].callback();
  const result = await pending;
  assert.deepEqual(plain(result), { captured: false, captureError: 'Browser state snapshot exceeded its 2000ms deadline.' });
  assert.equal(b.timers.size, 0); assert.equal(b.cleared.length, 1);
  rejectEvaluation(new Error('late browser rejection')); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(plain(result), { captured: false, captureError: 'Browser state snapshot exceeded its 2000ms deadline.' });
});
test('success and immediate browser rejection clear their failure-only watchdogs', async () => {
  for (const fail of [false, true]) {
    const b = deadlineBoundary();
    const result = await b.capture({ evaluate: () => fail ? Promise.reject(new Error('closed')) : Promise.resolve({ captured: true }) });
    assert.equal(result.captured, !fail); assert.equal(b.timers.size, 0);
    assert.equal(b.cleared.length, 1, 'settled snapshot must clear its Node timer');
  }
});
