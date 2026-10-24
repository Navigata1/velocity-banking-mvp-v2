import assert from 'node:assert/strict';
import * as nativeFs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

// All publication/package I/O goes to this in-memory filesystem. Only this
// generated evidence log is written to the actual permitted scratch area.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const scripts = path.join(root, 'apps/media/scripts');
const require = createRequire(pathToFileURL(path.join(root, 'apps/media/package.json')));
const sharp = require('sharp');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = [];
const emit = (name, details) => {
  report.push({ name, ...details });
  console.log(JSON.stringify(report.at(-1)));
};
const normalize = value => path.resolve(value instanceof URL ? fileURLToPath(value) : value);
const fail = (code, target) => Object.assign(new Error(`${code}: ${target}`), { code });
const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};
const reviewedFiles = ['prepare-medical-poster.mjs', 'build-medical-poster.mjs', 'hero-poster-publication.mjs', 'prepare-hero-posters.mjs', 'package-hero-collection.mjs', 'medical-poster.test.mjs', 'refined-hero-record.mjs'];
async function sourceDigests() {
  const result = {};
  for (const name of reviewedFiles) result[name] = hash(await nativeFs.readFile(path.join(scripts, name)));
  return result;
}
const initialDigests = await sourceDigests();

class MemoryFs {
  files = new Map();
  directories = new Set();
  events = [];
  hook = async () => {};
  async step(op, target) {
    target = normalize(target);
    this.events.push({ op, target });
    await this.hook(op, target);
    return target;
  }
  put(target, data) {
    target = normalize(target);
    this.files.set(target, Buffer.from(data));
    for (let parent = path.dirname(target); parent !== path.dirname(parent); parent = path.dirname(parent)) this.directories.add(parent);
  }
  get(target) {
    const result = this.files.get(normalize(target));
    if (!result) throw fail('ENOENT', target);
    return Buffer.from(result);
  }
  readFile = async (target, encoding) => {
    target = await this.step('readFile', target);
    const result = this.get(target);
    return encoding === 'utf8' ? result.toString('utf8') : result;
  };
  writeFile = async (target, data) => {
    target = await this.step('writeFile', target);
    this.put(target, data);
  };
  copyFile = async (source, destination) => {
    source = await this.step('copyFile', source);
    this.put(destination, this.get(source));
  };
  mkdir = async target => {
    target = await this.step('mkdir', target);
    this.directories.add(target);
  };
  rename = async (source, destination) => {
    source = await this.step('rename', source);
    this.put(destination, this.get(source));
    this.files.delete(source);
  };
  unlink = async target => {
    target = await this.step('unlink', target);
    if (!this.files.delete(target)) throw fail('ENOENT', target);
  };
  stat = async target => {
    target = await this.step('stat', target);
    return { size: this.get(target).length };
  };
  readdir = async target => {
    target = await this.step('readdir', target);
    const prefix = target + path.sep;
    const names = new Set([...this.files.keys(), ...this.directories].filter(p => p.startsWith(prefix)).map(p => p.slice(prefix.length).split(path.sep)[0]));
    return [...names].filter(Boolean).map(name => ({ name, isDirectory: () => this.directories.has(path.join(target, name)) }));
  };
  open = async (target, mode) => {
    target = await this.step('open', target);
    assert.equal(mode, 'wx');
    if (this.files.has(target)) throw fail('EEXIST', target);
    this.put(target, '');
    return { writeFile: data => this.writeFile(target, data), close: async () => {} };
  };
}

async function loadModule(filename, fs, argv = []) {
  const context = createContext({ Buffer, URL, structuredClone, process: { pid: process.pid, platform: process.platform, argv }, console });
  const modules = new Map();
  async function get(identifier) {
    if (modules.has(identifier)) return modules.get(identifier);
    if (identifier === 'node:fs/promises' || identifier.startsWith('node:')) {
      const exports = identifier === 'node:fs/promises' ? fs : await import(identifier);
      const names = identifier === 'node:fs/promises'
        ? ['readFile', 'writeFile', 'copyFile', 'mkdir', 'rename', 'unlink', 'stat', 'readdir', 'open']
        : Object.keys(exports);
      const module = new SyntheticModule(names, function () { for (const name of names) this.setExport(name, exports[name]); }, { context, identifier });
      modules.set(identifier, module);
      return module;
    }
    const source = await nativeFs.readFile(fileURLToPath(identifier), 'utf8');
    const module = new SourceTextModule(source, { context, identifier, initializeImportMeta: meta => { meta.url = identifier; } });
    modules.set(identifier, module);
    return module;
  }
  const module = await get(pathToFileURL(filename).href);
  await module.link((specifier, parent) => get(specifier.startsWith('node:') ? specifier : new URL(specifier, parent.identifier).href));
  await module.evaluate();
  return module.namespace;
}

const cap = 10 * 1024 * 1024;
const fixtureRoot = path.join(root, '.superpowers/sdd/2026-10-21-medical/virtual-only');
const options = { publicRoot: path.join(fixtureRoot, 'public'), provenance: path.join(fixtureRoot, 'provenance.json'), lockPaths: { imported: path.join(fixtureRoot, 'imported.json'), inventory: path.join(fixtureRoot, 'inventory.json') } };
const target = id => path.join(options.publicRoot, 'heroes', `${id}.webp`);
const entry = (id, text, revision = 2) => {
  const output = Buffer.from(text);
  return { output, record: { id, revision, bytes: output.length, posterSha256: hash(output) } };
};
async function publicationFixture(records = []) {
  const fs = new MemoryFs();
  fs.put(options.provenance, JSON.stringify(records));
  fs.directories.add(options.publicRoot);
  fs.directories.add(path.join(options.publicRoot, 'heroes'));
  const module = await loadModule(path.join(scripts, 'hero-poster-publication.mjs'), fs);
  return { fs, publish: entries => module.publishHeroPosters(entries, options) };
}
const writeEvents = fs => fs.events.filter(e => ['writeFile', 'rename'].includes(e.op) && !e.target.endsWith('.lock'));
export { root, scripts, hash, emit, deferred, MemoryFs, loadModule, options, target, entry, publicationFixture, writeEvents, sourceDigests };

if (!process.argv.includes('--review-helpers-only')) {
// Real corpus, native sharp, no generated images or changes to tracked assets.
for (const name of ['poster.png', 'original-poster.webp']) {
  const bytes = await nativeFs.readFile(path.join(root, 'apps/media/sources/medical', name));
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0, opaque = 0, green = 0, red = 0, redAnywhere = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    const [r, g, b, a] = data.subarray(i, i + 4);
    if (a < 16) transparent++;
    if (a > 240) opaque++;
    if (a >= 200 && r > 95 && r > g * 1.6 && r > b * 1.6) redAnywhere++;
    if (x < info.width * .45 || x > info.width * .72 || y < info.height * .25 || y > info.height * .72 || a < 200) continue;
    if (r > 95 && r > g * 1.6 && r > b * 1.6) red++;
    if (g > 35 && g > r * 1.3 && g > b * 1.05) green++;
  }
  emit('actual-image', { name, bytes: bytes.length, sha256: hash(bytes), width: info.width, height: info.height, transparent, opaque, green, redBadge: red, redAnywhere });
}
const actualPoster = await nativeFs.readFile(path.join(root, 'apps/web/public/heroes/medical.webp'));
emit('actual-published-poster', { bytes: actualPoster.length, sha256: hash(actualPoster), metadata: await sharp(actualPoster).metadata() });

{
  const { fs, publish } = await publicationFixture();
  const reached = deferred(), release = deferred();
  let paused = false;
  fs.hook = async (op, p) => { if (!paused && op === 'readFile' && p === options.provenance) { paused = true; reached.resolve(); await release.promise; } };
  const prepared = entry('medical', 'SNAPSHOT');
  const expected = Buffer.from(prepared.output), expectedRecord = structuredClone(prepared.record);
  const job = publish([prepared]);
  await reached.promise;
  prepared.output.fill(0); prepared.record.id = 'escape'; prepared.record.revision = 999;
  release.resolve(); await job;
  assert.deepEqual(fs.get(target('medical')), expected);
  assert.deepEqual(JSON.parse(fs.get(options.provenance)), [expectedRecord]);
  emit('publisher-input-snapshot', { status: 'PASS', mutationWhileWaiting: 'original output and record preserved' });
}

{
  const prior = entry('medical', 'before', 3);
  const { fs, publish } = await publicationFixture([prior.record]);
  fs.put(target('medical'), prior.output);
  for (const candidate of [entry('medical', 'stale', 2), entry('medical', 'same-revision-changed', 3)]) {
    await assert.rejects(publish([candidate]), /downgrade|new source revision/);
    assert.deepEqual(fs.get(target('medical')), prior.output);
  }
  assert.equal(writeEvents(fs).length, 0);
  emit('numeric-stale-revision', { status: 'PASS', nonLockWrites: writeEvents(fs).length });
}

{
  const { fs, publish } = await publicationFixture();
  const reached = deferred(), release = deferred();
  let paused = false;
  fs.hook = async (op, p) => { if (!paused && op === 'readFile' && p === options.provenance) { paused = true; reached.resolve(); await release.promise; } };
  const first = publish([entry('medical', 'FIRST', 3)]);
  await reached.promise;
  const second = publish([entry('medical', 'SECOND', 2)]);
  release.resolve(); await first;
  await assert.rejects(second, /downgrade/);
  assert.equal(fs.get(target('medical')).toString(), 'FIRST');
  emit('concurrent-publishers-stale-revision', { status: 'PASS', openAttempts: fs.events.filter(e => e.op === 'open').length });
}

{
  const { fs, publish } = await publicationFixture();
  fs.put(path.join(options.publicRoot, 'filler.bin'), Buffer.alloc(cap - 8));
  const reached = deferred(), release = deferred();
  let paused = false;
  fs.hook = async (op, p) => { if (!paused && op === 'readFile' && p === options.provenance) { paused = true; reached.resolve(); await release.promise; } };
  const first = publish([entry('medical', '12345678')]);
  await reached.promise;
  const second = publish([entry('house', '1')]);
  release.resolve(); await first;
  await assert.rejects(second, /10MiB public budget/);
  assert.equal(fs.files.has(target('house')), false);
  assert.equal(JSON.parse(fs.get(options.provenance)).length, 1);
  emit('concurrent-live-budget-before-write', { status: 'PASS', exactCapFirstPublish: true, rejectedSecondAssetAbsent: true });
}

{
  const { fs, publish } = await publicationFixture();
  const { withHeroManifestLock } = await loadModule(path.join(scripts, 'refined-hero-record.mjs'), fs);
  const reached = deferred(), release = deferred();
  const holder = withHeroManifestLock(async () => { reached.resolve(); await release.promise; fs.put(path.join(options.publicRoot, 'model.glb'), Buffer.alloc(cap)); }, options.lockPaths);
  await reached.promise;
  const queued = publish([entry('medical', '1')]);
  release.resolve(); await holder;
  await assert.rejects(queued, /10MiB public budget/);
  assert.equal(writeEvents(fs).length, 0);
  emit('shared-lock-model-writer-budget', { status: 'PASS', queuedPosterNonLockWrites: writeEvents(fs).length });
}

{
  for (const badId of ['../medical', '..\\medical', '/medical', 'medical.webp', 'medical%2fescape', 'medical:escape']) {
    const { fs, publish } = await publicationFixture();
    await assert.rejects(publish([entry(badId, 'bad')]), /Invalid poster id/);
    assert.equal(writeEvents(fs).length, 0);
  }
  emit('poster-id-path-containment', { status: 'PASS', cases: 6 });
}

{
  const prior = entry('medical', 'before', 3);
  const { fs, publish } = await publicationFixture([prior.record]);
  fs.put(target('medical'), prior.output);
  const candidate = entry('medical', 'same-number-different-bytes', '3');
  await publish([candidate]);
  assert.deepEqual(fs.get(target('medical')), candidate.output);
  emit('malformed-string-revision', { status: 'REPRODUCED', previousRevision: 3, submittedRevision: '3', changedBytesAccepted: true, limitation: 'requires a nonnumeric revision from a caller/config; actual current config uses numeric 2' });
}

{
  const prior = entry('medical', 'before', 3);
  const { fs, publish } = await publicationFixture([prior.record]);
  fs.put(target('medical'), prior.output);
  await publish([entry('medical', 'invalid-revision-wins', 'invalid')]);
  await publish([entry('medical', 'old-revision-now-wins', 1)]);
  assert.equal(JSON.parse(fs.get(options.provenance))[0].revision, 1);
  emit('invalid-revision-then-downgrade', { status: 'REPRODUCED', revisions: [3, 'invalid', 1], limitation: 'malformed configuration/caller input, not the actual current numeric config' });
}

// Exercise the unmodified package script with virtual files, not the real
// originals/package run delegated to the parent. Native WHATWG URL resolution.
const provenancePath = path.join(root, 'apps/media/hero-provenance.json');
const editedPath = path.join(root, 'apps/media/sources/medical/poster.png');
const destination = path.join(fixtureRoot, 'package');
const originalDirectory = path.join(fixtureRoot, 'originals');
const packageTarget = path.join(destination, 'Full-Resolution-Art/medical.png');
async function packageFixture(sourceFile = 'apps/media/sources/medical/poster.png') {
  const fs = new MemoryFs();
  const good = Buffer.from('validated-source');
  const record = { id: 'medical', sourceFile, source: 'legacy.png', sourceSha256: hash(good), posterSha256: hash(Buffer.from('poster')) };
  fs.put(provenancePath, JSON.stringify([record])); fs.put(editedPath, good);
  for (const item of ['apps/web/public/heroes/medical.webp', 'apps/web/public/heroes/medical.glb', 'apps/media/hyperframes/output/heroes/medical.mp4', 'apps/media/hero-models.json', 'apps/media/hyperframes/output/heroes/verification.json', 'apps/media/hero-turntables/ASSET-COLLECTION.md', 'docs/ASSET-CREDITS.md']) fs.put(path.join(root, item), item.endsWith('webp') ? 'poster' : 'fixture');
  return { fs, record, run: () => loadModule(path.join(scripts, 'package-hero-collection.mjs'), fs, ['node', 'package', destination, originalDirectory]) };
}
{
  for (const sourceFile of ['apps/media/sources/../escape.png', 'apps/media/sources/%2e%2e/escape.png', 'apps/media/sources-sibling/poster.png', 'https://example.invalid/poster.png']) {
    const { fs, run } = await packageFixture(sourceFile);
    await assert.rejects(run(), /stay within media sources/);
    assert.equal(fs.events.some(e => e.op === 'copyFile'), false);
  }
  const { fs, run } = await packageFixture('apps/media/sources/medical/%2fescape.png');
  await assert.rejects(run(), /encoded/);
  assert.equal(fs.events.some(e => e.op === 'copyFile'), false);
  emit('edited-source-url-lexical-containment', { status: 'PASS', cases: 5, limit: 'does not establish realpath containment for symlinks/junctions' });
}
{
  const { fs, record, run } = await packageFixture();
  const changed = Buffer.from('unvalidated-source');
  fs.hook = async (op, p) => { if (op === 'copyFile' && p === editedPath) fs.put(editedPath, changed); };
  await run();
  const packaged = fs.get(packageTarget);
  assert.notEqual(hash(packaged), record.sourceSha256);
  emit('package-source-mutation-after-validation', { status: 'REPRODUCED', validatedSha256: record.sourceSha256, packagedSha256: hash(packaged), packagedBytes: packaged.toString(), packageReportedSuccess: true });
}
{
  const { fs, record, run } = await packageFixture();
  fs.hook = async (op, p) => { if (op === 'copyFile' && p === provenancePath) fs.put(provenancePath, JSON.stringify([{ ...record, revision: 3, sourceSha256: hash(Buffer.from('next-source')), posterSha256: hash(Buffer.from('next-poster')) }])); };
  await run();
  const packagedManifest = JSON.parse(fs.get(path.join(destination, 'hero-provenance.json')))[0];
  assert.notEqual(hash(fs.get(packageTarget)), packagedManifest.sourceSha256);
  emit('package-live-manifest-race', { status: 'REPRODUCED', packageReportedSuccess: true, packageManifestDoesNotDescribeCopiedSource: true, limitation: 'live-manifest copy was already present before this diff; not a newly introduced regression' });
}

const finalDigests = await sourceDigests();
assert.deepEqual(finalDigests, initialDigests, 'reviewed source changed during probe run; evidence needs a rerun');
emit('review-source-digests', { status: 'PASS', sha256: finalDigests });
await nativeFs.writeFile(new URL('review-poster-probes.log', import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), filesystem: 'Only generated evidence log written; virtual fixtures never created on disk', results: report }, null, 2) + '\n');
}
