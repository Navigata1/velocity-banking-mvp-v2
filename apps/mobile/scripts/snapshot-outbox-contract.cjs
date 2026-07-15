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
    this.failNextSet = false;
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
    if (this.failNextSet) {
      this.failNextSet = false;
      throw new Error('simulated dequeue persistence failure');
    }
    this.order.push('persist');
    this.values.set(key, value);
  }
}

const ownerA = '00000000-0000-4000-8000-00000000000a';
const ownerB = '00000000-0000-4000-8000-00000000000b';

async function main() {
  const modulePath = path.resolve(__dirname, '..', 'lib', 'supabase', 'snapshot-outbox.ts');
  const outboxModule = loadTsFile(modulePath, {
    '../mobile-assumption-storage': {
      decodeMobileAssumptions: (raw) => {
        try { return JSON.parse(raw); } catch { return null; }
      },
    },
    './auth-storage': {
      createMobileAuthStorage: () => new MemoryStorage(),
      isMobileSnapshotOwnerLock: (lock, ownerId) => lock?.ownerId === ownerId,
      withMobileSnapshotOwnerLock: async (ownerId, action) => action({ ownerId }),
    },
    './snapshot-sync': {
      prepareMobileSnapshotSync: async () => { throw new Error('inject prepareSnapshot in tests'); },
      syncPreparedMobileSnapshot: async () => { throw new Error('inject sendSnapshot in tests'); },
    },
    './sync-identity': {
      createMobileSyncOperationIdempotencyKey: () => 'mobile-operation:default',
      getOrCreateMobileSyncIdempotencyKey: async () => 'mobile-install:00000000-0000-4000-8000-000000000111',
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
    clientRevision: input.clientRevision,
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
  assert.equal(first.clientRevision, 1, 'the first persisted operation must allocate revision one');
  assert.equal(first.version, 2);

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
  assert.deepEqual(order, ['persist', 'send', 'persist']);
  assert.equal(sent[0].operationIdempotencyKey, first.operationIdempotencyKey);
  assert.equal((await outbox.read(ownerA)).length, 0);
  const retainedEnvelope = JSON.parse(storage.values.get(outboxModule.mobileSnapshotOutboxStorageKey(ownerA)));
  assert.equal(
    retainedEnvelope.streams[first.snapshotIdempotencyKey].lastAllocatedRevision,
    1,
    'an empty queue must retain its acknowledged revision'
  );
  const afterEmptyReload = await reloaded.enqueue({ assumptions: { monthlyIncome: 6600 }, expectedOwnerId: ownerA });
  assert.equal(afterEmptyReload.clientRevision, 2, 'reload after an empty queue must allocate the next revision');

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
  assert.deepEqual(
    [retryFirst.clientRevision, retrySecond.clientRevision],
    [1, 2],
    'queued operations must receive contiguous durable revisions'
  );
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
  crashStorage.failNextSet = true;
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
    JSON.stringify({
      items: [{ ...first, expectedOwnerId: ownerA }],
      streams: {
        [first.snapshotIdempotencyKey]: {
          conflict: null,
          lastAcknowledgedRevision: 0,
          lastAllocatedRevision: 1,
        },
      },
      version: 2,
    })
  );
  const tamperedOutbox = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async () => { throw new Error('tampered queue must not send'); },
    storage: tamperedStorage,
  });
  await assert.rejects(() => tamperedOutbox.read(ownerB), /owner does not match/i);

  const legacyStorage = new MemoryStorage();
  legacyStorage.values.set(
    outboxModule.mobileSnapshotOutboxStorageKey(ownerA),
    JSON.stringify({ items: [], version: 1 })
  );
  const legacyOutbox = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async () => { throw new Error('legacy state must fail before send'); },
    storage: legacyStorage,
  });
  await assert.rejects(
    () => legacyOutbox.read(ownerA),
    /cannot be migrated safely/i,
    'legacy state must fail closed instead of guessing a server revision'
  );

  const conflictStorage = new MemoryStorage();
  let conflictSends = 0;
  const conflictOutbox = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async () => {
      conflictSends += 1;
      throw { code: 'IS001', details: '{"current_revision":2}', message: 'Snapshot sync revision is stale.' };
    },
    storage: conflictStorage,
  });
  const conflictItem = await conflictOutbox.enqueue({ assumptions: { monthlyIncome: 7600 }, expectedOwnerId: ownerA });
  await assert.rejects(
    () => conflictOutbox.flush({}, ownerA),
    (error) => error.code === 'IS001' && error.kind === 'stale'
  );
  assert.equal((await conflictOutbox.read(ownerA)).length, 1, 'a conflicting head must remain queued');
  const storedConflict = await conflictOutbox.readConflict(ownerA, conflictItem.snapshotIdempotencyKey);
  assert.equal(storedConflict.kind, 'stale');
  await assert.rejects(
    () => conflictOutbox.flush({}, ownerA),
    (error) => error.code === 'IS001',
    'foreground replay must stop on the persisted conflict without sending again'
  );
  assert.equal(conflictSends, 1);
  await assert.rejects(
    () => conflictOutbox.enqueue({ assumptions: { monthlyIncome: 7700 }, expectedOwnerId: ownerA }),
    (error) => error.code === 'IS001',
    'new work must not extend a stream with an unresolved conflict'
  );

  const recoveryStorage = new MemoryStorage();
  const recoveryOutbox = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async () => { throw new Error('recovery contract must not send discarded work'); },
    storage: recoveryStorage,
  });
  const recoveryFirst = await recoveryOutbox.enqueue({ assumptions: { monthlyIncome: 7800 }, expectedOwnerId: ownerA });
  await recoveryOutbox.enqueue({ assumptions: { monthlyIncome: 7900 }, expectedOwnerId: ownerA });
  const staged = await recoveryOutbox.stageRecovery({
    assumptions: { monthlyIncome: 8000 },
    expectedLocalAssumptions: '{"monthlyIncome":7900}',
    expectedOwnerId: ownerA,
    serverRevision: 7,
    snapshotIdempotencyKey: recoveryFirst.snapshotIdempotencyKey,
    sourceKind: 'remote',
  });
  assert.equal(staged.clientRevision, 8);
  const recoveryReloaded = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async () => { throw new Error('reloaded recovery must not send before commit'); },
    storage: recoveryStorage,
  });
  assert.equal((await recoveryReloaded.readRecovery(ownerA)).recoveryId, staged.recoveryId);
  await assert.rejects(
    () => recoveryReloaded.enqueue({ assumptions: { monthlyIncome: 8050 }, expectedOwnerId: ownerA }),
    /recovery is pending/i,
    'new work must not enter a stream with a staged recovery journal'
  );
  await assert.rejects(
    () => recoveryReloaded.flush({}, ownerA),
    /recovery is pending/i,
    'automatic replay must stop while recovery is staged'
  );
  const recoveryResult = await recoveryReloaded.commitRecovery(ownerA, staged.recoveryId);
  assert.equal(recoveryResult.discarded, 2, 'confirmed recovery must report discarded local operations');
  assert.equal(
    (await recoveryReloaded.commitRecovery(ownerA, staged.recoveryId)).discarded,
    0,
    'a second tab must recognize an already committed recovery idempotently'
  );
  const afterRecovery = await recoveryReloaded.read(ownerA);
  assert.equal(afterRecovery.length, 1);
  assert.equal(afterRecovery[0].clientRevision, 8, 'recovered work must advance from the verified server revision');
  assert.equal(afterRecovery[0].operationIdempotencyKey, staged.recoveryId);
  assert.equal(await recoveryReloaded.readRecovery(ownerA), null);
  assert.equal(await recoveryReloaded.readConflict(ownerA, recoveryFirst.snapshotIdempotencyKey), null);

  const activeFlushStorage = new MemoryStorage();
  let releaseSend;
  let markSendStarted;
  const sendStarted = new Promise((resolve) => { markSendStarted = resolve; });
  const activeFlushOutbox = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async () => {
      markSendStarted();
      await new Promise((resolve) => { releaseSend = resolve; });
      return { ownerId: ownerA, snapshotId: '00000000-0000-4000-8000-000000000998' };
    },
    storage: activeFlushStorage,
  });
  await activeFlushOutbox.enqueue({ assumptions: { monthlyIncome: 8050 }, expectedOwnerId: ownerA });
  const activeFlush = activeFlushOutbox.flush({}, ownerA);
  await sendStarted;
  await assert.rejects(
    () => activeFlushOutbox.stageRecovery({
      assumptions: { monthlyIncome: 8100 },
      expectedLocalAssumptions: '{"monthlyIncome":8050}',
      expectedOwnerId: ownerA,
      serverRevision: 7,
      snapshotIdempotencyKey: 'mobile-install:00000000-0000-4000-8000-000000000111',
      sourceKind: 'remote',
    }),
    /sync is active/i,
    'recovery must not stage while an operation is being sent'
  );
  releaseSend();
  await activeFlush;

  const crossTabStorage = new MemoryStorage();
  const withOwnerCrossContextLock = createCrossContextLock();
  let releaseCrossTabSend;
  let markCrossTabSendStarted;
  const crossTabSendStarted = new Promise((resolve) => { markCrossTabSendStarted = resolve; });
  const crossTabA = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async () => {
      markCrossTabSendStarted();
      await new Promise((resolve) => { releaseCrossTabSend = resolve; });
      return { ownerId: ownerA, snapshotId: '00000000-0000-4000-8000-000000000997' };
    },
    storage: crossTabStorage,
    withOwnerCrossContextLock,
  });
  const crossTabB = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async () => { throw new Error('second tab must not send during recovery staging'); },
    storage: crossTabStorage,
    withOwnerCrossContextLock,
  });
  const crossTabItem = await crossTabA.enqueue({ assumptions: { monthlyIncome: 8200 }, expectedOwnerId: ownerA });
  const crossTabFlush = crossTabA.flush({}, ownerA);
  await crossTabSendStarted;
  let crossTabStageSettled = false;
  const crossTabStage = crossTabB.stageRecovery({
    assumptions: { monthlyIncome: 8250 },
    expectedLocalAssumptions: '{"monthlyIncome":8200}',
    expectedOwnerId: ownerA,
    serverRevision: 1,
    snapshotIdempotencyKey: crossTabItem.snapshotIdempotencyKey,
    sourceKind: 'device',
  }).finally(() => { crossTabStageSettled = true; });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(crossTabStageSettled, false, 'a second tab must wait while the first tab holds the owner flush lock');
  releaseCrossTabSend();
  await crossTabFlush;
  const crossTabRecovery = await crossTabStage;
  assert.equal(crossTabRecovery.clientRevision, 2);

  const staleBaselineStorage = new MemoryStorage();
  const staleBaselineOutbox = outboxModule.createMobileSnapshotOutbox({
    createOperationIdempotencyKey,
    prepareSnapshot,
    sendSnapshot: async (_client, item) => ({ ownerId: ownerA, snapshotId: item.operationIdempotencyKey }),
    storage: staleBaselineStorage,
  });
  const acknowledged = await staleBaselineOutbox.enqueue({ assumptions: { monthlyIncome: 8300 }, expectedOwnerId: ownerA });
  await staleBaselineOutbox.flush({}, ownerA);
  await assert.rejects(
    () => staleBaselineOutbox.stageRecovery({
      assumptions: { monthlyIncome: 8350 },
      expectedLocalAssumptions: '{"monthlyIncome":8300}',
      expectedOwnerId: ownerA,
      serverRevision: 0,
      snapshotIdempotencyKey: acknowledged.snapshotIdempotencyKey,
      sourceKind: 'device',
    }),
    /revision changed.*review again/i,
    'recovery must not move a locally acknowledged stream backward'
  );

  console.log('Expo snapshot outbox contract passed durable FIFO replay, owner isolation, and retry identity.');
}

function createCrossContextLock() {
  const tails = new Map();
  return async (ownerId, action) => {
    const previous = tails.get(ownerId) ?? Promise.resolve();
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    tails.set(ownerId, previous.then(() => current));
    await previous;
    try {
      return await action();
    } finally {
      release();
    }
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
