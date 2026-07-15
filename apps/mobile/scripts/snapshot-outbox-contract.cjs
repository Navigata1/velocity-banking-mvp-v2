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
    if (request.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), request);
      const resolved = [base, `${base}.ts`, path.join(base, 'index.ts')].find(fs.existsSync);
      if (resolved) return loadTsFile(resolved, mocks);
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

class MemoryStorage {
  constructor(order = []) {
    this.order = order;
    this.values = new Map();
    this.failNextRemove = false;
  }
  async getItem(key) {
    return this.values.get(key) ?? null;
  }
  async removeItem(key) {
    if (this.failNextRemove) {
      this.failNextRemove = false;
      throw new Error('simulated dequeue persistence failure');
    }
    this.order.push('remove');
    this.values.delete(key);
  }
  async setItem(key, value) {
    this.order.push('persist');
    this.values.set(key, value);
  }
}

const ownerA = '00000000-0000-4000-8000-00000000000a';
const ownerB = '00000000-0000-4000-8000-00000000000b';

async function main() {
  const modulePath = path.resolve(__dirname, '..', 'lib', 'supabase', 'snapshot-outbox.ts');
  const outboxModule = loadTsFile(modulePath, {
    './auth-storage': { createMobileAuthStorage: () => new MemoryStorage() },
    './snapshot-sync': {
      prepareMobileSnapshotSync: async () => { throw new Error('inject prepareSnapshot in tests'); },
      syncPreparedMobileSnapshot: async () => { throw new Error('inject sendSnapshot in tests'); },
    },
    './sync-identity': {
      createMobileSyncOperationIdempotencyKey: () => 'mobile-operation:default',
    },
  });
  assert.equal(
    outboxModule.mobileSnapshotOutboxStorageKey(ownerA.toUpperCase()),
    outboxModule.mobileSnapshotOutboxStorageKey(ownerA),
    'owner UUID casing must resolve to one durable queue'
  );

  let operation = 0;
  const prepareSnapshot = async (input) => ({
    assumptionsJson: {
      contract_version: 1,
      storage: [{ key: 'interestshield-mobile-assumptions-v1', value: JSON.stringify(input.assumptions) }],
    },
    displayName: input.displayName ?? null,
    expectedOwnerId: input.expectedOwnerId,
    operationIdempotencyKey: input.operationIdempotencyKey,
    snapshotIdempotencyKey: 'mobile-install:00000000-0000-4000-8000-000000000111',
    snapshotVersion: 1,
  });
  const createOperationIdempotencyKey = () => `mobile-operation:00000000-0000-4000-8000-${String(++operation).padStart(12, '0')}`;

  const order = [];
  const storage = new MemoryStorage(order);
  const sent = [];
  const outbox = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    now: () => '2026-07-15T00:45:00.000Z',
    prepareSnapshot,
    sendSnapshot: async (_client, item) => {
      order.push('send');
      sent.push(item);
      return { ownerId: item.expectedOwnerId, snapshotId: '00000000-0000-4000-8000-000000000999' };
    },
    storage,
  });

  const first = await outbox.enqueue({ assumptions: { monthlyIncome: 6500 }, expectedOwnerId: ownerA });
  assert.deepEqual(order, ['persist'], 'enqueue must durably persist before any remote send');
  assert.equal(first.expectedOwnerId, ownerA);
  assert.equal(first.version, 1);

  const reloaded = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async () => { throw new Error('reload read must not send'); },
    storage,
  });
  const restored = await reloaded.read(ownerA);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].operationIdempotencyKey, first.operationIdempotencyKey);
  assert.deepEqual(restored[0].assumptionsJson, first.assumptionsJson);
  assert.equal((await reloaded.read(ownerB)).length, 0, 'owner B must not read owner A queue');

  await outbox.flush({}, ownerA);
  assert.deepEqual(order, ['persist', 'send', 'remove']);
  assert.equal(sent[0].operationIdempotencyKey, first.operationIdempotencyKey);
  assert.equal((await outbox.read(ownerA)).length, 0);

  const failingStorage = new MemoryStorage();
  const attempts = [];
  let blockFirst = true;
  const retryOutbox = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async (_client, item) => {
      attempts.push(item.operationIdempotencyKey);
      if (blockFirst) throw new Error('offline during RPC');
      return { ownerId: item.expectedOwnerId, snapshotId: '00000000-0000-4000-8000-000000000999' };
    },
    storage: failingStorage,
  });
  const retryFirst = await retryOutbox.enqueue({ assumptions: { monthlyIncome: 7000 }, expectedOwnerId: ownerA });
  const retrySecond = await retryOutbox.enqueue({ assumptions: { monthlyIncome: 7100 }, expectedOwnerId: ownerA });
  await assert.rejects(() => retryOutbox.flush({}, ownerA), /offline during RPC/);
  assert.deepEqual(attempts, [retryFirst.operationIdempotencyKey], 'FIFO replay must stop at first failure');
  assert.equal((await retryOutbox.read(ownerA)).length, 2, 'failed head must remain queued');
  blockFirst = false;
  await retryOutbox.flush({}, ownerA);
  assert.deepEqual(attempts, [
    retryFirst.operationIdempotencyKey,
    retryFirst.operationIdempotencyKey,
    retrySecond.operationIdempotencyKey,
  ]);
  assert.equal((await retryOutbox.read(ownerA)).length, 0);

  const crashStorage = new MemoryStorage();
  const crashAttempts = [];
  const crashOutbox = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async (_client, item) => {
      crashAttempts.push(item.operationIdempotencyKey);
      return { ownerId: item.expectedOwnerId, snapshotId: '00000000-0000-4000-8000-000000000999' };
    },
    storage: crashStorage,
  });
  const crashItem = await crashOutbox.enqueue({ assumptions: { monthlyIncome: 7200 }, expectedOwnerId: ownerA });
  crashStorage.failNextRemove = true;
  await assert.rejects(() => crashOutbox.flush({}, ownerA), /dequeue persistence failure/);
  assert.equal((await crashOutbox.read(ownerA)).length, 1);
  await crashOutbox.flush({}, ownerA);
  assert.deepEqual(crashAttempts, [crashItem.operationIdempotencyKey, crashItem.operationIdempotencyKey]);

  const concurrentStorage = new MemoryStorage();
  let concurrentSends = 0;
  const concurrentOutbox = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async () => {
      concurrentSends += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { ownerId: ownerA, snapshotId: '00000000-0000-4000-8000-000000000999' };
    },
    storage: concurrentStorage,
  });
  await concurrentOutbox.enqueue({ assumptions: { monthlyIncome: 7300 }, expectedOwnerId: ownerA });
  await Promise.all([concurrentOutbox.flush({}, ownerA), concurrentOutbox.flush({}, ownerA)]);
  assert.equal(concurrentSends, 1, 'concurrent flushes must share one owner-scoped flight');

  const duplicateOutbox = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey: () => 'mobile-operation:00000000-0000-4000-8000-000000000777',
    prepareSnapshot,
    sendSnapshot: async () => { throw new Error('duplicate-key test must not send'); },
    storage: new MemoryStorage(),
  });
  await duplicateOutbox.enqueue({ assumptions: { monthlyIncome: 7400 }, expectedOwnerId: ownerA });
  await assert.rejects(
    () => duplicateOutbox.enqueue({ assumptions: { monthlyIncome: 7500 }, expectedOwnerId: ownerA }),
    /duplicate operation/i
  );

  const tamperedStorage = new MemoryStorage();
  tamperedStorage.values.set(
    outboxModule.mobileSnapshotOutboxStorageKey(ownerB),
    JSON.stringify({ items: [{ ...first, expectedOwnerId: ownerA }], version: 1 })
  );
  const tamperedOutbox = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async () => { throw new Error('tampered queue must not send'); },
    storage: tamperedStorage,
  });
  await assert.rejects(() => tamperedOutbox.read(ownerB), /owner does not match/i);

  console.log('Expo snapshot outbox contract passed durable FIFO replay, owner isolation, and retry identity.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
