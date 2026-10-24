import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Vector3, Ray, Triangle, BoxGeometry, CylinderGeometry } from '../../web/node_modules/three/build/three.module.js';
import sharp from 'sharp';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';

const hash=b=>createHash('sha256').update(b).digest('hex');
const url=path=>new URL(path,import.meta.url);
async function medical() {
  const records=JSON.parse(await readFile(url('../hero-imported.json'),'utf8'));
  const inventory=JSON.parse(await readFile(url('../hero-models.json'),'utf8'));
  const bytes=await readFile(url('../../web/public/heroes/medical.glb'));
  await MeshoptDecoder.ready;
  const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(bytes);
  const root=document.getRoot(),named=name=>{const n=root.listNodes().find(n=>n.getName()===name);assert.ok(n,name+' missing');return n;};
  return {record:records.find(r=>r.id==='medical'),inventory:inventory.find(r=>r.id==='medical'),bytes,document,root,named};
}
function faces(node,frame=node) {
  const result=[],inverse=frame?new Matrix4().fromArray(frame.getWorldMatrix()).invert():new Matrix4();
  function walk(n) {
    const matrix=inverse.clone().multiply(new Matrix4().fromArray(n.getWorldMatrix()));
    for(const p of n.getMesh()?.listPrimitives()??[]) {
      const pos=p.getAttribute('POSITION'),ix=p.getIndices(),count=ix?.getCount()??pos.getCount();
      assert.equal(p.getMode(),4,'surface must use actual triangles');
      for(let i=0;i<count;i+=3)result.push([0,1,2].map(j=>new Vector3().fromArray(pos.getElement(ix?ix.getScalar(i+j):i+j,[])).applyMatrix4(matrix)));
    }
    n.listChildren().forEach(walk);
  }
  walk(node);assert.ok(result.length,node.getName()+' has no actual triangles');return result;
}
function bounds(ts) {
  const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
  for(const t of ts)for(const p of t){min.min(p);max.max(p);}
  return {min,max,center:min.clone().add(max).multiplyScalar(0.5),span:max.clone().sub(min)};
}
function hits(ts,origin,direction,front=false) {
  const ray=new Ray(origin,direction.clone().normalize()),p=new Vector3(),result=[];
  for(const t of ts)if(ray.intersectTriangle(...t,front,p)&&!result.some(q=>q.distanceTo(p)<1e-5))result.push(p.clone());
  return result.sort((a,b)=>a.distanceTo(origin)-b.distanceTo(origin));
}
function contactFaces(left,right,label='surfaces') {
  const lb=bounds(left),rb=bounds(right),tolerance=Math.min(lb.span.length(),rb.span.length())*0.006,p=new Vector3(),onRay=new Vector3(),onSegment=new Vector3();
  for(const [source,target,box]of [[left,right,rb],[right,left,lb]])for(const point of source.flat()) {
    if(['x','y','z'].some(k=>point[k]<box.min[k]-tolerance||point[k]>box.max[k]+tolerance))continue;
    if(target.some(t=>new Triangle(...t).closestPointToPoint(point,p).distanceTo(point)<=tolerance))return;
  }
  // Bounded edges catch crossing faces whose vertices all overhang the other surface.
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
const contact=(a,b,frame)=>contactFaces(faces(a,frame),faces(b,frame),a.getName()+' / '+b.getName());
function bufferFaces(g,center=new Vector3()) {
  const pos=g.attributes.position,ix=g.index;
  return Array.from({length:ix.count/3},(_,i)=>[0,1,2].map(j=>new Vector3().fromBufferAttribute(pos,ix.getX(i*3+j)).add(center)));
}
const boxFaces=(size,center=new Vector3())=>bufferFaces(new BoxGeometry(...size),center);
function firstCrossing(left,right) {
  const box=ts=>bounds(ts),global=box(right),targets=right.map(t=>({t,b:box([t])}));
  const overlap=(a,b)=>['x','y','z'].every(k=>a.min[k]<=b.max[k]+1e-8&&b.min[k]<=a.max[k]+1e-8);
  for(const a of left) {
    const ab=box([a]);if(!overlap(ab,global))continue;
    for(const {t:b,b:bb}of targets) {
      if(!overlap(ab,bb))continue;
      for(const [from,to]of [[a,b],[b,a]])for(let i=0;i<3;i++) {
        const d=from[(i+1)%3].clone().sub(from[i]),length=d.length(),p=new Vector3();if(length<1e-8)continue;
        if(new Ray(from[i],d.divideScalar(length)).intersectTriangle(...to,false,p)) {
          const distance=p.distanceTo(from[i]),bary=new Triangle(...to).getBarycoord(p,new Vector3());
          if(distance>1e-6&&distance<length-1e-6&&Math.min(...bary.toArray())>1e-5)return p;
        }
      }
    }
  }
  return null;
}
function infill(document,parent,size,center) {
  const g=new BoxGeometry(...size),buffer=document.getRoot().listBuffers()[0];
  const pos=document.createAccessor().setType('VEC3').setArray(g.attributes.position.array).setBuffer(buffer),ix=document.createAccessor().setType('SCALAR').setArray(g.index.array).setBuffer(buffer);
  const n=document.createNode('Deliberate-solid-infill').setTranslation(center.toArray()).setMesh(document.createMesh().addPrimitive(document.createPrimitive().setAttribute('POSITION',pos).setIndices(ix)));
  parent.addChild(n);return n;
}

test('Medical replaces the study with protected original geometry and verifiable source provenance',async()=>{
  const {record,inventory,bytes}=await medical();
  assert.equal(record?.quality,'refined-textured','Medical must replace the untextured study with a protected refinement');
  assert.deepEqual(record,inventory,'both manifests must protect the same shipping artifact');
  assert.equal(record.sourceFile,'apps/media/scripts/build-refined-medical.mjs');
  assert.equal(record.sha256,hash(bytes));assert.equal(record.bytes,bytes.length);
  assert.equal(record.sourceSha256,hash((await readFile(url('./build-refined-medical.mjs'),'utf8')).replace(/\r\n/g,'\n')));
  const sources=JSON.parse(await readFile(url('../sources/medical/materials.json'),'utf8'));
  assert.equal(record.materialSourceSha256,hash(JSON.stringify(sources)));
});

test('Medical embeds nine varied 256px WebP PBR maps with non-emissive enamel, steel and rubber',async()=>{
  const {bytes,root}=await medical(),textures=root.listTextures();
  assert.equal(textures.length,9,'Enamel, Steel and Rubber each need Color, Normal and Roughness maps');
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
  assert.ok(json.images.length===9&&json.images.every(i=>i.bufferView!==undefined&&!i.uri));
  assert.ok(json.buffers.every(b=>!b.uri));
  for(const set of ['Enamel','Steel','Rubber'])for(const suffix of ['Color','Normal','Roughness']) {
    const matches=textures.filter(t=>t.getName()==='M-'+set+'-'+suffix);assert.equal(matches.length,1,set+'-'+suffix);
    const texture=matches[0];assert.equal(texture.getMimeType(),'image/webp');
    const {data,info}=await sharp(texture.getImage()).raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,256);assert.equal(info.height,256);
    const channels=suffix==='Normal'?[0,1]:[suffix==='Roughness'?1:0];
    assert.ok(channels.some(channel=>{const values=new Set();for(let i=channel;i<data.length;i+=info.channels)values.add(data[i]);return values.size>2;}),texture.getName()+' must contain spatial detail');
    if(suffix==='Color')for(let i=0;i<data.length;i+=info.channels)assert.ok(!(data[i]>data[i+1]*1.35&&data[i]>data[i+2]*1.35&&data[i]>80),'no red pigment in Medical color maps');
  }
  for(const [name,set,metallic]of [['M-Enamel-Pearl','Enamel',false],['M-Steel-Polished','Steel',true],['M-Steel-Diaphragm','Steel',true],['M-Rubber-Black','Rubber',false],['M-Badge-Green',null,false]]) {
    const m=root.listMaterials().find(m=>m.getName()===name);assert.ok(m,name+' missing');
    assert.ok(metallic?m.getMetallicFactor()>0.7:m.getMetallicFactor()===0,name+' has incorrect surface response');
    if(set)for(const [t,suffix]of [[m.getBaseColorTexture(),'Color'],[m.getNormalTexture(),'Normal'],[m.getMetallicRoughnessTexture(),'Roughness']])assert.equal(t?.getName(),'M-'+set+'-'+suffix);
  }
  for(const m of root.listMaterials()) {
    assert.ok(m.getRoughnessFactor()>=0&&m.getRoughnessFactor()<=1,'glTF roughness factor must stay within zero and one');
    assert.ok(m.getEmissiveFactor().every(v=>v===0)&&!m.getEmissiveTexture(),'surface highlights must not use emission');
    const [r,g,b]=m.getBaseColorFactor();assert.ok(!(r>g*1.35&&r>b*1.35&&r>0.1),'no red pigment material');
  }
});

test('Medical case has a real enclosed cavity, separate lid and gasket, rejecting solid infill',async()=>{
  const {document,named}=await medical(),body=named('M-Case-Body'),b=bounds(faces(body));
  for(const suffix of ['Frame','Front','Back'])assert.ok(body.listChildren().includes(named('M-Body-'+suffix)));
  const verify=()=>{
    const ts=faces(body);
    for(const x of [0.35,0.5,0.65])for(const y of [0.35,0.5,0.65]) {
      const p=new Vector3(b.min.x+x*b.span.x,b.min.y+y*b.span.y,b.min.z-b.span.z),h=hits(ts,p,new Vector3(0,0,1));
      assert.equal(h.length,4,'case must enclose air between actual inner and outer front/back walls');
      assert.ok(h[2].z-h[1].z>b.span.z*0.35,'case cavity must have meaningful depth');
      assert.ok(hits(ts,p,new Vector3(0,0,1),true)[0]?.distanceTo(h[0])<1e-5,'case exterior must face outward');
    }
    for(const axis of ['x','y']) {
      const p=b.center.clone(),d=new Vector3();p[axis]=b.min[axis]-b.span[axis];d[axis]=1;
      assert.equal(hits(ts,p,d).length,4,'case frame must enclose the cavity on '+axis);
    }
  };
  verify();
  const lid=named('M-Case-Lid'),gasket=named('M-Gasket');contact(gasket,body,body);contact(gasket,lid,body);
  assert.ok(bounds(faces(lid,body)).center.y>b.center.y,'lid belongs above the main case');
  const fill=infill(document,body,b.span.clone().multiplyScalar(0.6).toArray(),b.center);
  try {assert.throws(verify,{code:'ERR_ASSERTION'},'hidden solid infill must invalidate the cavity');}finally{body.removeChild(fill);}
});

test('Medical handle is an arched tube with an actual open aperture and attached grip and bases',async()=>{
  const {document,named}=await medical(),handle=named('M-Handle'),tube=named('M-Handle-Tube'),b=bounds(faces(tube,handle));
  assert.ok(handle.listChildren().includes(tube)&&b.span.y>b.span.z*2,'handle needs a rising arch');
  const verify=()=>{
    const ts=faces(handle),occupied=Array.from({length:13},(_,i)=>Array.from({length:13},(_,j)=>hits(ts,new Vector3(b.min.x+(i+0.5)*b.span.x/13,b.min.y+(j+0.5)*b.span.y/13,b.min.z-b.span.length()),new Vector3(0,0,1)).length>0));
    let clear=0;
    for(let i=3;i<10;i++)for(let j=3;j<10;j++)if(!occupied[i][j]&&occupied.slice(0,i).some(r=>r[j])&&occupied.slice(i+1).some(r=>r[j])&&occupied[i].slice(j+1).some(Boolean))clear++;
    assert.ok(clear>=3,'arch must leave a measurable unfilled opening between its legs and below its crown');
  };
  verify();assert.ok(handle.listChildren().includes(named('M-Handle-Grip')));contact(named('M-Handle-Grip'),tube,handle);
  for(const side of ['Left','Right']){const base=named('M-Handle-Base-'+side);assert.ok(handle.listChildren().includes(base));contact(base,tube,handle);contact(base,named('M-Case-Lid'),handle);}
  const fill=infill(document,handle,[b.span.x*0.98,b.span.y*0.98,b.span.z],b.center);
  try {assert.throws(verify,{code:'ERR_ASSERTION'},'solid handle infill must invalidate the opening');}finally{handle.removeChild(fill);}
});

test('Medical feet, latches and rear hinges are rigid attached geometry rather than floating details',async()=>{
  const {named,root}=await medical(),body=named('M-Case-Body'),lid=named('M-Case-Lid'),b=bounds(faces(body));
  const feet=root.listNodes().filter(n=>/^M-Foot-\d+$/.test(n.getName()));assert.equal(feet.length,4);
  const centres=[];
  for(let i=0;i<4;i++) {
    const foot=named('M-Foot-'+i),fb=bounds(faces(foot,body));contact(foot,body,body);centres.push(fb.center);
    assert.ok(fb.span.y>0&&fb.max.y<=b.min.y+b.span.y*0.15,'feet must support the case from below');
    assert.ok(Math.abs(bounds(faces(foot,null)).min.y)<0.003,'each foot must reach the normalized ground');
  }
  assert.ok(centres.some(p=>p.x<b.center.x)&&centres.some(p=>p.x>b.center.x)&&centres.some(p=>p.z<b.center.z)&&centres.some(p=>p.z>b.center.z),'four feet must straddle the case in XZ');
  for(const side of ['Left','Right'])for(const kind of ['Latch','Hinge']) {
    const n=named('M-'+kind+'-'+side),nb=bounds(faces(n,body));contact(n,body,body);contact(n,lid,body);
    assert.ok(kind==='Latch'?nb.center.z>b.center.z:nb.center.z<b.center.z,kind+' must attach to the correct side of the case');
  }
});

test('Medical corner guards wrap the case curvature with actual open quarter-shell geometry',async()=>{
  const {root,named}=await medical(),wraps=root.listNodes().filter(n=>n.getName().startsWith('M-Corner-Wrap-'));
  assert.equal(wraps.length,8,'each front/rear case corner needs a fitted curved wrap');
  for(const wrap of wraps) {
    const parent=root.listNodes().find(n=>n.listChildren().includes(wrap));assert.ok(parent);
    const ts=faces(wrap,parent),radii=ts.flat().map(p=>Math.hypot(p.x,p.y)),max=Math.max(...radii),min=Math.min(...radii);
    assert.ok(min>max*0.6,'wrap must follow an annular corner, not fill it with a block');
    const angles=new Set(ts.flat().map(p=>Math.round(Math.atan2(Math.abs(p.y),Math.abs(p.x))*180/Math.PI)));
    assert.ok(angles.size>12,'quarter shell needs actual curved surface samples');
    const bodyBounds=bounds(faces(named('M-Case-Body'),null));
    contact(wrap,named(bounds(faces(wrap,null)).center.y>bodyBounds.max.y?'M-Case-Lid':'M-Case-Body'),parent);
  }
});

test('Medical badge is an original volumetric emerald shield with a contacting steel rim, not a cross',async()=>{
  const {root,named}=await medical(),badge=named('M-Badge'),green=root.listMaterials().find(m=>m.getName()==='M-Badge-Green');
  assert.ok(green,'emerald shield material missing');const [r,g,b]=green.getBaseColorFactor();assert.ok(g>r*1.3&&g>b*1.05,'badge must be emerald green');
  const nodes=[];function walk(n){if(n.getMesh())nodes.push(n);n.listChildren().forEach(walk);}walk(badge);
  const plate=nodes.find(n=>n.getMesh().listPrimitives().some(p=>p.getMaterial()===green)),rim=nodes.find(n=>n!==plate&&n.getMesh().listPrimitives().some(p=>p.getMaterial()?.getName()==='M-Steel-Polished'));
  assert.ok(plate&&rim,'shield requires actual green plate and separate metal rim');contact(plate,rim,badge);contact(badge,named('M-Body-Front'),badge);
  const ts=faces(plate,badge),pb=bounds(ts);assert.ok(pb.span.z>pb.span.x*0.015,'badge needs real thickness');
  const width=f=>{let count=0;for(let i=0;i<41;i++)if(hits(ts,new Vector3(pb.min.x+i*pb.span.x/40,pb.min.y+f*pb.span.y,pb.min.z-pb.span.z),new Vector3(0,0,1)).length)count++;return count;};
  assert.ok(width(0.2)<width(0.65)*0.85&&width(0.65)>25&&width(0.8)>25,'shield must taper toward its lower point with broad upper shoulders, not cross arms');
});

test('Medical stethoscope has a connected Y, paired rubber branches, silver earbows and tips, rejecting detachment',async()=>{
  const {named}=await medical(),frame=named('M-Stethoscope'),junction=named('M-Y-Junction'),main=named('M-Main-Tube');
  const members=new Set();function walk(n){members.add(n);n.listChildren().forEach(walk);}walk(frame);
  for(const name of ['M-Y-Junction','M-Main-Tube','M-Chestpiece-Body','M-Chestpiece-Rim','M-Chestpiece-Diaphragm','M-Chestpiece-Connector',...['Left','Right'].flatMap(s=>['M-Y-'+s+'-Branch','M-Ear-'+s+'-Tube','M-Ear-'+s+'-Tip'])])assert.ok(members.has(named(name)),name+' must belong to the stethoscope assembly');
  const verify=()=>{
    contact(main,junction,frame);contact(main,named('M-Chestpiece-Connector'),frame);
    for(const side of ['Left','Right']) {
      const branch=named('M-Y-'+side+'-Branch'),ear=named('M-Ear-'+side+'-Tube'),tip=named('M-Ear-'+side+'-Tip');
      contact(junction,branch,frame);contact(branch,ear,frame);contact(ear,tip,frame);
      for(const [n,material]of [[branch,'M-Rubber-Black'],[ear,'M-Steel-Polished'],[tip,'M-Rubber-Black']])assert.ok(n.getMesh()?.listPrimitives().every(p=>p.getMaterial()?.getName()===material),n.getName()+' has incorrect material');
      assert.ok(bounds(faces(tip,frame)).center.y>bounds(faces(junction,frame)).center.y,'ear tips must rise above the Y');
      const eb=bounds(faces(ear,frame));assert.ok(eb.span.y>eb.span.z*2&&eb.span.x>eb.span.z*1.5,'silver earbow must curve in XY rather than form a straight post');
    }
  };
  verify();assert.ok(bounds(faces(named('M-Ear-Left-Tube'),frame)).center.x<bounds(faces(named('M-Ear-Right-Tube'),frame)).center.x,'earbows must form a paired left/right assembly');
  const p=[...main.getTranslation()],span=bounds(faces(frame)).span.length();
  for(const axis of [0,2])try {const moved=[...p];moved[axis]+=span*2;main.setTranslation(moved);assert.throws(verify,{code:'ERR_ASSERTION'},'contact must reject actual tube detachment');}finally{main.setTranslation(p);}
});

test('Medical foreground tubing loops visibly and its chestpiece has a shaped body, annular rim and diaphragm',async()=>{
  const {named}=await medical(),frame=named('M-Stethoscope'),main=faces(named('M-Main-Tube'),frame),mb=bounds(main),cb=bounds(faces(named('M-Case-Body'),frame));
  assert.ok(mb.max.z>cb.max.z&&mb.span.x>cb.span.x*0.35&&mb.span.y>cb.span.y*0.25,'main tubing must loop in the foreground');
  let loop=false;for(const y of [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9]) {
    const occupied=Array.from({length:41},(_,i)=>hits(main,new Vector3(mb.min.x+(i+0.5)*mb.span.x/41,mb.min.y+y*mb.span.y,mb.min.z-mb.span.length()),new Vector3(0,0,1)).length>0);
    if(occupied.filter((solid,i)=>!solid&&occupied.slice(0,i).some(Boolean)&&occupied.slice(i+1).some(Boolean)).length>=4)loop=true;
  }
  assert.ok(loop,'tube must form separated loop legs with air between actual surfaces');
  const body=named('M-Chestpiece-Body'),rim=named('M-Chestpiece-Rim'),diaphragm=named('M-Chestpiece-Diaphragm');
  contact(body,named('M-Chestpiece-Connector'),frame);contact(body,rim,frame);contact(body,diaphragm,frame);contact(rim,diaphragm,frame);
  for(const node of [body,diaphragm]){const b=bounds(faces(node)),s=b.span.toArray().sort((a,b)=>a-b);assert.ok(s[0]>s[2]*0.015&&s[0]<s[2]*0.65,node.getName()+' needs a real shaped thickness, not a plane');}
  const ts=faces(rim),b=bounds(ts),axes=['x','y','z'].sort((a,c)=>b.span[a]-b.span[c]),[depth,u]=axes,d=new Vector3();d[depth]=1;
  const p=b.center.clone();p[depth]=b.min[depth]-b.span.length();assert.equal(hits(ts,p,d).length,0,'rim must be an actual open annulus, not another flat disk');
  for(const side of [-1,1]){const q=p.clone();q[u]+=side*b.span[u]*0.45;assert.ok(hits(ts,q,d).length>=2,'annular rim needs actual surrounding volume');}
});

test('Medical decoded surfaces are finite, outward, grounded, normalized and within shipping budgets; contact rejects false positives',async()=>{
  const a=boxFaces([4,0.2,0.4]),c=boxFaces([0.4,4,0.2]);contactFaces(a,c);contactFaces(c,a);
  const tri=points=>[points.map(p=>new Vector3(...p))],left=tri([[0,0,0],[2,0,0],[0,2,0]]),right=tri([[2,2,0],[2,0.6,0],[0.6,2,0]]);
  for(const [x,y]of [[left,right],[right,left],[a,boxFaces([0.4,4,0.2],new Vector3(0,0,5))]])assert.throws(()=>contactFaces(x,y),{code:'ERR_ASSERTION'},'overlapping AABBs or infinite-ray crossings must not imply surface contact');
  const {root,record,inventory,bytes}=await medical(),b=getBounds(root.listScenes()[0]);
  assert.ok(bytes.length<=0.5*1024*1024,'Medical must recover headroom within 0.5MiB');
  assert.ok([...b.min,...b.max].every(Number.isFinite));assert.ok(Math.abs(Math.max(...b.max.map((v,i)=>v-b.min[i]))-3.2)<0.003&&Math.abs(b.min[1])<0.003,'stage must be 3.2 maximum dimension and rest at Y=0');
  let count=0;
  for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()) {
    for(const semantic of p.listSemantics())assert.ok(Array.from(p.getAttribute(semantic).getArray()).every(Number.isFinite),semantic+' is non-finite');
    const pos=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),ix=p.getIndices(),n=ix?.getCount()??pos.getCount();assert.ok(normal,'surface normals missing');count+=n/3;
    if(p.getMaterial()?.getBaseColorTexture())assert.equal(p.getAttribute('TEXCOORD_0')?.getCount(),pos.getCount(),'textured geometry must actually expose UV coordinates');
    for(let i=0;i<n;i+=3) {
      const ids=[0,1,2].map(j=>ix?ix.getScalar(i+j):i+j),v=ids.map(j=>new Vector3().fromArray(pos.getElement(j,[]))),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
      if(cross.lengthSq()<1e-18)continue;
      const average=ids.reduce((sum,j)=>sum.add(new Vector3().fromArray(normal.getElement(j,[]))),new Vector3());assert.ok(cross.dot(average)>=-cross.length()*0.001,'inverted face winding versus outward normals');
    }
  }
  assert.equal(count,(record??inventory).triangles);assert.ok(count>1000&&count<=65000,'unique mesh triangle budget exceeded');
});

test('Medical contact verification rejects concentric open tube skins without touching surfaces',()=>{
  const inner=bufferFaces(new CylinderGeometry(0.6,0.6,2,32,1,true)),outer=bufferFaces(new CylinderGeometry(1,1,2,32,1,true));
  assert.throws(()=>contactFaces(inner,outer),{code:'ERR_ASSERTION'});
  assert.throws(()=>contactFaces(outer,inner),{code:'ERR_ASSERTION'});
});

test('Medical tubing stays outside the chestpiece body, rim and diaphragm except its separate connector',async()=>{
  const crossing=[[[0,0,0],[2,0,0],[0,2,0]],[[0.3,0.3,-1],[0.3,0.3,1],[0.8,0.3,0]]].map(t=>t.map(p=>new Vector3(...p)));
  assert.ok(firstCrossing([crossing[0]],[crossing[1]]));
  assert.equal(firstCrossing([crossing[0]],[crossing[1].map(p=>p.clone().add(new Vector3(4,0,0)))]),null);
  const {named}=await medical(),frame=named('M-Stethoscope'),main=faces(named('M-Main-Tube'),frame);
  for(const suffix of ['Body','Rim','Diaphragm']) {
    const target=faces(named('M-Chestpiece-'+suffix),frame),b=bounds(target);
    assert.equal(firstCrossing(main,target),null,'tube penetrates chestpiece '+suffix);
    for(const p of main.flat())if(['x','y','z'].every(k=>p[k]>b.min[k]+1e-6&&p[k]<b.max[k]-1e-6))
      assert.equal(hits(target,p,new Vector3(1,0.027,0.013)).length%2,0,'tube vertex is inside closed chestpiece '+suffix);
  }
});

test('Medical badge rim is closed and outward with visible aperture-facing inner walls',async()=>{
  const {named}=await medical(),ts=faces(named('M-Badge-Rim'),named('M-Badge'));
  const verify=triangles=>{
    const edges=new Map(),key=p=>p.toArray().map(v=>Math.round(v*1e5)).join(',');let volume=0;
    for(const [a,b,c]of triangles) {
      const ids=[a,b,c].map(key);if(new Set(ids).size<3)continue;volume+=a.dot(b.clone().cross(c))/6;
      for(let i=0;i<3;i++){const x=ids[i],y=ids[(i+1)%3],id=[x,y].sort().join('|'),e=edges.get(id)??[0,0];e[0]++;e[1]+=x<y?1:-1;edges.set(id,e);}
    }
    assert.ok([...edges.values()].every(([count,winding])=>count===2&&winding===0),'rim has open or inconsistently oriented edges');
    assert.ok(volume>1e-8,'rim volume must face outward independently of encoded normals');
    const b=bounds(triangles);
    for(const fraction of [0.25,0.5,0.75])for(const sign of [-1,1]) {
      const p=b.center.clone();p.y=b.min.y+b.span.y*fraction;const d=new Vector3(sign,0,0),both=hits(triangles,p,d),front=hits(triangles,p,d,true);
      assert.ok(both.length>=2&&front.length&&front[0].distanceTo(both[0])<1e-5,'aperture-facing inner wall must survive back-face culling');
    }
  };
  verify(ts);assert.throws(()=>verify(ts.map(([a,b,c])=>[a,c,b])),{code:'ERR_ASSERTION'});
});

test('Medical rechecks the unchanged live 10MiB public cap inside locked publication before any write',async()=>{
  async function size(path){let n=0;for(const e of await readdir(path,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),path);n+=e.isDirectory()?await size(p):(await stat(p)).size;}return n;}
  assert.ok(await size(url('../../web/public/'))<=10*1024*1024,'actual aggregate public cap remains 10MiB');
  const verifySource=async(source,mutate=false)=>{
  let callback;simple(parse(source,{ecmaVersion:'latest',sourceType:'module'}),{CallExpression(n){if(n.callee.name==='saveRefinedHero')callback=n.arguments[2];}});
  assert.ok(callback?.body?.type==='BlockStatement','publication requires saveRefinedHero third-argument locked callback');
  const replacements=[];let guard,live;
  simple(callback,{MemberExpression(n){if(n.object.type==='MetaProperty'&&n.property.name==='url')replacements.push({...n,text:JSON.stringify(url('./build-refined-medical.mjs').href)});},IfStatement(n){if(n.test.left?.name==='liveCollection')guard=n;},VariableDeclarator(n){if(n.id.name==='liveCollection')live=n;}});
  assert.ok(guard&&live,'locked callback must guard the freshly computed liveCollection');
  const fragment=(edits=[])=>{
    let body=source.slice(callback.start,callback.end);
    for(const n of [...replacements,...edits].filter(n=>!edits.some(e=>e!==n&&e.start<=n.start&&e.end>=n.end)).sort((a,b)=>b.start-a.start))body=body.slice(0,n.start-callback.start)+n.text+body.slice(n.end-callback.start);
    return body;
  };
  const run=async(live,text)=>{
    const events=[],output=Buffer.alloc(96),target=url('../../web/public/heroes/medical.glb');
    const publish=new Function('sizeOf','stat','writeFile','rename','URL','target','output','collection','return ('+text+');')(
      async path=>{assert.equal(path.href,url('../../web/public/').href);events.push('size');return live;},async()=>({size:64}),async()=>events.push('write'),async()=>events.push('rename'),URL,target,output,0);
    try {await publish();return {events};}catch(error){return {events,error};}
  };
  const verify=async text=>{
    const rejected=await run(10*1024*1024-31,text);assert.ok(rejected.error instanceof Error,'fresh over-budget public total must reject');assert.deepEqual(rejected.events,['size'],'budget rejection must happen before write or rename');
    const boundary=await run(10*1024*1024-32,text);assert.ifError(boundary.error);assert.deepEqual(boundary.events,['size','write','rename'],'exact cap must publish only after fresh measurement');
  };
  await verify(fragment());
  if(mutate) {
    await assert.rejects(()=>verify(fragment([{...guard,text:''}])),{code:'ERR_ASSERTION'},'missing budget rejection must be detected');
    await assert.rejects(()=>verify(fragment([{...live.init,text:'collection'},{start:callback.body.start+1,end:callback.body.start+1,text:'await sizeOf(new URL("../../web/public/",'+JSON.stringify(url('./build-refined-medical.mjs').href)+'));'}])),{code:'ERR_ASSERTION'},'unused fresh measurement must not hide a stale guarded total');
  }
  };
  await verifySource(`await saveRefinedHero({},undefined,async()=>{
    const liveCollection=await sizeOf(new URL('../../web/public/',import.meta.url))-(await stat(target)).size+output.length;
    if(liveCollection>10*1024*1024)throw new Error('cap');await writeFile(target,output);await rename(target,target);
  });`,true);
  const source=await readFile(url('./build-refined-medical.mjs'),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
  await verifySource(source,true);
});
