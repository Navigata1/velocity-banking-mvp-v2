const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const appRoot = path.resolve(__dirname, '..'), root = path.resolve(appRoot, '../..');
const assumptionsKey = 'interestshield.mobile.assumptions.v1';
const defaultInput = { monthlyIncome: 8200, monthlyExpenses: 4700, chunkAmount: 1000, activeDebtName: 'Auto Loan',
  activeDebt: { balance: 18450, apr: 0.069, monthlyPayment: 425, termMonths: 48 },
  loc: { limit: 25000, balance: 3200, apr: 0.085 } };
const finalPaymentInput = { monthlyIncome: 1000, monthlyExpenses: 800, chunkAmount: 100, activeDebtName: 'Synthetic final payment',
  activeDebt: { balance: 100, apr: 0.12, monthlyPayment: 425, termMonths: 48 }, loc: { limit: 2000, balance: 0, apr: 0 } };
const routes = [['Dashboard', '/', 'Next Move'], ['Simulator', '/simulator', 'Current Plan'],
  ['Cockpit', '/cockpit', 'Flight Status'], ['Learn', '/learn', 'Money Loop'], ['Vault', '/vault', 'Stabilize']];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const field = page => page.getByRole('textbox', { name: 'Active debt APR', exact: true });
const card = (page, title) => page.getByRole('heading', { name: title, exact: true }).locator('..');
const read = page => page.evaluate(key => localStorage.getItem(key), assumptionsKey);
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

function filesBelow(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(entry => entry.isDirectory() ? filesBelow(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
function sourceHashes() {
  const files = ['packages/financial-engine/src', 'apps/mobile/app', 'apps/mobile/components', 'apps/mobile/hooks',
    'apps/mobile/lib', 'apps/web/public/heroes'].flatMap(relative => filesBelow(path.join(root, relative)));
  files.push(__filename, path.join(__dirname, 'smoke-accessibility-rendered.cjs'));
  return Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))]));
}
function exportHashes(directory = path.join(appRoot, 'dist-web')) {
  return Object.fromEntries(filesBelow(directory).map(file =>
    [path.relative(directory, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))]));
}
async function ready(page) {
  await field(page).waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const input = [...document.querySelectorAll('input[aria-label="Active debt APR"]')].find(input => input.getClientRects().length && !input.closest('[aria-hidden="true"]'));
    return input && !input.disabled && !input.readOnly;
  });
}
function check(receipt, name, actual, expected) {
  try { assert.deepEqual(actual, expected, name); receipt.checks.push({ name, passed: true }); }
  catch (error) { receipt.checks.push({ name, passed: false, actual, expected, message: error.message }); }
}
async function untouched(page, receipt, bytes, writeCount, label) {
  await page.evaluate(() => Promise.all(window.__coachingPending));
  assert.equal(await read(page), bytes, `${label}: complete committed envelope bytes remain unchanged`);
  assert.equal(receipt.writes.length, writeCount, `${label}: no hidden writes, removes or clears, including across reload`);
}
async function screenshot(page, receipt, label, focus) {
  await focus.scrollIntoViewIfNeeded();
  const filename = `coaching-${receipt.name}-${receipt.width}-${label}.png`;
  const bytes = await page.screenshot({ path: path.join(receipt.output, filename), fullPage: false });
  const sharp = require(path.resolve(appRoot, '../web/node_modules/sharp'));
  const { data, info } = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let nonWhite = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    if (data[offset] < 245 || data[offset + 1] < 245 || data[offset + 2] < 245) nonWhite++;
  }
  assert.equal(info.width, receipt.width, 'screenshot is the actual viewport width');
  assert.equal(info.height, 900, 'screenshot is viewport-only, not a tall full-page image');
  assert.ok(nonWhite / (info.width * info.height) > 0.1, 'viewport image is not a white screen');
  receipt.screenshots.push({ filename, width: info.width, height: info.height, sha256: sha(bytes), nonWhiteRatio: nonWhite / (info.width * info.height) });
}
async function surface(page, receipt, route, label) {
  assert.equal(new URL(page.url()).pathname, route, 'intended route identity');
  assert.equal(await page.title(), 'InterestShield', 'intended document identity');
  await page.getByRole('heading', { name: `${label} screen`, exact: true }).waitFor({ state: 'visible' });
  const geometry = await page.evaluate(() => ({ width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth, text: document.body.innerText.length,
    overlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay, [data-logbox]')) }));
  assert.equal(geometry.overlay, false, 'no framework error overlay');
  assert.ok(geometry.text > 200, 'nonblank meaningful app content');
  assert.ok(geometry.scroll <= geometry.width + 1, 'no horizontal overflow');
  assert.deepEqual(receipt.errors, [], 'no page or console errors');
}
async function assess(page, receipt, label, failed, phase) {
  const value = (title, text) => card(page, title).getByText(text, { exact: true }).count();
  const reason = title => card(page, title).getByText(/Payment below interest/).count();
  if (label === 'Dashboard') {
    check(receipt, `${phase} dashboard ETA`, await value('Debt-Free ETA', failed ? 'Review inputs' : '1 mo'), 1);
    check(receipt, `${phase} dashboard next move`, await value('Next Move', failed ? 'Review payoff inputs' : 'Pause new chunks'), 1);
    if (failed) {
      check(receipt, `${phase} dashboard warning`, await reason('Review Before Modeling'), 1);
      check(receipt, `${phase} dashboard never sends principal`, await card(page, 'Next Move').getByText(/^Send /).count(), 0);
    } else check(receipt, `${phase} dashboard no invalid guardrail`, await page.getByRole('heading', { name: 'Review Before Modeling', exact: true }).count(), 0);
  } else if (label === 'Simulator') {
    check(receipt, `${phase} simulator current plan`, await value('Current Plan', failed ? 'Review payoff inputs' : 'Pause new chunks'), 1);
    if (failed) check(receipt, `${phase} simulator failure reason`, await reason('Current Plan'), 1);
    else {
      check(receipt, `${phase} simulator valid current plan`, await value('Current Plan', 'Educational estimate: the scheduled-payment policy pauses new chunks. Unused final payments can still recover the LOC.'), 1);
      check(receipt, `${phase} simulator has no stale generic readiness`, await value('Current Plan', 'Inputs are ready for a simulator pass.'), 0);
      check(receipt, `${phase} simulator actual one-month velocity`, await card(page, 'Strategy Comparison').getByText('Velocity: 1 mo', { exact: true }).count(), 1);
    }
  } else if (label === 'Cockpit') {
    check(receipt, `${phase} cockpit status`, await value('Flight Status', failed ? 'Review inputs' : 'Ready to model'), 1);
    if (failed) check(receipt, `${phase} cockpit reason`, await reason('Flight Status'), 1);
  } else if (label === 'Learn') {
    check(receipt, `${phase} learn money loop`, await value('Money Loop', failed ? 'Review payoff inputs' : 'Pause new chunks'), 1);
    if (failed) {
      check(receipt, `${phase} learn review guard`, await value('Learning Mode', 'Review inputs'), 1);
      check(receipt, `${phase} learn failure reason`, await reason('Learning Mode'), 1);
    } else check(receipt, `${phase} learn no invalid guardrail`, await page.getByRole('heading', { name: 'Learning Mode', exact: true }).count(), 0);
  } else {
    check(receipt, `${phase} vault stabilize`, await value('Stabilize', failed ? 'Review inputs' : 'Ready'), 1);
    check(receipt, `${phase} vault freedom path`, await value('Freedom Path', failed ? 'Review inputs' : '1 mo'), 1);
    if (failed) check(receipt, `${phase} vault failure reason`, await reason('Stabilize'), 1);
  }
}
async function tour(page, receipt, bytes, writeCount, failed) {
  for (const [label, route, focusTitle] of routes) {
    if (new URL(page.url()).pathname !== route) {
      await page.getByRole('tab', { name: `${label} mobile section`, exact: true }).click();
      await page.waitForURL(`${receipt.origin}${route}`);
    }
    for (const phase of ['navigation', 'reload']) {
      if (phase === 'reload') assert.equal((await page.reload({ waitUntil: 'networkidle' }))?.status(), 200);
      await ready(page); await surface(page, receipt, route, label);
      await untouched(page, receipt, bytes, writeCount, `${label} ${phase}`);
      await assess(page, receipt, label, failed, `${label} ${phase}`);
      receipt.surfaces.push({ label, phase, route, bytes, writeCount: receipt.writes.length,
        content: await card(page, focusTitle).innerText() });
      await screenshot(page, receipt, `${label.toLowerCase()}-${phase}`, card(page, focusTitle));
    }
  }
}
async function commitApr(page, receipt, text, expectedApr, previousBytes) {
  const before = JSON.parse(previousBytes), writesBefore = receipt.writes.length;
  await field(page).fill(''); await field(page).pressSequentially(text, { delay: 15 });
  await untouched(page, receipt, previousBytes, writesBefore, 'uncommitted APR draft');
  await field(page).press('Enter');
  await page.waitForFunction(({ key, revision }) => JSON.parse(localStorage.getItem(key)).revision === revision,
    { key: assumptionsKey, revision: before.revision + 1 });
  await page.evaluate(() => Promise.all(window.__coachingPending));
  const bytes = await read(page), saved = JSON.parse(bytes);
  assert.deepEqual(saved, { ...before, revision: before.revision + 1, savedAt: saved.savedAt,
    input: { ...before.input, activeDebt: { ...before.input.activeDebt, apr: expectedApr } } }, 'only submitted APR plus revision/time changes');
  assert.ok(Number.isFinite(Date.parse(saved.savedAt)), 'real commit timestamp');
  assert.equal(receipt.writes.length, writesBefore + 1, 'exactly one write per explicit UI commit');
  assert.equal(receipt.writes.at(-1).key, assumptionsKey);
  assert.equal(receipt.writes.at(-1).value, bytes);
  assert.equal(await field(page).inputValue(), text);
  return bytes;
}
async function failedProjection(page, receipt, initialBytes) {
  check(receipt, 'healthy default comparison before edit', await card(page, 'Next Move').getByText('Compare payoff paths', { exact: true }).count(), 1);
  const committed = await commitApr(page, receipt, '200', 200, initialBytes);
  receipt.committedBytes = committed;
  await tour(page, receipt, committed, 1, true);
  await page.getByRole('tab', { name: 'Dashboard mobile section', exact: true }).click();
  await page.waitForURL(`${receipt.origin}/`); await ready(page);
  const restored = await commitApr(page, receipt, '6.9', 0.069, committed);
  receipt.restoredBytes = restored;
  check(receipt, 'healthy default comparison resumes', await card(page, 'Next Move').getByText('Compare payoff paths', { exact: true }).count(), 1);
  check(receipt, 'healthy default warning clears', await page.getByRole('heading', { name: 'Review Before Modeling', exact: true }).count(), 0);
  await page.reload({ waitUntil: 'networkidle' }); await ready(page);
  await untouched(page, receipt, restored, 2, 'restored APR reload');
  check(receipt, 'healthy default comparison survives reload', await card(page, 'Next Move').getByText('Compare payoff paths', { exact: true }).count(), 1);
  await screenshot(page, receipt, 'restored-default', card(page, 'Next Move'));
}
async function runCoachingSafetyFixtures({ browser, origin, output, exportDirectory = path.join(appRoot, 'dist-web') }) {
  const url = new URL(origin); assert.equal(url.protocol, 'http:');
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'synthetic loopback HTTP only');
  fs.mkdirSync(output, { recursive: true });
  const exportRoot = fs.realpathSync(exportDirectory);
  assert.ok(fs.statSync(path.join(exportRoot, 'index.html')).isFile(), 'selected export needs its actual HTML');
  const sources = sourceHashes(), exported = exportHashes(exportRoot), served = {};
  for (const file of Object.keys(exported).filter(file => file === 'index.html' || file.endsWith('.js'))) {
    const response = await fetch(`${origin}/${file}`); assert.equal(response.status, 200);
    served[file] = sha(Buffer.from(await response.arrayBuffer()));
    assert.equal(served[file], exported[file], `actual served export matches local bytes: ${file}`);
  }
  const receipts = [];
  for (const width of [375, 280, 1440]) for (const name of ['failed-projection', 'healthy-final-payment']) {
    const input = name === 'failed-projection' ? defaultInput : finalPaymentInput;
    const initialBytes = JSON.stringify({ version: 1, ownerId: null, revision: 7, savedAt: '2026-10-21T00:00:00Z', input });
    const receipt = { name, width, passed: false, origin, output, initialBytes, checks: [], writes: [], capabilityProbes: [], errors: [], surfaces: [], screenshots: [] };
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
    await context.exposeBinding('__coachingRecordWrite', (_, event) => {
      if (/^lswt-/.test(event.key)) receipt.capabilityProbes.push(event);
      else receipt.writes.push(event);
    });
    await context.addInitScript(({ key, initialBytes }) => {
      if (!sessionStorage.getItem('coaching-synthetic-seeded')) {
        localStorage.setItem(key, initialBytes); sessionStorage.setItem('coaching-synthetic-seeded', 'yes');
      }
      window.__coachingPending = [];
      for (const method of ['setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (key, value) {
          if (this === localStorage) window.__coachingPending.push(window.__coachingRecordWrite({ method, key: key ?? null, value: value ?? null }));
          return original.apply(this, arguments);
        };
      }
    }, { key: assumptionsKey, initialBytes });
    const page = await context.newPage();
    page.setDefaultTimeout(10000); page.setDefaultNavigationTimeout(15000);
    page.on('pageerror', error => receipt.errors.push(error.message));
    page.on('console', entry => { if (entry.type() === 'error') receipt.errors.push(entry.text()); });
    try {
      assert.equal((await page.goto(origin, { waitUntil: 'networkidle' }))?.status(), 200);
      await ready(page); await surface(page, receipt, '/', 'Dashboard');
      await untouched(page, receipt, initialBytes, 0, 'synthetic hydration');
      await screenshot(page, receipt, 'initial-viewport', page.getByRole('heading', { name: 'Dashboard screen', exact: true }));
      if (name === 'failed-projection') await failedProjection(page, receipt, initialBytes);
      else await tour(page, receipt, initialBytes, 0, false);
      assert.deepEqual(receipt.errors, []);
      assert.equal(receipt.checks.filter(check => !check.passed).length, 0, 'coaching safety assertions failed; see separately named checks');
      receipt.passed = true; console.log(`PASS native coaching safety ${name} ${width}px`);
    } catch (error) {
      receipt.message = error.message;
      receipt.failure = { stack: error.stack, url: page.url(), assumptions: await read(page).catch(() => null),
        body: await page.locator('body').innerText().catch(() => null) };
      await page.screenshot({ path: path.join(output, `coaching-${name}-${width}-failure.png`), fullPage: false }).catch(() => {});
      writeJson(path.join(output, `coaching-${name}-${width}-failure.json`), receipt.failure);
      console.error(`FAIL native coaching safety ${name} ${width}px: ${error.message}`);
    } finally { delete receipt.output; receipts.push(receipt); await context.close(); }
  }
  const sourcesAfter = sourceHashes(), exportedAfter = exportHashes(exportRoot);
  const preserved = { sources: JSON.stringify(sources) === JSON.stringify(sourcesAfter), export: JSON.stringify(exported) === JSON.stringify(exportedAfter) };
  writeJson(path.join(output, 'coaching-verification.json'), { origin, capturedAt: new Date().toISOString(),
    scope: 'Existing Expo export over native HTTP, fresh synthetic contexts only, not physical-device QA. Original 76 cases and receipts unchanged.',
    originalCaseCount: 76, newCaseCount: 6, passed: receipts.filter(receipt => receipt.passed).length,
    browserPath: 'Existing project Playwright explicitly requested; no installs or user storage.',
    hashes: { sources, exported, served }, preserved, receipts });
  assert.deepEqual(preserved, { sources: true, export: true }, 'fixture must preserve model, source and export bytes');
  assert.equal(receipts.filter(receipt => !receipt.passed).length, 0, 'native coaching safety rendered regressions failed');
  return receipts;
}
module.exports = runCoachingSafetyFixtures;
module.exports.runCoachingSafetyFixtures = runCoachingSafetyFixtures;

async function main() {
  assert.ok(process.env.MOBILE_COACHING_OUTPUT, 'Supply MOBILE_COACHING_OUTPUT. This command never builds the export.');
  const origin = process.env.MOBILE_COACHING_ORIGIN; assert.ok(origin, 'Supply MOBILE_COACHING_ORIGIN for an existing loopback server.');
  const { chromium } = require(path.resolve(appRoot, '../web/node_modules/playwright-core'));
  const { findBrowserExecutable, getHeadlessChromiumArgs } = require('../../web/scripts/browser-harness.cjs');
  const executablePath = findBrowserExecutable(); assert.ok(executablePath, 'existing project browser is required');
  const browser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });
  const deadline = setTimeout(() => { console.error('Coaching safety fixture exceeded its finite 180s launcher deadline.');
    process.exitCode = 1; void browser.close(); }, 180000);
  try { await runCoachingSafetyFixtures({ browser, origin, output: path.resolve(process.env.MOBILE_COACHING_OUTPUT), exportDirectory: process.env.MOBILE_COACHING_EXPORT_DIR }); }
  finally { clearTimeout(deadline); await browser.close(); }
}
if (require.main === module) main().catch(error => {
  if (process.env.MOBILE_COACHING_OUTPUT) {
    fs.mkdirSync(path.resolve(process.env.MOBILE_COACHING_OUTPUT), { recursive: true });
    writeJson(path.resolve(process.env.MOBILE_COACHING_OUTPUT, 'browser-launch-diagnostics.json'), { at: new Date().toISOString(), message: error.message, stack: error.stack });
  }
  console.error(error); process.exitCode = 1;
});
