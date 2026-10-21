import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const cache=path.resolve('.superpowers/sdd/2026-10-21-mobile-vitals'),out='ops/mission/evidence/mobile-vitals-wrap-2026-10-21';
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
for(const [file,phrase]of [['web-browser-gates.log','PASS local input'],['unit-wrap-web-tests.log','348 regression tests passed.'],['unit-wrap-media.log','Rendered 27 Remotion matrix stills.'],['unit-wrap-video.log','PASS vault'],['layout-red.log','"/day","oneLine":false']])assert.ok((await fs.readFile(path.join(cache,file),'utf8')).includes(phrase),file);
const media=await fs.readFile(path.join(cache,'unit-wrap-media.log'),'utf8');assert.match(media,/# tests 145\b/);assert.match(media,/# fail 0\b/);
const dashboard=JSON.parse(await fs.readFile('apps/web/test-results/dashboard-interest/verification.json','utf8'));assert.equal(dashboard.receipts.length,18);
assert.deepEqual([...new Set(dashboard.receipts.map(r=>r.width))].sort((a,b)=>a-b),[280,375,1440]);
for(const r of dashboard.receipts){assert.equal(r.layout.length,4);assert.ok(r.heroVisibleHeight>=48&&r.savedInputsPreserved&&r.errors.length===0);for(const v of r.layout){assert.ok(v.inViewport&&v.value.fontSize>=12&&v.label.glyphBottom<=v.value.glyphTop+1);for(const part of ['label','value'])assert.ok(v[part].visible&&v[part].fits&&v[part].tokens.length>0&&v[part].tokens.every(t=>t.oneLine&&t.contained));}}
const boundaries=dashboard.receipts.flatMap(r=>r.boundaries);assert.equal(boundaries.length,4);assert.deepEqual([...new Set(boundaries.map(b=>b.width))].sort((a,b)=>a-b),[768,1264]);
const controls=JSON.parse(await fs.readFile('apps/web/test-results/dashboard-interest/oracle-controls.json','utf8'));assert.equal(controls.length,10);assert.ok(controls.every(c=>c.rejected&&Object.values(c.restoration).every(Boolean)));
const fallback=JSON.parse(await fs.readFile('apps/web/test-results/dashboard-interest/fallback-font-280.json','utf8'));assert.equal(fallback.length,4);for(const v of fallback){assert.ok(v.inViewport&&v.value.fontSize>=12&&v.label.glyphBottom<=v.value.glyphTop+1);for(const part of ['label','value'])assert.ok(v[part].visible&&v[part].fits&&v[part].tokens.length>0&&v[part].tokens.every(t=>t.oneLine&&t.contained));}
await fs.mkdir(out,{recursive:true});
for(const name of ['web-browser-gates','three-stage','heroes','fallbacks','http-routes','routes','dashboard','comparison','vault','portfolio','portability','input','layout-red','fallback-font-red'])await fs.copyFile(path.join(cache,name+'.log'),path.join(out,name+'.log'));
for(const [from,to]of [['unit-wrap-web-tests','web-tests'],['unit-wrap-lint','web-lint'],['unit-wrap-build','web-build'],['unit-wrap-audit','web-runtime-audit'],['unit-wrap-media','media-check'],['unit-wrap-video','turn-verification'],['unit-wrap-green','layout-green-final']])await fs.copyFile(path.join(cache,from+'.log'),path.join(out,to+'.log'));
for(const name of await fs.readdir(cache))if(/^(?:unit-review-|unit-final-|failed-3b58bef-).+\.(?:md|json|log|mjs|cjs|txt|png|diff)$/.test(name))await fs.copyFile(path.join(cache,name),path.join(out,name));
for(const name of ['before-house-375.png','before-house-375-layout.json','fallback-font-red.json','fallback-font-red.png','runner-font-diagnostics.json','runner-font-diagnostics.log','diagnose-runner-overflow.cjs','capture-failure.cjs','collect-evidence.mjs','unit-restoration-failed.log','unit-restoration-diagnostic.log','unit-descendant-red.log','unit-old-oracle-replay-red.log','replay-old-unit-oracle.cjs'])await fs.copyFile(path.join(cache,name),path.join(out,name));
await fs.copyFile(path.join(cache,'unit-old-oracle-red/oracle-controls.json'),path.join(out,'old-unit-oracle-controls-red.json'));
for(const name of await fs.readdir('apps/web/test-results/dashboard-interest'))if(name.endsWith('-layout.json')||/^(house|auto|large-import)-(280|375|1440)-viewport\.png$/.test(name))await fs.copyFile('apps/web/test-results/dashboard-interest/'+name,path.join(out,name));
await fs.writeFile(path.join(out,'dashboard-verification.json'),JSON.stringify(dashboard,null,2)+'\n');
await fs.writeFile(path.join(out,'oracle-controls-green.json'),JSON.stringify(controls,null,2)+'\n');
await fs.writeFile(path.join(out,'fallback-font-green.json'),JSON.stringify(fallback,null,2)+'\n');await fs.copyFile('apps/web/test-results/dashboard-interest/fallback-font-280.png',path.join(out,'fallback-font-green.png'));
const files={};for(const name of await fs.readdir(out)){const bytes=await fs.readFile(path.join(out,name));files[name]={bytes:bytes.length,sha256:hash(bytes)};}
const receipt={verifiedAt:new Date().toISOString(),baseline:baseline.headSha,stage:'Local preflight; both complete exact-head CI and hosted proof required',productionReady:false,allowedSourceChanges:allowed,sources,
 web:{regressions:348,dashboardCases:18,responsiveBoundaryProbes:4,oracleControls:10,fallbackFontProbes:1,heroViewportCases:20,hostedCasesRequired:88,mainWidths:[280,375,1440],boundaryWidths:[768,1264]},media:{contracts:145,freshStills:27,newModels:[],newVideos:[],unchangedModelsAndPosters:10,unchangedVideosRechecked:10},failedPredecessor:{head:'3b58beffd14db959cedc667b1c892ef5c0cc672b',push:39587774650,pullRequest:39587777183,reason:'Actual Linux280px large-import amount113px in107px; both web jobs failed and both SQL jobs passed. Failed/unverified, no receipt or promotion.'},
 priorReceipt:baseline.receipt,models,posters,videos,files,limitations:['Display-only fix; no financial engine, scenario, native, persistence, asset, studio, motion, dependency or SQL changes','Two obsolete exact one-row source assertions replaced by actual browser token/first-viewport/hero checks; all financial assertions retained','Browser plugin skill absent; existing finite Chrome/Playwright repository QA used under explicit browser/Chrome authorization','No final all-ten photoreal, physical-device, cloud/backend, lender/calendar or production approval','Desktop report only statically checked unless separately proven otherwise']};
await fs.writeFile(path.join(out,'artifact-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({files:Object.keys(files).length,sources:Object.keys(sources).length,web:receipt.web,media:receipt.media},null,2));
