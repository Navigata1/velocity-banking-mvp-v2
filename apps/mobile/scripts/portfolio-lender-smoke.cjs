const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const oldKey = 'interestshield.mobile.portfolio.v1', activeKey = 'interestshield.mobile.portfolio.v3';
const assumptionsKey = 'interestshield.mobile.assumptions.v1';
const book = { monthlyIncome: 8200, monthlyExpenses: 4700, extraMonthlyPayment: 0, chunkAmount: 1000,
  loc: { limit: 25000, balance: 3200, apr: .085 }, strategy: 'velocity', focusMode: 'single', splitRatioPrimary: .7,
  debts: [{ id: 'lender-native', name: 'Loan', category: 'auto', kind: 'amortized', balance: 18450,
    apr: .069, minPaymentRule: { type: 'fixed', amount: 425 }, paymentSource: 'checking' }] };
const old = JSON.stringify({ version: 1, ownerId: null, revision: 11, savedAt: '2026-10-22T00:00:00Z',
  document: JSON.stringify({ version: 2, aprUnit: 'decimal', data: book }, null, 3) }, null, 4);
const assumptions = JSON.stringify({ version: 1, ownerId: null, revision: 7, savedAt: '2026-10-22T00:00:00Z', input: {
  activeDebtName: 'Separate scenario', monthlyIncome: 8111, monthlyExpenses: 4222, chunkAmount: 1000,
  activeDebt: { balance: 12000, apr: .07, monthlyPayment: 300 }, loc: { limit: 25000, balance: 3200, apr: .085 },
} });

async function menu(page, label, choice) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('radio', { name: `${label} ${choice}`, exact: true }).click();
}
const exported = async page => JSON.parse(await page.getByLabel('Portfolio export JSON', { exact: true }).innerText());
const saved = async page => page.getByTestId('native-portfolio-storage-status').filter({ hasText: /^\s*Saved\b/ }).waitFor({ state: 'visible' });

async function runNativeLenderFixtures({ browser, origin, output }) {
  fs.mkdirSync(output, { recursive: true }); const receipts = [];
  for (const width of [280, 375, 1440]) for (const name of ['profile-lifecycle', 'corrupt-active3', 'failed-adoption', 'legacy-unsupported', 'misplaced-old3']) {
    const scenarioDocument = JSON.parse(assumptions);
    if (name === 'legacy-unsupported') scenarioDocument.input.loc.lenderTerms = { annualFee: 75 };
    const scenarioBytes = name === 'legacy-unsupported' ? JSON.stringify(scenarioDocument) : assumptions;
    const oldEnvelope = JSON.parse(old);
    if (name === 'misplaced-old3') oldEnvelope.document = JSON.stringify({ version: 3, aprUnit: 'decimal', data: book });
    const oldBytes = name === 'misplaced-old3' ? JSON.stringify(oldEnvelope) : old;
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
    await context.addInitScript(({ oldKey, activeKey, assumptionsKey, oldBytes, scenarioBytes, name }) => {
      if (!localStorage.getItem('native-lender-seeded')) {
        localStorage.setItem(oldKey, oldBytes); localStorage.setItem(assumptionsKey, scenarioBytes);
        if (name === 'corrupt-active3') localStorage.setItem(activeKey, '{broken active3');
        localStorage.setItem('native-lender-seeded', 'yes');
      }
      if (name === 'failed-adoption') {
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          if (key === activeKey) throw new DOMException('Synthetic native active3 quota failure', 'QuotaExceededError');
          return set.call(this, key, value);
        };
      }
    }, { oldKey, activeKey, assumptionsKey, oldBytes, scenarioBytes, name });
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    try {
      assert.equal((await page.goto(`${origin}/${name === 'legacy-unsupported' ? '' : 'portfolio'}`, { waitUntil: 'networkidle' })).status(), 200);
      if (name === 'legacy-unsupported') {
        assert.ok(await page.getByRole('alert').filter({ hasText: /unsupported|lender terms/i }).count());
        await page.goto(`${origin}/portfolio`, { waitUntil: 'networkidle' }); await saved(page);
        assert.equal(await page.getByTestId('native-forecast-basis').innerText(), 'Model estimate');
        await page.getByRole('button', { name: 'Lender terms', exact: true }).click();
        await page.getByLabel('Lender annual fee', { exact: true }).fill('0');
        await page.getByRole('button', { name: 'Save lender terms', exact: true }).click(); await saved(page);
        assert.equal((await exported(page)).version, 3);
        assert.equal(await page.getByTestId('native-forecast-basis').innerText(), 'Terms incomplete');
      } else if (name === 'corrupt-active3' || name === 'misplaced-old3') {
        assert.match(await page.getByTestId('native-portfolio-storage-status').innerText(), /Not saved|unreadable/i);
        assert.equal(await page.getByTestId('native-portfolio-book').count(), 0);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), activeKey), name === 'corrupt-active3' ? '{broken active3' : null);
      } else {
        await saved(page); assert.equal(await page.getByTestId('native-forecast-basis').count(), 1);
        assert.equal(await page.getByTestId('native-forecast-basis').innerText(), 'Model estimate');
        await page.getByRole('button', { name: 'Lender terms', exact: true }).click();
        assert.equal(await page.getByLabel('Lender annual fee', { exact: true }).inputValue(), '');
        await page.getByLabel('Lender annual fee', { exact: true }).fill('0');
        await page.getByRole('button', { name: 'Save lender terms', exact: true }).click();
        if (name === 'failed-adoption') {
          await page.getByTestId('native-portfolio-storage-status').filter({ hasText: /Not saved/ }).waitFor({ state: 'visible' });
          assert.equal(await page.evaluate(key => localStorage.getItem(key), activeKey), null);
          assert.equal(await page.getByTestId('native-forecast-basis').innerText(), 'Model estimate');
        } else {
          await saved(page); assert.equal(await page.getByTestId('native-forecast-basis').innerText(), 'Terms incomplete');
          let value = await exported(page); assert.equal(value.version, 3); assert.equal(value.data.loc.lenderTerms.annualFee, 0);
          await page.reload({ waitUntil: 'networkidle' }); await saved(page);
          await page.getByRole('button', { name: 'Lender terms', exact: true }).click();
          assert.equal(await page.getByLabel('Lender annual fee', { exact: true }).inputValue(), '0');
          await page.getByLabel('Lender transaction fee', { exact: true }).fill('1.25');
          await menu(page, 'Lender rate type', 'Fixed');
          await page.getByLabel('Lender draw period', { exact: true }).fill('120');
          await page.getByLabel('Lender repayment period', { exact: true }).fill('180');
          await page.getByLabel('Lender minimum draw', { exact: true }).fill('0');
          await menu(page, 'Lender minimum payment mode', 'Fixed amount');
          await page.getByLabel('Lender minimum payment amount', { exact: true }).fill('0');
          for (const field of ['annual fee','transaction fee','rate type','draw period','repayment period','minimum draw','minimum payment']) {
            await menu(page, `Lender ${field} source`, 'Lender document');
          }
          await page.getByRole('button', { name: 'Save lender terms', exact: true }).click(); await saved(page);
          assert.equal(await page.getByTestId('native-forecast-basis').innerText(), 'Terms not modeled');
          value = await exported(page); assert.equal(value.data.loc.lenderTerms.minimumPayment.value, 0);
          assert.equal(value.data.loc.lenderTerms.transactionFeePercent, .0125);
          assert.equal(Object.keys(value.data.loc.lenderTerms.sources).length, 7);
          assert.match(await page.getByTestId('native-portfolio-book').innerText(), /Review inputs/);
          await page.getByTestId('native-forecast-basis').scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, `complete-review-${width}.png`), fullPage: true });
          const before = await page.evaluate(key => localStorage.getItem(key), activeKey);
          await page.getByRole('button', { name: 'Save lender terms', exact: true }).click();
          assert.equal(await page.evaluate(key => localStorage.getItem(key), activeKey), before, 'unchanged terms cannot advance revision or rewrite bytes');
          await page.getByRole('button', { name: 'Remove lender profile', exact: true }).click(); await saved(page);
          const removed = await exported(page); assert.equal(removed.version, 3); assert.equal('lenderTerms' in removed.data.loc, false);
          assert.equal(await page.getByTestId('native-forecast-basis').innerText(), 'Model estimate');
          await page.reload({ waitUntil: 'networkidle' }); await saved(page); assert.deepEqual(await exported(page), removed);
        }
      }
      assert.equal(await page.evaluate(key => localStorage.getItem(key), oldKey), oldBytes, 'original Portfolio source remains byte-identical');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), assumptionsKey), scenarioBytes, 'separate scenario remains byte-identical');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(errors, []); await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
      receipts.push({ name: `lender-${name}`, width, passed: true });
    } catch (error) {
      receipts.push({ name: `lender-${name}`, width, passed: false, message: error.message, errors });
      await page.screenshot({ path: path.join(output, `${name}-${width}-failure.png`), fullPage: true }).catch(() => {});
    } finally { await context.close(); }
  }
  fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ origin, receipts }, null, 2) + '\n');
  for (const receipt of receipts) console.log(`${receipt.passed ? 'PASS' : 'FAIL'} native ${receipt.name} ${receipt.width}px${receipt.message ? ': ' + receipt.message : ''}`);
  assert.equal(receipts.filter(receipt => !receipt.passed).length, 0, 'native lender browser workflows must pass'); return receipts;
}
module.exports = { runNativeLenderFixtures };
