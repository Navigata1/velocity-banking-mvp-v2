import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
const require=createRequire(new URL('../../web/package.json',import.meta.url)),T=require('three');
async function load(name){
  const module={exports:{}};let source;
  try{source=await readFile(new URL(`../../web/src/components/hero/${name}.ts`,import.meta.url),'utf8');}
  catch(error){if(error.code==='ENOENT')return module.exports;throw error;}
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require,Float64Array});return module.exports;
}
const measurement=await load('hero-geometry-bounds'),math=await load('turntable');
function neededAPI(){assert.equal(typeof measurement.measureHeroRotationBounds,'function','required API: measureHeroRotationBounds(root)');return measurement.measureHeroRotationBounds;}
function geometry(values=[1,0,0,0,1,0,0,0,1]){return new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(values,3));}
function compare(bounds,pairs){
  assert.ok(bounds.profile instanceof Float64Array,'retain precise radial/height pairs');assert.ok(bounds.profile.length>0&&bounds.profile.length%2===0);
  const profile=bounds.profile;let lo=Infinity,hi=-Infinity;for(let i=0;i<profile.length;i+=2)assert.ok(Number.isFinite(profile[i])&&profile[i]>=0&&Number.isFinite(profile[i+1]));
  for(let i=1;i<pairs.length;i+=2){lo=Math.min(lo,pairs[i]);hi=Math.max(hi,pairs[i]);}
  assert.ok(Math.abs(bounds.minY-lo)<2e-6,'transformed minimum Y');assert.ok(Math.abs(bounds.maxY-hi)<2e-6,'transformed maximum Y');
  for(let k=0;k<64;k++){
    const a=Math.cos(k*Math.PI/32),b=Math.sin(k*Math.PI/32);let actual=-Infinity,expected=-Infinity;
    for(let i=0;i<profile.length;i+=2)actual=Math.max(actual,a*profile[i]+b*profile[i+1]);
    for(let i=0;i<pairs.length;i+=2)expected=Math.max(expected,a*pairs[i]+b*pairs[i+1]);
    assert.ok(Math.abs(actual-expected)<3e-6,`radial/height correlation support ${k}: ${actual} != ${expected}`);
  }
}
test('measurement ignores unreferenced far vertices and stale geometry boxes',()=>{
  const measure=neededAPI(),g=geometry([1,0,0,0,2,0,0,0,3,1000,1000,1000]);g.setIndex([0,1,2,0,1,2]);g.computeBoundingBox();
  compare(measure(new T.Mesh(g)),[1,0,0,2,3,0]);
});
test('measurement includes ancestor and node TRS about world origin without cached matrices',()=>{
  const measure=neededAPI(),parent=new T.Group(),root=new T.Group(),mesh=new T.Mesh(geometry());parent.add(root);root.add(mesh);
  parent.position.set(5,7,11);parent.rotation.z=Math.PI/2;parent.scale.set(2,3,4);
  mesh.position.set(1,2,3);mesh.rotation.y=Math.PI/2;mesh.scale.set(2,1,3);
  compare(measure(root),[Math.sqrt(226),9,Math.sqrt(545),9,Math.sqrt(530),15]);
});
test('measurement includes every instance TRS beneath a rotated nonuniform parent',()=>{
  const measure=neededAPI(),parent=new T.Group(),mesh=new T.InstancedMesh(geometry(),new T.MeshBasicMaterial(),2);parent.add(mesh);
  parent.position.set(5,7,11);parent.rotation.z=Math.PI/2;parent.scale.set(2,3,4);mesh.position.set(1,2,3);
  mesh.setMatrixAt(0,new T.Matrix4().compose(new T.Vector3(2,3,4),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2),new T.Vector3(2,1,3)));
  mesh.setMatrixAt(1,new T.Matrix4().makeTranslation(-1,-2,-3));
  compare(measure(parent),[Math.sqrt(1061),13,Math.sqrt(1690),13,Math.sqrt(1621),19,Math.sqrt(146),9,Math.sqrt(125),7,Math.sqrt(250),7]);
});
for(const kind of ['empty','NaN','Infinity','skin','morph'])test(`measurement rejects unsupported ${kind} geometry`,()=>{
  const measure=neededAPI(),g=geometry(),root=kind==='empty'?new T.Group():kind==='skin'?new T.SkinnedMesh(g):new T.Mesh(g);
  if(kind==='NaN'||kind==='Infinity')g.attributes.position.setY(0,Number(kind));
  if(kind==='morph')g.morphAttributes.position=[g.attributes.position.clone()];
  assert.throws(()=>measure(root),undefined,`${kind} must not silently produce usable camera bounds`);
});
const pins={
  car:'5d7fb0b2aa1457ce7e0013d3b7e04ba6568c3dd21941dc5df05a3bf969489225',
  house:'ec008a1681930595a11579c6b19a1c02377d3211aea8a36b03e2aff9bd244f33',
  land:'4b09041fd2f952a7cddef196d9a2078360194913e1ff175ef96b89c5ff7aa3de',
  creditCard:'b3f08cc7e2e081deee13f86f88bdc02a7ff7b46ac97beb3155d4f5c4b4188025',
  studentLoan:'56dfe51ad199bdafcc0cc5ced65321a16a4e087693f645d6d12c6bc14fb98d12',
  medical:'b6df483391ee3d552f8a128ab8327484d833754f6a907e7fa0899eca5dd6c615',
  personal:'e079fc7b95c562fa6180434491cf3511d54fbf79cb155bf1d89c822bafe77b79',
  recreation:'c7ce5658eefd0e928ea857e70ca35803e2812308032a071cdcb82412434f41a7',
  custom:'2753182d024be862fc7ab5e5b18100cc6a7bbcc736213471b4a6e2083517aa7b',
  vault:'6846a098bbdd974f89101de68548e90bced312991745eae88549a3a6f9129594',
};
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
// NodeIO world matrices supply expectations; Three independently composes the graph's local matrices.
function decodedGraph(document){
  const root=new T.Group(),pairs=[];
  function walk(node,parent){
    assert.equal(node.getSkin(),null);const group=new T.Group();group.matrix.fromArray(node.getMatrix());group.matrixAutoUpdate=false;parent.add(group);
    const batch=node.getExtension('EXT_mesh_gpu_instancing'),count=batch?.listAttributes()[0]?.getCount()??1,instances=[];
    for(let i=0;i<count;i++){
      const matrix=new T.Matrix4();if(batch)matrix.compose(new T.Vector3().fromArray(batch.getAttribute('TRANSLATION')?.getElement(i,[])??[0,0,0]),new T.Quaternion().fromArray(batch.getAttribute('ROTATION')?.getElement(i,[])??[0,0,0,1]),new T.Vector3().fromArray(batch.getAttribute('SCALE')?.getElement(i,[])??[1,1,1]));
      instances.push(new T.Matrix4().fromArray(new Float32Array(matrix.elements)));
    }
    for(const primitive of node.getMesh()?.listPrimitives()??[]){
      assert.equal(primitive.getMode(),4);assert.equal(primitive.listTargets().length,0);
      const position=primitive.getAttribute('POSITION'),index=primitive.getIndices(),values=[];
      for(let i=0;i<position.getCount();i++)values.push(...position.getElement(i,[]));
      const g=geometry(values);if(index)g.setIndex(Array.from(index.getArray()));
      const mesh=batch?new T.InstancedMesh(g,new T.MeshBasicMaterial(),count):new T.Mesh(g);group.add(mesh);
      const referenced=index?[...new Set(index.getArray())]:Array.from({length:position.getCount()},(_,i)=>i);
      instances.forEach((instance,i)=>{
        if(batch)mesh.setMatrixAt(i,instance);const world=new T.Matrix4().fromArray(node.getWorldMatrix()).multiply(instance);
        for(const vertex of referenced){const p=new T.Vector3().fromArray(position.getElement(vertex,[])).applyMatrix4(world);pairs.push(Math.hypot(p.x,p.z),p.y);}
      });
    }
    node.listChildren().forEach(child=>walk(child,group));
  }
  const scene=document.getRoot().getDefaultScene();assert.ok(scene,'actual default scene required');scene.listChildren().forEach(node=>walk(node,root));return {root,pairs};
}
function frustumWitnesses(bounds,pairs,aspect){
  const distance=math.heroFrameDistance(bounds,aspect);assert.ok(Number.isFinite(distance)&&distance>0);
  const target=new T.Vector3(0,(bounds.minY+bounds.maxY)/2,0),camera=new T.PerspectiveCamera(32,aspect,0.1,50);
  camera.position.copy(target).add(new T.Vector3(3.3,1.35,4.8).normalize().multiplyScalar(distance));camera.lookAt(target);camera.updateMatrixWorld(true);
  const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  for(const plane of frustum.planes){
    const n=plane.normal,h=Math.hypot(n.x,n.z);let minimum=Infinity,witness;
    for(let i=0;i<pairs.length;i+=2){const value=n.y*pairs[i+1]+plane.constant-h*pairs[i];if(value<minimum){minimum=value;witness=[pairs[i],pairs[i+1]];}}
    assert.ok(minimum>=-2e-6,`full-yaw plane at aspect ${aspect}: ${minimum}`);
    const point=new T.Vector3(-witness[0]*n.x/h,witness[1],-witness[0]*n.z/h).project(camera);
    assert.ok([point.x,point.y,point.z].every(v=>Number.isFinite(v)&&Math.abs(v)<=1+2e-6),'independent projected worst-plane witness');
  }
}
for(const [name,pin] of Object.entries(pins))test(`${name}: pinned referenced GLB geometry measures and fits every yaw`,async()=>{
  const bytes=await readFile(new URL(`../../web/public/heroes/${name}.glb`,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),pin);
  const {root,pairs}=decodedGraph(await io.readBinary(bytes)),bounds=neededAPI()(root);compare(bounds,pairs);
  for(const aspect of [0.2,0.25,9/16,1,1.3,725.333333/420,16/9,1920/920,3])frustumWitnesses(bounds,pairs,aspect);
});
