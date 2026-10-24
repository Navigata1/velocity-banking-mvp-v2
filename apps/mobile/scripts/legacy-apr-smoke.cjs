const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const assumptionsKey = 'interestshield.mobile.assumptions.v1', bookKey = 'interestshield.mobile.portfolio.v1';
const input = { monthlyIncome: 8200.75, monthlyExpenses: 4700.25, chunkAmount: 1000.55,
  activeDebtName: 'Synthetic legacy APR loan', activeDebt: { balance: 12000.705, apr: 6.5, monthlyPayment: 425.15, termMonths: 60 },
  loc: { limit: 25000.99, balance: 3200.25, apr: 8.5 } };
const envelope = { version: 1, ownerId: null, revision: 7, savedAt: '2026-10-21T00:00:00Z', input };
const initialBytes = JSON.stringify(envelope);
const read = page => page.evaluate(key => localStorage.getItem(key), assumptionsKey);
const field = (page, label) => page.getByLabel(label, { exact: true });
async function edit(page, label, text) { const control = field(page, label); await control.fill(text); await control.press('Tab'); }
async function ready(page) {
  await field(page, 'Active debt APR').waitFor({ state: 'visible' });
  await page.waitForFunction(() => { const el = document.querySelector('input[aria-label="Active debt APR"]'); return el && !el.disabled && !el.readOnly; });
}
async function surface(page) {
  const geometry = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
    overlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')) }));
  assert.equal(geometry.overlay, false); assert.ok(geometry.scroll <= geometry.width + 1, 'no horizontal overflow');
  assert.ok(await page.getByRole('heading').count(), 'meaningful route heading');
}
async function unchanged(page, bytes) {
  assert.equal(await read(page), bytes, 'preserve complete envelope, savedAt, revision and exact bytes');
  assert.deepEqual(await page.evaluate(() => window.__legacyAprWrites), [], 'no transient persistent writes');
}
async function preservation(page, receipt) {
  for (const [label, value] of [['Active debt APR', '6.5'], ['Line of credit APR', '8.5']]) {
    assert.equal(await field(page, label).inputValue(), value, `${label} uses legacy mixed units`);
    await field(page, label).focus(); await field(page, label).press('Tab');
    await edit(page, label, `${value}00`);
  }
  await unchanged(page, initialBytes);
  for (const label of ['Active debt APR', 'Line of credit APR']) {
    for (const invalid of ['', '.', '-5', '12..3', '1e999', '6,5', '100000000000000.01']) {
      await edit(page, label, invalid); await unchanged(page, initialBytes);
      assert.equal(await field(page, label).inputValue(), label === 'Active debt APR' ? '6.5' : '8.5');
    }
  }
  await field(page, 'Active debt APR').fill('200'); await unchanged(page, initialBytes);
  // Reload abandons an unsubmitted draft; Escape is not a supported native cancel command.
  await page.reload({ waitUntil: 'networkidle' }); await ready(page); await unchanged(page, initialBytes);
  assert.equal(await field(page, 'Active debt APR').inputValue(), '6.5');
  await page.getByText('Restored locally', { exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('tab', { name: 'Portfolio mobile section' }).click(); await page.waitForURL('**/portfolio'); await surface(page);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), bookKey), null);
  await page.getByRole('tab', { name: 'Dashboard mobile section' }).click(); await page.waitForURL(`${new URL(page.url()).origin}/`);
  await page.reload({ waitUntil: 'networkidle' }); await ready(page); await unchanged(page, initialBytes);
  assert.equal(await field(page, 'Active debt APR').inputValue(), '6.5');
  assert.equal(await field(page, 'Line of credit APR').inputValue(), '8.5');
  receipt.checks = { noOps: 2, equivalentEdits: 2, invalidDrafts: 14, abandonedDraftReload: true, navigationReload: true };
}
async function entryAndCopy(page, receipt) {
  const apr = field(page, 'Active debt APR'); await apr.fill(''); await apr.pressSequentially('200', { delay: 15 });
  await unchanged(page, initialBytes); await apr.press('Enter');
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).revision > 7, assumptionsKey);
  const bytes = await read(page), saved = JSON.parse(bytes), expected = { ...input, activeDebt: { ...input.activeDebt, apr: 200 } };
  assert.deepEqual(saved.input, expected, 'only activeDebt.apr changes, stored in legacy units');
  assert.deepEqual({ ...saved, input, savedAt: envelope.savedAt, revision: 7 }, envelope);
  assert.equal(saved.revision, 8); assert.ok(Number.isFinite(Date.parse(saved.savedAt)));
  assert.equal(await page.evaluate(() => window.__legacyAprWrites.length), 1, 'submit and blur commit exactly once');
  assert.equal(await apr.inputValue(), '200');
  const dailyBurn = (input.activeDebt.balance * 2 + input.loc.balance * 0.085) / 365;
  const dailyLabel = `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(dailyBurn)}/day`;
  assert.ok((await page.getByRole('heading', { name: 'Interest Burn', exact: true }).locator('..').innerText()).includes(dailyLabel), 'daily burn models 200% debt plus 8.5% LOC');
  await page.getByRole('heading', { name: 'Interest Burn', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(receipt.output, `legacy-apr-burn-${receipt.width}.png`) });
  await page.getByRole('tab', { name: 'Portfolio mobile section' }).click(); await page.waitForURL('**/portfolio');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), bookKey), null, 'copy destination starts empty');
  await page.getByRole('button', { name: 'Copy current scenario', exact: true }).click();
  await page.getByTestId('native-portfolio-storage-status').filter({ hasText: /^\s*Saved\b/i }).waitFor({ state: 'visible' });
  const bookBytes = await page.evaluate(key => localStorage.getItem(key), bookKey), bookEnvelope = JSON.parse(bookBytes), document = JSON.parse(bookEnvelope.document);
  assert.equal(document.version, 2); assert.equal(document.aprUnit, 'decimal');
  assert.equal(document.data.debts.length, 1); assert.equal(document.data.debts[0].apr, 2); assert.equal(document.data.loc.apr, 0.085);
  assert.equal(await field(page, 'Debt 1 APR').inputValue(), '200'); assert.equal(await field(page, 'Portfolio LOC APR').inputValue(), '8.5');
  await edit(page, 'Debt 1 APR', '200.00'); await edit(page, 'Portfolio LOC APR', '8.500');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), bookKey), bookBytes, 'canonical APR2 still means 200%; equivalent edits preserve book bytes');
  assert.equal(await read(page), bytes, 'copy never rewrites single-scenario assumptions'); await surface(page);
  await page.screenshot({ path: path.join(receipt.output, `legacy-apr-canonical-${receipt.width}.png`), fullPage: true });
  await page.reload({ waitUntil: 'networkidle' }); await field(page, 'Debt 1 APR').waitFor({ state: 'visible' });
  assert.equal(await field(page, 'Debt 1 APR').inputValue(), '200');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), bookKey), bookBytes);
  await page.getByRole('tab', { name: 'Dashboard mobile section' }).click(); await page.waitForURL(`${new URL(page.url()).origin}/`);
  await page.reload({ waitUntil: 'networkidle' }); await ready(page); await unchanged(page, bytes);
  assert.equal(await field(page, 'Active debt APR').inputValue(), '200'); assert.equal(await field(page, 'Line of credit APR').inputValue(), '8.5');
  receipt.checks = { committedRaw: 200, canonicalRaw: 2, dailyBurn, dailyLabel, scenarioBytes: bytes, bookBytes };
}
async function runLegacyAprFixtures({ browser, origin, output }) {
  fs.mkdirSync(output, { recursive: true });
  const appRoot = path.resolve(__dirname, '..'), root = path.resolve(appRoot, '..', '..');
  const files = ['packages/financial-engine/src/input-draft.ts', 'apps/mobile/components/mobile-shell/controls.tsx',
    'apps/mobile/scripts/legacy-apr-smoke.cjs', 'apps/mobile/scripts/smoke-accessibility-rendered.cjs',
    'apps/mobile/scripts/financial-input-smoke.cjs', 'apps/mobile/scripts/portfolio-book-smoke.cjs', 'apps/mobile/dist-web/index.html',
    ...fs.readdirSync(path.join(appRoot, 'dist-web/_expo/static/js/web')).map(file => `apps/mobile/dist-web/_expo/static/js/web/${file}`)];
  const hashes = Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
  const receipts = [];
  for (const width of [375, 280, 1440]) for (const [name, run] of [['preservation', preservation], ['entry200-copy', entryAndCopy]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
    await context.addInitScript(({ assumptionsKey, bookKey, initialBytes }) => {
      if (!sessionStorage.getItem('legacy-apr-seeded')) { localStorage.setItem(assumptionsKey, initialBytes); sessionStorage.setItem('legacy-apr-seeded', 'yes'); }
      window.__legacyAprWrites = []; const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) { if (this === localStorage && [assumptionsKey, bookKey].includes(key)) window.__legacyAprWrites.push({ key, value }); return original.call(this, key, value); };
    }, { assumptionsKey, bookKey, initialBytes });
    const page = await context.newPage(), errors = [], receipt = { name, width, passed: false, output };
    page.setDefaultTimeout(10000); page.setDefaultNavigationTimeout(15000);
    page.on('pageerror', error => errors.push(error.message)); page.on('console', entry => { if (entry.type() === 'error') errors.push(entry.text()); });
    try {
      assert.equal((await page.goto(origin, { waitUntil: 'networkidle' }))?.status(), 200);
      await ready(page); await surface(page); await run(page, receipt); await surface(page); assert.deepEqual(errors, []);
      await field(page, 'Active debt APR').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(output, `legacy-apr-${name}-${width}.png`), fullPage: true });
      receipt.passed = true; console.log(`PASS native legacy APR ${name} ${width}px`);
    } catch (error) {
      receipt.message = error.message; receipt.assumptions = await read(page).catch(() => null);
      receipt.display = await field(page, 'Active debt APR').inputValue().catch(() => null);
      await page.screenshot({ path: path.join(output, `legacy-apr-${name}-${width}-failure.png`), fullPage: true }).catch(() => {});
      console.error(`FAIL native legacy APR ${name} ${width}px: ${error.message}`);
    } finally { receipt.errors = errors; delete receipt.output; receipts.push(receipt); await context.close(); }
  }
  fs.writeFileSync(path.join(output, 'legacy-apr-verification.json'), JSON.stringify({ origin, capturedAt: new Date().toISOString(),
    scope: 'Exported Expo app HTTP; fresh synthetic browser contexts, not physical-device QA. Original 70 native cases are separate and unchanged.',
    newCaseCount: 6, passed: receipts.filter(r => r.passed).length, hashes, receipts }, null, 2) + '\n');
  assert.equal(receipts.filter(r => !r.passed).length, 0, 'native legacy APR rendered regressions failed'); return receipts;
}
module.exports = runLegacyAprFixtures;
module.exports.runLegacyAprFixtures = runLegacyAprFixtures;

async function main() {
  const origin = process.env.MOBILE_LEGACY_APR_ORIGIN, output = process.env.MOBILE_LEGACY_APR_OUTPUT;
  assert.ok(origin && output, 'Supply MOBILE_LEGACY_APR_ORIGIN and MOBILE_LEGACY_APR_OUTPUT; this command never builds or starts a server.');
  const url = new URL(origin); assert.equal(url.protocol, 'http:'); assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  const { chromium } = require(path.resolve(__dirname, '../../web/node_modules/playwright-core'));
  const { findBrowserExecutable, getHeadlessChromiumArgs } = require('../../web/scripts/browser-harness.cjs');
  const executablePath = findBrowserExecutable(); assert.ok(executablePath, 'existing project browser is required');
  const browser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });
  const deadline = setTimeout(() => { console.error('Legacy APR fixture exceeded its finite 120s launcher deadline.'); process.exitCode = 1; void browser.close(); }, 120000);
  try { await runLegacyAprFixtures({ browser, origin: url.origin, output: path.resolve(output) }); }
  finally { clearTimeout(deadline); await browser.close(); }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
