import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshGPUInstancing} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Matrix3,Matrix4,Quaternion,Vector3,Ray,Triangle,BoxGeometry,CylinderGeometry,TorusGeometry} from '../../web/node_modules/three/build/three.module.js';
import sharp from 'sharp';
import {parse} from 'acorn';
import {simple} from 'acorn-walk';

const url=p=>new URL(p,import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex'),V=(x=0,y=0,z=0)=>new Vector3(x,y,z),reject=f=>assert.throws(f,{code:'ERR_ASSERTION'});
async function required(path,label){try{return await readFile(url(path));}catch(e){if(e.code!=='ENOENT')throw e;assert.fail('Custom refinement requires '+label);}}
function sceneNodes(root){const out=new Set();function walk(n){out.add(n);n.listChildren().forEach(walk);}root.listScenes().forEach(s=>s.listChildren().forEach(walk));return [...out];}
async function custom(){
  const records=JSON.parse(await readFile(url('../hero-imported.json'))),inventory=JSON.parse(await readFile(url('../hero-models.json'))),bytes=await readFile(url('../../web/public/heroes/custom.glb'));await MeshoptDecoder.ready;
  const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(bytes),root=document.getRoot(),nodes=sceneNodes(root);
  const named=name=>{const matches=nodes.filter(n=>n.getName()===name);assert.equal(matches.length,1,'Custom refinement requires one rendered '+name);return matches[0];};
  return {bytes,root,nodes,named,record:records.find(r=>r.id==='custom'),inventory:inventory.find(r=>r.id==='custom')};
}
function faces(node,frame=null){
  const out=[],inverse=frame?new Matrix4().fromArray(frame.getWorldMatrix()).invert():new Matrix4();
  function walk(n){const base=inverse.clone().multiply(new Matrix4().fromArray(n.getWorldMatrix())),batch=n.getExtension('EXT_mesh_gpu_instancing'),attrs=batch?.listAttributes()??[],count=attrs[0]?.getCount()??1;assert.ok(attrs.every(a=>a.getCount()===count));
    for(let i=0;i<count;i++){const matrix=base.clone();if(batch)matrix.multiply(new Matrix4().compose(V().fromArray(batch.getAttribute('TRANSLATION')?.getElement(i,[])??[0,0,0]),new Quaternion().fromArray(batch.getAttribute('ROTATION')?.getElement(i,[])??[0,0,0,1]),V().fromArray(batch.getAttribute('SCALE')?.getElement(i,[])??[1,1,1])));const normals=new Matrix3().getNormalMatrix(matrix);
      for(const p of n.getMesh()?.listPrimitives()??[]){assert.equal(p.getMode(),4);const position=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),uv=p.getAttribute('TEXCOORD_0'),ix=p.getIndices(),size=ix?.getCount()??position.getCount();assert.equal(size%3,0);
        for(let k=0;k<size;k+=3){const ids=[0,1,2].map(j=>ix?ix.getScalar(k+j):k+j),t=ids.map(j=>V().fromArray(position.getElement(j,[])).applyMatrix4(matrix));t.normals=normal?ids.map(j=>V().fromArray(normal.getElement(j,[])).applyMatrix3(normals).normalize()):null;t.uv=uv?ids.map(j=>uv.getElement(j,[])):null;t.material=p.getMaterial();out.push(t);}}
    }n.listChildren().forEach(walk);
  }walk(node);assert.ok(out.length,'actual rendered triangles required');return out;
}
function bounds(ts){const min=V(Infinity,Infinity,Infinity),max=V(-Infinity,-Infinity,-Infinity);for(const t of ts)for(const p of t){min.min(p);max.max(p);}return {min,max,center:min.clone().add(max).multiplyScalar(0.5),span:max.clone().sub(min)};}
function hits(ts,origin,direction,length){const ray=new Ray(origin,direction.clone().normalize()),p=V(),out=[];for(const t of ts)if(ray.intersectTriangle(...t,false,p)&&p.distanceTo(origin)<=length&&!out.some(q=>q.distanceTo(p)<1e-6))out.push(p.clone());return out.sort((a,b)=>a.distanceTo(origin)-b.distanceTo(origin));}
const key=p=>p.toArray().map(v=>Math.round(v*1e6)).join(',');
function solid(ts){
  const edges=new Map(),adj=new Map(),volumes=[];ts=ts.filter(t=>new Triangle(...t).getArea()>1e-12);assert.ok(ts.length>=4,'closed body required');
  ts.forEach((t,index)=>{const ids=t.map(key);adj.set(index,new Set());for(let i=0;i<3;i++){const a=ids[i],b=ids[(i+1)%3],id=[a,b].sort().join('|'),e=edges.get(id)??[];e.push([index,a<b?1:-1]);edges.set(id,e);}});
  for(const e of edges.values()){assert.ok(e.length===2&&e[0][1]+e[1][1]===0,'closed directed two-manifold edges required');adj.get(e[0][0]).add(e[1][0]);adj.get(e[1][0]).add(e[0][0]);}
  const remaining=new Set(adj.keys());while(remaining.size){const todo=[remaining.values().next().value];let volume=0;while(todo.length){const i=todo.pop();if(!remaining.delete(i))continue;const [a,b,c]=ts[i];volume+=a.dot(b.clone().cross(c))/6;todo.push(...adj.get(i));}volumes.push(volume);}
  assert.ok(volumes.every(v=>v>1e-9),'EVERY connected shell must have outward positive volume, not merely a positive aggregate');
}
function distance(p,ts){const q=V();let d=Infinity;for(const t of ts)d=Math.min(d,new Triangle(...t).closestPointToPoint(p,q).distanceTo(p));return d;}
function contact(left,right){
  const dimensions=[...bounds(left).span.toArray(),...bounds(right).span.toArray()].filter(v=>v>1e-5),tolerance=Math.min(.00025,Math.min(...dimensions)*.008),p=V(),onRay=V(),onSegment=V();
  for(const [a,b]of [[left,right],[right,left]])for(const t of a)for(const v of t)if(distance(v,b)<=tolerance)return;
  for(const a of left)for(const b of right){if(['x','y','z'].some(k=>Math.max(...a.map(p=>p[k]))<Math.min(...b.map(p=>p[k]))-tolerance||Math.max(...b.map(p=>p[k]))<Math.min(...a.map(p=>p[k]))-tolerance))continue;
    for(const [from,to]of [[a,b],[b,a]])for(let i=0;i<3;i++){const origin=from[i],edge=from[(i+1)%3].clone().sub(origin),length=edge.length();if(length<1e-10)continue;const ray=new Ray(origin,edge.divideScalar(length));
      if(ray.intersectTriangle(...to,false,p)&&p.distanceTo(origin)<=length+tolerance)return;
      for(let j=0;j<3;j++)if(ray.distanceSqToSegment(to[j],to[(j+1)%3],onRay,onSegment)<=tolerance*tolerance&&onRay.distanceTo(origin)<=length)return;
    }
  }assert.fail('actual bounded XYZ surfaces must meet');
}
function clip(ts,axis,cut,upper){return ts.flatMap(t=>{const polygon=[];for(let i=0;i<3;i++){const p=t[i],q=t[(i+1)%3],dp=(p.dot(axis)-cut)*(upper?1:-1),dq=(q.dot(axis)-cut)*(upper?1:-1);if(dp>=0)polygon.push(p);if((dp>=0)!==(dq>=0))polygon.push(p.clone().lerp(q,dp/(dp-dq)));}return polygon.slice(1,-1).map((p,i)=>[polygon[0],p,polygon[i+2]]);});}
function endpoints(ts,a,b){
  solid(ts);const points=ts.flat(),first=points[0],far=points.reduce((p,q)=>q.distanceToSquared(first)>p.distanceToSquared(first)?q:p),last=points.reduce((p,q)=>q.distanceToSquared(far)>p.distanceToSquared(far)?q:p),rough=last.clone().sub(far).normalize(),axis=V();
  for(const t of ts){const normal=t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])),dot=normal.clone().normalize().dot(rough);if(Math.abs(dot)>.8)axis.add(normal.multiplyScalar(Math.sign(dot)));}assert.ok(axis.lengthSq()>1e-12,'actual opposing cap normals required');axis.normalize();
  const projections=points.map(p=>p.dot(axis)),lo=Math.min(...projections),hi=Math.max(...projections),band=Math.max((hi-lo)*1e-4,1e-6),end=upper=>ts.filter(t=>t.every(p=>upper?p.dot(axis)>=hi-band:p.dot(axis)<=lo+band));
  const seat=(cap,support)=>{assert.ok(cap.length,'actual endpoint cap, not a terminal quarter');try{contact(cap,support);return;}catch(e){if(e.code!=='ERR_ASSERTION')throw e;}solid(support);const center=cap.flat().reduce((sum,p)=>sum.add(p),V()).divideScalar(cap.length*3),length=bounds(support).span.length()*3,inside=[V(1,.371,.137),V(.213,1,.417),V(.147,.319,1)].filter(d=>hits(support,center,d,length).length%2===1).length;assert.ok(inside>=2,'buried endpoint requires validated closed support volume');};
  const order=(x,y)=>{seat(end(false),x);seat(end(true),y);};try{order(a,b);}catch(e){if(e.code!=='ERR_ASSERTION')throw e;order(b,a);}
}
function aperture(ts,depth){
  solid(ts);const b=bounds(ts),[u,v]=['x','y','z'].filter(k=>k!==depth),d=V();d[depth]=1;
  const probe=(du,dv)=>{const p=b.center.clone();p[depth]=b.min[depth]-1;p[u]+=du*b.span[u];p[v]+=dv*b.span[v];return hits(ts,p,d,b.span[depth]+2);};
  for(const [x,y]of [[0,0],[0.07,0],[-0.07,0],[0,0.07],[0,-0.07]])assert.equal(probe(x,y).length,0,'real empty aperture, not a filled disk or nested skins');
  for(const [x,y]of [[0.46,0],[-0.46,0],[0,0.46],[0,-0.46]])assert.ok(probe(x,y).length>=2,'aperture must be bounded by real material');
}
function section(ts,x,z){return hits(ts,V(x,-2,z),V(0,1,0),4);}
function projectedSection(ts,x,z){
  const out=[];for(const [a,b,c]of ts){const det=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(det)<1e-14)continue;
    const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/det,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/det,w=1-u-v;
    if(Math.min(u,v,w)<-1e-9)continue;const y=u*a.y+v*b.y+w*c.y;if(y>=-2&&y<=2&&!out.some(p=>Math.abs(p.y-y)<1e-6))out.push(V(x,y,z));
  }return out.sort((a,b)=>a.y-b.y);
}
function circularSection(ts,y){const radii=Array.from({length:64},(_,i)=>{const a=(i+.347)*Math.PI/32,h=hits(ts,V(0,y,0),V(Math.cos(a),0,Math.sin(a)),2);assert.equal(h.length,1,'closed revolved body section');return Math.hypot(h[0].x,h[0].z);});assert.ok(Math.max(...radii)-Math.min(...radii)<.015,'actual circular perimeter, not matching square bounds');}
function cup(ts){
  solid(ts);const z=bounds(ts).center.z,center=section(ts,0,z);assert.equal(center.length,2,'cup needs inner floor AND exterior back');
  assert.ok(center[0].y>-.01&&center[0].y<.04&&center[1].y>center[0].y+.015,'inner floor local +.015, exterior back beyond it');
  for(const angle of [0,.7,1.4,2.2,3.1,4.1,5.2]){const h=section(ts,Math.cos(angle)*.95,z+Math.sin(angle)*.95);assert.ok(h.length>=2&&h[0].y<center[0].y-.025,'open concave local -Y cup with a raised rim, not a slab');}
}
function fixture(document,geometry){const buffer=document.getRoot().listBuffers()[0]??document.createBuffer(),acc=(type,a)=>document.createAccessor().setType(type).setArray(a).setBuffer(buffer),p=document.createPrimitive().setAttribute('POSITION',acc('VEC3',geometry.attributes.position.array)).setIndices(acc('SCALAR',geometry.index.array));if(geometry.attributes.normal)p.setAttribute('NORMAL',acc('VEC3',geometry.attributes.normal.array));return document.createNode().setMesh(document.createMesh().addPrimitive(p));}
const box=(size,at=[0,0,0])=>faces(fixture(new Document(),new BoxGeometry(...size)).setTranslation(at));
function uvTriangles(p){const pos=p.getAttribute('POSITION'),uv=p.getAttribute('TEXCOORD_0'),ix=p.getIndices();assert.ok(uv,'actual UVs required');assert.equal(uv.getCount(),pos.getCount());for(let i=0;i<uv.getCount();i++)assert.ok(uv.getElement(i,[]).every(v=>Number.isFinite(v)&&v>=-1e-7&&v<=1+1e-7),'normalized UV range');
  for(let i=0;i<(ix?.getCount()??pos.getCount());i+=3){const ids=[0,1,2].map(j=>ix?ix.getScalar(i+j):i+j);if(new Triangle(...ids.map(j=>V().fromArray(pos.getElement(j,[])))).getArea()<1e-10)continue;const [a,b,c]=ids.map(j=>uv.getElement(j,[]));assert.ok(Math.abs((b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]))>1e-12,'noncollapsed textured triangle UVs');}}
async function lockedPublication(source){
  let callback;simple(parse(source,{ecmaVersion:'latest',sourceType:'module'}),{CallExpression(n){if(n.callee.name==='saveRefinedHero')callback=n.arguments[2];}});assert.equal(callback?.body?.type,'BlockStatement','existing locked publication callback required');let guard,live;const edits=[];
  simple(callback,{MemberExpression(n){if(n.object.type==='MetaProperty'&&n.property.name==='url')edits.push({...n,text:JSON.stringify(url('./build-refined-custom.mjs').href)});},IfStatement(n){if(n.test.left?.name==='liveCollection')guard=n;},VariableDeclarator(n){if(n.id.name==='liveCollection')live=n;}});assert.ok(guard&&live,'fresh inside-lock budget guard required');
  const fragment=(changes=[])=>{let text=source.slice(callback.start,callback.end);for(const e of [...edits,...changes].filter(e=>!changes.some(c=>c!==e&&c.start<=e.start&&c.end>=e.end)).sort((a,b)=>b.start-a.start))text=text.slice(0,e.start-callback.start)+e.text+text.slice(e.end-callback.start);return text;};
  const run=async(total,text)=>{const events=[],target=url('../../web/public/heroes/custom.glb'),output=Buffer.alloc(96),publish=new Function('sizeOf','stat','writeFile','rename','URL','target','output','collection','return ('+text+');')(async p=>{assert.equal(p.href,url('../../web/public/').href);events.push('size');return total;},async p=>{assert.equal(p.href,target.href);return {size:64};},async()=>events.push('write'),async()=>events.push('rename'),URL,target,output,0);try{await publish();return {events};}catch(error){return {events,error};}};
  const verify=async text=>{const over=await run(10485760-31,text);assert.ok(over.error instanceof Error,'one byte over fresh cap must reject');assert.deepEqual(over.events,['size']);const exact=await run(10485760-32,text);assert.ifError(exact.error);assert.deepEqual(exact.events,['size','write','rename']);};
  await verify(fragment());await assert.rejects(()=>verify(fragment([{...guard,text:''}])),{code:'ERR_ASSERTION'});
  await assert.rejects(()=>verify(fragment([{...live.init,text:'collection'},{start:callback.body.start+1,end:callback.body.start+1,text:'await sizeOf(new URL("../../web/public/",'+JSON.stringify(url('./build-refined-custom.mjs').href)+'));'}])),{code:'ERR_ASSERTION'},'unused fresh read must not hide a stale guard');
  await assert.rejects(()=>verify(fragment([{...guard.test,text:source.slice(guard.test.start,guard.test.end).replace('>','>=')}])),{code:'ERR_ASSERTION'},'exact-boundary rejection mutation must fail');
}

test('Custom replaces the study with hash-protected procedural original refinement in both manifests',async()=>{
  const {record,inventory,bytes}=await custom();assert.equal(record?.quality,'refined-textured','Custom must replace the untextured study');assert.deepEqual(record,inventory);assert.equal(record.sourceFile,'apps/media/scripts/build-refined-custom.mjs');assert.equal(record.sha256,hash(bytes));assert.equal(record.bytes,bytes.length);
  const source=(await required('./build-refined-custom.mjs','the Custom builder source')).toString().replace(/\r\n/g,'\n'),config=JSON.parse(await required('../sources/custom/materials.json','the procedural material recipe'));
  assert.equal(record.sourceSha256,hash(source));assert.equal(record.materialSourceSha256,hash(JSON.stringify(config)));assert.deepEqual(config.images,[]);assert.equal(config.resolution,256);
  assert.match(JSON.stringify(config),/procedural/i);assert.match(JSON.stringify(config),/original/i);assert.ok(record.provenance&&record.creator&&record.license);
  for(const kind of ['steel','radial','dial','enamel']){const s=config.surfaces[kind];assert.ok(s&&s.roughness>0&&s.roughness<1&&s.normalScale>0&&s.normalScale<=1);assert.ok(s.tile?.length===2&&s.tile.every(n=>Number.isFinite(n)&&n>0));}
});

test('Custom uses twelve embedded 256px WebP PBR maps with lossless normalized normals and no glow',async()=>{
  const {root,nodes,bytes}=await custom(),textures=root.listTextures(),used=new Set(nodes.flatMap(n=>n.getMesh()?.listPrimitives().map(p=>p.getMaterial())??[]));assert.equal(textures.length,12,'four real PBR triplets replace flat study materials');
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));assert.ok(json.images.every(i=>i.bufferView!==undefined&&!i.uri)&&json.buffers.every(b=>!b.uri));
  for(const name of ['C-Steel-Linear','C-Steel-Radial','C-Dial','C-Enamel-Green','C-Enamel-Red']){const m=[...used].find(m=>m?.getName()===name);assert.ok(m?.getBaseColorTexture()&&m.getNormalTexture()&&m.getMetallicRoughnessTexture(),name+' requires rendered PBR maps');}
  for(const m of used){assert.ok(m);assert.deepEqual(m.getEmissiveFactor(),[0,0,0]);assert.equal(m.getEmissiveTexture(),null);}
  for(const t of textures){const uses=[...used].flatMap(m=>[[m.getBaseColorTexture(),'color'],[m.getNormalTexture(),'normal'],[m.getMetallicRoughnessTexture(),'roughness']]).filter(([map])=>map===t);assert.ok(uses.length,'unused maps are not refinement');assert.equal(t.getMimeType(),'image/webp');const {data,info}=await sharp(t.getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,256);assert.equal(info.height,256);
    assert.ok([0,1,2].some(c=>new Set(Array.from({length:256*256},(_,i)=>data[i*info.channels+c])).size>2),'maps need spatial variation; intentionally shared maps need not have unique hashes');
    if(uses.some(([,slot])=>slot==='normal')){const b=Buffer.from(t.getImage()),chunks=[];for(let i=12;i+8<=b.length;){chunks.push(b.toString('ascii',i,i+4));const n=b.readUInt32LE(i+4);i+=8+n+n%2;}assert.ok(chunks.includes('VP8L'));let valid=0;for(let i=0;i<data.length;i+=info.channels){const n=Math.hypot(...[0,1,2].map(c=>data[i+c]/127.5-1));if(Math.abs(n-1)<.025&&data[i+2]>180)valid++;}assert.ok(valid>256*256*.99,'filtered normals must be renormalized before lossless packing');}
  }
});

test('Custom case is closed with an actual central dial recess and floor, not a disk or open shell',async()=>{
  const closed=box([2,.3,2]);solid(closed);reject(()=>solid(closed.slice(1)));reject(()=>solid(closed.map(t=>[t[2],t[1],t[0]])));reject(()=>solid([...closed,...box([.2,.2,.2],[3,0,0]).map(t=>[t[2],t[1],t[0]])]));
  const recessed=ts=>{solid(ts);const center=section(ts,0,0),rim=section(ts,.94,0);assert.equal(center.length,2);assert.ok(rim.length>=2&&rim.at(-1).y>center.at(-1).y+.035,'actual case rim must rise above the retained central floor');circularSection(ts,(center[0].y+center[1].y)/2);};reject(()=>recessed(closed));reject(()=>circularSection(closed,0));
  const {named}=await custom();recessed(faces(named('C-Case'),named('C-Assembly')));
});

test('Custom dark dial is a closed seated cylinder with its top near author Y .264',async()=>{
  reject(()=>contact(box([2,.02,2]),box([2,.02,2],[0,.03,0])));
  reject(()=>circularSection(box([1,.1,1]),0));circularSection(faces(fixture(new Document(),new CylinderGeometry(.87,.87,.14,96)).setTranslation([0,.192,0])),.192);
  const {named}=await custom(),frame=named('C-Assembly'),dial=faces(named('C-Dial'),frame),body=faces(named('C-Case'),frame),b=bounds(dial);solid(dial);circularSection(dial,b.center.y);contact(dial,body);reject(()=>contact(dial.map(t=>t.map(p=>p.clone().add(V(0,.02,0)))),body));assert.ok(Math.abs(b.max.y-.264)<.025&&b.span.y>.005&&Math.abs(b.span.x-b.span.z)<.015);
  for(const [x,z]of [[0,0],[.5,0],[0,.5],[-.5,-.3]]){const h=section(dial,x,z);assert.equal(h.length,2);assert.ok(Math.abs(h[1].y-b.max.y)<.002,'level true dial top');}assert.ok(dial.every(t=>Math.max(...t.material.getBaseColorFactor().slice(0,3))<.3),'dial stays dark');
});

test('Custom rose is a closed raised faceted metal eight-point body seated on the dial',async()=>{
  const verify=ts=>{solid(ts);const radii=Array.from({length:128},(_,i)=>{const a=i*Math.PI/64,h=hits(ts,V(0,.28,0),V(Math.cos(a),0,Math.sin(a)),2);assert.ok(h.length,'rose section must surround center');return h[0].length();});let peaks=0;for(let i=0;i<128;i++)if(radii[i]>radii[(i+127)%128]+.001&&radii[i]>radii[(i+1)%128]+.001)peaks++;assert.equal(peaks,8,'eight actual pointed radial lobes');};
  reject(()=>verify(faces(fixture(new Document(),new CylinderGeometry(.6,.6,.06,64)).setTranslation([0,.28,0]))));
  const {named}=await custom(),frame=named('C-Assembly'),rose=faces(named('C-Rose'),frame);verify(rose);contact(rose,faces(named('C-Dial'),frame));assert.ok(bounds(rose).span.y>.008);assert.ok(rose.every(t=>t.material.getMetallicFactor()>.6));assert.ok(rose.some(t=>{const n=new Triangle(...t).getNormal(V());return Math.abs(n.y)>.1&&Math.abs(n.y)<.99;}),'real sloping metal facets');
});

test('Custom has sixty closed radially aligned seated ticks with twelve longer major ticks',async()=>{
  const {named,nodes}=await custom(),frame=named('C-Assembly'),dial=faces(named('C-Dial'),frame);assert.equal(nodes.filter(n=>/^C-Tick-\d+$/.test(n.getName())).length,60);const lengths=[];
  for(let i=0;i<60;i++){const ts=faces(named('C-Tick-'+i),frame);solid(ts);contact(ts,dial);const b=bounds(ts),r=Math.hypot(b.center.x,b.center.z),a=Math.atan2(b.center.x,b.center.z),radial=ts.flat().map(p=>p.x*Math.sin(a)+p.z*Math.cos(a)),tangent=ts.flat().map(p=>p.x*Math.cos(a)-p.z*Math.sin(a));assert.ok(r>.65&&r<.94);assert.ok(Math.max(...tangent)-Math.min(...tangent)<.045,'radial ticks, not tangential bars');lengths.push(Math.max(...radial)-Math.min(...radial));}
  assert.ok(Math.min(...lengths.filter((_,i)=>i%5===0))>Math.max(...lengths.filter((_,i)=>i%5!==0))*1.3,'twelve actual major tick lengths');
  const angles=Array.from({length:60},(_,i)=>{const c=bounds(faces(named('C-Tick-'+i),frame)).center;return (Math.atan2(c.x,c.z)+2*Math.PI)%(2*Math.PI);}).sort((a,b)=>a-b);for(let i=0;i<60;i++)assert.ok(Math.abs((angles[(i+1)%60]-angles[i]+2*Math.PI)%(2*Math.PI)-Math.PI/30)<.012,'even full dial calibration');
});

test('Custom needle has two closed opposed faceted enamel halves in one Y-rotated needle group',async()=>{
  const {named}=await custom(),frame=named('C-Assembly'),north=named('C-Needle-North'),south=named('C-Needle-South'),parent=north.getParentNode();assert.ok(parent&&parent!==frame&&south.getParentNode()===parent,'shared actual needle pivot group');const q=new Quaternion().fromArray(parent.getRotation());assert.ok(Math.abs(q.x)<.001&&Math.abs(q.z)<.001&&Math.abs(q.y)>.05,'needle rotates about author Y');
  const halves=[north,south].map(n=>faces(n,frame)),centers=halves.map(t=>bounds(t).center);assert.ok(V(centers[0].x,0,centers[0].z).dot(V(centers[1].x,0,centers[1].z))<-.015,'opposed colored halves');
  for(const [i,ts]of halves.entries()){solid(ts);assert.ok(bounds(ts).span.y>.012);assert.ok(ts.some(t=>{const y=Math.abs(new Triangle(...t).getNormal(V()).y);return y>.15&&y<.98;}),'faceted, not flat extrusions');for(const t of ts){const [r,g]=t.material.getBaseColorFactor();assert.ok(i===0?g>r*1.5:r>g*1.5,'green north/red south');}}
});

test('Custom axle and pivot physically connect the dial and both needle roots',async()=>{
  const a=box([.2,.2,.2]),b=box([2,2,2]);reject(()=>contact(a,b));const {named}=await custom(),f=named('C-Assembly'),dial=faces(named('C-Dial'),f),axle=faces(named('C-Axle'),f),pivot=faces(named('C-Pivot'),f);solid(axle);solid(pivot);contact(axle,dial);contact(axle,pivot);
  for(const n of ['C-Needle-North','C-Needle-South']){let roots=faces(named(n),f);for(const axis of [V(1,0,0),V(0,0,1)])roots=clip(clip(roots,axis,-.12,true),axis,.12,false);assert.ok(roots.length);contact(roots,axle);contact(roots,pivot);}
});

test('Custom transparent closed lens covers the complete needle and pivot without intersecting them',async()=>{
  const slab=box([1,.02,1]);assert.equal(projectedSection(slab,0,0).length,2);assert.equal(projectedSection(slab,.6,0).length,0);
  const {named}=await custom(),f=named('C-Assembly'),lens=faces(named('C-Glass'),f),lb=bounds(lens),caseBounds=bounds(faces(named('C-Case'),f));solid(lens);assert.ok(lb.span.y>.001&&lb.span.y<.08);assert.ok(lb.span.x<caseBounds.span.x-.03&&lb.span.z<caseBounds.span.z-.03,'lens inside bezel');
  assert.ok(lens.every(t=>t.material.getAlphaMode()==='BLEND'&&t.material.getBaseColorFactor()[3]>0&&t.material.getBaseColorFactor()[3]<.5),'real transparent lens');
  for(const n of ['C-Needle-North','C-Needle-South','C-Pivot']){const ts=faces(named(n),f);assert.ok(lb.min.y>bounds(ts).max.y+.002,'lens clears full '+n);for(const p of ts.flatMap(t=>[...t,t[0].clone().add(t[1]).add(t[2]).divideScalar(3)])){const h=projectedSection(lens,p.x,p.z);assert.equal(h.length,2,'full moving assembly lies under lens');assert.ok(h[0].y>p.y+.002);}}
});

test('Custom lid is an upright attached open concave cup, with inward floor facing local minus Y',async()=>{
  reject(()=>cup(box([2,.06,2],[0,.015,.95])));const {named}=await custom(),f=named('C-Assembly'),group=named('C-Lid-Group'),lid=named('C-Lid'),local=faces(lid,group),world=faces(lid,f),body=bounds(faces(named('C-Case'),f));cup(local);assert.equal(lid.getParentNode(),group);
  const transform=new Matrix4().fromArray(f.getWorldMatrix()).invert().multiply(new Matrix4().fromArray(group.getWorldMatrix())),hinge=V().applyMatrix4(transform),front=V(0,-1,0).applyMatrix3(new Matrix3().getNormalMatrix(transform)).normalize(),b=bounds(world);assert.ok(hinge.distanceTo(V(0,.5,-1.06))<.04,'relieved hinge outside the case and lid skins');assert.ok(front.y>.15&&front.z>.75,'open lid faces out, not down below case');assert.ok(b.max.y>body.max.y+.9&&b.min.y>body.min.y-.04,'upright real lid rest');
  const ray=new Ray(V(.07,-.5,.98),V(0,1,0)),point=V(),interior=local.filter(t=>ray.intersectTriangle(...t,false,point)&&point.y<.04);assert.ok(interior.some(t=>new Triangle(...t).getNormal(V()).y<-.8),'actual inward floor winding, not metadata');
});

test('Custom five closed hollow hinge knuckles share one real bore traversed by the X-axis pin',async()=>{
  const ring=faces(fixture(new Document(),new TorusGeometry(.4,.08,8,48)));aperture(ring,'z');reject(()=>aperture([...ring,...box([.4,.4,.1])],'z'));reject(()=>aperture(ring.slice(1),'z'));
  const {named,nodes}=await custom(),f=named('C-Assembly'),lidGroup=named('C-Lid-Group'),pin=faces(named('C-Hinge-Pin'),f),pb=bounds(pin),intervals=[];solid(pin);assert.ok(pb.span.x>pb.span.y*5&&pb.span.x>pb.span.z*5);assert.ok(Math.abs(pb.center.y-.5)<.025&&Math.abs(pb.center.z+1.06)<.025);assert.equal(nodes.filter(n=>/^C-Hinge-Knuckle-\d+$/.test(n.getName())).length,5);
  for(let i=0;i<5;i++){const n=named('C-Hinge-Knuckle-'+i),ts=faces(n,f),b=bounds(ts);aperture(ts,'x');intervals.push([b.min.x,b.max.x]);assert.ok(pb.min.x<=b.min.x&&pb.max.x>=b.max.x,'pin spans EVERY real barrel');assert.equal(n.getParentNode()===lidGroup,i%2===1,'alternating real case/lid parents');
    const axis=V(b.center.x,pb.center.y,pb.center.z);assert.equal(hits(ts,V(b.min.x-.1,axis.y,axis.z),V(1,0,0),b.span.x+.2).length,0,'pin axis passes through actual empty bore');
    for(const d of [V(0,1,0),V(0,-1,0),V(0,0,1),V(0,0,-1)]){const shell=hits(ts,axis,d,.2),shaft=hits(pin,axis,d,.2);assert.ok(shell.length>=2&&shaft.length===1&&shell[0].distanceTo(axis)>shaft[0].distanceTo(axis)+.0015,'real bore fits pin with positive retained clearance');}
  }intervals.sort((a,b)=>a[0]-b[0]);for(let i=1;i<5;i++)assert.ok(intervals[i][0]>=intervals[i-1][1]-.002&&intervals[i][0]-intervals[i-1][1]<.035,'separate interleaved barrel intervals');
});

test('Custom assembled hinge channel stays empty through every barrel when the pin is excluded',async()=>{
  const {named,nodes}=await custom(),f=named('C-Assembly'),pin=named('C-Hinge-Pin'),axis=bounds(faces(pin,f)).center;
  const assembled=nodes.filter(n=>n.getMesh()&&n!==pin).flatMap(n=>faces(n,f));
  for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const dy=i*.007,dz=j*.007;if(Math.hypot(dy,dz)>.019)continue;
    assert.equal(hits(assembled,V(-1.25,axis.y+dy,axis.z+dz),V(1,0,0),2.5).length,0,'case, lid and brackets must not occupy the assembled shaft channel');
  }
});

test('Custom pin retains positive radial clearance in all five assembled hinge bores',async()=>{
  const {named}=await custom(),f=named('C-Assembly'),shaft=faces(named('C-Hinge-Pin'),f),axis=bounds(shaft).center;
  const verify=pin=>{for(let i=0;i<5;i++){const shell=faces(named('C-Hinge-Knuckle-'+i),f),center=V(bounds(shell).center.x,axis.y,axis.z);for(let j=0;j<64;j++){const a=(j+.371)*Math.PI/32,d=V(0,Math.cos(a),Math.sin(a)),bore=hits(shell,center,d,.2),rod=hits(pin,center,d,.2);assert.ok(bore.length>=2&&rod.length===1);assert.ok(bore[0].distanceTo(center)-rod[0].distanceTo(center)>.0015,'positive retained pin/bore clearance, not an allowed interference');}}};
  verify(shaft);const oversized=shaft.map(t=>t.map(p=>V(p.x,axis.y+(p.y-axis.y)*1.25,axis.z+(p.z-axis.z)*1.25)));reject(()=>verify(oversized));
});

test('Custom five hinge brackets join actual case/lid skins at opposite knuckle endpoints',async()=>{
  reject(()=>endpoints(box([2,.1,.1]),box([.02,.3,.3],[-.7,0,0]),box([.02,.3,.3],[.7,0,0])));
  const rail=box([2,.1,.1]),left=box([.1,.3,.3],[-1,0,0]),right=box([.1,.3,.3],[1,0,0]);endpoints(rail,left,right);reject(()=>endpoints(rail,box([.1,.3,.3]),right));reject(()=>contact(box([.2,.2,.2]),box([.2,.2,.2],[0,0,3])));
  const triangle=ps=>[ps.map(p=>V(...p))];reject(()=>contact(triangle([[0,0,0],[2,0,0],[0,2,0]]),triangle([[2,2,0],[2,.6,0],[.6,2,0]])));
  const open=r=>faces(fixture(new Document(),new CylinderGeometry(r,r,2,24,1,true)));reject(()=>contact(open(.6),open(1)));
  contact(box([4,.2,.4]),box([.4,4,.2]));const {named}=await custom(),f=named('C-Assembly'),group=named('C-Lid-Group');for(const kind of ['Case','Lid'])for(const sign of kind==='Case'?[-1,0,1]:[-1,1]){const link=named('C-Hinge-'+kind+'-Link-'+sign),ts=faces(link,f),skin=faces(named(kind==='Case'?'C-Case':'C-Lid'),f),i=kind==='Case'?(sign+1)*2:(sign<0?1:3),knuckle=faces(named('C-Hinge-Knuckle-'+i),f);assert.equal(link.getParentNode()===group,kind==='Lid');endpoints(ts,skin,knuckle);}
  for(let i=0;i<5;i++){const kind=i%2?'Lid':'Case',support=[...faces(named('C-'+kind),f),...(kind==='Case'?[-1,0,1]:[-1,1]).flatMap(sign=>faces(named('C-Hinge-'+kind+'-Link-'+sign),f))];contact(faces(named('C-Hinge-Knuckle-'+i),f),support);}
});

test('Custom front lug physically seats the closed bail with a real empty ring aperture',async()=>{
  const {named}=await custom(),f=named('C-Assembly'),lug=faces(named('C-Lug'),f),bail=faces(named('C-Bail'),f),body=faces(named('C-Case'),f),b=bounds(bail);solid(lug);aperture(bail,'y');contact(lug,body);contact(lug,bail);assert.ok(Math.abs(bounds(lug).center.z-1.04)<.1&&Math.abs(b.center.z-1.30)<.1,'actual front hardware placement');
  reject(()=>aperture([...bail,...box([b.span.x*.6,b.span.y*.8,b.span.z*.6],b.center.toArray())],'y'));const shifted=bail.map(t=>t.map(p=>p.clone().add(V(0,0,2))));reject(()=>contact(lug,shifted));
});

test('Custom retains finite grounded 3.2 stage, both 65k caps, 0.5MiB, 16bit UV/position and fresh locked 10MiB publication',async()=>{
  const document=new Document(),buffer=document.createBuffer(),acc=(type,array)=>document.createAccessor().setType(type).setArray(array).setBuffer(buffer),node=fixture(document,new BoxGeometry(.02,.1,.04)),batch=document.createExtension(EXTMeshGPUInstancing).createInstancedMesh();batch.setAttribute('TRANSLATION',acc('VEC3',new Float32Array([0,0,0,2,0,0])));batch.setAttribute('SCALE',acc('VEC3',new Float32Array([1,1,1,3,2,1])));batch.setAttribute('ROTATION',acc('VEC4',new Float32Array([0,0,0,1,0,0,Math.SQRT1_2,Math.SQRT1_2])));node.setExtension('EXT_mesh_gpu_instancing',batch);assert.equal(faces(node).length,24);assert.ok(Math.abs(bounds(faces(node)).max.x-2.1)<1e-6);
  const slant=fixture(document,new BoxGeometry(1,1,1).rotateZ(Math.PI/4)).setScale([2,1,1]);assert.ok(faces(slant)[0].normals[0].distanceTo(V(1/Math.sqrt(5),2/Math.sqrt(5),0))<1e-6);
  const p=document.createPrimitive().setAttribute('POSITION',acc('VEC3',new Uint16Array([0,0,0,65535,0,0,0,65535,0])).setNormalized(true)).setAttribute('TEXCOORD_0',acc('VEC2',new Uint16Array([0,0,65535,0,0,65535])).setNormalized(true)),normalized=document.createNode().setMesh(document.createMesh().addPrimitive(p));assert.equal(faces(normalized)[0][1].x,1);uvTriangles(p);p.setAttribute('TEXCOORD_0',acc('VEC2',new Float32Array([0,0,.5,.5,1,1])));reject(()=>uvTriangles(p));p.setAttribute('TEXCOORD_0',acc('VEC2',new Float32Array([0,0,1.01,0,0,1])));reject(()=>uvTriangles(p));document.createScene().addChild(node);assert.ok(!sceneNodes(document.getRoot()).includes(normalized),'orphans do not count');
  await lockedPublication(`await saveRefinedHero({},undefined,async()=>{const liveCollection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;if(liveCollection>10485760)throw new Error('cap');await writeFile(target,output);await rename(target,target);});`);
  const {root,record,bytes}=await custom();assert.ok(record,'Custom refinement requires a protected imported record');const rendered=root.listScenes().flatMap(s=>s.listChildren().flatMap(n=>faces(n))),b=bounds(rendered);assert.ok(bytes.length<=524288);assert.ok(Math.abs(b.min.y)<.003&&Math.abs(Math.max(...b.span.toArray())-3.2)<.003);let unique=0;
  for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){unique+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;for(const semantic of p.listSemantics())assert.ok(Array.from(p.getAttribute(semantic).getArray()).every(Number.isFinite));if(p.getMaterial()?.getBaseColorTexture())uvTriangles(p);}
  for(const t of rendered){assert.ok(t.normals?.every(n=>n.toArray().every(Number.isFinite)&&Math.abs(n.length()-1)<1e-5));const cross=t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0]));if(cross.lengthSq()>1e-18)for(const n of t.normals)assert.ok(cross.dot(n)>=-cross.length()*.001,'every face-corner normal agrees with outward winding');}
  assert.equal(unique,record.triangles);assert.ok(unique<=65000&&rendered.length<=65000);async function sizeOf(path){let n=0;for(const e of await readdir(path,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),path);n+=e.isDirectory()?await sizeOf(p):(await stat(p)).size;}return n;}assert.ok(await sizeOf(url('../../web/public/'))<=10485760);
  const source=(await required('./build-refined-custom.mjs','the locked Custom builder')).toString();await lockedPublication(source);const options=[];simple(parse(source,{ecmaVersion:'latest',sourceType:'module'}),{CallExpression(n){if(n.callee.name==='meshopt')options.push(n.arguments[0]);}});assert.ok(options.length);for(const o of options)for(const name of ['quantizePosition','quantizeTexcoord'])assert.equal(o.properties.find(p=>p.key.name===name)?.value.value,16);
});
