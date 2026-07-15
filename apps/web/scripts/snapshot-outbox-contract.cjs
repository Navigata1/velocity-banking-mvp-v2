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

class TransactionalMemoryStore {
  constructor() {
    this.values = new Map();
    this.locks = new Map();
  }
  async transact(key, update) {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const result = previous.then(() => {
      const next = update(this.values.get(key) ?? null);
      const copied = JSON.parse(JSON.stringify(next));
      this.values.set(key, copied);
      return copied;
    });
    this.locks.set(key, result.then(() => undefined, () => undefined));
    return result;
  }
}

async function main() {
  const outboxModule = loadTsFile(path.resolve(__dirname, '..', 'src', 'lib', 'supabase', 'snapshot-outbox.ts'));
  const ownerA = '00000000-0000-4000-8000-00000000000a';
  const ownerB = '00000000-0000-4000-8000-00000000000b';
  const snapshotKey = 'browser-install-concurrency-001';
  const store = new TransactionalMemoryStore();
  let created = 0;
  const dependencies = {
    createOperationIdempotencyKey: () => `browser-operation:00000000-0000-4000-8000-${String(++created).padStart(12, '0')}`,
    store,
  };
  const tabA = outboxModule.createWebSnapshotOutbox(dependencies);
  const tabB = outboxModule.createWebSnapshotOutbox(dependencies);
  const input = {
    assumptionsJson: { contract_version: 1, storage: [{ key: 'velocity-bank-storage', value: '{"income":6500}' }] },
    displayName: null,
    expectedOwnerId: ownerA,
    snapshotIdempotencyKey: snapshotKey,
    snapshotVersion: 1,
  };

  const [firstTab, secondTab] = await Promise.all([tabA.prepare(input), tabB.prepare(input)]);
  assert.equal(created, 1, 'cross-tab allocation must mint one operation for one pending revision');
  assert.equal(firstTab.operationIdempotencyKey, secondTab.operationIdempotencyKey);
  assert.equal(firstTab.clientRevision, 1);
  await Promise.all([
    tabA.acknowledge(firstTab),
    tabB.acknowledge(secondTab),
  ]);

  const reloaded = outboxModule.createWebSnapshotOutbox(dependencies);
  const secondRevision = await reloaded.prepare({
    ...input,
    assumptionsJson: { contract_version: 1, storage: [{ key: 'velocity-bank-storage', value: '{"income":7000}' }] },
  });
  assert.equal(secondRevision.clientRevision, 2, 'an acknowledged empty stream must retain its next revision');
  const retry = await tabB.prepare({
    ...input,
    assumptionsJson: { contract_version: 1, storage: [{ key: 'velocity-bank-storage', value: '{"income":9999}' }] },
  });
  assert.equal(retry.operationIdempotencyKey, secondRevision.operationIdempotencyKey);
  assert.deepEqual(retry.assumptionsJson, secondRevision.assumptionsJson, 'pending payload must remain immutable');

  const ownerBOperation = await reloaded.prepare({ ...input, expectedOwnerId: ownerB });
  assert.equal(ownerBOperation.clientRevision, 1, 'revision state must be owner scoped');

  await reloaded.markConflict(
    secondRevision,
    Object.assign(new Error('Snapshot sync revision is stale.'), { code: 'IS001', kind: 'stale' })
  );
  await assert.rejects(
    () => reloaded.prepare(input),
    (error) => error.code === 'IS001' && error.kind === 'stale',
    'a persisted browser conflict must block new work until recovery'
  );

  console.log('Web snapshot outbox contract passed transactional allocation, retry durability, and conflict blocking.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
