/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript'),THREE=require('three');
const source=fs.readFileSync(path.join(__dirname,'../src/components/hero/hero-materials.ts'),'utf8'),output={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:output,exports:output.exports,require:()=>THREE});
const {refineHeroMaterials}=output.exports;
function fixture(names=['Paint 1 Carmine','Paint 2 Carmine','Brake']){
  const scene=new THREE.Group(),geometry=new THREE.BoxGeometry(),map=new THREE.Texture();
  const materials=names.map(name=>new THREE.MeshPhysicalMaterial({name,normalMap:map,normalScale:new THREE.Vector2(.3,-.3),roughness:.25,metalness:1,clearcoat:1,clearcoatRoughness:0,anisotropy:.65}));
  for(const m of materials)scene.add(new THREE.Mesh(geometry,m),new THREE.Mesh(geometry,[m,m]));
  return {scene,materials,geometry,map};
}
const snapshot=m=>({normalMap:m.normalMap,roughness:m.roughness,metalness:m.metalness,clearcoat:m.clearcoat,clearcoatRoughness:m.clearcoatRoughness,color:m.color.toArray()});
const tests=[
  ['Car refines each unique paint once and preserves every other factor',()=>{
    const f=fixture(),before=f.materials.map(snapshot),geometry=Array.from(f.geometry.attributes.position.array);
    refineHeroMaterials(f.scene,'/heroes/car.glb');
    assert.deepEqual(f.materials.map(m=>m.normalScale.toArray()),[[.15,-.15],[.15,-.15],[.3,-.3]]);
    assert.deepEqual(f.materials.map(snapshot),before);assert.deepEqual(Array.from(f.geometry.attributes.position.array),geometry);
  }],
  ['Repeated Car application cannot compound paint reduction',()=>{
    const f=fixture();for(let n=0;n<8;n++)refineHeroMaterials(f.scene,'/heroes/car.glb');
    assert.deepEqual(f.materials[0].normalScale.toArray(),[.15,-.15]);
  }],
  ['Authored zeros and normal handedness survive refinement',()=>{
    const f=fixture();f.materials[0].normalScale.set(0,-0);f.materials[1].normalScale.set(-.4,.2);
    refineHeroMaterials(f.scene,'/heroes/car.glb');
    assert.deepEqual(f.materials[0].normalScale.toArray(),[0,-0]);assert.deepEqual(f.materials[1].normalScale.toArray(),[-.2,.1]);
  }],
  ['Other and unknown model paths keep every material unchanged',()=>{
    for(const id of ['house','land','studentLoan','medical','personal','recreation','custom','vault','unknown']){
      const f=fixture(),before=f.materials.map(m=>m.toJSON());refineHeroMaterials(f.scene,`/heroes/${id}.glb`);assert.deepEqual(f.materials.map(m=>m.toJSON()),before);
    }
  }],
  ['Missing paint targets fail before mutating valid materials',()=>{
    const f=fixture();f.materials[1].name='Paint_2_Carmine';
    assert.throws(()=>refineHeroMaterials(f.scene,'/heroes/car.glb'),/paint/);assert.deepEqual(f.materials[0].normalScale.toArray(),[.3,-.3]);
  }],
  ['Invalid later paint bindings fail atomically and may be repaired',()=>{
    for(const value of [NaN,Infinity,-Infinity]){
      const f=fixture();f.materials[1].normalScale.x=value;
      assert.throws(()=>refineHeroMaterials(f.scene,'/heroes/car.glb'),/paint/);assert.deepEqual(f.materials[0].normalScale.toArray(),[.3,-.3]);
      f.materials[1].normalScale.x=.3;refineHeroMaterials(f.scene,'/heroes/car.glb');assert.deepEqual(f.materials[0].normalScale.toArray(),[.15,-.15]);
    }
    const f=fixture();f.materials[1].normalMap=null;assert.throws(()=>refineHeroMaterials(f.scene,'/heroes/car.glb'),/paint/);assert.deepEqual(f.materials[0].normalScale.toArray(),[.3,-.3]);
  }],
  ['Card refines only brushed silver and preserves maps, grain and other alloys',()=>{
    const f=fixture(['CC-Brushed-Silver','CC-Emerald-Metal','CC-Turned-Silver']);f.materials[1].anisotropy=.5;f.materials[2].anisotropy=.25;
    const before=f.materials.map(m=>({factors:snapshot(m),normal:m.normalScale.toArray()}));
    refineHeroMaterials(f.scene,'/heroes/creditCard.glb');
    assert.deepEqual(f.materials.map(m=>m.anisotropy),[.3,.5,.25]);assert.deepEqual(f.materials.map(m=>({factors:snapshot(m),normal:m.normalScale.toArray()})),before);
  }],
  ['Repeated Card application keeps the selected silver response stable',()=>{
    const f=fixture(['CC-Brushed-Silver']);for(let n=0;n<8;n++)refineHeroMaterials(f.scene,'/heroes/creditCard.glb');assert.equal(f.materials[0].anisotropy,.3);
  }],
  ['Missing or invalid Card targets fail before mutation',()=>{
    assert.throws(()=>refineHeroMaterials(fixture().scene,'/heroes/creditCard.glb'),/silver/);
    for(const value of [NaN,Infinity,-Infinity,-.1,1.1,'0.65']){
      const f=fixture(['CC-Brushed-Silver','CC-Brushed-Silver']);f.materials[1].anisotropy=value;
      assert.throws(()=>refineHeroMaterials(f.scene,'/heroes/creditCard.glb'),/silver/);assert.equal(f.materials[0].anisotropy,.65);
    }
  }],
];
let failed=0;for(const [name,test]of tests){try{test();console.log('PASS hero materials: '+name);}catch(error){failed++;console.error('FAIL hero materials: '+name+'\n'+error.stack);}}
assert.equal(failed,0,`${failed} material contracts failed`);
