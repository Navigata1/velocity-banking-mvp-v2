import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require=createRequire(new URL('../../web/package.json',import.meta.url)),T=require('three');
const source=await readFile(new URL('../../web/src/components/hero/turntable.ts',import.meta.url),'utf8');
const output={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:output,exports:output.exports,RangeError});
const fit=output.exports.heroFrameDistance;
const ring=(radius,height)=>({minY:-height,maxY:height,profile:new Float64Array([radius,-height,radius,height])});

// Independent Three projection, not the fitter's support-plane equations.
function contained(bounds,distance,aspect){
  assert.ok(Number.isFinite(distance)&&distance>0,'finite positive camera distance');
  const target=new T.Vector3(0,(bounds.minY+bounds.maxY)/2,0),camera=new T.PerspectiveCamera(32,aspect,0.1,50);
  camera.position.copy(target).add(new T.Vector3(3.3,1.35,4.8).normalize().multiplyScalar(distance));camera.lookAt(target);camera.updateMatrixWorld(true);
  for(let i=0;i<bounds.profile.length;i+=2)for(let degree=0;degree<360;degree+=0.5){
    const angle=degree*Math.PI/180,point=new T.Vector3(bounds.profile[i]*Math.cos(angle),bounds.profile[i+1],bounds.profile[i]*Math.sin(angle));
    const depth=-point.clone().applyMatrix4(camera.matrixWorldInverse).z,ndc=point.project(camera);
    assert.ok([depth,ndc.x,ndc.y,ndc.z].every(Number.isFinite),'finite projected geometry');
    assert.ok(depth>=0.1&&depth<50,'near/far clipping');
    assert.ok(Math.abs(ndc.x)<1&&Math.abs(ndc.y)<1,'full-turn side clipping');
  }
}
for(const[name,r,h,aspect,want]of[
  ['flat video',2,0.1,16/9,4.755314655],['flat portrait',2,0.1,9/16,13.580365431],
  ['flat mobile',2,0.1,1.3,6.189097171],['tall video',0.15,2,16/9,7.856250467],
  ['balanced portrait',1,1,9/16,7.021830378],['balanced video',1,1,16/9,5.327798314],
])test(`Hero orbit fit contains ${name} through a complete revolution`,()=>{
  const bounds=ring(r,h),distance=fit(bounds,aspect);
  assert.ok(Number.isFinite(distance),'fit must use the supplied rotation profile');
  assert.ok(Math.abs(distance-want)<1e-8,'independently derived support distance');contained(bounds,distance,aspect);
});
test('Hero orbit fit retains radius/height correlation instead of inflating every point to a cylinder',()=>{
  const bounds={minY:-2,maxY:2,profile:new Float64Array([2,0,0.1,-2,0.1,2])},distance=fit(bounds,16/9);
  assert.ok(distance>7.5&&distance<8,'thin top and bottom must not inherit the widest middle radius');
  assert.ok(distance<fit(ring(2,2),16/9)*0.8);contained(bounds,distance,16/9);
});
test('Hero orbit fit uses the real narrow aspect instead of a clipping aspect floor',()=>{
  const bounds=ring(1,0.1);contained(bounds,fit(bounds,0.2),0.2);
});
test('Hero orbit fit guards tiny geometry against near-plane clipping',()=>{
  const bounds=ring(0.00001,0.00001),distance=fit(bounds,1.3);assert.ok(distance<0.11);contained(bounds,distance,1.3);
});
test('Hero orbit fit rejects nonfinite, empty and inconsistent geometry or aspects',()=>{
  const valid=ring(1,1);
  for(const aspect of [0,-1,NaN,Infinity,-Infinity])assert.throws(()=>fit(valid,aspect),{name:'RangeError'});
  for(const invalid of[
    {...valid,minY:NaN},{...valid,maxY:Infinity},{...valid,minY:2,maxY:1},
    {...valid,profile:[]},{...valid,profile:[1,0,2]},{...valid,profile:[NaN,0]},
    {...valid,profile:[Infinity,0]},{...valid,profile:[-1,0]},
    {...valid,profile:[1,Infinity]},{...valid,profile:[1,2]},ring(0,0),
  ])assert.throws(()=>fit(invalid,1.3),{name:'RangeError'});
});
test('Hero orbit fit refuses a frame that cannot fit inside the unchanged far plane',()=>{
  assert.throws(()=>fit(ring(2,1),0.01),{name:'RangeError'});
  assert.throws(()=>fit(ring(10,10),1.3),{name:'RangeError'},'a relaxed 100-unit far plane must not be silently accepted');
});
test('Hero projection verifier rejects clipped, nonfinite and orthographic-fit mutations',()=>{
  const bounds=ring(2,0.1),distance=fit(bounds,16/9);contained(bounds,distance,16/9);
  for(const bad of [NaN,Infinity,-Infinity,0,-1,distance*0.5,4.237208549])assert.throws(()=>contained(bounds,bad,16/9),{code:'ERR_ASSERTION'});
});
