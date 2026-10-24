/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { startBuiltServer, stopServer, createGracefulShutdown } = require('./built-server-harness.cjs');

// CLI owns its server/browser; the exported runner owns only fresh fixture contexts.
// LEGACY_WEB_TRUTH_ORIGIN uses an existing host; LEGACY_WEB_TRUTH_RED=1 pins the old build.
const root = path.resolve(__dirname, '..');
const repository = path.resolve(root, '../..');
const baselineHead = '17457ccd7db7cb83cf7ddecaa3a206ee7e345800';
const baselineBuildId = '6MiW8nqh6lCJOMfmYmwYX';
const legacyKey = 'velocity-bank-storage';
const canonicalKey = 'interestshield-portfolio-v2';
const oldPortfolioKey = 'interestshield-portfolio-v1';
const canonicalBytes = ' \n' + JSON.stringify({ version: 2, aprUnit: 'decimal', data: {
  monthlyIncome: 3900.125, monthlyExpenses: 2100.255, extraMonthlyPayment: 25.005,
  chunkAmount: 100, loc: { limit: 5000, balance: 15.125, apr: 2 }, strategy: 'avalanche',
  focusMode: 'single', splitRatioPrimary: 0.7123456789,
  debts: [{ id: 'fictional-canonical-sentinel', name: 'Fictional Canonical Sentinel', category: 'auto',
    kind: 'amortized', balance: 1250.705, apr: 2, minPaymentRule: { type: 'fixed', amount: 125 },
    paymentSource: 'checking', notes: '  Synthetic sentinel; decimal APR 2 means 200%.  ' }],
} }, null, 3) + '\n';
const oldPortfolioBytes = ' \n{"fictional":"untouched old Portfolio sentinel"}\n';
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const button = (page, label) => page.getByRole('button', { name: new RegExp(`^Edit ${escapeRegex(label)}, current value `) });
const field = (page, label) => page.getByRole('textbox', { name: `${label} value`, exact: true });
const sha256 = value => createHash('sha256').update(value).digest('hex');

function fixture() {
  const accounts = [
    ['car', 'Auto Loan', 18450, 0.069, 425, 48],
    ['house', 'Fictional House', 285000.705, 0.065123456789, 1896.125, 312],
    ['land', 'Fictional Land', 45000.255, 0.075, 450, 180],
    ['creditCard', 'Fictional Card', 8500.755, 0.219, 250, 60],
    ['studentLoan', 'Fictional Study', 32000.125, 0.068, 380, 120],
    ['medical', 'Fictional Medical', 12000.555, 0.18, 300, 48],
    ['personal', 'Fictional Personal', 15000.125, 0.11, 350, 60],
    ['recreation', 'Fictional Recreation', 45000.705, 0.089, 650, 84],
    ['custom', 'Fictional Custom', 25000.255, 0.075, 400, 72],
  ];
  return { monthlyIncome: 8200, monthlyExpenses: 4700, currentAge: 43,
    debts: Object.fromEntries(accounts.map(([type, name, balance, interestRate, minimumPayment, termMonths]) =>
      [type, { id: `fictional-${type}`, type, name, balance, interestRate, minimumPayment, termMonths }])),
    loc: { limit: 25000, balance: 3200, interestRate: 0.085 }, chunkAmount: 1000, chunkFrequency: 'monthly',
    mortgageDetails: { entryMode: 'current', purchaseAge: 28, originalCost: 375000.705,
      originalTermYears: 30, originalRate: 0.065123456789, downPayment: 75000.255,
      currentAge: 43, currentBalance: 285000.705, remainingTermMonths: 312, currentRate: 0.065,
      currentMonthlyPayment: 1896.125, paymentFrequency: 'biweekly', hasExtraPayments: true,
      extraPaymentAmount: 25.005, hasRefinanced: true, refinanceCount: 2 } };
}
const encode = state => ' \n' + JSON.stringify({ state, version: 0 }, null, 2) + '\n';

class SetupError extends Error { constructor(message) { super(message); this.name = 'SetupError'; } }
async function required(locator, description) {
  const count = await locator.count();
  if (count !== 1) throw new SetupError(`${description}: expected one existing control, found ${count}`);
  return locator;
}
async function snapshot(page) {
  return page.evaluate(({ legacyKey, canonicalKey, oldPortfolioKey }) => ({
    bytes: localStorage.getItem(legacyKey), canonical: localStorage.getItem(canonicalKey),
    oldPortfolio: localStorage.getItem(oldPortfolioKey), writes: [...window.__legacyWebTruthWrites],
  }), { legacyKey, canonicalKey, oldPortfolioKey });
}
async function open(page, label) {
  await (await required(button(page, label), label)).click();
  const input = await required(field(page, label), `${label} editor`);
  if (!await input.isVisible()) throw new SetupError(`${label}: editor did not open`);
  await reveal(input);
  return input;
}
async function focusIs(locator) {
  return await locator.count() === 1 && locator.evaluate(element => element === document.activeElement);
}
async function settled(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function reveal(locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate(async element => {
    element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const deadline = performance.now() + 1500;
    do {
      let ready = true;
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        ready &&= Number(getComputedStyle(ancestor).opacity) >= 0.99;
      }
      if (ready) return;
      await new Promise(resolve => requestAnimationFrame(resolve));
    } while (performance.now() < deadline);
  });
  await settled(locator.page());
}
async function navigate(page, origin, route) {
  const response = await page.goto(origin + route, { waitUntil: 'networkidle', timeout: 15000 });
  if (response?.status() !== 200 || new URL(page.url()).pathname !== route) {
    throw new SetupError(`Navigation ${route}: HTTP ${response?.status()} at ${page.url()}`);
  }
  const label = { '/': 'Monthly income', '/simulator': 'Simulator monthly income',
    '/cockpit': 'Cockpit monthly income', '/vault': 'Vault current balance' }[route];
  if (label) await required(button(page, label), `${route} hydrated identity`);
  await settled(page);
}
async function fit(locator) {
  return locator.evaluate(element => {
    const box = element.getBoundingClientRect(), range = document.createRange();
    range.selectNodeContents(element);
    const glyphs = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
    let visible = true;
    const clips = [];
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
      visible &&= style.visibility === 'visible' && style.display !== 'none' && Number(style.opacity) >= 0.99;
      clips.push({ left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
        x: ['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowX),
        y: ['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowY) });
    }
    return { text: element instanceof HTMLInputElement ? element.value : element.textContent,
      valueLength: (element instanceof HTMLInputElement ? element.value : element.textContent).length,
      visible, font: parseFloat(getComputedStyle(element).fontSize), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
      bounds: { left: box.left, right: box.right, width: box.width }, overflowX: getComputedStyle(element).overflowX,
      viewportFit: box.width > 0 && box.left >= -1 && box.right <= innerWidth + 1,
      contentFit: element.scrollWidth <= element.clientWidth + 1 && glyphs.every(rect =>
        rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1 &&
        clips.every(clip => (!clip.x || rect.left >= clip.left - 1 && rect.right <= clip.right + 1) &&
          (!clip.y || rect.top >= clip.top - 1 && rect.bottom <= clip.bottom + 1))) };
  });
}
function assertFit(geometry) {
  assert.ok(geometry.visible && geometry.viewportFit && geometry.contentFit && geometry.font >= 12,
    `Readable, unclipped control/value required: ${JSON.stringify(geometry)}`);
}
async function contrastCheck(locator, check, label) {
  const count = await locator.count();
  if (count !== 1) { await check(`${label} contrast target exists`, () => assert.equal(count, 1)); return; }
  await reveal(locator);
  const measurements = await locator.evaluate(element => {
    const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const rgba = color => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      const pixel = [...context.getImageData(0, 0, 1, 1).data]; pixel[3] /= 255; return pixel;
    };
    const over = (foreground, background) => foreground.slice(0, 3).map((channel, index) =>
      channel * foreground[3] + background[index] * (1 - foreground[3])).concat(1);
    const luminance = color => color.slice(0, 3).map(value => value / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT), texts = [];
    let node;
    while ((node = walker.nextNode())) if (node.data.trim()) texts.push({ element: node.parentElement, text: node.data.trim() });
    if (element instanceof HTMLInputElement) texts.push({ element, text: element.value });
    return texts.map(({ element: target, text }) => {
      const ancestors = [], images = [];
      for (let ancestor = target; ancestor; ancestor = ancestor.parentElement) ancestors.unshift(ancestor);
      let background = [255, 255, 255, 1], opacity = 1;
      const layers = ancestors.map(ancestor => {
        const style = getComputedStyle(ancestor);
        background = over(rgba(style.backgroundColor), background); opacity *= Number(style.opacity);
        if (style.backgroundImage !== 'none') images.push(style.backgroundImage);
        return { color: style.backgroundColor, opacity: style.opacity };
      });
      const color = getComputedStyle(target).color, foreground = rgba(color); foreground[3] *= opacity;
      const painted = over(foreground, background), a = luminance(painted), b = luminance(background);
      return { text, color, background, layers, images, opacity, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
  });
  await check(`${label} light-theme rendered contrast >= 4.5`, () => {
    assert.ok(measurements.length > 0 && measurements.every(value => value.images.length === 0 && value.ratio >= 4.5),
      `Actual computed colors on solid rendered surfaces: ${JSON.stringify(measurements)}`);
  }, measurements);
}
async function cockpit(page) {
  const text = async (id, fallback) => {
    const target = page.getByTestId(id);
    return await target.count() === 1 ? (await target.innerText()).trim() : fallback;
  };
  // Baseline fallbacks preserve the actual wrong result in RED instead of timing out on new testids.
  const legacyETA = page.getByText('ETA', { exact: true });
  const legacyDelta = page.getByText('Modeled Interest Delta', { exact: true });
  const etaFallback = await legacyETA.count() === 1 ? (await legacyETA.locator('..').innerText()).replace(/^ETA\s*/, '').trim() : null;
  const deltaFallback = await legacyDelta.count() === 1 ? (await legacyDelta.locator('..').innerText()).replace(/^Modeled Interest Delta\s*/, '').trim() : null;
  return { eta: await text('cockpit-eta', etaFallback), delta: await text('cockpit-interest-delta', deltaFallback),
    status: await text('cockpit-projection-status', null), scope: await text('cockpit-projection-scope', null),
    debtBalance: await text('cockpit-debt-balance', null), body: await page.locator('main').innerText(),
    testids: await page.locator('[data-testid^="cockpit-"]').evaluateAll(nodes => nodes.map(node => node.dataset.testid)) };
}
async function emergency(page, active) {
  const names = active ? ['End emergency drill', 'Clear Turbulence']
    : ['Start $600 emergency drill', 'Simulate Emergency Expense ($600)'];
  for (const name of names) {
    const target = page.getByRole('button', { name, exact: true });
    if (await target.count() === 1) { await target.click(); await settled(page); return name; }
  }
  throw new SetupError(`No existing ${active ? 'end' : 'start'} emergency control`);
}
async function selectedApr(page) {
  const section = await required(page.getByRole('region', { name: 'Selected debt', exact: true }), 'Selected debt region');
  const value = await required(section.getByText('APR', { exact: true }).locator('..').locator('strong'), 'Selected debt APR readout');
  return (await value.innerText()).trim();
}

async function draftSafety(t) {
  for (const [draft, feedback, commit = 'Enter', theme = 'original'] of [['abc', /valid non-negative/], ['abc', /valid non-negative/, 'Tab'],
    ['abc', /valid non-negative/, 'Enter', 'light'], ['', /valid non-negative/],
    ['-5', /valid non-negative/], ['12..3', /valid non-negative/], ['12,700', /period for decimals/],
    ['100000000000000.01', /supported precision/]]) {
    await t.variant(`invalid-${draft || 'empty'}-${commit}-${theme}`, fixture(), '/', async ({ page, check }) => {
      const before = await snapshot(page), input = await open(page, 'Monthly income');
      if (theme === 'light') await contrastCheck(input, check, 'Legacy numeric input');
      await input.fill(draft); await input.press(commit); await settled(page);
      const after = await snapshot(page);
      await check('invalid draft preserves exact legacy bytes and makes zero writes', () => {
        assert.equal(after.bytes, before.bytes); assert.deepEqual(after.writes, before.writes);
      }, { draft, before, after });
      await check('invalid draft stays in editor with visible feedback', async () => {
        assert.equal(await field(page, 'Monthly income').isVisible(), true);
        assert.equal(await page.getByRole('alert').filter({ hasText: feedback }).isVisible(), true);
      });
      if (theme === 'light') await contrastCheck(page.getByRole('alert').filter({ hasText: feedback }), check, 'Invalid draft feedback');
      if (await field(page, 'Monthly income').count()) await field(page, 'Monthly income').press('Escape');
    }, { theme });
  }
  const precise = fixture(); precise.monthlyExpenses = 4700.255;
  precise.loc.interestRate = 0.085123456789;
  await t.variant('precision-focus-and-navigation', precise, '/', async ({ page, check }) => {
    const original = await snapshot(page);
    for (const [route, label, expected, equivalent] of [
      ['/', 'Monthly expenses', '4700.255', '$ 4,700.2550'],
      ['/', 'Line of credit APR', '8.5123456789', '8.512345678900'],
      ['/simulator', 'Simulator monthly expenses', '4700.255', '4700.2550'],
      ['/cockpit', 'Cockpit monthly expenses', '4700.255', '4700.2550'],
      ['/vault', 'Vault current balance', '285000.705', '285000.7050'],
    ]) {
      await navigate(page, t.origin, route);
      const before = await snapshot(page), input = await open(page, label);
      await check(`${label} opens with full precision`, async () => assert.equal(await input.inputValue(), expected));
      await check(`${label} input fits`, async () => assertFit(await fit(input)));
      await input.press('Tab'); await settled(page);
      await check(`${label} blur no-op preserves raw bytes and zero writes`, async () => {
        const after = await snapshot(page); assert.equal(after.bytes, before.bytes); assert.deepEqual(after.writes, before.writes);
      });
      const equivalentInput = await open(page, label);
      await equivalentInput.fill(equivalent); await equivalentInput.press('Enter'); await settled(page);
      await check(`${label} equivalent no-op preserves raw bytes`, async () => {
        const after = await snapshot(page); assert.equal(after.bytes, before.bytes); assert.deepEqual(after.writes, before.writes);
      });
      await check(`${label} keyboard commit returns focus to its button`, async () => assert.equal(await focusIs(button(page, label)), true));
    }
    await navigate(page, t.origin, '/');
    let input = await open(page, 'Monthly income'); await input.fill('9999.999'); await input.press('Escape');
    await check('Escape cancels without a write and returns focus', async () => {
      assert.equal((await snapshot(page)).bytes, original.bytes); assert.equal(await focusIs(button(page, 'Monthly income')), true);
    });
    const before = await snapshot(page);
    input = await open(page, 'Monthly income'); await input.fill('8300.455');
    await check('keystrokes do not persist', async () => assert.equal((await snapshot(page)).bytes, before.bytes));
    await input.press('Enter'); await settled(page);
    await check('changed valid Enter returns focus to its button', async () => assert.equal(await focusIs(button(page, 'Monthly income')), true));
    await page.getByRole('heading', { name: 'Auto Dashboard', exact: true }).click();
    await check('Enter followed by blur commits exactly once and preserves unrelated known state', async () => {
      const after = await snapshot(page), expected = JSON.parse(before.bytes).state; expected.monthlyIncome = 8300.455;
      assert.deepEqual(JSON.parse(after.bytes).state, expected); assert.equal(after.writes.length - before.writes.length, 1);
    });
    await check('valid commit remains keyboard accessible', async () => {
      await button(page, 'Monthly income').focus(); await button(page, 'Monthly income').press('Enter');
      assert.equal(await focusIs(field(page, 'Monthly income')), true);
    });
    input = field(page, 'Monthly income'); await input.fill('7777.777');
    const saved = (await snapshot(page)).bytes;
    await navigate(page, t.origin, '/cockpit');
    await check('navigation abandons uncommitted draft', async () => assert.equal((await snapshot(page)).bytes, saved));
    for (const route of ['/simulator', '/vault', '/learn', '/']) await navigate(page, t.origin, route);
    await page.reload({ waitUntil: 'networkidle' }); await settled(page);
    await check('reload and all legacy routes preserve precise saved bytes', async () => assert.equal((await snapshot(page)).bytes, saved));
  });
  const large = fixture(); large.monthlyIncome = 100000001.125; large.loc.limit = 200000000;
  large.mortgageDetails.originalCost = 100000001.125; large.mortgageDetails.entryMode = 'both';
  await t.variant('oversized-existing-values-and-bounds', large, '/', async ({ page, check }) => {
    for (const [route, label] of [['/', 'Monthly income'], ['/simulator', 'Simulator monthly income'],
      ['/cockpit', 'Cockpit monthly income'], ['/vault', 'Vault purchase price']]) {
      await navigate(page, t.origin, route);
      const before = await snapshot(page), input = await open(page, label);
      await check(`${label} preserves oversized existing draft`, async () => assert.equal(await input.inputValue(), '100000001.125'));
      await check(`${label} large input fits`, async () => assertFit(await fit(input)));
      await input.press('Enter'); await settled(page);
      await check(`${label} large no-op does not clamp or write`, async () => {
        const after = await snapshot(page); assert.equal(after.bytes, before.bytes); assert.deepEqual(after.writes, before.writes);
      });
    }
    await navigate(page, t.origin, '/vault');
    const before = await snapshot(page), input = await open(page, 'Vault refinance count');
    await input.fill('11'); await input.press('Enter'); await settled(page);
    await check('explicit upper bound rejects instead of clamping', async () => {
      assert.equal((await snapshot(page)).bytes, before.bytes);
      assert.equal(await page.getByRole('alert').filter({ hasText: /at most/ }).isVisible(), true);
      assert.equal(await input.isVisible(), true);
    });
  });
}

async function legacyApr(t) {
  for (const [raw, display, headline] of [[0.069, '6.9', '6.90%'], [2, '2', '2.00%'], [6.5, '6.5', '6.50%']]) {
    const seed = fixture(); seed.debts.car.interestRate = raw;
    await t.variant(`raw-${raw}`, seed, '/', async ({ page, check }) => {
      const original = await snapshot(page);
      await check('selected-debt APR uses legacy normalization', async () => {
        assert.equal(await selectedApr(page), headline);
      }, { raw, headline });
      for (const [route, label] of [['/', 'Auto Loan APR'], ['/simulator', 'Car APR'], ['/cockpit', 'Cockpit Car interest rate']]) {
        await navigate(page, t.origin, route);
        const before = await snapshot(page);
        await check(`${label} correct percentage label`, async () => {
          const name = await button(page, label).getAttribute('aria-label');
          assert.match(name, new RegExp(`current value ${escapeRegex(display)}(?:\\.0+)?%$`));
        });
        const input = await open(page, label);
        await check(`${label} exact legacy draft`, async () => assert.equal(await input.inputValue(), display));
        await input.fill(`${display}${display.includes('.') ? '' : '.'}00`);
        await input.press('Enter'); await settled(page);
        await check(`${label} equivalent rate does not migrate raw units or bytes`, async () => {
          const after = await snapshot(page); assert.equal(after.bytes, before.bytes); assert.deepEqual(after.writes, before.writes);
        });
      }
      await navigate(page, t.origin, '/'); await page.reload({ waitUntil: 'networkidle' });
      await check('rate survives navigation/reload with exact original bytes', async () => assert.equal((await snapshot(page)).bytes, original.bytes));
    });
  }
  await t.variant('new-200-percent', fixture(), '/', async ({ page, check }) => {
    const before = await snapshot(page), expected = JSON.parse(before.bytes).state;
    const input = await open(page, 'Auto Loan APR'); await input.fill('200'); await input.press('Enter'); await settled(page);
    expected.debts.car.interestRate = 200;
    const after = await snapshot(page);
    await check('new legacy 200 stores raw 200, not clamped 1 or decimal 2', () => {
      assert.deepEqual(JSON.parse(after.bytes).state, expected); assert.equal(after.writes.length - before.writes.length, 1);
    }, { before, after });
    await check('new legacy 200 displays 200% editor label', async () => {
      assert.match(await button(page, 'Auto Loan APR').getAttribute('aria-label'), /current value 200(?:\.0+)?%$/);
    });
    await check('new legacy 200 displays 200.00% selected-debt headline', async () => assert.equal(await selectedApr(page), '200.00%'));
    const saved = after.bytes, reopened = await open(page, 'Auto Loan APR');
    await check('new 200 reopens as 200', async () => assert.equal(await reopened.inputValue(), '200'));
    await reopened.press('Enter');
    const expense = await open(page, 'Monthly expenses'); await expense.fill('4701.255'); await expense.press('Enter');
    expected.monthlyExpenses = 4701.255;
    await check('unrelated edit cannot reinterpret new legacy 200', async () => assert.deepEqual(JSON.parse((await snapshot(page)).bytes).state, expected));
    for (const route of ['/simulator', '/cockpit', '/vault', '/']) await navigate(page, t.origin, route);
    await check('new rate retains raw units after every legacy route', async () => {
      assert.deepEqual(JSON.parse((await snapshot(page)).bytes).state, expected); assert.notEqual(saved, before.bytes);
    });
  });
}

async function failedCockpit(t) {
  const cases = [
    ['zero-cash-flow', seed => { seed.monthlyIncome = seed.monthlyExpenses; }],
    ['negative-cash-flow', seed => { seed.monthlyIncome = 4000; }],
    ['below-minimums', seed => { seed.monthlyIncome = 4800; }],
    ['over-limit', seed => { seed.loc.balance = 26000; }],
    ['no-capacity', seed => { seed.loc.balance = seed.loc.limit; }],
  ];
  for (const [name, change] of cases) {
    const seed = fixture(); change(seed);
    await t.variant(name, seed, '/cockpit', async ({ page, check }) => {
      const before = await snapshot(page), base = await cockpit(page);
      await check('failed projection displays Review inputs, never zero-month success', () => assert.equal(base.eta, 'Review inputs'), base);
      await check('failed projection does not fabricate zero interest savings', () => assert.equal(base.delta, 'Not projected'), base);
      await check('projection failure status is disclosed', () => assert.ok(base.status && /review|unavailable|cannot|not.*project|failed/i.test(base.status)), base);
      await emergency(page, false);
      const drill = await cockpit(page);
      await check('failed projection plus drill cannot invent two more months', () => {
        assert.equal(drill.eta, 'Not projected'); assert.equal(drill.delta, 'Not projected');
        assert.match(drill.body, /not modeled|not (?:re)?calculat|unmodeled/i); assert.doesNotMatch(drill.body, /extends the estimate by 2 months/i);
      }, drill);
      await emergency(page, true);
      await check('ending drill restores failed state without persisted writes', async () => {
        const restored = await cockpit(page), after = await snapshot(page);
        assert.equal(restored.eta, 'Review inputs'); assert.equal(restored.delta, 'Not projected');
        assert.equal(after.bytes, before.bytes); assert.deepEqual(after.writes, before.writes);
      });
    });
  }
  for (const [name, change] of [
    ['exact-zero-is-distinct', () => {}],
    ['exact-zero-without-loc-setup', seed => { seed.loc.limit = 0; }],
    ['exact-zero-with-zero-cash-flow', seed => { seed.monthlyIncome = seed.monthlyExpenses; }],
  ]) {
    const zero = fixture(); zero.debts.car.balance = 0; zero.loc.balance = 0; change(zero);
    await t.variant(name, zero, '/cockpit', async ({ page, check }) => {
      const before = await snapshot(page), view = await cockpit(page);
      await check('exact zero is No debt remaining despite unused setup constraints', () => {
        assert.equal(view.eta, 'No debt remaining'); assert.equal(view.delta, '$0.00');
      }, view);
      await emergency(page, false);
      const drill = await cockpit(page);
      await check('cleared balances cannot turn an unmodeled drill into a projection', () => {
        assert.equal(drill.eta, 'Not projected'); assert.equal(drill.delta, 'Not projected');
      }, drill);
      await emergency(page, true);
      for (const id of ['cockpit-toggle-income-to-loc', 'cockpit-toggle-expense-card']) {
        const toggle = await required(page.getByTestId(id), id);
        await toggle.click(); await settled(page);
        const alternate = await cockpit(page);
        await check(`cleared balances keep ${id} alternate routing unmodeled`, async () => {
          assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
          assert.equal(alternate.eta, 'Not projected'); assert.equal(alternate.delta, 'Not projected');
        }, alternate);
        await toggle.click(); await settled(page);
      }
      await check('cleared state returns after flags reset without saved input writes', async () => {
        const restored = await cockpit(page), after = await snapshot(page);
        assert.equal(restored.eta, 'No debt remaining'); assert.equal(restored.delta, '$0.00');
        assert.equal(after.bytes, before.bytes); assert.deepEqual(after.writes, before.writes);
      });
    });
  }
}

async function healthyCockpit(t) {
  await t.variant('healthy-drill-routing', fixture(), '/cockpit', async ({ page, check }) => {
    const before = await snapshot(page), base = await cockpit(page);
    await check('healthy projection retains the real 14 month result', () => assert.match(base.eta, /^14 (?:mo|months)$/), base);
    await check('interest delta uses equal-budget selected-debt-plus-LOC actual totals', () => {
      // Both use the same $3,500 budget: 485.5041104110338 - 779.9758112754789.
      assert.equal(base.delta, '-$294.47');
    }, base);
    await check('comparison discloses the common budget and liability cohort', () => {
      assert.ok(base.status, 'Comparison assumptions must be visible');
      assert.match(base.status, /(?:same|equal|common)[\s\S]*budget/i);
      assert.match(base.status, /selected debt/i); assert.match(base.status, /LOC|line of credit/i);
    }, base);
    await check('projection scope excludes unrelated stored debts', () => assert.ok(base.scope && /selected/i.test(base.scope) && /LOC|line of credit/i.test(base.scope)), base);
    await check('actual debt balance replaces invented freedom progress', () => {
      assert.ok(base.debtBalance && /18,450/.test(base.debtBalance)); assert.doesNotMatch(base.body, /Progress to Freedom/);
    }, base);
    await check('precise daily burn uses Dashboard selected-debt-plus-LOC estimate', () => {
      assert.match(base.body, /Est\. \$4\.23(?:\s*\/day)?/); assert.match(base.body, /Debt: \$3\.49\/day; LOC: \$0\.75\/day\./);
    }, base);
    const etaValue = await page.getByTestId('cockpit-eta').count() === 1 ? page.getByTestId('cockpit-eta')
      : page.getByText('ETA', { exact: true }).locator('..').locator(':scope > div').last();
    const deltaValue = await page.getByTestId('cockpit-interest-delta').count() === 1 ? page.getByTestId('cockpit-interest-delta')
      : page.getByText('Modeled Interest Delta', { exact: true }).locator('..').locator('span').last();
    await contrastCheck(etaValue, check, 'Cockpit numeric ETA');
    await contrastCheck(deltaValue, check, 'Cockpit numeric interest delta');
    await contrastCheck(page.getByTestId('cockpit-projection-status'), check, 'Cockpit projection status');
    for (const id of ['cockpit-eta', 'cockpit-interest-delta', 'cockpit-projection-status', 'cockpit-projection-scope', 'cockpit-debt-balance']) {
      await check(`${id} visible and fits at ${t.width}px`, async () => {
        const target = page.getByTestId(id); assert.equal(await target.count(), 1, `${id} missing after app settled`);
        await reveal(target); assertFit(await fit(target));
      });
    }
    await emergency(page, false);
    const drill = await cockpit(page);
    await check('educational $600 drill suppresses ETA/delta and discloses unmodeled expense', () => {
      assert.equal(drill.eta, 'Not projected'); assert.equal(drill.delta, 'Not projected');
      assert.match(drill.body, /\$600/); assert.match(drill.body, /educational/i);
      assert.match(drill.body, /not modeled|not (?:re)?calculat|unmodeled/i); assert.doesNotMatch(drill.body, /extends the estimate by 2 months/i);
    }, drill);
    await check('drill uses the explicitly educational label', async () => assert.equal(await page.getByRole('button', { name: 'End emergency drill', exact: true }).isVisible(), true));
    await emergency(page, true);
    await check('ending emergency restores the actual baseline projection', async () => {
      const restored = await cockpit(page); assert.equal(restored.eta, base.eta); assert.equal(restored.delta, base.delta);
    });
    const income = page.getByTestId('cockpit-toggle-income-to-loc'), expense = page.getByTestId('cockpit-toggle-expense-card');
    for (const [incomeOn, expenseOn] of [[false, true], [false, false], [true, false], [true, true]]) {
      if (await income.getAttribute('aria-pressed') !== String(incomeOn)) await income.click();
      if (await expense.getAttribute('aria-pressed') !== String(expenseOn)) await expense.click();
      await settled(page);
      const view = await cockpit(page), both = incomeOn && expenseOn;
      await check(`routing ${incomeOn}/${expenseOn} retains pressed states and honest projections`, async () => {
        assert.equal(await income.getAttribute('aria-pressed'), String(incomeOn));
        assert.equal(await expense.getAttribute('aria-pressed'), String(expenseOn));
        assert.equal(view.eta, both ? base.eta : 'Not projected'); assert.equal(view.delta, both ? base.delta : 'Not projected');
        if (!both) assert.match(view.body, /not modeled|not (?:re)?calculat|unmodeled|not projected/i);
      }, view);
      await check('routing/drill changes never write saved financial inputs', async () => {
        const after = await snapshot(page); assert.equal(after.bytes, before.bytes); assert.deepEqual(after.writes, before.writes);
      });
    }
    await navigate(page, t.origin, '/');
    await check('returning to Dashboard preserves all saved input bytes', async () => assert.equal((await snapshot(page)).bytes, before.bytes));
  }, { theme: 'light' });
}

function validateOrigin(value) {
  const url = new URL(value);
  assert.ok(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash,
    'LEGACY_WEB_TRUTH_ORIGIN must be a plain http(s) origin without credentials/path');
  assert.ok(!['53143', '53144'].includes(url.port), 'Do not use reserved user ports');
  return url.origin;
}
function counts(receipts) {
  const checks = receipts.flatMap(receipt => receipt.checks);
  return { workflows: receipts.length, passed: receipts.filter(receipt => receipt.passed).length,
    assertionRedWorkflows: receipts.filter(receipt => receipt.checks.some(check => check.kind === 'assertion')).length,
    setupFailedWorkflows: receipts.filter(receipt => receipt.setupFailures.length).length,
    assertions: checks.length, assertionFailures: checks.filter(check => check.kind === 'assertion').length,
    setupFailures: receipts.reduce((total, receipt) => total + receipt.setupFailures.length, 0) };
}
function writeReport(report, output) {
  const json = JSON.stringify(report, null, 2) + '\n';
  fs.writeFileSync(path.join(report.artifacts, 'verification.json'), json);
  fs.writeFileSync(path.join(output, 'verification.json'), json);
}

async function runLegacyWebTruthFixtures({ browser, origin, output = path.join(root, 'test-results/legacy-web-truth'),
  expectedBuildId, red = false, resources = { browser: 'caller-owned', server: 'caller-owned' } }) {
  origin = validateOrigin(origin); output = path.resolve(output);
  const artifacts = path.join(output, `run-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`);
  fs.mkdirSync(artifacts, { recursive: true });
  const log = line => { console.log(line); fs.appendFileSync(path.join(artifacts, 'run.log'), line + '\n'); };
  const report = { origin, startedAt: new Date().toISOString(), artifacts,
    scope: 'Four multi-assertion workflows at 280/375/1440; fresh fictional storage only; no numerical/model changes',
    scriptSha256: sha256(fs.readFileSync(__filename)), provenance: { baselineHead, baselineBuildId, red },
    resources: { ...resources, contextsOpened: 0, contextsClosed: 0 }, receipts: [], setupFailures: [] };
  try {
    report.provenance.headAtRun = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8', windowsHide: true }).trim();
    const localBuildPath = path.join(root, '.next/BUILD_ID');
    report.provenance.localBuildId = fs.existsSync(localBuildPath) ? fs.readFileSync(localBuildPath, 'utf8').trim() : null;
    const identityContext = await browser.newContext();
    report.resources.contextsOpened++;
    try {
      const served = await identityContext.request.get(origin, { timeout: 15000 }), html = await served.text();
      assert.equal(served.status(), 200, 'served app identity must be HTTP 200');
      const expected = red ? baselineBuildId : expectedBuildId;
      const build = html.match(/\\?"b\\?":\\?"([^"\\]+)\\?"/);
      report.provenance.servedBuildId = build?.[1] ?? null;
      report.provenance.servedRootSha256 = sha256(html);
      if (expected) assert.ok(html.includes(expected), `served app must include pinned build ID ${expected}`);
      if (red) assert.equal(report.provenance.localBuildId, baselineBuildId, 'RED uses the existing baseline build, never working source hashes');
    } finally { await identityContext.close(); report.resources.contextsClosed++; }
    log(`Legacy web truth ${red ? 'baseline RED' : 'regression'}: ${origin}; HEAD ${report.provenance.headAtRun}; build ${report.provenance.servedBuildId}`);
    for (const width of [280, 375, 1440]) for (const [name, run] of [
      ['legacy-draft-safety', draftSafety], ['legacy-apr-semantics', legacyApr],
      ['cockpit-failed-projections', failedCockpit], ['cockpit-healthy-drill-routing', healthyCockpit],
    ]) {
      const receipt = { name, width, passed: false, checks: [], setupFailures: [], variants: [] };
      report.receipts.push(receipt);
      const t = { origin, width, variant: async (variant, seed, route, body, { theme = 'original' } = {}) => {
        let context, page;
        const evidence = { name: variant, errors: [], blockedExternalRequests: [] };
        receipt.variants.push(evidence);
        const prefix = `${name}-${width}-${variant.replace(/[^a-z0-9.-]/gi, '_')}`;
        const check = async (checkpoint, verify, observed) => {
          try { await verify(); receipt.checks.push({ variant, checkpoint, passed: true, observed }); }
          catch (error) {
            if (!(error instanceof assert.AssertionError)) throw error;
            const entry = { variant, checkpoint, passed: false, kind: 'assertion', message: error.message, observed };
            receipt.checks.push(entry);
            log(`RED ${name} ${width}px ${variant}: ${checkpoint}: ${error.message.replace(/\s+/g, ' ').slice(0, 500)}`);
            if (!evidence.firstFailureScreenshot) {
              const file = path.join(artifacts, `${prefix}-failure.png`);
              try { await page.screenshot({ path: file, fullPage: true, timeout: 5000 }); evidence.firstFailureScreenshot = file; }
              catch (captureError) { evidence.screenshotError = captureError.message; }
            }
          }
        };
        try {
          context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
          report.resources.contextsOpened++;
          await context.route('**/*', route => {
            const url = route.request().url();
            if (new URL(url).origin === origin) return route.continue();
            evidence.blockedExternalRequests.push(url); return route.fulfill({ status: 204, body: '' });
          });
          await context.addInitScript(({ origin, legacyKey, canonicalKey, oldPortfolioKey, legacy, canonicalBytes, oldPortfolioBytes, theme }) => {
            if (location.origin !== origin) return;
            if (!localStorage.getItem('legacy-web-truth-seeded')) {
              localStorage.setItem(legacyKey, legacy); localStorage.setItem(canonicalKey, canonicalBytes);
              localStorage.setItem(oldPortfolioKey, oldPortfolioBytes); localStorage.setItem('legacy-web-truth-seeded', 'fictional');
              localStorage.setItem('interestshield-theme', JSON.stringify({ state: { theme }, version: 0 }));
            }
            const auditKey = 'legacy-web-truth-write-audit';
            window.__legacyWebTruthWrites = JSON.parse(sessionStorage.getItem(auditKey) || '[]');
            const set = Storage.prototype.setItem;
            Storage.prototype.setItem = function (key, value) {
              if (this === localStorage && [legacyKey, canonicalKey, oldPortfolioKey].includes(key)) {
                window.__legacyWebTruthWrites.push({ key, value: String(value) });
                set.call(sessionStorage, auditKey, JSON.stringify(window.__legacyWebTruthWrites));
              }
              return set.call(this, key, value);
            };
          }, { origin, legacyKey, canonicalKey, oldPortfolioKey, legacy: encode(seed), canonicalBytes, oldPortfolioBytes, theme });
          page = await context.newPage(); page.setDefaultTimeout(3000);
          page.on('pageerror', error => evidence.errors.push(error.message));
          page.on('console', message => { if (message.type() === 'error') evidence.errors.push(message.text()); });
          await navigate(page, origin, route);
          evidence.initial = await snapshot(page);
          await check('fresh fixture hydrated without rewriting legacy bytes', () => assert.equal(evidence.initial.bytes, encode(seed)));
          await body({ page, check });
        } catch (error) {
          const failure = { variant, kind: 'setup', name: error.name, message: error.message, stack: error.stack };
          receipt.setupFailures.push(failure); log(`SETUP ${name} ${width}px ${variant}: ${error.stack}`);
          if (page) await page.screenshot({ path: path.join(artifacts, `${prefix}-setup-failure.png`), fullPage: true, timeout: 5000 }).catch(() => {});
        } finally {
          if (page && !page.isClosed()) {
            try {
              evidence.final = await snapshot(page);
              await check('canonical Portfolio and old Portfolio sentinel bytes are untouched', () => {
                assert.equal(evidence.final.canonical, canonicalBytes); assert.equal(evidence.final.oldPortfolio, oldPortfolioBytes);
                assert.equal(evidence.final.writes.filter(write => write.key !== legacyKey).length, 0);
              });
              await check('no framework error overlay or browser errors', async () => {
                assert.equal(await page.locator('nextjs-portal, [data-nextjs-dialog], .vite-error-overlay').count(), 0);
                assert.deepEqual(evidence.errors, []);
              });
              if (!evidence.firstFailureScreenshot) {
                const file = path.join(artifacts, `${prefix}.png`);
                await page.screenshot({ path: file, fullPage: true, timeout: 5000 }); evidence.screenshot = file;
              }
            } catch (error) { receipt.setupFailures.push({ variant, kind: 'setup', message: `Evidence: ${error.message}` }); }
          }
          if (context) { await context.close(); report.resources.contextsClosed++; }
        }
      } };
      await run(t);
      receipt.passed = receipt.setupFailures.length === 0 && receipt.checks.every(check => check.passed);
      log(`${receipt.passed ? 'PASS' : 'FAIL'} ${name} ${width}px: ${receipt.checks.filter(check => check.kind === 'assertion').length} assertion REDs, ${receipt.setupFailures.length} setup failures`);
      report.counts = counts(report.receipts); writeReport(report, output);
    }
  } catch (error) {
    report.setupFailures.push({ kind: 'setup', message: error.message, stack: error.stack }); log(`SETUP runner: ${error.stack}`);
  } finally {
    report.completedAt = new Date().toISOString(); report.counts = counts(report.receipts);
    report.counts.setupFailures += report.setupFailures.length;
    report.passed = report.counts.workflows === 12 && report.counts.passed === 12 && report.counts.setupFailures === 0;
    writeReport(report, output); log(`SUMMARY ${JSON.stringify(report.counts)}`);
  }
  if (!report.passed) { const error = new Error(`Legacy web truth failed: ${JSON.stringify(report.counts)}`); error.report = report; throw error; }
  return report;
}

async function main() {
  let browser, server, report;
  const output = path.resolve(process.env.LEGACY_WEB_TRUTH_OUTPUT || path.join(root, 'test-results/legacy-web-truth'));
  const resources = { browser: 'not-started', server: 'not-started' };
  const shutdown = createGracefulShutdown({ closeBrowser: async () => {
    if (browser) { await browser.close(); resources.browser = 'closed'; }
  }, stopServer: async () => {
    if (server) { await stopServer(server.server); resources.server = 'stopped'; }
  }, exit: code => { process.exitCode = code; }, hardExit: code => { void stopServer(server?.server); process.exit(code); } });
  const signal = () => { console.error('Legacy web truth interrupted; closing owned resources.'); void shutdown(1); };
  process.once('SIGINT', signal); process.once('SIGTERM', signal);
  const deadline = setTimeout(() => { console.error('Legacy web truth exceeded its 300s deadline.'); void shutdown(1); }, 300000);
  try {
    const external = process.env.LEGACY_WEB_TRUTH_ORIGIN ? validateOrigin(process.env.LEGACY_WEB_TRUTH_ORIGIN) : null;
    const executablePath = findBrowserExecutable(); assert.ok(executablePath, 'Existing browser harness must find Chrome/Chromium/Edge');
    if (external) resources.server = 'external-not-owned';
    else {
      assert.ok(fs.existsSync(path.join(root, '.next/BUILD_ID')), 'Existing built app required; this script never builds');
      server = await startBuiltServer(root); validateOrigin(server.origin);
      resources.server = 'running'; resources.serverPid = server.server.pid;
    }
    browser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() }); resources.browser = 'running';
    report = await runLegacyWebTruthFixtures({ browser, origin: external || server.origin, output,
      expectedBuildId: process.env.LEGACY_WEB_TRUTH_EXPECT_BUILD_ID, red: process.env.LEGACY_WEB_TRUTH_RED === '1', resources });
  } catch (error) { report = error.report; process.exitCode = 1; throw error; }
  finally {
    clearTimeout(deadline); process.removeListener('SIGINT', signal); process.removeListener('SIGTERM', signal);
    await shutdown(process.exitCode ?? 0);
    if (report) { Object.assign(report.resources, resources); writeReport(report, output); }
    console.log(`RESOURCE TERMINATION ${JSON.stringify(resources)}`);
  }
}

module.exports = runLegacyWebTruthFixtures;
module.exports.runLegacyWebTruthFixtures = runLegacyWebTruthFixtures;
module.exports.main = main;
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
