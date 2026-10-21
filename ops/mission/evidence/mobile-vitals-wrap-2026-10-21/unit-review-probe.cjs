const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const repo = process.cwd(), out = __dirname, root = path.join(repo, 'apps/web');
const req = createRequire(path.join(root, 'package.json'));
const { chromium } = req('playwright-core');
const { startBuiltServer, stopServer } = req('./scripts/built-server-harness.cjs');
const { findBrowserExecutable, getHeadlessChromiumArgs } = req('./scripts/browser-harness.cjs');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const files = ['apps/web/src/app/page.tsx', 'apps/web/scripts/smoke-dashboard-interest.cjs', 'apps/web/scripts/engine-regression-tests.cjs'];
const pins = () => Object.fromEntries(files.map(f => [f, sha(fs.readFileSync(path.join(repo, f)))]));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true });
const oldFiles = fs.readdirSync(out).filter(f => /^review-/.test(f));
const oldPins = () => Object.fromEntries(oldFiles.map(f => [f, sha(fs.readFileSync(path.join(out, f)))]));
const beforeOld = oldPins(), logs = [];
const log = s => { logs.push(s); console.log(s); };
const save = (name, data) => fs.writeFileSync(path.join(out, `unit-review-${name}.json`), JSON.stringify(data, null, 2) + '\n');
const smoke = fs.readFileSync(path.join(root, 'scripts/smoke-dashboard-interest.cjs'), 'utf8');
const helpers = smoke.slice(smoke.indexOf('async function vitalLayout('), smoke.indexOf('(async () => {'));
const scenariosSource = smoke.slice(smoke.indexOf('const scenarios = '), smoke.indexOf('async function storedInputs('));
const scenarios = new Function(`${scenariosSource}\nreturn scenarios;`)();
const shimFS = { writeFileSync(target, content) {
  assert.equal(target, path.join(out, 'oracle-controls.json'));
  fs.writeFileSync(path.join(out, 'unit-review-parent-controls.json'), content);
} };
const { vitalLayout, assertVitalLayout, checkVitalOracleControls } = new Function('assert', 'fs', 'path', 'output', `${helpers}\nreturn { vitalLayout, assertVitalLayout, checkVitalOracleControls };`)(assert, shimFS, path, out);
const evidence = { command: 'node .superpowers/sdd/2026-10-21-mobile-vitals/unit-review-probe.cjs', started: new Date().toISOString(),
  head: git('rev-parse', 'HEAD').trim(), initialHashes: pins(), helperSha256: sha(helpers), checks: [], contexts: [],
  browserPath: 'Browser plugin absent; explicit user authorization for repository Playwright/Chrome' };
fs.writeFileSync(path.join(out, 'unit-review-working.diff'), git('diff', '--', ...files));
fs.writeFileSync(path.join(out, 'unit-review-helpers.txt'), helpers);

async function capture(page, width, name, expected) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const layout = await vitalLayout(page, width);
  let failure = null;
  try { assertVitalLayout(layout, name); } catch (e) { if (!(e instanceof assert.AssertionError)) throw e; failure = e.message; }
  const dom = await page.locator(`[data-testid^="${width < 768 ? 'dashboard-mobile-vital-' : 'dashboard-vital-'}"]`).evaluateAll(articles => articles.map(article => {
    const card = article.getBoundingClientRect();
    const parts = [...article.querySelectorAll('p')].slice(0, 2).map(el => {
      const box = el.getBoundingClientRect(), chars = [], clips = []; let painted = true;
      for (let n = el; n; n = n.parentElement) {
        const css = getComputedStyle(n), r = n.getBoundingClientRect();
        painted &&= css.display !== 'none' && css.visibility === 'visible' && Number(css.opacity) >= 0.99;
        if (css.overflowX !== 'visible' || css.overflowY !== 'visible') clips.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, x: css.overflowX !== 'visible', y: css.overflowY !== 'visible' });
      }
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let node;
      while ((node = walker.nextNode())) for (let i = 0; i < node.length; i++) {
        const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1); const r = range.getBoundingClientRect();
        chars.push({ text: node.data[i], left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height });
      }
      const ink = chars.filter(c => !/\s/.test(c.text));
      const contained = ink.length > 0 && ink.every(c => c.height > 0 && c.left >= Math.max(card.left, box.left) - 1 && c.right <= Math.min(card.right, box.right) + 1 &&
        c.top >= Math.max(card.top, box.top) - 1 && c.bottom <= Math.min(card.bottom, box.bottom) + 1 &&
        clips.every(r => (!r.x || (c.left >= r.left - 1 && c.right <= r.right + 1)) && (!r.y || (c.top >= r.top - 1 && c.bottom <= r.bottom + 1))));
      const unit = el.querySelector('span');
      return { text: el.textContent, innerText: el.innerText, markup: el.innerHTML, chars, painted, contained, font: getComputedStyle(el).fontFamily,
        fontSize: getComputedStyle(el).fontSize, width: box.width, client: el.clientWidth, scroll: el.scrollWidth,
        wbrCount: el.querySelectorAll('wbr').length, unit: unit ? { text: unit.textContent, display: getComputedStyle(unit).display,
          whiteSpace: getComputedStyle(unit).whiteSpace, ariaHidden: unit.getAttribute('aria-hidden') } : null };
    });
    const overlap = parts[0].chars.filter(c => !/\s/.test(c.text)).some(a => parts[1].chars.filter(c => !/\s/.test(c.text)).some(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1));
    return { id: article.dataset.testid, parts, overlap };
  }));
  const hero = await page.getByTestId('asset-hero').evaluate(el => { const r = el.getBoundingClientRect(), img = el.querySelector('img'); return { visibleHeight: Math.min(innerHeight, r.bottom) - Math.max(0, r.top), loaded: img.complete && img.naturalWidth > 0 }; });
  const record = { name, viewport: page.viewportSize(), layout, dom, hero, failure, accepted: !failure,
    independent: dom.every(v => !v.overlap && v.parts.every(p => p.painted && p.contained)) };
  if (expected !== undefined) assert.equal(dom[1].parts[1].text, expected, `${name}: exact full value text`);
  evidence.checks.push(record); save(name, record);
  return record;
}
async function check(page, width, name, expected, screenshot = false) {
  const r = await capture(page, width, name, expected);
  assert.ok(r.accepted && r.independent, `${name}: ${r.failure}`);
  assert.ok(r.hero.loaded && r.hero.visibleHeight >= 48, `${name}: loaded hero first-viewport hint`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (width < 768) {
    assert.equal(r.dom[1].parts[1].wbrCount, 1);
    assert.deepEqual(r.dom[1].parts[1].unit, { text: '/day', display: 'inline-block', whiteSpace: 'nowrap', ariaHidden: null });
  } else assert.equal(r.dom[1].parts[1].wbrCount, 0);
  if (screenshot) await page.screenshot({ path: path.join(out, `unit-review-${name}.png`), animations: 'disabled' });
  log(`PASS ${name}: ${expected} (${r.dom[1].parts[1].fontSize}, ${r.dom[1].parts[1].font})`);
  return r;
}
async function accessibleText(page, context, selector) {
  const client = await context.newCDPSession(page);
  try {
    const { root } = await client.send('DOM.getDocument');
    const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    const { node } = await client.send('DOM.describeNode', { nodeId });
    const { nodes } = await client.send('Accessibility.getFullAXTree');
    const byId = new Map(nodes.map(n => [n.nodeId, n]));
    const target = nodes.find(n => n.backendDOMNodeId === node.backendNodeId);
    assert.ok(target, 'value paragraph is exposed in Chrome accessibility tree');
    const walk = n => n.role?.value === 'StaticText' ? [n.name?.value ?? ''] : (n.childIds ?? []).flatMap(id => walk(byId.get(id)));
    return { text: walk(target).join(''), snapshot: await page.locator(selector).ariaSnapshot() };
  } finally { await client.detach(); }
}
const valueSelector = '[data-testid="dashboard-mobile-vital-interest-burn"]>p:nth-child(2)';
function seedFor(s) {
  const domain = s.id === 'auto' ? 'car' : 'house';
  return { activeDomain: domain, monthlyIncome: s.income ?? 8200, monthlyExpenses: s.expenses ?? 4700, chunkAmount: s.chunk ?? 1000, chunkFrequency: 'weekly',
    debts: { [domain]: { balance: s.balance, interestRate: s.apr, minimumPayment: s.minimum ?? 425 } },
    loc: { limit: 200000000, balance: s.locBalance, interestRate: s.locApr }, mortgageDetails: { entryMode: 'current', currentBalance: 123456, paymentFrequency: 'biweekly' } };
}
async function change(page, label, value) {
  await page.getByRole('button', { name: new RegExp(`^Edit ${label},`) }).click();
  const input = page.getByRole('textbox', { name: `${label} value`, exact: true });
  await input.fill(String(value)); await input.press('Enter');
}
async function financial(page) {
  return page.evaluate(() => { const s = JSON.parse(localStorage.getItem('velocity-bank-storage')).state; return { debts: s.debts, loc: s.loc,
    income: s.monthlyIncome, expenses: s.monthlyExpenses, chunk: s.chunkAmount, frequency: s.chunkFrequency, mortgage: s.mortgageDetails }; });
}
let server, browser, timer;
async function main() {
  assert.equal(evidence.head, '3b58beffd14db959cedc667b1c892ef5c0cc672b');
  assert.equal(evidence.initialHashes[files[0]], 'e966bf3a2499d7a50792f3f89ca042791514537dd00a570825bc9ffea97d5b5c');
  assert.equal(evidence.initialHashes[files[1]], '4c9dc62afe83128fc9ff3c8dafbd6ef6614b7671ae9546a652a29999d13cb679');
  const page = fs.readFileSync(path.join(root, 'src/app/page.tsx'), 'utf8');
  const branch = `                  {vital.id === 'interest-burn' && vital.value.endsWith('/day') ? (\n                    <>{vital.value.slice(0, -4)}<wbr /><span className="inline-block whitespace-nowrap">/day</span></>\n                  ) : vital.value}`;
  assert.equal(page.replace(/\r\n/g, '\n').replace(branch, '                  {vital.value}'), git('show', `${evidence.head}:apps/web/src/app/page.tsx`).replace(/\r\n/g, '\n'));
  evidence.sourceScope = 'exact HEAD page after reverting only new mobile interest unit branch';
  server = await startBuiltServer(root); evidence.origin = server.origin; evidence.serverPid = server.server.pid;
  browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true, args: getHeadlessChromiumArgs() }); evidence.browser = browser.version();
  log(`START ${server.origin} pid=${server.server.pid} pins=${JSON.stringify(evidence.initialHashes)}`);
  const extra = [
    ...[9999.99, 10000].map((burn, i) => ({ id: `threshold-${18 + i}`, balance: burn * 1000, apr: 0.365, locBalance: 0, locApr: 0, minimum: 10000001,
      income: 100000001, expenses: 10000001, value: `Est. $${i ? '10,000.00' : '9,999.99'}/day` })),
    { ...scenarios[0], id: 'negative-cash', income: 0, expenses: 90000000 },
    { ...scenarios[5], id: 'large-cent', locBalance: 100000010, value: 'Est. $200,000.01/day' },
  ];
  for (const s of [...scenarios, ...extra]) {
    const context = await browser.newContext({ viewport: { width: 280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = []; page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
    try {
      await context.addInitScript(seed => { if (localStorage.getItem('unit-review-seeded')) return; localStorage.setItem('velocity-bank-storage', JSON.stringify({ state: seed, version: 0 })); localStorage.setItem('unit-review-seeded', 'true'); }, seedFor(s));
      assert.equal((await page.goto(server.origin, { waitUntil: 'networkidle' })).status(), 200);
      await page.getByTestId('dashboard-mobile-vital-interest-burn').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => { let n = document.querySelector('main'); while (n) { if (Number(getComputedStyle(n).opacity) < 0.99) return false; n = n.parentElement; } const img = document.querySelector('[data-testid="asset-hero"] img'); return img && img.complete && img.naturalWidth > 0; });
      assert.equal(await page.title(), 'InterestShield - Financial Empowerment');
      assert.equal(await page.locator('[data-nextjs-dialog], .vite-error-overlay').count(), 0);
      const normal = await check(page, 280, `${s.id}-280-system`, s.value, ['large-import', 'sub-cent', 'negative-cash'].includes(s.id));
      const amount = page.locator(valueSelector), style = await amount.getAttribute('style');
      try {
        await amount.evaluate(el => { el.style.fontFamily = 'Verdana, sans-serif'; });
        const wider = await check(page, 280, `${s.id}-280-verdana`, s.value, ['large-import', 'large-cent', 'threshold-18', 'threshold-19'].includes(s.id));
        if (s.id.startsWith('threshold')) {
          assert.equal(wider.layout[1].value.text.length, Number(s.id.slice(-2)));
          assert.equal(wider.layout[1].value.fontSize, s.id.endsWith('18') ? 14 : 12);
        }
        const ax = await accessibleText(page, context, valueSelector);
        assert.equal(ax.text, s.value, `${s.id}: full accessible value`); save(`${s.id}-accessibility`, ax);
        if (s.id === 'large-import') {
          await amount.evaluate(el => { window.__unitOriginalChildren = [...el.childNodes]; el.replaceChildren(document.createTextNode(el.textContent)); });
          try {
            const legacy = await capture(page, 280, 'legacy-flat-verdana-red', s.value);
            await page.screenshot({ path: path.join(out, 'unit-review-legacy-flat-verdana-red.png'), animations: 'disabled' });
            assert.ok(!legacy.accepted && !legacy.layout[1].value.fits, 'same-font original markup must reproduce horizontal overflow');
            evidence.legacyRed = { failure: legacy.failure, width: legacy.dom[1].parts[1].width, scroll: legacy.dom[1].parts[1].scroll };
          } finally { await amount.evaluate(el => { el.replaceChildren(...window.__unitOriginalChildren); delete window.__unitOriginalChildren; }); }
          assert.deepEqual(await vitalLayout(page, 280), wider.layout);
          await amount.evaluate(el => { el.style.fontFamily = 'Georgia, serif'; });
          await check(page, 280, 'large-import-280-georgia', s.value, true);
        }
      } finally { await amount.evaluate((el, original) => { if (original === null) el.removeAttribute('style'); else el.setAttribute('style', original); }, style); }
      assert.deepEqual(await vitalLayout(page, 280), normal.layout, 'font probes restore actual layout exactly');
      if (scenarios.some(base => base.id === s.id)) {
        await page.setViewportSize({ width: 375, height: 900 });
        await check(page, 375, `${s.id}-375-system`, s.value);
      }
      if (s.id === 'house') {
        await change(page, 'Monthly income', 8200);
        const before = await financial(page);
        await page.evaluate(() => { const el = document.querySelector('[data-testid="dashboard-mobile-vital-interest-burn"]>p:nth-child(2)'); const walker = document.createTreeWalker(el, NodeFilter.SHOW_ALL), nodes = [el]; let n; while ((n = walker.nextNode())) nodes.push(n); window.__unitNodes = nodes; window.__unitMarkup = el.innerHTML; });
        await page.evaluate(() => window.scrollTo(0, 0));
        await checkVitalOracleControls(page);
        evidence.nodeIdentity = await page.evaluate(() => { const el = document.querySelector('[data-testid="dashboard-mobile-vital-interest-burn"]>p:nth-child(2)'), walker = document.createTreeWalker(el, NodeFilter.SHOW_ALL), nodes = [el]; let n; while ((n = walker.nextNode())) nodes.push(n); return { sameNodes: nodes.length === window.__unitNodes.length && nodes.every((node, i) => node === window.__unitNodes[i]), sameMarkup: el.innerHTML === window.__unitMarkup, nodeCount: nodes.length }; });
        assert.ok(evidence.nodeIdentity.sameNodes && evidence.nodeIdentity.sameMarkup);
        const controls = JSON.parse(fs.readFileSync(path.join(out, 'unit-review-parent-controls.json'))); assert.equal(controls.length, 7); assert.ok(controls.every(c => c.rejected));
        await change(page, 'Monthly income', 8300); assert.equal((await financial(page)).income, 8300);
        await change(page, 'Monthly income', 8200);
        await change(page, 'Mortgage balance', 285100);
        await check(page, 375, 'house-actual-balance-edit', 'Est. $51.52/day');
        await change(page, 'Mortgage balance', 285000);
        await page.goto(`${server.origin}/simulator`, { waitUntil: 'networkidle' });
        await page.getByTestId('simulator-comparison-assumptions').waitFor();
        await page.goto(server.origin, { waitUntil: 'networkidle' });
        await page.getByRole('tab', { name: 'Switch to House domain', exact: true }).click();
        await check(page, 375, 'house-after-controls-edit-navigation', s.value, true);
        assert.deepEqual(await financial(page), before);
        await page.setViewportSize({ width: 375, height: 667 }); await check(page, 375, 'house-short-375', s.value, true);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForFunction(() => { const img = document.querySelector('[data-testid="asset-hero"] img'); return img && img.complete && img.naturalWidth > 0; });
        await page.waitForLoadState('networkidle'); await check(page, 1440, 'house-desktop-1440', s.value, true);
        evidence.desktop = { markup: (await capture(page, 1440, 'house-desktop-record', s.value)).dom[1].parts[1].markup };
        assert.equal(evidence.desktop.markup, s.value);
      }
      assert.deepEqual(errors, [], `${s.id}: console/page health`); evidence.contexts.push({ scenario: s.id, errors });
    } finally { await context.close(); }
  }
}
timer = setTimeout(() => { evidence.timeout = true; process.exitCode = 1; void browser?.close().finally(() => stopServer(server?.server)); }, 90000);
main().catch(e => { evidence.failure = e.stack; log(e.stack); process.exitCode = 1; }).finally(async () => {
  clearTimeout(timer); await browser?.close(); await stopServer(server?.server);
  evidence.finalHashes = pins(); evidence.finalHead = git('rev-parse', 'HEAD').trim(); evidence.finished = new Date().toISOString(); evidence.serverStopped = !server || server.server.exitCode !== null;
  evidence.filesStable = JSON.stringify(evidence.initialHashes) === JSON.stringify(evidence.finalHashes) && evidence.head === evidence.finalHead;
  evidence.oldEvidenceUnchanged = JSON.stringify(beforeOld) === JSON.stringify(oldPins());
  if (!evidence.filesStable || !evidence.oldEvidenceUnchanged) { evidence.failure ??= 'Executable pins or old evidence changed'; process.exitCode = 1; }
  log(`STOP pid=${evidence.serverPid} serverStopped=${evidence.serverStopped} filesStable=${evidence.filesStable} oldEvidenceUnchanged=${evidence.oldEvidenceUnchanged}`);
  save('evidence', evidence); fs.writeFileSync(path.join(out, 'unit-review-probe.log'), logs.join('\n') + '\n');
});
