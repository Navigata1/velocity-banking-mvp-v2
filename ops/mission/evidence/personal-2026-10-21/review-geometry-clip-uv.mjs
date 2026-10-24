import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const req = createRequire(path.resolve('apps/media/package.json'));
const { NodeIO } = await import(pathToFileURL(req.resolve('@gltf-transform/core')));
const { ALL_EXTENSIONS } = await import(pathToFileURL(req.resolve('@gltf-transform/extensions')));
const { MeshoptDecoder } = await import(pathToFileURL(req.resolve('meshoptimizer')));
const { parse } = await import(pathToFileURL(req.resolve('acorn')));
const T = await import(pathToFileURL(path.resolve('apps/web/node_modules/three/build/three.module.js')));
const { mergeVertices } = await import(pathToFileURL(path.resolve('apps/web/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js')));
const sha = b => createHash('sha256').update(b).digest('hex');
const bytes = await readFile('apps/web/public/heroes/personal.glb'), source = await readFile('apps/media/scripts/build-refined-personal.mjs', 'utf8');
console.log('PIN', JSON.stringify({ glb: sha(bytes), bytes: bytes.length, source: sha(source), fullClearance: false }));
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
const names = ['rounded', 'hole', 'uvUnit', 'extrude', 'sliced'];
const declarations = names.map(name => { const n = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === name); assert.ok(n); return source.slice(n.start, n.end); }).join('\n');
// Evaluate only five pure geometry helpers, never the builder or its I/O.
const { rounded, hole, extrude, sliced } = new Function('T', 'mergeVertices', declarations + '\nreturn {rounded,hole,extrude,sliced};')(T, mergeVertices);
const outline = rounded(0.15, 1.06, 0.06);
for (const y of [0.02, -0.12, -0.26]) { const p = new T.Path(); p.absarc(0, y, 0.019, 0, Math.PI * 2); hole(outline, p); }
const raw = extrude(outline, 0.026, 0.003), clipped = sliced(raw);
const area2 = uv => Math.abs((uv[1][0] - uv[0][0]) * (uv[2][1] - uv[0][1]) - (uv[1][1] - uv[0][1]) * (uv[2][0] - uv[0][0]));
function sourceAudit(g) {
  const rows = [];
  for (let i = 0; i < (g.index?.count ?? g.attributes.position.count); i += 3) {
    const ids = [0, 1, 2].map(j => g.index ? g.index.getX(i + j) : i + j), ps = ids.map(j => new T.Vector3().fromBufferAttribute(g.attributes.position, j)), uv = ids.map(j => [g.attributes.uv.getX(j), g.attributes.uv.getY(j)]), quantized = uv.map(u => u.map(v => Math.round(v * 65535) / 65535)), area = new T.Triangle(...ps).getArea();
    if (area > 1e-12 && area2(quantized) <= 1e-12) rows.push({ face: i / 3, area, uvAreaBefore: area2(uv), uvAreaAfter16bit: area2(quantized), positions: ps.map(p => p.toArray()), uv });
  }
  return { triangles: (g.index?.count ?? g.attributes.position.count) / 3, quantizationCollapsedFaces: rows.length, examples: rows.slice(0, 6) };
}
console.log('SOURCE_PURE_HELPERS', JSON.stringify({ original: sourceAudit(raw), sliced: sourceAudit(clipped) }));
await MeshoptDecoder.ready;
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).readBinary(bytes);
function failures(p) {
  const pos = p.getAttribute('POSITION'), uv = p.getAttribute('TEXCOORD_0'), ix = p.getIndices(), rows = [];
  for (let i = 0; i < ix.getCount(); i += 3) {
    const ids = [0, 1, 2].map(j => ix.getScalar(i + j)), ps = ids.map(j => new T.Vector3(...pos.getElement(j, []))), u = ids.map(j => uv.getElement(j, [])), area = new T.Triangle(...ps).getArea();
    if (area > 1e-10 && area2(u) <= 1e-12) rows.push({ offset: i, face: i / 3, area, uvArea: area2(u), positions: ps.map(v => v.toArray()), uv: u });
  }
  return rows;
}
function surfaceHash(p, semantic) { const a = p.getAttribute(semantic), ix = p.getIndices(); return sha(JSON.stringify(Array.from({ length: ix.getCount() }, (_, i) => a.getElement(ix.getScalar(i), [])))); }
for (const name of ['P-Strap-L', 'P-Strap-R']) {
  const node = doc.getRoot().listNodes().find(n => n.getName() === name);
  for (const p of node.getMesh().listPrimitives()) {
    const bad = failures(p), positionHash = surfaceHash(p, 'POSITION'), normalHash = surfaceHash(p, 'NORMAL');
    console.log('ACTUAL_UV_RED', JSON.stringify({ name, count: bad.length, examples: bad.slice(0, 6) }));
    if (!bad.length) continue;
    const originalIndices = p.getIndices().getArray().slice(), attributes = new Map(p.listSemantics().map(s => [s, p.getAttribute(s)])), additions = new Map([...attributes].map(([s]) => [s, []]));
    let next = p.getAttribute('POSITION').getCount();
    for (const row of bad) for (let j = 0; j < 3; j++) {
      const old = originalIndices[row.offset + j];
      for (const [s, a] of attributes) { const n = a.getElementSize(), array = a.getArray(); additions.get(s).push(...array.subarray(old * n, (old + 1) * n)); }
      originalIndices[row.offset + j] = next++;
    }
    for (const [s, a] of attributes) { const old = a.getArray(), array = new old.constructor(old.length + additions.get(s).length); array.set(old); array.set(additions.get(s), old.length); p.setAttribute(s, a.clone().setArray(array)); }
    p.setIndices(p.getIndices().clone().setArray(originalIndices));
    // UV-only counterexample control: preserve geometry and normals exactly,
    // but give each affected triangle its own small quantization-safe chart.
    const charts = [[0.25, 0.25], [0.2502, 0.25], [0.25, 0.2502]], uv = p.getAttribute('TEXCOORD_0');
    for (const row of bad) for (let j = 0; j < 3; j++) uv.setElement(p.getIndices().getScalar(row.offset + j), charts[j]);
    assert.equal(surfaceHash(p, 'POSITION'), positionHash);
    assert.equal(surfaceHash(p, 'NORMAL'), normalHash);
    assert.equal(failures(p).length, 0);
    console.log('UV_ONLY_CONTROL_GREEN', JSON.stringify({ name, changedFaces: bad.length, indexedPositionAndNormalStreamsUnchanged: true, remainingCollapsedFaces: 0, glbWritten: false }));
  }
}
console.log('END', JSON.stringify({ fileStillSame: sha(await readFile('apps/web/public/heroes/personal.glb')) === sha(bytes), sourceStillSame: sha(await readFile('apps/media/scripts/build-refined-personal.mjs')) === sha(source), writes: false, fullGeometryClearance: false }));
