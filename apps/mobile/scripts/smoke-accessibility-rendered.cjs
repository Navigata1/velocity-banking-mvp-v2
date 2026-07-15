/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '..', '..', 'web', 'node_modules', 'playwright-core'));
const {
  findBrowserExecutable,
  getHeadlessChromiumArgs,
} = require(path.resolve(__dirname, '..', '..', 'web', 'scripts', 'browser-harness.cjs'));

const appRoot = path.resolve(__dirname, '..');
const origin = process.env.MOBILE_ACCESSIBILITY_ORIGIN || 'http://127.0.0.1:8112';
const outputDirectory = path.resolve(
  process.env.MOBILE_ACCESSIBILITY_OUTPUT || path.join(appRoot, 'test-results', 'accessibility')
);
const routes = [
  ['/', 'Cash Flow'],
  ['/simulator', 'Strategy Comparison'],
  ['/cockpit', 'Flight Status'],
  ['/portfolio', 'Portfolio Coverage'],
  ['/learn', 'Money Loop'],
  ['/vault', 'Freedom Path'],
  ['/settings', 'Backend Status'],
];
const viewports = [
  ['compact-280', { width: 280, height: 800 }],
  ['compact-320', { width: 320, height: 800 }],
  ['phone-390', { width: 390, height: 844 }],
  ['phone-landscape', { width: 844, height: 390 }],
  ['tablet-768', { width: 768, height: 1024 }],
];

function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if ((response.statusCode ?? 500) < 500) resolve();
        else retry();
      });
      request.on('error', retry);
      request.setTimeout(1000, () => request.destroy());
    };
    const retry = () => {
      if (Date.now() - started >= timeoutMs) reject(new Error(`Timed out waiting for ${url}.`));
      else setTimeout(poll, 200);
    };
    poll();
  });
}

async function assertMinimumHeight(locator, minimum, label) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const bounds = await locator.nth(index).boundingBox();
    if (!bounds || bounds.height + 0.5 < minimum) {
      throw new Error(`${label} ${index + 1} is ${bounds?.height ?? 0}px high; expected at least ${minimum}px.`);
    }
  }
}

async function verifyRoute(page, route, marker, viewportLabel) {
  const errors = [];
  const onConsole = (entry) => { if (entry.type() === 'error') errors.push(entry.text()); };
  const onPageError = (error) => errors.push(error.message);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  try {
    const response = await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });
    if (!response || response.status() !== 200) throw new Error(`${route} returned ${response?.status() ?? 'no response'}.`);
    await page.getByText(marker, { exact: false }).first().waitFor({ state: 'visible' });
    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      hasOverlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')),
      scrollWidth: document.documentElement.scrollWidth,
    }));
    if (geometry.hasOverlay) throw new Error(`${viewportLabel} ${route} rendered a framework error overlay.`);
    if (geometry.scrollWidth > geometry.clientWidth + 1) {
      throw new Error(`${viewportLabel} ${route} overflows ${geometry.scrollWidth}px beyond ${geometry.clientWidth}px.`);
    }
    if (await page.getByRole('heading').count() < 1) throw new Error(`${viewportLabel} ${route} has no route heading.`);
    await assertMinimumHeight(page.getByRole('tab'), 48, `${viewportLabel} navigation tab`);
    if (errors.length > 0) throw new Error(`${viewportLabel} ${route} browser errors: ${errors.join(' | ')}`);
    console.log(`PASS ${viewportLabel} ${route} ${geometry.clientWidth}px`);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }
}

async function verifyDashboardGeometry(page, viewportLabel) {
  await page.goto(origin, { waitUntil: 'networkidle' });
  const orbit = page.getByTestId('mobile-payoff-orbit');
  const orbitBounds = await orbit.boundingBox();
  const nodes = page.locator('[data-testid^="mobile-payoff-orbit-node-"]');
  if (!orbitBounds || await nodes.count() !== 5) throw new Error(`${viewportLabel} orbit geometry is incomplete.`);
  for (let index = 0; index < await nodes.count(); index += 1) {
    const bounds = await nodes.nth(index).boundingBox();
    if (
      !bounds
      || bounds.x < orbitBounds.x - 0.5
      || bounds.y < orbitBounds.y - 0.5
      || bounds.x + bounds.width > orbitBounds.x + orbitBounds.width + 0.5
      || bounds.y + bounds.height > orbitBounds.y + orbitBounds.height + 0.5
    ) throw new Error(`${viewportLabel} orbit node ${index + 1} escapes its parent.`);
    if (bounds.width + 0.5 < 48 || bounds.height + 0.5 < 48) {
      throw new Error(`${viewportLabel} orbit node ${index + 1} misses the 48px target.`);
    }
  }
}

async function verifyFocusedNavigation(page) {
  await page.goto(origin, { waitUntil: 'networkidle' });
  const debtTerm = page.getByLabel('Active debt term months');
  await debtTerm.scrollIntoViewIfNeeded();
  await debtTerm.focus();
  await page.getByRole('tab', { name: 'Simulator mobile section' }).click();
  await page.waitForURL(`${origin}/simulator`);
  console.log('PASS focused assumption input navigates on the first tab press');
}

async function main() {
  if (!fs.existsSync(path.join(appRoot, 'dist-web', 'index.html'))) {
    throw new Error('Run npm run build:web before npm run smoke:accessibility:built.');
  }
  const executablePath = findBrowserExecutable();
  if (!executablePath) throw new Error('No Chrome, Chromium, or Edge executable was found.');
  fs.mkdirSync(outputDirectory, { recursive: true });
  const server = spawn(process.execPath, ['scripts/serve-web-export.cjs'], {
    cwd: appRoot,
    env: { ...process.env, HOST: '127.0.0.1', PORT: new URL(origin).port },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  try {
    await waitForServer(origin);
    browser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });
    for (const [viewportLabel, viewport] of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      for (const [route, marker] of routes) await verifyRoute(page, route, marker, viewportLabel);
      await verifyDashboardGeometry(page, viewportLabel);
      if (viewportLabel === 'phone-390') {
        await page.screenshot({ fullPage: true, path: path.join(outputDirectory, 'dashboard-phone-390.png') });
        await verifyFocusedNavigation(page);
      }
      if (viewportLabel === 'tablet-768') {
        await page.goto(`${origin}/settings`, { waitUntil: 'networkidle' });
        await page.screenshot({ fullPage: true, path: path.join(outputDirectory, 'settings-tablet-768.png') });
      }
      await context.close();
    }
  } finally {
    await browser?.close();
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
