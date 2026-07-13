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

  const identityModule = loadTsFile(path.resolve(__dirname, '..', 'lib', 'supabase', 'sync-identity.ts'), mocks);
  const identityStorage = authStorageModule.createChunkedSecureAuthStorage(new MemorySecureStore(), () => 'storage-generation');
  const idOne = await identityModule.getOrCreateMobileSyncIdempotencyKey(
    identityStorage,
    () => '00000000-0000-4000-8000-000000000111'
  );
  const idTwo = await identityModule.getOrCreateMobileSyncIdempotencyKey(identityStorage, () => 'must-not-run');
  assert.equal(idOne, 'mobile-install:00000000-0000-4000-8000-000000000111');
  assert.equal(idTwo, idOne);

  const syncModule = loadTsFile(path.resolve(__dirname, '..', 'lib', 'supabase', 'snapshot-sync.ts'), {
    ...mocks,
    '../mobile-assumption-storage': { encodeMobileAssumptions: () => '{"version":1}' },
    './sync-identity': { getOrCreateMobileSyncIdempotencyKey: async () => idOne },
  });
  const calls = [];
  const client = {
    auth: {
      getClaims: async () => ({
        data: { claims: { sub: '00000000-0000-4000-8000-00000000000a' } },
        error: null,
      }),
    },
    from: (table) => new FakeQuery(table, calls),
  };
  const result = await syncModule.syncMobileSnapshot(client, { assumptions: {} });
  assert.equal(result.ownerId, '00000000-0000-4000-8000-00000000000a');
  assert.deepEqual(calls.map(({ table, operation }) => `${table}:${operation}`), [
    'profiles:upsert',
    'financial_snapshots:upsert',
    'financial_snapshots:select',
    'audit_events:insert',
  ]);
  assert.equal(calls[1].row.assumptions_json.storage[0].key, 'interestshield-mobile-assumptions-v1');
  assert.equal(calls[1].options.onConflict, 'owner_id,idempotency_key');
  await assert.rejects(
    () => syncModule.syncMobileSnapshot({ ...client, auth: { getClaims: async () => ({ data: null, error: { message: 'no session' } }) } }, { assumptions: {} }),
    /identity verification/i
  );

  const source = fs.readFileSync(path.resolve(__dirname, '..', 'lib', 'supabase', 'config.ts'), 'utf8');
  const clientSource = fs.readFileSync(path.resolve(__dirname, '..', 'lib', 'supabase', 'client.ts'), 'utf8');
  const layoutSource = fs.readFileSync(path.resolve(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
  assert.ok(source.includes('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'));
  assert.ok(!/service.role|service_role|secret.key/i.test(source));
  assert.ok(clientSource.includes('lock: processLock'));
  assert.ok(layoutSource.includes('registerMobileAuthLifecycle(client)'));
  console.log('Expo Supabase contract passed secure chunking, durable identity, and ordered owner-scoped sync.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
