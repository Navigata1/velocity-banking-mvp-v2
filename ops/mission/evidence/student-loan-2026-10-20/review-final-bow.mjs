import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const base=new URL('../../../',import.meta.url);
const require=createRequire(new URL('apps/media/package.json',base));
const load=async name=>import(pathToFileURL(require.resolve(name)).href);
const {NodeIO}=await load('@gltf-transform/core');
const {ALL_EXTENSIONS}=await load('@gltf-transform/extensions');
const {MeshoptDecoder}=await load('meshoptimizer');
const {parse}=await load('acorn');
const {simple}=await load('acorn-walk');
const T=await import(new URL('apps/web/node_modules/three/build/three.module.js',base));
await MeshoptDecoder.ready;
const bytes=await readFile(new URL('apps/web/public/heroes/studentLoan.glb',base));
const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(bytes);
const root=document.getRoot(),named=name=>root.listNodes().find(n=>n.getName()===name);
const source=await readFile(new URL('apps/media/scripts/student-loan-refinement.test.mjs',base),'utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const helpers=source.slice(source.indexOf('function faces('),source.indexOf("test('Student Loan"));
const declarations=ast.body.filter(n=>n.type==='FunctionDeclaration'&&n.id.name==='surfaceCrossings').map(n=>source.slice(n.start,n.end)).join('\n');
const callbacks=new Map();
simple(ast,{CallExpression(n){if(n.callee.name==='test'&&typeof n.arguments[0]?.value==='string')callbacks.set(n.arguments[0].value,source.slice(n.arguments[1].start,n.arguments[1].end));}});
const context={student:async()=>({document,root,named}),assert,Matrix3:T.Matrix3,Matrix4:T.Matrix4,Vector3:T.Vector3,Ray:T.Ray,Triangle:T.Triangle};
const compile=callback=>new Function(...Object.keys(context),helpers+'\n'+declarations+'\nreturn ('+callback+');')(...Object.values(context));
const regression=compile(callbacks.get('Student Loan bow surfaces do not cross or invert outside their tied knot'));
const shapeTest=compile(callbacks.get('Student Loan bow has volumetric loops with real holes and connected knot, band and tails'));
const {faces}=new Function(...Object.keys(context),helpers+'\nreturn {faces};')(...Object.values(context));
await regression();await shapeTest();

function closedOutward(ts) {
  const edges=new Map(),key=p=>p.toArray().map(v=>Math.round(v*1e5)).join(',');
  let volume=0;
  for(const [a,b,c]of ts) {
    volume+=a.dot(b.clone().cross(c))/6;
    const ids=[a,b,c].map(key);assert.equal(new Set(ids).size,3);
    for(let i=0;i<3;i++) {
      const x=ids[i],y=ids[(i+1)%3],key=[x,y].sort().join('|'),value=edges.get(key)??[0,0];
      value[0]++;value[1]+=x<y?1:-1;edges.set(key,value);
    }
  }
  assert.ok([...edges.values()].every(([n,w])=>n===2&&w===0),'open/nonmanifold/inconsistently wound surface');
  assert.ok(volume>0,'inward signed volume');
  return volume;
}
for(const side of ['Left','Right'])for(const part of ['Loop','Tail']) {
  const name='SL-Bow-'+side+'-'+part;
  console.log('CLOSED_OUTWARD',JSON.stringify({name,signedVolumeInDiplomaFrame:closedOutward(faces(named(name),named('SL-Diploma')))}));
}

const generator=await readFile(new URL('apps/media/scripts/build-refined-student-loan.mjs',base),'utf8');
const ribbonSource=generator.slice(generator.indexOf('function ribbon('),generator.indexOf('// Elliptic turns'));
const ribbon=new Function('T','add','diploma','satin',ribbonSource+'\nreturn ribbon;')(T,(parent,name,g)=>g,{},{});
const oldPoints={Left:[[-0.26,0.055,0.19],[-0.57,0.26,0.23],[-0.73,0.2,0.25],[-0.5,0.095,0.23],[-0.26,0.055,0.19]],Right:[[-0.22,0.055,0.19],[0.1,0.26,0.24],[0.34,0.18,0.25],[0.05,0.075,0.22],[-0.22,0.055,0.19]]};
for(const side of ['Left','Right']) {
  const node=named('SL-Bow-'+side+'-Loop'),old={mesh:node.getMesh(),translation:[...node.getTranslation()],rotation:[...node.getRotation()],scale:[...node.getScale()]};
  const g=ribbon('old',oldPoints[side],side==='Left'?0.105:0.11),buffer=root.listBuffers()[0];
  const primitive=document.createPrimitive().setAttribute('POSITION',document.createAccessor().setType('VEC3').setArray(g.attributes.position.array).setBuffer(buffer))
    .setAttribute('NORMAL',document.createAccessor().setType('VEC3').setArray(g.attributes.normal.array).setBuffer(buffer))
    .setIndices(document.createAccessor().setType('SCALAR').setArray(g.index.array).setBuffer(buffer));
  node.setMesh(document.createMesh().addPrimitive(primitive)).setTranslation([0,0,0]).setRotation([0,0,0,1]).setScale([1,1,1]);
  try {
    await assert.rejects(regression(),error=>error.code==='ERR_ASSERTION'&&error.message.includes(side+' loop self-intersects'));
    console.log('MUTATION_REJECTED old '+side+' CatmullRom loop');
  } finally {node.setMesh(old.mesh).setTranslation(old.translation).setRotation(old.rotation).setScale(old.scale);}
}

const node=named('SL-Bow-Left-Loop'),primitive=node.getMesh().listPrimitives()[0];
// Deduplicated accessors can be shared by the other loop; isolate this mutation.
const ix=primitive.getIndices().clone().setArray(primitive.getIndices().getArray().slice());
const normal=primitive.getAttribute('NORMAL').clone().setArray(primitive.getAttribute('NORMAL').getArray().slice());
primitive.setIndices(ix).setAttribute('NORMAL',normal);
const originalIndices=ix.getArray().slice(),originalNormals=normal.getArray().slice();
const actual=faces(node,named('SL-Diploma'));
const face=actual.findIndex(t=>{
  const p=t.reduce((s,p)=>s.add(p),new T.Vector3()).divideScalar(3);
  return (p.x<-0.45||p.y>0.16)&&t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])).lengthSq()>1e-12;
});
assert.ok(face>=0);
const restore=()=>{ix.setArray(originalIndices.slice());normal.setArray(originalNormals.slice());};
try {
  const changed=originalIndices.slice();[changed[face*3+1],changed[face*3+2]]=[changed[face*3+2],changed[face*3+1]];ix.setArray(changed);
  await assert.rejects(regression(),error=>error.code==='ERR_ASSERTION'&&error.message.includes('inverted face/normal'));
  console.log('MUTATION_REJECTED single winding flip');
}finally{restore();}
try {
  for(const vertex of new Set(originalIndices.slice(face*3,face*3+3)))normal.setElement(vertex,normal.getElement(vertex,[]).map(v=>-v));
  await assert.rejects(regression(),error=>error.code==='ERR_ASSERTION'&&error.message.includes('inverted face/normal'));
  console.log('MUTATION_REJECTED encoded normal reversal');
}finally{restore();}

// Bound the guarantee: relative agreement alone does not prove absolute outwardness.
try {
  const changed=originalIndices.slice();for(let i=0;i<changed.length;i+=3)[changed[i+1],changed[i+2]]=[changed[i+2],changed[i+1]];ix.setArray(changed);
  for(let i=0;i<normal.getCount();i++)normal.setElement(i,normal.getElement(i,[]).map(v=>-v));
  await regression();await shapeTest();
  assert.throws(()=>closedOutward(faces(node,named('SL-Diploma'))),/inward signed volume/);
  console.log('COVERAGE_LIMIT jointly inverted winding+normals passes supplied bow tests; independent signed-volume check rejects');
}finally{restore();}
try {
  const changed=new originalIndices.constructor(originalIndices.length-3);
  changed.set(originalIndices.subarray(0,face*3));changed.set(originalIndices.subarray(face*3+3),face*3);ix.setArray(changed);
  await regression();await shapeTest();
  assert.throws(()=>closedOutward(faces(node,named('SL-Diploma'))),/open\/nonmanifold/);
  console.log('COVERAGE_LIMIT missing single triangle passes supplied bow tests; independent closure check rejects');
}finally{restore();}
await regression();await shapeTest();
console.log('FINAL_REVIEW_PASS current decoded bow is closed/outward; original bad curves and isolated orientation mutations rejected; no disk artifact changes');
