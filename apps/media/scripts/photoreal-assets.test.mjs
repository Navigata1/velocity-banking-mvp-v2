import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { Matrix4, Vector3 } from '../../web/node_modules/three/build/three.module.js';

test('refined car carries textured PBR materials and compressed self-contained geometry', async () => {
  const bytes=await readFile(new URL('../../web/public/heroes/car.glb',import.meta.url));
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const imported=JSON.parse(await readFile(new URL('../hero-imported.json',import.meta.url),'utf8')).find(asset=>asset.id==='car');
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

test('refined Vault has an open chamber, physical door pivot and embedded PBR surfaces', async () => {
  const bytes=await readFile(new URL('../../web/public/heroes/vault.glb',import.meta.url));
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const record=JSON.parse(await readFile(new URL('../hero-imported.json',import.meta.url),'utf8')).find(asset=>asset.id==='vault');
  assert.ok(record, 'Vault must be a protected refined asset rather than the untextured study');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);
  const recipe=await readFile(new URL('./build-refined-vault.mjs',import.meta.url),'utf8');
  assert.equal(createHash('sha256').update(recipe.replace(/\r\n/g,'\n')).digest('hex'),record.sourceSha256,'Vault recipe changes require asset regeneration; checkout line endings do not');
  assert.match(record.provenance,/original/i);
  assert.ok(bytes.length < 0.85*1024*1024, 'Vault must fit without increasing the collection budget');
  assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
  assert.ok(!json.buffers.some(buffer=>buffer.uri));
  assert.ok(json.images.length>=6 && json.images.every(image=>image.bufferView!==undefined && !image.uri));
  await MeshoptDecoder.ready;
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const document=await io.readBinary(bytes), root=document.getRoot();
  const bounds=getBounds(root.listScenes()[0]);
  assert.ok(Math.abs(Math.max(...bounds.max.map((v,i)=>v-bounds.min[i]))-3.2)<1e-3, 'normalized bounds must survive 14-bit position quantization');
  assert.ok(Math.abs(bounds.min[1])<1e-3, 'feet must sit on the shared stage origin within compression precision');
  const pivot=root.listNodes().find(node=>node.getName()==='Vault-DoorPivot');
  assert.ok(pivot && pivot.getTranslation()[0]>0.9 && pivot.getRotation()[1]>0.1, 'door rotates around its right hinge, not the scene origin');
  const pointsInPivot=node=>{
    const matrix=new Matrix4().fromArray(pivot.getWorldMatrix()).invert().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
    return node.getMesh().listPrimitives().flatMap(primitive=>{
      const positions=primitive.getAttribute('POSITION');
      return Array.from({length:positions.getCount()},(_,i)=>new Vector3().fromArray(positions.getElement(i,[])).applyMatrix4(matrix));
    });
  };
  const door=root.listNodes().find(node=>node.getName()==='Vault-Door-Mass');
  const doorPoints=pointsInPivot(door), centerX=-1.14;
  const radius=Math.max(...doorPoints.map(p=>Math.hypot(p.x-centerX,p.y)));
  for(const link of root.listNodes().filter(node=>node.getName().startsWith('Vault-Door-Hinge-Link-'))) {
    const points=pointsInPivot(link);
    const x=Math.min(...points.map(p=>p.x))+0.025;
    const y=(Math.min(...points.map(p=>p.y))+Math.max(...points.map(p=>p.y)))/2;
    assert.ok(Math.hypot(x-centerX,y)<radius-0.01, 'hinge link must enter the actual curved door, not stop in empty space');
  }
  const frame=root.listNodes().find(node=>node.getName()==='Vault-Front-Frame')?.getMesh();
  assert.ok(frame, 'a real annular opening is required');
  for(const primitive of frame.listPrimitives()) {
    const positions=primitive.getAttribute('POSITION'), indices=primitive.getIndices();
    for(let i=0;i<indices.getCount();i+=3) {
      const p=[0,1,2].map(offset=>positions.getElement(indices.getScalar(i+offset),[]));
      const area=(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);
      if(Math.abs(area)<1e-8) continue;
      const u=(p[1][0]*p[2][1]-p[1][1]*p[2][0])/area;
      const v=(p[2][0]*p[0][1]-p[2][1]*p[0][0])/area;
      assert.ok(u<0 || v<0 || u+v>1, 'a front-frame triangle fills the chamber opening');
    }
  }
  for(const name of ['Vault-Brushed-Steel','Vault-Turned-Steel','Vault-Interior-Brass']) {
    const material=root.listMaterials().find(item=>item.getName()===name);
    assert.ok(material?.getBaseColorTexture() && material.getNormalTexture() && material.getMetallicRoughnessTexture(), `${name} needs real PBR maps`);
    const {data,info}=await sharp(material.getNormalTexture().getImage()).raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,512); assert.equal(info.height,512);
    let min=255,max=0;
    for(let i=0;i<data.length;i+=info.channels) {min=Math.min(min,data[i]);max=Math.max(max,data[i]);}
    assert.ok(max-min>8, 'normal map must encode surface detail, not a flat placeholder');
  }
  assert.ok(root.listNodes().some(node=>node.getName()==='Vault-Locking-Bolt-0'));
});

test('web and HyperFrames share the same photographic studio reflections', async () => {
  const web=await readFile(new URL('../../web/src/components/hero/HeroModelStage.tsx',import.meta.url),'utf8');
  const video=await readFile(new URL('../hero-turntables/index.html',import.meta.url),'utf8');
  const preparation=await readFile(new URL('./prepare-hyperframes-assets.mjs',import.meta.url),'utf8');
  assert.match(web,/createHeroEnvironment/);
  assert.match(video,/createHeroEnvironment/);
  assert.match(preparation,/studio-environment\.ts/);
});
