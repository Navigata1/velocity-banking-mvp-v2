/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { startBuiltServer, stopServer } = require('./built-server-harness.cjs');

const appRoot = path.resolve(__dirname, '..');
const evidenceDir = path.join(appRoot, 'test-results/vault-comparison');
const mortgage = { entryMode: 'current', purchaseAge: 40, currentAge: 40, originalCost: 1000,
  originalTermYears: 1, originalRate: 0, downPayment: 0, currentBalance: 1000,
  remainingTermMonths: 10, currentRate: 0, currentMonthlyPayment: 100,
  paymentFrequency: 'weekly', hasExtraPayments: false, extraPaymentAmount: 0,
  hasRefinanced: false, refinanceCount: 0 };
const scenarios = [
  { id: 'failed-velocity-horizon', income: 200, expenses: 0, locBalance: 10138, locApr: 0.12, limit: 20000,
    mortgage: { originalCost: 30000, currentBalance: 30000, currentRate: 0, currentMonthlyPayment: 100, originalTermYears: 30, remainingTermMonths: 300 },
    months: ['371 mo', '371 mo', '371 mo', 'Review inputs'], failedVelocity: true },
  { id: 'large-illustration', income: 20000, expenses: 8000, locBalance: 0, locApr: 0.08, limit: 100000,
    mortgage: { originalCost: 1000000, currentBalance: 1000000, currentRate: 0.06, currentMonthlyPayment: 6000, originalTermYears: 30, remainingTermMonths: 360 }, illustration: true },
  { id: 'unfunded', income: 50, expenses: 0, locBalance: 0, months: ['Review inputs', 'Review inputs', 'Review inputs', 'Review inputs'] },
  { id: 'existing-loc-zero-recovery', income: 100, expenses: 0, locBalance: 2000, months: ['30 mo', '30 mo', '30 mo', '30 mo'] },
  { id: 'clipped-final', income: 120.7, expenses: 0, locBalance: 0,
    mortgage: { currentBalance: 120, currentRate: 0.07, currentMonthlyPayment: 425 }, months: ['1 mo', '1 mo', '1 mo', '1 mo'] },
  { id: 'clipped-contribution', income: 123.7, expenses: 0, locBalance: 3, locApr: 0.08, limit: 2000,
    mortgage: { currentBalance: 120, currentRate: 0.07, currentMonthlyPayment: 425 },
    months: ['2 mo', '2 mo', '2 mo', '1 mo'], illustration: true, illustrationAmount: '$124.42' },
  { id: 'one-cent-short', income: 120.69, expenses: 0, locBalance: 0,
    mortgage: { currentBalance: 120, currentRate: 0.07, currentMonthlyPayment: 425 }, months: ['Review inputs', 'Review inputs', 'Review inputs', 'Review inputs'] },
  { id: 'cash-reserves', income: 1000, expenses: 500, locBalance: 0, months: ['10 mo', '10 mo', '3 mo', '5 mo'], cash: '$4,000' },
  { id: 'adverse-interest', income: 120, expenses: 0, locBalance: 0, locApr: 0.5, months: ['10 mo', '10 mo', '9 mo', '9 mo'], adverse: true },
  { id: 'already-paid', income: 0, expenses: 0, locBalance: 0, limit: 0,
    mortgage: { currentBalance: 0 }, months: ['Paid off', 'Paid off', 'Paid off', 'Paid off'] },
];

(async () => {
  let server;
  let browser;
  try {
    const executablePath = findBrowserExecutable();
    assert.ok(executablePath, 'Chrome/Chromium executable is required');
    server = process.env.VAULT_COMPARISON_SMOKE_ORIGIN ? null : await startBuiltServer(appRoot);
    const origin = process.env.VAULT_COMPARISON_SMOKE_ORIGIN ?? server.origin;
    browser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });
    fs.mkdirSync(evidenceDir, { recursive: true });
    const receipts = [];
    for (const width of [1440, 375]) {
      for (const scenario of scenarios) {
        const state = { monthlyIncome: scenario.income, monthlyExpenses: scenario.expenses, currentAge: 40,
          activeDomain: 'house', mortgageDetails: { ...mortgage, ...scenario.mortgage },
          loc: { limit: scenario.limit ?? 5000, balance: scenario.locBalance, interestRate: scenario.locApr ?? 0 } };
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        try {
          await context.addInitScript((value) => {
            if (localStorage.getItem('vault-smoke-initialized')) return;
            localStorage.setItem('velocity-bank-storage', JSON.stringify({ state: value, version: 0 }));
            localStorage.setItem('vault-smoke-initialized', 'true');
          }, state);
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          const response = await page.goto(`${origin}/vault`, { waitUntil: 'networkidle' });
          assert.equal(response.status(), 200);
          await page.getByRole('button', { name: 'Go to What If You Changed The Tool?', exact: true }).click();
          const comparison = page.getByTestId('vault-strategy-comparison');
          await comparison.waitFor();
          const keys = ['standard', 'biweekly', 'extraPayment', 'velocity'];
          const observedCards = {};
          for (const [index, key] of keys.entries()) {
            const card = page.getByTestId(`vault-plan-${key}`);
            const text = await card.innerText();
            observedCards[key] = text;
            if (scenario.months) assert.ok(text.includes(scenario.months[index]), `${scenario.id}/${key}: ${text}`);
            else assert.match(text, /\d+ mo/);
            assert.match(text, /Cash at payoff:/);
          }
          assert.match(await comparison.innerText(), /Same mortgage, existing LOC balance and available monthly budget/);
          assert.match(await comparison.innerText(), /not a common-date wealth comparison/);
          if (scenario.cash) assert.ok((await page.getByTestId('vault-plan-standard').innerText()).includes(scenario.cash));
          if (scenario.id === 'already-paid') assert.match(await page.getByTestId('vault-plan-standard').innerText(), /Already paid off/);
          if (scenario.adverse) assert.match(await page.getByTestId('vault-plan-velocity').innerText(), /more modeled interest/);
          await page.getByText('Financial assumptions', { exact: true }).click();
          const terms = page.getByTestId('vault-comparison-assumptions');
          assert.match(await terms.innerText(), /not a verified lender minimum/);
          assert.match(await terms.innerText(), /Actual biweekly payment dates are not modeled/);
          await page.getByText('Financial assumptions', { exact: true }).click();
          await comparison.scrollIntoViewIfNeeded();
          await page.waitForFunction(() => {
            let node = document.querySelector('[data-testid="vault-strategy-comparison"]');
            while (node) { if (Number(getComputedStyle(node).opacity) < 0.99) return false; node = node.parentElement; }
            return true;
          });
          const overflow = await page.evaluate(() => ({
            page: document.documentElement.scrollWidth > innerWidth,
            cards: [...document.querySelectorAll('[data-testid^="vault-plan-"]')].some(card => card.scrollWidth > card.clientWidth + 1),
          }));
          assert.deepEqual(overflow, { page: false, cards: false });
          const shot = await comparison.screenshot({ path: path.join(evidenceDir, `${scenario.id}-${width}.png`) });
          assert.ok(shot.byteLength > 5000);
          if (scenario.failedVelocity) {
            await page.getByRole('button', { name: 'Go to Your Freedom Path', exact: true }).click();
            assert.equal(await page.getByTestId('vault-standard-timeline').evaluate(element => element.style.width), '100%');
            assert.equal(await page.getByTestId('vault-velocity-timeline').evaluate(element => element.style.width), '0%');
            await page.screenshot({ path: path.join(evidenceDir, `failed-velocity-timeline-${width}.png`), fullPage: true });
          }
          if (scenario.adverse || scenario.illustration || scenario.id === 'already-paid') {
            await page.getByRole('button', { name: 'Go to Your Freedom Path', exact: true }).click();
            await page.getByText('Freed-Payment Illustration', { exact: true }).waitFor();
            if (scenario.adverse) assert.match(await page.locator('main').innerText(), /more modeled interest/);
            if (scenario.id !== 'already-paid') assert.match(await page.locator('main').innerText(), /not a net-wealth comparison/);
            else assert.match(await page.locator('main').innerText(), /No remaining payoff period/);
            assert.ok(!(await page.locator('main').innerText()).includes('Building wealth'));
            await page.screenshot({ path: path.join(evidenceDir, `${scenario.id}-freedom-${width}.png`), fullPage: true });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'freedom illustration must fit the viewport');
            const amountBox = await page.getByText('Freed-Payment Illustration', { exact: true }).locator('..').locator(':scope > div').nth(1)
              .evaluate(element => ({ content: element.scrollWidth, available: element.clientWidth }));
            assert.ok(amountBox.content <= amountBox.available + 1, `illustration amount is clipped: ${JSON.stringify(amountBox)}`);
            if (scenario.illustrationAmount) assert.ok((await page.locator('main').innerText()).includes(scenario.illustrationAmount));
          }
          const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('velocity-bank-storage')).state);
          assert.equal(saved.mortgageDetails.paymentFrequency, 'weekly');
          assert.equal(saved.monthlyIncome, scenario.income);
          assert.equal(saved.monthlyExpenses, scenario.expenses);
          assert.deepEqual(errors, []);
          receipts.push({ scenario: scenario.id, width, expectedMonths: scenario.months, observedCards,
            input: { income: scenario.income, expenses: scenario.expenses, balance: state.mortgageDetails.currentBalance,
              apr: state.mortgageDetails.currentRate, payment: state.mortgageDetails.currentMonthlyPayment, loc: state.loc },
            errors, overflow, savedTimingPreserved: true });
          console.log(`PASS Vault ${scenario.id} at ${width}px`);
        } finally { await context.close(); }
      }
    }
    fs.writeFileSync(path.join(evidenceDir, 'verification.json'), `${JSON.stringify({ origin, receipts }, null, 2)}\n`);
  } finally {
    await browser?.close();
    await stopServer(server?.server);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
