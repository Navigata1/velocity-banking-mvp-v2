/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { startBuiltServer, stopServer } = require('./built-server-harness.cjs');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const root = path.resolve(__dirname, '..');
const widths = [280, 375, 640, 690, 700, 768, 1024, 1100, 1120, 1280, 1440];
const book = { monthlyIncome: 1000000, monthlyExpenses: 0, extraMonthlyPayment: 0, chunkAmount: 0,
  loc: { limit: 0, balance: 0, apr: 0 }, strategy: 'snowball', focusMode: 'single', splitRatioPrimary: 0.7,
  debts: [{ id: 'a', name: 'a', category: 'custom', kind: 'amortized', balance: 1000000000, apr: 0,
    minPaymentRule: { type: 'fixed', amount: 1000 }, paymentSource: 'checking' }] };
async function main() {
  let browser, server;
  const receipts = [], output = path.join(root, 'test-results/currency-width');
  fs.mkdirSync(output, { recursive: true });
  try {
    server = process.env.CURRENCY_WIDTH_ORIGIN ? null : await startBuiltServer(root);
    const origin = process.env.CURRENCY_WIDTH_ORIGIN ?? server.origin;
    browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true, args: getHeadlessChromiumArgs() });
    for (const viewportWidth of widths) {
      const context = await browser.newContext({ viewport: { width: viewportWidth, height: 900 }, reducedMotion: 'reduce' });
      try {
        await context.addInitScript(book => localStorage.setItem('interestshield-portfolio-v2', JSON.stringify({ version: 2, aprUnit: 'decimal', data: book })), book);
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message)); page.on('console', entry => { if (entry.type() === 'error') errors.push(entry.text()); });
        const response = await page.goto(origin + '/portfolio', { waitUntil: 'networkidle' }); assert.equal(response.status(), 200);
        await page.getByLabel('Comparison month', { exact: true }).fill('0');
        const value = page.getByTestId('common-month-net-velocity'); await value.filter({ hasText: '-$1,000,000,000.00' }).waitFor();
        await page.waitForFunction(() => { let element = document.querySelector('[data-testid="common-month-comparison"]'); while (element) { if (Number(getComputedStyle(element).opacity) < 0.99) return false; element = element.parentElement; } return true; });
        await page.addStyleTag({ content: '[data-testid="common-month-comparison"],[data-testid="common-month-comparison"] *{font-family:Verdana !important;}' });
        const geometry = await value.evaluate(element => {
          const style = getComputedStyle(element), range = document.createRange(); range.selectNodeContents(element);
          const box = element.getBoundingClientRect(), text = range.getBoundingClientRect(), rects = [...range.getClientRects()].filter(rect => rect.width > 0);
          return { text: element.innerText, metricWidth: box.width, glyphWidth: text.width, fontSize: parseFloat(style.fontSize), fontFamilyRequested: 'Verdana',
            fits: element.scrollWidth <= element.clientWidth + 1 && text.width <= box.width + 1,
            contained: text.left >= box.left - 1 && text.right <= box.right + 1 && text.top >= box.top - 1 && text.bottom <= box.bottom + 1,
            oneLine: rects.length > 0 && rects.every(rect => Math.abs(rect.top - rects[0].top) <= 1),
            pageOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        assert.equal(geometry.text, '-$1,000,000,000.00');
        assert.ok(geometry.fits && geometry.contained && geometry.oneLine && geometry.fontSize >= 12 && !geometry.pageOverflow, JSON.stringify({ viewportWidth, ...geometry }));
        assert.deepEqual(errors, []); receipts.push({ viewportWidth, ...geometry, errors });
        console.log(`PASS max-standard-currency boundary ${viewportWidth}px`);
      } finally { await context.close(); }
    }
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ origin, scope: 'One exact maximum-standard-notation boundary book; eleven rendered widths, not eleven lender examples', receipts }, null, 2) + '\n');
  } finally { await browser?.close(); await stopServer(server?.server); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
