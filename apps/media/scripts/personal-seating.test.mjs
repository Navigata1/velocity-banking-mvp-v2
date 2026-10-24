import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Matrix4,Vector3,Ray,Triangle,BoxGeometry,Shape,ExtrudeGeometry} from '../../web/node_modules/three/build/three.module.js';
import {personal,faces,bounds,hits} from './personal-geometry-test-helpers.mjs';

function crossing(left,right){
  const overlap=(a,b)=>['x','y','z'].every(k=>a.min[k]<=b.max[k]+1e-8&&b.min[k]<=a.max[k]+1e-8),targets=right.map(t=>({t,b:bounds([t])}));
  for(const a of left){const ab=bounds([a]);for(const {t:b,b:bb}of targets){if(!overlap(ab,bb))continue;
    for(const [from,to]of [[a,b],[b,a]])for(let i=0;i<3;i++){
      const d=from[(i+1)%3].clone().sub(from[i]),length=d.length(),p=new Vector3();if(length<1e-8)continue;
      if(new Ray(from[i],d.divideScalar(length)).intersectTriangle(...to,false,p)){const distance=p.distanceTo(from[i]),bary=new Triangle(...to).getBarycoord(p,new Vector3());if(distance>1e-6&&distance<length-1e-6&&Math.min(...bary.toArray())>1e-5)return p;}
    }
  }}return null;
}

test('Personal papers clear the folded flap while retaining a real inserted mouth path',async()=>{
  const triangle=p=>p.map(v=>new Vector3(...v)),a=[triangle([[0,-1,0],[0,1,0],[0,0,1]])],b=[triangle([[-1,-0.5,0.25],[1,-0.5,0.25],[0,0.8,0.25]])];
  assert.ok(crossing(a,b));assert.equal(crossing(a,b.map(t=>t.map(p=>p.clone().add(new Vector3(3,0,0))))),null);
  const {named}=await personal(),body=named('P-Body'),flap=faces(named('P-Flap'),body);
  for(const name of ['P-Paper-Front','P-Paper-Back']){
    const paper=named(name);assert.equal(crossing(faces(paper,body),flap),null,name+' must emerge through open space, not cut the leather');
    const original=[...paper.getTranslation()],pb=bounds(faces(paper,body)),parent=paper.listParents().find(n=>n.propertyType==='Node'),matrix=new Matrix4().fromArray(parent?.getWorldMatrix()??new Matrix4().toArray()).invert().multiply(new Matrix4().fromArray(body.getWorldMatrix()));
    const delta=new Vector3(0,0,bounds(flap).center.z-pb.center.z).applyMatrix4(matrix).sub(new Vector3().applyMatrix4(matrix));
    try{paper.setTranslation(original.map((v,i)=>v+delta.getComponent(i)));assert.ok(crossing(faces(paper,body),flap),'moving a real sheet into the actual flap bounds must be detected');}finally{paper.setTranslation(original);}
  }
});

function seated(groups,skins){
  const p=new Vector3(),directions=[new Vector3(1,0.371,0.137),new Vector3(0.213,1,0.417),new Vector3(0.147,0.319,1)],surfaces=skins.flat();
  const closed=skins.map(ts=>{const edges=new Map(),key=p=>p.toArray().map(v=>Math.round(v*1e5)).join(',');for(const t of ts){const ids=t.map(key);if(new Set(ids).size<3)continue;for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],id=[a,b].sort().join('|'),e=edges.get(id)??[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(id,e);}}assert.ok(edges.size>6&&[...edges.values()].every(([n,w])=>n===2&&w===0),'burial classification requires a closed consistently wound leather skin');return {ts,b:bounds(ts)};});
  for(let i=0;i<groups.length;i++){
    const ts=groups[i],center=ts.flat().reduce((s,p)=>s.add(p),new Vector3()).divideScalar(ts.length*3);let distance=Infinity,normal;
    for(const t of surfaces){const d=new Triangle(...t).closestPointToPoint(center,p).distanceTo(center);if(d<distance){distance=d;normal=t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])).normalize();}}
    const radius=Math.max(...ts.flat().map(v=>Math.abs(v.clone().sub(center).dot(normal))));
    assert.ok(distance<radius*0.90+1e-4,`thread ${i} must seat at thread-scale clearance, actual ${distance}`);
    for(const skin of closed){if(['x','y','z'].some(k=>center[k]<skin.b.min[k]||center[k]>skin.b.max[k]))continue;assert.ok(directions.filter(d=>hits(skin.ts,center,d).length%2===1).length<2,`thread ${i} center must not be buried in a closed leather volume`);}
  }
}

test('Personal every real stitch instance is surface-seated rather than buried or floating',async()=>{
  const {named}=await personal(),body=named('P-Body'),node=named('P-Stitches'),all=faces(node,body),per=node.getMesh().listPrimitives().reduce((s,p)=>s+p.getIndices().getCount()/3,0),count=node.getExtension('EXT_mesh_gpu_instancing').listAttributes()[0].getCount();
  assert.equal(all.length,count*per);const groups=Array.from({length:count},(_,i)=>all.slice(i*per,(i+1)*per));
  const skins=['P-Body','P-Flap','P-Handle','P-Strap-L','P-Strap-R','P-Shoulder-Strap',...['Handle','Shoulder'].flatMap(k=>['L','R'].map(s=>'P-'+k+'-Tab-'+s))].map(name=>faces(named(name),body));
  seated(groups,skins);
  const moved=groups.map(g=>g.map(t=>t.map(p=>p.clone().add(new Vector3(0,0,2)))));assert.throws(()=>seated(moved,skins),{code:'ERR_ASSERTION'},'detached instance groups must fail');
});

test('Personal key bevel has no proper nonadjacent surface crossings',async()=>{
  const {named}=await personal(),ts=faces(named('P-Key'));assert.equal(crossing(ts,ts),null,'small bevel overlaps still need correction, not just matching normals');
});

test('Personal stitch burial verifier accepts an exposed acute edge instead of one ambiguous face normal',()=>{
  const triangles=g=>{const p=g.attributes.position,ix=g.index;return Array.from({length:(ix?.count??p.count)/3},(_,i)=>[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,ix?ix.getX(i*3+j):i*3+j)));};
  const shape=new Shape([new Vector3(0,0),new Vector3(2,0),new Vector3(2,2)]),skin=triangles(new ExtrudeGeometry(shape,{depth:2,bevelEnabled:false}));
  skin.sort((a,b)=>new Triangle(...a).getNormal(new Vector3()).x-new Triangle(...b).getNormal(new Vector3()).x);
  const center=new Vector3(-0.0001,-0.001,1),group=triangles(new BoxGeometry(0.0044,0.0044,0.0044)).map(t=>t.map(p=>p.add(center)));
  for(const d of [new Vector3(1,0.371,0.137),new Vector3(0.213,1,0.417),new Vector3(0.147,0.319,1)])assert.equal(hits(skin,center,d).length%2,0,'fixture must truly be outside');
  seated([group],[skin]);
  const box=triangles(new BoxGeometry(1,1,1)),buried=triangles(new BoxGeometry(0.0044,0.0044,0.0044)).map(t=>t.map(p=>p.add(new Vector3(0,0,0.4993))));
  assert.throws(()=>seated([buried],[box]),{code:'ERR_ASSERTION'},'near-surface buried centers must still fail');
});
