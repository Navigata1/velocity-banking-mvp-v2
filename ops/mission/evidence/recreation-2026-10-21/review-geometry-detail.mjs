import assert from 'node:assert/strict';
import {pins,doc,nodes,named,mesh,triangles,bounds,topology,closest,finiteHits,intersections,pair,rings,seamReport,key} from './review-geometry-probe.mjs';
import {Vector3 as V,Triangle,Matrix4,Box3} from '../../../apps/web/node_modules/three/build/three.module.js';
const out=(tag,value)=>console.log(tag,JSON.stringify(value));
out('PINS',pins);
const roof=mesh('R-Cabin-Roof'),boom=mesh('R-Boom'),sail=mesh('R-Mainsail');
for(const x of [-0.2,0,0.2,0.4,0.55,0.6]){
  const start=new V(x,1,0),end=new V(x,1.3,0);
  out('ROOF_BOOM_VERTICAL_SECTION',{x,roof:finiteHits(roof,start,end).map(p=>p.toArray()),boom:finiteHits(boom,start,end).map(p=>p.toArray()),main:finiteHits(sail,start,end).map(p=>p.toArray())});
}
const bb=bounds(boom),bc=bb.getCenter(new V()),sb=bounds(sail);
out('BOOM_CENTERLINE_ROOF_EXIT',finiteHits(roof,new V(bb.min.x,bc.y,bc.z),new V(bb.max.x,bc.y,bc.z)).map(p=>p.toArray()));
out('MAIN_FOOT_ROOF_EXIT',finiteHits(roof,new V(sb.min.x,sb.min.y+1e-5,.00249),new V(sb.max.x,sb.min.y+1e-5,.00249)).map(p=>p.toArray()));
// Each stay's cap centers are reconstructed from opposite longitudinal extrema.
for(let i=0;i<4;i++){
  const ts=mesh('R-Standing-Stay-'+i),points=[...new Map(ts.flat().map(p=>[key(p),p])).values()],a=points[0],b=points.reduce((s,p)=>p.distanceToSquared(a)>s.distanceToSquared(a)?p:s),c=points.reduce((s,p)=>p.distanceToSquared(b)>s.distanceToSquared(b)?p:s),axis=c.clone().sub(b).normalize(),values=points.map(p=>p.dot(axis)),lo=Math.min(...values),hi=Math.max(...values);
  const endpoints=[lo,hi].map((v,ix)=>{const near=points.filter((p,j)=>Math.abs(values[j]-v)<0.005);return near.reduce((s,p)=>s.add(p),new V()).divideScalar(near.length);});
  out('STAY_ENDPOINTS',{i,endpoints:endpoints.map(p=>({p:p.toArray(),mast:closest(p,mesh('R-Mast')).d,deck:closest(p,mesh('R-Deck')).d,hull:closest(p,mesh('R-Hull')).d,chainplate:closest(p,mesh('R-Chainplate-'+i)).d})),mastContact:pair(ts,mesh('R-Mast')),deckContact:pair(ts,mesh('R-Deck')),chainplateContact:pair(ts,mesh('R-Chainplate-'+i))});
}
for(let i=0;i<8;i++)for(const support of ['R-Wheel-Rim','R-Wheel-Shaft'])out('HELM_SPOKE',{i,support,...pair('R-Wheel-Spoke-'+i,support)});
for(const sign of [-1,1])for(const [part,support]of [['R-Cockpit-Seat-','R-Cockpit-Seat-Support-'],['R-Cockpit-Seat-Support-','R-Cockpit-Floor'],['R-Grab-Rail-','R-Cabin-Roof'],['R-Winch-Base-','R-Deck']])out('SMALL_SUPPORT',{part:part+sign,support:support.endsWith('-')?support+sign:support,...pair(part+sign,support.endsWith('-')?support+sign:support)});
// Known aperture centers; bounded rays distinguish skin from glazing and actual floor.
for(const side of ['Port','Starboard'])for(const x of [-0.44,0.17]){
  const a=new V(x,1.001,-0.38),b=new V(x,1.001,0.38),window='R-Window-'+side+'-'+(x<0?0:1);
  out('WINDOW',{side,x,wall:finiteHits(mesh('R-Cabin-'+side),a,b).map(p=>p.toArray()),pane:finiteHits(mesh(window),a,b).map(p=>p.toArray())});
}
for(const x of [0.68,0.96,1.23])for(const z of [-0.14,0,0.14]){
  const a=new V(x,1,z),b=new V(x,0.55,z);out('COCKPIT_OPEN',{x,z,deckHits:finiteHits(mesh('R-Deck'),a,b).length,floorHits:finiteHits(mesh('R-Cockpit-Floor'),a,b).map(p=>p.toArray()),hullHits:finiteHits(mesh('R-Hull'),a,b).map(p=>p.toArray())});
}
// Test both skins and stitched edge strips with 3D sections and orientation.
for(const name of ['R-Mainsail','R-Jib']){
  const ts=mesh(name),t=topology(ts),samples=[];
  for(const face of ts){const normal=new Triangle(...face).getNormal(new V());if(Math.abs(normal.z)<0.2)continue;const center=face.reduce((s,p)=>s.add(p),new V()).divideScalar(3);const a=new V(center.x,center.y,-0.4),b=new V(center.x,center.y,0.4),h=finiteHits(ts,a,b);if(h.length!==2||Math.abs(h[1].z-h[0].z-0.005)>0.0001)samples.push({center:center.toArray(),hits:h.map(p=>p.toArray())});}
  const {components,...top}=t;out('SAIL_SKINS',{name,...top,componentCount:components.length,failedSections:samples.length,witnesses:samples.slice(0,3)});
}
// Thread center, complete ring polygons and interval midsections, no object-scale tolerance.
for(const [sailName,seamName]of [['R-Mainsail','R-Main-Seams'],['R-Jib','R-Jib-Seams']]){
  const surface=mesh(sailName),components=topology(mesh(seamName)).components;
  for(const [ci,component]of components.entries()){
    const rs=rings(component),witnesses=[];let checks=0,sectionsNoContact=0,fullyBuried=0,midplaneContact=0;
    for(let ri=0;ri<rs.length;ri++)for(const fraction of (ri===rs.length-1?[0]:[0,0.25,0.5,0.75])){
      const current=rs[ri],next=rs[Math.min(ri+1,rs.length-1)],center=current.center.clone().lerp(next.center,fraction),tangent=next.center.clone().sub(current.center);if(tangent.length()<1e-9)tangent.copy(current.center).sub(rs[ri-1].center);tangent.normalize();
      const section=[];for(const t of component)for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],da=a.clone().sub(center).dot(tangent),db=b.clone().sub(center).dot(tangent);if(Math.abs(da)<1e-9)section.push(a);if(da*db<0)section.push(a.clone().lerp(b,da/(da-db)));}
      const unique=[...new Map(section.map(p=>[key(p),p])).values()],sides=unique.map(p=>closest(p,surface).signed),d=closest(center,surface);checks++;
      const noContact=!sides.some(d=>d< -1e-7)||!sides.some(d=>d>1e-7);if(noContact){sectionsNoContact++;witnesses.push({ri,fraction,center:center.toArray(),signed:d.signed,sectionPoints:unique.length,range:[Math.min(...sides),Math.max(...sides)]});}if(sides.every(d=>d< -1e-7))fullyBuried++;
      const midHits=finiteHits(surface,new V(center.x,center.y,-0.4),new V(center.x,center.y,0.4));if(midHits.length===2&&center.z>=midHits[0].z&&center.z<=midHits[1].z)midplaneContact++;
    }
    out('THREAD_DENSE',{sailName,ci,checks,sectionsNoContact,fullyBuried,centersInsideSail:midplaneContact,witnesses});
  }
}
// Root sections show fins meeting both outer and inner hull without parity on open skins.
for(const name of ['R-Keel','R-Rudder']){const ts=mesh(name),b=bounds(ts);out('FIN_ROOT',{name,box:[b.min.toArray(),b.max.toArray()],hullContact:pair(ts,mesh('R-Hull'))});}
