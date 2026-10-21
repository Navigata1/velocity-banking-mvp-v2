import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyBaseline,validateBaselineSeal,publishFiles,recoverPublication,digest,assertCleanHead,validateLocalReceipt,verifySourcePins,verifyLocalFiles,verifyHostedInvocation,validateDeployment,validateBrowserProof,validateCurrencyWidth,validateCiLogs,referenceBinding,localReceiptPath,writeJsonAtomic} from './shipping-guards.mjs';

const cache=path.dirname(fileURLToPath(import.meta.url)),sha=assertCleanHead(process.env.INTERESTSHIELD_EXPECTED_HEAD);
assert.equal(process.env.INTERESTSHIELD_ALLOW_DESKTOP_PUBLICATION,'1','explicit Desktop publication opt-in required');
const receipt=JSON.parse(await fs.readFile(path.join(cache,'postflight.json'),'utf8'));
const prior=JSON.parse(await fs.readFile('.superpowers/sdd/2026-10-21-mobile-vitals/postflight.json','utf8'));
assert.equal(receipt.headSha,sha);assert.equal(receipt.productionReady,false);
assert.match(receipt.receipt??'',/^https:\/\/github\.com\/Navigata1\/velocity-banking-mvp-v2\/pull\/256#issuecomment-\d+$/,'posted exact-head receipt required');
const publicCollection='C:/Users/IslandDevCrew/Desktop/InterestShield-Hero-Collection-2026-10-20';
const publicDesktop='C:/Users/IslandDevCrew/Desktop/InterestShield-Production-Progress-2026-10-21.html';
const journalFile=path.join(cache,'desktop-publication-'+sha,'journal.json'),allowedRoots=[publicCollection,publicDesktop];
const prefix='Common-Month-'+sha.slice(0,7),recovered=await recoverPublication(journalFile,allowedRoots);
// Recovery precedes freshness checks so missing later evidence cannot strand a partial publication.
if(recovered?.state==='committed'){
  const entry=recovered.files.find(file=>path.basename(file.target)===prefix+'-Verification.json');assert.ok(entry);
  const published=JSON.parse(await fs.readFile(entry.target,'utf8'));assert.equal(published.headSha,sha);assert.equal(published.receipt,receipt.receipt);assert.equal(published.hosted.invocation.id,receipt.hosted.invocation.id);
  await writeJsonAtomic(path.join(cache,'postflight.json'),published);console.log(JSON.stringify({alreadyPublished:true,headSha:sha,journalFile}));process.exit(0);
}
validateLocalReceipt(receipt.local,prior);await verifySourcePins(receipt.local,sha);await verifyLocalFiles(receipt.local);
assert.deepEqual(receipt.local,JSON.parse(await fs.readFile(localReceiptPath,'utf8')));
validateDeployment(receipt.deployment,sha,process.env.INTERESTSHIELD_VERIFIED_PREVIEW);
assert.deepEqual(receipt.deployment,JSON.parse(await fs.readFile(path.join(cache,'deployment-final.json'),'utf8')));
assert.equal(receipt.preview,receipt.deployment.preview);
assert.equal(receipt.hosted.invocation.id,process.env.INTERESTSHIELD_HOSTED_RUN_ID);
assert.deepEqual(await verifyHostedInvocation(cache,receipt.deployment,{expectedRunId:process.env.INTERESTSHIELD_HOSTED_RUN_ID}),receipt.hosted.invocation);
assert.equal(receipt.hosted.calculationAndPortabilityCases,109);assert.equal(receipt.hosted.currencyWidthCases,11);assert.equal(receipt.hosted.totalCases,120);
validateCurrencyWidth(JSON.parse(await fs.readFile(receipt.hosted.invocation.suites.currencyWidth.artifacts['apps/web/test-results/currency-width/verification.json'].live,'utf8')),receipt.preview);
validateBrowserProof(receipt.hosted.manual,receipt.hosted.invocation);
assert.deepEqual(receipt.hosted.manual,JSON.parse(await fs.readFile(path.join(cache,'browser-proof.json'),'utf8')));
for(const proof of [receipt.hosted.screenshot,receipt.hosted.phone,receipt.hosted.commonMonthScreenshot,receipt.hosted.commonMonthPhone]){
  assert.ok(proof&&path.basename(proof.file)===proof.file);const bytes=await fs.readFile(path.join(cache,proof.file));assert.equal(bytes.length,proof.bytes);assert.equal(digest(bytes),proof.sha256);
}
assert.deepEqual(receipt.ci.map(c=>c.event),['push','pull_request']);
const binding=await referenceBinding(process.cwd(),sha);
for(const ci of receipt.ci){
  assert.equal(ci.headSha,sha);assert.equal(ci.status,'completed');assert.equal(ci.conclusion,'success');assert.equal(ci.jobs.length,2);assert.ok(ci.jobs.every(j=>j.status==='completed'&&j.conclusion==='success'));
  const web=await fs.readFile(path.join(cache,`ci-${ci.event}-web.log`),'utf8'),sql=await fs.readFile(path.join(cache,`ci-${ci.event}-sql.log`),'utf8');
  assert.equal(digest(web),ci.webLogSha256);assert.equal(digest(sql),ci.sqlLogSha256);validateCiLogs(web,sql,receipt.local.commonMonth,binding);
}

const baseline=await verifyBaseline(publicCollection,publicDesktop,prior);
const baselineSeal=validateBaselineSeal(JSON.parse(await fs.readFile(path.join(cache,'../baseline-v2-results.json'),'utf8')),await fs.readFile('.superpowers/sdd/2026-10-21-mobile-vitals/postflight.json'));
assert.equal(baseline.manifestSha256,baselineSeal.desktopManifest.sha256);assert.equal(baseline.journalSha256,baselineSeal.publication.sha256);
assert.equal(baseline.manifestSha256,receipt.baselineSnapshot.manifestSha256);assert.equal(baseline.journalSha256,receipt.baselineSnapshot.journalSha256);
const stage=path.join(cache,'desktop-staging-'+sha.slice(0,7)+'-'+randomUUID()),collection=path.join(stage,'collection'),desktop=path.join(stage,'Production-Progress.html');
await fs.mkdir(collection,{recursive:true});
const originalState=await fs.readFile('ops/mission/state.json'),state=JSON.parse(originalState),gates=state.phases.flatMap(p=>p.gates);
const gate=id=>{const found=gates.find(g=>g.id===id);assert.ok(found,id);return found;};
const summary=`Both complete exact-head push/PR pipelines pass on ${sha}; 348 regressions, ${receipt.local.commonMonth.coreContracts} common-month contracts, ${receipt.local.commonMonth.reference.passed} adjudicated reference checks; 145 media/27 fresh stills, full native contracts/70 browser executions, SQL63 twice/event. Ten hosted suites/120 browser cases:109 primary workflow/input cases plus11 currency-width layout boundary checks; seven HTTP/rendered routes and all ten served GLB/poster hashes unchanged. Verified draft, not full R2/final art/production approval.`;
for(const id of ['R0-G1','R0-G2','R0-G3','R1-G2','R2-G6','R2-G7','R2-G8']){const g=gate(id);g.lastRun=receipt.verifiedAt;g.evidence=receipt.receipt;}
for(const id of ['R2-G6','R2-G7','R2-G8'])gate(id).status='passed';
gate('R0-G3').status='passed';gate('R0-G3').notes=summary;
gate('R0-G1').notes=summary+' All293 current/committed source pins match; five old executable files modified plus eight new. Original engine/media/public/workflow/SQL sources remain unchanged. Every future head needs fresh proof.';
gate('R0-G2').notes='Original eight hosted suites preserved; common-month21 at1440/375/280 and four real DOM controls with original-node restoration. Tenth suite adds11 currency-width layout boundary checks on one fictional book, separately from109 primary cases, for120 total. Actual House income edit/restore and /portfolio months0/3/6/600 edit/restore pass. Native CI49+21=70 remains unchanged. Not physical-device or final accessibility approval.';
gate('R1-G2').notes='All ten original models/posters/videos retained, with145 media contracts/27 fresh stills in both full CI events and exact hosted GLB/poster hashes. Existing motion/framing/loading/fallback gates preserved. Final all-ten art, device and production gates remain open.';
gate('R2-G6').notes='18 hosted Dashboard workflows at280/375/1440 plus four768/1264 responsive probes preserve exact daily estimates, saved inputs, edit/restore/navigation and oversized no-ops. Ten actual DOM controls reject hidden/clipped/overlapping/empty values and prove original-node restoration; one wider-font positive probe passes without reducing12px minimum. Failed3b58bef history remains explicit. Not arbitrary-font/device, lender or full R2 approval.';
gate('R2-G7').notes=`${receipt.local.commonMonth.coreContracts} focused common-month contracts and ${receipt.local.commonMonth.reference.passed} adjudicated reference checks pass with zero failures in local evidence and both complete exact-head CI events. Shared typed snapshots compare cash and all debt/LOC at one horizon; exact-zero continuation, valid prefixes, signed differences and strict0..600 inputs remain covered. Generic Number estimates, not lender posting, shared-scenario ownership or full R2 approval.`;
gate('R2-G8').notes='21 web +21 native same-month rendered cases at1440/375/280 include cash-versus-wealth, adverse, blocked, failed, nonzero-tolerance, cleared and large-value books; full native CI runs70 browser executions including49 preserved cases. Separate11 currency-width layout boundaries at280/375/640/690/700/768/1024/1100/1120/1280/1440 preserve exact signed-billion/H0 text in requested Verdana, >=12px fonts and all fit/containment/one-line/overflow/error limits on one fictional book, not eleven lender examples. Four actual DOM controls per platform reject hidden/clipped/empty values and restore original nodes/styles. Invocation-bound web fixtures and native fixtures preserve stored bytes; actual IAB horizon0/3/6/600/restore3 is UI/DOM corroboration, not hidden-state inspection. Not device, shared-scenario ownership, lender/calendar/provider or full R2 approval.';
state.mission.updated=receipt.verifiedAt;state.mission.tagline=`Verified draft ${sha.slice(0,7)}: Portfolio cash and debt at one month. Final art and production gates stay open.`;
state.resume.nextActions[0]=`Verified ${sha}; receipt ${receipt.receipt}. Next: ${receipt.next} Fold this postflight into the next substantive change; no report-only push cycle.`;state.resume.activePhase='R2';
const risk=state.risks.find(r=>['Exact-SHA CI must be re-proven','Verified draft is not production approval'].includes(r.title));
if(risk){risk.title='Verified draft is not production approval';risk.note=summary+' Shared scenarios, lender/calendar/provider/backend/security/device/release and final art remain open.';}
const projection=path.join(stage,'projection');await fs.mkdir(projection);await writeJsonAtomic(path.join(projection,'state.json'),state);
for(const name of ['journal.md','render-sotu.mjs'])await fs.copyFile('ops/mission/'+name,path.join(projection,name));
execFileSync(process.execPath,[path.join(projection,'render-sotu.mjs')],{stdio:'inherit',windowsHide:true});
const html=path.join(projection,'state-of-the-union.html');
execFileSync(process.execPath,['.superpowers/sdd/2026-10-20-native-portfolio/verify-report.mjs',html],{stdio:'inherit',windowsHide:true});
await fs.copyFile(html,desktop);await fs.copyFile(desktop,path.join(collection,'Production-Progress.html'));

const evidence=path.join(collection,prefix+'-Evidence');await fs.mkdir(evidence,{recursive:true});
await fs.cp(path.dirname(localReceiptPath),path.join(evidence,'committed-preflight'),{recursive:true});
await fs.cp(path.join(cache,'hosted'),path.join(evidence,'hosted'),{recursive:true});
await fs.cp(path.join(cache,receipt.hosted.invocation.directory),path.join(evidence,'hosted-invocation'),{recursive:true});
await fs.cp(projection,path.join(evidence,'report-projection'),{recursive:true});
for(const [from,to]of [[publicDesktop,'prior-desktop-report.html'],[path.join(publicCollection,'Production-Progress.html'),'prior-collection-report.html'],[path.join(publicCollection,'README.md'),'prior-readme.md']])await fs.copyFile(from,path.join(evidence,to));
for(const name of ['postflight.mjs','publish-desktop.mjs','run-hosted.cjs','shipping-guards.mjs','shipping-guards.test.mjs','release-preparation.md','deployment-final.json','browser-proof.json','Hosted-Mobile-Vitals.jpg','Hosted-Mobile-Auto-375.png','Hosted-Common-Month.jpg','Hosted-Common-Month-375.png',...['push','pull_request'].flatMap(e=>[`ci-${e}-web.log`,`ci-${e}-sql.log`])])await fs.copyFile(path.join(cache,name),path.join(evidence,name));
await fs.copyFile('.superpowers/sdd/2026-10-21-common-month/baseline-v2-results.json',path.join(evidence,'prior-baseline-v2-results.json'));
for(const file of receipt.local.allowedSourceChanges){const target=path.join(evidence,'sources',file),bytes=await fs.readFile(file);assert.equal(digest(bytes.toString('utf8').replace(/\r\n?/g,'\n')),receipt.local.sources[file]);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);}
await fs.copyFile('docs/portfolio-common-month-contract-2026-10-21.md',path.join(collection,'Portfolio-Common-Month-Contract.md'));
for(const [from,to]of [['Hosted-Mobile-Vitals.jpg',prefix+'-House.jpg'],['Hosted-Mobile-Auto-375.png',prefix+'-Auto-375.png'],['Hosted-Common-Month.jpg',prefix+'-Portfolio.jpg'],['Hosted-Common-Month-375.png',prefix+'-Portfolio-375.png']])await fs.copyFile(path.join(cache,from),path.join(collection,to));
const report=await fs.readFile(desktop);receipt.desktopReport={path:publicDesktop,bytes:report.length,sha256:digest(report),externalRuntimeResources:0,inlineScriptsParsed:1,sourcePreflightStateSha256:digest(originalState),projectedStateSha256:digest(await fs.readFile(path.join(projection,'state.json'))),unchangedRendererSha256:digest(await fs.readFile('ops/mission/render-sotu.mjs')),publicationJournal:journalFile,note:'Generated postflight projection only; committed mission state is not rewritten. Static report checks, not local-file runtime or fully sealed certification. All payloads staged/hashed; public Desktop last, atomic recovery journal governs completion.'};
await writeJsonAtomic(path.join(collection,prefix+'-Verification.json'),receipt);await fs.copyFile(path.join(cache,'postflight.md'),path.join(collection,prefix+'-Verification.md'));
await fs.writeFile(path.join(collection,'README.md'),await fs.readFile(path.join(publicCollection,'README.md'),'utf8')+`\n## Latest Verified Common-Month Checkpoint\n\n${sha}\nPreview: ${receipt.preview}\nReceipt: ${receipt.receipt}\n\n${summary}\n\nPrior reports/README retained inside this checkpoint evidence. Common-month is bounded comparison proof, not shared-scenario/lender/calendar/provider/full R2/device/final-art/production approval. Journal: ${journalFile}.\n`);

// Even unchanged assets are real staged payloads, never promises to copy later.
for(const model of receipt.hosted.served){
  const id=model.id,p=receipt.local.posters.find(p=>p.id===id),v=receipt.local.videos.find(v=>v.id===id);
  for(const [file,expected]of [[`3D-Studies/${id}.glb`,model.sha256],[`Web-Posters/${id}.webp`,p.posterSha256],[`Full-Resolution-Art/${id}.png`,p.sourceSha256],[`Turntables/${id}.mp4`,v.sha256]]){
    const target=path.join(collection,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(publicCollection,file),target);assert.equal(digest(await fs.readFile(target)),expected,file);
  }
}
for(const file of ['hero-models.json','hero-imported.json','hero-provenance.json','verification.json','ASSET-CREDITS.md'])await fs.copyFile(path.join(publicCollection,file),path.join(collection,file));
const files={};
async function visit(dir=''){
  for(const entry of await fs.readdir(path.join(collection,dir),{withFileTypes:true})){
    const file=path.join(dir,entry.name);if(entry.isDirectory())await visit(file);else{assert.ok(entry.isFile(),'regular staged file required');const bytes=await fs.readFile(path.join(collection,file));files[file.replaceAll('\\','/')]={bytes:bytes.length,sha256:digest(bytes)};}
  }
}
await visit();
const manifest=path.join(collection,prefix+'-File-Manifest.json');await writeJsonAtomic(manifest,{headSha:sha,receipt:receipt.receipt,scope:'Verified draft common-month checkpoint; not full R2/final art/device/cloud/production approval',files});
for(const [file,proof]of Object.entries(files)){const bytes=await fs.readFile(path.join(collection,file));assert.equal(bytes.length,proof.bytes);assert.equal(digest(bytes),proof.sha256,file);}
assert.equal(digest(await fs.readFile('ops/mission/state.json')),digest(originalState));assertCleanHead(sha);await verifySourcePins(receipt.local,sha);await verifyLocalFiles(receipt.local);
await verifyBaseline(publicCollection,publicDesktop,prior);await verifyHostedInvocation(cache,receipt.deployment,{expectedRunId:receipt.hosted.invocation.id});
const manifestBytes=await fs.readFile(manifest);
const entries=[...Object.entries(files).map(([file,expected])=>({staged:path.join(collection,file),target:path.join(publicCollection,file),expected})),{staged:manifest,target:path.join(publicCollection,path.basename(manifest)),expected:{bytes:manifestBytes.length,sha256:digest(manifestBytes)}},{staged:desktop,target:publicDesktop,expected:{bytes:report.length,sha256:digest(report)}}];
await publishFiles(entries,journalFile,allowedRoots);
for(const [file,proof]of Object.entries(files)){const bytes=await fs.readFile(path.join(publicCollection,file));assert.equal(bytes.length,proof.bytes);assert.equal(digest(bytes),proof.sha256,file);}
assert.equal(digest(await fs.readFile(publicDesktop)),receipt.desktopReport.sha256);assert.equal(digest(await fs.readFile('ops/mission/state.json')),digest(originalState));
await writeJsonAtomic(path.join(cache,'postflight.json'),receipt);
console.log(JSON.stringify({files:Object.keys(files).length,receipt:receipt.receipt,desktopReport:receipt.desktopReport,manifest:path.join(publicCollection,path.basename(manifest)),journalFile},null,2));
