/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function loadTsFile(filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const testModule = { exports: {} };
  const localRequire = (request) => {
    if (request === '@interestshield/persistence-contract') {
      return loadTsFile(path.resolve(__dirname, '..', '..', '..', 'packages', 'persistence-contract', 'src', 'index.ts'));
    }
    return require(request);
  };
  const context = vm.createContext({ console, crypto, exports: testModule.exports, module: testModule, require: localRequire });
  new vm.Script(`(function(exports, require, module) { ${output}\n})`, { filename }).runInContext(context)(
    testModule.exports,
    localRequire,
    testModule
  );
  return testModule.exports;
}

const values = new Map([
  ['velocity-bank-storage', '{"financial":true}'],
  ['interestshield-theme', 'dark'],
  ['interestshield-mobile-assumptions-v1', 'must-not-sync-from-web'],
]);
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
const sourceModule = loadTsFile(path.resolve(__dirname, '..', 'src', 'lib', 'supabase', 'account-sync-source.ts'));
const idOne = sourceModule.getOrCreateBrowserSyncIdempotencyKey(storage, () => '00000000-0000-4000-8000-000000000111');
const idTwo = sourceModule.getOrCreateBrowserSyncIdempotencyKey(storage, () => 'must-not-run');
assert.equal(idOne, 'web-install:00000000-0000-4000-8000-000000000111');
assert.equal(idTwo, idOne);
assert.equal(
  JSON.stringify(sourceModule.collectBrowserSnapshotStorage(storage).map(({ key }) => key)),
  JSON.stringify(['velocity-bank-storage', 'interestshield-theme'])
);

const panelSource = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'app', 'settings', 'SupabaseAccountPanel.tsx'), 'utf8');
const settingsSource = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'app', 'settings', 'page.tsx'), 'utf8');
assert.ok(panelSource.includes('signInWithOtp'));
assert.ok(panelSource.includes('syncLocalSnapshot'));
assert.ok(panelSource.includes('navigator.onLine'));
assert.ok(settingsSource.includes('<SupabaseAccountPanel />'));
assert.ok(!settingsSource.includes('Sign In as Demo User'));
console.log('Supabase account contract passed stable browser snapshot identity and real settings workflow.');
