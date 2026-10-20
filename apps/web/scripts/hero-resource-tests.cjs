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
