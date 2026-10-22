/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { datedBookFixture } = require('./dated-codec-tests.cjs');
const { environment, storage, keys, document, oldBook, plain, writes } = require('./dated-storage-tests.cjs');
const [legacy, canonical, terms, dated] = keys;
const snapshotPayload = (value, more = []) => JSON.stringify({ version: 1, storage: [{ key: legacy, value }, ...more] });
const snapshotModule = e => e.load('app/settings/local-demo-snapshot.ts');
async function runDatedSnapshotTests() {
  let count = 0, failed = 0;
  async function test(name, fn) { count++; try { await fn(); console.log('PASS dated snapshot ' + name); }
    catch (error) { failed++; console.error('FAIL dated snapshot ' + name + ': ' + error.message); } }
  await test('export and account collection prefer4 under the existing logical key without archive reads/writes', () => {
    const value = datedBookFixture(), e = environment({ [dated]: document(value), [terms]: '{bad3', [canonical]: '{bad2', [legacy]: '{bad1' });
    const exported = snapshotModule(e).exportLocalDemoSnapshot(e.io); assert.equal(exported.ok, true);
    const entries = JSON.parse(exported.json).storage; assert.equal(entries.length, 1); assert.equal(entries[0].key, legacy);
    assert.deepEqual(JSON.parse(entries[0].value), { version: 4, aprUnit: 'decimal', data: value });
    const collected = e.load('lib/supabase/account-sync-source.ts').collectBrowserSnapshotStorage(e.io);
    assert.deepEqual(plain(collected), entries); assert.equal(writes(e.io).length, 0);
    assert.ok(e.io.calls.every(([, key]) => ![terms, canonical, legacy].includes(key)));
  });
  await test('restore4 copies on write, keeps old1/2/3 and unrelated legacy scenario bytes', () => {
    const archives = Object.fromEntries(keys.slice(0, 3).map((key, index) => [key, document(oldBook(), index + 1)]));
    const e = environment({ ...archives, 'velocity-bank-storage': 'separate scenario' }), value = datedBookFixture(), before = JSON.stringify(value);
    assert.equal(snapshotModule(e).importLocalDemoSnapshot(snapshotPayload(document(value)), e.io).ok, true);
    assert.deepEqual(JSON.parse(e.io.values.get(dated)), { version: 4, aprUnit: 'decimal', data: value });
    for (const [key, raw] of Object.entries(archives)) assert.equal(e.io.values.get(key), raw);
    assert.equal(e.io.values.get('velocity-bank-storage'), 'separate scenario'); assert.equal(JSON.stringify(value), before);
    const again = snapshotModule(e).exportLocalDemoSnapshot(e.io); assert.equal(again.ok, true);
    assert.equal(JSON.parse(JSON.parse(again.json).storage.find(entry => entry.key === legacy).value).version, 4);
  });
  await test('explicit4 without context and old-format restores into active4 remain sticky4', () => {
    const e = environment({ [terms]: document(oldBook(), 3) }), api = snapshotModule(e), old = e.io.values.get(terms);
    assert.equal(api.importLocalDemoSnapshot(snapshotPayload(document(oldBook())), e.io).ok, true);
    assert.equal(JSON.parse(e.io.values.get(dated)).version, 4);
    const changed = oldBook(); changed.monthlyIncome = 600;
    assert.equal(api.importLocalDemoSnapshot(snapshotPayload(document(changed, 2)), e.io).ok, true);
    assert.equal(JSON.parse(e.io.values.get(dated)).version, 4); assert.deepEqual(JSON.parse(e.io.values.get(dated)).data, changed);
    assert.equal(e.io.values.get(terms), old);
  });
  await test('present invalid4 blocks export, account collection and restore before destination writes', () => {
    for (const raw of ['', '{', 'null', document(oldBook(), 3), document(oldBook(), 5)]) {
      const e = environment({ [dated]: raw, [terms]: document(oldBook(), 3), 'velocity-bank-storage': 'keep' });
      const before = new Map(e.io.values), api = snapshotModule(e);
      assert.equal(api.exportLocalDemoSnapshot(e.io).ok, false);
      assert.throws(() => e.load('lib/supabase/account-sync-source.ts').collectBrowserSnapshotStorage(e.io));
      assert.equal(api.importLocalDemoSnapshot(snapshotPayload(document(datedBookFixture())), e.io).ok, false);
      assert.deepEqual(e.io.values, before); assert.equal(writes(e.io).length, 0);
    }
  });
  await test('downgraded dated payloads and unexpected physical snapshot keys never replace destination data', () => {
    const e = environment({ [dated]: document(datedBookFixture()) }), api = snapshotModule(e), before = new Map(e.io.values);
    for (const version of [1, 2, 3, 5]) assert.equal(api.importLocalDemoSnapshot(snapshotPayload(document(datedBookFixture(), version)), e.io).ok, false);
    const physical = JSON.stringify({ version: 1, storage: [{ key: dated, value: document(datedBookFixture()) }] });
    assert.equal(api.importLocalDemoSnapshot(physical, e.io).ok, false);
    assert.deepEqual(e.io.values, before); assert.equal(writes(e.io).length, 0);
  });
  await test('interrupted4 restore rolls back only touched active/nonportfolio keys, leaving archives unchanged', () => {
    for (const existing of [null, document(datedBookFixture())]) for (const failedKey of [dated, 'velocity-bank-storage']) {
      const e = environment({ [legacy]: 'raw1', [canonical]: document(oldBook(), 2), [terms]: document(oldBook(), 3),
        'velocity-bank-storage': 'original', ...(existing === null ? {} : { [dated]: existing }) });
      const before = new Map(e.io.values), api = snapshotModule(e); let failedOnce = false;
      const port = { ...e.io, setItem(key, raw) { if (!failedOnce && key === failedKey) { failedOnce = true; throw new Error('Synthetic interrupted4 publication'); } e.io.setItem(key, raw); } };
      const value = datedBookFixture(); value.monthlyIncome = 600;
      const payload = snapshotPayload(document(value), [{ key: 'velocity-bank-storage', value: 'changed' }]);
      assert.equal(api.importLocalDemoSnapshot(payload, port).ok, false); assert.deepEqual(e.io.values, before);
      assert.ok(writes(e.io).every(([, key]) => ![legacy, canonical, terms].includes(key)));
      assert.equal(api.importLocalDemoSnapshot(payload, port).ok, true); assert.equal(JSON.parse(e.io.values.get(dated)).data.monthlyIncome, 600);
    }
  });
  await test('full explicit reset removes all4 physical channels, but not unrelated bytes', () => {
    const e = environment(Object.fromEntries([...keys.map((key, index) => [key, String(index + 1)]), ['unrelated', 'keep']]));
    const reset = e.load('app/settings/local-data-reset.ts'), result = reset.clearLocalDemoData(e.io);
    assert.equal(result.cleared, 4); assert.equal(result.attempted, reset.LOCAL_DEMO_STORAGE_KEYS.length + 3);
    for (const key of keys) assert.equal(e.io.values.has(key), false);
    assert.equal(e.io.values.get('unrelated'), 'keep');
    assert.equal(reset.clearLocalDemoData(null).attempted, result.attempted);
  });
  await test('single-target dated extensions latch storage and block snapshot/import/sync without stripping bytes', () => {
    for (const extension of [{ datedPlan: datedBookFixture().datedPlan }, { datedPlan: null }, { loc: { datedPlan: {} } }]) {
      const raw = JSON.stringify({ version: 0, state: { monthlyIncome: 500, ...extension } });
      const e = environment({ 'velocity-bank-storage': raw, [canonical]: document(oldBook(), 2) });
      const guard = e.load('stores/legacy-scenario-storage.ts').createLegacyScenarioStorage(() => e.io);
      guard.setItem('velocity-bank-storage', JSON.stringify({ version: 0, state: { monthlyIncome: 900 } }));
      assert.equal(guard.getStatus().blocked, true); assert.equal(guard.getItem('velocity-bank-storage'), null);
      guard.removeItem('velocity-bank-storage'); assert.equal(e.io.values.get('velocity-bank-storage'), raw);
      const api = snapshotModule(e); assert.equal(api.exportLocalDemoSnapshot(e.io).ok, false);
      assert.equal(api.importLocalDemoSnapshot(JSON.stringify({ version: 1, storage: [{ key: 'velocity-bank-storage', value: raw }] }), e.io).ok, false);
      assert.throws(() => e.load('lib/supabase/account-sync-source.ts').collectBrowserSnapshotStorage(e.io));
      assert.equal(writes(e.io).length, 0);
      const clean = storage(), incoming = e.load('stores/legacy-scenario-storage.ts').createLegacyScenarioStorage(() => clean);
      assert.throws(() => incoming.setItem('velocity-bank-storage', raw)); assert.equal(writes(clean).length, 0);
    }
  });
  await test('queued old bodies stay byte-identical through reload;4 follows acknowledgment with owner/CAS isolation', async () => {
    const e = environment({ [dated]: document(datedBookFixture()) });
    const outboxApi = e.load('lib/supabase/snapshot-outbox.ts'), stored = new Map();
    const port = { async transact(key, update) { const next = plain(update(stored.get(key) ?? null)); stored.set(key, next); return plain(next); } };
    let minted = 0; const dependencies = { store: port, createOperationIdempotencyKey: () => `dated-operation:${String(++minted).padStart(16, '0')}` };
    const owner = '00000000-0000-4000-8000-00000000000a', other = '00000000-0000-4000-8000-00000000000b';
    const stream = 'dated-browser-install-001', rawOld = document(oldBook(), 3);
    const input = { assumptionsJson: { contract_version: 1, storage: [{ key: legacy, value: rawOld }] }, displayName: null,
      expectedOwnerId: owner, snapshotIdempotencyKey: stream, snapshotVersion: 1 };
    const first = await outboxApi.createWebSnapshotOutbox(dependencies).prepare(input), frozen = JSON.stringify(first);
    const reload = outboxApi.createWebSnapshotOutbox(dependencies);
    const newStorage = e.load('lib/supabase/account-sync-source.ts').collectBrowserSnapshotStorage(e.io);
    const replay = await reload.prepare({ ...input, assumptionsJson: { contract_version: 1, storage: newStorage } });
    assert.equal(JSON.stringify(replay), frozen); assert.equal(replay.assumptionsJson.storage[0].value, rawOld);
    const calls = [], client = { auth: { getClaims: async () => ({ data: { claims: { sub: owner } }, error: null }) },
      rpc: async (name, args) => { assert.equal(name, 'sync_interestshield_snapshot'); calls.push(plain(args));
        return { data: { snapshot_id: 'synthetic-id', client_revision: args.p_client_revision }, error: null }; } };
    const sync = e.load('lib/supabase/snapshot-sync.ts');
    assert.equal((await sync.syncLocalSnapshot(client, { idempotencyKey: stream, storage: newStorage }, { outbox: reload })).clientRevision, 2);
    assert.deepEqual(calls.map(call => call.p_client_revision), [1, 2]);
    assert.equal(calls[0].p_assumptions_json.storage[0].value, rawOld);
    assert.equal(calls[1].p_assumptions_json.storage[0].value, newStorage[0].value);
    assert.equal(JSON.parse(calls[1].p_assumptions_json.storage[0].value).version, 4);
    assert.ok(calls.every(call => call.p_expected_owner_id === owner && call.p_snapshot_version === 1));
    const next = await reload.prepare({ ...input, assumptionsJson: { contract_version: 1, storage: newStorage } });
    next.assumptionsJson.storage[0].value = 'mutated return';
    assert.equal((await reload.read(owner, stream)).pending.assumptionsJson.storage[0].value, newStorage[0].value);
    const otherOperation = await reload.prepare({ ...input, expectedOwnerId: other }); assert.equal(otherOperation.clientRevision, 1);
    const conflictClient = { ...client, rpc: async () => ({ data: null, error: { code: 'IS001', message: 'Synthetic stale4' } }) };
    await assert.rejects(() => sync.syncLocalSnapshot(conflictClient, { idempotencyKey: stream, storage: newStorage }, { outbox: reload }), error => error.code === 'IS001');
    await assert.rejects(() => reload.prepare(input), error => error.code === 'IS001');
    assert.equal((await reload.read(owner, stream)).pending.assumptionsJson.storage[0].value, newStorage[0].value);
    assert.equal((await reload.read(other, stream)).conflict, null);
  });
  await test('restore cannot erase existing wrong-channel dated extensions from old Portfolio or single-target bytes', () => {
    for (const version of [1, 2, 3]) {
      const raw = document(datedBookFixture(), version), e = environment({ [keys[version - 1]]: raw });
      const before = new Map(e.io.values);
      assert.equal(snapshotModule(e).importLocalDemoSnapshot(snapshotPayload(document(oldBook(), 2)), e.io).ok, false);
      assert.deepEqual(e.io.values, before); assert.equal(writes(e.io).length, 0);
    }
    for (const entries of [[], [{ key: 'velocity-bank-storage', value: '{"state":{"monthlyIncome":500}}' }]]) {
      const raw = JSON.stringify({ state: { datedPlan: datedBookFixture().datedPlan } });
      const e = environment({ 'velocity-bank-storage': raw }), before = new Map(e.io.values);
      assert.equal(snapshotModule(e).importLocalDemoSnapshot(JSON.stringify({ version: 1, storage: entries }), e.io).ok, false);
      assert.deepEqual(e.io.values, before); assert.equal(writes(e.io).length, 0);
    }
  });
  await test('snapshot with no Portfolio source retains active4 and its archives exactly', () => {
    const initial = Object.fromEntries(keys.map((key, index) => [key, document(oldBook(), index + 1)]));
    const e = environment(initial);
    assert.equal(snapshotModule(e).importLocalDemoSnapshot(JSON.stringify({ version: 1, storage: [] }), e.io).ok, true);
    for (const [key, raw] of Object.entries(initial)) assert.equal(e.io.values.get(key), raw);
    assert.ok(writes(e.io).every(([, key]) => !keys.includes(key)));
  });
  await test('old restore checks both data and state wrappers for hidden dated semantic data', () => {
    for (const reverse of [false, true]) {
      const clean = oldBook(), extended = datedBookFixture();
      const raw = JSON.stringify({ version: 2, aprUnit: 'decimal', data: reverse ? extended : clean, state: reverse ? clean : extended });
      const e = environment({ [canonical]: raw });
      assert.equal(snapshotModule(e).importLocalDemoSnapshot(snapshotPayload(document(clean, 2)), e.io).ok, false);
      assert.equal(e.io.values.get(canonical), raw); assert.equal(writes(e.io).length, 0);
    }
  });
  console.log(`${count} dated snapshot groups, ${failed} failed. Memory ports; no remote writes or browser durability claim.`);
  if (failed) throw new Error(`${failed} dated snapshot groups failed.`);
  return count;
}
module.exports = { runDatedSnapshotTests };
if (require.main === module) runDatedSnapshotTests().catch(error => { console.error(error); process.exitCode = 1; });
