/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { startBuiltServer, stopServer } = require('./built-server-harness.cjs');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results/dashboard-interest');
const scenarios = [
  { id: 'house', balance: 285000, apr: 0.065, locBalance: 3200, locApr: 0.085,
    value: 'Est. $51.50/day', caption: 'Debt: $50.75/day; LOC: $0.75/day.' },
  { id: 'auto', balance: 18450, apr: 0.069, locBalance: 3200, locApr: 0.085,
    value: 'Est. $4.23/day', caption: 'Debt: $3.49/day; LOC: $0.75/day.' },
  { id: 'cleared', balance: 0, apr: 0.065, locBalance: 0, locApr: 0.085,
    value: 'Est. $0.00/day', caption: 'Debt: $0.00/day; LOC: $0.00/day.' },
  { id: 'sub-cent', balance: 1, apr: 0.01, locBalance: 0, locApr: 0,
    value: 'Est. <$0.01/day', caption: 'Debt: <$0.01/day; LOC: $0.00/day.' },
  { id: 'cent-mismatch', balance: 1236, apr: 0.365, locBalance: 236, locApr: 0.365,
    value: 'Est. $1.47/day', caption: 'Debt: $1.24/day; LOC: $0.24/day.' },
  { id: 'large-import', balance: 100000000, apr: 0.365, locBalance: 100000000, locApr: 0.365,
    income: 100000001, expenses: 10000001, chunk: 20000001, minimum: 10000001,
    value: 'Est. $200,000.00/day', caption: 'Debt: $100,000.00/day; LOC: $100,000.00/day.' },
];

async function storedInputs(page) {
  return page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('velocity-bank-storage')).state;
    return { debts: s.debts, loc: s.loc, income: s.monthlyIncome, expenses: s.monthlyExpenses,
      chunk: s.chunkAmount, frequency: s.chunkFrequency, mortgage: s.mortgageDetails };
  });
}

async function vitalLayout(page, width) {
  const prefix = width < 768 ? 'dashboard-mobile-vital-' : 'dashboard-vital-';
  return page.locator(`[data-testid^="${prefix}"]`).evaluateAll((articles) => articles.map((article) => {
    const [label, value] = article.querySelectorAll('p'), card = article.getBoundingClientRect();
    const inspect = (element) => {
      const text = element.textContent, box = element.getBoundingClientRect(), chars = [], clips = [];
      let visible = true;
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor), rect = ancestor.getBoundingClientRect();
        visible &&= style.visibility === 'visible' && style.display !== 'none' && Number(style.opacity) >= 0.99;
        clips.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
          x: style.overflowX !== 'visible', y: style.overflowY !== 'visible' });
      }
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const innerClips = [];
        for (let ancestor = node.parentElement; ancestor && ancestor !== element; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor), rect = ancestor.getBoundingClientRect();
          visible &&= style.visibility === 'visible' && style.display !== 'none' && Number(style.opacity) >= 0.99;
          innerClips.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
            x: style.overflowX !== 'visible', y: style.overflowY !== 'visible' });
        }
        for (let offset = 0; offset < node.length; offset++) {
          const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + 1);
          const rect = range.getBoundingClientRect();
          chars.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height, innerClips });
        }
      }
      const tokens = [...text.matchAll(/<?\$[\d,]+(?:\.\d+)?|\/day|[A-Za-z]+/g)].map((match) => {
        const rects = chars.slice(match.index, match.index + match[0].length);
        return { text: match[0], oneLine: rects.length > 0 && rects.every(r => r.height > 0 && Math.abs(r.top - rects[0].top) <= 1),
          contained: rects.every(r => r.left >= Math.max(box.left, card.left) - 1 && r.right <= Math.min(box.right, card.right) + 1 &&
            r.top >= Math.max(box.top, card.top) - 1 && r.bottom <= Math.min(box.bottom, card.bottom) + 1 &&
            [...clips, ...r.innerClips].every(c => (!c.x || (r.left >= c.left - 1 && r.right <= c.right + 1)) && (!c.y || (r.top >= c.top - 1 && r.bottom <= c.bottom + 1)))) };
      });
      return { text, tokens, visible, glyphTop: Math.min(...chars.map(r => r.top)), glyphBottom: Math.max(...chars.map(r => r.bottom)),
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        fits: element.scrollWidth <= element.clientWidth + 1 };
    };
    return { id: article.dataset.testid, label: inspect(label), value: inspect(value),
      inViewport: card.width > 0 && card.height > 0 && card.left >= -1 && card.right <= innerWidth + 1 && card.top >= -1 && card.bottom <= innerHeight,
      width: card.width, height: card.height };
  }));
}

function assertVitalLayout(layout, context) {
  assert.equal(layout.length, 4, context + ': all four vitals remain visible');
  assert.deepEqual(layout.map(v => v.label.text.trim()), ['Cash Flow', 'Interest Burn', 'Debt-Free ETA', 'Next Move']);
  for (const vital of layout) for (const part of ['label', 'value']) {
    assert.ok(vital.inViewport, context + ': all four vitals stay in the first viewport');
    assert.ok(vital.label.glyphBottom <= vital.value.glyphTop + 1, context + ': label and value glyphs must not overlap');
    const result = vital[part];
    assert.ok(result.visible && result.fits && result.tokens.length > 0 && result.tokens.every(t => t.oneLine && t.contained),
      `${context}: ${vital.id} ${part} must fit without splitting tokens: ${JSON.stringify(result)}`);
    if (part === 'value') assert.ok(result.fontSize >= 12, context + ': value text stays readable');
  }
}

async function checkVitalOracleControls(page) {
  const before = await vitalLayout(page, 375), controls = [];
  for (const kind of ['hidden-value', 'invisible-value', 'hidden-ancestor', 'vertical-clip', 'ancestor-clip', 'label-collision', 'empty-value', 'unit-opacity', 'unit-visibility', 'unit-clip']) {
    const target = page.getByTestId(kind === 'hidden-value' ? 'dashboard-mobile-vital-next-move' : 'dashboard-mobile-vital-interest-burn');
    const saved = await target.evaluateHandle((article, kind) => {
      const [label, value] = article.querySelectorAll('p');
      const walker = document.createTreeWalker(value, NodeFilter.SHOW_ALL), textNodes = [], nodes = [];
      let node;
      while ((node = walker.nextNode())) { nodes.push(node); if (node.nodeType === Node.TEXT_NODE) textNodes.push(node); }
      const unit = value.querySelector('span');
      const styled = [label, value, article, article.parentElement, unit].filter(Boolean);
      const saved = { kind, styled, styles: styled.map(el => el.getAttribute('style')), css: styled.map(el => el.style.cssText),
        textNodes, texts: textNodes.map(n => n.data), nodes };
      if (kind === 'hidden-value') value.style.opacity = '0';
      if (kind === 'invisible-value') value.style.visibility = 'hidden';
      if (kind === 'hidden-ancestor') article.style.opacity = '0';
      if (kind === 'vertical-clip') { value.style.height = '1px'; value.style.overflow = 'hidden'; }
      if (kind === 'ancestor-clip') { article.parentElement.style.height = '1px'; article.parentElement.style.overflow = 'hidden'; }
      if (kind === 'label-collision') label.style.transform = `translateY(${value.getBoundingClientRect().top - label.getBoundingClientRect().top}px)`;
      if (kind === 'empty-value') {
        for (const node of textNodes) node.data = '';
      }
      if (kind === 'unit-opacity') unit.style.opacity = '0';
      if (kind === 'unit-visibility') unit.style.visibility = 'hidden';
      if (kind === 'unit-clip') { unit.style.height = '1px'; unit.style.overflow = 'hidden'; }
      return saved;
    }, kind);
    try {
      const layout = await vitalLayout(page, 375);
      let rejected = false;
      try { assertVitalLayout(layout, kind); } catch (error) {
        if (!(error instanceof assert.AssertionError)) throw error;
        rejected = true;
      }
      controls.push({ kind, rejected, layout });
    } finally {
      try {
        const restoration = await target.evaluate((article, saved) => {
          saved.styled.forEach((el, i) => { if (saved.styles[i] === null) el.removeAttribute('style'); else el.setAttribute('style', saved.styles[i]); });
          saved.textNodes.forEach((node, i) => { node.data = saved.texts[i]; });
          const walker = document.createTreeWalker(article.querySelectorAll('p')[1], NodeFilter.SHOW_ALL), nodes = [];
          let node;
          while ((node = walker.nextNode())) nodes.push(node);
          return { originalNodes: nodes.length === saved.nodes.length && nodes.every((n, i) => n === saved.nodes[i]),
            originalText: saved.textNodes.every((n, i) => n.data === saved.texts[i]),
            originalStyles: saved.styled.every((el, i) => el.style.cssText === saved.css[i]) };
        }, saved);
        assert.ok(Object.values(restoration).every(Boolean), kind + ': controls must restore original nodes, text and styles');
        if (controls.at(-1)?.kind === kind) controls.at(-1).restoration = restoration;
      } finally { await saved.dispose(); }
    }
    assert.deepEqual(await vitalLayout(page, 375), before, 'oracle controls must restore the real UI');
  }
  fs.writeFileSync(path.join(output, 'oracle-controls.json'), JSON.stringify(controls, null, 2) + '\n');
  assert.ok(controls.every(c => c.rejected), 'vital layout oracle accepted broken styles: ' + JSON.stringify(controls.map(c => ({ kind: c.kind, rejected: c.rejected }))));
}

(async () => {
  let server, browser;
  try {
    const executablePath = findBrowserExecutable();
    assert.ok(executablePath, 'Chrome/Chromium executable is required');
    server = process.env.DASHBOARD_INTEREST_SMOKE_ORIGIN ? null : await startBuiltServer(root);
    const origin = process.env.DASHBOARD_INTEREST_SMOKE_ORIGIN ?? server.origin;
    browser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });
    fs.mkdirSync(output, { recursive: true });
    const receipts = [];
    for (const width of [375, 280, 1440]) for (const scenario of scenarios) {
      const domain = scenario.id === 'auto' ? 'car' : 'house';
      const state = { activeDomain: domain, monthlyIncome: scenario.income ?? 8200, monthlyExpenses: scenario.expenses ?? 4700,
        chunkAmount: scenario.chunk ?? 1000, chunkFrequency: 'weekly',
        debts: { [domain]: { balance: scenario.balance, interestRate: scenario.apr, minimumPayment: scenario.minimum ?? 425 } },
        loc: { limit: 200000000, balance: scenario.locBalance, interestRate: scenario.locApr },
        mortgageDetails: { entryMode: 'current', currentBalance: 123456, paymentFrequency: 'biweekly' } };
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      try {
        await context.addInitScript((seed) => {
          if (localStorage.getItem('dashboard-interest-seeded')) return;
          localStorage.setItem('velocity-bank-storage', JSON.stringify({ state: seed, version: 0 }));
          localStorage.setItem('dashboard-interest-seeded', 'true');
        }, state);
        const page = await context.newPage(), errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
        const response = await page.goto(origin, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200);
        const vital = page.getByTestId(width < 768 ? 'dashboard-mobile-vital-interest-burn' : 'dashboard-vital-interest-burn');
        await vital.waitFor();
        assert.ok((await vital.textContent()).includes(scenario.value), `${scenario.id}: ${await vital.textContent()}`);
        assert.ok((await vital.textContent()).includes(scenario.caption));
        const editIncome = page.getByRole('button', { name: /^Edit Monthly income,/ });
        const changeIncome = async (value) => {
          await editIncome.click();
          const input = page.getByRole('textbox', { name: 'Monthly income value', exact: true });
          await input.fill(String(value)); await input.press('Enter');
          await page.waitForFunction(v => JSON.parse(localStorage.getItem('velocity-bank-storage')).state.monthlyIncome === v, value);
        };
        // The legacy partial fixture gains existing defaults only after a real persisted edit.
        if (scenario.id === 'large-import') {
          for (const [label, expected, read] of [
            ['Mortgage balance', scenario.balance, s => s.debts.house.balance],
            ['Mortgage minimum payment', scenario.minimum, s => s.debts.house.minimumPayment],
            ['Line of credit balance', scenario.locBalance, s => s.loc.balance],
            ['Line of credit limit', 200000000, s => s.loc.limit],
            ['Monthly income', scenario.income, s => s.income],
            ['Monthly expenses', scenario.expenses, s => s.expenses],
            ['Velocity chunk amount', scenario.chunk, s => s.chunk],
          ]) {
            await page.getByRole('button', { name: new RegExp(`^Edit ${label},`) }).click();
            const input = page.getByRole('textbox', { name: `${label} value`, exact: true });
            const displayed = await input.inputValue();
            await input.press('Enter');
            assert.equal(read(await storedInputs(page)), expected, `${label} no-op edit must preserve the imported value`);
            assert.equal(Number(displayed), expected, `${label} editor must show the actual imported value`);
          }
        }
        const untouched = await page.evaluate(() => localStorage.getItem('velocity-bank-storage'));
        await changeIncome(state.monthlyIncome);
        assert.equal(await page.evaluate(() => localStorage.getItem('velocity-bank-storage')), untouched,
          'a no-op income edit must preserve exact stored bytes');
        if (scenario.id === 'house') {
          await changeIncome(state.monthlyIncome + 1);
          await changeIncome(state.monthlyIncome);
        }
        const before = await storedInputs(page);
        assert.equal(before.debts[domain].balance, scenario.balance);
        assert.equal(before.debts[domain].interestRate, scenario.apr);
        assert.equal(before.loc.balance, scenario.locBalance);
        assert.equal(before.loc.interestRate, scenario.locApr);
        assert.equal(before.loc.limit, 200000000);
        assert.equal(before.income, state.monthlyIncome); assert.equal(before.expenses, state.monthlyExpenses);
        assert.equal(before.chunk, state.chunkAmount); assert.equal(before.frequency, 'weekly');
        assert.equal(before.mortgage.currentBalance, 123456);
        assert.equal(before.mortgage.paymentFrequency, 'biweekly');
        if (width >= 768) {
          await vital.getByText('Assumptions', { exact: true }).click();
          assert.match(await vital.innerText(), /rounded independently/);
        }
        const amount = vital.getByText(scenario.value, { exact: true });
        const bounds = await amount.evaluate((el) => {
          const range = document.createRange(); range.selectNodeContents(el);
          const r = el.getBoundingClientRect();
          return { fits: [...range.getClientRects()].every(t => t.left >= r.left - 1 && t.right <= r.right + 1),
            width: r.width, height: r.height, scroll: el.scrollWidth, client: el.clientWidth };
        });
        assert.ok(bounds.fits && bounds.scroll <= bounds.client + 1, `${scenario.id} amount overflow: ${JSON.stringify(bounds)}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(await page.locator('[data-nextjs-dialog], .vite-error-overlay').count(), 0);
        await page.waitForFunction(() => {
          let n = document.querySelector('main');
          while (n) { if (Number(getComputedStyle(n).opacity) < 0.99) return false; n = n.parentElement; }
          return true;
        });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, `${scenario.id}-${width}.png`), fullPage: true });
        if (['house', 'auto', 'large-import'].includes(scenario.id)) {
          await page.screenshot({ path: path.join(output, `${scenario.id}-${width}-viewport.png`) });
        }
        const layout = await vitalLayout(page, width), boundaries = [];
        if (scenario.id === 'auto') {
          assert.equal(layout.find(v => v.label.text.trim() === 'Next Move').value.text.trim(), 'Compare payoff paths');
        }
        fs.writeFileSync(path.join(output, `${scenario.id}-${width}-layout.json`), JSON.stringify(layout, null, 2) + '\n');
        assertVitalLayout(layout, `${scenario.id} ${width}px`);
        const hero = await page.getByTestId('asset-hero').boundingBox();
        const heroVisibleHeight = hero ? Math.min(hero.y + hero.height, 900) - Math.max(hero.y, 0) : 0;
        assert.ok(heroVisibleHeight >= 48,
          'readable vitals must leave a visible part of the asset hero in the first viewport');
        if (width === 375 && scenario.id === 'house') await checkVitalOracleControls(page);
        if (width === 280 && scenario.id === 'large-import') {
          const font = await amount.getAttribute('style');
          try {
            await amount.evaluate(el => { el.style.fontFamily = 'Verdana, sans-serif'; });
            const fallback = await vitalLayout(page, width);
            fs.writeFileSync(path.join(output, 'fallback-font-280.json'), JSON.stringify(fallback, null, 2) + '\n');
            await page.screenshot({ path: path.join(output, 'fallback-font-280.png') });
            assertVitalLayout(fallback, 'large-import wider fallback font 280px');
          } finally {
            await amount.evaluate((el, font) => { if (font === null) el.removeAttribute('style'); else el.setAttribute('style', font); }, font);
          }
          assert.deepEqual(await vitalLayout(page, width), layout, 'font probe must restore the real UI');
        }
        if (width === 1440 && ['house', 'large-import'].includes(scenario.id)) {
          for (const boundaryWidth of [768, 1264]) {
            await page.setViewportSize({ width: boundaryWidth, height: 900 });
            const boundary = await vitalLayout(page, boundaryWidth);
            fs.writeFileSync(path.join(output, `${scenario.id}-${boundaryWidth}-layout.json`), JSON.stringify(boundary, null, 2) + '\n');
            await page.screenshot({ path: path.join(output, `${scenario.id}-${boundaryWidth}.png`), fullPage: true });
            assertVitalLayout(boundary, `${scenario.id} ${boundaryWidth}px`);
            boundaries.push({ width: boundaryWidth, vitals: boundary });
          }
          await page.setViewportSize({ width, height: 900 });
        }
        if (scenario.id === 'house') {
          await changeIncome(8300); await changeIncome(8200);
          await page.goto(`${origin}/simulator`, { waitUntil: 'networkidle' });
          await page.getByTestId('simulator-comparison-assumptions').waitFor();
          await page.goto(origin, { waitUntil: 'networkidle' });
          await page.getByRole('tab', { name: 'Switch to House domain', exact: true }).click();
          await vital.getByText(scenario.value, { exact: true }).waitFor();
        }
        assert.deepEqual(await storedInputs(page), before, 'edits/navigation must preserve all unrelated financial data');
        assert.deepEqual(errors, [], 'no browser errors');
        receipts.push({ scenario: scenario.id, width, value: scenario.value, caption: scenario.caption,
          bounds, layout, boundaries, heroVisibleHeight, savedInputsPreserved: true, editedAndNavigated: scenario.id === 'house',
          noOpCurrencyFields: scenario.id === 'large-import' ? 7 : 0, errors });
        console.log(`PASS Dashboard interest ${scenario.id} at ${width}px`);
      } finally { await context.close(); }
    }
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ origin, receipts }, null, 2) + '\n');
  } finally { await browser?.close(); await stopServer(server?.server); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
