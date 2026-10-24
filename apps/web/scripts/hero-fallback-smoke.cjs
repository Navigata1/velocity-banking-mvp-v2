/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { startBuiltServer, stopServer } = require('./built-server-harness.cjs');

async function run() {
  const started = await startBuiltServer(path.resolve(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true, args: getHeadlessChromiumArgs() });
  try {
    for (const failure of ['network', 'texture']) {
      const context = await browser.newContext();
      if (failure === 'texture') await context.addInitScript(() => {
        const liveBlobUrls = new Set();
        const createUrl = URL.createObjectURL.bind(URL);
        const revokeUrl = URL.revokeObjectURL.bind(URL);
        URL.createObjectURL = blob => {
          const url = createUrl(blob);
          liveBlobUrls.add(url);
          return url;
        };
        URL.revokeObjectURL = url => { liveBlobUrls.delete(url); revokeUrl(url); };
        window.__heroBlobLeakCount = () => liveBlobUrls.size;
        const decode = window.createImageBitmap.bind(window);
        window.createImageBitmap = (...args) => args[0] instanceof Blob && args[0].type === 'image/webp'
          ? Promise.reject(new DOMException('Injected WebP decode rejection', 'InvalidStateError'))
          : decode(...args);
      });
      const page = await context.newPage();
      if (failure === 'network') await page.route('**/heroes/car.glb', route => route.abort('failed'));
      await page.goto(started.origin, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Inspect 3D model', exact: true }).click();
      await page.getByRole('status').filter({ hasText: '3D unavailable' }).waitFor({ timeout: 15000 });
      assert.equal(await page.getByTestId('asset-hero').locator('img').evaluate(image => getComputedStyle(image).opacity), '1');
      assert.equal(await page.getByTestId('asset-hero-canvas').count(), 0);
      if (failure === 'texture') assert.equal(await page.evaluate(() => window.__heroBlobLeakCount()), 0, 'failed embedded textures must release their blob URLs');
      await context.close();
      console.log(`PASS ${failure} failure preserves studio artwork and releases the stage`);
    }
  } finally { await browser.close(); await stopServer(started.server); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
