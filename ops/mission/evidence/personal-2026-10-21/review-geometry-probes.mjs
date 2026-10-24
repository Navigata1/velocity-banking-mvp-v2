import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const cwd = process.cwd();
const req = createRequire(path.join(cwd, 'apps/media/package.json'));
const { NodeIO } = await import(pathToFileURL(req.resolve('@gltf-transform/core')));
const { ALL_EXTENSIONS } = await import(pathToFileURL(req.resolve('@gltf-transform/extensions')));
const { MeshoptDecoder } = await import(pathToFileURL(req.resolve('meshoptimizer')));
const { Vector3: V, Quaternion: Q, Matrix4: M, Triangle, Ray } = await import(pathToFileURL(path.join(cwd, 'apps/web/node_modules/three/build/three.module.js')));
const hash = b => createHash('sha256').update(b).digest('hex');
const paths = ['apps/web/public/heroes/personal.glb', 'apps/media/scripts/build-refined-personal.mjs', 'apps/media/scripts/personal-refinement.test.mjs'];
const input = await Promise.all(paths.map(p => readFile(p)));
console.log('INPUT', JSON.stringify(paths.map((p, i) => ({ path: p, bytes: input[i].length, sha256: hash(input[i]) }))));
await MeshoptDecoder.ready;
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).readBinary(input[0]);
const root = doc.getRoot(), named = name => root.listNodes().find(n => n.getName() === name);
const body = named('P-Body'), inverse = new M().fromArray(body.getWorldMatrix()).invert();
const vec = p => p.toArray().map(n => +n.toFixed(8));
const defects = [];
function check(label, fn) {
  try { fn(); console.log('GEOMETRY GREEN', label); }
  catch (e) { if (e.code !== 'ERR_ASSERTION') throw e; defects.push(label); console.log('GEOMETRY RED', label, e.message); }
}
function box(ts) {
  const min = new V(Infinity, Infinity, Infinity), max = new V(-Infinity, -Infinity, -Infinity);
  for (const t of ts) for (const p of t) { min.min(p); max.max(p); }
  return { min: vec(min), max: vec(max), span: vec(max.clone().sub(min)) };
}
function decode(node, { world = false } = {}) {
  const result = [], batch = node.getExtension('EXT_mesh_gpu_instancing');
  const base = new M().fromArray(node.getWorldMatrix());
  if (!world) base.premultiply(inverse);
  for (let instance = 0; instance < (batch?.listAttributes()[0]?.getCount() ?? 1); instance++) {
    const mat = base.clone();
    if (batch) mat.multiply(new M().compose(new V().fromArray(batch.getAttribute('TRANSLATION')?.getElement(instance, []) ?? [0, 0, 0]), new Q().fromArray(batch.getAttribute('ROTATION')?.getElement(instance, []) ?? [0, 0, 0, 1]), new V().fromArray(batch.getAttribute('SCALE')?.getElement(instance, []) ?? [1, 1, 1])));
    for (const prim of node.getMesh()?.listPrimitives() ?? []) {
      assert.equal(prim.getMode(), 4);
      const pos = prim.getAttribute('POSITION'), ix = prim.getIndices();
      for (let i = 0; i < (ix?.getCount() ?? pos.getCount()); i += 3) {
        const t = [0, 1, 2].map(j => new V().fromArray(pos.getElement(ix ? ix.getScalar(i + j) : i + j, [])).applyMatrix4(mat));
        t.instance = instance; t.id = i / 3; t.node = node.getName(); result.push(t);
      }
    }
  }
  for (const c of node.listChildren()) result.push(...decode(c, { world }));
  return result;
}
const meshes = root.listNodes().filter(n => n.getMesh()), cache = new Map(meshes.map(n => [n.getName(), decode(n)]));
const tris = name => cache.get(name), normals = t => t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0]));
const bb = t => [0, 1, 2].map(k => [Math.min(...t.map(p => p.getComponent(k))), Math.max(...t.map(p => p.getComponent(k)))]);
function overlap(a, b, eps = 1e-7) { return a.every(([lo, hi], k) => lo <= b[k][1] + eps && b[k][0] <= hi + eps); }
const meta = ts => ts.map(t => ({ t, b: bb(t) }));
function segmentHit(a, b, t) {
  const d = b.clone().sub(a), n = normals(t), denom = n.dot(d), nn = n.length();
  if (nn < 1e-12 || Math.abs(denom) < nn * 1e-10) return null;
  const f = n.dot(t[0].clone().sub(a)) / denom;
  if (f <= 1e-7 || f >= 1 - 1e-7) return null;
  const p = a.clone().addScaledVector(d, f), bc = Triangle.getBarycoord(p, ...t, new V());
  return bc && Math.min(...bc.toArray()) >= -1e-7 ? p : null;
}
function intersections(left, right = left) {
  const a = meta(left), b = left === right ? a : meta(right), hits = [];
  for (let i = 0; i < a.length; i++) for (let j = left === right ? i + 1 : 0; j < b.length; j++) {
    const x = a[i], y = b[j]; if (!overlap(x.b, y.b)) continue;
    if (left === right && x.t.some(p => y.t.some(q => p.distanceToSquared(q) < 1e-12))) continue;
    const points = [];
    for (const [u, v] of [[x.t, y.t], [y.t, x.t]]) for (let k = 0; k < 3; k++) {
      const p = segmentHit(u[k], u[(k + 1) % 3], v);
      if (p && !points.some(q => p.distanceTo(q) < 1e-6)) points.push(p);
    }
    if (points.length >= 2 && points[0].distanceTo(points[1]) > 2e-5) hits.push({ i, j, length: points[0].distanceTo(points[1]), points: points.map(vec) });
  }
  return hits;
}
function minimum(left, right) {
  let distance = Infinity, witness;
  const p = new V();
  for (const [a, b] of [[left, right], [right, left]]) for (const t of a) for (const v of t) for (const u of b) {
    const d = new Triangle(...u).closestPointToPoint(v, p).distanceTo(v);
    if (d < distance) { distance = d; witness = [vec(v), vec(p)]; }
  }
  const crossings = intersections(left, right);
  return { vertexFaceDistance: distance, crossings: crossings.length, witness, crossing: crossings[0] };
}
function rayHits(ts, origin, direction, cull = false) {
  const ray = new Ray(origin, direction.clone().normalize()), p = new V(), out = [];
  for (const t of ts) if (ray.intersectTriangle(...t, cull, p) && !out.some(q => q.distanceTo(p) < 2e-6)) out.push(p.clone());
  return out.sort((a, b) => origin.distanceTo(a) - origin.distanceTo(b));
}

// Probe 1: decoded numerical validity and full transform/count expansion.
let unique = 0, badUv = 0, uvCollapsed = 0, degenerate = 0, reversed = 0;
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
  const p = prim.getAttribute('POSITION'), n = prim.getAttribute('NORMAL'), uv = prim.getAttribute('TEXCOORD_0'), ix = prim.getIndices(); unique += ix.getCount() / 3;
  for (const semantic of prim.listSemantics()) { const a = prim.getAttribute(semantic); for (let i = 0; i < a.getCount(); i++) assert.ok(a.getElement(i, []).every(Number.isFinite), semantic); }
  if (uv) for (let i = 0; i < uv.getCount(); i++) if (uv.getElement(i, []).some(v => v < -1e-7 || v > 1 + 1e-7)) badUv++;
  for (let i = 0; i < ix.getCount(); i += 3) {
    const ids = [0, 1, 2].map(j => ix.getScalar(i + j)), t = ids.map(j => new V().fromArray(p.getElement(j, []))), cross = normals(t);
    if (cross.length() < 2e-10) { degenerate++; continue; }
    if (cross.dot(ids.reduce((a, j) => a.add(new V().fromArray(n.getElement(j, []))), new V())) < -cross.length() * 0.001) reversed++;
    if (uv && prim.getMaterial()?.getBaseColorTexture()) { const a = ids.map(j => uv.getElement(j, [])); if (Math.abs((a[1][0] - a[0][0]) * (a[2][1] - a[0][1]) - (a[1][1] - a[0][1]) * (a[2][0] - a[0][0])) <= 1e-12) uvCollapsed++; }
  }
}
console.log('PROBE1', JSON.stringify({ unique, instantiated: meshes.reduce((s, n) => s + decode(n).length, 0), meshes: root.listMeshes().length, maps: root.listTextures().length, instances: named('P-Stitches').getExtension('EXT_mesh_gpu_instancing').listAttributes()[0].getCount(), badUv, uvCollapsed, degenerate, reversed, worldBounds: box(meshes.flatMap(n => decode(n, { world: true }))), parts: meshes.map(n => ({ name: n.getName(), triangles: tris(n.getName()).length, bounds: box(tris(n.getName())) })) }));
const uv = named('P-Body').getMesh().listPrimitives()[0].getAttribute('TEXCOORD_0');
const uvMutation = doc.createAccessor().setType('VEC2').setArray(new Float32Array(Array.from({ length: uv.getCount() }, (_, i) => uv.getElement(i, [])).flat()));
uvMutation.setElement(0, [1.01, 0]); assert.ok(uvMutation.getElement(0, [])[0] > 1);
console.log('CONTROL1 true out-of-range UV mutation rejected by independent decoded bound');
const apertures = {};
for (const name of ['P-Handle-Ring-L', 'P-Handle-Ring-R', 'P-Shoulder-Ring-L', 'P-Shoulder-Ring-R', 'P-Buckle-L', 'P-Buckle-R', 'P-Key']) {
  const ts = tris(name), b = box(ts), center = new V(...b.min).add(new V(...b.max)).multiplyScalar(0.5), depth = name.includes('Shoulder') ? 0 : name === 'P-Key' ? 1 : 2;
  if (name === 'P-Key') center.x = b.min[0] + b.span[0] * 0.186;
  const axes = [0, 1, 2].filter(k => k !== depth);
  const mismatches = faces => Array.from({ length: 16 }, (_, i) => {
    const d = new V().setComponent(axes[0], Math.cos(i * Math.PI / 8)).setComponent(axes[1], Math.sin(i * Math.PI / 8)), both = rayHits(faces, center, d), front = rayHits(faces, center, d, true);
    return !both.length || !front.length || both[0].distanceTo(front[0]) > 1e-5;
  }).filter(Boolean).length;
  apertures[name] = { center: vec(center), radialInnerWallCullingMismatches: mismatches(ts), reversedControlMismatches: mismatches(ts.map(([a, b, c]) => [a, c, b])) };
  assert.equal(apertures[name].radialInnerWallCullingMismatches, 0);
  assert.ok(apertures[name].reversedControlMismatches > 0);
}
console.log('PROBE1_APERTURES', JSON.stringify(apertures));

// Probe 2: proper nonadjacent self-intersections and cross-part collisions.
const single = {};
for (const name of ['P-Body', 'P-Flap', 'P-Shoulder-Strap', 'P-Handle', 'P-Key', 'P-Strap-L', 'P-Buckle-L']) {
  const h = intersections(tris(name)); single[name] = { count: h.length, examples: h.slice(0, 4) };
}
const pairs = {};
for (const [a, b] of [['P-Flap', 'P-Body'], ['P-Shoulder-Strap', 'P-Body'], ['P-Shoulder-Strap', 'P-Flap'], ['P-Shoulder-Strap', 'P-Key'], ['P-Paper-Front', 'P-Flap'], ['P-Paper-Back', 'P-Flap'], ['P-Paper-Front', 'P-Body'], ['P-Paper-Back', 'P-Body']]) {
  const h = intersections(tris(a), tris(b)); pairs[a + '/' + b] = { count: h.length, bounds: h.length ? box(h.map(row => row.points.map(p => new V(...p)))) : null, examples: h.slice(0, 4) };
}
const t = tris('P-Shoulder-Strap'), mutated = [...t, ...t.map(f => f.map(p => new V(p.x, p.y + 0.03, p.z + 0.009)))];
assert.ok(intersections(mutated).length > 0, 'crossing folded duplicate must fail');
const translatedPaper = tris('P-Paper-Front').map(t => t.map(p => p.clone().add(new V(0, 0, 2))));
assert.equal(intersections(translatedPaper, tris('P-Flap')).length, 0, 'separated real-paper negative control');
console.log('PROBE2', JSON.stringify({ single, pairs, mutationCrossings: intersections(mutated).length, separatedPaperControl: 'zero crossings' }));
check('paper-front must not cut through flap', () => assert.equal(pairs['P-Paper-Front/P-Flap'].count, 0));
check('paper-back must not cut through flap', () => assert.equal(pairs['P-Paper-Back/P-Flap'].count, 0));

// Probe 3: unchecked small hardware and intended support distances.
const hardware = {};
for (const side of ['L', 'R']) for (const [part, support] of [['P-Handle-Rivet-', 'P-Handle-Tab-'], ['P-Shoulder-Rivet-', 'P-Shoulder-Tab-'], ['P-Strap-Keeper-', 'P-Strap-'], ['P-Buckle-Pin-', 'P-Strap-']]) hardware[part + side + '/' + support + side] = minimum(tris(part + side), tris(support + side));
const far = tris('P-Handle-Rivet-L').map(t => t.map(p => p.clone().add(new V(0, 0, 2))));
assert.ok(minimum(far, tris('P-Handle-Tab-L')).vertexFaceDistance > 1);
console.log('PROBE3', JSON.stringify({ hardware, detachedControl: 'rejected' }));

// Probe 4: every actual stitch instance against all supporting leather skins.
const skinNames = ['P-Body', 'P-Flap', 'P-Shoulder-Strap', 'P-Handle', 'P-Strap-L', 'P-Strap-R', ...['Handle', 'Shoulder'].flatMap(k => ['L', 'R'].map(s => 'P-' + k + '-Tab-' + s))];
const skins = skinNames.map(name => ({ name, ts: tris(name), b: bb(tris(name).flatMap(t => t)) }));
const allSkin = skins.flatMap(s => s.ts), stitchGroups = new Map();
for (const t of tris('P-Stitches')) { const a = stitchGroups.get(t.instance) ?? []; a.push(t); stitchGroups.set(t.instance, a); }
const directions = [new V(1, 0.371, 0.137), new V(0.213, 1, 0.417), new V(0.147, 0.319, 1)];
const stitchRows = [];
for (const [id, ts] of stitchGroups) {
  const points = ts.flat(), center = points.reduce((s, p) => s.add(p), new V()).divideScalar(points.length), p = new V();
  let min = Infinity, support;
  for (const skin of skins) for (const t of skin.ts) { const d = new Triangle(...t).closestPointToPoint(center, p).distanceTo(center); if (d < min) { min = d; support = skin.name; } }
  const inside = skins.filter(s => directions.filter(d => rayHits(s.ts, center, d).length % 2 === 1).length >= 2).map(s => s.name);
  const exposed = [new V(1, 0, 0), new V(-1, 0, 0), new V(0, 1, 0), new V(0, -1, 0), new V(0, 0, 1), new V(0, 0, -1)].some(d => !rayHits(allSkin, center, d).some(p => p.distanceTo(center) > 0.003 && p.distanceTo(center) < 5));
  stitchRows.push({ id, center: vec(center), min, support, inside, exposed });
}
const groups = {};
for (const [label, from, to] of [['front-panel', 0, 90], ['flap-edges', 90, 210], ['flap-lower', 210, 260], ['handle', 260, 310], ['front-straps', 310, 470]]) {
  const rows = stitchRows.slice(from, to); groups[label] = { count: rows.length, centersInsideLeather: rows.filter(r => r.inside.length).length, centersFartherThanRadius: rows.filter(r => r.min > 0.0024).length, exposedSixDirections: rows.filter(r => r.exposed).length, min: Math.min(...rows.map(r => r.min)), max: Math.max(...rows.map(r => r.min)), examples: rows.filter(r => r.min > 0.004 || (r.inside.length && r.min > 0.0024)).slice(0, 8) };
}
const farCenter = new V(0, 5, 0), cp = new V(); assert.ok(Math.min(...allSkin.map(t => new Triangle(...t).closestPointToPoint(farCenter, cp).distanceTo(farCenter))) > 2);
const handleThreads = [...stitchGroups].filter(([i]) => i >= 260 && i < 310).flatMap(([, ts]) => ts), handleSkin = tris('P-Handle');
const handleVertexDistances = handleThreads.flat().map(p => Math.min(...handleSkin.map(t => new Triangle(...t).closestPointToPoint(p, cp).distanceTo(p))));
const handleCrossings = intersections(handleThreads, handleSkin).length;
assert.equal(handleCrossings, 0);
const uniqueHandleVertices = [...new Map(handleThreads.flat().map(p => [vec(p).join(','), p])).values()];
const handleVerticesInside = uniqueHandleVertices.filter(p => directions.filter(d => rayHits(handleSkin, p, d).length % 2 === 1).length >= 2).length;
assert.equal(handleVerticesInside, uniqueHandleVertices.length);
const float = stitchRows.filter(r => !r.inside.length && r.min > 0.01);
const witness = stitchGroups.get(458), floatDistances = witness.flat().map(p => Math.min(...allSkin.map(t => new Triangle(...t).closestPointToPoint(p, cp).distanceTo(p))));
// A triangle lies inside its vertices' bounding ball. Distance-to-skin is
// 1-Lipschitz, so this proves separation of the whole thread, not just vertices.
const floatCenter = witness.flat().reduce((s, p) => s.add(p), new V()).divideScalar(witness.length * 3);
const floatRadius = Math.max(...witness.flat().map(p => p.distanceTo(floatCenter)));
const floatClearanceBound = stitchRows[458].min - floatRadius;
assert.ok(floatClearanceBound > 0);
console.log('PROBE4', JSON.stringify({ groups, detachedThreadControl: 'rejected', handleAllVertexDistance: { min: Math.min(...handleVertexDistances), max: Math.max(...handleVertexDistances), crossings: handleCrossings, allUniqueVerticesInside: handleVerticesInside, uniqueVertices: uniqueHandleVertices.length, bounds: box(handleThreads) }, floatCountCenterBeyond001: float.length, floatExample458: { ...stitchRows[458], allVertexDistance: { min: Math.min(...floatDistances), max: Math.max(...floatDistances) }, boundingBallRadius: floatRadius, wholeTriangleClearanceLowerBound: floatClearanceBound } }));
check('handle thread must not be entirely buried', () => assert.notEqual(handleVerticesInside, uniqueHandleVertices.length));
check('instance458 thread must contact leather', () => assert.ok(Math.min(...floatDistances) < 1e-4, 'minimum actual vertex gap ' + Math.min(...floatDistances)));
for (let i = 0; i < paths.length; i++) assert.equal(hash(await readFile(paths[i])), hash(input[i]), 'input changed during review: ' + paths[i]);
console.log('END', JSON.stringify({ geometryRedChecks: defects, inputHashesUnchanged: true, writes: false }));
if (defects.length) process.exitCode = 1;
