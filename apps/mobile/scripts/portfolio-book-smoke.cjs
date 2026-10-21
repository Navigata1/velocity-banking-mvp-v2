const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bookKey = 'interestshield.mobile.portfolio.v1';
const assumptionsKey = 'interestshield.mobile.assumptions.v1';
const scenario = {
  monthlyIncome: 8200.75, monthlyExpenses: 4700.25, chunkAmount: 1000.55,
  activeDebtName: 'Synthetic precision loan',
  activeDebt: { balance: 12000.705, apr: 0.070123456789, monthlyPayment: 425.15, termMonths: 60 },
  loc: { limit: 25000.99, balance: 3200.25, apr: 0.085123456789 },
};
const assumptions = { version: 1, ownerId: null, revision: 7, savedAt: '2026-10-21T00:00:00Z', input: scenario };
const importedBook = {
  monthlyIncome: 8200.755, monthlyExpenses: 4700.255, extraMonthlyPayment: 250.125,
  chunkAmount: 1000.555, loc: { limit: 25000.995, balance: 3200.255, apr: 2.000123456789 },
  strategy: 'velocity', focusMode: 'split', splitRatioPrimary: 0.650123456789,
  debts: [{ id: 'synthetic-imported-debt', name: '  Imported precision loan  ', category: 'custom',
    kind: 'amortized', balance: 100000000000000.02, apr: 2.000123456789,
    minPaymentRule: { type: 'percent', percent: 0.025123456789, floor: 35.005 },
    paymentSource: 'either', termMonths: 61, createdAt: '2026-01-01T00:00:00.000Z', notes: '  Exact notes\nsecond line  ',
    promo: { introApr: 1.000123456789, monthsRemaining: 3, postIntroApr: 2.000987654321 } }],
};

async function readEnvelope(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), bookKey);
}

async function readBook(page) {
  const envelope = await readEnvelope(page);
  assert.ok(envelope, 'a real Portfolio save must exist');
  assert.equal(envelope.version, 1);
  assert.equal(envelope.ownerId, null);
  assert.ok(Number.isSafeInteger(envelope.revision) && envelope.revision > 0);
  assert.ok(Number.isFinite(Date.parse(envelope.savedAt)));
  assert.equal(typeof envelope.document, 'string');
  const document = JSON.parse(envelope.document);
  assert.equal(document.version, 2);
  assert.equal(document.aprUnit, 'decimal');
  return document.data;
}

async function waitForBook(page, expected) {
  await page.waitForFunction(({ key, expected }) => {
    const envelope = JSON.parse(localStorage.getItem(key));
    const data = envelope && JSON.parse(envelope.document).data;
    const same = (a, b) => {
      if (a === b) return true;
      if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
      const keys = Object.keys(a).sort(), other = Object.keys(b).sort();
      return keys.length === other.length && keys.every((key, index) => key === other[index] && same(a[key], b[key]));
    };
    return data && Object.entries(expected).every(([field, value]) => same(data[field], value));
  }, { key: bookKey, expected });
  await page.getByTestId('native-portfolio-storage-status').filter({ hasText: /^\s*Saved\b/i }).waitFor({ state: 'visible' });
  const book = await readBook(page);
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(book[key], value, `persisted ${key}`);
  return book;
}

async function edit(page, label, value) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(String(value));
  await input.press('Tab');
}

async function menu(page, label, choice) {
  const trigger = page.getByRole('button', { name: label, exact: true });
  await trigger.click();
  assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
  await page.getByRole('radio', { name: `${label} ${choice}`, exact: true }).click();
  assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
}

async function assertSurface(page) {
  await page.getByTestId('native-portfolio-book').waitFor({ state: 'visible' });
  const geometry = await page.evaluate(() => ({ width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')) }));
  assert.equal(geometry.overlay, false, 'no framework error overlay');
  assert.ok(geometry.scrollWidth <= geometry.width + 1, 'Portfolio must not overflow horizontally');
  assert.ok(await page.getByRole('heading').count(), 'Portfolio has a meaningful route heading');
  for (const control of await page.getByTestId('native-portfolio-book').locator('input, [role="button"], [role="radio"]').all()) {
    const bounds = await control.boundingBox();
    if (bounds) assert.ok(bounds.height >= 47.5, `Portfolio touch target is only ${bounds.height}px high`);
  }
}

async function assertSeparateAssumptions(page, original) {
  assert.equal(await page.evaluate(key => localStorage.getItem(key), assumptionsKey), original,
    'Portfolio must never rewrite the separate single-debt assumptions key');
}

async function freshFixture({ browser, origin, output, width, name, book, run }) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort('blockedbyclient'));
  // These synthetic inputs live only in this isolated context, never in the user's browser.
  await context.addInitScript(({ assumptionsKey, assumptions, bookKey, book }) => {
    if (localStorage.getItem('portfolio-fixture-seeded')) return;
    localStorage.setItem(assumptionsKey, JSON.stringify(assumptions));
    if (book) localStorage.setItem(bookKey, JSON.stringify({ version: 1, ownerId: null, revision: 11,
      savedAt: '2026-10-21T00:00:00Z', document: JSON.stringify({ version: 2, aprUnit: 'decimal', data: book }) }));
    localStorage.setItem('portfolio-fixture-seeded', 'yes');
  }, { assumptionsKey, assumptions, bookKey, book });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', entry => { if (entry.type() === 'error') errors.push(entry.text()); });
  try {
    const response = await page.goto(`${origin}/portfolio`, { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200);
    assert.equal(new URL(page.url()).pathname, '/portfolio');
    const original = await page.evaluate(key => localStorage.getItem(key), assumptionsKey);
    if (!book) assert.equal(await page.getByRole('button', { name: 'Create blank portfolio', exact: true }).count(), 1,
      'native book UI is missing: legacy selected-debt Portfolio is not the aggregate editor');
    else assert.equal(await page.getByTestId('native-portfolio-book').count(), 1, 'native imported book editor is missing');
    await run({ page, context });
    await assertSeparateAssumptions(page, original);
    await assertSurface(page);
    assert.deepEqual(errors, [], 'Portfolio browser errors');
    await page.screenshot({ path: path.join(output, `portfolio-${name}-${width}.png`), fullPage: true });
    console.log(`PASS native portfolio ${name} ${width}px`);
    return { name, width, passed: true, errors };
  } catch (error) {
    await page.screenshot({ path: path.join(output, `portfolio-${name}-${width}-failure.png`), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(output, `portfolio-${name}-${width}-failure.json`), JSON.stringify({ message: error.message,
      url: page.url(), errors, stored: await readEnvelope(page).catch(() => null) }, null, 2) + '\n');
    console.error(`FAIL native portfolio ${name} ${width}px: ${error.message}`);
    return { name, width, passed: false, message: error.message, errors };
  } finally { await context.close(); }
}

async function createAndEdit({ page }) {
  await page.getByRole('button', { name: 'Create blank portfolio', exact: true }).click();
  await page.getByTestId('native-portfolio-book').waitFor({ state: 'visible' });
  await waitForBook(page, { debts: [] });
  await page.getByRole('radio', { name: 'Portfolio strategy Velocity', exact: true }).click();
  await page.getByRole('radio', { name: 'Portfolio focus Single', exact: true }).click();
  for (const [label, value] of [['Portfolio monthly income', '8200.755'], ['Portfolio monthly expenses', '4700.255'],
    ['Portfolio extra cap', '250.125'], ['Portfolio LOC limit', '25000.995'], ['Portfolio LOC balance', '3200.255'],
    ['Portfolio LOC APR', '200.0123456789'], ['Portfolio chunk amount', '1000.555']]) await edit(page, label, value);
  await waitForBook(page, { monthlyIncome: 8200.755, monthlyExpenses: 4700.255, extraMonthlyPayment: 250.125,
    loc: { limit: 25000.995, balance: 3200.255, apr: 2.000123456789 }, chunkAmount: 1000.555 });
  await page.getByRole('button', { name: 'Add simulated debt', exact: true }).click();
  await page.getByRole('button', { name: 'Add simulated debt', exact: true }).click();
  await edit(page, 'Debt 1 name', 'Synthetic car loan');
  await edit(page, 'Debt 1 balance', '12000.705');
  await edit(page, 'Debt 1 APR', '7.0123456789');
  await edit(page, 'Debt 1 minimum payment', '425.155');
  await menu(page, 'Debt 1 category', 'Auto');
  await menu(page, 'Debt 1 kind', 'Amortized');
  await menu(page, 'Debt 1 payment source', 'Checking');
  await edit(page, 'Debt 2 name', 'Synthetic card');
  await edit(page, 'Debt 2 balance', '2200.755');
  await edit(page, 'Debt 2 APR', '200.0123456789');
  await menu(page, 'Debt 2 category', 'Credit card');
  await menu(page, 'Debt 2 kind', 'Revolving');
  await menu(page, 'Debt 2 payment source', 'Either');
  await page.getByRole('radio', { name: 'Debt 2 minimum Percent', exact: true }).click();
  await edit(page, 'Debt 2 minimum percent', '2.5123456789');
  await edit(page, 'Debt 2 minimum floor', '35.005');
  await page.getByRole('switch', { name: 'Debt 2 promotional APR', exact: true }).click();
  await edit(page, 'Debt 2 promo APR', '100.0123456789');
  await edit(page, 'Debt 2 promo months remaining', '3');
  await edit(page, 'Debt 2 post-promo APR', '200.0987654321');
  await edit(page, 'Debt 2 notes', 'Synthetic promotional terms');
  await page.getByRole('radio', { name: 'Portfolio focus Split', exact: true }).click();
  await edit(page, 'Portfolio primary split percent', '65.0123456789');
  const split = await waitForBook(page, { focusMode: 'split', splitRatioPrimary: 0.650123456789 });
  assert.equal(await page.getByLabel('Portfolio chunk amount', { exact: true }).count(), 0, 'split focus cannot promise chunking');
  assert.equal(split.debts.length, 2);
  assert.notEqual(split.debts[0].id, split.debts[1].id);
  assert.match(split.debts[0].id, /^[0-9a-f-]{36}$/i);
  assert.deepEqual({ ...split.debts[0], id: null, createdAt: null }, { id: null, createdAt: null, name: 'Synthetic car loan',
    category: 'auto', kind: 'amortized', balance: 12000.705, apr: 0.070123456789,
    minPaymentRule: { type: 'fixed', amount: 425.155 }, paymentSource: 'checking' });
  assert.deepEqual({ ...split.debts[1], id: null, createdAt: null }, { id: null, createdAt: null, name: 'Synthetic card',
    category: 'credit_card', kind: 'revolving', balance: 2200.755, apr: 2.000123456789,
    minPaymentRule: { type: 'percent', percent: 0.025123456789, floor: 35.005 }, paymentSource: 'either',
    promo: { introApr: 1.000123456789, monthsRemaining: 3, postIntroApr: 2.000987654321 }, notes: 'Synthetic promotional terms' });
  const beforeBound = await readEnvelope(page);
  await edit(page, 'Portfolio primary split percent', '100.01');
  assert.deepEqual(await readEnvelope(page), beforeBound, 'invalid split must not clamp or save');
  for (const [value, title] of [['snowball', 'Snowball'], ['avalanche', 'Avalanche'], ['velocity', 'Velocity']]) {
    await page.getByRole('radio', { name: `Portfolio strategy ${title}`, exact: true }).click();
    await waitForBook(page, { strategy: value });
  }
  await page.getByRole('radio', { name: 'Portfolio focus Single', exact: true }).click();
  await waitForBook(page, { focusMode: 'single' });
  assert.ok(await page.getByLabel('Portfolio chunk amount', { exact: true }).isVisible());
  const beforeNoOp = await readEnvelope(page);
  await menu(page, 'Debt 1 category', 'Auto');
  await page.getByRole('radio', { name: 'Portfolio strategy Velocity', exact: true }).click();
  await page.getByRole('radio', { name: 'Portfolio focus Single', exact: true }).click();
  assert.deepEqual(await readEnvelope(page), beforeNoOp, 'reselecting current modes and metadata must not save');
  const beforeRemove = await readBook(page);
  await page.getByRole('button', { name: 'Remove simulated debt 2', exact: true }).click();
  await waitForBook(page, { debts: [beforeRemove.debts[0]] });
  await page.getByRole('button', { name: 'Undo debt removal', exact: true }).click();
  await waitForBook(page, { debts: beforeRemove.debts });
  const saved = await readEnvelope(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByLabel('Debt 2 name', { exact: true }).waitFor({ state: 'visible' });
  assert.deepEqual(await readEnvelope(page), saved, 'reload must not rewrite a canonical book');
  assert.equal(await page.getByLabel('Debt 2 balance', { exact: true }).inputValue(), '2200.755');
}

async function copyScenario({ page }) {
  await page.getByRole('button', { name: 'Copy current scenario', exact: true }).click();
  const book = await waitForBook(page, { monthlyIncome: scenario.monthlyIncome, monthlyExpenses: scenario.monthlyExpenses,
    loc: scenario.loc, chunkAmount: scenario.chunkAmount });
  assert.equal(book.debts.length, 1);
  assert.equal(book.debts[0].name, scenario.activeDebtName);
  assert.equal(book.debts[0].balance, scenario.activeDebt.balance);
  assert.equal(book.debts[0].apr, scenario.activeDebt.apr);
  assert.equal(book.debts[0].termMonths, scenario.activeDebt.termMonths);
  assert.deepEqual(book.debts[0].minPaymentRule, { type: 'fixed', amount: scenario.activeDebt.monthlyPayment });
  await edit(page, 'Debt 1 balance', '999.005');
  await page.waitForFunction(key => JSON.parse(JSON.parse(localStorage.getItem(key)).document).data.debts[0].balance === 999.005, bookKey);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal((await readBook(page)).debts[0].balance, 999.005);
}

async function importedNoOps({ page }) {
  await page.getByLabel('Debt 1 balance', { exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const input = document.querySelector('input[aria-label="Debt 1 balance"]');
    return input && !input.disabled && !input.readOnly;
  });
  await waitForBook(page, importedBook);
  const before = await readEnvelope(page);
  assert.deepEqual(await readBook(page), importedBook);
  for (const label of ['Portfolio monthly income', 'Portfolio monthly expenses', 'Portfolio extra cap', 'Portfolio LOC limit',
    'Portfolio LOC balance', 'Portfolio LOC APR', 'Portfolio primary split percent', 'Debt 1 name', 'Debt 1 notes',
    'Debt 1 balance', 'Debt 1 APR', 'Debt 1 minimum percent', 'Debt 1 minimum floor', 'Debt 1 recorded term months',
    'Debt 1 promo APR', 'Debt 1 promo months remaining', 'Debt 1 post-promo APR']) {
    const input = page.getByLabel(label, { exact: true });
    await input.focus(); await input.press('Tab');
  }
  assert.deepEqual(await readEnvelope(page), before, 'imported no-ops preserve exact bytes, IDs, optional metadata and revision');
  for (const [label, equivalent] of [['Debt 1 balance', '100000000000000.0200'],
    ['Debt 1 APR', '200.012345678900'], ['Portfolio LOC APR', '200.012345678900'],
    ['Debt 1 minimum floor', '35.00500']]) await edit(page, label, equivalent);
  assert.deepEqual(await readEnvelope(page), before, 'equivalent decimal edits must preserve imported bytes and revision');
  await edit(page, 'Debt 1 name', '   ');
  await edit(page, 'Debt 1 recorded term months', '0');
  await edit(page, 'Debt 1 recorded term months', '1.5');
  assert.deepEqual(await readEnvelope(page), before, 'blank names and invalid recorded terms must not save');
  const name = page.getByLabel('Debt 1 name', { exact: true });
  await name.fill('Uncommitted name');
  assert.deepEqual(await readEnvelope(page), before, 'text drafts must stay local');
  await page.reload({ waitUntil: 'networkidle' });
  await name.waitFor({ state: 'visible' });
  assert.equal(await name.inputValue(), importedBook.debts[0].name);
  assert.deepEqual(await readEnvelope(page), before);
}

async function staleTab({ page, context }) {
  assert.equal(await page.evaluate(() => Boolean(navigator.locks?.request)), true, 'CAS fixture requires real Web Locks');
  await page.getByLabel('Portfolio monthly income', { exact: true }).waitFor({ state: 'visible' });
  const second = await context.newPage();
  await second.goto(page.url(), { waitUntil: 'networkidle' });
  const draft = second.getByLabel('Portfolio monthly expenses', { exact: true });
  await draft.waitFor({ state: 'visible' });
  await draft.fill('4800.255');
  await edit(page, 'Portfolio monthly income', '9000.755');
  await waitForBook(page, { monthlyIncome: 9000.755 });
  const winner = await readEnvelope(page);
  await draft.press('Tab');
  await second.getByTestId('native-portfolio-storage-status').filter({ hasText: /changed|conflict|stale/i }).waitFor({ state: 'visible' });
  assert.deepEqual(await readEnvelope(second), winner, 'stale second tab cannot overwrite the winner');
  assert.equal((await readBook(second)).monthlyExpenses, importedBook.monthlyExpenses);
  await second.close();
}

async function transferReview({ page }) {
  assert.equal(await page.getByTestId('native-portfolio-transfer').count(),1,'portable import/export UI must be present');
  await page.getByTestId('native-portfolio-transfer').waitFor({state:'visible'});
  await waitForBook(page, importedBook);
  const input=page.getByLabel('Portfolio import JSON',{exact:true});
  const exported=()=>page.getByLabel('Portfolio export JSON',{exact:true}).innerText();
  assert.deepEqual(JSON.parse(await exported()).data, importedBook);
  const before=await readEnvelope(page);
  await input.fill('{"version":99}');
  await page.getByRole('button',{name:'Review imported portfolio',exact:true}).click();
  assert.ok(await page.getByRole('alert').count());
  assert.deepEqual(await readEnvelope(page),before);
  const legacy=JSON.parse(JSON.stringify(importedBook));legacy.loc.apr=8.5;legacy.debts[0].apr=6.5;
  legacy.debts[0].promo={introApr:0.05,monthsRemaining:2,postIntroApr:120};
  const text=JSON.stringify({version:1,data:legacy});
  await input.fill(text);await page.getByRole('button',{name:'Review imported portfolio',exact:true}).click();
  await page.getByTestId('native-portfolio-transfer-review').filter({hasText:'Legacy rates were converted once.'}).waitFor({state:'visible'});
  await edit(page,'Portfolio monthly income','9000.755');await waitForBook(page,{monthlyIncome:9000.755});
  const changed=await readEnvelope(page);
  await page.getByRole('button',{name:'Confirm replace portfolio',exact:true}).click();
  await page.getByRole('alert').filter({hasText:/changed.*review/i}).waitFor({state:'visible'});
  assert.deepEqual(await readEnvelope(page),changed,'stale import review cannot replace intervening edits');
  assert.equal(await input.inputValue(),text,'stale review preserves the draft');
  await page.getByRole('button',{name:'Review imported portfolio',exact:true}).click();
  await page.getByRole('button',{name:'Confirm replace portfolio',exact:true}).click();
  const expected={...legacy,loc:{...legacy.loc,apr:0.085},debts:legacy.debts.map(d=>({...d,apr:0.065,
    promo:{...d.promo,introApr:0.05,postIntroApr:1.2}}))};
  await waitForBook(page,expected);assert.equal(await input.inputValue(),text);
  const canonical=await exported(),saved=await readEnvelope(page);
  await input.fill(canonical);await page.getByRole('button',{name:'Review imported portfolio',exact:true}).click();
  await page.getByRole('button',{name:'Confirm replace portfolio',exact:true}).click();
  await page.getByText('This portfolio already matches the imported data. Nothing was replaced.',{exact:true}).waitFor({state:'visible'});
  assert.deepEqual(await readEnvelope(page),saved,'identical import must not save or advance revision');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await page.getByTestId('native-portfolio-transfer-review').count(),0);
  assert.equal(await input.inputValue(),canonical);
}

async function runPortfolioBookFixtures({ browser, origin, output }) {
  fs.mkdirSync(output, { recursive: true });
  const receipts = [];
  for (const width of [375, 1440]) {
    for (const [name, book, run] of [['create-edit', undefined, createAndEdit], ['copy', undefined, copyScenario],
      ['imported-no-op', importedBook, importedNoOps], ['stale-tab', importedBook, staleTab], ['transfer', importedBook, transferReview]]) {
      receipts.push(await freshFixture({ browser, origin, output, width, name, book, run }));
    }
  }
  for(const [name,run] of [['imported-no-op',importedNoOps],['transfer',transferReview]]) {
    receipts.push(await freshFixture({browser,origin,output,width:280,name,book:importedBook,run}));
  }
  fs.writeFileSync(path.join(output, 'portfolio-verification.json'), JSON.stringify({ origin, receipts }, null, 2) + '\n');
  assert.equal(receipts.filter(receipt => !receipt.passed).length, 0,
    `Portfolio rendered fixtures failed: ${receipts.filter(receipt => !receipt.passed).map(receipt => `${receipt.name}@${receipt.width}`).join(', ')}`);
  return receipts;
}

// Support the existing callable financial-input-smoke pattern and the named integration API.
module.exports = runPortfolioBookFixtures;
module.exports.runPortfolioBookFixtures = runPortfolioBookFixtures;

async function main() {
  const { spawn } = require('node:child_process');
  const net = require('node:net');
  const { once } = require('node:events');
  const { chromium } = require(path.resolve(__dirname, '..', '..', 'web', 'node_modules', 'playwright-core'));
  const { findBrowserExecutable, getHeadlessChromiumArgs } = require(path.resolve(__dirname, '..', '..', 'web', 'scripts', 'browser-harness.cjs'));
  const appRoot = path.resolve(__dirname, '..');
  assert.ok(fs.existsSync(path.join(appRoot, 'dist-web', 'index.html')), 'existing Expo dist-web export is required');
  const executablePath = findBrowserExecutable();
  assert.ok(executablePath, 'existing project browser harness must find Chrome/Chromium/Edge');
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const output = path.resolve(process.env.MOBILE_PORTFOLIO_OUTPUT || path.join(appRoot, 'test-results', 'portfolio'));
  const server = spawn(process.execPath, ['scripts/serve-web-export.cjs'], { cwd: appRoot,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = new Promise(resolve => { server.once('exit', resolve); server.once('error', resolve); });
  let browser;
  const deadline = setTimeout(() => { console.error('Portfolio fixture exceeded its finite 120s launcher deadline.');
    server.kill(); void browser?.close(); process.exitCode = 1; }, 120000);
  try {
    await new Promise((resolve, reject) => {
      const readyTimer = setTimeout(() => reject(new Error('Expo fixture server did not become ready in 15s.')), 15000);
      const fail = error => { clearTimeout(readyTimer); reject(error); };
      server.once('error', fail);
      server.once('exit', code => fail(new Error(`Expo fixture server exited before ready: ${code}`)));
      server.stderr.on('data', chunk => process.stderr.write(chunk));
      server.stdout.on('data', chunk => { if (String(chunk).includes(`Serving Expo web export at ${origin}`)) {
        clearTimeout(readyTimer); resolve();
      } });
    });
    browser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });
    console.log(`Portfolio fixtures against existing dist-web at ${origin}; isolated contexts, widths 375/1440.`);
    await runPortfolioBookFixtures({ browser, origin, output });
  } finally {
    clearTimeout(deadline);
    await browser?.close();
    server.kill();
    await exited;
  }
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
