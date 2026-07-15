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

class MemoryTransactionalStore {
  constructor() {
    this.values = new Map();
    this.locks = new Map();
  }
  async transact(key, update) {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const result = previous.then(() => {
      const next = update(this.values.get(key) ?? null);
      this.values.set(key, JSON.parse(JSON.stringify(next)));
      return JSON.parse(JSON.stringify(next));
    });
    this.locks.set(key, result.then(() => undefined, () => undefined));
    return result;
  }
}

async function main() {
  const syncModule = loadTsFile(path.resolve(__dirname, '..', 'src', 'lib', 'supabase', 'snapshot-sync.ts'));
  const outboxModule = loadTsFile(path.resolve(__dirname, '..', 'src', 'lib', 'supabase', 'snapshot-outbox.ts'));
  const configModule = loadTsFile(path.resolve(__dirname, '..', 'src', 'lib', 'supabase', 'config.ts'));
  const calls = [];
  const stateStore = new MemoryTransactionalStore();
  let operation = 0;
  const outbox = outboxModule.createWebSnapshotOutbox({
    createOperationIdempotencyKey: () => `browser-operation:00000000-0000-4000-8000-${String(++operation).padStart(12, '0')}`,
    store: stateStore,
  });
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
      return {
        data: { client_revision: args.p_client_revision, snapshot_id: '00000000-0000-4000-8000-000000000999' },
        error: null,
      };
    },
  };
  const result = await syncModule.syncLocalSnapshot(client, {
    idempotencyKey: 'browser-install-0001',
    storage: [{ key: 'velocity-bank-storage', value: '{}' }],
  }, { outbox });

  assert.equal(result.ownerId, '00000000-0000-4000-8000-00000000000a');
  assert.deepEqual(calls.map(({ name, operation }) => `${operation}:${name}`), [
    'rpc:sync_interestshield_snapshot',
  ]);
  assert.equal(calls[0].args.p_snapshot_idempotency_key, 'browser-install-0001');
  assert.equal(calls[0].args.p_expected_owner_id, '00000000-0000-4000-8000-00000000000a');
  assert.equal(calls[0].args.p_operation_idempotency_key, 'browser-operation:00000000-0000-4000-8000-000000000001');
  assert.equal(calls[0].args.p_client_revision, 1);
  assert.equal(result.clientRevision, 1);
  assert.equal(Object.hasOwn(calls[0].args, 'owner_id'), false);
  const committedState = await outbox.read(
    '00000000-0000-4000-8000-00000000000a',
    'browser-install-0001'
  );
  assert.equal(committedState.lastAcknowledgedRevision, 1);
  assert.equal(committedState.pending, null);
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
      storage: [{ key: 'velocity-bank-storage', value: '{}' }],
    }, { outbox }),
    /identity verification/i
  );

  const ambiguousStateStore = new MemoryTransactionalStore();
  const ambiguousCalls = [];
  let failAmbiguousResponse = true;
  let ambiguousOperationCount = 0;
  const ambiguousOutbox = outboxModule.createWebSnapshotOutbox({
    createOperationIdempotencyKey: () => {
      ambiguousOperationCount += 1;
      return `browser-operation:00000000-0000-4000-8000-${String(776 + ambiguousOperationCount).padStart(12, '0')}`;
    },
    store: ambiguousStateStore,
  });
  const ambiguousClient = {
    ...client,
    rpc: async (name, args) => {
      ambiguousCalls.push({ args, name });
      if (failAmbiguousResponse) return { data: null, error: { message: 'response lost after commit' } };
      return {
        data: { client_revision: args.p_client_revision, snapshot_id: '00000000-0000-4000-8000-000000000998' },
        error: null,
      };
    },
  };
  await assert.rejects(
    () => syncModule.syncLocalSnapshot(ambiguousClient, {
      idempotencyKey: 'browser-install-ambiguous',
      storage: [{ key: 'velocity-bank-storage', value: '{"income":6500}' }],
    }, { outbox: ambiguousOutbox }),
    /response lost after commit/i
  );
  const pendingState = await ambiguousOutbox.read(
    '00000000-0000-4000-8000-00000000000a',
    'browser-install-ambiguous'
  );
  assert.equal(pendingState.pending.clientRevision, 1, 'pending browser work must retain revision one');
  assert.equal(pendingState.pending.operationIdempotencyKey, 'browser-operation:00000000-0000-4000-8000-000000000777');
  failAmbiguousResponse = false;
  const retried = await syncModule.syncLocalSnapshot(ambiguousClient, {
    idempotencyKey: 'browser-install-ambiguous',
    storage: [{ key: 'velocity-bank-storage', value: '{"income":9999}' }],
  }, { outbox: ambiguousOutbox });
  assert.equal(retried.clientRevision, 2, 'one retry request must also commit the newer local intent');
  assert.equal(ambiguousOperationCount, 2);
  assert.equal(ambiguousCalls.length, 3);
  assert.equal(
    ambiguousCalls[1].args.p_operation_idempotency_key,
    ambiguousCalls[0].args.p_operation_idempotency_key,
    'ambiguous retry must reuse the durable operation identity'
  );
  assert.deepEqual(
    ambiguousCalls[1].args.p_assumptions_json,
    ambiguousCalls[0].args.p_assumptions_json,
    'ambiguous retry must reuse the immutable payload rather than newer local data'
  );
  assert.equal(ambiguousCalls[2].args.p_client_revision, 2);
  assert.equal(
    ambiguousCalls[2].args.p_assumptions_json.storage[0].value,
    '{"income":9999}',
    'sync must not return success until the current normalized payload is acknowledged'
  );
  const nextOutbox = outboxModule.createWebSnapshotOutbox({
    createOperationIdempotencyKey: () => 'browser-operation:00000000-0000-4000-8000-000000000779',
    store: ambiguousStateStore,
  });
  await syncModule.syncLocalSnapshot(ambiguousClient, {
    idempotencyKey: 'browser-install-ambiguous',
    storage: [{ key: 'velocity-bank-storage', value: '{"income":9999}' }],
  }, { outbox: nextOutbox });
  assert.equal(ambiguousCalls[3].args.p_client_revision, 3, 'a new browser operation must advance after acknowledgment');
  console.log('Supabase web client contract passed verified identity and ordered sync mutations.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
