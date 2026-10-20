/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { startBuiltServer, stopServer } = require('./built-server-harness.cjs');

const appRoot = path.resolve(__dirname, '..');
const evidenceDir = path.join(appRoot, 'test-results', 'comparison');
const scenarios = [
  {
    id: 'zero-interest-two-liabilities',
    state: { monthlyIncome: 1000, monthlyExpenses: 500, chunkAmount: 100,
      debts: { car: { balance: 600, interestRate: 0, minimumPayment: 100 } },
      loc: { limit: 2000, balance: 400, interestRate: 0 } },
    directMonths: '2 mo', directInterest: '$0 interest',
  },
  {
    id: 'velocity-slower-and-more-interest',
    state: { monthlyIncome: 1000, monthlyExpenses: 500, chunkAmount: 1,
      debts: { car: { balance: 1000, interestRate: 12, minimumPayment: 100 } },
      loc: { limit: 2000, balance: 0, interestRate: 30 } },
    directMonths: '3 mo', directInterest: '$15 interest', slower: true,
  },
  {
    id: 'unaffordable-minimum',
    state: { monthlyIncome: 1000, monthlyExpenses: 950, chunkAmount: 100,
      debts: { car: { balance: 600, interestRate: 0, minimumPayment: 100 } },
      loc: { limit: 2000, balance: 400, interestRate: 0 } },
    directMonths: 'Review inputs', directInterest: 'Not projected',
  },
];

(async () => {
  let server;
  let browser;
  try {
    const executablePath = findBrowserExecutable();
    assert.ok(executablePath, 'Chrome/Chromium executable is required');
    server = process.env.COMPARISON_SMOKE_ORIGIN ? null : await startBuiltServer(appRoot);
    const origin = process.env.COMPARISON_SMOKE_ORIGIN ?? server.origin;
    browser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });
    fs.mkdirSync(evidenceDir, { recursive: true });
    const receipts = [];
    for (const width of [1440, 375]) {
      for (const scenario of scenarios) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        try {
          await context.addInitScript((state) => {
            localStorage.setItem('velocity-bank-storage', JSON.stringify({ state, version: 0 }));
          }, scenario.state);
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          const response = await page.goto(`${origin}/simulator`, { waitUntil: 'networkidle' });
          assert.equal(response.status(), 200);
          await page.getByTestId('simulator-comparison-assumptions').waitFor();
          const comparison = page.getByTestId('simulator-strategy-comparison');
          await comparison.getByText(scenario.directMonths, { exact: true }).first().waitFor();
          const text = await comparison.innerText();
          assert.ok(text.includes(scenario.directInterest), `${scenario.id}: ${text}`);
          if (scenario.slower) {
            assert.match(text, /mo slower/);
            assert.match(text, /more interest/);
            assert.ok(!text.includes('No modeled time difference'));
          }
          await comparison.scrollIntoViewIfNeeded();
          await page.waitForFunction(() => {
            let node = document.querySelector('[data-testid="simulator-strategy-comparison"]');
            while (node) {
              if (Number(getComputedStyle(node).opacity) < 0.99) return false;
              node = node.parentElement;
            }
            return true;
          });
          const chart = page.getByTestId('simulator-balance-chart');
          const bars = page.getByTestId('simulator-balance-bar');
          const expectedValid = scenario.directMonths !== 'Review inputs';
          const chartHeight = (await chart.boundingBox()).height;
          const firstBarHeight = expectedValid ? (await bars.first().boundingBox()).height : 0;
          assert.equal(await bars.count(), expectedValid ? Number.parseInt(scenario.directMonths, 10) : 0);
          if (expectedValid) assert.ok(firstBarHeight > 0 && firstBarHeight <= chartHeight, 'balance bars must render, not collapse');
          else {
            assert.ok((await chart.innerText()).includes('Review cash flow and payment assumptions.'));
            assert.equal(await page.getByText('Month 0', { exact: true }).count(), 0);
          }
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
          assert.equal(overflow, false, `${width}px page overflow`);
          assert.deepEqual(errors, [], 'no browser page errors');
          const screenshot = await comparison.screenshot({ path: path.join(evidenceDir, `${scenario.id}-${width}.png`) });
          assert.ok(screenshot.byteLength > 5000, 'comparison screenshot must contain rendered text and cards');
          receipts.push({ scenario: scenario.id, width, directMonths: scenario.directMonths, chartHeight, firstBarHeight, errors });
          console.log(`PASS Simulator ${scenario.id} at ${width}px`);
        } finally {
          await context.close();
        }
      }
    }
    fs.writeFileSync(path.join(evidenceDir, 'verification.json'), `${JSON.stringify({ receipts }, null, 2)}\n`);
  } finally {
    await browser?.close();
    await stopServer(server?.server);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
