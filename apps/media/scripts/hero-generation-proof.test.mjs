import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { mkdtemp, mkdir, writeFile, realpath, rm, unlink, link, symlink, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expectedInputs, recordGeneration, verifyGeneration } from './hero-generation-proof.mjs';

const ids = ['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault'];
const source = 'apps/media/hero-turntables/index.html';
const runtime = 'apps/media/node_modules/core-fixture/probe.bin';
const extra = 'apps/media/node_modules/core-fixture/added.bin';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const clone = value => JSON.parse(JSON.stringify(value));
const tempParent = await realpath(tmpdir());
const fixtureParent = await realpath(await mkdtemp(path.join(tempParent, 'ish-hero-core-suite-')));
async function cleanOwned(directory, parent, prefix) {
  const current = await realpath(directory);
  assert.equal(current, path.resolve(directory));
  assert.equal(await realpath(parent), parent);
  assert.equal(path.dirname(current), parent);
  assert.ok(path.basename(current).startsWith(prefix));
  await rm(current, { recursive: true, force: true });
}
after(() => cleanOwned(fixtureParent, tempParent, 'ish-hero-core-suite-'));
async function put(root, name, bytes) {
  const file = path.join(root, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
}
async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(fixtureParent, 'case-')));
  t.after(() => cleanOwned(root, fixtureParent, 'case-'));
  const expected = expectedInputs(ids);
  for (const file of expected.files)
    await put(root, file, file.endsWith('.glb') ? `synthetic-model:${path.basename(file)}` : `source:${file}`);
  await put(root, runtime, 'unlisted-runtime-input');
  await put(root, 'apps/media/node_modules/core-fixture/empty.bin', '');
  await mkdir(path.join(root, expected.outputParent), { recursive: true });
  const produce = async outputs => {
    for (const output of outputs) await put(root, output.path, `synthetic-video:${output.id}`);
  };
  return { root, expected, produce, record: () => recordGeneration(root, expected, produce) };
}

test('fresh full-ten UUID receipts verify and producer outputs are immutable', async t => {
  const f = await fixture(t);
  let offered;
  const first = await recordGeneration(f.root, f.expected, async outputs => { offered = outputs; await f.produce(outputs); });
  const second = await f.record();
  assert.match(first.generation, uuid); assert.match(second.generation, uuid);
  assert.notEqual(first.generation, second.generation);
  assert.equal(first.type, 'hero-generation'); assert.equal(first.version, 2);
  assert.equal(first.inputs.length, 103); assert.equal(first.heroes.length, 10);
  assert.deepEqual(first.heroes.map(h => h.id), ['car','creditCard','custom','house','land','medical','personal','recreation','studentLoan','vault']);
  assert.ok(Object.isFrozen(offered) && offered.every(Object.isFrozen));
  assert.ok(first.runtime[0].files.some(row => row.bytes === 0));
  assert.equal(await verifyGeneration(f.root, f.expected, first), true);
  assert.equal(await verifyGeneration(f.root, f.expected, second), true);
});

test('prepared-model mismatch rejects before the producer is entered', async t => {
  const f = await fixture(t);
  await put(f.root, 'apps/media/hyperframes/vendor/heroes/car.glb', 'different-model');
  let entered = false;
  await assert.rejects(recordGeneration(f.root, f.expected, async () => { entered = true; }), /model copies differ/);
  assert.equal(entered, false);
});

test('fixed source change or deletion during production cannot return a receipt', async t => {
  for (const action of ['change', 'delete']) {
    const f = await fixture(t);
    await assert.rejects(recordGeneration(f.root, f.expected, async outputs => {
      await f.produce(outputs);
      if (action === 'change') await put(f.root, source, 'source-drift');
      else await unlink(path.join(f.root, source));
    }), action === 'change' ? /inputs changed during production/ : { code: 'ENOENT' });
  }
});

test('unlisted runtime add delete and change during production reject', async t => {
  for (const action of ['add', 'delete', 'change']) {
    const f = await fixture(t);
    await assert.rejects(recordGeneration(f.root, f.expected, async outputs => {
      await f.produce(outputs);
      if (action === 'delete') await unlink(path.join(f.root, runtime));
      else await put(f.root, action === 'add' ? extra : runtime, 'runtime-drift');
    }), /runtime inputs changed during production/);
  }
});

test('verification rechecks fixed sources and complete runtime after recording', async t => {
  for (const action of ['source-change', 'source-delete', 'runtime-add', 'runtime-delete', 'runtime-change']) {
    const f = await fixture(t), receipt = await f.record();
    const file = action.startsWith('source') ? source : action === 'runtime-add' ? extra : runtime;
    if (action.endsWith('delete')) await unlink(path.join(f.root, file));
    else await put(f.root, file, 'post-record-drift');
    await assert.rejects(verifyGeneration(f.root, f.expected, receipt),
      action === 'source-delete' ? { code: 'ENOENT' } : action.startsWith('source') ? /inputs differ/ : /runtime inputs differ/);
  }
});

test('stale videos foreign generations and changed delivered bytes reject', async t => {
  const f = await fixture(t);
  await put(f.root, f.expected.outputParent + '/car.mp4', 'legacy-video');
  await assert.rejects(recordGeneration(f.root, f.expected, async () => {}), { code: 'ENOENT' });
  const first = await f.record(), second = await f.record(), foreign = clone(second);
  foreign.heroes[0].video = first.heroes[0].video;
  await assert.rejects(verifyGeneration(f.root, f.expected, foreign), /not a fresh generation output path/);
  const wrongUuid = clone(second);
  wrongUuid.generation = '00000000-0000-4000-8000-000000000000';
  await assert.rejects(verifyGeneration(f.root, f.expected, wrongUuid), /not a fresh generation output path/);
  await put(f.root, second.heroes[0].video.path, 'changed-video');
  await assert.rejects(verifyGeneration(f.root, f.expected, second), /video differs/);
});

test('unsupported source additions omissions and malformed contracts reject before production', async t => {
  const f = await fixture(t);
  const mutations = [e => e.files.push('unapproved.mjs'), e => e.files.pop(), e => e.runtimeTrees.splice(0),
    e => { e.version = 1; }, e => e.heroes.push(e.heroes[0]), e => { e.outputParent = '../escape'; }];
  for (const mutate of mutations) {
    const expected = clone(f.expected); mutate(expected);
    let entered = false;
    await assert.rejects(recordGeneration(f.root, expected, async () => { entered = true; }), { code: 'ERR_ASSERTION' });
    assert.equal(entered, false);
  }
});

test('malformed receipt headers scope paths hashes and aliases reject', async t => {
  const f = await fixture(t), receipt = await f.record();
  const mutations = [r => { r.version = 1; }, r => { r.type = 'unapproved'; }, r => r.inputs.pop(),
    r => r.runtime.splice(0), r => r.heroes.push(r.heroes[0]), r => { r.generation = 'not-a-uuid'; },
    r => { r.heroes[0].video.path = '../escape.mp4'; }, r => { r.heroes[0].video.sha256 = '0'.repeat(64); },
    r => { r.runtime[0].files[0].bytes = -1; }, r => { r.unexpected = true; }];
  for (const mutate of mutations) {
    const broken = clone(receipt); mutate(broken);
    await assert.rejects(verifyGeneration(f.root, f.expected, broken), { code: 'ERR_ASSERTION' });
  }
  assert.equal(await verifyGeneration(f.root, f.expected, receipt), true);
});

test('required-source and unlisted-runtime hardlink aliases reject', async t => {
  for (const file of [source, runtime]) {
    const f = await fixture(t);
    await link(path.join(f.root, file), path.join(f.root, 'owned-hardlink'));
    await assert.rejects(f.record(), /single-link regular file/);
  }
});

test('required-directory and runtime-directory junction aliases reject', async t => {
  const f = await fixture(t), heroes = path.join(f.root, 'apps/web/public/heroes');
  const target = path.join(f.root, 'owned-heroes');
  await rename(heroes, target); await symlink(target, heroes, 'junction');
  await assert.rejects(f.record(), /symlink rejected/);
  const g = await fixture(t), directory = path.join(g.root, 'owned-runtime');
  await mkdir(directory); await put(g.root, 'owned-runtime/input.bin', 'linked-runtime');
  await symlink(directory, path.join(g.root, 'apps/media/node_modules/owned-alias'), 'junction');
  await assert.rejects(g.record(), /runtime symlink rejected/);
});
