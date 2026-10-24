import {pins,nodes,mesh,triangles,bounds,topology,key,segmentHit,finiteHits,pair,closest} from './review-geometry-probe.mjs';
import {Vector3 as V,Triangle} from '../../../apps/web/node_modules/three/build/three.module.js';
const out=(tag,value)=>console.log(tag,JSON.stringify(value));out('PINS',pins);
// Strict interior crossing only: shared vertices, tangent joins and coplanar faces do not qualify.
function strictCrossing(a,b){for(const [s,t]of [[a,b],[b,a]])for(let k=0;k<3;k++){const p=segmentHit(s[k],s[(k+1)%3],t,1e-10);if(!p)continue;const length=s[k].distanceTo(s[(k+1)%3]);if(p.distanceTo(s[k])<1e-6||p.distanceTo(s[(k+1)%3])<1e-6||!length)continue;const bary=new Triangle(...t).getBarycoord(p,new V());if(bary&&Math.min(...bary.toArray())>1e-6)return p;}return null;}
for(const name of ['R-Hull','R-Deck','R-Cabin-Port','R-Cabin-Starboard','R-Keel','R-Rudder','R-Mainsail','R-Jib']){
  const ts=mesh(name).sort((a,b)=>a.box.min.x-b.box.min.x),crossings=[];let candidates=0;
  for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length&&ts[j].box.min.x<=ts[i].box.max.x+1e-10;j++){
    const a=ts[i],b=ts[j];if(!a.box.intersectsBox(b.box))continue;if(a.some(p=>b.some(q=>p.distanceTo(q)<1e-7)))continue;candidates++;const p=strictCrossing(a,b);if(p&&crossings.length<12)crossings.push({a:a.index,b:b.index,p:p.toArray()});
  }out('SELF_INTERSECTION',{name,candidates,crossings});
}
for(const x of [-1.5,-1,-.4,.3,.9,1.3]){
  const ts=mesh('R-Hull'),vertical=finiteHits(ts,new V(x,1,0),new V(x,0,0));
  const cross=finiteHits(ts,new V(x,.70,-.7),new V(x,.70,.7));
  out('HULL_CAVITY',{x,vertical:vertical.map(p=>({p:p.toArray(),normal:new Triangle(...closest(p,ts).triangle).getNormal(new V()).toArray()})),across:cross.map(p=>p.toArray())});
}
for(const name of ['R-Mainsail','R-Jib'])for(let i=0;i<4;i++)out('SAIL_STAY',{name,i,...pair(name,'R-Standing-Stay-'+i)});
for(const part of ['R-Jib-Sheet','R-Main-Sheet']){
  for(const support of part==='R-Jib-Sheet'?['R-Jib','R-Winch-Drum--1','R-Deck','R-Cabin-Port','R-Cabin-Starboard']:['R-Boom','R-Deck','R-Wheel','R-Cockpit-Wall-Port'])out('RUNNING_SHEET',{part,support,...pair(part,support)});
}
// Full scene union candidates for rail supports: intended roof clearance alone cannot prove a float.
for(const sign of [-1,1]){
  const rail='R-Grab-Rail-'+sign,ts=mesh(rail),box=bounds(ts),near=nodes.filter(n=>n.getMesh()&&n.getName()!==rail).filter(n=>{const b=bounds(triangles(n));return b.distanceToPoint(box.getCenter(new V()))<.7;});
  const candidates=near.map(n=>({name:n.getName(),...pair(ts,triangles(n))}));out('GRAB_RAIL_ALL_NEARBY',{rail,candidates});
}
