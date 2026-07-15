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
    if (request === '@interestshield/persistence-contract') {
      return loadTsFile(path.resolve(__dirname, '..', '..', '..', 'packages', 'persistence-contract', 'src', 'index.ts'));
    }
    if (request.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), request);
      const resolved = [base, `${base}.ts`, path.join(base, 'index.ts')].find(fs.existsSync);
      if (resolved) return loadTsFile(resolved, mocks);
    }
    return require(request);
  };
  const context = vm.createContext({
    URL,
    console,
    exports: testModule.exports,
    globalThis,
    module: testModule,
    process,
    require: localRequire,
  });
  new vm.Script(`(function(exports, require, module) { ${output}\n})`, { filename }).runInContext(context)(
    testModule.exports,
    localRequire,
    testModule
  );
  return testModule.exports;
}

class MemorySecureStore {
  constructor() {
    this.values = new Map();
  }
  async deleteItemAsync(key) {
    this.values.delete(key);
  }
  async getItemAsync(key) {
    return this.values.get(key) ?? null;
  }
  async setItemAsync(key, value) {
    this.values.set(key, value);
  }
}

class FailureInjectingSecureStore extends MemorySecureStore {
  failOnKeyPart = null;

  async setItemAsync(key, value) {
    if (this.failOnKeyPart && key.includes(this.failOnKeyPart)) {
      this.failOnKeyPart = null;
      throw new Error('simulated secure-store interruption');
    }
    await super.setItemAsync(key, value);
  }
}

class FakeQuery {
  constructor(table, calls) {
    this.table = table;
    this.calls = calls;
  }
  upsert(row, options) {
    this.calls.push({ operation: 'upsert', options, row, table: this.table });
    return this;
  }
  insert(row) {
    this.calls.push({ operation: 'insert', row, table: this.table });
    return Promise.resolve({ data: null, error: null });
  }
  select(columns) {
    this.calls.push({ columns, operation: 'select', table: this.table });
    return this;
  }
  single() {
    return Promise.resolve({ data: { id: '00000000-0000-4000-8000-000000000999' }, error: null });
  }
  then(resolve) {
    return Promise.resolve({ data: null, error: null }).then(resolve);
  }
}

async function main() {
  const packageJson = require('../package.json');
  assert.equal(packageJson.dependencies['@supabase/supabase-js'], '2.110.2');
  assert.equal(packageJson.dependencies['expo-crypto'], '~56.0.4');
  assert.equal(packageJson.dependencies['@interestshield/persistence-contract'], 'file:../../packages/persistence-contract');

  const mocks = {
    'expo-crypto': { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    'expo-secure-store': new MemorySecureStore(),
    'react-native': { Platform: { OS: 'ios' } },
  };
  const configModule = loadTsFile(path.resolve(__dirname, '..', 'lib', 'supabase', 'config.ts'), mocks);
  assert.equal(configModule.readPublicMobileSupabaseConfig({}), null);
  assert.equal(
    configModule.readPublicMobileSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    }).url,
    'http://127.0.0.1:54321'
  );
  assert.equal(
    configModule.readPublicMobileSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      EXPO_PUBLIC_SUPABASE_URL: 'http://example.com',
    }),
    null
  );

  const authStorageModule = loadTsFile(path.resolve(__dirname, '..', 'lib', 'supabase', 'auth-storage.ts'), mocks);
  const secureStore = new MemorySecureStore();
  const generations = ['generation-a', 'generation-b'];
  const authStorage = authStorageModule.createChunkedSecureAuthStorage(secureStore, () => generations.shift());
  const largeSession = 'session-token-'.repeat(400);
  await authStorage.setItem('supabase.auth', largeSession);
  assert.equal(await authStorage.getItem('supabase.auth'), largeSession);
  assert.ok([...secureStore.values.keys()].filter((key) => key.includes('generation-a')).length >= 3);
  await authStorage.setItem('supabase.auth', 'refreshed-session');
  assert.equal(await authStorage.getItem('supabase.auth'), 'refreshed-session');
  assert.equal([...secureStore.values.keys()].some((key) => key.includes('generation-a')), false);
  await authStorage.removeItem('supabase.auth');
  assert.equal(await authStorage.getItem('supabase.auth'), null);

  const interruptedStore = new FailureInjectingSecureStore();
  const interruptedGenerations = ['stable-generation', 'failed-generation'];
  const interruptedStorage = authStorageModule.createChunkedSecureAuthStorage(
    interruptedStore,
    () => interruptedGenerations.shift()
  );
  await interruptedStorage.setItem('supabase.interrupted', 'stable-session');
  interruptedStore.failOnKeyPart = '.failed-generation.1';
  await assert.rejects(
    () => interruptedStorage.setItem('supabase.interrupted', largeSession),
    /simulated secure-store interruption/
  );
  assert.equal(await interruptedStorage.getItem('supabase.interrupted'), 'stable-session');
  assert.equal(
    [...interruptedStore.values.keys()].some((key) => key.includes('failed-generation')),
    false
  );

  const identityModule = loadTsFile(path.resolve(__dirname, '..', 'lib', 'supabase', 'sync-identity.ts'), mocks);
  const identityStorage = authStorageModule.createChunkedSecureAuthStorage(new MemorySecureStore(), () => 'storage-generation');
  const idOne = await identityModule.getOrCreateMobileSyncIdempotencyKey(
    identityStorage,
    () => '00000000-0000-4000-8000-000000000111'
  );
  const idTwo = await identityModule.getOrCreateMobileSyncIdempotencyKey(identityStorage, () => 'must-not-run');
  assert.equal(idOne, 'mobile-install:00000000-0000-4000-8000-000000000111');
  assert.equal(idTwo, idOne);
  assert.equal(
    identityModule.createMobileSyncOperationIdempotencyKey(() => '00000000-0000-4000-8000-000000000222'),
    'mobile-operation:00000000-0000-4000-8000-000000000222'
  );

  const concurrentIdentityStorage = authStorageModule.createChunkedSecureAuthStorage(
    new MemorySecureStore(),
    () => 'concurrent-storage-generation'
  );
  let createdIdentityCount = 0;
  const concurrentIds = await Promise.all([
    identityModule.getOrCreateMobileSyncIdempotencyKey(concurrentIdentityStorage, () => `concurrent-${++createdIdentityCount}`),
    identityModule.getOrCreateMobileSyncIdempotencyKey(concurrentIdentityStorage, () => `concurrent-${++createdIdentityCount}`),
  ]);
  assert.deepEqual(concurrentIds, ['mobile-install:concurrent-1', 'mobile-install:concurrent-1']);
  assert.equal(createdIdentityCount, 1);

  const syncModule = loadTsFile(path.resolve(__dirname, '..', 'lib', 'supabase', 'snapshot-sync.ts'), {
    ...mocks,
    '../mobile-assumption-storage': { encodeMobileAssumptions: () => '{"version":1}' },
    './sync-identity': {
      getOrCreateMobileSyncIdempotencyKey: async () => idOne,
    },
  });
  const calls = [];
  const client = {
    auth: {
      getClaims: async () => ({
        data: { claims: { sub: '00000000-0000-4000-8000-00000000000a' } },
        error: null,
      }),
    },
    from: () => { throw new Error('atomic snapshot sync must not issue direct table writes'); },
    rpc: async (name, args) => {
      calls.push({ args, name, operation: 'rpc' });
      return { data: '00000000-0000-4000-8000-000000000999', error: null };
    },
  };
  const result = await syncModule.syncMobileSnapshot(client, {
    assumptions: {},
    expectedOwnerId: '00000000-0000-4000-8000-00000000000a',
    operationIdempotencyKey: 'mobile-operation:00000000-0000-4000-8000-000000000222',
  });
  assert.equal(result.ownerId, '00000000-0000-4000-8000-00000000000a');
  assert.deepEqual(calls.map(({ name, operation }) => `${operation}:${name}`), [
    'rpc:sync_interestshield_snapshot',
  ]);
  assert.equal(calls[0].args.p_assumptions_json.storage[0].key, 'interestshield-mobile-assumptions-v1');
  assert.equal(calls[0].args.p_snapshot_idempotency_key, idOne);
  assert.equal(calls[0].args.p_expected_owner_id, '00000000-0000-4000-8000-00000000000a');
  assert.equal(
    calls[0].args.p_operation_idempotency_key,
    'mobile-operation:00000000-0000-4000-8000-000000000222'
  );
  assert.equal(calls[0].args.p_snapshot_version, 1);
  assert.equal(Object.hasOwn(calls[0].args, 'owner_id'), false, 'expected server-derived RPC ownership');
  const callCountBeforeOwnerMismatch = calls.length;
  await assert.rejects(
    () => syncModule.syncMobileSnapshot(client, {
      assumptions: {},
      expectedOwnerId: '00000000-0000-4000-8000-00000000000b',
      operationIdempotencyKey: 'mobile-operation:00000000-0000-4000-8000-000000000223',
    }),
    /account changed before sync/i
  );
  assert.equal(calls.length, callCountBeforeOwnerMismatch);
  await assert.rejects(
    () => syncModule.syncMobileSnapshot({
      ...client,
      rpc: async () => ({ data: null, error: { message: 'transaction rolled back' } }),
    }, {
      assumptions: {},
      expectedOwnerId: '00000000-0000-4000-8000-00000000000a',
      operationIdempotencyKey: 'mobile-operation:00000000-0000-4000-8000-000000000224',
    }),
    /transactional snapshot sync.*transaction rolled back/i
  );
  await assert.rejects(
    () => syncModule.syncMobileSnapshot(
      { ...client, auth: { getClaims: async () => ({ data: null, error: { message: 'no session' } }) } },
      {
        assumptions: {},
        expectedOwnerId: '00000000-0000-4000-8000-00000000000a',
        operationIdempotencyKey: 'mobile-operation:00000000-0000-4000-8000-000000000225',
      }
    ),
    /identity verification/i
  );

  const source = fs.readFileSync(path.resolve(__dirname, '..', 'lib', 'supabase', 'config.ts'), 'utf8');
  const clientSource = fs.readFileSync(path.resolve(__dirname, '..', 'lib', 'supabase', 'client.ts'), 'utf8');
  const layoutSource = fs.readFileSync(path.resolve(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
  const authProviderSource = fs.readFileSync(
    path.resolve(__dirname, '..', 'components', 'mobile-auth-provider.tsx'),
    'utf8',
  );
  assert.ok(source.includes('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'));
  assert.ok(!/service.role|service_role|secret.key/i.test(source));
  assert.ok(clientSource.includes('lock: processLock'));
  assert.ok(clientSource.includes("flowType: 'pkce'"));
  assert.ok(layoutSource.includes('<MobileAuthProvider>'));
  assert.ok(authProviderSource.includes('registerMobileAuthLifecycle(client)'));
  assert.ok(authProviderSource.includes('registerMobileAuthDeepLinks('));
  console.log('Expo Supabase contract passed secure chunking, durable identity, and ordered owner-scoped sync.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
