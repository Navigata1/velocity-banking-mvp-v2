import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const repo = new URL('../../../', import.meta.url), req = createRequire(new URL('apps/media/package.json', repo));
const { NodeIO } = await import(pathToFileURL(req.resolve('@gltf-transform/core'))), { ALL_EXTENSIONS } = await import(pathToFileURL(req.resolve('@gltf-transform/extensions'))), { MeshoptDecoder } = await import(pathToFileURL(req.resolve('meshoptimizer')));
const read = p => readFileSync(new URL(p, repo)), sha = b => createHash('sha256').update(b).digest('hex'), git = args => execFileSync('git', args, { cwd: fileURLToPath(repo), windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
const bytes = read('apps/web/public/heroes/personal.glb'), gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
await MeshoptDecoder.ready; const document = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).readBinary(bytes), root = document.getRoot();
const rows = [], actualPosition = new Set(), actualUv = new Set();
for (const mesh of gltf.meshes) for (const p of mesh.primitives) {
  const position = gltf.accessors[p.attributes.POSITION]; assert.equal(position.componentType, 5122); assert.equal(position.normalized, true); actualPosition.add(p.attributes.POSITION);
  if (p.attributes.TEXCOORD_0 !== undefined) { const uv = gltf.accessors[p.attributes.TEXCOORD_0]; assert.equal(uv.componentType, 5123); assert.equal(uv.normalized, true); actualUv.add(p.attributes.TEXCOORD_0); }
}
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
  const uv = p.getAttribute('TEXCOORD_0'); let min = Infinity, max = -Infinity;
  if (p.getMaterial().getBaseColorTexture()) assert.ok(uv);
  if (uv) for (let i = 0; i < uv.getCount(); i++) for (const v of uv.getElement(i, [])) { assert.ok(Number.isFinite(v) && v >= 0 && v <= 1); min = Math.min(min, v); max = Math.max(max, v); }
  rows.push({ vertices: p.getAttribute('POSITION').getCount(), uvType: uv?.getComponentType(), uvNormalized: uv?.getNormalized(), uvRange: uv ? [min, max] : null });
}
const count = mesh => mesh.listPrimitives().reduce((s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
let actual = 0; const batches = [];
function visit(n) { const batch = n.getExtension('EXT_mesh_gpu_instancing'), attributes = batch?.listAttributes() ?? [], instances = attributes[0]?.getCount() ?? 1; assert.ok(attributes.every(a => a.getCount() === instances)); if (n.getMesh()) { actual += count(n.getMesh()) * instances; if (batch) batches.push({ node: n.getName(), instances, baseTriangles: count(n.getMesh()), instantiatedTriangles: count(n.getMesh()) * instances }); } n.listChildren().forEach(visit); }
root.listScenes().forEach(s => s.listChildren().forEach(visit)); const unique = root.listMeshes().reduce((s, m) => s + count(m), 0);
assert.equal(unique, 15696); assert.equal(actual, 28760); assert.equal(batches.find(b => b.node === 'P-Stitches').instances, 470); assert.ok(unique <= 65000 && actual <= 65000); assert.ok(bytes.length <= 524288);
function size(url) { return readdirSync(url, { withFileTypes: true }).reduce((s, e) => { const p = new URL(e.name + (e.isDirectory() ? '/' : ''), url); return s + (e.isDirectory() ? size(p) : statSync(p).size); }, 0); }
const total = size(new URL('apps/web/public/', repo)); assert.ok(total <= 10485760);
const protectedRecords = [], current = JSON.parse(read('apps/media/hero-models.json')), previous = JSON.parse(git(['show', 'HEAD:apps/media/hero-models.json']));
for (const old of previous.filter(r => r.id !== 'personal')) { assert.deepEqual(current.find(r => r.id === old.id), old); const path = 'apps/web/public/heroes/' + old.id + '.glb'; assert.equal(sha(read(path)), sha(git(['show', 'HEAD:' + path]))); protectedRecords.push({ id: old.id, sha256: sha(read(path)) }); }
const importedBefore = JSON.parse(git(['show', 'HEAD:apps/media/hero-imported.json'])), importedNow = JSON.parse(read('apps/media/hero-imported.json')); assert.deepEqual(importedNow.filter(r => r.id !== 'personal'), importedBefore.filter(r => r.id !== 'personal'));
const posters = previous.map(r => ({ path: 'apps/web/public/heroes/' + r.id + '.webp' })); for (const p of posters) { p.sha256 = sha(read(p.path)); assert.equal(p.sha256, sha(git(['show', 'HEAD:' + p.path]))); }
const changed = git(['diff', '--name-only', 'HEAD']).toString().trim().split(/\r?\n/).filter(Boolean); assert.ok(changed.every(p => ['apps/media/hero-models.json', 'apps/media/hero-imported.json', 'apps/web/public/heroes/personal.glb'].includes(p)));
console.log(JSON.stringify({ probe: 'actual-accessors-budgets-and-protection', status: 'PASS', modelSha256: sha(bytes), head: git(['rev-parse', 'HEAD']).toString().trim(), modelBytes: bytes.length, modelHeadroom: 524288 - bytes.length, publicBytes: total, publicHeadroom: 10485760 - total, uniqueTriangles: unique, instantiatedTriangles: actual, batches, actualPositionAccessorCount: actualPosition.size, actualUvAccessorCount: actualUv.size, rows, protectedRecords, posters, changedTracked: changed, note: 'Unused floating-point accessors are not evidence of actual POSITION/UV precision; only mesh-referenced accessors checked. No geometry topology/contact checks or rebuild executed.' }, null, 2));
