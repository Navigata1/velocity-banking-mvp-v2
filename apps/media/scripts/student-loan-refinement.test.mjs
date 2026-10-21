import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix3, Matrix4, Vector3, Ray, Triangle, BoxGeometry } from '../../web/node_modules/three/build/three.module.js';
import sharp from 'sharp';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';

const hash=b=>createHash('sha256').update(b).digest('hex');
const url=path=>new URL(path,import.meta.url);
async function student() {
  const records=JSON.parse(await readFile(url('../hero-imported.json'),'utf8'));
  const bytes=await readFile(url('../../web/public/heroes/studentLoan.glb'));
  await MeshoptDecoder.ready;
  const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(bytes);
  const root=document.getRoot(),named=name=>{const n=root.listNodes().find(n=>n.getName()===name);assert.ok(n,name+' missing');return n;};
  return {record:records.find(r=>r.id==='studentLoan'),bytes,document,root,named};
}
function faces(node,frame=node) {
  const result=[],inverse=frame?new Matrix4().fromArray(frame.getWorldMatrix()).invert():new Matrix4();
  function walk(n) {
    const matrix=inverse.clone().multiply(new Matrix4().fromArray(n.getWorldMatrix()));
    for(const p of n.getMesh()?.listPrimitives()??[]) {
      const positions=p.getAttribute('POSITION'),ix=p.getIndices(),count=ix?.getCount()??positions.getCount();
      for(let i=0;i<count;i+=3)result.push([0,1,2].map(j=>new Vector3().fromArray(positions.getElement(ix?ix.getScalar(i+j):i+j,[])).applyMatrix4(matrix)));
    }
    n.listChildren().forEach(walk);
  }
  walk(node);assert.ok(result.length,node.getName()+' has no actual triangles');return result;
}
function bounds(triangles) {
  const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
  for(const t of triangles)for(const p of t){min.min(p);max.max(p);}
  return {min,max,center:min.clone().add(max).multiplyScalar(0.5),span:max.clone().sub(min)};
}
function hits(triangles,origin,direction,front=false) {
  const ray=new Ray(origin,direction.clone().normalize()),point=new Vector3(),result=[];
  for(const t of triangles)if(ray.intersectTriangle(...t,front,point)&&!result.some(p=>p.distanceTo(point)<1e-5))result.push(point.clone());
  return result.sort((a,b)=>a.distanceTo(origin)-b.distanceTo(origin));
}
const volume=ts=>Math.abs(ts.reduce((s,[a,b,c])=>s+a.dot(b.clone().cross(c))/6,0));
function closed(ts) {
  const edges=new Map(),key=p=>p.toArray().map(v=>Math.round(v*1e5)).join(',');
  for(const t of ts) {
    const ids=t.map(key);if(new Set(ids).size<3)continue;
    for(let i=0;i<3;i++){const a=ids[i],b=ids[(i+1)%3],edge=[a,b].sort().join('|'),e=edges.get(edge)??[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(edge,e);}
  }
  assert.ok(edges.size>6&&[...edges.values()].every(([count,winding])=>count%2===0&&winding===0),'book surface has an open edge or inconsistent winding');
}
function contact(a,b,frame) {
  const left=faces(a,frame),right=faces(b,frame),lb=bounds(left),rb=bounds(right),tolerance=Math.min(lb.span.length(),rb.span.length())*0.006;
  const point=new Vector3(),onRay=new Vector3(),onSegment=new Vector3();
  for(const [source,target,box]of [[left,right,rb],[right,left,lb]])for(const p of source.flat()) {
    if(['x','y','z'].some(k=>p[k]<box.min[k]-tolerance||p[k]>box.max[k]+tolerance))continue;
    if(target.some(t=>new Triangle(...t).closestPointToPoint(p,point).distanceTo(p)<=tolerance)||hits(target,p,new Vector3(1,0.027,0.013)).length%2===1)return;
  }
  // Crossing faces need bounded edge tests even when every vertex overhangs.
  for(const first of left)for(const second of right) {
    if(['x','y','z'].some(k=>Math.max(...first.map(p=>p[k]))<Math.min(...second.map(p=>p[k]))-tolerance||Math.max(...second.map(p=>p[k]))<Math.min(...first.map(p=>p[k]))-tolerance))continue;
    for(const [from,to]of [[first,second],[second,first]])for(let i=0;i<3;i++) {
      const origin=from[i],edge=from[(i+1)%3].clone().sub(origin),length=edge.length();if(length<1e-10)continue;
      const ray=new Ray(origin,edge.multiplyScalar(1/length));
      if(ray.intersectTriangle(...to,false,point)&&point.distanceTo(origin)<=length+tolerance)return;
      for(let j=0;j<3;j++)if(ray.distanceSqToSegment(to[j],to[(j+1)%3],onRay,onSegment)<=tolerance*tolerance&&onRay.distanceTo(origin)<=length)return;
    }
  }
  assert.fail(a.getName()+' must physically meet '+b.getName()+' in XYZ');
}

test('Student Loan replaces the study with a protected original artifact and verifiable source provenance',async()=>{
  const {record,bytes}=await student();
  assert.equal(record?.quality,'refined-textured','Student Loan must replace the untextured study with a protected refinement');
  assert.equal(record.sourceFile,'apps/media/scripts/build-refined-student-loan.mjs');
  assert.equal(record.sha256,hash(bytes));assert.equal(record.bytes,bytes.length);
  assert.equal(record.sourceSha256,hash((await readFile(url('./build-refined-student-loan.mjs'),'utf8')).replace(/\r\n/g,'\n')));
  const sources=JSON.parse(await readFile(url('../sources/student-loan/materials.json'),'utf8'));
  assert.equal(record.materialSourceSha256,hash(JSON.stringify(sources)));
  assert.equal(sources.resolution,512);
  assert.deepEqual(sources.images.map(i=>i.file).sort(),['cloth.png','leather.png']);
  for(const image of sources.images)assert.equal(image.sha256,hash(await readFile(url('../sources/student-loan/'+image.file))));
});

test('Student Loan embeds nine optimized varied PBR maps and non-emissive dielectric surfaces',async()=>{
  const {bytes,root}=await student(),textures=root.listTextures();
  assert.equal(textures.length,9,'Cloth, Leather and Paper each need Color, Normal and Roughness maps');
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
  assert.ok(json.images.length===9&&json.images.every(i=>i.bufferView!==undefined&&!i.uri));
  assert.ok(json.buffers.every(b=>!b.uri));
  for(const set of ['Cloth','Leather','Paper'])for(const suffix of ['Color','Normal','Roughness']) {
    const matches=textures.filter(t=>t.getName().endsWith(set+'-'+suffix));assert.equal(matches.length,1,set+'-'+suffix);
    const texture=matches[0],{data,info}=await sharp(texture.getImage()).raw().toBuffer({resolveWithObject:true});
    assert.ok(info.width>1&&info.height>1&&info.width<=512&&info.height<=512);
    const channels=suffix==='Normal'?[0,1]:[suffix==='Roughness'?1:0];
    assert.ok(channels.some(channel=>{const values=new Set();for(let i=channel;i<data.length;i+=info.channels)values.add(data[i]);return values.size>2;}),texture.getName()+' must contain spatial surface detail');
  }
  for(const [name,set]of [['SL-Cloth-Navy','Cloth'],['SL-Leather-Green','Leather'],['SL-Leather-Oxblood','Leather'],['SL-Paper','Paper'],['SL-Satin-Green',null],['SL-Gold',null]]) {
    const m=root.listMaterials().find(m=>m.getName()===name);assert.ok(m,name+' missing');
    assert.ok(m.getEmissiveFactor().every(v=>v===0),'surface highlights must not be faked with emission');
    if(set) {
      assert.equal(m.getMetallicFactor(),0,name+' is dielectric');
      for(const [texture,suffix]of [[m.getBaseColorTexture(),'Color'],[m.getNormalTexture(),'Normal'],[m.getMetallicRoughnessTexture(),'Roughness']])assert.ok(texture?.getName().endsWith(set+'-'+suffix),name+' lacks '+suffix);
    }
  }
});

test('Student Loan has two thin closed books with actual pages, covers, spines and attached binding bands',async()=>{
  const {named,document,root}=await student(),frame=document.createNode('Contact-regression-frame'),buffer=root.listBuffers()[0];
  const slab=(name,size)=>{
    const g=new BoxGeometry(...size),position=document.createAccessor().setType('VEC3').setArray(g.attributes.position.array).setBuffer(buffer),indices=document.createAccessor().setType('SCALAR').setArray(g.index.array).setBuffer(buffer);
    const node=document.createNode(name).setMesh(document.createMesh().addPrimitive(document.createPrimitive().setAttribute('POSITION',position).setIndices(indices)));frame.addChild(node);return node;
  };
  const horizontal=slab('Overhanging-horizontal',[4,0.2,0.4]),vertical=slab('Overhanging-vertical',[0.4,4,0.2]);
  contact(horizontal,vertical,frame);contact(vertical,horizontal,frame);
  vertical.setTranslation([0,0,5]);
  assert.throws(()=>contact(horizontal,vertical,frame),{code:'ERR_ASSERTION'},'crossed slabs must reject distant separation');
  assert.throws(()=>contact(vertical,horizontal,frame),{code:'ERR_ASSERTION'},'separation rejection must be symmetric');
  for(const label of ['Lower','Upper']) {
    const name='SL-Book-'+label,book=named(name),pages=named(name+'-Pages');
    for(const suffix of ['Pages','Top-Cover','Bottom-Cover','Spine'])assert.ok(book.listChildren().includes(named(name+'-'+suffix)));
    for(const suffix of ['Pages','Top-Cover','Bottom-Cover']) {
      const n=named(name+'-'+suffix),ts=faces(n,book),b=bounds(ts);
      assert.ok(b.span.y>0&&b.span.y<Math.min(b.span.x,b.span.z)*0.3,'book surfaces must have real, thin thickness');
      closed(ts);assert.ok(volume(ts)>b.span.x*b.span.y*b.span.z*0.05,'open or zero-volume book surface');
      for(const x of [0.25,0.5,0.75])for(const z of [0.25,0.5,0.75])for(const side of [-1,1]) {
        const p=new Vector3(b.min.x+x*b.span.x,b.center.y+side*b.span.y*2,b.min.z+z*b.span.z);
        assert.ok(hits(ts,p,new Vector3(0,-side,0),true).length,'both book faces must close with outward winding');
      }
    }
    for(const suffix of ['Top-Cover','Bottom-Cover','Spine'])contact(named(name+'-'+suffix),pages,book);
    const bands=book.listChildren().filter(n=>n.getName().startsWith(name+'-Binding-Band-'));assert.ok(bands.length>=2);
    for(const band of bands)contact(band,named(name+'-Spine'),book);
  }
});

test('Student Loan cap support and all three cords physically connect, rejecting lateral detachment',async()=>{
  const {named}=await student(),cap=named('SL-Cap'),board=named('SL-Cap-Board'),button=named('SL-Cap-Button'),head=named('SL-Tassel-Head');
  for(const n of [named('SL-Cap-Crown'),board,button,head,named('SL-Tassel-Fringe')])assert.ok(cap.listChildren().includes(n));
  contact(named('SL-Cap-Crown'),named('SL-Book-Upper-Top-Cover'),cap);contact(board,named('SL-Cap-Crown'),cap);contact(button,board,cap);
  const verify=()=>{for(let i=0;i<3;i++){const cord=named('SL-Cord-Strand-'+i);assert.ok(cap.listChildren().includes(cord));contact(cord,button,cap);contact(cord,head,cap);assert.ok(faces(cord).length>30);}};
  verify();
  // Intersect the real tubes, then track winding about their shared centreline.
  const start=bounds(faces(button,cap)).center,end=bounds(faces(head,cap)).center,axis=end.clone().sub(start).normalize();
  const u=new Vector3(0,1,0).cross(axis).normalize(),v=axis.clone().cross(u),cords=[0,1,2].map(i=>faces(named('SL-Cord-Strand-'+i),cap));
  const angles=[[],[],[]];
  for(let i=0;i<64;i++) {
    const plane=start.clone().lerp(end,0.1+i*0.8/63),centres=cords.map(ts=>{
      const points=[];
      for(const t of ts)for(let j=0;j<3;j++) {
        const a=t[j],b=t[(j+1)%3],da=a.clone().sub(plane).dot(axis),db=b.clone().sub(plane).dot(axis);
        if(da*db<0){const p=a.clone().lerp(b,da/(da-db));if(!points.some(q=>q.distanceTo(p)<1e-5))points.push(p);}
      }
      assert.ok(points.length>=3,'cord cross-section missing');return points.reduce((s,p)=>s.add(p),new Vector3()).multiplyScalar(1/points.length);
    });
    const centre=centres.reduce((s,p)=>s.add(p),new Vector3()).multiplyScalar(1/3);
    centres.forEach((p,j)=>{const d=p.clone().sub(centre);angles[j].push(Math.atan2(d.dot(v),d.dot(u)));});
  }
  for(const samples of angles) {
    const turn=samples.slice(1).reduce((s,a,i)=>s+Math.atan2(Math.sin(a-samples[i]),Math.cos(a-samples[i])),0);
    assert.ok(Math.abs(turn)>Math.PI*2,'actual cord geometry must wind helically, not form three parallel plain tubes');
  }
  const cord=named('SL-Cord-Strand-0'),p=[...cord.getTranslation()];
  try {cord.setTranslation([p[0]+bounds(faces(cap)).span.length()*2,p[1],p[2]]);assert.throws(verify,{code:'ERR_ASSERTION'},'contact verifier must reject actual lateral cord detachment');}
  finally {cord.setTranslation(p);}
});

test('Student Loan tassel has 48 separate volumetric strands attached to its head',async()=>{
  const {named}=await student(),cap=named('SL-Cap'),head=named('SL-Tassel-Head'),fringe=named('SL-Tassel-Fringe');
  assert.equal(fringe.listChildren().length,48);
  const headBox=bounds(faces(head,cap));
  for(const strand of fringe.listChildren()) {
    assert.ok(strand.getMesh(),'fringe must contain actual strand meshes');
    const ts=faces(strand,cap),b=bounds(ts);assert.ok(ts.length>12&&volume(ts)>1e-9);
    assert.ok(b.span.y>Math.max(b.span.x,b.span.z)&&b.min.y<headBox.min.y,'strands must hang below the head');contact(strand,head,cap);
  }
});

test('Student Loan diploma is an open X-axis shell with an internal spiral and rejects a filled lumen',async()=>{
  const {document,root,named}=await student(),diploma=named('SL-Diploma'),tube=named('SL-Diploma-Tube'),coil=named('SL-Diploma-Coil');
  assert.ok(diploma.listChildren().includes(tube)&&diploma.listChildren().includes(coil));
  const shell=faces(tube,diploma),b=bounds(shell),r=Math.min(b.span.y,b.span.z)/2;
  assert.ok(b.span.x>Math.max(b.span.y,b.span.z)*2,'scroll must run along X');
  const verify=()=>{
    const ts=faces(diploma,diploma);
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4,p=new Vector3(b.min.x-b.span.x,b.center.y+Math.cos(a)*r*0.025,b.center.z+Math.sin(a)*r*0.025);
      assert.equal(hits(ts,p,new Vector3(1,0,0)).length,0,'scroll centre must remain open end to end');
    }
  };
  verify();
  for(const f of [0.25,0.5,0.75])assert.ok(hits(shell,new Vector3(b.min.x+f*b.span.x,b.max.y+r,b.center.z),new Vector3(0,-1,0)).length>=4,'shell requires actual outer and inner walls, not a capped cylinder');
  const spiral=faces(coil,diploma),cb=bounds(spiral),radii=spiral.flat().map(p=>Math.hypot(p.y-b.center.y,p.z-b.center.z));
  assert.ok(cb.span.x>b.span.x*0.5&&Math.max(...radii)-Math.min(...radii)>r*0.25,'coil must be an extended internal spiral, not an end decal');
  assert.ok(hits(spiral,new Vector3(b.center.x,b.max.y+r,b.center.z),new Vector3(0,-1,0)).length>=4,'spiral must contain multiple actual paper crossings');
  const geometry=new BoxGeometry(b.span.x*0.25,r*0.3,r*0.3),buffer=root.listBuffers()[0];
  const position=document.createAccessor().setType('VEC3').setArray(geometry.attributes.position.array).setBuffer(buffer),indices=document.createAccessor().setType('SCALAR').setArray(geometry.index.array).setBuffer(buffer);
  const fill=document.createNode('Deliberate-lumen-blocker').setMesh(document.createMesh().addPrimitive(document.createPrimitive().setAttribute('POSITION',position).setIndices(indices))).setTranslation(b.center.toArray());
  diploma.addChild(fill);assert.throws(verify,{code:'ERR_ASSERTION'},'void verifier must reject an actual closed solid inside the scroll');
});

test('Student Loan bow has volumetric loops with real holes and connected knot, band and tails',async()=>{
  const {named}=await student(),diploma=named('SL-Diploma'),knot=named('SL-Bow-Knot'),band=named('SL-Diploma-Band');
  contact(band,named('SL-Diploma-Tube'),diploma);contact(knot,band,diploma);
  for(const side of ['Left','Right']) {
    const loop=named('SL-Bow-'+side+'-Loop'),tail=named('SL-Bow-'+side+'-Tail');contact(loop,knot,diploma);contact(tail,knot,diploma);
    const ts=faces(loop),b=bounds(ts),axes=['x','y','z'].sort((a,c)=>b.span[a]-b.span[c]),[depth,u,v]=axes;
    assert.ok(b.span[depth]>1e-4&&volume(ts)>b.span.x*b.span.y*b.span.z*0.005,'ribbon loops require actual thickness');
    const occupied=Array.from({length:11},(_,i)=>Array.from({length:11},(_,j)=>{
      const p=b.center.clone(),direction=new Vector3();p[depth]=b.min[depth]-b.span.length();p[u]=b.min[u]+(i+0.5)*b.span[u]/11;p[v]=b.min[v]+(j+0.5)*b.span[v]/11;direction[depth]=1;return hits(ts,p,direction).length>0;
    }));
    assert.ok(occupied.some((row,i)=>row.some((solid,j)=>!solid&&row.slice(0,j).some(Boolean)&&row.slice(j+1).some(Boolean)&&occupied.slice(0,i).some(r=>r[j])&&occupied.slice(i+1).some(r=>r[j]))),'loop must enclose an actual unfilled aperture');
  }
});

function surfaceCrossings(ts) {
  const result=[];
  for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++) {
    const a=ts[i],b=ts[j];
    if(a.some(p=>b.some(q=>p.distanceTo(q)<1e-5)))continue;
    if(['x','y','z'].some(k=>Math.max(...a.map(p=>p[k]))<Math.min(...b.map(p=>p[k]))-1e-7||Math.max(...b.map(p=>p[k]))<Math.min(...a.map(p=>p[k]))-1e-7))continue;
    let found;
    for(const [left,right]of [[a,b],[b,a]])for(let k=0;k<3;k++) {
      const delta=left[(k+1)%3].clone().sub(left[k]),length=delta.length(),point=new Vector3();
      if(length<1e-8)continue;
      if(new Ray(left[k],delta.divideScalar(length)).intersectTriangle(...right,false,point)) {
        const distance=point.distanceTo(left[k]),bary=new Triangle(...right).getBarycoord(point,new Vector3());
        if(distance>1e-6&&distance<length-1e-6&&Math.min(...bary.toArray())>1e-5)found=point.clone();
      }
    }
    if(found)result.push(found);
  }
  return result;
}

test('Student Loan bow surfaces do not cross or invert outside their tied knot',async()=>{
  const {named}=await student(),frame=named('SL-Diploma');
  const outside=p=>p.x<-0.4||p.x>-0.08||p.y>0.14;
  const crossing=[
    [new Vector3(-1,0,0),new Vector3(1,0,0),new Vector3(0,1,0)],
    [new Vector3(-0.3,0.3,-1),new Vector3(-0.3,0.3,1),new Vector3(0.3,0.3,0)],
  ];
  assert.ok(surfaceCrossings(crossing).length,'independent crossing fixture must fail the geometric check');
  assert.equal(surfaceCrossings(crossing.map((t,i)=>t.map(p=>p.clone().add(new Vector3(i*4,0,0))))).length,0);
  for(const side of ['Left','Right']) {
    const node=named('SL-Bow-'+side+'-Loop');
    const triangles=faces(node,frame),solid=ts=>{
      closed(ts);
      assert.ok(ts.reduce((sum,[a,b,c])=>sum+a.dot(b.clone().cross(c))/6,0)>1e-8,side+' loop must face outward');
    };
    solid(triangles);
    assert.throws(()=>solid(triangles.slice(1)),{code:'ERR_ASSERTION'},'missing triangle must be rejected');
    assert.throws(()=>solid(triangles.map(([a,b,c])=>[a,c,b])),{code:'ERR_ASSERTION'},'jointly reversed winding/normals must be rejected');
    assert.equal(surfaceCrossings(triangles).filter(outside).length,0,side+' loop self-intersects outside knot');
    const matrix=new Matrix4().fromArray(frame.getWorldMatrix()).invert().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
    const normalMatrix=new Matrix3().getNormalMatrix(matrix);
    for(const p of node.getMesh().listPrimitives()) {
      const positions=p.getAttribute('POSITION'),normals=p.getAttribute('NORMAL'),ix=p.getIndices();
      for(let i=0;i<ix.getCount();i+=3) {
        const ids=[0,1,2].map(j=>ix.getScalar(i+j)),points=ids.map(j=>new Vector3().fromArray(positions.getElement(j,[])).applyMatrix4(matrix));
        if(!outside(points.reduce((s,v)=>s.add(v),new Vector3()).multiplyScalar(1/3)))continue;
        const cross=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
        const average=ids.reduce((s,j)=>s.add(new Vector3().fromArray(normals.getElement(j,[])).applyNormalMatrix(normalMatrix)),new Vector3());
        assert.ok(cross.dot(average)>=-1e-12,side+' loop has inverted face/normal');
      }
    }
  }
});

test('Student Loan stays finite, grounded, normalized and within its tighter artifact budgets',async()=>{
  const {record,bytes,root}=await student(),b=getBounds(root.listScenes()[0]);
  assert.ok(bytes.length<=0.75*1024*1024,'Student Loan GLB must recover headroom within 0.75MiB');
  assert.ok([...b.min,...b.max].every(Number.isFinite));
  assert.ok(Math.abs(Math.max(...b.max.map((v,i)=>v-b.min[i]))-3.2)<0.003&&Math.abs(b.min[1])<0.003,'normalized stage must rest on Y=0');
  let count=0;for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()) {
    for(const semantic of p.listSemantics())assert.ok(Array.from(p.getAttribute(semantic).getArray()).every(Number.isFinite),semantic+' contains non-finite geometry');
    count+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
  }
  assert.equal(count,record?.triangles);assert.ok(count>1000&&count<=75000);
});

test('Student Loan preserves the current aggregate 10MiB cap and its live locked-publication dataflow',async()=>{
  async function size(url){let n=0;for(const e of await readdir(url,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),url);n+=e.isDirectory()?await size(p):(await stat(p)).size;}return n;}
  assert.ok(await size(url('../../web/public/'))<=10*1024*1024,'current actual public collection must remain within 10MiB');
  const source=await readFile(url('./build-refined-student-loan.mjs'),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
  const verify=s=>{
    let callback;simple(parse(s,{ecmaVersion:'latest',sourceType:'module'}),{CallExpression(n){if(n.callee.name==='saveRefinedHero')callback=n.arguments[2];}});
    assert.ok(callback?.body?.type==='BlockStatement','publication needs a locked saveRefinedHero callback');
    let live,guard,write;simple(callback.body,{VariableDeclaration(n){if(n.kind==='const')live=n.declarations.find(d=>d.id.name==='liveCollection')??live;},IfStatement(n){if(n.test.left?.name==='liveCollection')guard=n;},CallExpression(n){if(n.callee.name==='writeFile')write=n;}});
    assert.ok(live&&guard&&write&&live.end<guard.start&&guard.end<write.start,'live budget rejection must precede publication');
    const init=live.init;assert.equal(init?.operator,'+');assert.equal(init.left?.operator,'-');
    assert.equal(init.left.left.type,'AwaitExpression');assert.equal(init.left.left.argument.callee.name,'sizeOf');
    const args=init.left.left.argument.arguments;assert.equal(args[0].callee?.name,'URL');assert.equal(args[0].arguments[0].value,'../../web/public/');
    assert.equal(init.left.right.type,'MemberExpression');assert.equal(init.left.right.property.name,'size');
    const current=init.left.right.object;assert.equal(current.type,'AwaitExpression');assert.equal(current.argument.callee.name,'stat');assert.equal(current.argument.arguments[0].name,'target');
    assert.equal(init.right.object?.name,'output');assert.equal(init.right.property?.name,'length');
    const value=n=>n.type==='Literal'?n.value:n.type==='BinaryExpression'&&n.operator==='*'?value(n.left)*value(n.right):NaN;
    assert.equal(guard.test.operator,'>');assert.equal(value(guard.test.right),10*1024*1024);assert.equal(guard.consequent.type,'ThrowStatement');return {guard,live,callback};
  };
  const {guard,live,callback}=verify(source);assert.throws(()=>verify(source.slice(0,guard.start)+source.slice(guard.end)),{code:'ERR_ASSERTION'});
  const stale=source.slice(0,live.init.start)+'collection'+source.slice(live.init.end),at=callback.body.start+1;
  assert.throws(()=>verify(stale.slice(0,at)+'await sizeOf(new URL("../../web/public/",import.meta.url));'+stale.slice(at)),{code:'ERR_ASSERTION'},'unused fresh size must not hide a stale guarded total');
});
