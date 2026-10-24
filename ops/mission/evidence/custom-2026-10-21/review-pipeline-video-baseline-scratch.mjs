import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='C:/Users/IslandDevCrew/Desktop/InterestShield-Hero-Collection-2026-10-20';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>fs.readFile(p),json=async p=>JSON.parse(await read(p));
const manifest=await json(dir+'/Recreation-8e2f25e-File-Manifest.json');
assert.equal(manifest.headSha,'8e2f25ef6b81ffc65b9f96644170834c511078d3');
const oldBytes=await read(dir+'/verification.json');assert.equal(sha(oldBytes),manifest.files['verification.json'].sha256);
const before=await read('apps/media/hyperframes/output/heroes/verification.json'),videos=JSON.parse(before),old=JSON.parse(oldBytes),results=[];
assert.equal(videos.length,10);assert.equal(new Set(videos.map(v=>v.id)).size,10);
for(const v of videos){const b=await read('apps/media/hyperframes/output/heroes/'+v.id+'.mp4');assert.equal(sha(b),v.sha256,v.id+' current video hash');assert.equal(b.length,v.bytes,v.id+' current video length');if(v.id!=='custom'){assert.deepEqual(v,old.find(p=>p.id===v.id),v.id+' baseline record');const pinned=manifest.files['Turntables/'+v.id+'.mp4'],desktop=await read(dir+'/Turntables/'+v.id+'.mp4');assert.equal(sha(b),pinned.sha256);assert.equal(sha(desktop),pinned.sha256);assert.equal(b.length,pinned.bytes);}results.push({id:v.id,bytes:b.length,sha256:sha(b),baselineRecordAndBytesUnchanged:v.id!=='custom'});}
assert.deepEqual(await read('apps/media/hyperframes/output/heroes/verification.json'),before,'video manifest must remain stable across the read-only probe');
console.log(JSON.stringify({baselineHead:manifest.headSha,baselineManifestSha256:sha(await read(dir+'/Recreation-8e2f25e-File-Manifest.json')),baselineVideoManifestSha256:sha(oldBytes),currentVideoManifestSha256:sha(before),otherNineVideoRecordsAndBytesUnchanged:true,allTenCurrentVideoBytesMatchRecords:true,videos:results},null,2));
