/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { startBuiltServer, stopServer } = require('./built-server-harness.cjs');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results/dashboard-interest');
const scenarios = [
  { id: 'house', balance: 285000, apr: 0.065, locBalance: 3200, locApr: 0.085,
    value: 'Est. $51.50/day', caption: 'Debt: $50.75/day; LOC: $0.75/day.' },
  { id: 'auto', balance: 18450, apr: 0.069, locBalance: 3200, locApr: 0.085,
    value: 'Est. $4.23/day', caption: 'Debt: $3.49/day; LOC: $0.75/day.' },
  { id: 'cleared', balance: 0, apr: 0.065, locBalance: 0, locApr: 0.085,
    value: 'Est. $0.00/day', caption: 'Debt: $0.00/day; LOC: $0.00/day.' },
  { id: 'sub-cent', balance: 1, apr: 0.01, locBalance: 0, locApr: 0,
    value: 'Est. <$0.01/day', caption: 'Debt: <$0.01/day; LOC: $0.00/day.' },
  { id: 'cent-mismatch', balance: 1236, apr: 0.365, locBalance: 236, locApr: 0.365,
    value: 'Est. $1.47/day', caption: 'Debt: $1.24/day; LOC: $0.24/day.' },
  { id: 'large-import', balance: 100000000, apr: 0.365, locBalance: 100000000, locApr: 0.365,
    income: 100000001, expenses: 10000001, chunk: 20000001, minimum: 10000001,
    value: 'Est. $200,000.00/day', caption: 'Debt: $100,000.00/day; LOC: $100,000.00/day.' },
];

async function storedInputs(page) {
  return page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('velocity-bank-storage')).state;
    return { debts: s.debts, loc: s.loc, income: s.monthlyIncome, expenses: s.monthlyExpenses,
      chunk: s.chunkAmount, frequency: s.chunkFrequency, mortgage: s.mortgageDetails };
  });
}

(async () => {
  let server, browser;
  try {
    const executablePath = findBrowserExecutable();
    assert.ok(executablePath, 'Chrome/Chromium executable is required');
    server = process.env.DASHBOARD_INTEREST_SMOKE_ORIGIN ? null : await startBuiltServer(root);
    const origin = process.env.DASHBOARD_INTEREST_SMOKE_ORIGIN ?? server.origin;
    browser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });
    fs.mkdirSync(output, { recursive: true });
    const receipts = [];
    for (const width of [1440, 375]) for (const scenario of scenarios) {
      const domain = scenario.id === 'auto' ? 'car' : 'house';
      const state = { activeDomain: domain, monthlyIncome: scenario.income ?? 8200, monthlyExpenses: scenario.expenses ?? 4700,
        chunkAmount: scenario.chunk ?? 1000, chunkFrequency: 'weekly',
        debts: { [domain]: { balance: scenario.balance, interestRate: scenario.apr, minimumPayment: scenario.minimum ?? 425 } },
        loc: { limit: 200000000, balance: scenario.locBalance, interestRate: scenario.locApr },
        mortgageDetails: { entryMode: 'current', currentBalance: 123456, paymentFrequency: 'biweekly' } };
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      try {
        await context.addInitScript((seed) => {
          if (localStorage.getItem('dashboard-interest-seeded')) return;
          localStorage.setItem('velocity-bank-storage', JSON.stringify({ state: seed, version: 0 }));
          localStorage.setItem('dashboard-interest-seeded', 'true');
        }, state);
        const page = await context.newPage(), errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
        const response = await page.goto(origin, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200);
        const vital = page.getByTestId(width < 768 ? 'dashboard-mobile-vital-interest-burn' : 'dashboard-vital-interest-burn');
        await vital.waitFor();
        assert.ok((await vital.textContent()).includes(scenario.value), `${scenario.id}: ${await vital.textContent()}`);
        assert.ok((await vital.textContent()).includes(scenario.caption));
        const editIncome = page.getByRole('button', { name: /^Edit Monthly income,/ });
        const changeIncome = async (value) => {
          await editIncome.click();
          const input = page.getByRole('textbox', { name: 'Monthly income value', exact: true });
          await input.fill(String(value)); await input.press('Enter');
          await page.waitForFunction(v => JSON.parse(localStorage.getItem('velocity-bank-storage')).state.monthlyIncome === v, value);
        };
        // The partial fixture gains existing default fields on its first persisted edit.
        if (scenario.id === 'large-import') {
          for (const [label, expected, read] of [
            ['Mortgage balance', scenario.balance, s => s.debts.house.balance],
            ['Mortgage minimum payment', scenario.minimum, s => s.debts.house.minimumPayment],
            ['Line of credit balance', scenario.locBalance, s => s.loc.balance],
            ['Line of credit limit', 200000000, s => s.loc.limit],
            ['Monthly income', scenario.income, s => s.income],
            ['Monthly expenses', scenario.expenses, s => s.expenses],
            ['Velocity chunk amount', scenario.chunk, s => s.chunk],
          ]) {
            await page.getByRole('button', { name: new RegExp(`^Edit ${label},`) }).click();
            const input = page.getByRole('textbox', { name: `${label} value`, exact: true });
            const displayed = await input.inputValue();
            await input.press('Enter');
            assert.equal(read(await storedInputs(page)), expected, `${label} no-op edit must preserve the imported value`);
            assert.equal(Number(displayed), expected, `${label} editor must show the actual imported value`);
          }
        }
        await changeIncome(state.monthlyIncome);
        const before = await storedInputs(page);
        assert.equal(before.debts[domain].balance, scenario.balance);
        assert.equal(before.debts[domain].interestRate, scenario.apr);
        assert.equal(before.loc.balance, scenario.locBalance);
        assert.equal(before.loc.interestRate, scenario.locApr);
        assert.equal(before.loc.limit, 200000000);
        assert.equal(before.income, state.monthlyIncome); assert.equal(before.expenses, state.monthlyExpenses);
        assert.equal(before.chunk, state.chunkAmount); assert.equal(before.frequency, 'weekly');
        assert.equal(before.mortgage.currentBalance, 123456);
        assert.equal(before.mortgage.paymentFrequency, 'biweekly');
        if (width >= 768) {
          await vital.getByText('Assumptions', { exact: true }).click();
          assert.match(await vital.innerText(), /rounded independently/);
        }
        const amount = vital.getByText(scenario.value, { exact: true });
        const bounds = await amount.evaluate((el) => {
          const range = document.createRange(); range.selectNodeContents(el);
          const r = el.getBoundingClientRect();
          return { fits: [...range.getClientRects()].every(t => t.left >= r.left - 1 && t.right <= r.right + 1),
            width: r.width, height: r.height, scroll: el.scrollWidth, client: el.clientWidth };
        });
        assert.ok(bounds.fits && bounds.scroll <= bounds.client + 1, `${scenario.id} amount overflow: ${JSON.stringify(bounds)}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(await page.locator('[data-nextjs-dialog], .vite-error-overlay').count(), 0);
        await page.waitForFunction(() => {
          let n = document.querySelector('main');
          while (n) { if (Number(getComputedStyle(n).opacity) < 0.99) return false; n = n.parentElement; }
          return true;
        });
        await page.screenshot({ path: path.join(output, `${scenario.id}-${width}.png`), fullPage: true });
        if (scenario.id === 'house') {
          await changeIncome(8300); await changeIncome(8200);
          await page.goto(`${origin}/simulator`, { waitUntil: 'networkidle' });
          await page.getByTestId('simulator-comparison-assumptions').waitFor();
          await page.goto(origin, { waitUntil: 'networkidle' });
          await page.getByRole('tab', { name: 'Switch to House domain', exact: true }).click();
          await vital.getByText(scenario.value, { exact: true }).waitFor();
        }
        assert.deepEqual(await storedInputs(page), before, 'edits/navigation must preserve all unrelated financial data');
        assert.deepEqual(errors, [], 'no browser errors');
        receipts.push({ scenario: scenario.id, width, value: scenario.value, caption: scenario.caption,
          bounds, savedInputsPreserved: true, editedAndNavigated: scenario.id === 'house',
          noOpCurrencyFields: scenario.id === 'large-import' ? 7 : 0, errors });
        console.log(`PASS Dashboard interest ${scenario.id} at ${width}px`);
      } finally { await context.close(); }
    }
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ origin, receipts }, null, 2) + '\n');
  } finally { await browser?.close(); await stopServer(server?.server); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
