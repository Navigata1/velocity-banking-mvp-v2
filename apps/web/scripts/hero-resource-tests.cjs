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
const baseCards=[[5,7,[-4,1,5],2.4],[2,5,[5,2,2],1.7],[4,2,[0,-2,4],1],
  [6,1.5,[0,5,0],4],[1.5,4,[-2,2,-5],2.5]];
const strip=[1.5,3,[3.73215474204762,-2.468225341834624,3.997359709025046],1.2];
const heroPaths=['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault'].map(id=>`/heroes/${id}.glb`);
for(const modelPath of [undefined,...heroPaths,'/heroes/unknown.glb','/heroes/CreditCard.glb','/heroes/creditCard.glb?x=1','creditCard.glb']) {
  for(const fails of [false,true]) {
    const expected=modelPath==='/heroes/creditCard.glb'?[...baseCards,strip]:baseCards;
    const released={geometry:0,material:0,texture:0,generator:0},target={},output={exports:{}};
    class PMREMGenerator {
      fromScene(scene,...parameters) {
        assert.deepEqual(parameters,[.025,.1,30]);
        assert.equal(scene.background.getHexString(),'15191c');
        assert.equal(scene.children.length,expected.length,`${modelPath}: Card-only strip`);
        const diffusion=scene.children[0].material.map;
        assert.equal(diffusion.image.width,64);assert.equal(diffusion.image.height,64);
        assert.equal(diffusion.minFilter,THREE.LinearFilter);assert.equal(diffusion.magFilter,THREE.LinearFilter);
        const pixels=diffusion.image.data;
        for(let y=0;y<64;y++)for(let x=0;x<64;x++) {
          const at=(y*64+x)*4;
          const value=Math.round(255*Math.pow(Math.sin(Math.PI*(x+.5)/64)*Math.sin(Math.PI*(y+.5)/64),.6));
          assert.deepEqual(Array.from(pixels.slice(at,at+4)),[value,value,value,255]);
        }
        diffusion.addEventListener('dispose',()=>released.texture++);
        for(const [i,mesh]of scene.children.entries()) {
          const [width,height,position,intensity]=expected[i];
          assert.equal(mesh.geometry.parameters.width,width);assert.equal(mesh.geometry.parameters.height,height);
          assert.deepEqual(mesh.position.toArray(),position);
          const orientation=new THREE.Object3D();orientation.position.fromArray(position);orientation.lookAt(0,1,0);
          assert.deepEqual(mesh.quaternion.toArray(),orientation.quaternion.toArray());
          assert.deepEqual(mesh.material.color.toArray(),[intensity,intensity,intensity]);
          assert.equal(mesh.material.map,diffusion);assert.equal(mesh.material.side,THREE.DoubleSide);
          mesh.geometry.addEventListener('dispose',()=>released.geometry++);
          mesh.material.addEventListener('dispose',()=>released.material++);
        }
        if(fails)throw new Error('Profile PMREM failed');
        return target;
      }
      dispose(){released.generator++;}
    }
    vm.runInNewContext(ts.transpileModule(studioSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
      {exports:output.exports,module:output,require:()=>({...THREE,PMREMGenerator})});
    if(fails)assert.throws(()=>output.exports.createHeroEnvironment({},modelPath),/Profile PMREM failed/);
    else assert.equal(output.exports.createHeroEnvironment({},modelPath),target);
    assert.deepEqual(released,{geometry:expected.length,material:expected.length,texture:1,generator:1});
  }
}
console.log('Card-only studio: all ten paths, unknown/default controls, unchanged base room and complete temporary cleanup pass.');
require('./hero-lifecycle-tests.cjs');
require('./hero-replay-clock-tests.cjs');
require('./hero-material-tests.cjs');
