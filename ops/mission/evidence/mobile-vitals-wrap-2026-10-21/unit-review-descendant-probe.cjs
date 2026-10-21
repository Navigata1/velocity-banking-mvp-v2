const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const out = __dirname, repo = process.cwd(), root = path.join(repo, 'apps/web');
const req = createRequire(path.join(root, 'package.json'));
const { chromium } = req('playwright-core');
const { startBuiltServer, stopServer } = req('./scripts/built-server-harness.cjs');
const { findBrowserExecutable, getHeadlessChromiumArgs } = req('./scripts/browser-harness.cjs');
const files = ['apps/web/src/app/page.tsx', 'apps/web/scripts/smoke-dashboard-interest.cjs', 'apps/web/scripts/engine-regression-tests.cjs'];
const pins = () => Object.fromEntries(files.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, f))).digest('hex')]));
const source = fs.readFileSync(path.join(root, 'scripts/smoke-dashboard-interest.cjs'), 'utf8');
const oracleSource = source.slice(source.indexOf('async function vitalLayout('), source.indexOf('async function checkVitalOracleControls('));
const { vitalLayout, assertVitalLayout } = new Function('assert', `${oracleSource}\nreturn { vitalLayout, assertVitalLayout };`)(assert);
const record = { started: new Date().toISOString(), command: 'node .superpowers/sdd/2026-10-21-mobile-vitals/unit-review-descendant-probe.cjs',
  initialHashes: pins(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim(), controls: [], errors: [] };
let server, browser;
async function main() {
  server = await startBuiltServer(root); record.origin = server.origin; record.serverPid = server.server.pid;
  browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true, args: getHeadlessChromiumArgs() });
  const context = await browser.newContext({ viewport: { width: 280, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('velocity-bank-storage', JSON.stringify({ version: 0, state: {
    activeDomain: 'house', monthlyIncome: 100000001, monthlyExpenses: 10000001, chunkAmount: 20000001, chunkFrequency: 'weekly',
    debts: { house: { balance: 100000000, interestRate: 0.365, minimumPayment: 10000001 } },
    loc: { limit: 200000000, balance: 100000000, interestRate: 0.365 },
  } })));
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', e => record.errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') record.errors.push(m.text()); });
  assert.equal((await page.goto(server.origin, { waitUntil: 'networkidle' })).status(), 200);
  const value = page.getByTestId('dashboard-mobile-vital-interest-burn').locator('p').nth(1);
  await value.evaluate(el => { el.style.fontFamily = 'Verdana, sans-serif'; });
  await page.waitForFunction(() => { let n = document.querySelector('main'); while (n) { if (Number(getComputedStyle(n).opacity) < 0.99) return false; n = n.parentElement; } return true; });
  record.before = await vitalLayout(page, 280); assertVitalLayout(record.before, 'unit descendant baseline');
  const unit = value.locator('span');
  for (const control of [
    { kind: 'unit-opacity-zero', style: 'opacity:0' },
    { kind: 'unit-visibility-hidden', style: 'visibility:hidden' },
    { kind: 'unit-overflow-clipping', style: 'height:1px;overflow:hidden' },
  ]) {
    const saved = await unit.getAttribute('style');
    await unit.evaluate((el, css) => el.setAttribute('style', css), control.style);
    try {
      const layout = await vitalLayout(page, 280); let failure = null;
      try { assertVitalLayout(layout, control.kind); } catch (e) { if (!(e instanceof assert.AssertionError)) throw e; failure = e.message; }
      const bounds = await value.evaluate(el => {
        const range = document.createRange(); range.selectNodeContents(el); const box = el.getBoundingClientRect(), unit = el.querySelector('span');
        return { text: el.textContent, fits: [...range.getClientRects()].every(r => r.left >= box.left - 1 && r.right <= box.right + 1) && el.scrollWidth <= el.clientWidth + 1,
          unit: { opacity: getComputedStyle(unit).opacity, visibility: getComputedStyle(unit).visibility, height: unit.getBoundingClientRect().height, overflow: getComputedStyle(unit).overflow } };
      });
      const current = { ...control, accepted: !failure, failure, layout, inheritedAmountGuard: bounds };
      record.controls.push(current);
      await page.screenshot({ path: path.join(out, `unit-review-${control.kind}.png`), animations: 'disabled' });
      console.log(JSON.stringify({ kind: control.kind, accepted: !failure, bounds }));
      assert.equal(bounds.text, 'Est. $200,000.00/day');
    } finally {
      await unit.evaluate((el, original) => { if (original === null) el.removeAttribute('style'); else el.setAttribute('style', original); }, saved);
      assert.deepEqual(await vitalLayout(page, 280), record.before);
    }
  }
  assert.deepEqual(record.errors, []);
  await context.close();
}
main().catch(e => { record.failure = e.stack; console.error(e); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); await stopServer(server?.server);
  record.finalHashes = pins(); record.filesStable = JSON.stringify(record.initialHashes) === JSON.stringify(record.finalHashes); record.serverStopped = !server || server.server.exitCode !== null;
  record.finished = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'unit-review-descendant-evidence.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify({ filesStable: record.filesStable, serverStopped: record.serverStopped, serverPid: record.serverPid }));
});
