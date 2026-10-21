import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.cwd(),out=path.resolve('.superpowers/sdd/2026-10-21-custom'),baseline='8e2f25ef6b81ffc65b9f96644170834c511078d3';
const hash=b=>createHash('sha256').update(b).digest('hex'),originals='C:/Users/IslandDevCrew/.codex/generated_images/019ea496-fc35-7f23-8c1d-86d32f75364f';
const ids=['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault'],old=file=>JSON.parse(execFileSync('git',['show',baseline+':'+file],{encoding:'utf8'}));
assert.equal(ids.length,10);assert.equal(new Set(ids).size,10,'all ten model IDs must be distinct');
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const before={models:await json('apps/media/hero-models.json'),imports:await json('apps/media/hero-imported.json'),posters:await json('apps/media/hero-provenance.json')};
const videos=await json('apps/media/hyperframes/output/heroes/verification.json'),baselineVideos=await json('C:/Users/IslandDevCrew/Desktop/InterestShield-Hero-Collection-2026-10-20/verification.json');
assert.equal(videos.length,10);assert.deepEqual([...new Set(videos.map(v=>v.id))].sort(),[...ids].sort());assert.equal(baselineVideos.length,10);
for(const video of videos){assert.equal(hash(await fs.readFile(`apps/media/hyperframes/output/heroes/${video.id}.mp4`)),video.sha256,video.id+' initial video bytes');if(video.id!=='custom')assert.deepEqual(video,baselineVideos.find(v=>v.id===video.id),video.id+' retained baseline video record');}
const bytes={};for(const id of ids)for(const extension of ['glb','webp'])bytes[id+'.'+extension]=hash(await fs.readFile(`apps/web/public/heroes/${id}.${extension}`));
for(const [file,records]of [['apps/media/hero-models.json',before.models],['apps/media/hero-imported.json',before.imports],['apps/media/hero-provenance.json',before.posters]]){const prior=old(file);for(const record of records)if(file.endsWith('hero-provenance.json')||record.id!=='custom')assert.deepEqual(record,prior.find(r=>r.id===record.id),file+' '+record.id);}
for(const id of ids)for(const extension of ['glb','webp'])if(id!=='custom'||extension==='webp')assert.equal(hash(execFileSync('git',['show',`${baseline}:apps/web/public/heroes/${id}.${extension}`],{maxBuffer:10*1024*1024})),bytes[id+'.'+extension],id+' baseline '+extension);
const unchangedPaths=['packages/financial-engine','packages/persistence-contract','apps/mobile','apps/web/src','apps/web/scripts','.github','supabase','apps/media/src','apps/media/remotion','apps/media/hero-turntables/index.html','apps/web/package.json','apps/web/package-lock.json','apps/media/package.json','apps/media/package-lock.json',
  'apps/media/scripts/package-hero-collection.mjs','apps/media/scripts/prepare-hero-posters.mjs','apps/media/scripts/hero-poster-publication.mjs','apps/media/scripts/refined-hero-record.mjs','apps/media/hero-provenance.json'];
unchangedPaths.push('apps/media/scripts/build-hero-models.mjs',...before.imports.filter(r=>r.id!=='custom'&&r.sourceFile).map(r=>r.sourceFile),
  ...['house','land','vault','credit-card','student-loan','medical','personal','recreation'].map(id=>'apps/media/sources/'+id),
  'apps/media/scripts/personal-geometry-test-helpers.mjs',...(await fs.readdir('apps/media/scripts')).filter(name=>name.endsWith('.test.mjs')&&name!=='custom-refinement.test.mjs').map(name=>'apps/media/scripts/'+name));
assert.equal(execFileSync('git',['diff','--name-only',baseline,'--',...unchangedPaths],{encoding:'utf8'}).trim(),'');
assert.equal(execFileSync('git',['diff','--name-only',baseline,'--','apps/web/public'],{encoding:'utf8'}).trim(),'apps/web/public/heroes/custom.glb');
const sourceFiles=execFileSync('git',['ls-files','--',...unchangedPaths],{encoding:'utf8'}).trim().split('\n').filter(Boolean),sourceFingerprints={};
for(const file of new Set([...sourceFiles,'apps/media/scripts/build-refined-custom.mjs','apps/media/scripts/custom-refinement.test.mjs','apps/media/sources/custom/materials.json']))sourceFingerprints[file]=hash(await fs.readFile(file));
async function verifyRetained(label){for(const [file,expected]of Object.entries(sourceFingerprints))assert.equal(hash(await fs.readFile(file)),expected,label+' retained source '+file);assert.deepEqual(await json('apps/media/hyperframes/output/heroes/verification.json'),videos,label+' video records');for(const video of videos)assert.equal(hash(await fs.readFile(`apps/media/hyperframes/output/heroes/${video.id}.mp4`)),video.sha256,label+' video bytes '+video.id);}
const run=args=>execFileSync(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true,timeout:180000});
async function verify(label){for(const [file,expected]of [['hero-models.json',before.models],['hero-imported.json',before.imports],['hero-provenance.json',before.posters]])assert.deepEqual(await json('apps/media/'+file),expected,label+' '+file);for(const id of ids)for(const extension of ['glb','webp'])assert.equal(hash(await fs.readFile(`apps/web/public/heroes/${id}.${extension}`)),bytes[id+'.'+extension],label+' '+id+'.'+extension);await verifyRetained(label);console.log('PASS '+label);}
run(['apps/media/scripts/build-refined-custom.mjs']);await verify('identical Custom model regeneration');
run(['apps/media/scripts/build-hero-models.mjs']);await verify('protected full model rebuild');
run(['apps/media/scripts/prepare-hero-posters.mjs',originals]);await verify('protected full poster rebuild');
const packaged=path.join(out,'package-proof');run(['apps/media/scripts/package-hero-collection.mjs',packaged,originals]);await verifyRetained('real package');
for(const id of ids){const p=before.posters.find(r=>r.id===id),m=before.models.find(r=>r.id===id),v=videos.find(r=>r.id===id);for(const [file,expected]of [[`Full-Resolution-Art/${id}.png`,p.sourceSha256],[`Web-Posters/${id}.webp`,p.posterSha256],[`3D-Studies/${id}.glb`,m.sha256],[`Turntables/${id}.mp4`,v.sha256]])assert.equal(hash(await fs.readFile(path.join(packaged,file))),expected,file);}
for(const [file,expected]of [['hero-provenance.json',before.posters],['hero-models.json',before.models],['verification.json',videos]])assert.deepEqual(await json(path.join(packaged,file)),expected,file);
await fs.writeFile(path.join(out,'rebuild-proof.json'),JSON.stringify({baseline,unchangedPaths,otherNineModelBytesAndRecordsUnchanged:true,allTenPostersUnchanged:true,otherNineVideosAndRecordsMatchBaseline:true,allCurrentVideoBytesAndRecordsUnchangedThroughRebuilds:true,sourceFingerprints,videoSnapshots:videos,identicalModelRegeneration:true,protectedFullModelRebuild:true,protectedFullPosterRebuild:true,realPackagedSources:10,realPackagedPosters:10,realPackagedModels:10,realPackagedVideos:10,packagedManifestSnapshotsVerified:true,files:bytes},null,2)+'\n');
console.log('PASS real 40-file art/poster/model/video package and captured manifest hashes');
