/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { clone, fixture, componentHarness } = require('./native-dated-test-helpers.cjs');
const { harness: storageHarness } = require('./portfolio-v3-storage-contract.cjs');
const { React } = require('./mobile-assumption-physical-contract.cjs').nullHost();
const owner = '00000000-0000-4000-8000-00000000000a';
async function main() {
  const storage = storageHarness('ios'), original = fixture(); delete original.datedPlan;
  const oldKey = `interestshield.mobile.portfolio.v3.owner.${owner}`;
  await storage.seed(oldKey, original, 7, 3); const archived = new Map(storage.values);
  let current, recoveryBusy = false;
  const auth = { useMobileAuth: () => ({ ownerId: owner, authReady: true, recoveryBusy, isRecoveryBusy: () => recoveryBusy }) };
  const nothing = () => null;
  const h = componentHarness('components/mobile-routes/portfolio-route.tsx', {}, {
    './mobile-portfolio-storage': storage.storage,
    './supabase/auth-storage': storage.auth,
    '@/lib/supabase/auth-storage': storage.auth,
    './mobile-auth-provider': auth, '@/components/mobile-auth-provider': auth,
    './route-screen': { MobileRouteScreen: props => props.renderContent({ input: {}, isHydrated: true }) },
    '@/components/financial-card': { FinancialCard: nothing },
    '@/components/portfolio/portfolio-controls': { PortfolioControls: nothing },
    '@/components/portfolio/portfolio-debt-editor': { PortfolioDebtEditor: nothing },
    '@/components/portfolio/portfolio-common-month': { PortfolioCommonMonth: nothing },
    '@/components/portfolio/portfolio-payoff-path': { PortfolioPayoffPath: nothing },
    '@/components/portfolio/portfolio-transfer': { PortfolioTransfer: nothing },
  });
  const provider = h.load(require('node:path').resolve(__dirname, '../components/mobile-portfolio-provider.tsx'));
  function Capture() { const value = provider.useMobilePortfolio(); React.useLayoutEffect(() => { current = value; }); return null; }
  h.wrap(child => React.createElement(provider.MobilePortfolioProvider, null, child, React.createElement(Capture)));
  try {
    await h.render(); assert.equal(current.status, 'saved'); assert.equal(current.documentVersion, 3); assert.equal(current.book.datedPlan, undefined);
    await h.press('Dated plan');
    const fields = { 'Plan start date': '2026-01-01', 'Account opened on': '2020-01-01', 'Draw ends on': '2030-01-01',
      'Matures on': '2045-01-01', 'First annual fee date': '2026-01-01', 'Opening cash': '0', 'Cash reserve': '0',
      'Opening statement minimum': '0', 'LOC minimum due day': '15', 'Other debt payment day': '15' };
    for (const [label, value] of Object.entries(fields)) await h.edit(label, value);
    await h.press('Add income'); await h.edit('Entry 1 day', '1'); await h.edit('Entry 1 amount', '500');
    await h.press('Add expense'); await h.edit('Entry 2 day', '1'); await h.edit('Entry 2 amount', '200'); await h.choose('Entry 2 source', 'LOC');
    assert.deepEqual([...storage.values], [...archived], 'drafts never write storage');
    await h.press('Save dated plan'); assert.equal(current.status, 'saved'); assert.equal(current.documentVersion, 4); assert.equal(current.revision, 8);
    const saved = await storage.read(); assert.deepEqual(clone(saved.book), clone(current.book));
    for (const [key, value] of archived) assert.equal(storage.values.get(key), value);
    assert.match(h.text(), /Declared dated estimate/); assert.match(h.text(), /Payoff observed 2026-/);
    await h.React.act(async () => { await current.reload(); }); assert.equal(current.documentVersion, 4);
    assert.deepEqual(clone(current.book.datedPlan), clone(saved.book.datedPlan));
    await h.press('Lender terms'); await h.edit('Lender annual fee', '26'); await h.press('Save lender terms');
    assert.equal(current.documentVersion, 4); assert.equal(current.revision, 9); assert.equal(current.book.loc.lenderTerms.annualFee, 26);
    assert.deepEqual(clone(current.book.datedPlan), clone(saved.book.datedPlan));
    // Reloading remounts the keyed workspace, so reopen the optional schedule.
    await h.press('Dated plan'); await h.press('Remove dated plan');
    assert.equal(current.documentVersion, 4); assert.equal(current.book.datedPlan, undefined);
    await h.React.act(async () => { await current.reload(); }); assert.equal(current.documentVersion, 4); assert.equal(current.book.datedPlan, undefined);
    const beforeRecovery = [...storage.values]; recoveryBusy = true; await h.render();
    await assert.rejects(() => current.setDatedPlan(fixture().datedPlan), /recovery/i); assert.deepEqual([...storage.values], beforeRecovery);
    for (const [key, value] of archived) assert.equal(storage.values.get(key), value);
    console.log('PASS native dated workflow actual route/editor -> provider/typed hook -> encrypted storage4 -> reload -> lender edit -> clear -> sticky4 reload; archived3 bytes retained');
  } finally { await h.close(); }
}
const watchdog = setTimeout(() => { console.error('Native dated workflow timed out'); process.exit(1); }, 20000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
