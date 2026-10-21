const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');

const repo = process.cwd();
const out = __dirname;
assert.ok(out.endsWith('2026-10-21-mobile-vitals'));
const root = path.join(repo, 'apps/web');
const req = createRequire(path.join(root, 'package.json'));
const { chromium } = req('playwright-core');
const { startBuiltServer, stopServer } = req('./scripts/built-server-harness.cjs');
const { findBrowserExecutable, getHeadlessChromiumArgs } = req('./scripts/browser-harness.cjs');
const files = ['apps/web/src/app/page.tsx', 'apps/web/scripts/smoke-dashboard-interest.cjs', 'apps/web/scripts/engine-regression-tests.cjs'];
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const hashes = () => Object.fromEntries(files.map(f => [f, sha(fs.readFileSync(path.join(repo, f)))]));
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true });
const logLines = [];
const log = text => { logLines.push(text); console.log(text); };
const save = (name, value) => fs.writeFileSync(path.join(out, `review-${name}.json`), JSON.stringify(value, null, 2) + '\n');
const smoke = fs.readFileSync(path.join(root, 'scripts/smoke-dashboard-interest.cjs'), 'utf8');
const oracleSource = smoke.slice(smoke.indexOf('async function vitalLayout('), smoke.indexOf('(async () => {'));
assert.ok(oracleSource.includes('function assertVitalLayout'));
const oracle = new Function('assert', `${oracleSource}\nreturn { vitalLayout, assertVitalLayout };`)(assert);
const results = { started: new Date().toISOString(), command: 'node .superpowers/sdd/2026-10-21-mobile-vitals/review-probe.cjs',
  browserPath: 'Browser plugin not available; regular Playwright with explicit user Chrome authorization',
  head: git('rev-parse', 'HEAD').trim(), initialHashes: hashes(), oracleSha256: sha(oracleSource), scenarios: [], mutations: [] };
fs.writeFileSync(path.join(out, 'review-working.diff'), git('diff', '--', ...files));
fs.writeFileSync(path.join(out, 'review-oracle-source.txt'), oracleSource);

async function inspect(page, width) {
  return page.locator(`[data-testid^="${width < 768 ? 'dashboard-mobile-vital-' : 'dashboard-vital-'}"]`).evaluateAll(articles => articles.map(article => {
    const card = article.getBoundingClientRect();
    const ps = [...article.querySelectorAll('p')].slice(0, 2);
    const parts = ps.map(el => {
      const box = el.getBoundingClientRect(), css = getComputedStyle(el);
      let painted = true;
      let clip = { left: card.left, right: card.right, top: card.top, bottom: card.bottom };
      for (let n = el; n; n = n.parentElement) {
        const style = getComputedStyle(n), r = n.getBoundingClientRect();
        if (style.visibility !== 'visible' || style.display === 'none' || Number(style.opacity) < 0.1) painted = false;
        if (['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowX)) {
          clip.left = Math.max(clip.left, r.left); clip.right = Math.min(clip.right, r.right);
        }
        if (['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowY)) {
          clip.top = Math.max(clip.top, r.top); clip.bottom = Math.min(clip.bottom, r.bottom);
        }
      }
      const chars = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) for (let offset = 0; offset < node.length; offset++) {
        const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + 1);
        const r = range.getBoundingClientRect();
        chars.push({ c: node.data[offset], left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
      }
      const visibleChars = chars.filter(c => !/\s/.test(c.c));
      return { text: el.textContent, font: css.fontFamily, fontSize: css.fontSize, painted, clip,
        rect: { left: box.left, right: box.right, top: box.top, bottom: box.bottom }, chars,
        fullyContained: visibleChars.every(c => c.width > 0 && c.height > 0 && c.left >= clip.left - 1 && c.right <= clip.right + 1 && c.top >= clip.top - 1 && c.bottom <= clip.bottom + 1) };
    });
    const label = parts[0].chars.filter(c => !/\s/.test(c.c)), value = parts[1].chars.filter(c => !/\s/.test(c.c));
    const overlap = label.some(a => value.some(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1));
    return { id: article.dataset.testid, card: { left: card.left, right: card.right, top: card.top, bottom: card.bottom }, parts, overlap };
  }));
}

async function runGuards(page, width, expectedInterest) {
  const failures = [];
  const layout = await oracle.vitalLayout(page, width);
  try { oracle.assertVitalLayout(layout, `review ${width}`); } catch (e) { failures.push(e.message); }
  const vital = page.getByTestId(`${width < 768 ? 'dashboard-mobile-vital-' : 'dashboard-vital-'}interest-burn`);
  if (expectedInterest) {
    try {
      assert.ok((await vital.textContent()).includes(expectedInterest));
      const amount = vital.getByText(expectedInterest, { exact: true });
      const ok = await amount.evaluate(el => {
        const range = document.createRange(); range.selectNodeContents(el); const r = el.getBoundingClientRect();
        return [...range.getClientRects()].every(t => t.left >= r.left - 1 && t.right <= r.right + 1) && el.scrollWidth <= el.clientWidth + 1;
      });
      assert.ok(ok, 'inherited amount containment');
    } catch (e) { failures.push(e.message); }
  }
  const hero = await page.getByTestId('asset-hero').boundingBox();
  const heroVisibleHeight = hero ? Math.min(hero.y + hero.height, 900) - Math.max(hero.y, 0) : 0;
  if (heroVisibleHeight < 48) failures.push(`hero visible height ${heroVisibleHeight} < 48`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) failures.push('page horizontal overflow');
  return { accepted: failures.length === 0, failures, layout, heroVisibleHeight };
}

const base = { activeDomain: 'house', monthlyIncome: 8200, monthlyExpenses: 4700, chunkAmount: 1000, chunkFrequency: 'weekly',
  debts: { house: { balance: 285000, interestRate: 0.065, minimumPayment: 425 } },
  loc: { limit: 200000000, balance: 3200, interestRate: 0.085 },
  mortgageDetails: { entryMode: 'current', currentBalance: 123456, paymentFrequency: 'biweekly' } };
let server, browser, timeout;
async function main() {
  assert.equal(results.head, 'caefd8086180513b3fb6c1cf85492174996a437b');
  const pageSource = fs.readFileSync(path.join(root, 'src/app/page.tsx'), 'utf8');
  const original = git('show', `${results.head}:apps/web/src/app/page.tsx`);
  const restored = pageSource.replace('grid grid-cols-2 gap-1.5 md:hidden', 'grid grid-cols-4 gap-1.5 md:hidden')
    .replace('min-h-[82px] min-w-0', 'min-h-[82px]')
    .replace("mt-1.5 font-bold leading-tight ${vital.value.length > 18 ? 'text-xs' : 'text-sm'} ${style.value}", 'mt-1.5 text-sm font-bold leading-tight break-words ${style.value}');
  assert.equal(restored.replace(/\r\n/g, '\n'), original.replace(/\r\n/g, '\n'), 'only the three specified source substitutions');
  results.sourceScope = 'exact original after reversing only the three stated substitutions';
  server = await startBuiltServer(root);
  results.origin = server.origin; results.serverPid = server.server.pid;
  log(`START ${results.origin} own server pid ${results.serverPid}`);
  browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true, args: getHeadlessChromiumArgs() });
  results.browser = browser.version();
  const cases = [
    { id: 'house', width: 375, state: base, expected: 'Est. $51.50/day', mutants: true },
    { id: 'negative', width: 280, height: 653, state: { ...base, monthlyIncome: 0, monthlyExpenses: 90000000 }, expected: 'Est. $51.50/day' },
    { id: 'subcent', width: 280, state: { ...base, debts: { house: { balance: 1, interestRate: 0.01, minimumPayment: 1 } }, loc: { ...base.loc, balance: 0, interestRate: 0 } }, expected: 'Est. <$0.01/day' },
    ...[9999.99, 10000].map((burn, i) => ({ id: `threshold-${18 + i}`, width: 280, state: { ...base, debts: { house: { balance: burn * 1000, interestRate: 0.365, minimumPayment: 10000001 } }, loc: { ...base.loc, balance: 0 }, monthlyIncome: 100000001, monthlyExpenses: 10000001 }, expected: `Est. $${burn === 10000 ? '10,000.00' : '9,999.99'}/day` })),
  ];
  for (const scenario of cases) {
    const height = scenario.height ?? 900;
    const context = await browser.newContext({ viewport: { width: scenario.width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
    try {
      await context.addInitScript(state => { localStorage.setItem('velocity-bank-storage', JSON.stringify({ state, version: 0 })); }, scenario.state);
      const response = await page.goto(server.origin, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      await page.getByTestId('dashboard-mobile-vital-interest-burn').waitFor();
      await page.waitForFunction(() => { let n = document.querySelector('main'); while (n) { if (Number(getComputedStyle(n).opacity) < 0.99) return false; n = n.parentElement; } return true; });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => { const img = document.querySelector('[data-testid="asset-hero"] img'); return img && img.complete && img.naturalWidth > 0; });
      const guards = await runGuards(page, scenario.width, scenario.expected);
      const detail = await inspect(page, scenario.width);
      const hero = await page.getByTestId('asset-hero').boundingBox();
      const actualHeroHeight = Math.min(hero.y + hero.height, height) - Math.max(hero.y, 0);
      const independentOK = detail.length === 4 && detail.every(v => !v.overlap && v.parts.every(p => p.painted && p.fullyContained)) && actualHeroHeight >= 48;
      const identity = { url: page.url(), title: await page.title(), heading: await page.getByRole('heading', { name: 'House Dashboard', exact: true }).textContent(), overlayCount: await page.locator('[data-nextjs-dialog], .vite-error-overlay').count() };
      const result = { id: scenario.id, viewport: { width: scenario.width, height }, guards, independentOK, detail, actualHeroHeight, identity, errors };
      results.scenarios.push(result); save(scenario.id, result);
      assert.ok(guards.accepted && independentOK, `${scenario.id}: original rendered layout must pass both checks`);
      if (scenario.id.startsWith('threshold')) {
        const value = detail[1].parts[1];
        const rawLength = Number(scenario.id.slice(-2));
        assert.equal(value.text.length, rawLength);
        assert.equal(value.fontSize, rawLength === 18 ? '14px' : '12px');
      }
      await page.screenshot({ path: path.join(out, `review-${scenario.id}.png`) });
      log(`CURRENT ${scenario.id} ${scenario.width}x${height} guards=${guards.accepted} independent=${independentOK} values=${JSON.stringify(detail.map(v => v.parts[1].text))} hero=${actualHeroHeight}`);
      if (scenario.mutants) {
        const mutations = [
          { id: 'original-four-column', css: '[data-testid="dashboard-mobile-vitals"]{grid-template-columns:repeat(4,minmax(0,1fr))!important}[data-testid^="dashboard-mobile-vital-"]>p:nth-child(2){font-size:14px!important;overflow-wrap:break-word!important}' },
          { id: 'forced-currency-chop', css: '[data-testid="dashboard-mobile-vital-interest-burn"]>p:nth-child(2){width:22px!important;word-break:break-all!important}' },
          { id: 'hidden-next-move', css: '[data-testid="dashboard-mobile-vital-next-move"]>p:nth-child(2){visibility:hidden!important}' },
          { id: 'vertical-currency-clip', css: '[data-testid="dashboard-mobile-vital-interest-burn"]>p:nth-child(2){height:5px!important;overflow:hidden!important}' },
          { id: 'label-value-collision', css: '[data-testid="dashboard-mobile-vital-cash-flow"]>p:nth-child(2){position:relative!important;top:-23px!important}' },
          { id: 'hero-offscreen', css: '[data-testid="dashboard-mobile-money-loop-bridge"]{margin-bottom:900px!important}' },
        ];
        for (const mutation of mutations) {
          const style = await page.addStyleTag({ content: mutation.css });
          const guards = await runGuards(page, scenario.width, scenario.expected), detail = await inspect(page, scenario.width);
          const result = { id: mutation.id, css: mutation.css, guards, detail };
          results.mutations.push(result); save(`mutant-${mutation.id}`, result);
          await page.screenshot({ path: path.join(out, `review-mutant-${mutation.id}.png`) });
          log(`MUTANT ${mutation.id} accepted=${guards.accepted} ${JSON.stringify(guards.failures)}`);
          await style.evaluate(el => el.remove());
        }
        await page.setViewportSize({ width: 375, height: 667 });
        const short = await runGuards(page, 375, scenario.expected), detailShort = await inspect(page, 375);
        const heroShort = await page.getByTestId('asset-hero').boundingBox();
        results.shortViewport = { viewport: '375x667', guards: short, detail: detailShort, actualHeroHeight: Math.min(heroShort.y + heroShort.height, 667) - Math.max(heroShort.y, 0) };
        save('short-viewport', results.shortViewport);
        await page.screenshot({ path: path.join(out, 'review-short-viewport.png') });
        log(`CURRENT short375x667 hero=${results.shortViewport.actualHeroHeight}`);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => { const img = document.querySelector('[data-testid="asset-hero"] img'); return img && img.complete && img.naturalWidth > 0; });
        await page.waitForLoadState('networkidle');
        const desktopBefore = await page.screenshot({ path: path.join(out, 'review-desktop-current.png'), animations: 'disabled' });
        const desktopVitals = page.getByTestId('dashboard-vital-cash-flow').locator('..');
        const vitalsBefore = await desktopVitals.screenshot({ animations: 'disabled' });
        const desktopStyle = await page.addStyleTag({ content: mutations[0].css });
        const desktopAfter = await page.screenshot({ path: path.join(out, 'review-desktop-mobile-reverted.png'), animations: 'disabled' });
        const vitalsAfter = await desktopVitals.screenshot({ animations: 'disabled' });
        results.desktop = { currentSha256: sha(desktopBefore), revertedMobileSha256: sha(desktopAfter), wholeViewportPixelIdentical: desktopBefore.equals(desktopAfter),
          vitalsBeforeSha256: sha(vitalsBefore), vitalsAfterSha256: sha(vitalsAfter), vitalsPixelIdentical: vitalsBefore.equals(vitalsAfter), guards: await runGuards(page, 1440, scenario.expected) };
        assert.ok(results.desktop.vitalsPixelIdentical, 'desktop vitals unaffected by mobile-only classes');
        await desktopStyle.evaluate(el => el.remove());
        await page.setViewportSize({ width: 375, height: 900 });
        await page.getByRole('button', { name: /^Edit Monthly income,/ }).click();
        const input = page.getByRole('textbox', { name: 'Monthly income value', exact: true });
        await input.fill('0'); await input.press('Enter');
        await page.getByTestId('dashboard-mobile-vital-next-move').getByText('Restore positive cash flow', { exact: true }).waitFor();
        await page.evaluate(() => window.scrollTo(0, 0));
        results.interaction = { flow: 'House -> edit monthly income to 0 -> Next Move Restore positive cash flow', guards: await runGuards(page, 375, scenario.expected), storedIncome: await page.evaluate(() => JSON.parse(localStorage.getItem('velocity-bank-storage')).state.monthlyIncome) };
        assert.equal(results.interaction.storedIncome, 0);
        assert.ok(results.interaction.guards.accepted);
        log(`INTERACTION storedIncome=0 nextMove updated guards=${results.interaction.guards.accepted}`);
      }
    } finally { await context.close(); }
  }
}
timeout = setTimeout(() => { log('TIMEOUT 150 seconds'); process.exitCode = 1; void browser?.close().finally(() => stopServer(server?.server)); }, 150000);
main().catch(e => { results.failure = e.stack; console.error(e); process.exitCode = 1; }).finally(async () => {
  clearTimeout(timeout);
  await browser?.close(); await stopServer(server?.server);
  results.finalHashes = hashes(); results.finalHead = git('rev-parse', 'HEAD').trim(); results.finished = new Date().toISOString();
  results.trackedUnchangedDuringReview = JSON.stringify(results.initialHashes) === JSON.stringify(results.finalHashes) && results.head === results.finalHead;
  results.serverStopped = !server || server.server.exitCode !== null;
  log(`STOP own server pid ${results.serverPid}; filesStable=${results.trackedUnchangedDuringReview}`);
  save('evidence', results);
  fs.writeFileSync(path.join(out, 'review-probe.log'), logLines.join('\n') + '\n');
});
