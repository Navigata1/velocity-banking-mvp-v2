import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.argv.push('--review-helpers-only');
const { root, scripts, hash, deferred, MemoryFs, loadModule, options, target, entry, publicationFixture, writeEvents, sourceDigests } = await import('./review-poster-probes.mjs');
process.argv.pop();
const initialDigests = await sourceDigests();
const results = [];
const emit = (name, details) => {
  const row = { name, ...details };
  results.push(row);
  console.log(JSON.stringify(row));
};

const malformed = ['3', 'invalid', null, 0, -1, 2.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, true, false, {}, []];
{
  const before = entry('medical', 'before', 3);
  for (const revision of malformed) {
    const { fs, publish } = await publicationFixture([before.record]);
    fs.put(target('medical'), before.output);
    await assert.rejects(publish([entry('medical', 'changed', revision)]), /positive safe integer/);
    assert.deepEqual(fs.get(target('medical')), before.output);
    assert.equal(writeEvents(fs).length, 0);
    assert.equal(fs.events.some(e => e.op === 'open'), false);
  }
  emit('incoming-revisions-reject-before-lock-or-output', { status: 'PASS', cases: malformed.length });
}
{
  const before = entry('medical', 'before', 3);
  let cases = 0;
  for (const id of ['medical', 'unrelated']) for (const revision of malformed.filter(Number.isFinite).concat(['3', 'invalid', null, true, false, {}, []])) {
    const stored = entry(id, 'stored', revision).record;
    const { fs, publish } = await publicationFixture([stored]);
    fs.put(target('medical'), before.output);
    const provenanceBefore = fs.get(options.provenance);
    await assert.rejects(publish([entry('medical', 'changed', 4)]), /positive safe integer/);
    assert.deepEqual(fs.get(target('medical')), before.output);
    assert.deepEqual(fs.get(options.provenance), provenanceBefore);
    assert.equal(writeEvents(fs).length, 0);
    cases++;
  }
  emit('stored-revisions-all-records-before-output', { status: 'PASS', cases, unrelatedRecordsIncluded: true });
}
{
  const legacy = entry('medical', 'legacy');
  delete legacy.record.revision;
  const { fs, publish } = await publicationFixture([legacy.record]);
  fs.put(target('medical'), legacy.output);
  const candidate = entry('medical', 'legacy-replacement');
  delete candidate.record.revision;
  await publish([candidate]);
  assert.deepEqual(fs.get(target('medical')), candidate.output);
  const newer = entry('medical', 'revision-two', 2);
  await publish([newer]);
  await assert.rejects(publish([candidate]), /downgrade/);
  assert.deepEqual(fs.get(target('medical')), newer.output);
  emit('legacy-undefined-revision', { status: 'PASS', missingRevisionMeansOne: true, downgradeFromTwoRejected: true });
}
{
  const { fs, publish } = await publicationFixture();
  const reached = deferred(), release = deferred();
  let paused = false;
  fs.hook = async (op, p) => { if (!paused && op === 'readFile' && p === options.provenance) { paused = true; reached.resolve(); await release.promise; } };
  const candidate = entry('medical', 'SNAPSHOT', 2), bytes = Buffer.from(candidate.output), record = structuredClone(candidate.record);
  const job = publish([candidate]); await reached.promise;
  candidate.output.fill(0); candidate.record.revision = 'invalid';
  release.resolve(); await job;
  assert.deepEqual(fs.get(target('medical')), bytes);
  assert.deepEqual(JSON.parse(fs.get(options.provenance)), [record]);
  emit('publisher-snapshot-still-preserved', { status: 'PASS' });
}
{
  const { fs, publish } = await publicationFixture();
  const reached = deferred(), release = deferred();
  let paused = false;
  fs.hook = async (op, p) => { if (!paused && op === 'readFile' && p === options.provenance) { paused = true; reached.resolve(); await release.promise; } };
  const first = publish([entry('medical', 'revision-three', 3)]); await reached.promise;
  const second = publish([entry('medical', 'revision-two', 2)]);
  release.resolve(); await first;
  await assert.rejects(second, /downgrade/);
  assert.equal(JSON.parse(fs.get(options.provenance))[0].revision, 3);
  emit('queued-publisher-rechecks-revision', { status: 'PASS' });
}

const manifest = path.join(root, 'apps/media/hero-provenance.json');
const modelManifest = path.join(root, 'apps/media/hero-models.json');
const videoManifest = path.join(root, 'apps/media/hyperframes/output/heroes/verification.json');
const source = path.join(root, 'apps/media/sources/medical/poster.png');
const poster = path.join(root, 'apps/web/public/heroes/medical.webp');
const model = path.join(root, 'apps/web/public/heroes/medical.glb');
const video = path.join(root, 'apps/media/hyperframes/output/heroes/medical.mp4');
const destination = path.join(root, '.superpowers/sdd/2026-10-21-medical/virtual-rereview-only/package');
const lock = path.join(root, 'apps/media/hero-imported.json.lock');
const normalize = value => path.resolve(value instanceof URL ? fileURLToPath(value) : value);
function packageFixture(sourceFile = 'apps/media/sources/medical/poster.png') {
  const fs = new MemoryFs();
  const payloads = new Map([[source, Buffer.from('validated-source')], [poster, Buffer.from('validated-poster')], [model, Buffer.from('validated-model')], [video, Buffer.from('validated-video')]]);
  const hero = { id: 'medical', revision: 2, sourceFile, source: 'legacy.png', sourceSha256: hash(payloads.get(source)), posterSha256: hash(payloads.get(poster)), bytes: payloads.get(poster).length };
  fs.put(manifest, JSON.stringify([hero]));
  fs.put(modelManifest, JSON.stringify([{ id: 'medical', sha256: hash(payloads.get(model)) }]));
  fs.put(videoManifest, JSON.stringify([{ id: 'medical', sha256: hash(payloads.get(video)) }]));
  for (const [filename, bytes] of payloads) fs.put(filename, bytes);
  fs.put(path.join(root, 'apps/media/hero-turntables/ASSET-COLLECTION.md'), 'README');
  fs.put(path.join(root, 'docs/ASSET-CREDITS.md'), 'CREDITS');
  const manifests = new Map([manifest, modelManifest, videoManifest].map(filename => [filename, fs.get(filename)]));
  return { fs, payloads, manifests, hero, run: () => loadModule(path.join(scripts, 'package-hero-collection.mjs'), fs, ['node', 'package', destination, 'unused-originals']) };
}
{
  const { fs, payloads, manifests, run } = packageFixture();
  const capturedPaths = new Set([...payloads.keys(), ...manifests.keys()]);
  const mutatedPaths = new Set();
  const nativeRead = fs.readFile;
  fs.readFile = async (filename, encoding) => {
    const bytes = await nativeRead(filename, encoding);
    const resolved = normalize(filename);
    if (capturedPaths.has(resolved)) {
      fs.put(resolved, 'MUTATED-AFTER-READ');
      mutatedPaths.add(resolved);
    }
    return bytes;
  };
  fs.hook = async (op, filename) => {
    if (['readFile', 'writeFile', 'mkdir'].includes(op) && filename !== lock) assert.equal(fs.files.has(lock), true, 'package I/O escaped existing shared lock');
  };
  await run();
  const delivered = [
    ['Full-Resolution-Art/medical.png', source], ['Web-Posters/medical.webp', poster],
    ['3D-Studies/medical.glb', model], ['Turntables/medical.mp4', video],
    ['hero-provenance.json', manifest], ['hero-models.json', modelManifest], ['verification.json', videoManifest],
  ];
  for (const [output, input] of delivered) {
    assert.deepEqual(fs.get(path.join(destination, output)), payloads.get(input) ?? manifests.get(input));
    assert.equal(fs.events.filter(e => e.op === 'readFile' && e.target === input).length, 1);
  }
  assert.equal(mutatedPaths.size, 7, 'every payload and manifest must actually mutate after its read');
  assert.equal(fs.files.has(lock), false);
  emit('package-all-payload-and-manifest-snapshots', { status: 'PASS', capturesAndDeliveries: delivered.length, pathsActuallyMutated: mutatedPaths.size, allReadsAndWritesLocked: true, singleReadPerPayloadAndManifest: true });
}
{
  for (const corruptedPath of [source, poster, model, video]) {
    const { fs, run } = packageFixture();
    fs.put(corruptedPath, 'BAD-BYTES');
    await assert.rejects(run(), /Package source hash mismatch/);
    assert.equal(fs.events.some(e => e.op === 'writeFile' && e.target === path.join(destination, 'hero-provenance.json')), false);
    assert.equal(fs.files.has(lock), false);
  }
  emit('package-rejects-corrupt-source-poster-model-video', { status: 'PASS', cases: 4, capturedManifestNotPublishedOnFailure: true, limit: 'earlier individual output files can remain; no collection transaction is claimed' });
}
{
  for (const sourceFile of ['apps/media/sources/../escape.png', 'apps/media/sources/%2e%2e/escape.png', 'apps/media/sources-sibling/poster.png', 'https://example.invalid/poster.png']) {
    const { fs, run } = packageFixture(sourceFile);
    await assert.rejects(run(), /stay within media sources/);
    assert.equal(fs.events.some(e => e.op === 'writeFile' && e.target !== lock), false);
  }
  emit('package-lexical-containment-retained', { status: 'PASS', cases: 4, limit: 'realpath/symlink/junction containment not established' });
}
{
  const { fs, run } = packageFixture();
  const reached = deferred(), release = deferred();
  let paused = false;
  fs.hook = async (op, filename) => {
    if (!paused && op === 'readFile' && filename === source) { paused = true; reached.resolve(); await release.promise; }
  };
  const packaging = run(); await reached.promise;
  const publisher = await loadModule(path.join(scripts, 'hero-poster-publication.mjs'), fs);
  const next = entry('medical', 'next-poster', 3);
  const publication = publisher.publishHeroPosters([next], { publicRoot: path.join(root, 'apps/web/public'), provenance: manifest });
  release.resolve(); await packaging; await publication;
  const packagedRecord = JSON.parse(fs.get(path.join(destination, 'hero-provenance.json')))[0];
  assert.equal(packagedRecord.revision, 2);
  assert.equal(hash(fs.get(path.join(destination, 'Web-Posters/medical.webp'))), packagedRecord.posterSha256);
  assert.equal(JSON.parse(fs.get(manifest))[0].revision, 3);
  emit('package-and-publisher-use-same-existing-lock', { status: 'PASS', packageRevision: 2, laterLiveRevision: 3, packagePosterMatchesCapturedRecord: true });
}

const finalDigests = await sourceDigests();
assert.deepEqual(finalDigests, initialDigests, 'source changed during review run');
emit('review-source-digests', { status: 'PASS', sha256: finalDigests });
await writeFile(new URL('review-poster-rereview.log', import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), filesystem: 'virtual-only fixtures; only this permitted scratch log written', results }, null, 2) + '\n');
