/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function exercise(script, helper, options = {}) {
  const files = new Map(), errors = [], calls = { stop: 0, close: 0, context: 0, captures: 0, remove: 0, normal: [], external: 0, staticWait: 0 };
  const primary = new Error(options.externalFailure ? 'external selection runner failed' : options.large ? 'x'.repeat(100000) : 'candidate settled in 704ms, beyond 700ms');
  primary.environment = { secret: 'DO_NOT_EXPORT' };
  let finish, clock = 0; const done = new Promise(resolve => { finish = resolve; });
  const io = { existsSync: () => true, rmSync: () => { calls.remove++; }, mkdirSync: () => {}, writeFileSync(file, value) {
    if (options.persistenceFails || (options.imageWriteFails && file.endsWith('.png'))) throw Error('persistence denied');
    assert.equal(files.has(file), false); files.set(file, Buffer.from(value));
  } };
  const page = { on() {}, off() {}, goto: async () => ({ status: () => 200 }), getByText: () => ({ click: async () => {} }) };
  page.getByTestId = () => ({ waitFor: async () => {}, scrollIntoViewIfNeeded: async () => {}, locator: () => ({ count: async () => 0 }), click: async () => {}, getAttribute: async () => 'true' });
  page.waitForFunction = async () => { calls.staticWait++; };
  page.screenshot = async () => { calls.captures++; return Buffer.from('SYNTHETIC_SHARED_HELPER'); };
  const context = { addInitScript: async () => {}, newPage: async () => page, close: async () => { calls.context++; if (options.cleanupFails) throw Error('context cleanup'); } };
  const browser = { newContext: async () => context, close: async () => { calls.close++; if (options.cleanupFails) throw Error('browser cleanup'); } };
  const timing = () => { const phases = []; return { phases, async measure(name, fn) { const row = { name, startedAtMs: 0, status: 'running' }; phases.push(row); try { const value = await fn(); row.status = 'passed'; return value; } finally { row.endedAtMs = 1; row.durationMs = 1; } } }; };
  const fixtureModule = { exports: {} }, imports = { 'node:fs': io, 'node:path': path, 'playwright-core': { chromium: { launch: async () => browser } },
    './browser-harness.cjs': { findBrowserExecutable: () => '/mock/chrome', getHeadlessChromiumArgs: () => [] },
    './built-server-harness.cjs': { createGracefulShutdown: () => () => {}, startBuiltServer: async () => ({ server: {}, origin: 'http://mock' }), stopServer: async () => { calls.stop++; if (options.cleanupFails) throw Error('server cleanup'); } },
    './three-stage-timing.cjs': { createPhaseTiming: timing }, './png-pixel-proof.cjs': {} };
  imports['./smoke-three-selection.cjs'] = { runSelectionSmoke: async args => {
    calls.external++; assert.equal(args.browser, browser); assert.equal(args.origin, 'http://mock'); assert.equal(path.basename(args.output), 'selection');
    const capture = await fixtureModule.exports.captureIsolatedCanvasPng(page, 'selection-workflow', 1000, { box: { x: 0, y: 0, width: 1, height: 1 } }, timing());
    assert.ok(capture.screenshot.equals(Buffer.from('SYNTHETIC_SHARED_HELPER'))); throw primary;
  } };
  const req = name => { assert.ok(Object.hasOwn(imports, name), name); return imports[name]; }; req.main = fixtureModule;
  if (helper) { const m = { exports: {} }; new vm.Script(helper).runInNewContext({ require: req, module: m, exports: m.exports, Buffer }); imports['./three-stage-failure-evidence.cjs'] = m.exports; }
  const setup = `
    restoreStageForPixelSampling = prepareStageAndTargetForClick = waitForNormalStage = waitForStageSettled = waitForArtifactSelection = assertCanvasDpr = assertCanvasProofRejectsHiddenWebgl = assertDomTokenSelectionMotion = async () => {};
    assertGenuineWebgl2 = async () => ({renderer:'mock'});
    captureCanvasElementPngProof = async () => ({identitySignature:'before', stabilityDescriptor:[], canvasClip:{box:{x:0,y:0,width:1,height:1}}});
    captureSelectionCanvasState = async (p,label,start,a,b,clip,t) => { if (sample) await captureCanvasElementPng({screenshot:async()=>{calls.captures++;lateCapture();return sample;}},label,1000,clip,t,'candidate'); throw primary; };
    waitForArtifact = async (p,id,geometry,label,mode) => { if (id==='expenses') await exerciseSelection(p,label,mode,id,geometry,async()=>{}); };
    if (externalFailure) {
      verifyNormalViewport = async (b,o,label) => { calls.normal.push(label); };
      writeVerifiedScreenshot = async () => {};
      hideCanvasOverlaysForPixelCapture = async () => ({isolatedSvgOverlayCount:1});
      restoreCanvasOverlaysAfterPixelCapture = async () => {};
    }
  `;
  const source = script.replace("if (require.main === module) {", setup + '\nif (require.main === module) {');
  new vm.Script(source).runInNewContext({ require: req, module: fixtureModule, exports: fixtureModule.exports, __dirname: '/mock/apps/web/scripts', Buffer,
    Date: { now: () => clock }, lateCapture: () => { if (options.lateCapture) clock = 1001; }, primary, calls, sample: options.sample, externalFailure: options.externalFailure, console: { log() {}, error: value => errors.push(value) },
    process: { once() {}, set exitCode(code) { assert.equal(code, 1); finish(); } } });
  await done;
  return { files, errors, calls, primary, report: () => { const row = [...files].find(([file]) => path.basename(file) === 'failure.json'); assert.ok(row, 'early failure must retain structured failure.json'); return JSON.parse(row[1]); } };
}

module.exports = async function runTests({ script, helper, packageJson }) {
  const rows = [];
  async function test(name, fn) { try { await fn(); rows.push({ name, status: 'PASS' }); } catch (error) { rows.push({ name, status: 'FAIL', error: { name: error.name, code: error.code, message: error.message } }); } }
  await test('early selection error retains bounded error and unchanged timing without invented PNG', async () => { const r = await exercise(script, helper), j = r.report(); assert.equal(j.error.message, r.primary.message); assert.equal(j.selection.artifactId, 'expenses'); assert.equal(j.selection.selectionStartedAt, 0); assert.equal(j.selection.selectionDeadline, 700); assert.equal(j.selection.stabilityBudgetMs, 300); assert.ok(j.selection.phases.some(p => p.name === 'input.dispatch')); assert.equal([...r.files.keys()].filter(f => f.endsWith('.png')).length, 0); assert.equal(r.calls.captures, 0); });
  await test('context browser and server cleanup errors cannot replace primary', async () => { const r = await exercise(script, helper, { cleanupFails: true }); assert.equal(r.errors.at(-1), r.primary.stack); const j = r.report(); assert.equal(j.error.message, r.primary.message); assert.equal(j.cleanupErrors.length, 3); assert.equal(r.calls.stop, 1); });
  await test('persistence denial cannot replace primary or retry capture', async () => { const r = await exercise(script, helper, { persistenceFails: true }); assert.equal(r.errors.at(-1), r.primary.stack); assert.equal(r.calls.captures, 0); assert.equal(r.calls.stop, 1); });
  await test('only an already returned screenshot Buffer is retained byte-exact', async () => { const sample = Buffer.from('SYNTHETIC_BUFFER_NOT_A_PIXEL_PROOF'), r = await exercise(script, helper, { sample }); r.report(); const images = [...r.files].filter(([f]) => f.endsWith('.png')); assert.equal(images.length, 1); assert.equal(path.basename(images[0][0]), 'failure-candidate.png'); assert.ok(images[0][1].equals(sample)); assert.equal(r.calls.captures, 1); });
  await test('oversized existing buffer is omitted without weakening original failure', async () => { const r = await exercise(script, helper, { sample: Buffer.alloc(8388609) }); r.report(); assert.equal([...r.files.keys()].filter(f => f.endsWith('.png')).length, 0); assert.equal(r.errors.at(-1), r.primary.stack); });
  await test('JSON bounds and allowlist do not export arbitrary error environment', async () => { const r = await exercise(script, helper, { large: true }), j = r.report(); const raw = [...r.files].find(([f]) => path.basename(f) === 'failure.json')[1]; assert.ok(raw.length <= 65536); assert.ok(j.error.message.length <= 512); assert.equal(raw.includes(Buffer.from('DO_NOT_EXPORT')), false); assert.equal(r.calls.remove, 1); });
  await test('combined persistence and cleanup failure still exposes primary', async () => { const r = await exercise(script, helper, { persistenceFails: true, cleanupFails: true }); assert.equal(r.errors.at(-1), r.primary.stack); assert.equal(r.calls.stop, 1); });
  await test('raw-image write failure still retains JSON without replacing primary', async () => { const r = await exercise(script, helper, { sample: Buffer.from('SYNTHETIC'), imageWriteFails: true }), j = r.report(); assert.equal(j.images.candidate.retained, false); assert.equal(j.images.candidate.error.message, 'persistence denied'); assert.equal(r.errors.at(-1), r.primary.stack); });
  await test('late returned buffer survives the unchanged capture deadline rejection', async () => { const sample = Buffer.from('SYNTHETIC_LATE'), r = await exercise(script, helper, { sample, lateCapture: true }); assert.match(r.report().error.message, /completed after its deadline/); const image = [...r.files].find(([f]) => f.endsWith('failure-candidate.png')); assert.ok(image, 'late returned buffer must be retained'); assert.ok(image[1].equals(sample)); assert.equal(r.calls.captures, 1); });
  await test('external selection failure uses its own phase after actual reduced-motion handoff', async () => { const r = await exercise(script, helper, { externalFailure: true }), j = r.report(); assert.equal(j.error.message, r.primary.message); assert.equal(r.errors.at(-1), r.primary.stack); assert.deepEqual(r.calls.normal, ['desktop', 'mobile']); assert.equal(r.calls.staticWait, 1); assert.equal(r.calls.context, 1); assert.equal(r.calls.external, 1); assert.equal(r.calls.captures, 1); assert.equal(j.selection.viewportLabel, 'selection-workflows'); assert.equal(j.selection.artifactId, ''); assert.equal(j.selection.selectionStartedAt, null); assert.equal(j.selection.selectionDeadline, null); assert.equal(j.selection.phases.length, 0); assert.equal(Object.keys(j.images).length, 0); });
  await test('standing npm test invokes suite once immediately after three-stage helpers', () => { const commands = packageJson.scripts.test.split(' && '), command = 'node scripts/three-stage-failure-evidence-tests.cjs'; assert.equal(commands.filter(c => c === command).length, 1); assert.equal(commands[commands.indexOf('node scripts/three-stage-helpers-tests.cjs') + 1], command); assert.equal(commands[commands.indexOf(command) + 1], 'node scripts/engine-regression-tests.cjs'); });
  return { passed: rows.filter(r => r.status === 'PASS').length, failed: rows.filter(r => r.status === 'FAIL').length, rows, syntheticFilesystemOnly: true, actualBrowser: false, actualCapture: false };
};
if (require.main === module) module.exports({ script: fs.readFileSync(path.join(__dirname, 'test-three-stage.cjs'), 'utf8'), helper: fs.readFileSync(path.join(__dirname, 'three-stage-failure-evidence.cjs'), 'utf8'), packageJson: JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) }).then(result => { console.log(JSON.stringify(result)); if (result.failed) process.exitCode = 1; });
