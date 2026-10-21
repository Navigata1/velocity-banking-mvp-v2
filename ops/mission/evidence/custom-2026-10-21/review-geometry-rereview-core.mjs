import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {NodeIO} from '../../../apps/media/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from '../../../apps/media/node_modules/@gltf-transform/extensions/dist/index.js';
import {MeshoptDecoder} from '../../../apps/media/node_modules/meshoptimizer/index.module.js';
import {Matrix4,Matrix3,Vector3,Quaternion,Triangle,Ray} from '../../../apps/web/node_modules/three/build/three.module.js';

const V=(...a)=>new Vector3(...a), out=(name,data)=>console.log(name,JSON.stringify(data));
const base=new URL('../../../',import.meta.url);
const pins={'apps/web/public/heroes/custom.glb':'2753182d024be862fc7ab5e5b18100cc6a7bbcc736213471b4a6e2083517aa7b','apps/media/scripts/build-refined-custom.mjs':'2e21fb5c03e55d4649184d7362fe3df73efee9ac2b76395fd9796c3a948c5040','apps/media/scripts/custom-refinement.test.mjs':'26c50474ca83b358d7bd18481b73a3f2f703ed921e6cdd29d45e07b4d27c460c','apps/media/sources/custom/materials.json':'26ab2c71429e558b26a4108802e785088ce7e1cc231ea89db6e0ad4ed5531532'};
export async function checkPins(label){for(const [file,expected] of Object.entries(pins)){const b=await readFile(new URL(file,base)),actual=createHash('sha256').update(b).digest('hex');out(label,{file,bytes:b.length,actual,match:actual===expected});if(actual!==expected)throw Error('PIN DRIFT');}}
await checkPins('PIN_BEFORE');
await MeshoptDecoder.ready;
const bytes=await readFile(new URL('apps/web/public/heroes/custom.glb',base));
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(bytes);
export const root=doc.getRoot(), nodes=new Map(), worlds=new Map();
function local(n){return new Matrix4().compose(V(...n.getTranslation()),new Quaternion(...n.getRotation()),V(...n.getScale()));}
function walk(n,parent){nodes.set(n.getName(),n);const w=parent.clone().multiply(local(n));worlds.set(n,w);for(const c of n.listChildren())walk(c,w);}
for(const s of root.listScenes())for(const n of s.listChildren())walk(n,new Matrix4());
const inverse=worlds.get(nodes.get('C-Assembly')).clone().invert();
export function element(a,i){const raw=a.getArray(),size=a.getElementSize(),v=Array.from(raw.subarray(i*size,(i+1)*size));if(!a.getNormalized())return v;const type=a.getComponentType(),max={5120:127,5121:255,5122:32767,5123:65535,5125:4294967295}[type];return v.map(x=>Math.max(type===5120||type===5122?-1:0,x/max));}
export function triangles(name,frame=inverse){const n=nodes.get(name),result=[],world=frame.clone().multiply(worlds.get(n)),batch=n.getExtension('EXT_mesh_gpu_instancing'),count=batch?.listAttributes()[0]?.getCount()??1;
 for(let j=0;j<count;j++){const m=world.clone();if(batch)m.multiply(new Matrix4().compose(V(...(batch.getAttribute('TRANSLATION')?element(batch.getAttribute('TRANSLATION'),j):[0,0,0])),new Quaternion(...(batch.getAttribute('ROTATION')?element(batch.getAttribute('ROTATION'),j):[0,0,0,1])),V(...(batch.getAttribute('SCALE')?element(batch.getAttribute('SCALE'),j):[1,1,1]))));const nm=new Matrix3().getNormalMatrix(m);
 for(const p of n.getMesh()?.listPrimitives()??[]){if(p.getMode()!==4)throw Error('not triangle');const pos=p.getAttribute('POSITION'),ix=p.getIndices(),norm=p.getAttribute('NORMAL'),uv=p.getAttribute('TEXCOORD_0');for(let k=0;k<(ix?.getCount()??pos.getCount());k+=3){const ids=[0,1,2].map(z=>ix?element(ix,k+z)[0]:k+z),t=ids.map(i=>V(...element(pos,i)).applyMatrix4(m));t.normals=ids.map(i=>V(...element(norm,i)).applyMatrix3(nm).normalize());t.uv=uv?ids.map(i=>element(uv,i)):null;t.box=box([t]);t.id=k/3;t.mesh=n.getMesh().getName();result.push(t);}}}return result;}
export function box(ts){const min=V(Infinity,Infinity,Infinity),max=V(-Infinity,-Infinity,-Infinity);for(const t of ts)for(const p of t){min.min(p);max.max(p);}return {min,max};}
const key=p=>p.toArray().map(x=>Math.round(x/1e-7)).join(',');
export function topology(ts){const edges=new Map(),adj=ts.map(()=>[]);let degenerate=0,normalBad=0,minNormalDot=1,minUv=Infinity,uvBad=0,minArea=Infinity;
 ts.forEach((t,i)=>{const a=t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])),area=a.length()/2;minArea=Math.min(minArea,area);if(area<1e-12)degenerate++;else for(const n of t.normals){const d=a.dot(n)/a.length();minNormalDot=Math.min(d,minNormalDot);if(d<-.001)normalBad++;}
 if(t.uv){const [a,b,c]=t.uv,u=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));minUv=Math.min(u,minUv);if(u<1e-12&&area>1e-10)uvBad++;}
 const ids=t.map(key);for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],k=[a,b].sort().join('|'),arr=edges.get(k)??[];arr.push({i,sign:a<b?1:-1});edges.set(k,arr);}});
 let edgeBad=0;for(const es of edges.values()){if(es.length!==2||es.reduce((s,e)=>s+e.sign,0)!==0)edgeBad++;for(const a of es)for(const b of es)if(a!==b)adj[a.i].push(b.i);}
 const seen=new Set(),components=[];for(let i=0;i<ts.length;i++){if(seen.has(i))continue;let volume=0,count=0,stack=[i];const origin=ts[i][0];while(stack.length){const j=stack.pop();if(seen.has(j))continue;seen.add(j);const [a,b,c]=ts[j].map(p=>p.clone().sub(origin));volume+=a.dot(b.cross(c))/6;count++;stack.push(...adj[j]);}components.push({count,volume});}
 return {faces:ts.length,edgeBad,degenerate,normalBad,minNormalDot,minArea,minUv,uvBad,components};}
export function rayHits(ts,o,d,length=10){const ray=new Ray(o,d),p=V(),hits=[];for(const t of ts){if(!ray.intersectTriangle(...t,false,p))continue;const v=p.clone().sub(o).dot(d);if(v>=0&&v<=length&&!hits.some(h=>Math.abs(h-v)<1e-7))hits.push(v);}return hits.sort((a,b)=>a-b);}
function overlap(a,b,e=1e-9){return ['x','y','z'].every(k=>a.min[k]<=b.max[k]+e&&b.min[k]<=a.max[k]+e);}
function edgeHits(a,b){const normal=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0])).normalize(),tri=new Triangle(...b),q=V(),result=[];
 for(let i=0;i<3;i++){const p=a[i],r=a[(i+1)%3],u=p.clone().sub(b[0]).dot(normal),v=r.clone().sub(b[0]).dot(normal);if(u*v>=0||Math.abs(u-v)<1e-12)continue;const t=u/(u-v);if(t<=1e-8||t>=1-1e-8)continue;q.copy(p).lerp(r,t);if(tri.containsPoint(q))result.push(q.clone());}return result;}
// Positive-area projected triangle clipping catches coplanar overlaps, not shared edges.
function coplanarArea(a,b,filter){const n=a[1].clone().sub(a[0]).cross(a[2].clone().sub(a[0])).normalize(),m=b[1].clone().sub(b[0]).cross(b[2].clone().sub(b[0])).normalize();if(Math.abs(n.dot(m))<1-1e-9||b.some(p=>Math.abs(p.clone().sub(a[0]).dot(n))>1e-8))return 0;const axes=['x','y','z'].sort((u,v)=>Math.abs(n[u])-Math.abs(n[v])),k=axes.slice(0,2),other=axes[2],two=p=>k.map(d=>p[d]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);let poly=a.map(two),clip=b.map(two);if(cross(...clip)<0)clip.reverse();for(let i=0;i<3;i++){const c=clip[i],d=clip[(i+1)%3],next=[];for(let j=0;j<poly.length;j++){const p=poly[j],q=poly[(j+1)%poly.length],dp=cross(c,d,p),dq=cross(c,d,q);if(dp>=0)next.push(p);if((dp>=0)!==(dq>=0)){const s=dp/(dp-dq);next.push(p.map((v,h)=>v+(q[h]-v)*s));}}poly=next;}const lifted=poly.map(p=>{const v=V();v[k[0]]=p[0];v[k[1]]=p[1];v[other]=a[0][other]-(n[k[0]]*(p[0]-a[0][k[0]])+n[k[1]]*(p[1]-a[0][k[1]]))/n[other];return v;});if(!lifted.some(filter))return 0;return Math.abs(poly.reduce((s,p,i)=>s+p[0]*poly[(i+1)%poly.length][1]-p[1]*poly[(i+1)%poly.length][0],0))/2;}
export function intersections(a,b,self=false,filter=()=>true){let pairs=0,points=0,coplanar=0;const examples=[],pointBounds=box([]);for(let i=0;i<a.length;i++)for(let j=self?i+1:0;j<b.length;j++){const x=a[i],y=b[j];if(!overlap(x.box,y.box))continue;if(self&&x.some(p=>y.some(q=>p.distanceToSquared(q)<1e-14)))continue;const hits=[...edgeHits(x,y),...edgeHits(y,x)].filter(filter),area=coplanarArea(x,y,filter);if(hits.length||area>1e-10){pairs++;points+=hits.length;for(const p of hits){pointBounds.min.min(p);pointBounds.max.max(p);}if(area>1e-10)coplanar++;if(examples.length<3)examples.push({i,j,points:hits.map(p=>p.toArray()),area});}}return {pairs,points,coplanar,pointBounds,examples};}
const all=new Map([...nodes].filter(([,n])=>n.getMesh()).map(([name])=>[name,triangles(name)]));
let unique=0;for(const m of root.listMeshes())for(const p of m.listPrimitives())unique+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
out('COUNTS',{unique,rendered:[...all.values()].reduce((s,t)=>s+t.length,0),meshes:root.listMeshes().length,maps:root.listTextures().length,gpu:[...nodes.values()].filter(n=>n.getExtension('EXT_mesh_gpu_instancing')).length});
let matrixError=0;for(const [n,w] of worlds)matrixError=Math.max(matrixError,...w.elements.map((x,i)=>Math.abs(x-n.getWorldMatrix()[i])));out('MATRIX_RECONSTRUCTION',{matrixError});
for(const [name,ts] of all){const r=topology(ts);if(!name.startsWith('C-Tick-')||name==='C-Tick-0'||r.edgeBad||r.normalBad||r.uvBad)out('TOPOLOGY',{name,...r});}
out('STAGE',box([...all.keys()].flatMap(n=>triangles(n,new Matrix4()))));
for(const name of ['C-Case','C-Lid','C-Glass','C-Rose','C-Pivot','C-Bail','C-Needle-North','C-Needle-South','C-Hinge-Knuckle-0'])out('SELF',{name,...intersections(all.get(name),all.get(name),true)});
for(const [a,b] of [['C-Case','C-Lid'],['C-Rose','C-Needle-North'],['C-Rose','C-Needle-South'],['C-Needle-North','C-Needle-South'],['C-Glass','C-Pivot'],['C-Glass','C-Needle-North'],['C-Lug','C-Bail']])out('PAIR',{a,b,...intersections(all.get(a),all.get(b))});
const pin=all.get('C-Hinge-Pin'),pb=box(pin),py=(pb.min.y+pb.max.y)/2,pz=(pb.min.z+pb.max.z)/2;
for(let k=0;k<5;k++){const ts=all.get('C-Hinge-Knuckle-'+k),b=box(ts),x=(b.min.x+b.max.x)/2;let min=Infinity,max=-Infinity;const samples=[];for(let i=0;i<64;i++){const a=(i+.371)*Math.PI/32,d=V(0,Math.cos(a),Math.sin(a)),o=V(x,py,pz),h=rayHits(ts,o,d,.1),p=rayHits(pin,o,d,.1);if(h.length!==2||p.length!==1)throw Error('unexpected off-seam bore section');const clearance=h[0]-p[0];min=Math.min(min,clearance);max=Math.max(max,clearance);if(i<2)samples.push({angle:a,bore:h,pin:p,clearance});}out('BORE_CLEARANCE',{k,x,min,max,samples});}
for(const n of ['C-Needle-North','C-Needle-South','C-Pivot'])out('LENS_VERTICAL_CLEARANCE',{n,globalLowerBound:box(all.get('C-Glass')).min.y-box(all.get(n)).max.y});
const lidLocal=triangles('C-Lid',worlds.get(nodes.get('C-Lid-Group')).clone().invert());
for(const [n,ts,origin,d] of [['lidCenter',lidLocal,V(.071,-1,1.083),V(0,1,0)],['caseCenter',all.get('C-Case'),V(.071,-1,.023),V(0,1,0)],['bailCenter',all.get('C-Bail'),V(.001,-1,1.301),V(0,1,0)]])out('VOID_SECTION',{n,origin:origin.toArray(),hits:rayHits(ts,origin,d,4)});
await checkPins('PIN_AFTER');
