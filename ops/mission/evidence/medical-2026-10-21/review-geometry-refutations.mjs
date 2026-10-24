import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../../apps/web/node_modules/three/build/three.module.js';
import {part,crossings,result} from './review-geometry-probe.mjs';

test('actual main tubing must not penetrate the chestpiece away from the connector',()=>{
 const tube=part('M-Main-Tube');const witnesses=[];
 for(const name of ['M-Chestpiece-Body','M-Chestpiece-Rim','M-Chestpiece-Diaphragm']){
   const other=part(name);let count=0,example;
   for(const a of tube.ts)for(const b of other.ts)for(const point of crossings(a,b)){
     if(point.x<0.8)continue;count++;example??=point.toArray();
   }
   witnesses.push({name,count,example});
 }
 console.log({sha256:result.sha256,witnesses});
 assert.equal(witnesses.reduce((s,w)=>s+w.count,0),0,'actual tube triangles cross the chestpiece on the far side from its x=0.57..0.75 connector');
});

for(const side of ['Left','Right'])test(`actual ${side} earbow must touch a rubber surface, not just pass an open-mesh parity test`,()=>{
 const pair=result.contactPairs.find(p=>p.a.startsWith(`M-Y-${side}-Branch@`)&&p.b.startsWith(`M-Ear-${side}-Tube@`));
 console.log(pair);
 assert.ok(pair.gap<0.0001||pair.intersects,`actual all-feature triangle separation is ${pair.gap} authored units (${pair.gap*result.authoredToWorldScale} stage units)`);
});

test('actual exposed inner badge rim must face the aperture, not share outward normals of its outer wall',()=>{
 const rim=part('M-Badge-Rim'),origin=new T.Vector3(0,0.64,0.449),direction=new T.Vector3(1,0,0),ray=new T.Ray(origin,direction),p=new T.Vector3();
 const all=[],front=[];
 for(const t of rim.ts){
   if(ray.intersectTriangle(...t.v,false,p))all.push({distance:p.distanceTo(origin),point:p.toArray(),normal:t.cross.clone().normalize().toArray(),face:t.index});
   if(ray.intersectTriangle(...t.v,true,p))front.push({distance:p.distanceTo(origin),point:p.toArray(),face:t.index});
 }
 all.sort((a,b)=>a.distance-b.distance);front.sort((a,b)=>a.distance-b.distance);
 console.log({origin:origin.toArray(),all,front});
 assert.ok(all.length>0,'the aperture ray must hit real rim geometry');
 assert.ok(front.length>0&&Math.abs(all[0].distance-front[0].distance)<1e-7,'first inner surface disappears with normal back-face culling');
});
