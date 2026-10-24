import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateDeployment,validateBaselineSeal,verifyBaseline,verifyHostedInvocation,assertCleanHead,validateLocalReceipt,verifyLocalFiles,verifySourcePins,localReceiptPath,referenceBinding,validateReferenceLog,validateCiLogs,validateCommonMonth,validateCurrencyWidth,validateCurrencyWidthLog,validateBrowserProof,writeJsonAtomic} from './shipping-guards.mjs';
const out=path.dirname(fileURLToPath(import.meta.url)),sha=assertCleanHead(process.env.INTERESTSHIELD_EXPECTED_HEAD),hash=b=>createHash('sha256').update(b).digest('hex');
const local=JSON.parse(await fs.readFile(localReceiptPath,'utf8')),origin=process.env.INTERESTSHIELD_VERIFIED_PREVIEW;
const priorBytes=await fs.readFile('.superpowers/sdd/2026-10-21-mobile-vitals/postflight.json'),prior=JSON.parse(priorBytes);
const baselineSeal=validateBaselineSeal(JSON.parse(await fs.readFile(path.join(out,'../baseline-v2-results.json'),'utf8')),priorBytes);
validateLocalReceipt(local,prior);const sourcePins=await verifySourcePins(local,sha);await verifyLocalFiles(local);
validateReferenceLog(await fs.readFile(path.join(path.dirname(localReceiptPath),local.commonMonth.reference.logFile),'utf8'),local.commonMonth.reference,await referenceBinding());
const ciBinding=await referenceBinding(process.cwd(),sha);
const deployment=JSON.parse(await fs.readFile(path.join(out,'deployment-final.json'),'utf8'));
validateDeployment(deployment,sha,origin);
assert.match(process.env.INTERESTSHIELD_HOSTED_RUN_ID??'',/^[a-f0-9-]{36}$/,'explicit fresh hosted invocation ID required');
const invocation=await verifyHostedInvocation(out,deployment,{expectedRunId:process.env.INTERESTSHIELD_HOSTED_RUN_ID});
const baselineSnapshot=await verifyBaseline('C:/Users/IslandDevCrew/Desktop/InterestShield-Hero-Collection-2026-10-20','C:/Users/IslandDevCrew/Desktop/InterestShield-Production-Progress-2026-10-21.html',prior);
assert.equal(baselineSnapshot.manifestSha256,baselineSeal.desktopManifest.sha256);assert.equal(baselineSnapshot.journalSha256,baselineSeal.publication.sha256);
const env={...process.env,GH_TOKEN:execFileSync('gh',['auth','token','--hostname','github.com','--user','Navigata1'],{encoding:'utf8'}).trim()};
const raw=args=>execFileSync('gh',args,{env,encoding:'utf8',windowsHide:true,maxBuffer:40*1024*1024}),gh=args=>JSON.parse(raw(args));
const runs=gh(['api',`repos/Navigata1/velocity-banking-mvp-v2/actions/runs?head_sha=${sha}&per_page=100`]).workflow_runs,ci=[];
for(const event of ['push','pull_request']){
 const entry=runs.filter(r=>r.name==='CI'&&r.event===event&&r.head_sha===sha).sort((a,b)=>b.id-a.id)[0];assert.ok(entry);
 assert.ok(Number.isSafeInteger(entry.run_attempt)&&entry.run_attempt>0);
 const run=gh(['run','view',String(entry.id),'--attempt',String(entry.run_attempt),'--repo','Navigata1/velocity-banking-mvp-v2','--json','headSha,status,conclusion,url,jobs']);
 assert.equal(run.headSha,sha);assert.equal(run.status,'completed');assert.equal(run.conclusion,'success');assert.equal(run.jobs.length,2);assert.ok(run.jobs.every(j=>j.status==='completed'&&j.conclusion==='success'));
 const web=run.jobs.find(j=>j.name==='Web and mobile quality gates'),sql=run.jobs.find(j=>j.name==='Isolated SQL and owner isolation');
 assert.ok(web&&sql);assert.ok(run.jobs.every(j=>j.steps.length>0&&j.steps.every(s=>s.conclusion==='success')),'both full CI jobs must execute all steps successfully');
 for(const [job,names]of [[web,['Run web regression tests','Check media identity contracts','Run mobile type-check','Build Expo web export','Smoke rendered Expo accessibility','Run mobile contract tests']],[sql,['Replay all migrations without seed data','Verify client contracts and SQL owner isolation','Repeat SQL tests to verify fixture rollback','Lint application database functions','Check database security advisors']]])for(const name of names)assert.equal(job.steps.find(s=>s.name===name)?.conclusion,'success',event+' missing actual step '+name);
 const webLog=raw(['run','view',String(entry.id),'--attempt',String(entry.run_attempt),'--repo','Navigata1/velocity-banking-mvp-v2','--job',String(web.databaseId),'--log']).replace(/\r\n?/g,'\n');
 const sqlLog=raw(['run','view',String(entry.id),'--attempt',String(entry.run_attempt),'--repo','Navigata1/velocity-banking-mvp-v2','--job',String(sql.databaseId),'--log']).replace(/\r\n?/g,'\n');
 const reference=validateCiLogs(webLog,sqlLog,local.commonMonth,ciBinding);
 await fs.writeFile(path.join(out,`ci-${event}-web.log`),webLog);await fs.writeFile(path.join(out,`ci-${event}-sql.log`),sqlLog);
 ci.push({event,id:entry.id,attempt:entry.run_attempt,...run,webLogSha256:hash(webLog),sqlLogSha256:hash(sqlLog),nativeBrowserExecutions:70,commonMonthNativeCases:21,currencyWidthCases:11,coreContracts:local.commonMonth.coreContracts,reference,mediaContracts:145,renderedStills:27,sqlAssertions:63,sqlExecutions:2});
}
const pr=gh(['pr','view','256','--repo','Navigata1/velocity-banking-mvp-v2','--json','headRefOid,isDraft,state,url']);assert.equal(pr.headRefOid,sha);assert.equal(pr.isDraft,true);assert.equal(pr.state,'OPEN');
await verifySourcePins(local,sha);
const suites={};
for(const [name,dir,file,count]of [['dashboard','dashboard-interest','verification.json',18],['portfolio','portfolio-budget','verification.json',24],['vault','vault-comparison','verification.json',20],
 ['comparison','comparison','verification.json',16],['portability','portfolio-portability','verification.json',6],['input','portfolio-input','portfolio-input-verification.json',4],['commonMonth','portfolio-common-month','verification.json',21],['currencyWidth','currency-width','verification.json',11]]){
 const bytes=await fs.readFile(`apps/web/test-results/${dir}/${file}`),data=JSON.parse(bytes);if(data.origin)assert.equal(data.origin,origin);assert.equal(data.receipts.length,count);assert.ok(data.receipts.every(r=>r.passed!==false&&!r.errors?.length));
 if(name==='dashboard')for(const r of data.receipts){assert.ok(r.savedInputsPreserved&&r.heroVisibleHeight>=48);assert.equal(r.layout.length,4);for(const v of r.layout){assert.ok(v.inViewport&&v.value.fontSize>=12&&v.label.glyphBottom<=v.value.glyphTop+1);for(const part of ['label','value'])assert.ok(v[part].visible&&v[part].fits&&v[part].tokens.length>0&&v[part].tokens.every(t=>t.oneLine&&t.contained));}}
 if(name==='input')assert.ok(data.receipts.every(r=>r.inputPixels.brightPixels>24&&r.inputPixels.colors>1));if(name==='commonMonth')validateCommonMonth(data,origin);if(name==='currencyWidth')validateCurrencyWidth(data,origin);await fs.writeFile(path.join(out,'hosted',name+'-verification.json'),bytes);
 suites[name]={cases:count,widths:[...new Set(data.receipts.map(r=>name==='currencyWidth'?r.viewportWidth:r.width))],sha256:hash(bytes)};
}
assert.equal(Object.entries(suites).filter(([name])=>name!=='currencyWidth').reduce((n,[,suite])=>n+suite.cases,0),109);
assert.equal(suites.currencyWidth.cases,11);assert.equal(Object.values(suites).reduce((n,v)=>n+v.cases,0),120);
for(const name of ['http','routes','dashboard','portfolio','vault','comparison','portability','input','commonMonth','currencyWidth']){const log=await fs.readFile(path.join(out,'hosted',name+'.log'),'utf8');assert.ok(!/FAIL|AssertionError|Error:/.test(log),name);if(name==='commonMonth')assert.equal((log.match(/^PASS web common month /gm)||[]).length,21);if(name==='currencyWidth')validateCurrencyWidthLog(log);if(name==='http')assert.equal((log.match(/^PASS /gm)||[]).length,7);if(name==='routes')for(const width of [1440,375])assert.equal((log.match(new RegExp(`^PASS (?:desktop|mobile) /.*${width}px`,'gm'))||[]).length,7);}
const controls=JSON.parse(await fs.readFile('apps/web/test-results/dashboard-interest/oracle-controls.json','utf8'));assert.equal(controls.length,10);assert.ok(controls.every(c=>c.rejected&&Object.values(c.restoration).every(Boolean)));await fs.writeFile(path.join(out,'hosted','oracle-controls.json'),JSON.stringify(controls,null,2)+'\n');
const fallback=JSON.parse(await fs.readFile('apps/web/test-results/dashboard-interest/fallback-font-280.json','utf8'));assert.equal(fallback.length,4);for(const v of fallback){assert.ok(v.inViewport&&v.value.fontSize>=12&&v.label.glyphBottom<=v.value.glyphTop+1);for(const part of ['label','value'])assert.ok(v[part].visible&&v[part].fits&&v[part].tokens.length>0&&v[part].tokens.every(t=>t.oneLine&&t.contained));}await fs.writeFile(path.join(out,'hosted','fallback-font-280.json'),JSON.stringify(fallback,null,2)+'\n');
const served=[],posters=[];for(const model of local.models){const response=await fetch(`${origin}/heroes/${model.id}.glb`);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(hash(bytes),model.sha256);served.push({id:model.id,bytes:bytes.length,sha256:hash(bytes)});}
for(const p of local.posters){const response=await fetch(`${origin}/heroes/${p.id}.webp`);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(hash(bytes),p.posterSha256);posters.push({id:p.id,bytes:bytes.length,sha256:hash(bytes)});}
assert.equal(new Set(served.map(v=>v.id)).size,10);assert.equal(new Set(posters.map(v=>v.id)).size,10);
const manual=validateBrowserProof(JSON.parse(await fs.readFile(path.join(out,'browser-proof.json'),'utf8')),invocation);
const shot=await fs.readFile(path.join(out,'Hosted-Mobile-Vitals.jpg'));assert.equal(shot.readUInt16BE(0),0xffd8);
const commonShot=await fs.readFile(path.join(out,'Hosted-Common-Month.jpg'));assert.equal(commonShot.readUInt16BE(0),0xffd8);
await fs.copyFile('apps/web/test-results/dashboard-interest/auto-375-viewport.png',path.join(out,'Hosted-Mobile-Auto-375.png'));
const phone=await fs.readFile(path.join(out,'Hosted-Mobile-Auto-375.png'));assert.equal(phone.readUInt32BE(0),0x89504e47);
await fs.copyFile('apps/web/test-results/portfolio-common-month/web-cash-versus-wealth-375.png',path.join(out,'Hosted-Common-Month-375.png'));
const commonPhone=await fs.readFile(path.join(out,'Hosted-Common-Month-375.png'));assert.equal(commonPhone.readUInt32BE(0),0x89504e47);
const receipt={verifiedAt:new Date().toISOString(),headSha:sha,preview:origin,deployment,pr,ci,productionReady:false,stage:'Verified draft common-month checkpoint; not full R2, final-art or production approval',local,baselineSnapshot,sourcePins,
 hosted:{invocation,suites,calculationAndPortabilityCases:109,currencyWidthCases:11,totalCases:120,httpRoutes:7,renderedRoutes:7,served,posters,manual,fallbackFontProbes:1,oracleControls:controls.map(c=>({kind:c.kind,rejected:c.rejected})),commonMonthOracleControls:4,screenshot:{file:'Hosted-Mobile-Vitals.jpg',bytes:shot.length,sha256:hash(shot)},phone:{file:'Hosted-Mobile-Auto-375.png',bytes:phone.length,sha256:hash(phone)},commonMonthScreenshot:{file:'Hosted-Common-Month.jpg',bytes:commonShot.length,sha256:hash(commonShot)},commonMonthPhone:{file:'Hosted-Common-Month-375.png',bytes:commonPhone.length,sha256:hash(commonPhone)}},
 next:'Advance shared scenario ownership, lender/calendar and provider contracts; continue final all-ten art, dependency/backend/security/device/release gates. Common-month comparison is bounded evidence, not full R2 or production approval.'};
const marker=`<!-- common-month-checkpoint:${sha}:${invocation.id} -->`;
const body=`${marker}\n## Verified Portfolio Common-Month Checkpoint: ${sha}\n\n`+
 `Cash and remaining debt/LOC are compared at one month (0-600), not at separate payoff dates. Web and native use the shared typed adapter. Horizon edits do not write saved records.\n\n`+
 `Both complete exact-head CI events: ${ci.map(r=>r.event+' '+r.id+' attempt '+r.attempt).join('; ')}. Actual 348 regressions, ${local.commonMonth.coreContracts} focused common-month contracts and ${local.commonMonth.reference.passed} independently adjudicated reference checks (zero failed); 145 media contracts/27 fresh stills; full native contracts and 70 native browser executions (49 preserved +21 common-month); SQL63 twice per event.\n\n`+
 `Ten hosted suites /120 browser cases:109 primary workflow/input cases (old88 +common-month21) plus11 currency-width layout boundaries on one fictional canonical billion-balance/H0 book. All eleven requested-Verdana boundaries280/375/640/690/700/768/1024/1100/1120/1280/1440 preserve exact -$1,000,000,000.00 text, >=12px font, fit/containment/one-line/overflow/error limits; these are not eleven lender examples or extra native executions. Seven HTTP/rendered routes, original Dashboard controls/fallback probe and ten served GLB/poster hashes pass on [exact READY preview](${origin}). Common-month fixtures retain1440/375/280 and four actual DOM counterexamples with restoration. Actual IAB House income edit/restore and UI-imported /portfolio months0/3/6/600/restore3 are DOM/UI observations bound to invocation ${invocation.id}; cash-versus-wealth differs at month3 while net position agrees. All-store byte preservation is independently checked in all21 invocation-bound commonMonth browser fixtures, not read or inferred from hidden IAB state.\n\n`+
 `Fresh invocation binds command/environment, scripts/helpers/local receipt, head/deployment, start/end/zero exits and captured/live hashes. Raw Vercel READY/null-target project/team/repository metadata is checked. ${sourcePins.count} current and committed normalized source pins pass; only six existing executable files plus eight new are allowed, including the bounded hero capture-clock harness change. Both complete CI event logs contain the actual blank/undersized/clipped visibility-control and primer16ms/15x100ms cadence-control markers. Hero motion sampling is a fixed10Hz endpoint test with one16ms primer and fifteen actual100ms callbacks, not wall-time FPS, full-turn or device approval. Old engine/public/media/workflow/SQL sources are preserved.\n\n`+
 `Retained unverified history: d6f6f5010237ff1843bb73a33360445b7d094687 push39621111192 succeeded, but PR39621121164 was cancelled at the actual20m0s job cap after a13m33s hero step with15/20 cases passed; both SQL jobs succeeded and no assertion failure was reported. That mixed head has no receipt/Desktop publication and is not carried forward as final proof. Only the new final head's complete successful push AND PR events and fresh helper-bound invocation support this checkpoint.\n\n`+
 `Prior1aec5bf Desktop322-file manifest, committed324-entry journal and48 recoverable backups freshly checked. Desktop publication is separate, fully staged/recoverable, and not claimed here. No report-only push cycle.\n\n`+
 `Verified draft only. No final all-ten photoreal, physical-device, full R2, shared-scenario ownership, lender/calendar/provider/backend/security or production approval. No merge, production promotion, paid GPU, new dependency or cloud/DNS/data/credential/access mutation.\n`;
assertCleanHead(sha);await verifySourcePins(local,sha);await verifyLocalFiles(local);await verifyHostedInvocation(out,deployment,{expectedRunId:invocation.id});
await fs.writeFile(path.join(out,'postflight.md'),body);
receipt.receipt=null;
// Posting is opt-in. A rerun reuses the exact invocation's existing comment.
const pages=gh(['api','repos/Navigata1/velocity-banking-mvp-v2/issues/256/comments?per_page=100','--paginate','--slurp']);
const existing=pages.flat().find(comment=>comment.body?.includes(marker));
if(existing){assert.equal(existing.body,body);receipt.receipt=existing.html_url;}
else if(process.env.INTERESTSHIELD_ALLOW_RECEIPT_POST==='1'){
 const posted=gh(['api','repos/Navigata1/velocity-banking-mvp-v2/issues/256/comments','-F',`body=@${path.join(out,'postflight.md')}`]);assert.equal(posted.body,body);receipt.receipt=posted.html_url;
}
await writeJsonAtomic(path.join(out,'postflight.json'),receipt);console.log(JSON.stringify({headSha:sha,receipt:receipt.receipt,preview:origin,ci:ci.map(r=>({id:r.id,event:r.event,attempt:r.attempt})),desktopPublished:false,productionReady:false},null,2));
