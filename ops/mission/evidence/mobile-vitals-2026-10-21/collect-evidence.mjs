import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const cache=path.resolve('.superpowers/sdd/2026-10-21-mobile-vitals'),out='ops/mission/evidence/mobile-vitals-2026-10-21';
const hash=b=>createHash('sha256').update(b).digest('hex'),baseline=JSON.parse(await fs.readFile('.superpowers/sdd/2026-10-21-custom/postflight.json','utf8'));
assert.equal(baseline.headSha,'caefd8086180513b3fb6c1cf85492174996a437b');
const allowed=['apps/web/scripts/engine-regression-tests.cjs','apps/web/scripts/smoke-dashboard-interest.cjs','apps/web/src/app/page.tsx'];
assert.deepEqual(execFileSync('git',['diff','--name-only',baseline.headSha,'--','apps/web','apps/mobile','apps/media','packages','.github','supabase'],{encoding:'utf8'}).trim().split('\n').sort(),[...allowed].sort());
const sources={};for(const [file,expected]of Object.entries(baseline.local.sources)){
 const actual=hash((await fs.readFile(file,'utf8')).replace(/\r\n?/g,'\n'));if(!allowed.includes(file))assert.equal(actual,expected,file+' protected source');sources[file]=actual;
}for(const file of allowed)assert.ok(sources[file],file+' fingerprint');
const ids=['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault'];
const models=JSON.parse(await fs.readFile('apps/media/hero-models.json','utf8')),posters=JSON.parse(await fs.readFile('apps/media/hero-provenance.json','utf8'));
const videos=JSON.parse(await fs.readFile('apps/media/hyperframes/output/heroes/verification.json','utf8'));
assert.equal(models.length,10);assert.equal(posters.length,10);assert.deepEqual(videos,baseline.local.rebuild.videoSnapshots);
for(const id of ids){const m=models.find(m=>m.id===id),p=posters.find(p=>p.id===id),v=videos.find(v=>v.id===id),old=baseline.hosted.served.find(m=>m.id===id);assert.equal(m.sha256,old.sha256);assert.equal(p.posterSha256,baseline.hosted.posters.find(p=>p.id===id).sha256);
 for(const file of [`apps/web/public/heroes/${id}.glb`,`apps/media/hyperframes/vendor/heroes/${id}.glb`,`apps/media/hero-turntables/vendor/heroes/${id}.glb`])assert.equal(hash(await fs.readFile(file)),m.sha256,file);
 assert.equal(hash(await fs.readFile(`apps/web/public/heroes/${id}.webp`)),p.posterSha256,id+' poster');assert.equal(hash(await fs.readFile(`apps/media/hyperframes/output/heroes/${id}.mp4`)),v.sha256,id+' video');
}
for(const [file,phrase]of [['web-browser-gates.log','PASS local input'],['web-tests.log','348 regression tests passed.'],['media-check.log','Rendered 27 Remotion matrix stills.'],['turn-verification.log','PASS vault'],['layout-red.log','"/day","oneLine":false']])assert.ok((await fs.readFile(path.join(cache,file),'utf8')).includes(phrase),file);
const media=await fs.readFile(path.join(cache,'media-check.log'),'utf8');assert.match(media,/# tests 145\b/);assert.match(media,/# fail 0\b/);
const dashboard=JSON.parse(await fs.readFile('apps/web/test-results/dashboard-interest/verification.json','utf8'));assert.equal(dashboard.receipts.length,18);
assert.deepEqual([...new Set(dashboard.receipts.map(r=>r.width))].sort((a,b)=>a-b),[280,375,1440]);
for(const r of dashboard.receipts){assert.equal(r.layout.length,4);assert.ok(r.heroVisibleHeight>=48&&r.savedInputsPreserved&&r.errors.length===0);for(const v of r.layout){assert.ok(v.inViewport&&v.value.fontSize>=12&&v.label.glyphBottom<=v.value.glyphTop+1);for(const part of ['label','value'])assert.ok(v[part].visible&&v[part].fits&&v[part].tokens.length>0&&v[part].tokens.every(t=>t.oneLine&&t.contained));}}
const boundaries=dashboard.receipts.flatMap(r=>r.boundaries);assert.equal(boundaries.length,4);assert.deepEqual([...new Set(boundaries.map(b=>b.width))].sort((a,b)=>a-b),[768,1264]);
const controls=JSON.parse(await fs.readFile('apps/web/test-results/dashboard-interest/oracle-controls.json','utf8'));assert.equal(controls.length,7);assert.ok(controls.every(c=>c.rejected));
await fs.mkdir(out,{recursive:true});
for(const name of ['web-browser-gates','three-stage','heroes','fallbacks','http-routes','routes','dashboard','comparison','vault','portfolio','portability','input','web-tests','web-lint','web-build','web-runtime-audit','media-check','turn-verification','layout-red','layout-initial-red','layout-green-final','web-tests-obsolete-row-red','oracle-controls-red','oracle-controls-initial-red','empty-control-red'])await fs.copyFile(path.join(cache,name+'.log'),path.join(out,name+'.log'));
const baselineFiles=['baseline-report.md','baseline-results.json','baseline-diagnostics.json','baseline-files.json','baseline-verify.cjs',...['push','pull_request'].flatMap(e=>[`baseline-${e}-web.log`,`baseline-${e}-sql.log`])];
for(const name of await fs.readdir(cache))if(baselineFiles.includes(name)||/^review-.+\.(?:md|json|log|mjs|cjs|txt|png|diff)$/.test(name))await fs.copyFile(path.join(cache,name),path.join(out,name));
for(const name of ['before-house-375.png','before-house-375-layout.json','oracle-controls-red.json','empty-control-red.json','collect-evidence.mjs'])await fs.copyFile(path.join(cache,name),path.join(out,name));
for(const name of await fs.readdir('apps/web/test-results/dashboard-interest'))if(name.endsWith('-layout.json')||/^(house|auto|large-import)-(280|375|1440)-viewport\.png$/.test(name))await fs.copyFile('apps/web/test-results/dashboard-interest/'+name,path.join(out,name));
await fs.writeFile(path.join(out,'dashboard-verification.json'),JSON.stringify(dashboard,null,2)+'\n');
await fs.writeFile(path.join(out,'oracle-controls-green.json'),JSON.stringify(controls,null,2)+'\n');
const files={};for(const name of await fs.readdir(out)){const bytes=await fs.readFile(path.join(out,name));files[name]={bytes:bytes.length,sha256:hash(bytes)};}
const receipt={verifiedAt:new Date().toISOString(),baseline:baseline.headSha,stage:'Local preflight; both complete exact-head CI and hosted proof required',productionReady:false,allowedSourceChanges:allowed,sources,
 web:{regressions:348,dashboardCases:18,responsiveBoundaryProbes:4,oracleControls:7,heroViewportCases:20,hostedCasesRequired:88,mainWidths:[280,375,1440],boundaryWidths:[768,1264]},media:{contracts:145,freshStills:27,newModels:[],newVideos:[],unchangedModelsAndPosters:10,unchangedVideosRechecked:10},
 priorReceipt:baseline.receipt,models,posters,videos,files,limitations:['Display-only fix; no financial engine, scenario, native, persistence, asset, studio, motion, dependency or SQL changes','Two obsolete exact one-row source assertions replaced by actual browser token/first-viewport/hero checks; all financial assertions retained','Browser plugin skill absent; existing finite Chrome/Playwright repository QA used under explicit browser/Chrome authorization','No final all-ten photoreal, physical-device, cloud/backend, lender/calendar or production approval','Desktop report only statically checked unless separately proven otherwise']};
await fs.writeFile(path.join(out,'artifact-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({files:Object.keys(files).length,sources:Object.keys(sources).length,web:receipt.web,media:receipt.media},null,2));
