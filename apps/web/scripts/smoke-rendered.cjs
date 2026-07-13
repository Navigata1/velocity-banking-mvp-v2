/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { chromium } = require('playwright-core');

const appRoot = path.resolve(__dirname, '..');
const host = '127.0.0.1';
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

function findOnPath(command) {
  const locator = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(locator, [command], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return [];
  return result.stdout.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
}

function findBrowserExecutable() {
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    localAppData && path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    localAppData && path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ...['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'msedge']
      .flatMap(findOnPath),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

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
    request.setTimeout(3000, () => request.destroy(new Error('Rendered smoke request timed out.')));
  });
}

async function waitForServer(server, origin) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (server.exitCode !== null) throw new Error('Rendered smoke server exited before it was ready.');
    try {
      const response = await requestRoot(origin);
      if (response.statusCode === 200 && response.body.includes('InterestShield - Financial Empowerment')) return;
    } catch {
      // Retry while the production server starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Rendered smoke server did not start at ${origin}.`);
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
    activeBrowser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });

    for (const [viewportLabel, viewport] of viewports) {
      const context = await activeBrowser.newContext({ viewport });
      const page = await context.newPage();
      for (const [route, marker] of routes) {
        await verifyRoute(page, origin, route, marker, viewportLabel);
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
          await page.goto(origin, { waitUntil: 'networkidle' });
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
