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

const ownerA = '00000000-0000-4000-8000-00000000000a';
const ownerB = '00000000-0000-4000-8000-00000000000b';
const localSnapshotKey = 'mobile-install:00000000-0000-4000-8000-000000000111';
const remoteSnapshotKey = 'mobile-install:00000000-0000-4000-8000-000000000222';

function assumptions(income) {
  return {
    activeDebt: { apr: 0.069, balance: 18450, monthlyPayment: 425, termMonths: 60 },
    activeDebtName: 'Auto Loan',
    chunkAmount: 1500,
    loc: { apr: 0.085, balance: 3200, limit: 20000 },
    monthlyExpenses: 4500,
    monthlyIncome: income,
  };
}

function encoded(ownerId, income) {
  return JSON.stringify({ input: assumptions(income), ownerId, savedAt: '2026-07-15T01:45:00.000Z', version: 1 });
}

function createClient(rows, activeOwnerId = ownerA, ignoreFilters = false) {
  return {
    auth: {
      getClaims: async () => ({
        data: { claims: { sub: typeof activeOwnerId === 'function' ? activeOwnerId() : activeOwnerId } },
        error: null,
      }),
    },
    from: (table) => {
      assert.equal(table, 'financial_snapshots');
      const filters = [];
      const query = {
        eq: (column, value) => { filters.push([column, value]); return query; },
        limit: () => query,
        order: () => query,
        select: () => query,
        then: (resolve) => {
          const filtered = ignoreFilters
            ? rows
            : rows.filter((row) => filters.every(([column, value]) => row[column] === value));
          return Promise.resolve({ data: filtered, error: null }).then(resolve);
        },
      };
      return query;
    },
  };
}

async function main() {
  const modulePath = path.resolve(__dirname, '..', 'lib', 'supabase', 'snapshot-recovery.ts');
  const recovery = loadTsFile(modulePath, {
    '../mobile-assumption-storage': {
      decodeMobileAssumptions: (value, expectedOwnerId) => {
        try {
          const parsed = JSON.parse(value);
          return parsed.ownerId === expectedOwnerId ? parsed.input : null;
        } catch {
          return null;
        }
      },
      loadMobileAssumptionsForOwner: async (ownerId) => ({
        backend: 'secure-store',
        input: assumptions(ownerId === null ? 8100 : 7200),
        restored: true,
        revision: 5,
      }),
      saveMobileAssumptionsForOwner: async () => ({ backend: 'secure-store', revision: 6 }),
    },
    './auth-storage': {
      withMobileSnapshotOwnerLock: async (ownerId, action) => action({ ownerId }),
    },
    './snapshot-outbox': { mobileSnapshotOutbox: {} },
    './sync-identity': { getOrCreateMobileSyncIdempotencyKey: async () => localSnapshotKey },
  });

  const rows = [
    {
      assumptions_json: { contract_version: 1, storage: [{ key: 'interestshield-mobile-assumptions-v1', value: encoded(ownerA, 7200) }] },
      client_revision: 7,
      id: '00000000-0000-4000-8000-000000000101',
      idempotency_key: localSnapshotKey,
      owner_id: ownerA,
      snapshot_version: 1,
      updated_at: '2026-07-15T01:40:00.000Z',
    },
    {
      assumptions_json: { contract_version: 1, storage: [{ key: 'interestshield-mobile-assumptions-v1', value: encoded(ownerA, 7600) }] },
      client_revision: 3,
      id: '00000000-0000-4000-8000-000000000102',
      idempotency_key: remoteSnapshotKey,
      owner_id: ownerA,
      snapshot_version: 1,
      updated_at: '2026-07-15T01:41:00.000Z',
    },
    {
      assumptions_json: { contract_version: 1, storage: [{ key: 'interestshield-mobile-assumptions-v1', value: '{bad json' }] },
      client_revision: 1,
      id: '00000000-0000-4000-8000-000000000103',
      idempotency_key: 'mobile-install:00000000-0000-4000-8000-000000000333',
      owner_id: ownerA,
      snapshot_version: 1,
      updated_at: '2026-07-15T01:42:00.000Z',
    },
  ];
  const client = createClient(rows);
  const options = await recovery.loadMobileSnapshotRecoveryOptions(client, ownerA);
  assert.equal(options.snapshots.length, 2, 'valid snapshots must be previewed without guessing a winner');
  assert.equal(options.rejectedCount, 1, 'corrupt remote payloads must be rejected and counted');
  assert.equal(options.selectedSnapshotId, null, 'the recovery service must never auto-select latest');
  const selected = options.snapshots.find(({ snapshotId }) => snapshotId.endsWith('102'));
  assert.equal(selected.assumptions.monthlyIncome, 7600);
  const reviewedLocalAssumptions = recovery.serializeMobileRecoveryAssumptions(assumptions(7200));

  const legacyOptions = await recovery.loadMobileSnapshotRecoveryOptions(createClient([{
    ...rows[1],
    client_revision: 0,
    id: '00000000-0000-4000-8000-000000000104',
  }]), ownerA);
  assert.equal(legacyOptions.snapshots[0].clientRevision, 0, 'legacy baseline snapshots remain explicit recovery candidates');
  const duplicateEntry = rows[1].assumptions_json.storage[0];
  const ambiguousOptions = await recovery.loadMobileSnapshotRecoveryOptions(createClient([{
    ...rows[1],
    id: '00000000-0000-4000-8000-000000000105',
    assumptions_json: { contract_version: 1, storage: [duplicateEntry, duplicateEntry] },
  }]), ownerA);
  assert.equal(ambiguousOptions.snapshots.length, 0);
  assert.equal(ambiguousOptions.rejectedCount, 1, 'duplicate mobile payload entries must be rejected as ambiguous');

  const order = [];
  const outbox = {
    commitRecovery: async (_ownerId, recoveryId) => { order.push(`commit:${recoveryId}`); return { discarded: 2 }; },
    flush: async () => { order.push('flush'); return { remaining: 0, sent: 1 }; },
    readRecovery: async () => null,
    stageRecovery: async ({ assumptions: input, serverRevision }) => {
      order.push(`stage:${input.monthlyIncome}:${serverRevision}`);
      return { clientRevision: serverRevision + 1, recoveryId: 'mobile-operation:00000000-0000-4000-8000-000000000777' };
    },
  };
  const result = await recovery.applyMobileSnapshotRecovery(client, {
    confirmation: { clientRevision: selected.clientRevision, snapshotId: selected.snapshotId },
    expectedOwnerId: ownerA,
    reviewedLocalAssumptions,
    source: { kind: 'remote', snapshot: selected },
  }, {
    getSnapshotIdempotencyKey: async () => localSnapshotKey,
    outbox,
    replaceAssumptions: async (input) => { order.push(`replace:${input.monthlyIncome}`); return 'secure-store'; },
  });
  assert.deepEqual(order, [
    'stage:7600:7',
    'replace:7600',
    'commit:mobile-operation:00000000-0000-4000-8000-000000000777',
    'flush',
  ], 'journal must gate replay before local replacement and atomic queue reconciliation');
  assert.equal(result.discarded, 2);
  assert.equal(result.synced, true);

  const tampered = { ...selected, clientRevision: selected.clientRevision + 1 };
  await assert.rejects(
    () => recovery.applyMobileSnapshotRecovery(client, {
      confirmation: { clientRevision: tampered.clientRevision, snapshotId: tampered.snapshotId },
      expectedOwnerId: ownerA,
      reviewedLocalAssumptions,
      source: { kind: 'remote', snapshot: tampered },
    }, { outbox, replaceAssumptions: async () => { throw new Error('must not replace'); } }),
    /changed.*review again/i
  );

  await assert.rejects(
    () => recovery.loadMobileSnapshotRecoveryOptions(
      createClient([{ ...rows[0], owner_id: ownerB }], ownerA, true),
      ownerA
    ),
    /owner/i,
    'a row outside the verified owner must fail closed even if RLS is misconfigured'
  );
  await assert.rejects(
    () => recovery.loadMobileSnapshotRecoveryOptions(createClient(rows, ownerB), ownerA),
    /account changed/i
  );
  let ownerCheck = 0;
  await assert.rejects(
    () => recovery.loadMobileSnapshotRecoveryOptions(
      createClient(rows, () => ownerCheck++ === 0 ? ownerA : ownerB),
      ownerA
    ),
    /account changed/i,
    'an account switch while options load must reject before returning previews'
  );

  const failedReplacementOrder = [];
  await assert.rejects(
    () => recovery.applyMobileSnapshotRecovery(client, {
      confirmation: { clientRevision: selected.clientRevision, snapshotId: selected.snapshotId },
      expectedOwnerId: ownerA,
      reviewedLocalAssumptions,
      source: { kind: 'remote', snapshot: selected },
    }, {
      getSnapshotIdempotencyKey: async () => localSnapshotKey,
      outbox: {
        commitRecovery: async () => { failedReplacementOrder.push('commit'); },
        flush: async () => { failedReplacementOrder.push('flush'); },
        readRecovery: async () => null,
        stageRecovery: async () => {
          failedReplacementOrder.push('stage');
          return { clientRevision: 8, recoveryId: 'mobile-operation:00000000-0000-4000-8000-000000000778' };
        },
      },
      replaceAssumptions: async () => {
        failedReplacementOrder.push('replace');
        throw new Error('simulated local persistence failure');
      },
    }),
    (error) => error.pendingRecovery === true && /local persistence failure/i.test(error.message)
  );
  assert.deepEqual(
    failedReplacementOrder,
    ['stage', 'replace'],
    'a failed local replacement must leave a replay-gating journal without discarding queued work'
  );

  const interruptedRebaseOrder = [];
  await assert.rejects(
    () => recovery.applyMobileSnapshotRecovery(client, {
      confirmation: { clientRevision: selected.clientRevision, snapshotId: selected.snapshotId },
      expectedOwnerId: ownerA,
      reviewedLocalAssumptions,
      source: { kind: 'remote', snapshot: selected },
    }, {
      getSnapshotIdempotencyKey: async () => localSnapshotKey,
      outbox: {
        commitRecovery: async () => {
          interruptedRebaseOrder.push('commit');
          throw new Error('simulated atomic commit interruption');
        },
        flush: async () => { interruptedRebaseOrder.push('flush'); },
        readRecovery: async () => null,
        stageRecovery: async () => {
          interruptedRebaseOrder.push('stage');
          return { clientRevision: 8, recoveryId: 'mobile-operation:00000000-0000-4000-8000-000000000779' };
        },
      },
      replaceAssumptions: async () => { interruptedRebaseOrder.push('replace'); return 'secure-store'; },
    }),
    /commit interruption/i
  );
  assert.deepEqual(
    interruptedRebaseOrder,
    ['stage', 'replace', 'commit'],
    'an interrupted commit must leave its journal and stop before remote flush'
  );

  const guestOrder = [];
  await recovery.applyMobileSnapshotRecovery(client, {
    confirmation: {
      kind: 'guest',
      ownerId: ownerA,
      reviewedAssumptions: recovery.serializeMobileRecoveryAssumptions(assumptions(8100)),
    },
    expectedOwnerId: ownerA,
    reviewedLocalAssumptions,
    source: { assumptions: assumptions(8100), kind: 'guest' },
  }, {
    getSnapshotIdempotencyKey: async () => localSnapshotKey,
    outbox: {
      ...outbox,
      commitRecovery: async (_ownerId, recoveryId) => { guestOrder.push(`commit:${recoveryId}`); return { discarded: 0 }; },
      flush: async () => { guestOrder.push('flush'); return { remaining: 1, sent: 0 }; },
      stageRecovery: async ({ assumptions: input, serverRevision }) => {
        guestOrder.push(`stage:${input.monthlyIncome}:${serverRevision}`);
        return { clientRevision: serverRevision + 1, recoveryId: 'mobile-operation:00000000-0000-4000-8000-000000000780' };
      },
    },
    replaceAssumptions: async (input) => { guestOrder.push(`replace:${input.monthlyIncome}`); return 'secure-store'; },
  });
  assert.deepEqual(guestOrder, [
    'stage:8100:7',
    'replace:8100',
    'commit:mobile-operation:00000000-0000-4000-8000-000000000780',
    'flush',
  ]);
  await assert.rejects(
    () => recovery.applyMobileSnapshotRecovery(client, {
      confirmation: {
        kind: 'guest',
        ownerId: ownerA,
        reviewedAssumptions: recovery.serializeMobileRecoveryAssumptions(assumptions(8150)),
      },
      expectedOwnerId: ownerA,
      reviewedLocalAssumptions,
      source: { assumptions: assumptions(8150), kind: 'guest' },
    }, { outbox, replaceAssumptions: async () => 'secure-store' }),
    /guest assumptions changed.*review again/i,
    'guest adoption must remain bound to the exact payload shown during review'
  );

  const deviceOrder = [];
  await recovery.applyMobileSnapshotRecovery(client, {
    confirmation: {
      kind: 'device',
      ownerId: ownerA,
      reviewedAssumptions: reviewedLocalAssumptions,
    },
    expectedOwnerId: ownerA,
    reviewedLocalAssumptions,
    source: { assumptions: assumptions(7200), kind: 'device' },
  }, {
    getSnapshotIdempotencyKey: async () => localSnapshotKey,
    outbox: {
      ...outbox,
      commitRecovery: async () => { deviceOrder.push('commit'); return { discarded: 1 }; },
      flush: async () => { deviceOrder.push('flush'); return { remaining: 0, sent: 1 }; },
      stageRecovery: async ({ assumptions: input, serverRevision }) => {
        deviceOrder.push(`stage:${input.monthlyIncome}:${serverRevision}`);
        return { clientRevision: serverRevision + 1, recoveryId: 'mobile-operation:00000000-0000-4000-8000-000000000782' };
      },
    },
    replaceAssumptions: async (input) => { deviceOrder.push(`replace:${input.monthlyIncome}`); return 'secure-store'; },
  });
  assert.deepEqual(deviceOrder, ['stage:7200:7', 'replace:7200', 'commit', 'flush']);

  const resumeOrder = [];
  const resumed = await recovery.resumePendingMobileSnapshotRecovery(ownerA, {
    outbox: {
      commitRecovery: async (_ownerId, recoveryId) => { resumeOrder.push(`commit:${recoveryId}`); },
      readRecovery: async () => ({
        assumptions: assumptions(8300),
        expectedLocalAssumptions: reviewedLocalAssumptions,
        recoveryId: 'mobile-operation:00000000-0000-4000-8000-000000000781',
      }),
    },
    saveAssumptions: async (ownerId, input) => {
      resumeOrder.push(`save:${ownerId}:${input.monthlyIncome}`);
      return { backend: 'secure-store', revision: 6 };
    },
  });
  assert.equal(resumed, true);
  assert.deepEqual(resumeOrder, [
    `save:${ownerA}:8300`,
    'commit:mobile-operation:00000000-0000-4000-8000-000000000781',
  ], 'restart recovery must persist target assumptions before committing the staged outbox operation');
  assert.equal(await recovery.resumePendingMobileSnapshotRecovery(ownerA, {
    outbox: { commitRecovery: async () => {}, readRecovery: async () => null },
  }), false);

  console.log('Expo snapshot recovery contract passed explicit preview, owner checks, restore ordering, and guest adoption.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
