const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const key = 'interestshield.mobile.assumptions.v1';
const seed = { monthlyIncome: 8200.75, monthlyExpenses: 4700.25, chunkAmount: 1000.55,
  activeDebtName: 'Precision fixture', activeDebt: { balance: 120.7, apr: 0.070123456789,
    monthlyPayment: 425.15, termMonths: 60 }, loc: { limit: 25000.99, balance: 3200.25, apr: 0.085123456789 } };

async function stored(page) {
  return page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)), key);
}

module.exports = async function verifyFinancialInputs(browser, origin, outputDirectory) {
  const receipts = [];
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(({ key, seed }) => {
      if (!sessionStorage.getItem('precision-fixture-seeded')) {
        localStorage.setItem(key, JSON.stringify({ version: 1, ownerId: null, revision: 7,
          savedAt: '2026-10-21T00:00:00Z', input: seed }));
        sessionStorage.setItem('precision-fixture-seeded', 'yes');
      }
    }, { key, seed });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    try {
      await page.goto(origin, { waitUntil: 'networkidle' });
      const balance = page.getByLabel('Active debt balance', { exact: true });
      await balance.waitFor({ state: 'visible' });
      await page.waitForFunction(() => {
        const input = document.querySelector('input[aria-label="Active debt balance"]');
        return input && !input.disabled && !input.readOnly;
      });
      assert.equal(await balance.inputValue(), '120.7', 'native debt balance must display saved cents');
      const before = await stored(page);
      assert.deepEqual(before.input, seed);
      await page.evaluate(() => {
        window.__precisionEvents = [];
        for (const event of ['focusin', 'focusout', 'input', 'selectionchange']) document.addEventListener(event, e => {
          const el = e.target?.tagName === 'INPUT' ? e.target : document.activeElement;
          if (el?.getAttribute?.('aria-label') === 'Active debt balance') window.__precisionEvents.push({ event,
            value: el.value, start: el.selectionStart, end: el.selectionEnd, connected: el.isConnected, time: performance.now() });
        }, true);
      });
      for (const label of ['Monthly income', 'Monthly expenses', 'Velocity chunk amount', 'Line of credit limit',
        'Line of credit balance', 'Active debt balance', 'Active debt monthly payment', 'Line of credit APR',
        'Active debt APR', 'Active debt term months']) {
        const field = page.getByLabel(label, { exact: true });
        await field.focus(); await field.press('Tab');
      }
      assert.deepEqual(await stored(page), before, 'no-op edits must preserve exact values and storage revision');

      await balance.fill('');
      await balance.pressSequentially('120.70', { delay: 20 });
      assert.equal(await balance.inputValue(), '120.70', 'an incomplete decimal must remain editable');
      assert.deepEqual(await stored(page), before, 'draft edits must not persist intermediate amounts');
      await balance.press('Tab');
      assert.equal((await stored(page)).input.activeDebt.balance, 120.7);

      const income = page.getByLabel('Monthly income', { exact: true });
      await income.fill('8300.45'); await income.press('Enter');
      await page.waitForFunction(storageKey => JSON.parse(localStorage.getItem(storageKey)).input.monthlyIncome === 8300.45, key);
      const edited = await stored(page);
      assert.deepEqual(edited.input, { ...seed, monthlyIncome: 8300.45 });
      assert.equal(edited.revision, before.revision + 1, 'submit plus blur must commit exactly once');

      const apr = page.getByLabel('Active debt APR', { exact: true });
      await apr.fill(''); await apr.pressSequentially('7.123456789', { delay: 5 });
      assert.equal(await apr.inputValue(), '7.123456789');
      assert.deepEqual(await stored(page), edited, 'APR draft must remain local until committed');
      await apr.press('Tab');
      await page.waitForFunction(storageKey => JSON.parse(localStorage.getItem(storageKey)).input.activeDebt.apr === 0.07123456789, key);
      const precise = await stored(page);
      for (const invalid of ['', '.', '-5', '12..3', '1e999']) {
        await balance.fill(invalid); await balance.press('Tab');
        assert.deepEqual(await stored(page), precise, `invalid draft ${JSON.stringify(invalid)} must not alter saved assumptions`);
        assert.equal(await balance.inputValue(), '120.7');
        assert.ok(await page.getByText('Enter a valid non-negative number.', { exact: true }).isVisible());
      }
      for (const [invalid, message] of [['100000000000000.01', 'Value exceeds supported precision.'],
        ['120,700', 'Use a period for decimals.'], ['0,125', 'Use a period for decimals.']]) {
        await balance.fill(invalid); await balance.press('Tab');
        assert.deepEqual(await stored(page), precise);
        assert.equal(await balance.inputValue(), '120.7');
        assert.ok(await page.getByText(message, { exact: true }).isVisible());
      }
      const term = page.getByLabel('Active debt term months', { exact: true });
      for (const invalid of ['12.5', '12.0000000000000001']) {
        await term.fill(invalid); await term.press('Tab');
        assert.deepEqual(await stored(page), precise, 'fractional term must not silently round');
      }

      await page.getByRole('tab', { name: 'Portfolio mobile section' }).click();
      await page.waitForURL(`${origin}/portfolio`);
      await page.getByRole('tab', { name: 'Dashboard mobile section' }).click();
      await page.waitForURL(`${origin}/`);
      await page.reload({ waitUntil: 'networkidle' });
      assert.deepEqual(await stored(page), precise, 'navigation/reload must retain committed precision and unrelated values');
      assert.equal(await page.getByLabel('Active debt balance', { exact: true }).inputValue(), '120.7');
      assert.equal(await page.getByLabel('Monthly income', { exact: true }).inputValue(), '8300.45');
      assert.deepEqual(errors, []);
      await page.getByLabel('Active debt balance', { exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(outputDirectory, `financial-inputs-${width}.png`) });
      receipts.push({ width, noOpFields: 10, typedDecimal: '120.70', storedBalance: 120.7,
        income: 8300.45, apr: 0.07123456789, invalidDrafts: 10, savedInputsPreserved: true, errors });
      console.log(`PASS native financial inputs ${width}px: cents, APR, ten no-ops, drafts, invalid values and reload`);
    } catch (error) {
      fs.writeFileSync(path.join(outputDirectory, `financial-inputs-${width}-events.json`), JSON.stringify(await page.evaluate(() => window.__precisionEvents ?? []), null, 2));
      await page.screenshot({ path: path.join(outputDirectory, `financial-inputs-${width}-failure.png`) }).catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  fs.writeFileSync(path.join(outputDirectory, 'financial-inputs-verification.json'), JSON.stringify({ origin, receipts }, null, 2) + '\n');
};
