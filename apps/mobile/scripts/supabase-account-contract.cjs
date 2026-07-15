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
  const consumedCodes = new Set();
  const callbackUrl = 'interestshield://settings';
  const client = {
    auth: {
      exchangeCodeForSession: async (code) => {
        calls.push({ code, operation: 'exchange' });
        await Promise.resolve();
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
  await module.handleMobileAuthUrl(
    client,
    'interestshield://settings?code=pkce-code',
    callbackUrl,
    consumedCodes
  );
  await module.handleMobileAuthUrl(
    client,
    'interestshield://settings?code=pkce-code',
    callbackUrl,
    consumedCodes
  );
  assert.equal(JSON.stringify(calls), JSON.stringify([
    { code: 'pkce-code', operation: 'exchange' },
  ]));
  await Promise.all([
    module.handleMobileAuthUrl(
      client,
      'interestshield://settings?code=concurrent-pkce-code',
      callbackUrl,
      consumedCodes
    ),
    module.handleMobileAuthUrl(
      client,
      'interestshield://settings?code=concurrent-pkce-code',
      callbackUrl,
      consumedCodes
    ),
  ]);
  assert.equal(
    calls.filter(({ code }) => code === 'concurrent-pkce-code').length,
    1,
    'expected concurrent delivery of one PKCE code to exchange once'
  );
  await assert.rejects(
    () => module.handleMobileAuthUrl(
      client,
      'interestshield://settings?error_description=Expired%20link',
      callbackUrl,
      consumedCodes
    ),
    /Expired link/
  );
  await assert.rejects(
    () => module.handleMobileAuthUrl(
      client,
      'malicious://settings?code=attacker-code',
      callbackUrl,
      consumedCodes
    ),
    /callback/i
  );
  await assert.rejects(
    () => module.handleMobileAuthUrl(
      client,
      'interestshield://settings#access_token=access&refresh_token=refresh',
      callbackUrl,
      consumedCodes
    ),
    /PKCE|token fragment/i
  );
  assert.equal(calls.length, 2, 'expected rejected and duplicate callbacks not to mutate auth state');

  const componentSource = fs.readFileSync(path.resolve(__dirname, '..', 'components', 'mobile-supabase-account.tsx'), 'utf8');
  const settingsSource = fs.readFileSync(
    path.resolve(__dirname, '..', 'components', 'mobile-routes', 'settings-route.tsx'),
    'utf8'
  );
  const layoutSource = fs.readFileSync(path.resolve(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
  const authProviderPath = path.resolve(__dirname, '..', 'components', 'mobile-auth-provider.tsx');
  assert.ok(fs.existsSync(authProviderPath), 'expected one root native auth provider');
  const authProviderSource = fs.readFileSync(authProviderPath, 'utf8');
  const syncSnapshotSource = componentSource.slice(
    componentSource.indexOf('const syncSnapshot'),
    componentSource.indexOf('const signOut')
  );
  assert.ok(componentSource.includes('signInWithOtp'));
  assert.ok(componentSource.includes('mobileSnapshotOutbox.enqueue'));
  assert.ok(componentSource.includes('mobileSnapshotOutbox.flush'));
  assert.ok(componentSource.includes('syncNotice'));
  assert.ok(componentSource.includes('consumeSyncNotice'));
  assert.ok(componentSource.includes('statusOwnerId'));
  assert.ok(
    syncSnapshotSource.indexOf('mobileSnapshotOutbox.enqueue') < syncSnapshotSource.indexOf('await isOnline()'),
    'expected snapshot enqueue to happen before the connectivity check'
  );
  assert.ok(componentSource.includes('assumptionsReady'));
  assert.ok(componentSource.includes('!assumptionsReady'));
  assert.ok(componentSource.includes('getNetworkStateAsync'));
  assert.ok(componentSource.includes('Nothing leaves this device until you press sync.'));
  assert.ok(componentSource.includes("scope: 'local'"), 'expected current-device sign-out scope');
  assert.ok(componentSource.includes('finally'), 'expected native auth actions to recover their busy state');
  assert.equal(componentSource.includes('Encrypted local'), false, 'expected copy not to overstate web or remote encryption');
  assert.equal(componentSource.includes('Saved securely'), false, 'expected offline copy not to overstate browser storage');
  assert.ok(settingsSource.includes('assumptionsReady={isHydrated}'));
  assert.ok(settingsSource.includes('disabled={!assumptionsReady}'));
  assert.ok(layoutSource.includes('<MobileAuthProvider>'));
  assert.ok(layoutSource.indexOf('<MobileAuthProvider>') < layoutSource.indexOf('<MobileAssumptionsProvider>'));
  assert.ok(authProviderSource.includes('registerMobileAuthDeepLinks'));
  assert.ok(authProviderSource.includes('registerMobileAuthLifecycle'));
  assert.ok(authProviderSource.includes('registerMobileSnapshotOutboxReplay'));
  assert.ok(authProviderSource.includes('client, ownerId'));
  assert.ok(authProviderSource.includes('onSuccess'));
  assert.ok(authProviderSource.includes('onError'));
  assert.ok(authProviderSource.includes('activeOwnerId.current !== nextOwnerId'));
  assert.ok(authProviderSource.includes('consumeSyncNotice'));
  assert.ok(authProviderSource.includes('onAuthStateChange'));
  assert.ok(authProviderSource.includes('useMobileAuth'));
  console.log('Expo account contract passed owner-aware auth, PKCE callback isolation, and recoverable controls.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
