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
export const T = await import(pathToFileURL(path.resolve('apps/web/node_modules/three/build/three.module.js')));
const { Vector3: V, Matrix4: M, Matrix3, Quaternion: Q, Triangle, Ray } = T;
export const hash = b => createHash('sha256').update(b).digest('hex');
const paths = ['apps/web/public/heroes/personal.glb', 'apps/media/scripts/build-refined-personal.mjs', 'apps/media/scripts/personal-refinement.test.mjs', 'apps/media/scripts/personal-seating.test.mjs', 'apps/media/scripts/personal-geometry-test-helpers.mjs'];
export const inputs = await Promise.all(paths.map(p => readFile(p)));
assert.equal(hash(inputs[0]), 'e079fc7b95c562fa6180434491cf3511d54fbf79cb155bf1d89c822bafe77b79');
assert.equal(hash(inputs[1]), '588e52c8a9547e98df1a643bb465ec4a884ff85df84b9cefd5fef35efc73864c');
console.log('PIN', JSON.stringify(paths.map((path, i) => ({ path, bytes: inputs[i].length, sha256: hash(inputs[i]) }))));
await MeshoptDecoder.ready;
export async function fixture() {
  const document = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).readBinary(inputs[0]);
  const root = document.getRoot(), named = name => { const n = root.listNodes().find(n => n.getName() === name); assert.ok(n, name); return n; };
  return { document, root, named, bytes: inputs[0] };
}
export function decode(node, frame = null) {
  const base = new M().fromArray(node.getWorldMatrix()); if (frame) base.premultiply(new M().fromArray(frame.getWorldMatrix()).invert());
  const batch = node.getExtension('EXT_mesh_gpu_instancing'), out = [], groups = [];
  for (let instance = 0; instance < (batch?.listAttributes()[0]?.getCount() ?? 1); instance++) {
    const matrix = base.clone();
    if (batch) matrix.multiply(new M().compose(new V().fromArray(batch.getAttribute('TRANSLATION')?.getElement(instance, []) ?? [0, 0, 0]), new Q().fromArray(batch.getAttribute('ROTATION')?.getElement(instance, []) ?? [0, 0, 0, 1]), new V().fromArray(batch.getAttribute('SCALE')?.getElement(instance, []) ?? [1, 1, 1])));
    const faces = [];
    for (const p of node.getMesh()?.listPrimitives() ?? []) {
      const pos = p.getAttribute('POSITION'), ix = p.getIndices();
      for (let i = 0; i < (ix?.getCount() ?? pos.getCount()); i += 3) faces.push([0, 1, 2].map(j => new V(...pos.getElement(ix ? ix.getScalar(i + j) : i + j, [])).applyMatrix4(matrix)));
    }
    groups.push({ faces, matrix, instance }); out.push(...faces);
  }
  return { faces: out, groups };
}
export function bounds(ts) { const min = new V(Infinity, Infinity, Infinity), max = min.clone().negate(); for (const t of ts) for (const p of t) { min.min(p); max.max(p); } return { min, max, span: max.clone().sub(min), center: min.clone().add(max).multiplyScalar(0.5) }; }
const cross = t => t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0]));
export function topology(ts) {
  const edges = new Map(); let volume = 0, degenerate = 0;
  for (const t of ts) {
    const ids = t.map(p => p.toArray().join(',')); if (new Set(ids).size < 3) { degenerate++; continue; }
    volume += t[0].dot(t[1].clone().cross(t[2])) / 6;
    for (let j = 0; j < 3; j++) { const a = ids[j], b = ids[(j + 1) % 3], key = [a, b].sort().join('|'), e = edges.get(key) ?? [0, 0]; e[0]++; e[1] += a < b ? 1 : -1; edges.set(key, e); }
  }
  return { triangles: ts.length, unmatched: [...edges.values()].filter(([n, w]) => n !== 2 || w !== 0).length, edges: edges.size, volume, repeatedPointTriangles: degenerate };
}
export function hits(ts, origin, direction, cull = false) { const out = [], p = new V(), ray = new Ray(origin, direction.clone().normalize()); for (const t of ts) if (ray.intersectTriangle(...t, cull, p) && !out.some(q => p.distanceTo(q) < 1e-7)) out.push(p.clone()); return out.sort((a, b) => a.distanceToSquared(origin) - b.distanceToSquared(origin)); }
const box = t => [0, 1, 2].map(k => [Math.min(...t.map(p => p.getComponent(k))), Math.max(...t.map(p => p.getComponent(k)))]);
function cut(a, b, t) { const n = cross(t), edge = b.clone().sub(a), denom = n.dot(edge); if (Math.abs(denom) < n.length() * 1e-10) return null; const f = n.dot(t[0].clone().sub(a)) / denom; if (f <= 1e-7 || f >= 1 - 1e-7) return null; const p = a.clone().addScaledVector(edge, f), bc = Triangle.getBarycoord(p, ...t, new V()); return bc && Math.min(...bc.toArray()) >= -1e-7 ? p : null; }
export function crossings(left, right = left) {
  const a = left.map(t => ({ t, b: box(t) })), b = left === right ? a : right.map(t => ({ t, b: box(t) })); let count = 0; const examples = [];
  for (let i = 0; i < a.length; i++) for (let j = left === right ? i + 1 : 0; j < b.length; j++) {
    const x = a[i], y = b[j]; if (x.b.some(([lo, hi], k) => lo > y.b[k][1] + 1e-7 || hi < y.b[k][0] - 1e-7)) continue;
    if (left === right && x.t.some(p => y.t.some(q => p.distanceToSquared(q) < 1e-12))) continue;
    const ps = []; for (const [u, v] of [[x.t, y.t], [y.t, x.t]]) for (let k = 0; k < 3; k++) { const p = cut(u[k], u[(k + 1) % 3], v); if (p && !ps.some(q => p.distanceTo(q) < 1e-6)) ps.push(p); }
    if (ps.length >= 2 && ps[0].distanceTo(ps[1]) > 2e-5) { count++; if (examples.length < 3) examples.push({ i, j, points: ps.map(p => p.toArray()) }); }
  }
  return { count, examples };
}
export async function unchanged() { for (let i = 0; i < paths.length; i++) assert.equal(hash(await readFile(paths[i])), hash(inputs[i]), 'input changed ' + paths[i]); }
export const candidate = await fixture();
const { root, named } = candidate, body = named('P-Body'), nodes = root.listNodes().filter(n => n.getMesh()), cache = new Map(nodes.map(n => [n.getName(), decode(n, body)]));
const ts = name => cache.get(name).faces;
export const skinNames = ['P-Body', 'P-Flap', 'P-Handle', 'P-Strap-L', 'P-Strap-R', 'P-Shoulder-Strap', ...['Handle', 'Shoulder'].flatMap(k => ['L', 'R'].map(s => 'P-' + k + '-Tab-' + s))];
const closure = {};
for (const name of [...skinNames, 'P-Key', ...['Handle-Ring', 'Shoulder-Ring', 'Buckle'].flatMap(k => ['L', 'R'].map(s => 'P-' + k + '-' + s))]) { closure[name] = topology(ts(name)); assert.equal(closure[name].unmatched, 0, name + ' exact-position directed edges'); assert.ok(closure[name].volume > 0); }
let unique = 0, finite = 0, badUv = 0, collapsedUv = 0, rawNormalBad = 0, worldNormalBad = 0;
for (const a of root.listAccessors()) for (let i = 0; i < a.getCount(); i++) for (const v of a.getElement(i, [])) { finite++; assert.ok(Number.isFinite(v)); }
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
  const pos = p.getAttribute('POSITION'), uv = p.getAttribute('TEXCOORD_0'), normal = p.getAttribute('NORMAL'), ix = p.getIndices(); unique += ix.getCount() / 3;
  if (uv) for (let i = 0; i < uv.getCount(); i++) if (uv.getElement(i, []).some(v => v < -1e-7 || v > 1 + 1e-7)) badUv++;
  for (let i = 0; i < ix.getCount(); i += 3) { const ids = [0, 1, 2].map(j => ix.getScalar(i + j)), ps = ids.map(j => new V(...pos.getElement(j, []))), c = cross(ps), ns = ids.map(j => new V(...normal.getElement(j, []))); if (c.lengthSq() >= 1e-18 && c.dot(ns.reduce((s, n) => s.add(n), new V())) < -c.length() * 0.001) rawNormalBad++;
    if (uv && p.getMaterial()?.getBaseColorTexture() && c.length() > 2e-10) { const u = ids.map(j => uv.getElement(j, [])); if (Math.abs((u[1][0] - u[0][0]) * (u[2][1] - u[0][1]) - (u[1][1] - u[0][1]) * (u[2][0] - u[0][0])) <= 1e-12) collapsedUv++; }
  }
}
for (const n of nodes) for (const { matrix } of decode(n).groups) { const nm = new Matrix3().getNormalMatrix(matrix); for (const p of n.getMesh().listPrimitives()) { const pos = p.getAttribute('POSITION'), normal = p.getAttribute('NORMAL'), ix = p.getIndices(); for (let i = 0; i < ix.getCount(); i += 3) { const ids = [0, 1, 2].map(j => ix.getScalar(i + j)), ps = ids.map(j => new V(...pos.getElement(j, [])).applyMatrix4(matrix)), ns = ids.map(j => new V(...normal.getElement(j, [])).applyMatrix3(nm).normalize()), c = cross(ps); if (c.length() > 2e-14 && c.dot(ns.reduce((s, n) => s.add(n), new V())) < -c.length() * 0.001) worldNormalBad++; } } }
assert.equal(badUv + collapsedUv + rawNormalBad + worldNormalBad, 0);
const world = bounds(nodes.flatMap(n => decode(n).faces)), count = nodes.reduce((s, n) => s + decode(n).faces.length, 0);
console.log('PROBE1', JSON.stringify({ unique, rendered: count, meshes: root.listMeshes().length, maps: root.listTextures().length, finiteScalars: finite, badUv, collapsedUv, rawNormalBad, worldNormalBad, worldBounds: { min: world.min.toArray(), max: world.max.toArray(), span: world.span.toArray() }, closure }));
const self = {}, pairs = {};
for (const name of ['P-Body', 'P-Flap', 'P-Handle', 'P-Shoulder-Strap', 'P-Strap-L', 'P-Strap-R', 'P-Key']) { self[name] = crossings(ts(name)); assert.equal(self[name].count, 0, name + ' self-crossing'); }
for (const [a, b] of [['P-Paper-Front', 'P-Flap'], ['P-Paper-Back', 'P-Flap'], ['P-Paper-Front', 'P-Body'], ['P-Paper-Back', 'P-Body'], ['P-Shoulder-Strap', 'P-Body'], ['P-Shoulder-Strap', 'P-Flap'], ['P-Shoulder-Strap', 'P-Key']]) { pairs[a + '/' + b] = crossings(ts(a), ts(b)); if (pairs[a + '/' + b].count) console.log('PAIR_WITNESS', JSON.stringify({ pair: a + '/' + b, ...pairs[a + '/' + b] })); }
const aperture = {};
for (const name of ['P-Handle-Ring-L', 'P-Handle-Ring-R', 'P-Shoulder-Ring-L', 'P-Shoulder-Ring-R', 'P-Buckle-L', 'P-Buckle-R', 'P-Key']) {
  const faces = ts(name), b = bounds(faces), center = b.center.clone(), depth = name.includes('Shoulder') ? 0 : name === 'P-Key' ? 1 : 2;
  const axes = [0, 1, 2].filter(k => k !== depth); let u = new V().setComponent(axes[0], 1), v = new V().setComponent(axes[1], 1);
  if (name === 'P-Key') {
    // The key is tilted. Rays must stay in its actual mid-plane, not an AABB
    // slice that can strike the cap instead of the aperture's inner walls.
    center.x = b.min.x + b.span.x * 0.186;
    const n = faces.map(cross).sort((a, b) => b.lengthSq() - a.lengthSq())[0].normalize(), ds = faces.flat().map(p => p.dot(n));
    center.addScaledVector(n, (Math.min(...ds) + Math.max(...ds)) / 2 - center.dot(n));
    u = new V(1, 0, 0).addScaledVector(n, -n.x).normalize(); v = n.clone().cross(u).normalize();
  } else center.setComponent(depth, center.getComponent(depth) + b.span.getComponent(depth) * 0.1);
  // Phase away from tessellation vertices to avoid ambiguous edge-grazing rays.
  const scan = fs => Array.from({ length: 16 }, (_, i) => { const angle = (i + 0.173) * Math.PI / 8, d = u.clone().multiplyScalar(Math.cos(angle)).addScaledVector(v, Math.sin(angle)), a = hits(fs, center, d), c = hits(fs, center, d, true), mismatch = !a.length || !c.length || a[0].distanceTo(c[0]) > 1e-5; if (mismatch && fs === faces) console.log('APERTURE_DIAGNOSTIC', JSON.stringify({ name, i, center: center.toArray(), direction: d.toArray(), twoSided: a.map(p => p.toArray()), culled: c.map(p => p.toArray()) })); return mismatch; }).filter(Boolean).length;
  aperture[name] = { mismatches: scan(faces), reversedControl: scan(faces.map(([a, b, c]) => [a, c, b])) }; assert.equal(aperture[name].mismatches, 0, name); assert.equal(aperture[name].reversedControl, 16, name);
}
for (const [name, result] of Object.entries(pairs)) assert.equal(result.count, 0, name);
const hardware = {};
for (const side of ['L', 'R']) for (const kind of ['Handle', 'Shoulder']) { const name = 'P-' + kind + '-Rivet-' + side, support = 'P-' + kind + '-Tab-' + side; hardware[name + '/' + support] = crossings(ts(name), ts(support)); assert.ok(hardware[name + '/' + support].count > 0, name + ' physical support'); }
console.log('PROBE2', JSON.stringify({ self, pairs, aperture, hardware }));
const skins = skinNames.map(name => ({ name, faces: ts(name), bounds: bounds(ts(name)) })), allSkin = skins.flatMap(s => s.faces), dirs = [new V(0.233, 0.871, 0.417), new V(-0.573, 0.297, 0.762), new V(0.811, -0.473, 0.343), new V(-0.397, -0.773, 0.491), new V(0.317, 0.433, -0.843)], q = new V();
export const stitchRows = [];
for (const { faces, instance } of cache.get('P-Stitches').groups) {
  const center = faces.flat().reduce((s, p) => s.add(p), new V()).divideScalar(faces.length * 3); let distance = Infinity, support, normal;
  for (const skin of skins) for (const t of skin.faces) { const d = new Triangle(...t).closestPointToPoint(center, q).distanceTo(center); if (d < distance) { distance = d; support = skin.name; normal = cross(t).normalize(); } }
  const radius = Math.max(...faces.flat().map(p => Math.abs(p.clone().sub(center).dot(normal))));
  // Parity is used ONLY for independently validated closed skin meshes, never
  // as a substitute for closest-surface contact on an open tube or ribbon.
  const buriedIn = skins.filter(s => ['x', 'y', 'z'].every(k => center[k] >= s.bounds.min[k] && center[k] <= s.bounds.max[k]) && dirs.filter(d => hits(s.faces, center, d).length % 2 === 1).length >= 3).map(s => s.name);
  const row = { instance, center: center.toArray(), distance, radius, support, buriedIn }; stitchRows.push(row);
  assert.ok(distance < radius * 0.90 + 1e-4, 'thread not seated ' + JSON.stringify(row)); assert.equal(buriedIn.length, 0, 'buried thread ' + JSON.stringify(row));
}
const threadPrimitive = named('P-Stitches').getMesh().listPrimitives()[0], rawPosition = threadPrimitive.getAttribute('POSITION'), rawPoints = [...new Map(Array.from({ length: rawPosition.getCount() }, (_, i) => new V(...rawPosition.getElement(i, []))).map(p => [p.toArray().join(','), p])).values()];
const rawEnds = [Math.min(...rawPoints.map(p => p.y)), Math.max(...rawPoints.map(p => p.y))].map(y => rawPoints.filter(p => Math.abs(p.y - y) < 1e-8));
const endRows = [];
for (const group of cache.get('P-Stitches').groups) for (const [end, rawCap] of rawEnds.entries()) {
  const points = rawCap.map(p => p.clone().applyMatrix4(group.matrix)), center = points.reduce((s, p) => s.add(p), new V()).divideScalar(points.length), radius = Math.max(...points.map(p => p.distanceTo(center))); let distance = Infinity;
  for (const t of allSkin) distance = Math.min(distance, new Triangle(...t).closestPointToPoint(center, q).distanceTo(center));
  endRows.push({ instance: group.instance, end, distance, radius, ratio: distance / radius });
}
console.log('PROBE3', JSON.stringify({ actualInstances: stitchRows.length, allPass: true, maximumCenterDistance: Math.max(...stitchRows.map(r => r.distance)), minClearanceMargin: Math.min(...stitchRows.map(r => r.radius * 0.9 + 1e-4 - r.distance)), supportGroups: Object.fromEntries([...new Set(stitchRows.map(r => r.support))].map(name => [name, stitchRows.filter(r => r.support === name).length])), fiveRayBuriedCenters: 0, endpointSamples: endRows.length, maxEndpointDistance: Math.max(...endRows.map(r => r.distance)), maxEndpointRadiusRatio: Math.max(...endRows.map(r => r.ratio)), endpointsBeyondThreadRadius: endRows.filter(r => r.distance > r.radius + 1e-4), closestExamples: stitchRows.slice().sort((a, b) => b.distance - a.distance).slice(0, 8) }));
await unchanged(); console.log('END independent probes complete; exact input hashes unchanged; no writes; bounded CPU geometry only');
