import { createRequire } from 'node:module';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as T from '../../../apps/web/node_modules/three/build/three.module.js';
const require=createRequire(new URL('../../../apps/media/package.json',import.meta.url));
const {NodeIO,getBounds}=require('@gltf-transform/core');
const {ALL_EXTENSIONS}=require('@gltf-transform/extensions');
const {MeshoptDecoder}=require('meshoptimizer');
const sharp=require('sharp');
const base=new URL('../../../',import.meta.url),file=p=>new URL(p,base);
const sha=b=>createHash('sha256').update(b).digest('hex');
await MeshoptDecoder.ready;
const bytes=await readFile(file('apps/web/public/heroes/medical.glb'));
const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(bytes);
const root=document.getRoot(),nodes=root.listNodes(),auth=nodes.find(n=>n.getName()==='InterestShield-medical-original-refined-v2');
const inverse=new T.Matrix4().fromArray(auth.getWorldMatrix()).invert();
const pkey=p=>p.toArray().map(x=>Math.round(x/1e-7)).join(',');
function geometry(n,world=false){
  const matrix=new T.Matrix4().fromArray(n.getWorldMatrix());if(!world)matrix.premultiply(inverse);
  const normalMatrix=new T.Matrix3().getNormalMatrix(matrix),ts=[];
  for(const p of n.getMesh()?.listPrimitives()??[]){
    const pos=p.getAttribute('POSITION'),norm=p.getAttribute('NORMAL'),uv=p.getAttribute('TEXCOORD_0'),ix=p.getIndices();
    for(let i=0;i<(ix?.getCount()??pos.getCount());i+=3){
      const ids=[0,1,2].map(j=>ix?ix.getScalar(i+j):i+j),v=ids.map(i=>new T.Vector3().fromArray(pos.getElement(i,[])).applyMatrix4(matrix));
      const normal=ids.map(i=>new T.Vector3().fromArray(norm.getElement(i,[])).applyMatrix3(normalMatrix).normalize());
      const cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
      const box=new T.Box3().setFromPoints(v);
      ts.push({v,normal,ids,keys:v.map(pkey),box,cross,uv:ids.map(i=>uv?.getElement(i,[])),material:p.getMaterial()?.getName(),index:i/3});
    }
  }
  return ts;
}
const parts=nodes.filter(n=>n.getMesh()).map((n,i)=>({n,label:n.getName()+'@'+nodes.indexOf(n),i,ts:geometry(n),world:geometry(n,true)}));
for(const p of parts)p.box=p.ts.reduce((b,t)=>b.union(t.box),new T.Box3());
function topology(ts){
  const edges=new Map(),vertices=new Set(),faces=new Set();let degenerates=0,volume=0,area=0,normalMismatch=0,dupes=0,uvZero=0;
  for(const t of ts){
    if(t.cross.lengthSq()<1e-20){degenerates++;continue;}
    for(const k of t.keys)vertices.add(k);
    const f=[...t.keys].sort().join('|');if(faces.has(f))dupes++;faces.add(f);
    for(let i=0;i<3;i++){const a=t.keys[i],b=t.keys[(i+1)%3],k=[a,b].sort().join('|');const e=edges.get(k)??{count:0,balance:0};e.count++;e.balance+=a<b?1:-1;edges.set(k,e);}
    area+=t.cross.length()/2;volume+=t.v[0].dot(t.v[1].clone().cross(t.v[2]))/6;
    if(t.cross.dot(t.normal.reduce((s,v)=>s.add(v),new T.Vector3()))<-t.cross.length()*1e-3)normalMismatch++;
    if(t.uv[0]){const [a,b,c]=t.uv;const d=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(d)<1e-12)uvZero++;}
  }
  return {faces:ts.length,vertices:vertices.size,edges:edges.size,boundary:[...edges.values()].filter(e=>e.count===1).length,nonmanifold:[...edges.values()].filter(e=>e.count>2).length,inconsistent:[...edges.values()].filter(e=>e.count===2&&e.balance!==0).length,degenerates,dupes,volume,area,normalMismatch,uvZero};
}
const tmp=new T.Vector3(),a1=new T.Vector3(),a2=new T.Vector3(),ray=new T.Ray();
function crossings(a,b,proper=true){
  if(!a.box.intersectsBox(b.box))return [];
  const result=[];
  for(const [from,to]of [[a,b],[b,a]])for(let i=0;i<3;i++){
    const origin=from.v[i],delta=from.v[(i+1)%3].clone().sub(origin),length=delta.length();if(length<1e-10)continue;
    ray.set(origin,delta.divideScalar(length));
    if(!ray.intersectTriangle(...to.v,false,tmp))continue;
    const distance=tmp.distanceTo(origin);if(distance>length+1e-8)continue;
    if(proper&&(distance<1e-7||distance>length-1e-7))continue;
    const bary=T.Triangle.getBarycoord(tmp,...to.v,new T.Vector3());
    if(proper&&Math.min(bary.x,bary.y,bary.z)<1e-7)continue;
    result.push(tmp.clone());
  }
  return result;
}
function selfIntersections(ts){
  const sorted=ts.filter(t=>t.cross.lengthSq()>1e-20).sort((a,b)=>a.box.min.x-b.box.min.x),examples=[];let count=0;
  for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length&&sorted[j].box.min.x<=sorted[i].box.max.x+1e-9;j++){
    const a=sorted[i],b=sorted[j];if(a.keys.some(k=>b.keys.includes(k)))continue;
    const hit=crossings(a,b);if(!hit.length)continue;count++;
    if(examples.length<12)examples.push({faces:[a.index,b.index],points:hit.map(p=>p.toArray())});
  }
  return {count,examples};
}
function pointInside(p,ts){
  ray.set(p,new T.Vector3(1,0.027159,0.013241).normalize());const distances=[];
  for(const t of ts)if(ray.intersectTriangle(...t.v,false,tmp)){const d=tmp.distanceTo(p);if(d>1e-8&&!distances.some(v=>Math.abs(v-d)<1e-7))distances.push(d);}
  return distances.length%2===1;
}
function separation(left,right,cutoff=0.01){
  let best=Infinity,pair=null,penetration=null,intersects=false;
  // Lower bounds are exact point-to-AABB and AABB-to-AABB distances; no infinite-ray contact shortcut.
  for(const source of [left,right]){const target=source===left?right:left;
    for(const t of source.ts)for(const p of t.v){
      if(target.box.distanceToPoint(p)>best)continue;
      for(const q of target.ts){if(q.box.distanceToPoint(p)>best)continue;
        const s=new T.Triangle(...q.v).closestPointToPoint(p,new T.Vector3()).distanceTo(p);
        if(s<best){best=s;pair=[p.toArray(),new T.Triangle(...q.v).closestPointToPoint(p,new T.Vector3()).toArray()];}
      }
    }
  }
  for(const a of left.ts)for(const b of right.ts){
    const lower=Math.hypot(...['x','y','z'].map(k=>Math.max(0,a.box.min[k]-b.box.max[k],b.box.min[k]-a.box.max[k])));
    if(lower>best+1e-10)continue;
    const hit=crossings(a,b,false);if(hit.length){best=0;intersects=true;pair=hit[0].toArray();break;}
    for(let i=0;i<3;i++)for(let j=0;j<3;j++){
      const d=a.v[(i+1)%3].clone().sub(a.v[i]),len=d.length();if(len<1e-10)continue;
      ray.set(a.v[i],d.divideScalar(len));ray.distanceSqToSegment(b.v[j],b.v[(j+1)%3],a1,a2);
      if(a1.distanceTo(a.v[i])<=len+1e-8&&a1.distanceTo(a2)<best){best=a1.distanceTo(a2);pair=[a1.toArray(),a2.toArray()];}
    }
  }
  if(!intersects&&left.box.intersectsBox(right.box)){
    outer:for(const [source,target]of [[left,right],[right,left]])for(const t of source.ts)for(const p of t.v){if(target.box.containsPoint(p)&&pointInside(p,target.ts)){penetration=p.toArray();break outer;}}
  }
  return {gap:best,intersects,containedVertex:penetration,pair};
}
function part(name){const p=parts.find(p=>p.n.getName()===name);if(!p)throw Error(name);return p;}
function groupParts(name){const group=nodes.find(n=>n.getName()===name),children=new Set();group.traverse(n=>children.add(n));return parts.filter(p=>children.has(p.n));}
const stats=[];
for(const p of parts){const top=topology(p.ts),self=selfIntersections(p.ts);stats.push({name:p.label,mesh:p.n.getMesh().getName(),box:{min:p.box.min.toArray(),max:p.box.max.toArray()},...top,self});}
const contactPairs=[];
function check(a,b){const l=typeof a==='string'?part(a):a,r=typeof b==='string'?part(b):b;const value=separation(l,r);contactPairs.push({a:l.label,b:r.label,...value});return value;}
for(const [a,b]of [
 ['M-Body-Frame','M-Body-Front'],['M-Body-Frame','M-Body-Back'],['M-Gasket','M-Body-Frame'],['M-Gasket','M-Case-Lid'],
 ['M-Badge-Plate','M-Body-Front'],['M-Badge-Rim','M-Badge-Plate'],['M-Front-Molded-Bead','M-Body-Front'],
 ['M-Handle-Grip','M-Handle-Tube'],['M-Main-Tube','M-Y-Junction'],['M-Chestpiece-Body','M-Chestpiece-Rim'],['M-Chestpiece-Body','M-Chestpiece-Diaphragm'],['M-Chestpiece-Rim','M-Chestpiece-Diaphragm'],['M-Chestpiece-Connector','M-Chestpiece-Body'],['M-Chestpiece-Connector','M-Chestpiece-Collar'],['M-Chestpiece-Collar','M-Main-Tube'],['M-Chestpiece-Connector','M-Main-Tube']
])check(a,b);
for(const s of ['Left','Right'])for(const [a,b]of [[`M-Y-${s}-Branch`,'M-Y-Junction'],[`M-Y-${s}-Branch`,`M-Ear-${s}-Tube`],[`M-Ear-${s}-Tube`,`M-Ear-${s}-Tip`],[`M-Handle-Base-${s}`,'M-Case-Lid'],[`M-Handle-Base-${s}`,'M-Handle-Tube']])check(a,b);
// Each physical hardware item must have a contact path to its own mount, not just its group.
const hardware=[];
for(const p of parts.filter(p=>/^M-(Corner-|Latch-|Hinge-|Handle-|Foot-)/.test(p.n.getName()))){
  let candidates;
  const parent=p.n.getParentNode();
  if(/^M-(Corner-|Latch-|Hinge-)/.test(parent?.getName()??''))candidates=groupParts(parent.getName()).filter(q=>q!==p);
  else candidates=parts.filter(q=>q!==p&&/^M-Handle-/.test(q.n.getName()));
  candidates.push(part('M-Body-Frame'),part('M-Body-Front'),part('M-Body-Back'),part('M-Case-Lid'));
  candidates=candidates.filter(q=>p.box.clone().expandByScalar(0.012).intersectsBox(q.box));
  let best=null;
  for(const q of candidates){const v=separation(p,q);if(!best||v.gap<best.gap)best={other:q.label,...v};if(v.intersects||v.containedVertex||v.gap<0.0001)break;}
  hardware.push({name:p.label,...best});
}
// Cross-part collisions outside the intentionally joined component pairs.
const collisions=[];
const steth=groupParts('M-Stethoscope');
for(let i=0;i<steth.length;i++)for(let j=i+1;j<steth.length;j++){
  const a=steth[i],b=steth[j];if(!a.box.intersectsBox(b.box))continue;
  let count=0,example;
  for(const x of a.ts)for(const y of b.ts){const hit=crossings(x,y);if(hit.length){count++;example??={faces:[x.index,y.index],point:hit[0].toArray()};}}
  if(count)collisions.push({a:a.label,b:b.label,count,example});
}
let uniqueTriangles=0,instancedTriangles=0,vertices=0,decodedBytes=0;
for(const m of root.listMeshes())for(const p of m.listPrimitives()){uniqueTriangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;vertices+=p.getAttribute('POSITION').getCount();}
for(const p of parts)instancedTriangles+=p.ts.length;
for(const a of root.listAccessors())decodedBytes+=a.getArray().byteLength;
const textures=[];
for(const t of root.listTextures()){
 const {data,info}=await sharp(t.getImage()).raw().toBuffer({resolveWithObject:true});const channels=[];
 for(let c=0;c<Math.min(3,info.channels);c++){let min=255,max=0,sum=0;const values=new Set();for(let i=c;i<data.length;i+=info.channels){min=Math.min(min,data[i]);max=Math.max(max,data[i]);sum+=data[i];values.add(data[i]);}channels.push({min,max,mean:sum/(info.width*info.height),unique:values.size});}
 textures.push({name:t.getName(),bytes:t.getImage().length,width:info.width,height:info.height,channels});
}
const materials=root.listMaterials().map(m=>({name:m.getName(),baseColor:m.getBaseColorFactor(),roughness:m.getRoughnessFactor(),metalness:m.getMetallicFactor(),normalScale:m.getNormalScale(),doubleSided:m.getDoubleSided(),extensions:m.listExtensions().map(e=>e.extensionName)}));
async function total(u){let size=0;for(const d of await readdir(u,{withFileTypes:true})){const path=new URL(d.name+(d.isDirectory()?'/':''),u);size+=d.isDirectory()?await total(path):(await stat(path)).size;}return size;}
const publicBytes=await total(file('apps/web/public/'));
const result={sha256:sha(bytes),bytes:bytes.length,worldBounds:getBounds(root.listScenes()[0]),authoredToWorldScale:Math.cbrt(new T.Matrix4().fromArray(auth.getWorldMatrix()).determinant()),uniqueTriangles,instancedTriangles,meshNodes:parts.length,uniqueMeshes:root.listMeshes().length,vertices,decodedAccessorBytes:decodedBytes,publicBytes,publicHeadroom:10485760-publicBytes,materials,textures,stats,contactPairs,hardware,collisions};
await writeFile(new URL('./review-geometry-probe.log',import.meta.url),JSON.stringify(result,null,2)+'\n');
if(process.argv[1]?.endsWith('review-geometry-probe.mjs'))console.log(JSON.stringify({sha256:result.sha256,bytes:result.bytes,worldBounds:result.worldBounds,authoredToWorldScale:result.authoredToWorldScale,uniqueTriangles,instancedTriangles,meshNodes:parts.length,uniqueMeshes:root.listMeshes().length,vertices,decodedBytes,publicBytes,publicHeadroom:result.publicHeadroom,topologyProblems:stats.filter(s=>s.boundary||s.nonmanifold||s.inconsistent||s.degenerates||s.volume<0||s.normalMismatch||s.self.count),hardwareGaps:hardware.filter(s=>s.gap>0.0001&&!s.intersects&&!s.containedVertex),contactPairs,collisions},null,2));
export {parts,part,geometry,topology,separation,crossings,root,nodes,auth,inverse,result,base};
