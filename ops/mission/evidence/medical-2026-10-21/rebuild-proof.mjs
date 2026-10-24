import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root=process.cwd(),out=path.resolve('.superpowers/sdd/2026-10-21-medical');
const baseline='ecc682a177bad936a2275269e73de76d58f9c2ac',hash=b=>createHash('sha256').update(b).digest('hex');
const originalDirectory='C:/Users/IslandDevCrew/.codex/generated_images/019ea496-fc35-7f23-8c1d-86d32f75364f';
const ids=['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault'];
const oldJson=file=>JSON.parse(execFileSync('git',['show',baseline+':'+file],{encoding:'utf8'}));
const readJson=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const before={models:await readJson('apps/media/hero-models.json'),imports:await readJson('apps/media/hero-imported.json'),posters:await readJson('apps/media/hero-provenance.json')};
const bytes={};for(const id of ids)for(const extension of ['glb','webp'])bytes[id+'.'+extension]=hash(await fs.readFile(`apps/web/public/heroes/${id}.${extension}`));
for(const [file,records]of [['apps/media/hero-models.json',before.models],['apps/media/hero-provenance.json',before.posters]]) {
  const old=oldJson(file);for(const id of ids.filter(id=>id!=='medical'))assert.deepEqual(records.find(r=>r.id===id),old.find(r=>r.id===id),id+' baseline record');
}
for(const id of ids.filter(id=>id!=='medical'))for(const extension of ['glb','webp'])assert.equal(hash(execFileSync('git',['show',`${baseline}:apps/web/public/heroes/${id}.${extension}`],{maxBuffer:10*1024*1024})),bytes[id+'.'+extension],id+' baseline bytes');
const unchangedPaths=['packages/financial-engine','packages/persistence-contract','apps/mobile','apps/web/src','apps/web/scripts',
  '.github','supabase','apps/media/src','apps/media/remotion','apps/media/hero-turntables/index.html',
  'apps/web/package.json','apps/web/package-lock.json','apps/media/package.json','apps/media/package-lock.json'];
assert.equal(execFileSync('git',['diff','--name-only',baseline,'--',...unchangedPaths],{encoding:'utf8'}).trim(),'');
assert.deepEqual(execFileSync('git',['diff','--name-only',baseline,'--','apps/web/public'],{encoding:'utf8'}).trim().split('\n').sort(),['apps/web/public/heroes/medical.glb','apps/web/public/heroes/medical.webp']);
const run=args=>execFileSync(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true,timeout:180000});
async function verify(label) {
  assert.deepEqual(await readJson('apps/media/hero-models.json'),before.models,label+' models');
  assert.deepEqual(await readJson('apps/media/hero-imported.json'),before.imports,label+' imports');
  assert.deepEqual(await readJson('apps/media/hero-provenance.json'),before.posters,label+' posters');
  for(const id of ids)for(const extension of ['glb','webp'])assert.equal(hash(await fs.readFile(`apps/web/public/heroes/${id}.${extension}`)),bytes[id+'.'+extension],label+' '+id+'.'+extension);
  console.log('PASS '+label);
}
run(['apps/media/scripts/build-refined-medical.mjs']);await verify('identical Medical model regeneration');
run(['apps/media/scripts/build-medical-poster.mjs']);await verify('identical Medical poster regeneration');
run(['apps/media/scripts/build-hero-models.mjs']);await verify('protected full model rebuild');
run(['apps/media/scripts/prepare-hero-posters.mjs',originalDirectory]);await verify('protected full poster rebuild');
const packaged=path.join(out,'package-proof');run(['apps/media/scripts/package-hero-collection.mjs',packaged,originalDirectory]);
const videos=await readJson('apps/media/hyperframes/output/heroes/verification.json');
for(const id of ids) {
  const p=before.posters.find(r=>r.id===id),m=before.models.find(r=>r.id===id),v=videos.find(r=>r.id===id);
  for(const [file,expected]of [[`Full-Resolution-Art/${id}.png`,p.sourceSha256],[`Web-Posters/${id}.webp`,p.posterSha256],
    [`3D-Studies/${id}.glb`,m.sha256],[`Turntables/${id}.mp4`,v.sha256]])assert.equal(hash(await fs.readFile(path.join(packaged,file))),expected,file);
}
for(const [file,records]of [['hero-provenance.json',before.posters],['hero-models.json',before.models],['verification.json',videos]])assert.deepEqual(await readJson(path.join(packaged,file)),records);
await fs.writeFile(path.join(out,'rebuild-proof.json'),JSON.stringify({baseline,unchangedPaths,otherNineModelPosterBytesAndRecordsUnchanged:true,
  identicalModelRegeneration:true,identicalPosterRegeneration:true,protectedFullModelRebuild:true,protectedFullPosterRebuild:true,
  realPackagedSources:10,realPackagedPosters:10,realPackagedModels:10,realPackagedVideos:10,packagedManifestSnapshotsVerified:true,files:bytes},null,2)+'\n');
console.log('PASS real 40-file art/poster/model/video package and captured manifest hashes');
