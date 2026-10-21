import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Vector3 } from '../../web/node_modules/three/build/three.module.js';

async function model(id) {
  await MeshoptDecoder.ready;
  return (await new NodeIO().registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
    .readBinary(await readFile(new URL(`../../web/public/heroes/${id}.glb`, import.meta.url)))).getRoot();
}

function charts(root) {
  const nodes = new Set(), failures = [], mapped = new Set();
  const visit = node => { nodes.add(node); for (const child of node.listChildren()) visit(child); };
  for (const scene of root.listScenes()) for (const node of scene.listChildren()) visit(node);
  let inspected = 0;
  for (const node of nodes) {
    const matrix = new Matrix4().fromArray(node.getWorldMatrix());
    for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
      const material = primitive.getMaterial();
      if (!material?.getNormalTexture()) continue;
      mapped.add(material);
      const positions = primitive.getAttribute('POSITION'), indices = primitive.getIndices();
      const uv = primitive.getAttribute(`TEXCOORD_${material.getNormalTextureInfo().getTexCoord()}`);
      assert.ok(uv, 'used normal map requires its real UV accessor');
      const count = indices?.getCount() ?? positions.getCount();
      for (let i = 0; i < count; i += 3) {
        const ids = [0, 1, 2].map(j => indices ? indices.getScalar(i + j) : i + j);
        const points = ids.map(j => new Vector3().fromArray(positions.getElement(j, [])).applyMatrix4(matrix));
        const area = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).length() / 2;
        if (area <= 1e-12) continue;
        inspected++;
        const [a, b, c] = ids.map(j => uv.getElement(j, []));
        const determinant = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        if (![...a, ...b, ...c, determinant].every(Number.isFinite) || Math.abs(determinant) < 1e-12) {
          failures.push({ node: node.getName(), triangle: i / 3 });
        }
      }
    }
  }
  assert.ok(inspected > 500 && mapped.size >= 2, 'inspect real scene-used mapped surfaces, not an empty or untextured substitute');
  return { inspected, failures };
}

for (const id of ['house', 'creditCard', 'studentLoan']) {
  test(`${id} shipped normal-mapped surfaces have two-dimensional UV charts`, async () => {
    const result = charts(await model(id));
    assert.equal(result.failures.length, 0, `${id}: collapsed charts on real compressed surfaces: ${JSON.stringify(result.failures.slice(0, 5))}`);
  });

  test(`${id} chart verifier rejects constant and non-finite charts on actual used surfaces`, async () => {
    for (const value of [0.5, NaN, Infinity, -Infinity]) {
      const root = await model(id);
      assert.equal(charts(root).failures.length, 0, 'negative control requires the valid shipped asset first');
      let changed = false;
      for (const node of root.listNodes()) for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
        const material = primitive.getMaterial();
        if (!material?.getNormalTexture()) continue;
        const uv = primitive.getAttribute(`TEXCOORD_${material.getNormalTextureInfo().getTexCoord()}`);
        uv.setArray(new Float32Array(uv.getCount() * 2).fill(value));
        changed = true;
      }
      assert.ok(changed);
      assert.ok(charts(root).failures.length > 500, `${value} charts on actual used surfaces must be rejected`);
    }
  });
}
