import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const base = new URL('../../../', import.meta.url);
const req = createRequire(new URL('apps/media/package.json', base));
const load = async name => import(pathToFileURL(req.resolve(name)).href);
const {NodeIO} = await load('@gltf-transform/core');
const {ALL_EXTENSIONS} = await load('@gltf-transform/extensions');
const {MeshoptDecoder} = await load('meshoptimizer');
const {default:sharp} = await load('sharp');
const T = await import(new URL('apps/web/node_modules/three/build/three.module.js', base));
const {parse} = await load('acorn');
const {simple} = await load('acorn-walk');
const hash = b => createHash('sha256').update(b).digest('hex');
const bytes = await readFile(new URL('apps/web/public/heroes/studentLoan.glb', base));
await MeshoptDecoder.ready;
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(bytes);
const root = doc.getRoot();
const testSource = await readFile(new URL('apps/media/scripts/student-loan-refinement.test.mjs', base), 'utf8');
const helperSource = testSource.slice(testSource.indexOf('function faces('), testSource.indexOf("test('Student Loan"));
const {faces,bounds,contact,hits} = new Function('Matrix4','Vector3','Ray','Triangle','assert', helperSource+';return {faces,bounds,contact,hits};')(T.Matrix4,T.Vector3,T.Ray,T.Triangle,assert);
const named = name => root.listNodes().find(n => n.getName() === name);

const topology = [];
let triangles = 0, uvBadTotal = 0, normalsBack = 0;
for (const node of root.listNodes().filter(n => n.getMesh())) {
  const ts = faces(node), edges = new Map();
  let signedVolume = 0, area = 0, degenerate = 0, uvBad = 0, back = 0;
  const key = p => p.toArray().map(v => Math.round(v*1e5)).join(',');
  for (const [a,b,c] of ts) {
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    const faceArea = normal.length()/2;
    if (faceArea < 1e-12) { degenerate++; continue; }
    area += faceArea;
    signedVolume += a.dot(b.clone().cross(c))/6;
    const ids = [a,b,c].map(key);
    for (let i=0;i<3;i++) {
      if (ids[i] === ids[(i+1)%3]) continue;
      const x=ids[i],y=ids[(i+1)%3], k=[x,y].sort().join('|');
      const value=edges.get(k)??[0,0];value[0]++;value[1]+=x<y?1:-1;edges.set(k,value);
    }
  }
  for (const p of node.getMesh().listPrimitives()) {
    const pos=p.getAttribute('POSITION'), uv=p.getAttribute('TEXCOORD_0'), normal=p.getAttribute('NORMAL'), ix=p.getIndices();
    const n=ix?.getCount()??pos.getCount();triangles+=n/3;
    for (let i=0;i<n;i+=3) {
      const ids=[0,1,2].map(j=>ix?ix.getScalar(i+j):i+j);
      const [a,b,c]=ids.map(j=>new T.Vector3().fromArray(pos.getElement(j,[])));
      const geometric=b.sub(a).cross(c.sub(a));
      if (geometric.lengthSq()<1e-20) continue;
      if (uv) {
        const [a,b,c]=ids.map(j=>uv.getElement(j,[]));
        if (Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))<1e-12) uvBad++;
      } else if (p.getMaterial()?.getNormalTexture()) throw new Error('Missing textured UV '+node.getName());
      if (normal) {
        const average=ids.map(j=>new T.Vector3().fromArray(normal.getElement(j,[]))).reduce((s,v)=>s.add(v),new T.Vector3());
        if (geometric.dot(average)<-1e-12) back++;
      }
    }
  }
  const boundary=[...edges.values()].filter(([n])=>n===1).length;
  const inconsistent=[...edges.values()].filter(([n,w])=>n>1&&(n!==2||w!==0)).length;
  uvBadTotal+=uvBad;normalsBack+=back;
  topology.push({name:node.getName(),triangles:ts.length,degenerate,boundary,inconsistent,signedVolume,uvBad,normalOppositeFaces:back});
}
console.log('ARTIFACT',JSON.stringify({bytes:bytes.length,sha256:hash(bytes),uniqueMeshes:root.listMeshes().length,meshInstances:topology.length,nodes:root.listNodes().length,instantiatedTriangles:triangles,textures:root.listTextures().length,uvBadTotal,normalsBack}));
console.log('TOPOLOGY_ISSUES',JSON.stringify(topology.filter(r=>r.boundary||r.inconsistent||r.signedVolume<0||r.uvBad||r.normalOppositeFaces)));
console.log('SOLID_TOPOLOGY',JSON.stringify(topology.filter(r=>!r.name.includes('Fiber')&&!r.name.includes('Strand')).map(r=>({...r,signedVolume:+r.signedVolume.toFixed(9)}))));

const uniqueTriangles=root.listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
assert.equal(uniqueTriangles,29348);
for(const name of ['SL-Bow-Left-Loop','SL-Bow-Right-Loop','SL-Bow-Left-Tail','SL-Bow-Right-Tail']) {
  const node=named(name),frame=named('SL-Diploma'),matrix=new T.Matrix4().fromArray(frame.getWorldMatrix()).invert().multiply(new T.Matrix4().fromArray(node.getWorldMatrix()));
  let totalArea=0,invalidUvArea=0,oppositeArea=0;
  const opposite=[];
  for(const p of node.getMesh().listPrimitives()) {
    const pos=p.getAttribute('POSITION'),uv=p.getAttribute('TEXCOORD_0'),norm=p.getAttribute('NORMAL'),ix=p.getIndices(),nm=new T.Matrix3().getNormalMatrix(matrix);
    for(let i=0;i<ix.getCount();i+=3) {
      const ids=[0,1,2].map(j=>ix.getScalar(i+j));
      const pts=ids.map(j=>new T.Vector3().fromArray(pos.getElement(j,[])).applyMatrix4(matrix));
      const ab=pts[1].clone().sub(pts[0]),ac=pts[2].clone().sub(pts[0]),cross=ab.cross(ac),area=cross.length()/2;
      const uvs=ids.map(j=>uv.getElement(j,[]));
      const duv=(uvs[1][0]-uvs[0][0])*(uvs[2][1]-uvs[0][1])-(uvs[1][1]-uvs[0][1])*(uvs[2][0]-uvs[0][0]);
      const avg=ids.map(j=>new T.Vector3().fromArray(norm.getElement(j,[])).applyNormalMatrix(nm)).reduce((s,v)=>s.add(v),new T.Vector3());
      totalArea+=area;if(Math.abs(duv)<1e-12)invalidUvArea+=area;
      if(cross.dot(avg)<-1e-12){oppositeArea+=area;opposite.push({centroid:pts.reduce((s,p)=>s.add(p),new T.Vector3()).divideScalar(3).toArray(),area,geometricNormal:cross.normalize().toArray(),averageNormal:avg.normalize().toArray(),uvs});}
    }
  }
  console.log('RIBBON_AREA',JSON.stringify({name,totalArea,invalidUvArea,invalidUvPercent:100*invalidUvArea/totalArea,oppositeArea,oppositePercent:100*oppositeArea/totalArea,opposite}));
  for(const sample of opposite.filter(t=>t.geometricNormal[2]<-0.9&&t.averageNormal[2]>0.6)) {
    const origin=new T.Vector3(sample.centroid[0],sample.centroid[1],1),direction=new T.Vector3(0,0,-1);
    const every=hits(faces(frame,frame),origin,direction,false),front=hits(faces(frame,frame),origin,direction,true);
    console.log('EXPOSED_RIBBON_PROBE',JSON.stringify({name,xy:sample.centroid.slice(0,2),nearestTwoSided:every.slice(0,4).map(p=>p.z),nearestFrontOnly:front.slice(0,4).map(p=>p.z),missingOuterFront:every.length&&(!front.length||every[0].z-front[0].z>0.001)}));
  }
  const actual=faces(node,frame),crossings=[];
  for(let i=0;i<actual.length;i++)for(let j=i+1;j<actual.length;j++) {
    const a=actual[i],b=actual[j];
    if(a.some(p=>b.some(q=>p.distanceTo(q)<1e-5)))continue;
    if(['x','y','z'].some(k=>Math.max(...a.map(p=>p[k]))<Math.min(...b.map(p=>p[k]))-1e-7||Math.max(...b.map(p=>p[k]))<Math.min(...a.map(p=>p[k]))-1e-7))continue;
    let found;
    for(const [left,right] of [[a,b],[b,a]])for(let k=0;k<3;k++) {
      const delta=left[(k+1)%3].clone().sub(left[k]),length=delta.length(),point=new T.Vector3();
      if(length<1e-8)continue;
      if(new T.Ray(left[k],delta.divideScalar(length)).intersectTriangle(...right,false,point)) {
        const distance=point.distanceTo(left[k]),bary=new T.Triangle(...right).getBarycoord(point,new T.Vector3());
        if(distance>1e-6&&distance<length-1e-6&&Math.min(...bary.toArray())>1e-5)found=point.clone();
      }
    }
    if(found)crossings.push({triangles:[i,j],point:found.toArray()});
  }
  const outsideKnot=crossings.filter(c=>c.point[0]<-0.4||c.point[0]>-0.08||c.point[1]>0.14);
  console.log('RIBBON_SELF_INTERSECTIONS',JSON.stringify({name,nonAdjacentTriangleCrossings:crossings.length,outsideKnotCrossings:outsideKnot.length,examples:outsideKnot.slice(0,5)}));
  if(process.argv.includes('--strict-bow'))assert.equal(outsideKnot.length,0,name+' has non-adjacent surface intersections outside the knot');
}

const frame=doc.createNode('Independent-negative-frame'),buffer=root.listBuffers()[0];
function slab(name,translation) {
  const g=new T.BoxGeometry(2.4,0.1,0.1);g.rotateZ(Math.PI/4);
  const node=doc.createNode(name).setTranslation(translation).setMesh(doc.createMesh().addPrimitive(doc.createPrimitive()
    .setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(g.attributes.position.array).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(g.index.array).setBuffer(buffer))));
  frame.addChild(node);return node;
}
const a=slab('parallel-separated-a',[0,0,0]),b=slab('parallel-separated-b',[-0.3,0.3,0]);
const ba=bounds(faces(a,frame)),bb=bounds(faces(b,frame));
assert.ok(['x','y','z'].every(k=>ba.max[k]>=bb.min[k]&&bb.max[k]>=ba.min[k]));
assert.throws(()=>contact(a,b,frame),{code:'ERR_ASSERTION'});
assert.throws(()=>contact(b,a,frame),{code:'ERR_ASSERTION'});
console.log('NEGATIVE_CONTACT overlapping AABBs with disjoint closed diagonal rods rejected symmetrically');

const materials=JSON.parse(await readFile(new URL('apps/media/sources/student-loan/materials.json',base)));
const n=materials.resolution;
const noise=(x,y)=>((Math.imul(x+materials.surfaces.grainSeed,374761393)^Math.imul(y+17,668265263))>>>0)/4294967295;
for (const [set,file] of [['Cloth','cloth.png'],['Leather','leather.png'],['Paper',null]]) {
  const image=file?await readFile(new URL('apps/media/sources/student-loan/'+file,base)):null;
  const gray=image?await sharp(image).resize(n,n).greyscale().removeAlpha().raw().toBuffer():null;
  const height=(x,y)=>{x=(x+n)%n;y=(y+n)%n;return gray?gray[y*n+x]/255:0.5+(noise(x,y)-0.5)*0.12+Math.sin(y*0.78)*0.025;};
  const normal=Buffer.alloc(n*n*3);
  for (let y=0;y<n;y++) for(let x=0;x<n;x++) {
    const i=(y*n+x)*3,dx=(height(x+1,y)-height(x-1,y))*0.7,dy=(height(x,y+1)-height(x,y-1))*0.7,l=Math.hypot(dx,dy,1);
    normal[i]=Math.round(127.5-dx/l*127.5);normal[i+1]=Math.round(127.5-dy/l*127.5);normal[i+2]=Math.round(127.5+127.5/l);
  }
  const filtered=await sharp(normal,{raw:{width:n,height:n,channels:3}}).resize(256,256).raw().toBuffer();
  for(let i=0;i<filtered.length;i+=3) {
    const v=[0,1,2].map(j=>filtered[i+j]/127.5-1),length=Math.hypot(...v);
    for(let j=0;j<3;j++)filtered[i+j]=Math.round((v[j]/length+1)*127.5);
  }
  const texture=root.listTextures().find(t=>t.getName()==='SL-'+set+'-Normal');
  const {data,info}=await sharp(texture.getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,256);assert.equal(info.height,256);assert.equal(Buffer.compare(data,filtered),0);
  const container=texture.getImage();
  console.log('NORMAL_MAP',JSON.stringify({set,encodedBytes:container.length,width:info.width,height:info.height,codec:Buffer.from(container).toString('ascii',12,16),byteDifferencesFrom256Reference:0,sourcePng:image?await sharp(image).metadata():null}));
}
console.log('MAPS',JSON.stringify(await Promise.all(root.listTextures().map(async t=>({name:t.getName(),bytes:t.getImage().length,...await sharp(t.getImage()).metadata()})))));
for(const m of root.listMaterials()) console.log('MATERIAL',JSON.stringify({name:m.getName(),metallic:m.getMetallicFactor(),roughness:m.getRoughnessFactor(),normalScale:m.getNormalScale(),doubleSided:m.getDoubleSided(),maps:[m.getBaseColorTexture()?.getName(),m.getNormalTexture()?.getName(),m.getMetallicRoughnessTexture()?.getName()],extensions:m.listExtensions().map(e=>e.extensionName)}));

const source=await readFile(new URL('apps/media/scripts/build-refined-student-loan.mjs',base),'utf8');
let callback;
simple(parse(source,{ecmaVersion:'latest',sourceType:'module'}),{CallExpression(n){if(n.callee.name==='saveRefinedHero')callback=n.arguments[2];}});
const callbackSource=source.slice(callback.start,callback.end).replaceAll('import.meta.url',JSON.stringify(new URL('apps/media/scripts/build-refined-student-loan.mjs',base).href));
const effects=[];
let current=10*1024*1024+1;
const lockedPublish=new Function('sizeOf','stat','target','output','writeFile','rename','URL',`return (${callbackSource});`)(async()=>current,async()=>({size:bytes.length}),new URL('apps/web/public/heroes/studentLoan.glb',base),bytes,async()=>effects.push('write'),async()=>effects.push('rename'),URL);
await assert.rejects(lockedPublish(),/public budget changed/);assert.deepEqual(effects,[]);
current=10*1024*1024;await lockedPublish();assert.deepEqual(effects,['write','rename']);
console.log('NEGATIVE_BUDGET actual publication callback rejected cap+1 before writes; exactly cap accepted (mocked file effects only)');

const inventory=JSON.parse(await readFile(new URL('apps/media/hero-models.json',base)));
const prior=JSON.parse(execFileSync('git',['show','HEAD:apps/media/hero-models.json'],{cwd:fileURLToPath(base),encoding:'utf8'}));
assert.deepEqual(inventory.map(r=>r.id),prior.map(r=>r.id));
for(const r of prior.filter(r=>r.id!=='studentLoan')) {
  assert.deepEqual(inventory.find(x=>x.id===r.id),r);
  assert.equal(hash(await readFile(new URL('apps/web/public/heroes/'+r.id+'.glb',base))),r.sha256);
}
let publicBytes=0;
async function size(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),dir);if(e.isDirectory())await size(p);else publicBytes+=(await stat(p)).size;}}
await size(new URL('apps/web/public/',base));
console.log('BUDGET_AND_STABILITY',JSON.stringify({publicBytes,aggregateCap:10*1024*1024,aggregateHeadroom:10*1024*1024-publicBytes,assetHeadroom:0.75*1024*1024-bytes.length,otherRecordsAndArtifactsVerified:9}));

// Re-evaluate the real generator with absolute imports and a non-publishing sink.
// This preserves calculations and encoders, but cannot execute its write callback.
const generatorUrl=new URL('apps/media/scripts/build-refined-student-loan.mjs',base);
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
for(const node of ast.body.filter(n=>n.type==='ImportDeclaration')) {
  const name=node.source.value;
  if(name==='./refined-hero-record.mjs') {
    edits.push({start:node.start,end:node.end,value:'const saveRefinedHero=async(record,paths,publish)=>{globalThis.__reviewRecord=record;};'});
  } else if(!name.startsWith('node:')) {
    const absolute=name.startsWith('.')?new URL(name,generatorUrl).href:pathToFileURL(req.resolve(name)).href;
    edits.push({start:node.source.start,end:node.source.end,value:JSON.stringify(absolute)});
  }
}
simple(ast,{MetaProperty(node){if(node.meta.name==='import'&&node.property.name==='meta'){
  edits.push({start:node.start,end:node.end,value:`({url:${JSON.stringify(generatorUrl.href)}})`});
}}});
let sandboxSource=source;
for(const edit of edits.sort((a,b)=>b.start-a.start))sandboxSource=sandboxSource.slice(0,edit.start)+edit.value+sandboxSource.slice(edit.end);
sandboxSource+='\nexport {output as rebuiltBytes};';
const rebuilt=await import('data:text/javascript;base64,'+Buffer.from(sandboxSource).toString('base64'));
assert.equal(Buffer.compare(bytes,rebuilt.rebuiltBytes),0);
console.log('INDEPENDENT_CPU_REBUILD byte-identical artifact; publication callback disabled',JSON.stringify({sha256:hash(rebuilt.rebuiltBytes),uniqueTriangles,record:globalThis.__reviewRecord}));
