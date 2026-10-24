import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {parse} from 'acorn';
import {simple} from 'acorn-walk';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS, KHRMaterialsIridescence} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';

const hash=b=>createHash('sha256').update(b).digest('hex');
const sourceUrl=new URL('./import-refined-car.mjs',import.meta.url);
async function car(){
  await MeshoptDecoder.ready;
  const bytes=await readFile(new URL('../../web/public/heroes/car.glb',import.meta.url));
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(bytes);
  return{bytes,json,document,root:document.getRoot()};
}

// RGB pins independently decoded from source GLB c2720980...; no importer helper computes expectations.
const normals=[
  [['Mechanical'],512,512,'94f38d35a8cec24cc624a636bc5ffa95b1d8831e77ae007c3e86648f68684816'],
  [['Interior 1','Floormat','Interior 3 Carmine','Panel Sides'],64,32,'0d1c358c3355bba2e4d4fe981644ce6bde6cf69495b62cb10867831b53e58cd3'],
  [['Interior 2'],32,32,'35bc19e9728db6b7aac623cafc9fe5e3350e08fbe0acd25014d627ad4b79df48'],
  [['Disc'],128,128,'166b768e816839ef1c75381037d222c0aa5dd23145a726306a78b37f4acd89c7'],
  [['Tiretread'],512,128,'ff08861bab392eb1e495e36827ebd7097cee3ee9d8bb1831bfe21fdf62f9e0e4'],
];
for(const[names,width,height,pin]of normals)test(`Car ${names[0]} normal preserves original full-resolution RGB`,async()=>{
  const {root}=await car(),materials=names.map(name=>root.listMaterials().find(m=>m.getName()===name));
  assert.ok(materials.every(Boolean),'all authored aliases remain present');
  const texture=materials[0].getNormalTexture();assert.ok(texture);
  for(const material of materials)assert.equal(material.getNormalTexture(),texture,'aliases share the same restored data');
  const {data,info}=await sharp(texture.getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual([info.width,info.height,info.channels],[width,height,3]);assert.equal(hash(data),pin,'normal data must match pinned original pixels');
  const changed=Buffer.from(data);changed[0]^=1;assert.notEqual(hash(changed),pin,'single-channel corruption is detected');
});

function references(json){
  assert.equal(json.images.length,12);assert.equal(json.textures.length,12);
  const used=new Set();
  for(const texture of json.textures){
    const image=texture.extensions?.EXT_texture_webp?.source??texture.source;
    assert.ok(Number.isInteger(image)&&image>=0&&image<json.images.length,'every texture resolves a real image');used.add(image);
  }
  assert.equal(used.size,json.images.length,'no orphan image is delivered');
  for(const m of json.materials)if(m.normalTexture)assert.ok(Number.isInteger(m.normalTexture.index)&&m.normalTexture.index>=0&&m.normalTexture.index<json.textures.length);
  assert.ok(!json.extensionsUsed.includes('KHR_materials_iridescence'),'stale optional declaration must not ship');
  assert.deepEqual(json.extensionsRequired,['EXT_meshopt_compression','EXT_texture_webp','KHR_mesh_quantization']);
}
test('Car delivers only referenced images and preserves required extension semantics',async()=>references((await car()).json));
test('Car reference verifier rejects orphan, dangling and stripped-required variants',async()=>{
  const {json}=await car();references(json);
  const orphan=structuredClone(json);orphan.images.push({...orphan.images[0]});assert.throws(()=>references(orphan),{code:'ERR_ASSERTION'});
  const orphanSameCount=structuredClone(json),first=orphanSameCount.textures[0],second=orphanSameCount.textures[1],other=second.extensions?.EXT_texture_webp?.source??second.source;
  if(first.extensions?.EXT_texture_webp)first.extensions.EXT_texture_webp.source=other;else first.source=other;
  assert.throws(()=>references(orphanSameCount),{code:'ERR_ASSERTION'},'same image/texture counts must not hide an orphan');
  const dangling=structuredClone(json),t=dangling.textures[0];if(t.extensions?.EXT_texture_webp)t.extensions.EXT_texture_webp.source=json.images.length;else t.source=json.images.length;
  assert.throws(()=>references(dangling),{code:'ERR_ASSERTION'});
  const stale=structuredClone(json);stale.extensionsUsed.push('KHR_materials_iridescence');assert.throws(()=>references(stale),{code:'ERR_ASSERTION'});
  const stripped=structuredClone(json);stripped.extensionsRequired=stripped.extensionsRequired.filter(e=>e!=='KHR_mesh_quantization');assert.throws(()=>references(stripped),{code:'ERR_ASSERTION'});
});

test('Car normal bindings retain source sampling, transforms and authored zero strength',async()=>{
  const {root}=await car();
  const rows=[['Mechanical',1,1,1],['Interior 1',200,400,1],['Floormat',2,3,1],['Interior 3 Carmine',200,400,1],['Panel Sides',1,1,0],['Interior 2',100,100,1],['Paint 2 Carmine',30,30,0.3],['Paint 1 Carmine',30,30,0.3],['Disc',20,10,1],['Tireside',1,1,1],['Tiretread',1,4,1]];
  assert.equal(root.listMaterials().filter(m=>m.getNormalTexture()).length,rows.length);
  for(const[name,x,y,strength]of rows){
    const material=root.listMaterials().find(m=>m.getName()===name),info=material.getNormalTextureInfo(),transform=info.getExtension('KHR_texture_transform'),paint=name.startsWith('Paint ');
    assert.ok(Math.abs(material.getNormalScale()-strength)<1e-7);assert.equal(info.getTexCoord(),0);
    assert.equal(info.getMagFilter(),paint?9728:9729);assert.equal(info.getMinFilter(),paint?9986:9987);
    assert.equal(info.getWrapS(),10497);assert.equal(info.getWrapT(),10497);
    assert.deepEqual(transform?.getScale()??[1,1],[x,y]);assert.deepEqual(transform?.getOffset()??[0,0],name==='Tiretread'?[0,1.5]:[0,0]);
    assert.equal(transform?.getRotation()??0,name==='Paint 2 Carmine'?0.585398:0);
  }
});
test('Car normal repair retains all existing compressed geometry payloads',async()=>{
  const {bytes,json}=await car(),start=28+bytes.readUInt32LE(12),payloads=[];
  for(const view of json.bufferViews){const ext=view.extensions?.EXT_meshopt_compression;if(ext)payloads.push(bytes.subarray(start+ext.byteOffset,start+ext.byteOffset+ext.byteLength));}
  assert.equal(json.accessors.length,508);assert.equal(payloads.length,410);
  assert.equal(hash(Buffer.concat(payloads)),'5980ce54ffa3e5d3f0783b45ed2006942e7714d6a83a17a43b67781304eadc8f');
});
test('Car provenance binds the pinned source and current import recipe',async()=>{
  const records=JSON.parse(await readFile(new URL('../hero-models.json',import.meta.url),'utf8')),record=records.find(r=>r.id==='car');
  assert.equal(record.sourceSha256,'c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b');
  assert.equal(record.recipeSha256,hash((await readFile(sourceUrl,'utf8')).replace(/\r\n/g,'\n')),'recipe edits require manifest regeneration');
});

async function cleanup(){
  const source=await readFile(sourceUrl,'utf8'),fn=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='cleanCarReferences');
  assert.ok(fn,'a fail-closed cleanup boundary must exist');
  return vm.runInNewContext('('+source.slice(fn.start,fn.end)+')',{hash});
}
for(const scenario of ['wrong-image','required-extension','live-extension'])test(`Car cleanup refuses ${scenario} without disposing live resources`,async()=>{
  const clean=await cleanup(),{document,root}=await car(),paint=root.listMaterials().find(m=>m.getName()==='Paint 1 Carmine').getNormalTexture();
  const orphan=document.createTexture('unexpected').setImage(paint.getImage()).setMimeType('image/png');
  const extension=document.createExtension(KHRMaterialsIridescence).setRequired(scenario==='required-extension');
  if(scenario==='live-extension')root.listMaterials()[0].setExtension('KHR_materials_iridescence',extension.createIridescence().setIridescenceFactor(0.5));
  const count=root.listTextures().length;
  assert.throws(()=>clean(root),scenario==='wrong-image'?/unused Car image/:/Car iridescence cleanup/);
  assert.equal(root.listTextures().length,count);assert.ok(root.listTextures().includes(paint)&&root.listTextures().includes(orphan));
  assert.ok(root.listExtensionsUsed().includes(extension),'refusal must not partially dispose the graph');
});

function publication(source){
  let callback;simple(parse(source,{ecmaVersion:'latest',sourceType:'module'}),{CallExpression(n){if(n.callee.name==='saveRefinedHero')callback=n.arguments[2];}});
  assert.equal(callback?.type,'ArrowFunctionExpression');
  return{callback,code:source.slice(callback.start,callback.end).replaceAll('import.meta.url','"file:///guarded/car-import.mjs"')};
}
async function verifyPublication(source){
  const{code}=publication(source),cap=10*1024*1024;let live=cap-2;const events=[],output=Buffer.alloc(5);
  const run=vm.runInNewContext('('+code+')',{URL,sizeOf:async()=>live,stat:async()=>({size:3}),output,target:new URL('file:///car.glb'),temporary:new URL('file:///car.glb.tmp'),collection:0,
    writeFile:async(_file,data)=>{assert.equal(data,output);events.push('write');},rename:async()=>events.push('rename')});
  await run();assert.deepEqual(events,['write','rename'],'exactly-at-cap replacement is allowed');events.length=0;
  live=cap-1;await assert.rejects(run(),/Car public budget/);assert.deepEqual(events,[],'growth must fail before any asset write');
}
test('Car remeasures aggregate bytes inside its locked publication callback',async()=>verifyPublication(await readFile(sourceUrl,'utf8')));
test('Car publication verifier rejects removed and stale-total guard mutations',async()=>{
  const source=await readFile(sourceUrl,'utf8');await verifyPublication(source);
  let guard,live;simple(publication(source).callback.body,{IfStatement(n){if(n.test.left?.name==='liveCollection')guard=n;},VariableDeclarator(n){if(n.id.name==='liveCollection')live=n;}});
  assert.ok(guard&&live);
  await assert.rejects(verifyPublication(source.slice(0,guard.start)+source.slice(guard.end)),{code:'ERR_ASSERTION'});
  await assert.rejects(verifyPublication(source.slice(0,live.init.start)+'collection'+source.slice(live.init.end)),{code:'ERR_ASSERTION'});
});
