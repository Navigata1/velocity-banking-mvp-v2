/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { harness, base, deferred } = require('./portfolio-v3-storage-contract.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
const ownerA = '00000000-0000-4000-8000-00000000000a';
const ownerB = '00000000-0000-4000-8000-00000000000b';
const key = (version, owner = ownerA) => `interestshield.mobile.portfolio.v${version}${owner ? `.owner.${owner.toLowerCase()}` : ''}`;
const plan = () => ({ contract: 'fixed-loc-daily-v1', startDate: '2026-01-01', openingCash: 100,
  cashReserve: 25, accountOpenedOn: '2020-01-01', drawEndsOn: '2030-01-01', maturesOn: '2040-01-01',
  annualFeeFirstDueOn: '2026-01-01', openingMinimumPayment: 20, minimumDueDay: 31, debtPaymentDay: 30,
  cashEvents: [{ id: 'income', day: 31, kind: 'income', amount: 8200.45 },
    { id: 'expense', day: 31, kind: 'expense', amount: 4700.12, source: 'checking' }] });
const dated = () => ({ ...clone(base), datedPlan: plan() });
let count = 0;
async function test(name, run) {
  count++;
  try { await run(); console.log(`PASS dated storage ${name}`); }
  catch (error) { console.error(`FAIL dated storage ${name}`); console.error(error); process.exitCode = 1; }
}
async function main() {
  for (const platform of ['web', 'ios']) {
    await test(`${platform}: adoption4 archives physical1 and3 and stays4 after all context removal`, async () => {
      for (const owner of [null, ownerA.toUpperCase()]) {
        const h = harness(platform), id = owner?.toLowerCase() ?? null;
        await h.seed(key(1, owner), base, 7, 2, id);
        await h.seed(key(3, owner), { ...base, loc: { ...base.loc, lenderTerms: {} } }, 8, 3, id);
        const before = new Map(h.values);
        const result = await h.save(dated(), { expectedRevision: 8 }, owner);
        assert.equal(result.documentVersion, 4); assert.equal(result.revision, 9);
        for (const [k, raw] of before) assert.equal(h.values.get(k), raw, `archive ${k}`);
        assert.equal(JSON.parse(JSON.parse(await h.physical.getItem(key(4, owner))).document).version, 4);
        assert.deepEqual(clone((await h.read(owner)).book), dated());
        await h.save(base, { expectedRevision: 9, documentVersion: 3 }, owner);
        const loaded = await h.read(owner);
        assert.equal(loaded.documentVersion, 4); assert.equal(loaded.revision, 10);
        assert.deepEqual(clone(loaded.book), base);
        for (const [k, raw] of before) assert.equal(h.values.get(k), raw);
      }
    });
    await test(`${platform}: explicit4 without context adopts on a no-read write`, async () => {
      const h = harness(platform);
      assert.equal((await h.save(base, { expectedRevision: 0, documentVersion: 4 })).documentVersion, 4);
      assert.equal((await h.read()).documentVersion, 4);
      assert.equal(await h.physical.getItem(key(1)), null); assert.equal(await h.physical.getItem(key(3)), null);
    });
    await test(`${platform}: present4 is authoritative over corrupt archives`, async () => {
      const h = harness(platform);
      await h.physical.setItem(key(1), '{'); await h.physical.setItem(key(3), '{');
      await h.seed(key(4), dated(), 10, 4);
      assert.equal((await h.read()).revision, 10);
      await h.save(dated(), { expectedRevision: 10 });
      assert.equal(await h.physical.getItem(key(1)), '{'); assert.equal(await h.physical.getItem(key(3)), '{');
    });
    await test(`${platform}: corrupt present4 never falls back or permits replacement`, async () => {
      for (const raw of ['', '{', 'null', '{}', ...[1, 2, 3, 5].map(version => JSON.stringify({
        version: 1, ownerId: ownerA, revision: 9, savedAt: '2026-10-22',
        document: JSON.stringify({ version, aprUnit: 'decimal', data: base }) })),
      JSON.stringify({ version: 1, ownerId: ownerB, revision: 9, savedAt: '2026-10-22',
        document: JSON.stringify({ version: 4, aprUnit: 'decimal', data: dated() }) })]) {
        const h = harness(platform);
        await h.seed(key(1), base); await h.seed(key(3), base, 8, 3); await h.physical.setItem(key(4), raw);
        const before = [...h.values];
        await assert.rejects(() => h.read(), /unreadable|version|owner|document/i);
        await assert.rejects(() => h.save(dated(), { expectedRevision: 8 }), /unreadable|version|owner|document/i);
        const s = h.session(); await s.hydrate(); assert.equal(s.getSnapshot().status, 'error');
        await assert.rejects(() => s.replace(dated(), undefined, 8, 4));
        assert.deepEqual([...h.values], before);
      }
    });
    await test(`${platform}: dated extensions in physical1/3 fail closed`, async () => {
      for (const version of [1, 2, 3]) {
        const h = harness(platform); await h.seed(key(version === 3 ? 3 : 1), dated(), 7, version);
        const before = [...h.values];
        await assert.rejects(() => h.read(), /unreadable|version|dated/i);
        await assert.rejects(() => h.save(base, { expectedRevision: 7 })); assert.deepEqual([...h.values], before);
      }
    });
    await test(`${platform}: failed4 publication leaves the source revision retryable`, async () => {
      const h = harness(platform); await h.seed(key(3), base, 7, 3); const before = [...h.values];
      h.fail(k => k === (platform === 'web' ? key(4) : `${key(4)}.manifest`));
      await assert.rejects(() => h.save(dated(), { expectedRevision: 7 }), /injected write failure/);
      assert.deepEqual([...h.values], before); assert.equal((await h.read()).revision, 7);
      assert.equal((await h.save(dated(), { expectedRevision: 7 })).revision, 8);
    });
    await test(`${platform}: document and explicit4 are captured before owner queue and CAS`, async () => {
      const h = harness(platform), gate = deferred(); await h.seed(key(3), base, 7, 3);
      const holding = h.auth.withMobileSnapshotOwnerLock(ownerA, () => gate.promise);
      const candidate = dated(), options = { expectedRevision: 7, documentVersion: 4 };
      const saving = h.save(candidate, options);
      candidate.datedPlan.cashEvents.reverse(); candidate.datedPlan.cashEvents[0].amount = 1;
      options.expectedRevision = 0; options.documentVersion = 3;
      gate.resolve(); await holding; await saving;
      assert.deepEqual(clone((await h.read()).book), dated());
      await assert.rejects(() => h.save(base, { expectedRevision: 7 }), /changed|revision/i);
      assert.equal((await h.read(null)).book, null); assert.equal((await h.read(ownerB)).book, null);
      await h.auth.withMobileSnapshotOwnerLock(ownerA, async lock => {
        await assert.rejects(() => h.save(dated(), { expectedRevision: 0, ownerLock: lock }, ownerB), /lock|owner/i);
        await h.save(base, { expectedRevision: 8, ownerLock: lock });
      });
      assert.equal((await h.read()).documentVersion, 4);
    });
    await test(`${platform}: session replacement and queued edits preserve deeply frozen dated plans`, async () => {
      const h = harness(platform); await h.seed(key(4), dated(), 7, 4); const s = h.session(); await s.hydrate();
      assert.equal(s.getSnapshot().status, 'saved');
      const original = s.getSnapshot().book.datedPlan;
      for (const part of [original, original.cashEvents, ...original.cashEvents]) assert.ok(Object.isFrozen(part));
      await s.update(b => { b.datedPlan.cashEvents.reverse(); return b; });
      assert.deepEqual(clone((await h.read()).book.datedPlan.cashEvents), plan().cashEvents.reverse());
      const before = [...h.values]; await s.update(b => clone(b)); assert.deepEqual([...h.values], before);
      await s.replace(base, undefined, 8, 4); await s.update(b => ({ ...b, monthlyIncome: 9000 })); await s.hydrate();
      assert.equal(s.getSnapshot().documentVersion, 4); assert.equal('datedPlan' in s.getSnapshot().book, false);
      assert.deepEqual(clone(original), plan());
    });
    await test(`${platform}: explicit downgrade rejects before cancelling a queued edit`, async () => {
      const h = harness(platform); await h.seed(key(4), dated(), 7, 4); const s = h.session(); await s.hydrate();
      const queued = s.update(b => ({ ...b, monthlyIncome: 9000 }));
      const results = await Promise.allSettled([queued, s.replace(dated(), undefined, 7, 3)]);
      assert.equal(results[1].status, 'rejected'); assert.match(results[1].reason.message, /downgrade|version4/i);
      assert.equal(results[0].status, 'fulfilled', 'invalid replacement must not cancel an earlier valid edit');
      assert.equal(s.getSnapshot().status, 'saved'); assert.equal((await h.read()).book.monthlyIncome, 9000);
    });
  }
  await test('queued dated saves compose without retaining mutable caller or snapshot aliases', async () => {
    const h = harness('ios'), source = dated(); await h.seed(key(4), source, 7, 4);
    const s = h.session(ownerA, { load: async () => ({ book: source, revision: 7, backend: 'secure-store', documentVersion: 4 }) });
    await s.hydrate(); assert.notEqual(s.getSnapshot().book.datedPlan, source.datedPlan);
    assert.equal(Object.isFrozen(source.datedPlan), false);
    const gate = h.gate(k => k === `${key(4)}.manifest`);
    const first = s.update(b => { b.datedPlan.cashReserve = 30; return b; }); await h.started;
    const captured = s.getSnapshot().book;
    const second = s.update(b => { b.datedPlan.cashEvents.reverse(); return b; });
    source.datedPlan.cashEvents[0].amount = 1;
    gate.resolve(); await Promise.all([first, second]);
    assert.deepEqual(clone(captured.datedPlan.cashEvents), plan().cashEvents);
    const loaded = await h.read(); assert.equal(loaded.revision, 9); assert.equal(loaded.book.datedPlan.cashReserve, 30);
    assert.deepEqual(clone(loaded.book.datedPlan.cashEvents), plan().cashEvents.reverse());
  });
  await test('owner deactivation cancels queued4 while an already-started immutable4 may finish only for its owner', async () => {
    const h = harness('ios'); await h.seed(key(4), dated(), 7, 4); let current = true;
    const s = h.session(ownerA, { isCurrent: () => current }); await s.hydrate();
    const gate = h.gate(k => k === `${key(4)}.manifest`);
    const first = s.update(b => { b.datedPlan.cashReserve = 30; return b; }); await h.started;
    const second = s.update(b => { b.datedPlan.cashEvents.reverse(); return b; });
    const settled = Promise.allSettled([first, second]); current = false; s.deactivate(); gate.resolve();
    assert.ok((await settled).every(result => result.status === 'rejected'));
    const stored = await h.read(); assert.equal(stored.revision, 8); assert.equal(stored.book.datedPlan.cashReserve, 30);
    assert.deepEqual(clone(stored.book.datedPlan.cashEvents), plan().cashEvents); assert.equal(s.getSnapshot().book, null);
    assert.equal((await h.read(ownerB)).book, null);
  });
  await test('encrypted4 missing chunks block fallback and all writes', async () => {
    const h = harness('ios'); await h.seed(key(3), base, 7, 3); await h.seed(key(4), dated(), 8, 4);
    const manifest = JSON.parse(h.values.get(`${key(4)}.manifest`)); h.values.delete(`${key(4)}.${manifest.generation}.0`);
    const before = [...h.values]; await assert.rejects(() => h.read(), /incomplete|corrupt/i);
    await assert.rejects(() => h.save(base, { expectedRevision: 8 }), /incomplete|corrupt/i); assert.deepEqual([...h.values], before);
  });
  console.log(`${count} dated native storage contracts ${process.exitCode ? 'failed' : 'passed'}. CPU IO ports only, no numerical expectations.`);
}
module.exports = { plan, dated };
if (require.main === module) {
  const watchdog = setTimeout(() => { console.error('Dated storage timed out.'); process.exit(1); }, 15000);
  main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
}
