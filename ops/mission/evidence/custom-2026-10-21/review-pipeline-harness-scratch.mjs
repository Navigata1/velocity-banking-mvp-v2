import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {SourceTextModule,SyntheticModule} from 'node:vm';

const root=process.cwd(),file='.superpowers/sdd/2026-10-21-custom/rebuild-proof.mjs',source=await fs.readFile(file,'utf8');
let stdin='';for await(const chunk of process.stdin)stdin+=chunk;const baseline=JSON.parse(stdin);
assert.ok(Array.isArray(baseline.files)&&baseline.files.length>100,'stdin.files must contain the actual tracked filename list');
const trackedFiles=baseline.files.map(p=>p.trim().replaceAll('\\','/')).filter(Boolean);
const hash=b=>createHash('sha256').update(b).digest('hex'),abs=p=>path.resolve(String(p));
const actualModels=JSON.parse(await fs.readFile('apps/media/hero-models.json','utf8')),actualImports=JSON.parse(await fs.readFile('apps/media/hero-imported.json','utf8')),actualPosters=JSON.parse(await fs.readFile('apps/media/hero-provenance.json','utf8'));
for(const [records,prior]of [[actualModels,baseline.models],[actualImports,baseline.imports],[actualPosters,baseline.posters]])for(const record of records)if(records===actualPosters||record.id!=='custom')assert.deepEqual(record,prior.find(x=>x.id===record.id));
console.log('PASS actual baseline comparison: other nine model/import records and all ten poster records');
const output={harnessSha256:hash(source),otherNineRecordsUnchanged:true,allTenPosterRecordsUnchanged:true,cases:[]};
for(const scenario of ['control','retained-source-mutation','personal-video-and-manifest-mutation']){
  const memory=new Map(),events=[],readSync=p=>memory.get(abs(p))??readFileSync(p),read=async p=>memory.get(abs(p))??fs.readFile(p);let proof,mutated=false,packagedPayloadsChecked=0,selectedSources=[];
  const videosPath='apps/media/hyperframes/output/heroes/verification.json',videoPath='apps/media/hyperframes/output/heroes/personal.mp4',sourcePath='apps/media/sources/house/oak-albedo-v1.png';
  const beforeSource=hash(readSync(sourcePath)),beforeVideo=hash(readSync(videoPath));
  const mutate=()=>{if(mutated)return;mutated=true;if(scenario==='retained-source-mutation')memory.set(abs(sourcePath),Buffer.from('virtual changed retained source'));if(scenario==='personal-video-and-manifest-mutation'){const b=Buffer.from('virtual changed Personal MP4 payload'),videos=JSON.parse(readSync(videosPath));videos.find(v=>v.id==='personal').sha256=hash(b);memory.set(abs(videoPath),b);memory.set(abs(videosPath),Buffer.from(JSON.stringify(videos)));}};
  const pack=(destination,originals)=>{
    // Model the unchanged packager's hash validation and byte snapshots, not its I/O.
    const posters=JSON.parse(readSync('apps/media/hero-provenance.json')),models=JSON.parse(readSync('apps/media/hero-models.json')),videos=JSON.parse(readSync(videosPath));
    for(const p of posters){const m=models.find(m=>m.id===p.id),v=videos.find(v=>v.id===p.id);for(const [from,to,expected]of [[p.sourceFile?path.join(root,p.sourceFile):path.join(originals,p.source),`Full-Resolution-Art/${p.id}.png`,p.sourceSha256],[`apps/web/public/heroes/${p.id}.webp`,`Web-Posters/${p.id}.webp`,p.posterSha256],[`apps/web/public/heroes/${p.id}.glb`,`3D-Studies/${p.id}.glb`,m.sha256],[`apps/media/hyperframes/output/heroes/${p.id}.mp4`,`Turntables/${p.id}.mp4`,v.sha256]]){const b=readSync(from);assert.equal(hash(b),expected,'virtual packager preserves real hash validation');memory.set(abs(path.join(destination,to)),b);packagedPayloadsChecked++;}}
    for(const [name,from]of [['hero-provenance.json','apps/media/hero-provenance.json'],['hero-models.json','apps/media/hero-models.json'],['verification.json',videosPath]])memory.set(abs(path.join(destination,name)),readSync(from));
  };
  const execFileSync=(command,args,options={})=>{
    if(command==='git'){
      if(args[0]==='ls-files'){assert.equal(args[1],'--');const selectors=args.slice(2).map(p=>p.replaceAll('\\','/').replace(/\/$/,''));selectedSources=trackedFiles.filter(p=>selectors.some(s=>p===s||p.startsWith(s+'/')));assert.ok(selectedSources.includes(sourcePath),'mock ls-files must retain the exact source mutation target');return selectedSources.join('\n')+'\n';}
      if(args[0]==='show'){const p=args[1].slice(args[1].indexOf(':')+1),records=p==='apps/media/hero-models.json'?baseline.models:p==='apps/media/hero-imported.json'?baseline.imports:p==='apps/media/hero-provenance.json'?baseline.posters:null;const b=records?Buffer.from(JSON.stringify(records)):readSync(p);return options.encoding?b.toString(options.encoding):b;}
      assert.equal(args[0],'diff');return args.includes('apps/web/public')?'apps/web/public/heroes/custom.glb\n':'';
    }
    assert.equal(command,process.execPath);events.push(args[0]);mutate();if(args[0].endsWith('package-hero-collection.mjs'))pack(args[1],args[2]);return Buffer.alloc(0);
  };
  const fakeFs={readFile:async(p,encoding)=>{const b=await read(p);return encoding?b.toString(encoding):b;},readdir:fs.readdir,writeFile:async(p,b)=>{assert.ok(String(p).endsWith('rebuild-proof.json'));proof=JSON.parse(b);memory.set(abs(p),Buffer.from(b));}};
  function synth(values,id){return new SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);},{identifier:id});}
  const module=new SourceTextModule(source,{identifier:pathToFileURL(path.join(root,file)).href});
  await module.link(async spec=>synth(spec==='node:fs/promises'?{default:fakeFs}:spec==='node:child_process'?{execFileSync}:await import(spec),spec));
  let failure;try{await module.evaluate();}catch(e){failure=e;}
  if(scenario==='control'){assert.equal(failure,undefined);assert.ok(proof);assert.equal(proof.realPackagedVideos,10);assert.equal(proof.realPackagedSources,10);assert.equal(proof.otherNineVideosAndRecordsMatchBaseline,true);assert.equal(proof.allCurrentVideoBytesAndRecordsUnchangedThroughRebuilds,true);assert.ok(proof.sourceFingerprints[sourcePath]);assert.equal(proof.videoSnapshots.length,10);}
  else{assert.equal(failure?.code,'ERR_ASSERTION','negative must reject through the actual preservation assertion, not a missing mock API');assert.match(failure.message,scenario==='retained-source-mutation'?/retained source apps\/media\/sources\/house\/oak-albedo-v1\.png/:/video records/);assert.equal(proof,undefined);}
  const sourceChanged=hash(readSync(sourcePath))!==beforeSource,videoChanged=hash(readSync(videoPath))!==beforeVideo;
  assert.equal(sourceChanged,scenario==='retained-source-mutation');assert.equal(videoChanged,scenario==='personal-video-and-manifest-mutation');
  output.cases.push({scenario,harnessPassed:failure===undefined,errorCode:failure?.code,errorMessage:failure?.message,retainedSourceChanged:sourceChanged,otherNineVideoChanged:videoChanged,trackedSourceFilesSelected:selectedSources.length,sourceFingerprintsCaptured:proof?Object.keys(proof.sourceFingerprints).length:undefined,commandsMocked:events,realSpawnCount:0,realFilesystemWriterCount:0,packagedPayloadsChecked});
}
console.log(JSON.stringify(output,null,2));
