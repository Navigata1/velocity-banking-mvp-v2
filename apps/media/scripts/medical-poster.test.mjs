import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';
const hash=b=>createHash('sha256').update(b).digest('hex');
const url=p=>new URL(p,import.meta.url);

test('Medical poster retains traceable original-badge edit sources and current delivery hashes',async()=>{
  const record=JSON.parse(await readFile(url('../hero-provenance.json'),'utf8')).find(r=>r.id==='medical');
  assert.equal(record.revision,2,'Medical needs a traceable original emerald-badge revision');
  assert.equal(record.sourceFile,'apps/media/sources/medical/poster.png');
  const source=await readFile(url('../sources/medical/poster.png')),poster=await readFile(url('../../web/public/heroes/medical.webp'));
  assert.equal(hash(source),record.sourceSha256);assert.equal(hash(poster),record.posterSha256);assert.equal(poster.length,record.bytes);
  const notes=JSON.parse(await readFile(url('../sources/medical/poster.json'),'utf8'));
  assert.equal(notes.originalPosterSha256,'090b189bd6ec0a40e23ad470acbf86ff0b950a481153fc6f991a2876e5e9cda2');
  assert.equal(notes.tool,'OpenAI image_gen');assert.ok(notes.prompt.includes('shield')&&notes.limitations);
});

test('Medical fallback preserves transparent detailed case/stethoscope and uses an emerald badge',async()=>{
  const {data,info}=await sharp(await readFile(url('../../web/public/heroes/medical.webp'))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.ok(info.width>=1200&&info.height>=750&&Math.abs(info.width/info.height-1.5)<0.03);
  let red=0,green=0,opaque=0,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++) {
    const i=(y*info.width+x)*4,[r,g,b,a]=data.subarray(i,i+4);
    if(a<16)transparent++;if(a>240)opaque++;
    if(x<info.width*.45||x>info.width*.72||y<info.height*.25||y>info.height*.72||a<200)continue;
    if(r>95&&r>g*1.6&&r>b*1.6)red++;
    if(g>35&&g>r*1.3&&g>b*1.05)green++;
  }
  assert.ok(transparent>info.width*info.height*.1&&opaque>info.width*info.height*.25,'real transparent cutout with substantial subject pixels');
  assert.ok(green>200,'front badge needs visible emerald surface');
  assert.ok(red<20,'old red-cross decoration must not remain on the white case');
});

test('Medical poster preparation is reproducible and rejects corrupted source lineage before encoding',async()=>{
  const module=await import(url('./prepare-medical-poster.mjs')).catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return null;throw error;});
  assert.equal(typeof module?.prepareMedicalPoster,'function','Medical needs a reproducible protected poster recipe');
  const {output,record}=await module.prepareMedicalPoster();
  assert.equal(hash(output),hash(await readFile(url('../../web/public/heroes/medical.webp'))));
  assert.deepEqual(record,JSON.parse(await readFile(url('../hero-provenance.json'),'utf8')).find(r=>r.id==='medical'));
  await assert.rejects(module.prepareMedicalPoster({sourceBytes:Buffer.from('corrupted source')}),/source hash mismatch/);
  await assert.rejects(module.prepareMedicalPoster({originalBytes:Buffer.from('corrupted original')}),/original poster hash mismatch/);
});

test('Legacy poster preparation and collection packaging retain the edited Medical source',async()=>{
  const prepare=await readFile(url('./prepare-hero-posters.mjs'),'utf8'),pack=await readFile(url('./package-hero-collection.mjs'),'utf8');
  let protectedBranch=false;
  simple(parse(prepare,{ecmaVersion:'latest',sourceType:'module'}),{IfStatement(n){
    if(n.test.type==='BinaryExpression'&&n.test.operator==='==='&&n.test.left.name==='id'&&n.test.right.value==='medical') {
      let recipe=false,skip=false;
      simple(n.consequent,{CallExpression(c){if(c.callee.name==='prepareMedicalPoster')recipe=true;},ContinueStatement(){skip=true;}});
      protectedBranch=recipe&&skip;
    }
  }});
  assert.ok(protectedBranch,'full legacy rebuild must use the new Medical recipe and skip the old red-cross source');
  assert.ok(pack.includes('hero.sourceFile')&&pack.includes('sourceSha256'),'packaging must use and validate the edited source, not a legacy original');
});

test('Poster publication rejects an actual cap-plus-one replacement without changing old bytes or provenance',async()=>{
  const module=await import(url('./hero-poster-publication.mjs')).catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return null;throw error;});
  assert.equal(typeof module?.publishHeroPosters,'function','Poster publication needs the shared asset lock and current public-byte budget');
  const base=fileURLToPath(url('../.cache/medical-poster-contract/'));await mkdir(base,{recursive:true});
  const directory=await mkdtemp(path.join(base,'budget-')),publicRoot=path.join(directory,'public'),heroes=path.join(publicRoot,'heroes');
  await mkdir(heroes,{recursive:true});
  const target=path.join(heroes,'medical.webp'),provenance=path.join(directory,'provenance.json');
  const before=Buffer.from('before'),output=Buffer.from('after!!');
  const old=[{id:'medical',bytes:before.length,posterSha256:hash(before)}];
  const record={id:'medical',revision:2,bytes:output.length,posterSha256:hash(output)};
  const options={publicRoot,provenance,lockPaths:{imported:path.join(directory,'imported.json'),inventory:path.join(directory,'inventory.json')}};
  try {
    await writeFile(target,before);await writeFile(provenance,JSON.stringify(old));
    await writeFile(path.join(publicRoot,'other.bin'),Buffer.alloc(10*1024*1024-before.length));
    await assert.rejects(module.publishHeroPosters([{output,record}],options),/10MiB public budget/);
    assert.deepEqual(await readFile(target),before);assert.deepEqual(JSON.parse(await readFile(provenance,'utf8')),old);
    await writeFile(path.join(publicRoot,'other.bin'),Buffer.alloc(10*1024*1024-100));
    await module.publishHeroPosters([{output,record}],options);
    assert.deepEqual(await readFile(target),output);assert.deepEqual(JSON.parse(await readFile(provenance,'utf8')),[record]);
    await assert.rejects(module.publishHeroPosters([{output,record},{output,record}],options),/duplicate/);
    assert.deepEqual(await readFile(target),output);
  } finally {
    assert.equal(path.dirname(directory),path.resolve(base));
    await rm(directory,{recursive:true,force:true});
  }
});

test('Poster publication rejects malformed incoming or stored revisions before asset and provenance writes',async()=>{
  const {publishHeroPosters}=await import(url('./hero-poster-publication.mjs'));
  const base=fileURLToPath(url('../.cache/medical-poster-contract/'));await mkdir(base,{recursive:true});
  const directory=await mkdtemp(path.join(base,'revision-')),publicRoot=path.join(directory,'public'),heroes=path.join(publicRoot,'heroes');
  await mkdir(heroes,{recursive:true});
  const target=path.join(heroes,'medical.webp'),provenance=path.join(directory,'provenance.json'),before=Buffer.from('revision-three'),output=Buffer.from('changed');
  const previous={id:'medical',revision:3,bytes:before.length,posterSha256:hash(before)},record={id:'medical',revision:3,bytes:output.length,posterSha256:hash(output)};
  const options={publicRoot,provenance,lockPaths:{imported:path.join(directory,'imported.json'),inventory:path.join(directory,'inventory.json')}};
  try {
    await writeFile(target,before);await writeFile(provenance,JSON.stringify([previous]));
    for(const revision of ['3','invalid',null,0,-1,2.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) {
      await assert.rejects(publishHeroPosters([{output,record:{...record,revision}}],options),/revision/i);
      assert.deepEqual(await readFile(target),before);assert.deepEqual(JSON.parse(await readFile(provenance,'utf8')),[previous]);
    }
    await writeFile(provenance,JSON.stringify([{...previous,revision:'3'}]));
    await assert.rejects(publishHeroPosters([{output,record:{...record,revision:4}}],options),/revision/i);
    assert.deepEqual(await readFile(target),before);
    await writeFile(provenance,JSON.stringify([previous]));
    await publishHeroPosters([{output,record:{...record,revision:4}}],options);
    assert.deepEqual(await readFile(target),output);
  } finally {assert.equal(path.dirname(directory),path.resolve(base));await rm(directory,{recursive:true,force:true});}
});

test('Collection packaging delivers validated source and manifest snapshots despite source-path changes',async()=>{
  const sourceURL=url('./package-hero-collection.mjs'),source=await readFile(sourceURL,'utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
  const edits=ast.body.filter(n=>n.type==='ImportDeclaration').map(n=>({...n,text:''}));
  simple(ast,{MemberExpression(n){if(n.object.type==='MetaProperty'&&n.property.name==='url')edits.push({...n,text:JSON.stringify(sourceURL.href)});}});
  let code=source;for(const n of edits.sort((a,b)=>b.start-a.start))code=code.slice(0,n.start)+n.text+code.slice(n.end);
  const root=new URL('../../../',sourceURL),destination=fileURLToPath(url('../.cache/medical-package-fixture/'));
  const key=p=>path.resolve(p instanceof URL?fileURLToPath(p):p),files=new Map(),delivered=new Map();
  const sourceBytes=Buffer.from('validated-source'),poster=Buffer.from('poster'),model=Buffer.from('model'),video=Buffer.from('video');
  const record={id:'medical',source:'edited.png',sourceFile:'apps/media/sources/medical/poster.png',sourceSha256:hash(sourceBytes),posterSha256:hash(poster),bytes:poster.length,revision:2};
  const provenanceBytes=Buffer.from(JSON.stringify([record])),sourceFile=new URL(record.sourceFile,root),provenanceURL=new URL('../hero-provenance.json',sourceURL);
  const put=(p,b)=>files.set(key(p),Buffer.from(b));
  put(provenanceURL,provenanceBytes);put(sourceFile,sourceBytes);
  put(new URL('../hero-models.json',sourceURL),JSON.stringify([{id:'medical',sha256:hash(model)}]));
  put(new URL('../hyperframes/output/heroes/verification.json',sourceURL),JSON.stringify([{id:'medical',sha256:hash(video)}]));
  put(new URL('../../web/public/heroes/medical.webp',sourceURL),poster);put(new URL('../../web/public/heroes/medical.glb',sourceURL),model);
  put(new URL('../hyperframes/output/heroes/medical.mp4',sourceURL),video);
  put(new URL('../hero-turntables/ASSET-COLLECTION.md',sourceURL),'readme');put(new URL('../../../docs/ASSET-CREDITS.md',sourceURL),'credits');
  let locked=false,lockCalls=0,success=false;const writeStates=[];
  const read=async(p,encoding)=>{
    const name=key(p),bytes=files.get(name);assert.ok(bytes,'unexpected package fixture read: '+name);
    if(name===key(sourceFile))put(sourceFile,'unvalidated-source');
    if(name===key(provenanceURL))put(provenanceURL,JSON.stringify([{...record,sourceSha256:hash(Buffer.from('unvalidated-source'))}]));
    return encoding==='utf8'?bytes.toString():Buffer.from(bytes);
  };
  const write=async(p,bytes)=>{delivered.set(key(p),Buffer.from(bytes));writeStates.push(locked);};
  const copy=async(from,to)=>{assert.ok(files.has(key(from)));await write(to,files.get(key(from)));};
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  await new AsyncFunction('mkdir','copyFile','readFile','writeFile','createHash','path','process','console','withHeroManifestLock',code)(
    async()=>{},copy,read,write,createHash,path,{argv:['node','package',destination,'unused-originals']},{log:()=>{success=true;}},async action=>{lockCalls++;locked=true;try{return await action();}finally{locked=false;}});
  assert.ok(success);assert.deepEqual(delivered.get(key(path.join(destination,'Full-Resolution-Art/medical.png'))),sourceBytes,'copy the validated buffer, not a re-opened mutable source');
  assert.deepEqual(delivered.get(key(path.join(destination,'hero-provenance.json'))),provenanceBytes,'deliver the captured manifest, not a later live generation');
  assert.equal(lockCalls,1);assert.ok(writeStates.length>5&&writeStates.every(Boolean),'package one validated generation under the existing shared asset lock');
});
