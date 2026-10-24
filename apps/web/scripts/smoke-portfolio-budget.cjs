/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { startBuiltServer, stopServer } = require('./built-server-harness.cjs');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results/portfolio-budget');
const loan = { id: 'smoke-loan', name: 'Smoke Loan', category: 'auto', kind: 'amortized',
  balance: 1000, apr: 0, minPaymentRule: { type: 'fixed', amount: 100 }, paymentSource: 'checking' };
const scenarios = [
  { id: 'unfunded-extra', budget: 100, cap: 200, months: '10 mo', cash: '$0' },
  { id: 'retained-cash', budget: 500, cap: 50, months: '7 mo', cash: '$2,500', editCap: true },
  { id: 'existing-loc', budget: 100, loc: { limit: 2000, balance: 500, apr: 0 }, months: '15 mo', cash: '$0', switchPolicies: true },
  { id: 'ranked-loc-cap', budget: 1000, cap: 50, balance: 10000,
    loc: { limit: 10000, balance: 5000, apr: 0 }, strategy: 'snowball', months: '100 mo', cash: '$85,000' },
  { id: 'split-ranked-loc', budget: 1200, focusMode: 'split', strategy: 'snowball',
    extraDebt: { ...loan, id: 'large', name: 'Large Loan', balance: 10000 },
    loc: { limit: 10000, balance: 2000, apr: 0 }, months: '11 mo', cash: '$200' },
  { id: 'funded-final', budget: 120.7, balance: 120, apr: 0.07, payment: 425, months: '1 mo', cash: '$0' },
  { id: 'one-cent-short', budget: 120.69, balance: 120, apr: 0.07, payment: 425, months: 'Review inputs', cash: 'Not projected' },
  { id: 'loc-interest-shortfall', budget: 100, loc: { limit: 2000, balance: 500, apr: 0.365 }, months: 'Review inputs', cash: 'Not projected' },
  { id: 'already-paid', budget: 0, balance: 0, months: 'Already paid off', cash: '$0' },
  { id: 'large-value', budget: 1000000, balance: 100000000, payment: 1000000, months: '100 mo', cash: '$0' },
  { id: 'large-loc', budget: 1000000, balance: 0,
    loc: { limit: 200000000, balance: 100000000, apr: 0 }, months: '100 mo', cash: '$0' },
  { id: 'focus-not-first-payoff', budget: 700, balance: 100, strategy: 'velocity',
    extraDebt: { ...loan, id: 'mortgage', name: 'Mortgage', balance: 1000,
      minPaymentRule: { type: 'fixed', amount: 500 } },
    loc: { limit: 2000, balance: 500, apr: 0 }, months: '3 mo', cash: '$500' },
];

(async () => {
  let server;
  let browser;
  try {
    const executablePath = findBrowserExecutable();
    assert.ok(executablePath, 'Chrome/Chromium executable is required');
    server = process.env.PORTFOLIO_BUDGET_SMOKE_ORIGIN ? null : await startBuiltServer(root);
    const origin = process.env.PORTFOLIO_BUDGET_SMOKE_ORIGIN ?? server.origin;
    browser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });
    fs.mkdirSync(output, { recursive: true });
    const receipts = [];
    for (const width of [1440, 375]) {
      for (const scenario of scenarios) {
        const debts = [{ ...loan, balance: scenario.balance ?? 1000, apr: scenario.apr ?? 0,
          minPaymentRule: { type: 'fixed', amount: scenario.payment ?? 100 } }, ...(scenario.extraDebt ? [scenario.extraDebt] : [])];
        const state = { debts, monthlyIncome: scenario.budget, monthlyExpenses: 0,
          extraMonthlyPayment: scenario.cap ?? 0, chunkAmount: 0,
          loc: scenario.loc ?? { limit: 0, balance: 0, apr: 0 }, strategy: scenario.strategy ?? 'avalanche',
          focusMode: scenario.focusMode ?? 'single', splitRatioPrimary: 0.7 };
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        try {
          await context.addInitScript(value => {
            if (localStorage.getItem('portfolio-smoke-initialized')) return;
            localStorage.setItem('interestshield-portfolio-v1', JSON.stringify({ state: value, version: 1 }));
            localStorage.setItem('velocity-bank-storage', JSON.stringify({ state: { monthlyIncome: 8111,
              monthlyExpenses: 4222, chunkFrequency: 'weekly', mortgageDetails: { paymentFrequency: 'weekly' } }, version: 0 }));
            localStorage.setItem('portfolio-smoke-initialized', 'true');
          }, state);
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          const response = await page.goto(`${origin}/portfolio`, { waitUntil: 'networkidle' });
          assert.equal(response.status(), 200);
          const summary = page.getByTestId('portfolio-payoff-summary');
          await page.waitForFunction(expected => document.querySelector('[data-testid="portfolio-payoff-summary"]')?.innerText.includes(expected), scenario.months);
          const observedSummary = await summary.innerText();
          const cash = await page.getByTestId('portfolio-cash-at-payoff').innerText();
          assert.ok(cash.includes(scenario.cash), `${scenario.id}: ${cash}`);
          const scope = await page.getByTestId('portfolio-liability-scope').innerText();
          assert.match(scope, /separate LOC balance/);
          assert.match(scope, /not a common-date wealth comparison/);
          assert.equal(await page.getByTestId('portfolio-loc-controls').isVisible(), true);
          assert.equal(await page.getByRole('button', { name: /^Edit Portfolio velocity chunk/ }).count(), state.strategy === 'velocity' && state.focusMode === 'single' ? 1 : 0);
          if (scenario.months === 'Review inputs') assert.match(await page.getByTestId('portfolio-loc-summary').innerText(), /Not projected/);
          const total = debts.reduce((sum, debt) => sum + debt.balance, 0) + state.loc.balance;
          const totalLabel = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(total);
          assert.ok((await page.getByTestId('portfolio-total-debt').innerText()).includes(totalLabel));
          const actions = [];
          if (scenario.id === 'focus-not-first-payoff') {
            assert.equal(await page.locator('[data-testid="portfolio-focus-mortgage"]:visible').count(), 1);
            assert.equal(await page.getByTestId('portfolio-focus-smoke-loan').count(), 0);
            assert.equal(await page.getByTestId('portfolio-order-current-smoke-loan').count(), 0);
            assert.equal(await page.getByTestId('portfolio-order-current-mortgage').count(), 1);
            assert.match(await page.getByTestId('portfolio-payoff-smoke-loan').innerText(), /Month 1/);
            actions.push({ focusBadgeIds: await page.locator('[data-testid^="portfolio-focus-"]:visible').evaluateAll(elements => elements.map(element => element.getAttribute('data-testid'))),
              firstPayoffText: await page.getByTestId('portfolio-payoff-smoke-loan').innerText(),
              currentTargetText: await page.getByTestId('portfolio-order-current-mortgage').innerText() });
          }
          if (scenario.id === 'large-loc') {
            for (const [label, amount] of [['limit', '$200,000,000'], ['balance', '$100,000,000']]) {
              const button = page.getByRole('button', { name: new RegExp(`^Edit Portfolio line of credit ${label}`) });
              assert.ok((await button.getAttribute('aria-label')).includes(amount), `imported LOC ${label} must not be silently clipped`);
              await button.click();
              await page.getByRole('textbox', { name: `Portfolio line of credit ${label} value`, exact: true }).press('Enter');
            }
          }
          if (scenario.id === 'large-value') {
            const balanceButton = page.getByRole('button', { name: /^Edit Smoke Loan balance/ });
            assert.ok((await balanceButton.getAttribute('aria-label')).includes('$100,000,000'), 'imported balance must not be displayed as a clipped10m value');
            await balanceButton.click();
            await page.getByRole('textbox', { name: 'Smoke Loan balance value', exact: true }).press('Enter');
          }
          if (scenario.switchPolicies) {
            for (const strategy of ['Snowball', 'Velocity Mode', 'Avalanche']) {
              await page.getByRole('button', { name: new RegExp(`^${strategy}`) }).click();
              await page.waitForFunction(() => document.querySelector('[data-testid="portfolio-payoff-summary"]')?.innerText.includes('15 mo'));
              assert.equal(await page.getByRole('button', { name: /^Edit Portfolio velocity chunk/ }).count(), strategy === 'Velocity Mode' ? 1 : 0);
              actions.push({ strategy, summary: await summary.innerText() });
            }
          }
          if (scenario.editCap) {
            await page.getByRole('checkbox', { name: 'Automatic surplus', exact: true }).check();
            await page.waitForFunction(() => document.querySelector('[data-testid="portfolio-payoff-summary"]')?.innerText.includes('2 mo'));
            await page.getByRole('checkbox', { name: 'Automatic surplus', exact: true }).uncheck();
            await page.getByRole('button', { name: /^Edit Portfolio extra debt payment/ }).click();
            await page.getByRole('textbox', { name: 'Portfolio extra debt payment value', exact: true }).fill('50');
            await page.getByRole('textbox', { name: 'Portfolio extra debt payment value', exact: true }).press('Enter');
            await page.waitForFunction(() => document.querySelector('[data-testid="portfolio-payoff-summary"]')?.innerText.includes('7 mo'));
            actions.push({ manualCap: 50, summary: await summary.innerText() });
          }
          await page.getByTestId('portfolio-cash-at-payoff').scrollIntoViewIfNeeded();
          await page.waitForFunction(() => {
            let node = document.querySelector('[data-testid="portfolio-cash-at-payoff"]');
            while (node) { if (Number(getComputedStyle(node).opacity) < 0.99) return false; node = node.parentElement; }
            return true;
          });
          const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth > innerWidth + 1,
            stats: ['portfolio-total-debt', 'portfolio-payoff-summary', 'portfolio-cash-at-payoff', 'portfolio-budget'].some(id => {
              const box = document.querySelector(`[data-testid="${id}"]`); return box.scrollWidth > box.clientWidth + 1;
            }) }));
          assert.deepEqual(overflow, { page: false, stats: false });
          const saved = await page.evaluate(() => ({ portfolio: JSON.parse(localStorage.getItem('interestshield-portfolio-v2')).data,
            legacyBytes: localStorage.getItem('interestshield-portfolio-v1'),
            separate: JSON.parse(localStorage.getItem('velocity-bank-storage')).state }));
          assert.equal(saved.legacyBytes, JSON.stringify({ state, version: 1 }), 'legacy Portfolio source stays byte-identical');
          assert.equal(saved.portfolio.monthlyIncome, scenario.budget);
          assert.equal(saved.portfolio.extraMonthlyPayment, scenario.cap ?? 0);
          assert.deepEqual(saved.portfolio.loc, state.loc);
          assert.deepEqual(saved.portfolio.debts.map(debt => debt.id), state.debts.map(debt => debt.id));
          assert.equal(saved.portfolio.debts[0].balance, state.debts[0].balance);
          assert.equal(saved.separate.monthlyIncome, 8111);
          assert.equal(saved.separate.monthlyExpenses, 4222);
          assert.equal(saved.separate.mortgageDetails.paymentFrequency, 'weekly');
          assert.deepEqual(errors, []);
          await page.screenshot({ path: path.join(output, `${scenario.id}-${width}.png`) });
          if (scenario.id === 'focus-not-first-payoff') {
            await page.locator('[data-testid="portfolio-focus-mortgage"]:visible').scrollIntoViewIfNeeded();
            await page.waitForFunction(() => {
              let node = [...document.querySelectorAll('[data-testid="portfolio-focus-mortgage"]')].find(element => element.getBoundingClientRect().width > 0);
              while (node) { if (Number(getComputedStyle(node).opacity) < 0.99) return false; node = node.parentElement; }
              return true;
            });
            await page.screenshot({ path: path.join(output, `focus-labels-${width}.png`) });
          }
          receipts.push({ scenario: scenario.id, width, input: state, observedSummary, cash, scope, actions, overflow, errors,
            savedPortfolioAndSeparateScenarioPreserved: true });
          console.log(`PASS Portfolio ${scenario.id} at ${width}px`);
        } finally { await context.close(); }
      }
    }
    fs.writeFileSync(path.join(output, 'verification.json'), `${JSON.stringify({ origin, receipts }, null, 2)}\n`);
  } finally {
    await browser?.close();
    await stopServer(server?.server);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
