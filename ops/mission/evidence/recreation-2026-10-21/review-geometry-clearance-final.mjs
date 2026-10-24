import assert from 'node:assert/strict';
import {mesh,bounds,pair,pins,finiteHits,named} from './review-geometry-probe.mjs';
import {Vector3 as V} from '../../../apps/web/node_modules/three/build/three.module.js';
const out=(tag,value)=>console.log(tag,JSON.stringify(value));out('PINS',pins);
const rb=bounds(mesh('R-Cabin-Roof'));
// Clip each triangle to the roof's XZ envelope; Y gap is a conservative lower bound.
function clip(poly,axis,edge,sign){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(a[axis]-edge)*sign,db=(b[axis]-edge)*sign;if(da>=0)out.push(a);if(da*db<0)out.push(a.clone().lerp(b,da/(da-db)));}return out;}
for(const name of ['R-Boom','R-Mainsail','R-Jib','R-Main-Sheet','R-Jib-Sheet']){
  const ts=mesh(name),clipped=ts.flatMap(t=>{let p=t;for(const [axis,edge,sign]of [['x',rb.min.x,1],['x',rb.max.x,-1],['z',rb.min.z,1],['z',rb.max.z,-1]])p=clip(p,axis,edge,sign);return p;});
  const minY=clipped.length?Math.min(...clipped.map(p=>p.y)):null,gap=minY===null?null:minY-rb.max.y,contact=pair(ts,mesh('R-Cabin-Roof'));assert.equal(contact.crossings.length,0);if(gap!==null)assert.ok(gap>0,'positive roof envelope clearance '+name);out('ROOF_ENVELOPE_CLEARANCE',{name,roofTop:rb.max.y,minYOverXZEnvelope:minY,conservativeVerticalGap:gap,...contact});
}
for(const [a,b]of [['R-Mast','R-Boom'],['R-Mainsail','R-Mast'],['R-Mainsail','R-Boom'],['R-Jib','R-Standing-Stay-0'],['R-Main-Sheet','R-Boom'],['R-Main-Sheet','R-Winch-Drum-1'],['R-Jib-Sheet','R-Jib'],['R-Jib-Sheet','R-Winch-Drum--1']]){const contact=pair(a,b);assert.ok(contact.crossings.length,'actual finite contact '+a+' / '+b);out('FINAL_RIG_CONTACT',{a,b,...contact});}
// A displaced real boom is a negative control, restored in memory only.
const boom=named('R-Boom'),old=boom.getTranslation(),deltaY=-.16;
try{boom.setTranslation([old[0],old[1]+deltaY,old[2]]);const contact=pair('R-Boom','R-Cabin-Roof');assert.ok(contact.crossings.length);out('REAL_BOOM_LOWERED_CONTROL',{deltaY,detected:true,...contact});}finally{boom.setTranslation(old);}
