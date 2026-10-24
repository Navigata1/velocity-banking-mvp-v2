import {writeFile,readFile} from 'node:fs/promises';
import * as T from '../../../apps/web/node_modules/three/build/three.module.js';
import {parts,result,crossings} from './review-geometry-probe.mjs';
const allWorld=parts.flatMap(p=>p.world.flatMap(t=>t.v));
const box=new T.Box3().setFromPoints(allWorld),sphere=box.getBoundingSphere(new T.Sphere());
const points=[...new Map(allWorld.map(p=>[p.toArray().map(x=>Math.round(x*1e7)).join(','),p])).values()];
const framing=[];
for(const aspect of [0.6,1,16/9]){
 const halfFov=Math.atan(Math.tan(32*Math.PI/360)*Math.min(1,Math.max(0.25,aspect))),distance=sphere.radius/Math.sin(halfFov)*1.08;
 const camera=new T.PerspectiveCamera(32,aspect,0.1,50);
 camera.position.copy(sphere.center).add(new T.Vector3(3.3,1.35,4.8).normalize().multiplyScalar(distance));camera.lookAt(sphere.center);camera.updateMatrixWorld(true);
 let maxX=0,maxY=0,minDepth=Infinity,maxDepth=-Infinity,extreme;
 for(let yaw=0;yaw<360;yaw+=5){const a=(yaw*Math.PI/180)-0.55,c=Math.cos(a),s=Math.sin(a);
  for(const p of points){const q=new T.Vector3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z).project(camera);
   if(Math.abs(q.x)>maxX){maxX=Math.abs(q.x);extreme={yaw,point:p.toArray(),ndc:q.toArray()};}maxY=Math.max(maxY,Math.abs(q.y));minDepth=Math.min(minDepth,q.z);maxDepth=Math.max(maxDepth,q.z);
  }
 }
 framing.push({aspect,distance,maxAbsNdcX:maxX,maxAbsNdcY:maxY,minDepth,maxDepth,extreme});
}
function closed(p){const s=result.stats.find(s=>s.name===p.label);return s.boundary===0&&s.nonmanifold===0&&s.inconsistent===0;}
function inside(point,target){
 const ray=new T.Ray(point,new T.Vector3(1,0.027159,0.013241).normalize()),q=new T.Vector3(),d=[];
 for(const t of target.ts)if(ray.intersectTriangle(...t.v,false,q)){const distance=q.distanceTo(point);if(distance>1e-7&&!d.some(v=>Math.abs(v-distance)<1e-7))d.push(distance);}
 return d.length%2===1;
}
const graph=new Map(parts.map(p=>[p,new Set()])),contacts=[];
function connected(a,b){
 for(const x of a.ts)for(const y of b.ts)if(crossings(x,y,false).length)return {kind:'surface'};
 for(const [source,target]of [[a,b],[b,a]])if(closed(target)){
  const seen=new Set();for(const t of source.ts)for(const p of t.v){const key=p.toArray().join(',');if(seen.has(key))continue;seen.add(key);if(target.box.containsPoint(p)&&inside(p,target))return {kind:'closed-solid-overlap'};}
 }
 return false;
}
for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
 const a=parts[i],b=parts[j];if(!a.box.intersectsBox(b.box))continue;
 const contact=connected(a,b);if(contact){graph.get(a).add(b);graph.get(b).add(a);contacts.push({a:a.label,b:b.label,...contact});}
}
const remaining=new Set(parts),components=[];
while(remaining.size){const seed=remaining.values().next().value,queue=[seed],component=[];remaining.delete(seed);
 while(queue.length){const p=queue.shift();component.push(p.label);for(const q of graph.get(p))if(remaining.delete(q))queue.push(q);}
 components.push(component);
}
const normals=[],uvs=[];
for(const p of parts){let minNorm=Infinity,maxNorm=0,minUV=Infinity,maxUV=-Infinity;
 for(const primitive of p.n.getMesh().listPrimitives()){
  const n=primitive.getAttribute('NORMAL'),uv=primitive.getAttribute('TEXCOORD_0');
  for(let i=0;i<n.getCount();i++){const length=Math.hypot(...n.getElement(i,[]));minNorm=Math.min(minNorm,length);maxNorm=Math.max(maxNorm,length);}
  for(let i=0;i<uv.getCount();i++)for(const value of uv.getElement(i,[])){minUV=Math.min(minUV,value);maxUV=Math.max(maxUV,value);}
 }
 normals.push({name:p.label,minNorm,maxNorm});uvs.push({name:p.label,minUV,maxUV});
}
const output={sha256:result.sha256,framing,sphere:{center:sphere.center.toArray(),radius:sphere.radius},components,contacts,normalLengthRange:[Math.min(...normals.map(n=>n.minNorm)),Math.max(...normals.map(n=>n.maxNorm))],UVRange:[Math.min(...uvs.map(n=>n.minUV)),Math.max(...uvs.map(n=>n.maxUV))],UVOutsideUnit:uvs.filter(u=>u.minUV<0||u.maxUV>1)};
await writeFile(new URL('./review-geometry-supplement.log',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({...output,contacts:output.contacts.length},null,2));
