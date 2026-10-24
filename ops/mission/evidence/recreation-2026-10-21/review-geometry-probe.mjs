import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {NodeIO,Document} from '../../../apps/media/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS,EXTMeshGPUInstancing} from '../../../apps/media/node_modules/@gltf-transform/extensions/dist/index.js';
import {MeshoptDecoder} from '../../../apps/media/node_modules/meshoptimizer/index.module.js';
import {Vector3 as V,Matrix3,Matrix4,Quaternion,Triangle,Ray,Box3,BoxGeometry} from '../../../apps/web/node_modules/three/build/three.module.js';
const rootURL=new URL('../../../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
export const inputPaths=[process.argv.includes('--pre-fix-snapshot')?'apps/media/hyperframes/vendor/heroes/recreation.glb':'apps/web/public/heroes/recreation.glb','apps/media/scripts/build-refined-recreation.mjs','apps/media/scripts/recreation-refinement.test.mjs'];
const expected=[process.argv.includes('--pre-fix-snapshot')?'6aab14611026767374e76e4bbc36200d2197c1a2d6545f0ebeb97ccc122b7173':'c7ce5658eefd0e928ea857e70ca35803e2812308032a071cdcb82412434f41a7','2edfb8fae498e2877a49ce16de7530c645fcdb5dbc1cbdffdd1884ac95f7473e','d7185ec2ed9bb6955a27db98047fa5d91159d491cf5461dae1b0dc4aab5dd794'];
const inputBytes=await Promise.all(inputPaths.map(p=>readFile(new URL(p,rootURL))));
export const pins=inputPaths.map((path,i)=>({path,bytes:inputBytes[i].length,sha256:sha(inputBytes[i])}));
if(pins[0].sha256!==expected[0]||(!process.argv.includes('--geometry-only')&&pins.some((p,i)=>p.sha256!==expected[i])))throw Error('Input drift: '+JSON.stringify(pins));
if(process.argv.includes('--geometry-only'))console.log('SCOPE_GEOMETRY_ONLY_SOURCE_TEST_IN_FLIGHT',JSON.stringify(pins));
await MeshoptDecoder.ready;
export const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(inputBytes[0]);
export const nodes=[];
function walk(n){nodes.push(n);n.listChildren().forEach(walk);}doc.getRoot().listScenes().forEach(s=>s.listChildren().forEach(walk));
export const named=name=>{const ns=nodes.filter(n=>n.getName()===name);if(ns.length!==1)throw Error('Nonunique '+name);return ns[0];};
export const frame=named('InterestShield-recreation-original-refined-v2');
export function triangles(node,reference=frame){
  const out=[],inv=reference?new Matrix4().fromArray(reference.getWorldMatrix()).invert():new Matrix4();
  function visit(n){
    const base=inv.clone().multiply(new Matrix4().fromArray(n.getWorldMatrix())),ext=n.getExtension('EXT_mesh_gpu_instancing'),attrs=ext?.listAttributes()??[],count=attrs[0]?.getCount()??1;
    if(!attrs.every(a=>a.getCount()===count))throw Error('Instance length mismatch');
    for(let instance=0;instance<count;instance++){
      const matrix=base.clone();if(ext)matrix.multiply(new Matrix4().compose(new V().fromArray(ext.getAttribute('TRANSLATION')?.getElement(instance,[])??[0,0,0]),new Quaternion().fromArray(ext.getAttribute('ROTATION')?.getElement(instance,[])??[0,0,0,1]),new V().fromArray(ext.getAttribute('SCALE')?.getElement(instance,[])??[1,1,1])));
      const normalMatrix=new Matrix3().getNormalMatrix(matrix);
      for(const prim of n.getMesh()?.listPrimitives()??[]){
        if(prim.getMode()!==4)throw Error('Not triangles');const pos=prim.getAttribute('POSITION'),uv=prim.getAttribute('TEXCOORD_0'),norm=prim.getAttribute('NORMAL'),ix=prim.getIndices(),size=ix?.getCount()??pos.getCount();
        for(let i=0;i<size;i+=3){const ids=[0,1,2].map(j=>ix?ix.getScalar(i+j):i+j),t=ids.map(id=>new V().fromArray(pos.getElement(id,[])).applyMatrix4(matrix));t.uv=uv?ids.map(id=>uv.getElement(id,[])):null;t.normals=norm?ids.map(id=>new V().fromArray(norm.getElement(id,[])).applyMatrix3(normalMatrix).normalize()):null;t.box=new Box3().setFromPoints(t);t.node=n.getName();t.instance=instance;t.index=i/3;t.prim=prim;out.push(t);}
      }
    }n.listChildren().forEach(visit);
  }visit(node);return out;
}
export const mesh=name=>triangles(named(name));
export const bounds=ts=>new Box3().setFromPoints(ts.flat());
export const key=(p,eps=1e-7)=>p.toArray().map(v=>Math.round(v/eps)).join(',');
export function topology(ts){
  const verts=new Map(),edges=new Map(),parent=ts.map((_,i)=>i);let volume=0,degenerate=0,normalWrong=0;
  function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
  ts.forEach((t,ti)=>{const ids=t.map(p=>key(p));for(let j=0;j<3;j++)verts.set(ids[j],t[j]);const cross=t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0]));if(new Set(ids).size<3||cross.length()<1e-13){degenerate++;return;}volume+=t[0].dot(t[1].clone().cross(t[2]))/6;
    if(t.normals&&cross.dot(t.normals.reduce((s,n)=>s.add(n),new V())) < -1e-9)normalWrong++;
    for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],k=[a,b].sort().join('|'),list=edges.get(k)??[];list.push({ti,sign:a<b?1:-1});edges.set(k,list);}
  });
  for(const list of edges.values())for(const e of list.slice(1))parent[find(e.ti)]=find(list[0].ti);
  const components=new Map();ts.forEach((t,i)=>{if(new Triangle(...t).getArea()<1e-13)return;const k=find(i);if(!components.has(k))components.set(k,[]);components.get(k).push(t);});
  const opens=[...edges.values()].filter(es=>es.length===1),nonmanifold=[...edges.values()].filter(es=>es.length>2),wrong=[...edges.values()].filter(es=>es.length===2&&es[0].sign===es[1].sign);
  return {triangles:ts.length,vertices:verts.size,edges:edges.size,components:[...components.values()],boundary:opens.length,nonmanifold:nonmanifold.length,wrongDirected:wrong.length,degenerate,normalWrong,volume};
}
export function closest(p,ts){let d=Infinity,point=null,triangle=null;const q=new V();for(const t of ts){if(t.box.distanceToPoint(p)>d)continue;new Triangle(...t).closestPointToPoint(p,q);const nd=p.distanceTo(q);if(nd<d){d=nd;point=q.clone();triangle=t;}}return {d,point,triangle,signed:triangle?new Triangle(...triangle).getNormal(new V()).dot(p.clone().sub(point)):NaN};}
export function segmentHit(a,b,t,eps=1e-9){const d=b.clone().sub(a),length=d.length();if(!length)return null;const p=new Ray(a,d.divideScalar(length)).intersectTriangle(...t,false,new V());return p&&p.distanceTo(a)<=length+eps?p:null;}
export function intersections(a,b,limit=10){const hits=[];for(const t of a)for(const u of b){if(!t.box.intersectsBox(u.box))continue;for(const [s,target]of [[t,u],[u,t]])for(let k=0;k<3;k++){const p=segmentHit(s[k],s[(k+1)%3],target);if(p&&!hits.some(q=>q.distanceTo(p)<1e-6)){hits.push(p);if(hits.length>=limit)return hits;}}}return hits;}
export function finiteHits(ts,a,b){const hits=[];for(const t of ts){const p=segmentHit(a,b,t);if(p&&!hits.some(q=>q.distanceTo(p)<1e-7))hits.push(p);}return hits.sort((p,q)=>p.distanceToSquared(a)-q.distanceToSquared(a));}
export function pair(a,b){const aa=typeof a==='string'?mesh(a):a,bb=typeof b==='string'?mesh(b):b,hits=intersections(aa,bb,3);let nearest={d:Infinity};if(!hits.length)for(const [s,t]of [[aa,bb],[bb,aa]])for(const p of new Map(s.flat().map(p=>[key(p),p])).values()){const c=closest(p,t);if(c.d<nearest.d)nearest={...c,from:p};}return {crossings:hits.map(p=>p.toArray()),vertexSurfaceDistance:hits.length?0:nearest.d,witness:hits.length?null:[nearest.from?.toArray(),nearest.point?.toArray()]};}
export function rings(component){const by=new Map();for(const t of component)for(let i=0;i<3;i++){const u=Math.round(t.uv[i][0]*1e5);if(!by.has(u))by.set(u,new Map());by.get(u).set(key(t[i]),t[i]);}return [...by.entries()].sort((a,b)=>a[0]-b[0]).map(([u,vs])=>{const points=[...vs.values()],center=points.reduce((s,p)=>s.add(p),new V()).divideScalar(points.length);return {u:u/1e5,center,radius:Math.max(...points.map(p=>p.distanceTo(center))),points};});}
export function seamReport(sailName,seamName){
  const sail=mesh(sailName),seams=mesh(seamName),top=topology(seams);return top.components.map((component,i)=>{const rs=rings(component),samples=rs.map(r=>{const c=closest(r.center,sail),sv=r.points.map(p=>closest(p,sail));return {u:r.u,center:r.center.toArray(),radius:r.radius,centerDistance:c.d,signed:c.signed,nearest:c.point.toArray(),vertices:r.points.length,minSurface:Math.min(...sv.map(v=>v.d)),maxSurface:Math.max(...sv.map(v=>v.d)),buriedVertices:sv.filter(v=>v.signed< -1e-6).length};});return {i,rings:rs.length,crossings:intersections(component,sail,5).map(p=>p.toArray()),minCenter:Math.min(...samples.map(s=>s.centerDistance)),maxCenter:Math.max(...samples.map(s=>s.centerDistance)),noContactRings:samples.filter(s=>s.centerDistance>s.radius+1e-5).length,fullyBuriedRings:samples.filter(s=>s.signed < -s.radius-1e-5).length,samples};});
}
export async function main(){
  console.log('PINNED_INPUTS',JSON.stringify(pins));
  const summary=[];for(const n of nodes.filter(n=>n.getMesh())){const t=topology(triangles(n));const {components,...s}=t;summary.push({name:n.getName(),instances:n.getExtension('EXT_mesh_gpu_instancing')?.listAttributes()[0]?.getCount()??1,...s,components:components.length,componentVolumes:components.map(c=>c.reduce((s,t)=>s+t[0].dot(t[1].clone().cross(t[2]))/6,0))});}console.log('TOPOLOGY',JSON.stringify(summary));
  for(const [a,b]of [['R-Mast','R-Deck'],['R-Boom','R-Mast'],['R-Mainsail','R-Mast'],['R-Mainsail','R-Boom'],['R-Jib','R-Mast'],['R-Jib','R-Standing-Stay-0'],['R-Jib','R-Boom'],['R-Mainsail','R-Jib'],['R-Mainsail','R-Cabin-Roof'],['R-Boom','R-Cabin-Roof'],['R-Keel','R-Hull'],['R-Rudder','R-Hull'],['R-Keel-Bulb','R-Keel'],['R-Wheel-Rim','R-Wheel-Shaft'],['R-Wheel-Shaft','R-Wheel-Pedestal'],['R-Wheel-Pedestal','R-Cockpit-Floor']])console.log('PAIR',JSON.stringify({a,b,...pair(a,b)}));
  for(const sign of ['Port','Starboard','Forward','Aft'])for(const support of ['R-Cockpit-Floor','R-Deck'])console.log('COCKPIT',JSON.stringify({wall:sign,support,...pair('R-Cockpit-Wall-'+sign,support)}));
  for(const [sail,seam]of [['R-Mainsail','R-Main-Seams'],['R-Jib','R-Jib-Seams']])console.log('SEAM_THREAD_SCALE',JSON.stringify({sail,seam,components:seamReport(sail,seam)}));
  console.log('INSTANCE_INVENTORY',JSON.stringify(nodes.filter(n=>n.getExtension('EXT_mesh_gpu_instancing')).map(n=>({name:n.getName(),attributes:n.getExtension('EXT_mesh_gpu_instancing').listAttributes().map(a=>({name:a.getType(),count:a.getCount()}))}))));
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/review-geometry-probe.mjs'))await main();
