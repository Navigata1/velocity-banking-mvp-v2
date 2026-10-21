/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { startBuiltServer, stopServer } = require('./built-server-harness.cjs');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { decodePngRgba } = require('./png-pixel-proof.cjs');
const root = path.resolve(__dirname, '..'), key = 'interestshield-portfolio-v2';
const legacyKey = 'velocity-bank-storage', oldKey = 'interestshield-portfolio-v1';
const legacy = ' \n' + JSON.stringify({ state: { monthlyIncome: 8111, monthlyExpenses: 4222 }, version: 0 }) + '\n';
const oldPortfolio = '{"untouched":"legacy sentinel"}';
const fixture = () => ({ monthlyIncome: 2000, monthlyExpenses: 1500, extraMonthlyPayment: 0, chunkAmount: 100,
  loc: { limit: 5000, balance: 300, apr: 0.1 }, strategy: 'avalanche', focusMode: 'single', splitRatioPrimary: 0.7,
  debts: [{ id: 'a', name: 'Loan A', category: 'auto', kind: 'amortized', balance: 1200, apr: 0.12,
    minPaymentRule: { type: 'fixed', amount: 120 }, paymentSource: 'checking', notes: '  Exact original notes  ' },
  { id: 'b', name: 'Loan B', category: 'personal_loan', kind: 'amortized', balance: 600, apr: 0.24,
    minPaymentRule: { type: 'fixed', amount: 60 }, paymentSource: 'checking' }] });
const encode = book => JSON.stringify({ version: 2, aprUnit: 'decimal', data: book }, null, 2);
const stored = page => page.evaluate(key => localStorage.getItem(key), key);
async function edit(page, label, value) {
  await page.getByRole('button', { name: new RegExp(`^Edit ${label},`) }).click();
  const input = page.getByRole('textbox', { name: label + ' value', exact: true });
  await input.fill(value); await input.press('Enter');
}
async function unchangedLegacy(page) {
  assert.equal(await page.evaluate(key => localStorage.getItem(key), legacyKey), legacy);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), oldKey), oldPortfolio);
}
async function fit(page) {
  const geometry = await page.getByTestId('shared-portfolio-dashboard').evaluate(element => {
    const metrics = [...element.querySelectorAll('[data-testid^="shared-value-"], [data-testid="shared-total-debt"]')];
    return { pageFits: document.documentElement.scrollWidth <= innerWidth + 1,
      metrics: metrics.map(node => { const range = document.createRange(); range.selectNodeContents(node);
        const box = node.getBoundingClientRect(), rects = [...range.getClientRects()].filter(rect => rect.width);
        return { value: node.innerText, font: parseFloat(getComputedStyle(node).fontSize),
          fits: node.scrollWidth <= node.clientWidth + 1 && rects.every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.bottom <= box.bottom + 1) }; }) };
  });
  assert.ok(geometry.pageFits && geometry.metrics.every(metric => metric.fits && metric.font >= 12), JSON.stringify(geometry));
  return geometry;
}
async function importBook(page, origin, book) {
  await page.goto(origin + '/portfolio', { waitUntil: 'networkidle' });
  await page.getByTestId('portfolio-import-backup-json').fill(encode(book));
  await page.getByTestId('portfolio-import-backup-json-submit').click();
  await page.getByRole('status').filter({ hasText: /Import complete/ }).waitFor();
  await page.getByRole('link', { name: 'Open dashboard', exact: true }).click();
  await page.getByTestId('shared-portfolio-dashboard').waitFor();
}
async function sharedEdits(page, origin, output, width) {
  await page.goto(origin + '/portfolio', { waitUntil: 'networkidle' });
  const original = await stored(page); assert.equal(original, encode(fixture()));
  await page.getByRole('link', { name: 'Open dashboard', exact: true }).click();
  await page.getByTestId('shared-portfolio-dashboard').waitFor();
  const values = page.locator('[data-testid^="shared-value-"]');
  const initial = await values.allTextContents();
  assert.deepEqual(initial, ['$500.00', '$0.87/day', '5 mo', 'Loan B']);
  assert.equal(await page.getByTestId('shared-total-debt').innerText(), '$2,100.00');
  await page.getByLabel('Portfolio dashboard debt', { exact: true }).selectOption('b');
  assert.equal(await page.getByTestId('asset-hero').getAttribute('data-hero'), 'personal');
  assert.match(await page.getByTestId('shared-selected-debt').innerText(), /Loan B[\s\S]*\$600.00[\s\S]*24%/);
  assert.deepEqual(await values.allTextContents(), initial); assert.equal(await stored(page), original);
  await edit(page, 'Shared portfolio monthly income', '2000'); assert.equal(await stored(page), original);
  await edit(page, 'Shared portfolio monthly income', 'abc');
  await page.getByRole('alert').filter({ hasText: 'Enter a valid non-negative number.' }).waitFor();
  await page.getByRole('textbox', { name: 'Shared portfolio monthly income value', exact: true }).press('Escape');
  assert.equal(await stored(page), original);
  await edit(page, 'Shared portfolio monthly income', '2500');
  await page.getByTestId('shared-value-cash-flow').filter({ hasText: '$1,000.00' }).waitFor();
  const expected = fixture(); expected.monthlyIncome = 2500;
  assert.deepEqual(JSON.parse(await stored(page)).data, expected);
  await page.getByRole('link', { name: 'Edit portfolio', exact: true }).click();
  await page.getByRole('button', { name: /^Edit Portfolio monthly income, current value \$2,500/ }).waitFor();
  await edit(page, 'Portfolio monthly expenses', '1550'); expected.monthlyExpenses = 1550;
  await page.getByRole('link', { name: 'Open dashboard', exact: true }).click();
  await page.getByTestId('shared-value-cash-flow').filter({ hasText: '$950.00' }).waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.getByTestId('shared-value-cash-flow').innerText(), '$950.00');
  await edit(page, 'Shared portfolio line of credit APR', '200'); expected.loc.apr = 2;
  assert.deepEqual(JSON.parse(await stored(page)).data, expected);
  const saved = await stored(page);
  await page.getByRole('radio', { name: 'Avalanche', exact: true }).check(); assert.equal(await stored(page), saved);
  await page.getByRole('radio', { name: 'Snowball', exact: true }).check(); expected.strategy = 'snowball';
  assert.deepEqual(JSON.parse(await stored(page)).data, expected);
  await unchangedLegacy(page);
  const geometry = await fit(page);
  await page.screenshot({ path: path.join(output, `shared-edits-${width}.png`), fullPage: true });
  if (width !== 280) {
    await page.getByRole('button', { name: 'Inspect 3D model', exact: true }).click();
    const stage = page.getByTestId('asset-hero-canvas'); await stage.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-testid="asset-hero-canvas"]')?.getAttribute('data-ready') === 'true');
    const image = decodePngRgba(await stage.locator('canvas').screenshot());
    let foreground = 0, left = image.width, right = 0, top = image.height, bottom = 0;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * image.bytesPerPixel;
      const delta = Math.abs(image.pixels[i] - image.pixels[0]) + Math.abs(image.pixels[i + 1] - image.pixels[1]) + Math.abs(image.pixels[i + 2] - image.pixels[2]);
      if (delta <= 40) continue;
      foreground++; left = Math.min(left, x); right = Math.max(right, x + 1); top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
    }
    assert.ok(foreground > image.width * image.height * 0.02 && left > 1 && top > 1 && right < image.width - 1 && bottom < image.height - 1, 'shared dashboard model must be nonblank and framed');
    await page.getByRole('button', { name: 'Replay full turn', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="asset-hero-canvas"]')?.getAttribute('data-ready') === 'true');
  }
  await page.evaluate(() => localStorage.setItem('interestshield-theme', JSON.stringify({ state: { theme: 'light' }, version: 0 })));
  await page.reload({ waitUntil: 'networkidle' }); await page.getByTestId('shared-portfolio-dashboard').waitFor();
  const lightContrast = await page.locator('[data-testid^="shared-value-"]').evaluateAll(nodes => {
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d', { willReadFrequently: true });
    const rgb = color => { context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const luminance = color => rgb(color).map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    return nodes.map(node => { const color = getComputedStyle(node).color, background = getComputedStyle(node.parentElement).backgroundColor;
      const a = luminance(color), b = luminance(background); return { value: node.innerText, color, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }; });
  });
  assert.equal(lightContrast.length, 4); assert.ok(lightContrast.every(metric => metric.ratio >= 4.5), JSON.stringify(lightContrast));
  await fit(page); await unchangedLegacy(page);
  return { geometry, lightContrast, bidirectional: true, legacyBytesPreserved: true, modelChecked: width !== 280 };
}
async function adverseStates(page, origin, output, width) {
  const debtOnly = () => { const book = fixture(); book.debts = book.debts.slice(0, 1); book.loc.balance = 0; return book; };
  let book = debtOnly(); book.monthlyIncome = 5000; book.debts[0].apr = 2; book.debts[0].minPaymentRule.amount = 1000;
  await importBook(page, origin, book); assert.match(await page.getByTestId('shared-selected-debt').innerText(), /200%/);
  assert.equal(await page.getByTestId('shared-value-interest-burn').innerText(), '$6.58/day');
  book.debts[0].promo = { introApr: 0, monthsRemaining: 2, postIntroApr: 0.24 };
  await importBook(page, origin, book); assert.equal(await page.getByTestId('shared-value-interest-burn').innerText(), '$0.00/day');
  book.debts[0].promo.monthsRemaining = 0;
  await importBook(page, origin, book); assert.equal(await page.getByTestId('shared-value-interest-burn').innerText(), '$0.79/day');
  book = fixture(); book.monthlyIncome = 1600;
  await importBook(page, origin, book); assert.equal(await page.getByTestId('shared-value-eta').innerText(), 'Review inputs');
  assert.equal(await page.getByTestId('shared-value-next-move').innerText(), 'Review payoff inputs');
  book = debtOnly(); book.debts[0].balance = 1e-8;
  await importBook(page, origin, book); assert.equal(await page.getByTestId('shared-value-eta').innerText(), 'Below model tolerance');
  assert.equal(await page.getByTestId('shared-value-interest-burn').innerText(), '<$0.01/day');
  assert.notEqual(await page.getByTestId('shared-total-debt').innerText(), '$0.00');
  book = debtOnly(); book.debts = [];
  await importBook(page, origin, book); assert.equal(await page.getByTestId('shared-value-eta').innerText(), 'No debt remaining');
  assert.equal(await page.getByTestId('asset-hero').count(), 0);
  book.loc.balance = 600; book.loc.apr = 0;
  await importBook(page, origin, book); assert.equal(await page.getByTestId('shared-value-next-move').innerText(), 'Line of credit');
  book = debtOnly(); book.monthlyIncome = 1e21; book.debts[0].balance = 1e23;
  await importBook(page, origin, book); await fit(page);
  const before = await stored(page);
  await page.evaluate(key => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (name, value) {
    if (name === key) throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); return set.call(this, name, value);
  }; }, key);
  await edit(page, 'Shared portfolio monthly income', '2000');
  await page.getByTestId('shared-dashboard-storage-error').waitFor();
  assert.equal(await stored(page), before); assert.equal(await page.getByTestId('shared-portfolio-dashboard').count(), 0);
  await page.reload({ waitUntil: 'networkidle' }); await page.getByTestId('shared-portfolio-dashboard').waitFor();
  await page.evaluate(key => localStorage.setItem(key, '{corrupt canonical'), key);
  await page.reload({ waitUntil: 'networkidle' }); await page.getByTestId('shared-dashboard-storage-error').waitFor();
  assert.equal(await stored(page), '{corrupt canonical'); await unchangedLegacy(page);
  await page.screenshot({ path: path.join(output, `adverse-states-${width}.png`), fullPage: true });
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true,
    get() { throw new DOMException('Synthetic storage unavailable', 'SecurityError'); } }));
  await page.reload({ waitUntil: 'networkidle' }); await page.getByTestId('shared-dashboard-storage-error').waitFor();
  assert.match(await page.getByTestId('shared-dashboard-storage-error').innerText(), /storage is unavailable/);
  assert.equal(await page.getByTestId('shared-portfolio-dashboard').count(), 0);
  return { apr200: true, promo: true, tolerance: true, empty: true, locOnly: true, extremeFit: true, failedWritesPaused: true, corruptPrimaryPaused: true, unavailablePaused: true };
}
async function runSharedPortfolioDashboard({ browser, origin, output = path.join(root, 'test-results/shared-portfolio-dashboard') }) {
  fs.mkdirSync(output, { recursive: true }); const receipts = [];
  for (const width of [280, 375, 1440]) for (const name of ['shared-edits', 'adverse-states']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ key, legacyKey, oldKey, document, legacy, oldPortfolio }) => {
      if (localStorage.getItem('shared-dashboard-seeded')) return;
      localStorage.setItem(key, document); localStorage.setItem(legacyKey, legacy); localStorage.setItem(oldKey, oldPortfolio);
      localStorage.setItem('shared-dashboard-seeded', 'yes');
    }, { key, legacyKey, oldKey, document: encode(fixture()), legacy, oldPortfolio });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', entry => { if (entry.type() === 'error') errors.push(entry.text()); });
    try {
      const details = await (name === 'shared-edits' ? sharedEdits : adverseStates)(page, origin, output, width);
      assert.deepEqual(errors, []); receipts.push({ name, width, passed: true, details, errors }); console.log(`PASS shared Portfolio Dashboard ${name} ${width}px`);
    } catch (error) {
      receipts.push({ name, width, passed: false, message: error.message, errors }); console.error(`FAIL shared Portfolio Dashboard ${name} ${width}px: ${error.stack}`);
      await page.screenshot({ path: path.join(output, `${name}-${width}-failure.png`), fullPage: true }).catch(() => {});
    } finally { await context.close(); }
  }
  fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ origin, scope: 'Two multi-assertion workflows at three widths; synthetic records only', receipts }, null, 2) + '\n');
  assert.ok(receipts.every(receipt => receipt.passed), 'Shared Portfolio Dashboard workflows must all pass'); return receipts;
}
module.exports = { runSharedPortfolioDashboard };
async function main() {
  let browser, server;
  try {
    server = process.env.SHARED_DASHBOARD_ORIGIN ? null : await startBuiltServer(root);
    browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true, args: getHeadlessChromiumArgs() });
    await runSharedPortfolioDashboard({ browser, origin: process.env.SHARED_DASHBOARD_ORIGIN ?? server.origin });
  } finally { await browser?.close(); await stopServer(server?.server); }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
