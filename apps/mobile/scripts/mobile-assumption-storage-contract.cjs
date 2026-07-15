/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const ownerId = '00000000-0000-4000-8000-00000000000a';
const defaultInput = {
  monthlyIncome: 6500,
  monthlyExpenses: 5000,
  chunkAmount: 1000,
  activeDebtName: 'Auto Loan',
  activeDebt: {
    balance: 18450,
    apr: 0.069,
    monthlyPayment: 425,
    termMonths: 48,
  },
  loc: {
    limit: 25000,
    apr: 0.085,
    balance: 3200,
  },
};

function loadStorageModule(localStorage) {
  const filename = path.resolve(__dirname, '..', 'lib', 'mobile-assumption-storage.ts');
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const testModule = { exports: {} };
  const ownerQueues = new Map();
  const withOwnerLock = async (lockOwnerId, action) => {
    const previous = ownerQueues.get(lockOwnerId) ?? Promise.resolve();
    const operation = previous.catch(() => undefined).then(() => action({ ownerId: lockOwnerId }));
    ownerQueues.set(lockOwnerId, operation.then(() => undefined, () => undefined));
    return operation;
  };
  const localRequire = (request) => {
    if (request === '@interestshield/financial-engine') {
      return { defaultMobileDashboardInput: defaultInput };
    }
    if (request === 'expo-secure-store') {
      return {
        getItemAsync: async () => null,
        isAvailableAsync: async () => false,
        setItemAsync: async () => undefined,
      };
    }
    if (request === './supabase/auth-storage') {
      return {
        isMobileSnapshotOwnerLock: (lock, expectedOwnerId) => lock?.ownerId === expectedOwnerId,
        withMobileSnapshotOwnerLock: withOwnerLock,
      };
    }
    return require(request);
  };
  const context = vm.createContext({
    console,
    exports: testModule.exports,
    globalThis: { localStorage },
    module: testModule,
    require: localRequire,
  });
  new vm.Script(output, { filename }).runInContext(context);
  return testModule.exports;
}

async function main() {
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const storage = loadStorageModule(localStorage);
  const firstTab = await storage.loadMobileAssumptionsForOwner(ownerId);
  const staleTab = await storage.loadMobileAssumptionsForOwner(ownerId);
  assert.equal(firstTab.revision, 0);
  assert.equal(staleTab.revision, 0);

  const recoveredInput = { ...defaultInput, monthlyIncome: 9100 };
  const recovered = await storage.saveMobileAssumptionsForOwner(ownerId, recoveredInput, {
    expectedRevision: firstTab.revision,
  });
  assert.equal(recovered.revision, 1);

  await assert.rejects(
    () => storage.saveMobileAssumptionsForOwner(
      ownerId,
      { ...defaultInput, monthlyIncome: 7200 },
      { expectedRevision: staleTab.revision }
    ),
    /changed in another tab/i
  );

  const durable = await storage.loadMobileAssumptionsForOwner(ownerId);
  assert.equal(durable.revision, 1);
  assert.equal(durable.input.monthlyIncome, 9100);
  console.log('Expo assumption storage contract rejected a stale-tab overwrite after recovery.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
