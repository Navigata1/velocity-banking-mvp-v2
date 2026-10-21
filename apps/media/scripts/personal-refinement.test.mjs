import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { EXTMeshGPUInstancing } from '@gltf-transform/extensions';
import { Vector3, Ray, Triangle, BoxGeometry, CylinderGeometry, TorusGeometry, Shape, Path, ExtrudeGeometry } from '../../web/node_modules/three/build/three.module.js';
import {personal,faces,bounds,hits} from './personal-geometry-test-helpers.mjs';
import sharp from 'sharp';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';

const hash=b=>createHash('sha256').update(b).digest('hex');
const url=path=>new URL(path,import.meta.url);
function boundedUvs(uv,name){for(let i=0;i<uv.getCount();i++)assert.ok(uv.getElement(i,[]).every(v=>v>=-1e-7&&v<=1+1e-7),name+' UVs must remain in the retained16bit range');}
const pointKey=p=>p.toArray().map(v=>Math.round(v*1e5)).join(',');
function solid(ts) {
  const edges=new Map();let volume=0;
  for(const [a,b,c]of ts) {
    const ids=[a,b,c].map(pointKey);if(new Set(ids).size<3)continue;volume+=a.dot(b.clone().cross(c))/6;
    for(let i=0;i<3;i++){const x=ids[i],y=ids[(i+1)%3],id=[x,y].sort().join('|'),e=edges.get(id)??[0,0];e[0]++;e[1]+=x<y?1:-1;edges.set(id,e);}
  }
  assert.ok(edges.size>6&&[...edges.values()].every(([count,winding])=>count===2&&winding===0),'surface must be closed with consistent edges');
  assert.ok(volume>1e-8,'closed volume must face outward, independently of encoded normals');
}
function connected(ts) {
  const neighbours=new Map();
  for(const t of ts){const ids=t.map(pointKey);for(const a of ids){const set=neighbours.get(a)??new Set();ids.forEach(b=>set.add(b));neighbours.set(a,set);}}
  let count=0;const unseen=new Set(neighbours.keys());while(unseen.size){count++;const pending=[unseen.values().next().value];while(pending.length){const a=pending.pop();if(!unseen.delete(a))continue;pending.push(...neighbours.get(a));}}return count;
}
function verifyRibbon(ts) {
  const b=bounds(ts);
  // Local section axes measure ribbon width/thickness; the whole 3D AABB cannot.
  for(const fraction of [0.43,0.67]) {
    const y=b.min.y+b.span.y*fraction,points=new Map();
    for(const t of ts)for(let i=0;i<3;i++){const a=t[i],c=t[(i+1)%3];if(Math.abs(c.y-a.y)<1e-9||(a.y-y)*(c.y-y)>0)continue;const p=a.clone().lerp(c,(y-a.y)/(c.y-a.y));points.set(pointKey(p),p);}
    for(const left of [true,false]) {
      const section=[...points.values()].filter(p=>(p.x<b.center.x)===left);assert.ok(section.length>=4,'both hanging legs need real section surfaces');
      const center=section.reduce((s,p)=>s.add(p),new Vector3()).divideScalar(section.length);let xx=0,zz=0,xz=0;
      for(const p of section){const x=p.x-center.x,z=p.z-center.z;xx+=x*x;zz+=z*z;xz+=x*z;}
      const angle=Math.atan2(2*xz,xx-zz)/2,axis=[Math.cos(angle),Math.sin(angle)];
      const a=section.map(p=>(p.x-center.x)*axis[0]+(p.z-center.z)*axis[1]),c=section.map(p=>-(p.x-center.x)*axis[1]+(p.z-center.z)*axis[0]);
      const width=Math.max(...a)-Math.min(...a),thickness=Math.max(...c)-Math.min(...c),ratio=width/thickness;
      assert.ok(width>b.span.x*0.02&&thickness>1e-4&&ratio>3.5&&ratio<20,'actual shoulder sections must be broad flat leather, not round cords or zero-thickness planes');
    }
  }
}
function contactFaces(left,right,label='surfaces') {
  const lb=bounds(left),rb=bounds(right),tolerance=Math.min(lb.span.length(),rb.span.length())*0.006,p=new Vector3(),onRay=new Vector3(),onSegment=new Vector3();
  for(const [source,target,box]of [[left,right,rb],[right,left,lb]])for(const point of source.flat()) {
    if(['x','y','z'].some(k=>point[k]<box.min[k]-tolerance||point[k]>box.max[k]+tolerance))continue;
    if(target.some(t=>new Triangle(...t).closestPointToPoint(point,p).distanceTo(point)<=tolerance))return;
  }
  // Bounded edges detect crossings; open skins never use inside/outside parity.
  for(const a of left)for(const b of right) {
    if(['x','y','z'].some(k=>Math.max(...a.map(p=>p[k]))<Math.min(...b.map(p=>p[k]))-tolerance||Math.max(...b.map(p=>p[k]))<Math.min(...a.map(p=>p[k]))-tolerance))continue;
    for(const [from,to]of [[a,b],[b,a]])for(let i=0;i<3;i++) {
      const origin=from[i],edge=from[(i+1)%3].clone().sub(origin),length=edge.length();if(length<1e-10)continue;
      const ray=new Ray(origin,edge.divideScalar(length));
      if(ray.intersectTriangle(...to,false,p)&&p.distanceTo(origin)<=length+tolerance)return;
      for(let j=0;j<3;j++)if(ray.distanceSqToSegment(to[j],to[(j+1)%3],onRay,onSegment)<=tolerance*tolerance&&onRay.distanceTo(origin)<=length)return;
    }
  }
  assert.fail(label+' must physically meet in XYZ');
}
const contact=(a,b,frame)=>contactFaces(faces(a,frame,b),faces(b,frame,a),a.getName()+' / '+b.getName());
function contactAny(a,targets,frame) {
  assert.ok(targets.some(b=>{try{contact(a,b,frame);return true;}catch(e){if(e.code!=='ERR_ASSERTION')throw e;return false;}}),a.getName()+' must meet its leather support');
}
function opening(ts,arch=false,grid=[23,23],depthAxis=null) {
  const b=bounds(ts),depth=depthAxis??['x','y','z'].sort((a,c)=>b.span[a]-b.span[c])[0],[u,v]=['x','y','z'].filter(k=>k!==depth),d=new Vector3();d[depth]=1;
  const points=Array.from({length:grid[0]},(_,i)=>Array.from({length:grid[1]},(_,j)=>{const p=b.center.clone();p[depth]=b.min[depth]-b.span.length();p[u]=b.min[u]+(i+0.5)*b.span[u]/grid[0];p[v]=b.min[v]+(j+0.5)*b.span[v]/grid[1];return p;}));
  const occupied=points.map(row=>row.map(p=>hits(ts,p,d).length>0)),clear=[];
  for(let i=1;i<grid[0]-1;i++)for(let j=1;j<grid[1]-1;j++)if(!occupied[i][j]&&occupied.slice(0,i).some(r=>r[j])&&occupied.slice(i+1).some(r=>r[j])&&occupied[i].slice(j+1).some(Boolean)&&(arch||occupied[i].slice(0,j).some(Boolean))) {
    const p=points[i][j].clone();p[depth]=b.center[depth];clear.push(p);
  }
  assert.ok(clear.length>=2,'actual surfaces must leave a measurable unfilled '+(arch?'arch':'enclosed aperture'));return {clear,b,depth,u,v};
}
function bufferFaces(g,center=new Vector3()) {
  const pos=g.attributes.position,ix=g.index;return Array.from({length:ix.count/3},(_,i)=>[0,1,2].map(j=>new Vector3().fromBufferAttribute(pos,ix.getX(i*3+j)).add(center)));
}
const boxFaces=(size,center)=>bufferFaces(new BoxGeometry(...size),center);
function rejectInfill(document,node,verify,size=null,center=null) {
  const b=bounds(faces(node)),g=new BoxGeometry(...(size??b.span.clone().multiplyScalar(0.96).toArray())),buffer=document.getRoot().listBuffers()[0];
  const pos=document.createAccessor().setType('VEC3').setArray(g.attributes.position.array).setBuffer(buffer),ix=document.createAccessor().setType('SCALAR').setArray(g.index.array).setBuffer(buffer);
  const fill=document.createNode('Deliberate-solid-infill').setTranslation((center??b.center).toArray()).setMesh(document.createMesh().addPrimitive(document.createPrimitive().setAttribute('POSITION',pos).setIndices(ix)));node.addChild(fill);
  try{assert.throws(verify,{code:'ERR_ASSERTION'},'actual solid-infill mutation must fail');}finally{node.removeChild(fill);}
}
function surfaces(node) {const result=[];function walk(n){for(const p of n.getMesh()?.listPrimitives()??[])result.push(p.getMaterial());n.listChildren().forEach(walk);}walk(node);assert.ok(result.length&&result.every(Boolean));return result;}
function brass(node) {for(const m of surfaces(node)){const [r,g,b]=m.getBaseColorFactor();assert.ok(m.getMetallicFactor()>0.7&&r>g&&g>b,'hardware must be actual brass-colored metal');}}
function leather(node) {for(const m of surfaces(node)){const [r,g,b]=m.getBaseColorFactor();assert.ok(m.getMetallicFactor()===0&&r>g*1.25&&g>b*1.1&&m.getBaseColorTexture(),'leather needs cognac dielectric surface and actual grain map');}}
async function lockedPublication(source) {
  let callback;simple(parse(source,{ecmaVersion:'latest',sourceType:'module'}),{CallExpression(n){if(n.callee.name==='saveRefinedHero')callback=n.arguments[2];}});
  assert.ok(callback?.body?.type==='BlockStatement','publication needs the existing locked saveRefinedHero callback');
  const replacements=[];let guard,live;
  simple(callback,{
    MemberExpression(n){if(n.object.type==='MetaProperty'&&n.property.name==='url')replacements.push({...n,text:JSON.stringify(url('./build-refined-personal.mjs').href)});},
    IfStatement(n){if(n.test.left?.name==='liveCollection')guard=n;},VariableDeclarator(n){if(n.id.name==='liveCollection')live=n;},
  });assert.ok(guard&&live,'callback must guard fresh liveCollection');
  const fragment=(edits=[])=>{
    let body=source.slice(callback.start,callback.end);
    for(const n of [...replacements,...edits].filter(n=>!edits.some(e=>e!==n&&e.start<=n.start&&e.end>=n.end)).sort((a,b)=>b.start-a.start))body=body.slice(0,n.start-callback.start)+n.text+body.slice(n.end-callback.start);
    return body;
  };
  const run=async(total,text)=>{
    const events=[],output=Buffer.alloc(96),target=url('../../web/public/heroes/personal.glb');
    const publish=new Function('sizeOf','stat','writeFile','rename','URL','target','output','collection','return ('+text+');')(
      async path=>{assert.equal(path.href,url('../../web/public/').href);events.push('size');return total;},
      async path=>{assert.equal(path.href,target.href);return {size:64};},async()=>events.push('write'),async()=>events.push('rename'),URL,target,output,0);
    try{await publish();return {events};}catch(error){return {events,error};}
  };
  const verify=async text=>{
    const over=await run(10*1024*1024-31,text);assert.ok(over.error instanceof Error,'fresh over-budget total must reject');assert.deepEqual(over.events,['size'],'reject before write/rename');
    const exact=await run(10*1024*1024-32,text);assert.ifError(exact.error);assert.deepEqual(exact.events,['size','write','rename'],'exact cap must use fresh total');
  };
  await verify(fragment());await assert.rejects(()=>verify(fragment([{...guard,text:''}])),{code:'ERR_ASSERTION'});
  const at=callback.body.start+1,text='await sizeOf(new URL("../../web/public/",'+JSON.stringify(url('./build-refined-personal.mjs').href)+'));';
  await assert.rejects(()=>verify(fragment([{...live.init,text:'collection'},{start:at,end:at,text}])),{code:'ERR_ASSERTION'},'unused fresh measurement must not hide stale guarded total');
}

test('Personal replaces the study with protected original provenance and explicitly reused leather',async()=>{
  const {record,inventory,bytes}=await personal();
  assert.equal(record?.quality,'refined-textured','Personal must replace the untextured study with a protected refinement');
  assert.deepEqual(record,inventory,'both manifests must protect the same shipping artifact');
  assert.equal(record.sourceFile,'apps/media/scripts/build-refined-personal.mjs');
  assert.equal(record.sha256,hash(bytes));assert.equal(record.bytes,bytes.length);
  assert.equal(record.sourceSha256,hash((await readFile(url('./build-refined-personal.mjs'),'utf8')).replace(/\r\n/g,'\n')));
  const config=JSON.parse(await readFile(url('../sources/personal/materials.json'),'utf8'));
  assert.equal(record.materialSourceSha256,hash(JSON.stringify(config)));
  assert.equal(config.resolution,256);assert.equal(config.leatherColorResolution,512);assert.equal(config.normalResolution,256);
  const image=config.images.find(i=>i.file==='../student-loan/leather.png');assert.ok(image,'reuse the retained original leather, not a new download');
  assert.equal(image.sha256,'7b4897dbee5f4ad7e0982e3cb81a10fb3bcb445db9a084b073215738e01a74e1');
  for(const source of config.images)assert.equal(source.sha256,hash(await readFile(new URL(source.file,url('../sources/personal/')))));
});

test('Personal embeds varied WebP leather, brass and steel maps with bounded non-emissive PBR',async()=>{
  const {root,bytes,named}=await personal(),textures=root.listTextures(),json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.ok(textures.length>=9,'three actual color/normal/roughness sets are required');
  assert.ok(json.extensionsUsed?.includes('EXT_meshopt_compression'));assert.ok(json.images.length>=9&&json.images.every(i=>i.bufferView!==undefined&&!i.uri));assert.ok(json.buffers.every(b=>!b.uri));
  const used=new Set();function walk(n){for(const p of n.getMesh()?.listPrimitives()??[])used.add(p.getMaterial());n.listChildren().forEach(walk);}root.listScenes().forEach(s=>s.listChildren().forEach(walk));
  for(const set of ['Leather','Brass','Steel'])for(const suffix of ['Color','Normal','Roughness']) {
    const matches=textures.filter(t=>t.getName()==='P-'+set+'-'+suffix);assert.equal(matches.length,1,set+'-'+suffix);
    const t=matches[0];assert.equal(t.getMimeType(),'image/webp');const {data,info}=await sharp(t.getImage()).raw().toBuffer({resolveWithObject:true});
    assert.ok(info.width>=256&&info.height>=256&&info.width<=(set==='Leather'&&suffix==='Color'?512:256)&&info.height<=(set==='Leather'&&suffix==='Color'?512:256));
    const channels=suffix==='Normal'?[0,1]:[suffix==='Roughness'?1:0];assert.ok(channels.some(c=>{const values=new Set();for(let i=c;i<data.length;i+=info.channels)values.add(data[i]);return values.size>2;}),t.getName()+' needs spatial surface detail');
    if(suffix==='Normal'){let valid=0;for(let i=0;i<data.length;i+=info.channels){const length=Math.hypot(...[0,1,2].map(c=>data[i+c]/127.5-1));if(length>0.85&&length<1.15&&data[i+2]>180)valid++;}assert.ok(valid>info.width*info.height*0.95,'normal pixels must encode plausible tangent-space normals');}
    assert.ok([...used].some(m=>m&&[m.getBaseColorTexture(),m.getNormalTexture(),m.getMetallicRoughnessTexture()].includes(t)),t.getName()+' must be used on rendered geometry, not merely embedded');
  }
  leather(named('P-Body'));brass(named('P-Buckle-L'));
  for(const m of root.listMaterials()) {
    assert.ok(m.getEmissiveFactor().every(v=>v===0)&&!m.getEmissiveTexture(),'highlights must not use emission');
    assert.ok([m.getRoughnessFactor(),m.getMetallicFactor(),...m.getBaseColorFactor()].every(v=>Number.isFinite(v)&&v>=0&&v<=1),'PBR factors must be finite and bounded');
    const set=m.getBaseColorTexture()?.getName().match(/^P-(Leather|Brass|Steel)-Color$/)?.[1];
    if(set){assert.equal(m.getNormalTexture()?.getName(),'P-'+set+'-Normal');assert.equal(m.getMetallicRoughnessTexture()?.getName(),'P-'+set+'-Roughness');assert.ok(set==='Leather'?m.getMetallicFactor()===0:m.getMetallicFactor()>0.7);}
  }
});

test('Personal has a closed-volume open-top shell and a contacting thick curved flap, rejecting infill and winding damage',async()=>{
  const fixture=boxFaces([2,2,2]);solid(fixture);assert.throws(()=>solid(fixture.slice(1)),{code:'ERR_ASSERTION'});assert.throws(()=>solid(fixture.map(([a,b,c])=>[a,c,b])),{code:'ERR_ASSERTION'});
  const {document,named}=await personal(),body=named('P-Body'),b=bounds(faces(body));
  const cavity=()=>{
    const ts=faces(body);solid(ts);
    for(const x of [0.35,0.5,0.65])for(const y of [0.3,0.5,0.7]) {
      const p=new Vector3(b.min.x+x*b.span.x,b.min.y+y*b.span.y,b.min.z-b.span.z),h=hits(ts,p,new Vector3(0,0,1));
      assert.equal(h.length,4,'shell needs separate outer/inner front and rear walls');assert.ok(h[2].z-h[1].z>b.span.z*0.35,'cavity must contain meaningful air');
      assert.ok(hits(ts,p,new Vector3(0,0,1),true)[0]?.distanceTo(h[0])<1e-5,'shell outside must survive back-face culling');
      const top=new Vector3(p.x,b.max.y+b.span.y,(h[1].z+h[2].z)/2),down=hits(ts,top,new Vector3(0,-1,0));
      assert.equal(down.length,2,'top must be open to the actual bottom skin');assert.ok(down[0].y<b.min.y+b.span.y*0.2,'no hidden lid or solid mouth infill');
    }
  };
  cavity();rejectInfill(document,body,cavity,b.span.clone().multiplyScalar(0.65).toArray());
  const flap=named('P-Flap'),ts=faces(flap,body),fb=bounds(ts);solid(ts);leather(flap);contact(body,flap,body);
  const profile=[];for(const f of [0.15,0.3,0.5,0.7,0.85]){const p=new Vector3(fb.center.x,fb.min.y+f*fb.span.y,fb.min.z-fb.span.z),h=hits(ts,p,new Vector3(0,0,1));assert.ok(h.length>=2&&h.at(-1).z-h[0].z>fb.span.y*0.006,'flap must have real thickness');profile.push((h[0].z+h.at(-1).z)/2);}
  assert.ok(profile.slice(1,-1).some((z,i)=>Math.abs(z-(profile[0]+(profile.at(-1)-profile[0])*([0.3,0.5,0.7][i]-0.15)/0.7))>fb.span.y*0.005),'flap needs a folded curved profile, not a flat rounded slab');
  assert.throws(()=>solid(ts.slice(1)),{code:'ERR_ASSERTION'});assert.throws(()=>solid(ts.map(([a,b,c])=>[a,c,b])),{code:'ERR_ASSERTION'});
});

test('Personal handle has an actual open leather arch and two contacting brass ring and leather tab chains',async()=>{
  const arch=[...boxFaces([0.2,1,0.2],new Vector3(-0.6,0,0)),...boxFaces([0.2,1,0.2],new Vector3(0.6,0,0)),...boxFaces([1.4,0.2,0.2],new Vector3(0,0.5,0))];
  opening(arch,true);assert.throws(()=>opening(boxFaces([1.4,1.2,0.2]),true),{code:'ERR_ASSERTION'});
  const {document,named}=await personal(),body=named('P-Body'),handle=named('P-Handle'),verify=()=>opening(faces(handle),true);verify();leather(handle);
  const hb=bounds(faces(handle,body)),bb=bounds(faces(body));assert.ok(hb.max.y>bb.max.y&&hb.span.y>hb.span.z*2,'handle must rise above the mouth');
  const centers=[];for(const side of ['L','R']) {
    const ring=named('P-Handle-Ring-'+side),tab=named('P-Handle-Tab-'+side);brass(ring);leather(tab);opening(faces(ring));solid(faces(ring));
    contact(handle,ring,body);contact(ring,tab,body);contact(named('P-Handle-Rivet-'+side),tab,body);contactAny(tab,[body,named('P-Flap')],body);centers.push(bounds(faces(ring,body)).center.x);
  }
  assert.ok(centers[0]<centers[1],'mounts must straddle the arch in left/right order');rejectInfill(document,handle,verify);
});

test('Personal front straps have real punched holes, open closed-volume buckles and attached brass tongues',async()=>{
  const fixture=new Shape([new Vector3(-0.075,-0.53),new Vector3(0.075,-0.53),new Vector3(0.075,0.53),new Vector3(-0.075,0.53)]);
  for(const y of [-0.26,-0.12,0.02]){const hole=new Path();hole.absarc(0,y,0.019,0,Math.PI*2,true);fixture.holes.push(hole);}
  const bent=new ExtrudeGeometry(fixture,{depth:0.026,bevelEnabled:false});bent.rotateX(0.28);const p=bent.attributes.position,fixtureFaces=Array.from({length:p.count/3},(_,i)=>[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,i*3+j)));
  assert.throws(()=>opening(fixtureFaces,false,[19,91]),{code:'ERR_ASSERTION'},'a tilted narrow strap cannot infer its punch direction from smallest AABB span');
  opening(fixtureFaces,false,[19,91],'z');
  const {document,named}=await personal(),body=named('P-Body'),bb=bounds(faces(body));
  for(const side of ['L','R']) {
    const strap=named('P-Strap-'+side),buckle=named('P-Buckle-'+side),pin=named('P-Buckle-Pin-'+side),sb=bounds(faces(strap,body));leather(strap);brass(buckle);brass(pin);
    assert.ok(sb.center.z>bb.center.z&&sb.span.y>sb.span.x*2,'straps must lie down the actual front');contactAny(strap,[body,named('P-Flap')],body);
    const punched=()=>opening(faces(strap),false,[19,91],'z'),holes=punched();assert.ok(Math.max(...holes.clear.map(p=>p.y))-Math.min(...holes.clear.map(p=>p.y))>holes.b.span.y*0.12,'strap needs multiple separated punched holes');
    const framed=()=>opening(faces(buckle));framed();solid(faces(buckle));contact(buckle,strap,body);contact(pin,buckle,body);
    const frame=bounds(faces(buckle,body)),tongue=bounds(faces(pin,body));assert.ok(tongue.center.distanceTo(frame.center)<frame.span.length()*0.65&&tongue.span.length()>frame.span.length()*0.2,'tongue must extend into its own frame');
    rejectInfill(document,buckle,framed);rejectInfill(document,strap,punched);
  }
});

test('Personal shoulder strap is one continuous leather ribbon connected through both ring and tab assemblies',async()=>{
  const {named}=await personal(),body=named('P-Body'),strap=named('P-Shoulder-Strap'),ts=faces(strap,body),b=bounds(ts),bb=bounds(faces(body));leather(strap);
  assert.equal(connected(ts),1,'shoulder ribbon must be physically continuous, not disconnected strips');assert.ok(ts.length>=100&&b.span.length()>bb.span.x*0.8,'shoulder strap needs a substantial curved path');
  verifyRibbon(ts);
  const verify=()=>{for(const side of ['L','R']){const ring=named('P-Shoulder-Ring-'+side),tab=named('P-Shoulder-Tab-'+side);brass(ring);leather(tab);opening(faces(ring));contact(strap,ring,body);contact(ring,tab,body);contactAny(tab,[body,named('P-Flap')],body);}};
  verify();const original=[...strap.getTranslation()];try{strap.setTranslation(original.map((v,i)=>v+(i===2?bb.span.length()*3:0)));assert.throws(verify,{code:'ERR_ASSERTION'},'true surface contact must reject a detached shoulder strap');}finally{strap.setTranslation(original);}
});

test('Personal merged stitches and piping are actual exposed geometry following the leather surfaces',async()=>{
  const {named}=await personal(),body=named('P-Body'),bb=bounds(faces(body)),skin=['P-Body','P-Flap','P-Strap-L','P-Strap-R','P-Handle','P-Shoulder-Strap',...['Handle','Shoulder'].flatMap(kind=>['L','R'].map(s=>'P-'+kind+'-Tab-'+s))].flatMap(name=>faces(named(name),body));
  for(const name of ['P-Stitches','P-Piping']) {
    const node=named(name),ts=faces(node,body),b=bounds(ts);assert.ok(node.getMesh()&&ts.length>=100,'seams must be merged actual visible meshes');assert.ok(b.span.x>bb.span.x*0.45&&b.span.y>bb.span.y*0.35,'seams must span the satchel, not a token patch');
    if(name==='P-Stitches')assert.ok(connected(ts)>=20,'stitching needs separated thread segments, not painted lines');
    let near=0,visible=0,total=0;const vertices=ts.flat(),p=new Vector3(),tolerance=bb.span.length()*0.02;
    for(let i=0;i<vertices.length;i+=Math.max(1,Math.floor(vertices.length/48))) {
      total++;const point=vertices[i];if(skin.some(t=>new Triangle(...t).closestPointToPoint(point,p).distanceTo(point)<tolerance))near++;
      const front=hits(skin,new Vector3(point.x,point.y,bb.max.z+bb.span.length()),new Vector3(0,0,-1))[0];if(front&&point.z>=front.z-tolerance)visible++;
    }
    assert.ok(near>=total*0.75&&visible>=total*0.3,'seams must meet and remain exposed on actual leather, not float or hide inside');
  }
});

test('Personal key has a closed outward toothed silhouette and real bow aperture in the foreground',async()=>{
  opening(bufferFaces(new TorusGeometry(0.6,0.12,8,32)));assert.throws(()=>opening(boxFaces([1.4,1.4,0.2])),{code:'ERR_ASSERTION'});
  const {document,named}=await personal(),body=named('P-Body'),key=named('P-Key'),ts=faces(key);solid(ts);const aperture=()=>opening(faces(key)),hole=aperture(),b=hole.b;
  const long=b.span[hole.u]>b.span[hole.v]?hole.u:hole.v,short=long===hole.u?hole.v:hole.u,center=hole.clear.reduce((s,p)=>s.add(p),new Vector3()).divideScalar(hole.clear.length);
  assert.ok(Math.abs(center[long]-b.center[long])>b.span[long]*0.08&&b.span[hole.depth]>b.span[long]*0.01,'key needs a thick shaft extending away from the bow');
  const widths=[];for(let i=1;i<=12;i++) {
    const f=center[long]>b.center[long]?i*0.04:1-i*0.04;let occupied=0;
    for(let j=0;j<41;j++){const p=b.center.clone(),d=new Vector3();p[long]=b.min[long]+f*b.span[long];p[short]=b.min[short]+(j+0.5)*b.span[short]/41;p[hole.depth]=b.min[hole.depth]-b.span.length();d[hole.depth]=1;if(hits(ts,p,d).length)occupied++;}if(occupied)widths.push(occupied);
  }
  assert.ok(new Set(widths).size>=3&&Math.max(...widths)>Math.min(...widths)*1.25,'shaft silhouette needs actual tooth shoulders, not only a ring and plain bar');
  const kb=bounds(faces(key,body)),bb=bounds(faces(body));assert.ok(kb.center.z>bb.max.z&&kb.max.y<bb.center.y,'key must sit visibly in front of the satchel');
  assert.ok(surfaces(key).every(m=>m.getMetallicFactor()>0.7),'key must be actual metal');rejectInfill(document,key,aperture);assert.throws(()=>solid(ts.map(([a,b,c])=>[a,c,b])),{code:'ERR_ASSERTION'});
});

test('Personal paper pair is actually inserted in the shell mouth with a static contacting illustrative chart',async()=>{
  const {root,named}=await personal(),body=named('P-Body'),shell=faces(body),b=bounds(shell),papers=['P-Paper-Front','P-Paper-Back'].map(named),centers=[];
  for(const paper of papers) {
    const ts=faces(paper,body),pb=bounds(ts);assert.ok(Math.min(...pb.span.toArray())>1e-4,'paper needs real skin thickness');
    assert.ok(pb.min.y<b.max.y-b.span.y*0.05&&pb.max.y>b.max.y+b.span.y*0.02&&pb.min.y>b.min.y,'paper must extend both into and above the mouth');
    const h=hits(shell,new Vector3(pb.center.x,b.min.y+b.span.y*0.65,b.min.z-b.span.z),new Vector3(0,0,1));assert.equal(h.length,4);assert.ok(pb.center.z>h[1].z&&pb.center.z<h[2].z,'paper must be between the real inner skins');centers.push(pb.center);
  }
  assert.ok(centers[0].z>centers[1].z&&centers[0].distanceTo(centers[1])>0.005,'front and rear papers must be distinct layers');
  const chart=named('P-Chart'),cb=bounds(faces(chart,body));assert.ok(faces(chart).length>=6&&cb.span.length()>bounds(faces(papers[0],body)).span.length()*0.08,'illustrative chart must have actual readable geometry');contact(chart,papers[0],body);
  assert.equal(root.listAnimations().length,0,'illustrative chart must not be a live financial-data animation');assert.ok(!/"(?:balance|apr|income|expense|account|currency)"\s*:/i.test(JSON.stringify(chart.getExtras())),'chart must not embed financial records');
});

test('Personal preserves finite outward normalized geometry, both triangle budgets, 16-bit precision and live locked 10MiB publication',async()=>{
  const horizontal=boxFaces([4,0.2,0.4]),vertical=boxFaces([0.4,4,0.2]);contactFaces(horizontal,vertical);contactFaces(vertical,horizontal);
  const tri=points=>[points.map(p=>new Vector3(...p))],a=tri([[0,0,0],[2,0,0],[0,2,0]]),c=tri([[2,2,0],[2,0.6,0],[0.6,2,0]]);
  const inner=bufferFaces(new CylinderGeometry(0.6,0.6,2,24,1,true)),outer=bufferFaces(new CylinderGeometry(1,1,2,24,1,true));
  for(const [left,right]of [[a,c],[c,a],[inner,outer],[outer,inner],[horizontal,boxFaces([0.4,4,0.2],new Vector3(0,0,5))]])assert.throws(()=>contactFaces(left,right),{code:'ERR_ASSERTION'},'AABB overlap, nested open skins and unbounded rays are not contact');
  await lockedPublication(`await saveRefinedHero({},undefined,async()=>{
    const liveCollection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
    if(liveCollection>10*1024*1024)throw new Error('cap');await writeFile(target,output);await rename(target,target);
  });`);
  const {root,record,bytes}=await personal(),actual=bounds(root.listScenes().flatMap(s=>s.listChildren().flatMap(n=>faces(n,null)))),b={min:actual.min.toArray(),max:actual.max.toArray()};assert.ok(bytes.length<=0.5*1024*1024,'Personal GLB must recover headroom within 0.5MiB');
  assert.ok([...b.min,...b.max].every(Number.isFinite));assert.ok(Math.abs(Math.max(...b.max.map((v,i)=>v-b.min[i]))-3.2)<0.003&&Math.abs(b.min[1])<0.003,'stage must be grounded and 3.2 max dimension');
  let unique=0,instantiated=0;const count=m=>m.listPrimitives().reduce((sum,p)=>sum+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0);
  for(const mesh of root.listMeshes()) {
    unique+=count(mesh);for(const p of mesh.listPrimitives()) {
      for(const semantic of p.listSemantics())assert.ok(Array.from(p.getAttribute(semantic).getArray()).every(Number.isFinite),semantic+' is non-finite');
      const pos=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),ix=p.getIndices(),n=ix?.getCount()??pos.getCount();assert.ok(normal,'surface normals missing');
      if(p.getMaterial()?.getBaseColorTexture())assert.equal(p.getAttribute('TEXCOORD_0')?.getCount(),pos.getCount(),'textured skin must expose actual UVs');
      for(let i=0;i<n;i+=3){const ids=[0,1,2].map(j=>ix?ix.getScalar(i+j):i+j),v=ids.map(j=>new Vector3().fromArray(pos.getElement(j,[]))),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));if(cross.lengthSq()<1e-18)continue;const average=ids.reduce((s,j)=>s.add(new Vector3().fromArray(normal.getElement(j,[]))),new Vector3());assert.ok(cross.dot(average)>=-cross.length()*0.001,'face winding disagrees with normals');}
    }
  }
  function walk(n){if(n.getMesh()){const attributes=n.getExtension('EXT_mesh_gpu_instancing')?.listAttributes();instantiated+=count(n.getMesh())*(attributes?.[0]?.getCount()??1);}n.listChildren().forEach(walk);}root.listScenes().forEach(s=>s.listChildren().forEach(walk));
  assert.equal(unique,record?.triangles);assert.ok(unique>1000&&unique<=65000&&instantiated<=65000,'both UNIQUE and instantiated triangle counts must stay <=65000');
  async function size(path){let n=0;for(const e of await readdir(path,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),path);n+=e.isDirectory()?await size(p):(await stat(p)).size;}return n;}
  assert.ok(await size(url('../../web/public/'))<=10*1024*1024,'actual unchanged public cap is 10MiB');
  const source=await readFile(url('./build-refined-personal.mjs'),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});await lockedPublication(source);let options;
  simple(parse(source,{ecmaVersion:'latest',sourceType:'module'}),{CallExpression(n){if(n.callee.name==='meshopt')options=n.arguments[0];}});
  for(const name of ['quantizePosition','quantizeTexcoord'])assert.equal(options?.properties.find(p=>p.key.name===name)?.value.value,16,'retain 16-bit '+name);
});

test('Personal geometry verification expands actual GPU instance translation, rotation and scale',async()=>{
  const {document}=await personal(),buffer=document.getRoot().listBuffers()[0],g=new BoxGeometry(0.02,0.10,0.04);
  const pos=document.createAccessor().setType('VEC3').setArray(g.attributes.position.array).setBuffer(buffer),ix=document.createAccessor().setType('SCALAR').setArray(g.index.array).setBuffer(buffer);
  const batch=document.createExtension(EXTMeshGPUInstancing).createInstancedMesh();
  const accessor=(type,array)=>document.createAccessor().setType(type).setArray(new Float32Array(array)).setBuffer(buffer);
  batch.setAttribute('TRANSLATION',accessor('VEC3',[0,0,0,1,0,0,2,0,0]));batch.setAttribute('SCALE',accessor('VEC3',[1,1,1,1,2,1,3,1,1]));
  batch.setAttribute('ROTATION',accessor('VEC4',[0,0,0,1,0,0,0,1,0,0,Math.SQRT1_2,Math.SQRT1_2]));
  const node=document.createNode('Instance verification fixture').setMesh(document.createMesh().addPrimitive(document.createPrimitive().setAttribute('POSITION',pos).setIndices(ix))).setExtension('EXT_mesh_gpu_instancing',batch);
  const ts=faces(node),b=bounds(ts);assert.equal(ts.length,36,'every rendered instance must contribute its actual triangles');
  assert.ok(Math.abs(b.min.x+0.01)<1e-6&&Math.abs(b.max.x-2.05)<1e-6&&Math.abs(b.max.y-0.10)<1e-6,'bounds must apply T/R/S, not count copies at the origin');
});

test('Personal ribbon verification accepts nonplanar flat straps and rejects round cords',()=>{
  const left=new BoxGeometry(0.14,1,0.022);left.rotateY(0.4);
  const right=new BoxGeometry(0.14,1,0.022);right.rotateY(-0.3);
  verifyRibbon([...bufferFaces(left,new Vector3(-1,0.5,0.2)),...bufferFaces(right,new Vector3(1,0.5,-0.2))]);
  const cord=bufferFaces(new CylinderGeometry(0.035,0.035,1,16,1));
  assert.throws(()=>verifyRibbon([...cord.map(t=>t.map(p=>p.clone().add(new Vector3(-1,0.5,0.2)))),...cord.map(t=>t.map(p=>p.clone().add(new Vector3(1,0.5,-0.2))))]),{code:'ERR_ASSERTION'});
});

test('Personal textured surfaces retain bounded nondegenerate UVs after compression',async()=>{
  const {root}=await personal();
  for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()) {
    if(!p.getMaterial()?.getBaseColorTexture())continue;
    const name=root.listNodes().find(n=>n.getMesh()===mesh)?.getName(),uv=p.getAttribute('TEXCOORD_0'),pos=p.getAttribute('POSITION'),ix=p.getIndices();
    boundedUvs(uv,name);
    for(let i=0;i<ix.getCount();i+=3){const ids=[0,1,2].map(j=>ix.getScalar(i+j)),v=ids.map(j=>new Vector3().fromArray(pos.getElement(j,[])));if(new Triangle(...v).getArea()<1e-10)continue;const u=ids.map(j=>uv.getElement(j,[])),area=Math.abs((u[1][0]-u[0][0])*(u[2][1]-u[0][1])-(u[1][1]-u[0][1])*(u[2][0]-u[0][0]));assert.ok(area>1e-12,name+' must not collapse a real textured triangle to a UV line');}
  }
});

test('Personal UV verifier reads normalized accessor values and still rejects true out-of-range coordinates',async()=>{
  const {document}=await personal(),buffer=document.getRoot().listBuffers()[0];
  const normalized=document.createAccessor().setType('VEC2').setArray(new Uint16Array([0,0,65535,65535])).setNormalized(true).setBuffer(buffer);
  assert.deepEqual(normalized.getElement(1,[]),[1,1]);boundedUvs(normalized,'valid normalized fixture');
  const invalid=document.createAccessor().setType('VEC2').setArray(new Float32Array([0,0,1.01,1])).setBuffer(buffer);
  assert.throws(()=>boundedUvs(invalid,'true invalid fixture'),{code:'ERR_ASSERTION'});
});
