import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parse} from '../../../apps/media/node_modules/acorn/dist/acorn.mjs';
import {Document} from '../../../apps/media/node_modules/@gltf-transform/core/dist/index.js';
import {EXTMeshGPUInstancing} from '../../../apps/media/node_modules/@gltf-transform/extensions/dist/index.js';
import * as T from '../../../apps/web/node_modules/three/build/three.module.js';
import {doc,named,pins,mesh,topology,closest,finiteHits,bounds,intersections,rings} from './review-geometry-probe.mjs';
const source=await readFile(new URL('../../../apps/media/scripts/recreation-refinement.test.mjs',import.meta.url),'utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),wanted=['sceneNodes','faces','bounds','hits','solid','distance','contactFaces','aperture','fixtureNode','cloth'];
const fragments=ast.body.filter(n=>n.type==='FunctionDeclaration'&&wanted.includes(n.id.name)).map(n=>source.slice(n.start,n.end));
for(const variable of ['key','contact']){const statement=ast.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===variable));fragments.push(source.slice(statement.start,statement.end));}
const callback=ast.body.find(n=>n.type==='ExpressionStatement'&&n.expression.callee?.name==='test'&&n.expression.arguments[0].value.startsWith('Recreation physical seam')).expression.arguments[1];
const env={assert,Matrix3:T.Matrix3,Matrix4:T.Matrix4,Quaternion:T.Quaternion,Vector3:T.Vector3,Ray:T.Ray,Triangle:T.Triangle,BoxGeometry:T.BoxGeometry,CylinderGeometry:T.CylinderGeometry,recreation:async()=>({named})};
const h=new Function(...Object.keys(env),fragments.join('\n')+'\nreturn {'+wanted.join(',')+',seamTest:'+source.slice(callback.start,callback.end)+'};')(...Object.values(env));
console.log('PINS',JSON.stringify(pins));
const checks=[];function check(name,fn){try{fn();checks.push({name,status:'PASS'});}catch(e){checks.push({name,status:'FAIL',error:e.stack});}}
const d=new Document(),box=(size,at=[0,0,0])=>h.faces(h.fixtureNode(d,new T.BoxGeometry(...size)).setTranslation(at),null),tri=points=>points.map(p=>new T.Vector3(...p));
check('finite edge crossing true contact',()=>h.contactFaces(box([4,.2,.4]),box([.4,4,.2])));
for(const [label,a,b]of [['nested solids',box([.2,.2,.2]),box([2,2,2])],['unbounded extension',box([4,.2,.4]),box([.4,4,.2],[0,0,5])],['coplanar separated overlapping AABB',[tri([[0,0,0],[2,0,0],[0,2,0]])],[tri([[2,2,0],[2,.6,0],[.6,2,0]])]]])check(label+' rejects',()=>assert.throws(()=>h.contactFaces(a,b),{code:'ERR_ASSERTION'}));
check('open nested skins reject no parity',()=>{const inner=h.faces(h.fixtureNode(d,new T.CylinderGeometry(.6,.6,2,24,1,true))),outer=h.faces(h.fixtureNode(d,new T.CylinderGeometry(1,1,2,24,1,true)));assert.throws(()=>h.contactFaces(inner,outer),{code:'ERR_ASSERTION'});});
check('closed wrong winding rejects',()=>assert.throws(()=>h.solid(box([1,1,1]).map(t=>[t[2],t[1],t[0]])),{code:'ERR_ASSERTION'}));
check('one missing triangle rejects',()=>assert.throws(()=>h.solid(box([1,1,1]).slice(1)),{code:'ERR_ASSERTION'}));
// A known limitation: directed closure plus aggregate volume is not per-component orientation.
let mixedAccepted=false;try{h.solid([...box([2,2,2]),...box([.2,.2,.2],[4,0,0]).map(t=>[t[2],t[1],t[0]])]);mixedAccepted=true;}catch{}
console.log('HELPER_LIMITATION',JSON.stringify({mixedOrientationDisconnectedSolidsAccepted:mixedAccepted,actualCandidateSolidPartsCheckedIndividually:true}));
check('normalized accessor decoded',()=>{const node=d.createNode(),buffer=d.createBuffer(),pos=d.createAccessor().setType('VEC3').setArray(new Uint16Array([0,0,0,65535,0,0,0,65535,0])).setNormalized(true).setBuffer(buffer);node.setMesh(d.createMesh().addPrimitive(d.createPrimitive().setAttribute('POSITION',pos)));assert.equal(h.faces(node)[0][1].x,1);});
check('nonuniform scale inverse-transpose',()=>{const node=h.fixtureNode(d,new T.BoxGeometry(1,1,1).rotateZ(Math.PI/4)).setScale([2,1,1]),n=h.faces(node,null)[0].normals[0];assert.ok(n.distanceTo(new T.Vector3(1/Math.sqrt(5),2/Math.sqrt(5),0))<1e-6);});
check('GPU scale rotation translation expands',()=>{const node=h.fixtureNode(d,new T.BoxGeometry(.02,.10,.04)),buffer=d.createBuffer(),accessor=(type,array)=>d.createAccessor().setType(type).setArray(new Float32Array(array)).setBuffer(buffer),batch=d.createExtension(EXTMeshGPUInstancing).createInstancedMesh().setAttribute('TRANSLATION',accessor('VEC3',[0,0,0,1,0,0,2,0,0])).setAttribute('SCALE',accessor('VEC3',[1,1,1,1,2,1,3,1,1])).setAttribute('ROTATION',accessor('VEC4',[0,0,0,1,0,0,0,1,0,0,Math.SQRT1_2,Math.SQRT1_2]));node.setExtension('EXT_mesh_gpu_instancing',batch);const ts=h.faces(node),b=h.bounds(ts);assert.equal(ts.length,36);assert.ok(Math.abs(b.max.x-2.05)<1e-6&&Math.abs(b.max.y-.1)<1e-6);});
await h.seamTest();console.log('CURRENT_STANDING_SEAM_TEST','PASS');
for(const name of ['R-Main-Seams','R-Jib-Seams']){
  const node=named(name),old=node.getTranslation();node.setTranslation([old[0],old[1],old[2]+.006]);let accepted=false,error=null;
  try{await h.seamTest();accepted=true;}catch(e){error=e.message;}
  const sailName=name==='R-Main-Seams'?'R-Mainsail':'R-Jib',surface=mesh(sailName),threads=mesh(name),distances=threads.flat().map(p=>closest(p,surface).d);
  const crossings=intersections(threads,surface,1),ringClearance=topology(threads).components.flatMap(c=>rings(c).map(r=>closest(r.center,surface).d-r.radius));
  console.log('SEAM_FLOAT_MUTATION',JSON.stringify({name,deltaZ:.006,standingTestAccepted:accepted,error,minVertexSurfaceGap:Math.min(...distances),maxVertexSurfaceGap:Math.max(...distances),actualTriangleCrossings:crossings.length,minRingCenterMinusRadius:Math.min(...ringClearance)}));assert.equal(crossings.length,0);assert.ok(Math.min(...ringClearance)>0);node.setTranslation(old);
}
// An actionable red reproducer; catch and retain instead of aborting unrelated checks.
try{const bb=bounds(mesh('R-Boom')),center=bb.getCenter(new T.Vector3());assert.equal(finiteHits(mesh('R-Cabin-Roof'),new T.Vector3(bb.min.x,center.y,center.z),new T.Vector3(bb.max.x,center.y,center.z)).length,0,'actual decoded boom centerline must not run through cabin roof');console.log('CANDIDATE_CLEARANCE','PASS');}catch(e){console.log('CONFIRMED_CANDIDATE_RED',e.stack);}
console.log('HELPER_CONTROLS',JSON.stringify(checks));assert.ok(checks.every(c=>c.status==='PASS'));
console.log('END_PINS',JSON.stringify(pins));
