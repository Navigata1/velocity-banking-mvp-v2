import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { parse } from 'acorn';
import * as T from '../../web/node_modules/three/build/three.module.js';

// Extract only real geometry helpers and authored ribbon calls, never the builder's I/O.
const source = await readFile(new URL('./build-refined-student-loan.mjs', import.meta.url), 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
const helpers = ['add', 'ribbon', 'BowLoop'].map(name => {
  const node = ast.body.find(node => node.id?.name === name);
  assert.ok(node, `missing ${name} geometry helper`);
  return source.slice(node.start, node.end);
});
const calls = ast.body.filter(node => node.type === 'ExpressionStatement' && node.expression.callee?.name === 'ribbon');
assert.equal(calls.length, 4, 'exercise both original loops and both original tails');
const diploma = new T.Group(), satin = new T.MeshPhysicalMaterial();
satin.name = 'SL-Satin-Green';
vm.runInNewContext([...helpers, ...calls.map(node => source.slice(node.start, node.end))].join('\n'), { T, diploma, satin }, { timeout: 1000 });

// Triangle-expanded float32 snapshots captured at 189eeaea before the UV repair.
// Indices may split at UV seams; positions, winding and smoothed normals may not change.
const original = new Map([
  ['SL-Bow-Left-Loop', 'e95152ae7e3e263fbc5d10b3aff794cd71c8d1ba44837c2e123e09698272f5f3'],
  ['SL-Bow-Right-Loop', 'dd2a45ba923997bac22b1e9a8a9c10d4bbe7c1d9381bbd6215f917fb1badf75c'],
  ['SL-Bow-Left-Tail', '96f5ca9f6854163f2fe04a250dbffd633f0ce789a9d6ebf1d58909770affcf24'],
  ['SL-Bow-Right-Tail', 'ff160579d4e87c026e8110277f1ac72f83a8d1b08a00ce4476c1bf64eeab9136'],
]);
const originalBroadUv = 'ca6f6b604d0f6d86c025a5a827afe78a30b61fb163681afe5cfb50843e6b42a9';
const broadFace = triangle => triangle < 512 && triangle % 8 < 4;
const sideFace = triangle => triangle < 512 && triangle % 8 >= 4;
const capFace = triangle => triangle >= 512;
assert.deepEqual(diploma.children.map(mesh => mesh.name), [...original.keys()]);

function digest(geometry, attributes, include = () => true) {
  const values = [];
  for (let i = 0; i < geometry.index.count; i++) {
    if (!include(Math.floor(i / 3))) continue;
    const index = geometry.index.getX(i);
    for (const name of attributes) {
      const attribute = geometry.getAttribute(name);
      for (let j = 0; j < attribute.itemSize; j++) values.push(attribute.array[index * attribute.itemSize + j]);
    }
  }
  const bytes = Buffer.alloc(values.length * 4);
  values.forEach((value, i) => bytes.writeFloatLE(value, i * 4));
  return createHash('sha256').update(bytes).digest('hex');
}

function charts(geometry) {
  const positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  assert.ok(positions && uv && geometry.index, 'inspect actual indexed ribbon surfaces');
  assert.equal(uv.count, positions.count);
  assert.ok(Array.from(uv.array).every(Number.isFinite), 'finite UV coordinates');
  let inspected = 0;
  const collapsed = [];
  for (let i = 0; i < geometry.index.count; i += 3) {
    const ids = [0, 1, 2].map(j => geometry.index.getX(i + j));
    const [p, q, r] = ids.map(id => new T.Vector3().fromBufferAttribute(positions, id));
    assert.ok(q.sub(p).cross(r.sub(p)).length() / 2 > 1e-12, 'no replacement or degenerate geometry');
    inspected++;
    const [a, b, c] = ids.map(id => new T.Vector2().fromBufferAttribute(uv, id));
    const determinant = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
    if (Math.abs(determinant) < 1e-12) collapsed.push(i / 3);
  }
  assert.equal(inspected, 516, 'retain all 256 broad, 256 side and four cap triangles');
  return collapsed;
}

function preserved(geometry, name) {
  assert.equal(geometry.index.count, 1548, 'authored triangle count');
  assert.equal(digest(geometry, ['position', 'normal']), original.get(name), 'original ordered positions, winding and smoothed vertex normals');
  assert.equal(digest(geometry, ['uv'], broadFace), originalBroadUv, 'original front/back broad-face UVs');
}

function flattenDepth(geometry, include) {
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < geometry.index.count; i++) {
    if (include(Math.floor(i / 3))) uv.setY(geometry.index.getX(i), 0);
  }
}

for (const mesh of diploma.children) {
  test(`${mesh.name} has noncollapsed depth-aware side and cap charts`, () => {
    assert.equal(charts(mesh.geometry).length, 0, 'all authored textured triangles need two-dimensional charts');
  });

  test(`${mesh.name} preserves authored geometry, smoothing, broad-face UVs and identity`, () => {
    preserved(mesh.geometry, mesh.name);
    assert.equal(mesh.parent, diploma);
    assert.equal(mesh.material, satin);
    assert.deepEqual(mesh.position.toArray(), [0, 0, 0]);
    assert.deepEqual(mesh.rotation.toArray(), [0, 0, 0, 'XYZ']);
    assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]);
  });

  test(`${mesh.name} chart guard rejects lost side depth, lost cap depth and constant UVs`, () => {
    assert.equal(charts(mesh.geometry).length, 0, 'negative controls start from repaired real geometry');
    for (const [include, expected] of [[sideFace, 256], [capFace, 4], [triangle => !broadFace(triangle), 260]]) {
      const broken = mesh.geometry.clone();
      flattenDepth(broken, include);
      const collapsed = charts(broken);
      assert.equal(collapsed.length, expected);
      assert.ok(collapsed.every(include), 'reject exactly the mutated side/cap surfaces');
      preserved(broken, mesh.name);
    }
    const constant = mesh.geometry.clone();
    constant.getAttribute('uv').array.fill(0.5);
    assert.equal(charts(constant).length, 516, 'bounded but constant UVs must fail');
  });
}

test('preservation guard rejects moving geometry, winding changes, broad UV edits and resmoothing seams', () => {
  const mesh = diploma.children[0];
  assert.equal(charts(mesh.geometry).length, 0, 'resmoothing control requires repaired UV seams');
  const mutations = [
    geometry => { const p = geometry.getAttribute('position'); p.setX(geometry.index.getX(0), p.getX(geometry.index.getX(0)) + 0.001); },
    geometry => { const a = geometry.index.getX(0); geometry.index.setX(0, geometry.index.getX(1)); geometry.index.setX(1, a); },
    geometry => { geometry.getAttribute('uv').setX(geometry.index.getX(0), 0.25); },
    geometry => { geometry.computeVertexNormals(); },
  ];
  for (const mutate of mutations) {
    const broken = mesh.geometry.clone();
    mutate(broken);
    assert.throws(() => preserved(broken, mesh.name), { code: 'ERR_ASSERTION' });
  }
});
