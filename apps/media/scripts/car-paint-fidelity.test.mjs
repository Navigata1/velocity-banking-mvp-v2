import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

// Original PNG in the hash-pinned Khronos CarConcept source, not a render fixture.
const sourcePaintSha = '3c4b65d9a8372147a41594eee96eae35127105de26142cc9e9b752c3f9754b8e';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('shipped Car preserves the source paint normal pixels instead of lossy color compression', async () => {
  await MeshoptDecoder.ready;
  const bytes = await readFile(new URL('../../web/public/heroes/car.glb', import.meta.url));
  const document = await new NodeIO().registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).readBinary(bytes);
  const paints = document.getRoot().listMaterials().filter(material => /^Paint [12] Carmine$/.test(material.getName()));
  assert.equal(paints.length, 2, 'both active Carmine paint materials must be inspected');
  const normal = paints[0].getNormalTexture();
  assert.ok(normal, 'paint must retain its authored flake normal map');
  assert.equal(paints[1].getNormalTexture(), normal, 'both paints share the same source data');
  assert.equal(sha(normal.getImage()), sourcePaintSha, 'normal data must remain byte-identical to the pinned source PNG');
  assert.equal(normal.getMimeType(), 'image/png');
  const { data, info } = await sharp(normal.getImage()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [128, 128, 3]);
  assert.equal(sha(data), 'f084dbffd99641c57a397c5de7b5defec889114310ed07861711b043bf787477');
  for (const paint of paints) {
    assert.ok(Math.abs(paint.getNormalScale() - 0.3) < 1e-7, 'retain the float32 source flake strength');
    const sampler = paint.getNormalTextureInfo();
    assert.equal(sampler.getMagFilter(), 9728, 'retain the source nearest-filter flake design');
    assert.equal(sampler.getMinFilter(), 9986);
    assert.deepEqual(sampler.getExtension('KHR_texture_transform').getScale(), [30, 30]);
  }
  assert.ok(bytes.length < 2.25 * 1024 * 1024, 'fidelity repair must respect the existing Car budget');
});
