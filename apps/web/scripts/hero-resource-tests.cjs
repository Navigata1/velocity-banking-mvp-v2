/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const THREE=require('three');
const source=fs.readFileSync(path.join(__dirname,'../src/components/hero/HeroModelStage.tsx'),'utf8')+'\nexports.disposeModel=disposeModel;';
const moduleOutput={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
  exports:moduleOutput.exports,module:moduleOutput,require:name=>name==='three'?THREE:name==='react'?require('react'):{},
});
const count={geometry:0,material:0,texture:0,image:0};
const texture=new THREE.Texture({close(){count.image++;}});
texture.addEventListener('dispose',()=>count.texture++);
const geometry=new THREE.BoxGeometry(); geometry.addEventListener('dispose',()=>count.geometry++);
const material=new THREE.MeshStandardMaterial({map:texture,normalMap:texture}); material.addEventListener('dispose',()=>count.material++);
const model=new THREE.Group(); model.add(new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material));
moduleOutput.exports.disposeModel(model);
assert.deepEqual(count,{geometry:1,material:1,texture:1,image:1});
console.log('Hero resource cleanup releases shared geometry, materials, textures and decoded images exactly once.');

const studioSource=fs.readFileSync(path.join(__dirname,'../src/components/hero/studio-environment.ts'),'utf8');
for(const fails of [false,true]) {
  const released={geometry:0,material:0,texture:0,generator:0};
  const target={texture:'environment'}, output={exports:{}};
  class PMREMGenerator {
    fromScene(scene) {
      assert.equal(scene.children.length,5);
      const texture=scene.children[0].material.map;
      texture.addEventListener('dispose',()=>released.texture++);
      for(const mesh of scene.children) {
        mesh.geometry.addEventListener('dispose',()=>released.geometry++);
        mesh.material.addEventListener('dispose',()=>released.material++);
        assert.equal(mesh.material.map,texture);
      }
      if(fails) throw new Error('PMREM failed');
      return target;
    }
    dispose(){released.generator++;}
  }
  vm.runInNewContext(ts.transpileModule(studioSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
    {exports:output.exports,module:output,require:()=>({...THREE,PMREMGenerator})});
  if(fails) assert.throws(()=>output.exports.createHeroEnvironment({}),/PMREM failed/);
  else assert.equal(output.exports.createHeroEnvironment({}),target);
  assert.deepEqual(released,{geometry:5,material:5,texture:1,generator:1});
}
console.log('Shared studio releases all temporary reflection resources on success and failure.');
require('./hero-lifecycle-tests.cjs');
require('./hero-replay-clock-tests.cjs');
