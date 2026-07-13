/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const zlib = require('node:zlib');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');

const appRoot = path.resolve(__dirname, '..');
const evidenceDirectory = path.join(appRoot, 'test-results', 'three-stage');
const host = '127.0.0.1';
const normalViewports = [
  { viewportLabel: 'desktop', viewport: { width: 1440, height: 900 }, expectedRenderMode: 'full' },
  { viewportLabel: 'mobile', viewport: { width: 390, height: 844 }, expectedRenderMode: 'efficient' },
];
const artifacts = [
  ['income', 'deposit-reservoir'],
  ['loc', 'credit-aperture'],
  ['expenses', 'outflow-gate'],
  ['cash-flow', 'flow-core'],
  ['principal', 'principal-shield'],
];
let activeServer;
let activeBrowser;

function allocatePort() {
  return new Promise((resolve, reject) => {
    const reservation = net.createServer();
    reservation.unref();
    reservation.once('error', reject);
    reservation.listen(0, host, () => {
      const address = reservation.address();
      const port = typeof address === 'object' && address ? address.port : null;
      reservation.close((error) => (error || !port ? reject(error ?? new Error('No ephemeral port assigned.')) : resolve(port)));
    });
  });
}

function requestRoot(origin) {
  return new Promise((resolve, reject) => {
    const request = http.get(origin, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ body, statusCode: response.statusCode }));
    });
    request.on('error', reject);
    request.setTimeout(3000, () => request.destroy(new Error('Three-stage verification request timed out.')));
  });
}

async function waitForServer(server, origin) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (server.exitCode !== null) throw new Error('Three-stage verification server exited before it was ready.');
    try {
      const response = await requestRoot(origin);
      if (response.statusCode === 200 && response.body.includes('InterestShield - Financial Empowerment')) return;
    } catch {
      // Retry while the production server starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Three-stage verification server did not start at ${origin}.`);
}

function stopServerImmediately(server, signal = 'SIGTERM') {
  if (!server || server.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
    return;
  }
  try {
    process.kill(-server.pid, signal);
  } catch {
    server.kill(signal);
  }
}

async function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  stopServerImmediately(server);
  await new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      stopServerImmediately(server, 'SIGKILL');
      done();
    }, 4000);
    server.once('exit', done);
  });
}

function handleSignal(signal) {
  activeBrowser?.close().catch(() => undefined);
  stopServerImmediately(activeServer);
  setTimeout(() => process.exit(signal === 'SIGINT' ? 130 : 143), 100).unref();
}

process.once('SIGINT', () => handleSignal('SIGINT'));
process.once('SIGTERM', () => handleSignal('SIGTERM'));

async function waitForNormalStage(page, viewportLabel, expectedRenderMode) {
  const stage = page.getByTestId('money-loop-three-stage');
  await stage.waitFor({ state: 'visible', timeout: 15000 });
  await stage.scrollIntoViewIfNeeded();
  await page.waitForFunction((expectedMode) => {
    const stageNode = document.querySelector('[data-testid="money-loop-three-stage"]');
    const mode = stageNode?.getAttribute('data-render-mode');
    const canvas = stageNode?.querySelector('canvas');
    return mode === expectedMode &&
      stageNode?.getAttribute('data-should-render') === 'true' &&
      canvas instanceof HTMLCanvasElement &&
      getComputedStyle(canvas).opacity === '1';
  }, expectedRenderMode, { timeout: 15000 });

  const mode = await stage.getAttribute('data-render-mode');
  if (mode !== expectedRenderMode) {
    throw new Error(`${viewportLabel} expected ${expectedRenderMode} render mode but received ${mode ?? 'no'}.`);
  }
  return stage;
}

async function assertGenuineWebgl2(page, viewportLabel) {
  const webgl2 = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="money-loop-three-stage"] canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const context = canvas.getContext('webgl2');
    if (!context) return null;
    return {
      renderer: context.getParameter(context.RENDERER),
      vendor: context.getParameter(context.VENDOR),
      version: context.getParameter(context.VERSION),
    };
  });
  if (!webgl2) throw new Error(`${viewportLabel} did not expose a genuine WebGL2 context.`);
  return webgl2;
}

function decodePngRgba(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) throw new Error('Canvas screenshot was not a PNG.');
  let offset = 8;
  let header;
  const compressed = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === 'IHDR') header = data;
    if (type === 'IDAT') compressed.push(data);
    if (type === 'IEND') break;
  }
  if (!header || header[8] !== 8 || header[12] !== 0 || ![2, 6].includes(header[9])) {
    throw new Error('Canvas screenshot used an unsupported PNG encoding.');
  }
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const bytesPerPixel = header[9] === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const source = zlib.inflateSync(Buffer.concat(compressed));
  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = source[sourceOffset++];
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const previous = y === 0 ? null : pixels.subarray((y - 1) * stride, y * stride);
    for (let x = 0; x < stride; x += 1) {
      const raw = source[sourceOffset++];
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previous ? previous[x] : 0;
      const upLeft = previous && x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      if (filter === 0) row[x] = raw;
      else if (filter === 1) row[x] = (raw + left) & 0xff;
      else if (filter === 2) row[x] = (raw + up) & 0xff;
      else if (filter === 3) row[x] = (raw + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const leftDistance = Math.abs(estimate - left);
        const upDistance = Math.abs(estimate - up);
        const upLeftDistance = Math.abs(estimate - upLeft);
        row[x] = (raw + (leftDistance <= upDistance && leftDistance <= upLeftDistance ? left : upDistance <= upLeftDistance ? up : upLeft)) & 0xff;
      } else throw new Error(`Canvas screenshot used unsupported PNG filter ${filter}.`);
    }
  }
  return { bytesPerPixel, height, pixels, width };
}

async function captureCanvasPixels(page, viewportLabel, expectedRenderMode, artifactId) {
  const startedAt = Date.now();
  let latest;
  while (Date.now() - startedAt < 5000) {
    await waitForNormalStage(page, viewportLabel, expectedRenderMode);
    const canvas = page.locator('[data-testid="money-loop-three-stage"] canvas');
    let screenshot;
    try {
      screenshot = await canvas.screenshot({ timeout: 1000 });
    } catch (error) {
      if (Date.now() - startedAt >= 5000) throw error;
      await page.waitForTimeout(100);
      continue;
    }
    const image = decodePngRgba(screenshot);
    const colors = new Set();
    const fingerprintParts = [];
    let opaquePixels = 0;
    for (let y = 1; y <= 9; y += 1) {
      for (let x = 1; x <= 9; x += 1) {
        const sampleX = Math.min(image.width - 1, Math.max(0, Math.round(image.width * x / 10)));
        const sampleY = Math.min(image.height - 1, Math.max(0, Math.round(image.height * y / 10)));
        const offset = (sampleY * image.width + sampleX) * image.bytesPerPixel;
        const alpha = image.bytesPerPixel === 4 ? image.pixels[offset + 3] : 255;
        if (alpha === 0) continue;
        opaquePixels += 1;
        colors.add(`${image.pixels[offset]},${image.pixels[offset + 1]},${image.pixels[offset + 2]},${alpha}`);
        fingerprintParts.push(`${image.pixels[offset] >> 6}${image.pixels[offset + 1] >> 6}${image.pixels[offset + 2] >> 6}${alpha >> 6}`);
      }
    }
    latest = {
      canvasHeight: image.height,
      canvasWidth: image.width,
      colorCount: colors.size,
      fingerprint: fingerprintParts.join(''),
      opaquePixels,
    };
    if (latest?.opaquePixels > 0 && latest.colorCount > 1) return latest;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!latest || latest.opaquePixels === 0) {
    throw new Error(`${viewportLabel} ${artifactId} canvas pixel sample was transparent or blank.`);
  }
  throw new Error(`${viewportLabel} ${artifactId} canvas pixel sample was single-color (${latest.colorCount} sampled color).`);
}

async function captureStableCanvasPixels(page, viewportLabel, expectedRenderMode, artifactId) {
  const startedAt = Date.now();
  let previous;
  while (Date.now() - startedAt < 4000) {
    const pixels = await captureCanvasPixels(page, viewportLabel, expectedRenderMode, artifactId);
    if (previous?.fingerprint === pixels.fingerprint) return pixels;
    previous = pixels;
    await page.waitForTimeout(150);
  }
  throw new Error(`${viewportLabel} ${artifactId} canvas did not settle to a stable post-selection fingerprint.`);
}

async function assertStageContainment(page, viewportLabel) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const stage = document.querySelector('[data-testid="money-loop-three-stage"]');
    const orbit = document.querySelector('[data-testid="money-loop-payoff-orbit"]');
    const canvas = stage?.querySelector('canvas');
    if (!(stage instanceof HTMLElement) || !(orbit instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) return null;
    const stageRect = stage.getBoundingClientRect();
    const orbitRect = orbit.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return {
      canvasRect: { bottom: canvasRect.bottom, left: canvasRect.left, right: canvasRect.right, top: canvasRect.top },
      clientWidth: root.clientWidth,
      orbitRect: { bottom: orbitRect.bottom, left: orbitRect.left, right: orbitRect.right, top: orbitRect.top },
      scrollWidth: root.scrollWidth,
      stageRect: { bottom: stageRect.bottom, left: stageRect.left, right: stageRect.right, top: stageRect.top },
    };
  });
  if (!result) throw new Error(`${viewportLabel} could not measure the Money Loop stage and canvas.`);
  if (result.scrollWidth > result.clientWidth + 1) {
    throw new Error(`${viewportLabel} document overflows ${result.scrollWidth}px beyond ${result.clientWidth}px.`);
  }
  for (const [name, rect] of Object.entries({ stage: result.stageRect, canvas: result.canvasRect })) {
    if (
      rect.left < result.orbitRect.left - 1 || rect.right > result.orbitRect.right + 1 ||
      rect.top < result.orbitRect.top - 1 || rect.bottom > result.orbitRect.bottom + 1
    ) {
      throw new Error(`${viewportLabel} ${name} escapes its Money Loop orbit container.`);
    }
  }
}

async function waitForArtifact(page, artifactId, geometry, viewportLabel, expectedRenderMode, selectionFingerprints) {
  const tab = page.getByTestId(`money-loop-artifact-node-${artifactId}`);
  await tab.click();
  await page.waitForFunction(({ artifactId: selectedId, geometry: expectedGeometry }) => {
    const tabNode = document.querySelector(`[data-testid="money-loop-artifact-node-${selectedId}"]`);
    const panel = document.querySelector('[data-testid="money-loop-artifact-active"]');
    return tabNode?.getAttribute('aria-selected') === 'true' &&
      panel?.getAttribute('data-active-geometry') === expectedGeometry;
  }, { artifactId, geometry }, { timeout: 10000 });
  await waitForNormalStage(page, viewportLabel, expectedRenderMode);
  await page.waitForFunction(({ artifactId: selectedId, geometry: expectedGeometry }) => {
    const tabNode = document.querySelector(`[data-testid="money-loop-artifact-node-${selectedId}"]`);
    const panel = document.querySelector('[data-testid="money-loop-artifact-active"]');
    return tabNode?.getAttribute('aria-selected') === 'true' && panel?.getAttribute('data-active-geometry') === expectedGeometry;
  }, { artifactId, geometry }, { timeout: 10000 });
  await page.waitForTimeout(800);
  const pixels = await captureStableCanvasPixels(page, viewportLabel, expectedRenderMode, artifactId);
  const matchingArtifact = selectionFingerprints.get(pixels.fingerprint);
  if (matchingArtifact) {
    throw new Error(`${viewportLabel} ${artifactId} canvas fingerprint did not change after selection; it matches ${matchingArtifact}.`);
  }
  selectionFingerprints.set(pixels.fingerprint, artifactId);
  console.log(`PASS ${viewportLabel} ${artifactId} ${geometry} ${pixels.colorCount} canvas colors fingerprint ${pixels.fingerprint}`);
}

async function assertDomFocusAuthority(page, viewportLabel) {
  const income = page.getByTestId('money-loop-artifact-node-income');
  await income.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.activeElement?.id === 'money-loop-artifact-tab-loc' && document.querySelector('[data-testid="money-loop-artifact-node-loc"]')?.getAttribute('aria-selected') === 'true', { timeout: 10000 });
  const state = await page.evaluate(() => ({
    focusedId: document.activeElement?.id,
    selectedTabCount: document.querySelector('[role="tablist"]')?.querySelectorAll('[role="tab"][aria-selected="true"]').length,
    stageAriaHidden: document.querySelector('[data-testid="money-loop-three-stage"]')?.getAttribute('aria-hidden'),
  }));
  if (state.focusedId !== 'money-loop-artifact-tab-loc' || state.selectedTabCount !== 1 || state.stageAriaHidden !== 'true') {
    throw new Error(`${viewportLabel} DOM tab authority or roving focus was not preserved: ${JSON.stringify(state)}.`);
  }
  console.log(`PASS ${viewportLabel} DOM tabs retain authority and roving focus`);
}

async function installCapableHardwareHints(context) {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 8 });
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 8 });
  });
}

async function verifyNormalViewport(browser, origin, viewportLabel, viewport, expectedRenderMode) {
  const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
  await installCapableHardwareHints(context);
  const page = await context.newPage();
  const browserErrors = [];
  const onConsole = (message) => { if (message.type() === 'error') browserErrors.push(message.text()); };
  const onPageError = (error) => browserErrors.push(error.message);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  try {
    const response = await page.goto(origin, { waitUntil: 'networkidle' });
    if (!response || response.status() !== 200) throw new Error(`${viewportLabel} dashboard returned HTTP ${response?.status() ?? 'no response'}.`);
    await waitForNormalStage(page, viewportLabel, expectedRenderMode);
    const webgl2 = await assertGenuineWebgl2(page, viewportLabel);
    const selectionFingerprints = new Map();
    for (const [artifactId, geometry] of artifacts) {
      await waitForArtifact(page, artifactId, geometry, viewportLabel, expectedRenderMode, selectionFingerprints);
    }
    await assertStageContainment(page, viewportLabel);
    await assertDomFocusAuthority(page, viewportLabel);
    if (browserErrors.length > 0) throw new Error(`${viewportLabel} browser errors: ${browserErrors.join(' | ')}`);
    const screenshotPath = path.join(evidenceDirectory, `${viewportLabel}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`PASS ${viewportLabel} ${expectedRenderMode} WebGL2 ${webgl2.renderer}; screenshot ${screenshotPath}`);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    await context.close();
  }
}

async function verifyReducedMotionFallback(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    const response = await page.goto(origin, { waitUntil: 'networkidle' });
    if (!response || response.status() !== 200) throw new Error(`reduced-motion dashboard returned HTTP ${response?.status() ?? 'no response'}.`);
    const stage = page.getByTestId('money-loop-three-stage');
    await stage.waitFor({ state: 'visible', timeout: 15000 });
    await stage.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-testid="money-loop-three-stage"]')?.getAttribute('data-render-mode') === 'static', { timeout: 15000 });
    if (await stage.locator('canvas').count() !== 0) throw new Error('reduced-motion fallback mounted a WebGL canvas.');
    const loc = page.getByTestId('money-loop-artifact-node-loc');
    await loc.click();
    if ((await loc.getAttribute('aria-selected')) !== 'true') throw new Error('reduced-motion fallback did not preserve the DOM artifact controls.');
    await page.screenshot({ path: path.join(evidenceDirectory, 'reduced-motion-static.png') });
    console.log('PASS reduced-motion static fallback has no WebGL canvas and preserves DOM tabs');
  } finally {
    await context.close();
  }
}

async function run() {
  if (!fs.existsSync(path.join(appRoot, '.next', 'build-manifest.json'))) {
    throw new Error('Run npm run build before npm run test:3d:built.');
  }
  const executablePath = findBrowserExecutable();
  if (!executablePath) {
    throw new Error('No system Chrome, Chromium, or Edge executable was found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to override discovery.');
  }

  fs.rmSync(evidenceDirectory, { recursive: true, force: true });
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  const port = await allocatePort();
  const origin = `http://${host}:${port}`;
  const nextBin = path.join(appRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  activeServer = spawn(process.execPath, [nextBin, 'start', '-H', host, '-p', String(port)], {
    cwd: appRoot,
    detached: process.platform !== 'win32',
    stdio: 'ignore',
    windowsHide: true,
  });

  try {
    await waitForServer(activeServer, origin);
    activeBrowser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });
    for (const { viewportLabel, viewport, expectedRenderMode } of normalViewports) {
      await verifyNormalViewport(activeBrowser, origin, viewportLabel, viewport, expectedRenderMode);
    }
    await verifyReducedMotionFallback(activeBrowser, origin);
    console.log(`Three-stage screenshots: ${evidenceDirectory}`);
  } finally {
    await activeBrowser?.close();
    activeBrowser = undefined;
    await stopServer(activeServer);
    activeServer = undefined;
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
