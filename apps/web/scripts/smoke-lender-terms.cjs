/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { startBuiltServer, stopServer } = require('./built-server-harness.cjs');
const root = path.resolve(__dirname, '..');
const keys = { legacy: 'interestshield-portfolio-v1', old: 'interestshield-portfolio-v2', active: 'interestshield-portfolio-v3' };
const book = { monthlyIncome: 8200, monthlyExpenses: 4700, extraMonthlyPayment: 0, chunkAmount: 1000,
  loc: { limit: 25000, balance: 3200, apr: .085 }, strategy: 'velocity', focusMode: 'single', splitRatioPrimary: .7,
  debts: [{ id: 'lender-source', name: 'Loan', category: 'auto', kind: 'amortized', balance: 18450, apr: .069,
    minPaymentRule: { type: 'fixed', amount: 425 }, paymentSource: 'checking' }] };
const original = ' \n' + JSON.stringify({ version: 1, state: book }, null, 4) + '\n';
const old = JSON.stringify({ version: 2, aprUnit: 'decimal', data: book }, null, 3) + '\n';
async function exportDocument(page) {
  const pending = page.waitForEvent('download'); await page.getByTestId('portfolio-export-backup').click();
  const downloaded = await pending; return JSON.parse(fs.readFileSync(await downloaded.path(), 'utf8'));
}
async function runLenderTermsFixtures({ browser, origin, output = path.join(root, 'test-results/lender-terms') }) {
  fs.mkdirSync(output, { recursive: true }); const receipts = [];
  for (const width of [280, 375, 1440]) for (const name of ['editor-lifecycle', 'explicit3-adoption', 'corrupt-active3', 'failed-adoption', 'legacy-unsupported']) {
    const scenario = { monthlyIncome: 8111, monthlyExpenses: 4222, ...(name === 'legacy-unsupported' ? { loc: { lenderTerms: { annualFee: 75 } } } : {}) };
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
    await context.addInitScript(({ keys, original, old, name, scenario }) => {
      if (!localStorage.getItem('lender-seeded')) {
        localStorage.setItem(keys.legacy, original); localStorage.setItem(keys.old, old);
        localStorage.setItem('velocity-bank-storage', JSON.stringify({ version: 0, state: scenario }));
        if (name === 'corrupt-active3') localStorage.setItem(keys.active, '{broken active3');
        localStorage.setItem('lender-seeded', 'yes');
      }
      if (name === 'failed-adoption') {
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          if (key === keys.active) throw new DOMException('Synthetic active3 quota failure', 'QuotaExceededError');
          return set.call(this, key, value);
        };
      }
    }, { keys, original, old, name, scenario });
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    try {
      assert.equal((await page.goto(`${origin}/${name === 'legacy-unsupported' ? '' : 'portfolio'}`, { waitUntil: 'networkidle' })).status(), 200);
      if (name === 'legacy-unsupported') {
        assert.equal(await page.getByTestId('legacy-scenario-storage-error').count(), 1);
        await page.getByRole('link', { name: 'Open separate Portfolio', exact: true }).click();
        assert.match(await page.getByTestId('forecast-basis').innerText(), /Model estimate/);
        assert.equal(await page.getByTestId('legacy-scenario-storage-error').count(), 0);
      } else if (name === 'corrupt-active3') {
        assert.equal(await page.getByTestId('portfolio-storage-error').count(), 1);
        assert.equal(await page.getByTestId('portfolio-payoff-summary').count(), 0);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), keys.active), '{broken active3');
      } else {
        assert.equal(await page.getByTestId('forecast-basis').count(), 1, 'normal Portfolio must disclose its actual forecast basis');
        assert.match(await page.getByTestId('forecast-basis').innerText(), /Model estimate/);
        if (name === 'explicit3-adoption') {
          await page.getByTestId('portfolio-import-backup-json').fill(JSON.stringify({ version: 3, aprUnit: 'decimal', data: book }));
          await page.getByTestId('portfolio-import-backup-json-submit').click();
          await page.getByRole('status').filter({ hasText: /Import complete/ }).waitFor({ state: 'visible' });
          assert.equal((await exportDocument(page)).version, 3);
          await page.reload({ waitUntil: 'networkidle' }); assert.equal((await exportDocument(page)).version, 3);
        } else {
          const baseline = await page.getByTestId('portfolio-payoff-summary').innerText();
          await page.getByText('Lender terms', { exact: true }).click();
          assert.equal(await page.getByLabel('Lender annual fee', { exact: true }).inputValue(), '');
          await page.getByLabel('Lender annual fee', { exact: true }).fill('0');
          await page.getByLabel('Lender minimum payment mode', { exact: true }).selectOption('fixed');
          await page.getByLabel('Lender minimum payment amount', { exact: true }).fill('50');
          await page.getByRole('button', { name: 'Save lender terms', exact: true }).click();
          if (name === 'failed-adoption') {
            await page.getByTestId('portfolio-storage-error').waitFor({ state: 'visible' });
            assert.equal(await page.getByTestId('portfolio-payoff-summary').count(), 0);
            assert.equal(await page.evaluate(key => localStorage.getItem(key), keys.active), null);
          } else {
            await page.getByTestId('forecast-basis').filter({ hasText: /Terms incomplete/ }).waitFor({ state: 'visible' });
            const first = await exportDocument(page); assert.equal(first.version, 3);
            assert.equal(first.data.loc.lenderTerms.annualFee, 0); assert.equal(first.data.loc.lenderTerms.minimumPayment.value, 50);
            await page.reload({ waitUntil: 'networkidle' }); await page.getByText('Lender terms', { exact: true }).click();
            assert.equal(await page.getByLabel('Lender annual fee', { exact: true }).inputValue(), '0');
            await page.getByLabel('Lender transaction fee', { exact: true }).fill('1.25');
            await page.getByLabel('Lender rate type', { exact: true }).selectOption('fixed');
            await page.getByLabel('Lender draw period', { exact: true }).fill('120');
            await page.getByLabel('Lender repayment period', { exact: true }).fill('180');
            await page.getByLabel('Lender minimum draw', { exact: true }).fill('0');
            for (const field of ['annual fee','transaction fee','rate type','draw period','repayment period','minimum draw','minimum payment']) {
              await page.getByLabel(`Lender ${field} source`, { exact: true }).selectOption('lender-document');
            }
            await page.getByRole('button', { name: 'Save lender terms', exact: true }).click();
            await page.getByTestId('forecast-basis').filter({ hasText: /Terms not modeled/ }).waitFor({ state: 'visible' });
            assert.match(await page.getByTestId('portfolio-payoff-summary').innerText(), /Review inputs/);
            const captured = await exportDocument(page); assert.equal(captured.data.loc.lenderTerms.transactionFeePercent, .0125);
            assert.equal(Object.keys(captured.data.loc.lenderTerms.sources).length, 7);
            await page.getByText('Lender terms', { exact: true }).click();
            await page.screenshot({ path: path.join(output, `complete-review-${width}.png`), fullPage: true });
            await page.getByRole('link', { name: 'Compare strategies', exact: true }).click();
            await page.getByTestId('portfolio-simulator').waitFor({ state: 'visible' });
            assert.match(await page.getByTestId('forecast-basis').innerText(), /Terms not modeled/);
            for (const strategy of ['velocity','snowball','avalanche']) assert.equal(await page.getByTestId(`simulator-payoff-${strategy}`).innerText(), 'Review inputs');
            await page.getByRole('link', { name: 'Portfolio dashboard', exact: true }).click();
            await page.getByTestId('shared-portfolio-dashboard').waitFor({ state: 'visible' });
            assert.match(await page.getByTestId('forecast-basis').innerText(), /Terms not modeled/);
            assert.doesNotMatch(await page.getByTestId('shared-portfolio-dashboard').innerText(), /Send \$/);
            await page.getByRole('link', { name: 'Edit portfolio', exact: true }).click();
            await page.getByText('Lender terms', { exact: true }).click();
            await page.getByRole('button', { name: 'Remove lender profile', exact: true }).click();
            await page.getByTestId('forecast-basis').filter({ hasText: /Model estimate/ }).waitFor({ state: 'visible' });
            const removed = await exportDocument(page); assert.equal(removed.version, 3); assert.equal('lenderTerms' in removed.data.loc, false);
            assert.equal(await page.getByTestId('portfolio-payoff-summary').innerText(), baseline);
            await page.reload({ waitUntil: 'networkidle' }); assert.deepEqual(await exportDocument(page), removed);
          }
        }
      }
      assert.equal(await page.evaluate(key => localStorage.getItem(key), keys.old), old);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), keys.legacy), original);
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('velocity-bank-storage')).state), scenario);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(errors, []); await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
      receipts.push({ name: `lender-${name}`, width, passed: true });
    } catch (error) {
      receipts.push({ name: `lender-${name}`, width, passed: false, message: error.message, errors });
      await page.screenshot({ path: path.join(output, `${name}-${width}-failure.png`), fullPage: true }).catch(() => {});
    } finally { await context.close(); }
  }
  fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ origin, receipts }, null, 2) + '\n');
  for (const receipt of receipts) console.log(`${receipt.passed ? 'PASS' : 'FAIL'} ${receipt.name} ${receipt.width}px${receipt.message ? ': ' + receipt.message : ''}`);
  assert.equal(receipts.filter(receipt => !receipt.passed).length, 0, 'lender browser workflows must pass'); return receipts;
}
module.exports = { runLenderTermsFixtures };
async function main() {
  let server, browser;
  try {
    server = process.env.LENDER_TERMS_ORIGIN ? null : await startBuiltServer(root);
    browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true, args: getHeadlessChromiumArgs() });
    await runLenderTermsFixtures({ browser, origin: process.env.LENDER_TERMS_ORIGIN ?? server.origin, output: process.env.LENDER_TERMS_OUTPUT });
  } finally { await browser?.close(); await stopServer(server?.server); }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
