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
  const localRequire = (request) => {
    if (Object.hasOwn(mocks, request)) return mocks[request];
    return require(request);
  };
  const context = vm.createContext({ console, exports: testModule.exports, module: testModule, require: localRequire });
  new vm.Script(`(function(exports, require, module) { ${output}\n})`, { filename }).runInContext(context)(
    testModule.exports,
    localRequire,
    testModule
  );
  return testModule.exports;
}

async function drainMicrotasks() {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}

async function main() {
  const replayModule = loadTsFile(
    path.resolve(__dirname, '..', 'lib', 'supabase', 'snapshot-outbox-replay.ts'),
    {
      'expo-network': {},
      'react-native': { AppState: {} },
      './snapshot-outbox': { mobileSnapshotOutbox: {} },
    }
  );

  let appStateListener;
  let networkListener;
  let appRemoved = false;
  let networkRemoved = false;
  let online = true;
  const errors = [];
  const successes = [];
  const flushes = [];
  const appState = {
    addEventListener: (_event, listener) => {
      appStateListener = listener;
      return { remove: () => { appRemoved = true; } };
    },
  };
  const network = {
    addNetworkStateListener: (listener) => {
      networkListener = listener;
      return { remove: () => { networkRemoved = true; } };
    },
    getNetworkStateAsync: async () => ({ isConnected: online, isInternetReachable: online }),
  };
  const outbox = {
    flush: async (_client, ownerId) => {
      flushes.push(ownerId);
      return { remaining: 0, sent: 1 };
    },
  };
  const ownerId = '00000000-0000-4000-8000-00000000000a';
  const unregister = replayModule.registerMobileSnapshotOutboxReplay({}, ownerId, {
    appState,
    network,
    onError: (error) => errors.push(error),
    onSuccess: (result) => successes.push(result),
    outbox,
  });

  await drainMicrotasks();
  assert.deepEqual(flushes, [ownerId], 'sign-in registration should replay an online queue');
  assert.deepEqual(successes, [{ remaining: 0, sent: 1 }]);

  networkListener({ isConnected: false, isInternetReachable: false });
  await drainMicrotasks();
  assert.equal(flushes.length, 1, 'offline network events must not flush');
  networkListener({ isConnected: true, isInternetReachable: true });
  await drainMicrotasks();
  assert.equal(flushes.length, 2, 'network reconnection should flush');

  online = false;
  appStateListener('active');
  await drainMicrotasks();
  assert.equal(flushes.length, 2, 'active app replay must still honor connectivity');
  online = true;
  appStateListener('active');
  await drainMicrotasks();
  assert.equal(flushes.length, 3, 'active app should replay an online queue');
  assert.equal(successes.length, 3, 'every replay that sends queued work must publish success');

  unregister();
  assert.equal(appRemoved, true);
  assert.equal(networkRemoved, true);
  networkListener({ isConnected: true, isInternetReachable: true });
  appStateListener('active');
  await drainMicrotasks();
  assert.equal(flushes.length, 3, 'cleanup must disable late listener callbacks');
  assert.equal(successes.length, 3);
  assert.deepEqual(errors, []);

  const replayErrors = [];
  replayModule.registerMobileSnapshotOutboxReplay({}, ownerId, {
    appState,
    network,
    onError: (error) => replayErrors.push(error),
    outbox: { flush: async () => { throw new Error('queued sync still offline'); } },
  });
  await drainMicrotasks();
  assert.match(replayErrors[0].message, /still offline/);

  const conflictErrors = [];
  replayModule.registerMobileSnapshotOutboxReplay({}, ownerId, {
    appState,
    network,
    onError: (error) => conflictErrors.push(error),
    outbox: {
      flush: async () => {
        throw { code: 'IS002', details: '{"current_revision":1}', message: 'Snapshot sync revision has a gap.' };
      },
    },
  });
  await drainMicrotasks();
  assert.equal(conflictErrors[0].code, 'IS002');
  assert.equal(conflictErrors[0].kind, 'gap');

  console.log('Expo snapshot replay contract passed sign-in, reconnect, activation, and cleanup triggers.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
