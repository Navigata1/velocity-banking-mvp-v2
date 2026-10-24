import * as T from '../../../apps/web/node_modules/three/build/three.module.js';
import {readFile,writeFile} from 'node:fs/promises';
import {part,parts,result,root,base} from './review-geometry-probe.mjs';
const ray=new T.Ray(),p=new T.Vector3();
function hits(ts,o,d,cull=false){
 ray.set(new T.Vector3(...o),new T.Vector3(...d).normalize());const output=[];
 for(const t of ts)if(ray.intersectTriangle(...t.v,cull,p)&&!output.some(h=>new T.Vector3(...h.point).distanceTo(p)<1e-7))output.push({point:p.toArray(),face:t.index,normal:t.cross.clone().normalize().toArray(),distance:p.distanceTo(ray.origin)});
 return output.sort((a,b)=>a.distance-b.distance);
}
const badge=[];
for(const y of [0.50,0.64,0.80])for(const direction of [-1,1]){
 const o=[0,y,0.428],d=[direction,0,0];badge.push({o,d,unculled:hits(part('M-Badge-Rim').ts,o,d),front:hits(part('M-Badge-Rim').ts,o,d,true)});
}
const main=part('M-Main-Tube'),tubeChest=[];
for(const name of ['M-Chestpiece-Body','M-Chestpiece-Rim','M-Chestpiece-Diaphragm']){
 const target=part(name),inside=[];
 for(const t of main.ts)for(const v of t.v){
   if(!target.box.containsPoint(v))continue;
   const h=hits(target.ts,v.toArray(),[1,0.027159,0.013241]);if(h.length%2!==1)continue;
   let depth=Infinity,nearest;
   for(const q of target.ts){const point=new T.Triangle(...q.v).closestPointToPoint(v,new T.Vector3()),distance=point.distanceTo(v);if(distance<depth){depth=distance;nearest=point.toArray();}}
   if(!inside.some(p=>new T.Vector3(...p.point).distanceTo(v)<1e-7))inside.push({point:v.toArray(),depth,nearest});
 }
 inside.sort((a,b)=>b.depth-a.depth);tubeChest.push({name,insideVertices:inside.length,maxDepth:inside[0],examples:inside.slice(0,6)});
}
const earClearances=result.contactPairs.filter(r=>/M-Y-(Left|Right)-Branch/.test(r.a)&&/M-Ear/.test(r.b));
// Probe the visible slot between the unequal-radius open ends directly along each bow tangent.
const earRays=[];
for(const [side,origin,direction] of [['Left',[-1.05,0.52,0.56],[-0.14,0.17,-0.01]],['Right',[-0.17,0.52,0.56],[0.14,0.17,-0.01]]]){
 for(const zoff of [0.025,0.03,0.035]){
  const o=[origin[0],origin[1],origin[2]+zoff];earRays.push({side,o,direction,rubber:hits(part(`M-Y-${side}-Branch`).ts,o,direction),ear:hits(part(`M-Ear-${side}-Tube`).ts,o,direction)});
 }
}
const cavity=[];
for(const x of [-0.75,0,0.75])for(const y of [0.3,0.65,1.0]){
 const body=parts.filter(p=>/^M-Body-(Frame|Front|Back)$/.test(p.n.getName())).flatMap(p=>p.ts);
 cavity.push({x,y,hits:hits(body,[x,y,-1],[0,0,1])});
}
const instancing=root.listMeshes().map(m=>({nodes:parts.filter(p=>p.n.getMesh()===m).map(p=>p.label),triangles:m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0)})).filter(m=>m.nodes.length>1);
const output={sha256:result.sha256,earClearances,badge,tubeChest,earRays,cavity,instancing,ground:parts.filter(p=>/^M-Foot-|^M-Chestpiece-Body$|^M-Main-Tube$/.test(p.n.getName())).map(p=>({name:p.label,minY:Math.min(...p.world.flatMap(t=>t.v.map(p=>p.y)))}))};
await writeFile(new URL('./review-geometry-focused.log',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
