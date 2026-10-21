/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { decodePngRgba } = require('./png-pixel-proof.cjs');

function assertInputPixels(image) {
  let brightPixels = 0;
  const colors = new Set();
  for (let offset = 0; offset < image.pixels.length; offset += image.bytesPerPixel) {
    const red = image.pixels[offset], green = image.pixels[offset + 1], blue = image.pixels[offset + 2];
    if (Math.max(red, green, blue) >= 120) brightPixels += 1;
    colors.add(`${red},${green},${blue}`);
  }
  assert.ok(brightPixels > 24 && colors.size > 1, 'the precise input capture must contain visible text, not a transparent or blank page');
  return { width: image.width, height: image.height, brightPixels, colors: colors.size };
}

const legacyKey = 'interestshield-portfolio-v1';
const canonicalKey = 'interestshield-portfolio-v2';
const source = {
  monthlyIncome: 8200.755, monthlyExpenses: 4700.255, extraMonthlyPayment: 250.125, chunkAmount: 1000.555,
  loc: { limit: 25000.995, balance: 3200.255, apr: 0.085123456789 }, strategy: 'velocity', focusMode: 'split',
  splitRatioPrimary: 0.7123456789,
  debts: [{ id: 'precision-loan', name: 'Precision Loan', category: 'auto', kind: 'amortized', balance: 12000.705,
    apr: 200, minPaymentRule: { type: 'fixed', amount: 425.155 }, paymentSource: 'checking', termMonths: 61,
    notes: '  Synthetic precision fixture  ', createdAt: '2026-10-20T12:00:00Z' },
  { id: 'precision-card', name: 'Precision Card', category: 'credit_card', kind: 'revolving', balance: 2200.755,
    apr: 0.07123456788999999, minPaymentRule: { type: 'percent', percent: 0.025123456789, floor: 35.005 },
    paymentSource: 'either', promo: { introApr: 0, monthsRemaining: 3, postIntroApr: 0.219 } }],
};
const legacyBytes = ' \n' + JSON.stringify({ version: 1, state: source }, null, 3) + '\n';
const normalized = { ...source, debts: [{ ...source.debts[0], apr: 2 }, source.debts[1]] };
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const button = (page, label) => page.getByRole('button', { name: new RegExp(`^Edit ${escapeRegex(label)}, current value `) });
const field = (page, label) => page.getByRole('textbox', { name: `${label} value`, exact: true });

async function raw(page) {
  return page.evaluate(key => localStorage.getItem(key), canonicalKey);
}
async function stored(page) {
  const bytes = await raw(page);
  assert.ok(bytes, 'the integrated Portfolio store must create the separate canonical v2 key');
  const document = JSON.parse(bytes);
  assert.equal(document.version, 2);
  assert.equal(document.aprUnit, 'decimal');
  return document.data;
}
async function assertSource(page) {
  assert.equal(await page.evaluate(key => localStorage.getItem(key), legacyKey), legacyBytes,
    'original legacy bytes must remain unchanged across all edits and reload');
}
async function open(page, label) {
  await button(page, label).click();
  const input = field(page, label);
  await input.waitFor({ state: 'visible' });
  const geometry = await input.evaluate(element => ({ left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right, width: innerWidth }));
  assert.ok(geometry.left >= -1 && geometry.right <= geometry.width + 1, `${label} editor escapes its ${geometry.width}px viewport`);
  return input;
}
async function waitForValue(page, target, value) {
  await page.waitForFunction(({ key, target, value }) => {
    const bytes = localStorage.getItem(key);
    if (!bytes) return false;
    let current = JSON.parse(bytes).data;
    for (const part of target) current = current?.[part];
    return current === value;
  }, { key: canonicalKey, target, value });
}
async function invalid(page, label, draft, message) {
  const before = await raw(page), input = await open(page, label);
  await input.fill(draft); await input.press('Enter');
  assert.equal(await raw(page), before, `invalid ${JSON.stringify(draft)} cannot change stored inputs`);
  assert.ok(await page.getByRole('alert').filter({ hasText: message }).isVisible(), `invalid ${label} needs visible feedback`);
  await input.press('Escape');
  await button(page, label).waitFor({ state: 'visible' });
  assert.equal(await raw(page), before);
}

async function verifyWidth({ browser, origin, output, width }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort('blockedbyclient'));
  await context.addInitScript(({ legacyKey, legacyBytes }) => {
    if (localStorage.getItem('portfolio-input-fixture-seeded')) return;
    localStorage.setItem(legacyKey, legacyBytes);
    localStorage.setItem('portfolio-input-fixture-seeded', 'yes');
  }, { legacyKey, legacyBytes });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', entry => { if (entry.type() === 'error') errors.push(entry.text()); });
  let observedAPR;
  try {
    const response = await page.goto(`${origin}/portfolio`, { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200);
    assert.equal(new URL(page.url()).pathname, '/portfolio');
    await button(page, 'Precision Loan APR').waitFor({ state: 'visible' });
    const balanceLines = await button(page, 'Precision Loan balance').locator('span').first().evaluate(element => ({
      height: element.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(element).lineHeight),
    }));
    assert.ok(balanceLines.height <= balanceLines.lineHeight * 1.2, `currency digits split across lines at ${width}px`);
    const label = await button(page, 'Precision Loan APR').getAttribute('aria-label');
    const apr = await open(page, 'Precision Loan APR');
    observedAPR = { label, draft: await apr.inputValue() };
    assert.equal(observedAPR.draft, '200', `legacy APR 200 must become canonical 2 (200%), not the clipped old editor: ${JSON.stringify(observedAPR)}`);
    assert.match(label, /200(?:\.0+)?%/);
    await apr.press('Enter');
    await page.getByRole('button', { name: /^Advanced/ }).click();
    assert.deepEqual(await stored(page), normalized);
    await assertSource(page);
    const original = await raw(page);
    for (const [label, expected] of [['Portfolio monthly income', '8200.755'], ['Portfolio monthly expenses', '4700.255'],
      ['Portfolio extra debt payment', '250.125'], ['Portfolio line of credit limit', '25000.995'],
      ['Portfolio line of credit balance', '3200.255'], ['Portfolio line of credit APR', '8.5123456789'],
      ['Precision Loan balance', '12000.705'], ['Precision Loan minimum payment', '425.155'],
      ['Precision Loan APR', '200'], ['Portfolio primary target share', '71.23456789']]) {
      const input = await open(page, label);
      assert.equal(await input.inputValue(), expected, `${label} must open with complete stored precision`);
      await input.press('Tab');
      await button(page, label).waitFor({ state: 'visible' });
      assert.equal(await raw(page), original, `focus/blur no-op for ${label} must retain exact canonical bytes`);
    }
    for (const [label, equivalent] of [['Precision Loan balance', '$ 12,000.7050'], ['Precision Loan APR', '200.0000'],
      ['Portfolio line of credit APR', '8.512345678900'], ['Portfolio primary target share', '71.2345678900']]) {
      const input = await open(page, label);
      await input.fill(equivalent); await input.press('Enter');
      await button(page, label).waitFor({ state: 'visible' });
      assert.equal(await raw(page), original, `equivalent decimal for ${label} must be a no-op`);
    }
    for (const draft of ['', '.', '-5', '12..3']) await invalid(page, 'Precision Loan balance', draft, /valid non-negative number/);
    await invalid(page, 'Precision Loan balance', '100000000000000.01', /supported precision/);
    await invalid(page, 'Precision Loan balance', '120,700', /period for decimals/);
    await invalid(page, 'Portfolio primary target share', '100.01', /at most/);
    const escape = await open(page, 'Precision Loan balance');
    await escape.fill('9999.999'); await escape.press('Escape');
    await button(page, 'Precision Loan balance').waitFor({ state: 'visible' });
    assert.equal(await raw(page), original, 'Escape must cancel a valid but uncommitted draft');

    const edited = JSON.parse(JSON.stringify(normalized));
    for (const [label, draft, target, value, commit] of [
      ['Precision Loan balance', '13000.7055', ['debts', 0, 'balance'], 13000.7055, 'Tab'],
      ['Precision Loan APR', '200.0123456789', ['debts', 0, 'apr'], 2.000123456789, 'Enter'],
      ['Portfolio line of credit APR', '8.6123456789', ['loc', 'apr'], 0.086123456789, 'Enter'],
      ['Portfolio monthly income', '8300.455', ['monthlyIncome'], 8300.455, 'Enter'],
      ['Portfolio primary target share', '75.0123456789', ['splitRatioPrimary'], 0.750123456789, 'Enter'],
    ]) {
      const input = await open(page, label), before = await raw(page);
      await input.fill(draft);
      assert.equal(await raw(page), before, 'draft keystrokes must not persist intermediate numbers');
      await input.press(commit);
      await button(page, label).waitFor({ state: 'visible' });
      await waitForValue(page, target, value);
      let destination = edited;
      for (const part of target.slice(0, -1)) destination = destination[part];
      destination[target.at(-1)] = value;
      assert.deepEqual(await stored(page), edited, 'Enter plus blur must not duplicate or damage committed changes');
    }
    await assertSource(page);
    const saved = await raw(page);
    await page.reload({ waitUntil: 'networkidle' });
    await button(page, 'Precision Loan APR').waitFor({ state: 'visible' });
    assert.equal(await raw(page), saved, 'reload must preserve canonical precise bytes');
    await assertSource(page);
    const reopened = await open(page, 'Precision Loan APR');
    assert.equal(await reopened.inputValue(), '200.0123456789');
    const inputFit = await reopened.evaluate(element => ({ width: element.clientWidth, contentWidth: element.scrollWidth }));
    assert.ok(inputFit.contentWidth <= inputFit.width + 1, `complete APR draft is clipped at ${width}px: ${JSON.stringify(inputFit)}`);
    await reopened.scrollIntoViewIfNeeded();
    await page.waitForFunction(label => {
      let element = Array.from(document.querySelectorAll('input')).find(input => input.getAttribute('aria-label') === label);
      if (!element) return false;
      for (; element; element = element.parentElement) {
        if (Number(getComputedStyle(element).opacity) < 0.99) return false;
      }
      return true;
    }, 'Precision Loan APR value');
    const inputPixels = assertInputPixels(decodePngRgba(await reopened.screenshot({
      path: path.join(output, `portfolio-input-${width}-field.png`),
    })));
    const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      overlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')) }));
    assert.equal(geometry.overlay, false);
    assert.ok(geometry.scrollWidth <= geometry.width + 1, `Portfolio overflows at ${width}px`);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(output, `portfolio-input-${width}.png`) });
    console.log(`PASS precise Portfolio inputs ${width}px`);
    return { width, passed: true, observedAPR, geometry, inputPixels, errors };
  } catch (error) {
    await page.screenshot({ path: path.join(output, `portfolio-input-${width}-failure.png`) }).catch(() => {});
    const receipt = { width, passed: false, message: error.message, observedAPR, errors,
      canonical: await raw(page).catch(() => null) };
    fs.writeFileSync(path.join(output, `portfolio-input-${width}-failure.json`), JSON.stringify(receipt, null, 2) + '\n');
    console.error(`FAIL precise Portfolio inputs ${width}px: ${error.message}`);
    return receipt;
  } finally { await context.close(); }
}

async function runPortfolioInputFixtures({ browser, origin, output }) {
  fs.mkdirSync(output, { recursive: true });
  const receipts = [];
  for (const width of [375, 1440, 280]) receipts.push(await verifyWidth({ browser, origin, output, width }));
  fs.writeFileSync(path.join(output, 'portfolio-input-verification.json'), JSON.stringify({ origin, receipts }, null, 2) + '\n');
  assert.equal(receipts.filter(receipt => !receipt.passed).length, 0, 'precise Portfolio rendered input fixtures must all pass');
  return receipts;
}
module.exports = runPortfolioInputFixtures;
module.exports.runPortfolioInputFixtures = runPortfolioInputFixtures;
module.exports.assertInputPixels = assertInputPixels;

async function main(runFixtures = runPortfolioInputFixtures) {
  const { chromium } = require('playwright-core');
  const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
  const { startBuiltServer, stopServer, createGracefulShutdown } = require('./built-server-harness.cjs');
  const root = path.resolve(__dirname, '..');
  assert.ok(fs.existsSync(path.join(root, '.next', 'BUILD_ID')), 'an existing production web build is required');
  const executablePath = findBrowserExecutable();
  assert.ok(executablePath, 'existing project browser harness must find Chrome/Chromium/Edge');
  let server, browser;
  const shutdown = createGracefulShutdown({ closeBrowser: async () => { await browser?.close(); },
    stopServer: () => stopServer(server?.server), exit: code => { process.exitCode = code; },
    hardExit: code => { void stopServer(server?.server); process.exit(code); } });
  const deadline = setTimeout(() => { console.error('Portfolio input fixture reached its finite 120s deadline.'); void shutdown(1); }, 120000);
  try {
    server = process.env.PORTFOLIO_INPUT_ORIGIN ? null : await startBuiltServer(root);
    const origin = process.env.PORTFOLIO_INPUT_ORIGIN || server.origin;
    browser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });
    const output = path.resolve(process.env.PORTFOLIO_INPUT_OUTPUT || path.join(root, 'test-results', 'portfolio-input'));
    console.log(`Portfolio input fixtures against existing built web app at ${origin}; isolated 375/1440/280px contexts.`);
    await runFixtures({ browser, origin, output });
  } catch (error) { process.exitCode = 1; throw error; }
  finally { clearTimeout(deadline); await shutdown(process.exitCode ?? 0); }
}
module.exports.main = main;
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
