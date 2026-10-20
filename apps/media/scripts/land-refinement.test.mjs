import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Vector3, Ray } from '../../web/node_modules/three/build/three.module.js';
import sharp from 'sharp';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';

const hash=b=>createHash('sha256').update(b).digest('hex');
async function land() {
  const record=JSON.parse(await readFile(new URL('../hero-imported.json',import.meta.url),'utf8')).find(x=>x.id==='land');
  assert.equal(record?.quality,'refined-textured','Land must replace the flat-color study with a protected textured model');
  const bytes=await readFile(new URL('../../web/public/heroes/land.glb',import.meta.url));
  await MeshoptDecoder.ready;
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const root=(await io.readBinary(bytes)).getRoot();
  const inverse=new Matrix4().fromArray(root.listNodes().find(n=>n.getName()==='InterestShield-land-original-refined-v2').getWorldMatrix()).invert();
  const named=name=>{const n=root.listNodes().find(n=>n.getName()===name);assert.ok(n,name+' missing');return n;};
  const triangles=node=>node.getMesh().listPrimitives().flatMap(p=>{
    const matrix=inverse.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix())),positions=p.getAttribute('POSITION'),indices=p.getIndices();
    return Array.from({length:indices.getCount()/3},(_,i)=>[0,1,2].map(j=>new Vector3().fromArray(positions.getElement(indices.getScalar(i*3+j),[])).applyMatrix4(matrix)));
  });
  const components=node=>node.getMesh().listPrimitives().flatMap(p=>{
    const positions=p.getAttribute('POSITION'),indices=p.getIndices(),parent=Array.from({length:positions.getCount()},(_,i)=>i);
    const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
    for(let i=0;i<indices.getCount();i+=3)for(const j of [1,2])parent[find(indices.getScalar(i+j))]=find(indices.getScalar(i));
    const matrix=inverse.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix())),groups=new Map();
    for(const i of new Set(indices.getArray())){const key=find(i);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(new Vector3().fromArray(positions.getElement(i,[])).applyMatrix4(matrix));}
    return [...groups.values()];
  });
  return {record,bytes,root,named,triangles,components};
}
function groundY(triangles,x,z) {
  const ray=new Ray(new Vector3(x,5,z),new Vector3(0,-1,0)),point=new Vector3();let highest=-Infinity;
  for(const t of triangles) if(ray.intersectTriangle(...t,false,point)) highest=Math.max(highest,point.y);
  assert.ok(Number.isFinite(highest),'ground ray missed at '+x+','+z); return highest;
}

test('Land preserves generated sources, embedded PBR maps and the standing collection budget',async()=>{
  const {record,bytes,root}=await land();
  assert.equal(hash(bytes),record.sha256);
  assert.ok(bytes.length<0.7*1024*1024,'Land refinement must fit current collection headroom without raising budgets');
  assert.equal(hash((await readFile(new URL('./build-refined-land.mjs',import.meta.url),'utf8')).replace(/\r\n/g,'\n')),record.sourceSha256);
  const sources=JSON.parse(await readFile(new URL('../sources/land/materials.json',import.meta.url),'utf8'));
  assert.equal(hash(JSON.stringify(sources)),record.materialSourceSha256);
  for(const s of sources.images) assert.equal(hash(await readFile(new URL('../sources/land/'+s.file,import.meta.url))),s.sha256);
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
  assert.ok(json.buffers.every(b=>!b.uri) && json.images.every(i=>i.bufferView!==undefined && !i.uri));
  for(const name of ['Land-Meadow','Land-Soil','Land-Bark']) {
    const m=root.listMaterials().find(m=>m.getName()===name);
    assert.ok(m?.getBaseColorTexture() && m.getNormalTexture() && m.getMetallicRoughnessTexture(),name+' lacks physical surface maps');
  }
  for(const t of root.listTextures()) {const m=await sharp(t.getImage()).metadata();assert.ok(m.width<=1024 && m.height<=1024);}
  async function size(url) {let n=0;for(const e of await readdir(url,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),url);n+=e.isDirectory()?await size(p):(await stat(p)).size;}return n;}
  assert.ok(await size(new URL('../../web/public/',import.meta.url))<=10*1024*1024,'public collection budget remains10MiB');
});

test('Land has real pond depth and non-flat terrain rather than a water disk over grass',async()=>{
  const {named,triangles}=await land();
  const meadow=triangles(named('Land-Terrain-Meadow')).flat(),basin=triangles(named('Land-Pond-Basin')).flat(),water=triangles(named('Land-Pond-Water')).flat();
  assert.ok(meadow.length>2000 && Math.max(...meadow.map(p=>p.y))-Math.min(...meadow.map(p=>p.y))>0.12);
  const level=water[0].y;
  assert.ok(water.every(p=>Math.abs(p.y-level)<0.002),'water surface must be level');
  assert.ok(groundY([...triangles(named('Land-Terrain-Meadow')),...triangles(named('Land-Pond-Basin'))],0.7,0.65)<level-0.15,'actual pond center must be recessed');
  assert.ok(basin.some(p=>p.y<level-0.15));
  const ground=[...triangles(named('Land-Terrain-Meadow')),...triangles(named('Land-Pond-Basin'))];
  for(const p of water.filter((_,i)=>i%12===0)) assert.ok(groundY(ground,p.x,p.z)<=level+0.012,'ground must not poke through visible water');
});

test('Land gravel ribbon follows the actual triangulated terrain without floating',async()=>{
  const {named,triangles}=await land(),ground=[...triangles(named('Land-Terrain-Meadow')),...triangles(named('Land-Pond-Basin'))];
  const points=triangles(named('Land-Gravel-Path')).flat();assert.ok(points.length>100);
  for(let i=0;i<points.length;i+=17) {
    const p=points[i],gap=p.y-groundY(ground,p.x,p.z);
    assert.ok(gap>=-0.003 && gap<0.035,'path-ground gap '+gap);
  }
});

test('Land keeps four grounded survey stakes and three connected textured trees',async()=>{
  const {root,named,triangles}=await land(),ground=[...triangles(named('Land-Terrain-Meadow')),...triangles(named('Land-Pond-Basin'))];
  for(let i=0;i<4;i++) {
    const p=triangles(named('Land-Survey-Stake-'+i)).flat(),x=(Math.min(...p.map(p=>p.x))+Math.max(...p.map(p=>p.x)))/2,z=(Math.min(...p.map(p=>p.z))+Math.max(...p.map(p=>p.z)))/2;
    assert.ok(Math.abs(Math.min(...p.map(p=>p.y))-groundY(ground,x,z))<0.025);
  }
  for(const [i,x,z] of [[0,-1.25,0.2],[1,-0.25,-1.05],[2,1.4,-0.5]]) {
    const p=triangles(named('Land-Tree-'+i+'-Trunk')).flat(),y=groundY(ground,x,z);
    assert.ok(Math.abs(Math.min(...p.map(p=>p.y))-y)<0.06 && Math.max(...p.map(p=>p.y))>y+0.7);
    assert.ok(triangles(named('Land-Tree-'+i+'-Leaves')).length>800);
  }
  const leaf=root.listMaterials().find(m=>m.getName()==='Land-Leaves');
  assert.equal(leaf.getAlphaMode(),'MASK');
  const {data,info}=await sharp(leaf.getBaseColorTexture().getImage()).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let clear=0,opaque=0;for(let i=3;i<data.length;i+=info.channels){if(data[i]<10)clear++;if(data[i]>245)opaque++;}
  assert.ok(clear>info.width*info.height*0.1 && opaque>info.width*info.height*0.1,'leaf texture must contain a real cutout, not a painted background');
});

test('Land cutaway layers meet the terrain and preserve finite normalized geometry',async()=>{
  const {record,root,named,triangles}=await land(),terrain=triangles(named('Land-Terrain-Meadow')).flat();
  for(const name of ['Land-Cutaway-Bedrock','Land-Cutaway-Gravel','Land-Cutaway-Subsoil','Land-Cutaway-Topsoil']) assert.ok(triangles(named(name)).length>10);
  const edge=new Map();
  for(const p of triangles(named('Land-Cutaway-Topsoil')).flat()) {const key=p.x.toFixed(3)+','+p.z.toFixed(3);if(!edge.has(key)||edge.get(key).y<p.y)edge.set(key,p);}
  const rim=[...edge.values()];
  for(let i=0;i<rim.length;i+=7) assert.ok(terrain.some(q=>pDistance(rim[i],q)<0.003),'cut face detaches from terrain');
  const b=getBounds(root.listScenes()[0]);
  assert.ok(Math.abs(Math.max(...b.max.map((v,i)=>v-b.min[i]))-3.2)<0.002 && Math.abs(b.min[1])<0.002);
  let count=0;for(const m of root.listMeshes())for(const p of m.listPrimitives()) {assert.ok(Array.from(p.getAttribute('POSITION').getArray()).every(Number.isFinite));count+=p.getIndices().getCount()/3;}
  assert.equal(count,record.triangles);assert.ok(count>15000 && count<100000);
});
test('Land cut faces include actual stone/root detail and varied leaf shading',async()=>{
  const {named,triangles}=await land();
  assert.ok(triangles(named('Land-Cutaway-Inclusions')).length>300);
  assert.ok(triangles(named('Land-Cutaway-Roots')).length>300);
  const primitive=named('Land-Tree-0-Leaves').getMesh().listPrimitives()[0];
  const colors=primitive.getAttribute('COLOR_0');
  assert.ok(colors && new Set(Array.from(colors.getArray())).size>8,'leaf tint must vary across actual geometry');
});
const pDistance=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);

test('Land woody components actually enter their trunks and reject detached branches',async()=>{
  const {named,triangles,components}=await land();
  for(let i=0;i<3;i++) {
    const trunk=triangles(named('Land-Tree-'+i+'-Trunk')),branches=named('Land-Tree-'+i+'-Branches');
    const inside=p=>{
      const ray=new Ray(p,new Vector3(1,0.027,0.013).normalize()),point=new Vector3(),hits=[];
      for(const t of trunk)if(ray.intersectTriangle(...t,false,point)){const d=pDistance(p,point);if(d>1e-6&&!hits.some(h=>Math.abs(h-d)<1e-5))hits.push(d);}
      return hits.length%2===1;
    };
    const connected=()=>{const parts=components(branches);assert.ok(parts.length>=13,'must inspect separate woody tubes');return parts.every(part=>part.some(inside));};
    assert.ok(connected(),'a woody component is detached from tree'+i);
    if(i===0) {const p=branches.getTranslation();branches.setTranslation([p[0],p[1]+4,p[2]]);assert.equal(connected(),false,'contact verifier must reject an intentionally detached in-memory mesh');}
  }
});

test('Land cutaway has outward-facing lower joins, corners and a closed underside',async()=>{
  const {named,triangles}=await land();
  const faces=['Bedrock','Gravel','Subsoil','Topsoil'].flatMap(n=>triangles(named('Land-Cutaway-'+n)));
  const first=(mesh,origin,direction)=>{
    const ray=new Ray(new Vector3(...origin),new Vector3(...direction)),point=new Vector3();let closest=null,distance=Infinity;
    for(const t of mesh)if(ray.intersectTriangle(...t,true,point)){const d=pDistance(ray.origin,point);if(d<distance){distance=d;closest=point.clone();}}return closest;
  };
  for(let i=0;i<12;i++)for(const y of [0.1,0.26,0.43,0.62]) {
    const x=-1.98+i*3.96/11,z=-1.58+i*3.16/11;
    for(const [o,d,axis,expected] of [[[x,y,-3],[0,0,1],'z',-1.6],[[x,y,3],[0,0,-1],'z',1.6],[[-3,y,z],[1,0,0],'x',-2],[[3,y,z],[-1,0,0],'x',2]]) {
      const p=first(faces,o,d);assert.ok(p&&Math.abs(p[axis]-expected)<0.003,'cut face gap or reversed winding');
    }
  }
  const bottom=named('Land-Foundation');
  for(const x of [-1.8,0,1.8])for(const z of [-1.4,0,1.4])assert.ok(Math.abs(first(triangles(bottom),[x,-1,z],[0,1,0])?.y??Infinity)<0.003);
  const index=bottom.getMesh().listPrimitives()[0].getIndices(),array=index.getArray().slice();
  for(let i=0;i<array.length;i+=3)[array[i+1],array[i+2]]=[array[i+2],array[i+1]];index.setArray(array);
  assert.ok(Math.abs(first(triangles(bottom),[0,-1,0],[0,1,0])?.y??Infinity)>0.01,'underside verifier must reject intentionally reversed in-memory triangles');
});

test('Land rechecks the live collection budget inside locked asset publication',async()=>{
  const source=await readFile(new URL('./build-refined-land.mjs',import.meta.url),'utf8');
  const verify=text=>{
  let callback;
  simple(parse(text,{ecmaVersion:'latest',sourceType:'module'}),{CallExpression(n){if(n.callee.type==='Identifier'&&n.callee.name==='saveRefinedHero')callback=n.arguments[2];}});
  assert.ok(callback?.body?.type==='BlockStatement');
  let check,write,guard;
  simple(callback.body,{CallExpression(n){if(n.callee.name==='sizeOf')check=n;if(n.callee.name==='writeFile')write=n;},IfStatement(n){if(n.test.type==='BinaryExpression'&&n.test.left.name==='liveCollection')guard=n;}});
  assert.ok(check&&write&&guard&&check.end<guard.start&&guard.end<write.start,'collection budget must be rechecked in the publication callback before replacing bytes');
  const value=n=>n.type==='Literal'?n.value:n.type==='BinaryExpression'&&n.operator==='*'?value(n.left)*value(n.right):NaN;
  assert.equal(guard.test.operator,'>');assert.equal(value(guard.test.right),10*1024*1024);assert.equal(guard.consequent.type,'ThrowStatement');
  return guard;
  };
  const guard=verify(source);
  assert.throws(()=>verify(source.slice(0,guard.start)+source.slice(guard.end)),{code:'ERR_ASSERTION'},'guard verifier must reject an intentionally removed rejection branch');
});
