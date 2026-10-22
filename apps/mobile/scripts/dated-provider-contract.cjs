/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const vm = require('node:vm'), ts = require('typescript');
const { React, createRoot, hostElement, document } = require('./mobile-assumption-physical-contract.cjs').nullHost();
const { plan } = require('./dated-storage-contract.cjs');
async function main() {
  const calls = [], replacements = [], validLease = {}; let busy = false, value;
  const file = path.resolve(__dirname, '../components/mobile-portfolio-provider.tsx'), module = { exports: {} };
  const mocks = {
    './mobile-auth-provider': { useMobileAuth: () => ({ ownerId: null, authReady: true, isRecoveryBusy: () => busy }) },
    '@/hooks/use-persisted-mobile-portfolio': { usePersistedMobilePortfolio: () => ({
      setDatedPlan: async input => { calls.push(input); return 'secure-store'; },
      create: async () => {}, update: async () => {},
      replace: async (...args) => { replacements.push(args); return 'secure-store'; },
    }) },
    '@/lib/supabase/auth-storage': { isMobileSnapshotOwnerLock: (lease, owner) => lease === validLease && owner === 'guest' },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, { module, exports: module.exports, require: id => mocks[id] ?? require(id) }, { filename: file });
  const api = module.exports, container = hostElement('div'); container.ownerDocument = document;
  const root = createRoot(container);
  function Probe() { const current = api.useMobilePortfolio(); React.useLayoutEffect(() => { value = current; }); return null; }
  try {
    await React.act(async () => { root.render(React.createElement(api.MobilePortfolioProvider, null, React.createElement(Probe))); });
    const savedCallback = value.setDatedPlan;
    busy = true;
    for (const input of [plan(), null]) await assert.rejects(() => savedCallback(input), /recovery/i);
    assert.equal(calls.length, 0, 'recovery guard must prevent both save and removal');
    await assert.rejects(() => value.replace({}, undefined, 1, 4), /recovery/i);
    await assert.rejects(() => value.replace({}, {}, 1, 4), /recovery/i);
    assert.equal(replacements.length, 0);
    assert.equal(await value.replace({}, validLease, 1, 4), 'secure-store');
    assert.equal(replacements.length, 1);
    busy = false; assert.equal(await savedCallback(plan()), 'secure-store'); assert.equal(await value.setDatedPlan(null), 'secure-store');
    assert.deepEqual(calls, [plan(), null]);
    console.log('PASS dated provider recovery busy guard checks latest state for both set and clear without needing a render');
  } finally { await React.act(async () => { root.unmount(); }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
