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
assert.equal(sha(bytes), 'e079fc7b95c562fa6180434491cf3511d54fbf79cb155bf1d89c822bafe77b79');
await MeshoptDecoder.ready; const document = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).readBinary(bytes), root = document.getRoot();
const positionIds = new Set(), uvIds = new Set();
for (const m of gltf.meshes) for (const p of m.primitives) { const pos = gltf.accessors[p.attributes.POSITION]; assert.equal(pos.componentType, 5122); assert.equal(pos.normalized, true); positionIds.add(p.attributes.POSITION); if (p.attributes.TEXCOORD_0 !== undefined) { const uv = gltf.accessors[p.attributes.TEXCOORD_0]; assert.equal(uv.componentType, 5123); assert.equal(uv.normalized, true); uvIds.add(p.attributes.TEXCOORD_0); } }
let minNormal = Infinity, maxNormal = 0, minUv = Infinity, maxUv = -Infinity, texturedTriangles = 0, minUvArea = Infinity;
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
  const pos = p.getAttribute('POSITION'), uv = p.getAttribute('TEXCOORD_0'), normal = p.getAttribute('NORMAL'), ix = p.getIndices(); assert.ok(normal); assert.equal(p.getMode(), 4);
  for (const attr of p.listAttributes()) assert.ok([...attr.getArray()].every(Number.isFinite));
  for (let i = 0; i < normal.getCount(); i++) { const length = Math.hypot(...normal.getElement(i, [])); minNormal = Math.min(minNormal, length); maxNormal = Math.max(maxNormal, length); }
  if (uv) for (let i = 0; i < uv.getCount(); i++) for (const value of uv.getElement(i, [])) { assert.ok(value >= 0 && value <= 1); minUv = Math.min(minUv, value); maxUv = Math.max(maxUv, value); }
  if (!p.getMaterial().getBaseColorTexture()) continue; assert.ok(uv && uv.getCount() === pos.getCount());
  for (let i = 0; i < (ix?.getCount() ?? pos.getCount()); i += 3) {
    const ids = [0, 1, 2].map(j => ix ? ix.getScalar(i + j) : i + j), xyz = ids.map(j => pos.getElement(j, [])), a = xyz[1].map((v, j) => v - xyz[0][j]), b = xyz[2].map((v, j) => v - xyz[0][j]);
    if (Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]) / 2 < 1e-10) continue;
    const u = ids.map(j => uv.getElement(j, [])), area = Math.abs((u[1][0] - u[0][0]) * (u[2][1] - u[0][1]) - (u[1][1] - u[0][1]) * (u[2][0] - u[0][0])); assert.ok(area > 1e-12); minUvArea = Math.min(minUvArea, area); texturedTriangles++;
  }
}
assert.ok(minNormal > 0.98 && maxNormal < 1.02);
const count = m => m.listPrimitives().reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), unique = root.listMeshes().reduce((n, m) => n + count(m), 0); let actual = 0; const batches = [];
function visit(n) { const attributes = n.getExtension('EXT_mesh_gpu_instancing')?.listAttributes() ?? [], instances = attributes[0]?.getCount() ?? 1; assert.ok(attributes.every(a => a.getCount() === instances)); if (n.getMesh()) { actual += count(n.getMesh()) * instances; if (attributes.length) batches.push({ node: n.getName(), instances, baseTriangles: count(n.getMesh()), instantiatedTriangles: count(n.getMesh()) * instances }); } n.listChildren().forEach(visit); }
root.listScenes().forEach(s => s.listChildren().forEach(visit)); assert.equal(unique, 22016); assert.equal(actual, 33844); assert.equal(root.listMeshes().length, 29); assert.equal(batches.find(b => b.node === 'P-Stitches').instances, 459); assert.ok(unique <= 65000 && actual <= 65000); assert.equal(bytes.length, 519844); assert.ok(bytes.length <= 524288);
function size(url) { return readdirSync(url, { withFileTypes: true }).reduce((n, e) => { const p = new URL(e.name + (e.isDirectory() ? '/' : ''), url); return n + (e.isDirectory() ? size(p) : statSync(p).size); }, 0); }
const publicBytes = size(new URL('apps/web/public/', repo)); assert.equal(publicBytes, 10303650); assert.ok(publicBytes <= 10485760);
const current = JSON.parse(read('apps/media/hero-models.json')), previous = JSON.parse(git(['show', 'HEAD:apps/media/hero-models.json'])), protectedRecords = [], posters = [];
assert.equal(current.find(r => r.id === 'personal').triangles, unique); assert.equal(current.find(r => r.id === 'personal').meshes, 29);
for (const old of previous) { const poster = 'apps/web/public/heroes/' + old.id + '.webp'; assert.equal(sha(read(poster)), sha(git(['show', 'HEAD:' + poster]))); posters.push({ id: old.id, sha256: sha(read(poster)) }); if (old.id === 'personal') continue; assert.deepEqual(current.find(r => r.id === old.id), old); const model = 'apps/web/public/heroes/' + old.id + '.glb'; assert.equal(sha(read(model)), sha(git(['show', 'HEAD:' + model]))); protectedRecords.push({ id: old.id, sha256: sha(read(model)) }); }
assert.deepEqual(JSON.parse(read('apps/media/hero-imported.json')).filter(r => r.id !== 'personal'), JSON.parse(git(['show', 'HEAD:apps/media/hero-imported.json'])).filter(r => r.id !== 'personal'));
const changedTracked = git(['diff', '--name-only', 'HEAD']).toString().trim().split(/\r?\n/).filter(Boolean); assert.ok(changedTracked.every(p => ['apps/media/hero-models.json', 'apps/media/hero-imported.json', 'apps/web/public/heroes/personal.glb'].includes(p)));
const invariantFiles = ['apps/media/scripts/refined-hero-record.mjs', 'apps/media/scripts/build-hero-models.mjs', 'apps/media/sources/student-loan/leather.png', 'apps/media/sources/student-loan/materials.json']; for (const p of invariantFiles) assert.equal(sha(read(p)), sha(git(['show', 'HEAD:' + p])));
console.log(JSON.stringify({ probe: 'final-actual-precision-budgets-and-protection', status: 'PASS', modelSha256: sha(bytes), head: git(['rev-parse', 'HEAD']).toString().trim(), modelBytes: bytes.length, modelHeadroom: 524288 - bytes.length, publicBytes, publicHeadroom: 10485760 - publicBytes, meshes: root.listMeshes().length, uniqueTriangles: unique, instantiatedTriangles: actual, batches, precision: { actualPositionAccessors: positionIds.size, actualUvAccessors: uvIds.size, normalizedUvRange: [minUv, maxUv], decodedNormalLength: [minNormal, maxNormal], nondegenerateTexturedTriangles: texturedTriangles, minimumUvDoubleArea: minUvArea }, protectedRecords, posters, unchangedPrimaryFiles: invariantFiles, changedTracked, note: 'No topology/contact or closed-volume geometry tests duplicated; UV area and decoded normals checked for material transport only.' }, null, 2));
