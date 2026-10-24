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
    id: 'affordable-final-payment',
    state: { monthlyIncome: 1000, monthlyExpenses: 800, chunkAmount: 100,
      debts: { car: { balance: 100, interestRate: 12, minimumPayment: 425 } },
      loc: { limit: 2000, balance: 0, interestRate: 10 } },
    directMonths: '1 mo', directInterest: '$1 interest', velocityMonths: '1 mo', pauseChunks: true,
  },
  {
    id: 'zero-after-minimum',
    state: { monthlyIncome: 1000, monthlyExpenses: 575, chunkAmount: 100,
      debts: { car: { balance: 1000, interestRate: 0, minimumPayment: 425 } },
      loc: { limit: 2000, balance: 500, interestRate: 0 } },
    directMonths: '4 mo', directInterest: '$0 interest', velocityMonths: '4 mo', pauseChunks: true,
  },
  {
    id: 'exact-final-payment',
    state: { monthlyIncome: 120.7, monthlyExpenses: 0, chunkAmount: 100,
      debts: { car: { balance: 120, interestRate: 7, minimumPayment: 425 } },
      loc: { limit: 2000, balance: 0, interestRate: 0 } },
    directMonths: '1 mo', directInterest: '$1 interest', velocityMonths: '1 mo', pauseChunks: true,
  },
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
          if (scenario.velocityMonths) {
            assert.ok((await page.getByTestId('strategy-projection-velocity').innerText()).includes(scenario.velocityMonths));
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
          if (expectedValid) {
            assert.ok(firstBarHeight <= chartHeight);
            if (scenario.directMonths === '1 mo') assert.equal(firstBarHeight, 0, 'a one-month payoff has a zero ending balance');
            else assert.ok(firstBarHeight > 0, 'outstanding balance bars must render, not collapse');
          }
          else {
            assert.ok((await chart.innerText()).includes('Review cash flow and payment assumptions.'));
            assert.equal(await page.getByText('Month 0', { exact: true }).count(), 0);
          }
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
          assert.equal(overflow, false, `${width}px page overflow`);
          assert.deepEqual(errors, [], 'no browser page errors');
          const screenshot = await comparison.screenshot({ path: path.join(evidenceDir, `${scenario.id}-${width}.png`) });
          assert.ok(screenshot.byteLength > 5000, 'comparison screenshot must contain rendered text and cards');
          if (scenario.pauseChunks) {
            await page.goto(origin, { waitUntil: 'networkidle' });
            await page.getByText('Pause new chunks', { exact: true }).filter({ visible: true }).first().waitFor();
          }
          receipts.push({ scenario: scenario.id, width, directMonths: scenario.directMonths, chartHeight, firstBarHeight, errors });
          console.log(`PASS Simulator ${scenario.id} at ${width}px`);
        } finally {
          await context.close();
        }
      }
      for (const paymentFrequency of ['weekly', 'biweekly']) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        try {
          await context.addInitScript((frequency) => {
            if (localStorage.getItem('timing-smoke-initialized')) return;
            localStorage.setItem('velocity-bank-storage', JSON.stringify({ version: 0, state: {
              monthlyIncome: 7812, monthlyExpenses: 3123, chunkFrequency: 'weekly',
              mortgageDetails: { entryMode: 'current', currentBalance: 123456, paymentFrequency: frequency },
            } }));
            localStorage.setItem('timing-smoke-initialized', 'true');
          }, paymentFrequency);
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await page.goto(`${origin}/simulator`, { waitUntil: 'networkidle' });
          await page.getByRole('tab', { name: 'Switch to House domain', exact: true }).click();
          const timing = page.getByTestId('mortgage-timing-assumption');
          await timing.waitFor();
          assert.match(await timing.innerText(), /Monthly estimate/);
          assert.equal(await page.getByRole('group', { name: 'Mortgage payment frequency', exact: true }).count(), 0);
          await page.getByRole('button', { name: /^Edit Mortgage current balance,/ }).click();
          const balance = page.getByRole('textbox', { name: 'Mortgage current balance value', exact: true });
          await balance.fill('124000');
          await balance.press('Enter');
          await page.waitForFunction(() => JSON.parse(localStorage.getItem('velocity-bank-storage')).state.mortgageDetails.currentBalance === 124000);

          await page.goto(`${origin}/vault`, { waitUntil: 'networkidle' });
          await page.getByTestId('vault-mortgage-timing-assumption').waitFor();
          assert.equal(await page.getByRole('group', { name: 'Vault mortgage payment frequency', exact: true }).count(), 0);
          await page.getByRole('button', { name: /^Edit Vault current balance, current value \$124,000$/ }).waitFor();
          await page.getByRole('button', { name: 'Go to What If You Changed The Tool?', exact: true }).click();
          await page.getByText('Financial assumptions', { exact: true }).click();
          const annualExtra = page.getByTestId('mortgage-annual-extra-assumption');
          await annualExtra.waitFor();
          assert.match(await page.getByTestId('vault-comparison-scope-warning').innerText(), /Same mortgage, existing LOC balance and available monthly budget/);
          assert.match(await annualExtra.innerText(), /Actual biweekly payment dates are not modeled/);
          assert.equal(await page.getByText('Bi-Weekly Payments', { exact: true }).count(), 0);
          const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('velocity-bank-storage')).state);
          assert.equal(saved.mortgageDetails.paymentFrequency, paymentFrequency);
          assert.equal(saved.chunkFrequency, 'weekly');
          assert.equal(saved.mortgageDetails.currentBalance, 124000);
          assert.equal(saved.monthlyIncome, 7812);
          assert.equal(saved.monthlyExpenses, 3123);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          assert.deepEqual(errors, []);
          await page.screenshot({ path: path.join(evidenceDir, `timing-${paymentFrequency}-${width}.png`), fullPage: true });
          receipts.push({ scenario: `legacy-timing-${paymentFrequency}`, width, preserved: true, editedBalance: 124000, errors });
          console.log(`PASS legacy ${paymentFrequency} timing preserved without inactive controls at ${width}px`);
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
