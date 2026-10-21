import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const req = createRequire(path.resolve('apps/media/package.json'));
const { NodeIO } = await import(pathToFileURL(req.resolve('@gltf-transform/core')));
const { ALL_EXTENSIONS } = await import(pathToFileURL(req.resolve('@gltf-transform/extensions')));
const { MeshoptDecoder } = await import(pathToFileURL(req.resolve('meshoptimizer')));
const { Matrix3, Matrix4, Vector3: V, Quaternion } = await import(pathToFileURL(path.resolve('apps/web/node_modules/three/build/three.module.js')));
const hash = b => createHash('sha256').update(b).digest('hex');
const paths = ['apps/web/public/heroes/personal.glb', 'apps/media/scripts/build-refined-personal.mjs', 'apps/media/scripts/personal-refinement.test.mjs', 'apps/media/scripts/personal-seating.test.mjs', 'apps/media/hero-imported.json'];
const inputs = await Promise.all(paths.map(p => readFile(p)));
const manifest = JSON.parse(inputs[4]), record = (Array.isArray(manifest) ? manifest : manifest.models).find(r => r.id === 'personal');
assert.equal(hash(inputs[0]), record.sha256);
assert.equal(hash(inputs[1].toString().replace(/\r\n/g, '\n')), record.sourceSha256);
console.log('PIN', JSON.stringify(paths.map((path, i) => ({ path, bytes: inputs[i].length, sha256: hash(inputs[i]) }))));
await MeshoptDecoder.ready;
const d = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).readBinary(inputs[0]);
const root = d.getRoot(), cross = ps => ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0]));
const vector = v => v.toArray().map(n => +n.toPrecision(10));
const sum = ns => ns.reduce((s, n) => s.add(n), new V());
function score(ps, ns) { const c = cross(ps); return { legacyScore: c.dot(sum(ns)) / c.length(), cosine: c.clone().normalize().dot(sum(ns).normalize()), area: c.length() / 2 }; }
// A counterexample distinguishes a genuinely nonuniform transform from the
// uniform quantization transforms actually observed on the satchel straps.
const syntheticP = [new V(0, 0, 0), new V(0, 0, 1), new V(1, -1, 0)], syntheticN = [0, 1, 2].map(() => new V(1, -2, 0).normalize());
const syntheticM = new Matrix4().makeScale(0.1, 10, 1), syntheticNM = new Matrix3().getNormalMatrix(syntheticM);
const syntheticRaw = score(syntheticP, syntheticN), syntheticWorld = score(syntheticP.map(p => p.clone().applyMatrix4(syntheticM)), syntheticN.map(n => n.clone().applyMatrix3(syntheticNM).normalize()));
assert.ok(syntheticRaw.legacyScore < -0.001 && syntheticWorld.legacyScore > 0.001);
console.log('NONUNIFORM_COUNTEREXAMPLE', JSON.stringify({ raw: syntheticRaw, world: syntheticWorld, hypotheticalOnly: true }));
const rawFailures = [], worldFailures = [], summaries = [], seen = new Set();
let expanded = 0, minimumWorld = Infinity, negativeDeterminants = 0, controls = 0;
function walk(node) {
  const mesh = node.getMesh(), batch = node.getExtension('EXT_mesh_gpu_instancing');
  if (mesh) {
    const base = new Matrix4().fromArray(node.getWorldMatrix()), instanceCount = batch?.listAttributes()[0]?.getCount() ?? 1;
    let nodeMin = Infinity, rawBad = 0, worldBad = 0, minArea = Infinity, actualControl = null;
    for (let instance = 0; instance < instanceCount; instance++) {
      const matrix = base.clone();
      if (batch) matrix.multiply(new Matrix4().compose(new V().fromArray(batch.getAttribute('TRANSLATION')?.getElement(instance, []) ?? [0, 0, 0]), new Quaternion().fromArray(batch.getAttribute('ROTATION')?.getElement(instance, []) ?? [0, 0, 0, 1]), new V().fromArray(batch.getAttribute('SCALE')?.getElement(instance, []) ?? [1, 1, 1])));
      const normalMatrix = new Matrix3().getNormalMatrix(matrix), determinant = matrix.determinant();
      if (determinant < 0) negativeDeterminants++;
      assert.ok(Number.isFinite(determinant) && Math.abs(determinant) > 1e-20);
      for (const [primitiveIndex, p] of mesh.listPrimitives().entries()) {
        const pos = p.getAttribute('POSITION'), normal = p.getAttribute('NORMAL'), ix = p.getIndices(), count = ix?.getCount() ?? pos.getCount();
        for (let i = 0; i < count; i += 3) {
          const ids = [0, 1, 2].map(j => ix ? ix.getScalar(i + j) : i + j), ps = ids.map(j => new V().fromArray(pos.getElement(j, []))), ns = ids.map(j => new V().fromArray(normal.getElement(j, [])));
          const wp = ps.map(p => p.clone().applyMatrix4(matrix));
          // Matches Three's normal matrix and vertex-stage normalization.
          const wn = ns.map(n => n.clone().applyMatrix3(normalMatrix).normalize());
          const r = score(ps, ns), w = score(wp, wn); expanded++; minArea = Math.min(minArea, w.area);
          if (w.area <= 1e-14) continue;
          nodeMin = Math.min(nodeMin, w.cosine); minimumWorld = Math.min(minimumWorld, w.cosine);
          if (/^P-Strap-[LR]$/.test(node.getName()) && (!actualControl || w.cosine < actualControl.worldCosine)) {
            actualControl = { face: i / 3, rawCosine: r.cosine, worldCosine: w.cosine,
              reversedWindingScore: score([wp[0], wp[2], wp[1]], wn).legacyScore,
              reversedNormalsScore: score(wp, wn.map(n => n.clone().negate())).legacyScore };
          }
          const rawBadHere = cross(ps).lengthSq() >= 1e-18 && r.legacyScore < -0.001;
          if (w.legacyScore < -0.001) { worldBad++; worldFailures.push({ node: node.getName(), instance, primitiveIndex, face: i / 3, raw: r, world: w }); }
          const key = root.listMeshes().indexOf(mesh) + '/' + primitiveIndex + '/' + i;
          if (rawBadHere && !seen.has(key)) {
            seen.add(key); rawBad++;
            const preNormalize = score(wp, ns.map(n => n.clone().applyMatrix3(normalMatrix)));
            const wrongForward = score(wp, ns.map(n => n.clone().transformDirection(matrix)));
            const uniform = new Matrix4().makeRotationY(0.43).scale(new V(2, 2, 2)), uniformNormal = new Matrix3().getNormalMatrix(uniform);
            const uniformScore = score(ps.map(p => p.clone().applyMatrix4(uniform)), ns.map(n => n.clone().applyMatrix3(uniformNormal).normalize()));
            assert.ok(Math.abs(uniformScore.cosine - r.cosine) < 1e-4, 'uniform transformation must preserve the raw angle');
            if (w.cosine > 0.01) {
              assert.ok(score([wp[0], wp[2], wp[1]], wn).legacyScore < -0.001, 'reversed actual indices must fail corrected oracle');
              assert.ok(score(wp, wn.map(n => n.clone().negate())).legacyScore < -0.001, 'reversed actual normals must fail corrected oracle');
              controls += 2;
            }
            rawFailures.push({ node: node.getName(), primitiveIndex, face: i / 3, indices: ids, raw: r, world: w, worldWithoutVertexNormalize: preNormalize, incorrectForwardNormalTransform: wrongForward, worldMatrix: matrix.toArray(), determinant, nodeScale: node.getScale(), rawPoints: ps.map(vector), rawNormals: ns.map(vector), worldPoints: wp.map(vector), worldNormals: wn.map(vector) });
          }
        }
      }
    }
    if (actualControl) {
      assert.ok(actualControl.reversedWindingScore < -0.001);
      assert.ok(actualControl.reversedNormalsScore < -0.001); controls += 2;
    }
    const columns = [0, 1, 2].map(i => new V().setFromMatrixColumn(base, i));
    summaries.push({ node: node.getName(), instances: instanceCount, rawUniqueFailures: rawBad, worldFailures: worldBad, minimumWorldCosine: nodeMin, minimumWorldTriangleArea: minArea, nodeColumnLengths: columns.map(c => c.length()), columnOrthogonality: [columns[0].dot(columns[1]), columns[0].dot(columns[2]), columns[1].dot(columns[2])], actualControl, worldMatrix: base.toArray() });
  }
  node.listChildren().forEach(walk);
}
root.listScenes().forEach(s => s.listChildren().forEach(walk));
console.log('RESULT', JSON.stringify({ glb: hash(inputs[0]), expandedTriangles: expanded, rawUniqueFailures: rawFailures.length, worldFailures: worldFailures.length, minimumWorldCosine: minimumWorld, negativeDeterminants, controlledReversalsRejected: controls, nodes: summaries }));
for (const r of rawFailures) console.log('RAW_FAIL_WORLD_WITNESS', JSON.stringify(r));
for (const r of worldFailures.slice(0, 20)) console.log('TRUE_WORLD_FAILURE', JSON.stringify(r));
for (let i = 0; i < paths.length; i++) assert.equal(hash(await readFile(paths[i])), hash(inputs[i]), 'input changed during check: ' + paths[i]);
console.log('END', JSON.stringify({ inputsUnchanged: true, fullGeometryClearance: false, writes: false }));
