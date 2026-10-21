import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {SourceTextModule, SyntheticModule} from 'node:vm';

const root=process.cwd(), base=path.join(root,'apps/media'), require=createRequire(path.join(base,'package.json'));
const load=async s=>import(pathToFileURL(require.resolve(s)).href);
const {NodeIO}=await load('@gltf-transform/core'), {ALL_EXTENSIONS}=await load('@gltf-transform/extensions');
const {MeshoptDecoder}=await load('meshoptimizer'), {default:sharp}=await load('sharp');
const {parse}=await load('acorn'), {simple}=await load('acorn-walk');
const sha=(b,algorithm='sha256')=>createHash(algorithm).update(b).digest('hex');
const read=async p=>fs.readFile(path.join(root,p)), json=async p=>JSON.parse(await read(p));
const builderPath='apps/media/scripts/build-refined-custom.mjs', testPath='apps/media/scripts/custom-refinement.test.mjs';
const cfgPath='apps/media/sources/custom/materials.json', glbPath='apps/web/public/heroes/custom.glb';
const report={baseline:'8e2f25ef6b81ffc65b9f96644170834c511078d3',started:new Date().toISOString()};
async function pins(){const out={};for(const p of [builderPath,testPath,cfgPath,glbPath,'apps/media/hero-imported.json','apps/media/hero-models.json','.superpowers/sdd/2026-10-21-custom/rebuild-proof.mjs']){const b=await read(p);out[p]={bytes:b.length,raw:sha(b),lf:p.endsWith('.mjs')?sha(b.toString().replace(/\r\n/g,'\n')):undefined};}out.canonicalConfig=sha(JSON.stringify(await json(cfgPath)));return out;}
report.before=await pins();
assert.equal(report.before[glbPath].raw,'2753182d024be862fc7ab5e5b18100cc6a7bbcc736213471b4a6e2083517aa7b');
assert.equal(report.before[glbPath].bytes,237844);
assert.equal(report.before[builderPath].lf,'2e21fb5c03e55d4649184d7362fe3df73efee9ac2b76395fd9796c3a948c5040');
assert.equal(report.before[testPath].lf,'26c50474ca83b358d7bd18481b73a3f2f703ed921e6cdd29d45e07b4d27c460c');
assert.equal(report.before[cfgPath].raw,'26ab2c71429e558b26a4108802e785088ce7e1cc231ea89db6e0ad4ed5531532');
const imports=await json('apps/media/hero-imported.json'),inventory=await json('apps/media/hero-models.json'),record=imports.find(x=>x.id==='custom');
assert.deepEqual(record,inventory.find(x=>x.id==='custom'));
assert.equal(record.sourceSha256,report.before[builderPath].lf);assert.equal(record.materialSourceSha256,report.before.canonicalConfig);
assert.equal(record.sha256,report.before[glbPath].raw);assert.equal(record.bytes,237844);
const ids=['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault'];
assert.equal(new Set(ids).size,10);assert.equal(inventory.length,10);assert.equal(imports.length,10);
let treeText='';for await(const chunk of process.stdin)treeText+=chunk;
const tree=treeText.split(/\r?\n/).map(l=>/^(\d+) blob ([a-f0-9]+)\t(.+)$/.exec(l)).filter(Boolean);
assert.ok(tree.length>100,'supply baseline git ls-tree on stdin');
report.baselineTracked={checked:0,crlfOnly:0,different:[],missing:[]};
const blob=b=>sha(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b]),'sha1');
for(const [,mode,expected,p] of tree){if(mode!=='100644'&&mode!=='100755')continue;try{const b=await read(p),actual=blob(b);report.baselineTracked.checked++;if(actual!==expected){const lf=Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n'));if(!b.includes(0)&&blob(lf)===expected)report.baselineTracked.crlfOnly++;else report.baselineTracked.different.push({path:p,expected,actual});}}catch(e){if(e.code!=='ENOENT')throw e;report.baselineTracked.missing.push(p);}}
const plannedDocs=['apps/media/hero-turntables/ASSET-COLLECTION.md','apps/media/hero-turntables/DESIGN.md','docs/ASSET-CREDITS.md'];
assert.deepEqual(report.baselineTracked.different.map(x=>x.path).filter(p=>!plannedDocs.includes(p)).sort(),['apps/media/hero-imported.json','apps/media/hero-models.json',glbPath].sort());
assert.deepEqual(report.baselineTracked.missing,[]);
report.assetFiles={};for(const id of ids)for(const ext of ['glb','webp']){const p=`apps/web/public/heroes/${id}.${ext}`,b=await read(p);report.assetFiles[id+'.'+ext]={bytes:b.length,sha256:sha(b)};}
async function sizeOf(p){let n=0;for(const e of await fs.readdir(p,{withFileTypes:true})){const next=path.join(p,e.name);n+=e.isDirectory()?await sizeOf(next):(await fs.stat(next)).size;}return n;}
report.publicBytes=await sizeOf(path.join(root,'apps/web/public'));assert.ok(report.publicBytes<=10485760);

await MeshoptDecoder.ready;
const bytes=await read(glbPath),gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
assert.ok(gltf.images.every(i=>i.bufferView!==undefined&&!i.uri));assert.ok(gltf.buffers.every(b=>!b.uri));
const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(bytes),r=document.getRoot();
const tri=m=>m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0);
const seen=new Set(),usage=new Map();let rendered=0;
function walk(n){assert.ok(!seen.has(n));seen.add(n);if(n.getMesh()){const count=n.getExtension('EXT_mesh_gpu_instancing')?.listAttributes()[0]?.getCount()??1;rendered+=tri(n.getMesh())*count;for(const p of n.getMesh().listPrimitives()){const m=p.getMaterial();usage.set(m,(usage.get(m)??0)+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3*count);}}n.listChildren().forEach(walk);}
r.listScenes().forEach(s=>s.listChildren().forEach(walk));
report.geometryCounts={unique:r.listMeshes().reduce((s,m)=>s+tri(m),0),rendered,meshes:r.listMeshes().length};
assert.deepEqual(report.geometryCounts,{unique:13200,rendered:21240,meshes:17});
let uvTriangles=0,minUv=Infinity,maxUv=-Infinity;
for(const m of r.listMeshes())for(const p of m.listPrimitives()){
  const uv=p.getAttribute('TEXCOORD_0'),pos=p.getAttribute('POSITION'),ix=p.getIndices();if(!uv){assert.equal(p.getMaterial().getBaseColorTexture(),null);continue;}assert.equal(uv.getCount(),pos.getCount());
  for(let i=0;i<uv.getCount();i++)for(const v of uv.getElement(i,[])){assert.ok(Number.isFinite(v)&&v>=-1e-7&&v<=1+1e-7);minUv=Math.min(minUv,v);maxUv=Math.max(maxUv,v);}
  if(!p.getMaterial().getBaseColorTexture())continue;
  for(let i=0;i<(ix?.getCount()??pos.getCount());i+=3){const v=[0,1,2].map(j=>ix?ix.getScalar(i+j):i+j),ps=v.map(i=>pos.getElement(i,[])),[a,b,c]=v.map(i=>uv.getElement(i,[])),ab=ps[1].map((v,k)=>v-ps[0][k]),ac=ps[2].map((v,k)=>v-ps[0][k]),area=Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]);if(area<2e-10)continue;assert.ok(Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))>1e-12);uvTriangles++;}
}
report.uv={min:minUv,max:maxUv,noncollapsedTexturedTriangles:uvTriangles,accessorTypes:gltf.accessors.filter(a=>a.type==='VEC2'||a.type==='VEC3').map(a=>({type:a.type,componentType:a.componentType,normalized:a.normalized??false}))};
report.uv.referenced=[];for(const mesh of gltf.meshes)for(const p of mesh.primitives){const pos=gltf.accessors[p.attributes.POSITION],uv=gltf.accessors[p.attributes.TEXCOORD_0];assert.equal(pos.componentType,5122);assert.equal(pos.normalized,true);if(uv){assert.equal(uv.componentType,5123);assert.equal(uv.normalized,true);}report.uv.referenced.push({mesh:mesh.name,positionBits:16,uvBits:uv?16:null});}
const cfg=await json(cfgPath);assert.deepEqual(cfg.images,[]);assert.equal(cfg.resolution,256);
function fields(kind){const n=256,rough=cfg.surfaces[kind.toLowerCase()].roughness,out={Color:Buffer.alloc(n*n*3),Normal:Buffer.alloc(n*n*3),Roughness:Buffer.alloc(n*n*3)};
  const h=(x,y)=>{x=(x+n)%n;y=(y+n)%n;const radius=Math.hypot(x-127.5,y-127.5);let d;if(kind==='Steel')d=Math.sin(y*1.72+Math.sin(x*.047)*.05)*.027+Math.cos(x*.37+y*.19)*.004;else if(kind==='Radial')d=Math.sin(radius*1.62)*.012+Math.cos(x*.17-y*.11)*.003;else if(kind==='Dial')d=Math.sin(radius*.67)*.022+Math.sin(x*.41+y*.32)*.006;else d=Math.sin(x*.51+y*.34)*.025+Math.sin(x*.13-y*.37)*.01;return .5+d;};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*3,height=h(x,y),nx=-2.5*(h(x+1,y)-h(x-1,y)),ny=-2.5*(h(x,y+1)-h(x,y-1)),length=Math.hypot(nx,ny,1),c=Math.round(255*Math.max(0,Math.min(1,.5+height*.6)));out.Color.fill(c,i,i+3);out.Normal[i]=Math.round((nx/length+1)*127.5);out.Normal[i+1]=Math.round((ny/length+1)*127.5);out.Normal[i+2]=Math.round((1/length+1)*127.5);out.Roughness[i]=255;out.Roughness[i+1]=Math.round(255*Math.max(0,Math.min(1,rough+(height-.5)*.7)));out.Roughness[i+2]=kind==='Enamel'?0:255;}
  return out;
}
const expected=Object.fromEntries(['Steel','Radial','Dial','Enamel'].map(k=>[k,fields(k)]));report.textures=[];assert.equal(r.listTextures().length,12);
for(const texture of r.listTextures()){
  const [,kind,slot]=/^C-(Steel|Radial|Dial|Enamel)-(Color|Normal|Roughness)$/.exec(texture.getName()),source=expected[kind][slot],encoded=Buffer.from(texture.getImage());
  assert.equal(texture.getMimeType(),'image/webp');const {data,info}=await sharp(encoded).removeAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual([info.width,info.height,info.channels],[256,256,3]);
  const chunks=[];for(let i=12;i+8<=encoded.length;){const length=encoded.readUInt32LE(i+4);chunks.push(encoded.toString('ascii',i,i+4));i+=8+length+length%2;}
  assert.ok(chunks.includes(slot==='Normal'?'VP8L':'VP8 '));
  const reencoded=await sharp(source,{raw:{width:256,height:256,channels:3}}).webp({lossless:slot==='Normal',quality:slot==='Color'?85:92,effort:6}).toBuffer();assert.deepEqual(reencoded,encoded,'independently reconstructed codec '+texture.getName());
  const stats=[0,1,2].map(c=>{let min=255,max=0,sum=0,error=0,maxError=0;for(let i=c;i<data.length;i+=3){min=Math.min(min,data[i]);max=Math.max(max,data[i]);sum+=data[i];error+=Math.abs(data[i]-source[i]);maxError=Math.max(maxError,Math.abs(data[i]-source[i]));}return {min,max,mean:sum/65536,mae:error/65536,maxError};});
  let normalLength;if(slot==='Normal'){assert.deepEqual(data,source,'lossless quantized normals');let min=Infinity,max=0;for(let i=0;i<data.length;i+=3){const length=Math.hypot(...[0,1,2].map(c=>data[i+c]/127.5-1));min=Math.min(min,length);max=Math.max(max,length);}assert.ok(min>.99&&max<1.01);normalLength={min,max};}
  const uses=[];for(const [m,triangles]of usage)for(const [slotName,t]of [['baseColor',m.getBaseColorTexture()],['normal',m.getNormalTexture()],['metallicRoughness',m.getMetallicRoughnessTexture()]])if(t===texture)uses.push({material:m.getName(),slot:slotName,renderedTriangles:triangles});assert.ok(uses.length);
  report.textures.push({name:texture.getName(),bytes:encoded.length,sha256:sha(encoded),codec:chunks,stats,normalLength,uses});
}
report.materials=[...usage].map(([m,triangles])=>{assert.deepEqual(m.getEmissiveFactor(),[0,0,0]);assert.equal(m.getEmissiveTexture(),null);const item={name:m.getName(),renderedTriangles:triangles,color:m.getBaseColorFactor(),metallic:m.getMetallicFactor(),roughness:m.getRoughnessFactor(),normalScale:m.getNormalScale(),alpha:m.getAlphaMode(),doubleSided:m.getDoubleSided(),extensions:gltf.materials.find(x=>x.name===m.getName())?.extensions};if(m.getName()==='C-Glass'){assert.equal(item.alpha,'BLEND');assert.ok(Math.abs(item.color[3]-.12)<1e-8);assert.equal(m.getBaseColorTexture(),null);}else{assert.equal(item.alpha,'OPAQUE');assert.equal(item.roughness,1);const key=m.getName()==='C-Steel-Linear'?'steel':m.getName()==='C-Steel-Radial'?'radial':m.getName()==='C-Dial'?'dial':'enamel';assert.equal(item.normalScale,cfg.surfaces[key].normalScale);for(const info of [m.getBaseColorTextureInfo(),m.getNormalTextureInfo(),m.getMetallicRoughnessTextureInfo()]){assert.equal(info.getTexCoord(),0);assert.equal(info.getWrapS(),10497);assert.equal(info.getWrapT(),10497);assert.deepEqual(info.getExtension('KHR_texture_transform').getScale(),[1,1]);}}return item;});
assert.equal(report.materials.find(m=>m.name==='C-Steel-Linear').extensions.KHR_materials_anisotropy.anisotropyStrength,.38);
assert.ok(!gltf.extensionsRequired.includes('KHR_materials_anisotropy'));

function synthetic(values,id){const names=Object.keys(values);return new SyntheticModule(names,function(){for(const name of names)this.setExport(name,values[name]);},{identifier:id});}
const builderUrl=pathToFileURL(path.join(root,builderPath)).href,helperUrl=new URL('./refined-hero-record.mjs',builderUrl).href;
async function moduleFrom(source,url,overrides={}){const cache=new Map();const module=new SourceTextModule(source,{identifier:url,initializeImportMeta:meta=>{meta.url=url;}});await module.link(async spec=>{if(cache.has(spec))return cache.get(spec);const values=overrides[spec]??await import(spec.startsWith('.')?new URL(spec,url).href:spec.startsWith('node:')?spec:pathToFileURL(require.resolve(spec)).href),linked=synthetic(values,url+'#'+spec);cache.set(spec,linked);return linked;});return module;}
let captured,callback,capturedRecord,activeProbe;const forbidden=async()=>{throw Error('FORBIDDEN real filesystem writer');};
const publicUrl=new URL('../../web/public/',builderUrl),targetUrl=new URL('heroes/custom.glb',publicUrl),fakeFile=new URL('__review_only__',publicUrl);
const builderFs={
  readFile:fs.readFile,
  readdir:async(p,options)=>{if(!activeProbe)return fs.readdir(p,options);assert.ok(activeProbe.held());assert.equal(p.href,publicUrl.href);activeProbe.events.push('size');if(activeProbe.fail==='size')throw Error('size-error');return [{name:'__review_only__',isDirectory:()=>false}];},
  stat:async p=>{if(!activeProbe)return fs.stat(p);assert.ok(activeProbe.held());if(p.href===fakeFile.href)return {size:activeProbe.total};assert.equal(p.href,targetUrl.href);activeProbe.events.push('stat');if(activeProbe.fail==='stat')throw Error('stat-error');return {size:bytes.length};},
  writeFile:async(p,b)=>{if(!activeProbe)return forbidden();assert.ok(activeProbe.held());assert.equal(p.href,targetUrl.href+'.tmp');assert.deepEqual(b,bytes);activeProbe.events.push('asset-write');if(activeProbe.fail==='asset')throw Error('asset-error');},
  rename:async(a,b)=>{if(!activeProbe)return forbidden();assert.ok(activeProbe.held());assert.equal(a.href,targetUrl.href+'.tmp');assert.equal(b.href,targetUrl.href);activeProbe.events.push('asset-rename');if(activeProbe.fail==='rename')throw Error('rename-error');},
};
class MemoryIO extends NodeIO{async writeBinary(d){const out=await super.writeBinary(d);captured=Buffer.from(out);return out;}}
const builderSource=(await read(builderPath)).toString();
const sourceAst=parse(builderSource,{ecmaVersion:'latest',sourceType:'module'});let deliveryGuard;const quantization=[];
simple(sourceAst,{IfStatement(n){if(builderSource.slice(n.consequent.start,n.consequent.end).includes('Custom exceeds unchanged delivery limits'))deliveryGuard=n;},CallExpression(n){if(n.callee.name==='meshopt'){const options=Object.fromEntries(n.arguments[0].properties.filter(p=>p.value.type==='Literal').map(p=>[p.key.name,p.value.value]));assert.equal(options.quantizePosition,16);assert.equal(options.quantizeTexcoord,16);quantization.push(options);}}});
assert.ok(deliveryGuard&&quantization.length);const checkLimit=new Function('output','triangles','rendered','collection',builderSource.slice(deliveryGuard.start,deliveryGuard.end));
report.deliveryLimits={quantization,cases:[]};const caps=[524288,65000,65000,10485760];
checkLimit({length:caps[0]},...caps.slice(1));report.deliveryLimits.cases.push({name:'all-exact',rejected:false});
for(let i=0;i<4;i++){const values=[1,1,1,1];values[i]=caps[i]+1;assert.throws(()=>checkLimit({length:values[0]},...values.slice(1)),/unchanged delivery limits/);report.deliveryLimits.cases.push({name:['model','unique','rendered','public'][i]+'-plus-one',rejected:true});}
const vmBuilder=await moduleFrom(builderSource,builderUrl,{'@gltf-transform/core':{NodeIO:MemoryIO},'node:fs/promises':builderFs,'./refined-hero-record.mjs':{saveRefinedHero:async(record,paths,publish)=>{assert.equal(paths,undefined);capturedRecord=record;callback=publish;}}});
await vmBuilder.evaluate();assert.deepEqual(captured,bytes);assert.deepEqual(capturedRecord,record);assert.equal(typeof callback,'function');
report.reproduction={exactBytes:true,sha256:sha(captured),bytes:captured.length,exactRecord:true,realFilesystemWriterInvocations:0};

const helperSource=await fs.readFile(fileURLToPath(helperUrl),'utf8');
async function lockedCase({name,total,fail,mutate,expectedError,expectedEvents}){
  const events=[],model=bytes,manifestWrites=[];let held=false;
  const fsFake={
    open:async(p,flags)=>{events.push('lock');assert.equal(flags,'wx');assert.ok(p.endsWith('hero-imported.json.lock'));held=true;return {writeFile:async()=>{assert.ok(held);events.push('lock-owner');},close:async()=>{assert.ok(held);events.push('close');held=false;}};},
    readFile:async(p,encoding)=>{assert.ok(held);const name=String(p).endsWith('hero-imported.json')?'imports':'inventory';events.push('read-'+name);if(fail===name)throw Error(name+'-error');return JSON.stringify(name==='imports'?imports:inventory);},
    writeFile:async(p,b)=>{assert.ok(held);events.push('manifest-write');if(fail==='manifest')throw Error('manifest-error');manifestWrites.push(JSON.parse(b));},
    rename:async()=>{assert.ok(held);events.push('manifest-rename');},
    unlink:async p=>{const lock=String(p).endsWith('.lock');events.push(lock?'unlock':'manifest-cleanup');assert.equal(held,!lock);},
  };
  const helper=await moduleFrom(helperSource,helperUrl,{'node:fs/promises':fsFake});await helper.evaluate();
  const ast=parse(builderSource,{ecmaVersion:'latest',sourceType:'module'});let call,guard,live;
  simple(ast,{CallExpression(n){if(n.callee.name==='saveRefinedHero')call=n;}});const cb=call.arguments[2],edits=[];
  simple(cb,{MemberExpression(n){if(n.object.type==='MetaProperty')edits.push({start:n.start,end:n.end,text:JSON.stringify(builderUrl)});},IfStatement(n){if(n.test.left?.name==='liveCollection')guard=n;},VariableDeclarator(n){if(n.id.name==='liveCollection')live=n;}});
  if(mutate==='removed')edits.push({start:guard.start,end:guard.end,text:''});
  if(mutate==='stale')edits.push({start:live.init.start,end:live.init.end,text:'collection'});
  let fragment=builderSource.slice(cb.start,cb.end);for(const e of edits.filter(e=>!edits.some(other=>other!==e&&other.start<=e.start&&other.end>=e.end)).sort((a,b)=>b.start-a.start))fragment=fragment.slice(0,e.start-cb.start)+e.text+fragment.slice(e.end-cb.start);
  const publish=new Function('sizeOf','stat','writeFile','rename','URL','target','output','collection','return ('+fragment+');')(
    async p=>{assert.ok(held);assert.equal(p.href,new URL('../../web/public/',builderUrl).href);events.push('size');if(fail==='size')throw Error('size-error');return total;},
    async p=>{assert.ok(held);assert.equal(p.href,new URL('../../web/public/heroes/custom.glb',builderUrl).href);events.push('stat');if(fail==='stat')throw Error('stat-error');return {size:model.length};},
    async(p,b)=>{assert.ok(held);events.push('asset-write');assert.equal(p.href,new URL('../../web/public/heroes/custom.glb.tmp',builderUrl).href);assert.deepEqual(b,model);if(fail==='asset')throw Error('asset-error');},
    async(a,b)=>{assert.ok(held);events.push('asset-rename');assert.equal(a.href,new URL('../../web/public/heroes/custom.glb.tmp',builderUrl).href);assert.equal(b.href,new URL('../../web/public/heroes/custom.glb',builderUrl).href);if(fail==='rename')throw Error('rename-error');},URL,new URL('../../web/public/heroes/custom.glb',builderUrl),model,0);
  activeProbe={events,total,fail,held:()=>held};
  let error;try{await helper.namespace.saveRefinedHero(record,undefined,mutate?publish:callback);}catch(e){error=e.message;}finally{activeProbe=undefined;}
  assert.equal(held,false);if(expectedError)assert.match(error??'',expectedError);else assert.equal(error,undefined);
  if(expectedEvents)assert.deepEqual(events,expectedEvents);
  if(!error){assert.equal(manifestWrites.length,2);assert.deepEqual(manifestWrites[0],imports);assert.deepEqual(manifestWrites[1],inventory);}
  return {name,error,events,actualCapturedBuilderCallback:!mutate,mutantEscaped:mutate?events.includes('asset-write'):undefined};
}
const prefix=['lock','lock-owner','read-imports','read-inventory'],end=['close','unlock'],success=[...prefix,'size','stat','asset-write','asset-rename','manifest-write','manifest-rename','manifest-cleanup','manifest-write','manifest-rename','manifest-cleanup',...end];
report.publication=[];
report.publication.push(await lockedCase({name:'exact-cap',total:10485760,expectedEvents:success}));
report.publication.push(await lockedCase({name:'cap-plus-one-stale-preflight-zero',total:10485761,expectedError:/budget changed/,expectedEvents:[...prefix,'size','stat',...end]}));
for(const mutation of ['removed','stale'])report.publication.push(await lockedCase({name:mutation+'-guard-negative-control',total:10485761,mutate:mutation,expectedEvents:mutation==='removed'?success:[...prefix,'asset-write','asset-rename','manifest-write','manifest-rename','manifest-cleanup','manifest-write','manifest-rename','manifest-cleanup',...end]}));
for(const [fail,events]of [['imports',['lock','lock-owner','read-imports']],['inventory',prefix],['size',[...prefix,'size']],['stat',[...prefix,'size','stat']],['asset',[...prefix,'size','stat','asset-write']],['rename',[...prefix,'size','stat','asset-write','asset-rename']],['manifest',[...prefix,'size','stat','asset-write','asset-rename','manifest-write','manifest-cleanup']]])report.publication.push(await lockedCase({name:fail+'-error-ordering',total:10485760,fail,expectedError:new RegExp(fail+'-error'),expectedEvents:[...events,...end]}));

report.logs={};for(const p of ['full-initial-red.log','media-contracts.log','worker-red.tap.log','worker-final-red.tap.log','worker-existing-readonly.log','first-contracts.log','art-refined-contracts.log','assembled-hinge-red.log','p3-oracles-normals-red.log','hinge-final-contracts.log','harness-preservation-red.log','media-check.log']){const b=await read('.superpowers/sdd/2026-10-21-custom/'+p),s=b.toString();report.logs[p]={sha256:sha(b),bytes:b.length,summary:s.split(/\r?\n/).filter(l=>/^# (tests|pass|fail|duration_ms)|^(not ok|ok) \d+ - Custom/.test(l))};}
report.retainedDiagnostics={};for(const p of ['first-builder.mjs','first-candidate.glb','diagnose-first.mjs','diagnose-first.log','uv-corrected-contracts.log']){const b=await read('.superpowers/sdd/2026-10-21-custom/'+p);report.retainedDiagnostics[p]={bytes:b.length,sha256:sha(b)};}
const red=await fs.readFile(path.join(root,'.superpowers/sdd/2026-10-21-custom/worker-final-red.tap.log'),'utf8');assert.equal((red.match(/code: 'ERR_ASSERTION'/g)??[]).length,14);assert.ok(!/ENOENT|ERR_MODULE_NOT_FOUND/.test(red));
const initialLog=await fs.readFile(path.join(root,'.superpowers/sdd/2026-10-21-custom/review-pipeline-final-raw-scratch.log'),'utf8');
const initial=JSON.parse(initialLog.split('REVIEW_PIPELINE_JSON_BEGIN\n')[1].split('\nREVIEW_PIPELINE_JSON_END')[0]);
assert.deepEqual(report.textures.map(t=>({name:t.name,sha256:t.sha256})),initial.textures.map(t=>({name:t.name,sha256:t.sha256})),'all twelve maps must remain byte-frozen');
const materialFields=items=>JSON.parse(JSON.stringify(items.map(({renderedTriangles,...fields})=>fields)));assert.deepEqual(materialFields(report.materials),materialFields(initial.materials),'material factors and extensions remain frozen');
report.frozenPBR={allTwelveTextureHashesEqualInitial:true,allMaterialFieldsEqualInitial:true,configRawEqualInitial:report.before[cfgPath].raw===initial.before[cfgPath].raw};
report.archives={};for(const p of ['review-pipeline-report.md','review-pipeline-final-raw-scratch.log','review-pipeline-harness-raw-scratch.log','rebuild-proof-pre-fix.mjs']){const b=await read('.superpowers/sdd/2026-10-21-custom/'+p);report.archives[p]={bytes:b.length,sha256:sha(b)};}
assert.equal(report.archives['review-pipeline-report.md'].sha256,'8838dbb7b37651eedef2dda8944120c9d5cfb080e48a239285d7eb18ceafec54');
assert.equal(report.archives['rebuild-proof-pre-fix.mjs'].sha256,'797c46d8227158188982049b69f1fbe381d776dc87f20fb02d1bbe57d5cc78f1');
report.after=await pins();assert.deepEqual(report.after,report.before);report.finished=new Date().toISOString();
console.log('REVIEW_PIPELINE_JSON_BEGIN');console.log(JSON.stringify(report,null,2));console.log('REVIEW_PIPELINE_JSON_END');


