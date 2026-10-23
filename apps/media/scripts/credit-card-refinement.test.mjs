import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Vector3, Ray, CatmullRomCurve3 } from '../../web/node_modules/three/build/three.module.js';
import sharp from 'sharp';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';

const hash=b=>createHash('sha256').update(b).digest('hex');
async function card() {
  const record=JSON.parse(await readFile(new URL('../hero-imported.json',import.meta.url))).find(r=>r.id==='creditCard');
  assert.equal(record?.quality,'refined-textured','Credit Card must replace its untextured study with protected detailed geometry');
  const bytes=await readFile(new URL('../../web/public/heroes/creditCard.glb',import.meta.url));
  await MeshoptDecoder.ready;
  const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(bytes);
  const root=document.getRoot(),named=name=>{const n=root.listNodes().find(n=>n.getName()===name);assert.ok(n,name+' missing');return n;};
  function triangles(node,frame=node) {
    const matrix=new Matrix4().fromArray(frame.getWorldMatrix()).invert().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
    return node.getMesh().listPrimitives().flatMap(p=>{const pos=p.getAttribute('POSITION'),ix=p.getIndices();return Array.from({length:ix.getCount()/3},(_,i)=>[0,1,2].map(j=>new Vector3().fromArray(pos.getElement(ix.getScalar(i*3+j),[])).applyMatrix4(matrix)));});
  }
  function faces(group) {const result=[];function walk(n){if(n.getMesh())result.push(...triangles(n,group));n.listChildren().forEach(walk);}walk(group);return result;}
  function depth(group,x,y,side=1) {
    const ray=new Ray(new Vector3(x,y,side),new Vector3(0,0,-side)),point=new Vector3();let closest=null,d=Infinity;
    for(const t of faces(group))if(ray.intersectTriangle(...t,true,point)){const next=point.distanceTo(ray.origin);if(next<d){d=next;closest=point.clone();}}
    return closest?.z;
  }
  return {record,bytes,document,root,named,triangles,faces,depth};
}

test('Credit Card retains original procedural source hashes, embedded PBR and tighter delivery budgets',async()=>{
  const {record,bytes,root}=await card();
  assert.equal(hash(bytes),record.sha256);
  assert.ok(bytes.length<=0.5*1024*1024,'refinement should recover public headroom, not consume a larger allowance');
  const source=await readFile(new URL('./build-refined-credit-card.mjs',import.meta.url),'utf8');
  assert.equal(hash(source.replace(/\r\n/g,'\n')),record.sourceSha256);
  const materials=JSON.parse(await readFile(new URL('../sources/credit-card/materials.json',import.meta.url)));
  assert.equal(hash(JSON.stringify(materials)),record.materialSourceSha256);
  assert.match(materials.limitations,/not measured/);
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
  assert.ok(json.extensionsUsed.includes('KHR_materials_anisotropy'));
  assert.ok(json.images.length>=6 && json.images.every(i=>i.bufferView!==undefined&&!i.uri));
  assert.ok(json.buffers.every(b=>!b.uri));
  for(const name of ['CC-Brushed-Silver','CC-Emerald-Metal','CC-Turned-Silver']) {
    const m=root.listMaterials().find(m=>m.getName()===name);
    assert.ok(m?.getBaseColorTexture()&&m.getNormalTexture()&&m.getMetallicRoughnessTexture(),name+' surface maps missing');
    assert.ok(m.getMetallicFactor()>0.7);
    assert.ok(m.getEmissiveFactor().every(v=>v===0),'reflections must not be faked with emission');
  }
  for(const t of root.listTextures()) {
    const {data,info}=await sharp(t.getImage()).raw().toBuffer({resolveWithObject:true});
    assert.ok(info.width<=512&&info.height<=512);
    if(t.getName().includes('Normal'))assert.ok(data.some((v,i)=>i%info.channels<2&&v!==data[i%info.channels]),'normal detail must have actual spatial variation');
  }
  async function size(url){let n=0;for(const e of await readdir(url,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),url);n+=e.isDirectory()?await size(p):(await stat(p)).size;}return n;}
  assert.ok(await size(new URL('../../web/public/',import.meta.url))<=10*1024*1024);
});

test('Credit Card uses two thin closed rounded cards with detailed front and back surfaces',async()=>{
  const {named,depth,faces}=await card();
  for(const name of ['CC-Silver-Card','CC-Emerald-Card']) {
    const g=named(name),points=faces(g).flat();
    const dimensions=['x','y','z'].map(k=>Math.max(...points.map(p=>p[k]))-Math.min(...points.map(p=>p[k])));
    assert.ok(Math.abs(dimensions[0]-1.8)<0.01&&Math.abs(dimensions[1]-2.85)<0.01);
    assert.ok(dimensions[2]>0.02&&dimensions[2]<0.055,'cards must not be chunky blocks');
    assert.ok(depth(g,0,0)>0.01&&depth(g,0,0,-1)<-0.01,'both sides must be outward-facing closed geometry');
    assert.equal(depth(g,0.897,1.422),undefined,'rounded corners must remove the square corner');
    assert.ok(named(name+'-Magstripe').getMesh());
    assert.ok(named(name+'-Signature-Panel').getMesh());
  }
});

test('Credit Card sweeping motifs are true recesses, not floating decorative tubes or decals',async()=>{
  const {document,named,depth}=await card();
  const config=JSON.parse(await readFile(new URL('../sources/credit-card/materials.json',import.meta.url)));
  function verify() {
    for(const [name,curves]of [['CC-Silver-Card',config.frontGrooves],['CC-Emerald-Card',config.rearGrooves]]) {
      const g=named(name);
      for(const points of curves) {
        const curve=new CatmullRomCurve3(points.map(([x,y])=>new Vector3(x,y,0)));
        for(const t of [0.2,0.5,0.8]) {
          const p=curve.getPoint(t),n=curve.getTangent(t),floor=depth(g,p.x,p.y);
          const face=depth(g,p.x-n.y*0.035,p.y+n.x*0.035);
          assert.ok(Number.isFinite(floor)&&Number.isFinite(face)&&face-floor>0.003&&face-floor<0.015,'actual engraved depth missing');
        }
      }
    }
  }
  verify();
  const fill=document.createNode('Deliberate-hidden-groove-blocker').setMesh(named('CC-Silver-Card-Body').getMesh()).setTranslation([0,0,0.012]);
  named('CC-Silver-Card').addChild(fill);
  assert.throws(verify,{code:'ERR_ASSERTION'},'verifier must reject an actual hidden solid covering the grooves');
});

test('Credit Card keeps eight inset chip contacts connected to their recessed substrate',async()=>{
  const {named,triangles,depth}=await card(),group=named('CC-Silver-Card');
  for(let i=0;i<8;i++) {
    const points=triangles(named('CC-Chip-Contact-'+i),group).flat(),min=Math.min(...points.map(p=>p.z)),max=Math.max(...points.map(p=>p.z));
    assert.ok(min>=0.012&&min<0.015&&max>0.016&&max<0.02,'contacts must meet the substrate and stay inset');
    const x=points.reduce((s,p)=>s+p.x,0)/points.length,y=points.reduce((s,p)=>s+p.y,0)/points.length;
    assert.ok(Math.abs(depth(group,x,y)-max)<0.002,'a hidden full card face must not cover the chip');
  }
  assert.ok(named('CC-Chip-Substrate').getMesh());
  function connected() {
    const mesh=triangles(named('CC-Chip-Substrate'),group),substrate=mesh.flat(),lo=Math.min(...substrate.map(p=>p.z)),hi=Math.max(...substrate.map(p=>p.z));
    const hits=(faces,x,y)=>{const r=new Ray(new Vector3(x,y,1),new Vector3(0,0,-1)),p=new Vector3(),z=[];for(const t of faces)if(r.intersectTriangle(...t,false,p))z.push(p.z);return z;};
    const center=['x','y'].map(k=>(Math.min(...substrate.map(p=>p[k]))+Math.max(...substrate.map(p=>p[k])))/2);
    const core=hits(triangles(named('CC-Silver-Card-Body'),group),...center);
    assert.ok(core.length&&lo<=Math.max(...core)+0.0001&&hi>=Math.max(...core),'chip substrate must enter the actual card core at its contact point');
    for(let i=0;i<8;i++) {
      const p=triangles(named('CC-Chip-Contact-'+i),group).flat(),z=p.map(p=>p.z),x=p.reduce((s,p)=>s+p.x,0)/p.length,y=p.reduce((s,p)=>s+p.y,0)/p.length,surface=hits(mesh,x,y);
      assert.ok(surface.length&&Math.min(...z)<=Math.max(...surface)+0.0001&&Math.max(...z)>=Math.min(...surface),'every contact must physically overlap its substrate in XYZ');
    }
  }
  connected();
  const substrate=named('CC-Chip-Substrate'),p=substrate.getTranslation();substrate.setTranslation([p[0],p[1],p[2]+0.1]);
  assert.throws(connected,{code:'ERR_ASSERTION'},'connection verifier must reject an actually detached substrate');
  substrate.setTranslation([p[0]+4,p[1],p[2]]);
  assert.throws(connected,{code:'ERR_ASSERTION'},'connection verifier must reject lateral detachment, not just Z gaps');
});

test('Credit Card reserves its softer polished silver finish for exactly eight chip contacts',async()=>{
  const {bytes}=await card();
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  function verify(gltf) {
    const find=name=>{
      const matches=gltf.materials.filter(m=>m.name===name);
      assert.equal(matches.length,1,name+' must be unique');return matches[0];
    };
    const chip=find('CC-Chip-Silver'),polish=find('CC-Polished-Edge');
    const expected=structuredClone(polish);expected.name='CC-Chip-Silver';
    expected.pbrMetallicRoughness.metallicFactor=0.84;
    assert.deepEqual(chip,expected,'chip finish must only clone the polish with softer metal response');
    assert.equal(chip.pbrMetallicRoughness.roughnessFactor,0.17);
    const contacts=gltf.nodes.filter(n=>n.name?.startsWith('CC-Chip-Contact-'));
    assert.deepEqual(contacts.map(n=>n.name).sort(),Array.from({length:8},(_,i)=>'CC-Chip-Contact-'+i));
    const mesh=contacts[0].mesh;
    assert.ok(Number.isInteger(mesh));
    assert.ok(contacts.every(n=>n.mesh===mesh),'contacts must share their original mesh');
    assert.equal(gltf.nodes.filter(n=>n.mesh===mesh).length,8,'no unrelated mesh owner');
    const primitives=gltf.meshes[mesh].primitives;
    assert.equal(primitives.length,1);
    assert.equal(gltf.materials[primitives[0].material],chip);
    for(const [i,m]of gltf.meshes.entries())if(i!==mesh)
      assert.ok(m.primitives.every(p=>gltf.materials[p.material]!==chip),'chip material leaked to another mesh');
    for(const [node,material]of [
      ['CC-Silver-Card-Body','CC-Brushed-Silver'],['CC-Silver-Card-Engraved-Face','CC-Brushed-Silver'],
      ['CC-Emerald-Card-Body','CC-Emerald-Metal'],['CC-Emerald-Card-Engraved-Face','CC-Emerald-Metal'],
      ['CC-Coin-Body','CC-Turned-Silver'],['CC-Coin-Front-Engraving','CC-Turned-Silver'],
      ['CC-Coin-Rear-Engraving','CC-Turned-Silver'],['CC-Coin-Front-Rim','CC-Polished-Edge'],
      ['CC-Coin-Rear-Rim','CC-Polished-Edge'],['CC-Chip-Substrate','CC-Inset-Polymer'],
    ]) {
      const n=gltf.nodes.find(n=>n.name===node);assert.ok(n,node);
      assert.ok(gltf.meshes[n.mesh].primitives.every(p=>gltf.materials[p.material]===find(material)),node+' changed finish');
    }
  }
  verify(json);
  const reject=mutate=>{
    const copy=structuredClone(json);mutate(copy);
    assert.throws(()=>verify(copy),{code:'ERR_ASSERTION'});
  };
  const contact=g=>g.nodes.find(n=>n.name==='CC-Chip-Contact-0');
  const chip=g=>g.materials.find(m=>m.name==='CC-Chip-Silver');
  for(const old of ['CC-Brushed-Silver','CC-Polished-Edge'])
    reject(g=>{g.meshes[contact(g).mesh].primitives[0].material=g.materials.findIndex(m=>m.name===old);});
  reject(g=>{chip(g).pbrMetallicRoughness.metallicFactor=1;});
  reject(g=>{chip(g).pbrMetallicRoughness.roughnessFactor=0.25;});
  reject(g=>{chip(g).emissiveFactor=[0.1,0.1,0.1];});
  reject(g=>{g.nodes.push(structuredClone(contact(g)));});
  reject(g=>{g.nodes=g.nodes.filter(n=>n.name!=='CC-Chip-Contact-7');});
  reject(g=>{g.nodes.push({name:'Unexpected-contact-owner',mesh:contact(g).mesh});});
  reject(g=>{const n=contact(g);g.meshes.push(structuredClone(g.meshes[n.mesh]));n.mesh=g.meshes.length-1;});
  reject(g=>{g.materials.push(structuredClone(chip(g)));});
  reject(g=>{const n=g.nodes.find(n=>n.name==='CC-Silver-Card-Engraved-Face');g.meshes[n.mesh].primitives[0].material=g.materials.indexOf(chip(g));});
});

test('Credit Card compressed caps retain outward winding, consistent UVs and non-overlapping triangles',async()=>{
  const {named,triangles}=await card();
  const area=t=>(t[1].x-t[0].x)*(t[2].y-t[0].y)-(t[1].y-t[0].y)*(t[2].x-t[0].x);
  const overlap=(a,b)=>{
    let polygon=a.map(p=>({x:p.x,y:p.y}));
    for(let k=0;k<3&&polygon.length;k++) {
      const c=b[k],d=b[(k+1)%3],side=p=>(d.x-c.x)*(p.y-c.y)-(d.y-c.y)*(p.x-c.x),out=[];
      for(let i=0;i<polygon.length;i++) {
        const p=polygon[i],q=polygon[(i+1)%polygon.length],sp=side(p),sq=side(q);
        if(sp>=0)out.push(p);
        if((sp<0)!==(sq<0)){const t=sp/(sp-sq);out.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}
      }
      polygon=out;
    }
    return Math.abs(polygon.reduce((s,p,i)=>{const q=polygon[(i+1)%polygon.length];return s+p.x*q.y-q.x*p.y;},0))/2;
  };
  function verify() {
  for(const name of ['CC-Silver-Card-Engraved-Face','CC-Emerald-Card-Engraved-Face']) {
    const node=named(name),caps=[];
    for(const p of node.getMesh().listPrimitives()) {
      const normals=p.getAttribute('NORMAL'),uv=p.getAttribute('TEXCOORD_0'),ix=p.getIndices(),faces=triangles(node,named(name.replace('-Engraved-Face','')));
      for(let i=0;i<ix.getCount();i+=3) {
        if(![0,1,2].every(j=>normals.getElement(ix.getScalar(i+j),[])[2]>0.999))continue;
        const t=faces[i/3],a=area(t),u=[0,1,2].map(j=>{const v=uv.getElement(ix.getScalar(i+j),[]);return {x:v[0],y:v[1]};});
        assert.ok(a>=-1e-10,'compressed cap has reversed winding: '+a);
        assert.ok(area(u)>=-1e-10,'compressed cap has inverted UV orientation');
        if(a>1e-10)caps.push(t);
      }
    }
    assert.ok(caps.length>30,'must inspect actual cap triangles');
    for(let i=0;i<caps.length;i++)for(let j=i+1;j<caps.length;j++) {
      const a=caps[i],b=caps[j];
      if(Math.max(...a.map(p=>p.x))<=Math.min(...b.map(p=>p.x))||Math.max(...b.map(p=>p.x))<=Math.min(...a.map(p=>p.x))||Math.max(...a.map(p=>p.y))<=Math.min(...b.map(p=>p.y))||Math.max(...b.map(p=>p.y))<=Math.min(...a.map(p=>p.y)))continue;
      assert.ok(overlap(a,b)<1e-8,'compressed cap triangles overlap');
    }
  }
  }
  verify();
  const p=named('CC-Silver-Card-Engraved-Face').getMesh().listPrimitives()[0],ix=p.getIndices(),values=ix.getArray(),normal=p.getAttribute('NORMAL');
  let cap;for(let i=0;i<values.length;i+=3)if([0,1,2].every(j=>normal.getElement(values[i+j],[])[2]>0.999)){cap=[...values.slice(i,i+3)];break;}
  assert.ok(cap);ix.setArray(new values.constructor([...values,...cap]));
  assert.throws(verify,{code:'ERR_ASSERTION'},'overlap verifier must reject an actual duplicated cap triangle in memory');
});

test('Credit Card coin has actual reeding, two closed faces and recessed wave details',async()=>{
  const {named,triangles,depth}=await card(),coin=named('CC-Coin');
  const points=triangles(named('CC-Coin-Body'),coin).flat().filter(p=>Math.abs(p.z)<0.015);
  const radii=points.map(p=>Math.hypot(p.x,p.y));
  assert.ok(Math.max(...radii)-Math.min(...radii)>0.002,'edge reeding must change actual geometry');
  assert.ok(depth(coin,0,0)>0.02&&depth(coin,0,0,-1)<-0.02);
  for(const name of ['CC-Coin-Front-Engraving','CC-Coin-Rear-Engraving','CC-Coin-Front-Rim','CC-Coin-Rear-Rim'])assert.ok(named(name).getMesh());
});

test('Credit Card coin engravings have two-sided recess depth and reject plain replacement faces',async()=>{
  const {named,depth}=await card(),coin=named('CC-Coin');
  const paths=[[[-0.26,-0.29],[-0.19,-0.06],[0.13,0.07],[0.23,0.3]],[[-0.06,-0.36],[0.02,-0.16],[0.25,-0.04],[0.34,0.14]]];
  function verify() {
    for(const side of [-1,1])for(const points of paths) {
      const c=new CatmullRomCurve3(points.map(([x,y])=>new Vector3(x,y,0)));
      for(const t of [0.2,0.5,0.8]) {
        const p=c.getPoint(t),n=c.getTangent(t),floor=depth(coin,side*p.x,p.y,side),face=depth(coin,side*(p.x-n.y*0.025),p.y+n.x*0.025,side);
        assert.ok(Number.isFinite(floor)&&Number.isFinite(face)&&side*(face-floor)>0.0015,'actual two-sided coin recess missing');
      }
    }
  }
  verify();
  for(const label of ['Front','Rear'])named('CC-Coin-'+label+'-Engraving').setMesh(named('CC-Coin-Body').getMesh());
  assert.throws(verify,{code:'ERR_ASSERTION'},'wave verifier must reject plain coin-body replacement faces');
});

test('Credit Card coin has 96 actual angular reed peaks rather than arbitrary radial variation',async()=>{
  const {named,triangles}=await card(),coin=named('CC-Coin'),body=named('CC-Coin-Body');
  function verify() {
    const samples=new Map();
    for(const p of triangles(body,coin).flat()) {
      const r=Math.hypot(p.x,p.y);if(Math.abs(p.z)>0.015||r<0.477)continue;
      const a=(Math.atan2(p.y,p.x)+Math.PI*2)%(Math.PI*2),i=Math.round(a/(Math.PI*2)*384)%384;
      samples.set(i,Math.max(samples.get(i)??0,r));
    }
    assert.equal(samples.size,384,'must inspect actual complete edge samples');
    let peaks=0;for(let i=0;i<384;i++)if(samples.get(i)>samples.get((i+383)%384)+0.0005&&samples.get(i)>samples.get((i+1)%384)+0.0005)peaks++;
    assert.equal(peaks,96,'actual angular reed count');
  }
  verify();
  const ix=body.getMesh().listPrimitives()[0].getIndices();ix.setArray(ix.getArray().slice(0,3));
  assert.throws(verify,{code:'ERR_ASSERTION'},'reed verifier must reject removal of the actual edge geometry');
});

test('Credit Card has finite normalized stage geometry and a protected locked aggregate-budget guard',async()=>{
  const {root,record}=await card(),b=getBounds(root.listScenes()[0]);
  assert.ok(Math.abs(Math.max(...b.max.map((v,i)=>v-b.min[i]))-3.2)<0.003&&Math.abs(b.min[1])<0.003);
  let count=0;for(const m of root.listMeshes())for(const p of m.listPrimitives()){assert.ok(Array.from(p.getAttribute('POSITION').getArray()).every(Number.isFinite));count+=p.getIndices().getCount()/3;}
  assert.equal(count,record.triangles);assert.ok(count>1000&&count<75000);
  const source=await readFile(new URL('./build-refined-credit-card.mjs',import.meta.url),'utf8');
  const verify=s=>{
    let callback;simple(parse(s,{ecmaVersion:'latest',sourceType:'module'}),{CallExpression(n){if(n.callee.name==='saveRefinedHero')callback=n.arguments[2];}});
    assert.ok(callback?.body?.type==='BlockStatement');
    let check,guard,write,live;simple(callback.body,{VariableDeclaration(n){if(n.kind==='const')live=n.declarations.find(d=>d.id.name==='liveCollection')??live;},CallExpression(n){if(n.callee.name==='sizeOf')check=n;if(n.callee.name==='writeFile')write=n;},IfStatement(n){if(n.test.left?.name==='liveCollection')guard=n;}});
    assert.ok(check&&guard&&write&&live&&check.end<guard.start&&guard.end<write.start);
    const init=live.init;assert.equal(init?.operator,'+');assert.equal(init.left.operator,'-');
    assert.equal(init.left.left.type,'AwaitExpression');assert.equal(init.left.left.argument.callee.name,'sizeOf');
    assert.equal(init.left.right.type,'MemberExpression');assert.equal(init.left.right.property.name,'size');
    assert.equal(init.left.right.object.type,'AwaitExpression');assert.equal(init.left.right.object.argument.callee.name,'stat');
    assert.equal(init.left.right.object.argument.arguments[0].name,'target');
    assert.equal(init.right.object.name,'output');assert.equal(init.right.property.name,'length');
    const value=n=>n.type==='Literal'?n.value:n.type==='BinaryExpression'&&n.operator==='*'?value(n.left)*value(n.right):NaN;
    assert.equal(guard.test.operator,'>');assert.equal(value(guard.test.right),10*1024*1024);assert.equal(guard.consequent.type,'ThrowStatement');return {guard,init,callback};
  };
  const {guard,init,callback}=verify(source);assert.throws(()=>verify(source.slice(0,guard.start)+source.slice(guard.end)),{code:'ERR_ASSERTION'});
  const stale=source.slice(0,init.start)+'collection'+source.slice(init.end),at=callback.body.start+1;
  const unused=stale.slice(0,at)+'await sizeOf(new URL("../../web/public/",import.meta.url));'+stale.slice(at);
  assert.throws(()=>verify(unused),{code:'ERR_ASSERTION'},'unused fresh size must not hide a stale total used by the guard');
});
