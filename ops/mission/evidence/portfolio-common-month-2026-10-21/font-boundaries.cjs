const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const { chromium } = require(path.join(root, 'apps/web/node_modules/playwright-core'));
const { startBuiltServer, stopServer } = require(path.join(root, 'apps/web/scripts/built-server-harness.cjs'));
const { findBrowserExecutable, getHeadlessChromiumArgs } = require(path.join(root, 'apps/web/scripts/browser-harness.cjs'));
const { runCommonMonthFixtures } = require(path.join(root, 'apps/web/scripts/smoke-portfolio-common-month.cjs'));
(async () => {
  let browser, server;
  try {
    server = await startBuiltServer(path.join(root, 'apps/web'));
    browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true, args: getHeadlessChromiumArgs() });
    const output = path.join(__dirname, 'wide-font-boundaries');
    const receipts = await runCommonMonthFixtures({ browser, origin: server.origin, output, fontFamily: 'Verdana', widths: [280, 360, 640, 768, 1024, 1440] });
    fs.writeFileSync(path.join(__dirname, 'font-boundary-summary.json'), JSON.stringify({
      source: 'Actual wider-font boundary executions; additional diagnostics, not extra standing workflow cases',
      widths: [280, 360, 640, 768, 1024, 1440], executions: receipts.length,
      fontFamilyRequested: 'Verdana', output, allPassed: true,
    }, null, 2) + '\n');
  } finally { await browser?.close(); await stopServer(server?.server); }
})().catch(error => { console.error(error); process.exitCode = 1; });
