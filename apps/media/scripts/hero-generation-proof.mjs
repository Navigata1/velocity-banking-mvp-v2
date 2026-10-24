import assert from 'node:assert/strict';
import { lstat, realpath, open, mkdir, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { expectedInputs } from './hero-generation-inputs.mjs';
export { expectedInputs };

function keys(value, names) {
  assert.ok(value && Object.getPrototypeOf(value) === Object.prototype, 'expected plain record');
  assert.deepEqual(Object.keys(value).sort(), [...names].sort(), 'invalid record fields');
}
function relative(name) {
  assert.equal(typeof name, 'string', 'path must be a string');
  for (const part of name.split('/')) {
    assert.ok(part && part !== '.' && part !== '..' && !/[<>:"|?*\\%\x00-\x1f]/.test(part) && !/[. ]$/.test(part), 'unsafe relative path');
    assert.ok(!/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part), 'reserved path');
  }
  return name;
}
function contract(value) {
  keys(value, ['type', 'version', 'outputParent', 'heroes', 'files', 'runtimeTrees']);
  assert.ok(Array.isArray(value.heroes));
  const expected = expectedInputs(value.heroes.map(hero => hero.id));
  assert.deepEqual(value, expected, 'incomplete or unsupported input contract');
  for (const file of expected.files) relative(file);
  return expected;
}
async function safe(root, name, directory = false) {
  relative(name);
  assert.equal(await realpath(root), root, 'root contains symlink or alias');
  assert.ok(!(await lstat(root)).isSymbolicLink(), 'root symlink');
  let full = root;
  const parts = name.split('/');
  for (let i = 0; i < parts.length; i++) {
    full = path.join(full, parts[i]);
    const stat = await lstat(full);
    assert.ok(!stat.isSymbolicLink(), `symlink rejected: ${name}`);
    if (directory || i < parts.length - 1) assert.ok(stat.isDirectory(), 'expected directory');
    else assert.ok(stat.isFile() && stat.nlink === 1, 'expected single-link regular file');
  }
  assert.equal(await realpath(full), full, 'escaping or aliased inventory path');
  return full;
}
async function readFingerprint(full, name, allowEmpty = false) {
  const file = await open(full, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const before = await file.stat();
    assert.ok(before.isFile() && before.nlink === 1, 'expected single-link regular file');
    let bytes = 0; const digest = createHash('sha256');
    for await (const chunk of file.createReadStream({ autoClose: false })) { bytes += chunk.length; digest.update(chunk); }
    const after = await file.stat(), current = await lstat(full);
    assert.ok(current.isFile() && !current.isSymbolicLink() && current.nlink === 1, 'expected single-link regular file');
    assert.equal(await realpath(full), full, 'escaping or aliased inventory path');
    assert.equal(before.dev, current.dev); assert.equal(before.ino, current.ino);
    assert.equal(before.mtimeMs, after.mtimeMs); assert.equal(after.mtimeMs, current.mtimeMs);
    assert.equal(after.size, bytes); assert.equal(before.size, bytes); assert.equal(current.size, bytes);
    assert.ok(allowEmpty || bytes > 0, 'empty file');
    return { path: name, bytes, sha256: digest.digest('hex') };
  } finally { await file.close(); }
}
async function fingerprint(root, name) { return readFingerprint(await safe(root, name), name); }
async function snapshotRuntime(root, expected) {
  const trees = [];
  for (const tree of expected.runtimeTrees) {
    const files = [];
    async function visit(name, full) {
      const entries = await readdir(full, { withFileTypes: true });
      entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      for (const entry of entries) {
        const child = name + '/' + entry.name, target = path.join(full, entry.name); relative(child);
        assert.ok(!entry.isSymbolicLink(), 'runtime symlink rejected: ' + child);
        if (entry.isDirectory()) { assert.equal(await realpath(target), target, 'aliased runtime directory'); await visit(child, target); }
        else { assert.ok(entry.isFile(), 'runtime entry must be a regular file'); files.push(await readFingerprint(target, child, true)); }
      }
    }
    await visit(tree, await safe(root, tree, true));
    files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    assert.ok(files.length > 0, 'empty runtime tree');
    assert.equal(new Set(files.map(row => row.path.toLowerCase())).size, files.length, 'runtime path aliases');
    trees.push({ path: tree, files });
  }
  return trees;
}
async function snapshot(root, expected) {
  const inputs = [];
  for (const name of expected.files) inputs.push(await fingerprint(root, name));
  for (const hero of expected.heroes) {
    const hashes = [hero.model, hero.preparedModel, hero.renderModel].map(name => inputs.find(row => row.path === name).sha256);
    assert.ok(hashes.every(hash => hash === hashes[0]), 'model copies differ');
  }
  return inputs;
}
function fileRecord(value, allowEmpty = false) {
  keys(value, ['path', 'bytes', 'sha256']); relative(value.path);
  assert.ok(Number.isSafeInteger(value.bytes) && value.bytes >= 0 && (allowEmpty || value.bytes > 0), 'invalid byte length');
  assert.equal(typeof value.sha256, 'string'); assert.match(value.sha256, /^[0-9a-f]{64}$/);
}
function outputRows(expected, generation) {
  return expected.heroes.map(hero => ({ id: hero.id, path: `${expected.outputParent}/${generation}/${hero.id}.mp4` }));
}

/** Invoke only a trusted renderer; this cannot attest encoder execution or defend a hostile OS. */
export async function recordGeneration(root, expected, produce) {
  root = path.resolve(root); expected = contract(expected);
  assert.equal(typeof produce, 'function');
  const inputs = await snapshot(root, expected);
  const runtime = await snapshotRuntime(root, expected);
  await safe(root, expected.outputParent, true);
  const generation = randomUUID(), directory = `${expected.outputParent}/${generation}`;
  await mkdir(path.join(root, directory)); // Exclusive reservation; never reuse an old output directory.
  await safe(root, directory, true);
  const outputs = outputRows(expected, generation);
  await produce(Object.freeze(outputs.map(row => Object.freeze({ ...row }))));
  const heroes = [];
  for (const [i, output] of outputs.entries()) heroes.push({ id: output.id, model: expected.heroes[i].model, video: await fingerprint(root, output.path) });
  assert.deepEqual(await snapshot(root, expected), inputs, 'inputs changed during production');
  assert.deepEqual(await snapshotRuntime(root, expected), runtime, 'runtime inputs changed during production');
  return { type: 'hero-generation', version: 2, generation, inputs, runtime, heroes };
}

/** Expected inputs must come from the caller's trusted policy, never from a receipt. */
export async function verifyGeneration(root, expected, receipt) {
  root = path.resolve(root); expected = contract(expected);
  keys(receipt, ['type', 'version', 'generation', 'inputs', 'runtime', 'heroes']);
  assert.equal(receipt.type, 'hero-generation'); assert.equal(receipt.version, 2);
  assert.equal(typeof receipt.generation, 'string');
  assert.match(receipt.generation, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.ok(Array.isArray(receipt.inputs) && Array.isArray(receipt.heroes), 'invalid receipt arrays');
  for (const row of receipt.inputs) fileRecord(row);
  assert.ok(Array.isArray(receipt.runtime));
  assert.deepEqual(receipt.runtime.map(tree => tree.path), expected.runtimeTrees, 'incomplete runtime inventory');
  for (const tree of receipt.runtime) {
    keys(tree, ['path', 'files']); relative(tree.path); assert.ok(Array.isArray(tree.files) && tree.files.length > 0);
    for (const row of tree.files) fileRecord(row, true);
  }
  assert.deepEqual(receipt.inputs.map(row => row.path), expected.files, 'incomplete input inventory');
  assert.equal(receipt.heroes.length, expected.heroes.length, 'incomplete hero inventory');
  const outputs = outputRows(expected, receipt.generation);
  for (const [i, hero] of receipt.heroes.entries()) {
    keys(hero, ['id', 'model', 'video']); fileRecord(hero.video);
    assert.equal(hero.id, expected.heroes[i].id, 'duplicate or unexpected hero');
    assert.equal(hero.model, expected.heroes[i].model, 'unexpected model');
    assert.equal(hero.video.path, outputs[i].path, 'not a fresh generation output path');
  }
  assert.deepEqual(receipt.inputs, await snapshot(root, expected), 'inputs differ');
  assert.deepEqual(receipt.runtime, await snapshotRuntime(root, expected), 'runtime inputs differ');
  for (const hero of receipt.heroes) assert.deepEqual(hero.video, await fingerprint(root, hero.video.path), 'video differs');
  return true;
}
