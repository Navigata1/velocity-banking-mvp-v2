const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const { chromium } = require(path.join(root, 'apps/web/node_modules/playwright-core'));
const { startBuiltServer, stopServer } = require(path.join(root, 'apps/web/scripts/built-server-harness.cjs'));
const { findBrowserExecutable, getHeadlessChromiumArgs } = require(path.join(root, 'apps/web/scripts/browser-harness.cjs'));
const book = { monthlyIncome: 1000000, monthlyExpenses: 0, extraMonthlyPayment: 0, chunkAmount: 0,
  loc: { limit: 0, balance: 0, apr: 0 }, strategy: 'snowball', focusMode: 'single', splitRatioPrimary: 0.7,
  debts: [{ id: 'a', name: 'a', category: 'custom', kind: 'amortized', balance: 1000000000, apr: 0,
    minPaymentRule: { type: 'fixed', amount: 1000 }, paymentSource: 'checking' }] };
(async () => {
  let browser, server;
  const receipts = [];
  try {
    server = await startBuiltServer(path.join(root, 'apps/web'));
    browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true, args: getHeadlessChromiumArgs() });
    for (const width of [280, 375, 640, 690, 700, 768, 1024, 1100, 1120, 1280, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      try {
        await context.addInitScript(book => localStorage.setItem('interestshield-portfolio-v2', JSON.stringify({ version: 2, aprUnit: 'decimal', data: book })), book);
        const page = await context.newPage(); await page.goto(server.origin + '/portfolio', { waitUntil: 'networkidle' });
        await page.getByLabel('Comparison month', { exact: true }).fill('0');
        const value = page.getByTestId('common-month-net-velocity'); await value.filter({ hasText: '-$1,000,000,000.00' }).waitFor();
        await page.addStyleTag({ content: '[data-testid="common-month-comparison"],[data-testid="common-month-comparison"] *{font-family:Verdana !important;}' });
        const geometry = await value.evaluate(element => { const style = getComputedStyle(element), range = document.createRange(); range.selectNodeContents(element);
          const box = element.getBoundingClientRect(), text = range.getBoundingClientRect();
          return { text: element.innerText, width: box.width, glyphWidth: text.width, fontSize: parseFloat(style.fontSize), fontFamily: style.fontFamily,
            fits: element.scrollWidth <= element.clientWidth + 1 && text.width <= box.width + 1 }; });
        console.log(JSON.stringify({ viewportWidth:width, ...geometry })); assert.equal(geometry.text, '-$1,000,000,000.00'); assert.ok(geometry.fits); assert.ok(geometry.fontSize >= 12);
        receipts.push({ viewportWidth:width, ...geometry });
      } finally { await context.close(); }
    }
    fs.writeFileSync(path.join(__dirname, 'currency-width-boundary.json'), JSON.stringify({ scope: 'One exact maximum-standard-notation boundary book; additional diagnostic, not extra standing workflows', receipts }, null, 2) + '\n');
  } finally { await browser?.close(); await stopServer(server?.server); }
})().catch(error => { console.error(error); process.exitCode = 1; });
