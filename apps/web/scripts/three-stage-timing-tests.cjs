/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fakeClock() {
  let time = 1000;
  return { now: () => time, advance: (ms) => { time += ms; } };
}

function loadHarness(clock) {
  const filename = path.join(__dirname, 'test-three-stage.cjs');
  const source = fs.readFileSync(filename, 'utf8');
  const testModule = { exports: {} };
  const context = {
    require: (id) => {
      if (id === 'playwright-core') return {};
      if (id === './three-stage-timing.cjs') return { createPhaseTiming: (now = clock.now) => require(id).createPhaseTiming(now) };
      return require(id);
    },
    __dirname, module: testModule, Date: { now: clock.now }, process: { once() {} }, console,
  };
  // Load the real capture function without the browser/server entry point or signal hooks.
  vm.runInNewContext(source.slice(0, source.lastIndexOf('\nrun().catch(')) + `
    module.exports = { captureCanvasElementPng, exerciseSelection,
      createPhaseTiming: typeof createPhaseTiming === 'function' ? createPhaseTiming : null };`, context, { filename });
  return { ...testModule.exports, context };
}

const clip = { box: { x: 0, y: 0, width: 10, height: 10 }, scrollY: 0 };

async function testInvocationBudget() {
  const clock = fakeClock();
  const { captureCanvasElementPng } = loadHarness(clock);
  const rootCause = new Error('compositor unavailable');
  const original = new Error('page.screenshot: Timeout 9ms exceeded.', { cause: rootCause });
  original.name = 'TimeoutError';
  let calls = 0;
  clock.advance(691);
  const page = { screenshot: async ({ timeout }) => {
    calls += 1;
    assert.equal(timeout, 9);
    clock.advance(100);
    throw original;
  } };
  await assert.rejects(captureCanvasElementPng(page, 'desktop', 1700, clip), (error) => {
    assert.match(error.message, /capture started with 9ms remaining: page.screenshot: Timeout 9ms exceeded/);
    assert.strictEqual(error.cause, original);
    assert.strictEqual(error.cause.cause, rootCause);
    return true;
  });
  assert.equal(calls, 1, 'a failed capture must not retry');
}

async function testAbsoluteDeadline() {
  for (const elapsed of [9, 10]) {
    const clock = fakeClock();
    const { captureCanvasElementPng } = loadHarness(clock);
    clock.advance(691);
    const screenshot = Buffer.from('fake PNG');
    const capture = captureCanvasElementPng({ screenshot: async ({ timeout }) => {
      assert.equal(timeout, 9);
      clock.advance(elapsed);
      return screenshot;
    } }, 'desktop', 1700, clip);
    if (elapsed === 10) await assert.rejects(capture, /completed after its deadline/);
    else {
      const result = await capture;
      assert.equal(result.completedAt, 1700);
      assert.strictEqual(result.screenshot, screenshot);
    }
  }
}

async function testPhaseTiming() {
  const clock = fakeClock();
  const { createPhaseTiming, captureCanvasElementPng } = loadHarness(clock);
  assert.equal(typeof createPhaseTiming, 'function', 'phase timing diagnostics must be available');
  const timing = createPhaseTiming(clock.now);
  await timing.measure('input.dispatch', async () => clock.advance(120));
  await timing.measure('stage.scroll', async () => clock.advance(80));
  await timing.measure('stage.wait', async () => clock.advance(480));
  await timing.measure('candidate.isolation', async () => clock.advance(11));
  const original = new Error('capture rejected');
  await assert.rejects(captureCanvasElementPng({ screenshot: async () => {
    clock.advance(100);
    throw original;
  } }, 'desktop', 1700, clip, timing, 'candidate'), (error) => error.cause === original);
  assert.deepEqual(timing.phases.map(({ name, startedAtMs, endedAtMs, status }) =>
    [name, startedAtMs, endedAtMs, status]), [
    ['input.dispatch', 0, 120, 'passed'], ['stage.scroll', 120, 200, 'passed'],
    ['stage.wait', 200, 680, 'passed'], ['candidate.isolation', 680, 691, 'passed'],
    ['candidate.capture', 691, 791, 'failed'],
  ]);
  assert.equal(timing.phases[4].timeoutMs, 9);
  assert.equal(timing.phases[4].deadline, 1700);
  assert.equal(timing.measureSync('candidate.decode', () => { clock.advance(4); return 42; }), 42);
  assert.equal(timing.phases[5].durationMs, 4);
  assert.throws(() => timing.measureSync('decode.failure', () => { clock.advance(2); throw original; }), (error) => error === original);
  assert.equal(timing.phases[6].status, 'failed');
  let release;
  const pending = timing.measure('stage.wait.pending', () => new Promise((resolve) => { release = resolve; }));
  assert.equal(timing.phases[7].status, 'running');
  assert.equal(timing.phases[7].endedAtMs, undefined);
  release();
  await pending;
}

async function testDispatchFailureReporting() {
  const clock = fakeClock();
  const { context, exerciseSelection } = loadHarness(clock);
  const lines = [];
  Object.assign(context, {
    restoreStageForPixelSampling: async () => {}, prepareStageAndTargetForClick: async () => {},
    captureCanvasElementPngProof: async () => ({}), console: { log: (line) => lines.push(line) },
  });
  const original = new Error('input dispatch failed');
  await assert.rejects(exerciseSelection({}, 'desktop', 'full', 'loc', 'credit-aperture', async () => {
    clock.advance(120);
    throw original;
  }), (error) => error === original);
  assert.equal(lines.length, 1, 'a failed dispatch must emit its timing report');
  const report = JSON.parse(lines[0].slice(lines[0].indexOf('{')));
  assert.deepEqual(report, {
    selectionStartedAt: 1000, selectionDeadline: 1700, stabilityBudgetMs: 300,
    phases: [{ name: 'input.dispatch', startedAtMs: 0, status: 'failed', endedAtMs: 120, durationMs: 120 }],
  });
}

async function runTimingTests() {
  let failures = 0;
  for (const test of [testInvocationBudget, testAbsoluteDeadline, testPhaseTiming, testDispatchFailureReporting]) {
    try {
      await test();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${test.name}: ${error.stack || error.message}`);
    }
  }
  assert.equal(failures, 0, 'timing diagnostic tests failed');
}

module.exports = { runTimingTests };
if (require.main === module) runTimingTests().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
