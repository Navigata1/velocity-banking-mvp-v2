/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { createGracefulShutdown, startBuiltServer, stopServer } = require('./built-server-harness.cjs');

const appRoot = path.resolve(__dirname, '..');
const routes = [
  ['/', 'Money Loop Dashboard'],
  ['/simulator', 'What-If Simulator'],
  ['/cockpit', 'Cockpit Mode'],
  ['/portfolio', 'Portfolio'],
  ['/learn', 'Learn Center'],
  ['/settings', 'Settings'],
  ['/vault', 'Wealth Transfer Timeline'],
];
const viewports = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
];
let activeServer;
let activeBrowser;
const shutdown = createGracefulShutdown({
  closeBrowser: async () => {
    await activeBrowser?.close();
    activeBrowser = undefined;
  },
  stopServer: async () => {
    await stopServer(activeServer);
    activeServer = undefined;
  },
  exit: (code) => process.exit(code),
});

process.once('SIGINT', () => { void shutdown(130); });
process.once('SIGTERM', () => { void shutdown(143); });

async function settleImages(page) {
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.8, 320);
    for (let top = 0; top < document.documentElement.scrollHeight; top += step) {
      window.scrollTo(0, top);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    const images = [...document.images].filter((image) => image.getClientRects().length > 0);
    await Promise.all(images.map((image) => {
      if (image.complete) return undefined;
      return new Promise((resolve) => {
        const timer = setTimeout(resolve, 5000);
        const done = () => { clearTimeout(timer); resolve(); };
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
      });
    }));
    window.scrollTo(0, 0);
  });
}

async function verifyRoute(page, origin, route, marker, viewportLabel) {
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  };
  const onPageError = (error) => pageErrors.push(error.message);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  try {
    const response = await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });
    if (!response || response.status() !== 200) {
      throw new Error(`${viewportLabel} ${route} returned HTTP ${response?.status() ?? 'no response'}.`);
    }
    try {
      await page.waitForFunction(
        (expectedMarker) => document.querySelector('main')?.innerText.includes(expectedMarker),
        marker,
        { timeout: 15000 }
      );
    } catch {
      throw new Error(`${viewportLabel} ${route} did not hydrate main-content marker ${marker} within 15 seconds.`);
    }
    await settleImages(page);

    const result = await page.evaluate((expectedMarker) => {
      const root = document.documentElement;
      const main = document.querySelector('main');
      const images = [...document.images].filter((image) => image.getClientRects().length > 0);
      return {
        mainHasMarker: Boolean(main?.innerText.includes(expectedMarker)),
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        hasOverlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')),
        brokenImages: images
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src),
      };
    }, marker);

    if (!result.mainHasMarker) throw new Error(`${viewportLabel} ${route} is missing main-content marker ${marker}.`);
    if (result.hasOverlay) throw new Error(`${viewportLabel} ${route} rendered a framework error overlay.`);
    if (result.scrollWidth > result.clientWidth + 1) {
      throw new Error(`${viewportLabel} ${route} overflows ${result.scrollWidth}px beyond ${result.clientWidth}px.`);
    }
    if (result.brokenImages.length > 0) {
      throw new Error(`${viewportLabel} ${route} has broken images: ${result.brokenImages.join(', ')}`);
    }
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error(`${viewportLabel} ${route} browser errors: ${[...consoleErrors, ...pageErrors].join(' | ')}`);
    }

    console.log(`PASS ${viewportLabel} ${route} ${result.clientWidth}px`);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }
}

async function run() {
  if (!fs.existsSync(path.join(appRoot, '.next', 'build-manifest.json'))) {
    throw new Error('Run npm run build before npm run smoke:rendered:built.');
  }
  const executablePath = findBrowserExecutable();
  if (!executablePath) {
    throw new Error('No system Chrome, Chromium, or Edge executable was found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to override discovery.');
  }

  try {
    const started = await startBuiltServer(appRoot);
    activeServer = started.server;
    activeBrowser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });

    for (const [viewportLabel, viewport] of viewports) {
      const context = await activeBrowser.newContext({ viewport });
      const page = await context.newPage();
      for (const [route, marker] of routes) {
        await verifyRoute(page, started.origin, route, marker, viewportLabel);
      }

      if (viewportLabel === 'desktop') {
        const interactionErrors = [];
        const onConsole = (message) => {
          if (message.type() === 'error') interactionErrors.push(message.text());
        };
        const onPageError = (error) => interactionErrors.push(error.message);
        page.on('console', onConsole);
        page.on('pageerror', onPageError);
        try {
          await page.goto(started.origin, { waitUntil: 'networkidle' });
          await page.getByRole('button', { name: 'Next Money Loop artifact' }).click();
          const locArtifact = page.getByTestId('money-loop-artifact-node-loc');
          if ((await locArtifact.getAttribute('aria-selected')) !== 'true') {
            throw new Error('Money Loop Next control did not select LOC.');
          }
          if (interactionErrors.length > 0) {
            throw new Error(`Money Loop interaction browser errors: ${interactionErrors.join(' | ')}`);
          }
        } finally {
          page.off('console', onConsole);
          page.off('pageerror', onPageError);
        }
        console.log('PASS desktop Money Loop Next selects LOC');
      }
      await context.close();
    }
  } finally {
    await activeBrowser?.close();
    activeBrowser = undefined;
    await stopServer(activeServer);
    activeServer = undefined;
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
