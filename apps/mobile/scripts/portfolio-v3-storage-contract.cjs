/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const ownerA = '00000000-0000-4000-8000-00000000000a';
const ownerB = '00000000-0000-4000-8000-00000000000b';
const oldKey = owner => `interestshield.mobile.portfolio.v1${owner ? `.owner.${owner.toLowerCase()}` : ''}`;
const activeKey = owner => `interestshield.mobile.portfolio.v3${owner ? `.owner.${owner.toLowerCase()}` : ''}`;
const base = { monthlyIncome: 8200.451, monthlyExpenses: 4700.125, extraMonthlyPayment: 50, chunkAmount: 1000,
  loc: { limit: 1000, balance: 50.125, apr: 0.12 }, strategy: 'avalanche', focusMode: 'single', splitRatioPrimary: 0.7,
  debts: [{ id: 'loan', name: 'Loan', category: 'custom', kind: 'amortized', balance: 120.70001, apr: 2,
    minPaymentRule: { type: 'fixed', amount: 30.005 }, paymentSource: 'checking' }] };
const terms = { annualFee: 0, minimumPayment: { mode: 'fixed', value: 0 },
  sources: { annualFee: 'lender-document', minimumPayment: 'user-provided' } };
const clone = value => JSON.parse(JSON.stringify(value));
const profiled = () => ({ ...clone(base), loc: { ...base.loc, lenderTerms: clone(terms) } });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const compiled = new Map();

// Only platform IO is substituted; codec, encryption, owner locks and sessions are real.
function harness(platform) {
  const values = new Map(), cache = new Map(), locks = new Map();
  let generation = 0, failWrite, writeGate, available = true;
  const started = deferred();
  const write = async (key, value) => {
    if (failWrite?.(key)) { failWrite = undefined; throw new Error('injected write failure'); }
    if (writeGate?.predicate(key)) {
      const gate = writeGate; writeGate = undefined; started.resolve(); await gate.promise;
    }
    values.set(key, value);
  };
  const global = { localStorage: { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => {
      if (failWrite?.(key)) { failWrite = undefined; throw new Error('injected write failure'); }
      values.set(key, value);
    }, removeItem: key => values.delete(key) }, navigator: { locks: { request: (key, _options, action) => {
      const operation = (locks.get(key) ?? Promise.resolve()).catch(() => undefined).then(action);
      locks.set(key, operation.then(() => undefined, () => undefined)); return operation;
    } } } };
  const secure = { isAvailableAsync: async () => available, getItemAsync: async key => values.get(key) ?? null,
    setItemAsync: async (key, value) => { assert.ok(Buffer.byteLength(value, 'utf8') <= 2048); await write(key, value); },
    deleteItemAsync: async key => { values.delete(key); } };
  const mocks = { 'expo-crypto': { randomUUID: () => `v3-generation-${++generation}` },
    'expo-secure-store': secure, 'react-native': { Platform: { OS: platform } } };
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    if (!compiled.has(file)) compiled.set(file, ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText);
    const local = id => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('@interestshield/financial-engine')) return load(fs.realpathSync(require.resolve(id)));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), `${id}.ts`));
      return require(id);
    };
    vm.runInNewContext(compiled.get(file), { module, exports: module.exports, require: local, globalThis: global, console }, { filename: file });
    return module.exports;
  }
  const storage = load(path.resolve(__dirname, '../lib/mobile-portfolio-storage.ts'));
  const auth = load(path.resolve(__dirname, '../lib/supabase/auth-storage.ts'));
  const session = load(path.resolve(__dirname, '../lib/mobile-portfolio-session.ts'));
  const physical = platform === 'web' ? { getItem: async key => values.get(key) ?? null, setItem: write }
    : auth.createChunkedSecureAuthStorage(secure, () => `fixture-${++generation}`, { strictRead: true });
  const seed = (key, book, revision = 7, version = 2, ownerId = ownerA) => physical.setItem(key, JSON.stringify({
    version: 1, ownerId, revision, savedAt: '2026-10-22T12:00:00Z',
    document: JSON.stringify({ version, ...(version === 1 ? {} : { aprUnit: 'decimal' }), data: book }),
  }));
  const active = async (owner = ownerA) => {
    const raw = await physical.getItem(activeKey(owner));
    assert.notEqual(raw, null, 'a successful adoption must publish the physical3 channel');
    return JSON.parse(raw);
  };
  return { values, physical, seed, active, auth, storage, global,
    read: (owner = ownerA, lock) => storage.loadMobilePortfolioForOwner(owner, lock),
    save: (book, options, owner = ownerA) => storage.saveMobilePortfolioForOwner(owner, book, options),
    session: (owner = ownerA, overrides) => session.createMobilePortfolioSession(owner, overrides),
    fail: predicate => { failWrite = predicate; }, unavailable: () => { available = false; },
    gate: predicate => { const gate = deferred(); writeGate = { ...gate, predicate }; return gate; }, started: started.promise };
}

async function run() {
  let count = 0;
  async function test(name, action) {
    count++;
    try { await action(); console.log(`PASS Portfolio v3 ${name}`); }
    catch (error) { console.error(`FAIL Portfolio v3 ${name}`); console.error(error); process.exitCode = 1; }
  }
  for (const platform of ['web', 'ios']) {
    for (const version of [3, 4]) await test(`${platform}: old physical channel rejects inner${version} for owner and guest without overwriting`, async () => {
      for (const owner of [ownerA, null]) {
        const h = harness(platform); await h.seed(oldKey(owner), base, 7, version, owner);
        const before = [...h.values];
        await assert.rejects(() => h.read(owner), /unreadable|version|document/i);
        for (const candidate of [base, profiled()]) {
          await assert.rejects(() => h.save(candidate, { expectedRevision: 7 }, owner), /unreadable|version|document/i);
        }
        assert.deepEqual([...h.values], before); assert.equal(await h.physical.getItem(activeKey(owner)), null);
      }
    });
    for (const version of [1, 2, 4]) await test(`${platform}: active physical channel rejects inner${version} instead of falling back`, async () => {
      const h = harness(platform); await h.seed(oldKey(ownerA), base); await h.seed(activeKey(ownerA), base, 8, version);
      const before = [...h.values]; await assert.rejects(() => h.read(), /unreadable|version|document/i);
      await assert.rejects(() => h.save(base, { expectedRevision: 7 }), /unreadable|version|document/i);
      assert.deepEqual([...h.values], before);
    });
    await test(`${platform}: supplied terms adopt physical3 and retain every old byte`, async () => {
      for (const owner of [null, ownerA.toUpperCase()]) {
        const h = harness(platform), normalized = owner?.toLowerCase() ?? null;
        assert.equal(h.storage.mobilePortfolioStorageKey(owner), oldKey(owner));
        await h.seed(oldKey(owner), base, 7, 2, normalized);
        const before = new Map(h.values);
        assert.equal((await h.save(profiled(), { expectedRevision: 7 }, owner)).revision, 8);
        for (const [key, value] of before) assert.equal(h.values.get(key), value, `archived ${key}`);
        const active = await h.active(owner);
        assert.equal(active.revision, 8); assert.equal(active.ownerId, normalized);
        assert.equal(JSON.parse(active.document).version, 3);
        assert.deepEqual(clone((await h.read(owner)).book), profiled());
      }
    });
    await test(`${platform}: absent profiles keep old physical bytes and inner2 semantics`, async () => {
      const h = harness(platform); assert.equal('documentVersion' in await h.read(), false);
      assert.equal('documentVersion' in await h.save(base, { expectedRevision: 0 }), false);
      assert.equal('documentVersion' in await h.read(), false);
      const payload = JSON.parse(await h.physical.getItem(oldKey(ownerA)));
      assert.equal(payload.version, 1); assert.equal(payload.revision, 1); assert.equal(payload.ownerId, ownerA);
      assert.equal(JSON.parse(payload.document).version, 2); assert.deepEqual(JSON.parse(payload.document).data, base);
      assert.equal(await h.physical.getItem(activeKey(ownerA)), null);
    });
    await test(`${platform}: load and save expose active document3 even after terms removal`, async () => {
      const h = harness(platform); await h.seed(oldKey(ownerA), base);
      const adopted = await h.save(profiled(), { expectedRevision: 7 }), loaded = await h.read();
      const saved = await h.save(base, { expectedRevision: 8 }), removed = await h.read();
      assert.equal('lenderTerms' in removed.book.loc, false);
      const empty = harness(platform);
      const explicit = await empty.save(base, { expectedRevision: 0, documentVersion: 3 }), reloaded = await empty.read();
      assert.deepEqual([adopted, loaded, saved, removed, explicit, reloaded].map(result => result.documentVersion), [3, 3, 3, 3, 3, 3]);
    });
    await test(`${platform}: inner1 APR converts once and adoption preserves its original bytes`, async () => {
      const h = harness(platform), legacy = clone(base); legacy.loc.apr = 8.5; legacy.debts[0].apr = 6.5;
      await h.seed(oldKey(ownerA), legacy, 4, 1); const before = [...h.values], loaded = await h.read();
      assert.equal(loaded.book.loc.apr, 0.085); assert.equal(loaded.book.debts[0].apr, 0.065);
      await h.save({ ...loaded.book, loc: { ...loaded.book.loc, lenderTerms: {} } }, { expectedRevision: 4 });
      for (const [key, value] of before) assert.equal(h.values.get(key), value);
      assert.equal((await h.read()).revision, 5); assert.equal((await h.read()).book.loc.apr, 0.085);
      assert.deepEqual(clone((await h.read()).book.loc.lenderTerms), {});
    });
    await test(`${platform}: active3 wins without reading a corrupt archive`, async () => {
      const h = harness(platform);
      await h.physical.setItem(oldKey(ownerA), '{');
      await h.seed(activeKey(ownerA), { ...profiled(), monthlyIncome: 9999 }, 12, 3);
      assert.equal((await h.read()).book.monthlyIncome, 9999); assert.equal((await h.read()).revision, 12);
      await h.save(base, { expectedRevision: 12 });
      assert.equal(await h.physical.getItem(oldKey(ownerA)), '{');
      const saved = await h.active();
      assert.equal(saved.revision, 13); assert.equal(JSON.parse(saved.document).version, 3);
      assert.equal('lenderTerms' in JSON.parse(saved.document).data.loc, false);
    });
    await test(`${platform}: present malformed3 blocks reads and saves without fallback`, async () => {
      for (const corrupt of ['', '{', 'null', '{}',
        JSON.stringify({ version: 1, ownerId: ownerA, revision: 8, savedAt: '2026-10-22', document: JSON.stringify({ version: 2, aprUnit: 'decimal', data: base }) }),
        JSON.stringify({ version: 1, ownerId: ownerB, revision: 8, savedAt: '2026-10-22', document: JSON.stringify({ version: 3, aprUnit: 'decimal', data: base }) })]) {
        const h = harness(platform); await h.seed(oldKey(ownerA), base); await h.physical.setItem(activeKey(ownerA), corrupt);
        const before = [...h.values];
        await assert.rejects(() => h.read(), /unreadable|owner|document/i);
        await assert.rejects(() => h.save(profiled(), { expectedRevision: 7 }), /unreadable|owner|document/i);
        assert.deepEqual([...h.values], before);
      }
    });
    await test(`${platform}: failed adoption can retry without advancing the source revision`, async () => {
      const h = harness(platform); await h.seed(oldKey(ownerA), base); const before = [...h.values];
      h.fail(key => platform === 'web' ? key === activeKey(ownerA) : key === `${activeKey(ownerA)}.manifest`);
      await assert.rejects(() => h.save(profiled(), { expectedRevision: 7 }), /injected write failure/);
      assert.deepEqual([...h.values], before); assert.equal((await h.read()).revision, 7);
      assert.equal((await h.save(profiled(), { expectedRevision: 7 })).revision, 8);
      assert.deepEqual(clone((await h.read()).book), profiled());
    });
    await test(`${platform}: active saves and profile removal never downgrade or overwrite archives`, async () => {
      const h = harness(platform); await h.seed(oldKey(ownerA), base); const old = await h.physical.getItem(oldKey(ownerA));
      await h.seed(activeKey(ownerA), profiled(), 9, 3);
      h.fail(key => platform === 'web' ? key === activeKey(ownerA) : key === `${activeKey(ownerA)}.manifest`);
      await assert.rejects(() => h.save(base, { expectedRevision: 9 }), /injected write failure/);
      assert.deepEqual(clone((await h.read()).book), profiled()); assert.equal((await h.read()).revision, 9);
      await h.save(base, { expectedRevision: 9 }); await h.save({ ...base, monthlyIncome: 9000 }, { expectedRevision: 10 });
      assert.equal(await h.physical.getItem(oldKey(ownerA)), old);
      assert.equal(JSON.parse((await h.active()).document).version, 3);
      assert.equal((await h.read()).revision, 11);
    });
    await test(`${platform}: adoption CAS and authentic owner leases isolate guest A and B`, async () => {
      const h = harness(platform); await h.seed(oldKey(ownerA), base);
      const results = await Promise.allSettled([h.save(profiled(), { expectedRevision: 7 }), h.save(base, { expectedRevision: 7 })]);
      assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].status, 'rejected');
      assert.equal((await h.read()).revision, 8); assert.equal((await h.read(null)).book, null); assert.equal((await h.read(ownerB)).book, null);
      await h.auth.withMobileSnapshotOwnerLock(ownerA, async lock => {
        await assert.rejects(() => h.save(profiled(), { expectedRevision: 0, ownerLock: lock }, ownerB), /lock|owner/i);
        await h.save(base, { expectedRevision: 8, ownerLock: lock });
        assert.equal((await h.read(ownerA, lock)).revision, 9);
      });
    });
    await test(`${platform}: queued documents capture nested terms and explicit version before the lock`, async () => {
      const h = harness(platform), gate = deferred(); await h.seed(oldKey(ownerA), base);
      const holding = h.auth.withMobileSnapshotOwnerLock(ownerA, () => gate.promise);
      const candidate = profiled(), options = { expectedRevision: 7, documentVersion: 3 };
      const saving = h.save(candidate, options);
      candidate.loc.lenderTerms.annualFee = 999; candidate.loc.lenderTerms.minimumPayment.value = 999;
      candidate.loc.lenderTerms.sources.annualFee = 'model-default'; options.documentVersion = undefined; options.expectedRevision = 0;
      gate.resolve(); await holding; await saving;
      assert.deepEqual(clone((await h.read()).book.loc.lenderTerms), terms);
      const other = harness(platform); await other.seed(oldKey(ownerA), base);
      const gate2 = deferred(), holding2 = other.auth.withMobileSnapshotOwnerLock(ownerA, () => gate2.promise);
      const explicit = { expectedRevision: 7, documentVersion: 3 }, imported = other.save(base, explicit); explicit.documentVersion = undefined;
      gate2.resolve(); await holding2; await imported;
      assert.equal(JSON.parse((await other.active()).document).version, 3);
    });
    await test(`${platform}: explicit imported3 without terms is adopted by session.replace`, async () => {
      const h = harness(platform); await h.seed(oldKey(ownerA), base); const old = await h.physical.getItem(oldKey(ownerA));
      const s = h.session(); await s.hydrate();
      await h.auth.withMobileSnapshotOwnerLock(ownerA, lock => s.replace(clone(base), lock, 7, 3));
      assert.equal(s.getSnapshot().revision, 8); assert.equal(s.storageScope, oldKey(ownerA));
      assert.equal(await h.physical.getItem(oldKey(ownerA)), old);
      assert.equal(JSON.parse((await h.active()).document).version, 3);
      await s.update(b => ({ ...b, monthlyIncome: 9999 }));
      assert.equal(JSON.parse((await h.active()).document).version, 3);
    });
    await test(`${platform}: terms-only session edits save and equivalent nested inputs are no-ops`, async () => {
      const h = harness(platform); await h.seed(oldKey(ownerA), base); const s = h.session(); await s.hydrate();
      await s.update(b => ({ ...b, loc: { ...b.loc, lenderTerms: clone(terms) } }));
      assert.deepEqual(clone((await h.read()).book.loc.lenderTerms), terms); assert.equal(s.getSnapshot().revision, 8);
      const before = [...h.values]; await s.update(b => clone(b)); assert.deepEqual([...h.values], before);
      await s.update(b => { delete b.loc.lenderTerms; return b; });
      assert.equal((await h.read()).revision, 9);
      assert.equal(JSON.parse((await h.active()).document).version, 3);
    });
    await test(`${platform}: invalid profiles and explicit save versions never write`, async () => {
      const h = harness(platform); await h.seed(oldKey(ownerA), base); const before = [...h.values];
      for (const lenderTerms of [{ annualFee: -1 }, { sources: { annualFee: 'verified' } },
        { minimumPayment: { mode: 'fixed', value: 0, surprise: true } }]) {
        await assert.rejects(() => h.save({ ...base, loc: { ...base.loc, lenderTerms } }, { expectedRevision: 7 }));
      }
      for (const documentVersion of [1, 2, 5, '3', null]) {
        await assert.rejects(() => h.save(base, { expectedRevision: 7, documentVersion }), /version/i);
      }
      assert.deepEqual([...h.values], before);
    });
    await test(`${platform}: invalid explicit replacement versions do not cancel queued edits`, async () => {
      const h = harness(platform); await h.seed(oldKey(ownerA), base);
      const s = h.session(); await s.hydrate(); const queued = s.update(b => ({ ...b, monthlyIncome: 9000 }));
      const results = await Promise.allSettled([queued, s.replace(base, undefined, 7, 2)]);
      assert.equal(results[1].status, 'rejected'); assert.match(results[1].reason.message, /version/i);
      assert.equal(results[0].status, 'fulfilled');
      assert.equal((await h.read()).book.monthlyIncome, 9000); assert.equal(s.getSnapshot().status, 'saved');
      assert.equal(await h.physical.getItem(activeKey(ownerA)), null);
    });
    await test(`${platform}: leased replacement cancels old term edits and stale reviewed revisions reject`, async () => {
      const h = harness(platform); await h.seed(oldKey(ownerA), base); const s = h.session(); await s.hydrate();
      await h.auth.withMobileSnapshotOwnerLock(ownerA, async lock => {
        const obsolete = s.update(b => ({ ...b, loc: { ...b.loc, lenderTerms: { annualFee: 99 } } }));
        const replacement = s.replace(profiled(), lock, 7, 3), results = await Promise.allSettled([obsolete, replacement]);
        assert.equal(results[0].status, 'rejected'); assert.equal(results[1].status, 'fulfilled');
      });
      assert.deepEqual(clone((await h.read()).book.loc.lenderTerms), terms); assert.equal((await h.read()).revision, 8);
      const before = [...h.values]; await assert.rejects(() => s.replace(base, undefined, 7, 3), /changed|revision/i);
      assert.deepEqual([...h.values], before); assert.equal(s.getSnapshot().status, 'error');
      await s.hydrate(); assert.equal(s.getSnapshot().status, 'saved');
    });
  }
  await test('hydrated and queued session profiles are detached and deeply frozen', async () => {
    const h = harness('ios'); await h.seed(activeKey(ownerA), profiled(), 7, 3);
    const source = profiled(), s = h.session(ownerA, { load: async () => ({ book: source, revision: 7, backend: 'secure-store' }) });
    await s.hydrate(); const hydrated = s.getSnapshot().book.loc.lenderTerms;
    assert.notEqual(hydrated, source.loc.lenderTerms); assert.equal(Object.isFrozen(source.loc.lenderTerms), false);
    for (const part of [hydrated, hydrated.minimumPayment, hydrated.sources]) assert.ok(Object.isFrozen(part));
    const gate = deferred(), holding = h.auth.withMobileSnapshotOwnerLock(ownerA, () => gate.promise);
    const input = profiled(), first = s.replace(input, undefined, 7); input.loc.lenderTerms.minimumPayment.value = 333;
    const replacing = s.getSnapshot(); assert.equal(replacing.status, 'replacing'); gate.resolve(); await holding; await first;
    assert.equal((await h.read()).book.loc.lenderTerms.minimumPayment.value, 0);
    const writeGate = h.gate(key => key === `${activeKey(ownerA)}.manifest`);
    const one = s.update(b => { b.loc.lenderTerms.annualFee = 1; return b; });
    const queued = s.getSnapshot().book;
    for (const part of [queued.loc.lenderTerms, queued.loc.lenderTerms.minimumPayment, queued.loc.lenderTerms.sources]) assert.ok(Object.isFrozen(part));
    const two = s.update(b => { b.loc.lenderTerms.minimumPayment.value = 2; return b; });
    await h.started; writeGate.resolve(); await Promise.all([one, two]);
    assert.equal(queued.loc.lenderTerms.minimumPayment.value, 0);
    assert.equal((await h.read()).book.loc.lenderTerms.minimumPayment.value, 2);
  });
  await test('already queued saves keep their profile when later drafts and owners change', async () => {
    const h = harness('ios'); await h.seed(oldKey(ownerA), base); let current = true;
    const s = h.session(ownerA, { isCurrent: () => current }); await s.hydrate();
    const gate = h.gate(key => key.endsWith('.manifest'));
    const first = s.update(b => { b.loc.lenderTerms = { ...clone(terms), annualFee: 1 }; return b; }); await h.started;
    const second = s.update(b => { b.loc.lenderTerms.annualFee = 2; return b; });
    const settled = Promise.allSettled([first, second]); current = false; s.deactivate(); gate.resolve();
    assert.ok((await settled).every(result => result.status === 'rejected'));
    assert.equal((await h.read()).book.loc.lenderTerms.annualFee, 1); assert.equal((await h.read()).revision, 8);
    assert.equal(s.getSnapshot().book, null);
  });
  await test('encrypted active3 missing chunks block fallback and leave both channels untouched', async () => {
    const h = harness('ios'); await h.seed(oldKey(ownerA), base); await h.seed(activeKey(ownerA), profiled(), 8, 3);
    const manifest = JSON.parse(h.values.get(`${activeKey(ownerA)}.manifest`)); h.values.delete(`${activeKey(ownerA)}.${manifest.generation}.0`);
    const before = [...h.values]; await assert.rejects(() => h.read(), /incomplete|corrupt/i);
    await assert.rejects(() => h.save(base, { expectedRevision: 8 }), /incomplete|corrupt/i); assert.deepEqual([...h.values], before);
  });
  await test('active3 unavailable and corrupt hydration never enables replacement', async () => {
    for (const unavailable of [true, false]) {
      const h = harness('ios'); await h.seed(oldKey(ownerA), base);
      if (unavailable) h.unavailable(); else await h.physical.setItem(activeKey(ownerA), '{');
      const before = [...h.values], s = h.session(); await s.hydrate();
      assert.equal(s.getSnapshot().status, unavailable ? 'unavailable' : 'error');
      await assert.rejects(() => s.replace(profiled(), undefined, 7, 3)); assert.deepEqual([...h.values], before);
    }
  });
  console.log(`${count} native Portfolio v3 contracts ${process.exitCode ? 'failed' : 'passed'}. CPU storage/session evidence only.`);
}

module.exports = run;
module.exports.harness = harness;
module.exports.base = base;
module.exports.deferred = deferred;
if (require.main === module) {
  const watchdog = setTimeout(() => { console.error('Portfolio v3 contracts timed out.'); process.exit(1); }, 10000);
  run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
}
