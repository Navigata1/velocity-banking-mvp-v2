import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Vector3, Ray } from '../../web/node_modules/three/build/three.module.js';
import sharp from 'sharp';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function assertAperture(root,name,x,y,axis='x') {
  const nodes=root.listNodes(), object=nodes.find(node=>node.getName()==='InterestShield-house-original-refined-v2');
  const facade=nodes.find(node=>node.getName()===name);
  assert.ok(facade,name+' must exist');
  const matrix=new Matrix4().fromArray(object.getWorldMatrix()).invert().multiply(new Matrix4().fromArray(facade.getWorldMatrix()));
  let faces=0;
  for(const primitive of facade.getMesh().listPrimitives()) {
    const positions=primitive.getAttribute('POSITION'), indices=primitive.getIndices();
    for(let i=0;i<indices.getCount();i+=3) {
      const p=[0,1,2].map(offset=>new Vector3().fromArray(positions.getElement(indices.getScalar(i+offset),[])).applyMatrix4(matrix));
      const area=(p[1][axis]-p[0][axis])*(p[2].y-p[0].y)-(p[1].y-p[0].y)*(p[2][axis]-p[0][axis]);
      if(Math.abs(area)<1e-6) continue;
      faces++;
      const u=((p[1][axis]-x)*(p[2].y-y)-(p[1].y-y)*(p[2][axis]-x))/area;
      const v=((p[2][axis]-x)*(p[0].y-y)-(p[2].y-y)*(p[0][axis]-x))/area;
      assert.ok(u<0 || v<0 || u+v>1,name+' blocks the aperture at '+x+','+y);
    }
  }
  assert.ok(faces>4,'test must inspect real wall triangles');
}
async function house() {
  const records=JSON.parse(await readFile(new URL('../hero-imported.json',import.meta.url),'utf8'));
  const record=records.find(asset=>asset.id==='house');
  assert.equal(record?.quality,'refined-textured','House must replace its untextured study with a protected textured asset');
  const bytes=await readFile(new URL('../../web/public/heroes/house.glb',import.meta.url));
  await MeshoptDecoder.ready;
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  return {record,bytes,root:(await io.readBinary(bytes)).getRoot()};
}
function firstHit(root,origin,direction) {
  const object=root.listNodes().find(node=>node.getName()==='InterestShield-house-original-refined-v2');
  const inverse=new Matrix4().fromArray(object.getWorldMatrix()).invert();
  const ray=new Ray(new Vector3(...origin),new Vector3(...direction).normalize()), point=new Vector3();
  let hit=null;
  for(const node of root.listNodes().filter(node=>node.getMesh())) {
    const matrix=inverse.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
    for(const primitive of node.getMesh().listPrimitives()) {
      const positions=primitive.getAttribute('POSITION'), indices=primitive.getIndices();
      for(let i=0;i<indices.getCount();i+=3) {
        const p=[0,1,2].map(j=>new Vector3().fromArray(positions.getElement(indices.getScalar(i+j),[])).applyMatrix4(matrix));
        if(!ray.intersectTriangle(...p,false,point)) continue;
        const distance=point.distanceTo(ray.origin);
        if(!hit || distance<hit.distance) hit={name:node.getName(),distance};
      }
    }
  }
  return hit?.name;
}

test('House embeds optimized original surfaces and verifiable generation provenance',async()=>{
  const {record,bytes,root}=await house();
  assert.equal(hash(bytes),record.sha256);
  assert.ok(bytes.length<1.25*1024*1024,'House must stay inside its existing opt-in 1.25 MiB budget');
  const recipe=await readFile(new URL('./build-refined-house.mjs',import.meta.url),'utf8');
  assert.equal(hash(recipe.replace(/\r\n/g,'\n')),record.sourceSha256);
  const sources=JSON.parse(await readFile(new URL('../sources/house/materials.json',import.meta.url),'utf8'));
  assert.equal(record.materialSourceSha256,hash(JSON.stringify(sources)));
  for(const source of sources.images) {
    const image=await readFile(new URL('../sources/house/'+source.file,import.meta.url));
    assert.equal(hash(image),source.sha256);
    assert.match(source.origin,/built-in image generator/);
  }
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
  assert.ok(json.images.length>=6 && json.images.every(image=>image.bufferView!==undefined && !image.uri));
  assert.ok(json.buffers.every(buffer=>!buffer.uri));
  for(const name of ['House-Limestone','House-Oak']) {
    const material=root.listMaterials().find(item=>item.getName()===name);
    assert.ok(material?.getBaseColorTexture() && material.getNormalTexture() && material.getMetallicRoughnessTexture(),name+' needs embedded color/normal/roughness maps');
    for(const texture of [material.getBaseColorTexture(),material.getNormalTexture(),material.getMetallicRoughnessTexture()]) {
      const metadata=await sharp(texture.getImage()).metadata();
      assert.ok(metadata.width<=1024 && metadata.height<=1024);
    }
  }
});

test('House keeps the original architectural identity with real apertures and detailed back/sides',async()=>{
  const {root}=await house();
  const nodes=root.listNodes(), named=name=>nodes.find(node=>node.getName()===name);
  for(const name of ['House-Facade-Tower','House-Facade-Left','House-Facade-Rear','House-Facade-West',
    'House-Garage-Panel-0','House-Entry-Door','House-Chimney','House-Roof-Tower-Ridge',
    'House-Roof-Main-Seam-0-0','House-Rear-Window-0-Glass','House-West-Window-0-Glass',
    'House-Interior-Sofa','House-Garden-Hedge-0','House-Garden-Tree-0',
    'House-Tower-Rear-Gable','House-Garage-Rear-Gable']) assert.ok(named(name),name+' missing');
  for(const [name,x,y,axis] of [['House-Facade-Tower',0.25,4.7,'x'],['House-Facade-Rear',-3.3,5.35,'x'],['House-Facade-West',-0.95,4.5,'z']]) assertAperture(root,name,x,y,axis);
  const glass=root.listMaterials().find(item=>item.getName()==='House-Glazing');
  assert.equal(glass.getAlphaMode(),'BLEND');
  assert.ok(glass.getBaseColorFactor()[3]<0.5,'window must reveal modeled interior depth');
});

test('House tower rooms are not blocked by a hidden retained exterior facade',async()=>{
  const {root}=await house();
  assertAperture(root,'House-Facade-Left',0.25,4.7);
  assertAperture(root,'House-Facade-Left',0.25,1.87);
});

test('House full-turn silhouette closes exposed connecting walls and pitched gable slots',async()=>{
  const {root}=await house();
  for(const [origin,direction,expected] of [
    [[6,9,0],[-4.5,-3.3,0],'House-Main-East-Gable'],
    [[-7,6.1,2],[1,0,0],'House-Facade-West'],
    [[1.5,6.08,5],[0,0,-1],'House-Facade-Tower'],
    [[3.25,6,-5],[0,0,1],'House-Garage-Rear-Gable'],
  ]) assert.equal(firstHit(root,origin,direction),expected,'outside ray must meet '+expected);
});

test('House landscaping leaves the garage approach clear',async()=>{
  const {root}=await house();
  const inverse=new Matrix4().fromArray(root.listNodes().find(node=>node.getName()==='InterestShield-house-original-refined-v2').getWorldMatrix()).invert();
  const shrubs=root.listNodes().filter(node=>node.getName().startsWith('House-Garden-Shrub-'));
  assert.equal(shrubs.length,10);
  for(const node of shrubs) {
    const matrix=inverse.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
    const points=node.getMesh().listPrimitives().flatMap(p=>Array.from({length:p.getAttribute('POSITION').getCount()},(_,i)=>new Vector3().fromArray(p.getAttribute('POSITION').getElement(i,[])).applyMatrix4(matrix)));
    const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minZ=Math.min(...points.map(p=>p.z)),maxZ=Math.max(...points.map(p=>p.z));
    assert.ok(maxX<1.65 || minX>4.85 || maxZ<3 || minZ>4.75,node.getName()+' blocks the garage approach');
  }
});

test('House retains normalized finite geometry, stable footing and bounded triangles',async()=>{
  const {root,record}=await house();
  const bounds=getBounds(root.listScenes()[0]);
  assert.ok(Math.abs(Math.max(...bounds.max.map((v,i)=>v-bounds.min[i]))-3.2)<0.002);
  assert.ok(Math.abs(bounds.min[1])<0.002);
  let triangles=0;
  for(const mesh of root.listMeshes()) for(const primitive of mesh.listPrimitives()) {
    const p=primitive.getAttribute('POSITION');
    assert.ok(Array.from(p.getArray()).every(Number.isFinite));
    triangles+=(primitive.getIndices()?.getCount()??p.getCount())/3;
  }
  assert.equal(triangles,record.triangles);
  assert.ok(triangles<120000 && triangles>8000,'detailed architectural geometry must remain within a measured budget');
});
