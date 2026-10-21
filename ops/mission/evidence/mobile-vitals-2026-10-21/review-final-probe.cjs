const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');

const repo = process.cwd(), out = __dirname, app = path.join(repo, 'apps/web');
const req = createRequire(path.join(app, 'package.json'));
const { chromium } = req('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = req('./scripts/browser-harness.cjs');
const { startBuiltServer, stopServer } = req('./scripts/built-server-harness.cjs');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const files = ['apps/web/src/app/page.tsx', 'apps/web/scripts/smoke-dashboard-interest.cjs', 'apps/web/scripts/engine-regression-tests.cjs', 'docs/mobile-vitals-contract-2026-10-21.md'];
const hashes = () => Object.fromEntries(files.map(f => [f, sha(fs.readFileSync(path.join(repo, f)))]));
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true });
const oldNames = fs.readdirSync(out).filter(n => n.startsWith('review-') && !n.startsWith('review-final-'));
const oldHashes = () => Object.fromEntries(oldNames.map(n => [n, sha(fs.readFileSync(path.join(out, n)))]));
const oldPins = oldHashes(), logs = [];
const log = s => { logs.push(s); console.log(s); };
const save = (name, data) => fs.writeFileSync(path.join(out, `review-final-${name}.json`), JSON.stringify(data, null, 2) + '\n');
const smoke = fs.readFileSync(path.join(app, 'scripts/smoke-dashboard-interest.cjs'), 'utf8');
const source = smoke.slice(smoke.indexOf('async function vitalLayout('), smoke.indexOf('async function checkVitalOracleControls('));
assert.ok(source.includes('function assertVitalLayout'));
assert.ok(source.includes('tokens.length > 0'), 'must review final empty-token guard');
const { vitalLayout, assertVitalLayout } = new Function('assert', `${source}\nreturn { vitalLayout, assertVitalLayout };`)(assert);
const result = { started: new Date().toISOString(), command: 'node .superpowers/sdd/2026-10-21-mobile-vitals/review-final-probe.cjs',
  head: git('rev-parse', 'HEAD').trim(), initialHashes: hashes(), oracleSha256: sha(source), positives: [], mutants: [],
  browserPath: 'Browser plugin absent; explicitly authorized regular repository Playwright/Chrome' };
fs.writeFileSync(path.join(out, 'review-final-working.diff'), git('diff', '--', ...files));
fs.writeFileSync(path.join(out, 'review-final-oracle-source.txt'), source);

async function audit(page, width, name) {
  const layout = await vitalLayout(page, width);
  const detail = await page.locator(`[data-testid^="${width < 768 ? 'dashboard-mobile-vital-' : 'dashboard-vital-'}"]`).evaluateAll(articles => articles.map(article => {
    const card = article.getBoundingClientRect();
    const parts = [...article.querySelectorAll('p')].slice(0, 2).map(el => {
      const box = el.getBoundingClientRect(), chars = [], clips = [];
      let painted = true;
      for (let n = el; n; n = n.parentElement) {
        const css = getComputedStyle(n), r = n.getBoundingClientRect();
        painted &&= css.visibility === 'visible' && css.display !== 'none' && Number(css.opacity) >= 0.99;
        if (css.overflowX !== 'visible' || css.overflowY !== 'visible') clips.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom,
          x: css.overflowX !== 'visible', y: css.overflowY !== 'visible' });
      }
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let node;
      while ((node = walker.nextNode())) for (let i = 0; i < node.length; i++) {
        if (/\s/.test(node.data[i])) continue;
        const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1); const r = range.getBoundingClientRect();
        chars.push({ char: node.data[i], left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
      }
      const contained = chars.length > 0 && chars.every(r => r.width > 0 && r.height > 0 &&
        r.left >= Math.max(box.left, card.left) - 1 && r.right <= Math.min(box.right, card.right) + 1 &&
        r.top >= Math.max(box.top, card.top) - 1 && r.bottom <= Math.min(box.bottom, card.bottom) + 1 &&
        clips.every(c => (!c.x || (r.left >= c.left - 1 && r.right <= c.right + 1)) && (!c.y || (r.top >= c.top - 1 && r.bottom <= c.bottom + 1))));
      return { text: el.textContent, font: getComputedStyle(el).fontFamily, fontSize: getComputedStyle(el).fontSize,
        box: { top: box.top, bottom: box.bottom, left: box.left, right: box.right }, chars, clips, painted, contained,
        elementTopClearance: chars.length ? Math.min(...chars.map(r => r.top)) - box.top : null,
        elementBottomClearance: chars.length ? box.bottom - Math.max(...chars.map(r => r.bottom)) : null };
    });
    const overlap = parts[0].chars.some(a => parts[1].chars.some(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1));
    return { id: article.dataset.testid, parts, overlap };
  }));
  let failure = null;
  try { assertVitalLayout(layout, name); } catch (e) { if (!(e instanceof assert.AssertionError)) throw e; failure = e.message; }
  return { accepted: !failure, failure, layout, detail, independentPaintAndFit: detail.length === 4 && detail.every(v => !v.overlap && v.parts.every(p => p.painted && p.contained)) };
}

async function hero(page) {
  return page.getByTestId('asset-hero').evaluate(el => {
    const r = el.getBoundingClientRect(), img = el.querySelector('img');
    return { visibleHeight: Math.min(r.bottom, innerHeight) - Math.max(r.top, 0), loaded: !!img && img.complete && img.naturalWidth > 0, top: r.top, viewportHeight: innerHeight };
  });
}
async function positive(page, width, id, expected) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const record = await audit(page, width, id);
  record.id = id; record.hero = await hero(page);
  record.viewport = page.viewportSize();
  if (expected) assert.equal(record.layout[1].value.text, expected);
  result.positives.push(record); save(id, record);
  assert.ok(record.accepted && record.independentPaintAndFit, `${id}: real font/glyph layout must pass`);
  assert.ok(record.hero.loaded && record.hero.visibleHeight >= 48, `${id}: actual viewport has loaded hero hint`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.locator('[data-nextjs-dialog], .vite-error-overlay').count(), 0);
  await page.screenshot({ path: path.join(out, `review-final-${id}.png`), animations: 'disabled' });
  log(`POSITIVE ${id}: PASS ${JSON.stringify(record.layout.map(v => v.value.text))} hero=${record.hero.visibleHeight}`);
  return record;
}
const state = { activeDomain: 'house', monthlyIncome: 8200, monthlyExpenses: 4700, chunkAmount: 1000, chunkFrequency: 'weekly',
  debts: { house: { balance: 285000, interestRate: 0.065, minimumPayment: 425 } },
  loc: { limit: 200000000, balance: 3200, interestRate: 0.085 },
  mortgageDetails: { entryMode: 'current', currentBalance: 123456, paymentFrequency: 'biweekly' } };
let browser, server, timer;
async function main() {
  assert.equal(result.head, 'caefd8086180513b3fb6c1cf85492174996a437b');
  assert.equal(result.initialHashes[files[0]], '01211b504632c98c4fd951656a7b4c02362a4f0b56591e491675613fe9444297');
  assert.equal(result.initialHashes[files[1]], '0a5d474b096426afef6e825cdaffc59ee2178e5060d080bae481a61f63260f6a');
  assert.equal(result.initialHashes[files[2]], 'df7744d9e3594e38f547bf3b92b4c258f5c7ee49cdfaab88365449dbb7978114');
  const pageText = fs.readFileSync(path.join(app, 'src/app/page.tsx'), 'utf8');
  const reversed = pageText.replace('grid grid-cols-2 gap-1.5 md:hidden', 'grid grid-cols-4 gap-1.5 md:hidden').replace('min-h-[82px] min-w-0', 'min-h-[82px]')
    .replace("mt-1.5 font-bold leading-tight ${vital.value.length > 18 ? 'text-xs' : 'text-sm'} ${style.value}", 'mt-1.5 text-sm font-bold leading-tight break-words ${style.value}');
  assert.equal(reversed.replace(/\r\n/g, '\n'), git('show', `${result.head}:apps/web/src/app/page.tsx`).replace(/\r\n/g, '\n'));
  result.sourceScope = 'only original three mobile substitutions; all other page source identical to baseline';
  server = await startBuiltServer(app); result.origin = server.origin; result.serverPid = server.server.pid;
  log(`START private ${result.origin} pid=${result.serverPid} hashes=${JSON.stringify(result.initialHashes)}`);
  browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true, args: getHeadlessChromiumArgs() });
  result.browserVersion = browser.version();
  const cases = [
    { id: 'house-375', width: 375, state, expected: 'Est. $51.50/day', controls: true },
    { id: 'negative-280', width: 280, height: 653, state: { ...state, monthlyIncome: 0, monthlyExpenses: 90000000 }, expected: 'Est. $51.50/day' },
    { id: 'subcent-280', width: 280, state: { ...state, debts: { house: { balance: 1, interestRate: 0.01, minimumPayment: 1 } }, loc: { ...state.loc, balance: 0, interestRate: 0 } }, expected: 'Est. <$0.01/day' },
    ...[9999.99, 10000].map((burn, i) => ({ id: `threshold-${18 + i}`, width: 280,
      state: { ...state, monthlyIncome: 100000001, monthlyExpenses: 10000001, debts: { house: { balance: burn * 1000, interestRate: 0.365, minimumPayment: 10000001 } }, loc: { ...state.loc, balance: 0 } },
      expected: `Est. $${i ? '10,000.00' : '9,999.99'}/day` })),
  ];
  for (const c of cases) {
    const context = await browser.newContext({ viewport: { width: c.width, height: c.height ?? 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = []; page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
    try {
      await context.addInitScript(seed => { localStorage.setItem('velocity-bank-storage', JSON.stringify({ state: seed, version: 0 })); }, c.state);
      assert.equal((await page.goto(server.origin, { waitUntil: 'networkidle' })).status(), 200);
      await page.getByTestId('dashboard-mobile-vital-interest-burn').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => { const main = document.querySelector('main'), img = document.querySelector('[data-testid="asset-hero"] img'); return main && getComputedStyle(main).opacity === '1' && img && img.complete && img.naturalWidth > 0; });
      assert.equal(await page.title(), 'InterestShield - Financial Empowerment');
      assert.equal(await page.getByRole('heading', { name: 'House Dashboard', exact: true }).count(), 1);
      const current = await positive(page, c.width, c.id, c.expected);
      if (c.id.startsWith('threshold')) {
        assert.equal(current.layout[1].value.text.length, Number(c.id.slice(-2)));
        assert.equal(current.layout[1].value.fontSize, c.id.endsWith('18') ? 14 : 12);
      }
      if (c.controls) {
        const originalColumns = '[data-testid="dashboard-mobile-vitals"]{grid-template-columns:repeat(4,minmax(0,1fr))!important}[data-testid^="dashboard-mobile-vital-"]>p:nth-child(2){font-size:14px!important;overflow-wrap:break-word!important}';
        const mutants = [
          { id: 'original-four-column', css: originalColumns },
          { id: 'forced-currency-chop', css: '[data-testid="dashboard-mobile-vital-interest-burn"]>p:nth-child(2){width:22px!important;word-break:break-all!important}' },
          { id: 'hidden-next-move', css: '[data-testid="dashboard-mobile-vital-next-move"]>p:nth-child(2){visibility:hidden!important}' },
          { id: 'vertical-currency-clip', css: '[data-testid="dashboard-mobile-vital-interest-burn"]>p:nth-child(2){height:5px!important;overflow:hidden!important}' },
          { id: 'label-value-collision', css: '[data-testid="dashboard-mobile-vital-cash-flow"]>p:nth-child(2){position:relative!important;top:-23px!important}' },
          { id: 'hero-offscreen', css: '[data-testid="dashboard-mobile-money-loop-bridge"]{margin-bottom:900px!important}', heroOnly: true },
          { id: 'value-opacity', css: '[data-testid="dashboard-mobile-vital-next-move"]>p:nth-child(2){opacity:0!important}' },
          { id: 'ancestor-opacity', css: '[data-testid="dashboard-mobile-vital-interest-burn"]{opacity:0!important}' },
          { id: 'ancestor-clip', css: '[data-testid="dashboard-mobile-vitals"]{height:1px!important;overflow:hidden!important}' },
          { id: 'vertical-one-pixel', css: '[data-testid="dashboard-mobile-vital-interest-burn"]>p:nth-child(2){height:1px!important;overflow:hidden!important}' },
          { id: 'translated-label', translate: true },
          { id: 'empty-value', empty: true },
        ];
        for (const m of mutants) {
          const before = await vitalLayout(page, 375);
          let style, saved;
          const target = page.getByTestId('dashboard-mobile-vital-interest-burn');
          if (m.css) style = await page.addStyleTag({ content: m.css });
          else saved = await target.evaluate((article, mutation) => {
            const [label, value] = article.querySelectorAll('p');
            const record = { labelStyle: label.getAttribute('style'), valueHTML: value.innerHTML };
            if (mutation.empty) value.textContent = '';
            if (mutation.translate) label.style.transform = `translateY(${value.getBoundingClientRect().top - label.getBoundingClientRect().top}px)`;
            return record;
          }, m);
          try {
            const checked = await audit(page, 375, m.id); checked.hero = await hero(page);
            const rejected = m.heroOnly ? checked.hero.visibleHeight < 48 : !checked.accepted;
            const record = { id: m.id, mutation: m, rejected, ...checked };
            result.mutants.push(record); save(`mutant-${m.id}`, record);
            await page.screenshot({ path: path.join(out, `review-final-mutant-${m.id}.png`), animations: 'disabled' });
            assert.ok(rejected, `${m.id}: latest oracle must reject actual broken DOM`);
            log(`MUTANT ${m.id}: REJECTED ${checked.failure ?? 'hero first-viewport guard'}`);
          } finally {
            if (style) await style.evaluate(el => el.remove());
            else await target.evaluate((article, record) => {
              const [label, value] = article.querySelectorAll('p');
              if (record.labelStyle === null) label.removeAttribute('style'); else label.setAttribute('style', record.labelStyle);
              value.innerHTML = record.valueHTML;
            }, saved);
            assert.deepEqual(await vitalLayout(page, 375), before, `${m.id}: exact layout restoration`);
          }
        }
        await page.setViewportSize({ width: 375, height: 667 });
        await positive(page, 375, 'short-375', c.expected);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => { const img = document.querySelector('[data-testid="asset-hero"] img'); return img && img.complete && img.naturalWidth > 0; });
        await page.waitForLoadState('networkidle');
        await positive(page, 1440, 'desktop-1440', c.expected);
        const before = await vitalLayout(page, 1440), vitals = page.getByTestId('dashboard-vital-cash-flow').locator('..');
        const pixelsBefore = await vitals.screenshot({ animations: 'disabled' });
        const style = await page.addStyleTag({ content: originalColumns });
        try {
          const after = await vitalLayout(page, 1440), pixelsAfter = await vitals.screenshot({ animations: 'disabled' });
          result.desktopComparison = { before, after, sameLayout: JSON.stringify(before) === JSON.stringify(after),
            pixelsBefore: sha(pixelsBefore), pixelsAfter: sha(pixelsAfter), samePixels: pixelsBefore.equals(pixelsAfter) };
          assert.deepEqual(after, before); assert.ok(result.desktopComparison.samePixels);
        } finally { await style.evaluate(el => el.remove()); }
        await page.setViewportSize({ width: 375, height: 900 });
        await page.getByRole('button', { name: /^Edit Monthly income,/ }).click();
        const input = page.getByRole('textbox', { name: 'Monthly income value', exact: true }); await input.fill('0'); await input.press('Enter');
        await page.getByTestId('dashboard-mobile-vital-next-move').getByText('Restore positive cash flow', { exact: true }).waitFor();
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('velocity-bank-storage')).state.monthlyIncome), 0);
        await positive(page, 375, 'income-edit-zero', c.expected);
      }
      assert.deepEqual(errors, [], `${c.id}: no browser errors/warnings`);
      result.positives.find(p => p.id === c.id).browserErrors = errors;
    } finally { await context.close(); }
  }
}
timer = setTimeout(() => { result.timeout = true; process.exitCode = 1; void browser?.close().finally(() => stopServer(server?.server)); }, 90000);
main().catch(e => { result.failure = e.stack; log(e.stack); process.exitCode = 1; }).finally(async () => {
  clearTimeout(timer); await browser?.close(); await stopServer(server?.server);
  result.finalHashes = hashes(); result.finalHead = git('rev-parse', 'HEAD').trim(); result.serverStopped = !server || server.server.exitCode !== null;
  result.filesStable = JSON.stringify(result.initialHashes) === JSON.stringify(result.finalHashes) && result.head === result.finalHead;
  result.oldReviewArtifactsUnchanged = JSON.stringify(oldPins) === JSON.stringify(oldHashes());
  result.finished = new Date().toISOString();
  if (!result.filesStable || !result.oldReviewArtifactsUnchanged) { result.failure ??= 'Pins or original review artifacts changed'; process.exitCode = 1; }
  log(`STOP pid=${result.serverPid} serverStopped=${result.serverStopped} filesStable=${result.filesStable} oldArtifactsUnchanged=${result.oldReviewArtifactsUnchanged}`);
  save('evidence', result); fs.writeFileSync(path.join(out, 'review-final-probe.log'), logs.join('\n') + '\n');
});
