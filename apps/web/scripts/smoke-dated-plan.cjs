/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { startBuiltServer, stopServer } = require('./built-server-harness.cjs');
const { datedBookFixture } = require('./dated-codec-tests.cjs');
const root = path.resolve(__dirname, '..'), keys = [1, 2, 3, 4].map(v => `interestshield-portfolio-v${v}`);
const encode = (data, version) => JSON.stringify({ version, ...(version === 1 ? {} : { aprUnit: 'decimal' }), data }, null, 3) + '\n';
async function exportBook(page) {
  const pending = page.waitForEvent('download'); await page.getByTestId('portfolio-export-backup').click();
  return JSON.parse(fs.readFileSync(await (await pending).path(), 'utf8'));
}
async function fillSchedule(page) {
  await page.getByText('Dated cash schedule (optional)', { exact: true }).click();
  for (const [label, value] of [['Plan start date','2026-01-01'],['LOC opened on','2020-01-01'],['Draw period ends on (exclusive)','2030-01-01'],
    ['LOC matures on','2045-01-01'],['First annual fee due on','2020-01-01'],['Opening checking cash ($)','0'],['Protected cash reserve ($)','0'],
    ['Outstanding statement minimum ($)','0'],['LOC minimum due day','15'],['Other debt payment day','25']]) await page.getByLabel(label, { exact: true }).fill(value);
  for (const [index, kind, amount] of [[1,'income','500'],[2,'expense','200']]) {
    await page.getByRole('button', { name: 'Add cash entry', exact: true }).click();
    await page.getByLabel(`Cash entry ${index} type`, { exact: true }).selectOption(kind);
    await page.getByLabel(`Cash entry ${index} day`, { exact: true }).fill('1');
    await page.getByLabel(`Cash entry ${index} amount`, { exact: true }).fill(amount);
    if (kind === 'expense') await page.getByLabel(`Cash entry ${index} funding`, { exact: true }).selectOption('loc');
  }
  await page.getByRole('button', { name: 'Save dated schedule', exact: true }).click();
}
async function lifecycle(page, output, width) {
  assert.match(await page.getByTestId('forecast-basis').innerText(), /Terms not modeled/);
  await fillSchedule(page);
  assert.equal(await page.getByTestId('forecast-basis').getAttribute('data-basis'), 'lender-dated');
  assert.match(await page.getByTestId('portfolio-payoff-summary').innerText(), /2026-04-30/);
  assert.equal(await page.getByTestId('portfolio-total-fees').innerText(), 'Modeled fees: $33.00');
  assert.match(await page.getByTestId('portfolio-payoff-summary').innerText(), /Interest est\. \$31\.07/);
  assert.match(await page.getByTestId('dated-ledger').innerText(), /Accepted through 2026-04-30/);
  let saved = await exportBook(page); assert.equal(saved.version, 4); assert.equal(saved.data.datedPlan.cashEvents[0].kind, 'income');
  assert.equal(saved.data.datedPlan.cashEvents[1].source, 'loc');
  await page.getByText('Lender terms', { exact: true }).click();
  assert.equal(await page.getByLabel('Lender transaction fee', { exact: true }).inputValue(), '1');
  await page.getByLabel('Lender transaction fee', { exact: true }).fill('1.25');
  await page.getByRole('button', { name: 'Save lender terms', exact: true }).click();
  assert.equal((await exportBook(page)).data.loc.lenderTerms.transactionFeePercent, .0125);
  assert.match(await page.getByRole('region', { name: 'Dated postings', exact: true }).innerText(), /\$2\.50/);
  await page.getByLabel('Lender transaction fee', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Save lender terms', exact: true }).click();
  saved = await exportBook(page); assert.equal(saved.data.loc.lenderTerms.transactionFeePercent, .01);
  assert.equal(saved.data.loc.lenderTerms.sources.transactionFeePercent, 'user-provided');
  await page.getByText('Lender terms', { exact: true }).click();
  const raw = await page.evaluate(key => localStorage.getItem(key), keys[3]);
  await page.getByLabel('Opening checking cash ($)', { exact: true }).fill('0.001');
  await page.getByRole('button', { name: 'Save dated schedule', exact: true }).click();
  assert.match(await page.getByTestId('dated-plan-form').getByRole('alert').innerText(), /two decimal places/);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), keys[3]), raw);
  await page.reload({ waitUntil: 'networkidle' }); assert.deepEqual(await exportBook(page), saved);
  await page.getByLabel('Comparison month', { exact: true }).fill('4');
  assert.equal(await page.getByTestId('common-month-cash-velocity').innerText(), '$235.93');
  assert.match(await page.getByTestId('common-month-period').innerText(), /2026-04-30/);
  await page.getByRole('link', { name: 'Compare strategies', exact: true }).click();
  assert.equal(await page.getByTestId('forecast-basis').getAttribute('data-basis'), 'lender-dated');
  assert.equal(await page.getByTestId('simulator-payoff-velocity').innerText(), '2026-04-30');
  assert.equal(await page.getByTestId('simulator-fees-velocity').innerText(), 'Fees at own payoff: $33.00');
  await page.getByRole('link', { name: 'Portfolio dashboard', exact: true }).click();
  assert.equal(await page.getByTestId('forecast-basis').getAttribute('data-basis'), 'lender-dated');
  assert.equal(await page.getByTestId('shared-value-eta').innerText(), '2026-04-30');
  await page.getByRole('link', { name: 'Edit portfolio', exact: true }).click();
  await page.getByText('Dated cash schedule (saved)', { exact: true }).click();
  await page.getByRole('button', { name: 'Remove dated schedule', exact: true }).click();
  const removed = await exportBook(page); assert.equal(removed.version, 4); assert.equal('datedPlan' in removed.data, false);
  assert.match(await page.getByTestId('forecast-basis').innerText(), /Terms not modeled/);
  await page.getByTestId('portfolio-import-backup-json').fill(JSON.stringify(saved));
  await page.getByTestId('portfolio-import-backup-json-submit').click();
  await page.getByRole('status').filter({ hasText: 'Import complete.' }).waitFor({ state: 'visible' });
  assert.deepEqual(await exportBook(page), saved);
  await page.getByTestId('portfolio-payoff-summary').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, `dated-summary-${width}.png`) });
  await page.getByTestId('dated-ledger').getByText('Daily interest balances', { exact: true }).click();
  assert.match(await page.getByRole('region', { name: 'Daily accrual balances', exact: true }).innerText(), /627/);
  await page.getByTestId('dated-ledger').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, `dated-ledger-${width}.png`) });
  return { saved4: true, editorFeeUnits: '1%=.01,1.25%=.0125', invalidDraftNotSaved: true, reload: true, actualDateAndFeesAcrossRoutes: true, exactCash: 235.93, stickyRemovalAndImport: true };
}
async function staleSource(page, context, origin, value, importInstead) {
  const previous = await exportBook(page), other = await context.newPage();
  try {
    await other.goto(origin + '/portfolio', { waitUntil: 'networkidle' });
    const changed = structuredClone(value); changed.datedPlan.openingCash = 100; changed.datedPlan.cashReserve = 75;
    await other.getByTestId('portfolio-import-backup-json').fill(encode(changed, 4));
    await other.getByTestId('portfolio-import-backup-json-submit').click();
    await other.getByRole('status').filter({ hasText: 'Import complete.' }).waitFor({ state: 'visible' });
    const external = await other.evaluate(key => localStorage.getItem(key), keys[3]);
    if (importInstead) {
      await page.getByTestId('portfolio-import-backup-json').fill(JSON.stringify(previous));
      await page.getByTestId('portfolio-import-backup-json-submit').click();
    } else {
      await page.getByRole('button', { name: /^Edit Portfolio monthly income,/ }).click();
      await page.getByLabel('Portfolio monthly income value', { exact: true }).fill('800');
      await page.getByLabel('Portfolio monthly income value', { exact: true }).press('Enter');
    }
    await page.getByTestId('portfolio-storage-error').waitFor({ state: 'visible' });
    assert.match(await page.getByTestId('portfolio-storage-error').innerText(), /changed in another tab/);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), keys[3]), external);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('Dated cash schedule (saved)', { exact: true }).click();
    assert.equal(await page.getByLabel('Opening checking cash ($)', { exact: true }).inputValue(), '100');
    assert.equal(await page.getByLabel('Protected cash reserve ($)', { exact: true }).inputValue(), '75');
    return { staleOperation: importInstead ? 'same-data-import' : 'ordinary-edit', newerBytesPreserved: true, explicitReloadAdoptsNewerBook: true };
  } finally { await other.close(); }
}
async function runDatedPlanFixtures({ browser, origin, output = path.join(root, 'test-results/dated-plan') }) {
  fs.mkdirSync(output, { recursive: true }); const receipts = [], resources = { opened: 0, closed: 0 }, runId = randomUUID();
  for (const width of [280, 375, 1440]) for (const name of ['editor-lifecycle','corrupt4','quota4','fee-capacity','reserve-minimum','closed-cash','order-capacity','stale-edit','stale-import']) {
    const value = datedBookFixture(), old = structuredClone(value); delete old.datedPlan; delete old.loc.lenderTerms;
    const archived = [encode(old, 1), encode(old, 2), encode({ ...value, datedPlan: undefined }, 3)];
    if (name === 'fee-capacity') value.loc.limit = 900;
    if (name === 'order-capacity') value.loc.limit = 1000;
    if (name === 'reserve-minimum') { value.monthlyIncome = 0; value.monthlyExpenses = 0; value.datedPlan.cashEvents = [];
      value.loc.lenderTerms.annualFee = 0; value.loc.lenderTerms.transactionFeePercent = 0; value.datedPlan.openingCash = 50;
      value.datedPlan.cashReserve = 50; value.datedPlan.openingMinimumPayment = 50; value.datedPlan.minimumDueDay = 1; }
    if (name === 'closed-cash') { value.loc.balance = 0; value.monthlyIncome = 0; value.monthlyExpenses = 100;
      value.datedPlan.openingCash = 200; value.datedPlan.cashReserve = 150;
      value.datedPlan.cashEvents = [{ id: 'bill', day: 1, kind: 'expense', amount: 100, source: 'loc' }]; }
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true }); resources.opened++;
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
    await context.addInitScript(({ keys, archived, value, name }) => {
      if (!localStorage.getItem('dated-fixture-seeded')) {
        archived.forEach((raw, i) => localStorage.setItem(keys[i], raw));
        if (!['editor-lifecycle','quota4'].includes(name)) localStorage.setItem(keys[3], name === 'corrupt4' ? '{broken4' : JSON.stringify({ version: 4, aprUnit: 'decimal', data: value }));
        localStorage.setItem('dated-fixture-seeded', 'yes');
      }
      if (name === 'quota4') { const set = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) {
        if (key === keys[3]) throw new DOMException('Synthetic active4 quota failure', 'QuotaExceededError'); return set.call(this, key, value); }; }
    }, { keys, archived, value, name });
    const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    try {
      assert.equal((await page.goto(origin + '/portfolio', { waitUntil: 'networkidle' })).status(), 200);
      let details = {};
      if (name === 'editor-lifecycle') details = await lifecycle(page, output, width);
      else if (name === 'stale-edit' || name === 'stale-import') details = await staleSource(page, context, origin, value, name === 'stale-import');
      else if (name === 'corrupt4' || name === 'quota4') {
        if (name === 'quota4') await fillSchedule(page);
        await page.getByTestId('portfolio-storage-error').waitFor({ state: 'visible' });
        assert.equal(await page.getByTestId('portfolio-payoff-summary').count(), 0);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), keys[3]), name === 'corrupt4' ? '{broken4' : null);
      } else if (name === 'order-capacity') {
        assert.match(await page.getByTestId('portfolio-payoff-summary').innerText(), /2026-04-30/);
        await page.getByText('Dated cash schedule (saved)', { exact: true }).click();
        await page.getByRole('button', { name: 'Move entry 2 up', exact: true }).click();
        await page.getByRole('button', { name: 'Save dated schedule', exact: true }).click();
        assert.match(await page.getByTestId('portfolio-payoff-summary').innerText(), /Review inputs/);
        assert.match(await page.getByTestId('dated-ledger').innerText(), /Stopped 2026-01-01/);
        assert.equal((await exportBook(page)).data.datedPlan.cashEvents[0].kind, 'expense');
        await page.reload({ waitUntil: 'networkidle' });
        assert.match(await page.getByTestId('portfolio-payoff-summary').innerText(), /Review inputs/);
        await page.getByText('Dated cash schedule (saved)', { exact: true }).click();
        await page.getByRole('button', { name: 'Move entry 2 up', exact: true }).click();
        await page.getByRole('button', { name: 'Save dated schedule', exact: true }).click();
        assert.match(await page.getByTestId('portfolio-payoff-summary').innerText(), /2026-04-30/);
        details = { expenseBeforeIncomeRejected: true, reloadedOrderPreserved: true, incomeFirstRestoresEstimate: true };
      } else if (name === 'closed-cash') {
        await page.getByLabel('Comparison month', { exact: true }).fill('1');
        for (const strategy of ['velocity','snowball','avalanche']) {
          assert.equal(await page.getByTestId(`common-month-cash-${strategy}`).innerText(), 'Not available');
          assert.match(await page.getByTestId(`common-month-plan-${strategy}`).innerText(), /2026-01-01/);
        }
      } else {
        assert.match(await page.getByTestId('portfolio-payoff-summary').innerText(), /Review inputs/);
        assert.equal(await page.getByTestId('portfolio-path-progress').innerText(), 'Not projected');
        assert.match(await page.getByTestId('dated-ledger').innerText(), name === 'fee-capacity' ? /exceeds the entered credit limit/ : /statement minimum is unfunded/);
        assert.match(await page.getByTestId('dated-ledger').innerText(), /Accepted through None/);
      }
      for (let i = 0; i < 3; i++) assert.equal(await page.evaluate(key => localStorage.getItem(key), keys[i]), archived[i]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'no page-wide overflow');
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
      receipts.push({ name, width, passed: true, details, errors }); console.log(`PASS dated workflow ${name} ${width}px`);
    } catch (error) { receipts.push({ name, width, passed: false, message: error.message, errors }); console.error(error.stack);
      await page.screenshot({ path: path.join(output, `${name}-${width}-failure.png`), fullPage: true }).catch(() => {});
    } finally { await context.close(); resources.closed++; }
  }
  const screenshots = fs.readdirSync(output).filter(file => file.endsWith('.png')).map(file => { const bytes = fs.readFileSync(path.join(output, file)); return { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; });
  fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ runId, origin, receipts, resources, screenshots }, null, 2) + '\n');
  assert.equal(receipts.length, 27); assert.ok(receipts.every(r => r.passed), 'All dated browser workflows must pass'); return receipts;
}
module.exports = { runDatedPlanFixtures };
async function main() { let browser, server; try {
  server = process.env.DATED_PLAN_ORIGIN ? null : await startBuiltServer(root);
  browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true, args: getHeadlessChromiumArgs() });
  await runDatedPlanFixtures({ browser, origin: process.env.DATED_PLAN_ORIGIN ?? server.origin, output: process.env.DATED_PLAN_OUTPUT });
} finally { await browser?.close(); await stopServer(server?.server); } }
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
