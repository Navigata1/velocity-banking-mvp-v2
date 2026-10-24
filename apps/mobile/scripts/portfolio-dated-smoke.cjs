const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const keys = {
  legacy: 'interestshield.mobile.portfolio.v1',
  active3: 'interestshield.mobile.portfolio.v3',
  active4: 'interestshield.mobile.portfolio.v4',
  scenario: 'interestshield.mobile.assumptions.v1',
  seeded: 'interestshield.smoke.native-dated.seeded',
  fault: 'interestshield.smoke.native-dated.fail-write',
};
const widths = [280, 375, 1440];
const cases = ['lifecycle', 'corrupt-active4', 'failed-adoption4', 'failed-active4', 'reserve-minimum'];
// Independent declared oracle: 900 + 25 - 500 + 200 + 2 = 627; no app engine imports.
const oracle = { firstClosingLOC: 627, januaryInterest: 19.44, januaryClosingLOC: 646.44,
  totalInterest: 31.07, totalFees: 33, cashAtPayoff: 235.93, payoffDate: '2026-04-30', attemptedBalance: 1127 };
const fields = {
  'Plan start date': '2026-01-01', 'Account opened on': '2020-01-01', 'Draw ends on': '2030-01-01',
  'Matures on': '2045-01-01', 'First annual fee date': '2026-01-01', 'Opening cash': '0', 'Cash reserve': '0',
  'Opening statement minimum': '0', 'LOC minimum due day': '15', 'Other debt payment day': '15',
};
const clone = value => JSON.parse(JSON.stringify(value));
const button = (page, label) => page.getByRole('button', { name: label, exact: true });
const status = page => page.getByTestId('native-portfolio-storage-status');
const editor = page => page.getByTestId('native-dated-plan');
const ledger = page => page.getByTestId('native-dated-ledger');

function baseBook() {
  return { monthlyIncome: 500, monthlyExpenses: 200, extraMonthlyPayment: 0, chunkAmount: 0,
    loc: { limit: 2000, balance: 900, apr: .365, lenderTerms: { annualFee: 25, transactionFeePercent: .01,
      rateMode: 'fixed', drawPeriodMonths: 120, repaymentPeriodMonths: 180, minimumDraw: 0, minimumPayment: { mode: 'fixed', value: 0 } } },
    debts: [], strategy: 'velocity', focusMode: 'single', splitRatioPrimary: .7 };
}

function declaredPlan() {
  return { contract: 'fixed-loc-daily-v1', startDate: '2026-01-01', accountOpenedOn: '2020-01-01',
    drawEndsOn: '2030-01-01', maturesOn: '2045-01-01', annualFeeFirstDueOn: '2026-01-01',
    openingCash: 0, cashReserve: 0, openingMinimumPayment: 0, minimumDueDay: 15, debtPaymentDay: 15,
    cashEvents: [{ id: 'synthetic-pay', day: 1, kind: 'income', amount: 500 },
      { id: 'synthetic-bill', day: 1, kind: 'expense', amount: 200, source: 'loc' }] };
}

function envelope(book, version, revision) {
  return JSON.stringify({ version: 1, ownerId: null, revision, savedAt: '2026-10-22T00:00:00Z',
    document: JSON.stringify({ version, aprUnit: 'decimal', data: book }, null, 3) }, null, 4);
}

function fixture(name) {
  const book = baseBook();
  if (name === 'reserve-minimum') {
    book.monthlyIncome = 0; book.monthlyExpenses = 0; book.loc.apr = 0;
    Object.assign(book.loc.lenderTerms, { annualFee: 0, transactionFeePercent: 0, minimumPayment: { mode: 'fixed', value: 50 } });
  }
  const legacyBook = clone(book); delete legacyBook.loc.lenderTerms;
  const archives = { [keys.legacy]: envelope(legacyBook, 2, 7), [keys.active3]: envelope(book, 3, 11),
    [keys.scenario]: JSON.stringify({ version: 1, ownerId: null, revision: 5, savedAt: '2026-10-22T00:00:00Z', input: {
      activeDebtName: 'Separate synthetic scenario', monthlyIncome: 8111, monthlyExpenses: 4222, chunkAmount: 1000,
      activeDebt: { balance: 12000, apr: .07, monthlyPayment: 300 }, loc: { limit: 25000, balance: 3200, apr: .085 },
    } }, null, 3) };
  return { archives, book, initial4: name === 'corrupt-active4' ? '{broken native dated4'
    : name === 'failed-active4' ? envelope({ ...book, datedPlan: declaredPlan() }, 4, 12) : null };
}

async function storageReadback(page) {
  return page.evaluate(names => Object.fromEntries(names.map(key => [key, localStorage.getItem(key)])),
    [keys.legacy, keys.active3, keys.active4, keys.scenario]);
}

async function assertArchives(page, archives) {
  const stored = await storageReadback(page);
  for (const [key, raw] of Object.entries(archives)) assert.equal(stored[key], raw, `archived source changed: ${key}`);
  return stored;
}

async function exported(page) {
  return JSON.parse(await page.getByLabel('Portfolio export JSON', { exact: true }).innerText());
}

async function physical(page, version) {
  const raw = await page.evaluate(key => localStorage.getItem(key), version === 4 ? keys.active4 : keys.active3);
  assert.notEqual(raw, null, `physical${version} must exist`);
  const wrapper = JSON.parse(raw), document = JSON.parse(wrapper.document);
  assert.equal(wrapper.version, 1); assert.equal(wrapper.ownerId, null);
  assert.ok(Number.isSafeInteger(wrapper.revision) && wrapper.revision > 0);
  assert.ok(Number.isFinite(Date.parse(wrapper.savedAt)));
  assert.equal(document.version, version); assert.equal(document.aprUnit, 'decimal');
  return { raw, wrapper, document };
}

async function saved(page, version, revision) {
  await page.waitForFunction(({ key, version, revision }) => {
    try { const value = JSON.parse(localStorage.getItem(key)); return value?.revision === revision && JSON.parse(value.document).version === version; }
    catch { return false; }
  }, { key: version === 4 ? keys.active4 : keys.active3, version, revision });
  await status(page).filter({ hasText: new RegExp(`^\\s*Saved[\\s\\S]*Revision ${revision}\\.`) }).waitFor({ state: 'visible' });
  const stored = await physical(page, version);
  assert.deepEqual(await exported(page), stored.document, 'rendered export must match the durable browser wrapper');
  return stored;
}

async function surface(page) {
  const geometry = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0),
    overlay: !!document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay') }));
  assert.equal(geometry.overlay, false, 'no framework error overlay');
  assert.ok(geometry.scrollWidth <= geometry.clientWidth, `horizontal page overflow: ${JSON.stringify(geometry)}`);
  return geometry;
}

async function screenshots(page, output, stem) {
  const viewport = path.join(output, `${stem}.viewport.png`), full = path.join(output, `${stem}.full.png`);
  await page.screenshot({ path: viewport, fullPage: false, animations: 'disabled' });
  await page.screenshot({ path: full, fullPage: true, animations: 'disabled' });
  return { viewport, full };
}

async function readback(page) {
  const exportNode = page.getByLabel('Portfolio export JSON', { exact: true });
  return { url: page.url(), storage: await storageReadback(page), status: await status(page).innerText(),
    exportJSON: await exportNode.count() ? await exportNode.innerText() : null,
    basis: await page.getByTestId('native-forecast-basis').count() ? await page.getByTestId('native-forecast-basis').innerText() : null,
    ledger: await ledger(page).count() ? await ledger(page).innerText() : null };
}

async function checkpoint(page, receipt, data, output, label, focus) {
  if (focus) await focus.scrollIntoViewIfNeeded();
  await assertArchives(page, data.archives);
  const geometry = await surface(page), observed = await readback(page);
  const images = await screenshots(page, output, `${receipt.name}-${receipt.width}-${label}`);
  receipt.steps.push({ label, geometry, ...observed, screenshots: images });
}

async function openEditor(page) {
  if (await page.getByLabel('Plan start date', { exact: true }).count() === 0) await button(page, 'Dated plan').click();
  await page.getByLabel('Plan start date', { exact: true }).waitFor({ state: 'visible' });
}

async function closeEditor(page) {
  if (await page.getByLabel('Plan start date', { exact: true }).count()) await button(page, 'Dated plan').click();
}

async function fillFields(page, overrides = {}) {
  for (const [label, value] of Object.entries({ ...fields, ...overrides })) await page.getByLabel(label, { exact: true }).fill(value);
}

async function menu(page, label, choice) {
  await button(page, label).click();
  await page.getByRole('radio', { name: `${label} ${choice}`, exact: true }).click();
}

async function addEntries(page, chooseSource = true) {
  await button(page, 'Add income').click();
  await page.getByLabel('Entry 1 day', { exact: true }).fill('1');
  await page.getByLabel('Entry 1 amount', { exact: true }).fill('500');
  await button(page, 'Add expense').click();
  await page.getByLabel('Entry 2 day', { exact: true }).fill('1');
  await page.getByLabel('Entry 2 amount', { exact: true }).fill('200');
  if (chooseSource) await menu(page, 'Entry 2 source', 'LOC');
}

async function commitPlan(page, action = 'Save dated plan') {
  const before = await page.evaluate(({ active4, active3 }) => JSON.parse(localStorage.getItem(active4) ?? localStorage.getItem(active3)).revision, keys);
  await button(page, action).click();
  return saved(page, 4, before + 1);
}
async function changeFee(page, display, fraction) {
  const before = await physical(page, 4); await page.getByLabel('Lender transaction fee', { exact: true }).fill(display);
  await button(page, 'Save lender terms').click(); const after = await saved(page, 4, before.wrapper.revision + 1);
  assert.equal(after.document.data.loc.lenderTerms.transactionFeePercent, fraction); return after;
}

async function changeLimit(page, value) {
  const before = await physical(page, 4), input = page.getByLabel('Portfolio LOC limit', { exact: true });
  await input.fill(String(value)); await input.press('Tab');
  const result = await saved(page, 4, before.wrapper.revision + 1);
  assert.equal(result.document.data.loc.limit, value); return result;
}

async function assertGolden(page) {
  await ledger(page).getByText('Payoff observed 2026-04-30', { exact: true }).waitFor({ state: 'visible' });
  await ledger(page).getByText('Interest: $31.07. Fees: $33.00.', { exact: true }).waitFor({ state: 'visible' });
  await page.getByText('2026-04-30 estimated', { exact: true }).waitFor({ state: 'visible' });
  for (const [title, value] of [['Interest Estimate', '$31.07'], ['Modeled Fees', '$33.00'], ['Retained Cash at Modeled Payoff', '$235.93']]) {
    await page.getByText(title, { exact: true }).locator('..').getByText(value, { exact: true }).waitFor({ state: 'visible' });
  }
  await page.getByRole('radio', { name: 'Dated ledger view Daily balances', exact: true }).click();
  const first = await ledger(page).getByText('2026-01-01', { exact: true }).locator('..').innerText();
  const last = await ledger(page).getByText('2026-01-31', { exact: true }).locator('..').innerText();
  assert.ok(first.includes('LOC $627.00'), first); assert.ok(first.includes('Interest balance $627.00'), first);
  assert.ok(last.includes('LOC $646.44'), last);
  await page.getByRole('radio', { name: 'Dated ledger view Postings', exact: true }).click();
  for (const text of ['2026-01-01 | Annual fee | $25.00', '2026-01-01 | Draw fee | $2.00', '2026-01-31 | Statement interest | $19.44']) {
    await ledger(page).getByText(text, { exact: true }).waitFor({ state: 'visible' });
  }
  await page.getByRole('radio', { name: 'Dated ledger view Daily balances', exact: true }).click();
  return { firstDay: first, januaryClose: last, expected: oracle };
}

async function importDocument(page, text, sourceVersion) {
  const before = await physical(page, 4);
  await page.getByLabel('Portfolio import JSON', { exact: true }).fill(text);
  await button(page, 'Review imported portfolio').click();
  await page.getByTestId('native-portfolio-transfer-review').filter({ hasText: `Version ${sourceVersion} import.` }).waitFor({ state: 'visible' });
  await button(page, 'Confirm replace portfolio').click();
  return saved(page, 4, before.wrapper.revision + 1);
}

async function lifecycle(page, receipt, data, output) {
  await saved(page, 3, 11); await openEditor(page);
  for (const label of Object.keys(fields)) assert.equal(await page.getByLabel(label, { exact: true }).inputValue(), '', `no guessed ${label}`);
  assert.equal(await page.getByLabel('Entry 1 day', { exact: true }).count(), 0);
  await fillFields(page, { 'Plan start date': '2026-02-30' }); await addEntries(page, false);
  await button(page, 'Save dated plan').click();
  await editor(page).getByRole('alert').filter({ hasText: /invalid calendar date/i }).waitFor({ state: 'visible' });
  assert.equal(await page.getByLabel('Plan start date', { exact: true }).inputValue(), '2026-02-30');
  assert.equal((await storageReadback(page))[keys.active4], null); await assertArchives(page, data.archives); await surface(page);
  await page.getByLabel('Plan start date', { exact: true }).fill('2026-01-01'); await button(page, 'Save dated plan').click();
  await editor(page).getByRole('alert').filter({ hasText: /routing/i }).waitFor({ state: 'visible' });
  assert.equal((await storageReadback(page))[keys.active4], null); await assertArchives(page, data.archives);
  await menu(page, 'Entry 2 source', 'LOC'); await page.getByLabel('Opening cash', { exact: true }).fill('0.001');
  await button(page, 'Save dated plan').click();
  await editor(page).getByRole('alert').filter({ hasText: /exact cents/i }).waitFor({ state: 'visible' });
  assert.equal(await page.getByLabel('Opening cash', { exact: true }).inputValue(), '0.001');
  assert.equal((await exported(page)).version, 3); assert.equal((await storageReadback(page))[keys.active4], null);
  await checkpoint(page, receipt, data, output, 'invalid-unsaved', editor(page).getByRole('alert'));
  await page.getByLabel('Opening cash', { exact: true }).fill('0');
  assert.equal((await storageReadback(page))[keys.active4], null, 'complete valid drafts are not autosaved');
  let adopted = await commitPlan(page); const plan = adopted.document.data.datedPlan;
  assert.deepEqual({ ...plan, cashEvents: [] }, { ...declaredPlan(), cashEvents: [] });
  assert.deepEqual(plan.cashEvents.map(({ id, ...event }) => event), declaredPlan().cashEvents.map(({ id, ...event }) => event));
  assert.ok(plan.cashEvents.every(event => typeof event.id === 'string' && event.id.length > 0));
  assert.notEqual(plan.cashEvents[0].id, plan.cashEvents[1].id);
  await button(page, 'Lender terms').click();
  assert.equal(await page.getByLabel('Lender transaction fee', { exact: true }).inputValue(), '1');
  await changeFee(page, '1.25', .0125);
  await page.getByRole('radio', { name: 'Dated ledger view Postings', exact: true }).click();
  await ledger(page).getByText('2026-01-01 | Draw fee | $2.50', { exact: true }).waitFor({ state: 'visible' });
  adopted = await changeFee(page, '1', .01); await button(page, 'Lender terms').click();
  const canonical = await page.getByLabel('Portfolio export JSON', { exact: true }).innerText();
  await page.reload({ waitUntil: 'networkidle' }); await saved(page, 4, adopted.wrapper.revision);
  assert.equal((await physical(page, 4)).raw, adopted.raw, 'reload must not rewrite document4');
  receipt.goldens = await assertGolden(page);
  await checkpoint(page, receipt, data, output, 'saved-reloaded-golden', ledger(page).getByText('2026-01-01', { exact: true }));
  await changeLimit(page, 1000); await openEditor(page); await button(page, 'Move entry 2 earlier').click();
  const reordered = await commitPlan(page);
  assert.deepEqual(reordered.document.data.datedPlan.cashEvents.map(event => event.id), [plan.cashEvents[1].id, plan.cashEvents[0].id]);
  await ledger(page).getByRole('alert').filter({ hasText: /2026-01-01:.*Attempted LOC balance \$1,127\.00/s }).waitFor({ state: 'visible' });
  await ledger(page).getByText('Payoff unavailable.', { exact: true }).waitFor({ state: 'visible' });
  assert.equal(await page.getByText('2026-04-30 estimated', { exact: true }).count(), 0);
  await closeEditor(page); await checkpoint(page, receipt, data, output, 'expense-first-capacity', ledger(page).getByRole('alert'));
  await openEditor(page); await button(page, 'Move entry 2 earlier').click(); await commitPlan(page);
  await closeEditor(page); await assertGolden(page);
  await checkpoint(page, receipt, data, output, 'order-restored', ledger(page).getByText('2026-01-01', { exact: true }));
  await openEditor(page); const removed = await commitPlan(page, 'Remove dated plan');
  assert.equal('datedPlan' in removed.document.data, false); assert.equal(await ledger(page).count(), 0);
  await page.reload({ waitUntil: 'networkidle' }); await saved(page, 4, removed.wrapper.revision);
  assert.equal((await physical(page, 4)).raw, removed.raw, 'removal stays4 without rewriting on reload');
  await checkpoint(page, receipt, data, output, 'sticky4-removed', page.getByTestId('native-forecast-basis'));
  // Older3 import changes limit1000 back to2000, but cannot downgrade the adopted format.
  const older = await importDocument(page, JSON.parse(data.archives[keys.active3]).document, 3);
  assert.equal(older.document.version, 4); assert.equal('datedPlan' in older.document.data, false);
  const reimported = await importDocument(page, canonical, 4);
  assert.deepEqual(reimported.document, adopted.document);
  await page.reload({ waitUntil: 'networkidle' }); await saved(page, 4, reimported.wrapper.revision);
  assert.equal((await physical(page, 4)).raw, reimported.raw);
  await assertGolden(page); await checkpoint(page, receipt, data, output, 'sticky4-reimported', ledger(page));
}

async function corrupt(page, receipt, data, output) {
  await status(page).filter({ hasText: /Not saved.*unreadable/s }).waitFor({ state: 'visible' });
  assert.equal(await page.getByTestId('native-portfolio-book').count(), 0);
  assert.equal(await ledger(page).count(), 0); assert.equal(await editor(page).count(), 0);
  assert.equal(await button(page, 'Create blank portfolio').isDisabled(), true);
  assert.equal((await storageReadback(page))[keys.active4], data.initial4);
  await button(page, 'Reload saved portfolio').click(); await button(page, 'Confirm reload saved portfolio').click();
  await status(page).filter({ hasText: /Not saved.*unreadable/s }).waitFor({ state: 'visible' });
  assert.equal((await storageReadback(page))[keys.active4], data.initial4, 'unreadable4 must never be replaced or fall back to3');
  await checkpoint(page, receipt, data, output, 'authoritative-unreadable4', status(page));
}

async function failedWrite(page, receipt, data, output, active) {
  await saved(page, active ? 4 : 3, active ? 12 : 11);
  await openEditor(page);
  if (active) await page.getByLabel('Cash reserve', { exact: true }).fill('1');
  else { await fillFields(page); await addEntries(page); }
  await button(page, 'Save dated plan').click();
  await status(page).filter({ hasText: /Not saved.*Synthetic native dated4 quota failure/s }).waitFor({ state: 'visible' });
  await editor(page).getByRole('alert').waitFor({ state: 'visible' });
  assert.equal((await storageReadback(page))[keys.active4], data.initial4, 'failed publication leaves original4 or absence byte-identical');
  const document = await exported(page); assert.equal(document.version, active ? 4 : 3);
  assert.equal(document.data.datedPlan?.cashReserve, active ? 0 : undefined, 'failed candidate must not publish as saved state');
  assert.equal(await page.getByLabel(active ? 'Cash reserve' : 'Plan start date', { exact: true }).inputValue(), active ? '1' : '2026-01-01');
  await checkpoint(page, receipt, data, output, 'quota-fail-closed', editor(page).getByRole('alert'));
  await page.evaluate(key => localStorage.removeItem(key), keys.fault);
  await button(page, 'Reload saved portfolio').click(); await button(page, 'Confirm reload saved portfolio').click();
  await saved(page, active ? 4 : 3, active ? 12 : 11);
  if (!active) { await openEditor(page); await fillFields(page); await addEntries(page); await commitPlan(page); }
  else assert.equal((await physical(page, 4)).raw, data.initial4, 'explicit reload must not rewrite the failed target');
  await closeEditor(page); await assertGolden(page);
  await checkpoint(page, receipt, data, output, 'explicit-reload-retry', ledger(page));
}

async function reserveMinimum(page, receipt, data, output) {
  await saved(page, 3, 11); await openEditor(page);
  await fillFields(page, { 'Opening cash': '50', 'Cash reserve': '50', 'Opening statement minimum': '50', 'LOC minimum due day': '1' });
  await commitPlan(page); await closeEditor(page);
  await ledger(page).getByRole('alert').filter({ hasText: /2026-01-01: The statement minimum is unfunded on its declared due date/ }).waitFor({ state: 'visible' });
  await ledger(page).getByText('Opening cash $50.00. Protected reserve $50.00.', { exact: true }).waitFor({ state: 'visible' });
  await ledger(page).getByText('Payoff unavailable.', { exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('radio', { name: 'Dated ledger view Postings', exact: true }).click();
  assert.equal(await ledger(page).getByText('2026-01-01 | LOC minimum | $50.00', { exact: true }).count(), 0, 'protected reserve cannot fund the minimum');
  await checkpoint(page, receipt, data, output, 'reserve-protects-minimum', ledger(page).getByRole('alert'));
  await openEditor(page); await page.getByLabel('Cash reserve', { exact: true }).fill('0'); await commitPlan(page); await closeEditor(page);
  await ledger(page).getByRole('alert').filter({ hasText: /2026-02-01: The statement minimum is unfunded/ }).waitFor({ state: 'visible' });
  await page.getByRole('radio', { name: 'Dated ledger view Daily balances', exact: true }).click();
  const funded = await ledger(page).getByText('2026-01-01', { exact: true }).locator('..').innerText();
  assert.ok(funded.includes('Cash $0.00 | LOC $850.00'), funded); //900 -50 checking-funded minimum.
  await page.getByRole('radio', { name: 'Dated ledger view Postings', exact: true }).click();
  await ledger(page).getByText('2026-01-01 | LOC minimum | $50.00', { exact: true }).waitFor({ state: 'visible' });
  receipt.fundedMinimum = funded;
  await checkpoint(page, receipt, data, output, 'minimum-funded-once', ledger(page));
}

async function runNativeDatedFixtures({ browser, origin, output }) {
  assert.ok(browser && typeof browser.newContext === 'function' && typeof browser.contexts === 'function');
  assert.equal(typeof output, 'string'); assert.ok(output.trim());
  const base = new URL(origin); assert.ok(['http:', 'https:'].includes(base.protocol));
  assert.equal(base.pathname, '/'); assert.equal(base.search + base.hash, '');
  output = path.resolve(output);
  const verificationFile = path.join(output, 'verification.json');
  assert.equal(fs.existsSync(verificationFile), false, 'use a fresh dated smoke output directory; previous receipts are never overwritten');
  fs.mkdirSync(output, { recursive: true });
  const receipts = [], createdContexts = [];
  for (const width of widths) for (const name of cases) {
    const data = fixture(name), receipt = { name: `dated-${name}`, width, passed: false, contextsClosed: false,
      backend: 'Expo web localStorage outer1 wrapper, not physical SecureStore', pageErrors: [], steps: [] };
    let context, page;
    try {
      context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      createdContexts.push(context);
      await context.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort('blockedbyclient'));
      await context.addInitScript(({ keys, archives, initial4, failWrite }) => {
        if (localStorage.getItem(keys.seeded) === null) {
          for (const [key, raw] of Object.entries(archives)) localStorage.setItem(key, raw);
          if (initial4 !== null) localStorage.setItem(keys.active4, initial4);
          if (failWrite) localStorage.setItem(keys.fault, 'on');
          localStorage.setItem(keys.seeded, 'yes');
        }
        if (failWrite) {
          const write = Storage.prototype.setItem;
          Storage.prototype.setItem = function(key, value) {
            if (key === keys.active4 && localStorage.getItem(keys.fault) === 'on') throw new DOMException('Synthetic native dated4 quota failure', 'QuotaExceededError');
            return write.call(this, key, value);
          };
        }
      }, { keys, archives: data.archives, initial4: data.initial4, failWrite: name.startsWith('failed-') });
      page = await context.newPage(); page.setDefaultTimeout(8000); page.setDefaultNavigationTimeout(20000);
      page.on('pageerror', error => receipt.pageErrors.push(error.message));
      const response = await page.goto(new URL('/portfolio', base).href, { waitUntil: 'networkidle' });
      assert.equal(response?.status(), 200); assert.equal(new URL(page.url()).pathname, '/portfolio');
      if (name === 'lifecycle') await lifecycle(page, receipt, data, output);
      else if (name === 'corrupt-active4') await corrupt(page, receipt, data, output);
      else if (name === 'reserve-minimum') await reserveMinimum(page, receipt, data, output);
      else await failedWrite(page, receipt, data, output, name === 'failed-active4');
      await assertArchives(page, data.archives); await surface(page); assert.deepEqual(receipt.pageErrors, []);
      receipt.passed = true;
    } catch (error) {
      receipt.message = error.message;
      if (page && !page.isClosed()) {
        try { receipt.failureReadback = await readback(page); } catch (captureError) { receipt.readbackError = captureError.message; }
        try { receipt.failureScreenshots = await screenshots(page, output, `${receipt.name}-${width}-failure`); }
        catch (captureError) { receipt.screenshotError = captureError.message; }
      }
    } finally {
      if (context) {
        try { await context.close(); receipt.contextsClosed = !browser.contexts().includes(context); }
        catch (closeError) { receipt.closeError = closeError.message; }
      }
      if (!receipt.contextsClosed || receipt.pageErrors.length) {
        receipt.passed = false;
        receipt.message ??= receipt.pageErrors.length ? `Unexpected page errors: ${receipt.pageErrors.join('; ')}` : 'Fixture context did not close.';
      }
      receipts.push(receipt);
      fs.writeFileSync(verificationFile, JSON.stringify({ origin: base.origin, widths, planned: widths.length * cases.length,
        completed: receipts.length, contextsClosed: receipts.every(item => item.contextsClosed), receipts }, null, 2) + '\n');
    }
  }
  for (const receipt of receipts) console.log(`${receipt.passed ? 'PASS' : 'FAIL'} native ${receipt.name} ${receipt.width}px${receipt.message ? ': ' + receipt.message : ''}${receipt.closeError ? ': ' + receipt.closeError : ''}`);
  assert.ok(createdContexts.every(context => !browser.contexts().includes(context)), 'every context created by dated fixtures must close');
  assert.equal(receipts.filter(receipt => !receipt.passed).length, 0, 'native dated browser workflows must pass; inspect verification.json and failure screenshots');
  return receipts;
}

module.exports = { runNativeDatedFixtures };
