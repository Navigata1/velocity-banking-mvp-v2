import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const hash=b=>createHash('sha256').update(b).digest('hex');
const baseline='2fe733ccc8ed344d9279f123c0ab3206946d6ffb';
const ids=['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault'];
const before=JSON.parse(await fs.readFile('apps/media/hero-models.json','utf8'));
const imported=JSON.parse(await fs.readFile('apps/media/hero-imported.json','utf8'));
const bytes=Object.fromEntries(await Promise.all(ids.map(async id=>[id,hash(await fs.readFile(`apps/web/public/heroes/${id}.glb`))])));
const records=JSON.parse(execFileSync('git',['show',`${baseline}:apps/media/hero-models.json`],{encoding:'utf8'}));
const recordsOf=value=>Array.isArray(value)?value:value.models;
for(const id of ids.filter(id=>id!=='studentLoan')) {
  const old=execFileSync('git',['show',`${baseline}:apps/web/public/heroes/${id}.glb`],{maxBuffer:10*1024*1024});
  assert.equal(hash(old),bytes[id],id+' baseline byte drift');
  assert.deepEqual(recordsOf(before).find(r=>r.id===id),recordsOf(records).find(r=>r.id===id),id+' baseline record drift');
}
const invariantPaths=['packages/financial-engine','packages/persistence-contract','apps/mobile',
  'apps/web/src','apps/web/scripts','apps/media/hero-turntables/index.html','apps/media/remotion',
  'supabase','.github','apps/web/package.json','apps/media/package.json','apps/web/package-lock.json','apps/media/package-lock.json'];
assert.equal(execFileSync('git',['diff','--name-only',baseline,'--',...invariantPaths],{encoding:'utf8'}).trim(),'');
execFileSync(process.execPath,['apps/media/scripts/build-refined-student-loan.mjs'],{stdio:'inherit',windowsHide:true});
assert.deepEqual(JSON.parse(await fs.readFile('apps/media/hero-models.json','utf8')),before,'identical regeneration records');
assert.deepEqual(JSON.parse(await fs.readFile('apps/media/hero-imported.json','utf8')),imported,'identical regeneration imported');
for(const id of ids)assert.equal(hash(await fs.readFile(`apps/web/public/heroes/${id}.glb`)),bytes[id],id+' regeneration byte drift');
execFileSync(process.execPath,['apps/media/scripts/build-hero-models.mjs'],{stdio:'inherit',windowsHide:true});
assert.deepEqual(JSON.parse(await fs.readFile('apps/media/hero-models.json','utf8')),before,'protected rebuild records');
assert.deepEqual(JSON.parse(await fs.readFile('apps/media/hero-imported.json','utf8')),imported,'protected rebuild imports');
for(const id of ids)assert.equal(hash(await fs.readFile(`apps/web/public/heroes/${id}.glb`)),bytes[id],id+' protected byte drift');
await fs.writeFile(new URL('rebuild-proof.json',import.meta.url),JSON.stringify({baseline,unchangedPaths:invariantPaths,
  identicalRegeneration:true,protectedRebuild:true,otherNineBytesAndRecordsUnchanged:true,models:bytes},null,2)+'\n');
console.log('PASS identical regeneration, protected full rebuild, nine baseline assets and invariant source paths');
