/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { loader, clone, fixture, componentHarness } = require('./native-dated-test-helpers.cjs');
const { React } = require('./mobile-assumption-physical-contract.cjs').nullHost();
let cases = 0;
async function test(name, action) { cases++; try { await action(); console.log('PASS dated route ' + name); } catch (error) { console.error('FAIL dated route ' + name); console.error(error); process.exitCode = 1; } }
function harness() {
  const widgets = new Map(), saves = [], replacements = []; let recoveryBusy = false;
  let portfolio = { book: fixture(), status: 'saved', documentVersion: 4, revision: 9, isHydrated: true, storageScope: 'owner.a', backend: 'secure-store',
    replace: async (...args) => { replacements.push(clone(args)); }, setDatedPlan: async value => { saves.push(value); } };
  const capture = name => props => { React.useLayoutEffect(() => { widgets.set(name, props); }); return null; };
  const mocks = { '@/components/mobile-portfolio-provider': { useMobilePortfolio: () => portfolio },
    '@/components/mobile-auth-provider': { useMobileAuth: () => ({ recoveryBusy }) },
    './route-screen': { MobileRouteScreen: props => props.renderContent({ input: {}, isHydrated: true }) },
    '@/components/financial-card': { FinancialCard: capture('FinancialCard') },
  };
  for (const [file, name] of [['portfolio-controls', 'PortfolioControls'], ['portfolio-debt-editor', 'PortfolioDebtEditor'],
    ['portfolio-payoff-path', 'PortfolioPayoffPath'], ['portfolio-common-month', 'PortfolioCommonMonth'], ['portfolio-transfer', 'PortfolioTransfer'],
    ['portfolio-lender-terms', 'PortfolioLenderTerms'], ['portfolio-dated-plan', 'PortfolioDatedPlan'], ['portfolio-dated-ledger', 'PortfolioDatedLedger']]) mocks[`@/components/portfolio/${file}`] = { [name]: capture(name) };
  const h = componentHarness('components/mobile-routes/portfolio-route.tsx', {}, mocks);
  return { ...h, widgets, saves, replacements, portfolio: () => portfolio,
    patch: async patch => { portfolio = { ...portfolio, ...patch }; await h.render(); },
    busy: async value => { recoveryBusy = value; await h.render(); } };
}
async function main() {
  await test('canonical route exposes explicit dated editor using typed durable setter and current plan', async () => {
    const h = harness(); try {
      await h.render(); const props = h.widgets.get('PortfolioDatedPlan'); assert.ok(props, 'canonical Portfolio must expose the optional editor');
      assert.deepEqual(props.plan, fixture().datedPlan); assert.equal(props.disabled, false);
      await props.onSave(null); assert.deepEqual(h.saves, [null]); assert.equal(h.replacements.length, 0);
      for (const status of ['saving', 'replacing', 'error']) { await h.patch({ status }); assert.equal(h.widgets.get('PortfolioDatedPlan').disabled, true); }
      await h.patch({ status: 'saved' }); await h.busy(true); assert.equal(h.widgets.get('PortfolioDatedPlan').disabled, true);
    } finally { await h.close(); }
  });
  await test('lender term edit and removal retain datedPlan and sticky4 in the fourth replacement argument', async () => {
    const h = harness(); try {
      await h.render(); await h.widgets.get('PortfolioLenderTerms').onSave({ ...fixture().loc.lenderTerms, annualFee: 26 });
      assert.equal(h.replacements[0][3], 4); assert.equal(h.replacements[0][2], 9);
      assert.deepEqual(h.replacements[0][0].datedPlan, fixture().datedPlan);
      const removed = fixture(); delete removed.datedPlan; await h.patch({ book: removed });
      await h.widgets.get('PortfolioLenderTerms').onSave(null); assert.equal(h.replacements[1][3], 4);
      assert.equal(h.replacements[1][0].loc.lenderTerms, undefined);
    } finally { await h.close(); }
  });
  await test('canonical route passes computed normal basis and dated ledger result without raw reassessment', async () => {
    const h = harness(); try {
      await h.render(); const load = loader(), codec = load(require.resolve('@interestshield/financial-engine/portfolio-book'));
      const engine = load(require.resolve('@interestshield/financial-engine/portfolio')), result = engine.simulatePortfolio(codec.portfolioBookInputs(fixture()));
      assert.ok(h.widgets.get('PortfolioLenderTerms').basis, 'computed result basis must be forwarded');
      assert.deepEqual(clone(h.widgets.get('PortfolioLenderTerms').basis), clone(result.forecastBasis));
      assert.deepEqual(clone(h.widgets.get('PortfolioDatedLedger').result), clone(result));
    } finally { await h.close(); }
  });
  console.log(`${cases} canonical native dated route contracts ${process.exitCode ? 'failed' : 'passed'}. CPU callbacks only.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
