import {pins,mesh,pair,topology,rings,closest,finiteHits} from './review-geometry-probe.mjs';
import {Vector3 as V} from '../../../apps/web/node_modules/three/build/three.module.js';
const out=(tag,value)=>console.log(tag,JSON.stringify(value));out('PINS',pins);
for(const [a,b]of [['R-Jib','R-Cabin-Roof'],['R-Jib-Sheet','R-Cabin-Roof'],['R-Jib-Sheet','R-Cabin-Starboard'],['R-Main-Sheet','R-Cabin-Roof']])out('FOCUSED_PAIR',{a,b,...pair(a,b)});
for(const sailName of ['R-Mainsail','R-Jib']){
  const seamName=sailName==='R-Mainsail'?'R-Main-Seams':'R-Jib-Seams',surface=mesh(sailName);
  for(const [i,c]of topology(mesh(seamName)).components.entries()){
    const rs=rings(c),samples=rs.map(r=>({u:r.u,p:r.center.toArray(),radius:r.radius,...((v)=>({distance:v.d,signed:v.signed}))(closest(r.center,surface))}));
    out('THREAD_RING_DISTANCES',{sailName,i,samples,min:Math.min(...samples.map(r=>r.distance)),max:Math.max(...samples.map(r=>r.distance)),minRadius:Math.min(...samples.map(r=>r.radius)),maxRadius:Math.max(...samples.map(r=>r.radius)),ends:[samples[0],samples.at(-1)],centersBuried:samples.filter(r=>r.signed<0).length,centersBeyondRadius:samples.filter(r=>r.distance>r.radius).length});
  }
}
// Exact-on-edge ray diagnostic from prior sweep: jitter is bounded, not parity inference.
for(const dx of [-1e-5,0,1e-5])for(const z of [-1e-5,0,1e-5])out('HULL_EDGE_RAY_DIAGNOSTIC',{x:.3+dx,z,hits:finiteHits(mesh('R-Hull'),new V(.3+dx,1,z),new V(.3+dx,0,z)).map(p=>p.toArray())});
