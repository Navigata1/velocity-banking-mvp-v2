import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('refined car carries textured PBR materials and compressed self-contained geometry', async () => {
  const bytes=await readFile(new URL('../../web/public/heroes/car.glb',import.meta.url));
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const [imported]=JSON.parse(await readFile(new URL('../hero-imported.json',import.meta.url),'utf8'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),imported.sha256,'provenance must match the distributed model');
  assert.ok(json.images?.length >= 5,'car must contain real material textures, not only solid-color primitives');
  assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
  assert.ok(json.materials.some(m=>m.extensions?.KHR_materials_clearcoat));
  for(const name of ['Hardware','Mirror','Brake','Rim1','Rim2']) {
    const material=json.materials.find(m=>m.name===name);
    assert.ok(material && (!material.emissiveFactor || material.emissiveFactor.every(value=>value===0)),`${name} must not glow after its logo map is removed`);
  }
  assert.ok(!json.nodes.some(n=>/License Plate|InteriorSteeringEmblem/.test(n.name??'')));
  assert.match(json.asset.copyright,/Darmstadt Graphics Group/);
  assert.ok(!json.buffers.some(b=>b.uri));
  assert.ok(json.images.every(image=>image.bufferView!==undefined && !image.uri));
  assert.ok(bytes.length<2.25*1024*1024,'textured opt-in car must fit its explicit 2.25 MiB budget');
  const binaryStart=20+bytes.readUInt32LE(12)+8;
  for(const image of json.images) {
    const view=json.bufferViews[image.bufferView];
    const hash=createHash('sha256').update(bytes.subarray(binaryStart+view.byteOffset,binaryStart+view.byteOffset+view.byteLength)).digest('hex');
    assert.ok(!['1453559c58526ec236ea7f90a72b0e49823061e6c26b571928b9ea3b91593e4d','2cc27eb22991798e33bc9edd9538734ab23ca9209e560f48ae1527dec9c58676'].includes(hash),'separately licensed Khronos logo texture must not be embedded');
  }
});
