import assert from 'node:assert/strict';
import {readFile,readdir,stat,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

// Read-only CPU review: real FS reads only; every publication operation is mocked.
const cwd=process.cwd(),base='a162c10c4ad9590ffcd12dbbffe189d6371d5e52';
const url=p=>pathToFileURL(resolve(cwd,p)+(p.endsWith('/')?'/':'')),hash=b=>createHash('sha256').update(b).digest('hex');
const require=createRequire(url('apps/media/package.json'));
const {parse}=require('acorn'),{simple}=require('acorn-walk'),sharp=require('sharp');
const {NodeIO,Document}=await import(pathToFileURL(require.resolve('@gltf-transform/core')));
const {ALL_EXTENSIONS}=await import(pathToFileURL(require.resolve('@gltf-transform/extensions')));
const {MeshoptDecoder}=await import(pathToFileURL(require.resolve('meshoptimizer')));
const T=await import(url('apps/web/node_modules/three/build/three.module.js'));
const report={baseline:base,node:process.version,pins:{},checks:[],maps:[],materials:[],preservation:[],observations:[]};
const check=(name,detail={})=>{report.checks.push({name,...detail});console.log('PASS '+name+' '+JSON.stringify(detail));};
const bytes={};
const pins={
  'apps/web/public/heroes/recreation.glb':['d21f57de6792d5af53d575e2c6d2c9aa27bd8d1b944a00544a9cb3229fa97a0d',521060],
  'apps/media/scripts/build-refined-recreation.mjs':['7f9d61b7c2a490450857fcf6562ae51d5ee966e427c9489d888fca72204c82b0',20252],
  'apps/media/scripts/recreation-refinement.test.mjs':['34e4fe99b5d9f612e5a7f53c1798e1f16150b9a2d8c85cfb55062142fce900d8',34461],
  'apps/media/sources/recreation/materials.json':['6b5776151c1b052c82e4a408b81be0e72a3047ec1392b0492a3b9f38a0bcac04',1653],
};
for(const [p,[sha,size]]of Object.entries(pins)){bytes[p]=await readFile(p);assert.equal(hash(bytes[p]),sha,p);assert.equal(bytes[p].length,size,p);report.pins[p]={sha256:sha,bytes:size};}
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base);
const model=bytes['apps/web/public/heroes/recreation.glb'],source=bytes['apps/media/scripts/build-refined-recreation.mjs'].toString(),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const config=JSON.parse(bytes['apps/media/sources/recreation/materials.json']);
const manifests=await Promise.all(['hero-imported.json','hero-models.json'].map(async f=>JSON.parse(await readFile('apps/media/'+f,'utf8'))));
const record=manifests[0].find(r=>r.id==='recreation');assert.deepEqual(record,manifests[1].find(r=>r.id==='recreation'));
assert.equal(record.sha256,hash(model));assert.equal(record.bytes,model.length);assert.equal(record.sourceSha256,hash(source.replace(/\r\n/g,'\n')));assert.equal(record.materialSourceSha256,hash(JSON.stringify(config)));assert.equal(record.quality,'refined-textured');
report.record=record;
for(const image of config.images){const p=new URL(image.file,url('apps/media/sources/recreation/'));assert.equal(hash(await readFile(p)),image.sha256);const originalConfig=JSON.parse(await readFile(new URL('materials.json',new URL('./',p)),'utf8')),original=originalConfig.images.find(i=>i.sha256===image.sha256);assert.equal(image.originalOutput,original.originalOutput);assert.ok(image.origin.includes('Original'));assert.ok(!image.file.includes('http'));}
check('current pins, manifests, shared source identities and exact retained bytes');
const retainedGuard=ast.body.find(n=>n.type==='ForOfStatement'&&source.slice(n.start,n.end).includes('retained original source hash mismatch'));assert.ok(retainedGuard);
const verifyRetained=new (Object.getPrototypeOf(async function(){}).constructor)('config','hash','readFile','URL','sources',source.slice(retainedGuard.start,retainedGuard.end));
for(const changed of config.images){await assert.rejects(()=>verifyRetained(config,hash,async p=>{const b=Buffer.from(await readFile(p));if(p.href===new URL(changed.file,url('apps/media/sources/recreation/')).href)b[0]^=1;return b;},URL,url('apps/media/sources/recreation/')),/retained original source hash mismatch/);}
check('actual retained-source guard rejects one-bit corruption of either source without filesystem edits');
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc=await io.readBinary(model),root=doc.getRoot();
const materialSource=source.replace("rod('R-Boom',[-0.32,1.27,0],[1.25,1.27,0]","rod('R-Boom',[-0.32,1.11,0],[1.25,1.11,0]")
  .replace("[-0.30,1.29,0],[1.20,1.29,0]","[-0.30,1.13,0],[1.20,1.13,0]")
  .replace('jibClew=[-0.42,1.31,-0.025]','jibClew=[-0.42,1.13,-0.025]')
  .replace('[jibClew,[-0.62,1.26,-0.49]','[jibClew,[-0.62,1.09,-0.49]')
  .replace('[[1.19,1.27,0],[1.20,1.16,0.39],[0.73,0.96,0.39]]','[[1.19,1.11,0],[1.28,0.96,0.18],[1.17,0.91,0.20]]');
assert.equal(hash(materialSource),'5a36c2b119a4df1b3fa6d3d3a12e2499383f6ef284210268e445e9aea4c0003f');
const oldSource=materialSource.replace("'#9b6337'","'#956d43'").replace("'#314a50'","'#8da8ac'").replace('glass.opacity=0.62','glass.opacity=0.36').replace("T.MathUtils.clamp(key==='Timber'?0.38+h*0.66:0.76+h*0.24,0,1)",'(0.76+h*0.24)');
assert.equal(hash(oldSource),'59b21beb85fa14bb504caf04650fa25526512e2da291faa82525d2950c53e0c4','exact prior recipe reconstruction');
const oldAst=parse(oldSource,{ecmaVersion:'latest',sourceType:'module'});let oldBody=oldSource;
for(const n of oldAst.body.filter(n=>n.type==='ImportDeclaration').reverse())oldBody=oldBody.slice(0,n.start)+oldBody.slice(n.end);
oldBody=oldBody.replace(/import\.meta\.url/g,JSON.stringify(url('apps/media/scripts/build-refined-recreation.mjs').href));
const {RoundedBoxGeometry}=await import(url('apps/web/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js'));
const {GLTFExporter}=await import(url('apps/web/node_modules/three/examples/jsm/exporters/GLTFExporter.js'));
const {mergeGeometries}=await import(url('apps/web/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js'));
const {EXTTextureWebP,KHRTextureTransform}=await import(pathToFileURL(require.resolve('@gltf-transform/extensions')));
const {prune,dedup,weld,meshopt}=await import(pathToFileURL(require.resolve('@gltf-transform/functions')));
const {MeshoptEncoder}=await import(pathToFileURL(require.resolve('meshoptimizer')));
let intercepted,recipeForRead=oldSource;
const forbiddenWriter=()=>assert.fail('real writer path must never run');
const env={T,RoundedBoxGeometry,GLTFExporter,mergeGeometries,NodeIO,ALL_EXTENSIONS,EXTTextureWebP,KHRTextureTransform,prune,dedup,weld,meshopt,MeshoptEncoder,MeshoptDecoder,sharp,
  readFile:async(p,...args)=>p.href===url('apps/media/scripts/build-refined-recreation.mjs').href?recipeForRead:readFile(p,...args),writeFile:forbiddenWriter,rename:forbiddenWriter,readdir,stat,createHash,
  saveRefinedHero:async(record,paths,callback)=>{intercepted=record;assert.equal(typeof callback,'function');},console:{log:()=>{}},Buffer,URL};
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const oldModel=await new AsyncFunction(...Object.keys(env),oldBody+';return output;')(...Object.values(env));
assert.equal(oldModel.length,501456);assert.equal(hash(oldModel),'84e463c9f477aa7c1dae9be705198d3df198327f9dd98b5af5abba60e8483176');assert.equal(intercepted.sourceSha256,hash(oldSource));
const old=await io.readBinary(oldModel);
check('old exact-hash candidate reconstructed CPU/in-memory with saver intercepted and writer functions forbidden',{sourceSha256:hash(oldSource),modelSha256:hash(oldModel),bytes:oldModel.length});
let materialBody=materialSource;for(const n of parse(materialSource,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='ImportDeclaration').reverse())materialBody=materialBody.slice(0,n.start)+materialBody.slice(n.end);
materialBody=materialBody.replace(/import\.meta\.url/g,JSON.stringify(url('apps/media/scripts/build-refined-recreation.mjs').href));recipeForRead=materialSource;
const materialModel=await new AsyncFunction(...Object.keys(env),materialBody+';return output;')(...Object.values(env));
assert.equal(hash(materialModel),'6aab14611026767374e76e4bbc36200d2197c1a2d6545f0ebeb97ccc122b7173');assert.equal(materialModel.length,520948);
const materialDoc=await io.readBinary(materialModel),materialRoot=materialDoc.getRoot();
let currentBody=source;for(const n of ast.body.filter(n=>n.type==='ImportDeclaration').reverse())currentBody=currentBody.slice(0,n.start)+currentBody.slice(n.end);
currentBody=currentBody.replace(/import\.meta\.url/g,JSON.stringify(url('apps/media/scripts/build-refined-recreation.mjs').href));recipeForRead=source;
const currentMemoryModel=await new AsyncFunction(...Object.keys(env),currentBody+';return output;')(...Object.values(env));assert.equal(hash(currentMemoryModel),hash(model));assert.deepEqual(intercepted,record);
check('current exact recipe reproduces actual GLB and manifest record entirely in memory; publication callback not executed');
for(const t of root.listTextures())assert.equal(hash(t.getImage()),hash(materialRoot.listTextures().find(o=>o.getName()===t.getName()).getImage()),t.getName()+' unchanged across roof clearance');
for(const m of root.listMaterials()){const prior=materialRoot.listMaterials().find(o=>o.getName()===m.getName());assert.deepEqual(m.getBaseColorFactor(),prior.getBaseColorFactor());assert.equal(m.getRoughnessFactor(),prior.getRoughnessFactor());assert.equal(m.getNormalScale(),prior.getNormalScale());assert.equal(m.getMetallicFactor(),prior.getMetallicFactor());}
check('current roof-clear candidate keeps all 12 maps and material factors identical to exact in-memory 6aab candidate');
const json=JSON.parse(model.subarray(20,20+model.readUInt32LE(12)));
assert.equal(model.readUInt32LE(0),0x46546c67);assert.equal(model.readUInt32LE(4),2);assert.equal(model.readUInt32LE(8),model.length);
assert.ok(json.images.every(i=>i.bufferView!==undefined&&!i.uri));assert.ok(json.buffers.every(b=>!b.uri));
assert.ok(json.extensionsRequired.includes('EXT_texture_webp'));assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
const textures=new Map(root.listTextures().map(t=>[t.getName(),t]));assert.equal(textures.size,12);

function digestGeometry(r){
  const h=createHash('sha256'),put=v=>h.update(JSON.stringify(v));
  for(const a of r.listAccessors()){put([a.getName(),a.getType(),a.getComponentType(),a.getNormalized(),a.getCount()]);const x=a.getArray();h.update(Buffer.from(x.buffer,x.byteOffset,x.byteLength));}
  for(const m of r.listMeshes()){put([m.getName(),m.listPrimitives().length]);for(const p of m.listPrimitives())put([p.getMode(),p.listSemantics().map(s=>[s,r.listAccessors().indexOf(p.getAttribute(s))]),r.listAccessors().indexOf(p.getIndices()),p.getMaterial()?.getName()]);}
  for(const n of r.listNodes())put([n.getName(),n.getTranslation(),n.getRotation(),n.getScale(),r.listMeshes().indexOf(n.getMesh()),n.listChildren().map(c=>r.listNodes().indexOf(c)),n.getExtension('EXT_mesh_gpu_instancing')?.listSemantics().map(s=>[s,r.listAccessors().indexOf(n.getExtension('EXT_mesh_gpu_instancing').getAttribute(s))])]);
  return h.digest('hex');
}
const streams=digestGeometry(materialRoot);assert.equal(streams,digestGeometry(old.getRoot()));
const changedTextures=[];for(const t of materialRoot.listTextures()){const prior=old.getRoot().listTextures().find(o=>o.getName()===t.getName());if(hash(t.getImage())!==hash(prior.getImage()))changedTextures.push(t.getName());}
assert.deepEqual(changedTextures,['R-Timber-Color']);
const matChanges=[];for(const m of root.listMaterials()){const prior=old.getRoot().listMaterials().find(o=>o.getName()===m.getName());if(JSON.stringify(m.getBaseColorFactor())!==JSON.stringify(prior.getBaseColorFactor()))matChanges.push(m.getName());assert.equal(m.getNormalScale(),prior.getNormalScale());assert.equal(m.getRoughnessFactor(),prior.getRoughnessFactor());assert.equal(m.getMetallicFactor(),prior.getMetallicFactor());}
assert.deepEqual(matChanges.sort(),['R-Glass','R-Timber']);
check('material-only delta verified against exact old 501456-byte candidate',{geometryAndNodeDigest:streams,changedTextures,changedFactors:matChanges});

function functionNode(tree,name){let node;simple(tree,{FunctionDeclaration(n){if(n.id.name===name)node=n;}});assert.ok(node,name);return node;}
const mapsNode=functionNode(ast,'maps'),sources=url('apps/media/sources/recreation/');
const makeMaps=new Function('config','sources','sharp','readFile','T','Buffer','return ('+source.slice(mapsNode.start,mapsNode.end)+');')(config,sources,sharp,readFile,T,Buffer);
const regenerated=new Document();
const files={Canvas:'../student-loan/cloth.png',Timber:'../house/oak-albedo-v1.png',Paint:null,Steel:null};
const srgbToLinear=v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
const hexLinear=hex=>hex.match(/../g).map(x=>srgbToLinear(parseInt(x,16)/255));
const colors={'R-Paint-White':'ecece7','R-Paint-Teal':'174c50','R-Steel':'c8cdd0','R-Timber':'9b6337','R-Canvas':'e6e4d9','R-Canvas-Cord':'b5b7b0','R-Rubber':'303a3b','R-Glass':'314a50'};
const liveNodes=new Set();function walk(n){liveNodes.add(n);n.listChildren().forEach(walk);}root.listScenes().forEach(s=>s.listChildren().forEach(walk));
const liveMaterials=new Set([...liveNodes].flatMap(n=>n.getMesh()?.listPrimitives().map(p=>p.getMaterial())??[]));
for(const m of root.listMaterials()){
  assert.ok(liveMaterials.has(m));const expected=hexLinear(colors[m.getName()]);assert.ok(expected);m.getBaseColorFactor().slice(0,3).forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-7,m.getName()+' linear factor'));
  assert.ok([...m.getBaseColorFactor(),m.getRoughnessFactor(),m.getMetallicFactor()].every(v=>Number.isFinite(v)&&v>=0&&v<=1));
  assert.deepEqual(m.getEmissiveFactor(),[0,0,0]);assert.equal(m.getEmissiveTexture(),null);
  if(m.getName()==='R-Glass'){assert.equal(m.getAlphaMode(),'BLEND');assert.equal(m.getBaseColorFactor()[3],0.62);}else assert.equal(m.getAlphaMode(),'OPAQUE');
  const kind=m.getName().includes('Canvas')?'Canvas':m.getName().includes('Timber')?'Timber':m.getName().includes('Paint')?'Paint':m.getName()==='R-Steel'?'Steel':null;
  if(kind){const setting=config.surfaces[kind.toLowerCase()];assert.equal(m.getRoughnessFactor(),1);assert.equal(m.getNormalScale(),setting.normalScale);assert.equal(m.getMetallicFactor(),kind==='Steel'?1:0);
    for(const [slot,suffix]of [['BaseColor','Color'],['Normal','Normal'],['MetallicRoughness','Roughness']]){assert.equal(m['get'+slot+'Texture']().getName(),'R-'+kind+'-'+suffix);const info=m['get'+slot+'TextureInfo']();assert.equal(info.getTexCoord(),0);assert.equal(info.getWrapS(),10497);assert.equal(info.getWrapT(),10497);assert.deepEqual(info.getExtension('KHR_texture_transform').getScale(),setting.tile);}
  }
  report.materials.push({name:m.getName(),baseColor:m.getBaseColorFactor(),roughness:m.getRoughnessFactor(),metalness:m.getMetallicFactor(),normalScale:m.getNormalScale(),alphaMode:m.getAlphaMode()});
}
const loader=await readFile('apps/web/node_modules/three/examples/jsm/loaders/GLTFLoader.js','utf8');
assert.match(loader,/assignTexture\( materialParams, 'map', metallicRoughness.baseColorTexture, SRGBColorSpace \)/);
assert.match(loader,/assignTexture\( materialParams, 'normalMap', materialDef.normalTexture \)/);
assert.match(loader,/assignTexture\( materialParams, 'metalnessMap', metallicRoughness.metallicRoughnessTexture \)/);
check('actual rendered material slots, linear-sRGB factors, alpha, no emission, repeat UV transforms and installed loader color/data roles');
let unique=0,rendered=0;const precision=new Map();
for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){
  const count=p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount();assert.equal(p.getMode(),4);assert.equal(count%3,0);unique+=count/3;
  for(const semantic of ['POSITION','TEXCOORD_0']){const a=p.getAttribute(semantic);if(!a)continue;assert.equal(a.getArray().BYTES_PER_ELEMENT,2);assert.equal(a.getNormalized(),true);const key=semantic+':'+a.getComponentType();precision.set(key,(precision.get(key)??0)+1);for(let i=0;i<a.getCount();i++)assert.ok(a.getElement(i,[]).every(Number.isFinite));}
}
function countRendered(n){const instances=n.getExtension('EXT_mesh_gpu_instancing')?.listAttributes()[0]?.getCount()??1;for(const p of n.getMesh()?.listPrimitives()??[])rendered+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3*instances;n.listChildren().forEach(countRendered);}
root.listScenes().forEach(s=>s.listChildren().forEach(countRendered));assert.equal(unique,19296);assert.equal(rendered,25112);assert.equal(root.listMeshes().length,47);assert.equal(unique,record.triangles);
let options;simple(ast,{CallExpression(n){if(n.callee.name==='meshopt')options=n.arguments[0];}});for(const k of ['quantizePosition','quantizeTexcoord'])assert.equal(options.properties.find(p=>p.key.name===k).value.value,16);
check('actual 16-bit normalized position/UV accessors and unchanged unique/rendered caps',{unique,rendered,meshes:root.listMeshes().length,precision:Object.fromEntries(precision)});

for(const [kind,file]of Object.entries(files)){
  await makeMaps(regenerated,kind,file);
  const n=file?config.colorResolution:config.resolution,setting=config.surfaces[kind.toLowerCase()];
  const gray=file?await sharp(await readFile(new URL(file,sources))).resize(n,n).greyscale().removeAlpha().raw().toBuffer():null;
  const height=(x,y)=>gray?gray[((y+n)%n)*n+(x+n)%n]/255:0.5+Math.sin(((y+n)%n)*(kind==='Steel'?1.7:0.37))*0.05+Math.cos(((x+n)%n)*0.19+((y+n)%n)*0.11)*0.02;
  const fields={Color:Buffer.alloc(n*n*3),Normal:Buffer.alloc(n*n*3),Roughness:Buffer.alloc(n*n*3)};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=(y*n+x)*3,h=height(x,y),shade=kind==='Timber'?0.38+0.66*h:0.76+0.24*h;
    fields.Color.fill(Math.round(255*Math.min(1,Math.max(0,shade))),i,i+3);
    const gradient=[-0.8*(height(x+1,y)-height(x-1,y)),-0.8*(height(x,y+1)-height(x,y-1)),1],length=Math.hypot(...gradient);
    for(let c=0;c<3;c++)fields.Normal[i+c]=Math.round((gradient[c]/length+1)*127.5);
    fields.Roughness[i]=255;fields.Roughness[i+1]=Math.round(255*Math.min(1,Math.max(0,setting.roughness+(h-0.5)*0.12)));fields.Roughness[i+2]=kind==='Steel'?255:0;
  }
  for(const suffix of ['Color','Normal','Roughness']){
    const t=textures.get('R-'+kind+'-'+suffix),generated=regenerated.getRoot().listTextures().find(t=>t.getName()==='R-'+kind+'-'+suffix);assert.equal(hash(t.getImage()),hash(generated.getImage()),t.getName()+' current recipe encoded bytes');
    const {data,info}=await sharp(t.getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true}),size=suffix==='Color'&&file?512:256;
    assert.equal(info.width,size);assert.equal(info.height,size);assert.equal(info.channels,3);
    let reference=fields[suffix];if(size!==n)reference=await sharp(reference,{raw:{width:n,height:n,channels:3}}).resize(size,size).raw().toBuffer();
    if(suffix==='Normal')for(let i=0;i<reference.length;i+=3){const v=Array.from(reference.subarray(i,i+3),b=>b/127.5-1),length=Math.hypot(...v);v.forEach((v,c)=>reference[i+c]=Math.round((v/length+1)*127.5));}
    const ranges=Array.from({length:3},()=>[255,0]),errors=[0,0,0],sums=[0,0,0],lengths=[Infinity,-Infinity],units=new Set();
    for(let i=0;i<data.length;i+=3){for(let c=0;c<3;c++){ranges[c][0]=Math.min(ranges[c][0],data[i+c]);ranges[c][1]=Math.max(ranges[c][1],data[i+c]);errors[c]=Math.max(errors[c],Math.abs(data[i+c]-reference[i+c]));sums[c]+=data[i+c];}units.add(data[i]+','+data[i+1]+','+data[i+2]);if(suffix==='Normal'){const l=Math.hypot(data[i]/127.5-1,data[i+1]/127.5-1,data[i+2]/127.5-1);lengths[0]=Math.min(lengths[0],l);lengths[1]=Math.max(lengths[1],l);}}
    assert.ok(units.size>2,t.getName()+' detail');
    const chunks=[];for(let o=12;o+8<=t.getImage().length;){chunks.push(Buffer.from(t.getImage()).toString('ascii',o,o+4));const len=Buffer.from(t.getImage()).readUInt32LE(o+4);o+=8+len+(len%2);}
    if(suffix==='Normal'){assert.deepEqual(errors,[0,0,0]);assert.ok(chunks.includes('VP8L'));assert.ok(lengths[0]>0.99&&lengths[1]<1.01);assert.ok(ranges[2][0]>240);}else assert.ok(chunks.includes('VP8 '));
    if(suffix==='Roughness'){assert.ok(ranges[1][0]>0&&ranges[1][1]<255);assert.ok(kind==='Steel'?ranges[2][0]>=240:true);}
    const entry={name:t.getName(),sha256:hash(t.getImage()),bytes:t.getImage().length,size,channels:info.channels,chunks,ranges,maxCodecError:errors,distinctPixels:units.size,mean:sums.map(v=>v/(size*size)),...(suffix==='Normal'?{normalLength:lengths}: {})};report.maps.push(entry);console.log('MAP '+JSON.stringify(entry));
  }
}
check('all 12 shipped maps equal actual current recipe; independently reconstructed scalar fields and zero lossless normal codec error');

// Execute only extracted guard/callback code, never builder top-level or real writers.
const metaReplace=s=>s.replace(/import\.meta\.url/g,JSON.stringify(url('apps/media/scripts/build-refined-recreation.mjs').href));
let callback,preflight;simple(ast,{CallExpression(n){if(n.callee.name==='saveRefinedHero')callback=n.arguments[2];},IfStatement(n){if(source.slice(n.start,n.end).includes('Recreation exceeds unchanged delivery limits'))preflight=n;}});assert.ok(callback&&preflight);
const callbackText=metaReplace(source.slice(callback.start,callback.end));
const cap=10485760,modelCap=524288;
const guard=new Function('output','triangles','instantiated','collection',source.slice(preflight.start,preflight.end));
for(const tuple of [[524288,65000,65000,cap],[1,0,0,0]])assert.doesNotThrow(()=>guard({length:tuple[0]},...tuple.slice(1)));
for(const tuple of [[524289,65000,65000,cap],[1,65001,1,1],[1,1,65001,1],[1,1,1,cap+1]])assert.throws(()=>guard({length:tuple[0]},...tuple.slice(1)),/unchanged delivery limits/);
async function runCallback({total=cap-3340-1,oldSize=520948,outSize=520948,stale=0,fail,text=callbackText}={}){
  const events=[],target=url('apps/web/public/heroes/recreation.glb'),output={length:outSize},failure=new Error('injected '+fail);
  const op=name=>async(...args)=>{events.push(name);if(fail===name)throw failure;if(name==='size'){assert.equal(args[0].href,url('apps/web/public/').href);return total;}if(name==='stat'){assert.equal(args[0].href,target.href);return {size:oldSize};}if(name==='write'){assert.ok(args[0].href.endsWith('/heroes/recreation.glb.tmp'));assert.equal(args[1],output);}if(name==='rename')assert.equal(args[1].href,target.href);};
  const cb=new Function('sizeOf','stat','writeFile','rename','target','output','collection','URL','return ('+text+')')(op('size'),op('stat'),op('write'),op('rename'),target,output,stale,URL);
  try{await cb();return {events};}catch(error){return {events,error};}
}
async function boundary(text){
  const exact=await runCallback({total:cap,text});assert.ifError(exact.error);assert.deepEqual(exact.events,['size','stat','write','rename']);
  const over=await runCallback({total:cap+1,stale:0,text});assert.match(over.error?.message??'',/budget changed/);assert.deepEqual(over.events,['size','stat']);
  const staleOver=await runCallback({total:cap-1,stale:cap+999,text});assert.ifError(staleOver.error);
  const replacement=await runCallback({total:cap+520948-96,oldSize:520948,outSize:96,text});assert.ifError(replacement.error);
}
await boundary(callbackText);
for(const fail of ['size','stat','write','rename']){const r=await runCallback({fail});assert.equal(r.error?.message,'injected '+fail);assert.deepEqual(r.events,['size','stat','write','rename'].slice(0,['size','stat','write','rename'].indexOf(fail)+1));}
const guardNode=callback.body.body.find(n=>n.type==='IfStatement');assert.ok(guardNode);
const noGuard=metaReplace(source.slice(callback.start,guardNode.start)+source.slice(guardNode.end,callback.end));
await assert.rejects(()=>boundary(noGuard),{code:'ERR_ASSERTION'});
let live;simple(callback,{VariableDeclarator(n){if(n.id.name==='liveCollection')live=n;}});assert.ok(live);
const unusedFresh=metaReplace(source.slice(callback.start,live.init.start)+'collection'+source.slice(live.init.end,callback.end)).replace('{','{await sizeOf(new URL("../../web/public/",'+JSON.stringify(url('apps/media/scripts/build-refined-recreation.mjs').href)+'));');
await assert.rejects(()=>boundary(unusedFresh),{code:'ERR_ASSERTION'});
check('actual preflight model/unique/rendered/public caps; locked callback fresh totals, replacement arithmetic, exact boundary, all callback exceptions and stale/removed-guard mutations');

const helperSource=await readFile('apps/media/scripts/refined-hero-record.mjs','utf8'),helperAst=parse(helperSource,{ecmaVersion:'latest',sourceType:'module'});
function helperFactory(env){let stripped=helperSource;const edits=helperAst.body.filter(n=>n.type==='ImportDeclaration').map(n=>({start:n.start,end:n.end,text:''}));for(const n of helperAst.body)if(n.type==='ExportNamedDeclaration')edits.push({start:n.start,end:n.declaration.start,text:''});for(const e of edits.sort((a,b)=>b.start-a.start))stripped=stripped.slice(0,e.start)+e.text+stripped.slice(e.end);stripped=stripped.replace(/import\.meta\.url/g,JSON.stringify(url('apps/media/scripts/refined-hero-record.mjs').href));return new Function(...Object.keys(env),stripped+';return {saveRefinedHero,withHeroManifestLock};')(...Object.values(env));}
for(const throws of [false,true]){
  const events=[],imported=url('apps/media/hero-imported.json'),inventory=url('apps/media/hero-models.json'),memory=new Map([[fileURLToPath(imported),JSON.stringify(manifests[0])],[fileURLToPath(inventory),JSON.stringify(manifests[1])]]);let held=false;
  const env={URL,fileURLToPath,resolve,randomUUID:()=> 'memory-only',setTimeout:async()=>{},
    open:async(p,mode)=>{assert.equal(mode,'wx');assert.equal(held,false);held=true;events.push('lock');return {writeFile:async()=>{},close:async()=>{held=false;events.push('close');}};},
    readFile:async p=>{assert.equal(held,true);events.push('read');assert.ok(memory.has(p));return memory.get(p);},
    writeFile:async(p,b)=>{assert.equal(held,true);events.push('manifest-write');memory.set(p,b);},
    rename:async(a,b)=>{assert.equal(held,true);events.push('manifest-rename');memory.set(b,memory.get(a));memory.delete(a);},
    unlink:async p=>{if(p.endsWith('.lock')){events.push('unlock');assert.equal(held,false);}else memory.delete(p);},
  };
  const h=helperFactory(env),replacement={...record,provenance:'in-memory probe only'},before=[...memory];
  const run=h.saveRefinedHero(replacement,{imported,inventory},async()=>{assert.equal(held,true);assert.equal(events.filter(e=>e==='read').length,2);assert.equal(events.includes('manifest-write'),false);events.push('callback');if(throws)throw new Error('callback abort');});
  if(throws){await assert.rejects(run,/callback abort/);assert.deepEqual([...memory],before);assert.equal(events.includes('manifest-write'),false);}else{await run;for(const p of [imported,inventory])assert.deepEqual(JSON.parse(memory.get(fileURLToPath(p))).find(r=>r.id==='recreation'),replacement);}
  assert.equal(held,false);assert.equal(events.at(-1),'unlock');report.checks.push({name:'real helper with mocked IO '+(throws?'callback abort':'success'),events});console.log('LOCK '+JSON.stringify({throws,events}));
}
check('unchanged real saveRefinedHero helper acquires lock before callback; callback abort preserves both manifests and releases lock');

const ids=['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault'];
const baseline=p=>execFileSync('git',['show',base+':'+p],{maxBuffer:20*1024*1024});
for(const id of ids)for(const extension of ['glb','webp'])if(id!=='recreation'||extension==='webp'){
  const p='apps/web/public/heroes/'+id+'.'+extension,b=await readFile(p),sha=hash(b);assert.equal(sha,hash(baseline(p)),p);report.preservation.push({path:p,bytes:b.length,sha256:sha});
}
for(const f of ['hero-imported.json','hero-models.json','hero-provenance.json']){
  const p='apps/media/'+f,now=JSON.parse(await readFile(p,'utf8')),prior=JSON.parse(baseline(p));
  for(const id of ids)if(f==='hero-provenance.json'||id!=='recreation')assert.deepEqual(now.find(r=>r.id===id),prior.find(r=>r.id===id),p+' '+id);
}
for(const p of ['apps/media/scripts/refined-hero-record.mjs','apps/media/scripts/build-hero-models.mjs','apps/media/scripts/package-hero-collection.mjs','apps/media/scripts/hero-poster-publication.mjs','apps/media/scripts/prepare-hero-posters.mjs','apps/media/package.json','apps/media/package-lock.json','apps/web/package.json','apps/web/package-lock.json','apps/web/src/data/hero-assets.ts','apps/web/src/components/hero/AssetHero.tsx','apps/web/src/components/hero/HeroModelStage.tsx','apps/media/sources/house/oak-albedo-v1.png','apps/media/sources/student-loan/cloth.png'])assert.equal(hash(await readFile(p)),hash(baseline(p)),p);
check('correct ten distinct IDs: other nine GLBs, all ten posters, manifest records, pipeline APIs/dependencies and retained originals match baseline');
const legacy=await readFile('apps/media/scripts/build-hero-models.mjs','utf8'),legacyAst=parse(legacy,{ecmaVersion:'latest',sourceType:'module'}),buildNode=functionNode(legacyAst,'buildHeroModels');
const events=[],constructors=Object.fromEntries(manifests[0].map(r=>[r.id,()=>assert.fail('protected constructor called')]));
let result;
const build=new Function('mkdir','withHeroManifestLock','readFile','constructors','writeHeroManifest','console','URL','return ('+legacy.slice(buildNode.start,buildNode.end).replace(/import\.meta\.url/g,JSON.stringify(url('apps/media/scripts/build-hero-models.mjs').href))+');')(
  async()=>events.push('mkdir'),async cb=>{events.push('lock');await cb();events.push('unlock');},async()=>{assert.equal(events.at(-1),'lock');return JSON.stringify(manifests[0]);},constructors,async(p,records)=>{result=records;events.push('inventory');},{log:t=>events.push(t)},URL);
await build({output:url('apps/web/public/heroes/'),imported:url('apps/media/hero-imported.json'),inventory:url('apps/media/hero-models.json')});assert.deepEqual(result.find(r=>r.id==='recreation'),record);assert.ok(events.includes('recreation: preserving imported refined asset'));assert.equal(events.filter(e=>e.includes('preserving imported')).length,manifests[0].length);
check('actual legacy build function protected-skip branches execute with in-memory IO; no protected constructors or model writes',{protectedCount:manifests[0].length});

async function sizeOf(path){let sum=0;for(const e of await readdir(path,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),path);assert.equal((await lstat(p)).isSymbolicLink(),false,'no symlink accounting ambiguity');sum+=e.isDirectory()?await sizeOf(p):(await stat(p)).size;}return sum;}
const publicBytes=await sizeOf(url('apps/web/public/'));assert.equal(publicBytes,9931410);assert.ok(publicBytes<=cap);assert.ok(model.length<=modelCap);
report.budget={publicBytes,publicCap:cap,publicHeadroom:cap-publicBytes,modelBytes:model.length,modelCap,modelHeadroom:modelCap-model.length};check('live recursive public budget, no symlink ambiguity and unchanged caps',report.budget);
const credits=await readFile('docs/ASSET-CREDITS.md','utf8'),collection=await readFile('apps/media/hero-turntables/ASSET-COLLECTION.md','utf8'),packageSource=await readFile('apps/media/scripts/package-hero-collection.mjs','utf8');
assert.match(credits,/https:\/\/github.com\/KhronosGroup\/glTF-Sample-Assets\/tree\/main\/Models\/CarConcept/);assert.match(credits,/https:\/\/creativecommons.org\/licenses\/by\/4.0\//);assert.match(packageSource,/ASSET-CREDITS\.md/);assert.match(packageSource,/hero\.id\}\.[wg]/);
report.creditStatus={hasRecreationSection:/## Original Refined Recreation/.test(credits),stillCallsRecreationStudy:/other two base models \(Recreation and Custom\)/.test(credits),collectionStillSaysTwoStudies:/other two remain studies/.test(collection)};
report.observations.push('Original generated source lineage is locally cross-linked; no network origin verification or legal provenance certification performed.');
report.observations.push('Normals are lossless only against the filtered/re-normalized 256px field, not original generated height detail. Color and ORM use lossy WebP.');
report.observations.push('Common save helper is unchanged; multi-file asset/manifest failure rollback and noncooperating FS writers are not guaranteed by its cooperative lock.');
report.observations.push('CPU-only: no browser/GPU/render, real builder/rebuild/package/writer execution, network, installs, or cloud calls. Geometry topology/contact review is excluded.');
report.observations.push('Old candidate was reconstructed from its exact known source hash and evaluated CPU-only with saver intercepted; no publication callback or writer ran.');
report.endPins={};for(const [p,[sha]]of Object.entries(pins)){const end=hash(await readFile(p));report.endPins[p]={sha256:end,sameAsStart:end===sha};}
console.log('REPORT '+JSON.stringify(report,null,2));
