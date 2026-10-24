const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const repo = process.cwd(), out = __dirname, root = path.join(repo, 'apps/web');
const req = createRequire(path.join(root, 'package.json'));
const { chromium } = req('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = req('./scripts/browser-harness.cjs');
const { startBuiltServer, stopServer } = req('./scripts/built-server-harness.cjs');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const files = ['apps/web/src/app/page.tsx', 'apps/web/scripts/smoke-dashboard-interest.cjs', 'apps/web/scripts/engine-regression-tests.cjs'];
const hashes = () => Object.fromEntries(files.map(f => [f, sha(fs.readFileSync(path.join(repo, f)))]));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true });
const oldNames = fs.readdirSync(out).filter(f => /^(review-|unit-review-)/.test(f));
const oldHashes = () => Object.fromEntries(oldNames.map(f => [f, sha(fs.readFileSync(path.join(out, f)))]));
const oldPins = oldHashes(), logs = [];
const log = text => { logs.push(text); console.log(text); };
const save = (name, value) => fs.writeFileSync(path.join(out, `unit-final-${name}.json`), JSON.stringify(value, null, 2) + '\n');
const source = fs.readFileSync(path.join(root, 'scripts/smoke-dashboard-interest.cjs'), 'utf8');
const helperSource = source.slice(source.indexOf('async function vitalLayout('), source.indexOf('(async () => {'));
const outputFS = { writeFileSync(target, data) { assert.equal(target, path.join(out, 'oracle-controls.json')); fs.writeFileSync(path.join(out, 'unit-final-parent-controls.json'), data); } };
const { vitalLayout, assertVitalLayout, checkVitalOracleControls } = new Function('assert', 'fs', 'path', 'output', `${helperSource}\nreturn { vitalLayout, assertVitalLayout, checkVitalOracleControls };`)(assert, outputFS, path, out);
const evidence = { command: 'node .superpowers/sdd/2026-10-21-mobile-vitals/unit-final-probe.cjs', started: new Date().toISOString(),
  head: git('rev-parse', 'HEAD').trim(), initialHashes: hashes(), helperSha256: sha(helperSource), positives: [], ownControls: [], contexts: [] };
fs.writeFileSync(path.join(out, 'unit-final-helper-source.txt'), helperSource);
fs.writeFileSync(path.join(out, 'unit-final-working.diff'), git('diff', '--', ...files));

async function inspect(page, width, id, expected, shouldPass = true) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const layout = await vitalLayout(page, width);
  let failure = null;
  try { assertVitalLayout(layout, id); } catch (e) { if (!(e instanceof assert.AssertionError)) throw e; failure = e.message; }
  const interest = page.getByTestId(`${width < 768 ? 'dashboard-mobile-vital-' : 'dashboard-vital-'}interest-burn`);
  const text = await interest.locator('p').nth(1).textContent(); assert.equal(text, expected);
  const hero = await page.getByTestId('asset-hero').evaluate(el => { const r = el.getBoundingClientRect(), img = el.querySelector('img'); return { loaded: !!img && img.complete && img.naturalWidth > 0, visibleHeight: Math.min(r.bottom, innerHeight) - Math.max(0, r.top) }; });
  const unit = await interest.locator('p').nth(1).evaluate(el => { const span = el.querySelector('span'); return { wbr: el.querySelectorAll('wbr').length,
    text: span?.textContent, display: span ? getComputedStyle(span).display : null, whiteSpace: span ? getComputedStyle(span).whiteSpace : null,
    opacity: span ? getComputedStyle(span).opacity : null, visibility: span ? getComputedStyle(span).visibility : null, fontSize: getComputedStyle(el).fontSize }; });
  const record = { id, viewport: page.viewportSize(), accepted: !failure, failure, layout, hero, unit };
  if (shouldPass) {
    assert.ok(!failure, `${id}: ${failure}`); assert.ok(hero.loaded && hero.visibleHeight >= 48);
    assert.ok(layout.every(v => v.label.visible && v.value.visible));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator('[data-nextjs-dialog], .vite-error-overlay').count(), 0);
    if (width < 768) { assert.equal(unit.wbr, 1); assert.equal(unit.text, '/day'); assert.equal(unit.display, 'inline-block'); assert.equal(unit.whiteSpace, 'nowrap'); }
    else assert.equal(unit.wbr, 0);
    evidence.positives.push(record); log(`PASS ${id}: ${text} size=${unit.fontSize} hero=${hero.visibleHeight}`);
  } else { assert.ok(failure, `${id}: descendant mutant must be rejected`); evidence.ownControls.push(record); log(`REJECT ${id}: ${failure}`); }
  save(id, record);
  return record;
}
async function edit(page, label, value) {
  await page.getByRole('button', { name: new RegExp(`^Edit ${label},`) }).click();
  const input = page.getByRole('textbox', { name: `${label} value`, exact: true }); await input.fill(String(value)); await input.press('Enter');
}
async function financial(page) {
  return page.evaluate(() => { const s = JSON.parse(localStorage.getItem('velocity-bank-storage')).state; return { income: s.monthlyIncome, expenses: s.monthlyExpenses,
    debts: s.debts, loc: s.loc, chunk: s.chunkAmount, frequency: s.chunkFrequency, mortgage: s.mortgageDetails }; });
}
async function axText(page, context) {
  const client = await context.newCDPSession(page);
  try {
    const { root } = await client.send('DOM.getDocument'); const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-testid="dashboard-mobile-vital-interest-burn"]>p:nth-child(2)' });
    const { node } = await client.send('DOM.describeNode', { nodeId }); const { nodes } = await client.send('Accessibility.getFullAXTree');
    const map = new Map(nodes.map(n => [n.nodeId, n])); const value = nodes.find(n => n.backendDOMNodeId === node.backendNodeId); assert.ok(value);
    const walk = n => n.role?.value === 'StaticText' ? n.name?.value ?? '' : (n.childIds ?? []).map(id => walk(map.get(id))).join('');
    return walk(value);
  } finally { await client.detach(); }
}
const base = { activeDomain: 'house', monthlyIncome: 8200, monthlyExpenses: 4700, chunkAmount: 1000, chunkFrequency: 'weekly',
  debts: { house: { balance: 285000, interestRate: 0.065, minimumPayment: 425 } }, loc: { limit: 200000000, balance: 3200, interestRate: 0.085 },
  mortgageDetails: { entryMode: 'current', currentBalance: 123456, paymentFrequency: 'biweekly' } };
let server, browser, timer;
async function main() {
  assert.equal(evidence.head, '3b58beffd14db959cedc667b1c892ef5c0cc672b');
  assert.equal(evidence.initialHashes[files[0]], 'e966bf3a2499d7a50792f3f89ca042791514537dd00a570825bc9ffea97d5b5c');
  assert.equal(evidence.initialHashes[files[1]], 'a24e9a659ea6f4614b6f23464b04aca3bb8289670585b78cba283727e0999dae');
  assert.equal(evidence.initialHashes[files[2]], 'df7744d9e3594e38f547bf3b92b4c258f5c7ee49cdfaab88365449dbb7978114');
  server = await startBuiltServer(root); evidence.origin = server.origin; evidence.serverPid = server.server.pid;
  browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true, args: getHeadlessChromiumArgs() }); evidence.browser = browser.version();
  log(`START ${evidence.origin} pid=${evidence.serverPid} pins=${JSON.stringify(evidence.initialHashes)}`);
  const large = { ...base, monthlyIncome: 100000001, monthlyExpenses: 10000001, chunkAmount: 20000001,
    debts: { house: { balance: 100000000, interestRate: 0.365, minimumPayment: 10000001 } }, loc: { ...base.loc, balance: 100000000, interestRate: 0.365 } };
  const cases = [
    { id: 'house', seed: base, expected: 'Est. $51.50/day', parentControls: true },
    { id: 'large', seed: large, expected: 'Est. $200,000.00/day', ownControls: true },
    ...[9999.99, 10000].map((burn, i) => ({ id: `threshold-${18 + i}`, seed: { ...large, debts: { house: { balance: burn * 1000, interestRate: 0.365, minimumPayment: 10000001 } }, loc: { ...large.loc, balance: 0 } }, expected: `Est. $${i ? '10,000.00' : '9,999.99'}/day` })),
    { id: 'negative', seed: { ...base, monthlyIncome: 0, monthlyExpenses: 90000000 }, expected: 'Est. $51.50/day' },
    { id: 'large-cent', seed: { ...large, loc: { ...large.loc, balance: 100000010 } }, expected: 'Est. $200,000.01/day' },
  ];
  for (const c of cases) {
    const context = await browser.newContext({ viewport: { width: 280, height: 900 }, reducedMotion: 'reduce' }); const errors = [];
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
    try {
      await context.addInitScript(seed => { if (localStorage.getItem('unit-final-seeded')) return; localStorage.setItem('velocity-bank-storage', JSON.stringify({ state: seed, version: 0 })); localStorage.setItem('unit-final-seeded', 'true'); }, c.seed);
      assert.equal((await page.goto(server.origin, { waitUntil: 'networkidle' })).status(), 200);
      await page.getByTestId('dashboard-mobile-vital-interest-burn').waitFor(); await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => { let n = document.querySelector('main'); while (n) { if (Number(getComputedStyle(n).opacity) < 0.99) return false; n = n.parentElement; } const img = document.querySelector('[data-testid="asset-hero"] img'); return img && img.complete && img.naturalWidth > 0; });
      assert.equal(await page.title(), 'InterestShield - Financial Empowerment');
      const normal = await inspect(page, 280, `${c.id}-280-system`, c.expected);
      const value = page.getByTestId('dashboard-mobile-vital-interest-burn').locator('p').nth(1), originalStyle = await value.getAttribute('style');
      try {
        await value.evaluate(el => { el.style.fontFamily = 'Verdana, sans-serif'; }); const wider = await inspect(page, 280, `${c.id}-280-verdana`, c.expected);
        if (c.id.startsWith('threshold')) { assert.equal(wider.layout[1].value.text.length, Number(c.id.slice(-2))); assert.equal(wider.layout[1].value.fontSize, c.id.endsWith('18') ? 14 : 12); }
        assert.equal(await axText(page, context), c.expected, 'actual complete accessible value');
        await page.screenshot({ path: path.join(out, `unit-final-${c.id}-280-verdana.png`), animations: 'disabled' });
        if (c.ownControls) {
          const span = value.locator('span');
          for (const m of [{ id: 'descendant-opacity', style: 'opacity:0' }, { id: 'descendant-visibility', style: 'visibility:hidden' }, { id: 'descendant-clipping', style: 'height:1px;overflow:hidden' }]) {
            const original = await span.getAttribute('style'); await span.evaluate((el, css) => el.setAttribute('style', css), m.style);
            try { await inspect(page, 280, m.id, c.expected, false); await page.screenshot({ path: path.join(out, `unit-final-${m.id}.png`), animations: 'disabled' }); }
            finally { await span.evaluate((el, style) => { if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style); }, original); assert.deepEqual(await vitalLayout(page, 280), wider.layout); }
          }
          await value.evaluate(el => { el.style.fontFamily = 'Georgia, serif'; }); await inspect(page, 280, 'large-280-georgia', c.expected);
        }
      } finally { await value.evaluate((el, style) => { if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style); }, originalStyle); }
      assert.deepEqual(await vitalLayout(page, 280), normal.layout);
      if (c.parentControls) {
        await page.setViewportSize({ width: 375, height: 900 }); await edit(page, 'Monthly income', 8200); await page.evaluate(() => window.scrollTo(0, 0));
        const before = await financial(page), beforeLayout = await vitalLayout(page, 375);
        const saved = await value.evaluateHandle(el => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_ALL), nodes = [el]; let n; while ((n = walker.nextNode())) nodes.push(n);
          const styled = [el, ...el.querySelectorAll('*')]; return { nodes, texts: nodes.filter(n => n.nodeType === Node.TEXT_NODE).map(n => [n, n.data]), styled, css: styled.map(n => n.style.cssText) };
        });
        try {
          await checkVitalOracleControls(page);
          const restoration = await value.evaluate((el, saved) => { const walker = document.createTreeWalker(el, NodeFilter.SHOW_ALL), nodes = [el]; let n; while ((n = walker.nextNode())) nodes.push(n);
            return { sameNodes: nodes.length === saved.nodes.length && nodes.every((n, i) => n === saved.nodes[i]), sameTexts: saved.texts.every(([n, data]) => n.data === data), sameCSS: saved.styled.every((el, i) => el.style.cssText === saved.css[i]) }; }, saved);
          evidence.independentRestoration = restoration; assert.ok(Object.values(restoration).every(Boolean));
        } finally { await saved.dispose(); }
        assert.deepEqual(await vitalLayout(page, 375), beforeLayout);
        const controls = JSON.parse(fs.readFileSync(path.join(out, 'unit-final-parent-controls.json'))); assert.equal(controls.length, 10);
        assert.ok(controls.every(c => c.rejected && Object.values(c.restoration).every(Boolean))); evidence.parentControlCount = controls.length;
        await edit(page, 'Monthly income', 8300); assert.equal((await financial(page)).income, 8300); await edit(page, 'Monthly income', 8200);
        await edit(page, 'Mortgage balance', 285100); await inspect(page, 375, 'post-control-balance-edit', 'Est. $51.52/day'); await edit(page, 'Mortgage balance', 285000);
        await page.goto(`${server.origin}/simulator`, { waitUntil: 'networkidle' }); await page.getByTestId('simulator-comparison-assumptions').waitFor();
        await page.goto(server.origin, { waitUntil: 'networkidle' }); await page.getByRole('tab', { name: 'Switch to House domain', exact: true }).click();
        await inspect(page, 375, 'post-control-edit-navigation', c.expected); assert.deepEqual(await financial(page), before);
        await page.setViewportSize({ width: 375, height: 667 }); await inspect(page, 375, 'short-375', c.expected);
        await page.screenshot({ path: path.join(out, 'unit-final-short-375.png'), animations: 'disabled' });
        await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => { const img = document.querySelector('[data-testid="asset-hero"] img'); return img && img.complete && img.naturalWidth > 0; });
        await inspect(page, 1440, 'desktop-1440', c.expected); await page.screenshot({ path: path.join(out, 'unit-final-desktop-1440.png'), animations: 'disabled' });
      }
      assert.deepEqual(errors, []); evidence.contexts.push({ id: c.id, errors });
    } finally { await context.close(); }
  }
}
timer = setTimeout(() => { evidence.timeout = true; process.exitCode = 1; void browser?.close().finally(() => stopServer(server?.server)); }, 90000);
main().catch(e => { evidence.failure = e.stack; log(e.stack); process.exitCode = 1; }).finally(async () => {
  clearTimeout(timer); await browser?.close(); await stopServer(server?.server);
  evidence.finalHashes = hashes(); evidence.finalHead = git('rev-parse', 'HEAD').trim(); evidence.finished = new Date().toISOString(); evidence.serverStopped = !server || server.server.exitCode !== null;
  evidence.filesStable = JSON.stringify(evidence.initialHashes) === JSON.stringify(evidence.finalHashes) && evidence.head === evidence.finalHead;
  evidence.oldEvidenceUnchanged = JSON.stringify(oldPins) === JSON.stringify(oldHashes());
  if (!evidence.filesStable || !evidence.oldEvidenceUnchanged) { evidence.failure ??= 'Executable pins or prior raw evidence changed'; process.exitCode = 1; }
  log(`STOP pid=${evidence.serverPid} serverStopped=${evidence.serverStopped} filesStable=${evidence.filesStable} oldEvidenceUnchanged=${evidence.oldEvidenceUnchanged}`);
  save('evidence', evidence); fs.writeFileSync(path.join(out, 'unit-final-probe.log'), logs.join('\n') + '\n');
});
