/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const moduleCache = new Map();

function loadTsFile(filename) {
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const testModule = { exports: {} };
  moduleCache.set(filename, testModule);
  const localRequire = (request) => {
    if (request === '@interestshield/persistence-contract') {
      return loadTsFile(path.resolve(__dirname, '..', '..', '..', 'packages', 'persistence-contract', 'src', 'index.ts'));
    }
    if (request.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), request);
      const resolved = [base, `${base}.ts`, path.join(base, 'index.ts')].find(fs.existsSync);
      if (resolved) return loadTsFile(resolved);
    }
    return require(request);
  };
  const context = vm.createContext({
    URL,
    console,
    exports: testModule.exports,
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

class FakeQuery {
  constructor(table, calls) {
    this.table = table;
    this.calls = calls;
  }
  upsert(row, options) {
    this.calls.push({ operation: 'upsert', table: this.table, row, options });
    return this;
  }
  insert(row) {
    this.calls.push({ operation: 'insert', table: this.table, row });
    return Promise.resolve({ data: null, error: null });
  }
  select(columns) {
    this.calls.push({ operation: 'select', table: this.table, columns });
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
  const syncModule = loadTsFile(path.resolve(__dirname, '..', 'src', 'lib', 'supabase', 'snapshot-sync.ts'));
  const configModule = loadTsFile(path.resolve(__dirname, '..', 'src', 'lib', 'supabase', 'config.ts'));
  const calls = [];
  const client = {
    auth: {
      getClaims: async () => ({
        data: { claims: { sub: '00000000-0000-4000-8000-00000000000a' } },
        error: null,
      }),
    },
    from: () => { throw new Error('atomic web sync must not issue direct table writes'); },
    rpc: async (name, args) => {
      calls.push({ args, name, operation: 'rpc' });
      return { data: '00000000-0000-4000-8000-000000000999', error: null };
    },
  };
  const result = await syncModule.syncLocalSnapshot(client, {
    idempotencyKey: 'browser-install-0001',
    operationIdempotencyKey: 'browser-operation-0001',
    storage: [{ key: 'velocity-bank-storage', value: '{}' }],
  });

  assert.equal(result.ownerId, '00000000-0000-4000-8000-00000000000a');
  assert.deepEqual(calls.map(({ name, operation }) => `${operation}:${name}`), [
    'rpc:sync_interestshield_snapshot',
  ]);
  assert.equal(calls[0].args.p_snapshot_idempotency_key, 'browser-install-0001');
  assert.equal(calls[0].args.p_expected_owner_id, '00000000-0000-4000-8000-00000000000a');
  assert.equal(calls[0].args.p_operation_idempotency_key, 'browser-operation-0001');
  assert.equal(Object.hasOwn(calls[0].args, 'owner_id'), false);
  assert.equal(configModule.readPublicSupabaseConfig({}), null);
  assert.equal(
    configModule.readPublicSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-publishable-key',
    }).url,
    'http://127.0.0.1:54321'
  );
  await assert.rejects(
    () => syncModule.syncLocalSnapshot({ ...client, auth: { getClaims: async () => ({ data: null, error: { message: 'no session' } }) } }, {
      idempotencyKey: 'browser-install-0001',
      operationIdempotencyKey: 'browser-operation-0002',
      storage: [{ key: 'velocity-bank-storage', value: '{}' }],
    }),
    /identity verification/i
  );
  console.log('Supabase web client contract passed verified identity and ordered sync mutations.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
