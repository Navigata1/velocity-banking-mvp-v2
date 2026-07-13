/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function loadTsFile(filename, mocks = {}) {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const testModule = { exports: {} };
  const localRequire = (request) => Object.hasOwn(mocks, request) ? mocks[request] : require(request);
  const context = vm.createContext({ URL, URLSearchParams, console, exports: testModule.exports, module: testModule, require: localRequire });
  new vm.Script(`(function(exports, require, module) { ${output}\n})`, { filename }).runInContext(context)(
    testModule.exports,
    localRequire,
    testModule
  );
  return testModule.exports;
}

async function main() {
  const calls = [];
  const client = {
    auth: {
      exchangeCodeForSession: async (code) => {
        calls.push({ code, operation: 'exchange' });
        return { error: null };
      },
      setSession: async (session) => {
        calls.push({ operation: 'session', session });
        return { error: null };
      },
    },
  };
  const module = loadTsFile(path.resolve(__dirname, '..', 'lib', 'supabase', 'auth-deep-link.ts'), {
    'expo-linking': {},
  });
  await module.handleMobileAuthUrl(client, 'interestshield://settings?code=pkce-code');
  await module.handleMobileAuthUrl(client, 'interestshield://settings#access_token=access&refresh_token=refresh');
  assert.equal(JSON.stringify(calls), JSON.stringify([
    { code: 'pkce-code', operation: 'exchange' },
    { operation: 'session', session: { access_token: 'access', refresh_token: 'refresh' } },
  ]));
  await assert.rejects(
    () => module.handleMobileAuthUrl(client, 'interestshield://settings?error_description=Expired%20link'),
    /Expired link/
  );

  const componentSource = fs.readFileSync(path.resolve(__dirname, '..', 'components', 'mobile-supabase-account.tsx'), 'utf8');
  const shellSource = fs.readFileSync(path.resolve(__dirname, '..', 'components', 'mobile-shell.tsx'), 'utf8');
  const layoutSource = fs.readFileSync(path.resolve(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
  assert.ok(componentSource.includes('signInWithOtp'));
  assert.ok(componentSource.includes('syncMobileSnapshot'));
  assert.ok(componentSource.includes('getNetworkStateAsync'));
  assert.ok(componentSource.includes('Nothing leaves this device until you press sync.'));
  assert.ok(shellSource.includes('<MobileSupabaseAccount assumptions={assumptions} />'));
  assert.ok(layoutSource.includes('registerMobileAuthDeepLinks(client)'));
  console.log('Expo account contract passed deep-link exchange, explicit sync, and offline-safe controls.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
